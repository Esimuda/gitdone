import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type SealedToken = {
  ciphertext: string;
  iv: string;
  tag: string;
};

/**
 * Accepts a base64-encoded 32-byte key, or any other secret (including a Render
 * generateValue). Other secrets are hashed with SHA-256 so the AES key is 32 bytes.
 */
export function tokenKeyFromEnv(value: string | undefined): Buffer {
  const raw = value?.trim() ?? "";
  if (!raw) throw new Error("Set GITDONE_TOKEN_KEY before storing a GitLab token.");
  const decoded = Buffer.from(raw, "base64");
  const looksEncoded = /^[A-Za-z0-9+/]+={0,2}$/.test(raw) && raw.length >= 43 && decoded.length === 32;
  if (looksEncoded) return decoded;
  return createHash("sha256").update(raw).digest();
}

export function sealToken(token: string, key: Buffer): SealedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function openToken(sealed: SealedToken, key: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}
