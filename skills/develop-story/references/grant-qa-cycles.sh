#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/grant-qa-cycles.sh. Regenerate via `npm run bundle`.
# grant-qa-cycles.sh — record a re-entry grant of k extra QA cycles on the pipeline lock.
#
# Sibling of set-qa-phase.sh and advance-pipeline-lock.sh (task.123, QA cycle 2 CR-1/CR-2).
# Phase 0b of a develop-{story,task} resume after a loop-limit or not-converging halt offers
# "Resume the QA loop with {k} more cycles"; on accept this script is the ONE writer of
# the grant. It does three things the prose used to leave to the caller, and each
# was a defect when left there:
#
#   1. RECONSTRUCTS the cycle count from the gates on disk — the highest {N} in
#      <doc-dir>/*.gate.{N}.*.yml. The grant is relative to that count, never to
#      the original budget of 5: every gate written since (an operator's
#      standalone run, a previous grant) has consumed a cycle number
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
#   3. WRITES four fields atomically — extra_cycles_granted = k (the record),
#      qa_max_cycles = QA_CYCLE + k (the absolute budget Loop Setup reads), qa_phase
#      (the re-entry point) and convergence_from_cycle = QA_CYCLE + 1 — via
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
#     a snapshot with NO task_or_story_directory (the pre-task.123 shape) is REFUSED by --restore as
#     `legacy-snapshot` and the grant relays that refusal; the operator restores it by hand with
#     `advance-pipeline-lock.sh --restore --accept-legacy <doc-dir>` first, or deletes it (task.130);
#     that restore stamps the rebuilt lock with <doc-dir> as passed, so every snapshot derived
#     from it is a matched candidate and the grant needs no flag after it — a present
#     task_or_story_directory is never overwritten;
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
#   • otherwise → writes extra_cycles_granted, qa_max_cycles, qa_phase AND convergence_from_cycle
#     (= base + 1, the first cycle the Convergence check reads after the grant — task.239) in one
#     write. qa_phase is the
#     RE-ENTRY POINT, and it depends on evidence, not on the halt reason (task.244; obs #228, #17):
#       - no code moved since the latest gate (code-moved-since-gate.sh prints 0) → 5b. Every halt
#         now stops at a gate whose queue was never handed to /qa-fix: the Convergence check fires
#         at 5a BEFORE 5b, and the loop limit is reached at a gate (the loop ends on a gate).
#         Re-entering at 5a would review unchanged code, re-raise the same findings and spend the
#         grant with no fix attempted. 5b on the latest gate finishes that cycle first.
#       - code moved (a commit, an uncommitted edit or an untracked file outside the work item) →
#         5a: the gate no longer describes the tree, so a fresh review + gate must read it.
#       - the helper is missing, or cannot answer, or the gate cannot be resolved → 5a, with a
#         warning on stderr: a stale gate is never trusted.
#     The halt reason is not read. (Before task.244 only `not-converging` re-entered at 5b.)
#     Either way a Stop between this write and a separate set-qa-phase call would otherwise name the
#     wrong phase (task.123 QA cycle 3, CR-3). Then prints
#     `grant-qa-cycles: QA_CYCLE=<base> extra_cycles_granted=<k> qa_max_cycles=<n> reenter_at=<5a|5b> convergence_from_cycle=<base+1>`
#     with <n>, the phase and the window start read BACK from the written lock (the tokens before
#     convergence_from_cycle keep their order: callers read reenter_at=), and, when the lock was restored,
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
# The QA cycle has ONE definition, the sibling qa-cycle.sh (task.158 CR-1): this script
# carried its own sed loop, which kept a zero-padded gate's `08` and then died in
# `$((QA_CYCLE + K))` with "value too great for base" while the resume contract, one step
# earlier in the same procedure, read cycle 8.
# bundle-dependency: shared/resources/qa-cycle.sh
QA_CYCLE_SH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/qa-cycle.sh"
# The re-entry phase reads whether code moved since the latest gate, and that has ONE definition
# too (task.244): the sibling code-moved-since-gate.sh, also called by qa-task Phase 0.
# bundle-dependency: shared/resources/code-moved-since-gate.sh
CODE_MOVED_SH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/code-moved-since-gate.sh"

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

