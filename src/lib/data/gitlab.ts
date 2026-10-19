import { buildAnnouncements } from "./announcements";
import { computeOverview, sortJourneys, stageTallies } from "./metrics";
import { readLatestJourney } from "./parse-journey";
import { emptyStage, normalizeStages, stageById } from "./stages";
import type { AppData, ChangelogKind, Journey, ProjectInfo, ReleaseEntry, StageRecord, StageStatus } from "./types";

export class GitlabError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitlabError";
  }
}

export type GitlabConfig = {
  token: string;
  projectId: string;
  baseUrl: string;
};

type GitlabUser = { name?: string; username?: string };

export type GitlabProject = {
  name: string;
  path_with_namespace: string;
  description?: string | null;
  web_url: string;
};

export type GitlabIssue = {
  iid: number;
  title: string;
  description?: string | null;
  state: "opened" | "closed";
  labels?: (string | { title?: string })[];
  web_url: string;
  author?: GitlabUser;
  created_at: string;
  closed_at?: string | null;
};

export type GitlabNote = { body?: string | null; created_at?: string };

export type GitlabMergeRequest = {
  iid: number;
  title: string;
  description?: string | null;
  state: string;
  web_url: string;
  source_branch: string;
  merged_at?: string | null;
  created_at?: string;
};

export type GitlabPipeline = {
  id: number;
  status: string;
  ref: string;
  web_url: string;
  created_at?: string;
  updated_at?: string;
};

export type GitlabRelease = {
  tag_name: string;
  name?: string | null;
  description?: string | null;
  released_at?: string | null;
  created_at?: string;
  author?: GitlabUser;
  _links?: { self?: string };
};

export function buildGitlabUrl(baseUrl: string, projectId: string, path: string): string {
  const root = baseUrl.replace(/\/$/, "");
  const suffix = path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${root}/api/v4/projects/${encodeURIComponent(projectId)}${suffix}`;
}

export function labelNames(labels: GitlabIssue["labels"]): string[] {
  if (!labels) return [];
  return labels
    .map((label) => (typeof label === "string" ? label : label.title ?? ""))
    .filter(Boolean);
}

/** Ship-labelled issues are the flow's work. If none are labelled yet, keep the page honest and show what GitLab returned. */
export function issuesForJourneys(issues: GitlabIssue[]): GitlabIssue[] {
  const labelled = issues.filter((issue) => labelNames(issue.labels).some((label) => label.toLowerCase() === "ship"));
  return labelled.length > 0 ? labelled : issues;
}

function authorName(user: GitlabUser | undefined): string {
  return user?.name || user?.username || "Unknown";
}

function mentionsIssue(text: string | null | undefined, iid: number): boolean {
  if (!text) return false;
  return new RegExp(`#${iid}\\b`).test(text);
}

const CHANGELOG_HEADING: Record<string, ChangelogKind> = {
  added: "added",
  fixed: "fixed",
  changed: "changed",
  security: "security",
};

export function parseChangelog(description: string): { kind: ChangelogKind; text: string }[] {
  const lines = description.split(/\r?\n/);
  let kind: ChangelogKind = "changed";
  const items: { kind: ChangelogKind; text: string }[] = [];
  for (const line of lines) {
    const heading = /^#{1,3}\s+([A-Za-z]+)/.exec(line.trim());
    if (heading) {
      const mapped = CHANGELOG_HEADING[heading[1].toLowerCase()];
      if (mapped) kind = mapped;
      continue;
    }
    const bullet = /^[-*]\s+(.+)/.exec(line.trim());
    if (bullet) items.push({ kind, text: bullet[1].trim() });
  }
  return items;
}

/**
 * A merged MR, a release whose notes close the issue, and a passed approval stage
 * (written by the journey:record job) mean the change shipped. The flow's own note
 * is written before the merge, so Release and Govern would otherwise stay pending.
 */
export function reconcileMergedRelease(
  stages: StageRecord[],
  mr: GitlabMergeRequest | undefined,
  release: GitlabRelease | undefined,
): StageRecord[] {
  if (!mr || mr.state !== "merged" || !release) return stages;
  if (stageById(stages, "approval")?.status !== "passed") return stages;
  if (stageById(stages, "rollback")) return stages;
  const releasedAt = release.released_at ?? release.created_at ?? mr.merged_at ?? undefined;
  return stages.map((stage) => {
    if (stage.status === "passed") return stage;
    if (stage.stage === "release") {
      return {
        ...stage,
        status: "passed" as const,
        completedAt: releasedAt,
        summary: `GitLab Release ${release.tag_name} is published.`,
        artifacts: release._links?.self ? [{ label: release.tag_name, href: release._links.self }] : stage.artifacts,
      };
    }
    if (stage.stage === "govern") {
      return {
        ...stage,
        status: "passed" as const,
        completedAt: releasedAt,
        summary: `Release ${release.tag_name} is published with the changelog from the merge request.`,
      };
    }
    return stage;
  });
}

