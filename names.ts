// Matching names pasted from Heja (RSVP / attendance lists) to club members.

export function normalizeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/['-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const STATUS_WORDS = /\b(going|attending|attended|present|yes|maybe)\b/gi;
const NEGATIVE = /\b(not going|declined|absent|can'?t make it)\b/i;

/** Turn a pasted block (one name per line, or comma separated) into clean names. */
export function parseNameList(text: string): string[] {
  const hasNewlines = /\n/.test(text.trim());
  const parts = hasNewlines ? text.split(/\r?\n|;/) : text.split(/[,;]/);
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of parts) {
    if (NEGATIVE.test(part)) continue;
    const name = part
      .replace(/^\s*(?:\d+[.)]|[-*•✓✔☑✅])\s*/u, "")
      .replace(/\(.*?\)/g, "")
      .replace(/\s[-–]\s.*$/, "")
      .replace(STATUS_WORDS, "")
      .replace(/[^\p{L}\s'.-]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    const key = normalizeName(name);
    if (key && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

export type MatchableMember = { id: number; name: string; heja_name?: string | null };

export type MatchResult<M> = {
  matched: { input: string; member: M }[];
  unmatched: string[];
  ambiguous: { input: string; candidates: M[] }[];
};

export function matchNames<M extends MatchableMember>(inputs: string[], members: M[]): MatchResult<M> {
  const result: MatchResult<M> = { matched: [], unmatched: [], ambiguous: [] };
  const keyed = members.map((m) => ({
    m,
    keys: [m.name, m.heja_name].filter(Boolean).map((n) => normalizeName(n as string)),
  }));

  for (const input of inputs) {
    const n = normalizeName(input);
    if (!n) continue;
    let hits = keyed.filter((k) => k.keys.includes(n));

    if (hits.length === 0) {
      // "Alex S" / "Alex S." -> first name plus last initial.
      const [first, ...rest] = n.split(" ");
      const lastInitial = rest.length === 1 && rest[0].length === 1 ? rest[0] : null;
      hits = keyed.filter((k) =>
        k.keys.some((key) => {
          const parts = key.split(" ");
          if (parts[0] !== first) return false;
          if (rest.length === 0) return true;
          return lastInitial != null && parts.length > 1 && parts[parts.length - 1].startsWith(lastInitial);
        }),
      );
    }

    if (hits.length === 1) result.matched.push({ input, member: hits[0].m });
    else if (hits.length === 0) result.unmatched.push(input);
    else result.ambiguous.push({ input, candidates: hits.map((h) => h.m) });
  }
  return result;
}
