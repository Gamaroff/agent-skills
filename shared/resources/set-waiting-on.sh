#!/usr/bin/env bash
# set-waiting-on.sh — mark the pipeline lock as legitimately waiting on a background task.
#
# Sibling of set-qa-phase.sh (task.124, Phase 2). The Stop hook cannot tell a step
# that STALLED from a step that is WAITING on something it dispatched — a
# background Explore agent, a `gh pr checks --watch` job — because both look like
# an assistant trying to stop with the lock still present (obs #89). This script
# is the ONLY writer of the lock's `waiting_on` field, and it never touches
# `current_step` or `qa_phase`.
#
#   waiting_on: { kind: "agent"|"task", label: "<what>", since: "<iso-8601 utc>", budget_minutes: N }
#
# `budget_minutes` is read ONCE here, from `subagents.wallClockMinutes` in
# skills-config.yaml (default 10), and stored on the lock so the hook needs no
# config read of its own. A step that crashed with `waiting_on` set is not
# protected forever: once `since + budget_minutes` is in the past the hook
# re-prompts as it does today.
#
# Usage:
#   bash .agents/skills/{develop-story|develop-task|develop-bug}/references/set-waiting-on.sh "<label>" [--kind agent|task]
#   bash .agents/skills/{develop-story|develop-task|develop-bug}/references/set-waiting-on.sh --clear
#
# Call the first form as the dispatch's own next action and `--clear` as the first
# action after the result is read. The dispatch sites are enumerated by grep, not by
# hand — see develop-pipeline-hooks.md §"waiting_on".
#
# Behaviour:
#   • No lock file             → exit 0, silent noop (standalone invocation — nothing to mark)
#   • jq missing               → exit 0, warn to stderr (degraded, same as set-qa-phase.sh)
#   • no label and no --clear  → exit 1, usage to stderr, lock untouched
#   • --kind not agent|task    → exit 1, usage to stderr, lock untouched
#   • lock not a JSON object   → exit 1, lock untouched, no success line
#   • "<label>"                → atomic write via mktemp + mv; `current_step` preserved verbatim;
#                                prints `set-waiting-on: waiting on <label> (agent, 10 min)`
#   • --clear                  → removes the field (a lock without it is not waiting);
#                                prints `set-waiting-on: cleared`; a lock that has no field
#                                is left byte-identical and still prints `cleared`
#
# Reader: develop-pipeline-on-stop.sh allows the stop while the budget has not
# elapsed and prints `waiting on <label> since <since>`.

set -uo pipefail

LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"
_here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo 'Usage: set-waiting-on.sh "<label>" [--kind agent|task]   |   set-waiting-on.sh --clear' >&2
  exit 1
}

LABEL=""
KIND="agent"
CLEAR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --clear) CLEAR=1 ;;
    --kind)
      [ $# -ge 2 ] || usage
      KIND="$2"; shift ;;
    --help|-h) usage ;;
    --*) usage ;;
    *)
      [ -z "$LABEL" ] || usage
      LABEL="$1" ;;
  esac
  shift
done
if [ -n "$CLEAR" ]; then
  [ -z "$LABEL" ] || usage
else
  [ -n "$LABEL" ] || usage
fi
case "$KIND" in agent|task) ;; *) usage ;; esac

# No lock = no active pipeline = nothing to mark.
[ -f "$LOCK" ] || exit 0

if ! command -v jq >/dev/null 2>&1; then
  echo "set-waiting-on: jq not found — waiting_on not written (degraded mode)" >&2
  exit 0
fi

# Fail closed on a lock that is not a JSON object — the same guard as
# advance-pipeline-lock.sh's require_parsable_lock, for the same reason: jq
# happily fabricates an object from `null`, `[]`, or a bare scalar.
if ! jq -e 'type == "object"' "$LOCK" >/dev/null 2>&1; then
  echo "set-waiting-on: lock is not a JSON object — refusing to write" >&2
  exit 1
fi

TMP=$(mktemp "$(dirname "$LOCK")/.set-waiting-on.XXXXXX") || {
  echo "set-waiting-on: could not create temp file beside '$LOCK'" >&2
  exit 1
}

if [ -n "$CLEAR" ]; then
  if ! jq 'del(.waiting_on)' "$LOCK" > "$TMP"; then
    rm -f "$TMP"
    echo "set-waiting-on: jq write failed" >&2
    exit 1
  fi
  mv "$TMP" "$LOCK"
  echo "set-waiting-on: cleared"
  exit 0
fi

# The budget: subagents.wallClockMinutes, read once, stored on the lock. The reader
# is sourced in a subshell so its function namespace never leaks into this script.
BUDGET=""
if [ -f "$_here/read-config.sh" ]; then
  # The reader is a bundled sibling, resolved beside this script at runtime.
  # shellcheck disable=SC1091
  BUDGET=$( ( source "$_here/read-config.sh" >/dev/null 2>&1 && read_nested_config_key subagents wallClockMinutes ) 2>/dev/null )
fi
case "$BUDGET" in ''|*[!0-9]*) BUDGET=10 ;; esac
[ "$BUDGET" -ge 1 ] 2>/dev/null || BUDGET=10

SINCE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if ! jq --arg kind "$KIND" --arg label "$LABEL" --arg since "$SINCE" --argjson budget "$BUDGET" \
     '.waiting_on = {kind: $kind, label: $label, since: $since, budget_minutes: $budget}' "$LOCK" > "$TMP"; then
  rm -f "$TMP"
  echo "set-waiting-on: jq write failed" >&2
  exit 1
fi
mv "$TMP" "$LOCK"
echo "set-waiting-on: waiting on $LABEL ($KIND, $BUDGET min)"
exit 0
