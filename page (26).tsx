import type { Metadata } from "next";
import { club } from "@/content/club";
import { RinkGraphic } from "@/components/site";
import { submitEnquiry } from "../actions";

export const metadata: Metadata = {
  title: `Join for ${club.recruitingSeason}`,
  description: `Join ${club.name}: student ice hockey at ${club.arena.name} for beginners and experienced players.`,
};

const FAQ = [
  {
    q: "Do I need to have played before?",
    a: "No. We welcome complete beginners as well as experienced players, and we'll help you find the right team.",
  },
  {
    q: "Who can join?",
    a: "Students from universities and colleges in and around Glasgow.",
  },
  {
    q: "Where and when do you train?",
    a: club.training.map((t) => `${t.day}s, ${t.time} at ${t.where}.`).join(" "),
  },
  {
    q: "What kit do I need?",
    a: "Message us before your first session and we'll talk you through what you need to get on the ice.",
  },
  {
    q: "How much does it cost?",
    a: "The club is not-for-profit. Get in touch and we'll send this season's membership details.",
  },
];

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <>
      <section className="page-hero">
        <RinkGraphic className="hero-rink" />
        <div className="wrap" style={{ position: "relative" }}>
          <span className="eyebrow">Recruitment {club.recruitingSeason} · Now open</span>
          <h1 className="display">Join the Stags</h1>
          <p className="lede">
            Whether you&apos;ve never held a stick or you&apos;ve played for years, there&apos;s a place for you on
            one of our three teams.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">How it works</span>
          <h2 className="section-title">Three steps to the ice</h2>
          <ol className="steps" style={{ padding: 0, marginTop: 36 }}>
            <li className="card">
              <h3>Register your interest</h3>
              <p>Fill in the form below. It takes a minute, and a committee member will get back to you.</p>
            </li>
            <li className="card">
              <h3>Come to a session</h3>
              <p>
                Meet the team at {club.arena.name} and get a feel for the club, whatever your level.
              </p>
            </li>
            <li className="card">
              <h3>Sign up for the season</h3>
              <p>Pick up your membership, join the team app, and you&apos;re a Stag.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section section-ice" id="register">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Register</span>
            <h2 className="section-title">Tell us about you</h2>
            <p className="lede">
              Prefer email? Write to <a href={`mailto:${club.email}`}>{club.email}</a>.
            </p>
            <div className="faq" style={{ marginTop: 32 }}>
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="card">
            {sent ? (
              <div className="notice notice-ok" role="status">
                Thanks! We&apos;ve got your details and will be in touch soon.
              </div>
            ) : (
              <form action={submitEnquiry} className="form">
                {error && (
                  <div className="notice notice-err" role="alert">
                    Please add your name and a valid email address.
                  </div>
                )}
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="name">Name</label>
                    <input id="name" name="name" required autoComplete="name" />
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" required autoComplete="email" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="university">University / college</label>
                    <input id="university" name="university" />
                  </div>
                  <div className="field">
                    <label htmlFor="experience">Experience</label>
                    <select id="experience" name="experience" defaultValue="">
                      <option value="" disabled>
                        Choose one
                      </option>
                      <option>Never skated</option>
                      <option>Can skate, new to hockey</option>
                      <option>Played some hockey</option>
                      <option>Experienced player</option>
                      <option>Goalie</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="message">Anything else? (optional)</label>
                  <textarea id="message" name="message" />
                </div>
                <div className="hp" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" tabIndex={-1} autoComplete="off" />
                </div>
                <button className="btn btn-dark" type="submit" style={{ justifySelf: "start" }}>
                  Send
                </button>
                <p style={{ fontSize: 13, color: "var(--muted)" }}>
                  We only use these details to contact you about joining the club.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
