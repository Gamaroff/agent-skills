#!/usr/bin/env bash
# develop-pipeline-on-stop.test.sh — regression tests for develop-pipeline-on-stop.sh
#
# Usage: bash shared/resources/develop-pipeline-on-stop.test.sh
#
# Focus: THE HOOK MUST NEVER NAME A STEP THAT HAS NOT RUN.
#
# The hook fires when the assistant tries to stop mid-pipeline and returns a
# `decision: "block"` reason telling the orchestrator what to do next. It used to
# compute that as `current_step + 1`, which skipped a step every time it fired
# mid-step rather than between steps.
#
# Scenarios 1–4 are the FOUR MISFIRES OBSERVED ON A SINGLE STORY (tinker-city 40.8),
# reproduced as fixtures. Every one of them must have failed against the old
# arithmetic — that is what makes this suite a regression corpus rather than a
# description of current behaviour. Scenario 4 is the one that mattered: it would
# have told the orchestrator to run /finalise, the step that writes
# `status: accepted`, while the gate was CONCERNS and CI was still running.
#
# Covers:
#   1. lock=2, review not finished        → must name Step 2 (REVIEW), never Step 3
#   2. lock=4, no PR yet                  → must name Step 4 (CREATE PR), never /qa-story
#   3. lock=5, qa-story not run           → must name Step 5 (QA REVIEW), never /qa-fix
#   4. lock=6, inside the QA loop         → must name Step 6 (QA FIX), NEVER /finalise
#   5. lock=8 (commit-changes pending)    → must still BLOCK (was allowed by `-ge 8`)
#   6. no lock                            → allow stop (ordinary noop)
#   7. stop_hook_active                   → allow stop (anti-loop signal honoured)
#   8. develop-task / develop-bug variants name their own skills
#   9. out-of-range and malformed locks   → allow stop, never crash
#  10. lock=5 + qa_phase (task.123)       → names the SUB-step's skill, never a
#                                            neighbour's; absent qa_phase names 5a;
#                                            the end-of-loop advance is 5 → 7

PASS=0
FAIL=0
HOOK="$(cd "$(dirname "$0")" && pwd)/develop-pipeline-on-stop.sh"
BASH_BIN="$(command -v bash)"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# The hook reads a RELATIVE lock path (.claude/state/…), so each scenario runs in
# its own directory rather than pointing an env var at a file.
run_hook() { # $1 = dir, $2 = stdin json
  ( cd "$1" && printf '%s' "${2:-{\}}" | "$BASH_BIN" "$HOOK" 2>/dev/null )
}

mklock() { # $1 = dir, $2 = json
  mkdir -p "$1/.claude/state"
  printf '%s\n' "$2" > "$1/.claude/state/develop-pipeline.lock"
}

reason_of() { echo "$1" | jq -r '.reason // ""' 2>/dev/null; }

# ── Scenarios 1–4: the four observed misfires ────────────────────────────────
# Each asserts BOTH halves: the correct step is named AND the skipped-to step is not.
# Asserting only the first would pass for a hook that named every step at once.

i=0
while IFS='|' read -r step must_contain must_not_contain label; do
  [ -z "$step" ] && continue
  i=$((i + 1))
  d="$TMPDIR_TEST/misfire$i"
  mklock "$d" "{\"skill\":\"develop-story\",\"current_step\":$step,\"report_path\":\"report.md\"}"
  OUT=$(run_hook "$d")
  R=$(reason_of "$OUT")

  if [ -z "$R" ]; then
    fail "$label" "hook allowed stop; expected a block naming Step $step"
  elif ! echo "$R" | grep -q "$must_contain"; then
    fail "$label" "reason did not name '$must_contain'. Got: $(echo "$R" | head -1)"
  elif echo "$R" | grep -q -- "$must_not_contain"; then
    fail "$label" "reason names '$must_not_contain' — a step that has NOT run"
  else
    pass "$label"
  fi
done <<'EOF'
2|STEP 2/8|STEP 3/8|misfire 1 — lock=2 must name Step 2, not Step 3
4|STEP 4/8|/qa-story|misfire 2 — lock=4 (no PR) must name CREATE PR, not QA REVIEW
5|STEP 5/8|/qa-fix|misfire 3 — lock=5 (qa-story unrun) must name QA REVIEW, not QA FIX
6|STEP 6/8|/finalise|misfire 4 — lock=6 (QA loop) must NEVER name /finalise
EOF

# ── Scenario 5: Step 8 must still be guarded ─────────────────────────────────
# `current_step: 8` means commit-changes is PENDING. Step 8 signals completion by
# REMOVING the lock, so a lock present at 8 is uncommitted work. The old `-ge 8`
# allowed stop here — i.e. stopped guarding the step whose omission loses the commit.
d="$TMPDIR_TEST/step8"
mklock "$d" '{"skill":"develop-story","current_step":8,"report_path":"report.md"}'
OUT=$(run_hook "$d"); R=$(reason_of "$OUT")
if [ -z "$R" ]; then
  fail "lock=8 still blocks (commit-changes pending)" "hook allowed stop with work uncommitted"
