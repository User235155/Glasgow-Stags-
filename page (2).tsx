import Link from "next/link";
import {
  attendanceRate,
  dashboardCounts,
  listNotes,
  listPayments,
  listSessions,
  memberBalances,
  upcomingGames,
} from "@/lib/data";
import { formatDate, formatDateTime, formatMoney, nowLocal, seasonOf, toLocal } from "@/lib/format";
import { getHejaStatus } from "@/lib/heja";
import { stripeMode } from "@/lib/stripe";
import { PageHead, TeamPill } from "@/components/admin";

export default async function Dashboard() {
  const since = toLocal(new Date(Date.now() - 30 * 864e5));
  const [counts, rate, games, sessions, balances, payments, notes, heja] = await Promise.all([
    dashboardCounts(),
    attendanceRate(since),
    upcomingGames(4),
    listSessions({ limit: 5 }),
    memberBalances(),
    listPayments({ limit: 5 }),
    listNotes(),
    getHejaStatus(),
  ]);
  const owing = balances.filter((b) => b.active && b.balance > 0).slice(0, 6);
  const pct = rate.total ? Math.round((rate.present / rate.total) * 100) : null;
  const stripe = stripeMode();

  return (
    <>
      <PageHead
        title="Dashboard"
        sub={`${formatDate(nowLocal(), { weekday: true, year: true })} · Season ${seasonOf(nowLocal())}`}
      >
        <Link href="/admin/attendance" className="btn btn-sm btn-ghost">
          Take attendance
        </Link>
        <Link href="/admin/games?new=1" className="btn btn-sm btn-dark">
          Add game
        </Link>
      </PageHead>

      <div className="kpis">
        <Link href="/admin/members" className="kpi">
          <div className="label">Active members</div>
          <div className="value num">{counts.members}</div>
          <div className="hint">on the roster</div>
        </Link>
        <Link href="/admin/payments" className="kpi kpi-accent">
          <div className="label">Outstanding fees</div>
          <div className="value num">{formatMoney(counts.owed)}</div>
          <div className="hint">
            {counts.owing} member{counts.owing === 1 ? "" : "s"} owe money
          </div>
        </Link>
        <Link href="/admin/attendance" className="kpi">
          <div className="label">Attendance · 30 days</div>
          <div className="value num">{pct == null ? "—" : `${pct}%`}</div>
          <div className="hint">
            {rate.present} of {rate.total} marked
          </div>
        </Link>
        <Link href="/admin/enquiries" className="kpi">
          <div className="label">New enquiries</div>
          <div className="value num">{counts.enquiries}</div>
          <div className="hint">from the Join page</div>
        </Link>
      </div>

      <div className="cols">
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Next games</h2>
              <Link href="/admin/games">All games</Link>
            </div>
            {games.length === 0 ? (
              <p className="empty-a">No upcoming games. Add one, or sync your Heja calendar in Settings.</p>
            ) : (
              <div className="list">
                {games.map((g) => (
                  <Link key={g.id} href={`/admin/games/${g.id}`} className="list-item" style={{ textDecoration: "none" }}>
                    <div>
                      <strong>
                        {g.home ? "v" : "@"} {g.opponent}
                      </strong>
                      <div className="meta">
                        {formatDateTime(g.date)}
                        {g.venue ? ` · ${g.venue}` : ""}
                      </div>
                    </div>
                    <TeamPill team={g.team} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Recent sessions</h2>
              <Link href="/admin/attendance">Attendance</Link>
            </div>
            {sessions.length === 0 ? (
              <p className="empty-a">No sessions yet.</p>
            ) : (
              <div className="list">
                {sessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/attendance/${s.id}`}
                    className="list-item"
                    style={{ textDecoration: "none", display: "grid", gridTemplateColumns: "1fr 140px", gap: 16 }}
                  >
                    <div>
                      <strong>{s.title}</strong>
                      <div className="meta">{formatDateTime(s.date)}</div>
                    </div>
                    <div>
                      <div className="meta num" style={{ textAlign: "right", marginBottom: 4 }}>
                        {s.marked ? `${s.present}/${s.marked} in` : "Not taken"}
                      </div>
                      <div className="bar">
                        <span style={{ width: s.marked ? `${(s.present / s.marked) * 100}%` : 0 }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Latest notes</h2>
              <Link href="/admin/notes">All notes</Link>
            </div>
            {notes.length === 0 ? (
              <p className="empty-a">No notes yet.</p>
            ) : (
              <div className="list">
                {notes.slice(0, 3).map((n) => (
                  <Link key={n.id} href={`/admin/notes?edit=${n.id}`} className="list-item" style={{ textDecoration: "none" }}>
                    <div>
                      <strong>{n.title}</strong>
                      <div className="meta">{n.body.slice(0, 90)}{n.body.length > 90 ? "…" : ""}</div>
                    </div>
                    <span className="pill">{n.tag}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Still to pay</h2>
              <Link href="/admin/payments">Payments</Link>
            </div>
            {owing.length === 0 ? (
              <p className="empty-a">Everyone is paid up.</p>
            ) : (
              <div className="list">
                {owing.map((b) => (
                  <Link key={b.id} href={`/admin/members/${b.id}`} className="list-item" style={{ textDecoration: "none" }}>
                    <span>
                      <strong>{b.name}</strong> <TeamPill team={b.team} />
                    </span>
                    <span className="owe num">{formatMoney(b.balance)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Recent payments</h2>
            </div>
            {payments.length === 0 ? (
              <p className="empty-a">No payments recorded yet.</p>
            ) : (
              <div className="list">
                {payments.map((p) => (
                  <div key={p.id} className="list-item">
                    <div>
                      <strong>{p.member_name ?? p.payer_name ?? "Unassigned"}</strong>
                      <div className="meta">
                        {formatDate(p.paid_at)} · {p.method}
                        {p.description ? ` · ${p.description}` : ""}
                      </div>
                    </div>
                    <span className="num" style={{ fontWeight: 700 }}>
                      {formatMoney(p.amount_pence)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {counts.unmatched > 0 && (
              <p className="callout" style={{ marginTop: 12 }}>
                {counts.unmatched === 1 ? "1 online payment needs" : `${counts.unmatched} online payments need`} matching to a
                member.{" "}
                <Link href="/admin/payments#unmatched">Review</Link>
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Connections</h2>
              <Link href="/admin/settings">Settings</Link>
            </div>
            <div className="list">
              <div className="list-item">
                <span>
                  <span className={`status-dot ${heja.connected ? "on" : ""}`} /> Heja schedule
                </span>
                <span className="meta">
                  {heja.connected ? (heja.lastSync ? `Synced ${formatDateTime(heja.lastSync)}` : "Linked") : "Not linked"}
                </span>
              </div>
              <div className="list-item">
                <span>
                  <span className={`status-dot ${stripe ? "on" : ""}`} /> Stripe payments
                </span>
                <span className="meta">{stripe ? `${stripe === "live" ? "Live" : "Test"} mode` : "Not set up"}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
