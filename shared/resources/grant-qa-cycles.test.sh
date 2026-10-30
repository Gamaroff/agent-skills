#!/usr/bin/env bash
# grant-qa-cycles.test.sh — regression tests for grant-qa-cycles.sh (task.123, QA cycle 2)
#
# Usage: bash shared/resources/grant-qa-cycles.test.sh
#
# Pins the three things the script exists to do, each of which was a defect when
# left to prose:
#   1. the budget is relative to the highest gate on disk, never 5 + k
#   2. the lock is restored from the halt snapshot when the HALT removed it,
#      minus the halt-only fields — through `advance-pipeline-lock.sh --restore`
#      since task.124, which also CONSUMES the snapshot; the restore matrix itself
#      (candidate choice, other-document refusal, orphaned claims) is pinned in
#      advance-pipeline-lock.test.sh, and the cases here prove the grant still
#      lands on a lock that path restored
#   3. the write is atomic and leaves no temp file, on success or failure
# and the refusals: bad k, no gates, no lock and no snapshot, non-object lock.

PASS=0
FAIL=0
# shellcheck source=undefined-command-guard.sh
. "$(dirname "$0")/undefined-command-guard.sh"
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
printf '{"skill":"develop-task","current_step":5,"qa_phase":"5b","task_or_story_directory":"%s","branch":"feature/x","pr_url":"https://x/1","halted_at":"2026-09-19T00:00:00Z","halt_reason":"loop-limit","halt_step":"5"}\n' "$D/doc" > "$S"
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

# task.244: the re-entry phase is decided by EVIDENCE — did code move since the latest gate — not by
# the halt reason. The loop ends on a gate, so every halt (loop-limit and not-converging alike) stops
# at a gate whose queue was never handed to /qa-fix. The fixtures below are real git repositories:
# the helper (code-moved-since-gate.sh) reads the gate's `head:` and the tree.
git_q() { git -C "$1" -c user.name=t -c user.email=t@t "${@:2}" >/dev/null 2>&1; }
mkgitdoc() { # $1 = repo dir, $2 = latest gate number; the work item is $1/docs/t; sets GATE_SHA
  local r="$1" n="$2" i
  mkdir -p "$r/src" "$r/docs/t"
  git -C "$r" init -q -b develop
  echo a > "$r/src/a.txt"; git_q "$r" add -A; git_q "$r" commit -m code
  GATE_SHA=$(git -C "$r" rev-parse HEAD)
  for i in $(seq 1 "$n"); do : > "$r/docs/t/task.42.gate.$i.example.yml"; done
  printf "schema: 2\nhead: '%s'\n" "$GATE_SHA" > "$r/docs/t/task.42.gate.$n.example.yml"
  git_q "$r" add -A; git_q "$r" commit -m gate
}
snap() { # $1 = snapshot file, $2 = doc dir, $3 = halt_reason, $4 = qa_phase
  jq -n --arg dir "$2" --arg r "$3" --arg p "$4" '{skill:"develop-task",current_step:5,qa_phase:$p,task_or_story_directory:$dir,branch:"feature/x",halted_at:"2026-10-31T00:00:00Z",halt_reason:$r,halt_step:"5"}' > "$1"
}

# (a) Gate N sits at HEAD and nothing moved → 5b, whatever the halt reason. A loop-limit halt used to
# re-enter at 5a, which reviews unchanged code and spends the grant (task.244; the case the old
# script fails).
D="$T/ev-a"; L="$D/state/lock.json"; S="$D/state/last-halt.json"; mkdir -p "$D/state"; mkgitdoc "$D/repo" 4
snap "$S" "$D/repo/docs/t" "loop-limit: QA cycle 4 of 4 (gate 4 CONCERNS)" 5a
OUT=$(run "$L" "$S" "$D/repo/docs/t" 2 2>/dev/null); RC=$?
if [ "$RC" -eq 0 ] && [ "$(jq -r '.qa_phase' "$L")" = "5b" ] && [ "$(jq -r '.qa_max_cycles' "$L")" = "6" ] && echo "$OUT" | grep -q "reenter_at=5b"; then
  pass "(a) loop-limit halt, gate 4 at HEAD, no movement → re-enter at 5b (the loop ends on a gate)"
