import Link from "next/link";
import { notFound } from "next/navigation";
import { gameStats, getGame, listMembers, listNotes } from "@/lib/data";
import { formatDateTime, resultOf } from "@/lib/format";
import { Flash, PageHead } from "@/components/admin";
import { GameForm } from "@/components/GameForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteGame, saveGameStats, saveNote } from "../../../actions";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; all?: string }>;
}) {
  const gameId = Number((await params).id);
  const { msg, all } = await searchParams;
  const game = await getGame(gameId);
  if (!game) notFound();

  const [stats, members, notes] = await Promise.all([gameStats(gameId), listMembers({ activeOnly: true }), listNotes()]);
  const byMember = new Map(stats.map((s) => [s.member_id, s]));
  const showAll = all === "1" || !game.team;
  const roster = members.filter((m) => showAll || m.team === game.team || byMember.has(m.id));
  const gameNotes = notes.filter((n) => n.game_id === gameId);
  const result = resultOf(game.our_score, game.their_score);
  const totals = stats.reduce((acc, s) => ({ g: acc.g + s.goals, a: acc.a + s.assists, pim: acc.pim + s.pim }), { g: 0, a: 0, pim: 0 });

  return (
    <>
      <PageHead
        title={`${game.home ? "vs" : "@"} ${game.opponent}`}
        crumb={{ href: "/admin/games", label: "Games" }}
        sub={
          <>
            {formatDateTime(game.date)}
            {game.team ? ` · ${game.team} Team` : ""}
            {game.venue ? ` · ${game.venue}` : ""}
            {result && (
              <>
                {" · "}
                <span className={`result result-${result}`} style={{ verticalAlign: "middle" }}>
                  {result}
                </span>{" "}
                <strong className="num">
                  {game.our_score}–{game.their_score}
                </strong>
              </>
            )}
          </>
        }
      />
      <Flash msg={msg} />

      <div className="cols">
        <div className="stack">
          <section className="panel panel-flush">
            <div className="panel-head">
              <h2>Stat sheet</h2>
              {game.team && (
                <Link href={showAll ? `/admin/games/${gameId}` : `/admin/games/${gameId}?all=1`}>
                  {showAll ? `Only ${game.team} Team` : "Show all members"}
                </Link>
              )}
            </div>
            <form action={saveGameStats}>
              <input type="hidden" name="game_id" value={gameId} />
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th className="c">Played</th>
                      <th className="c">G</th>
                      <th className="c">A</th>
                      <th className="c">PIM</th>
                      <th className="c" title="Goalies: saves">SV</th>
                      <th className="c" title="Goalies: goals against">GA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((m) => {
                      const s = byMember.get(m.id);
                      const goalie = m.position === "G";
                      return (
                        <tr key={m.id}>
                          <td>
                            <input type="hidden" name="member" value={m.id} />
                            {m.number != null && <span className="muted num">#{m.number} </span>}
                            {m.name}
                            {m.position && <span className="muted"> · {m.position}</span>}
                          </td>
                          <td className="c">
                            <input type="checkbox" name={`played_${m.id}`} defaultChecked={Boolean(s)} aria-label={`${m.name} played`} />
                          </td>
                          <td className="c">
                            <input type="number" min={0} name={`g_${m.id}`} defaultValue={s?.goals || ""} aria-label="Goals" />
                          </td>
                          <td className="c">
                            <input type="number" min={0} name={`a_${m.id}`} defaultValue={s?.assists || ""} aria-label="Assists" />
                          </td>
                          <td className="c">
                            <input type="number" min={0} name={`pim_${m.id}`} defaultValue={s?.pim || ""} aria-label="Penalty minutes" />
                          </td>
                          <td className="c">
                            {goalie ? (
                              <input type="number" min={0} name={`sv_${m.id}`} defaultValue={s?.saves || ""} aria-label="Saves" />
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td className="c">
                            {goalie ? (
                              <input type="number" min={0} name={`ga_${m.id}`} defaultValue={s?.goals_against || ""} aria-label="Goals against" />
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {roster.length === 0 && (
                      <tr>
                        <td colSpan={7} className="empty-a">
                          No active members{game.team ? ` on the ${game.team} Team` : ""}.{" "}
                          <Link href="/admin/members">Add members</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {stats.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={2} className="muted">
                          Totals · {stats.length} played
                        </td>
                        <td className="c num">
                          <strong>{totals.g}</strong>
                        </td>
                        <td className="c num">
                          <strong>{totals.a}</strong>
                        </td>
                        <td className="c num">
                          <strong>{totals.pim}</strong>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {roster.length > 0 && (
                <div className="form-actions" style={{ padding: "14px 20px 18px" }}>
                  <button className="btn btn-sm btn-dark" type="submit">
                    Save stats
                  </button>
                  <span className="muted" style={{ fontSize: 13 }}>
                    Tick &ldquo;Played&rdquo; for anyone who dressed, even without points.
                  </span>
                </div>
              )}
            </form>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Notes on this game</h2>
            </div>
            {gameNotes.map((n) => (
              <article key={n.id} className="note-card">
                <h3>{n.title}</h3>
                {n.body && <div className="body">{n.body}</div>}
              </article>
            ))}
            <form action={saveNote} className="aform" style={{ marginTop: gameNotes.length ? 14 : 0 }}>
              <input type="hidden" name="tag" value="game" />
              <input type="hidden" name="game_id" value={gameId} />
              <input type="hidden" name="return_to" value={`/admin/games/${gameId}`} />
              <label className="f">
                <span>Title</span>
                <input name="title" required placeholder="Post-game thoughts" />
              </label>
              <label className="f">
                <span>Note</span>
                <textarea name="body" placeholder="Line combinations, what worked, what to drill next week…" />
              </label>
              <button className="btn btn-sm btn-ghost" type="submit" style={{ justifySelf: "start" }}>
                Add note
              </button>
            </form>
          </section>
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2>Game details</h2>
          </div>
          <GameForm game={game} />
          <form action={deleteGame} style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <input type="hidden" name="id" value={gameId} />
            <ConfirmButton message="Delete this game and its stats?">Delete game</ConfirmButton>
          </form>
        </section>
      </div>
    </>
  );
}
