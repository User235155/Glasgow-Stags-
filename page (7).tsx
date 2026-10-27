import Link from "next/link";
import { getNote, listGames, listNotes } from "@/lib/data";
import { formatDate, nowLocal, seasonOf } from "@/lib/format";
import { Flash, NOTE_TAGS, PageHead } from "@/components/admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteNote, saveNote } from "../../actions";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; edit?: string; msg?: string }>;
}) {
  const { tag: tagParam, q, edit, msg } = await searchParams;
  const tag = NOTE_TAGS.some((t) => t.value === tagParam) ? tagParam! : null;
  const [notes, editing, games] = await Promise.all([
    listNotes({ tag, q: q?.trim() || null }),
    edit ? getNote(Number(edit)) : Promise.resolve(undefined),
    listGames({ season: seasonOf(nowLocal()) }),
  ]);
  const tabLink = (t: string | null) => {
    const p = new URLSearchParams();
    if (t) p.set("tag", t);
    if (q) p.set("q", q);
    return `/admin/notes${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHead title="Notes" sub="Game reports, training plans, committee minutes — anything worth remembering." />
      <Flash msg={msg} />

      <div className="cols">
        <section className="panel">
          <div className="panel-head">
            <nav className="tabs" style={{ marginBottom: 0 }} aria-label="Filter by tag">
              <Link href={tabLink(null)} aria-current={!tag}>
                All
              </Link>
              {NOTE_TAGS.map((t) => (
                <Link key={t.value} href={tabLink(t.value)} aria-current={tag === t.value}>
                  {t.label}
                </Link>
              ))}
            </nav>
            <form method="get" style={{ display: "flex", gap: 6 }}>
              {tag && <input type="hidden" name="tag" value={tag} />}
              <input name="q" defaultValue={q} placeholder="Search notes" className="seg-select" style={{ fontWeight: 400 }} aria-label="Search notes" />
            </form>
          </div>
          {notes.length === 0 ? (
            <p className="empty-a">{q ? "No notes match that search." : "No notes yet — write the first one on the right."}</p>
          ) : (
            notes.map((n) => (
              <article key={n.id} className="note-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                  <div>
                    <h3>{n.title}</h3>
                    <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                      <span className="pill">{n.tag}</span> {formatDate(n.updated_at.replace(" ", "T"), { year: true })}
                      {n.game_id && n.game_label && (
                        <>
                          {" · "}
                          <Link href={`/admin/games/${n.game_id}`}>{n.game_label}</Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Link href={`/admin/notes?edit=${n.id}`} className="link-btn" style={{ textDecoration: "underline" }}>
                      edit
                    </Link>
                    <form action={deleteNote} className="inline">
                      <input type="hidden" name="id" value={n.id} />
                      <ConfirmButton message="Delete this note?" className="link-btn">
                        delete
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
                {n.body && <div className="body">{n.body}</div>}
              </article>
            ))
          )}
        </section>

        <section className="panel" id="note-form">
          <div className="panel-head">
            <h2>{editing ? "Edit note" : "New note"}</h2>
            {editing && <Link href="/admin/notes">Cancel</Link>}
          </div>
          <form action={saveNote} className="aform" key={editing?.id ?? "new"}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className="f">
              <span>Title</span>
              <input name="title" required defaultValue={editing?.title} />
            </label>
            <div className="row">
              <label className="f">
                <span>Tag</span>
                <select name="tag" defaultValue={editing?.tag ?? tag ?? "general"}>
                  {NOTE_TAGS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="f">
                <span>Link to game</span>
                <select name="game_id" defaultValue={editing?.game_id ?? ""}>
                  <option value="">None</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {formatDate(g.date)} · {g.opponent}
                      {g.team ? ` (${g.team})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="f">
              <span>Note</span>
              <textarea name="body" defaultValue={editing?.body} style={{ minHeight: 220 }} />
            </label>
            <button className="btn btn-sm btn-dark" type="submit" style={{ justifySelf: "start" }}>
              {editing ? "Save note" : "Add note"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
