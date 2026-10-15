import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { createStore, openDatabase } from "./db.ts";

let dir: string | undefined;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("openDatabase", () => {
  it("upgrades a database made before avatars and Google sign-in", () => {
    dir = mkdtempSync(join(tmpdir(), "droid247-db-"));
    const path = join(dir, "old.db");
    const old = new DatabaseSync(path);
    old.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                          created_at INTEGER NOT NULL);
      CREATE TABLE signup_tickets (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL,
                                   expires_at INTEGER NOT NULL);
      INSERT INTO users VALUES ('u1', 'a@b.co', 'Ada', 0);
    `);
    old.close();

    const db = openDatabase(path);
    const store = createStore(db);
    expect(store.userByEmail("a@b.co")).toEqual({
      id: "u1",
      email: "a@b.co",
      name: "Ada",
      avatarUrl: null,
    });
    store.linkGoogle("u1", "google-1");
    expect(store.userByGoogleSub("google-1")?.id).toBe("u1");
    db.close();

    // Opening again doesn't re-run migrations.
    openDatabase(path).close();
  });
});
