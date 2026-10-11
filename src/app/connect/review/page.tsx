import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GitlabApi } from "@/lib/connect/gitlab-api";
import { inspectProject } from "@/lib/connect/install";
import { checksPass, type Check } from "@/lib/connect/prerequisites";
import { gitlabBaseUrl } from "@/lib/connect/oauth";
import { currentViewer } from "@/lib/connect/session";

export const metadata: Metadata = { title: "Review project" };

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string; error?: string }>;
}) {
  const viewer = await currentViewer();
  if (!viewer) redirect("/sign-in?next=/connect");
  if (!viewer.pendingProject) redirect("/connect");
  const query = await searchParams;
  const api = new GitlabApi(gitlabBaseUrl(), viewer.token);
  let failure = query.error === "gitlab" ? "GitLab refused the install request." : "";
  let checks: Check[] = [];
  let projectName = viewer.pendingProject;
  try {
    const inspected = await inspectProject(api, viewer.pendingProject);
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
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Developer access and Duo Agent Platform. The install stays closed until both pass.
      </p>
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
