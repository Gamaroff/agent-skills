#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/newest-numbered.sh. Regenerate via `npm run bundle`.
# newest-numbered.sh — the ONE definition of "a numbered series": its newest artefact, and the
# number the next one takes.
#
# Source it from a fenced block by the path the skill states, relative to the
# skill's base directory — exactly as `source references/resolve-platform.sh ||
# exit 1` is sourced today. There is no second contract and no $SKILL_DIR:
#
#   source references/newest-numbered.sh || exit 1
#   DOD_PATH=$(newest_numbered "<dir>" dod -name "${STEM}.dod.*.md")
#   IMPLEMENTATION_REPORT=$(newest_numbered "<dir>" implementation -name "a.*" -o -name "b.*")
#   N=$(next_numbered "<dir>" review -name "${STEM}.review.*.md") || exit 1
#
# By NUMBER, never `ls | sort | tail -1`: a path sort puts `gate.9` after `gate.19`
# and picked the stale one on any item with ten or more (TASK-125-BUG-21; BUG-14
# for reports). Quoted `find -name`, never a bare glob: an unmatched glob aborts
# the whole command under zsh (obs #144). Prints NOTHING when the series is empty;
# the caller decides whether empty is a HALT. Was defined in finalise 6b and
# inlined in 7.6a/7.6b because fenced blocks share no shell function (obs #146,
# task.138) — three copies of one helper drift; this file is the one.
#
# Both functions select the same files — depth 1, the `-name` patterns given — and read the same
# `.<kind>.<n>.` segment, with a decimal <n>. One difference, kept on purpose: newest_numbered
# still returns a file whose <kind> segment carries no number (a dated report,
# `task.12.review.2026-05-06.md`) when the series has no numbered member, as its callers expect;
# next_numbered counts only numbered members, because a dated report takes no number.

_numbered_series() {   # _numbered_series <dir> <kind> <-name pattern>… → "<n> <path>" per member
  local dir="${1}" kind="${2}"; shift 2
  find "${dir}" -maxdepth 1 \( "$@" \) 2>/dev/null \
    | sed -nE "s/^(.*\.${kind}\.)([0-9]+)(\..*)$/\2 \1\2\3/p"
}

newest_numbered() {   # newest_numbered <dir> <kind: dod|gate|qa|review|implementation> <-name pattern>…
  local dir="${1}" kind="${2}"; shift 2
  find "${dir}" -maxdepth 1 \( "$@" \) 2>/dev/null \
    | sed -E "s/^(.*\.${kind}\.)([0-9]+)(\..*)$/\2 \1\2\3/" | sort -n | tail -1 | cut -d' ' -f2-
}

# next_numbered <dir> <kind> <-name pattern>… — print the {n} the next artefact of the series takes.
#
# - HIGHEST + 1, NEVER COUNT + 1. A directory holding `.1.` and `.3.` gets 4: count + 1 would be 3
#   and overwrite the existing `.3.` (obs #272). An empty series → 1.
# - Base 10. `.09.` reads as 9 and `.10.` beats `.9.` — a leading zero is not octal (`10#`).
# - No silent wrap. An {n} past 18 significant digits would overflow shell arithmetic and print a
#   wrong number with status 0; it is refused instead (task.185 QA cycle 1, QA-1).
# - Refusals return 2 with `next_numbered: refused (<reason>): <detail>` on stderr and nothing on
#   stdout: `usage` (not a directory, or no kind) | `overflow`. Callers write `|| exit 1`.
# Was skills/review-pr/scripts/next-report-number.sh, for `.pr-review.` only (task.186).
next_numbered() {
  local dir="${1:-}" kind="${2:-}"
  if [ -z "${dir}" ] || [ ! -d "${dir}" ] || [ -z "${kind}" ]; then
    echo "next_numbered: refused (usage): not a directory, or no kind: ${dir:-<empty>} ${kind:-<empty>}" >&2
    return 2
  fi
  shift 2
  local max=0 n sig _path
  while read -r n _path; do
    [ -n "${n}" ] || continue
    sig=${n#"${n%%[!0]*}"}   # strip leading zeros; empty when n is all zeros
    if [ "${#sig}" -gt 18 ]; then
      echo "next_numbered: refused (overflow): {n} in ${_path##*/} has more than 18 significant digits" >&2
      return 2
    fi
    n=$((10#${n}))
    if [ "${n}" -gt "${max}" ]; then max=${n}; fi
  done <<EOF
$(_numbered_series "${dir}" "${kind}" "$@")
EOF
  echo $((max + 1))
}
