import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openToken, sealToken, tokenKeyFromEnv, type SealedToken } from "./crypto";

export type StoredProject = {
  id: number;
  gitlabProjectId: string;
  path: string;
  name: string;
  webUrl: string;
  mergeRequestUrl: string | null;
  ownerGitlabUserId: string;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  gitlab_user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  token_ciphertext TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  token_tag TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  gitlab_user_id TEXT NOT NULL,
  pending_project TEXT,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gitlab_project_id TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  web_url TEXT NOT NULL,
  owner_gitlab_user_id TEXT NOT NULL,
  token_ciphertext TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  token_tag TEXT NOT NULL,
  merge_request_url TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_hits (
  bucket TEXT NOT NULL,
  at_ms INTEGER NOT NULL
);
`;

let singleton: DatabaseSync | null = null;

export function openDatabase(file = databaseFile()): DatabaseSync {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

export function databaseFile(): string {
  const dir = process.env.GITDONE_DATA_DIR?.trim() || path.join(process.cwd(), ".data");
  return path.join(dir, "gitdone.sqlite");
}

export function getDb(): DatabaseSync {
  if (!singleton) singleton = openDatabase();
  return singleton;
}

export function resetDbForTests(): void {
  singleton?.close();
  singleton = null;
}

function key(): Buffer {
  return tokenKeyFromEnv(process.env.GITDONE_TOKEN_KEY);
}

export function saveUser(
  db: DatabaseSync,
  user: { id: string; username: string; name: string },
  token: string,
): void {
  const sealed = sealToken(token, key());
  db.prepare(
    `INSERT INTO users (gitlab_user_id, username, name, token_ciphertext, token_iv, token_tag, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(gitlab_user_id) DO UPDATE SET
       username = excluded.username,
       name = excluded.name,
       token_ciphertext = excluded.token_ciphertext,
       token_iv = excluded.token_iv,
       token_tag = excluded.token_tag,
       updated_at = excluded.updated_at`,
  ).run(user.id, user.username, user.name, sealed.ciphertext, sealed.iv, sealed.tag, new Date().toISOString());
}

export function createSession(db: DatabaseSync, gitlabUserId: string, pendingProject: string | null): string {
  const id = cryptoRandom();
  const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO sessions (id, gitlab_user_id, pending_project, expires_at) VALUES (?, ?, ?, ?)`).run(
    id,
    gitlabUserId,
    pendingProject,
    expires,
  );
  return id;
}

export function readSession(
  db: DatabaseSync,
  sessionId: string | undefined,
): { gitlabUserId: string; pendingProject: string | null } | null {
  if (!sessionId) return null;
  const row = db.prepare(`SELECT gitlab_user_id, pending_project, expires_at FROM sessions WHERE id = ?`).get(sessionId);
  if (!row) return null;
  if (String(row.expires_at) < new Date().toISOString()) return null;
  return {
    gitlabUserId: String(row.gitlab_user_id),
    pendingProject: row.pending_project ? String(row.pending_project) : null,
  };
}

export function setPendingProject(db: DatabaseSync, sessionId: string, project: string): void {
  db.prepare(`UPDATE sessions SET pending_project = ? WHERE id = ?`).run(project, sessionId);
}

export function tokenForUser(db: DatabaseSync, gitlabUserId: string): string | null {
  const row = db
    .prepare(`SELECT token_ciphertext, token_iv, token_tag FROM users WHERE gitlab_user_id = ?`)
    .get(gitlabUserId);
  if (!row) return null;
  return openToken(sealedFrom(row), key());
}

