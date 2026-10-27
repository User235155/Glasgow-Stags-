"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { batch, one, run } from "@/lib/db";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { nowLocal, parseMoney, slugify } from "@/lib/format";
import { applyAttendanceNames, saveHejaUrl, syncHejaCalendar, type AttendanceImport, type SyncReport } from "@/lib/heja";
import { getFeeItem, listMembers } from "@/lib/data";

// ---- helpers ----------------------------------------------------------------

function s(fd: FormData, key: string, max = 2000): string {
  return String(fd.get(key) ?? "")
    .trim()
    .slice(0, max);
}
function orNull(v: string) {
  return v === "" ? null : v;
}
function int(fd: FormData, key: string): number | null {
  const v = s(fd, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}
function count(fd: FormData, key: string): number {
  const n = int(fd, key);
  return n != null && n > 0 ? Math.min(n, 999) : 0;
}
function id(fd: FormData, key = "id"): number | null {
  const n = int(fd, key);
  return n != null && n > 0 ? n : null;
}
/** Combine <input type=date> and optional <input type=time> into a local string. */
function when(fd: FormData, dateKey = "date", timeKey = "time"): string | null {
  const d = s(fd, dateKey);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = s(fd, timeKey);
  return /^\d{2}:\d{2}$/.test(t) ? `${d}T${t}` : d;
}
function team(fd: FormData, key = "team"): string | null {
  const t = s(fd, key);
  return ["A", "B", "C"].includes(t) ? t : null;
}
/** Where to send the user after a form that can live on several pages. */
function returnTo(fd: FormData, fallback = "/admin/payments") {
  const r = s(fd, "return_to", 200);
  return /^\/admin(\/[\w/-]*)?$/.test(r) ? r : fallback;
}
function back(path: string, msg: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}msg=${encodeURIComponent(msg)}`);
}

// ---- auth -------------------------------------------------------------------

export async function login(fd: FormData) {
  if (!checkPassword(s(fd, "password", 500))) {
    await new Promise((r) => setTimeout(r, 800));
    redirect("/admin/login?error=1");
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

// ---- members ----------------------------------------------------------------

export async function saveMember(fd: FormData) {
  await requireAdmin();
  const name = s(fd, "name", 120);
  if (!name) back("/admin/members", "Name is required");
  const values = [
    name,
    orNull(s(fd, "email", 200).toLowerCase()),
    orNull(s(fd, "phone", 40)),
    team(fd),
    orNull(s(fd, "position", 20)),
    int(fd, "number"),
    orNull(s(fd, "university", 120)),
    orNull(s(fd, "heja_name", 120)),
    fd.get("active") === "on" || !fd.has("id") ? 1 : 0,
  ];
  const memberId = id(fd);
  if (memberId) {
    await run(
      `UPDATE members SET name=?, email=?, phone=?, team=?, position=?, number=?, university=?, heja_name=?, active=? WHERE id=?`,
      [...values, memberId],
    );
    back(`/admin/members/${memberId}`, "Member saved");
  }
  const r = await run(
    `INSERT INTO members (name, email, phone, team, position, number, university, heja_name, active) VALUES (?,?,?,?,?,?,?,?,?)`,
    values,
  );
  back(`/admin/members/${r.lastId}`, `${name} added`);
}

export async function bulkAddMembers(fd: FormData) {
  await requireAdmin();
  const lines = s(fd, "lines", 50000).split(/\r?\n/);
  const statements = [];
  for (const line of lines) {
    const [name, email, t] = line.split(/[,\t]/).map((x) => x?.trim() ?? "");
    if (!name) continue;
    statements.push({
      sql: "INSERT INTO members (name, email, team) VALUES (?, ?, ?)",
      args: [name, email ? email.toLowerCase() : null, ["A", "B", "C"].includes(t?.toUpperCase()) ? t.toUpperCase() : null],
    });
  }
  await batch(statements);
  back("/admin/members", `Added ${statements.length} member${statements.length === 1 ? "" : "s"}`);
}

export async function deleteMember(fd: FormData) {
  await requireAdmin();
  const memberId = id(fd);
  if (!memberId) return;
  await batch([
    { sql: "DELETE FROM attendance WHERE member_id = ?", args: [memberId] },
    { sql: "DELETE FROM game_stats WHERE member_id = ?", args: [memberId] },
    { sql: "DELETE FROM charges WHERE member_id = ?", args: [memberId] },
    { sql: "UPDATE payments SET member_id = NULL WHERE member_id = ?", args: [memberId] },
    { sql: "DELETE FROM members WHERE id = ?", args: [memberId] },
  ]);
  back("/admin/members", "Member deleted");
}

// ---- games & stats ----------------------------------------------------------

export async function saveGame(fd: FormData) {
  await requireAdmin();
  const date = when(fd);
  const opponent = s(fd, "opponent", 120);
  if (!date || !opponent) back("/admin/games", "Date and opponent are required");
  const values = [
    date,
    team(fd),
    opponent,
    orNull(s(fd, "venue", 120)),
    s(fd, "home") === "0" ? 0 : 1,
    orNull(s(fd, "competition", 120)),
    int(fd, "our_score"),
    int(fd, "their_score"),
    orNull(s(fd, "notes", 5000)),
  ];
  const gameId = id(fd);
  if (gameId) {
    await run(
      `UPDATE games SET date=?, team=?, opponent=?, venue=?, home=?, competition=?, our_score=?, their_score=?, notes=? WHERE id=?`,
      [...values, gameId],
    );
    back(`/admin/games/${gameId}`, "Game saved");
  }
  const r = await run(
    `INSERT INTO games (date, team, opponent, venue, home, competition, our_score, their_score, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
    values,
  );
  back(`/admin/games/${r.lastId}`, "Game added");
}

