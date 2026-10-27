import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type Stripe from "stripe";

// Each run gets its own throwaway SQLite file.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stags-test-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;

const { all, one, run } = await import("./db");
const { syncEvents, applyAttendanceNames } = await import("./heja");
const { parseIcs } = await import("./ics");
const { recordCheckoutSession } = await import("./stripe");
const { memberBalances } = await import("./data");

const ics = (events: string[]) => ["BEGIN:VCALENDAR", ...events, "END:VCALENDAR"].join("\r\n");
const ev = (uid: string, start: string, summary: string, extra: string[] = []) =>
  ["BEGIN:VEVENT", `UID:${uid}`, `DTSTART:${start}`, `SUMMARY:${summary}`, ...extra, "END:VEVENT"].join("\r\n");

beforeAll(async () => {
  await run("INSERT INTO members (name, email, team) VALUES ('Alex Smith', 'alex@example.com', 'A')");
  await run("INSERT INTO members (name, email, team, heja_name) VALUES ('Jamie Lee', 'jamie@example.com', 'A', 'J Lee')");
  await run("INSERT INTO members (name, email, team) VALUES ('Sam Brown', 'sam@example.com', 'B')");
});

describe("Heja schedule sync", () => {
  it("imports sessions and games, then updates on re-sync without duplicating", async () => {
    const first = await syncEvents(
      parseIcs(
        ics([
          ev("t1", "20261102T213000Z", "Training"),
          ev("g1", "20261108T180000Z", "A Team vs Dundee", ["LOCATION:Braehead Arena"]),
        ]),
      ),
    );
    expect(first).toMatchObject({ added: 2, updated: 0, games: 1 });
    const game = await one<{ opponent: string; team: string; home: number; date: string }>("SELECT * FROM games WHERE heja_uid = 'g1'");
    expect(game).toMatchObject({ opponent: "Dundee", team: "A", home: 1, date: "2026-11-08T18:00" });

    // Committee records a score and tidies the name; a re-sync moves the time.
    await run("UPDATE games SET our_score = 3, their_score = 1, opponent = 'Dundee Uni' WHERE heja_uid = 'g1'");
    const second = await syncEvents(
      parseIcs(ics([ev("t1", "20261102T213000Z", "Training"), ev("g1", "20261108T190000Z", "A Team vs Dundee")])),
    );
    expect(second).toMatchObject({ added: 0, updated: 2, games: 0 });
    const after = await one<{ opponent: string; our_score: number; date: string }>("SELECT * FROM games WHERE heja_uid = 'g1'");
    expect(after).toMatchObject({ opponent: "Dundee Uni", our_score: 3, date: "2026-11-08T19:00" });
    expect((await all("SELECT * FROM sessions")).length).toBe(2);
  });

  it("removes cancelled events unless attendance was taken", async () => {
    await syncEvents(parseIcs(ics([ev("t2", "20261109T213000Z", "Training")])));
    const res = await syncEvents(parseIcs(ics([ev("t2", "20261109T213000Z", "Training", ["STATUS:CANCELLED"])])));
    expect(res.cancelled).toBe(1);
    expect(await one("SELECT * FROM sessions WHERE heja_uid = 't2'")).toBeUndefined();
  });
});

describe("Heja attendance paste", () => {
  it("marks matched names present and the rest of the team absent", async () => {
    const session = await one<{ id: number }>("SELECT id FROM sessions WHERE heja_uid = 't1'");
    const report = await applyAttendanceNames(session!.id, "Alex Smith ✓\nJ Lee\nUnknown Person", {
      markOthersAbsent: true,
      team: "B",
    });
    expect(report.matched.map((m) => m.member.name)).toEqual(["Alex Smith", "Jamie Lee"]);
    expect(report.unmatched).toEqual(["Unknown Person"]);
    const rows = await all<{ name: string; status: string; source: string }>(
      "SELECT m.name, a.status, a.source FROM attendance a JOIN members m ON m.id = a.member_id WHERE a.session_id = ? ORDER BY m.name",
      [session!.id],
    );
    expect(rows).toEqual([
      { name: "Alex Smith", status: "present", source: "heja" },
      { name: "Jamie Lee", status: "present", source: "heja" },
      { name: "Sam Brown", status: "absent", source: "heja" },
    ]);
  });
});

describe("Stripe payment recording", () => {
  const session = (over: Partial<Stripe.Checkout.Session>) =>
    ({
      id: "cs_test_1",
      payment_status: "paid",
      amount_total: 15000,
      created: 1793000000,
      payment_intent: "pi_1",
      metadata: { payer_email: "ALEX@example.com", payer_name: "Alex", description: "Season membership" },
      customer_details: null,
      customer_email: null,
      ...over,
    }) as unknown as Stripe.Checkout.Session;

  it("records once, matched to the member by email", async () => {
    await run("INSERT INTO charges (member_id, description, amount_pence) VALUES (1, 'Season membership', 15000)");
    expect(await recordCheckoutSession(session({}))).toBe("recorded");
    expect(await recordCheckoutSession(session({}))).toBe("duplicate");
    const pays = await all<{ member_id: number; amount_pence: number; method: string }>("SELECT * FROM payments");
    expect(pays).toHaveLength(1);
    expect(pays[0]).toMatchObject({ member_id: 1, amount_pence: 15000, method: "stripe" });
    const alex = (await memberBalances()).find((b) => b.id === 1);
    expect(alex?.balance).toBe(0);
  });

  it("keeps unknown payers unmatched and ignores unpaid sessions", async () => {
    expect(
      await recordCheckoutSession(session({ id: "cs_test_2", metadata: { payer_email: "new@example.org", payer_name: "New" } })),
    ).toBe("recorded");
    expect(await one("SELECT member_id FROM payments WHERE stripe_session_id = 'cs_test_2'")).toEqual({ member_id: null });
    expect(await recordCheckoutSession(session({ id: "cs_test_3", payment_status: "unpaid" }))).toBe("unpaid");
  });
});
