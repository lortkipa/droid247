import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { User } from "@droid247/shared";

/** The original schema. Later changes are migrations, so existing databases pick them up. */
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

/** Applied in order; `PRAGMA user_version` counts how many have run. Only ever append. */
const MIGRATIONS = [
  // Google sign-in and avatars.
  `
  ALTER TABLE users ADD COLUMN avatar_url TEXT;
  ALTER TABLE users ADD COLUMN google_sub TEXT;
  CREATE UNIQUE INDEX users_google_sub ON users(google_sub);

  -- Set when the signup comes from Google: the new account is linked and gets the photo.
  ALTER TABLE signup_tickets ADD COLUMN google_sub TEXT;
  ALTER TABLE signup_tickets ADD COLUMN avatar_url TEXT;

  -- A sign-in in progress at Google, keyed by the OAuth state parameter.
  CREATE TABLE google_states (
    state_hash    TEXT PRIMARY KEY,
    code_verifier TEXT NOT NULL,
    return_to     TEXT NOT NULL,
    nonce_hash    TEXT NOT NULL,
    expires_at    INTEGER NOT NULL
  );

  -- A finished Google sign-in, waiting for the app that started it to claim it.
  CREATE TABLE google_tickets (
    token_hash TEXT PRIMARY KEY,
    nonce_hash TEXT NOT NULL,
    sub        TEXT NOT NULL,
    email      TEXT NOT NULL,
    name       TEXT NOT NULL,
    picture    TEXT,
    expires_at INTEGER NOT NULL
  );
  `,
];

/** Opens (and creates, if needed) the SQLite database. Pass `:memory:` for tests. */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

