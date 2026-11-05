#!/usr/bin/env bash
# accept-qa-residual.test.sh — regression tests for accept-qa-residual.sh (task.251)
#
# Usage: bash shared/resources/accept-qa-residual.test.sh
#
# Pins the lock half of the acceptance writer — the engine's own gate and report edits are
# pinned in tests/accept-qa-residual.test.mjs:
#   state 1  no lock (the HALT removed it) → restored from the halt snapshot, then qa_phase 5c
#   state 2  lock present (in-place continuation) → qa_phase 5c only, every other field unchanged
#   state 7  a snapshot for another document → refused, no lock written
# and: a refused acceptance (FAIL gate) restores no lock and changes no byte; a re-run reports
# `already` and still lands on qa_phase 5c; current_step / qa_max_cycles / extra_cycles_granted
# are never touched; usage errors exit 2; no temp file is left behind.

PASS=0
FAIL=0
# shellcheck source=undefined-command-guard.sh
. "$(dirname "$0")/undefined-command-guard.sh"
SCRIPT="$(cd "$(dirname "$0")" && pwd)/accept-qa-residual.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

# A doc dir with one gate (its verdict as $2) and a report whose QA Cycle 5 escalated at the limit.
mkdoc() { # $1 = dir, $2 = gate verdict
  mkdir -p "$1"
  cat > "$1/task.42.gate.5.example.yml" <<YAML
schema: 1
story: '42'
gate: $2
status_reason: 'two findings left'
reviewer: 'QA'
head: 'abc123'
updated: '2026-11-02T00:00:00Z'
top_issues:
  - id: 'X-1'
    severity: medium
    finding: 'one'
    status: open
  - id: 'X-2'
    severity: low
    finding: 'two'
waiver:
  active: false
YAML
  cat > "$1/task.42.implementation.1.example.md" <<'MD'
# Implementation Report: example

## Decisions Log

- startup

---

## QA Iteration History

### QA Cycle 5 — 2026-11-02
**Gate Result**: CONCERNS
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached

---

## Completion
MD
}
snap() { # $1 = snapshot file, $2 = doc dir
  jq -n --arg dir "$2" '{skill:"develop-task",current_step:5,qa_phase:"5a",qa_max_cycles:5,extra_cycles_granted:0,task_or_story_directory:$dir,branch:"feature/x",halted_at:"2026-11-02T00:00:00Z",halt_reason:"loop-limit",halt_step:"5"}' > "$1"
}
run() { # $1 = lock, $2 = snapshot, $3 = doc dir, [$4 = approved-by]
  PIPELINE_LOCK="$1" PIPELINE_HALT_SNAPSHOT="$2" ACCEPT_QA_RESIDUAL_NOW="2026-11-03T06:00:00Z" \
    bash "$SCRIPT" "$3" "$3/task.42.implementation.1.example.md" "${4-Owner}" "residual accepted"
}

# ── state 1: no lock → restored from the snapshot, qa_phase 5c ───────────────
D="$T/s1"; mkdir -p "$D/state"; L="$D/state/lock.json"; S="$D/state/last-halt.json"
mkdoc "$D/doc" CONCERNS; snap "$S" "$D/doc"
OUT=$(run "$L" "$S" "$D/doc" 2>"$D/err"); RC=$?
if [ "$RC" -eq 0 ] && [ -f "$L" ] && [ "$(jq -r .qa_phase "$L")" = "5c" ] \
   && [ "$(jq -r '.halt_reason // "gone"' "$L")" = "gone" ] && [ "$(jq -r .current_step "$L")" = "5" ] \
   && [ "$(jq -r .qa_max_cycles "$L")" = "5" ] && [ "$(jq -r .extra_cycles_granted "$L")" = "0" ] \
   && echo "$OUT" | grep -q 'reason=accepted reenter_at=5c' && grep -q 'lock restored from' "$D/err"; then
  pass "state 1: no lock → restored from snapshot (halt fields dropped), qa_phase 5c, budget fields unchanged"
else
  fail "state 1: restore + qa_phase 5c" "rc=$RC out=$OUT err=$(cat "$D/err") lock=$(cat "$L" 2>/dev/null)"
fi
grep -q '^gate: WAIVED$' "$D/doc/task.42.gate.5.example.yml" && pass "state 1: the gate was recorded WAIVED" \
  || fail "state 1: gate WAIVED" "$(grep '^gate:' "$D/doc/task.42.gate.5.example.yml")"
