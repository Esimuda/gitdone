import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/connect/http";

export function GET(request: Request) {
  const next = new URL(request.url).searchParams.get("next");
  const target = new URL("/api/auth/start", publicOrigin(request));
  if (next) target.searchParams.set("next", next);
  return NextResponse.redirect(target);
}
