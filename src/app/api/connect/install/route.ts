import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, saveProject } from "@/lib/connect/db";
import { GitlabApi } from "@/lib/connect/gitlab-api";
import { limited, publicOrigin, SESSION_COOKIE } from "@/lib/connect/http";
import { installGitDone } from "@/lib/connect/install";
import { gitlabBaseUrl } from "@/lib/connect/oauth";
import { sessionToken } from "@/lib/connect/session";

export async function POST(request: Request) {
  const blocked = limited(request);
  if (blocked) return blocked;
  const origin = publicOrigin(request);
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  const session = sessionToken(sessionId);
  if (!session?.pendingProject) return NextResponse.redirect(new URL("/connect", origin));
  try {
    const api = new GitlabApi(gitlabBaseUrl(), session.token);
    const result = await installGitDone(api, session.pendingProject, session.token);
    if (!result.ok) return NextResponse.redirect(new URL("/connect/review?blocked=1", origin));
    const id = saveProject(getDb(), {
      gitlabProjectId: String(result.project.id),
      path: result.project.path_with_namespace,
      name: result.project.name,
      webUrl: result.project.web_url,
      ownerGitlabUserId: session.gitlabUserId,
      token: session.token,
      mergeRequestUrl: result.mergeRequestUrl,
    });
    return NextResponse.redirect(new URL(`/connect/done?project=${id}`, origin));
  } catch {
    return NextResponse.redirect(new URL("/connect/review?error=gitlab", origin));
  }
}
