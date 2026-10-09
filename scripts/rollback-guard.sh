#!/usr/bin/env bash
# Post-deploy guard for Cloud Run.
# For ROLLBACK_WINDOW_MINUTES (default 5) this probes PRODUCTION_SERVICE_URL/api/health
# and, when gcloud can read it, the 5xx share of run.googleapis.com/request_count.
# If health fails or the error rate rises above ROLLBACK_MAX_ERROR_RATE (default 0.02),
# traffic moves back to the previous revision. When ROLLBACK_ISSUE_IID is set, the job
# posts a journey:v1 note and reopens that issue.
# A rollback exits 1 on purpose: the deploy is not safe to keep.
# The decision matches decideRollback in src/lib/rollback-guard.ts.
set -euo pipefail

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to score the guard."
  exit 1
fi

window="${ROLLBACK_WINDOW_MINUTES:-5}"
max_rate="${ROLLBACK_MAX_ERROR_RATE:-0.02}"
interval="${ROLLBACK_INTERVAL_SECONDS:-30}"
url="${PRODUCTION_SERVICE_URL:-}"
service="${CLOUD_RUN_SERVICE_PRODUCTION:-}"
region="${GCP_REGION:-}"
project="${GCP_PROJECT_ID:-}"
issue_iid="${ROLLBACK_ISSUE_IID:-}"
api_base="${CI_SERVER_URL:-${GITLAB_BASE_URL:-https://gitlab.com}}"
api_base="${api_base%/}"
api_project="${CI_PROJECT_ID:-${GITLAB_PROJECT_ID:-}}"
token="${GITLAB_TOKEN:-${GITLAB_API_TOKEN:-${CI_JOB_TOKEN:-}}}"

if [[ -z "$url" ]]; then
  echo "Set PRODUCTION_SERVICE_URL to the production Cloud Run URL."
  exit 1
fi
url="${url%/}"

samples=0
failed=0
worst=""
probes=$((window * 60 / interval))
if ((probes < 1)); then probes=1; fi

echo "rollback-guard window=${window}m probes=${probes} max_error_rate=${max_rate}"

for ((i = 1; i <= probes; i++)); do
  code="000"
  body=""
  if body="$(curl -sS --max-time 15 -w $'\n%{http_code}' "$url/api/health" || true)"; then
    code="${body##*$'\n'}"
    payload="${body%$'\n'*}"
  else
    payload=""
  fi
  samples=$((samples + 1))
  if [[ "$code" == "200" && "$payload" == *'"status":"ok"'* ]] || [[ "$code" == "200" && "$payload" == *'"status": "ok"'* ]]; then
    echo "health sample ${i} status=200"
  else
    failed=$((failed + 1))
    echo "health sample ${i} status=${code}"
  fi

  if command -v gcloud >/dev/null 2>&1 && [[ -n "$service" && -n "$region" && -n "$project" && "$project" != REPLACE_WITH* ]]; then
    rate="$(
      python3 - "$project" "$service" "$region" "$window" <<'PY' || true
import json, subprocess, sys
from datetime import datetime, timedelta, timezone
project, service, region, window = sys.argv[1:5]
end = datetime.now(timezone.utc)
start = end - timedelta(minutes=int(window))
filt = (
    'metric.type="run.googleapis.com/request_count" '
    f'AND resource.labels.service_name="{service}" '
    f'AND resource.labels.location="{region}"'
)
try:
    raw = subprocess.check_output(
        [
            "gcloud", "monitoring", "time-series", "list",
            f"--project={project}",
            f"--filter={filt}",
            f"--interval-start-time={start.strftime('%Y-%m-%dT%H:%M:%SZ')}",
            f"--interval-end-time={end.strftime('%Y-%m-%dT%H:%M:%SZ')}",
            "--format=json",
        ],
        stderr=subprocess.DEVNULL,
        text=True,
    )
except Exception:
    sys.exit(0)
try:
    series = json.loads(raw or "[]")
except json.JSONDecodeError:
    sys.exit(0)
total = 0.0
bad = 0.0
for item in series:
    code_class = ((item.get("metric") or {}).get("labels") or {}).get("response_code_class", "")
    points = item.get("points") or []
    value = 0.0
    for point in points:
        raw_value = ((point.get("value") or {}).get("int64Value")
                     or (point.get("value") or {}).get("doubleValue")
                     or 0)
        value += float(raw_value)
    total += value
    if code_class == "5xx":
        bad += value
