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
#   7.   Every Steps 5–6 loop member (qa-story, qa-task, qa-fix, review-pr)
#        noops — lock preserved, current_step untouched. review-pr is Step 5c,
#        the loop's exit gate, and joined the arm with task 77.
#   8.   Zero-byte lock fails closed — exit non-zero, lock untouched, and
#        NOTHING on stdout. Task 90: `jq` on empty input emits nothing and exits
#        0, so this used to print "step 0 → 5", exit 0, and leave the lock empty.
#   9.   Whitespace-only lock behaves identically and is not truncated (before
#        the fix this path DESTROYED a file that had content).
#   10.  A pre-existing symlink at $LOCK.tmp does not receive the write — the
#        temp file is now `mktemp`'d on an unpredictable name in the lock's dir.
#   11.  --complete still removes a zero-byte lock. This exemption is deliberate
#        and pinned here: gating --complete on the new guard would make a corrupt
#        lock permanently unclearable, which is worse than the bug being fixed.
#
# Scenarios 8–11 run under BOTH bash and zsh. macOS logins are zsh and task 51
# found a real bash/zsh divergence in a sibling shared resource, so the
# interpreter is a variable worth covering. Guarded on `command -v zsh`:
# ubuntu-latest carries no zsh, and an unguarded pass would turn CI red on
# absence rather than green on skip — the convention tracker-access.test.sh
# §12 and §45 already use.

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

# ── Scenario 7: Steps 5–6 loop members noop, leaving the lock untouched ──────
#
# The orchestrator drives this loop explicitly, so no member may advance the
# lock. Note what this does and does NOT prove: an unlisted skill also exits 0
# via the `*)` catch-all, so removing any name from the loop arm leaves these
# assertions green. They pin the CONTRACT (a loop member must not advance the
# lock), not the presence of the arm. See task 77 §8 — that mutation is
# expected not to hold, and the diagnosis is redundant source, not a vacuous
# test.
for SKILL in qa-story qa-task qa-fix review-pr; do
  for STEP in 5 6; do
    LOCK_FILE="$TMPDIR_TEST/loop-$SKILL-$STEP.lock"
    write_lock "$STEP"
    PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --skill "$SKILL" >/dev/null 2>&1
    RC=$?
    if [ ! -f "$LOCK_FILE" ]; then
      fail "$SKILL at step $STEP noops" "lock file was removed"
    elif [ "$RC" -ne 0 ]; then
      fail "$SKILL at step $STEP noops" "exit code $RC, expected 0"
    else
      GOT=$(jq -r '.current_step' "$LOCK_FILE")
      if [ "$GOT" = "$STEP" ]; then
        pass "$SKILL at step $STEP noops (lock preserved, step unchanged)"
      else
        fail "$SKILL at step $STEP noops" "current_step changed: $STEP → $GOT"
      fi
    fi
  done
done

