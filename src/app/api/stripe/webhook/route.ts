import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { recordCheckoutSession, stripe } from "@/lib/stripe";

// Stripe calls this after a payment. Point a webhook at
// https://<your-site>/api/stripe/webhook for the events below and put its
// signing secret in STRIPE_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await recordCheckoutSession(event.data.object);
  }
  return NextResponse.json({ received: true });
}
