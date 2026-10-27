import Link from "next/link";
import { TEAM_CODES } from "@/content/club";
import { leaderboard, listGames, seasonsWithGames } from "@/lib/data";
import { nowLocal, resultOf, seasonOf } from "@/lib/format";
import { PageHead, TeamPill } from "@/components/admin";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ season?: string; team?: string }> }) {
  const sp = await searchParams;
  const current = seasonOf(nowLocal());
  const seasons = [...new Set([current, ...(await seasonsWithGames())])].sort().reverse();
  const season = seasons.includes(sp.season ?? "") ? sp.season! : current;
  const team = TEAM_CODES.find((t) => t === sp.team) ?? null;
  const [rows, games] = await Promise.all([leaderboard(season, team), listGames({ season, team })]);

  const skaters = rows.filter((r) => r.position !== "G");
  const goalies = rows.filter((r) => r.position === "G");
  const played = games.filter((g) => resultOf(g.our_score, g.their_score));
  const record = { W: 0, L: 0, D: 0 };
  let gf = 0;
  let ga = 0;
  for (const g of played) {
    record[resultOf(g.our_score, g.their_score)!]++;
    gf += g.our_score!;
    ga += g.their_score!;
  }
  const link = (s: string, t: string | null) => `/admin/stats?season=${encodeURIComponent(s)}${t ? `&team=${t}` : ""}`;

  return (
    <>
      <PageHead title="Season stats" sub={`${season}${team ? ` · ${team} Team` : " · all teams"}`} />

      <nav className="tabs" aria-label="Team">
        <Link href={link(season, null)} aria-current={!team}>
          All teams
        </Link>
        {TEAM_CODES.map((t) => (
          <Link key={t} href={link(season, t)} aria-current={team === t}>
            {t} Team
          </Link>
        ))}
        {seasons.length > 1 &&
          seasons.map((s) => (
            <Link key={s} href={link(s, team)} aria-current={s === season}>
              {s}
            </Link>
          ))}
      </nav>

      <div className="kpis">
        <div className="kpi kpi-accent">
          <div className="label">Record</div>
          <div className="value num">
            {record.W}–{record.L}
            {record.D ? `–${record.D}` : ""}
          </div>
          <div className="hint">W–L{record.D ? "–D" : ""}</div>
        </div>
        <div className="kpi">
          <div className="label">Goals for</div>
          <div className="value num">{gf}</div>
          <div className="hint">{played.length ? `${(gf / played.length).toFixed(1)} per game` : "—"}</div>
        </div>
        <div className="kpi">
          <div className="label">Goals against</div>
          <div className="value num">{ga}</div>
          <div className="hint">{played.length ? `${(ga / played.length).toFixed(1)} per game` : "—"}</div>
        </div>
        <div className="kpi">
          <div className="label">Games played</div>
          <div className="value num">{played.length}</div>
          <div className="hint">{games.length - played.length} still to play</div>
        </div>
      </div>

      <div className="cols">
        <section className="panel panel-flush">
          <div className="panel-head">
            <h2>Skaters</h2>
          </div>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="c">#</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th className="r">GP</th>
                  <th className="r">G</th>
                  <th className="r">A</th>
                  <th className="r">PTS</th>
                  <th className="r">PIM</th>
                </tr>
              </thead>
              <tbody>
                {skaters.map((r, i) => (
                  <tr key={r.id}>
                    <td className="c muted num">{i + 1}</td>
                    <td>
                      <Link href={`/admin/members/${r.id}`}>{r.name}</Link>
                    </td>
                    <td>
                      <TeamPill team={r.team} />
                    </td>
                    <td className="r num">{r.gp}</td>
                    <td className="r num">{r.goals}</td>
                    <td className="r num">{r.assists}</td>
                    <td className="r num">
                      <strong>{r.points}</strong>
                    </td>
                    <td className="r num">{r.pim}</td>
                  </tr>
                ))}
                {skaters.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-a">
                      No stats logged yet. Open a game and fill in its stat sheet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel panel-flush">
          <div className="panel-head">
            <h2>Goalies</h2>
          </div>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Goalie</th>
                  <th className="r">GP</th>
                  <th className="r">SV</th>
                  <th className="r">GA</th>
                  <th className="r">SV%</th>
                </tr>
              </thead>
              <tbody>
                {goalies.map((r) => {
                  const shots = r.saves + r.goals_against;
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/members/${r.id}`}>{r.name}</Link>
                      </td>
                      <td className="r num">{r.gp}</td>
                      <td className="r num">{r.saves}</td>
                      <td className="r num">{r.goals_against}</td>
                      <td className="r num">
                        <strong>{shots ? (r.saves / shots).toFixed(3).replace(/^0/, "") : "—"}</strong>
                      </td>
                    </tr>
                  );
                })}
                {goalies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-a">
                      Set a member&apos;s position to G to track goalie stats.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
