# Journey record (version 1)

The Duo flow posts this JSON on the issue as a GitLab note. GitDone reads the newest note that contains the marker. Issue title, author, and description still come from the issue itself.

```html
<!-- journey:v1
{
  "version": 1,
  "issueIid": 142,
  "humanTouches": 0,
  "touchNotes": [],
  "releaseTag": "v0.4.2",
  "deployUrl": "https://example.com",
  "stages": []
}
-->
```

`stages` entries use these ids, in this order: `plan`, `create`, `verify`, `package`, `secure`, `release`, `configure`, `monitor`, `govern`.

`approval` is optional. Include it only after a person clicks Merge. It sits after `secure` and before `release`. `passed` means that person merged the request the agents prepared. The summary names who merged and when. Omit it until the click. The agent flow must not mark it `passed`. The `journey:record` job on the default-branch pipeline writes it, using `merged_by` and `merged_at` from the merge request.

`rollback` is optional. Include it only when a production deploy was sent back to the previous revision. It sits after `monitor` and before `govern`. `passed` means traffic moved back. `attention` means the guard wanted to move traffic and could not. Omit the stage when the guard held. A missing `rollback` stage is not "waiting to roll back."

Each stage:

| Field | Required | Values |
| --- | --- | --- |
| `stage` | yes | one of the nine ids, or `approval`, or `rollback` |
| `status` | yes | `pending`, `running`, `passed`, `attention` |
| `summary` | yes | one or two sentences a maintainer can read |
| `details` | no | short strings |
| `artifacts` | no | `{ "label", "href" }` links to the MR, pipeline, release, or deploy |
| `startedAt`, `completedAt` | no | ISO-8601 UTC |
| `security` | no | `{ "found": number, "resolved": number }` |

`humanTouches` is the count of times a person had to answer or approve. The designed supervised run is `1`: the Merge click. A clarifying question in Plan is a second touch and must be quoted. `touchNotes` quotes what the person did. Once `approval` is recorded, `humanTouches` is at least `1`. Use `null` only when the count is unknown. The Ready to merge note leaves `humanTouches` at `0` because the click has not happened yet.

Missing stages are shown as waiting. Post a new note with the full JSON when a stage finishes. The newest valid note wins.

Do not put secrets, tokens, or private keys in the note.
