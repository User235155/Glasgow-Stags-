import "server-only";
import Stripe from "stripe";
import { one, run } from "./db";
import { toLocal } from "./format";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export function stripeMode(): "test" | "live" | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return key.startsWith("sk_live") || key.startsWith("rk_live") ? "live" : "test";
}

/**
 * Record a completed Checkout Session as a payment. Safe to call more than once
 * for the same session (webhook + success page): the session id is unique.
 * Payments are matched to a member by email; unmatched ones show up in Admin ->
 * Payments for the treasurer to assign.
 */
export async function recordCheckoutSession(session: Stripe.Checkout.Session): Promise<"recorded" | "duplicate" | "unpaid"> {
  if (session.payment_status !== "paid") return "unpaid";
  const email = (session.metadata?.payer_email || session.customer_details?.email || session.customer_email || "").trim();
  const name = session.metadata?.payer_name || session.customer_details?.name || null;
  const member = email
    ? await one<{ id: number }>("SELECT id FROM members WHERE lower(email) = lower(?) ORDER BY active DESC LIMIT 1", [email])
    : undefined;

  const res = await run(
    `INSERT INTO payments (member_id, payer_name, payer_email, description, amount_pence, method, reference, paid_at, stripe_session_id)
     VALUES (?, ?, ?, ?, ?, 'stripe', ?, ?, ?)
     ON CONFLICT(stripe_session_id) DO NOTHING`,
    [
      member?.id ?? null,
      name,
      email || null,
      session.metadata?.description || "Online payment",
      session.amount_total ?? 0,
      typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? session.id),
      toLocal(new Date(session.created * 1000)),
      session.id,
    ],
  );
  return res.changes > 0 ? "recorded" : "duplicate";
}