function migrate(db: DatabaseSync) {
  const { user_version: version } = db.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  for (const [i, sql] of MIGRATIONS.entries()) {
    if (i < version) continue;
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}

interface ExpiringRow {
  expires_at: number;
}

/** What Google told us about the person signing in. */
export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

/** Set on signup tickets that come from a Google sign-in. */
export interface GoogleSignup {
  googleSub: string;
  avatarUrl: string | null;
}

const USER_COLUMNS = "id, email, name, avatar_url AS avatarUrl";

/** Typed access to the auth tables. Timestamps are epoch milliseconds. */
export function createStore(db: DatabaseSync) {
  const q = {
    pruneCodes: db.prepare("DELETE FROM login_codes WHERE expires_at <= ?"),
    pruneTickets: db.prepare("DELETE FROM signup_tickets WHERE expires_at <= ?"),
    pruneSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
    pruneGoogleStates: db.prepare("DELETE FROM google_states WHERE expires_at <= ?"),
    pruneGoogleTickets: db.prepare("DELETE FROM google_tickets WHERE expires_at <= ?"),
    putCode: db.prepare(
      `INSERT INTO login_codes (email, code_hash, expires_at) VALUES (?, ?, ?)
       ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at`,
    ),
    takeCode: db.prepare("DELETE FROM login_codes WHERE email = ? RETURNING code_hash, expires_at"),
    deleteCode: db.prepare("DELETE FROM login_codes WHERE email = ?"),
    putTicket: db.prepare(
      `INSERT INTO signup_tickets (token_hash, email, expires_at, google_sub, avatar_url)
       VALUES (?, ?, ?, ?, ?)`,
    ),
    takeTicket: db.prepare(
      `DELETE FROM signup_tickets WHERE token_hash = ?
       RETURNING email, expires_at, google_sub, avatar_url`,
    ),
    putGoogleState: db.prepare(
      `INSERT INTO google_states (state_hash, code_verifier, return_to, nonce_hash, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    ),
    takeGoogleState: db.prepare(
      `DELETE FROM google_states WHERE state_hash = ?
       RETURNING code_verifier, return_to, nonce_hash, expires_at`,
    ),
    putGoogleTicket: db.prepare(
      `INSERT INTO google_tickets (token_hash, nonce_hash, sub, email, name, picture, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ),
    takeGoogleTicket: db.prepare(
      `DELETE FROM google_tickets WHERE token_hash = ?
       RETURNING nonce_hash, sub, email, name, picture, expires_at`,
    ),
    userByEmail: db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`),
    userByGoogleSub: db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE google_sub = ?`),
    insertUser: db.prepare(
      `INSERT INTO users (id, email, name, avatar_url, google_sub, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ),
    linkGoogle: db.prepare("UPDATE users SET google_sub = ? WHERE id = ? AND google_sub IS NULL"),
    deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
    putSession: db.prepare(
      "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    ),
    sessionUser: db.prepare(
      `SELECT u.id, u.email, u.name, u.avatar_url AS avatarUrl
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    ),
    deleteSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
  };

  return {
    pruneExpired(now: number) {
      q.pruneCodes.run(now);
      q.pruneTickets.run(now);
      q.pruneSessions.run(now);
      q.pruneGoogleStates.run(now);
      q.pruneGoogleTickets.run(now);
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

    putTicket(tokenHash: string, email: string, expiresAt: number, google?: GoogleSignup) {
      q.putTicket.run(
        tokenHash,
        email,
        expiresAt,
        google?.googleSub ?? null,
        google?.avatarUrl ?? null,
      );
    },
    takeTicket(tokenHash: string) {
      const row = q.takeTicket.get(tokenHash) as
        | ({ email: string; google_sub: string | null; avatar_url: string | null } & ExpiringRow)
        | undefined;
      if (!row) return undefined;
      const google: GoogleSignup | undefined = row.google_sub
        ? { googleSub: row.google_sub, avatarUrl: row.avatar_url }
        : undefined;
      return { email: row.email, expiresAt: row.expires_at, google };
    },

    putGoogleState(
      stateHash: string,
      state: { codeVerifier: string; returnTo: string; nonceHash: string },
      expiresAt: number,
    ) {
      q.putGoogleState.run(
        stateHash,
        state.codeVerifier,
        state.returnTo,
        state.nonceHash,
        expiresAt,
      );
    },
    takeGoogleState(stateHash: string) {
      const row = q.takeGoogleState.get(stateHash) as
        | ({ code_verifier: string; return_to: string; nonce_hash: string } & ExpiringRow)
        | undefined;
      return (
        row && {
          codeVerifier: row.code_verifier,
          returnTo: row.return_to,
          nonceHash: row.nonce_hash,
          expiresAt: row.expires_at,
        }
      );
    },

    putGoogleTicket(
      tokenHash: string,
      nonceHash: string,
      profile: GoogleProfile,
      expiresAt: number,
    ) {
      q.putGoogleTicket.run(
        tokenHash,
        nonceHash,
        profile.sub,
        profile.email,
        profile.name,
        profile.picture,
        expiresAt,
      );
    },
    takeGoogleTicket(tokenHash: string) {
      const row = q.takeGoogleTicket.get(tokenHash) as
        | ({ nonce_hash: string; picture: string | null } & Omit<GoogleProfile, "picture"> &
            ExpiringRow)
        | undefined;
      if (!row) return undefined;
      const profile: GoogleProfile = {
        sub: row.sub,
        email: row.email,
        name: row.name,
        picture: row.picture,
      };
      return { nonceHash: row.nonce_hash, profile, expiresAt: row.expires_at };
    },

    userByEmail(email: string) {
      return q.userByEmail.get(email) as User | undefined;
    },
    userByGoogleSub(sub: string) {
      return q.userByGoogleSub.get(sub) as User | undefined;
    },
    insertUser(user: User, now: number, googleSub: string | null = null) {
      q.insertUser.run(user.id, user.email, user.name, user.avatarUrl, googleSub, now);
    },
    /** Lets this Google account sign in to an existing user. Never touches name or avatar. */
    linkGoogle(userId: string, sub: string) {
      q.linkGoogle.run(sub, userId);
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
