import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { openSessionId, requireSessionSecret } from "@/lib/auth/session-cookie";
import { deleteSession } from "@/lib/connect/db";
import { publicOrigin, sameOrigin, SESSION_COOKIE } from "@/lib/connect/http";

export async function POST(request: Request) {
  const origin = publicOrigin(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  const jar = await cookies();
  try {
    const sessionId = openSessionId(jar.get(SESSION_COOKIE)?.value, requireSessionSecret());
    if (sessionId) await deleteSession(sessionId);
  } catch {
    // Signing out still clears the cookie when the secret is missing.
  }
  const response = NextResponse.redirect(new URL("/", origin));
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
