import { openToken, sealToken, tokenKeyFromEnv, type SealedToken } from "./crypto";
import { getSql, openMemorySql, resetSqlForTests, type Sql } from "@/lib/db/sql";

export type StoredProject = {
  id: number;
  gitlabProjectId: string;
  path: string;
  name: string;
  webUrl: string;
  mergeRequestUrl: string | null;
  mergeRequestIid: number | null;
  ownerGitlabUserId: string;
  isPublic: boolean;
};

export type StoredAccount = {
  gitlabUserId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  pendingProject: string | null;
};

export type OauthState = {
  codeVerifier: string | null;
  nextPath: string | null;
};

type TokenBundle = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
};

export { openMemorySql, resetSqlForTests };

async function sqlFor(sql?: Sql): Promise<Sql> {
  return sql ?? getSql();
}

function key(): Buffer {
  return tokenKeyFromEnv(process.env.GITDONE_TOKEN_KEY);
}

export async function saveUser(
  user: { id: string; username: string; name: string; avatarUrl?: string | null },
  tokens: string | TokenBundle,
  sql?: Sql,
): Promise<void> {
  const bundle: TokenBundle = typeof tokens === "string" ? { accessToken: tokens } : tokens;
  const db = await sqlFor(sql);
  const sealed = sealToken(bundle.accessToken, key());
  const refresh = bundle.refreshToken ? sealToken(bundle.refreshToken, key()) : null;
  await db.run(
    `INSERT INTO users (
      gitlab_user_id, username, name, avatar_url,
      token_ciphertext, token_iv, token_tag,
      refresh_ciphertext, refresh_iv, refresh_tag, token_expires_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(gitlab_user_id) DO UPDATE SET
      username = excluded.username,
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      token_ciphertext = excluded.token_ciphertext,
      token_iv = excluded.token_iv,
      token_tag = excluded.token_tag,
      refresh_ciphertext = excluded.refresh_ciphertext,
      refresh_iv = excluded.refresh_iv,
      refresh_tag = excluded.refresh_tag,
      token_expires_at = excluded.token_expires_at,
      updated_at = excluded.updated_at`,
    [
      user.id,
      user.username,
      user.name,
      user.avatarUrl ?? null,
      sealed.ciphertext,
      sealed.iv,
      sealed.tag,
      refresh?.ciphertext ?? null,
      refresh?.iv ?? null,
      refresh?.tag ?? null,
      bundle.expiresAt ?? null,
      new Date().toISOString(),
    ],
  );
}

export async function createSession(gitlabUserId: string, pendingProject: string | null, sql?: Sql): Promise<string> {
  const db = await sqlFor(sql);
  const id = cryptoRandom();
  const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await db.run(`INSERT INTO sessions (id, gitlab_user_id, pending_project, expires_at) VALUES (?, ?, ?, ?)`, [
    id,
    gitlabUserId,
    pendingProject,
    expires,
  ]);
  return id;
}

