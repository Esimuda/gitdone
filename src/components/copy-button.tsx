"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 1600);
  }

  const message = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label;

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium transition hover:border-primary",
        className,
      )}
    >
      {state === "copied" ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
      <span aria-live="polite">{message}</span>
    </button>
  );
}
