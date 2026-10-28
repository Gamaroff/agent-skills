#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/fast-gate-outcome.sh. Regenerate via `npm run bundle`.
# fast-gate-outcome.sh — classify a fast-gate result before anything triages it (task.238, obs #14).
#
# A gate that did not pass has two outcomes, not one:
#   not-measured  no exit code (the run never finished), 124/137/143 (timeout, SIGKILL, SIGTERM),
#                 or the test-tmpdir wrapper's own report that a signal interrupted the suite
#   attributable  any other red: the triage-and-retry path
# plus `green` for an exit of 0, which needs no classifying.
#
# There is no `pre-existing` outcome. A red was once compared, test by test, with a run at the PR
# base, and a red that also failed there was let through. Each of QA cycles 4, 5 and 6 found another
# node --test log shape that the comparison misread, letting a head-only failure through as
# pre-existing (task.238 bug.5 to bug.14). The comparison was deleted at the third strike. A red that
# is genuinely red on the base spends a retry, as it did before this script existed.
#
# Usage (from the repository root):
#   fast-gate-outcome.sh --log <gate log> --exit <exit code, or empty when none was recorded>
#
# Prints exactly one GATE_OUTCOME=… line. Exits 0 for every outcome — the outcome is the answer,
# not the exit code — and 2 on a usage error. Callers: the story/task QA loop's step 0a and
# develop-bug's step 3a.

set -u

LOG="" EXIT_CODE="" HAVE_EXIT=false
while [ $# -gt 0 ]; do
  case "$1" in
    --log) LOG="${2-}"; shift 2 || { echo "fast-gate-outcome: --log needs a value" >&2; exit 2; } ;;
    --exit) EXIT_CODE="${2-}"; HAVE_EXIT=true; shift 2 || { echo "fast-gate-outcome: --exit needs a value" >&2; exit 2; } ;;
    *) echo "fast-gate-outcome: unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$LOG" ] || { echo "fast-gate-outcome: --log is required" >&2; exit 2; }
$HAVE_EXIT || { echo "fast-gate-outcome: --exit is required (pass --exit \"\" when the run recorded none)" >&2; exit 2; }

case "$EXIT_CODE" in
  "") echo "GATE_OUTCOME=not-measured (no GATE_EXIT recorded)"; exit 0 ;;
  124 | 137 | 143) echo "GATE_OUTCOME=not-measured (exit $EXIT_CODE)"; exit 0 ;;
  0) echo "GATE_OUTCOME=green"; exit 0 ;;
  *[!0-9]*) echo "fast-gate-outcome: --exit must be a number or empty, got: $EXIT_CODE" >&2; exit 2 ;;
esac
[ -f "$LOG" ] || { echo "fast-gate-outcome: no such log: $LOG" >&2; exit 2; }
# An interrupted node --test exits 1, not 130 or 143, and its summary (`fail 0`, `cancelled 1`)
# reads exactly like a test that hit its timeout, which is a real red. Only the test-tmpdir wrapper's
# own signal report tells the two apart, so only it makes a run not measured (task.238 CR4-9).
# The wrapper prints it after the suite has ended, so it counts only when no node summary line
# (`ℹ fail 1`, `# tests 3`) follows it: a test that prints the same sentence does so before node's
# summary, and its red stays attributable (task.238 PRB7-1).
if awk '/^test-tmpdir: (interrupted by|the suite was killed by) SIG[A-Z0-9]+/ { s = NR }
        /^(ℹ|#) (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) / { t = NR }
        END { exit !(s && s > t) }' "$LOG"; then
  echo "GATE_OUTCOME=not-measured (the run was interrupted by a signal)"
  exit 0
fi
echo "GATE_OUTCOME=attributable"
