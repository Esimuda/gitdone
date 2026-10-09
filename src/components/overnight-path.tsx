import { stageById } from "@/lib/data/stages";
import type { Journey } from "@/lib/data/types";

function clock(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

const COPY = [
  { id: "created", label: "Finding", detail: "A CI token is in the production image." },
  { id: "create", label: "Patched", detail: "The build-arg is gone. The merge request is open." },
  { id: "verify", label: "Checked", detail: "The pipeline is green. The new image is clean." },
  { id: "configure", label: "Deployed", detail: "Cloud Run is serving the clean revision." },
  { id: "govern", label: "Announced", detail: "The release note is ready before morning." },
] as const;

export function OvernightPath({ journey }: { journey: Journey }) {
  const beats = COPY.map((beat) => {
    const when =
      beat.id === "created" ? journey.createdAt : stageById(journey.stages, beat.id)?.completedAt;
    return { ...beat, time: clock(when) };
  });

  return (
    <ol className="mt-10 grid gap-3 sm:grid-cols-5">
      {beats.map((beat, index) => (
        <li
          key={beat.label}
          className={`relative rounded-2xl border bg-card/80 p-4 ${
            index === 0
              ? "border-danger/40"
              : index === beats.length - 1
                ? "border-primary/50"
                : "border-border"
          }`}
        >
          {index < beats.length - 1 ? (
            <span className="absolute top-7 -right-3 hidden h-px w-3 bg-border sm:block" aria-hidden />
          ) : null}
          <p className="num text-xs text-primary">{beat.time} UTC</p>
          <h2 className="mt-2 text-lg font-medium tracking-tight">{beat.label}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{beat.detail}</p>
        </li>
      ))}
    </ol>
  );
}
