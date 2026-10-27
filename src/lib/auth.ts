import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoDeployment } from "./db";

const COOKIE = "stags_admin";
const MAX_AGE_S = 60 * 60 * 24 * 14;

// Lets `npm run dev` and the sample-data demo deployment work out of the box.
// A deploy with a real database always needs ADMIN_PASSWORD.
export const DEV_PASSWORD = "stags-demo";

export function usingDevPassword(): boolean {
  return !process.env.ADMIN_PASSWORD && (process.env.NODE_ENV === "development" || isDemoDeployment());
}

function adminPassword(): string | null {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return usingDevPassword() ? DEV_PASSWORD : null;
}

function secret(): string | null {
  return process.env.SESSION_SECRET || adminPassword();
}

export function adminConfigured(): boolean {
  return Boolean(adminPassword());
}

function sign(payload: string, key: string) {
  return crypto.createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkPassword(attempt: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  return safeEqual(attempt, expected);
}

export async function startSession() {
  const key = secret();
  if (!key) throw new Error("ADMIN_PASSWORD is not set");
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const value = `${expires}.${sign(String(expires), key)}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const key = secret();
  const value = (await cookies()).get(COOKIE)?.value;
  if (!key || !value) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig || Number(expires) < Date.now() / 1000) return false;
  return safeEqual(sig, sign(expires, key));
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
