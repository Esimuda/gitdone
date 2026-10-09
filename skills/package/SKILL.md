---
name: package
description: Package stage of the GitDone issue-to-production flow. Use when tests passed and the container image for this change must be identified.
---

# Package

Record the container image GitLab CI built for this change. The image is produced by the `package` job in `.gitlab-ci.yml`, which pushes to the GitLab Container Registry. Do not invent a second build path.

## Find the image

The `package` job runs on merge request pipelines and on `main`. It tags `$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA` and logs a line `gitdone-package image=...`.

With `gitlab_api_get`, read the latest merge request pipeline (`/projects/:id/merge_requests/:iid/pipelines`), then its jobs (`/projects/:id/pipelines/:pipeline_id/jobs`). Find the `package` job. The image is `registry.gitlab.com/<project path>:<the pipeline sha>`.

Do not call the Container Registry API. The flow token is refused there (403 insufficient_scope), and the job status is the evidence.

If the package job is still running, read the pipeline again until it finishes. If it failed, read the job trace (`/projects/:id/jobs/:job_id/trace`) and fix the Dockerfile or build only when the failure is in this change. If the API refuses, say so in the stage summary and final answer `stop`.

## Record

Set `package` to `passed` with the image reference in `summary`. Do not put registry passwords in the note.

## Finish

Final answer is exactly `continue` or `stop`.
