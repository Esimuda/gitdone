import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { codeChallenge, createPkce } from "./pkce";
import { openSessionId, safeNext, sealSessionId } from "./session-cookie";
import { rememberOauthState, openMemorySql, takeOauthState } from "@/lib/connect/db";
import { sameOrigin } from "@/lib/connect/http";
import { authorizeUrl, exchangeCode, OAUTH_SCOPES, refreshTokens } from "@/lib/connect/oauth";

describe("PKCE", () => {
  it("binds the challenge to the verifier with S256", () => {
    const { verifier, challenge } = createPkce();
    expect(challenge).toBe(codeChallenge(verifier));
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
    expect(challenge).not.toContain("=");
  });
});

describe("session cookie", () => {
  it("round-trips the session id and rejects a tampered cookie", () => {
    const secret = "render-session-secret";
    const sealed = sealSessionId("abc123", secret);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(openSessionId(sealed, secret)).toBe("abc123");
    expect(openSessionId(sealed, "other-secret")).toBeNull();
    expect(openSessionId(`${sealed}x`, secret)).toBeNull();
    expect(sealed).not.toContain("abc123");
  });

  it("only allows a relative next path", () => {
    expect(safeNext("/connect")).toBe("/connect");
    expect(safeNext("https://evil.example")).toBe("/connect");
    expect(safeNext("//evil.example")).toBe("/connect");
  });
});

describe("oauth state", () => {
  afterEach(() => {
    delete process.env.GITDONE_TOKEN_KEY;
    delete process.env.GITLAB_OAUTH_CLIENT_ID;
    delete process.env.GITLAB_OAUTH_CLIENT_SECRET;
  });

  it("stores a verifier once and sends it with the code exchange", async () => {
    process.env.GITDONE_TOKEN_KEY = Buffer.alloc(32, 3).toString("base64");
    process.env.GITLAB_OAUTH_CLIENT_ID = "client";
    process.env.GITLAB_OAUTH_CLIENT_SECRET = "secret";
    const sql = await openMemorySql();
    await rememberOauthState({ state: "state-1", codeVerifier: "verifier-1", nextPath: "/connect" }, sql);
    const first = await takeOauthState("state-1", sql);
    expect(first).toEqual({ codeVerifier: "verifier-1", nextPath: "/connect" });
    expect(await takeOauthState("state-1", sql)).toBeNull();

    const url = new URL(authorizeUrl({ redirectUri: "https://gitdone.example/api/auth/callback", state: "state-1", codeChallenge: "chal" }));
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe("chal");
    expect(url.searchParams.get("scope")).toBe(OAUTH_SCOPES);
    expect(url.searchParams.get("scope")).toContain("read_user");

    let body = "";
    const fetchImpl: typeof fetch = async (_input, init) => {
      body = String(init?.body ?? "");
      return Response.json({ access_token: "access-token-value", refresh_token: "refresh-token-value", expires_in: 7200 });
    };
    const tokens = await exchangeCode({
      code: "code-1",
      redirectUri: "https://gitdone.example/api/auth/callback",
      codeVerifier: "verifier-1",
      fetchImpl,
    });
    expect(tokens.accessToken).toBe("access-token-value");
    expect(tokens.refreshToken).toBe("refresh-token-value");
    expect(body).toContain("code_verifier=verifier-1");
    expect(body).toContain("grant_type=authorization_code");

    let refreshBody = "";
    const refreshed = await refreshTokens("refresh-token-value", async (_input, init) => {
      refreshBody = String(init?.body ?? "");
      return Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 });
    });
    expect(refreshed.accessToken).toBe("new-access");
    expect(refreshBody).toContain("grant_type=refresh_token");
    expect(refreshBody).toContain("refresh_token=refresh-token-value");
    await sql.close();
  });
});

describe("csrf", () => {
  it("rejects a foreign origin", () => {
    const request = new Request("https://gitdone.example/api/auth/logout", {
      headers: { origin: "https://evil.example" },
    });
    expect(sameOrigin(request)).toBe(false);
    process.env.GITDONE_PUBLIC_URL = "https://gitdone.example";
    const local = new Request("http://127.0.0.1/api/auth/logout", { headers: { origin: "https://gitdone.example" } });
    expect(sameOrigin(local)).toBe(true);
    delete process.env.GITDONE_PUBLIC_URL;
  });
});
