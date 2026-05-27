#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/develop-pipeline-install-hooks.sh. Regenerate via `npm run bundle`.
# install-hooks.sh — Register PreCompact + Stop + PostToolUse hooks in the
# project's `.claude/settings.json` for the /develop-story and /develop-task
# pipelines.
#
# Idempotent: re-running adds nothing if both hooks are already present.
# Preserves all existing settings.json content (other hooks, permissions, env).
#
# Auto-detects the install path in this order:
#   1. .agents/skills/develop-story/scripts/   (setup-consumer.sh — most common)
#   2. .agents/skills/develop-task/scripts/    (only develop-task installed)
#   3. .claude/skills/develop-story/scripts/   (dev symlink / monorepo)
#   4. .claude/skills/develop-task/scripts/    (dev symlink / monorepo)
#
# All three hook scripts (`on-precompact.sh`, `on-stop.sh`, `on-skill-return.sh`)
# are byte-identical across the two skills (the lock file's `skill` field
# branches behaviour at runtime), so registering one set covers both pipelines.
#
# Usage:
#   bash .agents/skills/develop-story/scripts/install-hooks.sh
#   bash .agents/skills/develop-story/scripts/install-hooks.sh --dry-run
#   bash .agents/skills/develop-story/scripts/install-hooks.sh --settings path/to/settings.json
#
# Requires: jq

set -euo pipefail

SETTINGS_FILE=".claude/settings.json"
DRY_RUN=false

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)   DRY_RUN=true; shift ;;
    --settings)  SETTINGS_FILE="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Run with --help for usage." >&2
      exit 1
      ;;
  esac
done

# --- prerequisites -----------------------------------------------------------

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not on PATH." >&2
  echo "Install: brew install jq  /  apt install jq  /  https://jqlang.github.io/jq/download/" >&2
  exit 1
fi

# --- detect install base -----------------------------------------------------

CANDIDATES=(
  ".agents/skills/develop-story/scripts"
  ".agents/skills/develop-task/scripts"
  ".claude/skills/develop-story/scripts"
  ".claude/skills/develop-task/scripts"
)

BASE=""
for c in "${CANDIDATES[@]}"; do
  if [ -f "$c/on-stop.sh" ] && [ -f "$c/on-precompact.sh" ] && [ -f "$c/on-skill-return.sh" ]; then
    BASE="$c"
    break
  fi
done

if [ -z "$BASE" ]; then
  cat >&2 <<EOF
Error: Could not find develop-story or develop-task hook scripts.

Searched:
  .agents/skills/develop-story/scripts/
  .agents/skills/develop-task/scripts/
  .claude/skills/develop-story/scripts/
  .claude/skills/develop-task/scripts/

Install skills first (full wizard — sets up skills, config, hooks, registries):
  bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh)

Then re-run this script.
EOF
  exit 1
fi

PRECOMPACT_CMD="bash ${BASE}/on-precompact.sh"
STOP_CMD="bash ${BASE}/on-stop.sh"
POSTTOOLUSE_CMD="bash ${BASE}/on-skill-return.sh"

# --- ensure settings file exists and is valid JSON ---------------------------

mkdir -p "$(dirname "$SETTINGS_FILE")"
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "{}" > "$SETTINGS_FILE"
  echo "Created ${SETTINGS_FILE}"
fi

if ! jq -e . "$SETTINGS_FILE" >/dev/null 2>&1; then
  echo "Error: ${SETTINGS_FILE} is not valid JSON. Refusing to patch." >&2
  echo "Fix or back up the file, then re-run." >&2
  exit 1
fi

# --- patch helper ------------------------------------------------------------

# Adds a hook entry for `event` running `cmd` if no existing entry's
# `hooks[].command` already matches `cmd`. Idempotent.
patch_hook() {
  local event="$1"
  local cmd="$2"

  local already
  already=$(jq --arg event "$event" --arg cmd "$cmd" \
    '[.hooks[$event][]?.hooks[]?.command] | index($cmd)' \
    "$SETTINGS_FILE")

  if [ "$already" != "null" ]; then
    echo "  ✓ ${event}: already registered (${cmd})"
    return 0
  fi

  echo "  + ${event}: adding (${cmd})"

  local tmp
  tmp=$(mktemp)
  jq --arg event "$event" --arg cmd "$cmd" \
    '.hooks //= {}
     | .hooks[$event] //= []
     | .hooks[$event] += [{matcher: "*", hooks: [{type: "command", command: $cmd}]}]' \
    "$SETTINGS_FILE" > "$tmp"

  if $DRY_RUN; then
    echo "    (dry-run diff:)"
    diff -u "$SETTINGS_FILE" "$tmp" | sed 's/^/    /' || true
    rm -f "$tmp"
  else
    mv "$tmp" "$SETTINGS_FILE"
  fi
}

# --- run ---------------------------------------------------------------------

echo "Installing develop-pipeline hooks"
echo "  Settings file: ${SETTINGS_FILE}"
echo "  Hook base:     ${BASE}"
$DRY_RUN && echo "  Mode:          DRY RUN (no writes)"
echo ""

patch_hook "PreCompact"  "$PRECOMPACT_CMD"
patch_hook "Stop"        "$STOP_CMD"
patch_hook "PostToolUse" "$POSTTOOLUSE_CMD"

echo ""
if $DRY_RUN; then
  echo "Dry run complete. Re-run without --dry-run to apply."
else
  echo "✅ Done. All three hooks are now registered."
  echo "   • PreCompact:  graceful pause on context compaction"
  echo "   • Stop:        forced continuation when pipeline tries to stop mid-run"
  echo "   • PostToolUse: auto-advance lock + inject next-step banner on Skill return"
  echo ""
  echo "   Re-running this script is safe — it skips entries that already exist."
fi
