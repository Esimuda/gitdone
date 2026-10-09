import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApprovalSlip } from "@/components/approval-slip";
import { JourneyConsole } from "@/components/journey-console";
import { getAppData } from "@/lib/data";
import { formatDuration, formatTimestamp, touchLabel } from "@/lib/format";
import { didRollback, leadTimeMinutes } from "@/lib/data/metrics";
import { stageById } from "@/lib/data/stages";

type Params = { iid: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { iid } = await params;
  const data = await getAppData();
  if (data.source === "error") return { title: "Journey" };
  const journey = data.journeys.find((item) => String(item.issueIid) === iid);
  return { title: journey ? `#${journey.issueIid} ${journey.title}` : "Journey" };
}

export default async function JourneyPage({ params }: { params: Promise<Params> }) {
  const { iid } = await params;
  const data = await getAppData();
  if (data.source === "error") return null;
  const journey = data.journeys.find((item) => String(item.issueIid) === iid);
  if (!journey) notFound();
  const lead = leadTimeMinutes(journey);
  const approval = stageById(journey.stages, "approval");
  const provenance =
    journey.provenance === "artifact"
      ? "Recorded by the flow"
      : journey.provenance === "inferred"
        ? "Inferred from GitLab. The flow has not written a journey record yet."
        : "Sample record for this repository";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/mission" className="text-sm text-muted-foreground hover:text-foreground">
        Mission control
      </Link>
      <p className="mt-6 text-xs tracking-[0.16em] text-primary uppercase">Issue #{journey.issueIid}</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl">{journey.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{journey.description}</p>
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Lead time" value={lead !== null ? formatDuration(lead) : "In flight"} />
        <Stat label="Humans" value={touchLabel(journey.humanTouches)} />
        <Stat label="Release" value={journey.releaseTag ?? "—"} />
        <Stat label="Opened" value={formatTimestamp(journey.createdAt).replace(" UTC", "")} />
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        {provenance}
        {journey.author ? ` · opened by ${journey.author}` : ""}
        {journey.labels.length ? ` · ${journey.labels.join(", ")}` : ""}
      </p>
      {journey.touchNotes.length > 0 ? (
        <aside className="mt-4 rounded-2xl border border-border bg-muted/50 p-4 text-sm leading-relaxed">
          {journey.touchNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </aside>
      ) : null}
      {journey.deployUrl ? (
        <p className="mt-4 text-sm">
          <a href={journey.deployUrl} className="text-primary hover:underline" rel="noreferrer">
            {journey.deployUrl.replace(/^https?:\/\//, "")}
          </a>
          {data.source === "demo" ? <span className="text-muted-foreground"> · sample URL</span> : null}
        </p>
      ) : null}
      {approval && approval.status === "passed" ? <ApprovalSlip stage={approval} /> : null}
      {didRollback(journey) ? (
        <p className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-relaxed">
          Rolled back. Production traffic is on the previous revision, and the issue is open again with the evidence.
        </p>
      ) : null}
      <JourneyConsole stages={journey.stages} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="num mt-2 text-lg font-medium tracking-tight sm:text-xl">{value}</dd>
    </div>
  );
}
