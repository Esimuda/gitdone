import { describe, expect, it } from "vitest";
import { buildDemoData } from "./demo";
import { formatDuration } from "../format";
import {
  computeOverview,
  coveredStages,
  didRollback,
  flagshipJourney,
  isShipped,
  leadTimeMinutes,
  median,
  spotlightJourney,
} from "./metrics";
import type { Journey } from "./types";

describe("demo overview", () => {
  const data = buildDemoData();

  it("covers all nine stages and the sample headline numbers", () => {
    expect(data.project.name).toBe("GitDone");
    expect(data.journeys).toHaveLength(5);
    expect(data.overview).toMatchObject({
      leadTimeMinutes: 71,
      leadTimeSample: 4,
      humanInterventions: 1,
      humanSample: 5,
      stageCoverage: 9,
      stageCount: 9,
      findingsResolved: 1,
      findingsOpen: 1,
      shipped: 4,
      inFlight: 1,
      zeroTouchShips: 2,
      shipsWithTouchData: 4,
      rollbacks: 1,
    });
    expect(coveredStages(data.journeys)).toHaveLength(9);
    expect(formatDuration(data.overview.leadTimeMinutes ?? 0)).toBe("1 h 11 min");
  });

  it("puts the live issue first and treats the overnight ship as the flagship", () => {
    expect(data.journeys[0]?.issueIid).toBe(221);
    expect(spotlightJourney(data.journeys)?.issueIid).toBe(221);
    const flagship = flagshipJourney(data.journeys);
    expect(flagship?.issueIid).toBe(214);
    expect(leadTimeMinutes(flagship!)).toBe(52);
    expect(isShipped(flagship!)).toBe(true);
    expect(didRollback(flagship!)).toBe(false);
    const rolled = data.journeys.find((journey) => journey.issueIid === 207);
    expect(didRollback(rolled!)).toBe(true);
    expect(rolled?.stages.map((stage) => stage.stage)).toEqual([
      "plan",
      "create",
      "verify",
      "package",
      "secure",
      "release",
      "configure",
      "monitor",
      "rollback",
      "govern",
    ]);
  });

  it("gives every quiet journey nine stages in order", () => {
    const nine = [
      "plan",
      "create",
      "verify",
      "package",
      "secure",
      "release",
      "configure",
      "monitor",
      "govern",
    ];
    for (const journey of data.journeys) {
      if (didRollback(journey)) continue;
      expect(journey.stages.map((stage) => stage.stage)).toEqual(nine);
    }
  });
});

describe("median", () => {
  it("averages the two middle values", () => {
    expect(median([47, 373, 69, 85])).toBe(77);
    expect(median([10])).toBe(10);
    expect(median([])).toBeNull();
  });
});

describe("computeOverview edges", () => {
  it("does not count unknown touches or extra resolved findings", () => {
    const journey = {
      issueIid: 1,
      title: "t",
      description: "",
      author: "a",
      labels: [],
      webUrl: "https://example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      state: "closed",
      humanTouches: null,
      touchNotes: [],
      provenance: "inferred",
      stages: buildDemoData().journeys[0].stages.map((stage) =>
        stage.stage === "secure"
          ? { ...stage, status: "passed" as const, security: { found: 1, resolved: 3 } }
          : { ...stage, status: "pending" as const, security: undefined },
      ),
    } satisfies Journey;
    const overview = computeOverview([journey]);
    expect(overview.humanInterventions).toBeNull();
    expect(overview.findingsOpen).toBe(0);
    expect(overview.findingsResolved).toBe(3);
    expect(overview.shipped).toBe(0);
  });
});
