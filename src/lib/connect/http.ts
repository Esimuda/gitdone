import { NextResponse } from "next/server";
import { allowRequest, getDb } from "./db";

export const SESSION_COOKIE = "gitdone_session";

export function sessionCookie(id: string) {
  return {
    name: SESSION_COOKIE,
    value: id,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 14 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    },
  };
}

export function clientBucket(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return forwarded.replace(/[^\w.:-]/g, "").slice(0, 80) || "local";
}

export function limited(request: Request): NextResponse | null {
  const allowed = allowRequest(getDb(), clientBucket(request), Date.now(), 10 * 60 * 1000, 20);
  if (allowed) return null;
  return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
}

export function publicOrigin(request: Request): string {
  const configured = process.env.GITDONE_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}
