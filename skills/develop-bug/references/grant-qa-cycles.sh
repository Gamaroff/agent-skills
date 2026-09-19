#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/grant-qa-cycles.sh. Regenerate via `npm run bundle`.
# grant-qa-cycles.sh — record a re-entry grant of k extra QA cycles on the pipeline lock.
#
# Sibling of set-qa-phase.sh and advance-pipeline-lock.sh (task.123, QA cycle 2 CR-1/CR-2).
# Phase 0b of a develop-{story,task} resume after a loop-limit halt offers
# "Resume at 5a with {k} more cycles"; on accept this script is the ONE writer of
# the grant. It does three things the prose used to leave to the caller, and each
# was a defect when left there:
#
#   1. RECONSTRUCTS the cycle count from the gates on disk — the highest {N} in
#      <doc-dir>/*.gate.{N}.*.yml. The grant is relative to that count, never to
#      the original budget of 5: every gate written since (a route-2c half-cycle,
#      an operator's standalone run, a previous grant) has consumed a cycle number
#      that "5 + k" would count against the grant (QA cycle 1, CR-1). Reading it
#      HERE, not in a neighbouring fenced block, is what makes the value exist:
#      every orchestrator Bash call is a fresh shell (QA cycle 2, CR-2).
#   2. RESTORES the lock from the halt snapshot when no lock exists. A terminal
#      HALT removes the lock and leaves develop-pipeline.last-halt.json (a
#      superset of the lock plus halted_at / halt_reason / halt_step); a resume
#      skips Step 1, which is the only ordinary writer of the lock. Without this
#      the grant had nowhere to go and jq failed on a missing file (QA cycle 2,
#      CR-1). The halt-only fields are dropped; PreCompact's paused_at /
#      pause_reason likewise.
#   3. WRITES both fields atomically — extra_cycles_granted = k (the record) and
#      qa_max_cycles = QA_CYCLE + k (the absolute budget Loop Setup reads) — via
#      mktemp + mv, and removes the temp file on any failure.
#
# Usage:
#   bash .agents/skills/{develop-story|develop-task}/references/grant-qa-cycles.sh <doc-dir> <k>
#
# Behaviour:
#   • <k> not a positive integer, or <doc-dir> not a directory → exit 1, usage, nothing written
#   • no gate.{N} file in <doc-dir>                            → exit 1 ("no gate on disk"), nothing written
#   • no lock AND no snapshot                                  → exit 1, nothing written
#   • jq missing                                               → exit 1 (this write cannot be skipped silently)
#   • lock present but not a JSON object                       → exit 1, lock untouched
#   • otherwise → prints `grant-qa-cycles: QA_CYCLE=<n> extra_cycles_granted=<k> qa_max_cycles=<n+k>`
#     and, when the lock was restored, `grant-qa-cycles: lock restored from <snapshot>` on stderr
#
# Paths honour PIPELINE_LOCK and PIPELINE_HALT_SNAPSHOT for tests; defaults are the pipeline's.

set -uo pipefail

LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"
SNAPSHOT="${PIPELINE_HALT_SNAPSHOT:-.claude/state/develop-pipeline.last-halt.json}"

usage() {
  echo "Usage: grant-qa-cycles.sh <doc-dir> <k>   (k = positive integer of extra cycles)" >&2
  exit 1
}

DOC_DIR="${1:-}"
K="${2:-}"
[ -d "$DOC_DIR" ] || usage
case "$K" in
  ''|*[!0-9]*) usage ;;
esac
[ "$K" -ge 1 ] 2>/dev/null || usage

if ! command -v jq >/dev/null 2>&1; then
  echo "grant-qa-cycles: jq not found — the grant cannot be recorded" >&2
  exit 1
fi

# 1. Reconstruct QA_CYCLE from disk: the highest {N} over *.gate.{N}.*.yml.
QA_CYCLE=""
for f in "$DOC_DIR"/*.gate.*.yml; do
  [ -e "$f" ] || continue
  n=$(printf '%s' "$f" | sed -E 's/.*\.gate\.([0-9]+)\..*/\1/')
  case "$n" in ''|*[!0-9]*) continue ;; esac
  if [ -z "$QA_CYCLE" ] || [ "$n" -gt "$QA_CYCLE" ]; then QA_CYCLE="$n"; fi
done
if [ -z "$QA_CYCLE" ]; then
  echo "grant-qa-cycles: no *.gate.{N}.*.yml in '$DOC_DIR' — nothing to grant against" >&2
  exit 1
fi

# 2. Restore the lock from the halt snapshot when the HALT removed it.
RESTORED=""
if [ ! -f "$LOCK" ]; then
  if [ ! -f "$SNAPSHOT" ]; then
    echo "grant-qa-cycles: no lock at '$LOCK' and no halt snapshot at '$SNAPSHOT' — cannot record a grant" >&2
    exit 1
  fi
  if ! jq -e 'type == "object"' "$SNAPSHOT" >/dev/null 2>&1; then
    echo "grant-qa-cycles: halt snapshot is not a JSON object — refusing to restore the lock from it" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$LOCK")"
  TMP=$(mktemp "$(dirname "$LOCK")/.grant-qa-cycles.XXXXXX") || exit 1
  if ! jq 'del(.halted_at, .halt_reason, .halt_step, .paused_at, .pause_reason)' "$SNAPSHOT" > "$TMP"; then
    rm -f "$TMP"
    echo "grant-qa-cycles: could not restore the lock from the snapshot" >&2
    exit 1
  fi
  mv "$TMP" "$LOCK"
  RESTORED="$SNAPSHOT"
fi

if ! jq -e 'type == "object"' "$LOCK" >/dev/null 2>&1; then
  echo "grant-qa-cycles: lock is not a JSON object — refusing to write" >&2
  exit 1
fi

# 3. Write both fields atomically.
TMP=$(mktemp "$(dirname "$LOCK")/.grant-qa-cycles.XXXXXX") || exit 1
if ! jq --argjson k "$K" --argjson c "$QA_CYCLE" \
     '.extra_cycles_granted = $k | .qa_max_cycles = ($c + $k)' "$LOCK" > "$TMP"; then
  rm -f "$TMP"
  echo "grant-qa-cycles: jq write failed" >&2
  exit 1
fi
mv "$TMP" "$LOCK"
[ -n "$RESTORED" ] && echo "grant-qa-cycles: lock restored from $RESTORED" >&2
echo "grant-qa-cycles: QA_CYCLE=$QA_CYCLE extra_cycles_granted=$K qa_max_cycles=$((QA_CYCLE + K))"
exit 0
