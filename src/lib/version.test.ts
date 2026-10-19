import { describe, expect, it } from "vitest";
import { resolveVersion } from "./version";

describe("resolveVersion", () => {
  it("falls back to dev when no sha is set", () => {
    expect(resolveVersion({})).toEqual({ sha: "dev", shortSha: "dev" });
  });

  it("treats empty values as unset", () => {
    expect(resolveVersion({ CI_COMMIT_SHA: "", GIT_SHA: " ", RENDER_GIT_COMMIT: "  " }).sha).toBe("dev");
  });

  it("uses CI_COMMIT_SHA when it is the only source", () => {
    expect(resolveVersion({ CI_COMMIT_SHA: "abcdef1234567890" })).toEqual({
      sha: "abcdef1234567890",
      shortSha: "abcdef12",
    });
  });

  it("uses GIT_SHA when CI_COMMIT_SHA is missing", () => {
    expect(resolveVersion({ GIT_SHA: "1234567890" })).toEqual({
      sha: "1234567890",
      shortSha: "12345678",
    });
  });

  it("uses RENDER_GIT_COMMIT when it is the only source", () => {
    expect(resolveVersion({ RENDER_GIT_COMMIT: "0a1b2c3d4e5f60718293" })).toEqual({
      sha: "0a1b2c3d4e5f60718293",
      shortSha: "0a1b2c3d",
    });
  });

  it("prefers CI_COMMIT_SHA over GIT_SHA and RENDER_GIT_COMMIT", () => {
    const v = resolveVersion({
      CI_COMMIT_SHA: "aaaaaaaa11111111",
      GIT_SHA: "bbbbbbbb22222222",
      RENDER_GIT_COMMIT: "cccccccc33333333",
    });
    expect(v).toEqual({ sha: "aaaaaaaa11111111", shortSha: "aaaaaaaa" });
  });

  it("prefers GIT_SHA over RENDER_GIT_COMMIT", () => {
    const v = resolveVersion({ GIT_SHA: "bbbbbbbb22222222", RENDER_GIT_COMMIT: "cccccccc33333333" });
    expect(v).toEqual({ sha: "bbbbbbbb22222222", shortSha: "bbbbbbbb" });
  });

  it("keeps a sha shorter than 8 characters as is", () => {
    expect(resolveVersion({ GIT_SHA: "abc" })).toEqual({ sha: "abc", shortSha: "abc" });
  });
});
