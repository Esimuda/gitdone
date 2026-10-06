---
name: verify
description: Verify stage of the GitDone issue-to-production flow. Use when a merge request exists and tests or the pipeline must pass before packaging.
---

# Verify

Confirm the merge request from the journey note is green.

## Checks

Run `npm test`, `npm run lint`, and `npm run typecheck` in the workload checkout. Then read the merge request pipeline with `gitlab_api_get`. A documented path shape is `GET /projects/:id/merge_requests/:iid/pipelines`.

If the pipeline fails, fix the cause on the same branch with `edit_file` and `create_commit`, then look again. Do not weaken a test to force a pass.

## Record

Set `verify` to `passed` when the latest pipeline status is `success`, and include the pipeline link. If it is still running, set `running`. If it failed and you cannot fix it, set `attention` and final answer `stop`.

## Tools

`gitlab_api_get`, `get_merge_request`, `read_file`, `edit_file`, `create_commit`, `run_command`, `create_issue_note`.

## Finish

Final answer is exactly `continue` or `stop`.
