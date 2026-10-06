---
name: secure
description: Secure stage of the GitDone issue-to-production flow. Use when SAST and secret-detection findings on the merge request must be triaged and fixed without a human.
---

# Secure

Triage SAST and secret detection on the merge request pipeline. Both scanners are included from GitLab's stable templates in `.gitlab-ci.yml`.

## Triage

Read findings with `gitlab_api_get`. Prefer the project vulnerability or pipeline security-report endpoints. The exact paths that accept an `ai_workflows` token were not fully verified. If a GET returns 401 or 404, record that in the summary instead of guessing a different API.

For each finding introduced by this change:

- If it is a real defect, patch it on the branch, commit, and let verify run again by reading the new pipeline.
- If it is a false positive (for example a fixture value that is not a live secret), say why in `details` and count it as resolved only after the code no longer contains the flagged material, or after you have recorded the false-positive reason.
- Never commit a real secret, and never print a secret in the journey note or the job log.

Set `security.found` and `security.resolved` on the `secure` stage.

Do not call another flow. GitLab does not let one flow trigger another. The SAST Vulnerability Resolution Flow is a separate product feature. This stage does the remediation itself.

## Finish

Final answer is exactly `continue` when every finding is resolved or explained, otherwise `stop`.
