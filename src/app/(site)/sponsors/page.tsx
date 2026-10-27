import type { Metadata } from "next";
import { club } from "@/content/club";
import { RinkGraphic } from "@/components/site";

export const metadata: Metadata = {
  title: "Sponsor the Stags",
  description: `Partner with ${club.name}, Glasgow's student ice hockey club.`,
};

const subject = encodeURIComponent(`Sponsoring ${club.name}`);

export default function SponsorsPage() {
  return (
    <>
      <section className="page-hero">
        <RinkGraphic className="hero-rink" />
        <div className="wrap" style={{ position: "relative" }}>
          <span className="eyebrow">Partnerships</span>
          <h1 className="display">Sponsor the Stags</h1>
          <p className="lede">
            Help keep student ice hockey affordable in Glasgow, and put your brand in front of players, families and
            fans.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-gold" href={`mailto:${club.email}?subject=${subject}`}>
              Talk to us about sponsorship
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Why partner with us</span>
          <h2 className="section-title">Small club. Big reach.</h2>
          <div className="grid-3" style={{ marginTop: 36 }}>
            <article className="card">
              <h3>{club.playerCount} student-athletes</h3>
              <p style={{ color: "var(--muted)", marginTop: 8 }}>
                Students from across the West of Scotland, plus the friends and families who follow them.
              </p>
            </article>
            <article className="card">
              <h3>National competition</h3>
              <p style={{ color: "var(--muted)", marginTop: 8 }}>
                Three teams competing home and away in the {club.leagueFull}.
              </p>
            </article>
            <article className="card">
              <h3>Community first</h3>
              <p style={{ color: "var(--muted)", marginTop: 8 }}>
                We&apos;re student-run and not-for-profit, so your support goes straight into getting students on
                the ice.
              </p>
            </article>
          </div>
        </div>
      </section>

      {club.sponsors.length > 0 && (
        <section className="section section-ice">
          <div className="wrap">
            <span className="eyebrow">Our partners</span>
            <h2 className="section-title">Thank you to our sponsors</h2>
            <div className="sponsor-logos" style={{ marginTop: 32 }}>
              {club.sponsors.map((s) =>
                s.href ? (
                  <a key={s.name} href={s.href} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.logo ? <img src={s.logo} alt={s.name} /> : s.name}
                  </a>
                ) : (
                  <div key={s.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.logo ? <img src={s.logo} alt={s.name} /> : s.name}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      <section className="section section-ice">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Other ways to help</span>
            <h2 className="section-title">Back the club</h2>
            <p className="lede">Not a business? You can still support the Stags through our fundraisers.</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {club.fundraising.map((f) => (
              <a key={f.href} className="btn btn-dark" href={f.href} target="_blank" rel="noreferrer">
                {f.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
