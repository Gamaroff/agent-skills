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
# `s`: inside the CURRENT gaps section, matched on the heading exactly so that a
# `— run N (historical, superseded)` section a re-run left behind is not read (QA-222-6),
# until the next `## `. `m`: inside its Missing Criteria subsection, until the next level-2 or
# level-3 heading — so `### Next Steps` ends the range and a `####` category heading does not
# (QA-222-3). Fences are tracked from line 1 and closed only by their own marker, so a fenced
# example of the section is never entered and a ``` line inside a ~~~ fence does not end it
# (QA-222-8). A gap is a bullet that is not nested under another bullet: `st` is a stack of open
# bullet indents, popped by any line at or left of them, so a detail sub-bullet is not a second gap
# and a numbered category line (`1. **Unit Tests:**`) closes the list above it (QA-222-4).
# Printed: "S" when the section exists, "@" when its subsection does, then the count.
OUT=$(awk '
  function indent(l,   i, c, n) {
    n = 0
    for (i = 1; i <= length(l); i++) {
      c = substr(l, i, 1)
      if (c == " ") n++
      else if (c == "\t") n += 4
      else break
    }
    return n
  }
  /^[ \t]*(```|~~~)/ {
    mk = $0
    sub(/^[ \t]*/, "", mk)
    mk = substr(mk, 1, 3)
    if (!fence) { fence = 1; fmk = mk } else if (mk == fmk) fence = 0
    next
  }
  fence { next }
  /^## Definition of Done - Gaps Identified[ \t]*$/ { s = 1; sec = 1; next }
  s && /^## / { s = 0 }
  s && /^### Missing Criteria/ { m = 1; seen = 1; next }
  s && m && /^###?([^#]|$)/ { m = 0 }
  s && m && !/^[ \t]*$/ {
    ind = indent($0)
    while (n > 0 && st[n] >= ind) n--
    if ($0 ~ /^[ \t]*- /) {
      if (n == 0) count++
      st[++n] = ind
    }
  }
  END { if (sec) print "S"; if (seen) print "@"; print count + 0 }
' "$DOC_FILE")
case "$OUT" in
  S*) ;;
  *)
    echo "HALT: $DOC_FILE has no current '## Definition of Done - Gaps Identified' section (a '— run N (historical, superseded)' one is not read) — Step 8.4 writes it" >&2
    exit 1
    ;;
esac
case "$OUT" in
  *@*) ;;
  *)
    echo "HALT: no '### Missing Criteria' under '## Definition of Done - Gaps Identified' in $DOC_FILE — Step 8.4 lists each gap there" >&2
    exit 1
    ;;
esac
N=${OUT##*$'\n'}
[ "${N:-0}" -gt 0 ] || {
  echo "HALT: '### Missing Criteria' in $DOC_FILE lists no gap — Step 8.4 writes one list item per gap" >&2
  exit 1
}
printf '%s\n' "$N"
