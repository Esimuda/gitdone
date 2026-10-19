export type VersionInfo = { sha: string; shortSha: string };

type Env = Record<string, string | undefined>;

export const SHORT_SHA_LENGTH = 8;

/** Resolution order: CI_COMMIT_SHA, GIT_SHA, RENDER_GIT_COMMIT, then "dev". */
export function resolveVersion(env: Env = process.env): VersionInfo {
  const sha =
    env.CI_COMMIT_SHA?.trim() || env.GIT_SHA?.trim() || env.RENDER_GIT_COMMIT?.trim() || "dev";
  return { sha, shortSha: sha.slice(0, SHORT_SHA_LENGTH) };
}