export async function deleteSession(sessionId: string, sql?: Sql): Promise<void> {
  await (await sqlFor(sql)).run(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
}

export async function readSession(sessionId: string | undefined, sql?: Sql): Promise<StoredAccount | null> {
  if (!sessionId) return null;
  const row = await (await sqlFor(sql)).get(
    `SELECT s.gitlab_user_id, s.pending_project, s.expires_at, u.username, u.name, u.avatar_url
     FROM sessions s JOIN users u ON u.gitlab_user_id = s.gitlab_user_id WHERE s.id = ?`,
    [sessionId],
  );
  if (!row) return null;
  if (String(row.expires_at) < new Date().toISOString()) return null;
  return {
    gitlabUserId: String(row.gitlab_user_id),
    username: String(row.username),
    name: String(row.name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    pendingProject: row.pending_project ? String(row.pending_project) : null,
  };
}

export async function setPendingProject(sessionId: string, project: string, sql?: Sql): Promise<void> {
  await (await sqlFor(sql)).run(`UPDATE sessions SET pending_project = ? WHERE id = ?`, [project, sessionId]);
}

export async function tokenForUser(gitlabUserId: string, sql?: Sql): Promise<string | null> {
  const row = await (await sqlFor(sql)).get(
    `SELECT token_ciphertext, token_iv, token_tag FROM users WHERE gitlab_user_id = ?`,
    [gitlabUserId],
  );
  if (!row) return null;
  return openToken(sealedFrom(row, "token"), key());
}

export async function userTokenRecord(
  gitlabUserId: string,
  sql?: Sql,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: string | null } | null> {
  const row = await (await sqlFor(sql)).get(
    `SELECT token_ciphertext, token_iv, token_tag, refresh_ciphertext, refresh_iv, refresh_tag, token_expires_at
     FROM users WHERE gitlab_user_id = ?`,
    [gitlabUserId],
  );
  if (!row) return null;
  const refresh = row.refresh_ciphertext ? openToken(sealedFrom(row, "refresh"), key()) : null;
  return {
    accessToken: openToken(sealedFrom(row, "token"), key()),
    refreshToken: refresh,
    expiresAt: row.token_expires_at ? String(row.token_expires_at) : null,
  };
}

export async function saveProject(
  input: {
    gitlabProjectId: string;
    path: string;
    name: string;
    webUrl: string;
    ownerGitlabUserId: string;
    token: string;
    mergeRequestUrl: string;
    mergeRequestIid?: number | null;
  },
  sql?: Sql,
): Promise<number> {
  const db = await sqlFor(sql);
  const sealed = sealToken(input.token, key());
  await db.run(
    `INSERT INTO projects (
      gitlab_project_id, path, name, web_url, owner_gitlab_user_id,
      token_ciphertext, token_iv, token_tag, merge_request_url, merge_request_iid, is_public, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    ON CONFLICT(gitlab_project_id) DO UPDATE SET
      path = excluded.path,
      name = excluded.name,
      web_url = excluded.web_url,
      owner_gitlab_user_id = excluded.owner_gitlab_user_id,
      token_ciphertext = excluded.token_ciphertext,
      token_iv = excluded.token_iv,
      token_tag = excluded.token_tag,
      merge_request_url = excluded.merge_request_url,
      merge_request_iid = excluded.merge_request_iid`,
    [
      input.gitlabProjectId,
      input.path,
      input.name,
      input.webUrl,
      input.ownerGitlabUserId,
      sealed.ciphertext,
      sealed.iv,
      sealed.tag,
      input.mergeRequestUrl,
      input.mergeRequestIid ?? null,
      new Date().toISOString(),
    ],
  );
  const row = await db.get(`SELECT id FROM projects WHERE gitlab_project_id = ?`, [input.gitlabProjectId]);
  return Number(row?.id);
}

export async function setProjectPublic(id: number, ownerGitlabUserId: string, isPublic: boolean, sql?: Sql): Promise<boolean> {
  const db = await sqlFor(sql);
  await db.run(`UPDATE projects SET is_public = ? WHERE id = ? AND owner_gitlab_user_id = ?`, [
    isPublic ? 1 : 0,
    id,
    ownerGitlabUserId,
  ]);
  const row = await db.get(`SELECT is_public FROM projects WHERE id = ? AND owner_gitlab_user_id = ?`, [id, ownerGitlabUserId]);
  return Boolean(row) && Number(row?.is_public) === (isPublic ? 1 : 0);
}

export async function listOwnedProjects(gitlabUserId: string, sql?: Sql): Promise<StoredProject[]> {
  const rows = await (await sqlFor(sql)).all(
    `SELECT id, gitlab_project_id, path, name, web_url, merge_request_url, merge_request_iid, owner_gitlab_user_id, is_public
     FROM projects WHERE owner_gitlab_user_id = ? ORDER BY id DESC`,
    [gitlabUserId],
  );
  return rows.map(mapProject);
}

export async function listAllProjects(sql?: Sql): Promise<StoredProject[]> {
  const rows = await (await sqlFor(sql)).all(
    `SELECT id, gitlab_project_id, path, name, web_url, merge_request_url, merge_request_iid, owner_gitlab_user_id, is_public
     FROM projects ORDER BY id DESC`,
  );
  return rows.map(mapProject);
}

export async function projectById(id: number, sql?: Sql): Promise<StoredProject | null> {
  const row = await (await sqlFor(sql)).get(
    `SELECT id, gitlab_project_id, path, name, web_url, merge_request_url, merge_request_iid, owner_gitlab_user_id, is_public
     FROM projects WHERE id = ?`,
    [id],
  );
  return row ? mapProject(row) : null;
}

export async function rememberOauthState(
  input: { state: string; codeVerifier: string; nextPath: string },
  sql?: Sql,
): Promise<void> {
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await (await sqlFor(sql)).run(
    `INSERT INTO oauth_states (state, code_verifier, next_path, expires_at) VALUES (?, ?, ?, ?)`,
    [input.state, input.codeVerifier, input.nextPath, expires],
  );
}

export async function takeOauthState(state: string, sql?: Sql): Promise<OauthState | null> {
  const db = await sqlFor(sql);
  const row = await db.get(`SELECT code_verifier, next_path, expires_at FROM oauth_states WHERE state = ?`, [state]);
  await db.run(`DELETE FROM oauth_states WHERE state = ?`, [state]);
  if (!row) return null;
  if (String(row.expires_at) < new Date().toISOString()) return null;
  return {
    codeVerifier: row.code_verifier ? String(row.code_verifier) : null,
    nextPath: row.next_path ? String(row.next_path) : null,
  };
}

export async function allowRequest(
  bucket: string,
  nowMs: number,
  windowMs: number,
  max: number,
  sql?: Sql,
): Promise<boolean> {
  const db = await sqlFor(sql);
  const cutoff = nowMs - windowMs;
  await db.run(`DELETE FROM rate_hits WHERE bucket = ? AND at_ms < ?`, [bucket, cutoff]);
  const row = await db.get(`SELECT COUNT(*) AS n FROM rate_hits WHERE bucket = ?`, [bucket]);
  const count = Number(row?.n ?? 0);
  if (count >= max) return false;
  await db.run(`INSERT INTO rate_hits (bucket, at_ms) VALUES (?, ?)`, [bucket, nowMs]);
  return true;
}

function sealedFrom(row: Record<string, unknown>, prefix: "token" | "refresh"): SealedToken {
  return {
    ciphertext: String(row[`${prefix}_ciphertext`]),
    iv: String(row[`${prefix}_iv`]),
    tag: String(row[`${prefix}_tag`]),
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
    mergeRequestIid: row.merge_request_iid == null ? null : Number(row.merge_request_iid),
    ownerGitlabUserId: String(row.owner_gitlab_user_id ?? ""),
    isPublic: Number(row.is_public) === 1,
  };
}

function cryptoRandom(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("hex");
}
