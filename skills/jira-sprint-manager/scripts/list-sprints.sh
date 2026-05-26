#!/bin/bash
# List sprints for a board, filtered by state.
# Usage: list-sprints.sh <board_id> [state]
#   state: future | active | closed | "future,active" (default: future,active)
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

BOARD_ID=${1:-}
STATE=${2:-future,active}

if [ -z "$BOARD_ID" ]; then
  echo "Usage: $0 <board_id> [state]" >&2
  exit 1
fi
jsm_require_env

VALUES=$(jsm_paginate_values "https://$JIRA_INSTANCE/rest/agile/1.0/board/$BOARD_ID/sprint" "state=$STATE")

echo "$VALUES" | jq '[.[] | {id, name, state, startDate, endDate, goal}]'
