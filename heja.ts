import "server-only";
import { all, batch, getSetting, one, run, setSetting } from "./db";
import { classifyEvent, opponentFrom, parseIcs, teamFrom } from "./ics";
import { matchNames, parseNameList, type MatchResult } from "./names";
import { nowLocal } from "./format";
import type { Member } from "./data";

/*
 * Heja integration
 * ----------------
 * Heja (heja.io) does not publish a developer API today. Two things work now:
 *
 *  1. Schedule sync: Heja's paid plans include "Calendar Sync", which gives a
 *     private iCal link for the team schedule. Paste it in Admin -> Settings and
 *     every training session and game is imported here (re-sync any time).
 *  2. Attendance: copy the "Going" / attended list from Heja and paste it on a
 *     session page. Names are matched to members (set a member's "Heja name"
 *     if it differs from their real name).
 *
 * If Heja later offers an API or export, add a fetch here that returns the
 * same shapes (events -> syncEvents, names -> applyAttendanceNames) and the
 * admin screens will keep working unchanged.
 */

export const HEJA_ICS_KEY = "heja_ics_url";

export async function getHejaStatus() {
  const url = await getSetting(HEJA_ICS_KEY);
  const last = await getSetting("heja_last_sync");
  return { connected: Boolean(url), url: url ?? null, lastSync: last ?? null };
}

export async function saveHejaUrl(url: string | null) {
  await setSetting(HEJA_ICS_KEY, url);
}

export type SyncReport = { added: number; updated: number; cancelled: number; games: number; total: number };

export async function syncHejaCalendar(): Promise<SyncReport> {
  const raw = await getSetting(HEJA_ICS_KEY);
  if (!raw) throw new Error("No Heja calendar link saved yet.");
  const url = raw.trim().replace(/^webcal:\/\//i, "https://");
  if (!/^https:\/\//i.test(url)) throw new Error("The calendar link should start with https:// or webcal://");

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  } catch {
    throw new Error("Couldn't reach Heja. Check the calendar link and try again.");
  }
  if (!res.ok) throw new Error(`Heja returned ${res.status}. Check the link is still valid.`);
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("That link didn't return a calendar file.");

  const report = await syncEvents(parseIcs(text));
  await setSetting("heja_last_sync", nowLocal());
  return report;
}

export async function syncEvents(events: ReturnType<typeof parseIcs>): Promise<SyncReport> {
  const report: SyncReport = { added: 0, updated: 0, cancelled: 0, games: 0, total: events.length };
  const existing = new Map(
    (await all<{ id: number; heja_uid: string }>("SELECT id, heja_uid FROM sessions WHERE heja_uid IS NOT NULL")).map(
      (r) => [r.heja_uid, r.id],
    ),
  );

  for (const ev of events) {
    const sessionId = existing.get(ev.uid);
    if (ev.cancelled) {
      // Drop cancelled events unless someone already took attendance for them.
      if (sessionId) {
        const marked = await one<{ n: number }>("SELECT COUNT(*) AS n FROM attendance WHERE session_id = ?", [sessionId]);
        if (!marked?.n) {
          await run("DELETE FROM sessions WHERE id = ?", [sessionId]);
          report.cancelled++;
        }
      }
      continue;
    }

    const kind = classifyEvent(ev.summary);
    const team = teamFrom(ev.summary);
    let gameId: number | null = null;

    if (kind === "game") {
      const game = await one<{ id: number }>("SELECT id FROM games WHERE heja_uid = ?", [ev.uid]);
      if (game) {
        // Keep scores and any opponent name the committee has tidied up.
        await run("UPDATE games SET date = ?, venue = COALESCE(?, venue) WHERE id = ?", [ev.start, ev.location ?? null, game.id]);
        gameId = game.id;
      } else {
        const r = await run(
          "INSERT INTO games (date, team, opponent, venue, home, heja_uid) VALUES (?, ?, ?, ?, ?, ?)",
          [ev.start, team, opponentFrom(ev.summary), ev.location ?? null, /\bbraehead\b/i.test(ev.location ?? "") ? 1 : 0, ev.uid],
        );
        gameId = r.lastId ?? null;
        report.games++;
      }
    }

    if (sessionId) {
      await run(
        "UPDATE sessions SET date = ?, kind = ?, title = ?, team = COALESCE(?, team), game_id = COALESCE(?, game_id) WHERE id = ?",
        [ev.start, kind, ev.summary || "Heja event", team, gameId, sessionId],
      );
      report.updated++;
    } else {
      await run("INSERT INTO sessions (date, kind, title, team, game_id, heja_uid) VALUES (?, ?, ?, ?, ?, ?)", [
        ev.start,
        kind,
        ev.summary || "Heja event",
        team,
        gameId,
        ev.uid,
      ]);
      report.added++;
    }
  }
  return report;
}

export type AttendanceImport = MatchResult<Member> & { markedAbsent: number };

/** Mark everyone in a pasted Heja list as present for a session. */
export async function applyAttendanceNames(
  sessionId: number,
  pasted: string,
  opts: { markOthersAbsent: boolean; team?: string | null },
): Promise<AttendanceImport> {
  const members = await all<Member>("SELECT * FROM members WHERE active = 1");
  const result = matchNames(parseNameList(pasted), members);

  const statements = result.matched.map(({ member }) => ({
    sql: `INSERT INTO attendance (session_id, member_id, status, source) VALUES (?, ?, 'present', 'heja')
          ON CONFLICT(session_id, member_id) DO UPDATE SET status = 'present', source = 'heja'`,
    args: [sessionId, member.id],
  }));

  let markedAbsent = 0;
  if (opts.markOthersAbsent) {
    const present = new Set(result.matched.map((m) => m.member.id));
    for (const m of members) {
      if (present.has(m.id) || (opts.team && m.team !== opts.team)) continue;
      statements.push({
        sql: `INSERT INTO attendance (session_id, member_id, status, source) VALUES (?, ?, 'absent', 'heja')
              ON CONFLICT(session_id, member_id) DO NOTHING`,
        args: [sessionId, m.id],
      });
      markedAbsent++;
    }
  }
  await batch(statements);
  return { ...result, markedAbsent };
}