export function saveProject(
  db: DatabaseSync,
  input: {
    gitlabProjectId: string;
    path: string;
    name: string;
    webUrl: string;
    ownerGitlabUserId: string;
    token: string;
    mergeRequestUrl: string;
  },
): number {
  const sealed = sealToken(input.token, key());
  db.prepare(
    `INSERT INTO projects (
      gitlab_project_id, path, name, web_url, owner_gitlab_user_id,
      token_ciphertext, token_iv, token_tag, merge_request_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(gitlab_project_id) DO UPDATE SET
      path = excluded.path,
      name = excluded.name,
      web_url = excluded.web_url,
      token_ciphertext = excluded.token_ciphertext,
      token_iv = excluded.token_iv,
      token_tag = excluded.token_tag,
      merge_request_url = excluded.merge_request_url`,
  ).run(
    input.gitlabProjectId,
    input.path,
    input.name,
    input.webUrl,
    input.ownerGitlabUserId,
    sealed.ciphertext,
    sealed.iv,
    sealed.tag,
    input.mergeRequestUrl,
    new Date().toISOString(),
  );
  const row = db.prepare(`SELECT id FROM projects WHERE gitlab_project_id = ?`).get(input.gitlabProjectId);
  return Number(row?.id);
}

export function listProjects(db: DatabaseSync, gitlabUserId: string): StoredProject[] {
  return db
    .prepare(
      `SELECT id, gitlab_project_id, path, name, web_url, merge_request_url, owner_gitlab_user_id
       FROM projects WHERE owner_gitlab_user_id = ? ORDER BY id DESC`,
    )
    .all(gitlabUserId)
    .map(mapProject);
}

export function publicProjects(db: DatabaseSync): StoredProject[] {
  return db
    .prepare(
      `SELECT id, gitlab_project_id, path, name, web_url, merge_request_url, owner_gitlab_user_id FROM projects ORDER BY id DESC`,
    )
    .all()
    .map(mapProject);
}

export function projectById(db: DatabaseSync, id: number): (StoredProject & { token: string }) | null {
  const row = db
    .prepare(
      `SELECT id, gitlab_project_id, path, name, web_url, merge_request_url, owner_gitlab_user_id, token_ciphertext, token_iv, token_tag
       FROM projects WHERE id = ?`,
    )
    .get(id);
  if (!row) return null;
  return { ...mapProject(row), token: openToken(sealedFrom(row), key()) };
}

export function rememberOauthState(db: DatabaseSync, state: string): void {
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO oauth_states (state, expires_at) VALUES (?, ?)`).run(state, expires);
}

export function takeOauthState(db: DatabaseSync, state: string): boolean {
  const row = db.prepare(`SELECT expires_at FROM oauth_states WHERE state = ?`).get(state);
  db.prepare(`DELETE FROM oauth_states WHERE state = ?`).run(state);
  if (!row) return false;
  return String(row.expires_at) >= new Date().toISOString();
}

export function allowRequest(db: DatabaseSync, bucket: string, nowMs: number, windowMs: number, max: number): boolean {
  const cutoff = nowMs - windowMs;
  db.prepare(`DELETE FROM rate_hits WHERE bucket = ? AND at_ms < ?`).run(bucket, cutoff);
  const row = db.prepare(`SELECT COUNT(*) AS n FROM rate_hits WHERE bucket = ?`).get(bucket);
  const count = Number(row?.n ?? 0);
  if (count >= max) return false;
  db.prepare(`INSERT INTO rate_hits (bucket, at_ms) VALUES (?, ?)`).run(bucket, nowMs);
  return true;
}

function sealedFrom(row: Record<string, unknown>): SealedToken {
  return {
    ciphertext: String(row.token_ciphertext),
    iv: String(row.token_iv),
    tag: String(row.token_tag),
  };
}

function mapProject(row: Record<string, unknown>): StoredProject {
  return {
    id: Number(row.id),
    gitlabProjectId: String(row.gitlab_project_id),
    path: String(row.path),
    name: String(row.name),
    webUrl: String(row.web_url),
    mergeRequestUrl: row.merge_request_url ? String(row.merge_request_url) : null,
    ownerGitlabUserId: String(row.owner_gitlab_user_id ?? ""),
  };
}

function cryptoRandom(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("hex");
}
