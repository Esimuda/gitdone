import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApprovalSlip } from "@/components/approval-slip";
import { JourneyConsole } from "@/components/journey-console";
import { mayViewProject } from "@/lib/connect/access";
import { projectById } from "@/lib/connect/db";
import { GitlabApi } from "@/lib/connect/gitlab-api";
import { projectAccessLevel } from "@/lib/connect/membership";
import { gitlabBaseUrl } from "@/lib/connect/oauth";
import { currentViewer } from "@/lib/connect/session";
import { loadProjectForViewer } from "@/lib/connect/workspace";
import { formatDuration, formatTimestamp, touchLabel } from "@/lib/format";
import { leadTimeMinutes } from "@/lib/data/metrics";
import { stageById } from "@/lib/data/stages";

type Params = { id: string; iid: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { iid } = await params;
  return { title: `Issue #${iid}` };
}

export default async function ProjectJourneyPage({ params }: { params: Promise<Params> }) {
  const { id, iid } = await params;
  const viewer = await currentViewer();
  if (!viewer) redirect(`/sign-in?next=/projects/${id}/${iid}`);
  const project = await projectById(Number(id));
  if (!project) notFound();
  const level =
    project.ownerGitlabUserId === viewer.gitlabUserId
      ? 50
      : await projectAccessLevel(new GitlabApi(gitlabBaseUrl(), viewer.token), project.gitlabProjectId);
  if (!mayViewProject({ viewerGitlabUserId: viewer.gitlabUserId, ownerGitlabUserId: project.ownerGitlabUserId, accessLevel: level })) {
    notFound();
  }
  const loaded = await loadProjectForViewer(id, viewer.token);
  const journey = loaded?.data?.journeys.find((item) => String(item.issueIid) === iid);
  if (!journey) notFound();
  const approval = stageById(journey.stages, "approval");
  const lead = leadTimeMinutes(journey);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link href={`/projects/${project.id}`} className="text-sm text-muted-foreground hover:text-foreground">
        {project.name}
      </Link>
      <p className="mt-6 text-xs tracking-[0.16em] text-primary uppercase">Issue #{journey.issueIid}</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl">{journey.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{journey.description}</p>
      <p className="num mt-4 text-sm text-muted-foreground">
        {lead !== null ? formatDuration(lead) : "In flight"} · {touchLabel(journey.humanTouches)}
        {journey.createdAt ? ` · ${formatTimestamp(journey.createdAt)}` : ""}
      </p>
      {approval && approval.status === "passed" ? <ApprovalSlip stage={approval} /> : null}
      <JourneyConsole stages={journey.stages} />
    </div>
  );
}
