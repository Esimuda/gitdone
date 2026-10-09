import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadConnected } from "@/lib/connect/workspace";
import { journeyState, leadTimeMinutes } from "@/lib/data/metrics";
import { formatDuration } from "@/lib/format";
import { STAGE_LABEL } from "@/lib/data/stages";
import { currentStage } from "@/lib/data/metrics";

type Params = { projectId: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { projectId } = await params;
  const loaded = await loadConnected(projectId);
  return { title: loaded ? loaded.project.name : "Workspace" };
}

export default async function WorkspacePage({ params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const loaded = await loadConnected(projectId);
  if (!loaded) notFound();
  const { project, data } = loaded;
  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-4xl font-medium tracking-tight">{project.name}</h1>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground">
          {loaded.message || "GitLab could not be read for this project."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">Public workspace</p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">{project.name}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {project.path}. Read only. Agents stop at the merge request. A person approves with one click, and this page
        shows the record.
      </p>
      {data.journeys.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No ship issues yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-3xl border border-border">
          {data.journeys.map((journey) => {
            const stage = currentStage(journey);
            const lead = leadTimeMinutes(journey);
            return (
              <li key={journey.issueIid}>
                <Link href={`/w/${project.id}/${journey.issueIid}`} className="block bg-card px-5 py-4 hover:bg-muted/50">
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
