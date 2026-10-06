import { STAGE_IDS, type StageId, type StageRecord, type StageStatus } from "./types";

export const STAGE_LABEL: Record<StageId, string> = {
  plan: "Plan",
  create: "Create",
  verify: "Verify",
  package: "Package",
  secure: "Secure",
  release: "Release",
  configure: "Configure",
  monitor: "Monitor",
  govern: "Govern",
};

export const STAGE_BLURB: Record<StageId, string> = {
  plan: "Acceptance criteria from the issue",
  create: "Branch, commits, and merge request",
  verify: "Tests on the pipeline",
  package: "Container image",
  secure: "Findings triaged and fixed",
  release: "GitLab Release and changelog",
  configure: "Deploy to Cloud Run",
  monitor: "Smoke check against the live URL",
  govern: "Evidence and the community post",
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

export function normalizeStages(input: StageRecord[]): StageRecord[] {
  const byId = new Map<StageId, StageRecord>();
  for (const stage of input) {
    if (STAGE_IDS.includes(stage.stage)) byId.set(stage.stage, stage);
  }
  return STAGE_IDS.map((id) => byId.get(id) ?? emptyStage(id));
}

export function stageById(stages: StageRecord[], id: StageId): StageRecord | undefined {
  return stages.find((stage) => stage.stage === id);
}
