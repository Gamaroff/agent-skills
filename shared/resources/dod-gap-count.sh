#!/usr/bin/env bash
# dod-gap-count.sh — the ONE story/task gap count (/finalise Step 8.5).
#
#   bash .agents/skills/finalise/references/dod-gap-count.sh <DOC_FILE>
#
# A gap is one list item under `### Missing Criteria` inside the document's
# `## Definition of Done - Gaps Identified` section. `### Next Steps` lists the
# actions that close the gaps, and is not counted: counting both double-counted
# every report (obs #24 — task.181 said 5 for 3, task.199 3 for 1, task.213 4 for 2).
# An item is any `- ` line, checkbox or not, indented or not: Step 8.4's own example
# writes 6 of its 7 gaps as `- ⚠️`, nested under numbered categories (obs #212).
# Bug mode has its own definition (fill-verification-complete.sh count).
#
# Prints the number and writes nothing. Every HALT goes to stderr with exit 1, so a
# command substitution never swallows a reason. A gaps report with no gap in it is a
# defect, not a zero: the `dod-gaps` lead would read as if nothing were listed.
DOC_FILE="${1:-}"
case "$DOC_FILE" in '' | *'{'*)
  echo "HALT: DOC_FILE must be bound (got '$DOC_FILE')" >&2
  exit 1
  ;;
esac
[ -f "$DOC_FILE" ] || {
  echo "HALT: $DOC_FILE is not a file" >&2
  exit 1
}
grep -q '^## Definition of Done - Gaps Identified' "$DOC_FILE" || {
  echo "HALT: $DOC_FILE has no '## Definition of Done - Gaps Identified' section — Step 8.4 writes it" >&2
  exit 1
}
# `s`: inside the gaps section, until the next `## `. `m`: inside a Missing Criteria
# subsection, until the next `###` or `##` — so `### Next Steps` ends the range. The `@`
# marker records that the subsection exists, apart from whether it lists anything.
SUB=$(awk '/^## Definition of Done - Gaps Identified/ { s = 1; next }
  s && /^## / { s = 0 }
  s && /^### Missing Criteria/ { m = 1; print "@"; next }
  s && m && /^##/ { m = 0 }
  s && m' "$DOC_FILE")
case "$SUB" in
  '@'*) ;;
  *)
    echo "HALT: no '### Missing Criteria' under '## Definition of Done - Gaps Identified' in $DOC_FILE — Step 8.4 lists each gap there" >&2
    exit 1
    ;;
esac
# `grep -c` prints 0 and EXITS 1 when nothing matches, so `|| true` (never `|| echo 0`).
N=$(printf '%s\n' "$SUB" | grep -c '^[[:space:]]*- ' || true)
[ "${N:-0}" -gt 0 ] || {
  echo "HALT: '### Missing Criteria' in $DOC_FILE lists no gap — Step 8.4 writes one list item per gap" >&2
  exit 1
}
printf '%s\n' "$N"
