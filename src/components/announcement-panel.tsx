"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo";
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
      <Tabs.List className="flex gap-1 rounded-full border border-border bg-muted/80 p-1" aria-label="Announcement format">
        {TABS.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            className="h-10 flex-1 rounded-full text-sm font-medium text-muted-foreground transition data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="x" className="mt-3 focus:outline-none">
        <PostFrame>
          <header className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <div>
              <p className="text-sm font-medium">
                Git<span className="text-[#FC6D26]">Done</span>
              </p>
              <p className="text-xs text-muted-foreground">@gitdone</p>
            </div>
          </header>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{announcements.x}</p>
          <Footer text={announcements.x} label="Copy X post" limit={280} />
        </PostFrame>
      </Tabs.Content>
      <Tabs.Content value="discord" className="mt-3 focus:outline-none">
        <div className="rounded-2xl border border-border bg-[#1a1520] p-4 text-[#f4efe8]">
          <header className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#6B4FBB] text-xs font-medium">G</span>
            <p className="text-sm font-medium text-[#FC6D26]">GitDone</p>
            <span className="rounded bg-[#6B4FBB] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white">BOT</span>
          </header>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-[#f4efe8]/90">{announcements.discord}</p>
          <Footer text={announcements.discord} label="Copy Discord post" light />
        </div>
      </Tabs.Content>
      <Tabs.Content value="telegram" className="mt-3 focus:outline-none">
        <div className="rounded-2xl border border-border bg-[linear-gradient(180deg,#12324a,#0e2436)] p-4">
          <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-[#1c4b6e] px-3 py-2 text-[#f4efe8]">
            <p className="text-xs font-medium text-[#FC6D26]">GitDone</p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{announcements.telegram}</p>
          </div>
          <Footer text={announcements.telegram} label="Copy Telegram post" light />
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}

function PostFrame({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-border bg-background p-4 shadow-[0_18px_40px_-32px_rgba(252,109,38,0.8)]">{children}</div>;
}

function Footer({ text, label, limit, light = false }: { text: string; label: string; limit?: number; light?: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className={`num text-xs ${light ? "text-white/60" : "text-muted-foreground"}`}>
        {text.length} characters
        {limit ? ` · ${text.length <= limit ? "fits" : "over"} ${limit}` : ""}
      </p>
      <CopyButton text={text} label={label} />
    </div>
  );
}
