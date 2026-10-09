import { z } from "zod";
import { normalizeStages } from "./stages";
import { ARTIFACT_STAGE_IDS, type JourneyArtifact, type StageRecord } from "./types";

const stageSchema = z.object({
  stage: z.enum(ARTIFACT_STAGE_IDS),
  status: z.enum(["pending", "running", "passed", "attention"]),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  summary: z.string().optional().default(""),
  details: z.array(z.string()).optional().default([]),
  artifacts: z
    .array(z.object({ label: z.string(), href: z.string() }))
    .optional()
    .default([]),
  security: z
    .object({
      found: z.number().int().nonnegative(),
      resolved: z.number().int().nonnegative(),
    })
    .optional(),
});

const artifactSchema = z.object({
  version: z.literal(1),
  issueIid: z.number().int().positive(),
  humanTouches: z.number().int().nonnegative().nullable().optional(),
  touchNotes: z.array(z.string()).optional().default([]),
  releaseTag: z.string().min(1).optional(),
  deployUrl: z.string().min(1).optional(),
  stages: z.array(stageSchema).min(1),
});

const NOTE_PATTERN = /<!--\s*journey:v1\s*([\s\S]*?)\s*-->/g;

export function parseJourneyArtifact(raw: string): JourneyArtifact | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = artifactSchema.safeParse(json);
  if (!parsed.success) return null;
  const stages: StageRecord[] = parsed.data.stages.map((stage) => ({
    stage: stage.stage,
    status: stage.status,
    startedAt: stage.startedAt,
    completedAt: stage.completedAt,
    summary: stage.summary,
    details: stage.details,
    artifacts: stage.artifacts,
    security: stage.security,
  }));
  return {
    version: 1,
    issueIid: parsed.data.issueIid,
    humanTouches: parsed.data.humanTouches ?? null,
    touchNotes: parsed.data.touchNotes,
    releaseTag: parsed.data.releaseTag,
    deployUrl: parsed.data.deployUrl,
    stages: normalizeStages(stages),
  };
}

export function serializeJourneyNote(artifact: JourneyArtifact): string {
  return `<!-- journey:v1\n${JSON.stringify(artifact, null, 2)}\n-->`;
}

/** Notes must be newest-first. The first valid artifact wins. */
export function readLatestJourney(notes: { body: string }[]): JourneyArtifact | null {
  for (const note of notes) {
    const matches = [...note.body.matchAll(NOTE_PATTERN)];
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const artifact = parseJourneyArtifact(matches[index][1] ?? "");
      if (artifact) return artifact;
    }
  }
  return null;
}

export function toArtifact(input: {
  issueIid: number;
  humanTouches: number | null;
  touchNotes: string[];
  releaseTag?: string;
  deployUrl?: string;
  stages: StageRecord[];
}): JourneyArtifact {
  return {
    version: 1,
    issueIid: input.issueIid,
    humanTouches: input.humanTouches,
    touchNotes: input.touchNotes,
    releaseTag: input.releaseTag,
    deployUrl: input.deployUrl,
    stages: normalizeStages(input.stages),
  };
}
