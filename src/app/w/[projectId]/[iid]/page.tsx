import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApprovalSlip } from "@/components/approval-slip";
import { JourneyConsole } from "@/components/journey-console";
import { loadConnected } from "@/lib/connect/workspace";
import { formatDuration, formatTimestamp, touchLabel } from "@/lib/format";
import { leadTimeMinutes } from "@/lib/data/metrics";
import { stageById } from "@/lib/data/stages";

type Params = { projectId: string; iid: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { iid } = await params;
  return { title: `Issue #${iid}` };
}

export default async function WorkspaceJourneyPage({ params }: { params: Promise<Params> }) {
  const { projectId, iid } = await params;
  const loaded = await loadConnected(projectId);
  if (!loaded?.data) notFound();
  const journey = loaded.data.journeys.find((item) => String(item.issueIid) === iid);
  if (!journey) notFound();
  const approval = stageById(journey.stages, "approval");
  const lead = leadTimeMinutes(journey);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link href={`/w/${loaded.project.id}`} className="text-sm text-muted-foreground hover:text-foreground">
        {loaded.project.name}
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
