#!/usr/bin/env bash
# set-waiting-on.test.sh — regression tests for set-waiting-on.sh (task.124, Phase 2)
#
# Usage: bash shared/resources/set-waiting-on.test.sh
#
# The writer half of the waiting_on contract. The reader half (on-stop.sh) is
# pinned by develop-pipeline-on-stop.test.sh. This suite pins that the writer:
#
#   1. writes the four fields (kind, label, since, budget_minutes) and NEVER
#      touches current_step, qa_phase or any other field
#   2. --clear removes the field and nothing else; is a noop on a lock without it
#   3. --kind task is stored; --kind anything-else is refused, lock byte-identical
#   4. budget_minutes comes from subagents.wallClockMinutes when configured,
#      else 10 — read once here, stored on the lock, never read by the hook;
#      --budget-minutes N overrides it for one wait and refuses anything that is
#      not a positive integer (QA cycle 1, CR-2)
#   5. noops silently with no lock (standalone invocation)
#   6. fails closed on a non-object lock; leaves no temp file behind
#   7. a label with spaces and shell metacharacters round-trips verbatim

PASS=0
FAIL=0
SCRIPT="$(cd "$(dirname "$0")" && pwd)/set-waiting-on.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

write_lock() { # $1 = step
  printf '{"current_step": %s, "skill": "develop-task", "qa_phase": "5b", "pr_url": "https://x/1"}\n' "$1" > "$LOCK_FILE"
}

# Every run below points the reader at an EMPTY config so the default is what is
# under test unless a scenario says otherwise.
NOCFG="$TMPDIR_TEST/none.yaml"; : > "$NOCFG"

# ── 1. set writes the four fields; nothing else changes ──────────────────────
LOCK_FILE="$TMPDIR_TEST/set.lock"; write_lock 3
OUT=$(SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "step-3 codebase map" 2>/dev/null); RC=$?
if [ "$RC" -ne 0 ]; then
  fail "set writes waiting_on" "rc=$RC out=$OUT"
elif [ "$(jq -r '.waiting_on | [.kind, .label, (.since | type), (.budget_minutes | type)] | join(",")' "$LOCK_FILE")" != "agent,step-3 codebase map,string,number" ]; then
  fail "set writes the four fields" "$(jq -c .waiting_on "$LOCK_FILE")"
elif ! jq -e '.waiting_on.since | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$")' "$LOCK_FILE" >/dev/null; then
  fail "since is ISO-8601 UTC" "$(jq -r .waiting_on.since "$LOCK_FILE")"
elif [ "$(jq -c '[.current_step, .skill, .qa_phase, .pr_url]' "$LOCK_FILE")" != '[3,"develop-task","5b","https://x/1"]' ]; then
  fail "set leaves every other field alone" "$(jq -c . "$LOCK_FILE")"
elif ! echo "$OUT" | grep -q "waiting on step-3 codebase map (agent, 10 min)"; then
  fail "set prints the label, kind and budget" "out=$OUT"
else
  pass "set writes {kind, label, since, budget_minutes}; current_step/qa_phase untouched; prints the wait"
fi

# ── 2. --clear removes the field only ────────────────────────────────────────
OUT=$(SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --clear 2>/dev/null); RC=$?
if [ "$RC" -eq 0 ] && [ "$(jq -c '[has("waiting_on"), .current_step, .qa_phase]' "$LOCK_FILE")" = '[false,3,"5b"]' ] && [ "$OUT" = "set-waiting-on: cleared" ]; then
  pass "--clear removes waiting_on; current_step/qa_phase untouched"
else
  fail "--clear" "rc=$RC out=$OUT lock=$(jq -c . "$LOCK_FILE")"
fi
BEFORE=$(cat "$LOCK_FILE")
SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --clear >/dev/null 2>&1; RC=$?
[ "$RC" -eq 0 ] && [ "$(cat "$LOCK_FILE")" = "$BEFORE" ] && pass "--clear on a lock without the field: exit 0, byte-identical" || fail "--clear noop" "rc=$RC"

# ── 3. --kind ────────────────────────────────────────────────────────────────
LOCK_FILE="$TMPDIR_TEST/kind.lock"; write_lock 7
SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "CI poll" --kind task >/dev/null 2>&1
[ "$(jq -r '.waiting_on.kind' "$LOCK_FILE")" = "task" ] && pass "--kind task is stored" || fail "--kind task" "$(jq -c .waiting_on "$LOCK_FILE")"
BEFORE=$(cat "$LOCK_FILE")
SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "x" --kind cron >/dev/null 2>&1; RC=$?
[ "$RC" -ne 0 ] && [ "$(cat "$LOCK_FILE")" = "$BEFORE" ] && pass "--kind cron refused; lock byte-identical" || fail "--kind refusal" "rc=$RC"
SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" >/dev/null 2>&1; RC=$?
[ "$RC" -ne 0 ] && [ "$(cat "$LOCK_FILE")" = "$BEFORE" ] && pass "no label and no --clear refused; lock byte-identical" || fail "no-arg refusal" "rc=$RC"
SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "x" --clear >/dev/null 2>&1; RC=$?
[ "$RC" -ne 0 ] && [ "$(cat "$LOCK_FILE")" = "$BEFORE" ] && pass "a label together with --clear refused" || fail "label+clear refusal" "rc=$RC"

