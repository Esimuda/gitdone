"use client";

import { useMemo, useState } from "react";

export function ProjectPicker({
  projects,
}: {
  projects: { id: number; name: string; path: string }[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => `${project.name} ${project.path}`.toLowerCase().includes(needle));
  }, [projects, query]);

  return (
    <form action="/api/connect/choose" method="post" className="mt-8">
      <label className="block text-sm" htmlFor="project-search">
        Search your GitLab projects
        <input
          id="project-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="group/project"
          autoComplete="off"
          className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm"
        />
      </label>
      <div className="mt-4 max-h-80 space-y-2 overflow-auto">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            {projects.length === 0
              ? "No Developer projects came back yet. GitDone lists the projects where this account can open a merge request."
              : "No project matches that search."}
          </p>
        ) : (
          filtered.map((project) => (
            <label key={project.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm hover:border-primary/50">
              <input type="radio" name="project" value={project.path} required className="accent-[#FC6D26]" />
              <span>
                <span className="block font-medium">{project.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{project.path}</span>
              </span>
            </label>
          ))
        )}
      </div>
      <button
        type="submit"
        className="mt-5 inline-flex h-12 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
      >
        Review prerequisites
      </button>
    </form>
  );
}
