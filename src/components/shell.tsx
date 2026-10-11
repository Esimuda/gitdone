import type { ReactNode } from "react";
import { ErrorState } from "@/components/error-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, type HeaderProject, type HeaderViewer } from "@/components/site-header";
import { accessTokenForUser, currentAccount } from "@/lib/connect/session";
import { visibleProjects } from "@/lib/connect/visible";
import type { DataResult } from "@/lib/data/types";

async function headerState(): Promise<{ viewer: HeaderViewer | null; projects: HeaderProject[] }> {
  try {
    const account = await currentAccount();
    if (!account) return { viewer: null, projects: [] };
    const token = await accessTokenForUser(account.gitlabUserId);
    const projects = await visibleProjects(account.gitlabUserId, token);
    return {
      viewer: { name: account.name, username: account.username, avatarUrl: account.avatarUrl },
      projects: projects.map((project) => ({ id: project.id, name: project.name, path: project.path })),
    };
  } catch {
    return { viewer: null, projects: [] };
  }
}

export async function Shell({ data, children }: { data: DataResult; children: ReactNode }) {
  const ok = data.source !== "error";
  const { viewer, projects } = await headerState();
  return (
    <>
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader source={ok ? data.source : undefined} projects={projects} viewer={viewer} />
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
