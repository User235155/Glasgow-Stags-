import Link from "next/link";
import "./site.css";
import { Brand } from "@/components/Brand";
import { club } from "@/content/club";
import { stripeConfigured } from "@/lib/stripe";

const NAV = [
  { href: "/join", label: "Join" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/news", label: "News" },
  { href: "/sponsors", label: "Sponsors" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const nav = stripeConfigured() ? [...NAV, { href: "/pay", label: "Pay fees" }] : NAV;
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="site-header">
        <div className="wrap header-row">
          <Link href="/" className="brand-link" aria-label={`${club.name} home`}>
            <Brand />
          </Link>
          <nav className="nav-desktop" aria-label="Main">
            {nav.map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
            <Link href="/join#register" className="btn btn-gold btn-sm">
              Join for {club.recruitingSeason}
            </Link>
          </nav>
          <details className="nav-mobile">
            <summary aria-label="Open menu">
              <span />
              <span />
              <span />
            </summary>
            <nav aria-label="Main">
              {nav.map((n) => (
                <Link key={n.href} href={n.href}>
                  {n.label}
                </Link>
              ))}
              <Link href="/join#register" className="btn btn-gold">
                Join for {club.recruitingSeason}
              </Link>
            </nav>
          </details>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div>
            <Brand />
            <p className="footer-blurb">
              Student-run, not-for-profit ice hockey at {club.arena.name}. Founded {club.founded}. Members of the{" "}
              <a href={club.leagueUrl} target="_blank" rel="noreferrer">
                {club.leagueFull}
              </a>
              .
            </p>
          </div>
          <div>
            <h3>Club</h3>
            <ul>
              <li>
                <Link href="/join">Join the Stags</Link>
              </li>
              <li>
                <Link href="/fixtures">Fixtures &amp; results</Link>
              </li>
              <li>
                <Link href="/news">News</Link>
              </li>
              <li>
                <Link href="/sponsors">Sponsor us</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Rink</h3>
            <ul>
              <li>{club.arena.name}</li>
              <li>{club.arena.address}</li>
              <li>
                <a href={club.arena.mapUrl} target="_blank" rel="noreferrer">
                  Get directions
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Contact</h3>
            <ul>
              <li>
                <a href={`mailto:${club.email}`}>{club.email}</a>
              </li>
              {club.socials.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="wrap footer-base">
          <span>
            © {new Date().getFullYear()} {club.name}
          </span>
          <Link href="/admin">Committee login</Link>
        </div>
      </footer>
    </>
  );
}
