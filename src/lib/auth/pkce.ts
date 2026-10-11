import { createHash, randomBytes } from "node:crypto";

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: codeChallenge(verifier) };
}

export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createOauthState(): string {
  return randomBytes(24).toString("base64url");
}
