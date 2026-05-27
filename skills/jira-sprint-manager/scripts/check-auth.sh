#!/bin/bash
# Verify Jira credentials by calling GET /rest/api/3/myself.
# Prints accountId + displayName on success; non-zero exit on failure.
set -euo pipefail
source "$(dirname "$0")/../references/jira-sprint-lib.sh"

jsm_require_env

jsm_curl GET "https://$JIRA_INSTANCE/rest/api/3/myself"
if [ "$JSM_HTTP_STATUS" -ne 200 ]; then
  echo "Auth check failed ($JSM_HTTP_STATUS): $JSM_BODY" >&2
  exit 1
fi

echo "$JSM_BODY" | jq '{accountId, displayName, emailAddress, active}'
