import { describe, expect, it } from "vitest";
import { buildGitlabUrl, inferJourney, issuesForJourneys, loadGitlabAppData, mapRelease, parseChangelog } from "./gitlab";
import { computeOverview, isShipped, journeyState, leadTimeMinutes } from "./metrics";
import type { GitlabIssue, GitlabMergeRequest, GitlabPipeline, GitlabRelease } from "./gitlab";

const issue: GitlabIssue = {
  iid: 12,
  title: "Ship the health check",
  description: "Add GET /health.",
  state: "opened",
  labels: ["ship"],
  web_url: "https://gitlab.com/acme/app/-/issues/12",
  author: { username: "ada" },
  created_at: "2026-10-01T10:00:00.000Z",
};

describe("gitlab urls", () => {
  it("encodes a path project id once", () => {
    expect(buildGitlabUrl("https://gitlab.com/", "acme/app", "/issues")).toBe(
      "https://gitlab.com/api/v4/projects/acme%2Fapp/issues",
    );
    expect(buildGitlabUrl("https://gitlab.example.com", "42", "")).toBe(
      "https://gitlab.example.com/api/v4/projects/42",
    );
  });
});

describe("issue selection", () => {
  it("reads ship issues when any are labelled, and everything when none are", () => {
    const plain = { ...issue, iid: 3, labels: ["docs"] };
    const labelled = { ...issue, iid: 4, labels: ["Ship"] };
    expect(issuesForJourneys([plain, labelled]).map((item) => item.iid)).toEqual([4]);
    expect(issuesForJourneys([plain])).toHaveLength(1);
  });
});

describe("changelog parsing", () => {
  it("groups bullets under headings", () => {
    const items = parseChangelog("## Added\n- Warn early\n## Security\n- Drop the key\n");
    expect(items).toEqual([
      { kind: "added", text: "Warn early" },
      { kind: "security", text: "Drop the key" },
    ]);
  });
});

