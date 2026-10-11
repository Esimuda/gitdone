import type { StoredProject } from "./db";

export function mayViewProject(input: {
  viewerGitlabUserId: string;
  ownerGitlabUserId: string;
  accessLevel: number | null;
}): boolean {
  if (input.viewerGitlabUserId === input.ownerGitlabUserId) return true;
  return (input.accessLevel ?? -1) >= 30;
}

export function filterVisibleProjects(
  projects: StoredProject[],
  viewerGitlabUserId: string,
  accessByGitlabId: Record<string, number | null>,
): StoredProject[] {
  return projects.filter((project) =>
    mayViewProject({
      viewerGitlabUserId,
      ownerGitlabUserId: project.ownerGitlabUserId,
      accessLevel: project.ownerGitlabUserId === viewerGitlabUserId ? 50 : (accessByGitlabId[project.gitlabProjectId] ?? null),
    }),
  );
}

export type MembershipProject = {
  id: number;
  name: string;
  path: string;
  accessLevel: number;
};

export function selectableProjects(
  projects: { id: number; name: string; path_with_namespace: string; accessLevel: number }[],
): MembershipProject[] {
  return projects
    .filter((project) => project.accessLevel >= 30)
    .map((project) => ({ id: project.id, name: project.name, path: project.path_with_namespace, accessLevel: project.accessLevel }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
