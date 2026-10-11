import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { sealSessionId } from "../src/lib/auth/session-cookie.ts";
import { sealToken, tokenKeyFromEnv } from "../src/lib/connect/crypto.ts";

const secret = process.env.GITDONE_SESSION_SECRET || "gitdone-local-session-secret";
const keyMaterial = process.env.GITDONE_TOKEN_KEY || "local-dev-token-key-not-base64";
process.env.GITDONE_SESSION_SECRET = secret;
process.env.GITDONE_TOKEN_KEY = keyMaterial;

const dir = process.env.GITDONE_DATA_DIR?.trim() || path.join(process.cwd(), ".data");
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(path.join(dir, "gitdone.sqlite"));
const sealed = sealToken("glpat-screenshot-token-0001", tokenKeyFromEnv(keyMaterial));
const userId = "9001";
db.prepare(
  `INSERT INTO users (
    gitlab_user_id, username, name, avatar_url,
    token_ciphertext, token_iv, token_tag,
    refresh_ciphertext, refresh_iv, refresh_tag, token_expires_at, updated_at
  ) VALUES (?, 'ada', 'Ada', NULL, ?, ?, ?, NULL, NULL, NULL, NULL, ?)
  ON CONFLICT(gitlab_user_id) DO UPDATE SET
    token_ciphertext = excluded.token_ciphertext,
    token_iv = excluded.token_iv,
    token_tag = excluded.token_tag,
    name = excluded.name`,
).run(userId, sealed.ciphertext, sealed.iv, sealed.tag, new Date().toISOString());

const sessionId = randomBytes(32).toString("hex");
const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
db.prepare(`DELETE FROM sessions WHERE gitlab_user_id = ?`).run(userId);
db.prepare(`INSERT INTO sessions (id, gitlab_user_id, pending_project, expires_at) VALUES (?, ?, NULL, ?)`).run(
  sessionId,
  userId,
  expires,
);
db.close();
process.stdout.write(sealSessionId(sessionId, secret));
