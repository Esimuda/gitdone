import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type SealedToken = {
  ciphertext: string;
  iv: string;
  tag: string;
};

export function tokenKeyFromEnv(value: string | undefined): Buffer {
  const raw = value?.trim() ?? "";
  if (!raw) throw new Error("Set GITDONE_TOKEN_KEY to a 32-byte key, base64-encoded.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("GITDONE_TOKEN_KEY must decode to 32 bytes.");
  return key;
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
