import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { openSessionId, requireSessionSecret } from "@/lib/auth/session-cookie";
import { readSession, setPendingProject } from "@/lib/connect/db";
import { limited, publicOrigin, sameOrigin, SESSION_COOKIE } from "@/lib/connect/http";
import { isSafeProjectId } from "@/lib/connect/validate";

export async function POST(request: Request) {
  const origin = publicOrigin(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  const blocked = await limited(request);
  if (blocked) return blocked;
  const form = await request.formData();
  const project = String(form.get("project") ?? "");
  if (!isSafeProjectId(project)) {
    return NextResponse.redirect(new URL("/connect?error=project", origin));
  }
  const jar = await cookies();
  let sessionId: string | null = null;
  try {
    sessionId = openSessionId(jar.get(SESSION_COOKIE)?.value, requireSessionSecret());
  } catch {
    sessionId = null;
  }
  const session = sessionId ? await readSession(sessionId) : null;
  if (!session || !sessionId) return NextResponse.redirect(new URL("/sign-in?next=/connect", origin));
  await setPendingProject(sessionId, project);
  return NextResponse.redirect(new URL("/connect/review", origin));
}