describe("inferJourney", () => {
  const mr: GitlabMergeRequest = {
    iid: 4,
    title: "Health check",
    description: "Closes #12",
    state: "merged",
    web_url: "https://gitlab.com/acme/app/-/merge_requests/4",
    source_branch: "12-health",
    created_at: "2026-10-01T10:10:00.000Z",
    merged_at: "2026-10-01T10:40:00.000Z",
  };
  const pipeline: GitlabPipeline = {
    id: 99,
    status: "success",
    ref: "12-health",
    web_url: "https://gitlab.com/acme/app/-/pipelines/99",
    created_at: "2026-10-01T10:12:00.000Z",
    updated_at: "2026-10-01T10:20:00.000Z",
  };
  const release: GitlabRelease = {
    tag_name: "v1.2.0",
    name: "v1.2.0",
    description: "## Added\n- Health check\n\nCloses #12",
    released_at: "2026-10-01T11:00:00.000Z",
    author: { name: "Duo" },
    _links: { self: "https://gitlab.com/acme/app/-/releases/v1.2.0" },
  };

  it("infers stages and leaves human touches unknown", () => {
    const journey = inferJourney({
      issue,
      mergeRequests: [mr],
      releases: [release],
      pipelines: [pipeline],
      notes: [],
    });
    expect(journey.provenance).toBe("inferred");
    expect(journey.humanTouches).toBeNull();
    expect(journey.stages.find((stage) => stage.stage === "create")?.summary).toContain("!4");
    expect(journey.stages.find((stage) => stage.stage === "verify")?.status).toBe("passed");
    expect(journey.releaseTag).toBe("v1.2.0");
  });

  it("prefers a journey artifact over inference", () => {
    const note = {
      body: `<!-- journey:v1 ${JSON.stringify({
        version: 1,
        issueIid: 12,
        humanTouches: 0,
        touchNotes: [],
        stages: [{ stage: "plan", status: "passed", summary: "From the flow" }],
      })} -->`,
    };
    const journey = inferJourney({
      issue,
      mergeRequests: [mr],
      releases: [],
      pipelines: [],
      notes: [note],
    });
    expect(journey.provenance).toBe("artifact");
    expect(journey.humanTouches).toBe(0);
    expect(journey.stages[0]?.summary).toBe("From the flow");
  });

  it("counts a merged and released journey as shipped", () => {
    const stage = (id: string, status: string, summary = "done") => ({ stage: id, status, summary });
    const note = {
      body: `<!-- journey:v1 ${JSON.stringify({
        version: 1,
        issueIid: 12,
        humanTouches: 1,
        touchNotes: [],
        stages: [
          stage("plan", "passed"),
          stage("create", "passed"),
          stage("verify", "passed"),
          stage("package", "passed"),
          stage("secure", "passed"),
          stage("approval", "passed", "Ada merged MR !4."),
        ],
      })} -->`,
    };
    const journey = inferJourney({ issue, mergeRequests: [mr], releases: [release], pipelines: [], notes: [note] });
    const byId = (id: string) => journey.stages.find((item) => item.stage === id);
    expect(byId("release")?.status).toBe("passed");
    expect(byId("govern")?.status).toBe("passed");
    expect(isShipped(journey)).toBe(true);
    expect(journeyState(journey)).toBe("Shipped");
    const overview = computeOverview([journey]);
    expect(overview.shipped).toBe(1);
    expect(overview.inFlight).toBe(0);
  });

  it("ships a merged, released journey without a journey note and measures lead time to the release", () => {
    const journey = inferJourney({ issue, mergeRequests: [mr], releases: [release], pipelines: [pipeline], notes: [] });
    expect(isShipped(journey)).toBe(true);
    expect(journeyState(journey)).toBe("Shipped");
    expect(leadTimeMinutes(journey)).toBe(60);
    expect(computeOverview([journey]).leadTimeMinutes).toBe(60);
  });

  it("keeps a journey in flight when the merge request is merged but no release exists", () => {
    const note = {
      body: `<!-- journey:v1 ${JSON.stringify({
        version: 1,
        issueIid: 12,
        humanTouches: 1,
        touchNotes: [],
        stages: [
          { stage: "plan", status: "passed", summary: "ok" },
          { stage: "approval", status: "passed", summary: "merged" },
        ],
      })} -->`,
    };
    const journey = inferJourney({ issue, mergeRequests: [mr], releases: [], pipelines: [], notes: [note] });
    expect(isShipped(journey)).toBe(false);
    expect(journey.stages.find((item) => item.stage === "release")?.status).toBe("pending");
    expect(journeyState(journey)).toBe("In flight");
  });

  it("does not ship an unmerged merge request even when a release names the issue", () => {
    const open = { ...mr, state: "opened", merged_at: null };
    const note = {
      body: `<!-- journey:v1 ${JSON.stringify({
        version: 1,
        issueIid: 12,
        humanTouches: 0,
        touchNotes: [],
        stages: [{ stage: "approval", status: "passed", summary: "merged" }],
      })} -->`,
    };
    const journey = inferJourney({ issue, mergeRequests: [open], releases: [release], pipelines: [], notes: [note] });
    expect(journey.stages.find((item) => item.stage === "release")?.status).toBe("pending");
  });

  it("maps a release onto generated posts", () => {
    const mapped = mapRelease({
      release,
      projectName: "app",
      projectWebUrl: "https://gitlab.com/acme/app",
      journeys: [],
    });
    expect(mapped.issueIid).toBe(12);
    expect(mapped.announcements.x.length).toBeLessThanOrEqual(280);
    expect(mapped.changelog[0]?.text).toBe("Health check");
  });
});

describe("loadGitlabAppData", () => {
  it("reads the REST resources and labels inferred data", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
      if (url.endsWith("/projects/7")) {
        return json({
          name: "app",
          path_with_namespace: "acme/app",
          description: "Demo",
          web_url: "https://gitlab.com/acme/app",
        });
      }
      if (url.includes("/issues?")) return json([issue]);
      if (url.includes("/notes")) return json([]);
      if (url.includes("/merge_requests")) return json([]);
      if (url.includes("/releases")) return json([]);
      if (url.includes("/pipelines")) return json([]);
      return json({ message: "missing" }, 500);
    };

    const data = await loadGitlabAppData(
      { token: "secret", projectId: "7", baseUrl: "https://gitlab.com" },
      fetchImpl,
    );
    expect(data.source).toBe("gitlab");
    expect(data.project.path).toBe("acme/app");
    expect(data.journeys[0]?.provenance).toBe("inferred");
    expect(data.warning).toMatch(/inferred/i);
  });

  it("turns a 401 into a safe error", async () => {
    const fetchImpl: typeof fetch = async () => new Response("nope", { status: 401 });
    await expect(
      loadGitlabAppData({ token: "secret", projectId: "7", baseUrl: "https://gitlab.com" }, fetchImpl),
    ).rejects.toThrow(/401/);
  });
});
