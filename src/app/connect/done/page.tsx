import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SetupChecklist } from "@/components/setup-checklist";
import { readSetupSignals, setupChecklist } from "@/lib/connect/checklist";
import { projectById } from "@/lib/connect/db";
import { GitlabApi } from "@/lib/connect/gitlab-api";
import { mayViewProject } from "@/lib/connect/access";
import { projectAccessLevel } from "@/lib/connect/membership";
import { gitlabBaseUrl } from "@/lib/connect/oauth";
import { currentViewer } from "@/lib/connect/session";

export const metadata: Metadata = { title: "Project connected" };

export default async function DonePage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const viewer = await currentViewer();
  if (!viewer) redirect("/sign-in?next=/connect");
  const query = await searchParams;
  const id = Number(query.project);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const project = await projectById(id);
  if (!project) notFound();
  const level =
    project.ownerGitlabUserId === viewer.gitlabUserId
      ? 50
      : await projectAccessLevel(new GitlabApi(gitlabBaseUrl(), viewer.token), project.gitlabProjectId);
  if (!mayViewProject({ viewerGitlabUserId: viewer.gitlabUserId, ownerGitlabUserId: project.ownerGitlabUserId, accessLevel: level })) {
    notFound();
  }
  let signals = { mrState: null as string | null, flowEnabled: false, noteTokenSet: false };
  try {
    signals = await readSetupSignals(new GitlabApi(gitlabBaseUrl(), viewer.token), project);
  } catch {
    signals = { mrState: null, flowEnabled: false, noteTokenSet: false };
  }
  const steps = setupChecklist({
    webUrl: project.webUrl,
    mergeRequestUrl: project.mergeRequestUrl,
    ...signals,
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-xs tracking-[0.16em] text-primary uppercase">One merge request</p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight">Three steps left in GitLab</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {project.path} is connected. The ticks update from GitLab. Ship issues after that stop at Merge, and you approve
        with one click.
      </p>
      <SetupChecklist steps={steps} />
      <Link href={`/projects/${project.id}`} className="mt-8 inline-flex h-11 items-center rounded-full border border-border px-5 text-sm">
        Open mission control
      </Link>
    </div>
  );
}
