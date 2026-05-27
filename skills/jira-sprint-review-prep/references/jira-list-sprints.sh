#!/bin/bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/jira-list-sprints.sh. Regenerate via `npm run bundle`.
# List sprints for a board, filtered by state.
# Usage: jira-list-sprints.sh <board_id> [state]
#   state: future | active | closed | "future,active" (default: future,active)
# Canonical copy lives in shared/resources/. Bundled into each consuming
# skill's references/ via `npm run bundle`. Edit here, then re-bundle.
set -euo pipefail
source "$(dirname "$0")/jira-sprint-lib.sh"

BOARD_ID=${1:-}
STATE=${2:-future,active}

if [ -z "$BOARD_ID" ]; then
  echo "Usage: $0 <board_id> [state]" >&2
  exit 1
fi
jsm_require_env

VALUES=$(jsm_paginate_values "https://$JIRA_INSTANCE/rest/agile/1.0/board/$BOARD_ID/sprint" "state=$STATE")

echo "$VALUES" | jq '[.[] | {id, name, state, startDate, endDate, goal}]'
