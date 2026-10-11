import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SetupChecklist } from "@/components/setup-checklist";
import { readSetupSignals, setupChecklist } from "@/lib/connect/checklist";
import { projectById } from "@/lib/connect/db";
import { GitlabApi } from "@/lib/connect/gitlab-api";
import { gitlabBaseUrl } from "@/lib/connect/oauth";
import { currentViewer } from "@/lib/connect/session";

type Params = { id: string };

export const metadata: Metadata = { title: "Project settings" };

export default async function ProjectSettingsPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (!viewer) redirect(`/sign-in?next=/projects/${id}/settings`);
  const project = await projectById(Number(id));
  if (!project || project.ownerGitlabUserId !== viewer.gitlabUserId) notFound();
  let signals = { mrState: null as string | null, flowEnabled: false, noteTokenSet: false };
  try {
    signals = await readSetupSignals(new GitlabApi(gitlabBaseUrl(), viewer.token), project);
  } catch {
    signals = { mrState: null, flowEnabled: false, noteTokenSet: false };
  }
  const steps = setupChecklist({ webUrl: project.webUrl, mergeRequestUrl: project.mergeRequestUrl, ...signals });

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Link href={`/projects/${project.id}`} className="text-sm text-muted-foreground hover:text-foreground">
        {project.name}
      </Link>
      <h1 className="mt-4 text-4xl font-medium tracking-tight">Project settings</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {project.path}. The public workspace is off until you turn it on. Judges can still read the GitDone showcase
        without an account.
      </p>
      <form action={`/api/projects/${project.id}/public`} method="post" className="mt-6 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium">{project.isPublic ? "Public read-only workspace is on" : "Workspace is private"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.isPublic ? `Anyone can open /w/${project.id}.` : "Only signed-in Developers on this GitLab project can open mission control."}
        </p>
        <input type="hidden" name="public" value={project.isPublic ? "0" : "1"} />
        <button type="submit" className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
          {project.isPublic ? "Make it private" : "Publish the read-only workspace"}
        </button>
      </form>
      <SetupChecklist steps={steps} />
    </div>
  );
}
