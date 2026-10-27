import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { recordCheckoutSession, stripe, stripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Payment received", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PaySuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let paid = false;
  let amount: number | null = null;

  // The webhook is the source of truth; recording here as well covers the
  // case where the webhook is slow or not set up yet. Both are idempotent.
  if (stripeConfigured() && session_id?.startsWith("cs_")) {
    try {
      const session = await stripe().checkout.sessions.retrieve(session_id);
      paid = (await recordCheckoutSession(session)) !== "unpaid";
      amount = session.amount_total;
    } catch {
      paid = false;
    }
  }

  return (
    <section className="section section-ice">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h1 className="display" style={{ fontSize: 48 }}>
            {paid ? "Thanks — you're paid" : "Payment processing"}
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 14 }}>
            {paid
              ? `We've received your payment${amount ? ` of ${formatMoney(amount)}` : ""}. The treasurer can see it straight away.`
              : "If you completed payment, it will show up for the treasurer shortly."}
          </p>
          <Link href="/" className="btn btn-dark" style={{ marginTop: 26 }}>
            Back to the site
          </Link>
        </div>
      </div>
    </section>
  );
}
