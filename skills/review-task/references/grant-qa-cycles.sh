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
#   • no lock AND no snapshot                                  → exit 1, nothing written
#   • snapshot present but for another document (its task_or_story_directory, canonicalised,
#     is not <doc-dir>, canonicalised — relative and absolute spellings of one directory match;
#     a snapshot with NO task_or_story_directory is a pre-task.123 shape and is accepted)
#                                                              → exit 1, nothing restored, nothing written
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
#     `grant-qa-cycles: lock restored from <snapshot>` on stderr
#
# Paths honour PIPELINE_LOCK and PIPELINE_HALT_SNAPSHOT for tests; defaults are the pipeline's.

set -uo pipefail

LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"
SNAPSHOT="${PIPELINE_HALT_SNAPSHOT:-.claude/state/develop-pipeline.last-halt.json}"

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

# 3. Restore the lock from the halt snapshot when the HALT removed it.
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
  # A stale snapshot for ANOTHER document persists by design (the detector drops it; it
  # is never deleted). Restoring it here would resurrect the other task's branch, pr_url
  # and report_path as this task's lock (task.123 QA cycle 3, CR-5). Compare directories
  # with trailing slashes and a leading ./ normalised away.
  # Canonicalise BOTH sides: the lock's task_or_story_directory is the relative path the
  # pipeline wrote (docs/tasks/…) while an orchestrator often passes the resolver's absolute
  # path (task.123 QA cycle 4, CR-4). A snapshot with no directory at all is the pre-task.123
  # shape; it is accepted, because refusing it would strand every run that predates the field.
  SNAP_DIR=$(jq -r '.task_or_story_directory // ""' "$SNAPSHOT")
  canon() { # strip ./ and trailing slashes, then resolve; fall back to the stripped string
    local stripped
    stripped=$(printf '%s' "$1" | sed -E 's#^\./##; s#/+$##')
    (cd "$stripped" 2>/dev/null && pwd -P) || printf '%s' "$stripped"
  }
  if [ -n "$SNAP_DIR" ] && [ "$(canon "$SNAP_DIR")" != "$(canon "$DOC_DIR")" ]; then
    echo "grant-qa-cycles: halt snapshot is for '$SNAP_DIR', not '$DOC_DIR' — refusing to restore the lock from it" >&2
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

# 4. Write the three fields atomically. A lock this call restored is removed again on any
# failure from here on, so a refusal never leaves a half-made lock behind.
# qa_phase = 5a in the SAME write: an accepted grant is by definition a 5a re-entry, and a
# Stop hook firing between this write and a separate set-qa-phase call would read the
# snapshot's 5b and name /qa-fix for an already-fixed cycle.
undo_restore() { [ -n "$RESTORED" ] && rm -f "$LOCK"; return 0; }
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
