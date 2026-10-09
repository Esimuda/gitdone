export const DEFAULT_CI_PROJECT =
  "gitlab-ai-hackathon/transcend-october-2026/43073569/gitdone";

export const SHIP_LABEL = { name: "ship", color: "#FC6D26", description: "GitDone ships this issue" };

export function ciProjectPath(): string {
  const fromEnv = process.env.GITDONE_CI_PROJECT?.trim();
  return fromEnv || DEFAULT_CI_PROJECT;
}

export function ciIncludeDocument(upstream: string): string {
  return `# GitDone supervised pipeline.
# Agents stop at the merge request. After one Merge click, this pipeline
# publishes the release and records who approved it.
include:
  - project: '${upstream}'
    file: '/ci/gitdone.gitlab-ci.yml'
    ref: main
`;
}

export type InstallFile = { path: string; content: string };

export function planInstall(input: {
  upstreamProject: string;
  hasCiFile: boolean;
  sources: InstallFile[];
}): { files: InstallFile[]; label: typeof SHIP_LABEL; includePath: string } {
  const includePath = input.hasCiFile ? ".gitlab/gitdone.include.yml" : ".gitlab-ci.yml";
  const files = [
    ...input.sources.filter((file) => file.path.length > 0),
    { path: includePath, content: ciIncludeDocument(input.upstreamProject) },
  ];
  return { files, label: SHIP_LABEL, includePath };
}

export function setupLinks(webUrl: string): { automate: string; catalog: string; variables: string } {
  const base = webUrl.replace(/\/$/, "");
  return {
    automate: `${base}/-/automate`,
    catalog: "https://gitlab.com/explore/ai-catalog/flows",
    variables: `${base}/-/settings/ci_cd`,
  };
}

export function assertNoSecret(files: InstallFile[], secret: string): void {
  const blob = files.map((file) => `${file.path}\n${file.content}`).join("\n");
  if (secret && blob.includes(secret)) {
    throw new Error("Refusing to commit a file that contains the access token.");
  }
}
