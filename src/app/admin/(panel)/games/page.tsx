import Link from "next/link";
import { TEAM_CODES } from "@/content/club";
import { listGames, seasonsWithGames } from "@/lib/data";
import { formatDateTime, nowLocal, resultOf, seasonOf } from "@/lib/format";
import { Flash, PageHead, TeamPill } from "@/components/admin";
import { GameForm } from "@/components/GameForm";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; team?: string; msg?: string }>;
}) {
  const sp = await searchParams;
  const current = seasonOf(nowLocal());
  const seasons = [...new Set([current, ...(await seasonsWithGames())])].sort().reverse();
  const season = seasons.includes(sp.season ?? "") ? sp.season! : current;
  const team = TEAM_CODES.find((t) => t === sp.team) ?? null;
  const games = await listGames({ season, team });
  const link = (s: string, t: string | null) =>
    `/admin/games?season=${encodeURIComponent(s)}${t ? `&team=${t}` : ""}`;

  return (
    <>
      <PageHead title="Games" sub={`Season ${season} · ${games.length} game${games.length === 1 ? "" : "s"}`}>
        <Link href="/admin/stats" className="btn btn-sm btn-ghost">
          Season stats
        </Link>
      </PageHead>
      <Flash msg={sp.msg} />

      <div className="cols">
        <section className="panel panel-flush">
          <div className="panel-head">
            <nav className="tabs" style={{ marginBottom: 0 }} aria-label="Team">
              <Link href={link(season, null)} aria-current={!team}>
                All
              </Link>
              {TEAM_CODES.map((t) => (
                <Link key={t} href={link(season, t)} aria-current={team === t}>
                  {t} Team
                </Link>
              ))}
            </nav>
            {seasons.length > 1 && (
              <nav className="tabs" style={{ marginBottom: 0 }} aria-label="Season">
                {seasons.map((s) => (
                  <Link key={s} href={link(s, team)} aria-current={s === season}>
                    {s}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Team</th>
                  <th>Opponent</th>
                  <th>Competition</th>
                  <th className="r">Result</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => {
                  const r = resultOf(g.our_score, g.their_score);
                  return (
                    <tr key={g.id}>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>
                        {formatDateTime(g.date)}
                      </td>
                      <td>
                        <TeamPill team={g.team} />
                      </td>
                      <td>
                        <Link href={`/admin/games/${g.id}`}>
                          {g.home ? "v" : "@"} {g.opponent}
                        </Link>
                        {g.heja_uid && (
                          <span className="pill" style={{ marginLeft: 6 }}>
                            Heja
                          </span>
                        )}
                      </td>
                      <td className="muted">{g.competition ?? "—"}</td>
                      <td className="r num" style={{ whiteSpace: "nowrap" }}>
                        {r ? (
                          <>
                            <span className={`result result-${r}`} style={{ marginRight: 8 }}>
                              {r}
                            </span>
                            <strong>
                              {g.our_score}–{g.their_score}
                            </strong>
                          </>
                        ) : (
                          <Link href={`/admin/games/${g.id}`} className="muted">
                            Add score
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {games.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-a">
                      No games this season yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Add game</h2>
          </div>
          <GameForm />
        </section>
      </div>
    </>
  );
}
