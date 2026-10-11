import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1.";

export function sessionKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function requireSessionSecret(): string {
  const secret = process.env.GITDONE_SESSION_SECRET?.trim() ?? "";
  if (!secret) throw new Error("Set GITDONE_SESSION_SECRET before signing anyone in.");
  return secret;
}

/** Encrypt the server session id into the httpOnly cookie. */
export function sealSessionId(sessionId: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(sessionId, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function openSessionId(cookie: string | undefined, secret: string | undefined): string | null {
  if (!cookie || !secret || !cookie.startsWith(PREFIX)) return null;
  try {
    const raw = Buffer.from(cookie.slice(PREFIX.length), "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/connect";
  return value;
}
