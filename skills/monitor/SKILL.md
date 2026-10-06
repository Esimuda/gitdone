---
name: monitor
description: Monitor stage of the GitDone issue-to-production flow. Use when production has a deploy URL and a smoke check must prove the release is up.
---

# Monitor

Smoke-check the deployed service. The app exposes `GET /api/health`, which returns JSON `status: ok`.

## Check

Request `$deployUrl/api/health` with `run_command` and curl. A pass is HTTP 200 and `"status":"ok"`. Record the status code and how long it took in `summary`.

If the URL is missing, say so and final answer `stop`. Do not mark the stage passed because CI "probably" smoked it. You may also note the CI `smoke:staging` job, but this stage checks production.

If the check fails, inspect the latest pipeline once. If the failure is an obvious bad revision, record `attention` and `stop`. Do not roll forward a second unreviewed deploy.

## Finish

Final answer is exactly `continue` or `stop`.
