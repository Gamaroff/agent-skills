#!/usr/bin/env bash
# resume-prompt-check.sh — is the step a resume prompt names already done? (task.276, obs #95)
#
# Usage: resume-prompt-check.sh <doc-dir> <step> [<cycle>] [<implementation-report>]
#   <step>   a QA-loop sub-step (5a qa review, 5b qa-fix, 5c review-pr) with its <cycle>,
#            or a pipeline step number 1..8 (no cycle)
#
# A resume prompt names a step and a cycle ("resume qa-fix cycle 2"). It is a message written at one
# moment and read at another, so it can arrive after the work it names has finished: on task.217 a
# "resume qa-fix cycle 2" prompt arrived twice after cycle 2 had completed, and nothing in the run
# marked the step it had been issued for. This compares the prompt with the artefacts on disk and
# prints which of two things is true:
#
#   exit 0  `proceed: {step} {cycle}`          the named step is not complete; act on the prompt
#   exit 1  `already complete: {step} {cycle}`  the named step is complete (or the run is past it) —
#                                               report that and STOP; never re-run it
#   exit 2  usage error
#   exit 3  `cannot tell: …`                    an artefact the answer needs could not be read; do not
#                                               act on the prompt, report why, and ask
#
# What "complete" means, from artefacts only — never from the prompt's own wording, and never from a
# model's recollection:
#   5a cycle N   the highest gate on disk is >= N                       (qa-cycle.sh, the one gate definition)
#   5b cycle N   the highest gate on disk is > N — the next gate read the fix the prompt names
#   5c cycle N   the report's `### QA Cycle N` entry carries a `**PR Review**` line holding a verdict
#   step n       the report's Pipeline Progress row for step n starts with ✅ (or reads ⏭️ Skipped);
#                the QA loop is rows `5–6`, and counts as step 5
# and, whatever the artefacts, a live lock whose current_step is past the named step is complete:
# the lock is the run's own record of where it is (steps 5a-5c are all step 5 to the lock).
#
# The gate is read through qa-cycle.sh and nothing here derives a cycle from a file name
# (tests/qa-cycle.test.js forbids a second derivation).
#
# bundle-dependency: shared/resources/qa-cycle.sh

set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QA_CYCLE_SH="$HERE/qa-cycle.sh"
LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"

usage() {
  echo "Usage: resume-prompt-check.sh <doc-dir> <step: 5a|5b|5c|1..8> [<cycle>] [<implementation-report>]" >&2
  exit 2
}
cannot() { echo "cannot tell: $1" >&2; exit 3; }

DOC_DIR="${1:-}"
STEP="${2:-}"
[ -n "$DOC_DIR" ] && [ -n "$STEP" ] || usage
[ -d "$DOC_DIR" ] || usage
DOC_DIR="${DOC_DIR%/}"

case "$STEP" in
  5a|5b|5c)
    CYCLE="${3:-}"
    REPORT="${4:-}"
    case "$CYCLE" in ''|*[!0-9]*|0) echo "resume-prompt-check: step $STEP needs a cycle number >= 1, got '${CYCLE:-nothing}'" >&2; usage ;; esac
    ;;
  [1-8])
    CYCLE=""
    REPORT="${3:-}"
    [ $# -le 3 ] || usage
    ;;
  *) usage ;;
esac
NAMED="$STEP${CYCLE:+ $CYCLE}"
complete() { echo "already complete: $NAMED"; exit 1; }
proceed() { echo "proceed: $NAMED"; exit 0; }

command -v jq >/dev/null 2>&1 || cannot "jq not found"
[ -f "$QA_CYCLE_SH" ] || cannot "qa-cycle.sh not found beside this script ($QA_CYCLE_SH) — re-bundle the skill"

