import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp } from "@/components/count-up";
import { HowItWorks } from "@/components/how-it-works";
import { OvernightPath } from "@/components/overnight-path";
import { PipelineVisual } from "@/components/pipeline-visual";
import { STAGE_ICON } from "@/components/stage-icons";
import { OVERNIGHT_HEADLINE, PRODUCT_NAME } from "@/config/brand";
import { getAppData } from "@/lib/data";
import { formatDuration, touchLabel } from "@/lib/format";
import { STAGE_BLURB, STAGE_LABEL } from "@/lib/data/stages";
import { didRollback, flagshipJourney, leadTimeMinutes } from "@/lib/data/metrics";
import { STAGE_IDS } from "@/lib/data/types";

export default async function HomePage() {
  const data = await getAppData();
  if (data.source === "error") return null;
  const flagship = flagshipJourney(data.journeys);
  const flagshipLead = flagship ? leadTimeMinutes(flagship) : null;
  const rolledBack = data.journeys.find((journey) => didRollback(journey));
  const { overview } = data;

  return (
    <div>
      <section className="hero-atmosphere">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-6 sm:pt-24">
          <p className="text-xs tracking-[0.22em] text-primary uppercase">
            {PRODUCT_NAME} ships {PRODUCT_NAME}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-medium tracking-[-0.04em] text-balance sm:text-6xl sm:leading-[0.98]">
            {OVERNIGHT_HEADLINE}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            One issue on this repository. Nobody was at the keyboard. The flow patched the leak, proved the image was
            clean, deployed it, and left the morning post written.
          </p>
          {flagship ? <OvernightPath journey={flagship} /> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/mission"
              className="inline-flex h-12 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_16px_40px_-18px_rgba(252,109,38,0.9)]"
            >
              Open mission control
            </Link>
            <Link
              href="/releases"
              className="inline-flex h-12 items-center rounded-full border border-border bg-card/70 px-5 text-sm font-medium"
            >
              Read the releases
            </Link>
          </div>
          <div className="mt-12">
            <PipelineVisual />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Label the issue ship. The rollback guard watches the deploy for five minutes after that.
            {rolledBack ? (
              <>
                {" "}
                <Link href={`/mission/${rolledBack.issueIid}`} className="text-primary hover:underline">
                  One deploy has already been sent back.
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-card/50">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border md:grid-cols-4">
          <Metric
            label="Last zero-touch ship"
            value={
              flagshipLead !== null ? <CountUp value={flagshipLead} kind="duration" /> : "—"
            }
            hint={flagship ? `#${flagship.issueIid} opened to production` : "No ship yet"}
          />
          <Metric
            label="Median lead time"
            value={
              overview.leadTimeMinutes !== null ? (
                <CountUp value={overview.leadTimeMinutes} kind="duration" />
              ) : (
                "—"
              )
            }
            hint={`${overview.leadTimeSample} ships in the sample`}
          />
          <Metric
            label="Human touches"
            value={
              overview.humanInterventions === null ? "—" : <CountUp value={overview.humanInterventions} />
            }
            hint={`${overview.zeroTouchShips} of ${overview.shipsWithTouchData} ships with none`}
          />
          <Metric
            label="Stage coverage"
            value={
              <>
                <CountUp value={overview.stageCoverage} />/{overview.stageCount}
              </>
            }
            hint={`${overview.findingsResolved} findings closed by the agent`}
          />
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-xs tracking-[0.18em] text-muted-foreground uppercase">How it works</h2>
        <p className="mt-3 max-w-xl text-3xl font-medium tracking-tight sm:text-4xl">Three moves. Then you can leave.</p>
        <HowItWorks />
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-3xl font-medium tracking-tight">The maintainer is also the release manager.</h2>
        </div>
        <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            The same person who merges the fix is the person who would have been asleep at 02:14. A pipeline can build
            an image. It cannot read the finding, open the merge request, and write down what it did. That is the
            flow.
          </p>
          <p>
            {PRODUCT_NAME} is the public record of that flow on its own repository: the overnight path, the journeys,
            and the post that was ready before morning. If the new revision degrades, the guard puts the previous one
            back and reopens the issue.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="text-xs tracking-[0.18em] text-muted-foreground uppercase">All nine stages, one flow</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAGE_IDS.map((id, index) => {
            const Icon = STAGE_ICON[id];
            return (
              <li key={id} className="rounded-2xl border border-border bg-card p-4 shadow-[0_18px_40px_-32px_rgba(107,79,187,0.55)]">
                <div className="flex items-center justify-between">
                  <p className="num text-xs text-primary">{String(index + 1).padStart(2, "0")}</p>
                  <Icon className="size-4 text-primary" aria-hidden />
                </div>
                <h3 className="mt-3 text-lg font-medium">{STAGE_LABEL[id]}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{STAGE_BLURB[id]}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {flagship ? (
        <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-border bg-card p-6">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">The overnight ship</p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight">{flagship.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{flagship.description}</p>
            <p className="num mt-5 text-sm">
              {flagshipLead !== null ? formatDuration(flagshipLead) : "—"} · {touchLabel(flagship.humanTouches)}
              {flagship.releaseTag ? ` · ${flagship.releaseTag}` : ""}
            </p>
            <Link href={`/mission/${flagship.issueIid}`} className="mt-5 inline-flex text-sm text-primary hover:underline">
              Open the journey
            </Link>
          </article>
          <article className="rounded-3xl border border-border p-6">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">What the community sees</p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight">The morning post, already drafted.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The release keeps notes for X, Discord, and Telegram. Copy them when you wake up. The flow does not post
              them for you.
            </p>
            <Link href="/releases" className="mt-5 inline-flex text-sm text-primary hover:underline">
              Open the release hub
            </Link>
          </article>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return (
    <div className="bg-background px-4 py-5 sm:px-6">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num mt-2 text-2xl font-medium tracking-tight sm:text-3xl">{value}</dd>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
