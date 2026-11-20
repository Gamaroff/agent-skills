#!/usr/bin/env bash
# qa-report-cycles.test.sh — regression tests for qa-report-cycles.sh (task.276, obs #135)
#
# Usage: bash shared/resources/qa-report-cycles.test.sh
#
# The script exists because `grep -c '^### QA Cycle'` counted two heading sets — the Decisions Log's
# and the QA Iteration History's — and read four cycles as eight. Each case below is a report shape;
# the doubled shape is the one that failed in production (task.246), and the single-set shapes are its
# controls: they must keep reading the same number the doubled one now reads.

PASS=0
FAIL=0
# shellcheck source=undefined-command-guard.sh
. "$(dirname "$0")/undefined-command-guard.sh"
SCRIPT="$(cd "$(dirname "$0")" && pwd)/qa-report-cycles.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

# expect NAME WANT REPORT-CONTENT — writes the report with printf (no heredoc) and compares the count.
expect() {
  local name="$1" want="$2" body="$3" f="$T/r-$RANDOM.md" got rc
  printf '%s\n' "$body" > "$f"
  got=$(bash "$SCRIPT" "$f" 2>&1); rc=$?
  if [ "$rc" -eq 0 ] && [ "$got" = "$want" ]; then pass "$name"; else fail "$name" "want $want, got '$got' (rc=$rc)"; fi
}

DOUBLED='# Report

## Decisions Log

### QA Cycle 1 — decision
### QA Cycle 2 — decision
### QA Cycle 3 — decision
### QA Cycle 4 — decision

## QA Iteration History

### QA Cycle 1 — 2026-11-01
### QA Cycle 2 — 2026-11-02
### QA Cycle 3 — 2026-11-03
### QA Cycle 4 — 2026-11-04

## Completion'

# ── the defect: both heading sets ────────────────────────────────────────────
expect "both heading sets count 4, not 8 (obs #135)" 4 "$DOUBLED"

# ── controls: one heading set reads the same number ──────────────────────────
expect "History section alone counts 4" 4 '## QA Iteration History

### QA Cycle 1 — a
### QA Cycle 2 — b
### QA Cycle 3 — c
### QA Cycle 4 — d'
expect "no History section: the headings anywhere, distinct (a fixture or hand-written report)" 4 '### QA Cycle 1
### QA Cycle 2
### QA Cycle 3
### QA Cycle 4'
expect "no History section and the headings doubled: still distinct (cycles 1 and 2 twice = 2)" 2 '## Decisions Log
### QA Cycle 1
### QA Cycle 2
## Other
### QA Cycle 1
### QA Cycle 2'
expect "the same N twice in the History section counts once" 2 '## QA Iteration History
### QA Cycle 1 — first
### QA Cycle 1 — heading repeated by a hand edit
### QA Cycle 2 — b'

# ── scope: the History section is the source when it exists ──────────────────
expect "a Decisions Log heading with an N the History lacks is not counted" 4 '## Decisions Log
### QA Cycle 5 — planned, not run
## QA Iteration History
### QA Cycle 1 — a
### QA Cycle 2 — b
### QA Cycle 3 — c
### QA Cycle 4 — d
## Completion'
expect "a heading after the next H2 is outside the section" 2 '## QA Iteration History
### QA Cycle 1 — a
### QA Cycle 2 — b
## Completion
### QA Cycle 9 — not in the History section'
expect "a QA Cycle heading with a trailing colon or no suffix still parses" 3 '## QA Iteration History
### QA Cycle 1:
### QA Cycle 2
### QA Cycle 3 — x'

# ── zero is an answer, not an error ──────────────────────────────────────────
expect "an empty History section is 0" 0 '## QA Iteration History

_Track each QA review/fix cycle._

## Completion'
expect "a report with no QA headings is 0" 0 '# Report
## Summary'

# ── --list ───────────────────────────────────────────────────────────────────
F="$T/list.md"; printf '%s\n' "$DOUBLED" > "$F"
GOT=$(bash "$SCRIPT" "$F" --list | tr '\n' ' ')
[ "$GOT" = "1 2 3 4 " ] && pass "--list prints the distinct numbers ascending" || fail "--list" "got '$GOT'"
F="$T/list10.md"; printf '%s\n' '## QA Iteration History' '### QA Cycle 10' '### QA Cycle 9' '### QA Cycle 2' > "$F"
GOT=$(bash "$SCRIPT" "$F" --list | tr '\n' ' ')
[ "$GOT" = "2 9 10 " ] && pass "--list sorts numerically (10 after 9)" || fail "--list numeric sort" "got '$GOT'"

# ── refusals ─────────────────────────────────────────────────────────────────
bash "$SCRIPT" "$T/does-not-exist.md" >/dev/null 2>&1; RC=$?
[ "$RC" -eq 1 ] && pass "an unreadable report exits 1" || fail "unreadable report" "rc=$RC"
bash "$SCRIPT" >/dev/null 2>&1; RC=$?
[ "$RC" -eq 2 ] && pass "no argument is a usage error (2)" || fail "usage" "rc=$RC"
bash "$SCRIPT" "$F" --bogus >/dev/null 2>&1; RC=$?
[ "$RC" -eq 2 ] && pass "an unknown flag is a usage error (2)" || fail "unknown flag" "rc=$RC"

undefined_commands_check || FAIL=$((FAIL + 1))
echo
echo "  qa-report-cycles.test.sh: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ]
