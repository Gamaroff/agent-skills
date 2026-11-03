#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/accept-qa-residual.sh. Regenerate via `npm run bundle`.
# accept-qa-residual.sh — record the owner's acceptance of a QA loop-limit residual and point the
# pipeline lock at Step 5c (task.251, obs #115, #150).
#
# Sibling of grant-qa-cycles.sh. Phase 0b of a develop-{story,task} resume after a LOOP-LIMIT halt
# offers "Accept the residual" (HALT option 2) beside the grant; on accept this script is the ONE
# writer of that decision. It does two things, in this order:
#
#   1. RECORDS the acceptance through accept-qa-residual.js: the highest gate becomes WAIVED with
#      an active waiver naming the approver and each open finding `status: waived`; the gate's
#      `### QA Cycle {N}` entry moves to `**Action**: Proceeding to 5c (PR conformance review)`
#      with a `**Loop exit**` row naming the decision; one Decisions Log line. Any refusal
#      (FAIL gate, not-converging escalation, no gate, …) exits 1 with the engine's JSON on stdout
#      and NOTHING written — no lock is restored for a refused acceptance.
#   2. RE-ENTERS at 5c: when the HALT removed the lock, restores it through
#      `advance-pipeline-lock.sh --restore <doc-dir>`, the one restore path (it refuses another
#      document's snapshot and a legacy one; the refusal is relayed verbatim), then writes
#      `qa_phase: 5c` in one atomic jq + mktemp + mv write. `current_step`, `qa_max_cycles` and
#      `extra_cycles_granted` are never touched: the budget is spent, and 5c is where an accepted
#      run leaves the loop on the existing WAIVED → 5c route.
#
# Crash-safe by order: the engine is idempotent per artefact, so a re-run after a Stop anywhere in
# here finishes the job (`already` from the engine, then the lock write).
#
# Usage:
#   bash .agents/skills/{develop-story|develop-task}/references/accept-qa-residual.sh \
#     <doc-dir> <implementation-report> "<approved-by>" "<reason>"
#
# Prints the engine's JSON line, then
#   accept-qa-residual: reason=<accepted|already> reenter_at=5c
# and, when the lock was restored, `accept-qa-residual: lock restored from <candidate>` on stderr.
# Exit 0 only when the acceptance is recorded AND the lock reads qa_phase 5c.
#
# Paths honour PIPELINE_LOCK and PIPELINE_HALT_SNAPSHOT for tests; defaults are the pipeline's.
# ACCEPT_QA_RESIDUAL_NOW (an ISO time) pins the engine's clock for tests.

set -uo pipefail

LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"
SNAPSHOT="${PIPELINE_HALT_SNAPSHOT:-.claude/state/develop-pipeline.last-halt.json}"
export PIPELINE_LOCK="$LOCK" PIPELINE_HALT_SNAPSHOT="$SNAPSHOT"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# bundle-dependency: shared/resources/accept-qa-residual.js
ENGINE="$HERE/accept-qa-residual.js"
# bundle-dependency: shared/resources/advance-pipeline-lock.sh
ADVANCE="$HERE/advance-pipeline-lock.sh"

usage() {
  echo 'Usage: accept-qa-residual.sh <doc-dir> <implementation-report> "<approved-by>" "<reason>"' >&2
  exit 2
}

DOC_DIR="${1:-}"
REPORT="${2:-}"
APPROVED_BY="${3:-}"
REASON="${4:-}"
[ -d "$DOC_DIR" ] || usage
[ -n "$REPORT" ] || usage
[ -n "${APPROVED_BY//[[:space:]]/}" ] || usage
[ -n "${REASON//[[:space:]]/}" ] || usage

if ! command -v jq >/dev/null 2>&1; then
  echo "accept-qa-residual: jq not found — the lock cannot be written" >&2
  exit 1
fi
if [ ! -f "$ENGINE" ]; then
  echo "accept-qa-residual: accept-qa-residual.js not found beside this script ($ENGINE) — re-bundle the skill" >&2
  exit 1
fi

# 1. Record the acceptance. `command node`: where `node` is an nvm shell function the bare form
#    prints nvm's help to stdout and corrupts the JSON.
#    No array for the optional --now: an empty array under `set -u` is an unbound variable on
#    bash < 4.4 (macOS ships 3.2), and it would fail every production call there.
if [ -n "${ACCEPT_QA_RESIDUAL_NOW:-}" ]; then
  OUT=$(command node "$ENGINE" --doc-dir "$DOC_DIR" --report "$REPORT" \
    --approved-by "$APPROVED_BY" --reason "$REASON" --now "$ACCEPT_QA_RESIDUAL_NOW" --json)
else
  OUT=$(command node "$ENGINE" --doc-dir "$DOC_DIR" --report "$REPORT" \
    --approved-by "$APPROVED_BY" --reason "$REASON" --json)
fi
RC=$?
printf '%s\n' "$OUT"
REASON_OUT=$(printf '%s' "$OUT" | jq -r '.reason // empty' 2>/dev/null)
if [ "$RC" -ne 0 ]; then
  echo "accept-qa-residual: not recorded (${REASON_OUT:-engine rc $RC}) — no lock written" >&2
  exit "$RC"
fi
case "$REASON_OUT" in
  accepted|already) ;;
  *) echo "accept-qa-residual: unexpected engine answer '${REASON_OUT}' — no lock written" >&2; exit 1 ;;
esac

# 2. Restore the lock when the HALT removed it — the one restore path.
RESTORED=""
if [ ! -f "$LOCK" ]; then
  if [ ! -f "$ADVANCE" ]; then
    echo "accept-qa-residual: advance-pipeline-lock.sh not found beside this script ($ADVANCE) — the restore cannot run; re-bundle the skill" >&2
    exit 1
  fi
  if ! RESTORE_OUT=$(bash "$ADVANCE" --restore "$DOC_DIR" 2>&1); then
    printf '%s\n' "$RESTORE_OUT" | sed 's/^advance-pipeline-lock:/accept-qa-residual:/' >&2
    exit 1
  fi
  RESTORED=$(printf '%s\n' "$RESTORE_OUT" | sed -nE 's/^advance-pipeline-lock: lock restored from (.*) at step .*/\1/p')
  [ -n "$RESTORED" ] || RESTORED="$SNAPSHOT"
fi

if ! jq -e 'type == "object"' "$LOCK" >/dev/null 2>&1; then
  echo "accept-qa-residual: lock is not a JSON object — refusing to write" >&2
  exit 1
fi

# 3. qa_phase: 5c, atomically. Nothing else on the lock changes.
TMP=$(mktemp "$(dirname "$LOCK")/.accept-qa-residual.XXXXXX") || {
  echo "accept-qa-residual: could not create a temp file beside '$LOCK'" >&2
  exit 1
}
if ! jq '.qa_phase = "5c"' "$LOCK" > "$TMP"; then
  rm -f "$TMP"
  echo "accept-qa-residual: jq write failed" >&2
  exit 1
fi
mv "$TMP" "$LOCK"
[ -n "$RESTORED" ] && echo "accept-qa-residual: lock restored from $RESTORED" >&2
echo "accept-qa-residual: reason=$REASON_OUT reenter_at=$(jq -r '.qa_phase' "$LOCK")"
exit 0
