---
name: configure
description: Configure stage of the GitDone issue-to-production flow. Use when a release exists and the Cloud Run deploy must be confirmed.
---

# Configure

Confirm the image from this release is what production is serving. Deployment is the `deploy-production` job in `.gitlab-ci.yml`, which uses GitLab's Google Cloud Run component and Workload Identity Federation. Do not run `gcloud` with a long-lived key. Do not invent a second deploy.

## Watch

Read the pipeline on the default branch with `gitlab_api_get`. Wait until the production deploy job has succeeded. Record the revision or service URL in `deployUrl` when the API or the job log provides it.

The Cloud Run component's output variable names were not re-checked at runtime. If you cannot see a URL, set `configure` to `passed` only when the deploy job itself succeeded, and put the job URL in `artifacts`. Say that the public URL was not visible.

Staging deploy and the smoke job run before production in the CI file. Do not mark configure passed on a staging-only deploy.

## Finish

Final answer is exactly `continue` or `stop`.
