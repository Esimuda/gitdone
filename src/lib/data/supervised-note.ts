import { serializeJourneyNote } from "./parse-journey";
import { normalizeStages } from "./stages";
import type { JourneyArtifact, StageRecord } from "./types";

export type MergeApproval = {
  name: string;
  at: string;
  mrIid: number;
  mrUrl: string;
};

export function approvalStage(input: MergeApproval): StageRecord {
  return {
    stage: "approval",
    status: "passed",
    startedAt: input.at,
    completedAt: input.at,
    summary: `${input.name} merged MR !${input.mrIid}.`,
    details: ["The agents posted Ready to merge and stopped.", "One click."],
    artifacts: [{ label: `MR !${input.mrIid}`, href: input.mrUrl }],
  };
}

export function touchLine(input: MergeApproval): string {
  return `${input.name} merged MR !${input.mrIid} at ${input.at}. That was the only click.`;
}

/** Fold the human merge into the newest journey note. humanTouches becomes at least 1. */
export function recordApproval(existing: JourneyArtifact, approval: MergeApproval, releaseTag?: string): JourneyArtifact {
  const stages = existing.stages.filter((stage) => stage.stage !== "approval");
  stages.push(approvalStage(approval));
  if (releaseTag) {
    const release = stages.find((stage) => stage.stage === "release");
    if (release && release.status !== "passed") {
      release.status = "passed";
      release.completedAt = approval.at;
      release.summary = `GitLab Release ${releaseTag} published by the pipeline.`;
    }
  }
  const line = touchLine(approval);
  const touches = existing.humanTouches === null ? 1 : Math.max(1, existing.humanTouches);
  return {
    ...existing,
    humanTouches: touches,
    touchNotes: existing.touchNotes.includes(line) ? existing.touchNotes : [...existing.touchNotes, line],
    releaseTag: releaseTag ?? existing.releaseTag,
    stages: normalizeStages(stages),
  };
}

export function approvalNote(existing: JourneyArtifact, approval: MergeApproval, releaseTag?: string): string {
  return serializeJourneyNote(recordApproval(existing, approval, releaseTag));
}

export function readyToMergeText(input: { issueIid: number; mrIid: number; mrUrl: string; summary: string }): string {
  return [
    `Ready to merge MR !${input.mrIid}.`,
    "",
    input.summary.trim(),
    "",
    "The agents have stopped. The next step is one click: Merge.",
    input.mrUrl,
    "",
    `Issue #${input.issueIid}. After the merge, the pipeline on the default branch publishes the release and records who clicked.`,
  ].join("\n");
}
