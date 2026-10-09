import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, readSession, setPendingProject } from "@/lib/connect/db";
import { limited, publicOrigin, SESSION_COOKIE } from "@/lib/connect/http";
import { isSafeProjectId } from "@/lib/connect/validate";

export async function POST(request: Request) {
  const blocked = limited(request);
  if (blocked) return blocked;
  const form = await request.formData();
  const project = String(form.get("project") ?? "");
  if (!isSafeProjectId(project)) {
    return NextResponse.redirect(new URL("/connect/review?error=project", publicOrigin(request)));
  }
  const jar = await cookies();
  const session = readSession(getDb(), jar.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/connect", publicOrigin(request)));
  setPendingProject(getDb(), jar.get(SESSION_COOKIE)!.value, project);
  return NextResponse.redirect(new URL("/connect/review", publicOrigin(request)));
}
