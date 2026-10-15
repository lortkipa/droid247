import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { User } from "@droid247/shared";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- At most one live code per email: requesting a new one replaces the old.
  CREATE TABLE IF NOT EXISTS login_codes (
    email      TEXT PRIMARY KEY,
    code_hash  TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  -- Proof that an email was verified, redeemed once to create the account.
  CREATE TABLE IF NOT EXISTS signup_tickets (
    token_hash TEXT PRIMARY KEY,
    email      TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
`;

/** Opens (and creates, if needed) the SQLite database. Pass `:memory:` for tests. */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  return db;
}

interface ExpiringRow {
  expires_at: number;
}

/** Typed access to the auth tables. Timestamps are epoch milliseconds. */
export function createStore(db: DatabaseSync) {
  const q = {
    pruneCodes: db.prepare("DELETE FROM login_codes WHERE expires_at <= ?"),
    pruneTickets: db.prepare("DELETE FROM signup_tickets WHERE expires_at <= ?"),
    pruneSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
    putCode: db.prepare(
      `INSERT INTO login_codes (email, code_hash, expires_at) VALUES (?, ?, ?)
       ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at`,
    ),
    takeCode: db.prepare("DELETE FROM login_codes WHERE email = ? RETURNING code_hash, expires_at"),
    deleteCode: db.prepare("DELETE FROM login_codes WHERE email = ?"),
    putTicket: db.prepare(
      "INSERT INTO signup_tickets (token_hash, email, expires_at) VALUES (?, ?, ?)",
    ),
    takeTicket: db.prepare(
      "DELETE FROM signup_tickets WHERE token_hash = ? RETURNING email, expires_at",
    ),
    userById: db.prepare("SELECT id, email, name FROM users WHERE id = ?"),
    userByEmail: db.prepare("SELECT id, email, name FROM users WHERE email = ?"),
    insertUser: db.prepare("INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)"),
    deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
    putSession: db.prepare(
      "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    ),
    sessionUser: db.prepare(
      `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    ),
    deleteSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
  };

  return {
    pruneExpired(now: number) {
      q.pruneCodes.run(now);
      q.pruneTickets.run(now);
      q.pruneSessions.run(now);
    },

    putCode(email: string, codeHash: string, expiresAt: number) {
      q.putCode.run(email, codeHash, expiresAt);
    },
    /** Removes and returns the email's code: every check uses it up. */
    takeCode(email: string) {
      const row = q.takeCode.get(email) as ({ code_hash: string } & ExpiringRow) | undefined;
      return row && { codeHash: row.code_hash, expiresAt: row.expires_at };
    },
    deleteCode(email: string) {
      q.deleteCode.run(email);
    },

    putTicket(tokenHash: string, email: string, expiresAt: number) {
      q.putTicket.run(tokenHash, email, expiresAt);
    },
    takeTicket(tokenHash: string) {
      const row = q.takeTicket.get(tokenHash) as ({ email: string } & ExpiringRow) | undefined;
      return row && { email: row.email, expiresAt: row.expires_at };
    },

    userByEmail(email: string) {
      return q.userByEmail.get(email) as User | undefined;
    },
    insertUser(user: User, now: number) {
      q.insertUser.run(user.id, user.email, user.name, now);
    },
    deleteUser(id: string) {
      q.deleteUser.run(id);
    },

    putSession(tokenHash: string, userId: string, expiresAt: number) {
      q.putSession.run(tokenHash, userId, expiresAt);
    },
    sessionUser(tokenHash: string, now: number) {
      return q.sessionUser.get(tokenHash, now) as User | undefined;
    },
    deleteSession(tokenHash: string) {
      q.deleteSession.run(tokenHash);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
