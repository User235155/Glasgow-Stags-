/**
 * Fills the local database with clearly fictional sample data so you can click
 * around the admin. Start fresh any time by deleting data/stags.db.
 *
 *   npm run db:demo
 */
import { db } from "../src/lib/db";
import { seedDemo } from "../src/lib/demo-seed";

db()
  .then(seedDemo)
  .then((loaded) =>
    console.log(
      loaded
        ? "Demo data loaded: 24 members, 8 games, 8 sessions."
        : "Database already has members — delete data/stags.db first if you want fresh demo data.",
    ),
  );
