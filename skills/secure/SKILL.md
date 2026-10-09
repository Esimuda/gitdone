---
name: secure
description: Secure stage of the GitDone supervised flow. Use when SAST and secret detection on the merge request must be read, fixed if needed, and always written into a journey note.
---

# Secure

Read SAST and secret detection, fix what this change introduced, and post the journey note before you finish. Post it even when both scanners report nothing. A run that leaves `secure` as `pending` is a failed stage.

## Where the reports are

`AST_ENABLE_MR_PIPELINES` is `true` in `ci/gitdone.gitlab-ci.yml`, so the SAST and secret-detection templates run on merge request pipelines as well as branch pipelines.

With `gitlab_api_get`, list jobs on the merge request pipeline (`/projects/:id/pipelines/:id/jobs`). Read the SAST and secret-detection job traces or the vulnerability endpoints those jobs link. If the merge request pipeline has neither job, read the branch pipeline for the same sha. If a GET returns 401 or 404, say that in the summary. Do not guess a different API.

## Triage

For each finding introduced by this change:

- If it is a real defect, patch it on the branch, commit, and let verify run again by reading the new pipeline.
- If it is a false positive, say why in `details`. Count it resolved only after the flagged material is gone, or after you have recorded the false-positive reason.
- Never commit a real secret, and never print a secret in the journey note or the job log.

Set `security.found` and `security.resolved` on the `secure` stage. Zero and zero is a valid result.

## Note

Your last tool call is `create_issue_note` with the full journey record. Do that when findings remain, when they are fixed, and when there were none.

Do not call another flow. GitLab does not let one flow trigger another.

## Finish

Final answer is exactly `continue` when the note is posted and every finding is resolved or explained, otherwise `stop`.
