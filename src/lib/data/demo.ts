import { buildAnnouncements } from "./announcements";
import { computeOverview, sortJourneys, stageTallies } from "./metrics";
import { STAGE_IDS } from "./types";
import type { AppData, Journey, ReleaseEntry, StageId, StageRecord, StageStatus } from "./types";

const PROJECT_WEB = "https://gitlab.com/community/keel";

function stage(
  id: StageId,
  status: StageStatus,
  summary: string,
  extra: Partial<Omit<StageRecord, "stage" | "status" | "summary">> = {},
): StageRecord {
  return {
    stage: id,
    status,
    summary,
    details: extra.details ?? [],
    artifacts: extra.artifacts ?? [],
    startedAt: extra.startedAt,
    completedAt: extra.completedAt,
    security: extra.security,
  };
}

function journey(input: Omit<Journey, "provenance" | "stages"> & { stages: StageRecord[] }): Journey {
  const byId = new Map(input.stages.map((item) => [item.stage, item]));
  const stages = STAGE_IDS.map(
    (id) =>
      byId.get(id) ?? {
        stage: id,
        status: "pending" as const,
        summary: "",
        details: [],
        artifacts: [],
      },
  );
  return { ...input, stages, provenance: "demo" };
}

const journeys: Journey[] = [
  journey({
    issueIid: 148,
    title: "Rate-limit the public RPC proxy",
    description:
      "Anonymous callers can hammer the public proxy and drown the community node. Cap anonymous traffic at 60 requests a minute per key, return 429 with Retry-After, and leave the community allowlist uncapped.",
    author: "Jules Okonkwo",
    labels: ["ship", "security"],
    webUrl: `${PROJECT_WEB}/-/issues/148`,
    createdAt: "2026-10-06T07:12:00.000Z",
    state: "opened",
    humanTouches: 0,
    touchNotes: [],
    stages: [
      stage(
        "plan",
        "passed",
        "Three checks: 60 requests a minute for anonymous keys, 429 with Retry-After, and no cap on the allowlist.",
        {
          startedAt: "2026-10-06T07:12:00.000Z",
          completedAt: "2026-10-06T07:16:00.000Z",
          details: [
            "The issue already named the limit, the status code, and the allowlist exception.",
            "No question posted. The plan note is on the issue.",
          ],
        },
      ),
      stage("create", "passed", "Opened MR !91 on branch 148-rpc-rate-limit with the limiter and two fixtures.", {
        startedAt: "2026-10-06T07:16:00.000Z",
        completedAt: "2026-10-06T07:34:00.000Z",
        details: ["Token bucket lives next to the proxy handler. Allowlist keys skip the bucket."],
        artifacts: [{ label: "MR !91", href: `${PROJECT_WEB}/-/merge_requests/91` }],
      }),
      stage("verify", "passed", "Pipeline #4160 passed. 51 tests, 0 failed. New cases cover the 61st call and the allowlist.", {
        startedAt: "2026-10-06T07:34:00.000Z",
        completedAt: "2026-10-06T07:39:00.000Z",
        artifacts: [{ label: "Pipeline #4160", href: `${PROJECT_WEB}/-/pipelines/4160` }],
      }),
      stage(
        "package",
        "passed",
        "Built registry.gitlab.com/community/keel:148-rc1 from the branch. Not tagged for release yet.",
        {
          startedAt: "2026-10-06T07:39:00.000Z",
          completedAt: "2026-10-06T07:43:00.000Z",
          details: ["Digest sha256:9c1e…a41f recorded on the pipeline."],
        },
      ),
      stage(
        "secure",
        "running",
        "Secret detection is clean. SAST reported two findings. Header injection is patched. The timing leak on the counter is still open.",
        {
          startedAt: "2026-10-06T07:43:00.000Z",
          details: [
            "Resolved: request header was concatenated into a log line. The patch quotes it.",
            "Open: the limit counter returns faster for unknown keys than for known ones.",
          ],
          security: { found: 2, resolved: 1 },
          artifacts: [{ label: "SAST report", href: `${PROJECT_WEB}/-/pipelines/4160/security` }],
        },
      ),
    ],
  }),
  journey({
    issueIid: 151,
    title: "Status page follows the community dark theme",
    description:
      "The status page is hard-coded to a light background. When the community site is in dark mode, the embedded status panel flashes white. Follow the parent theme and keep the contrast of the incident banner.",
    author: "Mina Alvarez",
    labels: ["ship", "status"],
    webUrl: `${PROJECT_WEB}/-/issues/151`,
    createdAt: "2026-10-06T07:41:00.000Z",
    state: "opened",
    humanTouches: 0,
    touchNotes: [],
    stages: [
      stage("plan", "running", "Reading the status template and the theme token the community site already publishes.", {
        startedAt: "2026-10-06T07:41:00.000Z",
        details: ["No code yet. The issue names the flash and the incident banner, which is enough to plan."],
      }),
    ],
  }),
  journey({
    issueIid: 142,
    title: "Add session-expiry warnings to the verify CLI",
    description:
      "The verify CLI stays quiet until a session is already dead, and operators find out from a failed transaction. Warn when remaining time crosses 20 percent, exit non-zero when the session is expired, and keep the current text output. No new flags.",
    author: "Mina Alvarez",
    labels: ["ship", "cli"],
    webUrl: `${PROJECT_WEB}/-/issues/142`,
    createdAt: "2026-10-05T09:14:00.000Z",
    closedAt: "2026-10-05T10:04:00.000Z",
    state: "closed",
    humanTouches: 0,
    touchNotes: [],
    releaseTag: "v0.4.2",
    deployUrl: "https://keel.example.com",
    stages: [
      stage(
        "plan",
        "passed",
        "Three acceptance checks: warn at 80 percent elapsed, fail the command at expiry, and print the remaining time in the existing text output.",
        {
          startedAt: "2026-10-05T09:14:00.000Z",
          completedAt: "2026-10-05T09:18:00.000Z",
          details: ["The issue named the threshold and forbade a new flag. No clarifying question."],
        },
      ),
      stage("create", "passed", "Opened MR !88 on branch 142-session-expiry-warnings with the warning path and a fixture clock.", {
        startedAt: "2026-10-05T09:18:00.000Z",
        completedAt: "2026-10-05T09:31:00.000Z",
        details: ["Clock is injected. Tests do not sleep."],
        artifacts: [{ label: "MR !88", href: `${PROJECT_WEB}/-/merge_requests/88` }],
      }),
      stage("verify", "passed", "Pipeline #4102 passed. 46 tests, 0 failed. New cases cover the warning and the hard expiry.", {
        startedAt: "2026-10-05T09:31:00.000Z",
        completedAt: "2026-10-05T09:36:00.000Z",
        artifacts: [{ label: "Pipeline #4102", href: `${PROJECT_WEB}/-/pipelines/4102` }],
      }),
      stage("package", "passed", "Built registry.gitlab.com/community/keel:0.4.2 from the merge commit.", {
        startedAt: "2026-10-05T09:36:00.000Z",
        completedAt: "2026-10-05T09:40:00.000Z",
        details: ["Image digest sha256:44ab…19c0 pushed to the GitLab registry, then copied for Cloud Run."],
      }),
      stage(
        "secure",
        "passed",
        "Secret detection clean. One low SAST finding was a test fixture key, marked as a false positive and removed from the report.",
        {
          startedAt: "2026-10-05T09:40:00.000Z",
          completedAt: "2026-10-05T09:46:00.000Z",
          security: { found: 1, resolved: 1 },
          details: ["The fixture key never matched a live credential. The analyzer note is on the pipeline."],
        },
      ),
      stage("release", "passed", "Published GitLab Release v0.4.2 with the changelog and a link to MR !88.", {
        startedAt: "2026-10-05T09:46:00.000Z",
        completedAt: "2026-10-05T09:49:00.000Z",
        artifacts: [{ label: "Release v0.4.2", href: `${PROJECT_WEB}/-/releases/v0.4.2` }],
      }),
      stage("configure", "passed", "Production Cloud Run revision keel-00042-k7m is serving all traffic.", {
        startedAt: "2026-10-05T09:49:00.000Z",
        completedAt: "2026-10-05T10:01:00.000Z",
        details: ["Staging took the same image first. Production moved after staging returned 200."],
        artifacts: [{ label: "keel.example.com", href: "https://keel.example.com" }],
      }),
      stage("monitor", "passed", "Smoke check GET /health returned 200 in 84 ms. The verify CLI printed the new warning line.", {
        startedAt: "2026-10-05T10:01:00.000Z",
        completedAt: "2026-10-05T10:03:00.000Z",
        details: ["A second check called verify against the public endpoint with a fixture session at 81 percent elapsed."],
      }),
      stage(
        "govern",
        "passed",
        "Wrote the journey record, the compliance note, and the posts for X, Discord, and Telegram. Human touches: 0.",
        {
          startedAt: "2026-10-05T10:03:00.000Z",
          completedAt: "2026-10-05T10:04:00.000Z",
          details: [
            "Evidence: pipeline #4102 passed, 1 finding resolved, release v0.4.2, smoke 200 in 84 ms.",
            "Announcement drafts are on the release, ready to paste.",
          ],
        },
      ),
    ],
  }),
  journey({
    issueIid: 137,
    title: "Document the verify endpoint for grant reviewers",
    description: "Write docs for the verify endpoint.",
    author: "Samir Haddad",
    labels: ["ship", "docs"],
    webUrl: `${PROJECT_WEB}/-/issues/137`,
    createdAt: "2026-10-02T14:05:00.000Z",
    closedAt: "2026-10-02T20:22:00.000Z",
    state: "closed",
    humanTouches: 1,
    touchNotes: [
      "The issue said only “write docs.” The flow stopped and asked who the page is for. Mina replied: grant reviewers, one screen, no new endpoints. The flow continued with no further questions.",
    ],
    releaseTag: "v0.4.1",
    deployUrl: "https://keel.example.com",
    stages: [
      stage("plan", "passed", "Paused once. The issue did not name an audience, so the flow asked instead of guessing. Mina answered, and the plan locked.", {
        startedAt: "2026-10-02T14:05:00.000Z",
        completedAt: "2026-10-02T18:40:00.000Z",
        details: ["Human reply at 18:36 UTC. Plan locked to a single page for grant reviewers."],
      }),
      stage("create", "passed", "Opened MR !85 with docs/verify.md. No code paths changed.", {
        startedAt: "2026-10-02T18:40:00.000Z",
        completedAt: "2026-10-02T18:52:00.000Z",
        artifacts: [{ label: "MR !85", href: `${PROJECT_WEB}/-/merge_requests/85` }],
      }),
      stage("verify", "passed", "Pipeline #4044 passed. Docs-only change. Existing 44 tests stayed green.", {
        startedAt: "2026-10-02T18:52:00.000Z",
        completedAt: "2026-10-02T18:57:00.000Z",
        artifacts: [{ label: "Pipeline #4044", href: `${PROJECT_WEB}/-/pipelines/4044` }],
      }),
      stage("package", "passed", "Built registry.gitlab.com/community/keel:0.4.1. Image matches main plus the new page.", {
        startedAt: "2026-10-02T18:57:00.000Z",
        completedAt: "2026-10-02T19:02:00.000Z",
      }),
      stage("secure", "passed", "SAST and secret detection reported nothing new.", {
        startedAt: "2026-10-02T19:02:00.000Z",
        completedAt: "2026-10-02T19:08:00.000Z",
        security: { found: 0, resolved: 0 },
      }),
      stage("release", "passed", "Published GitLab Release v0.4.1.", {
        startedAt: "2026-10-02T19:08:00.000Z",
        completedAt: "2026-10-02T19:12:00.000Z",
        artifacts: [{ label: "Release v0.4.1", href: `${PROJECT_WEB}/-/releases/v0.4.1` }],
      }),
      stage("configure", "passed", "Cloud Run revision keel-00039-p2d is serving the page at /docs/verify.", {
        startedAt: "2026-10-02T19:12:00.000Z",
        completedAt: "2026-10-02T20:18:00.000Z",
        artifacts: [{ label: "keel.example.com/docs/verify", href: "https://keel.example.com/docs/verify" }],
      }),
      stage("monitor", "passed", "Smoke check fetched /docs/verify and found the grant-reviewer heading.", {
        startedAt: "2026-10-02T20:18:00.000Z",
        completedAt: "2026-10-02T20:20:00.000Z",
      }),
      stage("govern", "passed", "Compliance note records the single human reply. Posts drafted for the doc release.", {
        startedAt: "2026-10-02T20:20:00.000Z",
        completedAt: "2026-10-02T20:22:00.000Z",
        details: ["Human touches: 1. The reply is quoted on the issue."],
      }),
    ],
  }),
  journey({
    issueIid: 131,
    title: "Rotate the staging signing key",
    description:
      "The staging signing key is past its rotation date. Generate a new key, publish the public half, and delete the old fixture material from the repo. Do not print the private key in the job log.",
    author: "Jules Okonkwo",
    labels: ["ship", "security"],
    webUrl: `${PROJECT_WEB}/-/issues/131`,
    createdAt: "2026-09-28T11:02:00.000Z",
    closedAt: "2026-09-28T12:14:00.000Z",
    state: "closed",
    humanTouches: 0,
    touchNotes: [],
    releaseTag: "v0.4.0",
    deployUrl: "https://keel.example.com",
    stages: [
      stage("plan", "passed", "Rotate staging only. Production key stays. Old fixture material leaves the repo.", {
        startedAt: "2026-09-28T11:02:00.000Z",
        completedAt: "2026-09-28T11:06:00.000Z",
      }),
      stage("create", "passed", "Opened MR !82. The new public key is in the repo. The private half is a CI variable, not a file.", {
        startedAt: "2026-09-28T11:06:00.000Z",
        completedAt: "2026-09-28T11:28:00.000Z",
        artifacts: [{ label: "MR !82", href: `${PROJECT_WEB}/-/merge_requests/82` }],
      }),
      stage("verify", "passed", "Pipeline #3988 passed. Signing tests use the CI variable.", {
        startedAt: "2026-09-28T11:28:00.000Z",
        completedAt: "2026-09-28T11:34:00.000Z",
        artifacts: [{ label: "Pipeline #3988", href: `${PROJECT_WEB}/-/pipelines/3988` }],
      }),
      stage("package", "passed", "Built registry.gitlab.com/community/keel:0.4.0.", {
        startedAt: "2026-09-28T11:34:00.000Z",
        completedAt: "2026-09-28T11:39:00.000Z",
      }),
      stage(
        "secure",
        "passed",
        "Secret detection caught the old key in a fixture. The agent moved the test to a generated key and cleared the finding.",
        {
          startedAt: "2026-09-28T11:39:00.000Z",
          completedAt: "2026-09-28T11:51:00.000Z",
          security: { found: 1, resolved: 1 },
          details: ["Job logs were checked for the private value. None matched."],
        },
      ),
      stage("release", "passed", "Published GitLab Release v0.4.0.", {
        startedAt: "2026-09-28T11:51:00.000Z",
        completedAt: "2026-09-28T11:55:00.000Z",
        artifacts: [{ label: "Release v0.4.0", href: `${PROJECT_WEB}/-/releases/v0.4.0` }],
      }),
      stage("configure", "passed", "Staging Cloud Run picked up the new key. Production was left on the previous key, as planned.", {
        startedAt: "2026-09-28T11:55:00.000Z",
        completedAt: "2026-09-28T12:11:00.000Z",
        artifacts: [{ label: "keel.example.com", href: "https://keel.example.com" }],
      }),
      stage("monitor", "passed", "A signed staging request verified. An old-key request was rejected.", {
        startedAt: "2026-09-28T12:11:00.000Z",
        completedAt: "2026-09-28T12:13:00.000Z",
      }),
      stage("govern", "passed", "Evidence pack notes the rotation window and that the private key never entered the repo.", {
        startedAt: "2026-09-28T12:13:00.000Z",
        completedAt: "2026-09-28T12:14:00.000Z",
        details: ["Human touches: 0."],
      }),
    ],
  }),
  journey({
    issueIid: 126,
    title: "Fail closed when the attestation clock skews",
    description:
      "If the attestation timestamp is more than 120 seconds off, verify currently logs a warning and continues. Fail the check instead. Also stop printing the raw attestation in the log line.",
    author: "Mina Alvarez",
    labels: ["ship", "security"],
    webUrl: `${PROJECT_WEB}/-/issues/126`,
    createdAt: "2026-09-21T08:40:00.000Z",
    closedAt: "2026-09-21T10:08:00.000Z",
    state: "closed",
    humanTouches: 0,
    touchNotes: [],
    releaseTag: "v0.3.9",
    deployUrl: "https://keel.example.com",
    stages: [
      stage("plan", "passed", "Fail closed past 120 seconds of skew. Logs keep a hash, not the raw attestation.", {
        startedAt: "2026-09-21T08:40:00.000Z",
        completedAt: "2026-09-21T08:44:00.000Z",
      }),
      stage("create", "passed", "Opened MR !79. The skew path returns an error. The log line prints the hash only.", {
        startedAt: "2026-09-21T08:44:00.000Z",
        completedAt: "2026-09-21T09:05:00.000Z",
        artifacts: [{ label: "MR !79", href: `${PROJECT_WEB}/-/merge_requests/79` }],
      }),
      stage("verify", "passed", "Pipeline #3901 passed. Cases cover 119 seconds, 121 seconds, and the log assertion.", {
        startedAt: "2026-09-21T09:05:00.000Z",
        completedAt: "2026-09-21T09:11:00.000Z",
        artifacts: [{ label: "Pipeline #3901", href: `${PROJECT_WEB}/-/pipelines/3901` }],
      }),
      stage("package", "passed", "Built registry.gitlab.com/community/keel:0.3.9.", {
        startedAt: "2026-09-21T09:11:00.000Z",
        completedAt: "2026-09-21T09:16:00.000Z",
      }),
      stage("secure", "passed", "Two findings, both patched on the branch: unchecked skew, and the attestation landing in logs.", {
        startedAt: "2026-09-21T09:16:00.000Z",
        completedAt: "2026-09-21T09:34:00.000Z",
        security: { found: 2, resolved: 2 },
      }),
      stage("release", "passed", "Published GitLab Release v0.3.9.", {
        startedAt: "2026-09-21T09:34:00.000Z",
        completedAt: "2026-09-21T09:38:00.000Z",
        artifacts: [{ label: "Release v0.3.9", href: `${PROJECT_WEB}/-/releases/v0.3.9` }],
      }),
      stage("configure", "passed", "Cloud Run revision keel-00031-q8s is serving the fail-closed build.", {
        startedAt: "2026-09-21T09:38:00.000Z",
        completedAt: "2026-09-21T10:05:00.000Z",
        artifacts: [{ label: "keel.example.com", href: "https://keel.example.com" }],
      }),
      stage("monitor", "passed", "A skewed attestation returned an error. A fresh one still verified.", {
        startedAt: "2026-09-21T10:05:00.000Z",
        completedAt: "2026-09-21T10:07:00.000Z",
      }),
      stage("govern", "passed", "Evidence lists both closed findings, the pipeline, the release, and the smoke pair.", {
        startedAt: "2026-09-21T10:07:00.000Z",
        completedAt: "2026-09-21T10:08:00.000Z",
        details: ["Human touches: 0."],
      }),
    ],
  }),
];

