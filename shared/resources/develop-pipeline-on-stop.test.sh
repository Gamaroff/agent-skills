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

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "  develop-pipeline-on-stop.test.sh: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ]
