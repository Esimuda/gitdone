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
      expect(read?.stages).toHaveLength(9);
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
});
