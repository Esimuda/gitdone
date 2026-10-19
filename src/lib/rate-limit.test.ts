import { beforeEach, describe, expect, it } from "vitest";
import { AUTH_LIMIT, createRateLimiter, rateLimitAuth, resetAuthRateLimit } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows requests up to the limit", () => {
    const limiter = createRateLimiter(3, 60_000);
    for (let i = 0; i < 3; i += 1) {
      expect(limiter.check("ip", 1_000 + i)).toEqual({ allowed: true });
    }
  });

  it("blocks the next request with the seconds until the window resets", () => {
    const limiter = createRateLimiter(2, 60_000);
    limiter.check("ip", 0);
    limiter.check("ip", 1_000);
    expect(limiter.check("ip", 15_000)).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it("counts each key separately", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("a", 0).allowed).toBe(true);
    expect(limiter.check("a", 1).allowed).toBe(false);
    expect(limiter.check("b", 2).allowed).toBe(true);
  });

  it("allows requests again once the window resets", () => {
    const limiter = createRateLimiter(1, 60_000);
    limiter.check("ip", 0);
    expect(limiter.check("ip", 59_999).allowed).toBe(false);
    expect(limiter.check("ip", 60_000).allowed).toBe(true);
  });
});

describe("rateLimitAuth", () => {
  beforeEach(() => resetAuthRateLimit());

  function request(ip: string) {
    return new Request("https://example.com/api/auth/start", { headers: { "x-forwarded-for": ip } });
  }

  it("returns null within the limit and 429 with Retry-After beyond it", async () => {
    for (let i = 0; i < AUTH_LIMIT; i += 1) {
      expect(rateLimitAuth(request("203.0.113.9"))).toBeNull();
    }
    const blocked = rateLimitAuth(request("203.0.113.9"));
    expect(blocked?.status).toBe(429);
    const retryAfter = Number(blocked?.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect(rateLimitAuth(request("203.0.113.10"))).toBeNull();
  });
});
