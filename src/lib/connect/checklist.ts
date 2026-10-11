import { GitlabApi, GitlabApiError, encodeProject } from "./gitlab-api";
import { setupLinks } from "./install-plan";

export type SetupStep = {
  id: "catalog" | "merge" | "note-token";
  label: string;
  detail: string;
  href: string;
  done: boolean;
};

export function mergeRequestIid(url: string | null): number | null {
  const match = url?.match(/\/merge_requests\/(\d+)(?:\?|$)/);
  return match ? Number(match[1]) : null;
}

export function setupChecklist(input: {
  webUrl: string;
  mergeRequestUrl: string | null;
  mrState: string | null;
  flowEnabled: boolean;
  noteTokenSet: boolean;
}): SetupStep[] {
  const links = setupLinks(input.webUrl);
  return [
    {
      id: "catalog",
      label: "Enable the flow in the AI Catalog",
      detail: "Turn GitDone on for this project and keep the ship trigger.",
      href: links.catalog,
      done: input.flowEnabled,
    },
    {
      id: "merge",
      label: "Merge the install request",
      detail: "One click adds the flow, the skills, and the CI include.",
      href: input.mergeRequestUrl || links.automate,
      done: input.mrState === "merged",
    },
    {
      id: "note-token",
      label: "Set the GITDONE_NOTE_TOKEN CI variable",
      detail: "The pipeline uses it if the job token cannot post the approval note. The value stays in GitLab.",
      href: links.variables,
      done: input.noteTokenSet,
    },
  ];
}

export async function readSetupSignals(
  api: GitlabApi,
  project: { gitlabProjectId: string; mergeRequestIid: number | null },
): Promise<{ mrState: string | null; flowEnabled: boolean; noteTokenSet: boolean }> {
  const ref = encodeProject(project.gitlabProjectId);
  const mrState = project.mergeRequestIid ? await readMrState(api, ref, project.mergeRequestIid) : null;
  const noteTokenSet = await variableExists(api, ref);
  const flowEnabled = await flowTriggersExist(api, ref);
  return { mrState, flowEnabled, noteTokenSet };
}

async function readMrState(api: GitlabApi, ref: string, iid: number): Promise<string | null> {
  try {
    const mr = await api.get<{ state?: string }>(`/api/v4/projects/${ref}/merge_requests/${iid}`);
    return mr.state ?? null;
  } catch {
    return null;
  }
}

async function variableExists(api: GitlabApi, ref: string): Promise<boolean> {
  try {
    await api.get(`/api/v4/projects/${ref}/variables/GITDONE_NOTE_TOKEN`);
    return true;
  } catch (error) {
    if (error instanceof GitlabApiError) return false;
    return false;
  }
}

async function flowTriggersExist(api: GitlabApi, ref: string): Promise<boolean> {
  try {
    const triggers = await api.get<unknown[]>(`/api/v4/projects/${ref}/ai/flow_triggers`);
    return Array.isArray(triggers) && triggers.length > 0;
  } catch {
    return false;
  }
}