else
  fail "(a) no movement → 5b" "rc=$RC out=$OUT lock=$(cat "$L" 2>/dev/null)"
fi
# The snapshot is consumed by the restore (task.124): a snapshot that outlives its run is
# offered as a resume for merged work on the next invocation (obs #88).
[ ! -f "$S" ] && pass "snapshot consumed by the restore (task.124)" || fail "snapshot consumed" "still present: $(cat "$S")"

# (b) A commit outside the work item after the gate's head → 5a.
D="$T/ev-b"; L="$D/state/lock.json"; S="$D/state/last-halt.json"; mkdir -p "$D/state"; mkgitdoc "$D/repo" 3
echo b > "$D/repo/src/b.txt"; git_q "$D/repo" add -A; git_q "$D/repo" commit -m hand-fix
snap "$S" "$D/repo/docs/t" "loop-limit: QA cycle 3 of 3" 5b
OUT=$(run "$L" "$S" "$D/repo/docs/t" 2 2>/dev/null); RC=$?
if [ "$RC" -eq 0 ] && [ "$(jq -r '.qa_phase' "$L")" = "5a" ] && echo "$OUT" | grep -q "reenter_at=5a"; then
  pass "(b) a commit outside the work item after the gate's head → re-enter at 5a"
else
  fail "(b) commit after the gate → 5a" "rc=$RC out=$OUT lock=$(cat "$L" 2>/dev/null)"
fi

# (c) An uncommitted edit outside the work item → 5a.
D="$T/ev-c"; L="$D/state/lock.json"; S="$D/state/last-halt.json"; mkdir -p "$D/state"; mkgitdoc "$D/repo" 3
echo edited >> "$D/repo/src/a.txt"
snap "$S" "$D/repo/docs/t" "not-converging" 5a
OUT=$(run "$L" "$S" "$D/repo/docs/t" 2 2>/dev/null); RC=$?
if [ "$RC" -eq 0 ] && [ "$(jq -r '.qa_phase' "$L")" = "5a" ] && echo "$OUT" | grep -q "reenter_at=5a"; then
  pass "(c) an uncommitted edit outside the work item → re-enter at 5a, even on a not-converging halt"
else
  fail "(c) uncommitted edit → 5a" "rc=$RC out=$OUT lock=$(cat "$L" 2>/dev/null)"
fi

# (d) The helper is missing beside the script → 5a with a warning, never 5b on a gate that may be stale.
D="$T/ev-d"; L="$D/state/lock.json"; S="$D/state/last-halt.json"; mkdir -p "$D/state" "$D/bin"; mkgitdoc "$D/repo" 3
for f in grant-qa-cycles.sh qa-cycle.sh advance-pipeline-lock.sh; do cp "$(dirname "$SCRIPT")/$f" "$D/bin/$f"; done
snap "$S" "$D/repo/docs/t" "not-converging" 5a
OUT=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$D/bin/grant-qa-cycles.sh" "$D/repo/docs/t" 2 2>"$D/err"); RC=$?
if [ "$RC" -eq 0 ] && [ "$(jq -r '.qa_phase' "$L")" = "5a" ] && grep -q "code-moved-since-gate.sh not found" "$D/err"; then
  pass "(d) helper missing → re-enter at 5a with a warning on stderr"
else
  fail "(d) helper missing → 5a" "rc=$RC out=$OUT err=$(cat "$D/err") lock=$(cat "$L" 2>/dev/null)"
fi

# (e) not-converging with no movement → 5b (obs #228 still holds, now by evidence).
D="$T/ev-e"; L="$D/state/lock.json"; S="$D/state/last-halt.json"; mkdir -p "$D/state"; mkgitdoc "$D/repo" 3
snap "$S" "$D/repo/docs/t" "not-converging" 5a
OUT=$(run "$L" "$S" "$D/repo/docs/t" 2 2>/dev/null); RC=$?
if [ "$RC" -eq 0 ] && [ "$(jq -r '.qa_phase' "$L")" = "5b" ] && [ "$(jq -r '.qa_max_cycles' "$L")" = "5" ] && echo "$OUT" | grep -q "reenter_at=5b"; then
  pass "(e) not-converging halt, no movement → re-enter at 5b (task.140's shape: gate 3, k=2 → budget 5)"
