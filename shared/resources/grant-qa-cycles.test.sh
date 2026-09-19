#!/usr/bin/env bash
# grant-qa-cycles.test.sh — regression tests for grant-qa-cycles.sh (task.123, QA cycle 2)
#
# Usage: bash shared/resources/grant-qa-cycles.test.sh
#
# Pins the three things the script exists to do, each of which was a defect when
# left to prose:
#   1. the budget is relative to the highest gate on disk, never 5 + k
#   2. the lock is restored from the halt snapshot when the HALT removed it,
#      minus the halt-only fields
#   3. the write is atomic and leaves no temp file, on success or failure
# and the refusals: bad k, no gates, no lock and no snapshot, non-object lock.

PASS=0
FAIL=0
SCRIPT="$(cd "$(dirname "$0")" && pwd)/grant-qa-cycles.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

mkdoc() { # $1 = dir, $2... = gate numbers
  local dir="$1"; shift
  mkdir -p "$dir"
  for n in "$@"; do : > "$dir/task.42.gate.$n.example.yml"; done
}
run() { # $1 = lock, $2 = snapshot, $3 = doc, $4 = k
  PIPELINE_LOCK="$1" PIPELINE_HALT_SNAPSHOT="$2" bash "$SCRIPT" "$3" "$4"
}

# ── 1. budget relative to the highest gate, not 5 ────────────────────────────
for CASE in "5:2:7" "6:2:8" "6:1:7" "10:3:13" "3:2:5"; do
  IFS=: read -r top k want <<< "$CASE"
  D="$T/rel-$top-$k"; L="$D/lock.json"; mkdoc "$D/doc" 1 "$top"
  [ "$top" -gt 5 ] && mkdoc "$D/doc" 5
  printf '{"current_step":5,"skill":"develop-task"}\n' > "$L"
  OUT=$(run "$L" "$D/none.json" "$D/doc" "$k" 2>/dev/null); RC=$?
  GOT=$(jq -r '.qa_max_cycles' "$L"); GRANT=$(jq -r '.extra_cycles_granted' "$L")
  if [ "$RC" -eq 0 ] && [ "$GOT" = "$want" ] && [ "$GRANT" = "$k" ] && echo "$OUT" | grep -q "qa_max_cycles=$want"; then
    pass "highest gate $top + k=$k → qa_max_cycles $want (never 5 + k)"
  else
    fail "highest gate $top + k=$k" "rc=$RC qa_max_cycles=$GOT extra=$GRANT out=$OUT"
  fi
done

# The gate numbers are sorted numerically, not lexically: gate.10 beats gate.9.
D="$T/lex"; L="$D/lock.json"; mkdoc "$D/doc" 9 10; printf '{"current_step":5}\n' > "$L"
run "$L" "$D/none.json" "$D/doc" 1 >/dev/null 2>&1
[ "$(jq -r '.qa_max_cycles' "$L")" = "11" ] && pass "gate.10 outranks gate.9 (numeric, not lexical)" || fail "numeric sort" "got $(jq -c . "$L")"

# ── 2. lock restored from the halt snapshot ──────────────────────────────────
D="$T/restore"; L="$D/state/lock.json"; S="$D/state/last-halt.json"; mkdir -p "$D/state"; mkdoc "$D/doc" 1 2 3 4 5 6
printf '{"skill":"develop-task","current_step":5,"qa_phase":"5b","branch":"feature/x","pr_url":"https://x/1","halted_at":"2026-09-19T00:00:00Z","halt_reason":"loop-limit","halt_step":"5"}\n' > "$S"
ERR=$(run "$L" "$S" "$D/doc" 2 2>&1 >/dev/null); RC=$?
if [ "$RC" -ne 0 ] || [ ! -f "$L" ]; then
  fail "lock restored from snapshot" "rc=$RC lock exists=$([ -f "$L" ] && echo yes || echo no) err=$ERR"
elif [ "$(jq -r '.halt_reason // "absent"' "$L")" != "absent" ] || [ "$(jq -r '.halted_at // "absent"' "$L")" != "absent" ] || [ "$(jq -r '.halt_step // "absent"' "$L")" != "absent" ]; then
  fail "halt-only fields dropped on restore" "lock: $(jq -c . "$L")"
elif [ "$(jq -r '.current_step' "$L")" != "5" ] || [ "$(jq -r '.branch' "$L")" != "feature/x" ] || [ "$(jq -r '.qa_phase' "$L")" != "5b" ]; then
  fail "lock fields carried over from snapshot" "lock: $(jq -c . "$L")"
