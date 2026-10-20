import { describe, expect, it } from "vitest";
import { PRODUCT_NAME } from "@/config/brand";
import { configFlags, GET } from "./route";

describe("GET /api/health", () => {
  it("responds 200 with Cache-Control: no-store, status ok and config flags", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({ status: "ok", service: PRODUCT_NAME });
    expect(Object.values(body.config).every((v) => typeof v === "boolean")).toBe(true);
  });

  it("reports present settings as true without exposing values", () => {
    const flags = configFlags({ DATABASE_URL: "postgres://x", GITLAB_OAUTH_CLIENT_ID: "id", GITLAB_OAUTH_CLIENT_SECRET: " " });
    expect(flags.database).toBe(true);
    expect(flags.oauth).toBe(false);
    expect(JSON.stringify(flags)).not.toContain("postgres");
  });
});
