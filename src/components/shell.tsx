import type { ReactNode } from "react";
import { ErrorState } from "@/components/error-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { DataResult } from "@/lib/data/types";

export function Shell({ data, children }: { data: DataResult; children: ReactNode }) {
  const ok = data.source !== "error";
  return (
    <>
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader source={ok ? data.source : undefined} />
      {ok && data.warning ? (
        <p className="border-b border-border px-4 py-2 text-center text-xs text-muted-foreground">{data.warning}</p>
      ) : null}
      <main id="content" className="flex-1">
        {ok ? children : <ErrorState message={data.message} />}
      </main>
      <SiteFooter />
    </>
  );
}
