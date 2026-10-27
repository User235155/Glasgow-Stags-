/**
 * Fills the local database with clearly fictional sample data so you can click
 * around the admin. Everything here is made up. Start fresh any time by
 * deleting data/stags.db.
 *
 *   npm run db:demo
 */
import { all, batch, run, setSetting } from "../src/lib/db";
import { toLocal } from "../src/lib/format";

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

function day(offset: number, time = "21:30") {
  return `${toLocal(new Date(Date.now() + offset * 864e5)).slice(0, 10)}T${time}`;
}
function lastMonday(weeksAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - weeksAgo * 7);
  return `${toLocal(d).slice(0, 10)}T21:30`;
}

const FIRST = ["Alex", "Jamie", "Sam", "Robbie", "Ellie", "Callum", "Freya", "Ross", "Isla", "Euan", "Niamh", "Fraser",
  "Kirsty", "Lewis", "Morven", "Struan", "Ailsa", "Finlay", "Megan", "Craig", "Eilidh", "Hamish", "Lucy", "Owen"];
const LAST = ["Demo", "Sample", "Example", "Test", "Placeholder", "Mock"];
const UNIS = ["University of Glasgow", "Strathclyde", "Glasgow Caledonian", "UWS", "City of Glasgow College"];
const OPPONENTS = ["Northwind Uni (demo)", "Riverside Raptors (demo)", "Highland Harriers (demo)", "Eastport Eagles (demo)", "Lochside Lynx (demo)"];