elif echo "$R" | grep -q "STEP 8/8" && echo "$R" | grep -q "/commit-changes"; then
  pass "lock=8 still blocks (commit-changes pending)"
else
  fail "lock=8 still blocks" "did not name Step 8 / commit-changes. Got: $(echo "$R" | head -1)"
fi

# ── Scenario 6: no lock → allow ──────────────────────────────────────────────
d="$TMPDIR_TEST/nolock"; mkdir -p "$d"
OUT=$(run_hook "$d")
[ -z "$OUT" ] && pass "no lock → allow stop" \
  || fail "no lock → allow stop" "expected empty stdout, got: $OUT"

# ── Scenario 7: anti-loop signal honoured ────────────────────────────────────
d="$TMPDIR_TEST/loop"
mklock "$d" '{"skill":"develop-story","current_step":3,"report_path":"report.md"}'
OUT=$(run_hook "$d" '{"stop_hook_active":true}')
[ -z "$OUT" ] && pass "stop_hook_active → allow stop (no blocking loop)" \
  || fail "stop_hook_active → allow stop" "expected empty stdout, got: $(echo "$OUT" | head -1)"

# ── Scenario 8: per-skill variants ───────────────────────────────────────────
d="$TMPDIR_TEST/task"
mklock "$d" '{"skill":"develop-task","current_step":5,"report_path":"r.md"}'
R=$(reason_of "$(run_hook "$d")")
if echo "$R" | grep -q "/qa-task" && echo "$R" | grep -q "DEVELOP-TASK"; then
  pass "develop-task names /qa-task"
else
  fail "develop-task names /qa-task" "got: $(echo "$R" | head -1)"
fi

d="$TMPDIR_TEST/bug"
mklock "$d" '{"skill":"develop-bug","current_step":2,"report_path":"r.md"}'
R=$(reason_of "$(run_hook "$d")")
if echo "$R" | grep -q "/review-bug" && echo "$R" | grep -q "DEVELOP-BUG"; then
  pass "develop-bug names /review-bug"
else
  fail "develop-bug names /review-bug" "got: $(echo "$R" | head -1)"
fi

# ── Scenario 9: malformed / out-of-range locks degrade to allow ──────────────
while IFS='|' read -r json label; do
  [ -z "$json" ] && continue
  d="$TMPDIR_TEST/bad$RANDOM$label"
  mklock "$d" "$json"
  OUT=$(run_hook "$d")
  [ -z "$OUT" ] && pass "$label" || fail "$label" "expected allow, got: $(echo "$OUT" | head -1)"
done <<'EOF'
{"skill":"develop-story","current_step":9}|out-of-range step 9 → allow
{"skill":"develop-story","current_step":0}|step 0 → allow
{"skill":"develop-story"}|missing current_step → allow
not json at all|unparseable lock → allow
EOF

# ── Scenario 10: qa_phase names the QA loop's sub-step (task.123) ────────────
#
# The lock reads `current_step: 5` for the whole loop; `qa_phase` says where in
# it. Each row asserts BOTH halves: the sub-step's skill is named AND a
# neighbour's is not — a hook that named every loop skill at once would pass the
# first half. The absent-qa_phase row pins the loud default (5a), and every row
# pins that the advance the hook asks for at the end of the loop is 5 → 7, never
# 5 → 6: a "step 6" is not a place the loop can go.
while IFS='|' read -r skill phase must_contain must_not_contain label; do
  [ -z "$skill" ] && continue
  d="$TMPDIR_TEST/qaphase-$skill-${phase:-absent}"
  if [ -n "$phase" ]; then
    mklock "$d" "{\"skill\":\"$skill\",\"current_step\":5,\"qa_phase\":\"$phase\",\"report_path\":\"r.md\"}"
  else
    mklock "$d" "{\"skill\":\"$skill\",\"current_step\":5,\"report_path\":\"r.md\"}"
  fi
  R=$(reason_of "$(run_hook "$d")")
  if [ -z "$R" ]; then
    fail "$label" "hook allowed stop; expected a block"
  elif ! echo "$R" | grep -q -- "invoke $must_contain"; then
    fail "$label" "did not name '$must_contain'. Got: $(echo "$R" | head -1)"
  elif echo "$R" | grep -q -- "invoke $must_not_contain"; then
    fail "$label" "named '$must_not_contain' — a sub-step the loop is not at"
  elif echo "$R" | grep -q "advance the lock to 6"; then
    fail "$label" "the loop must never be told to advance to 6"
  elif ! echo "$R" | grep -q "STEP 5/8"; then
    fail "$label" "banner must still say STEP 5/8 inside the loop"
  else
    pass "$label"
  fi
