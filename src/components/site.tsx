import type { Game } from "@/lib/data";
import { formatDate, formatTime, resultOf } from "@/lib/format";

/** Faceoff circle line art used as a backdrop. */
export function RinkGraphic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 400" fill="none" aria-hidden="true">
      <circle cx="200" cy="200" r="190" stroke="#FFC72C" strokeWidth="6" />
      <circle cx="200" cy="200" r="10" fill="#FFC72C" />
      <path
        d="M140 160v-22M260 160v-22M140 240v22M260 240v22M110 178h22v-18M290 178h-22v-18M110 222h22v18M290 222h-22v18"
        stroke="#FFC72C"
        strokeWidth="6"
      />
      <path d="M10 200h120M270 200h120" stroke="#FFC72C" strokeWidth="3" strokeDasharray="10 10" />
    </svg>
  );
}

export function FixtureRow({ game }: { game: Game }) {
  const result = resultOf(game.our_score, game.their_score);
  const [day, mon] = formatDate(game.date).split(" ");
  const home = Boolean(game.home);
  return (
    <article className="fixture">
      <div className="fixture-date">
        <b>{day}</b>
        <span>{mon}</span>
      </div>
      <div>
        <div className="fixture-teams">
          {home ? `Stags${game.team ? ` ${game.team}` : ""} v ${game.opponent}` : `${game.opponent} v Stags${game.team ? ` ${game.team}` : ""}`}
        </div>
        <div className="fixture-meta">
          {[formatTime(game.date), game.venue || (home ? "Home" : "Away"), game.competition].filter(Boolean).join(" · ")}
        </div>
      </div>
      {result ? (
        <div className="fixture-score num">
          <span className={`result result-${result}`}>{result}</span>
          {home ? `${game.our_score}–${game.their_score}` : `${game.their_score}–${game.our_score}`}
        </div>
      ) : (
        <div>{game.team && <span className="tag">{game.team} Team</span>}</div>
      )}
    </article>
  );
}

/** Split plain text into paragraphs on blank lines. */
export function Prose({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>
            {p.split("\n").map((line, j, arr) => (
              <span key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        ))}
    </>
  );
}
