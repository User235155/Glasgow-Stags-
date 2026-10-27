// Everything the public site says about the club lives here, so the committee
// can update it without touching page code. Items marked TODO were found in
// public listings and should be confirmed before launch.

export const club = {
  name: "Glasgow Stags",
  tagline: "Glasgow's student ice hockey club",
  // Drop the club crest in /public (e.g. /logo.png) and set the path here.
  logo: null as string | null,
  founded: 2019,
  league: "BUIHA",
  leagueFull: "British Universities Ice Hockey Association",
  leagueUrl: "https://buiha.org",
  playerCount: "80+",
  // TODO: confirm team descriptions and the BUIHA tier each team plays in.
  teams: [
    {
      code: "A",
      name: "A Team",
      blurb: "Our most experienced line-up.",
    },
    {
      code: "B",
      name: "B Team",
      blurb: "A competitive squad for developing players stepping up their game.",
    },
    {
      code: "C",
      name: "C Team",
      blurb: "Where many of our newer players get their first taste of match hockey.",
    },
  ],
  arena: {
    name: "Braehead Arena",
    address: "Kings Inch Road, Renfrew",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Braehead+Arena",
  },
  // TODO: confirm. This slot comes from a university club listing.
  training: [{ day: "Monday", time: "9:30pm – 11:00pm", where: "Braehead Arena" }],
  recruitingSeason: "2026/27",
  email: "glasgowstags@gmail.com",
  socials: [
    { label: "X / Twitter", href: "https://x.com/GlasgowStags" },
    { label: "Facebook", href: "https://www.facebook.com/GlasgowStags/" },
    { label: "YouTube", href: "https://www.youtube.com/@glagowstags" },
    // TODO: add Instagram / TikTok if the club uses them.
  ],
  fundraising: [
    { label: "GoFundMe", href: "https://www.gofundme.com/u/glasgow-stags" },
    { label: "Raffall", href: "https://raffall.com/glasgowstags" },
  ],
  // Add sponsors as { name, href, logo: "/images/sponsors/name.png" }.
  sponsors: [] as { name: string; href?: string; logo?: string }[],
} as const;

export type TeamCode = "A" | "B" | "C";
export const TEAM_CODES: TeamCode[] = ["A", "B", "C"];
