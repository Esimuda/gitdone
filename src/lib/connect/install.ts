import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { GitlabApi, GitlabApiError, encodeProject } from "./gitlab-api";
import { assertNoSecret, ciProjectPath, planInstall, type InstallFile } from "./install-plan";
import { accessLevel, checksPass, prerequisiteReport, type Check, type GitlabProjectAccess } from "./prerequisites";

const DUO_QUERY = `query($fullPath: ID!) {
  project(fullPath: $fullPath) {
    duoWorkflowStatusCheck { enabled }
  }
}`;

export type InspectedProject = GitlabProjectAccess & { default_branch?: string };

export function readInstallSources(root = process.cwd()): InstallFile[] {
  const fixed = [
    ".gitlab/duo/flows/issue-to-production.yml",
    "AGENTS.md",
    ".gitlab/issue_templates/Ship.md",
  ];
  const skills = readdirSync(path.join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `skills/${entry.name}/SKILL.md`);
  return [...fixed, ...skills].map((file) => ({
    path: file,
    content: readFileSync(path.join(root, file), "utf8"),
  }));
}

export async function inspectProject(
  api: GitlabApi,
  projectRef: string,
): Promise<{ project: InspectedProject; checks: Check[] }> {
  const project = await api.get<InspectedProject>(`/api/v4/projects/${encodeProject(projectRef)}`);
  let duoEnabled: boolean | null = null;
  let duoDetail: string | undefined;
  try {
    const data = await api.graphql<{
      project?: { duoWorkflowStatusCheck?: { enabled?: boolean } | null } | null;
    }>(DUO_QUERY, { fullPath: project.path_with_namespace });
    const enabled = data.project?.duoWorkflowStatusCheck?.enabled;
    duoEnabled = typeof enabled === "boolean" ? enabled : null;
    if (duoEnabled !== true) duoDetail = "Duo Agent Platform is not enabled on this project.";
  } catch (error) {
    duoDetail = error instanceof Error ? error.message : "Duo status could not be read.";
  }
  return {
    project,
    checks: prerequisiteReport({ level: accessLevel(project), duoEnabled, duoDetail }),
  };
}

export async function installGitDone(
  api: GitlabApi,
  projectRef: string,
  token: string,
  sources = readInstallSources(),
): Promise<
  | { ok: false; project: InspectedProject; checks: Check[] }
  | { ok: true; project: InspectedProject; checks: Check[]; mergeRequestUrl: string; includePath: string }
> {
  const inspected = await inspectProject(api, projectRef);
  if (!checksPass(inspected.checks)) return { ok: false, ...inspected };

  const projectId = inspected.project.id;
  const ref = encodeProject(String(projectId));
  let hasCi = false;
  try {
    await api.get(`/api/v4/projects/${ref}/repository/files/${encodeURIComponent(".gitlab-ci.yml")}?ref=HEAD`);
    hasCi = true;
  } catch (error) {
    if (!(error instanceof GitlabApiError) || (error.status !== 404 && error.status !== 400)) throw error;
  }

  const plan = planInstall({
    upstreamProject: ciProjectPath(),
    hasCiFile: hasCi,
    sources,
  });
  assertNoSecret(plan.files, token);

  try {
    await api.post(`/api/v4/projects/${ref}/labels`, plan.label);
  } catch (error) {
    if (!(error instanceof GitlabApiError) || (error.status !== 409 && error.status !== 400)) throw error;
  }

  const branch = `gitdone-install-${Date.now().toString(36)}`;
  const target = inspected.project.default_branch || "main";
  await api.post(`/api/v4/projects/${ref}/repository/commits`, {
    branch,
    start_branch: target,
    commit_message: "Add the GitDone supervised flow\n\nAgents stop at the merge request. One click finishes the ship.",
    actions: plan.files.map((file) => ({ action: "create", file_path: file.path, content: file.content })),
  });
  const mr = await api.post<{ web_url: string }>(`/api/v4/projects/${ref}/merge_requests`, {
    source_branch: branch,
    target_branch: target,
    title: "Add GitDone",
    description:
      "Installs the supervised issue-to-production flow, the ship label, and the CI include.\n\nAgents do everything up to the merge. You approve with one click.",
    remove_source_branch: true,
  });
  return {
    ok: true,
    project: inspected.project,
    checks: inspected.checks,
    mergeRequestUrl: mr.web_url,
    includePath: plan.includePath,
  };
}
