"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { CopyButton } from "@/components/copy-button";
import type { Announcements } from "@/lib/data/types";

const TABS = [
  { id: "x", label: "X", limit: 280 },
  { id: "discord", label: "Discord" },
  { id: "telegram", label: "Telegram" },
] as const;

export function AnnouncementPanel({ announcements }: { announcements: Announcements }) {
  return (
    <Tabs.Root defaultValue="x">
      <Tabs.List className="flex gap-1 rounded-full border border-border bg-muted p-1" aria-label="Announcement format">
        {TABS.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            className="h-10 flex-1 rounded-full text-sm font-medium text-muted-foreground transition data-[state=active]:bg-card data-[state=active]:text-foreground"
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {TABS.map((tab) => {
        const text = announcements[tab.id];
        return (
          <Tabs.Content key={tab.id} value={tab.id} className="mt-3 focus:outline-none">
            <pre className="max-h-64 overflow-auto rounded-2xl border border-border bg-background p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {text}
            </pre>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="num text-xs text-muted-foreground">
                {text.length} characters
                {tab.id === "x" ? ` · ${text.length <= 280 ? "fits" : "over"} 280` : ""}
              </p>
              <CopyButton text={text} label={`Copy ${tab.label} post`} />
            </div>
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}
