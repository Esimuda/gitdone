import { GitBranch, Megaphone, Tag } from "lucide-react";

const STEPS = [
  {
    icon: Tag,
    title: "Label one issue",
    body: "Open it from the ship template. The label is the only instruction the flow needs.",
  },
  {
    icon: GitBranch,
    title: "Agents stop at the merge",
    body: "Plan, code, the merge request, the pipeline, the image, and the security note. Then they post Ready to merge and stop.",
  },
  {
    icon: Megaphone,
    title: "You click Merge",
    body: "That is the only designed touch. The pipeline publishes the release, deploys when you asked it to, and records who approved.",
  },
];

export function HowItWorks() {
  return (
    <ol className="relative mt-8 grid gap-4 lg:grid-cols-3">
      <span className="pointer-events-none absolute top-8 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-primary via-[#E04470] to-accent lg:block" />
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <li
            key={step.title}
            className="how-step relative rounded-3xl border border-border bg-card/80 p-5 shadow-[0_24px_60px_-40px_rgba(107,79,187,0.65)]"
            style={{ animationDelay: `${index * 0.12}s` }}
          >
            <span className="relative z-10 flex size-11 items-center justify-center rounded-2xl border border-border bg-background text-primary shadow-[0_0_0_6px_color-mix(in_oklab,var(--background)_80%,transparent)]">
              <Icon className="size-5" aria-hidden />
            </span>
            <p className="num mt-5 text-xs tracking-[0.16em] text-primary uppercase">0{index + 1}</p>
            <h3 className="mt-2 text-xl font-medium tracking-tight">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
