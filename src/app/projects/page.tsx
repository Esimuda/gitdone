import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { accessTokenForUser, currentAccount } from "@/lib/connect/session";
import { visibleProjects } from "@/lib/connect/visible";

export const metadata: Metadata = { title: "Your projects" };

export default async function ProjectsPage() {
  const account = await currentAccount();
  if (!account) redirect("/sign-in?next=/projects");
  const token = await accessTokenForUser(account.gitlabUserId);
  const projects = await visibleProjects(account.gitlabUserId, token);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">Mission control</p>
      {projects.length === 0 ? (
        <>
          <h1 className="mt-3 max-w-3xl text-4xl font-medium tracking-tight sm:text-5xl">Connect your first project</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Signed-in mission control is empty until a GitLab project is connected. The public GitDone showcase stays on
            the landing page.
          </p>
          <Link href="/connect" className="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
            Connect your first project
          </Link>
        </>
      ) : (
        <>
          <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">Your projects</h1>
          <ul className="mt-8 divide-y divide-border overflow-hidden rounded-3xl border border-border">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}`} className="block bg-card px-5 py-4 hover:bg-muted/50">
                  <p className="font-medium">{project.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{project.path}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
