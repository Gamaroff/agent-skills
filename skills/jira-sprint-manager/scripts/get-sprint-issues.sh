#!/bin/bash
# Emit all issues in a sprint as a JSON array (paginated).
# Each element: {key, summary, status, statusCategoryKey, resolution, points}
# statusCategoryKey is "done" | "indeterminate" | "new" — localization-safe (use this, not .status.name).
set -euo pipefail
source "$(dirname "$0")/../references/jira-sprint-lib.sh"

SPRINT_ID=${1:-}
STORY_POINTS_FIELD=${JIRA_SP_FIELD:-customfield_10026}

if [ -z "$SPRINT_ID" ]; then
  echo "Usage: $0 <sprint_id>" >&2
  exit 1
fi
jsm_require_env

ISSUES=$(jsm_paginate_issues \
  "https://$JIRA_INSTANCE/rest/agile/1.0/sprint/$SPRINT_ID/issue" \
  "fields=summary,status,resolution,$STORY_POINTS_FIELD")

echo "$ISSUES" | jq --arg sp "$STORY_POINTS_FIELD" '
  [ .[] | {
      key: .key,
      summary: .fields.summary,
      status: .fields.status.name,
      statusCategoryKey: .fields.status.statusCategory.key,
      resolution: (.fields.resolution.name // null),
      points: (.fields[$sp] // null)
    }
  ]'
