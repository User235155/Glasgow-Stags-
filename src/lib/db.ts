import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { seedDemo } from "./demo-seed";

// Dates are stored as Glasgow wall-clock strings ("2026-10-27T21:30") so they
// sort as text and display without timezone surprises. Money is integer pence.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  team TEXT,
  position TEXT,
  number INTEGER,
  university TEXT,
  heja_name TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  team TEXT,
  opponent TEXT NOT NULL,
  venue TEXT,
  home INTEGER NOT NULL DEFAULT 1,
  competition TEXT,
  our_score INTEGER,
  their_score INTEGER,
  notes TEXT,
  heja_uid TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS game_stats (
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  pim INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, member_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'training',
  title TEXT NOT NULL,
  team TEXT,
  game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
  heja_uid TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS attendance (
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  PRIMARY KEY (session_id, member_id)
);
CREATE TABLE IF NOT EXISTS fee_items (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  amount_pence INTEGER NOT NULL,
  online INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS charges (
  id INTEGER PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount_pence INTEGER NOT NULL,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  payer_name TEXT,
  payer_email TEXT,
  description TEXT,
  amount_pence INTEGER NOT NULL,
  method TEXT NOT NULL,
  reference TEXT,
  paid_at TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL DEFAULT 'general',
  game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  university TEXT,
  experience TEXT,
  message TEXT,
  handled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

let clientPromise: Promise<Client> | null = null;

/**
 * Deployed to Vercel without a database: run as a self-contained demo with
 * sample data in temporary storage. Changes there don't last, so connect a
 * real database (DATABASE_URL) before the club uses it.
 */
export function isDemoDeployment(): boolean {
  return Boolean(process.env.VERCEL) && !process.env.DATABASE_URL && !process.env.TURSO_DATABASE_URL;
}

async function init(): Promise<Client> {
  const demo = isDemoDeployment();
  // TURSO_* are the names Turso's own Vercel integration sets.
  const url =
    process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    (demo ? `file:${path.join(os.tmpdir(), "stags-demo.db")}` : "file:data/stags.db");
  const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;
  if (url.startsWith("file:")) {
    fs.mkdirSync(path.dirname(path.resolve(url.slice(5))), { recursive: true });
  }
  const client = createClient({ url, authToken });
  await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(SCHEMA);
  if (demo) await seedDemo(client);
  return client;
}

export function db(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = init().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

type Row = Record<string, unknown>;

export async function all<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  const res = await (await db()).execute({ sql, args });
  return res.rows.map((r) => ({ ...r }) as T);
}

export async function one<T = Row>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

export async function run(sql: string, args: InValue[] = []) {
  const res = await (await db()).execute({ sql, args });
  return { changes: res.rowsAffected, lastId: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : undefined };
}

export async function batch(statements: { sql: string; args?: InValue[] }[]) {
  if (statements.length === 0) return;
  await (await db()).batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write",
  );
}

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await one<{ value: string | null }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? undefined;
}

export async function setSetting(key: string, value: string | null) {
  await run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}
