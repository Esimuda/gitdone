import { PRODUCT_NAME } from "@/config/brand";
import { buildAnnouncements } from "./announcements";
import { computeOverview, sortJourneys, stageTallies } from "./metrics";
import { normalizeStages } from "./stages";
import type { AppData, Journey, ReleaseEntry, StageId, StageRecord, StageStatus } from "./types";

const PROJECT_WEB = "https://gitlab.com/gitdone/gitdone";
const DEPLOY_URL = "https://gitdone.example.com";
const MAINTAINER = "Olabowale Babalola";

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
  return { ...input, stages: normalizeStages(input.stages), provenance: "demo" };
}

const journeys: Journey[] = [
  journey({
    issueIid: 221,
    title: "Block image builds that still contain a token",
    description:
      "The overnight leak is closed, but a later Dockerfile can put a token in a layer again. Fail the image build when a GitLab token pattern survives into the image history.",
    author: MAINTAINER,
    labels: ["ship", "security"],
    webUrl: `${PROJECT_WEB}/-/issues/221`,
    createdAt: "2026-10-09T04:40:00.000Z",
    state: "opened",
    humanTouches: 0,
    touchNotes: [],
    stages: [
      stage("plan", "passed", "Fail the build if a GitLab token pattern is still in the image history after docker build.", {
        startedAt: "2026-10-09T04:40:00.000Z",
        completedAt: "2026-10-09T04:44:00.000Z",
        details: ["The issue names the pattern and the failing job. No question posted."],
      }),
      stage("create", "passed", "Opened MR !48 on branch 221-token-in-image with a history scan after the build.", {
        startedAt: "2026-10-09T04:44:00.000Z",
        completedAt: "2026-10-09T05:02:00.000Z",
        artifacts: [{ label: "MR !48", href: `${PROJECT_WEB}/-/merge_requests/48` }],
      }),
      stage("verify", "passed", "Pipeline #5204 passed. The fixture token fails the new job. A clean image still builds.", {
        startedAt: "2026-10-09T05:02:00.000Z",
        completedAt: "2026-10-09T05:11:00.000Z",
        artifacts: [{ label: "Pipeline #5204", href: `${PROJECT_WEB}/-/pipelines/5204` }],
      }),
      stage(
        "secure",
        "running",
        "Secret detection is clean. SAST flagged the fixture token in the test file. The scan is checking that it never matches a live credential.",
        {
          startedAt: "2026-10-09T05:11:00.000Z",
          security: { found: 1, resolved: 0 },
          details: ["Open: the fixture string is still inside the test, which is what the test is for."],
        },
      ),
    ],
  }),
  journey({
    issueIid: 214,
    title: "A CI token leaked into the production image",
    description:
      "Secret detection on main found a GitLab token in an image layer at 02:14 UTC. Remove it from the build, prove the new image is clean, deploy that revision, and leave the release note ready before morning.",
    author: "Secret Detection",
    labels: ["ship", "security"],
    webUrl: `${PROJECT_WEB}/-/issues/214`,
    createdAt: "2026-10-08T02:14:00.000Z",
    closedAt: "2026-10-08T03:12:00.000Z",
    state: "closed",
    humanTouches: 1,
    touchNotes: ["Olabowale Babalola merged MR !46 at 03:00 UTC. That was the only click."],
    releaseTag: "v0.9.0",
    deployUrl: DEPLOY_URL,
    stages: [
      stage(
        "plan",
        "passed",
        "Drop the build-arg, rebuild from a layer that never saw the token, and fail if the token pattern remains in the image history.",
        {
          startedAt: "2026-10-08T02:14:00.000Z",
          completedAt: "2026-10-08T02:18:00.000Z",
          details: ["The issue already named the token pattern and the image. No question posted."],
        },
      ),
      stage("create", "passed", "Opened MR !46. The token left the Dockerfile. The build reads it from the CI variable at job time only.", {
        startedAt: "2026-10-08T02:18:00.000Z",
        completedAt: "2026-10-08T02:31:00.000Z",
        details: ["No token value is written into a layer or the job log."],
        artifacts: [{ label: "MR !46", href: `${PROJECT_WEB}/-/merge_requests/46` }],
      }),
      stage("verify", "passed", "Pipeline #5188 passed. 64 tests, 0 failed. A history scan of the image found no token pattern.", {
        startedAt: "2026-10-08T02:31:00.000Z",
        completedAt: "2026-10-08T02:48:00.000Z",
        artifacts: [{ label: "Pipeline #5188", href: `${PROJECT_WEB}/-/pipelines/5188` }],
      }),
      stage("package", "passed", "Built registry.gitlab.com/gitdone/gitdone:0.9.0 from the merge commit.", {
        startedAt: "2026-10-08T02:48:00.000Z",
        completedAt: "2026-10-08T02:54:00.000Z",
        details: ["Digest sha256:0c91…e214 recorded on the pipeline."],
      }),
      stage("secure", "passed", "The leaked-token finding is resolved. Secret detection on the new image is clean.", {
        startedAt: "2026-10-08T02:54:00.000Z",
        completedAt: "2026-10-08T02:58:00.000Z",
        security: { found: 1, resolved: 1 },
        details: ["The old layer is not in the new digest. The job log was scanned for the token prefix."],
        artifacts: [{ label: "Secret detection", href: `${PROJECT_WEB}/-/pipelines/5188/security` }],
      }),
      stage("approval", "passed", "Olabowale Babalola merged MR !46 at 03:00 UTC.", {
        startedAt: "2026-10-08T02:58:00.000Z",
        completedAt: "2026-10-08T03:00:00.000Z",
        details: [
          "The agents posted Ready to merge and stopped.",
          "One click. Nobody else touched the change.",
        ],
        artifacts: [{ label: "MR !46", href: `${PROJECT_WEB}/-/merge_requests/46` }],
      }),
      stage("release", "passed", "Published GitLab Release v0.9.0 with the security note and a link to MR !46.", {
        startedAt: "2026-10-08T03:00:00.000Z",
        completedAt: "2026-10-08T03:02:00.000Z",
        artifacts: [{ label: "Release v0.9.0", href: `${PROJECT_WEB}/-/releases/v0.9.0` }],
      }),
      stage("configure", "passed", "Production Cloud Run revision gitdone-00061-c2a is serving all traffic.", {
        startedAt: "2026-10-08T03:02:00.000Z",
        completedAt: "2026-10-08T03:06:00.000Z",
        artifacts: [{ label: "gitdone.example.com", href: DEPLOY_URL }],
      }),
      stage("monitor", "passed", "Watched production for 5 minutes. Health stayed 200. The 5xx rate stayed under 2%.", {
        startedAt: "2026-10-08T03:06:00.000Z",
        completedAt: "2026-10-08T03:11:00.000Z",
        details: ["10 health samples, 0 failures. Worst error rate 0.000."],
      }),
      stage(
        "govern",
        "passed",
        "Wrote the journey record and the morning posts for X, Discord, and Telegram. Human touches: 1, the merge click.",
        {
          startedAt: "2026-10-08T03:11:00.000Z",
          completedAt: "2026-10-08T03:12:00.000Z",
          details: [
            "Evidence: pipeline #5188 passed, 1 finding resolved, release v0.9.0, guard held.",
            "The posts were ready at 03:12 UTC, before morning.",
          ],
        },
      ),
    ],
  }),
  journey({
    issueIid: 207,
    title: "Health probe deploy raised the error rate",
    description:
      "A tighter readiness probe shipped, then production started returning 503. The rollback guard watches health and the 5xx rate for five minutes and sends traffic back if either degrades.",
    author: MAINTAINER,
    labels: ["ship"],
    webUrl: `${PROJECT_WEB}/-/issues/207`,
    createdAt: "2026-10-06T18:10:00.000Z",
    state: "opened",
    humanTouches: 0,
    touchNotes: [],
    deployUrl: DEPLOY_URL,
    stages: [
      stage("plan", "passed", "Tighten the readiness probe so Cloud Run stops sending traffic before the app is listening.", {
        startedAt: "2026-10-06T18:10:00.000Z",
        completedAt: "2026-10-06T18:14:00.000Z",
      }),
      stage("create", "passed", "Opened MR !44. The probe now hits /api/health and waits for status ok.", {
        startedAt: "2026-10-06T18:14:00.000Z",
        completedAt: "2026-10-06T18:26:00.000Z",
        artifacts: [{ label: "MR !44", href: `${PROJECT_WEB}/-/merge_requests/44` }],
      }),
      stage("verify", "passed", "Pipeline #5110 passed. The probe test covers a slow boot and a ready boot.", {
        startedAt: "2026-10-06T18:26:00.000Z",
        completedAt: "2026-10-06T18:33:00.000Z",
        artifacts: [{ label: "Pipeline #5110", href: `${PROJECT_WEB}/-/pipelines/5110` }],
      }),
      stage("package", "passed", "Built registry.gitlab.com/gitdone/gitdone:207-rc1.", {
        startedAt: "2026-10-06T18:33:00.000Z",
        completedAt: "2026-10-06T18:37:00.000Z",
      }),
      stage("secure", "passed", "SAST and secret detection reported nothing new.", {
        startedAt: "2026-10-06T18:37:00.000Z",
        completedAt: "2026-10-06T18:41:00.000Z",
        security: { found: 0, resolved: 0 },
      }),
      stage("release", "passed", "Published GitLab Release v0.8.4. The guard had not watched production yet.", {
        startedAt: "2026-10-06T18:41:00.000Z",
        completedAt: "2026-10-06T18:43:00.000Z",
        artifacts: [{ label: "Release v0.8.4", href: `${PROJECT_WEB}/-/releases/v0.8.4` }],
      }),
      stage("configure", "passed", "Production moved to revision gitdone-00058-ab1.", {
        startedAt: "2026-10-06T18:43:00.000Z",
        completedAt: "2026-10-06T18:44:00.000Z",
        artifacts: [{ label: "gitdone.example.com", href: DEPLOY_URL }],
      }),
      stage(
        "monitor",
        "attention",
        "Watched production for 5 minutes. Four health checks returned 503. The 5xx rate reached 6.4%, above the 2% guard.",
        {
          startedAt: "2026-10-06T18:44:00.000Z",
          completedAt: "2026-10-06T18:49:00.000Z",
          details: ["10 samples. 6 healthy, then 4 failures. Worst error rate 0.064. Guard 0.02."],
        },
      ),
      stage(
        "rollback",
        "passed",
        "Shifted 100% of traffic from gitdone-00058-ab1 back to gitdone-00057-c4e and reopened the issue with the probe log.",
        {
          startedAt: "2026-10-06T18:49:00.000Z",
          completedAt: "2026-10-06T18:50:00.000Z",
          details: [
            "Previous revision gitdone-00057-c4e is serving again.",
            "Health on that revision returned 200 after the shift.",
            "The issue is open. Govern did not announce the bad revision.",
          ],
          artifacts: [{ label: "Pipeline #5112", href: `${PROJECT_WEB}/-/pipelines/5112` }],
        },
      ),
    ],
  }),
  journey({
    issueIid: 198,
    title: "Say who the release note is for",
    description: "Fix the release notes.",
    author: MAINTAINER,
    labels: ["ship", "docs"],
    webUrl: `${PROJECT_WEB}/-/issues/198`,
    createdAt: "2026-10-01T09:00:00.000Z",
    closedAt: "2026-10-01T10:31:00.000Z",
    state: "closed",
    humanTouches: 1,
    touchNotes: [
      "The issue said only “fix the release notes.” The flow asked who they are for. Olabowale replied: maintainers who were asleep, one paragraph, no marketing. The flow continued with no further questions.",
    ],
    releaseTag: "v0.8.2",
    deployUrl: DEPLOY_URL,
    stages: [
      stage("plan", "passed", "Paused once. The issue did not name a reader, so the flow asked instead of guessing.", {
        startedAt: "2026-10-01T09:00:00.000Z",
        completedAt: "2026-10-01T09:40:00.000Z",
        details: ["Human reply at 09:36 UTC. The note is one paragraph for the maintainer who wakes up to it."],
      }),
      stage("create", "passed", "Opened MR !41 with the shorter release-note template. No runtime code changed.", {
        startedAt: "2026-10-01T09:40:00.000Z",
        completedAt: "2026-10-01T09:55:00.000Z",
        artifacts: [{ label: "MR !41", href: `${PROJECT_WEB}/-/merge_requests/41` }],
      }),
      stage("verify", "passed", "Pipeline #5020 passed. Docs-only change.", {
        startedAt: "2026-10-01T09:55:00.000Z",
        completedAt: "2026-10-01T10:02:00.000Z",
        artifacts: [{ label: "Pipeline #5020", href: `${PROJECT_WEB}/-/pipelines/5020` }],
      }),
      stage("package", "passed", "Built registry.gitlab.com/gitdone/gitdone:0.8.2.", {
        startedAt: "2026-10-01T10:02:00.000Z",
        completedAt: "2026-10-01T10:08:00.000Z",
      }),
      stage("secure", "passed", "SAST and secret detection reported nothing new.", {
        startedAt: "2026-10-01T10:08:00.000Z",
        completedAt: "2026-10-01T10:14:00.000Z",
        security: { found: 0, resolved: 0 },
      }),
      stage("release", "passed", "Published GitLab Release v0.8.2.", {
        startedAt: "2026-10-01T10:14:00.000Z",
        completedAt: "2026-10-01T10:18:00.000Z",
        artifacts: [{ label: "Release v0.8.2", href: `${PROJECT_WEB}/-/releases/v0.8.2` }],
      }),
      stage("configure", "passed", "Cloud Run revision gitdone-00055-k1d is serving the page.", {
        startedAt: "2026-10-01T10:18:00.000Z",
        completedAt: "2026-10-01T10:29:00.000Z",
        artifacts: [{ label: "gitdone.example.com", href: DEPLOY_URL }],
      }),
      stage("monitor", "passed", "Health stayed 200 through the five-minute window.", {
        startedAt: "2026-10-01T10:29:00.000Z",
        completedAt: "2026-10-01T10:34:00.000Z",
      }),
      stage("govern", "passed", "Compliance note records the single human reply. The release note is one paragraph.", {
        startedAt: "2026-10-01T10:34:00.000Z",
        completedAt: "2026-10-01T10:36:00.000Z",
        details: ["Human touches: 1. The reply is quoted on the issue."],
      }),
    ],
  }),
  journey({
    issueIid: 176,
    title: "Publish the health check the rollback guard calls",
    description:
      "Cloud Run and the rollback guard both need one URL. Add GET /api/health and return status ok when the process is serving.",
    author: MAINTAINER,
    labels: ["ship"],
    webUrl: `${PROJECT_WEB}/-/issues/176`,
    createdAt: "2026-09-18T14:00:00.000Z",
    closedAt: "2026-09-18T16:02:00.000Z",
    state: "closed",
    humanTouches: 0,
    touchNotes: [],
    releaseTag: "v0.8.0",
    deployUrl: DEPLOY_URL,
    stages: [
      stage("plan", "passed", "GET /api/health returns JSON status ok. That is the only contract the guard needs.", {
        startedAt: "2026-09-18T14:00:00.000Z",
        completedAt: "2026-09-18T14:06:00.000Z",
      }),
      stage("create", "passed", "Opened MR !36 with the route and a test.", {
        startedAt: "2026-09-18T14:06:00.000Z",
        completedAt: "2026-09-18T14:28:00.000Z",
        artifacts: [{ label: "MR !36", href: `${PROJECT_WEB}/-/merge_requests/36` }],
      }),
      stage("verify", "passed", "Pipeline #4881 passed. The route test expects status ok.", {
        startedAt: "2026-09-18T14:28:00.000Z",
        completedAt: "2026-09-18T14:36:00.000Z",
        artifacts: [{ label: "Pipeline #4881", href: `${PROJECT_WEB}/-/pipelines/4881` }],
      }),
      stage("package", "passed", "Built registry.gitlab.com/gitdone/gitdone:0.8.0.", {
        startedAt: "2026-09-18T14:36:00.000Z",
        completedAt: "2026-09-18T14:44:00.000Z",
      }),
      stage("secure", "passed", "SAST and secret detection reported nothing new.", {
        startedAt: "2026-09-18T14:44:00.000Z",
        completedAt: "2026-09-18T14:55:00.000Z",
        security: { found: 0, resolved: 0 },
      }),
      stage("release", "passed", "Published GitLab Release v0.8.0.", {
        startedAt: "2026-09-18T14:55:00.000Z",
        completedAt: "2026-09-18T15:02:00.000Z",
        artifacts: [{ label: "Release v0.8.0", href: `${PROJECT_WEB}/-/releases/v0.8.0` }],
      }),
      stage("configure", "passed", "Cloud Run revision gitdone-00040-m9p is serving /api/health.", {
        startedAt: "2026-09-18T15:02:00.000Z",
        completedAt: "2026-09-18T15:58:00.000Z",
        artifacts: [{ label: "gitdone.example.com", href: DEPLOY_URL }],
      }),
      stage("monitor", "passed", "GET /api/health returned 200 and status ok.", {
        startedAt: "2026-09-18T15:58:00.000Z",
        completedAt: "2026-09-18T16:00:00.000Z",
      }),
      stage("govern", "passed", "Evidence lists the route, the pipeline, and the release. Human touches: 0.", {
        startedAt: "2026-09-18T16:00:00.000Z",
        completedAt: "2026-09-18T16:02:00.000Z",
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
    deployUrl: DEPLOY_URL,
    webUrl,
    announcements: buildAnnouncements({
      projectName: PRODUCT_NAME,
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
    tag: "v0.9.0",
    title: "Token removed from the production image",
    releasedAt: "2026-10-08T03:02:00.000Z",
    author: "Duo flow",
    summary: "A CI token that had leaked into the production image is gone. The new digest does not contain it.",
    highlights: [
      "The token is no longer a Docker build-arg",
      "The image history is scanned before the digest is published",
      "Production is on revision gitdone-00061-c2a",
    ],
    changelog: [
      { kind: "security", text: "Removed a CI token from the production image" },
      { kind: "added", text: "Fail the image build when a token pattern remains in the history" },
      { kind: "changed", text: "The token is read from a CI variable at job time only" },
    ],
    issueIid: 214,
    humanTouches: 1,
  }),
  release({
    tag: "v0.8.2",
    title: "Release notes for the person who wakes up",
    releasedAt: "2026-10-01T10:18:00.000Z",
    author: "Duo flow",
    summary: "Release notes are one paragraph, written for the maintainer who was asleep.",
    highlights: ["One paragraph", "No marketing voice"],
    changelog: [
      { kind: "changed", text: "Release notes address the maintainer who wakes up to them" },
      { kind: "changed", text: "Dropped the marketing lines from the template" },
    ],
    issueIid: 198,
    humanTouches: 1,
  }),
  release({
    tag: "v0.8.0",
    title: "Health check",
    releasedAt: "2026-09-18T15:02:00.000Z",
    author: "Duo flow",
    summary: "GET /api/health returns status ok. The rollback guard and Cloud Run both call it.",
    highlights: ["GET /api/health", "JSON status ok"],
    changelog: [
      { kind: "added", text: "GET /api/health returns status ok" },
      { kind: "added", text: "Cloud Run readiness uses the same URL" },
    ],
    issueIid: 176,
    humanTouches: 0,
  }),
];

export function buildDemoData(): AppData {
  const ordered = sortJourneys(journeys);
  return {
    source: "demo",
    project: {
      name: PRODUCT_NAME,
      path: "gitdone/gitdone",
      description: "This repository. Sample journeys show GitDone shipping itself until GitLab has real journey notes.",
      webUrl: PROJECT_WEB,
    },
    journeys: ordered,
    releases,
    overview: computeOverview(ordered),
    tallies: stageTallies(ordered),
  };
}
