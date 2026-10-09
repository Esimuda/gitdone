import type { AppData } from "@/lib/data/types";

export function SourceBadge({ source }: { source: AppData["source"] }) {
  const sample = source === "demo";
  return (
    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
      {sample ? "Sample data" : "Live"}
    </span>
  );
}
