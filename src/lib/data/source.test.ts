import { describe, expect, it } from "vitest";
import { parseSubscribeBody } from "../subscribe";
import { resolveGitlabEnv } from "./source";

describe("resolveGitlabEnv", () => {
  it("uses demo mode when both variables are unset", () => {
    expect(resolveGitlabEnv({}).mode).toBe("demo");
    expect(resolveGitlabEnv({ GITLAB_TOKEN: "  ", GITLAB_PROJECT_ID: "" }).mode).toBe("demo");
  });

  it("refuses a half-configured environment", () => {
    const result = resolveGitlabEnv({ GITLAB_TOKEN: "abc" });
    expect(result.mode).toBe("misconfigured");
  });

  it("accepts a token, project, and optional base url", () => {
    const result = resolveGitlabEnv({
      GITLAB_TOKEN: "abc",
      GITLAB_PROJECT_ID: "group/app",
      GITLAB_BASE_URL: "https://gitlab.example.com/",
    });
    expect(result).toMatchObject({
      mode: "gitlab",
      token: "abc",
      projectId: "group/app",
      baseUrl: "https://gitlab.example.com",
    });
  });

  it("rejects a bad base url", () => {
    expect(
      resolveGitlabEnv({ GITLAB_TOKEN: "abc", GITLAB_PROJECT_ID: "1", GITLAB_BASE_URL: "not a url" }).mode,
    ).toBe("misconfigured");
  });
});

describe("parseSubscribeBody", () => {
  it("accepts a trimmed email and rejects junk", () => {
    expect(parseSubscribeBody({ email: "  ada@example.com " })).toEqual({ email: "ada@example.com" });
    expect(parseSubscribeBody({ email: "nope" })).toEqual({ error: "Enter a valid email address." });
    expect(parseSubscribeBody(null)).toEqual({ error: "Enter a valid email address." });
  });
});
