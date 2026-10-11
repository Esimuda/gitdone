export function gitlabBaseUrl(): string {
  return (process.env.GITLAB_BASE_URL?.trim() || "https://gitlab.com").replace(/\/$/, "");
}

export function oauthConfigured(): boolean {
  return Boolean(process.env.GITLAB_OAUTH_CLIENT_ID?.trim() && process.env.GITLAB_OAUTH_CLIENT_SECRET?.trim());
}

export function tokenPasteAllowed(): boolean {
  return process.env.GITDONE_ALLOW_TOKEN_PASTE === "true";
}

export const OAUTH_SCOPES = "read_user api";

export function authorizeUrl(input: { redirectUri: string; state: string; codeChallenge: string }): string {
  const clientId = process.env.GITLAB_OAUTH_CLIENT_ID?.trim() ?? "";
  const url = new URL(`${gitlabBaseUrl()}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", OAUTH_SCOPES);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export type OauthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
};

export async function exchangeCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  fetchImpl?: typeof fetch;
}): Promise<OauthTokens> {
  return tokenRequest(
    {
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
    },
    input.fetchImpl,
  );
}

export async function refreshTokens(refreshToken: string, fetchImpl?: typeof fetch): Promise<OauthTokens> {
  return tokenRequest(
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
    fetchImpl,
  );
}

async function tokenRequest(fields: Record<string, string>, fetchImpl: typeof fetch = fetch): Promise<OauthTokens> {
  const body = new URLSearchParams({
    client_id: process.env.GITLAB_OAUTH_CLIENT_ID?.trim() ?? "",
    client_secret: process.env.GITLAB_OAUTH_CLIENT_SECRET?.trim() ?? "",
    ...fields,
  });
  const response = await fetchImpl(`${gitlabBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitLab OAuth returned ${response.status}.`);
  const json = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("GitLab OAuth returned no access token.");
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : null,
  };
}