[ ! -f "$S" ] && pass "state 1: the snapshot was consumed by the restore" || fail "snapshot consumed" "still present"

# Re-run: the engine answers `already`, the lock still reads 5c.
OUT=$(run "$L" "$S" "$D/doc" 2>/dev/null); RC=$?
[ "$RC" -eq 0 ] && echo "$OUT" | grep -q 'reason=already reenter_at=5c' \
  && pass "re-run: engine says already, lock still qa_phase 5c" || fail "re-run already" "rc=$RC out=$OUT"

# ── state 2: lock present → qa_phase 5c only ─────────────────────────────────
D="$T/s2"; mkdir -p "$D/state"; L="$D/state/lock.json"
mkdoc "$D/doc" CONCERNS
printf '{"skill":"develop-task","current_step":5,"qa_phase":"5a","qa_max_cycles":7,"extra_cycles_granted":2,"answers":{"base":"develop"}}\n' > "$L"
BEFORE=$(jq -c 'del(.qa_phase)' "$L")
run "$L" "$D/none.json" "$D/doc" >/dev/null 2>&1; RC=$?
if [ "$RC" -eq 0 ] && [ "$(jq -r .qa_phase "$L")" = "5c" ] && [ "$(jq -c 'del(.qa_phase)' "$L")" = "$BEFORE" ]; then
  pass "state 2: lock present → qa_phase 5c, every other field byte-identical"
else
  fail "state 2: qa_phase only" "rc=$RC lock=$(cat "$L")"
fi
LEFT=$(find "$D/state" -name '.accept-qa-residual.*' | wc -l)
[ "$LEFT" -eq 0 ] && pass "no temp file left beside the lock" || fail "temp file left" "$LEFT"

# ── state 7: a snapshot for another document → refused, no lock ───────────────
D="$T/s7"; mkdir -p "$D/state" "$D/other"; L="$D/state/lock.json"; S="$D/state/last-halt.json"
mkdoc "$D/doc" CONCERNS; snap "$S" "$D/other"
run "$L" "$S" "$D/doc" >/dev/null 2>"$D/err"; RC=$?
[ "$RC" -ne 0 ] && [ ! -f "$L" ] && [ -f "$S" ] \
  && pass "state 7: another document's snapshot → refused, no lock written, snapshot kept" \
  || fail "state 7: other document refused" "rc=$RC lock=$([ -f "$L" ] && echo yes || echo no) err=$(cat "$D/err")"

# ── a refused acceptance restores no lock and writes nothing ─────────────────
D="$T/fail"; mkdir -p "$D/state"; L="$D/state/lock.json"; S="$D/state/last-halt.json"
mkdoc "$D/doc" FAIL; snap "$S" "$D/doc"
G="$D/doc/task.42.gate.5.example.yml"; R="$D/doc/task.42.implementation.1.example.md"
GB=$(cat "$G"); RB=$(cat "$R")
OUT=$(run "$L" "$S" "$D/doc" 2>/dev/null); RC=$?
if [ "$RC" -eq 1 ] && [ ! -f "$L" ] && [ -f "$S" ] && [ "$(cat "$G")" = "$GB" ] && [ "$(cat "$R")" = "$RB" ] \
   && [ "$(printf '%s\n' "$OUT" | head -1 | jq -r .reason)" = "fail-gate" ]; then
  pass "FAIL gate → fail-gate, exit 1, gate and report byte-identical, no lock restored"
else
  fail "FAIL gate refused" "rc=$RC out=$OUT lock=$([ -f "$L" ] && echo yes || echo no)"
fi

# ── usage ────────────────────────────────────────────────────────────────────
D="$T/usage"; mkdir -p "$D/state"; mkdoc "$D/doc" CONCERNS
run "$D/state/lock.json" "$D/none.json" "$D/doc" "" >/dev/null 2>&1; RC=$?
[ "$RC" -eq 2 ] && pass "empty approved-by → exit 2" || fail "empty approved-by" "rc=$RC"
PIPELINE_LOCK="$D/state/lock.json" bash "$SCRIPT" "$D/no-such-dir" r a b >/dev/null 2>&1; RC=$?
[ "$RC" -eq 2 ] && pass "missing doc dir → exit 2" || fail "missing doc dir" "rc=$RC"

echo ""
undefined_commands_check || FAIL=$((FAIL + 1))
echo "  accept-qa-residual.test.sh: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ]
