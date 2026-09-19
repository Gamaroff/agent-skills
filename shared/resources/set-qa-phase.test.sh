#!/usr/bin/env bash
# set-qa-phase.test.sh — regression tests for set-qa-phase.sh (task.123)
#
# Usage: bash shared/resources/set-qa-phase.test.sh
#
# The writer half of the qa_phase contract. The reader half (on-stop.sh) is
# pinned by develop-pipeline-on-stop.test.sh; the helper's refusal to move
# backwards by advance-pipeline-lock.test.sh. This suite pins that the writer:
#
#   1. writes each of 5a/5b/5c, and NEVER touches current_step or any other field
#   2. refuses anything but 5a|5b|5c, leaving the lock byte-identical
#   3. noops silently with no lock (standalone invocation)
#   4. fails closed on a non-object lock (null / [] / scalar / empty)
#   5. leaves no temp file behind, and does not follow a planted symlink
#   6. is a SCRIPT reachable from the repository root — the reason it exists (CR-2):
#      a second shell can call it, which a function defined in a fenced block cannot be

PASS=0
FAIL=0
SCRIPT="$(cd "$(dirname "$0")" && pwd)/set-qa-phase.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

write_lock() { # $1 = step
  printf '{"current_step": %s, "skill": "develop-task", "pr_url": "https://x/1"}\n' "$1" > "$LOCK_FILE"
}

# ── 1. each phase writes, and only qa_phase changes ──────────────────────────
for PHASE in 5a 5b 5c; do
  LOCK_FILE="$TMPDIR_TEST/phase-$PHASE.lock"
  write_lock 5
  OUT=$(PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "$PHASE" 2>/dev/null); RC=$?
  GOT=$(jq -r '.qa_phase' "$LOCK_FILE")
  STEP=$(jq -r '.current_step' "$LOCK_FILE")
  KEYS=$(jq -r 'keys | join(",")' "$LOCK_FILE")
  if [ "$RC" -ne 0 ] || [ "$GOT" != "$PHASE" ]; then
    fail "writes qa_phase $PHASE" "rc=$RC qa_phase=$GOT"
  elif [ "$STEP" != "5" ] || [ "$KEYS" != "current_step,pr_url,qa_phase,skill" ]; then
    fail "writes qa_phase $PHASE without touching other fields" "current_step=$STEP keys=$KEYS"
  elif ! echo "$OUT" | grep -q "qa_phase → $PHASE"; then
    fail "writes qa_phase $PHASE with a confirmation line" "stdout: $OUT"
  else
    pass "writes qa_phase $PHASE (current_step and other fields untouched)"
  fi
done

# ── 1b. rewriting is a backward move the lock helper refuses — this one allows it ──
LOCK_FILE="$TMPDIR_TEST/reentry.lock"
write_lock 5
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" 5b >/dev/null 2>&1
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" 5a >/dev/null 2>&1
if [ "$(jq -r '.qa_phase' "$LOCK_FILE")" = "5a" ] && [ "$(jq -r '.current_step' "$LOCK_FILE")" = "5" ]; then
  pass "5b → 5a re-entry rewrites qa_phase (the move current_step cannot make)"
else
  fail "5b → 5a re-entry" "lock: $(cat "$LOCK_FILE")"
fi

# ── 2. refuses anything else, lock byte-identical ────────────────────────────
for BAD in "" 5d 6 5A "5a 5b" "; rm -rf /"; do
  LOCK_FILE="$TMPDIR_TEST/bad-$RANDOM.lock"
  write_lock 5
  BEFORE=$(cat "$LOCK_FILE")
  OUT=$(PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "$BAD" 2>/dev/null); RC=$?
  AFTER=$(cat "$LOCK_FILE")
  if [ "$RC" -eq 0 ] || [ "$BEFORE" != "$AFTER" ] || [ -n "$OUT" ]; then
    fail "refuses '$BAD'" "rc=$RC changed=$([ "$BEFORE" != "$AFTER" ] && echo yes || echo no) stdout=$OUT"
  else
    pass "refuses '$BAD' (exit $RC, lock untouched, silent stdout)"
  fi
