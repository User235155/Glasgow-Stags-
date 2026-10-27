import { toLocal } from "./format";

// Minimal iCalendar (RFC 5545) reader: enough to import a team schedule feed
// such as Heja's "Calendar Sync" link. Times come back as Glasgow wall-clock
// strings, matching how the rest of the app stores dates.

export type IcsEvent = {
  uid: string;
  summary: string;
  start: string; // "YYYY-MM-DDTHH:MM", or "YYYY-MM-DD" for all-day events
  end?: string;
  location?: string;
  description?: string;
  cancelled: boolean;
};

type Prop = { name: string; params: Record<string, string>; value: string };

function parseLine(line: string): Prop | null {
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ":" && !inQuotes) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;
  const [name, ...paramParts] = line.slice(0, colon).split(";");
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

function unescapeText(v: string) {
  return v.replace(/\\([\\;,nN])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));
}

/** Instant for a wall-clock time in an arbitrary IANA zone. */
function zonedToInstant(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const asSeen = new Date(
    new Date(guess).toLocaleString("en-US", { timeZone: tz }) + " UTC",
  ).getTime();
  return new Date(guess - (asSeen - guess));
}

export function parseIcsDate(prop: Prop): string | null {
  const m = prop.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (!h) return `${y}-${mo}-${d}`;
  if (z) return toLocal(new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)));
  const tz = prop.params.TZID;
  if (tz && tz !== "Europe/London") {
    try {
      return toLocal(zonedToInstant(+y, +mo, +d, +h, +mi, tz));
    } catch {
      // Unknown zone name: fall through and treat as local time.
    }
  }
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

export function parseIcs(text: string): IcsEvent[] {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events: IcsEvent[] = [];
  let cur: Partial<IcsEvent> | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "BEGIN:VEVENT") {
      cur = { cancelled: false };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur?.uid && cur.start) {
        events.push({ summary: "", ...cur } as IcsEvent);
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const prop = parseLine(line);
    if (!prop) continue;
    switch (prop.name) {
      case "UID":
        cur.uid = prop.value.trim();
        break;
      case "SUMMARY":
        cur.summary = unescapeText(prop.value).trim();
        break;
      case "LOCATION":
        cur.location = unescapeText(prop.value).trim() || undefined;
        break;
      case "DESCRIPTION":
        cur.description = unescapeText(prop.value).trim() || undefined;
        break;
      case "DTSTART":
        cur.start = parseIcsDate(prop) ?? undefined;
        break;
      case "DTEND":
        cur.end = parseIcsDate(prop) ?? undefined;
        break;
      case "STATUS":
        cur.cancelled = prop.value.trim().toUpperCase() === "CANCELLED";
        break;
    }
  }
  return events;
}

export type EventKind = "game" | "training" | "other";

export function classifyEvent(summary: string): EventKind {
  if (/\b(game|match|fixture|vs\.?|v\.?)\b/i.test(summary) || /\s@\s/.test(summary)) return "game";
  if (/\b(train(ing)?|practi[cs]e|ice time|skate|session|drills?)\b/i.test(summary)) return "training";
  return "other";
}

/** "A Team vs Edinburgh" -> "Edinburgh"; falls back to the whole summary. */
export function opponentFrom(summary: string): string {
  const m = summary.match(/\b(?:vs\.?|v\.?|against)\s+(.+)$/i) ?? summary.match(/\s@\s(.+)$/);
  // Trim trailing " - Braehead" or " (away)", but keep hyphenated names like Heriot-Watt.
  return (m?.[1] ?? summary).replace(/\s+[-–]\s.*$|\s*\(.*$/, "").trim() || summary;
}

export function teamFrom(summary: string): "A" | "B" | "C" | null {
  const m = summary.match(/\b([ABC])[\s-]?(?:team|squad)\b/i) ?? summary.match(/\b(?:team|squad)\s+([ABC])\b/i);
  return m ? (m[1].toUpperCase() as "A" | "B" | "C") : null;
}
