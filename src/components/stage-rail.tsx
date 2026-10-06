"use client";

import { motion, useReducedMotion } from "framer-motion";
import { STAGE_LABEL } from "@/lib/data/stages";
import type { StageRecord } from "@/lib/data/types";

export function StageRail({ stages, compact = false }: { stages: StageRecord[]; compact?: boolean }) {
  const reduce = useReducedMotion();
  const activeIndex = stages.findIndex((stage) => stage.status === "running" || stage.status === "attention");
  const lastPassed = stages.reduce((index, stage, current) => (stage.status === "passed" ? current : index), -1);
  const target = activeIndex >= 0 ? activeIndex : Math.max(lastPassed, 0);
  const progress = stages.length <= 1 ? 1 : target / (stages.length - 1);
  const current = stages[target];
  const caption = current
    ? `${STAGE_LABEL[current.stage]} · ${target + 1} of ${stages.length}`
    : "No stages";

  return (
    <div>
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:hidden">{caption}</p>
      <div className="relative">
        <div className="pointer-events-none absolute top-[0.7rem] right-[8%] left-[8%] hidden h-px bg-border sm:block" />
        <motion.div
          className="pointer-events-none absolute top-[0.7rem] left-[8%] hidden h-px origin-left bg-gradient-to-r from-primary to-accent sm:block"
          style={{ width: "84%" }}
          initial={false}
          animate={{ scaleX: progress }}
          transition={{ duration: reduce ? 0 : 1.15, ease: [0.22, 1, 0.36, 1] }}
        />
        <ol className="relative grid grid-cols-3 gap-y-4 sm:grid-cols-9">
          {stages.map((stage, index) => {
            const label = STAGE_LABEL[stage.stage];
            const on = stage.status === "passed" || stage.status === "running" || stage.status === "attention";
            return (
              <li key={stage.stage} className="flex flex-col items-center text-center">
                <span
                  className={`relative z-10 size-6 rounded-full border ${
                    stage.status === "running"
                      ? "border-accent bg-accent shadow-[0_0_0_6px_color-mix(in_oklab,var(--accent)_25%,transparent)] motion-safe:animate-pulse"
                      : stage.status === "attention"
                        ? "border-danger bg-danger"
                        : stage.status === "passed"
                          ? "border-primary bg-primary"
                          : "border-border bg-card"
                  }`}
                  aria-hidden
                />
                <span className={`mt-2 text-[11px] tracking-wide ${on ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
                <span className="sr-only">
                  {label}, {stage.status}, stage {index + 1}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {current && !compact ? (
        <p className="mt-5 font-mono text-xs leading-relaxed text-muted-foreground sm:text-sm">
          <span className="text-accent">agent</span>
          <span className="mx-2 text-border">/</span>
          <span className="text-foreground">{STAGE_LABEL[current.stage]}.</span> {current.summary || "Waiting."}
        </p>
      ) : null}
    </div>
  );
}
