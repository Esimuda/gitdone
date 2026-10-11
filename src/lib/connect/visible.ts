import { filterVisibleProjects } from "./access";
import { listAllProjects, type StoredProject } from "./db";
import { GitlabApi } from "./gitlab-api";
import { projectAccessLevel } from "./membership";
import { gitlabBaseUrl } from "./oauth";

export async function visibleProjects(viewerGitlabUserId: string, token: string | null): Promise<StoredProject[]> {
  const all = await listAllProjects();
  const levels: Record<string, number | null> = {};
  if (token) {
    const api = new GitlabApi(gitlabBaseUrl(), token);
    const others = all.filter((project) => project.ownerGitlabUserId !== viewerGitlabUserId).slice(0, 25);
    await Promise.all(
      others.map(async (project) => {
        levels[project.gitlabProjectId] = await projectAccessLevel(api, project.gitlabProjectId);
      }),
    );
  }
  return filterVisibleProjects(all, viewerGitlabUserId, levels);
}
