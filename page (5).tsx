import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame, getSession, listMembers, sessionAttendance } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { Flash, PageHead, TeamPill } from "@/components/admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FillBlanks, HejaPasteForm, StatusSelect } from "@/components/AttendanceControls";
import { deleteSession, saveAttendance } from "../../../actions";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; all?: string }>;
}) {
  const sessionId = Number((await params).id);
  const { msg, all } = await searchParams;
  const session = await getSession(sessionId);
  if (!session) notFound();

  const [members, marks, game] = await Promise.all([
    listMembers({ activeOnly: true }),
    sessionAttendance(sessionId),
    session.game_id ? getGame(session.game_id) : Promise.resolve(undefined),
  ]);
  const byMember = new Map(marks.map((m) => [m.member_id, m]));
  const showAll = all === "1" || !session.team;
  const roster = members.filter((m) => showAll || m.team === session.team || byMember.has(m.id));
  const tally = { present: 0, late: 0, excused: 0, absent: 0 };
  for (const m of marks) tally[m.status]++;

  return (
    <>
      <PageHead
        title={session.title}
        crumb={{ href: "/admin/attendance", label: "Attendance" }}
        sub={
          <>
            {formatDateTime(session.date)}
            {session.team ? ` · ${session.team} Team` : ""}
            {game && (
              <>
                {" · "}
                <Link href={`/admin/games/${game.id}`}>Game page</Link>
              </>
            )}
          </>
        }
      />
      <Flash msg={msg} />

      <div className="kpis">
        <div className="kpi kpi-accent">
          <div className="label">Present</div>
          <div className="value num">{tally.present + tally.late}</div>
          <div className="hint">{tally.late ? `incl. ${tally.late} late` : "on the ice"}</div>
        </div>
        <div className="kpi">
          <div className="label">Excused</div>
          <div className="value num">{tally.excused}</div>
        </div>
        <div className="kpi">
          <div className="label">Absent</div>
          <div className="value num">{tally.absent}</div>
        </div>
        <div className="kpi">
          <div className="label">Not marked</div>
          <div className="value num">{Math.max(roster.length - marks.length, 0)}</div>
        </div>
      </div>

      <div className="cols">
        <section className="panel panel-flush">
          <div className="panel-head">
            <h2>Register</h2>
            {session.team && (
              <Link href={showAll ? `/admin/attendance/${sessionId}` : `/admin/attendance/${sessionId}?all=1`}>
                {showAll ? `Only ${session.team} Team` : "Show all members"}
              </Link>
            )}
          </div>
          <form action={saveAttendance}>
            <input type="hidden" name="session_id" value={sessionId} />
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Team</th>
                    <th className="r">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((m) => {
                    const mark = byMember.get(m.id);
                    return (
                      <tr key={m.id}>
                        <td>
                          <input type="hidden" name="member" value={m.id} />
                          {m.name}
                          {mark?.source === "heja" && (
                            <span className="pill" style={{ marginLeft: 6 }}>
                              via Heja
                            </span>
                          )}
                        </td>
                        <td>
                          <TeamPill team={m.team} />
                        </td>
                        <td className="r">
                          <StatusSelect key={`${m.id}-${mark?.status ?? ""}`} memberId={m.id} name={m.name} initial={mark?.status ?? ""} />
                        </td>
                      </tr>
                    );
                  })}
                  {roster.length === 0 && (
                    <tr>
                      <td colSpan={3} className="empty-a">
                        No active members{session.team ? ` on the ${session.team} Team` : ""}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {roster.length > 0 && (
              <div className="form-actions" style={{ padding: "14px 20px 18px" }}>
                <button className="btn btn-sm btn-dark" type="submit">
                  Save register
                </button>
                <FillBlanks status="present">Blanks → present</FillBlanks>
                <FillBlanks status="absent">Blanks → absent</FillBlanks>
              </div>
            )}
          </form>
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Import from Heja</h2>
            </div>
            <HejaPasteForm sessionId={sessionId} />
          </section>
          <section className="panel">
            <form action={deleteSession}>
              <input type="hidden" name="id" value={sessionId} />
              <ConfirmButton message="Delete this session and its register?">Delete session</ConfirmButton>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
