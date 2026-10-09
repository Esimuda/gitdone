import { describe, expect, it } from "vitest";
import { buildDemoData } from "./demo";
import { parseJourneyArtifact, readLatestJourney, serializeJourneyNote, toArtifact } from "./parse-journey";

describe("journey notes", () => {
  it("round-trips every seeded journey", () => {
    for (const journey of buildDemoData().journeys) {
      const note = serializeJourneyNote(toArtifact(journey));
      const read = readLatestJourney([{ body: `hello\n${note}\nthanks` }]);
      expect(read?.issueIid).toBe(journey.issueIid);
      expect(read?.humanTouches).toBe(journey.humanTouches);
      expect(read?.stages).toHaveLength(journey.stages.length);
      expect(read?.stages[0]?.status).toBe(journey.stages[0]?.status);
    }
  });

  it("keeps the newest valid note and skips broken JSON", () => {
    const older = serializeJourneyNote(
      toArtifact({ ...buildDemoData().journeys[2], humanTouches: 4 }),
    );
    const newer = "<!-- journey:v1 {not json} -->";
    const latest = serializeJourneyNote(toArtifact(buildDemoData().journeys[2]));
    const read = readLatestJourney([{ body: latest }, { body: `${newer}\n${older}` }]);
    expect(read?.humanTouches).toBe(0);
  });

  it("rejects a record that is not version 1", () => {
    expect(parseJourneyArtifact(JSON.stringify({ version: 2, issueIid: 1, stages: [] }))).toBeNull();
    expect(parseJourneyArtifact("[]")).toBeNull();
  });

  it("fills missing stages so the timeline stays nine wide", () => {
    const raw = JSON.stringify({
      version: 1,
      issueIid: 9,
      humanTouches: 0,
      stages: [
        {
          stage: "plan",
          status: "passed",
          summary: "Ready",
        },
      ],
    });
    const parsed = parseJourneyArtifact(raw);
    expect(parsed?.stages).toHaveLength(9);
    expect(parsed?.stages[1]?.status).toBe("pending");
    expect(parsed?.touchNotes).toEqual([]);
  });

  it("keeps a rollback stage after monitor", () => {
    const raw = JSON.stringify({
      version: 1,
      issueIid: 207,
      humanTouches: 0,
      stages: [
        { stage: "monitor", status: "attention", summary: "Error rate climbed." },
        { stage: "rollback", status: "passed", summary: "Traffic is back on the previous revision." },
        { stage: "govern", status: "pending", summary: "" },
      ],
    });
    const parsed = parseJourneyArtifact(raw);
    const ids = parsed?.stages.map((stage) => stage.stage);
    expect(ids?.indexOf("rollback")).toBe((ids?.indexOf("monitor") ?? 0) + 1);
    expect(parsed?.stages.find((stage) => stage.stage === "rollback")?.status).toBe("passed");
  });

  it("places approval after secure", () => {
    const raw = JSON.stringify({
      version: 1,
      issueIid: 214,
      humanTouches: 1,
      touchNotes: ["Olabowale Babalola merged MR !46 at 03:00 UTC."],
      stages: [
        { stage: "secure", status: "passed", summary: "Clean." },
        { stage: "approval", status: "passed", summary: "Olabowale Babalola merged MR !46." },
        { stage: "release", status: "passed", summary: "v0.9.0" },
      ],
    });
    const parsed = parseJourneyArtifact(raw);
    const ids = parsed?.stages.map((stage) => stage.stage) ?? [];
    expect(ids.indexOf("approval")).toBe(ids.indexOf("secure") + 1);
    expect(ids.indexOf("release")).toBe(ids.indexOf("approval") + 1);
    expect(parsed?.humanTouches).toBe(1);
  });
});
