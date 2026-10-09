import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ErrorState } from "@/components/error-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, type HeaderProject } from "@/components/site-header";
import { getDb, listProjects, readSession } from "@/lib/connect/db";
import { SESSION_COOKIE } from "@/lib/connect/http";
import type { DataResult } from "@/lib/data/types";

async function projectsForSession(): Promise<HeaderProject[]> {
  try {
    const jar = await cookies();
    const session = readSession(getDb(), jar.get(SESSION_COOKIE)?.value);
    if (!session) return [];
    return listProjects(getDb(), session.gitlabUserId).map((project) => ({
      id: project.id,
      name: project.name,
      path: project.path,
    }));
  } catch {
    return [];
  }
}

export async function Shell({ data, children }: { data: DataResult; children: ReactNode }) {
  const ok = data.source !== "error";
  const projects = await projectsForSession();
  return (
    <>
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader source={ok ? data.source : undefined} projects={projects} />
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
