import Link from "next/link";
import { TEAM_CODES } from "@/content/club";
import { memberBalances } from "@/lib/data";
import { Balance, Flash, PageHead, TeamPill, TeamSelect } from "@/components/admin";
import { bulkAddMembers, saveMember } from "../../actions";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ team?: string; msg?: string; show?: string }> }) {
  const { team, msg, show } = await searchParams;
  const all = await memberBalances();
  const showInactive = show === "all";
  const members = all.filter((m) => (showInactive || m.active) && (!team || m.team === team));
  const qs = (t?: string) => {
    const p = new URLSearchParams();
    if (t) p.set("team", t);
    if (showInactive) p.set("show", "all");
    const str = p.toString();
    return `/admin/members${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <PageHead title="Members" sub={`${all.filter((m) => m.active).length} active · ${all.length} total`} />
      <Flash msg={msg} />

      <div className="cols">
        <section className="panel panel-flush">
          <div className="panel-head">
            <nav className="tabs" aria-label="Filter by team" style={{ marginBottom: 0 }}>
              <Link href={qs()} aria-current={!team}>
                All
              </Link>
              {TEAM_CODES.map((t) => (
                <Link key={t} href={qs(t)} aria-current={team === t}>
                  {t} Team
                </Link>
              ))}
            </nav>
            <Link href={showInactive ? `/admin/members${team ? `?team=${team}` : ""}` : `${qs(team)}${team ? "&" : "?"}show=all`}>
              {showInactive ? "Hide inactive" : "Show inactive"}
            </Link>
          </div>
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Team</th>
                  <th className="c">#</th>
                  <th>Pos</th>
                  <th>University</th>
                  <th className="r">Fees</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={{ opacity: m.active ? 1 : 0.55 }}>
                    <td>
                      <Link href={`/admin/members/${m.id}`}>{m.name}</Link>
                      {!m.active && <span className="pill" style={{ marginLeft: 6 }}>inactive</span>}
                      {m.email && <div className="muted" style={{ fontSize: 13 }}>{m.email}</div>}
                    </td>
                    <td>
                      <TeamPill team={m.team} />
                    </td>
                    <td className="c num">{m.number ?? "—"}</td>
                    <td>{m.position ?? <span className="muted">—</span>}</td>
                    <td className="muted">{m.university ?? "—"}</td>
                    <td className="r">
                      <Balance pence={m.balance} />
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-a">
                      No members yet. Add your first one on the right.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Add member</h2>
            </div>
            <form action={saveMember} className="aform">
              <label className="f">
                <span>Name</span>
                <input name="name" required />
              </label>
              <label className="f">
                <span>Email</span>
                <input name="email" type="email" />
                <small>Used to match online payments automatically.</small>
              </label>
              <div className="row">
                <TeamSelect defaultValue={team} />
                <label className="f">
                  <span>Position</span>
                  <select name="position" defaultValue="">
                    <option value="">—</option>
                    <option>F</option>
                    <option>D</option>
                    <option>G</option>
                  </select>
                </label>
              </div>
              <div className="row">
                <label className="f">
                  <span>Number</span>
                  <input name="number" type="number" min={0} max={99} />
                </label>
                <label className="f">
                  <span>University</span>
                  <input name="university" />
                </label>
              </div>
              <button className="btn btn-dark btn-sm" type="submit" style={{ justifySelf: "start" }}>
                Add member
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Add several at once</h2>
            </div>
            <form action={bulkAddMembers} className="aform">
              <label className="f">
                <span>One per line: name, email, team</span>
                <textarea name="lines" placeholder={"Alex Smith, alex@example.com, A\nJamie Lee, , C"} />
                <small>Paste straight from a spreadsheet — tabs work too.</small>
              </label>
              <button className="btn btn-ghost btn-sm" type="submit" style={{ justifySelf: "start" }}>
                Import
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
