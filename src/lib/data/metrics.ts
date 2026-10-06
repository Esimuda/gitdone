import { minutesBetween } from "../format";
import { STAGE_IDS } from "./types";
import { stageById } from "./stages";
import type { Journey, Overview, StageId, StageTally } from "./types";

export function isShipped(journey: Journey): boolean {
  return stageById(journey.stages, "configure")?.status === "passed";
}

export function isInFlight(journey: Journey): boolean {
  if (isShipped(journey)) return false;
  return journey.stages.some(
    (stage) => stage.status === "running" || stage.status === "passed" || stage.status === "attention",
  );
}

export function leadTimeMinutes(journey: Journey): number | null {
  const configure = stageById(journey.stages, "configure");
  if (configure?.status !== "passed" || !configure.completedAt) return null;
  return minutesBetween(journey.createdAt, configure.completedAt);
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
    zeroTouchShips: withTouchData.filter((journey) => journey.humanTouches === 0).length,
    shipsWithTouchData: withTouchData.length,
  };
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

/** Most recent shipped journey that recorded zero human touches, else the latest ship. */
export function flagshipJourney(journeys: Journey[]): Journey | undefined {
  const shipped = journeys.filter(isShipped);
  const zero = shipped.filter((journey) => journey.humanTouches === 0);
  const pool = zero.length > 0 ? zero : shipped;
  return [...pool].sort((a, b) => {
    const aTime = stageById(a.stages, "configure")?.completedAt ?? a.createdAt;
    const bTime = stageById(b.stages, "configure")?.completedAt ?? b.createdAt;
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
  return (
    journey.stages.find((stage) => stage.status === "running") ??
    journey.stages.find((stage) => stage.status === "attention") ??
    [...journey.stages].reverse().find((stage) => stage.status === "passed") ??
    journey.stages[0]
  );
}
