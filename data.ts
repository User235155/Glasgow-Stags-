import "server-only";
import { all, one } from "./db";
import { nowLocal, seasonRange } from "./format";

export type Member = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  team: string | null;
  position: string | null;
  number: number | null;
  university: string | null;
  heja_name: string | null;
  active: number;
};

export type Game = {
  id: number;
  date: string;
  team: string | null;
  opponent: string;
  venue: string | null;
  home: number;
  competition: string | null;
  our_score: number | null;
  their_score: number | null;
  notes: string | null;
  heja_uid: string | null;
};

export type Session = {
  id: number;
  date: string;
  kind: "training" | "game" | "other";
  title: string;
  team: string | null;
  game_id: number | null;
  heja_uid: string | null;
};

export type AttendanceStatus = "present" | "late" | "excused" | "absent";

export type FeeItem = { id: number; name: string; amount_pence: number; online: number; active: number };

export type Payment = {
  id: number;
  member_id: number | null;
  member_name: string | null;
  payer_name: string | null;
  payer_email: string | null;
  description: string | null;
  amount_pence: number;
  method: string;
  reference: string | null;
  paid_at: string;
};

export type Note = {
  id: number;
  title: string;
  body: string;
  tag: string;
  game_id: number | null;
  game_label: string | null;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  published: number;
  published_at: string | null;
};

export type Enquiry = {
  id: number;
  name: string;
  email: string;
  university: string | null;
  experience: string | null;
  message: string | null;
  handled: number;
  created_at: string;
};

// ---- Members ----------------------------------------------------------------

export function listMembers(opts: { activeOnly?: boolean; team?: string | null } = {}) {
  const where: string[] = [];
  const args: string[] = [];
  if (opts.activeOnly) where.push("active = 1");
  if (opts.team) {
    where.push("team = ?");
    args.push(opts.team);
  }
  return all<Member>(
    `SELECT * FROM members ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY active DESC, name COLLATE NOCASE`,
    args,
  );
}

export function getMember(id: number) {
  return one<Member>("SELECT * FROM members WHERE id = ?", [id]);
}

export type Balance = Member & { charged: number; paid: number; balance: number };

export function memberBalances() {
  return all<Balance>(`
    SELECT m.*,
      COALESCE((SELECT SUM(amount_pence) FROM charges c WHERE c.member_id = m.id), 0) AS charged,
      COALESCE((SELECT SUM(amount_pence) FROM payments p WHERE p.member_id = m.id), 0) AS paid,
      COALESCE((SELECT SUM(amount_pence) FROM charges c WHERE c.member_id = m.id), 0)
        - COALESCE((SELECT SUM(amount_pence) FROM payments p WHERE p.member_id = m.id), 0) AS balance
    FROM members m
    ORDER BY m.active DESC, balance DESC, m.name COLLATE NOCASE`);
}

// ---- Games & stats ----------------------------------------------------------

export function listGames(opts: { team?: string | null; season?: string } = {}) {
  const where: string[] = [];
  const args: string[] = [];
  if (opts.team) {
    where.push("team = ?");
    args.push(opts.team);
  }
  if (opts.season) {
    const [from, to] = seasonRange(opts.season);
    where.push("date >= ? AND date < ?");
    args.push(from, to);
  }
  return all<Game>(`SELECT * FROM games ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY date`, args);
}

export function upcomingGames(limit = 5, team?: string | null) {
  return all<Game>(
    `SELECT * FROM games WHERE date >= ? AND our_score IS NULL ${team ? "AND team = ?" : ""} ORDER BY date LIMIT ?`,
    team ? [nowLocal().slice(0, 10), team, limit] : [nowLocal().slice(0, 10), limit],
  );
}

export function recentResults(limit = 5, team?: string | null) {
  return all<Game>(
    `SELECT * FROM games WHERE our_score IS NOT NULL AND their_score IS NOT NULL ${team ? "AND team = ?" : ""} ORDER BY date DESC LIMIT ?`,
    team ? [team, limit] : [limit],
  );
}

