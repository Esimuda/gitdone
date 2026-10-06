import Link from "next/link";
import type { Metadata } from "next";
import { getAppData } from "@/lib/data";
import { formatDuration, touchLabel } from "@/lib/format";
import { currentStage, isInFlight, isShipped, leadTimeMinutes } from "@/lib/data/metrics";
import { STAGE_LABEL } from "@/lib/data/stages";
import { STAGE_IDS } from "@/lib/data/types";

export const metadata: Metadata = { title: "Mission control" };

export default async function MissionPage() {
  const data = await getAppData();
  if (data.source === "error") return null;
  const { overview, tallies } = data;
  const maxPassed = Math.max(1, ...tallies.map((tally) => tally.passed));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">{data.project.name}</p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">Mission control</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Every labelled issue, and where the agent is with it. Lead time is measured from the issue opening to
        production.
      </p>

      <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          label="Findings auto-resolved"
          value={String(overview.findingsResolved)}
          hint={overview.findingsOpen ? `${overview.findingsOpen} still open` : "None left open"}
        />
      </dl>

      <section className="mt-10 rounded-3xl border border-border bg-card p-5 sm:p-6" aria-label="Stage coverage">
        <h2 className="text-sm font-medium">Where work has passed</h2>
        <ul className="mt-4 space-y-3">
          {tallies.map((tally) => (
            <li key={tally.stage} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
              <span>{STAGE_LABEL[tally.stage]}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(tally.passed / maxPassed) * 100}%` }}
                />
              </span>
              <span className="num text-xs text-muted-foreground">
                {tally.passed} passed{tally.running ? ` · ${tally.running} live` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium">Issues</h2>
        {data.journeys.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No issues yet. Open one with the ship label.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-3xl border border-border">
            {data.journeys.map((journey) => {
              const stage = currentStage(journey);
              const lead = leadTimeMinutes(journey);
              const state = isShipped(journey) ? "Shipped" : isInFlight(journey) ? "In flight" : "Waiting";
              return (
                <li key={journey.issueIid}>
                  <Link
                    href={`/mission/${journey.issueIid}`}
                    className="grid gap-3 bg-card px-4 py-4 transition hover:bg-muted/60 sm:grid-cols-[1fr_auto] sm:px-5"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        <span className="num">#{journey.issueIid}</span> · {state}
                        {stage ? ` · ${STAGE_LABEL[stage.stage]}` : ""}
                      </p>
                      <p className="mt-1 font-medium tracking-tight">{journey.title}</p>
                      <p className="mt-2 flex flex-wrap gap-1" aria-hidden>
                        {STAGE_IDS.map((id) => {
                          const record = journey.stages.find((item) => item.stage === id);
                          const color =
                            record?.status === "passed"
                              ? "bg-primary"
                              : record?.status === "running"
                                ? "bg-accent"
                                : record?.status === "attention"
                                  ? "bg-danger"
                                  : "bg-border";
                          return <span key={id} className={`size-1.5 rounded-full ${color}`} />;
                        })}
                      </p>
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

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num mt-2 text-3xl font-medium tracking-tight">{value}</dd>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
