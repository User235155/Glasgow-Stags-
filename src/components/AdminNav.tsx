"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, string> = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  members: "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.7 0-6 1.3-6 4v2h12v-2c0-2.7-3.3-4-6-4Zm8 0c-.4 0-.8 0-1.2.1 1.3.9 2.2 2.2 2.2 3.9v2h5v-2c0-2.7-3.3-4-6-4Z",
  games: "M3 17h18v2H3v-2Zm2-3 4-8 3 6 2-3 5 5H5Z",
  stats: "M5 20V10h3v10H5Zm5.5 0V4h3v16h-3ZM16 20v-7h3v7h-3Z",
  attendance: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z",
  payments: "M3 6h18v12H3V6Zm2 2v2h14V8H5Zm0 5v3h6v-3H5Z",
  notes: "M6 3h9l5 5v13H6V3Zm8 1.5V9h4.5L14 4.5ZM8 12h8v1.5H8V12Zm0 3.5h8V17H8v-1.5Z",
  news: "M4 5h13v14H5a1 1 0 0 1-1-1V5Zm15 3h1v10a1 1 0 0 1-1 1V8ZM6 7v4h5V7H6Zm7 0v1.5h2V7h-2Zm0 3v1h2v-1h-2ZM6 13v1.5h9V13H6Zm0 3v1.5h9V16H6Z",
  enquiries: "M4 4h16v12H7l-3 3V4Zm3 4v1.5h10V8H7Zm0 3v1.5h7V11H7Z",
  settings:
    "M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1L11 21h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2.1-1.6ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z",
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; count?: number };

export function AdminNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Admin">
      {items.map((item) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={ICONS[item.icon]} />
            </svg>
            {item.label}
            {item.count ? <span className="count">{item.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
