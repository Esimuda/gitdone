import { describe, expect, it } from "vitest";
import { missingConfig, REQUIRED_CONFIG } from "../../scripts/post-deploy";

describe("post-deploy configure check", () => {
  it("lists every setting that is not true", () => {
    expect(missingConfig({ config: { database: true, oauth: false } })).toEqual(
      REQUIRED_CONFIG.filter((key) => key !== "database"),
    );
  });
  it("passes when all settings are present", () => {
    expect(missingConfig({ config: Object.fromEntries(REQUIRED_CONFIG.map((k) => [k, true])) })).toEqual([]);
  });
  it("treats a missing body as all missing", () => {
    expect(missingConfig(null)).toEqual(REQUIRED_CONFIG);
  });
});
