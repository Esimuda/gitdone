import { projectById, tokenForUser, type StoredProject } from "./db";
import { loadGitlabAppData } from "@/lib/data/gitlab";
import { gitlabBaseUrl } from "./oauth";
import type { AppData } from "@/lib/data/types";

export async function loadConnected(
  projectId: string,
): Promise<{ project: StoredProject; data: AppData | null; message?: string } | null> {
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) return null;
  let project: StoredProject | null;
  try {
    project = await projectById(id);
  } catch {
    return null;
  }
  if (!project?.isPublic) return null;
  const token = await tokenForUser(project.ownerGitlabUserId);
  if (!token) return { project, data: null, message: "This workspace is public, but its connection needs a fresh sign-in." };
  try {
    const data = await loadGitlabAppData({
      token,
      projectId: project.gitlabProjectId,
      baseUrl: gitlabBaseUrl(),
    });
    return { project, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitLab could not be read.";
    return { project, data: null, message };
  }
}

export async function loadProjectForViewer(
  projectId: string,
  token: string,
): Promise<{ project: StoredProject; data: AppData | null; message?: string } | null> {
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const project = await projectById(id);
  if (!project) return null;
  try {
    const data = await loadGitlabAppData({
      token,
      projectId: project.gitlabProjectId,
      baseUrl: gitlabBaseUrl(),
    });
    return { project, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitLab could not be read.";
    return { project, data: null, message };
  }
}
