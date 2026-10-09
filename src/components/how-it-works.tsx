import { GitBranch, Megaphone, Tag } from "lucide-react";

const STEPS = [
  {
    icon: Tag,
    title: "Label one issue",
    body: "Open it from the ship template. The label is the only instruction the flow needs.",
  },
  {
    icon: GitBranch,
    title: "One agent crosses nine stages",
    body: "Plan through govern, in order. After the deploy it watches health and error rate, and sends traffic back if they degrade.",
  },
  {
    icon: Megaphone,
    title: "Come back to a release",
    body: "The changelog is published and the X, Discord, and Telegram posts are already drafted.",
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
