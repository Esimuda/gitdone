export type VersionInfo = { sha: string; shortSha: string };

type Env = Record<string, string | undefined>;

export function resolveVersion(env: Env = process.env): VersionInfo {
  const sha = env.CI_COMMIT_SHA?.trim() || env.GIT_SHA?.trim() || "dev";
  return { sha, shortSha: sha.slice(0, 7) };
}
