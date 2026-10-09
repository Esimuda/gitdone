import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getDb, projectById, readSession } from "@/lib/connect/db";
import { SESSION_COOKIE } from "@/lib/connect/http";
import { setupLinks } from "@/lib/connect/install-plan";

export const metadata: Metadata = { title: "Project connected" };

export default async function DonePage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const query = await searchParams;
  const id = Number(query.project);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const jar = await cookies();
  const session = readSession(getDb(), jar.get(SESSION_COOKIE)?.value);
  const project = projectById(getDb(), id);
  if (!project || !session || project.ownerGitlabUserId !== session.gitlabUserId) notFound();
  const links = setupLinks(project.webUrl);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-xs tracking-[0.16em] text-primary uppercase">One merge request</p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight">Merge the install, then enable the flow</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {project.path} is connected. The agents are not running until you enable the flow. Ship issues after that stop
        at Merge, and you approve with one click.
      </p>
      <ol className="mt-6 space-y-3 text-sm">
        {project.mergeRequestUrl ? (
          <li>
            <a href={project.mergeRequestUrl} className="text-primary hover:underline">
              Open the install merge request
            </a>
          </li>
        ) : null}
        <li>
          <a href={links.catalog} className="text-primary hover:underline">
            Enable GitDone in the AI Catalog
          </a>
        </li>
        <li>
          <a href={links.automate} className="text-primary hover:underline">
            Confirm the trigger on the project
          </a>
        </li>
        <li>
          <a href={links.variables} className="text-primary hover:underline">
            Set CI variables, including GCP_DEPLOY when you deploy
          </a>
        </li>
      </ol>
      <Link href={`/w/${project.id}`} className="mt-8 inline-flex h-11 items-center rounded-full border border-border px-5 text-sm">
        Open the workspace
      </Link>
    </div>
  );
}
