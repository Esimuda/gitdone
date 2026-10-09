export function gitlabBaseUrl(): string {
  return (process.env.GITLAB_BASE_URL?.trim() || "https://gitlab.com").replace(/\/$/, "");
}

export function oauthConfigured(): boolean {
  return Boolean(process.env.GITLAB_OAUTH_CLIENT_ID?.trim() && process.env.GITLAB_OAUTH_CLIENT_SECRET?.trim());
}

export function authorizeUrl(input: { redirectUri: string; state: string }): string {
  const clientId = process.env.GITLAB_OAUTH_CLIENT_ID?.trim() ?? "";
  const url = new URL(`${gitlabBaseUrl()}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", "api");
  return url.toString();
}

export async function exchangeCode(input: {
  code: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.GITLAB_OAUTH_CLIENT_ID?.trim() ?? "",
    client_secret: process.env.GITLAB_OAUTH_CLIENT_SECRET?.trim() ?? "",
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
  });
  const response = await (input.fetchImpl ?? fetch)(`${gitlabBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitLab OAuth returned ${response.status}.`);
  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("GitLab OAuth returned no access token.");
  return json.access_token;
}
