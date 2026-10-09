---
name: release
description: Release stage of the GitDone issue-to-production flow. Use when the merge request is green and a GitLab Release plus changelog must be published.
---

# Release

Merge the merge request, then confirm the GitLab Release the pipeline published.

## Merge

Merge only when verify and secure are `passed`.

The flow token (`ai_workflows` scope) is refused by `PUT .../merge_requests/:iid/merge` and by `POST .../releases`. It is allowed to post notes, and GitLab runs quick actions in notes. Merge with the `/merge` quick action:

```shell
curl --fail-with-body -s -X POST \
  --header "Authorization: Bearer $GITLAB_TOKEN" \
  --data-urlencode "body=/merge" \
  "$GITLAB_BASE_URL/api/v4/projects/<project id>/merge_requests/<mr iid>/notes"
```

Use `Authorization: Bearer`, not `PRIVATE-TOKEN`. If `$GITLAB_BASE_URL` is empty use `https://gitlab.com`. Then read the merge request with `get_merge_request` until `state` is `merged` and record `merge_commit_sha`. If the pipeline is still running, `/merge` sets auto-merge, so keep reading. If the request is refused or the merge request is not merged after about ten minutes, record the response, set `release` to `attention`, and final answer `stop`. Do not bypass branch protection and do not push to `main` directly.

## Release

You do not create the release. The `release:notes` and `release:publish` jobs on the `main` pipeline for the merge commit publish it, with tag `v<major>.<minor>.<pipeline iid>` and the merge request description as the notes.

With `gitlab_api_get`, find the pipeline on `main` whose `sha` is the merge commit, wait until `release:publish` has finished, then read `/projects/:id/releases` and pick the release whose commit is the merge commit. That release URL and tag are the evidence.

GitDone turns the changelog headings into the changelog and drafts X, Discord, and Telegram posts. You do not post to those networks.

## Record

Set `release` to `passed` with the release URL and `releaseTag`.

## Finish

Final answer is exactly `continue` or `stop`.
