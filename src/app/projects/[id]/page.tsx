import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { mayViewProject } from "@/lib/connect/access";
import { projectById } from "@/lib/connect/db";
import { GitlabApi } from "@/lib/connect/gitlab-api";
import { projectAccessLevel } from "@/lib/connect/membership";
import { gitlabBaseUrl } from "@/lib/connect/oauth";
import { currentViewer } from "@/lib/connect/session";
import { loadProjectForViewer } from "@/lib/connect/workspace";
import { formatDuration } from "@/lib/format";
import { currentStage, journeyState, leadTimeMinutes } from "@/lib/data/metrics";
import { STAGE_LABEL } from "@/lib/data/stages";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Project ${id}` };
}

export default async function ProjectMissionPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (!viewer) redirect(`/sign-in?next=/projects/${id}`);
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
  const data = loaded?.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">Mission control</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">{project.name}</h1>
        {project.ownerGitlabUserId === viewer.gitlabUserId ? (
          <Link href={`/projects/${project.id}/settings`} className="text-sm text-primary hover:underline">
            Project settings
          </Link>
        ) : null}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {project.path}. Agents stop at the merge request. You approve with one click.
      </p>
      {!data ? (
        <p className="mt-10 text-sm text-muted-foreground">{loaded?.message || "GitLab could not be read for this project."}</p>
      ) : data.journeys.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No ship issues yet. Open one from the ship template after the flow is enabled.</p>
      ) : (
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-3xl border border-border">
          {data.journeys.map((journey) => {
            const stage = currentStage(journey);
            const lead = leadTimeMinutes(journey);
            return (
              <li key={journey.issueIid}>
                <Link href={`/projects/${project.id}/${journey.issueIid}`} className="block bg-card px-5 py-4 hover:bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    #{journey.issueIid} · {journeyState(journey)}
                    {stage ? ` · ${STAGE_LABEL[stage.stage]}` : ""}
                  </p>
                  <p className="mt-1 font-medium">{journey.title}</p>
                  <p className="num mt-1 text-xs text-muted-foreground">{lead !== null ? formatDuration(lead) : "Live"}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
