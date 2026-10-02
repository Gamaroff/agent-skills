#!/bin/sh
# context-pressure-statusline.sh — record the status line's context reading, then run the user's
# own status line unchanged (task.157).
#
# Usage (written into settings.json by context-pressure-install.sh, never by hand):
#   sh context-pressure-statusline.sh -- sh -c '<original status line command>'
#   sh context-pressure-statusline.sh                  # no original: record, print nothing
#
# Claude Code gives `context_window.used_percentage` to the status line command and to nothing
# else. This wrapper reads stdin once, hands the same bytes to `context-pressure.mjs record` in the
# background, and execs the original with the same bytes on its stdin — so the original's stdout
# and exit code are this script's own, byte for byte.
#
# The recorder can never break the status line: it runs detached with every stream redirected, its
# failure (no `node`, no engine, unwritable state dir) is discarded, and nothing waits on it.
# `command node`, never bare `node`: a shell-function `node` (nvm) prints its help to stdout.
#
# CONTEXT_PRESSURE_ENGINE overrides the engine path (tests). POSIX sh, no bashisms.

set -u

unset CDPATH
here=$(cd -- "$(dirname -- "$0")" 2>/dev/null && pwd) || here=.
engine=${CONTEXT_PRESSURE_ENGINE:-$here/context-pressure.mjs}

# `$(cat)` strips trailing newlines; the sentinel keeps the input byte-exact.
input=$(cat; printf x)
input=${input%x}

{ printf '%s' "$input" | command node "$engine" record; } </dev/null >/dev/null 2>&1 &

[ "${1:-}" = "--" ] && shift
[ $# -eq 0 ] && exit 0
printf '%s' "$input" | exec "$@"
