---
name: release
description: Release stage of the GitDone issue-to-production flow. Use when the merge request is green and a GitLab Release plus changelog must be published.
---

# Release

Merge the merge request, then publish a GitLab Release.

## Merge

There is no documented merge tool in the flow tool list. Use `run_command` with curl and `Authorization: Bearer $GITLAB_TOKEN` (not `PRIVATE-TOKEN`). The token only works on endpoints in the `ai_workflows` scope. Whether merge and release endpoints accept that scope was not verified. If the API returns 401, record the failure and final answer `stop`. Do not bypass branch protection.

Merge only when verify and secure are `passed`.

## Release

Create the release for the merge commit. Tag `v` plus a version you read from `package.json`, bumped at the patch unless the issue says otherwise. The description is markdown with `## Added`, `## Fixed`, `## Changed`, or `## Security` headings and bullet lines. Include `Closes #<iid>`.

GitDone turns those bullets into the changelog and drafts X, Discord, and Telegram posts. You do not post to those networks.

## Record

Set `release` to `passed` with the release URL and `releaseTag`.

## Finish

Final answer is exactly `continue` or `stop`.