if total <= 0:
    sys.exit(0)
print(f"{bad / total:.6f}")
PY
    )"
    if [[ -n "$rate" ]]; then
      echo "error-rate sample ${i} rate=${rate}"
      worst="$(python3 - "$worst" "$rate" <<'PY'
import sys
prev, cur = sys.argv[1], sys.argv[2]
if not prev:
    print(cur)
else:
    print(cur if float(cur) > float(prev) else prev)
PY
)"
    fi
  fi

  if ((i < probes)); then
    sleep "$interval"
  fi
done

action="hold"
reason="Health stayed up and the error rate stayed within the guard."
if ((samples == 0)); then
  action="rollback"
  reason="No health samples in the window."
elif ((failed > 0)); then
  action="rollback"
  reason="${failed} of ${samples} health checks failed."
elif [[ -n "$worst" ]]; then
  over="$(python3 - "$worst" "$max_rate" <<'PY'
import sys
print("yes" if float(sys.argv[1]) > float(sys.argv[2]) else "no")
PY
)"
  if [[ "$over" == "yes" ]]; then
    action="rollback"
    reason="Error rate ${worst} rose above ${max_rate}."
  fi
elif ((failed == 0)); then
  reason="Health stayed up. Error rate was not available, so the guard held."
fi

from_rev=""
to_rev=""
if [[ "$action" == "rollback" ]]; then
  if command -v gcloud >/dev/null 2>&1 && [[ -n "$service" && -n "$region" && -n "$project" && "$project" != REPLACE_WITH* ]]; then
    mapfile -t revisions < <(gcloud run revisions list \
      --service="$service" \
      --region="$region" \
      --project="$project" \
      --format='value(metadata.name)' \
      --sort-by='~metadata.creationTimestamp')
    from_rev="${revisions[0]:-}"
    to_rev="${revisions[1]:-}"
    if [[ -z "$to_rev" ]]; then
      echo "gitdone-rollback action=rollback reason=${reason} shift=skipped detail=no-previous-revision"
      exit 1
    fi
    gcloud run services update-traffic "$service" \
      --project="$project" \
      --region="$region" \
      --to-revisions="${to_rev}=100"
    echo "shifted traffic from ${from_rev} to ${to_rev}"
  else
    echo "gcloud is not ready, so this job did not shift traffic. The Monitor stage must."
  fi

  if [[ -n "$issue_iid" && -n "$token" && -n "$api_project" ]]; then
    python3 - "$api_base" "$api_project" "$issue_iid" "$token" "$reason" "$from_rev" "$to_rev" "$worst" <<'PY'
import json, os, sys, urllib.parse, urllib.request
base, project, iid, token, reason, from_rev, to_rev, worst = sys.argv[1:9]
project_id = urllib.parse.quote(project, safe="")
note = {
    "version": 1,
    "issueIid": int(iid),
    "humanTouches": 0,
    "touchNotes": [],
    "stages": [
        {
            "stage": "monitor",
            "status": "attention",
            "summary": reason,
            "details": [f"Worst error rate: {worst or 'unavailable'}."],
        },
        {
            "stage": "rollback",
            "status": "passed",
            "summary": f"Shifted traffic from {from_rev or 'the new revision'} to {to_rev or 'the previous revision'}.",
            "details": ["Posted by the rollback-guard CI job.", "The issue is reopened with this evidence."],
        },
    ],
}
body = "<!-- journey:v1\n" + json.dumps(note, indent=2) + "\n-->"
def send(method, path, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{base}/api/v4/projects/{project_id}{path}",
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        res.read()
send("POST", f"/issues/{iid}/notes", {"body": body})
send("PUT", f"/issues/{iid}", {"state_event": "reopen"})
print("posted journey note and reopened issue")
PY
  else
    echo "journey note skipped: set ROLLBACK_ISSUE_IID and a bearer token to record it from CI"
  fi

  echo "gitdone-rollback action=rollback reason=${reason} from=${from_rev:-unknown} to=${to_rev:-unknown}"
  exit 1
fi

echo "gitdone-rollback action=hold reason=${reason}"