# The run's own record first: a lock past the named step makes the prompt stale whatever else is on disk.
# The same normalisation advance-pipeline-lock.sh's canon() applies: strip a leading ./ and trailing slashes,
# then resolve physically. A path that does not resolve prints itself.
canon() {
  local stripped
  stripped=$(printf '%s' "$1" | sed -E 's#^\./##; s#/+$##')
  (cd -P -- "$stripped" 2>/dev/null && pwd -P) || printf '%s' "$stripped"
}
if [ -f "$LOCK" ]; then
  jq -e 'type == "object"' "$LOCK" >/dev/null 2>&1 || cannot "the lock at '$LOCK' is not a JSON object"
  # A lock for ANOTHER document says nothing about this one (T276-QA-1): its step is that run's step.
  # A lock with no directory field (the pre-task.123 shape) is read as before.
  LOCK_DIR=$(jq -r '.task_or_story_directory // empty' "$LOCK")
  # A RELATIVE lock directory that does not resolve from this cwd cannot be compared: reading it as another
  # document's would let a step the run is past answer "proceed" (T276-QA-5). An absolute one that does not
  # exist cannot be this document's directory, which exists, so it is another's.
  case "$LOCK_DIR" in
    ''|/*) ;;
    *) (cd -P -- "$(printf '%s' "$LOCK_DIR" | sed -E 's#^\./##; s#/+$##')" 2>/dev/null) \
         || cannot "the lock names the relative directory '$LOCK_DIR', which does not resolve from '$(pwd)' — run this from the repository root" ;;
  esac
  if [ -n "$LOCK_DIR" ] && [ "$(canon "$LOCK_DIR")" != "$(canon "$DOC_DIR")" ]; then
    LOCK_IS_OURS=""
  else
    LOCK_IS_OURS=1
  fi
  if [ -n "$LOCK_IS_OURS" ]; then
    LOCK_STEP=$(jq -r '.current_step // empty | tostring' "$LOCK")
    case "$LOCK_STEP" in ''|*[!0-9]*) cannot "the lock at '$LOCK' has no numeric current_step" ;; esac
    case "$STEP" in 5a|5b|5c) NAMED_STEP=5 ;; *) NAMED_STEP="$STEP" ;; esac
    [ "$LOCK_STEP" -gt "$NAMED_STEP" ] && complete
  fi
fi

find_report() { # the newest implementation report in the document directory
  find "$DOC_DIR" -maxdepth 1 -type f -name '*implementation.[0-9]*.md' 2>/dev/null \
    | sed -nE 's/^(.*implementation\.)([0-9]+)(\..*)$/\2 \1\2\3/p' | sort -n | tail -1 | cut -d' ' -f2-
}

case "$STEP" in
  5a|5b)
    HIGHEST=$(bash "$QA_CYCLE_SH" "$DOC_DIR" 2>/dev/null) || HIGHEST=""
    case "$HIGHEST" in
      ''|*[!0-9]*)
        # No gate on disk. For 5a that is the ordinary state of a cycle not yet reviewed; for 5b it
        # means the gate the fix answers is missing, which the prompt cannot be checked against.
        [ "$STEP" = 5a ] && proceed
        cannot "no gate on disk for the fix to answer (qa-cycle.sh found none in '$DOC_DIR')" ;;
    esac
    if [ "$STEP" = 5a ]; then
      [ "$HIGHEST" -ge "$CYCLE" ] && complete
    else
      [ "$HIGHEST" -gt "$CYCLE" ] && complete
    fi
    proceed
    ;;
  5c)
    [ -n "$REPORT" ] || REPORT=$(find_report)
    [ -n "$REPORT" ] && [ -f "$REPORT" ] || cannot "no implementation report in '$DOC_DIR'"
    # The entry for this cycle: from its `### QA Cycle N` heading to the next heading of any level.
    ENTRY=$(awk -v n="$CYCLE" '
      /^#+ / { if (on) exit; if ($0 ~ "^### QA Cycle " n "([^0-9]|$)") on = 1 }
      on { print }
    ' "$REPORT") || cannot "could not read '$REPORT'"
    # The verdict must open the value: the pending template reads `{pending — 5c not yet run / APPROVE /
    # CONCERNS / …}` and lists every verdict word, so a search anywhere in the line reads it as done.
    printf '%s\n' "$ENTRY" | grep -qE '^\*\*PR Review\*\*: (APPROVE|CONCERNS|REQUEST CHANGES)([^A-Za-z]|$)' && complete
    proceed
    ;;
  *)
    [ -n "$REPORT" ] || REPORT=$(find_report)
    [ -n "$REPORT" ] && [ -f "$REPORT" ] || cannot "no implementation report in '$DOC_DIR'"
    # An alternation, not a bracket: the en dash is three bytes, and under LC_ALL=C a bracket class
    # matches single bytes, so the row was never found (T276-QA-4).
    case "$STEP" in 5) PATTERN='^\| *5(–|-)6\.' ;; *) PATTERN="^\\| *$STEP\\." ;; esac
    ROW=$(grep -E "$PATTERN" "$REPORT" | head -1)
    [ -n "$ROW" ] || cannot "no Pipeline Progress row for step $STEP in '$REPORT'"
    STATUS=$(printf '%s' "$ROW" | awk -F'|' '{ gsub(/^ +| +$/, "", $3); print $3 }')
    case "$STATUS" in "✅"*|"⏭️"*) complete ;; esac
    proceed
    ;;
esac
