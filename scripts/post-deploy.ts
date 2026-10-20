// Configure and Monitor stages that run after a human merges to the default branch.
//   configure: waits for production to serve this exact commit, then checks that every
//              runtime setting production needs is present (via /api/health config flags).
//   monitor:   probes the live endpoints several times, records latency and status, and
//              opens an incident issue if anything fails.
// Each mode appends its stage to the issue's journey note, so the Mission page shows it.
// A scheduled pipeline runs monitor alone (no journey) every few hours.
// Free of local imports so `node --experimental-strip-types` can run it in CI.

const api = (process.env.CI_API_V4_URL || "https://gitlab.com/api/v4").replace(/\/$/, "");
const projectId = process.env.CI_PROJECT_ID || "";
const sha = process.env.CI_COMMIT_SHA || "";
const token = process.env.GITDONE_NOTE_TOKEN || "";
const liveUrl = (process.env.GITDONE_LIVE_URL || "https://gitdone.onrender.com").replace(/\/$/, "");
const jobUrl = process.env.CI_JOB_URL || "";
const envUrl = `${process.env.CI_PROJECT_URL || ""}/-/environments`;
const ORDER = ["plan", "create", "verify", "package", "secure", "approval", "release", "configure", "monitor", "rollback", "govern"];
export const REQUIRED_CONFIG = ["database", "sessionSecret", "tokenKey", "oauth", "publicUrl", "gitlabToken"];