async function main() {
  const existing = await all<{ n: number }>("SELECT COUNT(*) AS n FROM members");
  if (Number(existing[0]?.n) > 0) {
    console.log("Database already has members — delete data/stags.db first if you want fresh demo data.");
    return;
  }

  // Members
  const teams = ["A", "A", "A", "A", "A", "A", "A", "A", "B", "B", "B", "B", "B", "B", "B", "B", "C", "C", "C", "C", "C", "C", "C", "C"];
  const positions = ["G", "D", "D", "F", "F", "F", "F", "D"];
  await batch(
    FIRST.map((first, i) => ({
      sql: "INSERT INTO members (name, email, team, position, number, university) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        `${first} ${LAST[i % LAST.length]}`,
        `${first.toLowerCase()}.${LAST[i % LAST.length].toLowerCase()}@example.com`,
        teams[i],
        positions[i % positions.length],
        ((i * 7) % 98) + 1,
        pick(UNIS),
      ],
    })),
  );
  const members = await all<{ id: number; team: string; position: string }>("SELECT id, team, position FROM members");

  // Games: four played, four to come
  const games = [
    { d: -24, team: "A", opp: 0, home: 1, score: [5, 2] },
    { d: -17, team: "B", opp: 1, home: 0, score: [2, 3] },
    { d: -10, team: "A", opp: 2, home: 0, score: [4, 4] },
    { d: -3, team: "C", opp: 3, home: 1, score: [6, 1] },
    { d: 5, team: "A", opp: 4, home: 1 },
    { d: 12, team: "B", opp: 0, home: 1 },
    { d: 19, team: "C", opp: 2, home: 0 },
    { d: 26, team: "A", opp: 1, home: 0 },
  ];
  for (const g of games) {
    const r = await run(
      "INSERT INTO games (date, team, opponent, venue, home, competition, our_score, their_score) VALUES (?,?,?,?,?,?,?,?)",
      [
        day(g.d, g.home ? "18:00" : "16:30"),
        g.team,
        OPPONENTS[g.opp],
        g.home ? "Braehead Arena" : "Away rink",
        g.home,
        "Demo league",
        g.score?.[0] ?? null,
        g.score?.[1] ?? null,
      ],
    );
    if (!g.score) continue;
    const roster = members.filter((m) => m.team === g.team);
    let goals = g.score[0];
    const lines = roster.map((m) => ({ m, g: 0, a: 0 }));
    const skaters = lines.filter((l) => l.m.position !== "G");
    while (goals-- > 0) {
      pick(skaters).g++;
      pick(skaters).a++;
    }
    await batch(
      lines.map((l) => ({
        sql: "INSERT INTO game_stats (game_id, member_id, goals, assists, pim, saves, goals_against) VALUES (?,?,?,?,?,?,?)",
        args: [
          r.lastId!,
          l.m.id,
          l.g,
          l.a,
          rand() < 0.25 ? 2 : 0,
          l.m.position === "G" ? 18 + Math.floor(rand() * 15) : 0,
          l.m.position === "G" ? g.score![1] : 0,
        ],
      })),
    );
  }

  // Training sessions with attendance, plus two upcoming
  for (let w = 6; w >= 1; w--) {
    const r = await run("INSERT INTO sessions (date, kind, title) VALUES (?, 'training', 'Monday training')", [lastMonday(w)]);
    await batch(
      members.map((m) => {
        const x = rand();
        return {
          sql: "INSERT INTO attendance (session_id, member_id, status, source) VALUES (?, ?, ?, ?)",
          args: [r.lastId!, m.id, x < 0.72 ? "present" : x < 0.8 ? "late" : x < 0.9 ? "excused" : "absent", w % 2 ? "heja" : "manual"],
        };
      }),
    );
  }
  await run("INSERT INTO sessions (date, kind, title) VALUES (?, 'training', 'Monday training')", [lastMonday(-1)]);
  await run("INSERT INTO sessions (date, kind, title) VALUES (?, 'training', 'Monday training')", [lastMonday(-2)]);

  // Fees & payments
  await run("INSERT INTO fee_items (name, amount_pence, online) VALUES ('Season membership (demo)', 15000, 1)");
  await run("INSERT INTO fee_items (name, amount_pence, online) VALUES ('Away trip coach (demo)', 2500, 1)");
  await batch(
    members.map((m) => ({
      sql: "INSERT INTO charges (member_id, description, amount_pence, due_date) VALUES (?, 'Season membership (demo)', 15000, ?)",
      args: [m.id, day(14).slice(0, 10)],
    })),
  );
  const payStatements = [];
  for (const m of members) {
    const x = rand();
    if (x < 0.55) {
      payStatements.push({
        sql: "INSERT INTO payments (member_id, description, amount_pence, method, paid_at) VALUES (?, 'Season membership', 15000, ?, ?)",
        args: [m.id, pick(["bank", "bank", "stripe", "cash"]), day(-Math.floor(rand() * 20), "12:00")],
      });
    } else if (x < 0.75) {
      payStatements.push({
        sql: "INSERT INTO payments (member_id, description, amount_pence, method, paid_at) VALUES (?, 'Part payment', 7500, 'bank', ?)",
        args: [m.id, day(-Math.floor(rand() * 20), "12:00")],
      });
    }
  }
  await batch(payStatements);
  await run(
    "INSERT INTO payments (payer_name, payer_email, description, amount_pence, method, paid_at, reference) VALUES ('Jordan Newcomer', 'jordan@example.net', 'Season membership (demo)', 15000, 'stripe', ?, 'pi_demo')",
    [day(-1, "19:12")],
  );

  // Notes, news, enquiries
  await run("INSERT INTO notes (title, body, tag) VALUES (?, ?, 'training')", [
    "Drills for next Monday",
    "Warm-up: edge work, crossovers both ways.\nThen 2-on-1s down the boards, finish with small-area games.\nGoalies: extra time on post-to-post.",
  ]);
  await run("INSERT INTO notes (title, body, tag) VALUES (?, ?, 'committee')", [
    "Committee meeting — ice time",
    "Agreed to ask the rink about an extra slot for C Team beginners.\nTreasurer to chase outstanding memberships before the away trip.",
  ]);
  await run("INSERT INTO notes (title, body, tag, game_id) VALUES (?, ?, 'game', (SELECT id FROM games WHERE our_score IS NOT NULL ORDER BY date LIMIT 1))", [
    "Good start to the season",
    "Strong forecheck in the first. Need to tighten up in our own zone on the PK.",
  ]);
  await run("INSERT INTO posts (slug, title, summary, body, published, published_at) VALUES (?, ?, ?, ?, 1, ?)", [
    "recruitment-2026-27-open",
    "Recruitment for 2026/27 is open",
    "New to hockey or played for years? There's a place for you on the Stags.",
    "Recruitment for the 2026/27 season is now open to students across Glasgow.\n\nWe welcome complete beginners as well as experienced players. Fill in the form on our Join page and a committee member will be in touch.\n\n(This is a sample post created by the demo data script.)",
    day(-12, "10:00"),
  ]);
  await run("INSERT INTO enquiries (name, email, university, experience, message) VALUES (?, ?, ?, ?, ?)", [
    "Morgan Prospect",
    "morgan@example.org",
    "Strathclyde",
    "Can skate, new to hockey",
    "Hi! Saw you at the freshers fair. Do I need my own skates for the first session? (demo)",
  ]);
  await run("INSERT INTO enquiries (name, email, university, experience) VALUES (?, ?, ?, ?)", [
    "Riley Keen",
    "riley@example.org",
    "University of Glasgow",
    "Goalie",
  ]);

  await setSetting("demo", "1");
  console.log(`Demo data loaded: ${members.length} members, ${games.length} games, 8 sessions.`);
}

main();
