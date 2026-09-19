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
elif [ "$(jq -r '.current_step' "$L")" != "5" ] || [ "$(jq -r '.branch' "$L")" != "feature/x" ]; then
  fail "lock fields carried over from snapshot" "lock: $(jq -c . "$L")"
elif [ "$(jq -r '.qa_phase' "$L")" != "5a" ]; then
  fail "qa_phase reset to 5a in the grant write (C3-CR-3)" "snapshot said 5b; lock: $(jq -c . "$L")"
elif [ "$(jq -r '.qa_max_cycles' "$L")" != "8" ] || [ "$(jq -r '.extra_cycles_granted' "$L")" != "2" ]; then
  fail "grant written onto the restored lock" "lock: $(jq -c . "$L")"
elif ! echo "$ERR" | grep -q "lock restored from"; then
  fail "restore is announced on stderr" "err=$ERR"
else
  pass "no lock → restored from snapshot (halt fields dropped, pipeline fields kept, qa_phase 5b → 5a), grant written: 6 + 2 = 8"
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

# ── C3 (QA cycle 3): base, never-lower, leading zero, stale snapshot, printed value ──
# The base is max(highest gate, report entries): the negative-count path resumes from the report.
D="$T/report-ahead"; L="$D/lock.json"; mkdir -p "$D"; mkdoc "$D/doc" 1 2 3
printf '### QA Cycle 1\n### QA Cycle 2\n### QA Cycle 3\n### QA Cycle 4\n### QA Cycle 5\n' > "$D/report.md"
printf '{"current_step":5}\n' > "$L"
OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$D/none" bash "$SCRIPT" "$D/doc" 2 "$D/report.md" 2>/dev/null)
[ "$(jq -r '.qa_max_cycles' "$L")" = "7" ] && echo "$OUT" | grep -q "QA_CYCLE=5" \
  && pass "report ahead of disk (5 entries, gate.3): base is the report's count → 5 + 2 = 7 (C3-CR-2)" \
  || fail "report ahead of disk" "lock=$(cat "$L") out=$OUT"
# Disk ahead of the report: the gate count still wins.
printf '### QA Cycle 1\n' > "$D/report.md"; printf '{"current_step":5}\n' > "$L"
PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$D/none" bash "$SCRIPT" "$D/doc" 2 "$D/report.md" >/dev/null 2>&1
[ "$(jq -r '.qa_max_cycles' "$L")" = "5" ] && pass "disk ahead of the report (gate.3, 1 entry): base is the gate → 3 + 2 = 5" || fail "disk ahead" "$(cat "$L")"
# A missing report path is refused, not ignored.
PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$D/none" bash "$SCRIPT" "$D/doc" 2 "$D/no-such-report.md" >/dev/null 2>&1; RC=$?
[ "$RC" -ne 0 ] && pass "missing report path refused" || fail "missing report path" "exit 0"

# A grant never lowers an existing budget.
D="$T/never-lower"; L="$D/lock.json"; mkdir -p "$D"; mkdoc "$D/doc" 3
printf '{"current_step":5,"qa_max_cycles":7,"extra_cycles_granted":2}\n' > "$L"
BEFORE=$(cat "$L")
PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$D/none" bash "$SCRIPT" "$D/doc" 2 >/dev/null 2>&1; RC=$?
[ "$RC" -ne 0 ] && [ "$(cat "$L")" = "$BEFORE" ] && pass "existing qa_max_cycles 7 > 3 + 2: refused, lock untouched (C3-CR-2)" || fail "never lower" "rc=$RC lock=$(cat "$L")"
# …but a higher grant is still accepted over a lower existing budget.
PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$D/none" bash "$SCRIPT" "$D/doc" 5 >/dev/null 2>&1
[ "$(jq -r '.qa_max_cycles' "$L")" = "8" ] && pass "existing 7 < 3 + 5: budget raised to 8" || fail "raise over existing" "$(cat "$L")"

# Leading zero refused (octal in shell, decimal in jq).
D="$T/octal"; L="$D/lock.json"; mkdir -p "$D"; mkdoc "$D/doc" 3; printf '{"current_step":5}\n' > "$L"
for BAD in 010 08 007; do
  PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$D/none" bash "$SCRIPT" "$D/doc" "$BAD" >/dev/null 2>&1; RC=$?
  [ "$RC" -ne 0 ] && [ "$(jq -r '.qa_max_cycles // "absent"' "$L")" = "absent" ] && pass "k='$BAD' (leading zero) refused (C3-CR-4)" || fail "k='$BAD' refused" "rc=$RC lock=$(cat "$L")"
done
# The printed value is read back from the lock.
OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$D/none" bash "$SCRIPT" "$D/doc" 10 2>/dev/null)
[ "$(echo "$OUT" | sed -E 's/.*qa_max_cycles=([0-9]+).*/\1/')" = "$(jq -r '.qa_max_cycles' "$L")" ] && pass "printed qa_max_cycles equals the lock's (13)" || fail "printed value" "out=$OUT lock=$(cat "$L")"

# A stale snapshot for another document is not restored.
D="$T/stale"; L="$D/lock.json"; S="$D/snap.json"; mkdir -p "$D"; mkdoc "$D/doc" 3
printf '{"skill":"develop-task","current_step":5,"task_or_story_directory":"docs/tasks/other","branch":"feature/other","halt_reason":"loop-limit"}\n' > "$S"
PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$SCRIPT" "$D/doc" 1 >/dev/null 2>&1; RC=$?
[ "$RC" -ne 0 ] && [ ! -f "$L" ] && pass "snapshot for another document: refused, no lock fabricated (C3-CR-5)" || fail "stale snapshot" "rc=$RC exists=$([ -f "$L" ] && echo yes || echo no)"
# …and a matching one (with ./ and trailing slash noise) is.
printf '{"skill":"develop-task","current_step":5,"task_or_story_directory":"./%s/","halt_reason":"loop-limit"}\n' "$D/doc" > "$S"
PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$SCRIPT" "$D/doc" 1 >/dev/null 2>&1; RC=$?
[ "$RC" -eq 0 ] && [ "$(jq -r '.qa_max_cycles' "$L")" = "4" ] && pass "snapshot for this document (path normalised): restored" || fail "matching snapshot" "rc=$RC"

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
