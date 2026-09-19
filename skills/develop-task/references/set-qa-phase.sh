#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/set-qa-phase.sh. Regenerate via `npm run bundle`.
# set-qa-phase.sh — write the QA loop's sub-position into the pipeline lock.
#
# Sibling of advance-pipeline-lock.sh (task.123). Inside Steps 5–6 the lock's
# `current_step` stays 5 for the whole loop — 5a (review), 5b (fix), 5c (PR
# conformance review) — and a separate `qa_phase` field names the sub-step. The
# lock helper is monotonic by design and the loop's 5b → 5a re-entry is a
# backward move, so a step number cannot express it; a label can. This script is
# the ONLY writer of `qa_phase`, and it never touches `current_step`.
#
# It is a script rather than a shell function because every orchestrator Bash
# call is a fresh shell: a function defined in one fenced block of the step doc
# is unreachable from the block that calls it (task.123 QA cycle 1, CR-2). A
# script resolved from the repository root exists in every block.
#
# Usage:
#   bash .agents/skills/{develop-story|develop-task}/references/set-qa-phase.sh 5a|5b|5c
#
# Behaviour:
#   • No lock file           → exit 0, silent noop (standalone invocation — nothing to mark)
#   • jq missing             → exit 0, warn to stderr (degraded, same as advance-pipeline-lock.sh)
#   • argument not 5a|5b|5c  → exit 1, usage to stderr, lock untouched
#   • lock not a JSON object → exit 1, lock untouched, no success line
#   • otherwise              → atomic write via mktemp + mv; `current_step` preserved verbatim;
#                              prints `set-qa-phase: qa_phase → 5b`
#
# Reader: develop-pipeline-on-stop.sh names /qa-story|/qa-task, /qa-fix or /review-pr
# from this field on a step-5 lock; absent → 5a (the loud, re-entrant default).

set -uo pipefail

LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"

usage() {
  echo "Usage: set-qa-phase.sh 5a|5b|5c" >&2
  exit 1
}

PHASE="${1:-}"
case "$PHASE" in
  5a|5b|5c) ;;
  *) usage ;;
esac

# No lock = no active pipeline = nothing to mark.
[ -f "$LOCK" ] || exit 0

if ! command -v jq >/dev/null 2>&1; then
  echo "set-qa-phase: jq not found — qa_phase not written (degraded mode)" >&2
  exit 0
fi

# Fail closed on a lock that is not a JSON object — the same guard as
# advance-pipeline-lock.sh's require_parsable_lock, for the same reason: jq
# happily fabricates an object from `null`, `[]`, or a bare scalar.
if ! jq -e 'type == "object"' "$LOCK" >/dev/null 2>&1; then
  echo "set-qa-phase: lock is not a JSON object — refusing to write" >&2
  exit 1
fi

TMP=$(mktemp "$(dirname "$LOCK")/.set-qa-phase.XXXXXX") || {
  echo "set-qa-phase: could not create temp file beside '$LOCK'" >&2
  exit 1
}
if ! jq --arg p "$PHASE" '.qa_phase = $p' "$LOCK" > "$TMP"; then
  rm -f "$TMP"
  echo "set-qa-phase: jq write failed" >&2
  exit 1
fi
mv "$TMP" "$LOCK"
echo "set-qa-phase: qa_phase → $PHASE"
exit 0
