#!/bin/bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/discover-qa-field.sh. Regenerate via `npm run bundle`.
# Discover candidate QA approval / QA status custom fields for this Jira tenant.
# Prints `customfield_NNNNN<TAB>Field Name` for every field whose name contains
# "qa" (case-insensitive). User picks one and exports JIRA_QA_FIELD.
#
# Unlike Story Points, QA fields are project-specific and have no canonical
# Atlassian name — we cannot auto-pick. List + manual selection is the contract.
set -euo pipefail
source "$(dirname "$0")/../references/jira-sprint-lib.sh"

jsm_require_env

jsm_curl GET "https://$JIRA_INSTANCE/rest/api/3/field"
if [ "$JSM_HTTP_STATUS" -ne 200 ]; then
  echo "Failed to fetch fields ($JSM_HTTP_STATUS): $JSM_BODY" >&2
  exit 1
fi

MATCHES=$(echo "$JSM_BODY" | jq -r '
  [ .[]
    | select(.name | ascii_downcase | test("qa"))
    | { id, name } ]
  | sort_by(.name)
  | .[]
  | "\(.id)\t\(.name)"')

if [ -z "$MATCHES" ]; then
  echo "No QA-named custom fields found. Inspect GET /rest/api/3/field manually." >&2
  exit 1
fi

printf '%s\n' "$MATCHES"
