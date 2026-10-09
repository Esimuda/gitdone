// Writes release-notes.md and release.env for the release:publish job.
// Tag: v<major>.<minor>.<pipeline iid> from package.json, so every merge to main
// gets a unique, increasing tag without a commit back to the repo.
// Notes: the description of the merge request that produced this commit, read
// from the public API (the project is public, so no token is needed).
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const [major, minor] = version.split(".");
const tag = `v${major}.${minor}.${process.env.CI_PIPELINE_IID}`;

const api = process.env.CI_API_V4_URL;
const project = process.env.CI_PROJECT_ID;
const sha = process.env.CI_COMMIT_SHA;

let notes = `## Changed\n\n- ${process.env.CI_COMMIT_TITLE ?? "Update"}\n`;
try {
  const res = await fetch(`${api}/projects/${project}/repository/commits/${sha}/merge_requests`);
  if (res.ok) {
    const mrs = await res.json();
    const mr = mrs.find((m) => m.state === "merged") ?? mrs[0];
    if (mr) {
      const body = (mr.description ?? "").trim();
      notes = `${body || notes}\n\nMerge request: ${mr.web_url}\n`;
    }
  } else {
    console.log(`merge request lookup returned ${res.status}, using the commit title`);
  }
} catch (err) {
  console.log(`merge request lookup failed: ${err}`);
}

writeFileSync("release-notes.md", notes);
writeFileSync("release.env", `RELEASE_TAG=${tag}\n`);
console.log(`gitdone-release tag=${tag}`);
