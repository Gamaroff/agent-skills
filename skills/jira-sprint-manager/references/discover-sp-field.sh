#!/bin/bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/discover-sp-field.sh. Regenerate via `npm run bundle`.
# Discover the Story Points custom field ID for this Jira tenant.
# Prints the field ID (e.g. customfield_10026) to stdout, or exits non-zero.
# Use the result to set JIRA_SP_FIELD.
#
# Note: queries /rest/api/3/field (platform REST), not the Agile API — field
# metadata only exists on the platform side.
set -euo pipefail
source "$(dirname "$0")/../references/jira-sprint-lib.sh"

jsm_require_env

jsm_curl GET "https://$JIRA_INSTANCE/rest/api/3/field"
if [ "$JSM_HTTP_STATUS" -ne 200 ]; then
  echo "Failed to fetch fields ($JSM_HTTP_STATUS): $JSM_BODY" >&2
  exit 1
fi

# Prefer team-managed "Story Points estimate", fall back to company-managed "Story Points".
MATCH=$(echo "$JSM_BODY" | jq -r '
  ( [ .[] | select((.name | ascii_downcase) == "story points estimate") ] | .[0].id )
  // ( [ .[] | select((.name | ascii_downcase) == "story points") ] | .[0].id )
  // empty')

if [ -z "$MATCH" ]; then
  echo "Story Points field not found. Inspect GET /rest/api/3/field manually." >&2
  exit 1
fi

echo "$MATCH"
