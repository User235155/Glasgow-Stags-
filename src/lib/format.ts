export const TZ = "Europe/London";

export function formatMoney(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  const pounds = Math.floor(abs / 100).toLocaleString("en-GB");
  const rem = abs % 100;
  return `${sign}£${pounds}${rem ? "." + String(rem).padStart(2, "0") : ""}`;
}

/** "12.50" / "£12.5" / "12" -> 1250. Returns null for anything unparseable or negative. */
export function parseMoney(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = String(input).replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Current Glasgow wall-clock time as "YYYY-MM-DDTHH:MM". */
export function nowLocal(date = new Date()): string {
  return toLocal(date);
}

/** Convert an absolute instant to a Glasgow wall-clock string. */
export function toLocal(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// Local strings carry no zone; parse them as UTC purely to read the fields back.
function fields(local: string) {
  const [d, t = "00:00"] = local.split("T");
  return new Date(`${d}T${t.slice(0, 5)}:00Z`);
}

export function formatDate(local: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  return fields(local).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: opts.weekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: opts.year ? "numeric" : undefined,
  });
}

export function formatTime(local: string): string {
  if (!local.includes("T")) return "";
  return fields(local)
    .toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "numeric", minute: "2-digit", hour12: true })
    .replace(":00", "")
    .replace(/\s+/g, "");
}

export function formatDateTime(local: string): string {
  const time = formatTime(local);
  return `${formatDate(local, { weekday: true })}${time ? ` · ${time}` : ""}`;
}

export function monthLabel(local: string): string {
  return fields(local).toLocaleDateString("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });
}

/** Hockey seasons run August to July: "2026-10-27" -> "2026/27". */
export function seasonOf(local: string): string {
  const year = Number(local.slice(0, 4));
  const month = Number(local.slice(5, 7));
  const start = month >= 8 ? year : year - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Date range [from, to) covering a season label like "2026/27". */
export function seasonRange(season: string): [string, string] {
  const start = Number(season.slice(0, 4));
  return [`${start}-08-01`, `${start + 1}-08-01`];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type Result = "W" | "L" | "D";
export function resultOf(ours: number | null, theirs: number | null): Result | null {
  if (ours == null || theirs == null) return null;
  return ours > theirs ? "W" : ours < theirs ? "L" : "D";
}
