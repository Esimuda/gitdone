# Day-1 capability test

Run this on the GitLab project after the repository is pushed, the flow YAML is saved in the AI Catalog, and the trigger is enabled. Sample data in the app is not evidence. Record each result on the issue you open for the test.

Day 1 showed the designed category is **Supervised**. The flow planned, coded, opened a merge request, passed CI, and packaged with no human. GitLab then blocked the merge (`Quick actions merge cannot be used with AI workflows`, merge API 403) and the flow token cannot create releases. One human Merge click is the product. The pipeline publishes the release and posts the `approval` stage.

## Before you start

- Maintainer pastes [`.gitlab/duo/flows/issue-to-production.yml`](../.gitlab/duo/flows/issue-to-production.yml) into **AI > Flows > New flow** and enables it on this project.
- Trigger: **Work item**, action **Created**. A mention trigger is the way to re-run a stopped flow.
- `GITLAB_TOKEN` inside the flow is the service account token. It is not the token in GitDone’s `.env`.
- CI variables from [`.gitlab-ci.yml`](../.gitlab-ci.yml) are set, including both Cloud Run service names and both service URLs. Google Cloud is connected with Workload Identity, not a JSON key.
- GitDone is deployed, or running locally with `GITLAB_TOKEN` and `GITLAB_PROJECT_ID` both set, so the hub reads this project instead of sample data.

## Hands-off attempt

Open one issue from [`.gitlab/issue_templates/Ship.md`](../.gitlab/issue_templates/Ship.md). The template applies the `ship` label. Use a change you can recognise, for example a sentence in the README. Then check these in order.

| Step | Pass looks like | If it fails |
| --- | --- | --- |
| Label trigger | Creating the issue starts the flow without a mention. The plan note appears on the issue. | Confirm the trigger is Work item created, the label is exactly `ship`, and the flow is enabled. The plan skill skips issues without that label. |
| MR creation | One merge request exists, its description references the issue, and the branch is pushed. | Read the Create log. A missing tool or a 401 on the repository API stops the flow. Do not open a second MR by hand until you have decided to use the fallback below. |
| Pipeline wait | The merge request pipeline finishes. Verify records the pipeline id and does not mark itself passed while the pipeline is still running. | If the agent marks Verify passed with no pipeline URL, that is a fail. |
| Ready to merge | The flow posts Ready to merge on the issue and the merge request, then stops. It does not call the merge API. | A flow that merges, or that ends without the note, is a fail. The merge API 403 is expected if it tries. |
| Deploy | The default-branch pipeline copies the image and deploys staging, then production. `GET /api/health` on staging returned 200. Configure names the production revision. | Placeholder `REPLACE_WITH_*` variables and a missing `STAGING_SERVICE_URL` fail here. The Cloud Run component pin `@0.1.0` is unverified until this job is green. |
| Notes | The newest `<!-- journey:v1 -->` note on the issue parses in GitDone. Stages match what actually happened. | If the hub says stages are inferred, the note is missing or invalid. See [`journey-schema.md`](journey-schema.md). |
| Release | After the human Merge click, `release:publish` creates the GitLab Release with `CI_JOB_TOKEN`. `journey:record` posts `approval` with who merged and when. | The flow token cannot `POST /releases`. If `journey:record` returns 401, set `GITDONE_NOTE_TOKEN`. |
| Rollback guard | Job `rollback-guard` ran after `deploy-production` and logged `gitdone-rollback action=hold` when health stayed up. | The job is allowed to exit 1 only when it rolled traffic back. A red job on a healthy service is a fail. `identity: google_cloud` is unverified until this job can call `gcloud`. |

Do not force a bad production deploy on day 1. The hold log is the check. A rollback drill belongs on staging, after the hold path is proven, and only if you can afford the previous revision to take traffic.

## The one click

1. Read the Ready to merge note. Merge that request in the GitLab UI. Do not grant the flow a token that can merge.
2. The default-branch pipeline publishes the release and posts the `approval` stage. `humanTouches` becomes 1. The summary names who merged.
3. Deploy stays off until `GCP_DEPLOY` is `true` and Google Cloud is connected. The rollback guard is part of that include, not part of the agent flow.

A single clarifying question in Plan, when the issue cannot be planned, is still the only designed touch. A permission failure is not that question.
