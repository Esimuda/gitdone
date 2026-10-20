import { minutesBetween } from "../format";
import { STAGE_IDS } from "./types";
import { stageById } from "./stages";
import type { Journey, Overview, StageId, StageTally } from "./types";

/**
 * Shipped means Cloud Run is serving the change, or a person merged it (approval)
 * and the GitLab Release exists. The second case covers journeys recorded before the
 * deploy stages wrote their own notes.
 */
export function isShipped(journey: Journey): boolean {
  if (stageById(journey.stages, "configure")?.status === "passed") return true;
  return (
    stageById(journey.stages, "approval")?.status === "passed" &&
    stageById(journey.stages, "release")?.status === "passed"
  );
}

/** A rollback stage that actually ran. A missing stage means the guard held. */
export function didRollback(journey: Journey): boolean {
  const record = stageById(journey.stages, "rollback");
  return record?.status === "passed" || record?.status === "running" || record?.status === "attention";
}

export function journeyState(journey: Journey): "Rolled back" | "Shipped" | "In flight" | "Waiting" {
  if (didRollback(journey)) return "Rolled back";
  if (isShipped(journey)) return "Shipped";
  if (isInFlight(journey)) return "In flight";
  return "Waiting";
}

export function isInFlight(journey: Journey): boolean {
  if (isShipped(journey)) return false;
  return journey.stages.some(
    (stage) => stage.status === "running" || stage.status === "passed" || stage.status === "attention",
  );
}

/**
 * When a shipped journey reached production: the GitLab Release publish time, or the
 * Cloud Run deploy time for journeys recorded without a release timestamp.
 */
export function shippedAt(journey: Journey): string | undefined {
  if (!isShipped(journey)) return undefined;
  const release = stageById(journey.stages, "release");
  if (release?.status === "passed" && release.completedAt) return release.completedAt;
  const configure = stageById(journey.stages, "configure");
  if (configure?.status === "passed" && configure.completedAt) return configure.completedAt;
  return undefined;
}

/** Issue created to release published, in minutes. Null until the journey ships. */
export function leadTimeMinutes(journey: Journey): number | null {
  const end = shippedAt(journey);
  if (!end) return null;
  return minutesBetween(journey.createdAt, end);
}

export type JourneyTimes = {
  found: string;
  patched?: string;
  checked?: string;
  deployed?: string;
  announced?: string;
};

/** Timestamps for the hero timeline. Deploy and announce fall back to the release time once shipped. */
export function journeyTimes(journey: Journey): JourneyTimes {
  const shipped = shippedAt(journey);
  const create = stageById(journey.stages, "create");
  const verify = stageById(journey.stages, "verify");
  const configure = stageById(journey.stages, "configure");
  const govern = stageById(journey.stages, "govern");
  return {
    found: journey.createdAt,
    patched: create?.completedAt ?? create?.startedAt,
    checked: verify?.completedAt,
    deployed: configure?.completedAt ?? shipped,
    announced: govern?.completedAt ?? shipped,
  };
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return sorted[mid];
}

export function stageTallies(journeys: Journey[]): StageTally[] {
  return STAGE_IDS.map((stage) => {
    let passed = 0;
    let running = 0;
    let attention = 0;
    for (const journey of journeys) {
      const record = stageById(journey.stages, stage);
      if (record?.status === "passed") passed += 1;
      if (record?.status === "running") running += 1;
      if (record?.status === "attention") attention += 1;
    }
    return { stage, passed, running, attention };
  });
}

export function coveredStages(journeys: Journey[]): StageId[] {
  return stageTallies(journeys)
    .filter((tally) => tally.passed > 0)
    .map((tally) => tally.stage);
}

