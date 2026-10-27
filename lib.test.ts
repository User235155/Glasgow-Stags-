import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney, seasonOf, toLocal, formatTime, resultOf, slugify } from "./format";
import { parseIcs, classifyEvent, opponentFrom, teamFrom } from "./ics";
import { matchNames, parseNameList } from "./names";

describe("money", () => {
  it("formats pence", () => {
    expect(formatMoney(12000)).toBe("£120");
    expect(formatMoney(1250)).toBe("£12.50");
    expect(formatMoney(-505)).toBe("-£5.05");
    expect(formatMoney(123456)).toBe("£1,234.56");
  });
  it("parses user input", () => {
    expect(parseMoney("12.5")).toBe(1250);
    expect(parseMoney("£120")).toBe(12000);
    expect(parseMoney("1,000.00")).toBe(100000);
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("-5")).toBeNull();
    expect(parseMoney("1.234")).toBeNull();
  });
});

describe("dates", () => {
  it("converts instants to Glasgow wall-clock across BST", () => {
    expect(toLocal(new Date("2026-07-01T20:30:00Z"))).toBe("2026-07-01T21:30");
    expect(toLocal(new Date("2026-12-01T20:30:00Z"))).toBe("2026-12-01T20:30");
  });
  it("works out the season", () => {
    expect(seasonOf("2026-10-27T21:30")).toBe("2026/27");
    expect(seasonOf("2027-03-01")).toBe("2026/27");
    expect(seasonOf("2027-08-01")).toBe("2027/28");
  });
  it("formats times compactly", () => {
    expect(formatTime("2026-10-27T21:30")).toBe("9:30pm");
    expect(formatTime("2026-10-27T19:00")).toBe("7pm");
  });
  it("derives results and slugs", () => {
    expect(resultOf(4, 2)).toBe("W");
    expect(resultOf(1, 3)).toBe("L");
    expect(resultOf(null, 3)).toBeNull();
    expect(slugify("Recruitment for 2026/27 — now open!")).toBe("recruitment-for-2026-27-now-open");
  });
});

const ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:evt-1@heja",
  "DTSTART:20261102T213000Z",
  "SUMMARY:Training",
  "LOCATION:Braehead Arena\\, Renfrew",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:evt-2@heja",
  "DTSTART;TZID=Europe/London:20260912T180000",
  "SUMMARY:A Team vs Heriot-Watt - League",
  "DESCRIPTION:Bring both jerseys\\nWarm-up 5pm",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:evt-3@heja",
  "DTSTART;VALUE=DATE:20261205",
  "SUMMARY:Christmas social",
  "STATUS:CANCELLED",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:evt-4@heja",
  "DTSTART;TZID=America/New_York:20260912T120000",
  "SUMMARY:Long sum",
  " mary folded",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("ics", () => {
  const events = parseIcs(ICS);
  it("reads events, escapes and folding", () => {
    expect(events).toHaveLength(4);
    expect(events[0]).toMatchObject({ uid: "evt-1@heja", start: "2026-11-02T21:30", location: "Braehead Arena, Renfrew" });
    expect(events[1].start).toBe("2026-09-12T18:00");
    expect(events[1].description).toBe("Bring both jerseys\nWarm-up 5pm");
    expect(events[2]).toMatchObject({ start: "2026-12-05", cancelled: true });
    expect(events[3].summary).toBe("Long summary folded");
  });
  it("converts foreign zones to Glasgow time", () => {
    expect(events[3].start).toBe("2026-09-12T17:00");
  });
  it("classifies and extracts game details", () => {
    expect(classifyEvent("A Team vs Heriot-Watt - League")).toBe("game");
    expect(classifyEvent("Stags v Dundee")).toBe("game");
    expect(classifyEvent("Monday ice time")).toBe("training");
    expect(classifyEvent("Christmas social")).toBe("other");
    expect(opponentFrom("A Team vs Heriot-Watt - League")).toBe("Heriot-Watt");
    expect(opponentFrom("Stags v Dundee (away)")).toBe("Dundee");
    expect(teamFrom("A Team vs Heriot-Watt")).toBe("A");
    expect(teamFrom("Game - team c")).toBe("C");
    expect(teamFrom("Training")).toBeNull();
  });
});

describe("heja name matching", () => {
  const members = [
    { id: 1, name: "Alex Smith", heja_name: null },
    { id: 2, name: "Jamie O'Neill", heja_name: "Jamie ON" },
    { id: 3, name: "Chris Brown", heja_name: null },
    { id: 4, name: "Chris Black", heja_name: null },
    { id: 5, name: "Zoë Martin", heja_name: null },
  ];
  it("cleans pasted lists", () => {
    const pasted = "1. Alex Smith (Going)\n✓ Jamie ON\n• Zoe Martin - attending\nSam Lee - Not going\n\nalex smith";
    expect(parseNameList(pasted)).toEqual(["Alex Smith", "Jamie ON", "Zoe Martin"]);
    expect(parseNameList("Alex Smith, Chris B")).toEqual(["Alex Smith", "Chris B"]);
  });
  it("matches exact, heja alias, accents and initials; flags ambiguity", () => {
    const res = matchNames(["alex smith", "Jamie ON", "Zoe Martin", "Chris Br", "Chris B", "Nobody Here", "Chris"], members);
    expect(res.matched.map((m) => m.member.id)).toEqual([1, 2, 5]);
    expect(res.unmatched).toEqual(["Chris Br", "Nobody Here"]);
    expect(res.ambiguous.map((a) => a.input)).toEqual(["Chris B", "Chris"]);
  });
});
