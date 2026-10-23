#!/usr/bin/env bash
# dod-gap-count.sh — the ONE story/task gap count (/finalise Step 8.5), and the one reader of
# the section it counts.
#
#   bash .agents/skills/finalise/references/dod-gap-count.sh <DOC_FILE>          # the count
#   bash .agents/skills/finalise/references/dod-gap-count.sh <DOC_FILE> --body   # the section body
#
# A gap is one list item under `### Missing Criteria` inside the document's
# `## Definition of Done - Gaps Identified` section. `### Next Steps` lists the
# actions that close the gaps, and is not counted: counting both double-counted
# every report (obs #24 — task.181 said 5 for 3, task.199 3 for 1, task.213 4 for 2).
# An item is any `- ` line, checkbox or not, indented or not: Step 8.4's own example
# writes 6 of its 7 gaps as `- ⚠️`, nested under numbered categories (obs #212).
# Bug mode has its own definition (fill-verification-complete.sh count).
#
# `--body` prints the lines of that same section, so the PR comment's body and its lead's
# count read one section by one definition (QA-222-11: a prefix-matched body read the
# historical sections the count had stopped reading).
#
# Writes nothing. Every HALT goes to stderr with exit 1, so a command substitution never
# swallows a reason. A gaps report with no gap in it is a defect, not a zero: the `dod-gaps`
# lead would read as if nothing were listed.
DOC_FILE="${1:-}"
MODE="${2:-count}"
case "$DOC_FILE" in '' | *'{'*)
  echo "HALT: DOC_FILE must be bound (got '$DOC_FILE')" >&2
  exit 1
  ;;
esac
case "$MODE" in count | --body) ;; *)
  echo "HALT: unknown mode '$MODE' — pass nothing for the count, or --body" >&2
  exit 1
  ;;
esac
[ -f "$DOC_FILE" ] || {
  echo "HALT: $DOC_FILE is not a file" >&2
  exit 1
}
# Fences are tracked from line 1, as CommonMark reads them: an opener is a run of 3 or more
# backticks or tildes (a backtick opener's info string holds no backtick, so a prose line that
# starts with an inline code span is not one — QA-222-9), and only a run of the same character,
# at least as long, with nothing after it closes one (QA-222-8, QA-222-12). A fenced example of
# the section is therefore never entered.
# `s`: inside the CURRENT gaps section, matched on the heading exactly so that a
# `— run N (historical, superseded)` section a re-run left behind is not read (QA-222-6),
# until the next `## `. `m`: inside its Missing Criteria subsection, until the next level-2 or
# level-3 heading — so `### Next Steps` ends the range and a `####` category heading does not
# (QA-222-3). A gap is a bullet that is not nested under another bullet: `st` is a stack of
# open bullet indents, popped by any line at or left of them, so a detail sub-bullet is not a
# second gap and a numbered category line (`1. **Unit Tests:**`) closes the list above it
# (QA-222-4).
# Printed: "S" when the section exists, "@" when its subsection does, then the count — or, in
# --body mode, "S" and then the section's lines. `--body` refuses a section with no non-blank
# line, as the count refuses one with no gap: the marker is internal and never reaches stdout.
OUT=$(awk -v mode="$MODE" '
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
  {
    infence = fence
    l = $0
    sub(/^[ \t]*/, "", l)
    c = substr(l, 1, 1)
    if (c == "`" || c == "~") {
      r = 0
      while (substr(l, r + 1, 1) == c) r++
      rest = substr(l, r + 1)
      if (!fence && r >= 3 && !(c == "`" && index(rest, "`"))) {
        fence = 1; fch = c; flen = r; infence = 1
      } else if (fence && c == fch && r >= flen && rest ~ /^[ \t]*$/) {
        fence = 0; infence = 1
      }
    }
  }
  !infence && /^## Definition of Done - Gaps Identified[ \t]*$/ { s = 1; sec = 1; next }
  !infence && s && /^## / { s = 0 }
  s { body = body $0 "\n" }
  infence { next }
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
  END {
    if (sec) print "S"
    if (mode == "--body") { printf "%s", body; exit }
    if (seen) print "@"
    print count + 0
  }
' "$DOC_FILE")
case "$OUT" in
  S*) ;;
  *)
    echo "HALT: $DOC_FILE has no current '## Definition of Done - Gaps Identified' section (a '— run N (historical, superseded)' one is not read) — Step 8.4 writes it" >&2
    exit 1
    ;;
esac
# Strip the marker, then its newline if there is one: `$(…)` strips every trailing newline, so an
# empty section leaves "S" alone and a one-pattern `${OUT#S$'\n'}` matches nothing (QA-222-13).
if [ "$MODE" = "--body" ]; then
  BODY=${OUT#S}
  BODY=${BODY#$'\n'}
  case "$BODY" in
    *[![:space:]]*) ;;
    *)
      echo "HALT: '## Definition of Done - Gaps Identified' in $DOC_FILE is empty — Step 8.4 writes the gap report there" >&2
      exit 1
      ;;
  esac
  printf '%s\n' "$BODY"
  exit 0
fi
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
