import Link from "next/link";
import "../../(site)/site.css";
import { requireAdmin } from "@/lib/auth";
import { getSetting, isDemoDeployment, one } from "@/lib/db";
import { Brand } from "@/components/Brand";
import { AdminNav, type NavItem } from "@/components/AdminNav";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [counts, demo] = await Promise.all([
    one<{ enquiries: number }>("SELECT COUNT(*) AS enquiries FROM enquiries WHERE handled = 0"),
    getSetting("demo"),
  ]);

  const items: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/members", label: "Members", icon: "members" },
    { href: "/admin/games", label: "Games", icon: "games" },
    { href: "/admin/stats", label: "Stats", icon: "stats" },
    { href: "/admin/attendance", label: "Attendance", icon: "attendance" },
    { href: "/admin/payments", label: "Payments", icon: "payments" },
    { href: "/admin/notes", label: "Notes", icon: "notes" },
    { href: "/admin/news", label: "News", icon: "news" },
    { href: "/admin/enquiries", label: "Enquiries", icon: "enquiries", count: Number(counts?.enquiries ?? 0) },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <div className="admin">
      <aside className="admin-side">
        <Link href="/admin" className="brand-row">
          <Brand compact />
          <span>
            <span className="brand-name">
              Stags <b>HQ</b>
            </span>
            <small>Committee</small>
          </span>
        </Link>
        <AdminNav items={items} />
        <div className="admin-side-foot">
          <Link href="/" target="_blank">
            View website ↗
          </Link>
          <form action={logout}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="admin-main">
        {demo === "1" && (
          <p className="callout" style={{ marginBottom: 18 }}>
            You&apos;re looking at <strong>made-up demo data</strong>.{" "}
            {isDemoDeployment() ? (
              <>Feel free to click around and change things — this demo resets from time to time.</>
            ) : (
              <>
                Delete <code>data/stags.db</code> to start fresh.
              </>
            )}
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