done

# ── 3. no lock → silent noop ─────────────────────────────────────────────────
LOCK_FILE="$TMPDIR_TEST/absent.lock"
OUT=$(PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" 5b 2>&1); RC=$?
if [ "$RC" -eq 0 ] && [ -z "$OUT" ] && [ ! -f "$LOCK_FILE" ]; then
  pass "no lock → exit 0, silent, nothing created"
else
  fail "no lock → silent noop" "rc=$RC out=$OUT exists=$([ -f "$LOCK_FILE" ] && echo yes || echo no)"
fi

# ── 4. non-object lock fails closed ──────────────────────────────────────────
for SHAPE in 'null' '[]' '"str"' '42' ''; do
  LOCK_FILE="$TMPDIR_TEST/nonobject-$RANDOM.lock"
  printf '%s' "$SHAPE" > "$LOCK_FILE"
  OUT=$(PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" 5b 2>/dev/null); RC=$?
  AFTER=$(cat "$LOCK_FILE")
  if [ "$RC" -eq 0 ] || [ "$AFTER" != "$SHAPE" ] || [ -n "$OUT" ]; then
    fail "non-object lock '$SHAPE' fails closed" "rc=$RC after='$AFTER' out=$OUT"
  else
    pass "non-object lock '$SHAPE' fails closed (exit $RC, untouched, silent)"
  fi
done

# ── 5. temp-file hygiene and symlink safety ──────────────────────────────────
LOCK_FILE="$TMPDIR_TEST/hygiene/lock.json"
mkdir -p "$(dirname "$LOCK_FILE")"
write_lock 5
CANARY="$TMPDIR_TEST/canary.txt"; echo "CANARY-UNTOUCHED" > "$CANARY"
ln -sf "$CANARY" "$LOCK_FILE.tmp"
PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" 5c >/dev/null 2>&1
LEFTOVER=$(find "$(dirname "$LOCK_FILE")" -name '.set-qa-phase.*' | wc -l | tr -d ' ')
if [ "$(cat "$CANARY")" != "CANARY-UNTOUCHED" ]; then
  fail "planted symlink at \$LOCK.tmp is not followed" "canary overwritten"
elif [ "$LEFTOVER" != "0" ]; then
  fail "no temp file left behind" "$LEFTOVER leftover(s)"
elif [ "$(jq -r '.qa_phase' "$LOCK_FILE")" != "5c" ]; then
  fail "write still succeeds beside a planted symlink" "lock: $(cat "$LOCK_FILE")"
else
  pass "mktemp write: canary intact, no leftover temp file, qa_phase written"
fi

# ── 6. reachable from a second shell (the CR-2 property) ─────────────────────
LOCK_FILE="$TMPDIR_TEST/second-shell.lock"
write_lock 5
# Two separate shells, as two orchestrator Bash calls are. Nothing is shared but the path.
( PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" 5a >/dev/null 2>&1 )
( PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" 5b >/dev/null 2>&1 )
if [ "$(jq -r '.qa_phase' "$LOCK_FILE")" = "5b" ]; then
  pass "two separate shells each write the lock — a script, not a function, is what makes this true"
else
  fail "reachable from a second shell" "lock: $(cat "$LOCK_FILE")"
fi
if command -v zsh >/dev/null 2>&1; then
  ( PIPELINE_LOCK="$LOCK_FILE" zsh -c "bash '$SCRIPT' 5c" >/dev/null 2>&1 )
  [ "$(jq -r '.qa_phase' "$LOCK_FILE")" = "5c" ] && pass "invocable from a zsh caller" || fail "invocable from zsh" "lock: $(cat "$LOCK_FILE")"
else
  echo "  SKIP  zsh caller (zsh not on this host)"
fi

echo ""
echo "  set-qa-phase.test.sh: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ]
