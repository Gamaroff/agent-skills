#!/usr/bin/env bash
# fill-verification-complete.sh — the ONE fill of a bug DoD's `## Verification Complete` block.
#
#   bash .agents/skills/finalise/references/fill-verification-complete.sh <DOD_PATH> <accepted|gaps>
#
# `assets/bug-dod-template.md` already ends with the block and its
# `**Final Status:** {…}` placeholder, so the block is FILLED in place, never
# appended: a verbatim append wrote a second heading and a second status line
# (task.125 5c CR-2, obs #146). Called from finalise 7.1 with `accepted` and from
# 8.1 with `gaps` — two inline copies with the verdict hard-coded is how the GAPS
# path came to write ACCEPTED or a doubled heading (obs #148, task.152).
#
# Idempotent: a second run with the same verdict matches no placeholder and
# changes nothing. A file that already reads the OTHER verdict is a HALT — a
# decided file is not re-decided; a re-run writes dod.{N+1} (finalise Step 0).
# Every assertion runs on the WRITTEN file: the template alone proving the
# once-only rule is what let the doubled file through.
DOD_PATH="${1:-}"
VERDICT="${2:-}"
case "$DOD_PATH" in '' | *'{'*)
  echo "HALT: bug mode — DOD_PATH must be bound (got '$DOD_PATH')"
  exit 1
  ;;
esac
case "$VERDICT" in
  accepted)
    LINE='✅ ACCEPTED'
    OTHER='❌ GAPS IDENTIFIED - NOT ACCEPTED'
    ;;
  gaps)
    LINE='❌ GAPS IDENTIFIED - NOT ACCEPTED'
    OTHER='✅ ACCEPTED'
    ;;
  *)
    echo "HALT: bug mode — VERDICT must be accepted or gaps (got '$VERDICT')"
    exit 1
    ;;
esac
[ -r "$DOD_PATH" ] || {
  echo "HALT: bug mode — $DOD_PATH is not readable; Step 0 creates it from the template"
  exit 1
}
if grep -qxF "**Final Status:** $OTHER" "$DOD_PATH"; then
  echo "HALT: bug mode — $DOD_PATH already reads $OTHER; a decided file is not re-decided (a re-run writes dod.{N+1})"
  exit 1
fi
# Neither LINE contains `/` or `&`, so both are safe as sed replacement text.
TMP=$(mktemp) && sed -E \
  -e "s/^\*\*Final Status:\*\* \{.*\}$/**Final Status:** $LINE/" \
  -e "s/^\*\*Completion Time:\*\* \{YYYY-MM-DDTHH:MMZ\}$/**Completion Time:** $(date -u +%Y-%m-%dT%H:%MZ)/" \
  "$DOD_PATH" >"$TMP" && mv "$TMP" "$DOD_PATH" || {
  echo "HALT: bug mode — could not rewrite $DOD_PATH"
  exit 1
}
# Exactly one heading and one status line, on the WRITTEN file.
[ "$(grep -c '^## Verification Complete$' "$DOD_PATH")" = 1 ] && [ "$(grep -c '^\*\*Final Status:\*\*' "$DOD_PATH")" = 1 ] || {
  echo "HALT: bug mode — $DOD_PATH must carry exactly one ## Verification Complete heading and one **Final Status:** line"
  exit 1
}
grep -qxF "**Final Status:** $LINE" "$DOD_PATH" || {
  echo "HALT: bug mode — the Final Status placeholder in $DOD_PATH was not filled (is the template's line intact?)"
  exit 1
}
