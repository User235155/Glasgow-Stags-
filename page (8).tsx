import { formatDateTime } from "@/lib/format";
import { getHejaStatus } from "@/lib/heja";
import { stripeMode } from "@/lib/stripe";
import { Flash, PageHead } from "@/components/admin";
import { HejaSyncButton } from "@/components/AttendanceControls";
import { saveHejaSettings } from "../../actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const heja = await getHejaStatus();
  const stripe = stripeMode();
  const site = (process.env.SITE_URL || "https://your-site").replace(/\/$/, "");
  const db = process.env.DATABASE_URL || "file:data/stags.db";

  return (
    <>
      <PageHead title="Settings" sub="Connections to Heja and Stripe." />
      <Flash msg={msg} />

      <div className="cols cols-even">
        <section className="panel">
          <div className="panel-head">
            <h2>
              <span className={`status-dot ${heja.connected ? "on" : ""}`} /> Heja
            </h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {heja.lastSync ? `Last sync ${formatDateTime(heja.lastSync)}` : heja.connected ? "Not synced yet" : "Not linked"}
            </span>
          </div>
          <div className="aform">
            <p style={{ fontSize: 14.5 }}>
              Heja doesn&apos;t offer a public API yet, so the link works in two parts:
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14.5, display: "grid", gap: 6 }}>
              <li>
                <strong>Schedule</strong> — in Heja, open <em>Schedule</em> → the sync/calendar button, and copy the
                calendar link (Calendar Sync is on Heja's paid plans). Paste it below. Training sessions and games then import
                automatically; games named like &ldquo;A Team vs Dundee&rdquo; also appear on the public fixtures page.
              </li>
              <li>
                <strong>Attendance</strong> — on any session page, paste the list of names from Heja&apos;s
                attendance/RSVP view. Names are matched to members; set &ldquo;Name in Heja&rdquo; on a member if it
                differs.
              </li>
            </ol>
            <form action={saveHejaSettings} className="aform" style={{ marginTop: 6 }}>
              <label className="f">
                <span>Heja calendar link</span>
                <input name="heja_ics_url" defaultValue={heja.url ?? ""} placeholder="webcal://… or https://…" />
                <small>Keep this private — anyone with the link can see the schedule.</small>
              </label>
              <button className="btn btn-sm btn-ghost" type="submit" style={{ justifySelf: "start" }}>
                Save link
              </button>
            </form>
            {heja.connected && <HejaSyncButton />}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <span className={`status-dot ${stripe ? "on" : ""}`} /> Stripe payments
            </h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {stripe ? (stripe === "live" ? "Live — real money" : "Test mode") : "Not set up"}
            </span>
          </div>
          <div className="aform" style={{ fontSize: 14.5 }}>
            <p>
              Members pay saved fees on <code>/pay</code> by card. Payments are recorded here automatically and matched
              to members by email.
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
              <li>
                Create a Stripe account for the club and copy the secret key into <code>STRIPE_SECRET_KEY</code>.
                Start with a test key (<code>sk_test_…</code>).
              </li>
              <li>
                In Stripe → Developers → Webhooks, add <code>{site}/api/stripe/webhook</code> for{" "}
                <code>checkout.session.completed</code> and <code>checkout.session.async_payment_succeeded</code>.
                Put its signing secret in <code>STRIPE_WEBHOOK_SECRET</code>.
              </li>
              <li>
                Add fees under Payments and tick &ldquo;Payable online&rdquo;. A &ldquo;Pay fees&rdquo; link appears in
                the site menu.
              </li>
            </ol>
            {stripe === "test" && (
              <p className="callout">
                Test mode: use card <code>4242 4242 4242 4242</code>, any future date and any CVC.
              </p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Committee access</h2>
          </div>
          <p style={{ fontSize: 14.5 }}>
            Everyone on the committee signs in with the shared password in <code>ADMIN_PASSWORD</code>. Change it at
            the start of each season and when someone leaves the committee — changing it signs everyone out.
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Data</h2>
          </div>
          <p style={{ fontSize: 14.5 }}>
            Database: <code>{db.startsWith("file:") ? db : db.replace(/\/\/.*@/, "//…@")}</code>
          </p>
          <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
            This holds members&apos; names, emails and payment records, so treat it as personal data: only collect
            what the club needs and remove people who leave.
          </p>
        </section>
      </div>
    </>
  );
}
