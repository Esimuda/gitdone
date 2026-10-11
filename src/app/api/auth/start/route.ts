import { NextResponse } from "next/server";
import { createOauthState, createPkce } from "@/lib/auth/pkce";
import { requireSessionSecret, safeNext } from "@/lib/auth/session-cookie";
import { tokenKeyFromEnv } from "@/lib/connect/crypto";
import { rememberOauthState } from "@/lib/connect/db";
import { limited, publicOrigin } from "@/lib/connect/http";
import { authorizeUrl, oauthConfigured } from "@/lib/connect/oauth";

export async function GET(request: Request) {
  const blocked = await limited(request);
  if (blocked) return blocked;
  const origin = publicOrigin(request);
  if (!oauthConfigured()) {
    return NextResponse.redirect(new URL("/sign-in?error=config", origin));
  }
  try {
    requireSessionSecret();
    tokenKeyFromEnv(process.env.GITDONE_TOKEN_KEY);
  } catch {
    return NextResponse.redirect(new URL("/sign-in?error=config", origin));
  }
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const { verifier, challenge } = createPkce();
  const state = createOauthState();
  await rememberOauthState({ state, codeVerifier: verifier, nextPath: next });
  const redirectUri = `${origin}/api/auth/callback`;
  return NextResponse.redirect(authorizeUrl({ redirectUri, state, codeChallenge: challenge }));
}
