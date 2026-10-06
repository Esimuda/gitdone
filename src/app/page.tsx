import Link from "next/link";
import { StageRail } from "@/components/stage-rail";
import { PRODUCT_NAME } from "@/config/brand";
import { getAppData } from "@/lib/data";
import { formatDuration, touchLabel } from "@/lib/format";
import { STAGE_BLURB, STAGE_LABEL } from "@/lib/data/stages";
import { flagshipJourney, leadTimeMinutes, spotlightJourney } from "@/lib/data/metrics";
import { STAGE_IDS } from "@/lib/data/types";

export default async function HomePage() {
  const data = await getAppData();
  if (data.source === "error") return null;
  const spotlight = spotlightJourney(data.journeys);
  const flagship = flagshipJourney(data.journeys);
  const flagshipLead = flagship ? leadTimeMinutes(flagship) : null;
  const { overview } = data;

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <p className="text-xs tracking-[0.18em] text-primary uppercase">Hands-off DevSecOps</p>
          <h1 className="mt-4 max-w-xl text-4xl font-medium tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
            Open an issue. Come back to a release.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {PRODUCT_NAME} is the public face of a single GitLab Duo flow. A small open-source or Web3 community
            labels one issue. The flow carries it through all nine DevSecOps stages, deploys it, publishes the GitLab
            Release, and drafts the post.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/mission"
              className="inline-flex h-12 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Open mission control
            </Link>
            <Link
              href="/releases"
              className="inline-flex h-12 items-center rounded-full border border-border px-5 text-sm font-medium"
            >
              Read the releases
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Label the issue ship. Then walk away.</p>
        </div>
        {spotlight ? (
          <div className="rounded-3xl border border-border bg-card/90 p-4 shadow-[0_30px_80px_-48px_rgba(252,109,38,0.7)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                  {data.project.name} · #{spotlight.issueIid}
                </p>
                <p className="mt-1 text-sm font-medium">{spotlight.title}</p>
              </div>
              <Link href={`/mission/${spotlight.issueIid}`} className="text-sm text-primary hover:underline">
                Follow
              </Link>
            </div>
            <StageRail stages={spotlight.stages} />
          </div>
        ) : null}
      </section>

      <section className="border-y border-border bg-card/50">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border md:grid-cols-4">
          <Metric
            label="Last zero-touch ship"
            value={flagshipLead !== null ? formatDuration(flagshipLead) : "—"}
            hint={flagship ? `#${flagship.issueIid} opened to production` : "No ship yet"}
          />
          <Metric
            label="Median lead time"
            value={overview.leadTimeMinutes !== null ? formatDuration(overview.leadTimeMinutes) : "—"}
            hint={`${overview.leadTimeSample} ships in the sample`}
          />
          <Metric
            label="Human touches"
            value={overview.humanInterventions === null ? "—" : String(overview.humanInterventions)}
            hint={`${overview.zeroTouchShips} of ${overview.shipsWithTouchData} ships with none`}
          />
          <Metric
            label="Stage coverage"
            value={`${overview.stageCoverage}/${overview.stageCount}`}
            hint={`${overview.findingsResolved} findings closed by the agent`}
          />
        </dl>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-3xl font-medium tracking-tight">The maintainer is also the release manager.</h2>
        </div>
        <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            On a 400-star library the person who reviews grants is the person who tags the release, usually late, from
            a laptop. The changelog is a sentence in a commit. The scan runs when someone remembers. The community
            hears about it because a link got pasted into Discord.
          </p>
          <p>
            {PRODUCT_NAME} keeps the public record those communities are missing: what shipped, what the agent did at
            each stage, and a post that is ready to paste. The humans stay on the work. The loop does the rest.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="text-xs tracking-[0.18em] text-muted-foreground uppercase">All nine stages, one flow</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAGE_IDS.map((id, index) => (
            <li key={id} className="rounded-2xl border border-border bg-card p-4">
              <p className="num text-xs text-primary">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-lg font-medium">{STAGE_LABEL[id]}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{STAGE_BLURB[id]}</p>
            </li>
          ))}
        </ol>
      </section>

      {flagship ? (
        <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-border bg-card p-6">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Latest quiet ship</p>
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
            <h2 className="mt-3 text-2xl font-medium tracking-tight">A changelog, and the post already drafted.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Each release keeps notes for X, Discord, and Telegram, with a copy button and an RSS feed. No one has to
              write the announcement after the deploy.
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

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-background px-4 py-5 sm:px-6">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num mt-2 text-2xl font-medium tracking-tight sm:text-3xl">{value}</dd>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
