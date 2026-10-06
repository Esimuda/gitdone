import type { AppData } from "@/lib/data/types";

export function SourceBanner({ data }: { data: AppData }) {
  if (data.source === "demo") {
    return (
      <p className="border-b border-primary/30 bg-primary/10 px-4 py-2 text-center text-xs leading-relaxed sm:text-sm">
        <span className="font-medium">Demo data.</span> Seeded project {data.project.name}. Set GITLAB_TOKEN and
        GITLAB_PROJECT_ID to read a live GitLab project.
      </p>
    );
  }
  return (
    <p className="border-b border-border bg-muted/70 px-4 py-2 text-center text-xs sm:text-sm">
      <span className="font-medium">Live.</span> Reading {data.project.path} from GitLab.
      {data.warning ? ` ${data.warning}` : ""}
    </p>
  );
}
