#!/usr/bin/env bash
# newest-numbered.sh — the ONE definition of "the newest artefact of a numbered series".
#
# Source it from a fenced block by the path the skill states, relative to the
# skill's base directory — exactly as `source references/resolve-platform.sh ||
# exit 1` is sourced today. There is no second contract and no $SKILL_DIR:
#
#   source references/newest-numbered.sh || exit 1
#   DOD_PATH=$(newest_numbered "<dir>" dod -name "${STEM}.dod.*.md")
#   IMPLEMENTATION_REPORT=$(newest_numbered "<dir>" implementation -name "a.*" -o -name "b.*")
#
# By NUMBER, never `ls | sort | tail -1`: a path sort puts `gate.9` after `gate.19`
# and picked the stale one on any item with ten or more (TASK-125-BUG-21; BUG-14
# for reports). Quoted `find -name`, never a bare glob: an unmatched glob aborts
# the whole command under zsh (obs #144). Prints NOTHING when the series is empty;
# the caller decides whether empty is a HALT. Was defined in finalise 6b and
# inlined in 7.6a/7.6b because fenced blocks share no shell function (obs #146,
# task.138) — three copies of one helper drift; this file is the one.
newest_numbered() {   # newest_numbered <dir> <kind: dod|gate|qa|review|implementation> <-name pattern>…
  local dir="${1}" kind="${2}"; shift 2
  find "${dir}" -maxdepth 1 \( "$@" \) 2>/dev/null \
    | sed -E "s/^(.*\.${kind}\.)([0-9]+)(\..*)$/\2 \1\2\3/" | sort -n | tail -1 | cut -d' ' -f2-
}
