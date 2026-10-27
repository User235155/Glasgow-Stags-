import Link from "next/link";
import { one } from "@/lib/db";
import { listFeeItems, listPayments, memberBalances } from "@/lib/data";
import { formatDate, formatMoney, nowLocal, seasonOf, seasonRange } from "@/lib/format";
import { stripeMode } from "@/lib/stripe";
import { Balance, Flash, PageHead, TeamPill } from "@/components/admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { addCharge, assignPayment, deletePayment, recordPayment, saveFeeItem, toggleFeeItem } from "../../actions";

const METHOD: Record<string, string> = { cash: "Cash", bank: "Bank", stripe: "Card", other: "Other" };

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ msg?: string; view?: string }> }) {
  const { msg, view } = await searchParams;
  const season = seasonOf(nowLocal());
  const [from, to] = seasonRange(season);
  const [balances, payments, unmatched, fees, collected] = await Promise.all([
    memberBalances(),
    listPayments({ limit: 25 }),
    listPayments({ unmatched: true, limit: 100 }),
    listFeeItems(),
    one<{ total: number }>("SELECT COALESCE(SUM(amount_pence),0) AS total FROM payments WHERE paid_at >= ? AND paid_at < ?", [from, to]),
  ]);
  const active = balances.filter((b) => b.active);
  const owing = active.filter((b) => b.balance > 0);
  const shown = view === "owing" ? owing : view === "paid" ? active.filter((b) => b.balance <= 0 && b.charged > 0) : active;
  const outstanding = owing.reduce((s, b) => s + b.balance, 0);
  const stripe = stripeMode();
  const activeFees = fees.filter((f) => f.active);

  return (
    <>
      <PageHead title="Payments" sub={`Who owes what, and everything paid in ${season}.`}>
        {stripe && (
          <Link href="/pay" target="_blank" className="btn btn-sm btn-ghost">
            Open pay page ↗
          </Link>
        )}
      </PageHead>
      <Flash msg={msg} />

      <div className="kpis">
        <div className="kpi kpi-accent">
          <div className="label">Outstanding</div>
          <div className="value num">{formatMoney(outstanding)}</div>
          <div className="hint">
            {owing.length} of {active.length} members
          </div>
        </div>
        <div className="kpi">
          <div className="label">Collected {season}</div>
          <div className="value num">{formatMoney(Number(collected?.total ?? 0))}</div>
          <div className="hint">all methods</div>
        </div>
        <div className="kpi">
          <div className="label">Paid up</div>
          <div className="value num">{active.filter((b) => b.balance <= 0 && b.charged > 0).length}</div>
          <div className="hint">members with fees cleared</div>
        </div>
        <div className="kpi">
          <div className="label">Online payments</div>
          <div className="value" style={{ fontSize: 26, marginTop: 10 }}>
            {stripe ? (stripe === "live" ? "Live" : "Test mode") : "Off"}
          </div>
          <div className="hint">{stripe ? "via Stripe" : "add Stripe keys to enable"}</div>
        </div>
      </div>

      {unmatched.length > 0 && (
        <section className="panel" id="unmatched" style={{ marginBottom: 16, borderColor: "#f2df9b" }}>
          <div className="panel-head">
            <h2>Online payments to match ({unmatched.length})</h2>
          </div>
          <p className="muted" style={{ fontSize: 14, marginBottom: 10 }}>
            These came through the pay page with an email that isn&apos;t on a member record.
          </p>
          <div className="list">
            {unmatched.map((p) => (
              <div key={p.id} className="list-item" style={{ flexWrap: "wrap" }}>
                <div>
                  <strong>{p.payer_name ?? "Unknown"}</strong> · {p.payer_email}
                  <div className="meta">
                    {formatMoney(p.amount_pence)} · {p.description} · {formatDate(p.paid_at)}
                  </div>
                </div>
                <form action={assignPayment} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="id" value={p.id} />
                  <select name="member_id" className="seg-select" required defaultValue="">
                    <option value="" disabled>
                      Assign to…
                    </option>
                    {active.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-sm btn-dark" type="submit">
                    Assign
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="cols">
        <div className="stack">
          <section className="panel panel-flush">
            <div className="panel-head">
              <h2>Who&apos;s paid</h2>
              <nav className="tabs" style={{ marginBottom: 0 }} aria-label="Filter">
                <Link href="/admin/payments" aria-current={!view}>
                  Everyone
                </Link>
                <Link href="/admin/payments?view=owing" aria-current={view === "owing"}>
                  Owing ({owing.length})
                </Link>
                <Link href="/admin/payments?view=paid" aria-current={view === "paid"}>
                  Paid up
                </Link>
              </nav>
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Team</th>
                    <th className="r">Charged</th>
                    <th className="r">Paid</th>
                    <th className="r">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/admin/members/${b.id}`}>{b.name}</Link>
                      </td>
                      <td>
                        <TeamPill team={b.team} />
                      </td>
                      <td className="r num">{formatMoney(b.charged)}</td>
                      <td className="r num">{formatMoney(b.paid)}</td>
                      <td className="r">
                        {b.charged === 0 && b.paid === 0 ? <span className="muted">No fees yet</span> : <Balance pence={b.balance} />}
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-a">
                        {view === "owing" ? "Nobody owes anything." : "No members to show."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel panel-flush">
            <div className="panel-head">
              <h2>Recent payments</h2>
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>From</th>
                    <th>For</th>
                    <th>Method</th>
                    <th className="r">Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDate(p.paid_at)}</td>
                      <td>
                        {p.member_id ? (
                          <Link href={`/admin/members/${p.member_id}`}>{p.member_name}</Link>
                        ) : (
                          <span>
                            {p.payer_name ?? "Unknown"} <span className="pill pill-gold">unmatched</span>
                          </span>
                        )}
                      </td>
                      <td className="muted">{p.description ?? "—"}</td>
                      <td>
                        <span className={`pill ${p.method === "stripe" ? "pill-dark" : ""}`}>{METHOD[p.method] ?? p.method}</span>
                      </td>
                      <td className="r num">
                        <strong>{formatMoney(p.amount_pence)}</strong>
                      </td>
                      <td className="r">
                        {p.method !== "stripe" && (
                          <form action={deletePayment} className="inline">
                            <input type="hidden" name="id" value={p.id} />
                            <ConfirmButton message="Remove this payment?" className="link-btn">
                              remove
                            </ConfirmButton>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-a">
                        No payments yet.
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
              <h2>Charge a fee</h2>
            </div>
            <form action={addCharge} className="aform">
              <label className="f">
                <span>Who</span>
                <select name="target" required defaultValue="all">
                  <option value="all">All active members ({active.length})</option>
                  <option value="team:A">A Team</option>
                  <option value="team:B">B Team</option>
                  <option value="team:C">C Team</option>
                  <optgroup label="One member">
                    {active.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              {activeFees.length > 0 && (
                <label className="f">
                  <span>Saved fee</span>
                  <select name="fee_item_id" defaultValue="">
                    <option value="">Custom (fill in below)</option>
                    {activeFees.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} — {formatMoney(f.amount_pence)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="row">
                <label className="f">
                  <span>What for</span>
                  <input name="description" placeholder="Season membership" />
                </label>
                <label className="f">
                  <span>Amount (£)</span>
                  <input name="amount" inputMode="decimal" placeholder="0.00" />
                </label>
              </div>
              <label className="f">
                <span>Due date (optional)</span>
                <input name="due_date" type="date" />
              </label>
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
              <label className="f">
                <span>Member</span>
                <select name="member_id" required defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {active.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.balance > 0 ? ` (owes ${formatMoney(m.balance)})` : ""}
                    </option>
                  ))}
                </select>
              </label>
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
                  <span>For</span>
                  <input name="description" placeholder="Membership" />
                </label>
              </div>
              <label className="f">
                <span>Reference</span>
                <input name="reference" placeholder="Bank ref, receipt no…" />
              </label>
              <button className="btn btn-sm btn-dark" type="submit" style={{ justifySelf: "start" }}>
                Record payment
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Fees</h2>
            </div>
            <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>
              Saved fees can be charged in one click. Ones marked &ldquo;online&rdquo; appear on the public pay page
              {stripe ? "" : " once Stripe is set up"}.
            </p>
            <div className="list" style={{ marginBottom: 14 }}>
              {fees.map((f) => (
                <div key={f.id} className="list-item" style={{ opacity: f.active ? 1 : 0.5 }}>
                  <div>
                    <strong>{f.name}</strong> <span className="num">{formatMoney(f.amount_pence)}</span>
                    <div className="meta">
                      {f.online ? "Online + manual" : "Manual only"}
                      {f.active ? "" : " · hidden"}
                    </div>
                  </div>
                  <form action={toggleFeeItem}>
                    <input type="hidden" name="id" value={f.id} />
                    <button className="link-btn" type="submit">
                      {f.active ? "hide" : "show"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
            <form action={saveFeeItem} className="aform">
              <div className="row">
                <label className="f">
                  <span>Fee name</span>
                  <input name="name" required placeholder="Season membership" />
                </label>
                <label className="f">
                  <span>Amount (£)</span>
                  <input name="amount" inputMode="decimal" required placeholder="0.00" />
                </label>
              </div>
              <label className="check">
                <input type="checkbox" name="online" defaultChecked /> Payable online
              </label>
              <button className="btn btn-sm btn-ghost" type="submit" style={{ justifySelf: "start" }}>
                Save fee
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
