import {
  APPROVAL_STAGE,
  ARTIFACT_STAGE_IDS,
  ROLLBACK_STAGE,
  STAGE_IDS,
  type StageId,
  type StageRecord,
  type StageStatus,
} from "./types";

export const STAGE_LABEL: Record<StageId, string> = {
  plan: "Plan",
  create: "Create",
  verify: "Verify",
  package: "Package",
  secure: "Secure",
  approval: "Approval",
  release: "Release",
  configure: "Configure",
  monitor: "Monitor",
  govern: "Govern",
  rollback: "Rollback",
};

export const STAGE_BLURB: Record<StageId, string> = {
  plan: "Acceptance criteria from the issue",
  create: "Branch, commits, and merge request",
  verify: "Tests on the pipeline",
  package: "Container image",
  secure: "Findings triaged and fixed",
  approval: "One click to merge",
  release: "GitLab Release and changelog",
  configure: "Deploy to Cloud Run",
  monitor: "Health and error rate after the deploy",
  govern: "Evidence and the morning post",
  rollback: "Shift traffic back, then reopen the issue",
};

export function emptyStage(stage: StageId, status: StageStatus = "pending"): StageRecord {
  return {
    stage,
    status,
    summary: "",
    details: [],
    artifacts: [],
  };
}

const ARTIFACT_STAGE_SET = new Set<string>(ARTIFACT_STAGE_IDS);

export function normalizeStages(input: StageRecord[]): StageRecord[] {
  const byId = new Map<StageId, StageRecord>();
  for (const stage of input) {
    if (ARTIFACT_STAGE_SET.has(stage.stage)) byId.set(stage.stage, stage);
  }
  const core = STAGE_IDS.map((id) => byId.get(id) ?? emptyStage(id));
  const approval = byId.get(APPROVAL_STAGE);
  if (approval) {
    const secureAt = core.findIndex((stage) => stage.stage === "secure");
    core.splice(secureAt + 1, 0, approval);
  }
  const rollback = byId.get(ROLLBACK_STAGE);
  if (rollback) {
    const monitorAt = core.findIndex((stage) => stage.stage === "monitor");
    core.splice(monitorAt + 1, 0, rollback);
  }
  return core;
}

export function stageById(stages: StageRecord[], id: StageId): StageRecord | undefined {
  return stages.find((stage) => stage.stage === id);
}
