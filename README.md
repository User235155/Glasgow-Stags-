# Glasgow Stags — website + committee admin

A rebuilt public site for the Glasgow Stags plus a password-protected committee area.

**Public site** (`/`): homepage, Join (with a recruitment form), Fixtures & results, News, Sponsors, and a Pay page.
Fixtures, results and news come straight from the admin, so entering a score updates the site.

**Committee admin** (`/admin`):

| Page | What it does |
| --- | --- |
| Dashboard | Next games, outstanding fees, 30-day attendance, new enquiries, recent payments and notes |
| Members | Roster with team, number, position, university, and each person's fee balance. Bulk paste from a spreadsheet |
| Games | Fixtures and scores, plus a per-game stat sheet (G, A, PIM; SV/GA for goalies) and game notes |
| Stats | Season leaderboard, goalie save %, team record, goals for/against |
| Attendance | Registers for training and games. Import from Heja (see below) |
| Payments | Who has paid and who owes. Charge a fee to everyone or one team at once, record cash/bank payments, match online payments |
| Notes | Game reports, training plans, committee minutes, tagged and searchable |
| News | Write posts that appear on the website |
| Enquiries | People who filled in the Join form; one click adds them to the roster |
| Settings | Heja and Stripe connections |

## Run it

**Option A: in your browser, nothing to install.** Open
**[codespaces.new/User235155/Glasgow-Stags-](https://codespaces.new/User235155/Glasgow-Stags-)** and click
**Create codespace** (or on the repo page: **Code → Codespaces → Create codespace on main**). Wait a minute or two
while it sets up; the site then opens in a new tab. Add `/admin`
to that tab's address for the committee area (password `stags-demo`). Codespaces is free for a limited number of
hours a month on personal GitHub accounts. Stop the codespace when you're done.

**Option B: on your computer.** Install [Node.js](https://nodejs.org) (the LTS version), download or clone this
repo, open a terminal in the folder, and run:

```bash
npm run demo
```

Open **http://localhost:3000** for the website and **http://localhost:3000/admin** for the committee area. The local
password is `stags-demo`. Press `Ctrl+C` in the terminal to stop it.

`npm run demo` loads made-up sample data the first time. To start with an empty club, delete `data/stags.db` and
run `npm run dev` instead.

The `stags-demo` password only works locally and on the demo link below. Once a real database is connected, the
site refuses all logins until you set `ADMIN_PASSWORD` (see `.env.example`).

## Share a preview link

**A link that works any time (Vercel, free):**

1. Go to [vercel.com](https://vercel.com), click **Sign Up**, and continue with GitHub (pick the free Hobby plan).
2. Click **Add New… → Project**, find **Glasgow-Stags-**, and click **Import**. If it isn't listed, use
   "Adjust GitHub App Permissions" to let Vercel see it.
3. Don't change any settings. Click **Deploy** and wait a couple of minutes.
4. Copy the address under **Domains** on the project page (something like `glasgow-stags.vercel.app`) and send it.

With no database connected, the site runs as a **demo**: it fills itself with the made-up sample data, shows a
"preview" strip at the top, and the committee area uses the password `stags-demo`. Changes made in the demo don't
last; it resets now and then. Every push to GitHub updates the link automatically.

**A quick link while your computer is running it (VS Code):** with `npm run demo` running, open the **Ports**
panel (next to Terminal) and click **Forward a Port**. Enter `3000`, sign in with GitHub if asked, then
right-click the port and choose **Port Visibility → Public**. Copy the **Forwarded Address**. It works until you
close VS Code.

## Before launch: things to confirm

All club facts live in **`src/content/club.ts`**. They came from public listings, so please check them:

- [ ] Training day/time (currently Monday 9:30–11pm, taken from a university club listing)
- [ ] Team descriptions and which BUIHA tier each team plays in
- [ ] Social links. Instagram or TikTok aren't listed yet
- [ ] Add the club crest to `public/` and set `logo` in `club.ts`
- [ ] Add a hero photo at `public/images/hero.jpg` (a wide action shot works best)
- [ ] Add sponsor logos to `sponsors` in `club.ts`

## Heja

Heja doesn't have a public developer API, so the connection uses what Heja does offer:

1. **Schedule sync.** In Heja go to Schedule → calendar sync, copy the calendar link, and paste it into
   Admin → Settings. "Sync" imports every event. Training sessions become registers, and events whose title
   reads like a game (e.g. "A Team vs Dundee") also create fixtures. Re-syncing updates times without
   overwriting scores. Calendar Sync is on Heja's paid plans.
2. **Attendance.** On a session page, paste the list of names from Heja's attendance/"Going" view. Names are
   matched to members (accents, initials and a separate "Name in Heja" are handled), and anyone unmatched is listed.

All Heja code is in `src/lib/heja.ts`. If Heja ever releases an API, only that file needs to change.

> The sync was tested against sample calendar files, not a live Heja link. Do one test sync and check the
> imported events before relying on it.

## Online payments (Stripe)

Online payments stay hidden until Stripe keys are set. To turn them on:

1. Create a Stripe account for the club and set `STRIPE_SECRET_KEY` (start with a `sk_test_…` key).
2. In Stripe → Developers → Webhooks, point an endpoint at `https://<site>/api/stripe/webhook` for
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then set `STRIPE_WEBHOOK_SECRET`.
3. In Admin → Payments, add fees and tick "Payable online". A "Pay fees" link then appears in the site menu.

Payments are matched to members by email. Unknown emails show up on the Payments page for the treasurer to
assign. Recording a payment twice is safe: each Stripe session is recorded once only.

## Deploying

To use it for real, turn the demo link into the club's site by connecting **Turso** (free database):

1. Import the repo into Vercel as above.
2. Create a Turso database. Set `DATABASE_URL=libsql://…` and `DATABASE_AUTH_TOKEN` in Vercel → Settings →
   Environment Variables. Turso's Vercel integration, which sets `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`,
   also works. Demo mode then switches off and the database starts empty.
3. Set `ADMIN_PASSWORD`, `SITE_URL`, and the Stripe keys if you use them, then redeploy.
4. Point `glasgowstags.com` at Vercel. Redirect `glasgowstags.co.uk` to it too, so search engines see one site.

## Security & privacy

- The admin uses one shared committee password, kept in a signed, http-only cookie for 14 days. Change
  `ADMIN_PASSWORD` when the committee changes; doing so signs everyone out. Per-person logins are a sensible
  next step.
- Every admin action checks the login on the server, not just the page.
- The database holds names, emails and payment history, which is personal data under UK GDPR. Keep it to what the
  club needs and delete people who leave. Player stats stay inside the admin and are not published.

## Development

```bash
npm test          # unit + integration tests (ICS parsing, name matching, Heja sync, Stripe recording)
npm run typecheck
npm run build
```

Built with Next.js 15 (App Router, server actions), libSQL/SQLite and Stripe Checkout.
