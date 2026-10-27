import Link from "next/link";
import { club } from "@/content/club";
import { listPosts, recentResults, upcomingGames } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/format";
import { FixtureRow, RinkGraphic } from "@/components/site";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [upcoming, results, posts] = await Promise.all([
    upcomingGames(4),
    recentResults(3),
    listPosts({ publishedOnly: true, limit: 3 }),
  ]);
  const next = upcoming[0];

  return (
    <>
      <section className="hero">
        <RinkGraphic className="hero-rink" />
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">
              {club.league} · {club.arena.name} · Est. {club.founded}
            </span>
            <h1 className="display">
              Glasgow&apos;s <em>student</em> ice hockey club
            </h1>
            <p className="hero-sub">
              Student-run, not-for-profit and open to every level — from first-time skaters to experienced players.
              Recruitment for {club.recruitingSeason} is open.
            </p>
            <div className="hero-ctas">
              <Link href="/join#register" className="btn btn-gold">
                Join the Stags
              </Link>
              <Link href="/fixtures" className="btn btn-ghost">
                Fixtures &amp; results
              </Link>
            </div>
          </div>
          <div>
            <div className="next-card">
              <h2>Next game</h2>
              {next ? (
                <>
                  <div className="matchup">
                    {next.home ? `vs ${next.opponent}` : `@ ${next.opponent}`}
                  </div>
                  <div className="meta">
                    {formatDateTime(next.date)}
                    {next.venue ? ` · ${next.venue}` : ""}
                    {next.team ? ` · ${next.team} Team` : ""}
                  </div>
                </>
              ) : (
                <>
                  <div className="matchup">Schedule coming soon</div>
                  <div className="meta">Follow us on socials for the {club.recruitingSeason} fixture list.</div>
                </>
              )}
            </div>
            <div className="next-card">
              <div className="row">
                <div>
                  <h2>Training</h2>
                  {club.training.map((t) => (
                    <div key={t.day} className="meta" style={{ color: "#fff", fontWeight: 600 }}>
                      {t.day}s · {t.time}
                    </div>
                  ))}
                  <div className="meta">{club.arena.name}</div>
                </div>
                <Link href="/join" className="btn btn-ghost btn-sm" style={{ color: "#fff" }}>
                  Try a session
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stat-band" aria-label="Club at a glance">
        <div className="wrap stat-grid">
          <div className="stat">
            <b>{club.founded}</b>
            <span>Founded</span>
          </div>
          <div className="stat">
            <b>{club.teams.length}</b>
            <span>Teams in {club.league}</span>
          </div>
          <div className="stat">
            <b>{club.playerCount}</b>
            <span>Student-athletes</span>
          </div>
          <div className="stat">
            <b>4th</b>
            <span>{club.league} club in Scotland</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Our teams</span>
              <h2 className="section-title">Three teams. Every level.</h2>
              <p className="lede">
                We recruit students from universities and colleges in and around Glasgow and find everyone a place
                to play.
              </p>
            </div>
          </div>
          <div className="grid-3">
            {club.teams.map((t) => (
              <article key={t.code} className="card team-card">
                <span className="team-letter" aria-hidden="true">
                  {t.code}
                </span>
                <h3>{t.name}</h3>
                <p>{t.blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-ice">
        <div className="wrap split">
          <div>
            <span className="eyebrow">New to hockey?</span>
            <h2 className="section-title">Never played? Perfect.</h2>
            <p className="lede">
              You don&apos;t need any hockey experience to join. Come along, meet the team and learn at your own
              pace.
            </p>
            <ul className="checks">
              <li>Beginners and experienced players both welcome</li>
              <li>Open to students across Glasgow&apos;s universities and colleges</li>
              <li>Student-run and not-for-profit</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>Come skate with us</h3>
            <dl style={{ margin: 0 }}>
              {club.training.map((t) => (
                <div className="info-row" key={t.day}>
                  <dt>When</dt>
                  <dd>
                    {t.day}s, {t.time}
                  </dd>
                </div>
              ))}
              <div className="info-row">
                <dt>Where</dt>
                <dd>
                  {club.arena.name}, {club.arena.address}
                </dd>
              </div>
              <div className="info-row">
                <dt>Who</dt>
                <dd>Any student in the Glasgow area</dd>
              </div>
            </dl>
            <Link href="/join#register" className="btn btn-gold">
              Register your interest
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">On the ice</span>
              <h2 className="section-title">Fixtures &amp; results</h2>
            </div>
            <Link href="/fixtures" className="btn btn-ghost">
              Full schedule
            </Link>
          </div>
          <div className="grid-2">
            <div>
              <h3 className="month-head">Coming up</h3>
              <div className="fixture-list">
                {upcoming.length ? (
                  upcoming.map((g) => <FixtureRow key={g.id} game={g} />)
                ) : (
                  <p className="empty">No upcoming games scheduled yet.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="month-head">Latest results</h3>
              <div className="fixture-list">
                {results.length ? (
                  results.map((g) => <FixtureRow key={g.id} game={g} />)
                ) : (
                  <p className="empty">Results will appear here after our first game.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="eyebrow">News</span>
                <h2 className="section-title">Latest from the club</h2>
              </div>
              <Link href="/news" className="btn btn-ghost">
                All news
              </Link>
            </div>
            <div className="grid-3">
              {posts.map((p) => (
                <Link key={p.id} href={`/news/${p.slug}`} className="news-card">
                  <div className="news-band" />
                  <div className="news-body">
                    {p.published_at && <time>{formatDate(p.published_at, { year: true })}</time>}
                    <h3>{p.title}</h3>
                    {p.summary && <p>{p.summary}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="cta-band">
        <div className="wrap row">
          <div>
            <h2>Put your brand on the ice</h2>
            <p>
              Sponsorship keeps student hockey affordable. Partner with {club.playerCount} student-athletes and
              their supporters across the West of Scotland.
            </p>
          </div>
          <Link href="/sponsors" className="btn btn-dark">
            Sponsor the Stags
          </Link>
        </div>
      </section>
    </>
  );
}
