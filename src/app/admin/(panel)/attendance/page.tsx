import Link from "next/link";
import { listSessions } from "@/lib/data";
import { formatDateTime, nowLocal } from "@/lib/format";
import { getHejaStatus } from "@/lib/heja";
import { Flash, PageHead, TeamPill, TeamSelect } from "@/components/admin";
import { HejaSyncButton } from "@/components/AttendanceControls";
import { saveSession } from "../../actions";

const KIND_LABEL: Record<string, string> = { training: "Training", game: "Game", other: "Other" };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const [past, upcoming, heja] = await Promise.all([
    listSessions({ limit: 60 }),
    listSessions({ upcoming: true, limit: 8 }),
    getHejaStatus(),
  ]);

  return (
    <>
      <PageHead title="Attendance" sub="Training sessions and games — mark who turned up, or import from Heja." />
      <Flash msg={msg} />

      <div className="cols">
        <div className="stack">
          <section className="panel panel-flush">
            <div className="panel-head">
              <h2>Past sessions</h2>
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Session</th>
                    <th>Team</th>
                    <th className="r">Turnout</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((s) => (
                    <tr key={s.id}>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>
                        {formatDateTime(s.date)}
                      </td>
                      <td>
                        <Link href={`/admin/attendance/${s.id}`}>{s.title}</Link>{" "}
                        <span className="pill">{KIND_LABEL[s.kind] ?? s.kind}</span>
                        {s.heja_uid && (
                          <span className="pill" style={{ marginLeft: 4 }}>
                            Heja
                          </span>
                        )}
                      </td>
                      <td>
                        <TeamPill team={s.team} />
                      </td>
                      <td className="r" style={{ minWidth: 150 }}>
                        {s.marked ? (
                          <div style={{ display: "grid", gap: 4 }}>
                            <span className="num" style={{ fontWeight: 600 }}>
                              {s.present} / {s.marked}
                            </span>
                            <div className="bar">
                              <span style={{ width: `${(s.present / s.marked) * 100}%` }} />
                            </div>
                          </div>
                        ) : (
                          <Link href={`/admin/attendance/${s.id}`} className="muted">
                            Take register
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                  {past.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty-a">
                        No sessions yet. Add one, or link Heja in Settings to import your schedule.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>New session</h2>
            </div>
            <form action={saveSession} className="aform">
              <div className="row">
                <label className="f">
                  <span>Date</span>
                  <input type="date" name="date" required defaultValue={nowLocal().slice(0, 10)} />
                </label>
                <label className="f">
                  <span>Time</span>
                  <input type="time" name="time" defaultValue="21:30" />
                </label>
              </div>
              <div className="row">
                <label className="f">
                  <span>Type</span>
                  <select name="kind" defaultValue="training">
                    <option value="training">Training</option>
                    <option value="game">Game</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <TeamSelect label="Team (optional)" />
              </div>
              <label className="f">
                <span>Title</span>
                <input name="title" placeholder="Monday training" />
              </label>
              <button className="btn btn-sm btn-dark" type="submit" style={{ justifySelf: "start" }}>
                Create &amp; take register
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Heja</h2>
              <Link href="/admin/settings">Settings</Link>
            </div>
            {heja.connected ? (
              <>
                <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>
                  {heja.lastSync ? `Last synced ${formatDateTime(heja.lastSync)}.` : "Linked, not synced yet."}
                </p>
                <HejaSyncButton />
              </>
            ) : (
              <p className="muted" style={{ fontSize: 14 }}>
                Link your Heja calendar to pull in every training and game automatically.{" "}
                <Link href="/admin/settings">Set it up</Link>
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Coming up</h2>
            </div>
            {upcoming.length === 0 ? (
              <p className="empty-a">Nothing scheduled.</p>
            ) : (
              <div className="list">
                {upcoming.map((s) => (
                  <Link key={s.id} href={`/admin/attendance/${s.id}`} className="list-item" style={{ textDecoration: "none" }}>
                    <div>
                      <strong>{s.title}</strong>
                      <div className="meta">{formatDateTime(s.date)}</div>
                    </div>
                    <TeamPill team={s.team} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
