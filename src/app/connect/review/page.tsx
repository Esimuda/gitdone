import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { GitlabApi } from "@/lib/connect/gitlab-api";
import { SESSION_COOKIE } from "@/lib/connect/http";
import { inspectProject } from "@/lib/connect/install";
import { checksPass, type Check } from "@/lib/connect/prerequisites";
import { gitlabBaseUrl } from "@/lib/connect/oauth";
import { sessionToken } from "@/lib/connect/session";

export const metadata: Metadata = { title: "Review project" };

type ProjectChoice = { id: number; path_with_namespace: string; name: string };

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string; error?: string }>;
}) {
  const query = await searchParams;
  const jar = await cookies();
  const session = sessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-medium tracking-tight">Sign in first</h1>
        <Link href="/connect" className="mt-4 inline-flex text-sm text-primary">
          Back to connect
        </Link>
      </div>
    );
  }

  const api = new GitlabApi(gitlabBaseUrl(), session.token);
  if (!session.pendingProject) {
    let projects: ProjectChoice[] = [];
    try {
      projects = await api.get<ProjectChoice[]>(
        "/api/v4/projects?membership=true&simple=true&min_access_level=30&per_page=20",
      );
    } catch {
      projects = [];
    }
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-medium tracking-tight">Choose a project</h1>
        <p className="mt-3 text-sm text-muted-foreground">Developer access or higher. The token stays on the server.</p>
        <form action="/api/connect/choose" method="post" className="mt-6 space-y-3">
          {projects.length === 0 ? <p className="text-sm">No projects were visible to this token.</p> : null}
          {projects.map((project) => (
            <label key={project.id} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
              <input type="radio" name="project" value={project.path_with_namespace} required />
              <span>
                <span className="font-medium">{project.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{project.path_with_namespace}</span>
              </span>
            </label>
          ))}
          <button type="submit" className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
            Review prerequisites
          </button>
        </form>
      </div>
    );
  }

  let failure = query.error === "gitlab" ? "GitLab refused the install request." : "";
  let checks: Check[] = [];
  let projectName = session.pendingProject;
  try {
    const inspected = await inspectProject(api, session.pendingProject);
    checks = inspected.checks;
    projectName = inspected.project.path_with_namespace;
  } catch {
    failure = failure || "GitLab could not be read for that project.";
  }
  const ready = checks.length > 0 && checksPass(checks);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-xs tracking-[0.16em] text-primary uppercase">Prerequisites</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">{projectName}</h1>
      {query.blocked ? <p className="mt-3 text-sm text-danger">Install stays closed until both checks pass.</p> : null}
      {failure ? <p className="mt-3 text-sm text-danger">{failure}</p> : null}
      <ul className="mt-6 space-y-3">
        {checks.map((check) => (
          <li key={check.id} className="rounded-2xl border border-border px-4 py-3">
            <p className="text-sm font-medium">
              {check.ok ? "Ready" : "Blocked"} · {check.label}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{check.detail}</p>
          </li>
        ))}
      </ul>
      {ready ? (
        <form action="/api/connect/install" method="post" className="mt-6">
          <button type="submit" className="inline-flex h-12 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
            Open the install merge request
          </button>
        </form>
      ) : null}
    </div>
  );
}
