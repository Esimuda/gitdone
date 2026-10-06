"use client";

import { STAGE_LABEL } from "@/lib/data/stages";
import type { StageId } from "@/lib/data/types";

export type LeadPoint = { label: string; minutes: number };
export type HeatCell = { stage: StageId; passed: number; running: number };
export type FeedItem = { at: string; iid: number; title: string; stage: string; summary: string };

export function MissionViz({
  leads,
  heat,
  zeroTouch,
  touched,
  feed,
}: {
  leads: LeadPoint[];
  heat: HeatCell[];
  zeroTouch: number;
  touched: number;
  feed: FeedItem[];
}) {
  const maxLead = Math.max(1, ...leads.map((point) => point.minutes));
  const width = 320;
  const height = 96;
  const points = leads.map((point, index) => {
    const x = leads.length === 1 ? width / 2 : (index / (leads.length - 1)) * width;
    const y = height - (point.minutes / maxLead) * (height - 12) - 6;
    return `${x},${y}`;
  });
  const maxPassed = Math.max(1, ...heat.map((cell) => cell.passed));
  const totalShips = Math.max(1, zeroTouch + touched);
  const circumference = 2 * Math.PI * 38;
  const zeroLength = (zeroTouch / totalShips) * circumference;

  return (
    <div className="mt-8 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_24px_70px_-46px_rgba(252,109,38,0.7)]">
          <h2 className="text-sm font-medium">Lead time</h2>
          <p className="mt-1 text-xs text-muted-foreground">Minutes from issue open to production</p>
          {leads.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No ships yet.</p>
          ) : (
            <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-24 w-full" role="img" aria-label="Lead time trend">
              <polyline
                fill="none"
                stroke="url(#leadStroke)"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points.join(" ")}
              />
              <defs>
                <linearGradient id="leadStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#FC6D26" />
                  <stop offset="1" stopColor="#6B4FBB" />
                </linearGradient>
              </defs>
              {points.map((pair, index) => {
                const [x, y] = pair.split(",");
                return <circle key={leads[index].label} cx={x} cy={y} r="4" fill="#FC6D26" />;
              })}
            </svg>
          )}
          <ol className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            {leads.map((point) => (
              <li key={point.label} className="num">
                {point.label}
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_24px_70px_-46px_rgba(107,79,187,0.75)]">
          <h2 className="text-sm font-medium">Human touches</h2>
          <p className="mt-1 text-xs text-muted-foreground">Ships the agent finished alone</p>
          <div className="mt-3 flex items-center gap-4">
            <svg viewBox="0 0 100 100" className="size-28 shrink-0" role="img" aria-label={`${zeroTouch} of ${totalShips} ships with zero touches`}>
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--muted)" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#FC6D26"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${zeroLength} ${circumference}`}
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="54" textAnchor="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 500 }}>
                {zeroTouch}/{totalShips}
              </text>
            </svg>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-primary" />
                {zeroTouch} zero-touch
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-muted" />
                {touched} with a person
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 sm:col-span-2" aria-label="Stage coverage heat">
          <h2 className="text-sm font-medium">Stage coverage</h2>
          <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-9">
            {heat.map((cell) => {
              const intensity = cell.passed / maxPassed;
              return (
                <li key={cell.stage} className="text-center">
                  <div
                    className="relative h-14 overflow-hidden rounded-2xl border border-border"
                    style={{
                      background: `color-mix(in oklab, var(--primary) ${Math.round(18 + intensity * 72)}%, var(--muted))`,
                    }}
                  >
                    {cell.running > 0 ? (
                      <span className="absolute top-2 right-2 size-2 rounded-full bg-accent motion-safe:animate-pulse" />
                    ) : null}
                    <span className="num absolute inset-x-0 bottom-1.5 text-xs font-medium">{cell.passed}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{STAGE_LABEL[cell.stage]}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Activity</h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.14em] text-primary uppercase">
            <span className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
            Live
          </span>
        </div>
        {feed.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">The agent has not posted a stage yet.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {feed.map((item) => (
              <li key={`${item.iid}-${item.stage}-${item.at}`} className="border-l border-primary/50 pl-3">
                <p className="num text-[11px] text-muted-foreground">
                  {item.at} · #{item.iid} · {item.stage}
                </p>
                <p className="mt-0.5 text-sm leading-snug">{item.summary}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
