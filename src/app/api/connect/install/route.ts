import { NextResponse } from "next/server";
import { saveProject } from "@/lib/connect/db";
import { GitlabApi } from "@/lib/connect/gitlab-api";
import { limited, publicOrigin, sameOrigin } from "@/lib/connect/http";
import { installGitDone } from "@/lib/connect/install";
import { mergeRequestIid } from "@/lib/connect/checklist";
import { gitlabBaseUrl } from "@/lib/connect/oauth";
import { currentViewer } from "@/lib/connect/session";

export async function POST(request: Request) {
  const origin = publicOrigin(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  const blocked = await limited(request);
  if (blocked) return blocked;
  const session = await currentViewer();
  if (!session?.pendingProject) return NextResponse.redirect(new URL("/sign-in?next=/connect", origin));
  try {
    const api = new GitlabApi(gitlabBaseUrl(), session.token);
    const result = await installGitDone(api, session.pendingProject, session.token);
    if (!result.ok) return NextResponse.redirect(new URL("/connect/review?blocked=1", origin));
    const id = await saveProject({
      gitlabProjectId: String(result.project.id),
      path: result.project.path_with_namespace,
      name: result.project.name,
      webUrl: result.project.web_url,
      ownerGitlabUserId: session.gitlabUserId,
      token: session.token,
      mergeRequestUrl: result.mergeRequestUrl,
      mergeRequestIid: mergeRequestIid(result.mergeRequestUrl),
    });
    return NextResponse.redirect(new URL(`/connect/done?project=${id}`, origin));
  } catch {
    return NextResponse.redirect(new URL("/connect/review?error=gitlab", origin));
  }
}
