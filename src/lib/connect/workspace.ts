import { getDb, projectById, type StoredProject } from "./db";
import { loadGitlabAppData } from "@/lib/data/gitlab";
import { gitlabBaseUrl } from "./oauth";
import type { AppData } from "@/lib/data/types";

export async function loadConnected(
  projectId: string,
): Promise<{ project: StoredProject; data: AppData | null; message?: string } | null> {
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) return null;
  let row: ReturnType<typeof projectById>;
  try {
    row = projectById(getDb(), id);
  } catch {
    return null;
  }
  if (!row) return null;
  const { token, ...project } = row;
  try {
    const data = await loadGitlabAppData({
      token,
      projectId: row.gitlabProjectId,
      baseUrl: gitlabBaseUrl(),
    });
    return { project, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitLab could not be read.";
    return { project, data: null, message };
  }
}
