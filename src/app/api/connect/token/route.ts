import { NextResponse } from "next/server";
import { tokenKeyFromEnv } from "@/lib/connect/crypto";
import { limited, sessionCookie } from "@/lib/connect/http";
import { establishSession } from "@/lib/connect/session";
import { parseConnectBody } from "@/lib/connect/validate";

export async function POST(request: Request) {
  const blocked = limited(request);
  if (blocked) return blocked;
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 8000) return NextResponse.json({ error: "That request is too large." }, { status: 400 });
  try {
    tokenKeyFromEnv(process.env.GITDONE_TOKEN_KEY);
  } catch {
    return NextResponse.json({ error: "Set GITDONE_TOKEN_KEY before connecting a project." }, { status: 503 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a token and a project." }, { status: 400 });
  }
  const parsed = parseConnectBody(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const sessionId = await establishSession(parsed.token, parsed.project);
    const response = NextResponse.json({ ok: true, next: "/connect/review" });
    const cookie = sessionCookie(sessionId);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch {
    return NextResponse.json({ error: "GitLab did not accept that token." }, { status: 401 });
  }
}
