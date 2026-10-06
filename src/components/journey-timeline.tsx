import { formatTimestamp } from "@/lib/format";
import { STAGE_BLURB, STAGE_LABEL } from "@/lib/data/stages";
import type { StageRecord } from "@/lib/data/types";

const STATUS_LABEL = {
  passed: "Done",
  running: "Live",
  pending: "Waiting",
  attention: "Needs a look",
} as const;

export function JourneyTimeline({ stages }: { stages: StageRecord[] }) {
  return (
    <ol className="relative space-y-4">
      {stages.map((stage, index) => {
        const live = stage.status === "running";
        return (
          <li key={stage.stage} id={`stage-${stage.stage}`} className="grid grid-cols-[1.25rem_1fr] gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`mt-5 size-3.5 rounded-full border ${
                  live
                    ? "border-accent bg-accent motion-safe:animate-pulse"
                    : stage.status === "passed"
                      ? "border-primary bg-primary"
                      : stage.status === "attention"
                        ? "border-danger bg-danger"
                        : "border-border bg-card"
                }`}
                aria-hidden
              />
              {index < stages.length - 1 ? <span className="mt-2 w-px flex-1 bg-border" aria-hidden /> : null}
            </div>
            <article
              className={`rounded-2xl border p-4 sm:p-5 ${
                live
                  ? "border-accent bg-card shadow-[0_24px_60px_-40px_rgba(110,73,203,0.95)]"
                  : stage.status === "attention"
                    ? "border-danger bg-card"
                    : stage.status === "pending"
                      ? "border-border bg-card/40"
                      : "border-border bg-card"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-medium tracking-tight">
                  <span className="num mr-2 text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  {STAGE_LABEL[stage.stage]}
                </h3>
                <p
                  className={`rounded-full px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase ${
                    live
                      ? "bg-accent/15 text-accent"
                      : stage.status === "passed"
                        ? "bg-primary/15 text-primary"
                        : stage.status === "attention"
                          ? "bg-danger/15 text-danger"
                          : "text-muted-foreground"
                  }`}
                >
                  {STATUS_LABEL[stage.status]}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{STAGE_BLURB[stage.stage]}</p>
              <p className="mt-3 text-sm leading-relaxed">{stage.summary || "Not started."}</p>
              {stage.details.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                  {stage.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
              {stage.security ? (
                <p className="num mt-3 text-sm">
                  {stage.security.found} findings · {stage.security.resolved} resolved by the agent
                </p>
              ) : null}
              {stage.artifacts.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {stage.artifacts.map((artifact) => (
                    <li key={artifact.href + artifact.label}>
                      <a
                        href={artifact.href}
                        className="inline-flex h-9 items-center rounded-full border border-border px-3 text-xs hover:border-primary"
                        rel="noreferrer"
                      >
                        {artifact.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {stage.startedAt ? (
                <p className="num mt-3 text-xs text-muted-foreground">
                  {formatTimestamp(stage.startedAt)}
                  {stage.completedAt ? ` → ${formatTimestamp(stage.completedAt)}` : ""}
                </p>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
