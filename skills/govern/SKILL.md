---
name: govern
description: Govern stage of the GitDone issue-to-production flow. Use when the release is live and you must write compliance evidence and confirm the announcement draft.
---

# Govern

Close the loop on the original issue. This is the last stage.

If the latest journey note already has a `rollback` stage, do not draft a celebratory post and do not close the issue. Say that the guard already reopened it. Final answer is still `continue`.

## Evidence

Post the final journey note. Every stage that ran is `passed` or an honest `attention`. `humanTouches` counts real human steps. The designed supervised run is `1`: the person who clicked Merge. `journey:record` writes that `approval` stage. The agent flow does not.

`govern.details` lists:

- pipeline id and result
- findings found and resolved
- release tag and url
- deploy URL and smoke result
- human touch count

Do not include tokens, keys, or personal data beyond the public usernames already on the issue.

## Announcement

GitDone builds the X, Discord, and Telegram drafts from the GitLab Release description. Do not post them to those networks. Mention in the summary that the drafts are on the release hub.

Close the issue only if the release description already contains `Closes #<iid>` or the merge commit did. If you close it yourself, use the issues API with the bearer token and treat a 401 as unverified scope, not as success.

## Finish

Final answer is exactly `continue`.
