import { describe, expect, it } from "vitest";
import { resolveVersion } from "./version";

describe("resolveVersion", () => {
  it("falls back to dev when no sha is set", () => {
    expect(resolveVersion({})).toEqual({ sha: "dev", shortSha: "dev" });
  });

  it("treats empty values as unset", () => {
    expect(resolveVersion({ CI_COMMIT_SHA: "", GIT_SHA: " " }).sha).toBe("dev");
  });

  it("prefers CI_COMMIT_SHA over GIT_SHA", () => {
    const v = resolveVersion({ CI_COMMIT_SHA: "abcdef1234567890", GIT_SHA: "ffffffffff" });
    expect(v).toEqual({ sha: "abcdef1234567890", shortSha: "abcdef1" });
  });

  it("uses GIT_SHA when CI_COMMIT_SHA is missing", () => {
    expect(resolveVersion({ GIT_SHA: "1234567890" })).toEqual({
      sha: "1234567890",
      shortSha: "1234567",
    });
  });
});