export async function deleteGame(fd: FormData) {
  await requireAdmin();
  const gameId = id(fd);
  if (!gameId) return;
  await batch([
    { sql: "DELETE FROM game_stats WHERE game_id = ?", args: [gameId] },
    { sql: "UPDATE sessions SET game_id = NULL WHERE game_id = ?", args: [gameId] },
    { sql: "UPDATE notes SET game_id = NULL WHERE game_id = ?", args: [gameId] },
    { sql: "DELETE FROM games WHERE id = ?", args: [gameId] },
  ]);
  back("/admin/games", "Game deleted");
}

export async function saveGameStats(fd: FormData) {
  await requireAdmin();
  const gameId = id(fd, "game_id");
  if (!gameId) return;
  const memberIds = fd.getAll("member").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const statements = memberIds.map((m) => {
    const line = {
      goals: count(fd, `g_${m}`),
      assists: count(fd, `a_${m}`),
      pim: count(fd, `pim_${m}`),
      saves: count(fd, `sv_${m}`),
      goals_against: count(fd, `ga_${m}`),
    };
    const played = fd.get(`played_${m}`) === "on" || Object.values(line).some((v) => v > 0);
    return played
      ? {
          sql: `INSERT INTO game_stats (game_id, member_id, goals, assists, pim, saves, goals_against) VALUES (?,?,?,?,?,?,?)
                ON CONFLICT(game_id, member_id) DO UPDATE SET goals=excluded.goals, assists=excluded.assists, pim=excluded.pim,
                saves=excluded.saves, goals_against=excluded.goals_against`,
          args: [gameId, m, line.goals, line.assists, line.pim, line.saves, line.goals_against],
        }
      : { sql: "DELETE FROM game_stats WHERE game_id = ? AND member_id = ?", args: [gameId, m] };
  });
  await batch(statements);
  back(`/admin/games/${gameId}`, "Stats saved");
}

// ---- attendance -------------------------------------------------------------

export async function saveSession(fd: FormData) {
  await requireAdmin();
  const date = when(fd);
  if (!date) back("/admin/attendance", "Pick a date");
  const kind = ["training", "game", "other"].includes(s(fd, "kind")) ? s(fd, "kind") : "training";
  const title = s(fd, "title", 120) || (kind === "training" ? "Training" : kind === "game" ? "Game" : "Session");
  const r = await run("INSERT INTO sessions (date, kind, title, team) VALUES (?, ?, ?, ?)", [date, kind, title, team(fd)]);
  redirect(`/admin/attendance/${r.lastId}`);
}

export async function deleteSession(fd: FormData) {
  await requireAdmin();
  const sessionId = id(fd);
  if (!sessionId) return;
  await batch([
    { sql: "DELETE FROM attendance WHERE session_id = ?", args: [sessionId] },
    { sql: "DELETE FROM sessions WHERE id = ?", args: [sessionId] },
  ]);
  back("/admin/attendance", "Session deleted");
}

const STATUSES = ["present", "late", "excused", "absent"];

export async function saveAttendance(fd: FormData) {
  await requireAdmin();
  const sessionId = id(fd, "session_id");
  if (!sessionId) return;
  const statements = fd
    .getAll("member")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .map((m) => {
      const status = s(fd, `status_${m}`);
      return STATUSES.includes(status)
        ? {
            sql: `INSERT INTO attendance (session_id, member_id, status, source) VALUES (?, ?, ?, 'manual')
                  ON CONFLICT(session_id, member_id) DO UPDATE SET status = excluded.status,
                  source = CASE WHEN attendance.status = excluded.status THEN attendance.source ELSE 'manual' END`,
            args: [sessionId, m, status],
          }
        : { sql: "DELETE FROM attendance WHERE session_id = ? AND member_id = ?", args: [sessionId, m] };
    });
  await batch(statements);
  back(`/admin/attendance/${sessionId}`, "Attendance saved");
}

