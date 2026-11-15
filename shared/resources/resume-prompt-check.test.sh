#!/usr/bin/env bash
# resume-prompt-check.test.sh — regression tests for resume-prompt-check.sh (task.276, obs #95)
#
# Usage: bash shared/resources/resume-prompt-check.test.sh
#
# The script exists because a "resume qa-fix cycle 2" prompt arrived twice after cycle 2 had finished
# (task.217) and nothing compared the prompt with the artefacts. Each case builds the on-disk state a
# prompt can meet and asserts the verdict AND the exit code, since a caller branches on the code.

PASS=0
FAIL=0
# shellcheck source=undefined-command-guard.sh
. "$(dirname "$0")/undefined-command-guard.sh"
SCRIPT="$(cd "$(dirname "$0")" && pwd)/resume-prompt-check.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

NOLOCK="$T/no-lock.json"   # a path that never exists: no live lock unless a case writes one

# mkdoc DIR GATE... — a work-item directory with the named gate numbers
mkdoc() {
  local dir="$1"; shift
  mkdir -p "$dir"
  for n in "$@"; do : > "$dir/task.9.gate.$n.example.yml"; done
}
# check NAME WANT-RC WANT-OUT-PREFIX LOCK ARGS... — runs the script and compares code and first words
check() {
  local name="$1" wrc="$2" wout="$3" lock="$4"; shift 4
  local out rc
  out=$(PIPELINE_LOCK="$lock" bash "$SCRIPT" "$@" 2>&1); rc=$?
  case "$out" in
    "$wout"*) [ "$rc" -eq "$wrc" ] && { pass "$name"; return; } ;;
  esac
  fail "$name" "want rc=$wrc out='$wout…'; got rc=$rc out='$out'"
}

# ── 5a — the QA review of cycle N ────────────────────────────────────────────
D="$T/a"; mkdoc "$D" 1 2
check "5a cycle 2 with gate 2 on disk: already complete" 1 "already complete: 5a 2" "$NOLOCK" "$D" 5a 2
check "5a cycle 1 with gate 2 on disk: already complete" 1 "already complete: 5a 1" "$NOLOCK" "$D" 5a 1
check "5a cycle 3 with gates 1-2: proceed" 0 "proceed: 5a 3" "$NOLOCK" "$D" 5a 3
D="$T/a-none"; mkdir -p "$D"
check "5a cycle 1 with no gate on disk: proceed (the ordinary first review)" 0 "proceed: 5a 1" "$NOLOCK" "$D" 5a 1

# ── 5b — the qa-fix of cycle N (the task.217 shape) ──────────────────────────
D="$T/b"; mkdoc "$D" 1 2 3
check "5b cycle 2 once gate 3 exists: already complete (task.217)" 1 "already complete: 5b 2" "$NOLOCK" "$D" 5b 2
D="$T/b2"; mkdoc "$D" 1 2
check "5b cycle 2 with gate 2 the latest: proceed (the fix is still owed)" 0 "proceed: 5b 2" "$NOLOCK" "$D" 5b 2
D="$T/b-none"; mkdir -p "$D"
check "5b with no gate on disk: cannot tell (exit 3)" 3 "cannot tell" "$NOLOCK" "$D" 5b 1

# ── 5c — the PR review of cycle N ────────────────────────────────────────────
D="$T/c"; mkdir -p "$D"
R="$D/task.9.implementation.1.x.md"
printf '%s\n' '## QA Iteration History' '### QA Cycle 1 — d' '**PR Review**: APPROVE — clean' '### QA Cycle 2 — d' '**PR Review**: {pending — 5c not yet run / APPROVE / CONCERNS / REQUEST CHANGES}' > "$R"
check "5c cycle 1 with an APPROVE verdict: already complete" 1 "already complete: 5c 1" "$NOLOCK" "$D" 5c 1
check "5c cycle 2 with only the pending template: proceed (the verdict words in it are not a verdict)" 0 "proceed: 5c 2" "$NOLOCK" "$D" 5c 2
check "5c cycle 3 with no entry: proceed" 0 "proceed: 5c 3" "$NOLOCK" "$D" 5c 3
D="$T/c-noreport"; mkdir -p "$D"
check "5c with no implementation report: cannot tell" 3 "cannot tell" "$NOLOCK" "$D" 5c 1

# ── a pipeline step — read from the report's Pipeline Progress table ─────────
D="$T/s"; mkdir -p "$D"
R="$D/task.9.implementation.1.x.md"
printf '%s\n' '| Step | Status | Artifact |' '|---|---|---|' '| 3. develop | ✅ Done | x |' '| 4. create-pr | ⏳ Pending | x |' '| 5–6. qa | ⏳ Pending | x |' '| 7. finalise | ⏭️ Skipped | x |' > "$R"
check "step 3 reading ✅: already complete" 1 "already complete: 3" "$NOLOCK" "$D" 3
check "step 4 reading ⏳: proceed" 0 "proceed: 4" "$NOLOCK" "$D" 4
check "step 5 (the QA loop row 5–6) reading ⏳: proceed" 0 "proceed: 5" "$NOLOCK" "$D" 5
check "step 7 reading ⏭️ Skipped: already complete" 1 "already complete: 7" "$NOLOCK" "$D" 7
check "a step with no row: cannot tell" 3 "cannot tell" "$NOLOCK" "$D" 8

# ── the lock is the run's own record ─────────────────────────────────────────
D="$T/l"; mkdoc "$D" 1
printf '{"current_step":7}\n' > "$T/lock7.json"
check "a lock at step 7 makes a step-5 prompt stale, whatever the artefacts say" 1 "already complete: 5b 1" "$T/lock7.json" "$D" 5b 1
printf '{"current_step":5}\n' > "$T/lock5.json"
check "a lock at step 5 leaves a step-5 prompt to the artefacts" 0 "proceed: 5b 1" "$T/lock5.json" "$D" 5b 1
printf 'not json' > "$T/lockbad.json"
check "an unparseable lock: cannot tell, never a guess" 3 "cannot tell" "$T/lockbad.json" "$D" 5b 1

# ── usage ────────────────────────────────────────────────────────────────────
D="$T/u"; mkdoc "$D" 1
check "no arguments: usage (2)" 2 "Usage" "$NOLOCK"
check "an unknown step: usage (2)" 2 "Usage" "$NOLOCK" "$D" 9
check "a sub-step with no cycle: usage (2)" 2 "resume-prompt-check" "$NOLOCK" "$D" 5b
check "a cycle of 0: usage (2)" 2 "resume-prompt-check" "$NOLOCK" "$D" 5b 0
check "a missing directory: usage (2)" 2 "Usage" "$NOLOCK" "$T/nope" 5b 1

undefined_commands_check || FAIL=$((FAIL + 1))
echo
echo "  resume-prompt-check.test.sh: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ]