# ── Scenarios 8–11: malformed-lock fail-closed + temp-write hardening ────────
#
# Parameterised on the interpreter so the same four assertions run under bash and
# zsh without being written twice. The script's shebang says bash, but nothing
# stops a zsh shell invoking it directly.
run_malformed_lock_scenarios() {
  SH="$1"

  # ── 8. Zero-byte lock → fail closed ────────────────────────────────────────
  # Three separate claims, each of which was false before the fix: non-zero exit,
  # lock untouched, and no success line. The third matters most — the whole
  # defect is that a caller was TOLD the pipeline advanced.
  LOCK_FILE="$TMPDIR_TEST/empty-$SH.lock"
  : > "$LOCK_FILE"
  OUT=$(PIPELINE_LOCK="$LOCK_FILE" "$SH" "$SCRIPT" 5 2>/dev/null)
  RC=$?
  SIZE=$(wc -c < "$LOCK_FILE" | tr -d ' ')
  if [ "$RC" -eq 0 ]; then
    fail "[$SH] zero-byte lock fails closed" "exit 0, expected non-zero"
  elif [ "$SIZE" != "0" ]; then
    fail "[$SH] zero-byte lock fails closed" "lock was written: $SIZE bytes"
  elif [ -n "$OUT" ]; then
    fail "[$SH] zero-byte lock fails closed" "success line on stdout: $OUT"
  else
    pass "[$SH] zero-byte lock fails closed (exit $RC, untouched, silent stdout)"
  fi

  # ── 9. Whitespace-only lock → fail closed, and NOT truncated ───────────────
  # Distinct from scenario 8: this file has content, and the pre-fix path
  # replaced it with jq's empty output — a destructive silent success.
  LOCK_FILE="$TMPDIR_TEST/whitespace-$SH.lock"
  printf '   \n\t\n' > "$LOCK_FILE"
  BEFORE=$(wc -c < "$LOCK_FILE" | tr -d ' ')
  OUT=$(PIPELINE_LOCK="$LOCK_FILE" "$SH" "$SCRIPT" 5 2>/dev/null)
  RC=$?
  AFTER=$(wc -c < "$LOCK_FILE" | tr -d ' ')
  if [ "$RC" -eq 0 ]; then
    fail "[$SH] whitespace-only lock fails closed" "exit 0, expected non-zero"
  elif [ "$AFTER" != "$BEFORE" ]; then
    fail "[$SH] whitespace-only lock fails closed" "truncated: $BEFORE → $AFTER bytes"
  elif [ -n "$OUT" ]; then
    fail "[$SH] whitespace-only lock fails closed" "success line on stdout: $OUT"
  else
    pass "[$SH] whitespace-only lock fails closed (exit $RC, $AFTER bytes intact)"
  fi

  # ── 10. A symlink at $LOCK.tmp must not receive the write ──────────────────
  # Asserts BOTH halves: the canary is untouched AND the advance still succeeds.
  # Checking only the canary would pass a version that simply stopped working.
  LOCK_FILE="$TMPDIR_TEST/symlink-$SH.lock"
  write_lock 1
  CANARY="$TMPDIR_TEST/canary-$SH.txt"
  echo "CANARY-UNTOUCHED" > "$CANARY"
  ln -sf "$CANARY" "$LOCK_FILE.tmp"
  PIPELINE_LOCK="$LOCK_FILE" "$SH" "$SCRIPT" 3 >/dev/null 2>&1
  RC=$?
  GOT_CANARY=$(cat "$CANARY")
  GOT_STEP=$(jq -r '.current_step' "$LOCK_FILE" 2>/dev/null)
  if [ "$GOT_CANARY" != "CANARY-UNTOUCHED" ]; then
    fail "[$SH] symlink at \$LOCK.tmp is not followed" "canary was overwritten: $GOT_CANARY"
  elif [ "$RC" -ne 0 ]; then
    fail "[$SH] symlink at \$LOCK.tmp is not followed" "advance failed with exit $RC"
  elif [ "$GOT_STEP" != "3" ]; then
    fail "[$SH] symlink at \$LOCK.tmp is not followed" "lock not advanced: current_step=$GOT_STEP"
  else
    pass "[$SH] symlink at \$LOCK.tmp is not followed (canary intact, lock advanced 1 → 3)"
  fi

  # ── 11. --complete stays exempt from the new guard ─────────────────────────
  # Pins the §4 exemption. A corrupt lock that cannot be cleared is a worse
  # failure than the silent success this task fixes, so widening the guard to
  # cover --complete must break a test rather than ship.
  LOCK_FILE="$TMPDIR_TEST/complete-empty-$SH.lock"
  : > "$LOCK_FILE"
  PIPELINE_LOCK="$LOCK_FILE" "$SH" "$SCRIPT" --complete >/dev/null 2>&1
  RC=$?
  if [ -f "$LOCK_FILE" ]; then
    fail "[$SH] --complete removes a zero-byte lock" "lock still exists (guard over-applied)"
  elif [ "$RC" -ne 0 ]; then
    fail "[$SH] --complete removes a zero-byte lock" "exit code $RC, expected 0"
  else
    pass "[$SH] --complete removes a zero-byte lock (exemption holds)"
  fi
}

run_malformed_lock_scenarios bash

if command -v zsh >/dev/null 2>&1; then
  run_malformed_lock_scenarios zsh
else
  echo "  SKIP  zsh interpreter pass for scenarios 8-11 (zsh not on this host)"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