function pipelineStatus(status: string): StageStatus {
  if (status === "success") return "passed";
  if (status === "failed" || status === "canceled") return "attention";
  if (status === "running" || status === "pending" || status === "created") return "running";
  return "pending";
}

export function inferJourney(input: {
  issue: GitlabIssue;
  mergeRequests: GitlabMergeRequest[];
  releases: GitlabRelease[];
  pipelines: GitlabPipeline[];
  notes: GitlabNote[];
}): Journey {
  const artifact = readLatestJourney(input.notes.map((note) => ({ body: note.body ?? "" })));
  const relatedMrs = input.mergeRequests.filter(
    (mr) => mentionsIssue(mr.description, input.issue.iid) || mentionsIssue(mr.title, input.issue.iid),
  );
  const mr = relatedMrs[0];
  const release = input.releases.find((item) => mentionsIssue(item.description, input.issue.iid));
  const pipeline =
    input.pipelines.find((item) => item.ref === mr?.source_branch) ??
    (mr?.state === "merged" ? input.pipelines.find((item) => item.ref === "main") : undefined);

  if (artifact && artifact.issueIid === input.issue.iid) {
    return {
      issueIid: input.issue.iid,
      title: input.issue.title,
      description: input.issue.description?.trim() || "",
      author: authorName(input.issue.author),
      labels: labelNames(input.issue.labels),
      webUrl: input.issue.web_url,
      createdAt: input.issue.created_at,
      closedAt: input.issue.closed_at ?? undefined,
      state: input.issue.state,
      humanTouches: artifact.humanTouches,
      touchNotes: artifact.touchNotes,
      stages: reconcileMergedRelease(artifact.stages, mr, release),
      releaseTag: artifact.releaseTag ?? release?.tag_name,
      deployUrl: artifact.deployUrl,
      provenance: "artifact",
    };
  }

  const stages = normalizeStages([]);
  const plan = stageById(stages, "plan") ?? emptyStage("plan");
  plan.status = "passed";
  plan.startedAt = input.issue.created_at;
  plan.completedAt = input.issue.created_at;
  plan.summary = "Issue is open in GitLab. The flow has not written a plan record yet.";
  plan.details = input.issue.description ? [input.issue.description.slice(0, 280)] : [];

  if (mr) {
    const create = stageById(stages, "create")!;
    create.status = mr.state === "merged" || mr.state === "opened" ? "passed" : "attention";
    create.startedAt = mr.created_at;
    create.completedAt = mr.merged_at ?? mr.created_at;
    create.summary = `Merge request !${mr.iid} is ${mr.state}.`;
    create.artifacts = [{ label: `MR !${mr.iid}`, href: mr.web_url }];
  }

  if (pipeline) {
    const status = pipelineStatus(pipeline.status);
    for (const id of ["verify", "package", "secure"] as const) {
      const stage = stageById(stages, id)!;
      stage.status = status;
      stage.startedAt = pipeline.created_at;
      stage.completedAt = status === "passed" ? pipeline.updated_at : undefined;
      stage.summary = `Pipeline #${pipeline.id} is ${pipeline.status}. Stage detail arrives with the journey record.`;
      stage.artifacts = [{ label: `Pipeline #${pipeline.id}`, href: pipeline.web_url }];
    }
  }

  if (release) {
    const releaseStage = stageById(stages, "release")!;
    releaseStage.status = "passed";
    releaseStage.completedAt = release.released_at ?? release.created_at;
    releaseStage.summary = `GitLab Release ${release.tag_name} is published.`;
    if (release._links?.self) {
      releaseStage.artifacts = [{ label: release.tag_name, href: release._links.self }];
    }
  }

  return {
    issueIid: input.issue.iid,
    title: input.issue.title,
    description: input.issue.description?.trim() || "",
    author: authorName(input.issue.author),
    labels: labelNames(input.issue.labels),
    webUrl: input.issue.web_url,
    createdAt: input.issue.created_at,
    closedAt: input.issue.closed_at ?? undefined,
    state: input.issue.state,
    humanTouches: null,
    touchNotes: [],
    stages,
    releaseTag: release?.tag_name,
    provenance: "inferred",
  };
}

