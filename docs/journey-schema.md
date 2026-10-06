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

Each stage:

| Field | Required | Values |
| --- | --- | --- |
| `stage` | yes | one of the nine ids |
| `status` | yes | `pending`, `running`, `passed`, `attention` |
| `summary` | yes | one or two sentences a maintainer can read |
| `details` | no | short strings |
| `artifacts` | no | `{ "label", "href" }` links to the MR, pipeline, release, or deploy |
| `startedAt`, `completedAt` | no | ISO-8601 UTC |
| `security` | no | `{ "found": number, "resolved": number }` |

`humanTouches` is the count of times a person had to answer or approve. A hands-off run is `0`. `touchNotes` quotes what the person said. Use `null` for `humanTouches` only when the count is unknown.

Missing stages are shown as waiting. Post a new note with the full JSON when a stage finishes. The newest valid note wins.

Do not put secrets, tokens, or private keys in the note.
