import { GitlabApi } from "./gitlab-api";
import { accessLevel, type GitlabProjectAccess } from "./prerequisites";
import { selectableProjects, type MembershipProject } from "./access";

type RawProject = GitlabProjectAccess & { path_with_namespace: string; name: string };

export async function listDeveloperProjects(api: GitlabApi): Promise<MembershipProject[]> {
  const raw = await api.get<RawProject[]>(
    "/api/v4/projects?membership=true&simple=false&min_access_level=30&per_page=100&order_by=last_activity_at",
  );
  return selectableProjects(
    raw.map((project) => {
      const reported = accessLevel(project);
      return {
        id: project.id,
        name: project.name,
        path_with_namespace: project.path_with_namespace,
        accessLevel: reported > 0 ? reported : 30,
      };
    }),
  );
}

export async function projectAccessLevel(api: GitlabApi, gitlabProjectId: string): Promise<number | null> {
  try {
    const project = await api.get<GitlabProjectAccess>(`/api/v4/projects/${encodeURIComponent(gitlabProjectId)}`);
    return accessLevel(project);
  } catch {
    return null;
  }
}
