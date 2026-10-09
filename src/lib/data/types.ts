export const STAGE_IDS = [
  "plan",
  "create",
  "verify",
  "package",
  "secure",
  "release",
  "configure",
  "monitor",
  "govern",
] as const;

/** Present only when a production deploy was sent back to the previous revision. */
export const ROLLBACK_STAGE = "rollback" as const;

export const ARTIFACT_STAGE_IDS = [...STAGE_IDS, ROLLBACK_STAGE] as const;

export type StageId = (typeof ARTIFACT_STAGE_IDS)[number];

export type StageStatus = "pending" | "running" | "passed" | "attention";

export type ArtifactLink = {
  label: string;
  href: string;
};

export type SecurityCounts = {
  found: number;
  resolved: number;
};

export type StageRecord = {
  stage: StageId;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  summary: string;
  details: string[];
  artifacts: ArtifactLink[];
  security?: SecurityCounts;
};

/** JSON the Duo flow writes inside an issue note. Version 1. */
export type JourneyArtifact = {
  version: 1;
  issueIid: number;
  humanTouches: number | null;
  touchNotes: string[];
  releaseTag?: string;
  deployUrl?: string;
  stages: StageRecord[];
};

export type Journey = {
  issueIid: number;
  title: string;
  description: string;
  author: string;
  labels: string[];
  webUrl: string;
  createdAt: string;
  closedAt?: string;
  state: "opened" | "closed";
  humanTouches: number | null;
  touchNotes: string[];
  stages: StageRecord[];
  releaseTag?: string;
  deployUrl?: string;
  provenance: "artifact" | "inferred" | "demo";
};

export type ChangelogKind = "added" | "fixed" | "changed" | "security";

export type Announcements = {
  x: string;
  discord: string;
  telegram: string;
};

export type ReleaseEntry = {
  tag: string;
  title: string;
  releasedAt: string;
  author: string;
  summary: string;
  highlights: string[];
  changelog: { kind: ChangelogKind; text: string }[];
  issueIid?: number;
  deployUrl?: string;
  webUrl: string;
  humanTouches: number | null;
  announcements: Announcements;
};

export type ProjectInfo = {
  name: string;
  path: string;
  description: string;
  webUrl: string;
};

export type Overview = {
  leadTimeMinutes: number | null;
  leadTimeSample: number;
  humanInterventions: number | null;
  humanSample: number;
  stageCoverage: number;
  stageCount: number;
  findingsResolved: number;
  findingsOpen: number;
  shipped: number;
  inFlight: number;
  zeroTouchShips: number;
  shipsWithTouchData: number;
  rollbacks: number;
};

export type StageTally = {
  stage: StageId;
  passed: number;
  running: number;
  attention: number;
};

export type AppData = {
  source: "demo" | "gitlab";
  project: ProjectInfo;
  journeys: Journey[];
  releases: ReleaseEntry[];
  overview: Overview;
  tallies: StageTally[];
  warning?: string;
};

export type DataResult = AppData | { source: "error"; message: string };
