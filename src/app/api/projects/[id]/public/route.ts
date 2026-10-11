import { NextResponse } from "next/server";
import { projectById, setProjectPublic } from "@/lib/connect/db";
import { limited, publicOrigin, sameOrigin } from "@/lib/connect/http";
import { currentAccount } from "@/lib/connect/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const origin = publicOrigin(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  const blocked = await limited(request);
  if (blocked) return blocked;
  const account = await currentAccount();
  const { id } = await context.params;
  const projectId = Number(id);
  if (!account || !Number.isInteger(projectId)) {
    return NextResponse.redirect(new URL("/sign-in?next=/projects", origin));
  }
  const project = await projectById(projectId);
  if (!project || project.ownerGitlabUserId !== account.gitlabUserId) {
    return NextResponse.redirect(new URL("/projects", origin));
  }
  const form = await request.formData();
  const isPublic = String(form.get("public") ?? "") === "1";
  await setProjectPublic(projectId, account.gitlabUserId, isPublic);
  return NextResponse.redirect(new URL(`/projects/${projectId}/settings`, origin));
}
