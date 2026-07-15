#!/usr/bin/env bash
# develop-pipeline-on-precompact.test.sh — regression tests for develop-pipeline-on-precompact.sh
#
# Usage: bash shared/resources/develop-pipeline-on-precompact.test.sh
#
# Focus: the snapshot-before-removal guarantee. The hook removes the pipeline lock
# on every exit path (EXIT trap). A harness kill before the graceful-pause flow
# completes must STILL leave a develop-pipeline.last-halt.json resume snapshot, so
# the next /develop-task invocation can resume via Phase 0b instead of finding the
# pipeline both unlocked and un-resumable.
#
# Covers:
#   1. Mid-run kill (jq forced absent) → lock removed BUT snapshot exists,
#      current_step preserved (deterministic stand-in for a SIGTERM mid-flow).
#   2. Success path → snapshot has pause_reason "precompact" + halt_step == current_step,
#      lock removed, PIPELINE-PAUSE-SIGNAL emitted.
#   3. No lock → exit 0 noop, a pre-existing snapshot is left untouched (idempotence).

PASS=0
FAIL=0
HOOK="$(cd "$(dirname "$0")" && pwd)/develop-pipeline-on-precompact.sh"
# Absolute bash path — Scenario 1 runs the hook under a restricted PATH (jq absent);
# an inline `PATH=… bash` prefix would also strip `bash` itself from lookup (rc=127).
BASH_BIN="$(command -v bash)"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# ── Scenario 1: mid-run kill simulated via jq-absent degraded path ───────────
# A restricted PATH containing the coreutils the degraded path needs but NOT jq.
# This forces `command -v jq` to fail regardless of where jq is installed, so the
# hook takes its early degraded exit: write_pause_snapshot falls back to `cp`, then
# the EXIT trap removes the lock. Equivalent to the harness killing the hook before
# it finishes the rich pause flow.
NOJQ_BIN="$TMPDIR_TEST/nojq-bin"
mkdir -p "$NOJQ_BIN"
for tool in dirname cp date rm cat mkdir; do
  src=$(command -v "$tool" 2>/dev/null) && [ -n "$src" ] && ln -sf "$src" "$NOJQ_BIN/$tool"
done

LOCK_FILE="$TMPDIR_TEST/s1/develop-pipeline.lock"
SNAP_FILE="$TMPDIR_TEST/s1/develop-pipeline.last-halt.json"
mkdir -p "$TMPDIR_TEST/s1"
printf '{"skill":"develop-task","current_step":4,"branch":"feature/x","report_path":""}\n' > "$LOCK_FILE"

PATH="$NOJQ_BIN" PIPELINE_LOCK="$LOCK_FILE" "$BASH_BIN" "$HOOK" >/dev/null 2>&1
if [ -f "$LOCK_FILE" ]; then
  fail "mid-run kill (jq absent) removes lock" "lock file still exists"
elif [ ! -f "$SNAP_FILE" ]; then
  fail "mid-run kill (jq absent) leaves snapshot" "snapshot was not written"
else
  GOT_STEP=$(jq -r '.current_step' "$SNAP_FILE" 2>/dev/null)
  if [ "$GOT_STEP" = "4" ]; then
    pass "mid-run kill (jq absent): lock removed, snapshot preserves current_step=4"
  else
    fail "mid-run kill (jq absent) preserves current_step" "expected 4, got '$GOT_STEP'"
  fi
fi

# ── Scenario 2: success path writes a tagged snapshot + emits the signal ─────
# report_path empty → report/git block skipped; no pr_url/tracker_issue → no gh calls.
LOCK_FILE="$TMPDIR_TEST/s2/develop-pipeline.lock"
SNAP_FILE="$TMPDIR_TEST/s2/develop-pipeline.last-halt.json"
mkdir -p "$TMPDIR_TEST/s2"
printf '{"skill":"develop-task","current_step":4,"branch":"feature/x","report_path":"","pr_url":"","tracker":"","tracker_issue":""}\n' > "$LOCK_FILE"

OUT=$(PIPELINE_LOCK="$LOCK_FILE" bash "$HOOK" 2>/dev/null)
RC=$?
if [ -f "$LOCK_FILE" ]; then
  fail "success path removes lock" "lock file still exists"
elif [ ! -f "$SNAP_FILE" ]; then
  fail "success path leaves snapshot" "snapshot was not written"
else
  REASON=$(jq -r '.pause_reason' "$SNAP_FILE" 2>/dev/null)
  HALT_STEP=$(jq -r '.halt_step' "$SNAP_FILE" 2>/dev/null)
  PAUSED_AT=$(jq -r '.paused_at' "$SNAP_FILE" 2>/dev/null)
  if [ "$REASON" != "precompact" ]; then
    fail "success path tags pause_reason" "expected 'precompact', got '$REASON'"
  elif [ "$HALT_STEP" != "4" ]; then
    fail "success path aliases halt_step=current_step" "expected 4, got '$HALT_STEP'"
  elif [ -z "$PAUSED_AT" ] || [ "$PAUSED_AT" = "null" ]; then
    fail "success path stamps paused_at" "paused_at missing"
  elif ! grep -qF "PIPELINE-PAUSE-SIGNAL" <<<"$OUT"; then
    fail "success path emits PIPELINE-PAUSE-SIGNAL" "signal absent from stdout (rc=$RC)"
  else
    pass "success path: snapshot tagged (pause_reason=precompact, halt_step=4), lock removed, signal emitted"
  fi
fi

# ── Scenario 3: no lock → noop, pre-existing snapshot untouched (idempotence) ─
LOCK_FILE="$TMPDIR_TEST/s3/develop-pipeline.lock"   # intentionally absent
SNAP_FILE="$TMPDIR_TEST/s3/develop-pipeline.last-halt.json"
mkdir -p "$TMPDIR_TEST/s3"
printf '{"sentinel":"do-not-clobber","current_step":7}\n' > "$SNAP_FILE"
SNAP_BEFORE=$(cat "$SNAP_FILE")

OUT=$(PIPELINE_LOCK="$LOCK_FILE" bash "$HOOK" 2>/dev/null)
RC=$?
SNAP_AFTER=$(cat "$SNAP_FILE")
if [ "$RC" -ne 0 ]; then
  fail "no lock → exit 0 noop" "rc=$RC"
elif [ "$SNAP_BEFORE" != "$SNAP_AFTER" ]; then
  fail "no lock → pre-existing snapshot untouched" "snapshot was modified"
elif ! grep -qF '"additionalContext":""' <<<"$OUT"; then
  fail "no lock → emits empty additionalContext" "unexpected output: $OUT"
else
  pass "no lock: exit 0 noop, pre-existing snapshot untouched, empty additionalContext"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
