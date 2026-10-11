import { cookies } from "next/headers";
import { openSessionId, requireSessionSecret } from "@/lib/auth/session-cookie";
import { GitlabApi } from "./gitlab-api";
import {
  createSession,
  readSession,
  saveUser,
  userTokenRecord,
  type StoredAccount,
} from "./db";
import { SESSION_COOKIE } from "./http";
import { gitlabBaseUrl, refreshTokens, type OauthTokens } from "./oauth";

export type Viewer = StoredAccount & { sessionId: string; token: string };

export async function establishSession(tokens: string | OauthTokens, pendingProject: string | null): Promise<string> {
  const accessToken = typeof tokens === "string" ? tokens : tokens.accessToken;
  const api = new GitlabApi(gitlabBaseUrl(), accessToken);
  const user = await api.get<{ id: number; username: string; name?: string; avatar_url?: string | null }>("/api/v4/user");
  const id = String(user.id);
  await saveUser(
    { id, username: user.username, name: user.name || user.username, avatarUrl: user.avatar_url ?? null },
    typeof tokens === "string"
      ? tokens
      : { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: tokens.expiresAt },
  );
  return createSession(id, pendingProject);
}

export async function accountFromCookie(cookie: string | undefined): Promise<(StoredAccount & { sessionId: string }) | null> {
  let secret = "";
  try {
    secret = requireSessionSecret();
  } catch {
    return null;
  }
  const sessionId = openSessionId(cookie, secret);
  if (!sessionId) return null;
  const account = await readSession(sessionId);
  if (!account) return null;
  return { ...account, sessionId };
}

export async function currentAccount(): Promise<(StoredAccount & { sessionId: string }) | null> {
  const jar = await cookies();
  return accountFromCookie(jar.get(SESSION_COOKIE)?.value);
}

export async function accessTokenForUser(gitlabUserId: string): Promise<string | null> {
  const record = await userTokenRecord(gitlabUserId);
  if (!record) return null;
  const expired = record.expiresAt ? Date.parse(record.expiresAt) < Date.now() + 60_000 : false;
  if (!expired || !record.refreshToken) return record.accessToken;
  try {
    const next = await refreshTokens(record.refreshToken);
    const account = await readSessionUser(gitlabUserId);
    await saveUser(
      {
        id: gitlabUserId,
        username: account?.username ?? gitlabUserId,
        name: account?.name ?? gitlabUserId,
        avatarUrl: account?.avatarUrl ?? null,
      },
      { accessToken: next.accessToken, refreshToken: next.refreshToken ?? record.refreshToken, expiresAt: next.expiresAt },
    );
    return next.accessToken;
  } catch {
    return null;
  }
}

async function readSessionUser(gitlabUserId: string): Promise<StoredAccount | null> {
  const { getSql } = await import("@/lib/db/sql");
  const row = await (await getSql()).get(
    `SELECT gitlab_user_id, username, name, avatar_url FROM users WHERE gitlab_user_id = ?`,
    [gitlabUserId],
  );
  if (!row) return null;
  return {
    gitlabUserId,
    username: String(row.username),
    name: String(row.name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    pendingProject: null,
  };
}

export async function currentViewer(): Promise<Viewer | null> {
  const account = await currentAccount();
  if (!account) return null;
  const token = await accessTokenForUser(account.gitlabUserId);
  if (!token) return null;
  return { ...account, token };
}
