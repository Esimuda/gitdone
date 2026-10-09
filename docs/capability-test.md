# Day-1 capability test

Run this on the GitLab project after the repository is pushed, the flow YAML is saved in the AI Catalog, and the trigger is enabled. Sample data in the app is not evidence. Record each result on the issue you open for the test.

The happy path has no human approval. Supervised mode is the fallback when a permission blocks the service account, not the way the loop is designed to run.

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
| Merge permission | The service account merges the merge request. The journey note says `humanTouches` is still 0. | A 401 or 403 on the merge API is the expected day-1 failure mode. Stop and use the Supervised fallback. Do not record the run as hands-off. |
| Deploy | The default-branch pipeline copies the image and deploys staging, then production. `GET /api/health` on staging returned 200. Configure names the production revision. | Placeholder `REPLACE_WITH_*` variables and a missing `STAGING_SERVICE_URL` fail here. The Cloud Run component pin `@0.1.0` is unverified until this job is green. |
| Notes | The newest `<!-- journey:v1 -->` note on the issue parses in GitDone. Stages match what actually happened. | If the hub says stages are inferred, the note is missing or invalid. See [`journey-schema.md`](journey-schema.md). |
| Release | A GitLab Release exists, the description has changelog headings, and GitDone shows the tag and the drafted posts. | A 401 on the Release API is the same class of failure as merge. Use the fallback. Do not publish the release by hand and call the flow finished. |
| Rollback guard | Job `rollback-guard` ran after `deploy-production` and logged `gitdone-rollback action=hold` when health stayed up. | The job is allowed to exit 1 only when it rolled traffic back. A red job on a healthy service is a fail. `identity: google_cloud` is unverified until this job can call `gcloud`. |

Do not force a bad production deploy on day 1. The hold log is the check. A rollback drill belongs on staging, after the hold path is proven, and only if you can afford the previous revision to take traffic.

## Supervised fallback

Use this when merge, release, or the production deploy returns 401 or 403 for the service account.

1. Stop calling that run hands-off. Set `humanTouches` to the number of actions a person had to take, and quote what the person did in `touchNotes`.
2. Switch the flow to supervised execution if the project offers it, so a person confirms each action. If that switch is not available, a maintainer performs the blocked step once: merge the merge request, or publish the release, and nothing else.
3. Re-run the rest of the flow with the mention trigger. Do not start a second flow. GitLab does not allow a flow to start another flow.
4. Grant the service account the missing permission (merge on the default branch, release creation, or `roles/run.admin` for the traffic shift). Write the permission you added on the issue.
5. The next `ship` issue is the real test. It should finish with `humanTouches` 0, a release, a journey note, and `rollback-guard` logging `action=hold`.

A single clarifying question in Plan, when the issue cannot be planned, is still the only designed touch. A permission failure is not that question.
