---
name: ready
description: Last stage of the GitDone supervised flow. Use when plan, create, verify, package, and secure have passed and a person must click Merge.
---

# Ready to merge

Stop. Do not merge the merge request. Do not create a release. Do not push to the default branch.

GitLab refuses both `PUT /merge_requests/:iid/merge` and the `/merge` quick action for AI workflows (`403 Forbidden - Quick actions merge cannot be used with AI workflows`). The flow token also cannot `POST /releases`. Working around that with a human token or a direct push to the default branch is not this product.

## Notes

Post the same note in two places.

1. On the issue, with `create_issue_note`. Include the journey record from `docs/journey-schema.md`. Stages through `secure` are whatever you actually observed. Do not add an `approval` stage. `humanTouches` stays 0 until a person merges. The pipeline writes the approval after that click.
2. On the merge request, with `run_command` and curl. `Authorization: Bearer $GITLAB_TOKEN`. `POST /api/v4/projects/:id/merge_requests/:iid/notes`.

The note a person can read, in both places:

```text
Ready to merge MR !<iid>.

<summary of what changed, the pipeline, and the security result>

The agents have stopped. The next step is one click: Merge.
<mr url>
```

## Finish

Final answer is exactly `stop`.
