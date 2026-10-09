import { UserCheck } from "lucide-react";
import { formatTimestamp } from "@/lib/format";
import type { StageRecord } from "@/lib/data/types";

export function ApprovalSlip({ stage }: { stage: StageRecord }) {
  const when = stage.completedAt || stage.startedAt;
  return (
    <section className="mt-8 overflow-hidden rounded-[1.75rem] border border-primary/40 bg-card shadow-[0_30px_80px_-46px_rgba(252,109,38,0.85)]">
      <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <UserCheck className="size-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs tracking-[0.18em] text-primary uppercase">The one human touch</p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-balance sm:text-3xl">{stage.summary}</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Agents do everything up to the merge. This is the click that let the pipeline publish, deploy, and write
            the rest of the record.
          </p>
          <p className="num mt-4 text-xs text-muted-foreground">{when ? formatTimestamp(when) : "Time not recorded"}</p>
        </div>
      </div>
    </section>
  );
}
