import { describe, expect, it } from "vitest";
import { PRODUCT_NAME } from "@/config/brand";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("responds 200 with Cache-Control: no-store and the same JSON body", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok", service: PRODUCT_NAME });
  });
});