export function computeOverview(journeys: Journey[]): Overview {
  const leadTimes = journeys
    .map(leadTimeMinutes)
    .filter((value): value is number => value !== null);
  const touchValues = journeys
    .map((journey) => journey.humanTouches)
    .filter((value): value is number => value !== null);
  let findingsResolved = 0;
  let findingsOpen = 0;
  for (const journey of journeys) {
    for (const stage of journey.stages) {
      if (!stage.security) continue;
      findingsResolved += stage.security.resolved;
      findingsOpen += Math.max(0, stage.security.found - stage.security.resolved);
    }
  }
  const shippedJourneys = journeys.filter(isShipped);
  const withTouchData = shippedJourneys.filter((journey) => journey.humanTouches !== null);
  const quietShips = withTouchData.filter((journey) => journey.humanTouches === 0 && !didRollback(journey));
  const oneClick = withTouchData.filter(
    (journey) => journey.humanTouches !== null && journey.humanTouches <= 1 && !didRollback(journey),
  );
  return {
    leadTimeMinutes: median(leadTimes),
    leadTimeSample: leadTimes.length,
    humanInterventions: touchValues.length ? touchValues.reduce((sum, value) => sum + value, 0) : null,
    humanSample: touchValues.length,
    stageCoverage: coveredStages(journeys).length,
    stageCount: STAGE_IDS.length,
    findingsResolved,
    findingsOpen,
    shipped: shippedJourneys.length,
    inFlight: journeys.filter(isInFlight).length,
    zeroTouchShips: quietShips.length,
    oneClickShips: oneClick.length,
    shipsWithTouchData: withTouchData.length,
    rollbacks: journeys.filter(didRollback).length,
  };
}

export type LeadSeriesPoint = { label: string; minutes: number; completed: string };

/** Lead time per shipped journey, oldest to newest by parsed time. Unparseable times go last. */
export function leadTimeSeries(journeys: Journey[]): LeadSeriesPoint[] {
  const points: LeadSeriesPoint[] = [];
  for (const journey of journeys) {
    const minutes = leadTimeMinutes(journey);
    if (minutes === null) continue;
    points.push({
      label: journey.releaseTag ?? `#${journey.issueIid}`,
      minutes,
      completed: shippedAt(journey) ?? journey.createdAt,
    });
  }
  const time = (point: LeadSeriesPoint) => {
    const value = Date.parse(point.completed);
    return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
  };
  return points.sort((a, b) => {
    const left = time(a);
    const right = time(b);
    if (left === right) return 0;
    return left < right ? -1 : 1;
  });
}

function runningIndex(journey: Journey): number {
  return journey.stages.findIndex((stage) => stage.status === "running");
}

export function sortJourneys(journeys: Journey[]): Journey[] {
  function rank(journey: Journey): number {
    if (runningIndex(journey) >= 0) return 0;
    if (isInFlight(journey)) return 1;
    return 2;
  }
  return [...journeys].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    const byProgress = runningIndex(b) - runningIndex(a);
    if (byProgress !== 0) return byProgress;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Latest shipped journey that recorded the one merge click. A rollback is not the flagship. */
export function flagshipJourney(journeys: Journey[]): Journey | undefined {
  const shipped = journeys.filter((journey) => isShipped(journey) && !didRollback(journey));
  const approved = shipped.filter((journey) => stageById(journey.stages, "approval")?.status === "passed");
  const pool = approved.length > 0 ? approved : shipped;
  return [...pool].sort((a, b) => {
    const aTime = shippedAt(a) ?? a.createdAt;
    const bTime = shippedAt(b) ?? b.createdAt;
    return bTime.localeCompare(aTime);
  })[0];
}

export function spotlightJourney(journeys: Journey[]): Journey | undefined {
  const live = [...journeys]
    .filter((journey) => runningIndex(journey) >= 0)
    .sort((a, b) => runningIndex(b) - runningIndex(a));
  return live[0] ?? flagshipJourney(journeys) ?? journeys[0];
}

export function currentStage(journey: Journey) {
  const running = journey.stages.find((stage) => stage.status === "running");
  if (running) return running;
  if (didRollback(journey)) return stageById(journey.stages, "rollback") ?? journey.stages[0];
  return (
    journey.stages.find((stage) => stage.status === "attention") ??
    [...journey.stages].reverse().find((stage) => stage.status === "passed") ??
    journey.stages[0]
  );
}