done <<'EOF2'
develop-task|5a|/qa-task|/qa-fix|qa_phase 5a (task) → /qa-task, not /qa-fix
develop-task|5b|/qa-fix|/qa-task|qa_phase 5b (task) → /qa-fix, not /qa-task
develop-task|5c|/review-pr|/qa-fix|qa_phase 5c (task) → /review-pr, not /qa-fix
develop-task||/qa-task|/review-pr|qa_phase absent (task) → /qa-task (loud default), not /review-pr
develop-story|5a|/qa-story|/qa-fix|qa_phase 5a (story) → /qa-story, not /qa-fix
develop-story|5b|/qa-fix|/qa-story|qa_phase 5b (story) → /qa-fix, not /qa-story
develop-story|5c|/review-pr|/qa-story|qa_phase 5c (story) → /review-pr, not /qa-story
develop-story||/qa-story|/qa-fix|qa_phase absent (story) → /qa-story (loud default), not /qa-fix
EOF2

# CR-3 (task.123 QA cycle 1): the completion sentence must not tell a 5a or 5b stall to
# leave the loop. Only 5c's sentence may say "advance the lock to 7", and it must
# condition it on APPROVE or CONCERNS; 5a and 5b must say the lock stays at 5 and
# must NOT say "mark Step 5 ✅".
for phase in 5a 5b; do
  d="$TMPDIR_TEST/qaphase-completion-$phase"
  mklock "$d" "{\"skill\":\"develop-task\",\"current_step\":5,\"qa_phase\":\"$phase\",\"report_path\":\"r.md\"}"
  R=$(reason_of "$(run_hook "$d")")
  if echo "$R" | grep -q "advance the lock to 7"; then
    fail "qa_phase $phase never says 'advance the lock to 7'" "an unconditional exit instruction on a mid-loop stall"
  elif echo "$R" | grep -q "mark Step 5 ✅ in"; then
    fail "qa_phase $phase never says 'mark Step 5 ✅'" "the loop is not complete at $phase"
  elif ! echo "$R" | grep -q "lock stays at 5"; then
    fail "qa_phase $phase says the lock stays at 5" "got: $(echo "$R" | grep -i 'only once' | head -1)"
  elif ! echo "$R" | grep -q "set-qa-phase.sh"; then
    fail "qa_phase $phase names the qa_phase writer" "got: $(echo "$R" | grep -i 'only once' | head -1)"
  else
    pass "qa_phase $phase completion sentence keeps the run inside the loop (no advance, no ✅, writer named)"
  fi
done
d="$TMPDIR_TEST/qaphase-completion-5c"
mklock "$d" '{"skill":"develop-story","current_step":5,"qa_phase":"5c","report_path":"r.md"}'
R=$(reason_of "$(run_hook "$d")")
if echo "$R" | grep -q "on APPROVE or CONCERNS mark Step 5 ✅ in \`r.md\` and advance the lock to 7" && echo "$R" | grep -q "on REQUEST CHANGES write"; then
  pass "qa_phase 5c completion sentence conditions the 5 → 7 advance on APPROVE/CONCERNS and routes REQUEST CHANGES to 5b"
else
  fail "qa_phase 5c completion sentence" "got: $(echo "$R" | grep -i 'only once' | head -1)"
fi
# Outside the loop the generic sentence is unchanged.
d="$TMPDIR_TEST/generic-completion"
mklock "$d" '{"skill":"develop-task","current_step":3,"report_path":"r.md"}'
R=$(reason_of "$(run_hook "$d")")
echo "$R" | grep -q "Only once /develop has actually completed: mark Step 3 ✅ in \`r.md\` and advance the lock to 4" \
  && pass "step 3 keeps the generic completion sentence (mark ✅, advance to 4)" \
  || fail "step 3 generic completion sentence" "got: $(echo "$R" | grep -i 'only once' | head -1)"

# The hook must never name /finalise from inside the loop, whatever qa_phase says —
# scenario 4's property, re-pinned on the new field. And develop-bug's map is untouched:
# its step 5 is its own verify step and reads no qa_phase.
d="$TMPDIR_TEST/qaphase-5c-no-finalise"
mklock "$d" '{"skill":"develop-story","current_step":5,"qa_phase":"5c","report_path":"r.md"}'
R=$(reason_of "$(run_hook "$d")")
if echo "$R" | grep -q "invoke /finalise"; then
  fail "qa_phase 5c never names /finalise" "the hook skipped past the loop's exit gate"
else
  pass "qa_phase 5c never names /finalise (5c decides the exit, not the hook)"
fi
d="$TMPDIR_TEST/qaphase-bug"
mklock "$d" '{"skill":"develop-bug","current_step":5,"qa_phase":"5b","report_path":"r.md"}'
R=$(reason_of "$(run_hook "$d")")
if echo "$R" | grep -q "Step 5 per develop-bug SKILL.md (verify)" && echo "$R" | grep -q "advance the lock to 6"; then
  pass "develop-bug ignores qa_phase (own map: step 5 = verify, advance 5 → 6)"
else
  fail "develop-bug ignores qa_phase" "got: $(echo "$R" | head -1) / $(echo "$R" | grep -o 'advance the lock to [0-9]*')"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "  develop-pipeline-on-stop.test.sh: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ]
