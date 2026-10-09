---
name: release
description: What the default-branch pipeline does after a person merges. The Duo flow does not run this stage.
---

# Release

The agent flow stops at Ready to merge. It does not merge, and it does not create the release.

GitLab blocks AI workflows from merging (`PUT /merge_requests/:iid/merge` returns 403, and the `/merge` quick action returns `403 Forbidden - Quick actions merge cannot be used with AI workflows`). `POST /releases` is outside the flow token scope.

After a person clicks Merge, `release:notes` and `release:publish` on the default-branch pipeline publish the GitLab Release with `CI_JOB_TOKEN`. The tag is `v<major>.<minor>.<pipeline iid>`. The notes are the merged merge request description. `journey:record` then posts the `approval` stage: who merged, and when.

Do not store a human token in CI to merge from the agent. That would claim a hands-off category the platform does not allow.
