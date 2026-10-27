"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { run } from "@/lib/db";
import { getFeeItem } from "@/lib/data";
import { stripe, stripeConfigured } from "@/lib/stripe";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(fd: FormData, key: string, max = 500) {
  return String(fd.get(key) ?? "")
    .trim()
    .slice(0, max);
}

export async function submitEnquiry(fd: FormData) {
  // Bots fill every field; people never see this one.
  if (str(fd, "website")) redirect("/join?sent=1#register");

  const name = str(fd, "name", 120);
  const email = str(fd, "email", 200);
  if (!name || !EMAIL.test(email)) redirect("/join?error=1#register");

  await run("INSERT INTO enquiries (name, email, university, experience, message) VALUES (?, ?, ?, ?, ?)", [
    name,
    email,
    str(fd, "university", 120) || null,
    str(fd, "experience", 60) || null,
    str(fd, "message", 2000) || null,
  ]);
  redirect("/join?sent=1#register");
}

async function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function startCheckout(fd: FormData) {
  if (!stripeConfigured()) redirect("/pay");
  const name = str(fd, "name", 120);
  const email = str(fd, "email", 200);
  const item = await getFeeItem(Number(fd.get("fee_item_id")));
  if (!name || !EMAIL.test(email) || !item || !item.active || !item.online) redirect("/pay?error=1");

  const base = await siteUrl();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: { currency: "gbp", unit_amount: item.amount_pence, product_data: { name: item.name } },
      },
    ],
    metadata: { payer_name: name, payer_email: email, fee_item_id: String(item.id), description: item.name },
    success_url: `${base}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/pay?cancelled=1`,
  });
  redirect(session.url!);
}
