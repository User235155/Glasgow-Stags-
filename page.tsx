import { redirect } from "next/navigation";
import "../../(site)/site.css";
import { adminConfigured, DEV_PASSWORD, isAdmin, usingDevPassword } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { login } from "../actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  const configured = adminConfigured();

  return (
    <div className="login">
      <div className="login-card">
        <Brand />
        <div>
          <h1>Committee login</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Members, games, attendance and payments.
          </p>
        </div>
        {!configured ? (
          <div className="callout">
            Set <code>ADMIN_PASSWORD</code> in your environment (see <code>.env.example</code>) to enable the admin
            area.
          </div>
        ) : (
          <form action={login} className="aform">
            {usingDevPassword() && (
              <div className="callout">
                Local demo — the password is <code>{DEV_PASSWORD}</code>. Set <code>ADMIN_PASSWORD</code> before going
                live.
              </div>
            )}
            {error && (
              <div className="notice notice-err" role="alert">
                That password didn&apos;t work.
              </div>
            )}
            <label className="f">
              <span>Password</span>
              <input name="password" type="password" required autoFocus autoComplete="current-password" />
            </label>
            <button type="submit" className="btn btn-dark">
              Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
