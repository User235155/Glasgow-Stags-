import { notFound } from "next/navigation";
import { getMember, leaderboard, listCharges, listPayments, memberAttendance } from "@/lib/data";
import { formatDate, formatMoney, nowLocal, seasonOf } from "@/lib/format";
import { Balance, Flash, PageHead, TeamSelect } from "@/components/admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { addCharge, deleteCharge, deleteMember, deletePayment, recordPayment, saveMember } from "../../../actions";

const STATUS_PILL: Record<string, string> = {
  present: "pill-green",
  late: "pill-gold",
  excused: "",
  absent: "pill-red",
};

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const memberId = Number((await params).id);
  const { msg } = await searchParams;
  const member = await getMember(memberId);
  if (!member) notFound();

  const season = seasonOf(nowLocal());
  const [charges, payments, attendance, board] = await Promise.all([
    listCharges(memberId),
    listPayments({ memberId, limit: 100 }),
    memberAttendance(memberId),
    leaderboard(season),
  ]);
  const charged = charges.reduce((s, c) => s + c.amount_pence, 0);
  const paid = payments.reduce((s, p) => s + p.amount_pence, 0);
  const stats = board.find((r) => r.id === memberId);
  const attended = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const here = `/admin/members/${memberId}`;

  return (
    <>
      <PageHead
        title={member.name}
        crumb={{ href: "/admin/members", label: "Members" }}
        sub={[member.team && `${member.team} Team`, member.position, member.number != null && `#${member.number}`, member.university]
          .filter(Boolean)
          .join(" · ")}
      />
      <Flash msg={msg} />

      <div className="kpis">
        <div className="kpi kpi-accent">
          <div className="label">Balance</div>
          <div className="value num">{formatMoney(Math.abs(charged - paid))}</div>
          <div className="hint">
            <Balance pence={charged - paid} />
          </div>
        </div>
        <div className="kpi">
          <div className="label">Attendance (last {attendance.length})</div>
          <div className="value num">{attendance.length ? `${Math.round((attended / attendance.length) * 100)}%` : "—"}</div>
          <div className="hint">{attended} sessions attended</div>
        </div>
        <div className="kpi">
          <div className="label">Points {season}</div>
          <div className="value num">{stats?.points ?? 0}</div>
          <div className="hint">
            {stats ? `${stats.goals}G ${stats.assists}A in ${stats.gp} GP` : "No games logged"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">PIM {season}</div>
          <div className="value num">{stats?.pim ?? 0}</div>
          <div className="hint">penalty minutes</div>
        </div>
      </div>

      <div className="cols">
        <div className="stack">
          <section className="panel panel-flush">
            <div className="panel-head">
              <h2>Fees &amp; payments</h2>
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th className="r">Charged</th>
                    <th className="r">Paid</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...charges.map((c) => ({ kind: "charge" as const, id: c.id, date: c.created_at, label: c.description, amount: c.amount_pence, extra: c.due_date ? `due ${formatDate(c.due_date)}` : "" })),
                    ...payments.map((p) => ({ kind: "payment" as const, id: p.id, date: p.paid_at, label: p.description ?? "Payment", amount: p.amount_pence, extra: p.method })),
                  ]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((row) => (
                      <tr key={`${row.kind}-${row.id}`}>
                        <td className="muted">{formatDate(row.date.replace(" ", "T"))}</td>
                        <td>
                          {row.label} {row.extra && <span className="pill">{row.extra}</span>}
                        </td>
                        <td className="r num">{row.kind === "charge" ? formatMoney(row.amount) : ""}</td>
                        <td className="r num credit">{row.kind === "payment" ? formatMoney(row.amount) : ""}</td>
                        <td className="r">
                          <form action={row.kind === "charge" ? deleteCharge : deletePayment} className="inline">
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="return_to" value={here} />
                            <ConfirmButton message="Remove this entry?" className="link-btn">
                              remove
                            </ConfirmButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  {charges.length + payments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-a">
                        Nothing charged or paid yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="cols cols-even">
            <section className="panel">
              <div className="panel-head">
                <h2>Charge a fee</h2>
              </div>
              <form action={addCharge} className="aform">
                <input type="hidden" name="target" value={memberId} />
                <input type="hidden" name="return_to" value={here} />
                <label className="f">
                  <span>What for</span>
                  <input name="description" required placeholder="Season membership" />
                </label>
                <div className="row">
                  <label className="f">
                    <span>Amount (£)</span>
                    <input name="amount" inputMode="decimal" required placeholder="0.00" />
                  </label>
                  <label className="f">
                    <span>Due</span>
                    <input name="due_date" type="date" />
                  </label>
                </div>
                <button className="btn btn-sm btn-dark" type="submit" style={{ justifySelf: "start" }}>
                  Add charge
                </button>
              </form>
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>Record a payment</h2>
              </div>
              <form action={recordPayment} className="aform">
                <input type="hidden" name="member_id" value={memberId} />
                <input type="hidden" name="return_to" value={here} />
                <div className="row">
                  <label className="f">
                    <span>Amount (£)</span>
                    <input name="amount" inputMode="decimal" required placeholder="0.00" />
                  </label>
                  <label className="f">
                    <span>Method</span>
                    <select name="method" defaultValue="bank">
                      <option value="bank">Bank transfer</option>
                      <option value="cash">Cash</option>
                      <option value="stripe">Card (Stripe)</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
                <div className="row">
                  <label className="f">
                    <span>Date</span>
                    <input name="date" type="date" defaultValue={nowLocal().slice(0, 10)} />
                  </label>
                  <label className="f">
                    <span>Reference</span>
                    <input name="reference" />
                  </label>
                </div>
                <input type="hidden" name="description" value="Payment" />
                <button className="btn btn-sm btn-dark" type="submit" style={{ justifySelf: "start" }}>
                  Record payment
                </button>
              </form>
            </section>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>Recent attendance</h2>
            </div>
            {attendance.length === 0 ? (
              <p className="empty-a">No attendance recorded.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {attendance.map((a) => (
                  <span key={a.id} className={`pill ${STATUS_PILL[a.status]}`} title={a.title}>
                    {formatDate(a.date)} · {a.status}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2>Details</h2>
          </div>
          <form action={saveMember} className="aform">
            <input type="hidden" name="id" value={member.id} />
            <label className="f">
              <span>Name</span>
              <input name="name" defaultValue={member.name} required />
            </label>
            <label className="f">
              <span>Email</span>
              <input name="email" type="email" defaultValue={member.email ?? ""} />
            </label>
            <label className="f">
              <span>Phone</span>
              <input name="phone" type="tel" defaultValue={member.phone ?? ""} />
            </label>
            <div className="row">
              <TeamSelect defaultValue={member.team} />
              <label className="f">
                <span>Position</span>
                <select name="position" defaultValue={member.position ?? ""}>
                  <option value="">—</option>
                  <option>F</option>
                  <option>D</option>
                  <option>G</option>
                </select>
              </label>
              <label className="f">
                <span>Number</span>
                <input name="number" type="number" min={0} max={99} defaultValue={member.number ?? ""} />
              </label>
            </div>
            <label className="f">
              <span>University</span>
              <input name="university" defaultValue={member.university ?? ""} />
            </label>
            <label className="f">
              <span>Name in Heja</span>
              <input name="heja_name" defaultValue={member.heja_name ?? ""} />
              <small>Only if it&apos;s different — used to match pasted Heja lists.</small>
            </label>
            <label className="check">
              <input type="checkbox" name="active" defaultChecked={Boolean(member.active)} /> Active this season
            </label>
            <div className="form-actions">
              <button className="btn btn-sm btn-dark" type="submit">
                Save
              </button>
            </div>
          </form>
          <form action={deleteMember} style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <input type="hidden" name="id" value={member.id} />
            <ConfirmButton message={`Delete ${member.name}? Their attendance, stats and charges are removed too.`}>
              Delete member
            </ConfirmButton>
          </form>
        </section>
      </div>
    </>
  );
}