# 1. Reconstruct QA_CYCLE from disk through qa-cycle.sh — the highest {N} over
#    *.gate.{N}.*.yml, leading zeros stripped (gate.08 is 8). rc 1 is its refusal (no
#    numbered gate); anything else means the helper did not run.
if [ ! -f "$QA_CYCLE_SH" ]; then
  echo "grant-qa-cycles: qa-cycle.sh not found beside this script ($QA_CYCLE_SH) — re-bundle the skill" >&2
  exit 1
fi
# The helper's stderr is kept, not discarded: its rc 1 covers both "no gate file" and "gate
# files with no usable cycle number", and only its message tells them apart (task.158 QA
# cycle 2, QA2-CR-1).
QA_CYCLE_ERR=$(mktemp)
QA_CYCLE=$(bash "$QA_CYCLE_SH" "$DOC_DIR" 2>"$QA_CYCLE_ERR"); rc=$?
QA_CYCLE_WHY=$(sed -n '1s/^⚠️ *qa-cycle: *//p' "$QA_CYCLE_ERR"); rm -f "$QA_CYCLE_ERR"
if [ "$rc" -gt 1 ]; then
  echo "grant-qa-cycles: qa-cycle.sh not runnable (rc=$rc) — cannot reconstruct the QA cycle" >&2
  exit 1
fi
if [ -z "$QA_CYCLE" ]; then
  # A separate default, not ${QA_CYCLE_WHY:-…}: the default text holds `{N}`, whose `}`
  # would close the expansion early.
  [ -n "$QA_CYCLE_WHY" ] || QA_CYCLE_WHY="no *.gate.{N}.*.yml in '$DOC_DIR'"
  echo "grant-qa-cycles: nothing to grant against — $QA_CYCLE_WHY" >&2
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
# present, else the candidate `--restore` WILL consume — so a refusal writes nothing and
# restores nothing (task.123 QA cycle 4, CR-1). The candidate is read through
# `advance-pipeline-lock.sh --restore --which`, the same selection the restore uses: a guard
# that read `$SNAPSHOT` directly passed on the snapshot's budget while the restore consumed a
# newer `.pausing.<pid>` claim carrying a higher one (task.130; task.124 QA cycle 1, CR-5).
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
CHOSEN=""
if [ -f "$LOCK" ]; then
  EXISTING=$(read_budget "$LOCK")
elif [ -f "$ADVANCE" ] && CHOSEN=$(bash "$ADVANCE" --restore --which "$DOC_DIR" 2>/dev/null) && [ -n "$CHOSEN" ]; then
  EXISTING=$(read_budget "$CHOSEN")
else
  # Nothing --which would restore from (or the helper is missing): the guard has nothing to
  # protect, and step 3's own --restore call names the reason on stderr.
  EXISTING=0
fi
if [ "$EXISTING" -gt "$NEW_MAX" ]; then
  echo "grant-qa-cycles: the run already carries qa_max_cycles=$EXISTING, higher than $QA_CYCLE + $K = $NEW_MAX — refusing to lower the budget (k must be at least $((EXISTING - QA_CYCLE + 1)) to extend it; no grant is needed to run cycles up to $EXISTING)" >&2
  exit 1
fi

# 3. Restore the lock from the halt snapshot when the HALT removed it — via the one
# restore path. --restore refuses a snapshot for another document (task.123 QA cycle 3,
# CR-5), strips the halt/pause fields, matches directories canonicalised (QA cycle 4,
# CR-4), refuses a snapshot with no directory unless `--accept-legacy` is passed (task.130),
# and CONSUMES the snapshot. Its stderr is relayed verbatim so the operator sees which rule
# refused.
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

