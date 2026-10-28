#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-ci-read.sh. Regenerate via `npm run bundle`.
# qa-ci-read.sh — read a PR's CI result once, without waiting, for the QA gate (task.238, obs #45).
#
# /qa-task and /qa-story call this at Step 10, just before the gate is composed. It never polls:
# "no QA cycle waits on CI" stands, because this is a read, not a wait. A completed failure on the
# head being judged becomes a gate finding, unless the same check is also red on the PR base —
# then it is pre-existing, recorded, and kept out of /qa-fix's queue (there is nothing to fix).
#
# Usage (from the repository root):
#   qa-ci-read.sh --vcs github|bitbucket --pr <number>
#
# Output, one record per line:
#   CI_HEAD=<sha>                               the local HEAD the reading is for
#   CI_STATE=<state>                            FAILURE | PENDING | CANCELLED | NONE | SUCCESS |
#                                               HEAD_MISMATCH | UNKNOWN
#   CI_FINDING<TAB>top_issue<TAB><check><TAB><url><TAB><base evidence>
#   CI_FINDING<TAB>pre-existing<TAB><check><TAB><url><TAB><base evidence>
#   CI_SUMMARY=<the QA report's Review Methodology line>
# CI_FINDING lines appear only when CI_STATE=FAILURE. Exit 0 for every reading — an unreadable CI
# is a reading (UNKNOWN), never a failure of the QA step — and 2 on a usage error.
#
# Bucketing is /finalise's, exactly: a CheckRun is decided only at `.status == COMPLETED` (never
# `.conclusion // .state` — a running CheckRun's conclusion is "", not null); ACTION_REQUIRED is a
# failure; CANCELLED is undecided. On Bitbucket the HTTP status is read before the body, and a 403
# (a token without read:pipeline:bitbucket) is UNKNOWN, never "no CI".

set -u

VCS="" PR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --vcs) VCS="${2-}"; shift 2 || { echo "qa-ci-read: --vcs needs a value" >&2; exit 2; } ;;
    --pr) PR="${2-}"; shift 2 || { echo "qa-ci-read: --pr needs a value" >&2; exit 2; } ;;
    *) echo "qa-ci-read: unknown argument: $1" >&2; exit 2 ;;
  esac
done
case "$VCS" in github | bitbucket) ;; *) echo "qa-ci-read: --vcs must be github or bitbucket" >&2; exit 2 ;; esac
case "$PR" in "" | *[!0-9]*) echo "qa-ci-read: --pr must be a PR number" >&2; exit 2 ;; esac

HEAD_SHA=$(git rev-parse HEAD 2>/dev/null) || { echo "qa-ci-read: not in a git checkout" >&2; exit 2; }
echo "CI_HEAD=$HEAD_SHA"
SHORT=${HEAD_SHA:0:12}
WORK=$(mktemp -d "${TMPDIR:-/tmp}/qa-ci-read.XXXXXX") || exit 2
trap 'rm -rf "$WORK"' EXIT

finish() { # state, summary
  echo "CI_STATE=$1"
  echo "CI_SUMMARY=CI on $SHORT: $2"
  exit 0
}

# Internal records are split on the unit separator, not a tab: a tab is IFS whitespace, so `read`
# collapses an empty field (a StatusContext's workflow, a missing URL) and shifts the rest left.
US=$'\x1f'

# Emit one finding per failed check, and the FAILURE summary. Input: $WORK/failed, one
# "<name> <url> <base state> <base evidence>" record per failed check (US-separated); base state is
# red|green|none.
report_failures() {
  local n=0 m=0 name url base_state evidence
  echo "CI_STATE=FAILURE"
  while IFS="$US" read -r name url base_state evidence; do
    n=$((n + 1))
    if [ "$base_state" = "red" ]; then
      m=$((m + 1))
      printf 'CI_FINDING\tpre-existing\t%s\t%s\t%s\n' "$name" "$url" "$evidence"
    else
      printf 'CI_FINDING\ttop_issue\t%s\t%s\t%s\n' "$name" "$url" "$evidence"
    fi
  done <"$WORK/failed"
  echo "CI_SUMMARY=CI on $SHORT: $n failed ($m pre-existing)"
  exit 0
}