export function mapRelease(input: {
  release: GitlabRelease;
  projectName: string;
  projectWebUrl: string;
  journeys: Journey[];
}): ReleaseEntry {
  const description = input.release.description?.trim() || "";
  const changelog = parseChangelog(description);
  const highlights = changelog.slice(0, 4).map((item) => item.text);
  const summary = highlights[0] || input.release.name || `Release ${input.release.tag_name}`;
  const issueMatch = description.match(/#(\d+)\b/);
  const issueIid = issueMatch ? Number(issueMatch[1]) : undefined;
  const journey = input.journeys.find(
    (item) => item.releaseTag === input.release.tag_name || item.issueIid === issueIid,
  );
  const webUrl =
    input.release._links?.self || `${input.projectWebUrl}/-/releases/${encodeURIComponent(input.release.tag_name)}`;
  const humanTouches = journey?.humanTouches ?? null;
  return {
    tag: input.release.tag_name,
    title: input.release.name?.trim() || input.release.tag_name,
    releasedAt: input.release.released_at || input.release.created_at || new Date(0).toISOString(),
    author: authorName(input.release.author),
    summary,
    highlights: highlights.length ? highlights : [summary],
    changelog,
    issueIid: journey?.issueIid ?? issueIid,
    deployUrl: journey?.deployUrl,
    webUrl,
    humanTouches,
    announcements: buildAnnouncements({
      projectName: input.projectName,
      tag: input.release.tag_name,
      summary,
      bullets: highlights.length ? highlights : [summary],
      url: webUrl,
      humanTouches,
    }),
  };
}

async function gitlabGet<T>(config: GitlabConfig, path: string, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(buildGitlabUrl(config.baseUrl, config.projectId, path), {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 401 || response.status === 403) {
    throw new GitlabError(`GitLab returned ${response.status}. The token cannot read this project.`);
  }
  if (response.status === 404) {
    throw new GitlabError("GitLab returned 404. Check GITLAB_PROJECT_ID and GITLAB_BASE_URL.");
  }
  if (!response.ok) {
    throw new GitlabError(`GitLab returned ${response.status} for ${path}.`);
  }
  return (await response.json()) as T;
}

export async function loadGitlabAppData(
  config: GitlabConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<AppData> {
  const [project, allIssues, mergeRequests, releases, pipelines] = await Promise.all([
    gitlabGet<GitlabProject>(config, "", fetchImpl),
    gitlabGet<GitlabIssue[]>(config, "/issues?state=all&per_page=20&order_by=updated_at", fetchImpl),
    gitlabGet<GitlabMergeRequest[]>(config, "/merge_requests?state=all&per_page=50", fetchImpl),
    gitlabGet<GitlabRelease[]>(config, "/releases?per_page=20", fetchImpl),
    gitlabGet<GitlabPipeline[]>(config, "/pipelines?per_page=20", fetchImpl),
  ]);

  const issues = issuesForJourneys(allIssues);

  const notesList = await Promise.all(
    issues.map(async (issue) => {
      try {
        return await gitlabGet<GitlabNote[]>(
          config,
          `/issues/${issue.iid}/notes?sort=desc&per_page=100`,
          fetchImpl,
        );
      } catch {
        return [] as GitlabNote[];
      }
    }),
  );

  const journeys = sortJourneys(
    issues.map((issue, index) =>
      inferJourney({
        issue,
        mergeRequests,
        releases,
        pipelines,
        notes: notesList[index] ?? [],
      }),
    ),
  );

  const projectInfo: ProjectInfo = {
    name: project.name,
    path: project.path_with_namespace,
    description: project.description?.trim() || "",
    webUrl: project.web_url,
  };

  const mappedReleases = releases
    .map((release) =>
      mapRelease({
        release,
        projectName: project.name,
        projectWebUrl: project.web_url,
        journeys,
      }),
    )
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));

  const artifactCount = journeys.filter((journey) => journey.provenance === "artifact").length;
  const warning =
    journeys.length > 0 && artifactCount === 0
      ? "Connected to GitLab. No journey record yet, so stages are inferred from issues, merge requests, pipelines, and releases."
      : undefined;

  return {
    source: "gitlab",
    project: projectInfo,
    journeys,
    releases: mappedReleases,
    overview: computeOverview(journeys),
    tallies: stageTallies(journeys),
    warning,
  };
}

export function projectEndpoint(config: GitlabConfig): string {
  return buildGitlabUrl(config.baseUrl, config.projectId, "");
}
