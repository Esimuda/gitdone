import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/connect/http";

export function GET(request: Request) {
  return NextResponse.redirect(new URL("/sign-in?error=state", publicOrigin(request)));
}