if [ "$VCS" = "github" ]; then
  gh pr view "$PR" --json headRefOid,baseRefName,statusCheckRollup >"$WORK/pr.json" 2>/dev/null ||
    finish UNKNOWN "read failed"
  # An empty or unparseable answer is a failed read, not a PR whose head differs.
  PR_HEAD=$(jq -r '.headRefOid // ""' "$WORK/pr.json" 2>/dev/null) || finish UNKNOWN "read failed"
  [ -n "$PR_HEAD" ] || finish UNKNOWN "read failed"
  BASE=$(jq -r '.baseRefName // ""' "$WORK/pr.json")
  [ "$PR_HEAD" = "$HEAD_SHA" ] || finish HEAD_MISMATCH "head mismatch (PR head ${PR_HEAD:0:12})"
  # Per check, /finalise's normalisation: `.status` first, `""` is undecided, never green.
  jq -r '.statusCheckRollup[]
    | (.status // "") as $st
    | { name: (.name // .context // ""), wf: (.workflowName // ""),
        url: (.detailsUrl // .targetUrl // ""),
        state: ((if $st == "" then (.state // "")
                 elif $st == "COMPLETED" then (.conclusion // "")
                 else "PENDING" end) | if . == "" then "PENDING" else . end) }
    | [.state, .name, .wf, .url] | join("\u001f")' "$WORK/pr.json" >"$WORK/checks" 2>/dev/null ||
    finish UNKNOWN "read failed"
  [ -s "$WORK/checks" ] || finish NONE "none"
  : >"$WORK/failed"
  while IFS="$US" read -r state name wf url; do
    case "$state" in
      FAILURE | TIMED_OUT | ERROR | STARTUP_FAILURE | ACTION_REQUIRED) ;;
      *) continue ;;
    esac
    # The same check on the base: the latest completed run of its workflow there, and that
    # run's job of the same name. A StatusContext has no workflow, so it has no base reading.
    base_state=none evidence="no completed run of the same check on $BASE"
    if [ -n "$wf" ] && [ -n "$BASE" ]; then
      RUN_ID=$(gh run list --branch "$BASE" --workflow "$wf" --status completed --limit 1 \
        --json databaseId -q '.[0].databaseId // empty' 2>/dev/null)
      if [ -n "$RUN_ID" ]; then
        JOB=$(gh run view "$RUN_ID" --json jobs \
          -q ".jobs[] | select(.name == $(jq -Rn --arg n "$name" '$n')) | .conclusion" 2>/dev/null | head -1)
        case "$JOB" in
          failure | timed_out | startup_failure | action_required) base_state=red evidence="red on $BASE too (run $RUN_ID)" ;;
          success) base_state=green evidence="green on $BASE (run $RUN_ID)" ;;
        esac
      fi
    fi
    printf '%s\n' "$name$US$url$US$base_state$US$evidence" >>"$WORK/failed"
  done <"$WORK/checks"
  [ -s "$WORK/failed" ] && report_failures
  cut -d"$US" -f1 "$WORK/checks" | grep -qxE 'PENDING|EXPECTED|QUEUED|IN_PROGRESS|WAITING' && finish PENDING "pending"
  cut -d"$US" -f1 "$WORK/checks" | grep -qx 'CANCELLED' && finish CANCELLED "cancelled"
  finish SUCCESS "green"
fi

# ── Bitbucket ─────────────────────────────────────────────────────────────────────────────────────
HERE=$(cd "$(dirname "$0")" && pwd)
BB_PATH=$(git remote get-url origin 2>/dev/null | sed -E 's|.*bitbucket\.org[:/]||; s|\.git$||')
BB_WORKSPACE=$(echo "$BB_PATH" | cut -d'/' -f1)
BB_REPO=$(echo "$BB_PATH" | cut -d'/' -f2)
BB_API="https://api.bitbucket.org/2.0"
# shellcheck source=bitbucket-auth.sh
source "$HERE/bitbucket-auth.sh" 2>/dev/null || finish UNKNOWN "read failed (no Bitbucket credential)"

bb_get() { # path, out-file → prints the HTTP status
  curl -s -o "$2" -w '%{http_code}' "${BB_CURL_AUTH[@]}" "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/$1"
}

[ "$(bb_get "pullrequests/$PR" "$WORK/pr.json")" = "200" ] || finish UNKNOWN "read failed"
PR_HEAD=$(python3 -c 'import json,sys; print(((json.load(open(sys.argv[1])).get("source") or {}).get("commit") or {}).get("hash") or "")' "$WORK/pr.json")
BASE=$(python3 -c 'import json,sys; print(((json.load(open(sys.argv[1])).get("destination") or {}).get("branch") or {}).get("name") or "")' "$WORK/pr.json")
# Bitbucket abbreviates the PR's commit hash: compare on the shorter of the two.
[ -n "$PR_HEAD" ] || finish UNKNOWN "read failed"
[ "${HEAD_SHA:0:${#PR_HEAD}}" = "$PR_HEAD" ] || finish HEAD_MISMATCH "head mismatch (PR head ${PR_HEAD:0:12})"

CODE=$(bb_get "pipelines/?sort=-created_on&pagelen=50" "$WORK/pipelines.json")
# 403 is NOT "no CI": the token lacks read:pipeline:bitbucket, while every other call succeeds.
[ "$CODE" = "403" ] && finish UNKNOWN "read failed (HTTP 403 — the token lacks read:pipeline:bitbucket)"
[ "$CODE" = "200" ] || finish UNKNOWN "read failed (HTTP $CODE)"

STATE=$(python3 - "$WORK/pipelines.json" "$HEAD_SHA" "$BASE" "$BB_WORKSPACE" "$BB_REPO" "$WORK/failed" <<'PY'
import json, sys
path, sha, base, ws, repo, failed = sys.argv[1:7]
values = json.load(open(path)).get("values", [])
def commit(p): return ((p.get("target") or {}).get("commit") or {}).get("hash", "")
def result(p): return (((p.get("state") or {}).get("result") or {}).get("name") or "")
def status(p): return ((p.get("state") or {}).get("name") or "")
def name(p):
    sel = (p.get("target") or {}).get("selector") or {}
    return "pipeline #%s%s" % (p.get("build_number", "?"), (" (%s)" % sel["pattern"]) if sel.get("pattern") else "")
def url(p): return "https://bitbucket.org/%s/%s/pipelines/results/%s" % (ws, repo, p.get("build_number", ""))
runs = [p for p in values if commit(p) and commit(p)[:12] == sha[:12]]
if not runs:
    print("NONE"); raise SystemExit
bad = [p for p in runs if status(p) == "COMPLETED" and result(p) in ("FAILED", "ERROR")]
if bad:
    base_runs = [p for p in values if (p.get("target") or {}).get("ref_name") == base and status(p) == "COMPLETED"]
    latest = base_runs[0] if base_runs else None  # values are sorted newest first
    with open(failed, "w") as out:
        for p in bad:
            if latest is None:
                st, ev = "none", "no completed pipeline on %s" % base
            elif result(latest) in ("FAILED", "ERROR"):
                st, ev = "red", "red on %s too (pipeline #%s)" % (base, latest.get("build_number", "?"))
            else:
                st, ev = "green", "%s on %s (pipeline #%s)" % (result(latest).lower() or "green", base, latest.get("build_number", "?"))
            out.write("\x1f".join((name(p), url(p), st, ev)) + "\n")
    print("FAILURE"); raise SystemExit
names = {status(p) for p in runs}
results = {result(p) for p in runs}
if "IN_PROGRESS" in names or "PENDING" in names: print("PENDING")
elif "STOPPED" in results: print("CANCELLED")
elif "SUCCESSFUL" in results: print("SUCCESS")
else: print("PENDING")
PY
) || finish UNKNOWN "read failed"

case "$STATE" in
  FAILURE) report_failures ;;
  NONE) finish NONE "none" ;;
  PENDING) finish PENDING "pending" ;;
  CANCELLED) finish CANCELLED "cancelled" ;;
  SUCCESS) finish SUCCESS "green" ;;
  *) finish UNKNOWN "read failed" ;;
esac
