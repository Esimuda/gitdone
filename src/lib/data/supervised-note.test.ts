import { describe, expect, it } from "vitest";
import { parseJourneyArtifact } from "./parse-journey";
import { approvalNote, readyToMergeText, recordApproval } from "./supervised-note";
import type { JourneyArtifact } from "./types";

const existing: JourneyArtifact = {
  version: 1,
  issueIid: 12,
  humanTouches: 0,
  touchNotes: [],
  stages: [
    { stage: "plan", status: "passed", summary: "Planned.", details: [], artifacts: [] },
    { stage: "secure", status: "passed", summary: "No findings.", details: [], artifacts: [], security: { found: 0, resolved: 0 } },
  ],
};

describe("approval stage", () => {
  it("places approval after secure and counts the click", () => {
    const next = recordApproval(
      existing,
      {
        name: "Olabowale Babalola",
        at: "2026-10-09T03:00:00.000Z",
        mrIid: 46,
        mrUrl: "https://gitlab.example/gitdone/-/merge_requests/46",
      },
      "v0.9.2",
    );
    const ids = next.stages.map((stage) => stage.stage);
    expect(ids.indexOf("approval")).toBe(ids.indexOf("secure") + 1);
    expect(ids.indexOf("release")).toBe(ids.indexOf("approval") + 1);
    expect(next.humanTouches).toBeGreaterThanOrEqual(1);
    expect(next.touchNotes[0]).toContain("Olabowale Babalola");
    expect(next.releaseTag).toBe("v0.9.2");
    const note = approvalNote(existing, {
      name: "Olabowale Babalola",
      at: "2026-10-09T03:00:00.000Z",
      mrIid: 46,
      mrUrl: "https://gitlab.example/gitdone/-/merge_requests/46",
    });
    const parsed = parseJourneyArtifact(note.replace(/^<!--\s*journey:v1\s*/, "").replace(/\s*-->$/, ""));
    expect(parsed?.stages.some((stage) => stage.stage === "approval" && stage.status === "passed")).toBe(true);
  });

  it("writes a ready note that asks for one click and does not merge", () => {
    const text = readyToMergeText({
      issueIid: 12,
      mrIid: 4,
      mrUrl: "https://gitlab.example/gitdone/-/merge_requests/4",
      summary: "SAST and secret detection found nothing.",
    });
    expect(text).toContain("Ready to merge");
    expect(text).toContain("one click");
    expect(text).not.toMatch(/(^|\s)\/merge(\s|$)/);
  });
});
