import type { AppData } from "@/lib/data/types";

export function SourceBadge({ source }: { source: AppData["source"] | "connected" }) {
  const label = source === "demo" ? "Sample data" : source === "connected" ? "Connected" : "Live";
  return (
    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
      {label}
    </span>
  );
}
