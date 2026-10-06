---
name: package
description: Package stage of the GitDone issue-to-production flow. Use when tests passed and the container image for this change must be identified.
---

# Package

Record the container image GitLab CI built for this change. The image is produced by the `package` job in `.gitlab-ci.yml`, which pushes to the GitLab Container Registry. Do not invent a second build path.

## Find the image

With `gitlab_api_get`, read the pipeline for the merge request branch. Note the image tag. The CI file tags `$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA`.

If the package job has not finished, wait by reading the pipeline again, then record `running` if it is still going. If it failed, read the job trace if the API allows it and fix the Dockerfile or build only when the failure is in this change. Whether job-trace endpoints are inside the `ai_workflows` token scope was not verified. If the API refuses, say so in the stage summary and final answer `stop`.

## Record

Set `package` to `passed` with the image reference in `summary`. Do not put registry passwords in the note.

## Finish

Final answer is exactly `continue` or `stop`.
