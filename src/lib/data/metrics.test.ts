import { describe, expect, it } from "vitest";
import { buildDemoData } from "./demo";
import { formatDuration } from "../format";
import {
  computeOverview,
  coveredStages,
  didRollback,
  flagshipJourney,
  isShipped,
  journeyTimes,
  leadTimeMinutes,
  leadTimeSeries,
  median,
  shippedAt,
  spotlightJourney,
} from "./metrics";
import { emptyStage, normalizeStages } from "./stages";
import type { Journey, StageId, StageRecord } from "./types";

describe("demo overview", () => {
  const data = buildDemoData();

  it("covers all nine stages and the sample headline numbers", () => {
    expect(data.project.name).toBe("GitDone");
    expect(data.journeys).toHaveLength(5);
    expect(data.overview).toMatchObject({
      leadTimeMinutes: 55,
      leadTimeSample: 4,
      humanInterventions: 2,
      humanSample: 5,
      stageCoverage: 9,
      stageCount: 9,
      findingsResolved: 1,
      findingsOpen: 1,
      shipped: 4,
      inFlight: 1,
      zeroTouchShips: 1,
      oneClickShips: 3,
      shipsWithTouchData: 4,
      rollbacks: 1,
    });
    expect(coveredStages(data.journeys)).toHaveLength(9);
    expect(formatDuration(data.overview.leadTimeMinutes ?? 0)).toBe("55 min");
  });

  it("puts the live issue first and treats the overnight ship as the flagship", () => {
    expect(data.journeys[0]?.issueIid).toBe(221);
    expect(spotlightJourney(data.journeys)?.issueIid).toBe(221);
    const flagship = flagshipJourney(data.journeys);
    expect(flagship?.issueIid).toBe(214);
    expect(leadTimeMinutes(flagship!)).toBe(48);
    expect(isShipped(flagship!)).toBe(true);
    expect(didRollback(flagship!)).toBe(false);
    expect(flagship?.humanTouches).toBe(1);
    expect(flagship?.stages.find((stage) => stage.stage === "approval")?.status).toBe("passed");
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
      if (didRollback(journey) || journey.stages.some((stage) => stage.stage === "approval")) continue;
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

function shippedJourney(iid: number, createdAt: string, releasedAt: string | null): Journey {
  const passed = (id: StageId): StageRecord => ({ ...emptyStage(id, "passed"), completedAt: releasedAt ?? undefined });
  const stages = releasedAt
    ? normalizeStages([passed("plan"), passed("approval"), passed("release")])
    : normalizeStages([]);
  return {
    issueIid: iid,
    title: `t${iid}`,
    description: "",
    author: "a",
    labels: ["ship"],
    webUrl: "https://example.com",
    createdAt,
    state: releasedAt ? "closed" : "opened",
    humanTouches: 1,
    touchNotes: [],
    provenance: "artifact",
    stages,
  };
}

describe("lead time from shipped journeys", () => {
  it("runs from issue created to release published and takes the median of several ships", () => {
    const ships = [
      shippedJourney(1, "2026-10-19T08:00:00.000Z", "2026-10-19T08:30:00.000Z"),
      shippedJourney(2, "2026-10-19T09:00:00.000Z", "2026-10-19T10:00:00.000Z"),
      shippedJourney(3, "2026-10-19T11:00:00.000Z", "2026-10-19T13:00:00.000Z"),
    ];
    expect(ships.map(leadTimeMinutes)).toEqual([30, 60, 120]);
    expect(isShipped(ships[0])).toBe(true);
    const overview = computeOverview(ships);
    expect(overview.leadTimeMinutes).toBe(60);
    expect(overview.leadTimeSample).toBe(3);
    expect(computeOverview([...ships, shippedJourney(4, "2026-10-19T12:00:00.000Z", "2026-10-19T12:40:00.000Z")]).leadTimeMinutes).toBe(50);
  });

  it("is empty when nothing has shipped", () => {
    const open = shippedJourney(5, "2026-10-19T08:00:00.000Z", null);
    expect(leadTimeMinutes(open)).toBeNull();
    expect(shippedAt(open)).toBeUndefined();
    const overview = computeOverview([open]);
    expect(overview.leadTimeMinutes).toBeNull();
    expect(overview.leadTimeSample).toBe(0);
    expect(computeOverview([]).leadTimeMinutes).toBeNull();
  });

  it("fills the hero timeline from release time when deploy and announce are not recorded", () => {
    const ship = shippedJourney(6, "2026-10-19T08:00:00.000Z", "2026-10-19T08:30:00.000Z");
    const times = journeyTimes({
      ...ship,
      stages: ship.stages.map((stage) =>
        stage.stage === "create" ? { ...stage, status: "passed" as const, completedAt: "2026-10-19T08:10:00.000Z" } : stage,
      ),
    });
    expect(times.found).toBe("2026-10-19T08:00:00.000Z");
    expect(times.patched).toBe("2026-10-19T08:10:00.000Z");
    expect(times.deployed).toBe("2026-10-19T08:30:00.000Z");
    expect(times.announced).toBe("2026-10-19T08:30:00.000Z");
  });
});

describe("oneClickShips", () => {
  it("counts shipped journeys with at most one touch and no rollback", () => {
    const at = "2026-10-19T08:30:00.000Z";
    const base = "2026-10-19T08:00:00.000Z";
    const zero = { ...shippedJourney(1, base, at), humanTouches: 0 };
    const one = shippedJourney(2, base, at);
    const two = { ...shippedJourney(3, base, at), humanTouches: 2 };
    const unknown = { ...shippedJourney(4, base, at), humanTouches: null };
    const rolled = {
      ...shippedJourney(5, base, at),
      stages: normalizeStages([
        ...shippedJourney(5, base, at).stages,
        { ...emptyStage("rollback", "passed"), completedAt: at },
      ]),
    };
    const open = shippedJourney(6, base, null);
    const overview = computeOverview([zero, one, two, unknown, rolled, open]);
    expect(overview.oneClickShips).toBe(2);
    expect(overview.zeroTouchShips).toBe(1);
    expect(overview.shipsWithTouchData).toBe(4);
  });
});

describe("leadTimeSeries", () => {
  it("orders points oldest to newest by parsed time across timestamp formats", () => {
    const early = shippedJourney(1, "2026-10-19T08:00:00.000Z", "2026-10-19T09:00:00.000Z");
    // Written with an offset: 2026-10-19T11:30Z, later than 10:00Z although it sorts lower as text.
    const late = shippedJourney(2, "2026-10-19T10:00:00.000Z", "2026-10-19T13:30:00.000+02:00");
    const middle = shippedJourney(3, "2026-10-19T08:30:00.000Z", "2026-10-19T10:00:00Z");
    const series = leadTimeSeries([late, middle, early]);
    expect(series.map((point) => point.label)).toEqual(["#1", "#3", "#2"]);
    expect("2026-10-19T13:30:00.000+02:00".localeCompare("2026-10-19T10:00:00Z")).toBeGreaterThan(0);
  });

  it("skips journeys that have not shipped", () => {
    expect(leadTimeSeries([shippedJourney(7, "2026-10-19T08:00:00.000Z", null)])).toEqual([]);
  });
});
