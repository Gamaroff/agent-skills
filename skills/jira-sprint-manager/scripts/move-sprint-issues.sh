#!/bin/bash
# Move issues to a sprint or backlog. Auto-chunks to Jira's 50-issue limit.
# Usage: move-sprint-issues.sh <target_sprint_id|backlog> <COMMA_SEPARATED_KEYS> [--dry-run]
set -euo pipefail
source "$(dirname "$0")/../references/jira-sprint-lib.sh"

TARGET=${1:-}
SHIFT_KEYS=${2:-}
DRY_RUN=0
[ "${3:-}" = "--dry-run" ] && DRY_RUN=1

if [ -z "$TARGET" ] || [ -z "$SHIFT_KEYS" ]; then
  echo "Usage: $0 <target_sprint_id|backlog> <key1,key2,...> [--dry-run]" >&2
  exit 1
fi
jsm_require_env

if [ "$TARGET" = "backlog" ]; then
  ENDPOINT="https://$JIRA_INSTANCE/rest/agile/1.0/backlog/issue"
else
  ENDPOINT="https://$JIRA_INSTANCE/rest/agile/1.0/sprint/$TARGET/issue"
fi

KEYS_JSON=$(jq -nR --arg s "$SHIFT_KEYS" \
  '$s | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0))')

TOTAL=$(jq 'length' <<<"$KEYS_JSON")
if [ "$TOTAL" -eq 0 ]; then
  echo "No issue keys provided after trimming." >&2
  exit 1
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "DRY RUN: would move $TOTAL issue(s) to $TARGET in chunks of 50."
  jq -r '.[]' <<<"$KEYS_JSON" | sed 's/^/  - /'
  exit 0
fi

CHUNK_SIZE=50
moved=0
while [ "$moved" -lt "$TOTAL" ]; do
  CHUNK=$(jq --argjson o "$moved" --argjson n "$CHUNK_SIZE" '.[$o:$o+$n]' <<<"$KEYS_JSON")
  PAYLOAD=$(jq -n --argjson keys "$CHUNK" '{issues: $keys}')

  # Name the mutation for the access gate — see jsm_curl in jira-sprint-lib.sh.
  # `count` is not assigned until after the call, so the size is read from the
  # chunk itself; referencing it early would abort the script under `set -u`.
  CHUNK_LEN=$(jq 'length' <<<"$CHUNK")
  # JSM_DEFER_* are the access gate's input contract: set here, read by jsm_curl in
  # jira-sprint-lib.sh (which this script sources), never used locally. A directive
  # covers only the next command, so each assignment carries its own.
  # shellcheck disable=SC2034
  JSM_DEFER_KIND="jira.sprint.move-issues"
  # shellcheck disable=SC2034
  JSM_DEFER_INTENT="Move $CHUNK_LEN issue(s) to: $TARGET"
  # shellcheck disable=SC2034
  JSM_DEFER_TARGET="{\"url\":\"$ENDPOINT\",\"name\":\"$TARGET\"}"
  # shellcheck disable=SC2034
  JSM_DEFER_DESIRED=$(jq -nc --argjson keys "$CHUNK" --arg t "$TARGET" '{target: $t, issues: ($keys | join(", "))}')

  jsm_curl POST "$ENDPOINT" "$PAYLOAD"
  if [ "$JSM_HTTP_STATUS" -ne 204 ] && [ "$JSM_HTTP_STATUS" -ne 200 ]; then
    echo "Failed to migrate chunk starting at $moved ($JSM_HTTP_STATUS): $JSM_BODY" >&2
    exit 1
  fi
  count=$(jq 'length' <<<"$CHUNK")
  moved=$(( moved + count ))
done

# CR-4 — never claim a move that was refused. A deferral is flagged on the last
# chunk processed; every chunk under a restricted mode takes the same branch.
if [ "${JSM_DEFERRED:-0}" = "1" ]; then
  echo "⏸️  $TOTAL issue(s) NOT moved to: $TARGET — access.tracker restricts this run.${JSM_DEFERRED_RECORD:+ Last record: $JSM_DEFERRED_RECORD.}"
  exit 0
fi

echo "Moved $TOTAL issue(s) to: $TARGET."
