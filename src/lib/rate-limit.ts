import { NextResponse } from "next/server";
import { clientBucket } from "@/lib/connect/http";

export const AUTH_LIMIT = 20;
export const AUTH_WINDOW_MS = 60 * 1000;

export type LimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Entry = { windowStart: number; count: number };

/** Fixed-window, in-memory limiter. State lives in this process only. */
export function createRateLimiter(limit: number, windowMs: number) {
  const entries = new Map<string, Entry>();

  function sweep(now: number) {
    for (const [key, entry] of entries) {
      if (now - entry.windowStart >= windowMs) entries.delete(key);
    }
  }

  return {
    check(key: string, now: number = Date.now()): LimitResult {
      if (entries.size > 5000) sweep(now);
      const current = entries.get(key);
      if (!current || now - current.windowStart >= windowMs) {
        entries.set(key, { windowStart: now, count: 1 });
        return { allowed: true };
      }
      if (current.count < limit) {
        current.count += 1;
        return { allowed: true };
      }
      const retryAfterSeconds = Math.max(1, Math.ceil((current.windowStart + windowMs - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    },
    reset() {
      entries.clear();
    },
  };
}

const authLimiter = createRateLimiter(AUTH_LIMIT, AUTH_WINDOW_MS);

/** Returns a 429 response with Retry-After when the caller is over the limit, otherwise null. */
export function rateLimitAuth(request: Request): NextResponse | null {
  const result = authLimiter.check(clientBucket(request));
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

export function resetAuthRateLimit() {
  authLimiter.reset();
}
