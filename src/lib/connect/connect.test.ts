import { afterEach, describe, expect, it } from "vitest";
import { sealToken, openToken, tokenKeyFromEnv } from "./crypto";
import { allowRequest, openDatabase, resetDbForTests, saveProject, tokenForUser, saveUser } from "./db";
import { GitlabApi } from "./gitlab-api";
import { installGitDone } from "./install";
import { assertNoSecret, planInstall } from "./install-plan";
import { checksPass, prerequisiteReport } from "./prerequisites";
import { parseConnectBody } from "./validate";

const KEY = Buffer.alloc(32, 7).toString("base64");

afterEach(() => {
  resetDbForTests();
  delete process.env.GITDONE_TOKEN_KEY;
});

describe("connect prerequisites", () => {
  it("requires developer access and Duo", () => {
    const blocked = prerequisiteReport({ level: 20, duoEnabled: false, duoDetail: "off" });
    expect(checksPass(blocked)).toBe(false);
    const ready = prerequisiteReport({ level: 40, duoEnabled: true });
    expect(checksPass(ready)).toBe(true);
    expect(ready.find((check) => check.id === "duo")?.ok).toBe(true);
  });
});

describe("install plan", () => {
  it("keeps skill files that mention the token variable name", () => {
    const plan = planInstall({
      upstreamProject: "group/gitdone",
      hasCiFile: false,
      sources: [
        { path: "skills/ready/SKILL.md", content: "Use Authorization: Bearer $GITLAB_TOKEN" },
        { path: "AGENTS.md", content: "Set GITLAB_TOKEN in the workload." },
      ],
    });
    expect(plan.files.map((file) => file.path)).toEqual([
      "skills/ready/SKILL.md",
      "AGENTS.md",
      ".gitlab-ci.yml",
    ]);
    expect(plan.files.at(-1)?.content).toContain("group/gitdone");
    expect(plan.files.at(-1)?.content).toContain("/ci/gitdone.gitlab-ci.yml");
  });

  it("writes an include snippet when the project already has CI", () => {
    const plan = planInstall({ upstreamProject: "group/gitdone", hasCiFile: true, sources: [] });
    expect(plan.includePath).toBe(".gitlab/gitdone.include.yml");
  });

  it("refuses to commit the access token", () => {
    expect(() => assertNoSecret([{ path: "a.md", content: "glpat-secret-value" }], "glpat-secret-value")).toThrow(
      /access token/,
    );
  });
});

describe("install against a mocked GitLab", () => {
  it("opens one merge request and never puts the token in the commit", async () => {
    const token = "glpat-test-token-value-0001";
    const calls: { url: string; body?: string }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = typeof init?.body === "string" ? init.body : undefined;
      calls.push({ url, body });
      if (url.includes("/api/graphql")) {
        return json({ data: { project: { duoWorkflowStatusCheck: { enabled: true } } } });
      }
      if (url.includes("/repository/files/")) return json({}, 404);
      if (url.endsWith("/labels")) return json({ name: "ship" }, 201);
      if (url.endsWith("/repository/commits")) return json({ id: "abc" }, 201);
      if (url.endsWith("/merge_requests")) {
        return json({ web_url: "https://gitlab.example/acme/demo/-/merge_requests/4" }, 201);
      }
      if (url.includes("/api/v4/projects/")) {
        return json({
          id: 9,
          name: "Demo",
          path_with_namespace: "acme/demo",
          web_url: "https://gitlab.example/acme/demo",
          default_branch: "main",
          permissions: { project_access: { access_level: 30 }, group_access: null },
        });
      }
      return json({}, 500);
    };
    const api = new GitlabApi("https://gitlab.example", token, fetchImpl);
    const result = await installGitDone(api, "acme/demo", token, [
      { path: "skills/secure/SKILL.md", content: "Read SAST. The variable is named GITLAB_TOKEN." },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mergeRequestUrl).toContain("merge_requests/4");
    const commit = calls.find((call) => call.url.endsWith("/repository/commits"));
    expect(commit?.body).toContain("skills/secure/SKILL.md");
    expect(commit?.body).not.toContain(token);
    expect(calls.some((call) => call.url.endsWith("/labels"))).toBe(true);
    const auth = calls.every((call) => !call.body?.includes(token) || call.url.includes("nope"));
    expect(auth).toBe(true);
  });

  it("does not commit when Duo is off", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/api/graphql")) {
        return json({ data: { project: { duoWorkflowStatusCheck: { enabled: false } } } });
      }
      return json({
        id: 9,
        name: "Demo",
        path_with_namespace: "acme/demo",
        web_url: "https://gitlab.example/acme/demo",
        permissions: { project_access: { access_level: 40 } },
      });
    };
    const result = await installGitDone(new GitlabApi("https://gitlab.example", "glpat-test-token-value-0001", fetchImpl), "acme/demo", "glpat-test-token-value-0001", []);
    expect(result.ok).toBe(false);
  });
});

describe("token storage", () => {
  it("round-trips a token and rate-limits a bucket", () => {
    process.env.GITDONE_TOKEN_KEY = KEY;
    const key = tokenKeyFromEnv(KEY);
    const sealed = sealToken("glpat-round-trip-token-00", key);
    expect(openToken(sealed, key)).toBe("glpat-round-trip-token-00");
    expect(sealed.ciphertext).not.toContain("glpat-round-trip");

    const db = openDatabase(":memory:");
    saveUser(db, { id: "7", username: "ada", name: "Ada" }, "glpat-round-trip-token-00");
    expect(tokenForUser(db, "7")).toBe("glpat-round-trip-token-00");
    const id = saveProject(db, {
      gitlabProjectId: "9",
      path: "acme/demo",
      name: "Demo",
      webUrl: "https://gitlab.example/acme/demo",
      ownerGitlabUserId: "7",
      token: "glpat-round-trip-token-00",
      mergeRequestUrl: "https://gitlab.example/acme/demo/-/merge_requests/4",
    });
    expect(id).toBeGreaterThan(0);
    expect(allowRequest(db, "ip", 1_000, 10_000, 2)).toBe(true);
    expect(allowRequest(db, "ip", 1_100, 10_000, 2)).toBe(true);
    expect(allowRequest(db, "ip", 1_200, 10_000, 2)).toBe(false);
    db.close();
  });
});

describe("connect input", () => {
  it("accepts a project path and rejects a loose token", () => {
    expect(parseConnectBody({ token: "glpat-test-token-value-0001", project: "acme/demo" })).toEqual({
      token: "glpat-test-token-value-0001",
      project: "acme/demo",
    });
    expect(parseConnectBody({ token: "short", project: "1" })).toHaveProperty("error");
    expect(parseConnectBody({ token: "glpat-test-token-value-0001", project: "../etc" })).toHaveProperty("error");
    expect(parseConnectBody({ token: "glpat test token value 0001xx", project: "1" })).toHaveProperty("error");
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