else
  fail "(e) not-converging, no movement → 5b" "rc=$RC out=$OUT lock=$(cat "$L" 2>/dev/null)"
fi

# (f) A gate with no usable head cannot vouch for the tree → 5a.
D="$T/ev-f"; L="$D/state/lock.json"; S="$D/state/last-halt.json"; mkdir -p "$D/state"; mkgitdoc "$D/repo" 3
: > "$D/repo/docs/t/task.42.gate.3.example.yml"; git_q "$D/repo" add -A; git_q "$D/repo" commit -m "schema-1 gate"
snap "$S" "$D/repo/docs/t" "not-converging" 5a
OUT=$(run "$L" "$S" "$D/repo/docs/t" 2 2>/dev/null); RC=$?
if [ "$RC" -eq 0 ] && [ "$(jq -r '.qa_phase' "$L")" = "5a" ]; then
  pass "(f) a gate with no head: → re-enter at 5a"
else
  fail "(f) no head → 5a" "rc=$RC out=$OUT lock=$(cat "$L" 2>/dev/null)"
fi
# The snapshot is consumed by the restore (task.124): a snapshot that outlives its run is
# offered as a resume for merged work on the next invocation (obs #88).
[ ! -f "$S" ] && pass "snapshot consumed by the restore (task.124)" || fail "snapshot consumed" "still present: $(cat "$S")"

# The halt reason is NOT read (task.244): the same phase for every spelling — free text with detail
# (obs #17), a word that merely begins with a token, and an unrelated reason — because the evidence
# (no movement since the gate) is identical.
for REASON in "not-converging: QA loop HIGH 1,1,1,1 at cycle 4 (gate 4 FAIL; TASK-180-012/013/014 open)" \
              "not-converging (cycle 5)" \
              "not-convergingX" \
              "loop-limit: QA cycle 7 of 7 (gate 7 CONCERNS)" \
              ""; do
  D=$(mktemp -d "$T/detail.XXXXXX"); L="$D/state/lock.json"; S="$D/state/last-halt.json"; mkdir -p "$D/state"; mkgitdoc "$D/repo" 3
  snap "$S" "$D/repo/docs/t" "$REASON" 5a
  OUT=$(run "$L" "$S" "$D/repo/docs/t" 1 2>/dev/null); RC=$?
  if [ "$RC" -eq 0 ] && [ "$(jq -r '.qa_phase' "$L")" = "5b" ] && echo "$OUT" | grep -q "reenter_at=5b"; then
    pass "halt_reason '${REASON%% (*}…' → re-enter at 5b (the reason is not read)"
  else
    fail "halt_reason '$REASON' → 5b" "rc=$RC out=$OUT lock=$(cat "$L" 2>/dev/null)"
  fi
done

