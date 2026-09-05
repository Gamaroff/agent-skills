#!/bin/bash
# Transition a sprint to active or closed.
# Usage:
#   manage-sprint-state.sh <sprint_id> active <ISO8601_start> <ISO8601_end>
#   manage-sprint-state.sh <sprint_id> closed
# Dates: ISO-8601 with timezone, e.g. 2026-05-26T09:00:00.000Z
set -euo pipefail
source "$(dirname "$0")/../references/jira-sprint-lib.sh"

SPRINT_ID=${1:-}
STATE=${2:-}
START_DATE=${3:-}
END_DATE=${4:-}

if [ -z "$SPRINT_ID" ] || [ -z "$STATE" ]; then
  echo "Usage: $0 <sprint_id> active|closed [start_iso end_iso]" >&2
  exit 1
fi
jsm_require_env

case "$STATE" in
  active)
    if [ -z "$START_DATE" ] || [ -z "$END_DATE" ]; then
      echo "Error: Activating a sprint requires Start and End dates (ISO-8601 with TZ)." >&2
      exit 1
    fi
    jsm_validate_iso8601 "$START_DATE" "Start Date"
    jsm_validate_iso8601 "$END_DATE"   "End Date"
    PAYLOAD=$(jq -n --arg st "$STATE" --arg sd "$START_DATE" --arg ed "$END_DATE" \
      '{state: $st, startDate: $sd, endDate: $ed}')
    ;;
  closed)
    PAYLOAD=$(jq -n --arg st "$STATE" '{state: $st}')
    ;;
  *)
    echo "Error: STATE must be 'active' or 'closed'. Got: $STATE" >&2
    exit 1
    ;;
esac

URL="https://$JIRA_INSTANCE/rest/agile/1.0/sprint/$SPRINT_ID"

# Name the mutation for the access gate, so a restricted run records "close
# sprint 42" rather than a URL and a payload. See jsm_curl in jira-sprint-lib.sh.
# JSM_DEFER_* are the access gate's input contract: set here, read by jsm_curl in
# jira-sprint-lib.sh (which this script sources), never used locally. A directive
# covers only the next command, so each assignment carries its own.
# shellcheck disable=SC2034
JSM_DEFER_KIND="jira.sprint.set-state"
# shellcheck disable=SC2034
JSM_DEFER_INTENT="Set sprint $SPRINT_ID to state: $STATE"
# shellcheck disable=SC2034
JSM_DEFER_TARGET="{\"sprint\":\"$SPRINT_ID\",\"url\":\"$URL\",\"ui_url\":\"https://$JIRA_INSTANCE/jira/software/projects\"}"
# shellcheck disable=SC2034
JSM_DEFER_DESIRED="{\"state\":\"$STATE\"}"

# Documented partial update is POST. Some proxies/tenants reject POST → fall back to PUT.
jsm_curl POST "$URL" "$PAYLOAD"
if [ "$JSM_HTTP_STATUS" -eq 405 ] || [ "$JSM_HTTP_STATUS" -eq 404 ]; then
  jsm_curl PUT "$URL" "$PAYLOAD"
fi

if [ "$JSM_HTTP_STATUS" -ne 200 ]; then
  echo "State transition failed ($JSM_HTTP_STATUS): $JSM_BODY" >&2
  exit 1
fi

# CR-4 — never claim a mutation that was refused. jsm_defer returns a 200 so the
# checks above still pass under `set -euo pipefail`; JSM_DEFERRED is what says
# the sprint did not actually move.
if [ "${JSM_DEFERRED:-0}" = "1" ]; then
  echo "⏸️  Sprint $SPRINT_ID NOT transitioned to: $STATE — access.tracker restricts this run.${JSM_DEFERRED_RECORD:+ Recorded as $JSM_DEFERRED_RECORD.}"
  exit 0
fi

echo "Sprint $SPRINT_ID transitioned to: $STATE."