export function getGame(id: number) {
  return one<Game>("SELECT * FROM games WHERE id = ?", [id]);
}

export type StatLine = {
  member_id: number;
  goals: number;
  assists: number;
  pim: number;
  saves: number;
  goals_against: number;
};

export function gameStats(gameId: number) {
  return all<StatLine>("SELECT * FROM game_stats WHERE game_id = ?", [gameId]);
}

export type LeaderRow = {
  id: number;
  name: string;
  team: string | null;
  position: string | null;
  number: number | null;
  gp: number;
  goals: number;
  assists: number;
  points: number;
  pim: number;
  saves: number;
  goals_against: number;
};

export function leaderboard(season: string, team?: string | null) {
  const [from, to] = seasonRange(season);
  return all<LeaderRow>(
    `SELECT m.id, m.name, m.team, m.position, m.number,
        COUNT(s.game_id) AS gp,
        SUM(s.goals) AS goals, SUM(s.assists) AS assists, SUM(s.goals + s.assists) AS points,
        SUM(s.pim) AS pim, SUM(s.saves) AS saves, SUM(s.goals_against) AS goals_against
      FROM game_stats s
      JOIN games g ON g.id = s.game_id
      JOIN members m ON m.id = s.member_id
      WHERE g.date >= ? AND g.date < ? ${team ? "AND g.team = ?" : ""}
      GROUP BY m.id
      ORDER BY points DESC, goals DESC, m.name COLLATE NOCASE`,
    team ? [from, to, team] : [from, to],
  );
}

export async function seasonsWithGames(): Promise<string[]> {
  const rows = await all<{ y: string; m: string }>(
    "SELECT DISTINCT substr(date,1,4) AS y, substr(date,6,2) AS m FROM games",
  );
  const set = new Set(
    rows.map((r) => {
      const start = Number(r.m) >= 8 ? Number(r.y) : Number(r.y) - 1;
      return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
    }),
  );
  return [...set].sort().reverse();
}

// ---- Attendance -------------------------------------------------------------

export function listSessions(opts: { limit?: number; upcoming?: boolean } = {}) {
  const now = nowLocal().slice(0, 10);
  return all<Session & { present: number; marked: number }>(
    `SELECT s.*,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status IN ('present','late')) AS present,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id) AS marked
      FROM sessions s
      WHERE ${opts.upcoming ? "s.date >= ?" : "s.date < ?"}
      ORDER BY s.date ${opts.upcoming ? "ASC" : "DESC"}
      LIMIT ?`,
    [now, opts.limit ?? 50],
  );
}

export function getSession(id: number) {
  return one<Session>("SELECT * FROM sessions WHERE id = ?", [id]);
}

export function sessionAttendance(id: number) {
  return all<{ member_id: number; status: AttendanceStatus; source: string }>(
    "SELECT member_id, status, source FROM attendance WHERE session_id = ?",
    [id],
  );
}

/** Share of marked attendances that were present/late, over sessions since a date. */
export async function attendanceRate(sinceLocal: string) {
  const row = await one<{ present: number; total: number }>(
    `SELECT SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) AS present, COUNT(*) AS total
      FROM attendance a JOIN sessions s ON s.id = a.session_id
      WHERE s.date >= ? AND s.date <= ?`,
    [sinceLocal, nowLocal()],
  );
  return { present: Number(row?.present ?? 0), total: Number(row?.total ?? 0) };
}

export function memberAttendance(memberId: number, limit = 20) {
  return all<{ id: number; date: string; title: string; kind: string; status: AttendanceStatus }>(
    `SELECT s.id, s.date, s.title, s.kind, a.status
      FROM attendance a JOIN sessions s ON s.id = a.session_id
      WHERE a.member_id = ? ORDER BY s.date DESC LIMIT ?`,
    [memberId, limit],
  );
}

// ---- Payments ---------------------------------------------------------------

export function listFeeItems(opts: { onlineOnly?: boolean } = {}) {
  return all<FeeItem>(
    `SELECT * FROM fee_items ${opts.onlineOnly ? "WHERE active = 1 AND online = 1" : ""} ORDER BY active DESC, name COLLATE NOCASE`,
  );
}

