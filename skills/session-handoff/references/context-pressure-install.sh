#!/bin/sh
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/context-pressure-install.sh. Regenerate via `npm run bundle`.
# context-pressure-install.sh — install the context-pressure trigger into user-level Claude Code
# settings, so it works in every repository (task.157).
#
# Usage:
#   sh context-pressure-install.sh [--settings <file>] [--dry-run] [--uninstall]
#
#   --settings <file>  settings file to edit (default: ~/.claude/settings.json)
#   --dry-run          print the diff, write nothing
#   --uninstall        remove the hook and unwrap the status line to the exact original
#
# Install adds a UserPromptSubmit hook (`command node '<dir>/context-pressure.mjs' check`,
# timeout 5s) and wraps the existing `statusLine.command` as
# `sh '<dir>/context-pressure-statusline.sh' -- sh -c '<original>'`. Only `statusLine.command`
# changes; sibling keys (padding, refreshInterval) are kept. With no status line at all, it adds
# the recorder alone, which prints nothing. Both edits dedupe by identity (the engine or wrapper
# filename under any spelling), so a second run changes nothing and never wraps twice.
#
# <dir> is the directory this script runs from, resolved to an absolute path. Installing from a
# repository checkout ties the hook to that checkout; install from the installed skill
# (~/.agents/skills/session-handoff/references/) for a path that survives the checkout.
#
# Writes are atomic (temp file in the same directory, then mv) with a `.bak` of the previous file.
# A settings file that is not a JSON object is refused with exit 1 and left untouched. The JSON
# edits live in context-pressure.mjs (`settings` subcommand), so there is no jq dependency.
#
# Exit: 0 ok (changed or already in the requested state), 1 refused or failed, 2 usage.

set -u

usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; }

settings="$HOME/.claude/settings.json"
mode=install
dry=0
while [ $# -gt 0 ]; do
  case "$1" in
    --settings) [ $# -ge 2 ] || { usage >&2; exit 2; }; settings=$2; shift 2 ;;
    --dry-run) dry=1; shift ;;
    --uninstall) mode=uninstall; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "context-pressure-install: unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

unset CDPATH
here=$(cd -- "$(dirname -- "$0")" && pwd) || { echo "context-pressure-install: cannot resolve own directory" >&2; exit 1; }
engine="$here/context-pressure.mjs"
wrapper="$here/context-pressure-statusline.sh"
[ -f "$engine" ] || { echo "context-pressure-install: engine not found beside the installer: $engine" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "context-pressure-install: node is required" >&2; exit 1; }

# A symlinked settings file (dotfiles) is edited at its target, so the link survives the mv.
if [ -L "$settings" ]; then
  settings=$(command node -e 'console.log(require("fs").realpathSync(process.argv[1]))' "$settings") \
    || { echo "context-pressure-install: cannot resolve symlink $settings" >&2; exit 1; }
fi

if [ ! -f "$settings" ]; then
  if [ "$mode" = uninstall ]; then
    echo "context-pressure-install: $settings does not exist — nothing to uninstall"
    exit 0
  fi
  if [ "$dry" = 1 ]; then
    src=$(mktemp "${TMPDIR:-/tmp}/cp-settings.XXXXXX") || exit 1
  else
    mkdir -p "$(dirname -- "$settings")" || exit 1
    src=$(mktemp "$(dirname -- "$settings")/.cp-settings.XXXXXX") || exit 1
  fi
  printf '{}\n' > "$src"
  created=1
else
  src=$settings
  created=0
fi

dir=$(dirname -- "$settings")
[ "$dry" = 1 ] && dir=${TMPDIR:-/tmp}
[ -d "$dir" ] || mkdir -p "$dir" || exit 1
out=$(mktemp "$dir/.cp-settings-new.XXXXXX") || exit 1
cleanup() { rm -f "$out"; [ "$created" = 1 ] && rm -f "$src"; return 0; }

command node "$engine" settings --mode "$mode" --file "$src" --out "$out" \
  --engine "$engine" --wrapper "$wrapper"
rc=$?

case $rc in
  0) ;;
  3) cleanup; echo "context-pressure-install: $settings unchanged"; exit 0 ;;
  *) cleanup; exit 1 ;;
esac

if [ "$dry" = 1 ]; then
  diff -u "$src" "$out"
  cleanup
  echo "context-pressure-install: dry run — nothing written"
  exit 0
fi

if [ "$created" = 0 ]; then
  cp -p "$settings" "$settings.bak" || { cleanup; exit 1; }
  # Keep the file's own mode: mktemp makes $out 0600, and moving it in would silently change a
  # 0644 settings file (QA cycle 1 CR-6). A `cp -p` of the original carries the mode; the new
  # content is then written into that copy, which still lands in place with one mv.
  keep=$(mktemp "$dir/.cp-settings-keep.XXXXXX") || { cleanup; exit 1; }
  { cp -p "$settings" "$keep" && cat "$out" > "$keep"; } || { rm -f "$keep"; cleanup; exit 1; }
  mv -f "$keep" "$out" || { rm -f "$keep"; cleanup; exit 1; }
fi
mv -f "$out" "$settings" || { cleanup; exit 1; }
[ "$created" = 1 ] && rm -f "$src"
echo "context-pressure-install: $mode written to $settings"
[ "$created" = 0 ] && echo "  previous version saved as $settings.bak"
exit 0
