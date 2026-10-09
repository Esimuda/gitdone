import { GitlabApi } from "./gitlab-api";
import { createSession, getDb, saveUser, tokenForUser, readSession } from "./db";
import { gitlabBaseUrl } from "./oauth";

export async function establishSession(token: string, pendingProject: string | null): Promise<string> {
  const api = new GitlabApi(gitlabBaseUrl(), token);
  const user = await api.get<{ id: number; username: string; name?: string }>("/api/v4/user");
  const db = getDb();
  const id = String(user.id);
  saveUser(db, { id, username: user.username, name: user.name || user.username }, token);
  return createSession(db, id, pendingProject);
}

export function sessionToken(sessionId: string | undefined): { token: string; gitlabUserId: string; pendingProject: string | null } | null {
  const session = readSession(getDb(), sessionId);
  if (!session) return null;
  const token = tokenForUser(getDb(), session.gitlabUserId);
  if (!token) return null;
  return { token, gitlabUserId: session.gitlabUserId, pendingProject: session.pendingProject };
}
