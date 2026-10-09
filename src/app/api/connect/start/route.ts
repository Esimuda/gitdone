import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { tokenKeyFromEnv } from "@/lib/connect/crypto";
import { rememberOauthState, getDb } from "@/lib/connect/db";
import { limited, publicOrigin } from "@/lib/connect/http";
import { authorizeUrl, oauthConfigured } from "@/lib/connect/oauth";

export async function GET(request: Request) {
  const blocked = limited(request);
  if (blocked) return blocked;
  if (!oauthConfigured()) {
    return NextResponse.redirect(new URL("/connect?oauth=missing", publicOrigin(request)));
  }
  try {
    tokenKeyFromEnv(process.env.GITDONE_TOKEN_KEY);
  } catch {
    return NextResponse.redirect(new URL("/connect?oauth=key", publicOrigin(request)));
  }
  const state = randomBytes(24).toString("hex");
  rememberOauthState(getDb(), state);
  const redirectUri = `${publicOrigin(request)}/api/connect/callback`;
  return NextResponse.redirect(authorizeUrl({ redirectUri, state }));
}
