#!/usr/bin/env bash
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
#   2. RESTORES the lock from the halt snapshot when no lock exists — by calling
#      `advance-pipeline-lock.sh --restore <doc-dir>`, the ONE restore path (task.124,
#      Phase 4; this script carried its own until then). A terminal HALT removes the
#      lock and leaves develop-pipeline.last-halt.json (a superset of the lock plus
#      halted_at / halt_reason / halt_step); a resume skips Step 1, which is the
#      only ordinary writer of the lock. Without this the grant had nowhere to go
#      and jq failed on a missing file (QA cycle 2, CR-1). The document-match
#      check, the field stripping and the consumption policy (the snapshot is
#      deleted once restored) all live in --restore, so the two callers cannot
#      drift. The never-lower guard below runs BEFORE the restore, so a refusal
#      restores nothing and consumes nothing.
#   3. WRITES both fields atomically — extra_cycles_granted = k (the record) and
#      qa_max_cycles = QA_CYCLE + k (the absolute budget Loop Setup reads) — via
#      mktemp + mv, and removes the temp file on any failure.
#
# Usage:
#   bash .agents/skills/{develop-story|develop-task}/references/grant-qa-cycles.sh <doc-dir> <k> [<implementation-report>]
#
# The BASE the grant is added to is max(highest gate on disk, `### QA Cycle` entries in
# the implementation report) — the same number the resume contract's reconstruction
# resumes from on BOTH of its paths (gates ahead of the report: cycles the operator ran
# by hand; report ahead of the gates: a gate never committed or deleted, resume from the
# report's count). A base of the highest gate alone granted nothing on the second path
# (task.123 QA cycle 3, CR-2). The report is optional: with no third argument the base
# is the highest gate, which is right whenever the report is not ahead.
#
# Behaviour:
#   • <k> not a positive integer without a leading zero, or <doc-dir> not a directory
#                                                              → exit 1, usage, nothing written
#     (a leading zero is octal to the shell and decimal to jq — refused rather than parsed twice)
#   • no gate.{N} file in <doc-dir>                            → exit 1 ("no gate on disk"), nothing written
#   • no lock AND no candidate (snapshot or orphaned claim)   → exit 1, nothing written (relayed from --restore)
#   • no lock AND advance-pipeline-lock.sh missing beside it    → exit 1, named message, nothing written
#   • snapshot present but for another document (its task_or_story_directory, canonicalised,
#     is not <doc-dir>, canonicalised — relative and absolute spellings of one directory match;
#     a snapshot with NO task_or_story_directory is a pre-task.123 shape and is accepted)
#                                                              → exit 1, nothing restored, nothing written
#     (the check is --restore's; this script surfaces its stderr line)
#   • jq missing                                               → exit 1 (this write cannot be skipped silently)
#   • lock present but not a JSON object                       → exit 1, lock untouched
#   • the lock (or the snapshot it would be restored from) already carries a HIGHER
#     qa_max_cycles                                            → exit 1, NOTHING written — the guard is evaluated
#     before any restore, and a lock restored in this call is removed again on any later refusal,
#     so a refusal never leaves state behind (task.123 QA cycle 4, CR-1); the message names the
#     smallest k that would be accepted
#   • qa_max_cycles on the lock is not an integer               → warning on stderr, treated as 0
#   • otherwise → writes extra_cycles_granted, qa_max_cycles AND qa_phase = 5a (an accepted grant is a
#     5a re-entry, and a Stop between this write and a separate set-qa-phase call would name /qa-fix
#     for an already-fixed cycle — task.123 QA cycle 3, CR-3), then prints
#     `grant-qa-cycles: QA_CYCLE=<base> extra_cycles_granted=<k> qa_max_cycles=<n>` with <n> read
#     BACK from the written lock, and, when the lock was restored,
#     `grant-qa-cycles: lock restored from <snapshot>` on stderr (relaying --restore's line)
#
# Paths honour PIPELINE_LOCK and PIPELINE_HALT_SNAPSHOT for tests; defaults are the pipeline's.
# Both are passed through to --restore unchanged.

set -uo pipefail

LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"
SNAPSHOT="${PIPELINE_HALT_SNAPSHOT:-.claude/state/develop-pipeline.last-halt.json}"
export PIPELINE_LOCK="$LOCK" PIPELINE_HALT_SNAPSHOT="$SNAPSHOT"
# The restore lives in the sibling lock helper. Declared for the bundler on its own line, so
# every skill that bundles this script also gets the sibling (QA cycle 2, CR-6):
# bundle-dependency: shared/resources/advance-pipeline-lock.sh
ADVANCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/advance-pipeline-lock.sh"

usage() {
  echo "Usage: grant-qa-cycles.sh <doc-dir> <k> [<implementation-report>]   (k = positive integer, no leading zero)" >&2
  exit 1
}

DOC_DIR="${1:-}"
K="${2:-}"
REPORT="${3:-}"
[ -d "$DOC_DIR" ] || usage
case "$K" in
  ''|*[!0-9]*|0*) usage ;;
esac
[ "$K" -ge 1 ] 2>/dev/null || usage
if [ -n "$REPORT" ] && [ ! -f "$REPORT" ]; then
  echo "grant-qa-cycles: implementation report '$REPORT' not found" >&2
  exit 1
