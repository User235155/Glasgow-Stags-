import type { Metadata, Viewport } from "next";
import "./globals.css";
import { club } from "@/content/club";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: {
    default: `${club.name} | ${club.tagline}`,
    template: `%s | ${club.name}`,
  },
  description: `${club.name} is a student-run, not-for-profit ice hockey club at ${club.arena.name}, competing in the ${club.leagueFull}. Beginners to experienced players welcome.`,
  openGraph: { type: "website", siteName: club.name, locale: "en_GB" },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