elif [ "$(jq -r '.qa_max_cycles' "$L")" != "8" ] || [ "$(jq -r '.extra_cycles_granted' "$L")" != "2" ]; then
  fail "grant written onto the restored lock" "lock: $(jq -c . "$L")"
elif ! echo "$ERR" | grep -q "lock restored from"; then
  fail "restore is announced on stderr" "err=$ERR"
else
  pass "no lock → restored from snapshot (halt fields dropped, pipeline fields kept), grant written: 6 + 2 = 8"
fi
# The snapshot itself is untouched.
[ "$(jq -r '.halt_reason' "$S")" = "loop-limit" ] && pass "snapshot untouched by the restore" || fail "snapshot untouched" "$(cat "$S")"

# A PreCompact snapshot's pause fields are dropped too.
D="$T/restore-pause"; L="$D/lock.json"; S="$D/snap.json"; mkdir -p "$D"; mkdoc "$D/doc" 5
printf '{"current_step":5,"paused_at":"x","pause_reason":"precompact","halt_step":"5"}\n' > "$S"
run "$L" "$S" "$D/doc" 1 >/dev/null 2>&1
[ "$(jq -r '.pause_reason // "absent"' "$L")" = "absent" ] && [ "$(jq -r '.qa_max_cycles' "$L")" = "6" ] \
  && pass "PreCompact pause fields dropped on restore" || fail "pause fields dropped" "$(cat "$L")"

# ── 3. atomic write, no leftovers; failure leaves the lock untouched ─────────
D="$T/atomic"; L="$D/lock.json"; mkdir -p "$D"; mkdoc "$D/doc" 5
printf '{"current_step":5}\n' > "$L"
run "$L" "$D/none.json" "$D/doc" 2 >/dev/null 2>&1
LEFT=$(find "$D" -name '.grant-qa-cycles.*' | wc -l | tr -d ' ')
[ "$LEFT" = "0" ] && pass "no temp file left after a successful write" || fail "temp hygiene (success)" "$LEFT leftover(s)"

D="$T/nonobject"; L="$D/lock.json"; mkdir -p "$D"; mkdoc "$D/doc" 5
for SHAPE in 'null' '[]' '42' ''; do
  printf '%s' "$SHAPE" > "$L"
  OUT=$(run "$L" "$D/none.json" "$D/doc" 2 2>/dev/null); RC=$?
  AFTER=$(cat "$L"); LEFT=$(find "$D" -name '.grant-qa-cycles.*' | wc -l | tr -d ' ')
  if [ "$RC" -eq 0 ] || [ "$AFTER" != "$SHAPE" ] || [ -n "$OUT" ] || [ "$LEFT" != "0" ]; then
    fail "non-object lock '$SHAPE' fails closed" "rc=$RC after='$AFTER' out='$OUT' leftovers=$LEFT"
  else
    pass "non-object lock '$SHAPE' fails closed (untouched, silent, no temp file)"
  fi
done

# ── refusals ─────────────────────────────────────────────────────────────────
D="$T/refuse"; L="$D/lock.json"; mkdir -p "$D"; mkdoc "$D/doc" 5; printf '{"current_step":5}\n' > "$L"
for BAD in "" 0 -1 2.5 two "2 3"; do
  BEFORE=$(cat "$L")
  run "$L" "$D/none.json" "$D/doc" "$BAD" >/dev/null 2>&1; RC=$?
  [ "$RC" -ne 0 ] && [ "$(cat "$L")" = "$BEFORE" ] && pass "k='$BAD' refused, lock untouched" || fail "k='$BAD' refused" "rc=$RC lock=$(cat "$L")"
done
run "$L" "$D/none.json" "$D/no-such-dir" 2 >/dev/null 2>&1; [ $? -ne 0 ] && pass "missing doc dir refused" || fail "missing doc dir" "exit 0"
mkdir -p "$D/empty"; run "$L" "$D/none.json" "$D/empty" 2 >/dev/null 2>&1; RC=$?
[ "$RC" -ne 0 ] && [ "$(jq -r '.qa_max_cycles // "absent"' "$L")" = "absent" ] && pass "no gate on disk → refused, nothing written" || fail "no gate refused" "rc=$RC lock=$(cat "$L")"
D="$T/nothing"; mkdir -p "$D"; mkdoc "$D/doc" 5
run "$D/lock.json" "$D/snap.json" "$D/doc" 2 >/dev/null 2>&1; RC=$?
[ "$RC" -ne 0 ] && [ ! -f "$D/lock.json" ] && pass "no lock and no snapshot → refused, no lock fabricated" || fail "no lock/no snapshot" "rc=$RC"

echo ""
echo "  grant-qa-cycles.test.sh: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ]
