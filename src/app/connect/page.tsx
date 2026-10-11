import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConnectForm } from "@/components/connect-form";
import { ProjectPicker } from "@/components/project-picker";
import { PRODUCT_NAME } from "@/config/brand";
import { listOwnedProjects } from "@/lib/connect/db";
import { GitlabApi } from "@/lib/connect/gitlab-api";
import { listDeveloperProjects } from "@/lib/connect/membership";
import { gitlabBaseUrl, tokenPasteAllowed } from "@/lib/connect/oauth";
import { currentViewer } from "@/lib/connect/session";

export const metadata: Metadata = { title: "Connect" };

const AFTER = [
  { n: "01", title: "Enable the flow", body: "Turn GitDone on from the AI Catalog. The ship label is the trigger." },
  { n: "02", title: "Merge the install", body: "One merge request adds the flow, the skills, and the CI include." },
  { n: "03", title: "Set one CI variable", body: "GITDONE_NOTE_TOKEN lets the pipeline write the approval note." },
];

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const viewer = await currentViewer();
  if (!viewer) redirect("/sign-in?next=/connect");
  const query = await searchParams;
  const owned = await listOwnedProjects(viewer.gitlabUserId);
  let projects: { id: number; name: string; path: string }[] = [];
  try {
    projects = await listDeveloperProjects(new GitlabApi(gitlabBaseUrl(), viewer.token));
  } catch {
    projects = [];
  }
  const first = owned.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs tracking-[0.22em] text-primary uppercase">{first ? "First project" : "Another project"}</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-medium tracking-[-0.04em] text-balance sm:text-6xl sm:leading-[0.98]">
        {first ? "Connect your first project" : "Connect another project"}
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Pick a GitLab project where you are a Developer. {PRODUCT_NAME} opens one install merge request. Agents do
        everything up to the merge. You approve with one click.
      </p>
      {query.error === "project" ? <p className="mt-4 text-sm text-danger">That project id is not one GitDone will use.</p> : null}
      <ProjectPicker projects={projects} />
      <ol className="mt-12 grid gap-3 md:grid-cols-3">
        {AFTER.map((step) => (
          <li key={step.n} className="rounded-2xl border border-border bg-background p-5">
            <p className="num text-xs text-primary">{step.n}</p>
            <h2 className="mt-2 text-lg font-medium">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
      {tokenPasteAllowed() ? (
        <section className="mt-10 max-w-xl rounded-3xl border border-border p-6">
          <h2 className="text-lg font-medium">Local token paste</h2>
          <p className="mt-2 text-sm text-muted-foreground">Enabled only because GITDONE_ALLOW_TOKEN_PASTE is true.</p>
          <div className="mt-4">
            <ConnectForm />
          </div>
        </section>
      ) : null}
    </div>
  );
}
