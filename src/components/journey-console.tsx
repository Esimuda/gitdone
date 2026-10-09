"use client";

import { GitPullRequest, Link2, Play, ShieldAlert, Tag, Workflow } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { STAGE_ICON } from "@/components/stage-icons";
import { formatTimestamp } from "@/lib/format";
import { STAGE_BLURB, STAGE_LABEL } from "@/lib/data/stages";
import type { StageRecord } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL = {
  passed: "Done",
  running: "Live",
  pending: "Waiting",
  attention: "Needs a look",
} as const;

function chipIcon(label: string) {
  if (/merge|mr\b/i.test(label)) return GitPullRequest;
  if (/pipeline/i.test(label)) return Workflow;
  if (/scan|sast|secret|security/i.test(label)) return ShieldAlert;
  if (/release/i.test(label)) return Tag;
  return Link2;
}

function isRollback(stage: StageRecord, status: StageRecord["status"]) {
  return stage.stage === "rollback" && status !== "pending";
}

function tone(stage: StageRecord, status: StageRecord["status"]) {
  if (isRollback(stage, status)) return "border-danger shadow-[0_24px_70px_-40px_rgba(159,18,57,0.55)]";
  if (status === "running") return "border-accent shadow-[0_24px_70px_-40px_rgba(107,79,187,0.9)]";
  if (status === "attention") return "border-danger";
  if (status === "passed") return "border-border";
  return "border-border opacity-70";
}

function statusClass(stage: StageRecord, status: StageRecord["status"]) {
  if (isRollback(stage, status) || status === "attention") return "bg-danger/15 text-danger";
  if (status === "running") return "bg-accent/15 text-accent";
  if (status === "passed") return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
}

function statusLabel(stage: StageRecord, status: StageRecord["status"]) {
  if (isRollback(stage, status) && status === "passed") return "Rolled back";
  return STATUS_LABEL[status];
}

export function JourneyConsole({ stages }: { stages: StageRecord[] }) {
  const reduce = useReducedMotion();
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    if (cursor === null || reduce) return;
    if (cursor >= stages.length) return;
    const timer = window.setTimeout(() => setCursor((value) => (value === null ? null : value + 1)), 680);
    return () => window.clearTimeout(timer);
  }, [cursor, reduce, stages.length]);

  function replay() {
    if (reduce) {
      setCursor(null);
      return;
    }
    setCursor(0);
  }

  function shownStatus(stage: StageRecord, index: number): StageRecord["status"] {
    if (cursor === null || cursor >= stages.length) return stage.status;
    if (index < cursor) return "passed";
    if (index === cursor) return "running";
    return "pending";
  }

  const activeIndex =
    cursor !== null && cursor < stages.length
      ? cursor
      : Math.max(
          0,
          stages.findIndex((stage) => stage.status === "running" || stage.status === "attention"),
        );

  const terminal = stages.filter((stage, index) => {
    if (!stage.summary) return false;
    if (cursor === null || cursor >= stages.length) return stage.status !== "pending";
    return index <= cursor;
  });

  return (
    <div className="mt-8 lg:grid lg:grid-cols-[15rem_1fr] lg:items-start lg:gap-8">
      <aside className="sticky top-16 z-30 -mx-4 mb-6 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md lg:top-24 lg:mx-0 lg:mb-0 lg:rounded-3xl lg:border lg:bg-card/90 lg:p-3 lg:shadow-[0_20px_50px_-36px_rgba(252,109,38,0.6)]">
        <div className="mb-2 flex items-center justify-between gap-2 lg:mb-3">
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Stages</p>
          <button
            type="button"
            onClick={replay}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium hover:border-primary"
          >
            <Play className="size-3.5" aria-hidden />
            Replay
          </button>
        </div>
        <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {stages.map((stage, index) => {
            const status = shownStatus(stage, index);
            const Icon = STAGE_ICON[stage.stage];
            const on = status === "passed" || status === "running" || status === "attention";
            return (
              <li key={stage.stage} className="shrink-0 lg:shrink">
                <a
                  href={`#stage-${stage.stage}`}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs lg:w-full lg:rounded-2xl lg:px-3 lg:py-2",
                    index === activeIndex ? "border-primary bg-primary/10 text-foreground" : "border-transparent text-muted-foreground",
                  )}
                  aria-current={index === activeIndex ? "step" : undefined}
                >
                  <Icon className={cn("size-3.5", on ? "text-primary" : "text-muted-foreground")} aria-hidden />
                  <span>{STAGE_LABEL[stage.stage]}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </aside>

      <div>
        <ol className="space-y-4">
          {stages.map((stage, index) => {
            const status = shownStatus(stage, index);
            const Icon = STAGE_ICON[stage.stage];
            const visible = cursor === null || cursor >= stages.length || index <= cursor;
            return (
              <li key={stage.stage} id={`stage-${stage.stage}`} className={cn("scroll-mt-28", visible ? "" : "opacity-40")}>
                <article className={cn("rounded-3xl border bg-card p-4 sm:p-5", tone(stage, status))}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-base font-medium tracking-tight">
                      <span className="flex size-9 items-center justify-center rounded-2xl bg-muted text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="num text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                      {STAGE_LABEL[stage.stage]}
                    </h3>
                    <p className={cn("rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase", statusClass(stage, status))}>
                      {statusLabel(stage, status)}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{STAGE_BLURB[stage.stage]}</p>
                  <p className="mt-2 text-sm leading-relaxed">{stage.summary || "Not started."}</p>
                  {stage.details.length > 0 ? (
                    <details className="mt-3" open={status === "running" || status === "attention"}>
                      <summary className="cursor-pointer text-sm text-primary">Stage notes</summary>
                      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                        {stage.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {stage.security ? (
                    <p className="num mt-3 text-sm">
                      {stage.security.found} findings · {stage.security.resolved} resolved by the agent
                    </p>
                  ) : null}
                  {stage.artifacts.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {stage.artifacts.map((artifact) => {
                        const Chip = chipIcon(artifact.label);
                        return (
                          <li key={artifact.href + artifact.label}>
                            <a
                              href={artifact.href}
                              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium shadow-[0_8px_20px_-16px_rgba(252,109,38,0.9)] hover:border-primary"
                              rel="noreferrer"
                            >
                              <Chip className="size-3.5 text-primary" aria-hidden />
                              {artifact.label}
                            </a>
                          </li>
                        );
                      })}
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

        <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-[#141014] text-[#f6f1ea] shadow-[0_30px_80px_-48px_rgba(107,79,187,0.8)]" aria-label="Agent activity">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-[#FC6D26]" />
            <span className="size-2.5 rounded-full bg-[#E04470]" />
            <span className="size-2.5 rounded-full bg-[#6B4FBB]" />
            <p className="ml-2 font-mono text-[11px] tracking-[0.14em] text-white/60 uppercase">agent</p>
          </div>
          <ol className="max-h-72 space-y-2 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed">
            {terminal.length === 0 ? (
              <li className="text-white/50">waiting for the first stage…</li>
            ) : (
              terminal.map((stage) => (
                <li key={stage.stage}>
                  <span className="text-[#FC6D26]">{STAGE_LABEL[stage.stage].toLowerCase()}</span>
                  <span className="text-white/35"> › </span>
                  <span className="text-white/85">{stage.summary}</span>
                </li>
              ))
            )}
          </ol>
        </section>
      </div>
    </div>
  );
}
