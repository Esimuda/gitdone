import { NextResponse } from "next/server";
import { getDb, takeOauthState } from "@/lib/connect/db";
import { limited, publicOrigin, sessionCookie } from "@/lib/connect/http";
import { exchangeCode } from "@/lib/connect/oauth";
import { establishSession } from "@/lib/connect/session";

export async function GET(request: Request) {
  const blocked = limited(request);
  if (blocked) return blocked;
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!code || !takeOauthState(getDb(), state)) {
    return NextResponse.redirect(new URL("/connect?oauth=rejected", origin));
  }
  try {
    const token = await exchangeCode({ code, redirectUri: `${origin}/api/connect/callback` });
    const sessionId = await establishSession(token, null);
    const response = NextResponse.redirect(new URL("/connect/review", origin));
    const cookie = sessionCookie(sessionId);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/connect?oauth=rejected", origin));
  }
}