# ── 4. budget from config ────────────────────────────────────────────────────
CFG="$TMPDIR_TEST/skills-config.yaml"
printf 'subagents:\n  wallClockMinutes: 25\n' > "$CFG"
LOCK_FILE="$TMPDIR_TEST/budget.lock"; write_lock 5
SKILLS_CONFIG_FILE="$CFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "traceability mapper" >/dev/null 2>&1
[ "$(jq -r '.waiting_on.budget_minutes' "$LOCK_FILE")" = "25" ] && pass "budget_minutes = subagents.wallClockMinutes (25) when configured" || fail "configured budget" "$(jq -c .waiting_on "$LOCK_FILE")"
printf 'subagents:\n  wallClockMinutes: soon\n' > "$CFG"
write_lock 5
SKILLS_CONFIG_FILE="$CFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "x" >/dev/null 2>&1
[ "$(jq -r '.waiting_on.budget_minutes' "$LOCK_FILE")" = "10" ] && pass "a non-numeric wallClockMinutes falls back to 10" || fail "non-numeric budget" "$(jq -c .waiting_on "$LOCK_FILE")"

# ── 4b. --budget-minutes overrides the config for one wait (QA cycle 1, CR-2) ─
printf 'subagents:\n  wallClockMinutes: 25\n' > "$CFG"
write_lock 7
SKILLS_CONFIG_FILE="$CFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "step-7 CI poll" --kind task --budget-minutes 26 >/dev/null 2>&1; RC=$?
[ "$RC" -eq 0 ] && [ "$(jq -c '[.waiting_on.kind, .waiting_on.budget_minutes]' "$LOCK_FILE")" = '["task",26]' ] \
  && pass "--budget-minutes 26 overrides wallClockMinutes 25 for this wait (stored as a number)" || fail "--budget-minutes override" "rc=$RC $(jq -c .waiting_on "$LOCK_FILE")"
BEFORE=$(cat "$LOCK_FILE"); BAD_OK=true
for BAD in 0 07 ten -5 ""; do
  SKILLS_CONFIG_FILE="$CFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "x" --budget-minutes "$BAD" >/dev/null 2>&1; RC=$?
  if [ "$RC" -eq 0 ] || [ "$(cat "$LOCK_FILE")" != "$BEFORE" ]; then fail "--budget-minutes '$BAD' refused" "rc=$RC"; BAD_OK=false; fi
done
[ "$BAD_OK" = true ] && pass "--budget-minutes refuses 0, a leading zero, a word, a negative and an empty value; lock byte-identical"

# ── 5. no lock → exit 0, nothing created ─────────────────────────────────────
LOCK_FILE="$TMPDIR_TEST/absent.lock"
SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "x" >/dev/null 2>&1; RC=$?
[ "$RC" -eq 0 ] && [ ! -f "$LOCK_FILE" ] && pass "no lock → exit 0 noop (set)" || fail "no lock set" "rc=$RC"
SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" --clear >/dev/null 2>&1; RC=$?
[ "$RC" -eq 0 ] && [ ! -f "$LOCK_FILE" ] && pass "no lock → exit 0 noop (--clear)" || fail "no lock clear" "rc=$RC"

# ── 6. non-object lock fails closed; no temp file left ───────────────────────
for SHAPE in 'null' '[]' '"str"' '' ; do
  LOCK_FILE="$TMPDIR_TEST/shape.lock"; printf '%s' "$SHAPE" > "$LOCK_FILE"
  OUT=$(SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "x" 2>/dev/null); RC=$?
  if [ "$RC" -ne 0 ] && [ "$(cat "$LOCK_FILE")" = "$SHAPE" ] && [ -z "$OUT" ]; then
    pass "non-object lock '${SHAPE:-<empty>}' fails closed: exit $RC, untouched, nothing on stdout"
  else
    fail "non-object lock '${SHAPE:-<empty>}'" "rc=$RC out=$OUT"
  fi
done
LEFT=$(find "$TMPDIR_TEST" -name '.set-waiting-on.*' | wc -l | tr -d ' ')
[ "$LEFT" = "0" ] && pass "no temp file left behind on any path" || fail "temp files" "$LEFT left"

# ── 7. a label with spaces and metacharacters round-trips ────────────────────
LOCK_FILE="$TMPDIR_TEST/label.lock"; write_lock 5
LABEL='5c review-pr lenses ($PR "42" `x`)'
SKILLS_CONFIG_FILE="$NOCFG" PIPELINE_LOCK="$LOCK_FILE" bash "$SCRIPT" "$LABEL" >/dev/null 2>&1
[ "$(jq -r '.waiting_on.label' "$LOCK_FILE")" = "$LABEL" ] && pass "label round-trips verbatim through jq --arg" || fail "label round-trip" "$(jq -r .waiting_on.label "$LOCK_FILE")"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "  set-waiting-on.test.sh: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ]
