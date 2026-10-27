import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { TEAM_CODES } from "@/content/club";

export function PageHead({
  title,
  sub,
  crumb,
  children,
}: {
  title: string;
  sub?: React.ReactNode;
  crumb?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {crumb && (
          <Link href={crumb.href} className="crumb">
            ← {crumb.label}
          </Link>
        )}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}

export function Flash({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="flash" role="status">
      {msg}
    </div>
  );
}

export function Balance({ pence }: { pence: number }) {
  if (pence > 0) return <span className="owe num">{formatMoney(pence)} owed</span>;
  if (pence < 0) return <span className="credit num">{formatMoney(-pence)} credit</span>;
  return <span className="settled">Paid up</span>;
}

export function TeamSelect({
  name = "team",
  defaultValue,
  label = "Team",
  allowNone = true,
}: {
  name?: string;
  defaultValue?: string | null;
  label?: string;
  allowNone?: boolean;
}) {
  return (
    <label className="f">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""}>
        {allowNone && <option value="">—</option>}
        {TEAM_CODES.map((t) => (
          <option key={t} value={t}>
            {t} Team
          </option>
        ))}
      </select>
    </label>
  );
}

export function TeamPill({ team }: { team: string | null }) {
  return team ? <span className="pill">{team}</span> : <span className="muted">—</span>;
}

export const NOTE_TAGS = [
  { value: "game", label: "Game" },
  { value: "training", label: "Training" },
  { value: "committee", label: "Committee" },
  { value: "general", label: "General" },
];
