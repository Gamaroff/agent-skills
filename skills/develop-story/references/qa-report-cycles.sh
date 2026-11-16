#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-report-cycles.sh. Regenerate via `npm run bundle`.
# qa-report-cycles.sh — how many QA cycles an implementation report records (task.276, obs #135).
#
# Usage: qa-report-cycles.sh <implementation-report> [--list]
#   (no flag)  print the number of DISTINCT cycle numbers the report records
#   --list     print those numbers, one per line, ascending
#
# The ONE definition of "the report's cycle count". grant-qa-cycles.sh and
# reenter-qa-after-finalise.sh each carried `grep -c '^### QA Cycle'`, which counted the Decisions
# Log's `### QA Cycle {N}` headings AND the QA Iteration History's, so four cycles read as eight
# (task.246: `qa_max_cycles=10 (base 8)` after four cycles). resume-prompt-check.sh reads the same
# answer, so a resume prompt and a budget reconstruction cannot disagree about it.
#
# What is counted: the distinct N of `### QA Cycle {N}` headings inside the `## QA Iteration History`
# section (up to the next `## ` heading). A report with no such section — a hand-written one, or a
# fixture — falls back to every `### QA Cycle {N}` heading in the file, still distinct, so a second
# heading set cannot double the count there either. Distinct N is correct whether a report holds one
# heading per cycle (task 277's lint) or two.
#
# Exit codes: 0 on every answer, including zero cycles; 1 when the report cannot be read; 2 on a
# usage error. A count of 0 is a real answer ("no cycle recorded"), not an error.

set -u

REPORT="${1:-}"
MODE="${2:-}"
if [ -z "$REPORT" ] || { [ -n "$MODE" ] && [ "$MODE" != "--list" ]; } || [ $# -gt 2 ]; then
  echo "Usage: qa-report-cycles.sh <implementation-report> [--list]" >&2
  exit 2
fi
if [ ! -f "$REPORT" ] || [ ! -r "$REPORT" ]; then
  echo "qa-report-cycles: cannot read '$REPORT'" >&2
  exit 1
fi

# One pass: remember whether the History section exists, collect the numbers seen inside it and the
# numbers seen anywhere, and print the first set when the section exists, else the second.
NUMBERS=$(awk '
  /^## / { in_hist = ($0 ~ /^## QA Iteration History[[:space:]]*$/); if (in_hist) has_hist = 1; next }
  /^### QA Cycle [0-9]+/ {
    n = $4; sub(/[^0-9].*$/, "", n); n = n + 0
    all[n] = 1
    if (in_hist) hist[n] = 1
  }
  END {
    if (has_hist) { for (k in hist) print k } else { for (k in all) print k }
  }
' "$REPORT" | sort -n) || { echo "qa-report-cycles: could not read '$REPORT'" >&2; exit 1; }

if [ "$MODE" = "--list" ]; then
  [ -z "$NUMBERS" ] || printf '%s\n' "$NUMBERS"
  exit 0
fi
if [ -z "$NUMBERS" ]; then
  echo 0
else
  printf '%s\n' "$NUMBERS" | wc -l | tr -d ' '
fi
exit 0