function release(input: {
  tag: string;
  title: string;
  releasedAt: string;
  author: string;
  summary: string;
  highlights: string[];
  changelog: ReleaseEntry["changelog"];
  issueIid: number;
  humanTouches: number | null;
}): ReleaseEntry {
  const webUrl = `${PROJECT_WEB}/-/releases/${input.tag}`;
  return {
    ...input,
    deployUrl: "https://keel.example.com",
    webUrl,
    announcements: buildAnnouncements({
      projectName: "keel",
      tag: input.tag,
      summary: input.summary,
      bullets: input.highlights,
      url: webUrl,
      humanTouches: input.humanTouches,
    }),
  };
}

const releases: ReleaseEntry[] = [
  release({
    tag: "v0.4.2",
    title: "Session expiry warnings",
    releasedAt: "2026-10-05T09:49:00.000Z",
    author: "Duo flow",
    summary: "The verify CLI now warns before a session expires, and fails closed when it does.",
    highlights: [
      "Warn when 80 percent of the session time has elapsed",
      "Exit non-zero once the session is expired",
      "Remaining time prints in the existing text output",
    ],
    changelog: [
      { kind: "added", text: "Warn when 80 percent of the session time has elapsed" },
      { kind: "added", text: "Exit non-zero once the session is expired" },
      { kind: "changed", text: "Remaining time prints in the existing text output" },
      { kind: "security", text: "Removed a test fixture key that SAST had flagged" },
    ],
    issueIid: 142,
    humanTouches: 0,
  }),
  release({
    tag: "v0.4.1",
    title: "Verify docs for grant reviewers",
    releasedAt: "2026-10-02T19:12:00.000Z",
    author: "Duo flow",
    summary: "Grant reviewers get a one-page guide to the verify endpoint.",
    highlights: [
      "One screen, no new endpoints",
      "Covers the request, the response, and the error the reviewer will actually see",
    ],
    changelog: [
      { kind: "added", text: "One-page guide at /docs/verify for grant reviewers" },
      { kind: "changed", text: "Docs index links the new page beside the CLI reference" },
    ],
    issueIid: 137,
    humanTouches: 1,
  }),
  release({
    tag: "v0.4.0",
    title: "Staging signing key rotation",
    releasedAt: "2026-09-28T11:55:00.000Z",
    author: "Duo flow",
    summary: "The staging signing key was rotated, and the old fixture key is gone from the repo.",
    highlights: [
      "New staging public key published",
      "Private half stays in a CI variable",
      "Production key was not touched",
    ],
    changelog: [
      { kind: "security", text: "Rotated the staging signing key" },
      { kind: "security", text: "Deleted the old fixture key from the repository" },
      { kind: "changed", text: "Signing tests read the key from CI" },
    ],
    issueIid: 131,
    humanTouches: 0,
  }),
  release({
    tag: "v0.3.9",
    title: "Fail closed on clock skew",
    releasedAt: "2026-09-21T09:38:00.000Z",
    author: "Duo flow",
    summary: "Attestation checks now fail closed when the clock skews, and the token no longer lands in logs.",
    highlights: [
      "Skew beyond 120 seconds is an error",
      "Logs store a hash of the attestation",
    ],
    changelog: [
      { kind: "fixed", text: "Fail the check when attestation skew passes 120 seconds" },
      { kind: "security", text: "Stop writing the raw attestation into logs" },
    ],
    issueIid: 126,
    humanTouches: 0,
  }),
];

export function buildDemoData(): AppData {
  const ordered = sortJourneys(journeys);
  return {
    source: "demo",
    project: {
      name: "keel",
      path: "community/keel",
      description:
        "A small MIT library that checks session receipts for community wallets. Maintained by volunteers. No DevOps hire.",
      webUrl: PROJECT_WEB,
    },
    journeys: ordered,
    releases,
    overview: computeOverview(ordered),
    tallies: stageTallies(ordered),
  };
}
