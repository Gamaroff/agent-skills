# shellcheck shell=bash
# undefined-command-guard.sh — make a shell test suite fail when it calls a command that does not
# exist. Source it near the top of a suite, before any case runs; call `undefined_commands_check`
# once, beside the suite's summary line.
#
# Why: a call to an undefined command (a helper used above its definition, a typo) prints
# "command not found" and returns 127, and no assertion reads that status. The case is skipped
# silently and the suite still reports 0 failed. That happened while the observation #44 cases were
# added to reenter-qa-after-finalise.test.sh: six of them called a helper defined further down and
# never ran, with the suite green.
#
# How: bash calls `command_not_found_handle` for every command it cannot find. It runs in a subshell,
# so it cannot touch the suite's counters; it appends the name to a file instead, and
# `undefined_commands_check` reads that file at the end. Calls inside `$(...)`, `if` and `||` are
# caught too — those are the ones `set -e` lets through.
#
# Limits, stated so nobody relies on more:
#   • bash 4+ only. macOS /bin/bash 3.2 never calls the hook, so the guard is off there, with no
#     false failures. CI runs bash 5.
#   • It guards the suite's own shell. A script the suite runs (`bash "$SCRIPT"`) does not inherit
#     the function, so a missing command inside the script under test is that script's own error.
#   • A suite that aborts before the check leaves its record file in $TMPDIR. The check removes it
#     on every normal finish; the suite's own EXIT trap is left alone.
#
# Usage:
#   . "$(dirname "$0")/undefined-command-guard.sh"          # a suite beside this file
#   ...
#   undefined_commands_check || FAIL=$((FAIL + 1))
#   echo "Results: $PASS passed, $FAIL failed"
#
# undefined_commands_check prints a FAIL line naming each missing command and returns 1 when any
# call missed, 0 otherwise. Suite: undefined-command-guard.test.sh.

UNDEFINED_COMMANDS_FILE=$(mktemp "${TMPDIR:-/tmp}/undefined-commands.XXXXXX") || {
  echo "undefined-command-guard: mktemp failed — the guard cannot record misses" >&2
  return 1 2>/dev/null || exit 1
}

command_not_found_handle() {
  printf '%s\n' "$1" >> "$UNDEFINED_COMMANDS_FILE"
  echo "  FAIL  undefined command: $1" >&2
  return 127
}

undefined_commands_check() {
  local calls names
  calls=$(grep -c . "$UNDEFINED_COMMANDS_FILE" 2>/dev/null) || calls=0
  names=$(sort -u "$UNDEFINED_COMMANDS_FILE" 2>/dev/null | tr '\n' ' ')
  rm -f "$UNDEFINED_COMMANDS_FILE"
  [ "$calls" -gt 0 ] || return 0
  echo "  FAIL  every command this suite calls is defined"
  echo "        $calls call(s) to an undefined command: $names"
  return 1
}
