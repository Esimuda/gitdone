import { describe, expect, it } from "vitest";
import { GitlabApi } from "./gitlab-api";
import { readSetupSignals, setupChecklist } from "./checklist";
import { listDeveloperProjects } from "./membership";

describe("onboarding checklist", () => {
  it("ticks merge, catalog, and the note token from GitLab", async () => {
    const steps = setupChecklist({
      webUrl: "https://gitlab.example/acme/demo",
      mergeRequestUrl: "https://gitlab.example/acme/demo/-/merge_requests/4",
      mrState: "merged",
      flowEnabled: true,
      noteTokenSet: true,
    });
    expect(steps.every((step) => step.done)).toBe(true);
    expect(steps.map((step) => step.id)).toEqual(["catalog", "merge", "note-token"]);

    const open = setupChecklist({
      webUrl: "https://gitlab.example/acme/demo",
      mergeRequestUrl: "https://gitlab.example/acme/demo/-/merge_requests/4",
      mrState: "opened",
      flowEnabled: false,
      noteTokenSet: false,
    });
    expect(open.every((step) => step.done)).toBe(false);
  });

  it("reads live status from the GitLab API and does not return the CI variable value", async () => {
    const secret = "note-token-value-should-not-leak";
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/merge_requests/4")) return Response.json({ state: "merged", description: secret });
      if (url.endsWith("/variables/GITDONE_NOTE_TOKEN")) return Response.json({ key: "GITDONE_NOTE_TOKEN", value: secret });
      if (url.endsWith("/ai/flow_triggers")) return Response.json([{ id: 1 }]);
      return Response.json({}, { status: 404 });
    };
    const signals = await readSetupSignals(new GitlabApi("https://gitlab.example", "token", fetchImpl), {
      gitlabProjectId: "9",
      mergeRequestIid: 4,
    });
    expect(signals).toEqual({ mrState: "merged", flowEnabled: true, noteTokenSet: true });
    expect(JSON.stringify(signals)).not.toContain(secret);
  });

  it("lists Developer projects from a mocked membership response", async () => {
    const fetchImpl: typeof fetch = async () =>
      Response.json([
        {
          id: 1,
          name: "Guest",
          path_with_namespace: "acme/guest",
          web_url: "https://gitlab.example/acme/guest",
          permissions: { project_access: { access_level: 10 } },
        },
        {
          id: 2,
          name: "Ship",
          path_with_namespace: "acme/ship",
          web_url: "https://gitlab.example/acme/ship",
          permissions: { project_access: { access_level: 40 } },
        },
      ]);
    const projects = await listDeveloperProjects(new GitlabApi("https://gitlab.example", "token", fetchImpl));
    expect(projects.map((project) => project.path)).toEqual(["acme/ship"]);
  });
});