fi

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
# The report's entry count is the other half of the reconstruction. `|| true`, not
# `|| echo 0`: grep -c prints 0 AND exits 1 on no match, so the latter yields "0\n0".
if [ -n "$REPORT" ]; then
  COMPLETED=$(grep -c '^### QA Cycle' "$REPORT" 2>/dev/null || true)
  COMPLETED=${COMPLETED:-0}
  if [ "$COMPLETED" -gt "$QA_CYCLE" ] 2>/dev/null; then
    echo "grant-qa-cycles: report has $COMPLETED QA Cycle entries, disk has gate.$QA_CYCLE — base is the report's count" >&2
    QA_CYCLE="$COMPLETED"
  fi
fi

# 2. Never-lower guard FIRST, against whichever file the grant will land on — the lock if
# present, else the snapshot it would be restored from — so a refusal writes nothing and
# restores nothing (task.123 QA cycle 4, CR-1).
read_budget() { # $1 = json file → integer budget, 0 when absent; warns on a non-integer
  local raw
  raw=$(jq -r '.qa_max_cycles // 0' "$1" 2>/dev/null)
  case "$raw" in
    ''|null) echo 0 ;;
    *[!0-9]*) echo "grant-qa-cycles: qa_max_cycles in $1 is not an integer ('$raw') — treating as 0" >&2; echo 0 ;;
    *) echo "$raw" ;;
  esac
}
NEW_MAX=$((QA_CYCLE + K))
if [ -f "$LOCK" ]; then
  EXISTING=$(read_budget "$LOCK")
elif [ -f "$SNAPSHOT" ] && jq -e 'type == "object"' "$SNAPSHOT" >/dev/null 2>&1; then
  EXISTING=$(read_budget "$SNAPSHOT")
else
  EXISTING=0
fi
if [ "$EXISTING" -gt "$NEW_MAX" ]; then
  echo "grant-qa-cycles: the run already carries qa_max_cycles=$EXISTING, higher than $QA_CYCLE + $K = $NEW_MAX — refusing to lower the budget (k must be at least $((EXISTING - QA_CYCLE + 1)) to extend it; no grant is needed to run cycles up to $EXISTING)" >&2
  exit 1
fi

# 3. Restore the lock from the halt snapshot when the HALT removed it — via the one
# restore path. --restore refuses a snapshot for another document (task.123 QA cycle 3,
# CR-5), strips the halt/pause fields, matches directories canonicalised (QA cycle 4,
# CR-4), accepts a snapshot with no directory (pre-task.123 shape, CR-7), and CONSUMES
# the snapshot. Its stderr is relayed verbatim so the operator sees which rule refused.
RESTORED=""
if [ ! -f "$LOCK" ]; then
  # No snapshot-only pre-check here (QA cycle 2, CR-7): --restore also accepts an orphaned
  # `.lock.pausing.<pid>` claim, and its own "nothing to restore" refusal is relayed below.
  if [ ! -f "$ADVANCE" ]; then
    echo "grant-qa-cycles: advance-pipeline-lock.sh not found beside this script ($ADVANCE) — the restore cannot run; re-bundle the skill" >&2
    exit 1
  fi
  if ! RESTORE_OUT=$(bash "$ADVANCE" --restore "$DOC_DIR" 2>&1); then
    printf '%s\n' "$RESTORE_OUT" | sed 's/^advance-pipeline-lock:/grant-qa-cycles:/' >&2
    exit 1
  fi
  RESTORED=$(printf '%s\n' "$RESTORE_OUT" | sed -nE 's/^advance-pipeline-lock: lock restored from (.*) at step .*/\1/p')
  [ -n "$RESTORED" ] || RESTORED="$SNAPSHOT"
fi

if ! jq -e 'type == "object"' "$LOCK" >/dev/null 2>&1; then
  echo "grant-qa-cycles: lock is not a JSON object — refusing to write" >&2
  exit 1
fi

# 4. Write the three fields atomically. Every REFUSAL (bad k, no gates, never-lower) has
# already exited above, before the restore; the only failure left is a jq write failure,
# and after a restore that CONSUMED its snapshot the lock is now the only copy of the
# run's state — so it is kept, not removed. A lock at halt_step with no grant is a
# resumable state; no lock and no snapshot is not.
# qa_phase = 5a in the SAME write: an accepted grant is by definition a 5a re-entry, and a
# Stop hook firing between this write and a separate set-qa-phase call would read the
# snapshot's 5b and name /qa-fix for an already-fixed cycle.
undo_restore() { [ -n "$RESTORED" ] && echo "grant-qa-cycles: lock restored from $RESTORED is kept (its snapshot was consumed); the grant was not written" >&2; return 0; }
TMP=$(mktemp "$(dirname "$LOCK")/.grant-qa-cycles.XXXXXX") || { undo_restore; exit 1; }
if ! jq --argjson k "$K" --argjson c "$QA_CYCLE" \
     '.extra_cycles_granted = $k | .qa_max_cycles = ($c + $k) | .qa_phase = "5a"' "$LOCK" > "$TMP"; then
  rm -f "$TMP"
  undo_restore
  echo "grant-qa-cycles: jq write failed" >&2
  exit 1
fi
mv "$TMP" "$LOCK"
[ -n "$RESTORED" ] && echo "grant-qa-cycles: lock restored from $RESTORED" >&2
# Read the budget BACK from the lock — one source, not a shell recomputation that can
# disagree with what jq wrote (task.123 QA cycle 3, CR-4).
WRITTEN=$(jq -r '.qa_max_cycles' "$LOCK")
echo "grant-qa-cycles: QA_CYCLE=$QA_CYCLE extra_cycles_granted=$K qa_max_cycles=$WRITTEN"
exit 0