export function getFeeItem(id: number) {
  return one<FeeItem>("SELECT * FROM fee_items WHERE id = ?", [id]);
}

export function listPayments(opts: { limit?: number; memberId?: number; unmatched?: boolean } = {}) {
  const where: string[] = [];
  const args: number[] = [];
  if (opts.memberId) {
    where.push("p.member_id = ?");
    args.push(opts.memberId);
  }
  if (opts.unmatched) where.push("p.member_id IS NULL");
  return all<Payment>(
    `SELECT p.*, m.name AS member_name FROM payments p LEFT JOIN members m ON m.id = p.member_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY p.paid_at DESC, p.id DESC LIMIT ?`,
    [...args, opts.limit ?? 50],
  );
}

export function listCharges(memberId: number) {
  return all<{ id: number; description: string; amount_pence: number; due_date: string | null; created_at: string }>(
    "SELECT * FROM charges WHERE member_id = ? ORDER BY created_at DESC, id DESC",
    [memberId],
  );
}

// ---- Notes, news, enquiries -------------------------------------------------

export function listNotes(opts: { tag?: string | null; q?: string | null } = {}) {
  const where: string[] = [];
  const args: string[] = [];
  if (opts.tag) {
    where.push("n.tag = ?");
    args.push(opts.tag);
  }
  if (opts.q) {
    where.push("(n.title LIKE ? OR n.body LIKE ?)");
    args.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  return all<Note>(
    `SELECT n.*, CASE WHEN g.id IS NULL THEN NULL ELSE g.opponent || ' · ' || substr(g.date,1,10) END AS game_label
      FROM notes n LEFT JOIN games g ON g.id = n.game_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY n.updated_at DESC, n.id DESC`,
    args,
  );
}

export function getNote(id: number) {
  return one<Note>(
    `SELECT n.*, NULL AS game_label FROM notes n WHERE n.id = ?`,
    [id],
  );
}

export function listPosts(opts: { publishedOnly?: boolean; limit?: number } = {}) {
  return all<Post>(
    `SELECT * FROM posts ${opts.publishedOnly ? "WHERE published = 1" : ""}
      ORDER BY COALESCE(published_at, created_at) DESC, id DESC LIMIT ?`,
    [opts.limit ?? 100],
  );
}

export function getPost(id: number) {
  return one<Post>("SELECT * FROM posts WHERE id = ?", [id]);
}

export function getPublishedPost(slug: string) {
  return one<Post>("SELECT * FROM posts WHERE slug = ? AND published = 1", [slug]);
}

export function listEnquiries() {
  return all<Enquiry>("SELECT * FROM enquiries ORDER BY handled, created_at DESC");
}

// ---- Dashboard --------------------------------------------------------------

const balanceSql = `
  SELECT m.id,
    COALESCE((SELECT SUM(amount_pence) FROM charges c WHERE c.member_id = m.id), 0)
      - COALESCE((SELECT SUM(amount_pence) FROM payments p WHERE p.member_id = m.id), 0) AS balance
  FROM members m WHERE m.active = 1`;

export async function dashboardCounts() {
  const row = await one<{ members: number; owing: number; owed: number; enquiries: number; unmatched: number }>(`
    SELECT
      (SELECT COUNT(*) FROM members WHERE active = 1) AS members,
      (SELECT COUNT(*) FROM (${balanceSql}) WHERE balance > 0) AS owing,
      (SELECT COALESCE(SUM(balance), 0) FROM (${balanceSql}) WHERE balance > 0) AS owed,
      (SELECT COUNT(*) FROM enquiries WHERE handled = 0) AS enquiries,
      (SELECT COUNT(*) FROM payments WHERE member_id IS NULL) AS unmatched`);
  return {
    members: Number(row?.members ?? 0),
    owing: Number(row?.owing ?? 0),
    owed: Number(row?.owed ?? 0),
    enquiries: Number(row?.enquiries ?? 0),
    unmatched: Number(row?.unmatched ?? 0),
  };
}
