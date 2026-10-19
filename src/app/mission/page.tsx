import Link from "next/link";
import type { Metadata } from "next";
import { MissionViz } from "@/components/mission-viz";
import { OvernightPath } from "@/components/overnight-path";
import { StageRail } from "@/components/stage-rail";
import { OVERNIGHT_HEADLINE, PRODUCT_NAME } from "@/config/brand";
import { getAppData } from "@/lib/data";
import { formatDuration, formatTimestamp, touchLabel } from "@/lib/format";
import { currentStage, flagshipJourney, journeyState, leadTimeMinutes, shippedAt, spotlightJourney } from "@/lib/data/metrics";
import { STAGE_LABEL } from "@/lib/data/stages";
import type { StageRecord } from "@/lib/data/types";

export const metadata: Metadata = { title: "Mission control" };

export default async function MissionPage() {
  const data = await getAppData();
  if (data.source === "error") return null;
  const { overview, tallies } = data;
  const spotlight = spotlightJourney(data.journeys);
  const spotlightLive = spotlight ? journeyState(spotlight) === "In flight" : false;
  const flagship = flagshipJourney(data.journeys);
  const leads = data.journeys
    .map((journey) => {
      const minutes = leadTimeMinutes(journey);
      const completed = shippedAt(journey) ?? journey.createdAt;
      return minutes === null ? null : { label: journey.releaseTag ?? `#${journey.issueIid}`, minutes, completed };
    })
    .filter((point): point is { label: string; minutes: number; completed: string } => point !== null)
    .sort((a, b) => a.completed.localeCompare(b.completed));
  const feed = data.journeys
    .flatMap((journey) =>
      journey.stages
        .filter((stage) => stage.completedAt && stage.summary)
        .map((stage) => ({
          at: formatTimestamp(stage.completedAt ?? ""),
          iso: stage.completedAt ?? "",
          iid: journey.issueIid,
          title: journey.title,
          stage: STAGE_LABEL[stage.stage],
          summary: stage.summary,
        })),
    )
    .sort((a, b) => b.iso.localeCompare(a.iso))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">
        Mission control · {PRODUCT_NAME} ships {PRODUCT_NAME}
      </p>
      <h1 className="mt-3 max-w-4xl text-4xl font-medium tracking-tight text-balance sm:text-5xl">{OVERNIGHT_HEADLINE}</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Every ship issue on {data.project.path}. Lead time runs from the issue opening to production. A rollback is
        counted on its own.
      </p>
      {flagship ? <OvernightPath journey={flagship} /> : null}

      <dl className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Tile
          label="Issue to production"
          value={overview.leadTimeMinutes !== null ? formatDuration(overview.leadTimeMinutes) : "—"}
          hint={`Median of ${overview.leadTimeSample} ships`}
        />
        <Tile
          label="Human interventions"
          value={overview.humanInterventions === null ? "—" : String(overview.humanInterventions)}
          hint={`${overview.zeroTouchShips} zero-touch ships`}
        />
        <Tile
          label="Stage coverage"
          value={`${overview.stageCoverage}/${overview.stageCount}`}
          hint={`${overview.shipped} shipped · ${overview.inFlight} in flight`}
        />
        <Tile
          label="Rollbacks"
          value={String(overview.rollbacks)}
          hint={overview.rollbacks ? "Traffic shifted to the previous revision" : "The guard has held"}
        />
        <Tile
          label="Findings auto-resolved"
          value={String(overview.findingsResolved)}
          hint={overview.findingsOpen ? `${overview.findingsOpen} still open` : "None left open"}
        />
      </dl>

      <MissionViz
        leads={leads}
        heat={tallies.map((tally) => ({ stage: tally.stage, passed: tally.passed, running: tally.running }))}
        zeroTouch={overview.zeroTouchShips}
        touched={Math.max(0, overview.shipsWithTouchData - overview.zeroTouchShips)}
        feed={feed}
      />

      {spotlight ? (
        <section className="mt-10 rounded-3xl border border-border bg-card p-5 shadow-[0_30px_80px_-48px_rgba(252,109,38,0.65)] sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                {spotlightLive ? "In flight" : "Latest ship"} · #{spotlight.issueIid}
              </p>
              <h2 className="mt-1 text-xl font-medium tracking-tight">{spotlight.title}</h2>
            </div>
            <Link href={`/mission/${spotlight.issueIid}`} className="text-sm text-primary hover:underline">
              Open
            </Link>
          </div>
          <StageRail stages={spotlight.stages} />
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm font-medium">Issues</h2>
        {data.journeys.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No issues yet. Open one with the ship label.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-3xl border border-border">
            {data.journeys.map((journey) => {
              const stage = currentStage(journey);
              const lead = leadTimeMinutes(journey);
              const state = journeyState(journey);
              return (
                <li key={journey.issueIid}>
                  <Link
                    href={`/mission/${journey.issueIid}`}
                    className="grid gap-3 bg-card px-4 py-4 transition hover:bg-muted/60 sm:grid-cols-[1fr_auto] sm:px-5"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        <span className="num">#{journey.issueIid}</span>
                        <span className={state === "Rolled back" ? " text-danger" : ""}> · {state}</span>
                        {stage ? ` · ${STAGE_LABEL[stage.stage]}` : ""}
                      </p>
                      <p className="mt-1 font-medium tracking-tight">{journey.title}</p>
                      <StageTrack stages={journey.stages} />
                    </div>
                    <div className="text-sm text-muted-foreground sm:text-right">
                      <p className="num">{lead !== null ? formatDuration(lead) : "Live"}</p>
                      <p className="mt-1">{touchLabel(journey.humanTouches)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StageTrack({ stages }: { stages: StageRecord[] }) {
  return (
    <p className="mt-3 flex items-center" aria-hidden>
      {stages.map((record, index) => {
        const rolled = record.stage === "rollback" && record.status !== "pending";
        const dot = rolled
          ? "bg-danger"
          : record.status === "passed"
            ? "bg-primary"
            : record.status === "running"
              ? "bg-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_30%,transparent)] motion-safe:animate-pulse"
              : record.status === "attention"
                ? "bg-danger"
                : "bg-border";
        const line = rolled ? "bg-danger/70" : record.status === "passed" ? "bg-primary/70" : "bg-border";
        return (
          <span key={record.stage} className="flex min-w-0 flex-1 items-center">
            <span className={`size-2 shrink-0 rounded-full ${dot}`} />
            {index < stages.length - 1 ? <span className={`mx-1 h-px min-w-1 flex-1 ${line}`} /> : null}
          </span>
        );
      })}
    </p>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num mt-2 text-3xl font-medium tracking-tight">{value}</dd>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
