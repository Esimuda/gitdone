// Posts the approval journey note after a human merges to the default branch.
// The note shape matches src/lib/data/supervised-note.ts and docs/journey-schema.md.
// This file stays free of local imports so `node --experimental-strip-types` can run it in CI.

const api = (process.env.CI_API_V4_URL || `${process.env.CI_SERVER_URL || "https://gitlab.com"}/api/v4`).replace(
  /\/$/,
  "",
);
const projectId = process.env.CI_PROJECT_ID || "";
const sha = process.env.CI_COMMIT_SHA || "";
const jobToken = process.env.CI_JOB_TOKEN || "";
const noteToken = process.env.GITDONE_NOTE_TOKEN || "";
const releaseTag = process.env.RELEASE_TAG || "";

const ORDER = ["plan", "create", "verify", "package", "secure", "approval", "release", "configure", "monitor", "rollback", "govern"];

async function gitlab(path: string, init: RequestInit = {}, useNoteToken = false): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (useNoteToken && noteToken) headers.set("Authorization", `Bearer ${noteToken}`);
  else headers.set("JOB-TOKEN", jobToken);
  return fetch(`${api}${path}`, { ...init, headers });
}

function latestArtifact(notes: { body?: string }[]): Record<string, unknown> | null {
  const pattern = /<!--\s*journey:v1\s*([\s\S]*?)\s*-->/g;
  for (const note of notes) {
    const matches = [...(note.body ?? "").matchAll(pattern)];
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      try {
        const parsed = JSON.parse(matches[index]?.[1] ?? "") as Record<string, unknown>;
        if (parsed.version === 1) return parsed;
      } catch {
        // keep looking
      }
    }
  }
  return null;
}

function approvalBody(existing: Record<string, unknown> | null, issueIid: number, approval: { name: string; at: string; mrIid: number; mrUrl: string }): string {
  const stages = Array.isArray(existing?.stages) ? [...(existing.stages as Record<string, unknown>[])] : [];
  const without = stages.filter((stage) => stage.stage !== "approval");
  without.push({
    stage: "approval",
    status: "passed",
    startedAt: approval.at,
    completedAt: approval.at,
    summary: `${approval.name} merged MR !${approval.mrIid}.`,
    details: ["The agents posted Ready to merge and stopped.", "One click."],
    artifacts: [{ label: `MR !${approval.mrIid}`, href: approval.mrUrl }],
  });
  if (releaseTag) {
    const release = without.find((stage) => stage.stage === "release");
    if (release && release.status !== "passed") {
      release.status = "passed";
      release.completedAt = approval.at;
      release.summary = `GitLab Release ${releaseTag} published by the pipeline.`;
    }
  }
  without.sort((a, b) => ORDER.indexOf(String(a.stage)) - ORDER.indexOf(String(b.stage)));
  const line = `${approval.name} merged MR !${approval.mrIid} at ${approval.at}. That was the only click.`;
  const prior = typeof existing?.humanTouches === "number" ? existing.humanTouches : 0;
  const notes = Array.isArray(existing?.touchNotes) ? existing.touchNotes.map(String) : [];
  const artifact = {
    version: 1,
    issueIid,
    humanTouches: Math.max(1, prior),
    touchNotes: notes.includes(line) ? notes : [...notes, line],
    releaseTag: releaseTag || existing?.releaseTag,
    deployUrl: existing?.deployUrl,
    stages: without.filter((stage) => ORDER.includes(String(stage.stage))),
  };
  return `<!-- journey:v1\n${JSON.stringify(artifact, null, 2)}\n-->`;
}

async function main(): Promise<void> {
  if (!projectId || !sha) {
    console.log("journey:record skipped: not a CI merge pipeline.");
    return;
  }
  const encoded = encodeURIComponent(projectId);
  const mrResponse = await gitlab(`/projects/${encoded}/repository/commits/${sha}/merge_requests`);
  if (!mrResponse.ok) throw new Error(`Could not read merge requests (${mrResponse.status}).`);
  const mrs = (await mrResponse.json()) as {
    iid: number;
    web_url: string;
    merged_by?: { name?: string; username?: string };
    merged_at?: string;
    description?: string;
    title?: string;
  }[];
  const mr = mrs[0];
  if (!mr) {
    console.log("journey:record skipped: this commit has no merge request.");
    return;
  }
  const issueMatch = `${mr.title ?? ""}\n${mr.description ?? ""}`.match(/#(\d+)\b/);
  const issueIid = issueMatch ? Number(issueMatch[1]) : null;
  if (!issueIid) throw new Error("The merge request does not name an issue.");

  const notesResponse = await gitlab(`/projects/${encoded}/issues/${issueIid}/notes?sort=desc&per_page=100`);
  if (!notesResponse.ok) throw new Error(`Could not read issue notes (${notesResponse.status}).`);
  const notes = (await notesResponse.json()) as { body?: string }[];
  const name = mr.merged_by?.name || mr.merged_by?.username || "A maintainer";
  const body = approvalBody(latestArtifact(notes), issueIid, {
    name,
    at: mr.merged_at || new Date().toISOString(),
    mrIid: mr.iid,
    mrUrl: mr.web_url,
  });
  let posted = await gitlab(`/projects/${encoded}/issues/${issueIid}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!posted.ok && noteToken) {
    posted = await gitlab(
      `/projects/${encoded}/issues/${issueIid}/notes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      },
      true,
    );
  }
  if (!posted.ok) {
    throw new Error(
      `Could not post the journey note (${posted.status}). Set GITDONE_NOTE_TOKEN if the CI job token cannot write notes.`,
    );
  }
  console.log(`journey:record posted approval for !${mr.iid} on #${issueIid}`);
}

const isDirectRun = process.argv[1]?.includes("record-journey");
if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "journey:record failed.");
    process.exit(1);
  });
}
