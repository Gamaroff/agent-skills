#!/bin/bash
set -euo pipefail

# Lookback window for "updated >= X" JQL clause. Defaults to -1d; auto-extends
# to -3d on Mondays so Friday's work is captured.
LOOKBACK_WINDOW="${1:-}"
if [ -z "$LOOKBACK_WINDOW" ]; then
  if [ "$(date +%u)" = "1" ]; then
    LOOKBACK_WINDOW="-3d"
  else
    LOOKBACK_WINDOW="-1d"
  fi
fi

: "${JIRA_API_TOKEN:?Missing required env var JIRA_API_TOKEN}"
: "${JIRA_USER_EMAIL:?Missing required env var JIRA_USER_EMAIL}"
: "${JIRA_URL:?Missing required env var JIRA_URL (e.g. your-tenant.atlassian.net)}"

# Normalise JIRA_URL: strip scheme + trailing slash.
JIRA_HOST="${JIRA_URL#https://}"
JIRA_HOST="${JIRA_HOST#http://}"
JIRA_HOST="${JIRA_HOST%/}"

AUTH="$JIRA_USER_EMAIL:$JIRA_API_TOKEN"

http_get() {
  local url="$1"
  local body status
  body=$(curl -sS -u "$AUTH" -H "Accept: application/json" -w '\n%{http_code}' "$url")
  status="${body##*$'\n'}"
  body="${body%$'\n'*}"
  if [ "$status" -ge 400 ]; then
    echo "Jira GET $url failed: HTTP $status" >&2
    echo "$body" >&2
    exit 1
  fi
  printf '%s' "$body"
}

http_post() {
  local url="$1" payload="$2"
  local body status
  body=$(curl -sS -u "$AUTH" -H "Accept: application/json" -H "Content-Type: application/json" \
    -X POST -d "$payload" -w '\n%{http_code}' "$url")
  status="${body##*$'\n'}"
  body="${body%$'\n'*}"
  if [ "$status" -ge 400 ]; then
    echo "Jira POST $url failed: HTTP $status" >&2
    echo "$body" >&2
    exit 1
  fi
  printf '%s' "$body"
}

# Resolve current user's accountId once. GDPR-safe; email is no longer queryable.
ACCOUNT_ID=$(http_get "https://$JIRA_HOST/rest/api/3/myself" | jq -r '.accountId')
if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" = "null" ]; then
  echo "Could not resolve accountId from /rest/api/3/myself" >&2
  exit 1
fi

# JQL uses currentUser() — accountId injection avoided, email banned in JQL since 2019.
JQL="(updated >= \"$LOOKBACK_WINDOW\" AND (assignee = currentUser() OR reporter = currentUser())) OR (assignee = currentUser() AND statusCategory != \"Done\")"

# /rest/api/3/search retired May 2025. Use /rest/api/3/search/jql (POST, nextPageToken paging).
SEARCH_URL="https://$JIRA_HOST/rest/api/3/search/jql"
FIELDS_JSON='["summary","status","updated","assignee","issuelinks"]'

all_issues='[]'
next_token=""

while :; do
  payload=$(jq -n \
    --arg jql "$JQL" \
    --argjson fields "$FIELDS_JSON" \
    --arg token "$next_token" \
    '{jql: $jql, fields: $fields, expand: ["changelog"], maxResults: 50}
     + (if $token == "" then {} else {nextPageToken: $token} end)')

  page=$(http_post "$SEARCH_URL" "$payload")

  all_issues=$(jq -n --argjson a "$all_issues" --argjson p "$page" '$a + ($p.issues // [])')
  next_token=$(echo "$page" | jq -r '.nextPageToken // empty')
  [ -z "$next_token" ] && break
done

# Project the response. For changelog: filter by accountId FIRST (emails are
# often null under privacy mode), sort newest-first, then slice last 3.
echo "$all_issues" | jq --arg aid "$ACCOUNT_ID" '{
  issues: [.[] | {
    key: .key,
    summary: .fields.summary,
    status: .fields.status.name,
    statusCategory: .fields.status.statusCategory.name,
    updated: .fields.updated,
    assignee: (.fields.assignee.displayName // null),
    blockedByLinks: [
      (.fields.issuelinks // [])[]
      | select(.type.inward == "is blocked by" and .inwardIssue)
      | {key: .inwardIssue.key, status: .inwardIssue.fields.status.name}
    ],
    recentChanges: [
      (.changelog.histories // [])[]
      | select(.author.accountId == $aid)
      | {created: .created, items: [.items[] | {field: .field, from: .fromString, to: .toString}]}
    ] | sort_by(.created) | reverse | .[:3]
  }]
}'