# 4. Write the four fields atomically. Every REFUSAL (bad k, no gates, never-lower) has
# already exited above, before the restore; the only failure left is a jq write failure,
# and after a restore that CONSUMED its snapshot the lock is now the only copy of the
# run's state — so it is kept, not removed. A lock at halt_step with no grant is a
# resumable state; no lock and no snapshot is not.
# qa_phase in the SAME write — 5b when no code moved since the latest gate (its fix never ran),
# else 5a — so a Stop hook firing between this write and a separate set-qa-phase call never
# reads the snapshot's phase and names the wrong step (obs #228).
# convergence_from_cycle in the SAME write — base + 1, the first cycle whose reading the grant
# pays for. The Convergence check counts readings only from it, so "k more cycles" runs k cycles
# instead of tripping on the pre-grant readings it was granted past (task.239, obs #72). It can
# still trip from the third granted cycle on, when HIGH stays present and stops falling.
undo_restore() { [ -n "$RESTORED" ] && echo "grant-qa-cycles: lock restored from $RESTORED is kept (its snapshot was consumed); the grant was not written" >&2; return 0; }
TMP=$(mktemp "$(dirname "$LOCK")/.grant-qa-cycles.XXXXXX") || { undo_restore; exit 1; }
# The re-entry phase is decided by EVIDENCE, not by the halt reason (task.244). The loop ends on a
# gate, so a loop-limit halt leaves a gate whose queue was never handed to /qa-fix: when no code
# moved since that gate, 5b on it is the next step, exactly as after a not-converging halt (obs
# #228, obs #17). When code moved (a commit, an uncommitted edit or an untracked file outside the
# work item — an operator's hand fix, a rebase), the gate no longer describes the tree and 5a must
# read it afresh. The helper that answers is the ONE definition of "code moved since the gate" that
# qa-task Phase 0 also uses; if it cannot answer, the safe re-entry is 5a, which re-reads, with a
# warning — never 5b on a gate that may be stale.
LATEST_GATE=$(bash "$QA_CYCLE_SH" "$DOC_DIR" --path gate 2>/dev/null)
REENTER=5a
if [ -z "$LATEST_GATE" ]; then
  echo "grant-qa-cycles: could not resolve the latest gate in '$DOC_DIR' — re-entering at 5a" >&2
elif [ ! -f "$CODE_MOVED_SH" ]; then
  echo "grant-qa-cycles: code-moved-since-gate.sh not found beside this script ($CODE_MOVED_SH) — cannot tell whether code moved since the gate; re-entering at 5a (re-bundle the skill)" >&2
# Any untracked file outside the work item counts as moved (the helper cannot tell a restored file
# from a new fix file): a fail-safe that can spend a granted gate on unchanged code, never skip one.
elif MOVED=$(bash "$CODE_MOVED_SH" "$DOC_DIR" "$LATEST_GATE" 2>/dev/null) && [ "$MOVED" -ge 0 ] 2>/dev/null; then
  [ "$MOVED" -eq 0 ] && REENTER=5b
else
  echo "grant-qa-cycles: code-moved-since-gate.sh could not answer for '$LATEST_GATE' — re-entering at 5a" >&2
fi
if ! jq --argjson k "$K" --argjson c "$QA_CYCLE" --arg p "$REENTER" \
     '.extra_cycles_granted = $k | .qa_max_cycles = ($c + $k) | .qa_phase = $p
      | .convergence_from_cycle = ($c + 1)' "$LOCK" > "$TMP"; then
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
echo "grant-qa-cycles: QA_CYCLE=$QA_CYCLE extra_cycles_granted=$K qa_max_cycles=$WRITTEN reenter_at=$(jq -r '.qa_phase' "$LOCK") convergence_from_cycle=$(jq -r '.convergence_from_cycle' "$LOCK")"
exit 0
