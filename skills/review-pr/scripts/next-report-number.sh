#!/usr/bin/env bash
# next-report-number.sh — print the next {n} for a work item's .pr-review.{n}. report.
#
# Pure and local: reads one directory listing, no git, no network, no writes.
# SKILL.md Step 7 calls it; the rule lives here, not in the prose.
#
# Usage:  next-report-number.sh <work-item-dir>
# Output: one integer on stdout, exit 0.
# Refusal: exit 2, `next-report-number: refused (<reason>): <detail>` on stderr, nothing on stdout.
#   reasons: usage (not a directory) | overflow (an {n} longer than 18 significant digits)
#
# Rules:
# - HIGHEST + 1, NEVER COUNT + 1. A directory holding .pr-review.1. and .pr-review.3. gets 4:
#   count + 1 would be 3 and overwrite the existing .3. report (obs #272). No report → 1.
# - Numeric, base 10. `.09.` reads as 9 and `.10.` beats `.9.` — lexical order is not numeric
#   order, and a leading zero is not octal (`10#`).
# - No silent wrap. An {n} past 18 significant digits would overflow shell arithmetic and print a
#   wrong number with exit 0; it is refused instead (task.185 QA cycle 1, QA-1).
# - Depth 1 only. A sibling work item's directory, or a .review.{n}. / .dod.{n}. report, is
#   another artifact kind and never counts.
#
set -u

dir=${1:-}
if [ -z "$dir" ] || [ ! -d "$dir" ]; then
  echo "next-report-number: refused (usage): not a directory: ${dir:-<empty>}" >&2
  exit 2
fi

max=0
for f in "$dir"/*.pr-review.*.md; do
  [ -e "$f" ] || continue # bash leaves an unmatched glob literal
  n=$(basename "$f" | sed -nE 's/.*\.pr-review\.([0-9]+)\..*/\1/p')
  [ -n "$n" ] || continue
  sig=${n#"${n%%[!0]*}"} # strip leading zeros; empty when n is all zeros
  if [ "${#sig}" -gt 18 ]; then
    echo "next-report-number: refused (overflow): {n} in $(basename "$f") has more than 18 significant digits" >&2
    exit 2
  fi
  n=$((10#$n))
  if [ "$n" -gt "$max" ]; then max=$n; fi
done

echo $((max + 1))
