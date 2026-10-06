import type { ReactNode } from "react";
import { CommandPalette, type PaletteItem } from "@/components/command-palette";
import { ErrorState } from "@/components/error-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SourceBanner } from "@/components/source-banner";
import type { DataResult } from "@/lib/data/types";

function paletteItems(data: Exclude<DataResult, { source: "error" }>): PaletteItem[] {
  return [
    { href: "/", label: "Home", hint: "Overview", group: "Pages" },
    { href: "/mission", label: "Mission control", hint: "Stages", group: "Pages" },
    { href: "/releases", label: "Releases", hint: "Changelog", group: "Pages" },
    ...data.journeys.map((journey) => ({
      href: `/mission/${journey.issueIid}`,
      label: `#${journey.issueIid} ${journey.title}`,
      hint: journey.state,
      group: "Journeys" as const,
    })),
    ...data.releases.map((release) => ({
      href: `/releases/${encodeURIComponent(release.tag)}`,
      label: release.tag,
      hint: release.title,
      group: "Releases" as const,
    })),
  ];
}

export function Shell({ data, children }: { data: DataResult; children: ReactNode }) {
  const ok = data.source !== "error";
  return (
    <>
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      {ok ? <SourceBanner data={data} /> : null}
      <main id="content" className="flex-1">
        {ok ? children : <ErrorState message={data.message} />}
      </main>
      <SiteFooter />
      {ok ? <CommandPalette items={paletteItems(data)} /> : null}
    </>
  );
}
