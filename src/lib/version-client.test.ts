import { describe, expect, it } from "vitest";
import { loadShortSha } from "./version-client";

const ok = (body: unknown) => async () => ({ ok: true, json: async () => body });

describe("loadShortSha", () => {
  it("returns the short sha from /api/version", async () => {
    expect(await loadShortSha(ok({ sha: "abcdef1234567890", shortSha: "abcdef12" }))).toBe("abcdef12");
  });

  it("shortens the full sha when shortSha is missing", async () => {
    expect(await loadShortSha(ok({ sha: "abcdef1234567890" }))).toBe("abcdef12");
  });

  it("falls back to dev when the request throws", async () => {
    expect(
      await loadShortSha(async () => {
        throw new Error("network down");
      }),
    ).toBe("dev");
  });

  it("falls back to dev when the endpoint answers with an error status", async () => {
    expect(await loadShortSha(async () => ({ ok: false, json: async () => ({}) }))).toBe("dev");
  });

  it("falls back to dev when the body is not usable", async () => {
    expect(await loadShortSha(ok(null))).toBe("dev");
    expect(await loadShortSha(ok({}))).toBe("dev");
  });
});
