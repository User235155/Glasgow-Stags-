import type { Metadata } from "next";
import { club } from "@/content/club";
import { listFeeItems } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { stripeConfigured } from "@/lib/stripe";
import { startCheckout } from "../actions";

export const metadata: Metadata = { title: "Pay club fees", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const { error, cancelled } = await searchParams;
  const enabled = stripeConfigured();
  const items = enabled ? await listFeeItems({ onlineOnly: true }) : [];

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <span className="eyebrow">Members</span>
          <h1 className="display">Pay club fees</h1>
          <p className="lede">Pay securely by card. Payments are handled by Stripe — card details never touch our site.</p>
        </div>
      </section>
      <section className="section section-ice">
        <div className="wrap" style={{ maxWidth: 640 }}>
          <div className="card">
            {!enabled || items.length === 0 ? (
              <p>
                Online payments aren&apos;t open right now. Email{" "}
                <a href={`mailto:${club.email}`}>{club.email}</a> and we&apos;ll tell you how to pay.
              </p>
            ) : (
              <form action={startCheckout} className="form">
                {error && (
                  <div className="notice notice-err" role="alert">
                    Please choose what you&apos;re paying for and enter your name and email.
                  </div>
                )}
                {cancelled && (
                  <div className="notice notice-err" role="status">
                    Payment cancelled — nothing was charged.
                  </div>
                )}
                <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="label" style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                    What are you paying for?
                  </legend>
                  <div className="fee-options">
                    {items.map((item, i) => (
                      <label key={item.id} className="fee-option">
                        <span className="fee-name">
                          <input type="radio" name="fee_item_id" value={item.id} defaultChecked={i === 0} required />
                          {item.name}
                        </span>
                        <span className="fee-amount num">{formatMoney(item.amount_pence)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="name">Your name</label>
                    <input id="name" name="name" required autoComplete="name" />
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" required autoComplete="email" />
                  </div>
                </div>
                <p style={{ fontSize: 14, color: "var(--muted)" }}>
                  Use the email you gave the club so your payment is matched to you automatically.
                </p>
                <button className="btn btn-dark" type="submit">
                  Continue to secure payment
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
