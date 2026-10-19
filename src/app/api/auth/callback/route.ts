import { NextResponse } from "next/server";
import { requireSessionSecret, safeNext } from "@/lib/auth/session-cookie";
import { sealSessionId } from "@/lib/auth/session-cookie";
import { takeOauthState } from "@/lib/connect/db";
import { limited, publicOrigin, sessionCookie } from "@/lib/connect/http";
import { rateLimitAuth } from "@/lib/rate-limit";
import { exchangeCode } from "@/lib/connect/oauth";
import { establishSession } from "@/lib/connect/session";

export async function GET(request: Request) {
  const throttled = rateLimitAuth(request);
  if (throttled) return throttled;
  const blocked = await limited(request);
  if (blocked) return blocked;
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const stored = await takeOauthState(state);
  if (!code || !stored?.codeVerifier) {
    return NextResponse.redirect(new URL("/sign-in?error=state", origin));
  }
  try {
    const tokens = await exchangeCode({
      code,
      redirectUri: `${origin}/api/auth/callback`,
      codeVerifier: stored.codeVerifier,
    });
    const sessionId = await establishSession(tokens, null);
    const response = NextResponse.redirect(new URL(safeNext(stored.nextPath), origin));
    const cookie = sessionCookie(sealSessionId(sessionId, requireSessionSecret()));
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/sign-in?error=rejected", origin));
  }
}