# ── task.239: the grant opens a fresh Convergence window (obs #72) ───────────
# convergence_from_cycle = base + 1, in the same write as the budget and the phase, read back
# from the lock and printed after reenter_at=. Both halt kinds write it, and (task.244) both
# re-enter at 5b when nothing moved; each one's first new reading is cycle base + 1.
for case_ in "not-converging: QA loop HIGH 1,1,1 at cycle 3|3|5b" "loop-limit: QA cycle 6 of 6|6|5b"; do
  REASON=${case_%%|*}; rest=${case_#*|}; BASE=${rest%%|*}; PHASE=${rest#*|}
  D=$(mktemp -d "$T/window.XXXXXX"); L="$D/state/lock.json"; S="$D/state/last-halt.json"; mkdir -p "$D/state"
  mkgitdoc "$D/repo" "$BASE"; D="$D/repo/docs/t"; D0=${D%/repo/docs/t}
  snap "$S" "$D" "$REASON" 5a
  OUT=$(run "$L" "$S" "$D" 2 2>/dev/null); RC=$?
  D="$D0"
  WANT=$((BASE + 1))
  if [ "$RC" -eq 0 ] && [ "$(jq -r '.convergence_from_cycle' "$L")" = "$WANT" ] \
     && [ "$(jq -r '.qa_phase' "$L")" = "$PHASE" ] && [ "$(jq -r '.qa_max_cycles' "$L")" = "$((BASE + 2))" ] \
     && echo "$OUT" | grep -qE "reenter_at=$PHASE convergence_from_cycle=$WANT\$"; then
    pass "${REASON%%:*} grant at base $BASE → convergence_from_cycle $WANT, printed after reenter_at=$PHASE (task.239)"
  else
    fail "${REASON%%:*} grant writes convergence_from_cycle" "rc=$RC out=$OUT lock=$(cat "$L" 2>/dev/null)"
  fi
done
# A grant on a lock that already exists (no restore) writes it too.
D="$T/window-existing"; L="$D/lock.json"; mkdir -p "$D"; mkdoc "$D/doc" 1 2 3 4 5
printf '{"current_step":5,"qa_phase":"5a"}\n' > "$L"
run "$L" "$D/none.json" "$D/doc" 2 >/dev/null 2>&1
[ "$(jq -r '.convergence_from_cycle' "$L")" = "6" ] && pass "grant on an existing lock (gate.5) → convergence_from_cycle 6" || fail "existing lock window" "$(cat "$L")"
# A second grant moves the window forward to its own base + 1, never back.
mkdoc "$D/doc" 6 7
run "$L" "$D/none.json" "$D/doc" 2 >/dev/null 2>&1
[ "$(jq -r '.convergence_from_cycle' "$L")" = "8" ] && pass "second grant (gate.7) → window moves 6 → 8" || fail "second grant window" "$(cat "$L")"
# A refused grant writes no window.
D="$T/window-refused"; L="$D/lock.json"; mkdir -p "$D"; mkdoc "$D/doc" 3
printf '{"current_step":5,"qa_max_cycles":9}\n' > "$L"
run "$L" "$D/none.json" "$D/doc" 2 >/dev/null 2>&1; RC=$?
[ "$RC" -ne 0 ] && [ "$(jq -r '.convergence_from_cycle // "absent"' "$L")" = "absent" ] && pass "refused grant (never-lower) writes no convergence_from_cycle" || fail "refused grant window" "rc=$RC lock=$(cat "$L")"

# A PreCompact snapshot's pause fields are dropped too.
D="$T/restore-pause"; L="$D/lock.json"; S="$D/snap.json"; mkdir -p "$D"; mkdoc "$D/doc" 5
printf '{"current_step":5,"task_or_story_directory":"%s","paused_at":"x","pause_reason":"precompact","halt_step":"5"}\n' "$D/doc" > "$S"
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

# ── C4 (QA cycle 4): a refusal writes NOTHING; paths canonicalised; absent field; bad budget ──
# A never-lower refusal on a run that has no lock must not leave a restored lock behind.
D="$T/refuse-after-restore"; L="$D/lock.json"; S="$D/snap.json"; mkdir -p "$D"; mkdoc "$D/doc" 1 2 3 4 5 6
printf '{"skill":"develop-task","current_step":5,"qa_phase":"5b","task_or_story_directory":"%s","qa_max_cycles":9,"halt_reason":"loop-limit"}\n' "$D/doc" > "$S"
ERR=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$SCRIPT" "$D/doc" 2 2>&1 >/dev/null); RC=$?
if [ "$RC" -ne 0 ] && [ ! -f "$L" ] && echo "$ERR" | grep -q "k must be at least 4"; then
  pass "never-lower refusal from a snapshot: no lock restored, message names the accepted k (C4-CR-1/CR-5)"
else
  fail "refusal after restore" "rc=$RC lock exists=$([ -f "$L" ] && echo yes || echo no) err=$ERR"
fi
LEFT=$(find "$D" -name '.grant-qa-cycles.*' | wc -l | tr -d ' '); [ "$LEFT" = "0" ] && pass "no temp file after a refused grant" || fail "temp after refusal" "$LEFT"

# Relative snapshot directory vs absolute <doc-dir> (the real pipeline's shapes), both ways.
D="$T/canon"; mkdir -p "$D/repo/docs/tasks/x"; : > "$D/repo/docs/tasks/x/task.9.gate.1.x.yml"
printf '{"skill":"develop-task","current_step":5,"task_or_story_directory":"docs/tasks/x","halt_reason":"loop-limit"}\n' > "$D/snap.json"
( cd "$D/repo" && PIPELINE_LOCK="$D/lock.json" PIPELINE_HALT_SNAPSHOT="$D/snap.json" bash "$SCRIPT" "$D/repo/docs/tasks/x" 1 >/dev/null 2>&1 ); RC=$?
[ "$RC" -eq 0 ] && [ "$(jq -r '.qa_max_cycles' "$D/lock.json")" = "2" ] && pass "relative snapshot dir vs absolute doc-dir: same directory, restored (C4-CR-4)" || fail "relative vs absolute" "rc=$RC"
rm -f "$D/lock.json"
printf '{"skill":"develop-task","current_step":5,"task_or_story_directory":"%s","halt_reason":"loop-limit"}\n' "$D/repo/docs/tasks/x" > "$D/snap.json"
( cd "$D/repo" && PIPELINE_LOCK="$D/lock.json" PIPELINE_HALT_SNAPSHOT="$D/snap.json" bash "$SCRIPT" docs/tasks/x 1 >/dev/null 2>&1 ); RC=$?
[ "$RC" -eq 0 ] && [ -f "$D/lock.json" ] && pass "absolute snapshot dir vs relative doc-dir: restored" || fail "absolute vs relative" "rc=$RC"
# A different directory that merely shares a prefix is still refused.
rm -f "$D/lock.json"; mkdir -p "$D/repo/docs/tasks/xy"
printf '{"skill":"develop-task","current_step":5,"task_or_story_directory":"docs/tasks/xy","halt_reason":"loop-limit"}\n' > "$D/snap.json"
( cd "$D/repo" && PIPELINE_LOCK="$D/lock.json" PIPELINE_HALT_SNAPSHOT="$D/snap.json" bash "$SCRIPT" docs/tasks/x 1 >/dev/null 2>&1 ); RC=$?
[ "$RC" -ne 0 ] && [ ! -f "$D/lock.json" ] && pass "prefix-sharing other directory still refused" || fail "prefix-sharing dir" "rc=$RC"

# A snapshot with no task_or_story_directory (pre-task.123 shape) is REFUSED through the one
# restore path (`legacy-snapshot`, task.130) — the grant restores nothing, writes nothing, and
# relays the refusal; C4-CR-7's acceptance is superseded by Breaking Change 2.
D="$T/nofield"; L="$D/lock.json"; S="$D/snap.json"; mkdir -p "$D"; mkdoc "$D/doc" 2
printf '{"skill":"develop-task","current_step":5,"halt_reason":"loop-limit"}\n' > "$S"
ERR=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$SCRIPT" "$D/doc" 1 2>&1 >/dev/null); RC=$?
[ "$RC" -eq 1 ] && [ ! -f "$L" ] && [ -f "$S" ] && echo "$ERR" | grep -q "legacy-snapshot" && pass "snapshot without task_or_story_directory → refused as legacy-snapshot; nothing written, snapshot kept (task.130)" || fail "legacy snapshot refused" "rc=$RC err=$ERR"

# The never-lower guard reads the candidate --restore WILL consume, not $SNAPSHOT: a newer
# orphaned `.pausing.<pid>` claim with a HIGHER budget outranks the snapshot, so a k that the
# snapshot's budget would allow is refused against the claim's (task.130; task.124 CR-5).
D="$T/guard-claim"; L="$D/state/lock"; S="$D/state/last-halt.json"; mkdir -p "$D/state"; mkdoc "$D/doc" 1 2 3 4 5
printf '{"skill":"develop-task","current_step":5,"task_or_story_directory":"%s","qa_max_cycles":5,"halt_reason":"loop-limit"}\n' "$D/doc" > "$S"
touch -t 202601010000 "$S"
printf '{"skill":"develop-task","current_step":5,"task_or_story_directory":"%s","qa_max_cycles":9,"halt_reason":"loop-limit"}\n' "$D/doc" > "$L.pausing.777"
ERR=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" bash "$SCRIPT" "$D/doc" 2 2>&1 >/dev/null); RC=$?
if [ "$RC" -eq 1 ] && [ ! -f "$L" ] && [ -f "$S" ] && [ -f "$L.pausing.777" ] && echo "$ERR" | grep -q "qa_max_cycles=9"; then
  pass "never-lower guard reads the budget from the candidate --which names (the claim's 9, not the snapshot's 5); nothing restored"
else
  fail "guard reads --which candidate" "rc=$RC lock=$([ -f "$L" ] && echo present || echo absent) err=$ERR"
fi

# A non-integer qa_max_cycles on the lock is warned about and treated as 0, not swallowed.
D="$T/badbudget"; L="$D/lock.json"; mkdir -p "$D"; mkdoc "$D/doc" 2
printf '{"current_step":5,"qa_max_cycles":"abc"}\n' > "$L"
ERR=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$D/none" bash "$SCRIPT" "$D/doc" 1 2>&1 >/dev/null); RC=$?
[ "$RC" -eq 0 ] && echo "$ERR" | grep -q "not an integer" && [ "$(jq -r '.qa_max_cycles' "$L")" = "3" ] && pass "non-integer qa_max_cycles warned and overwritten (C4-CR-7)" || fail "non-integer budget" "rc=$RC err=$ERR"

# ── task.158 CR-1: the cycle comes from qa-cycle.sh, the one definition ──────────
# A zero-padded gate is cycle 8, not the string "08" — which `$((QA_CYCLE + K))` rejected
# with "value too great for base" and recorded no grant.
D="$T/padded"; L="$D/lock.json"; mkdoc "$D/doc" 1 08; printf '{"current_step":5}\n' > "$L"
ERR=$(run "$L" "$D/none.json" "$D/doc" 2 2>&1 >/dev/null); RC=$?
[ "$RC" -eq 0 ] && [ "$(jq -r '.qa_max_cycles' "$L")" = "10" ] && pass "zero-padded gate.08 is cycle 8 → qa_max_cycles 10 (task.158 CR-1)" || fail "zero-padded gate" "rc=$RC lock=$(cat "$L") err=$ERR"
# The grant and qa-cycle.sh read the same number from the same directory.
D="$T/agree"; L="$D/lock.json"; mkdoc "$D/doc" 02 9 010; printf '{"current_step":5}\n' > "$L"
WANT=$(( $(bash "$(dirname "$SCRIPT")/qa-cycle.sh" "$D/doc") + 1 ))
run "$L" "$D/none.json" "$D/doc" 1 >/dev/null 2>&1
[ "$(jq -r '.qa_max_cycles' "$L")" = "$WANT" ] && [ "$WANT" = "11" ] && pass "grant base equals qa-cycle.sh's cycle (gate.010 → 10, +1 = 11)" || fail "grant agrees with qa-cycle.sh" "want=$WANT lock=$(cat "$L")"
# Gate files that carry no usable cycle number are refused with the helper's own reason — not
# reported as "no gate" over a directory that has gate files (task.158 QA cycle 2, QA2-CR-1).
D="$T/unnumbered"; L="$D/lock.json"; mkdir -p "$D/doc"; : > "$D/doc/task.42.gate.example.yml"; printf '{"current_step":5}\n' > "$L"
ERR=$(run "$L" "$D/none.json" "$D/doc" 2 2>&1 >/dev/null); RC=$?
[ "$RC" -ne 0 ] && echo "$ERR" | grep -q "carry no cycle number" && [ "$(jq -r '.qa_max_cycles // "absent"' "$L")" = "absent" ] && pass "unnumbered gate files → refused with the helper's reason, nothing written" || fail "unnumbered gates" "rc=$RC err=$ERR"
# Without its sibling the grant refuses by name — it never falls back to a private derivation.
D="$T/lonely"; L="$D/lock.json"; mkdir -p "$D/bin"; mkdoc "$D/doc" 3; printf '{"current_step":5}\n' > "$L"
cp "$SCRIPT" "$D/bin/grant-qa-cycles.sh"
ERR=$(PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$D/none.json" bash "$D/bin/grant-qa-cycles.sh" "$D/doc" 2 2>&1 >/dev/null); RC=$?
[ "$RC" -ne 0 ] && echo "$ERR" | grep -q "qa-cycle.sh not found" && [ "$(jq -r '.qa_max_cycles // "absent"' "$L")" = "absent" ] && pass "qa-cycle.sh missing beside the script → named refusal, nothing written" || fail "missing qa-cycle.sh sibling" "rc=$RC err=$ERR"

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
undefined_commands_check || FAIL=$((FAIL + 1))
echo "  grant-qa-cycles.test.sh: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ]
