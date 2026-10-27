import type { Metadata } from "next";
import Link from "next/link";
import { club, TEAM_CODES } from "@/content/club";
import { listGames, type Game } from "@/lib/data";
import { monthLabel, nowLocal, resultOf, seasonOf } from "@/lib/format";
import { FixtureRow } from "@/components/site";

export const metadata: Metadata = {
  title: "Fixtures & results",
  description: `${club.name} fixtures and results for every team.`,
};
export const dynamic = "force-dynamic";

function byMonth(games: Game[]) {
  const groups = new Map<string, Game[]>();
  for (const g of games) {
    const key = monthLabel(g.date);
    groups.set(key, [...(groups.get(key) ?? []), g]);
  }
  return [...groups.entries()];
}

export default async function FixturesPage({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const { team: teamParam } = await searchParams;
  const team = TEAM_CODES.find((t) => t === teamParam) ?? null;
  const season = seasonOf(nowLocal());
  const games = await listGames({ team, season });
  const today = nowLocal().slice(0, 10);
  const upcoming = games.filter((g) => g.our_score == null && g.date >= today);
  const results = games.filter((g) => g.our_score != null && g.their_score != null).reverse();

  const record = results.reduce(
    (acc, g) => {
      const r = resultOf(g.our_score, g.their_score);
      if (r) acc[r]++;
      return acc;
    },
    { W: 0, L: 0, D: 0 },
  );

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <span className="eyebrow">Season {season}</span>
          <h1 className="display">Fixtures &amp; results</h1>
          {results.length > 0 && (
            <p className="lede num">
              Record this season{team ? ` (${team} Team)` : ""}: {record.W}W · {record.L}L
              {record.D ? ` · ${record.D}D` : ""}
            </p>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <nav className="filters" aria-label="Filter by team" style={{ marginBottom: 36 }}>
            <Link href="/fixtures" aria-current={!team}>
              All teams
            </Link>
            {TEAM_CODES.map((t) => (
              <Link key={t} href={`/fixtures?team=${t}`} aria-current={team === t}>
                {t} Team
              </Link>
            ))}
          </nav>

          <div className="grid-2" style={{ alignItems: "start", gap: 40 }}>
            <div>
              <span className="eyebrow">Upcoming</span>
              <div style={{ marginTop: 18 }}>
                {upcoming.length === 0 && <p className="empty">No upcoming games scheduled.</p>}
                {byMonth(upcoming).map(([month, gs]) => (
                  <div key={month}>
                    <h2 className="month-head">{month}</h2>
                    <div className="fixture-list">
                      {gs.map((g) => (
                        <FixtureRow key={g.id} game={g} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="eyebrow">Results</span>
              <div style={{ marginTop: 18 }}>
                {results.length === 0 && <p className="empty">No results yet this season.</p>}
                {byMonth(results).map(([month, gs]) => (
                  <div key={month}>
                    <h2 className="month-head">{month}</h2>
                    <div className="fixture-list">
                      {gs.map((g) => (
                        <FixtureRow key={g.id} game={g} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
