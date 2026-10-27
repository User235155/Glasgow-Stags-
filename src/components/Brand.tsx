import { club } from "@/content/club";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      {club.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={club.logo} alt="" className="brand-logo" width={36} height={36} />
      ) : (
        <span className="brand-mark" aria-hidden="true">
          GS
        </span>
      )}
      {!compact && (
        <span className="brand-name">
          Glasgow <b>Stags</b>
        </span>
      )}
    </span>
  );
}
