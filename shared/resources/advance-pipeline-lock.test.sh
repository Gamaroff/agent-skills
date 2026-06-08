#!/usr/bin/env bash
# advance-pipeline-lock.test.sh — regression tests for advance-pipeline-lock.sh
#
# Usage: bash shared/resources/advance-pipeline-lock.test.sh
#
# Focus: the commit-changes self-advance guard. commit-changes is invoked at
# three points in a single pipeline run (create-pr Step 4, qa-fix Steps 5–6,
# terminal Step 8). Only the Step 8 invocation may remove the lock; the nested
# invocations must preserve it so PreCompact/Stop hooks keep working.
#
# Covers:
#   1–3. Nested commit-changes (current_step 4/5/6) preserves lock, step unchanged
#   4.   Terminal commit-changes (current_step 8) removes lock
#   5.   Explicit --complete removes lock unconditionally (current_step 4)
#   6.   No lock file → exit 0, noop

PASS=0
FAIL=0
SCRIPT="$(cd "$(dirname "$0")" && pwd)/advance-pipeline-lock.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# write_lock STEP → creates a lock file at $LOCK_FILE with given current_step
write_lock() {
  printf '{"current_step": %s, "story": "demo"}\n' "$1" > "$LOCK_FILE"
}

# ── Scenarios 1–3: nested commit-changes preserves the lock ──────────────────
for STEP in 4 5 6; do
  LOCK_FILE="$TMPDIR_TEST/nested-$STEP.lock"
  write_lock "$STEP"
  PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill commit-changes >/dev/null 2>&1
  if [ ! -f "$LOCK_FILE" ]; then
    fail "nested commit-changes at step $STEP preserves lock" "lock file was removed"
  else
    GOT=$(jq -r '.current_step' "$LOCK_FILE")
    if [ "$GOT" = "$STEP" ]; then
      pass "nested commit-changes at step $STEP preserves lock (step unchanged)"
    else
      fail "nested commit-changes at step $STEP preserves lock" "current_step changed: $STEP → $GOT"
    fi
  fi
done

# ── Scenario 4: terminal commit-changes (step 8) removes the lock ────────────
LOCK_FILE="$TMPDIR_TEST/terminal.lock"
write_lock 8
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill commit-changes >/dev/null 2>&1
if [ -f "$LOCK_FILE" ]; then
  fail "terminal commit-changes at step 8 removes lock" "lock file still exists"
else
  pass "terminal commit-changes at step 8 removes lock"
fi

# ── Scenario 5: explicit --complete removes lock unconditionally ─────────────
LOCK_FILE="$TMPDIR_TEST/complete.lock"
write_lock 4
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --complete >/dev/null 2>&1
if [ -f "$LOCK_FILE" ]; then
  fail "--complete removes lock unconditionally (step 4)" "lock file still exists"
else
  pass "--complete removes lock unconditionally (step 4)"
fi

# ── Scenario 6: no lock file → exit 0, noop ──────────────────────────────────
LOCK_FILE="$TMPDIR_TEST/absent.lock"
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill commit-changes >/dev/null 2>&1
RC=$?
if [ "$RC" -eq 0 ] && [ ! -f "$LOCK_FILE" ]; then
  pass "no lock file → exit 0 noop"
else
  fail "no lock file → exit 0 noop" "rc=$RC, lock present=$([ -f "$LOCK_FILE" ] && echo yes || echo no)"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
