import { describe, expect, it } from "vitest";
import { filterVisibleProjects, mayViewProject, selectableProjects } from "./access";
import type { StoredProject } from "./db";

function project(partial: Partial<StoredProject> & Pick<StoredProject, "id" | "ownerGitlabUserId" | "gitlabProjectId">): StoredProject {
  return {
    path: "group/app",
    name: "App",
    webUrl: "https://gitlab.example/group/app",
    mergeRequestUrl: null,
    mergeRequestIid: null,
    isPublic: false,
    ...partial,
  };
}

describe("project access", () => {
  const owned = project({ id: 1, ownerGitlabUserId: "a", gitlabProjectId: "10", name: "Owned" });
  const other = project({ id: 2, ownerGitlabUserId: "b", gitlabProjectId: "20", name: "Theirs" });

  it("hides another user's project unless the viewer is a Developer there", () => {
    expect(mayViewProject({ viewerGitlabUserId: "a", ownerGitlabUserId: "b", accessLevel: 20 })).toBe(false);
    expect(mayViewProject({ viewerGitlabUserId: "a", ownerGitlabUserId: "b", accessLevel: null })).toBe(false);
    expect(mayViewProject({ viewerGitlabUserId: "a", ownerGitlabUserId: "a", accessLevel: null })).toBe(true);
    expect(mayViewProject({ viewerGitlabUserId: "a", ownerGitlabUserId: "b", accessLevel: 30 })).toBe(true);

    const hidden = filterVisibleProjects([owned, other], "a", { "20": 10 });
    expect(hidden.map((item) => item.id)).toEqual([1]);
    const shared = filterVisibleProjects([owned, other], "a", { "20": 40 });
    expect(shared.map((item) => item.id)).toEqual([1, 2]);
  });

  it("offers only Developer projects in the picker", () => {
    const picked = selectableProjects([
      { id: 1, name: "Low", path_with_namespace: "acme/low", accessLevel: 20 },
      { id: 2, name: "Ok", path_with_namespace: "acme/ok", accessLevel: 30 },
    ]);
    expect(picked.map((item) => item.path)).toEqual(["acme/ok"]);
  });
});
