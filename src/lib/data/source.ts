export type GitlabEnv =
  | { mode: "demo" }
  | { mode: "misconfigured"; message: string }
  | { mode: "gitlab"; token: string; projectId: string; baseUrl: string };

export function resolveGitlabEnv(env: Record<string, string | undefined>): GitlabEnv {
  const token = env.GITLAB_TOKEN?.trim() ?? "";
  const projectId = env.GITLAB_PROJECT_ID?.trim() ?? "";
  const baseUrl = (env.GITLAB_BASE_URL?.trim() || "https://gitlab.com").replace(/\/$/, "");
  if (!token && !projectId) return { mode: "demo" };
  if (!token || !projectId) {
    return {
      mode: "misconfigured",
      message:
        "Set both GITLAB_TOKEN and GITLAB_PROJECT_ID, or leave both unset to stay on seeded demo data.",
    };
  }
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { mode: "misconfigured", message: "GITLAB_BASE_URL must be an http(s) origin." };
    }
  } catch {
    return { mode: "misconfigured", message: "GITLAB_BASE_URL is not a valid URL." };
  }
  return { mode: "gitlab", token, projectId, baseUrl };
}
