import { listEnquiries } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Flash, PageHead } from "@/components/admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteEnquiry, enquiryToMember, toggleEnquiry } from "../../actions";

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const enquiries = await listEnquiries();
  const open = enquiries.filter((e) => !e.handled).length;
  return (
    <>
      <PageHead title="Enquiries" sub={`From the Join page · ${open} waiting for a reply`} />
      <Flash msg={msg} />
      <section className="panel">
        {enquiries.length === 0 ? (
          <p className="empty-a">No enquiries yet. They&apos;ll appear here when someone fills in the Join form.</p>
        ) : (
          enquiries.map((e) => (
            <article key={e.id} className="note-card" style={{ opacity: e.handled ? 0.55 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3>
                    {e.name} {!e.handled && <span className="pill pill-gold">new</span>}
                  </h3>
                  <div className="muted" style={{ fontSize: 13.5, marginTop: 3 }}>
                    <a href={`mailto:${e.email}`}>{e.email}</a>
                    {e.university ? ` · ${e.university}` : ""}
                    {e.experience ? ` · ${e.experience}` : ""} · {formatDate(e.created_at.replace(" ", "T"), { year: true })}
                  </div>
                </div>
                <div className="form-actions">
                  <a className="btn btn-sm btn-ghost" href={`mailto:${e.email}?subject=${encodeURIComponent("Joining the Glasgow Stags")}`}>
                    Reply
                  </a>
                  <form action={enquiryToMember} className="inline">
                    <input type="hidden" name="id" value={e.id} />
                    <button className="btn btn-sm btn-dark" type="submit">
                      Add to roster
                    </button>
                  </form>
                  <form action={toggleEnquiry} className="inline">
                    <input type="hidden" name="id" value={e.id} />
                    <button className="link-btn" type="submit">
                      {e.handled ? "mark new" : "mark done"}
                    </button>
                  </form>
                  <form action={deleteEnquiry} className="inline">
                    <input type="hidden" name="id" value={e.id} />
                    <ConfirmButton message="Delete this enquiry?" className="link-btn">
                      delete
                    </ConfirmButton>
                  </form>
                </div>
              </div>
              {e.message && <div className="body">{e.message}</div>}
            </article>
          ))
        )}
      </section>
    </>
  );
}