export type ImportState = { ok: true; report: AttendanceImport } | { ok: false; error: string } | null;

export async function importHejaAttendance(_prev: ImportState, fd: FormData): Promise<ImportState> {
  await requireAdmin();
  const sessionId = id(fd, "session_id");
  const pasted = s(fd, "pasted", 20000);
  if (!sessionId || !pasted) return { ok: false, error: "Paste the list of names from Heja first." };
  const session = await one<{ team: string | null }>("SELECT team FROM sessions WHERE id = ?", [sessionId]);
  const report = await applyAttendanceNames(sessionId, pasted, {
    markOthersAbsent: fd.get("others_absent") === "on",
    team: session?.team,
  });
  revalidatePath(`/admin/attendance/${sessionId}`);
  return { ok: true, report };
}

// ---- Heja settings ----------------------------------------------------------

export async function saveHejaSettings(fd: FormData) {
  await requireAdmin();
  const url = s(fd, "heja_ics_url", 1000);
  if (url && !/^(https|webcal):\/\//i.test(url)) back("/admin/settings", "That doesn't look like a calendar link");
  await saveHejaUrl(url || null);
  back("/admin/settings", url ? "Heja calendar link saved" : "Heja disconnected");
}

export type SyncState = { ok: true; report: SyncReport } | { ok: false; error: string } | null;

export async function runHejaSync(_prev: SyncState): Promise<SyncState> {
  await requireAdmin();
  try {
    const report = await syncHejaCalendar();
    revalidatePath("/admin", "layout");
    return { ok: true, report };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
}

// ---- payments ---------------------------------------------------------------

export async function saveFeeItem(fd: FormData) {
  await requireAdmin();
  const name = s(fd, "name", 120);
  const amount = parseMoney(s(fd, "amount"));
  if (!name || !amount) back("/admin/payments", "Fee needs a name and an amount");
  await run("INSERT INTO fee_items (name, amount_pence, online, active) VALUES (?, ?, ?, 1)", [
    name,
    amount,
    fd.get("online") === "on" ? 1 : 0,
  ]);
  back("/admin/payments", `Added fee: ${name}`);
}

export async function toggleFeeItem(fd: FormData) {
  await requireAdmin();
  const feeId = id(fd);
  if (!feeId) return;
  await run("UPDATE fee_items SET active = 1 - active WHERE id = ?", [feeId]);
  back("/admin/payments", "Fee updated");
}

export async function addCharge(fd: FormData) {
  await requireAdmin();
  const item = id(fd, "fee_item_id") ? await getFeeItem(id(fd, "fee_item_id")!) : undefined;
  const amount = parseMoney(s(fd, "amount")) ?? item?.amount_pence ?? null;
  const description = s(fd, "description", 200) || item?.name || "";
  const target = s(fd, "target");
  if (!amount || !description || !target) back(returnTo(fd), "Charge needs who, what and how much");

  let memberIds: number[];
  if (target === "all") memberIds = (await listMembers({ activeOnly: true })).map((m) => m.id);
  else if (target.startsWith("team:")) memberIds = (await listMembers({ activeOnly: true, team: target.slice(5) })).map((m) => m.id);
  else memberIds = [Number(target)].filter((n) => Number.isInteger(n) && n > 0);

  const due = orNull(s(fd, "due_date"));
  await batch(
    memberIds.map((m) => ({
      sql: "INSERT INTO charges (member_id, description, amount_pence, due_date) VALUES (?, ?, ?, ?)",
      args: [m, description, amount, due],
    })),
  );
  back(returnTo(fd), `Charged ${memberIds.length} member${memberIds.length === 1 ? "" : "s"}`);
}

export async function deleteCharge(fd: FormData) {
  await requireAdmin();
  const chargeId = id(fd);
  if (chargeId) await run("DELETE FROM charges WHERE id = ?", [chargeId]);
  back(returnTo(fd), "Charge removed");
}

export async function recordPayment(fd: FormData) {
  await requireAdmin();
  const memberId = id(fd, "member_id");
  const amount = parseMoney(s(fd, "amount"));
  if (!memberId || !amount) back("/admin/payments", "Payment needs a member and an amount");
  const method = ["cash", "bank", "stripe", "other"].includes(s(fd, "method")) ? s(fd, "method") : "other";
  await run(
    "INSERT INTO payments (member_id, description, amount_pence, method, reference, paid_at) VALUES (?, ?, ?, ?, ?, ?)",
    [memberId, orNull(s(fd, "description", 200)), amount, method, orNull(s(fd, "reference", 120)), when(fd) ?? nowLocal()],
  );
  back(returnTo(fd), "Payment recorded");
}

export async function assignPayment(fd: FormData) {
  await requireAdmin();
  const paymentId = id(fd);
  const memberId = id(fd, "member_id");
  if (paymentId && memberId) await run("UPDATE payments SET member_id = ? WHERE id = ?", [memberId, paymentId]);
  back("/admin/payments", "Payment assigned");
}

export async function deletePayment(fd: FormData) {
  await requireAdmin();
  const paymentId = id(fd);
  if (paymentId) await run("DELETE FROM payments WHERE id = ?", [paymentId]);
  back(returnTo(fd), "Payment removed");
}

// ---- notes ------------------------------------------------------------------

export async function saveNote(fd: FormData) {
  await requireAdmin();
  const title = s(fd, "title", 200);
  if (!title) back("/admin/notes", "Give the note a title");
  const tag = ["game", "training", "committee", "general"].includes(s(fd, "tag")) ? s(fd, "tag") : "general";
  const values = [title, s(fd, "body", 20000), tag, id(fd, "game_id")];
  const noteId = id(fd);
  if (noteId) {
    await run("UPDATE notes SET title=?, body=?, tag=?, game_id=?, updated_at=datetime('now') WHERE id=?", [...values, noteId]);
    back(returnTo(fd, "/admin/notes"), "Note saved");
  }
  await run("INSERT INTO notes (title, body, tag, game_id) VALUES (?, ?, ?, ?)", values);
  back(returnTo(fd, "/admin/notes"), "Note added");
}

export async function deleteNote(fd: FormData) {
  await requireAdmin();
  const noteId = id(fd);
  if (noteId) await run("DELETE FROM notes WHERE id = ?", [noteId]);
  back("/admin/notes", "Note deleted");
}

// ---- news -------------------------------------------------------------------

export async function savePost(fd: FormData) {
  await requireAdmin();
  const title = s(fd, "title", 200);
  if (!title) back("/admin/news", "Give the post a title");
  const publish = fd.get("published") === "on";
  const postId = id(fd);
  const existing = postId
    ? await one<{ published_at: string | null }>("SELECT published_at FROM posts WHERE id = ?", [postId])
    : undefined;
  const publishedAt = publish ? (existing?.published_at ?? nowLocal()) : null;
  const values = [title, orNull(s(fd, "summary", 300)), s(fd, "body", 50000), publish ? 1 : 0, publishedAt];

  if (postId) {
    await run("UPDATE posts SET title=?, summary=?, body=?, published=?, published_at=? WHERE id=?", [...values, postId]);
    back(`/admin/news/${postId}`, publish ? "Post saved and live" : "Draft saved");
  }
  let slug = slugify(title) || "post";
  if (await one("SELECT 1 FROM posts WHERE slug = ?", [slug])) slug = `${slug}-${Date.now().toString(36)}`;
  const r = await run("INSERT INTO posts (title, summary, body, published, published_at, slug) VALUES (?,?,?,?,?,?)", [
    ...values,
    slug,
  ]);
  back(`/admin/news/${r.lastId}`, publish ? "Post published" : "Draft saved");
}

export async function deletePost(fd: FormData) {
  await requireAdmin();
  const postId = id(fd);
  if (postId) await run("DELETE FROM posts WHERE id = ?", [postId]);
  back("/admin/news", "Post deleted");
}

// ---- enquiries --------------------------------------------------------------

export async function toggleEnquiry(fd: FormData) {
  await requireAdmin();
  const enquiryId = id(fd);
  if (enquiryId) await run("UPDATE enquiries SET handled = 1 - handled WHERE id = ?", [enquiryId]);
  back("/admin/enquiries", "Updated");
}

export async function enquiryToMember(fd: FormData) {
  await requireAdmin();
  const enquiryId = id(fd);
  const e = enquiryId
    ? await one<{ name: string; email: string; university: string | null }>(
        "SELECT name, email, university FROM enquiries WHERE id = ?",
        [enquiryId],
      )
    : undefined;
  if (!e) back("/admin/enquiries", "Enquiry not found");
  const r = await run("INSERT INTO members (name, email, university) VALUES (?, ?, ?)", [e.name, e.email.toLowerCase(), e.university]);
  await run("UPDATE enquiries SET handled = 1 WHERE id = ?", [enquiryId]);
  back(`/admin/members/${r.lastId}`, `${e.name} added to the roster`);
}

export async function deleteEnquiry(fd: FormData) {
  await requireAdmin();
  const enquiryId = id(fd);
  if (enquiryId) await run("DELETE FROM enquiries WHERE id = ?", [enquiryId]);
  back("/admin/enquiries", "Enquiry deleted");
}
