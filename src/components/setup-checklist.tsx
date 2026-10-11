import type { SetupStep } from "@/lib/connect/checklist";

export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  return (
    <ol className="mt-8 space-y-3">
      {steps.map((step) => (
        <li key={step.id} className="rounded-2xl border border-border bg-card px-4 py-4">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${step.done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
              aria-hidden
            >
              {step.done ? "✓" : ""}
            </span>
            <div>
              <p className="text-sm font-medium">
                {step.label}
                <span className="ml-2 text-xs font-normal tracking-wide text-muted-foreground uppercase">
                  {step.done ? "Done" : "Open"}
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
              <a href={step.href} className="mt-2 inline-flex text-sm text-primary hover:underline">
                Open in GitLab
              </a>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