type Stage = { stage: string; status: string; startedAt: string; completedAt: string; summary: string; details: string[]; artifacts: { label: string; href: string }[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gitlab(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else headers.set("JOB-TOKEN", process.env.CI_JOB_TOKEN || "");
  if (init.body) headers.set("Content-Type", "application/json");
  return fetch(`${api}/projects/${encodeURIComponent(projectId)}${path}`, { ...init, headers });
}

async function timed(path: string): Promise<{ path: string; status: number; ms: number; body: string }> {
  const start = Date.now();
  try {
    const res = await fetch(`${liveUrl}${path}`, { headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(60_000) });
    const body = await res.text();
    return { path, status: res.status, ms: Date.now() - start, body };
  } catch {
    return { path, status: 0, ms: Date.now() - start, body: "" };
  }
}

export function missingConfig(health: unknown): string[] {
  const config = (health as { config?: Record<string, unknown> } | null)?.config ?? {};
  return REQUIRED_CONFIG.filter((key) => config[key] !== true);
}

/** True when `newer` already contains `older` (a later merge reached production first). */
async function contains(newer: string, older: string): Promise<boolean> {
  const res = await gitlab(`/repository/merge_base?refs[]=${newer}&refs[]=${older}`);
  if (!res.ok) return false;
  return ((await res.json()) as { id?: string }).id === older;
}

async function issueForCommit(): Promise<number | null> {
  const res = await gitlab(`/repository/commits/${sha}/merge_requests`);
  if (!res.ok) return null;
  const mr = ((await res.json()) as { title?: string; description?: string }[])[0];
  const m = `${mr?.title ?? ""}\n${mr?.description ?? ""}`.match(/#(\d+)\b/);
  return m ? Number(m[1]) : null;
}

async function appendStage(issueIid: number, stage: Stage): Promise<void> {
  const res = await gitlab(`/issues/${issueIid}/notes?sort=desc&per_page=100`);
  const notes = res.ok ? ((await res.json()) as { body?: string }[]) : [];
  let existing: Record<string, unknown> | null = null;
  outer: for (const note of notes) {
    const matches = [...(note.body ?? "").matchAll(/<!--\s*journey:v1\s*([\s\S]*?)\s*-->/g)];
    for (let i = matches.length - 1; i >= 0; i -= 1) {
      try {
        const parsed = JSON.parse(matches[i]?.[1] ?? "");
        if (parsed.version === 1) { existing = parsed; break outer; }
      } catch { /* keep looking */ }
    }
  }
  const stages = ((existing?.stages as Stage[]) ?? []).filter((s) => s.stage !== stage.stage);
  stages.push(stage);
  stages.sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage));
  const artifact = { ...(existing ?? { version: 1, issueIid, humanTouches: null, touchNotes: [] }), deployUrl: liveUrl, stages };
  const body = `**${stage.stage === "configure" ? "Configure" : "Monitor"}: ${stage.status}.** ${stage.summary}\n\n<!-- journey:v1\n${JSON.stringify(artifact, null, 2)}\n-->`;
  const posted = await gitlab(`/issues/${issueIid}/notes`, { method: "POST", body: JSON.stringify({ body }) });
  if (!posted.ok) throw new Error(`Could not post the ${stage.stage} note (${posted.status}).`);
}

async function openIncident(title: string, lines: string[]): Promise<string | null> {
  const open = await gitlab(`/issues?state=opened&labels=incident&per_page=20`);
  if (open.ok) {
    const existing = ((await open.json()) as { iid: number; web_url: string }[])[0];
    if (existing) {
      await gitlab(`/issues/${existing.iid}/notes`, { method: "POST", body: JSON.stringify({ body: lines.join("\n") }) });
      return existing.web_url;
    }
  }
  const intro = "Opened automatically by GitDone's post-deploy checks. Production keeps serving the last good release; this issue closes itself when the check passes again.";
  const res = await gitlab(`/issues`, { method: "POST", body: JSON.stringify({ title, labels: "incident,monitor", description: [intro, "", ...lines].join("\n") }) });
  return res.ok ? ((await res.json()) as { web_url: string }).web_url : null;
}

/** Close open incidents once the check that opened them passes again, with the evidence. */
async function resolveIncidents(prefix: string, lines: string[]): Promise<void> {
  const open = await gitlab(`/issues?state=opened&labels=incident&per_page=50`);
  if (!open.ok) return;
  for (const issue of (await open.json()) as { iid: number; title: string }[]) {
    if (!issue.title.startsWith(prefix)) continue;
    await gitlab(`/issues/${issue.iid}/notes`, { method: "POST", body: JSON.stringify({ body: [`Resolved automatically: the ${prefix.toLowerCase().includes("monitor") ? "monitor" : "configure"} check passed again.`, ...lines].join("\n") }) });
    await gitlab(`/issues/${issue.iid}`, { method: "PUT", body: JSON.stringify({ state_event: "close" }) });
    console.log(`closed incident #${issue.iid}`);
  }
}

async function configure(): Promise<void> {
  const startedAt = new Date().toISOString();
  const deadline = Date.now() + Number(process.env.CONFIGURE_WAIT_MINUTES || 20) * 60_000;
  let served = "";
  let supersededBy = "";
  while (Date.now() < deadline) {
    const v = await timed("/api/version");
    try { served = (JSON.parse(v.body) as { sha?: string }).sha ?? ""; } catch { served = ""; }
    console.log(`production serves ${served || "nothing yet"} (want ${sha.slice(0, 8)})`);
    if (served === sha) break;
    if (served && (await contains(served, sha))) { supersededBy = served; break; }
    await sleep(20_000);
  }
  const health = await timed("/api/health");
  let parsed: unknown = null;
  try { parsed = JSON.parse(health.body); } catch { /* not json */ }
  const missing = missingConfig(parsed);
  const live = served === sha || Boolean(supersededBy);
  const ok = live && health.status === 200 && missing.length === 0;
  const details = [
    `GitLab environment production points at ${liveUrl}.`,
    served === sha ? `Render is serving commit ${sha.slice(0, 8)}.` : supersededBy ? `Render is serving ${supersededBy.slice(0, 8)}, a newer main commit that already contains ${sha.slice(0, 8)}.` : `Render still served ${served.slice(0, 8) || "nothing"} after the wait.`,
    missing.length ? `Missing runtime config: ${missing.join(", ")}.` : `All ${REQUIRED_CONFIG.length} runtime settings are present: ${REQUIRED_CONFIG.join(", ")}.`,
  ];
  details.forEach((d) => console.log(d));
  const issueIid = await issueForCommit();
  const stage: Stage = {
    stage: "configure", status: ok ? "passed" : "attention", startedAt, completedAt: new Date().toISOString(),
    summary: ok ? `Production at ${liveUrl} serves ${sha.slice(0, 8)} with every runtime setting in place.` : "Production is not serving this commit with full config.",
    details, artifacts: [{ label: "Environment", href: envUrl }, { label: "Configure job", href: jobUrl }, { label: "Live version", href: `${liveUrl}/api/version` }],
  };
  if (issueIid) await appendStage(issueIid, stage);
  if (ok) await resolveIncidents("Configure failed", [`Configure job: ${jobUrl}`, ...details]);
  if (!ok) {
    await openIncident(`Configure failed for ${sha.slice(0, 8)}`, [`Configure job: ${jobUrl}`, ...details]);
    process.exit(1);
  }
}

async function monitor(): Promise<void> {
  const startedAt = new Date().toISOString();
  const paths = ["/", "/api/health", "/api/version", "/mission", "/feed.xml"];
  const rounds = Number(process.env.MONITOR_ROUNDS || 3);
  const results: Awaited<ReturnType<typeof timed>>[] = [];
  for (let round = 0; round < rounds; round += 1) {
    for (const path of paths) {
      const r = await timed(path);
      console.log(`round ${round + 1} ${path} -> ${r.status} in ${r.ms} ms`);
      results.push(r);
    }
    if (round < rounds - 1) await sleep(30_000);
  }
  const failures = results.filter((r) => r.status !== 200);
  const slowest = Math.max(...results.map((r) => r.ms));
  const sorted = results.map((r) => r.ms).sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)];
  const ok = failures.length === 0;
  const details = [
    `${results.length} probes over ${rounds} rounds: ${results.length - failures.length} returned 200.`,
    `Median ${p50} ms, slowest ${slowest} ms.`,
    ...failures.map((f) => `${f.path} returned ${f.status || "no response"}.`),
  ];
  const report = { liveUrl, sha, at: new Date().toISOString(), ok, p50, slowest, results: results.map((r) => ({ path: r.path, status: r.status, ms: r.ms })) };
  await import("node:fs").then((fs) => fs.writeFileSync("monitor-report.json", JSON.stringify(report, null, 2)));
  let incident: string | null = null;
  if (ok) await resolveIncidents("Production monitor failed", [`Monitor job: ${jobUrl}`, ...details]);
  if (!ok) incident = await openIncident(`Production monitor failed at ${liveUrl}`, [`Monitor job: ${jobUrl}`, ...details]);
  if (process.env.CI_PIPELINE_SOURCE !== "schedule") {
    const issueIid = await issueForCommit();
    const artifacts = [{ label: "Monitor job", href: jobUrl }, { label: "Health", href: `${liveUrl}/api/health` }];
    if (incident) artifacts.push({ label: "Incident", href: incident });
    if (issueIid) await appendStage(issueIid, {
      stage: "monitor", status: ok ? "passed" : "attention", startedAt, completedAt: new Date().toISOString(),
      summary: ok ? `Every live endpoint returned 200 across ${rounds} rounds. Median ${p50} ms.` : `${failures.length} live probe(s) failed. Incident opened.`,
      details, artifacts,
    });
  }
  details.forEach((d) => console.log(d));
  if (!ok) process.exit(1);
}

if (process.argv[1]?.includes("post-deploy")) {
  const mode = process.argv[2];
  (mode === "configure" ? configure() : mode === "monitor" ? monitor() : Promise.reject(new Error("mode must be configure or monitor")))
    .catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
