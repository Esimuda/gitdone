---
name: monitor
description: Monitor stage of the GitDone issue-to-production flow. Use after a production deploy to watch Cloud Run and roll traffic back when it degrades.
---

# Monitor

Watch the production Cloud Run service for `ROLLBACK_WINDOW_MINUTES` (default 5). This is the same rule as `decideRollback` in `src/lib/rollback-guard.ts` and the `rollback-guard` CI job.

## Checks

1. Health. Request `$deployUrl/api/health` with `run_command` and curl about every 30 seconds until the window ends. A healthy sample is HTTP 200 and `"status":"ok"`.
2. Error rate. If `gcloud` is on PATH and the Cloud Run service name is known, read `run.googleapis.com/request_count` for that service over the window. The rate is 5xx divided by all requests. The guard is `ROLLBACK_MAX_ERROR_RATE` (default 0.02). If monitoring does not answer, say so. Missing metrics are not a failure when health is up.
3. The CI job. With `gitlab_api_get`, read the latest pipeline on the default branch and the `rollback-guard` job log if it exists. A line `gitdone-rollback action=hold` or `action=rollback` is the job's decision.

Do not mark the stage passed because CI "probably" smoked staging. This stage checks production.

## When the guard holds

Set `monitor` to `passed`. Record the sample count, the status codes, and the worst error rate or that the rate was unavailable. Do not add a `rollback` stage. Final answer is exactly `continue`.

## When the deploy degrades

Degraded means no health samples, any failed health sample, or an error rate above the guard.

1. Shift traffic only if the CI job has not already done it. Prefer the job: it has Workload Identity. If the log shows a shift to a revision, confirm that revision is serving and do not shift again. If the job did not run and `gcloud` works, run `gcloud run services update-traffic` so the previous revision receives 100 percent. If neither can shift, record that and still do the next two steps.
2. Post a journey note. `monitor` is `attention`. Add stage `rollback` with status `passed` when traffic moved back, or `attention` when it did not. Put the status codes, the error rate, the revision that was removed, and the revision that is serving in `details`. Follow `docs/journey-schema.md`. `rollback` is optional and sits after `monitor`.
3. Reopen the issue. There is no documented update-issue tool. Use `run_command` with curl and `Authorization: Bearer $GITLAB_TOKEN` (not `PRIVATE-TOKEN`) to `PUT /api/v4/projects/:id/issues/:iid` with `state_event` `reopen`. Also post a short note that quotes the evidence and contains the journey record via `create_issue_note` when that tool works. A 401 means the flow token cannot reopen. Record the status. Do not claim the issue is open if the call failed.

Do not continue to Govern. A bad revision does not get a morning announcement. Final answer is exactly `stop`.

## Finish

Final answer is exactly `continue` or `stop`.
