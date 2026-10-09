export type Check = {
  id: "access" | "duo";
  label: string;
  ok: boolean;
  detail: string;
};

export type GitlabProjectAccess = {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  permissions?: {
    project_access?: { access_level?: number } | null;
    group_access?: { access_level?: number } | null;
  };
};

export function accessLevel(project: GitlabProjectAccess): number {
  const direct = project.permissions?.project_access?.access_level ?? 0;
  const group = project.permissions?.group_access?.access_level ?? 0;
  return Math.max(direct, group);
}

export function prerequisiteReport(input: {
  level: number;
  duoEnabled: boolean | null;
  duoDetail?: string;
}): Check[] {
  const accessOk = input.level >= 30;
  return [
    {
      id: "access",
      label: "Developer access",
      ok: accessOk,
      detail: accessOk
        ? `Access level ${input.level}. Developer can open the install merge request and click Merge later.`
        : `Access level ${input.level || "unknown"}. GitDone needs Developer (30) on the project.`,
    },
    {
      id: "duo",
      label: "Duo Agent Platform",
      ok: input.duoEnabled === true,
      detail:
        input.duoEnabled === true
          ? "Duo workflows are enabled for this project."
          : input.duoDetail || "GitLab did not report Duo Agent Platform as enabled.",
    },
  ];
}

export function checksPass(checks: Check[]): boolean {
  return checks.every((check) => check.ok);
}
