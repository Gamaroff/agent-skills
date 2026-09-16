#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/develop-pipeline-install-hooks.sh. Regenerate via `npm run bundle`.
# install-hooks.sh — Register PreCompact + Stop hooks in the
# project's `.claude/settings.json` for the /develop-story and /develop-task
# pipelines.
#
# Idempotent: re-running adds nothing if both hooks are already present.
# Preserves all existing settings.json content (other hooks, permissions, env).
#
# Dedupes by hook IDENTITY, not by command string (task.120). The identity of a
# hook is `scripts/<hook>.sh` — the same script whether it is reached
# bare-relative or via "${CLAUDE_PROJECT_DIR}/", through .claude/skills or
# .agents/skills (symlinks in this repo, a copy in a consumer), and under any of
# the three develop-* skills that ship it (byte-identical wrappers). Every
# spelling is one hook, and the host runs all of them in parallel: on task.110 a
# settings file carried the PreCompact hook under two spellings, both fired, and
# every pause side-effect was produced twice. Before adding an entry the
# installer removes every OTHER spelling of the same identity, so a settings
# file that already carries two converges on the one the resolver prefers.
#
# Auto-detects the install path in this order:
#   1. .agents/skills/develop-story/scripts/   (setup-consumer.sh — most common)
#   2. .agents/skills/develop-task/scripts/    (only develop-task installed)
#   3. .claude/skills/develop-story/scripts/   (dev symlink / monorepo)
#   4. .claude/skills/develop-task/scripts/    (dev symlink / monorepo)
#
# Both hook scripts (`on-precompact.sh`, `on-stop.sh`) are byte-identical across
# the two skills (the lock file's `skill` field branches behaviour at runtime),
# so registering one set covers both pipelines.
#
# Migration: also de-registers the obsolete `PostToolUse`/`on-skill-return.sh`
# hook from older installs. That hook fired at skill-LOAD (not skill-completion,
# which has no Claude Code hook event), so it advanced the lock before a sub-skill
# did any work. Lock advancement now relies on sub-skill self-advance + the Stop
# hook backstop.
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
  ".agents/skills/develop-bug/scripts"
  ".claude/skills/develop-story/scripts"
  ".claude/skills/develop-task/scripts"
  ".claude/skills/develop-bug/scripts"
)

BASE=""
for c in "${CANDIDATES[@]}"; do
  if [ -f "$c/on-stop.sh" ] && [ -f "$c/on-precompact.sh" ]; then
    BASE="$c"
    break
  fi
done

if [ -z "$BASE" ]; then
  cat >&2 <<EOF
Error: Could not find develop-story, develop-task, or develop-bug hook scripts.

Searched:
  .agents/skills/develop-story/scripts/
  .agents/skills/develop-task/scripts/
  .agents/skills/develop-bug/scripts/
  .claude/skills/develop-story/scripts/
  .claude/skills/develop-task/scripts/
  .claude/skills/develop-bug/scripts/

Install skills first (full wizard — sets up skills, config, hooks, registries):
  bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh)

Then re-run this script.
EOF
  exit 1
fi

# ${CLAUDE_PROJECT_DIR} is kept literal here (escaped) so Claude Code expands it
# at hook-fire time, resolving to the project root regardless of the shell's cwd.
PRECOMPACT_CMD="bash \"\${CLAUDE_PROJECT_DIR}/${BASE}/on-precompact.sh\""
STOP_CMD="bash \"\${CLAUDE_PROJECT_DIR}/${BASE}/on-stop.sh\""

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

# --- patch helpers -----------------------------------------------------------

# hook_identity CMD — the part of a hook command that names OUR script, or the
# command unchanged when it is not ours. One anchored match, not independent
# strips: `bash `, the optional quoted "${CLAUDE_PROJECT_DIR}/", the optional
# .claude/skills/ or .agents/skills/ root, then a REQUIRED develop-(story|task|bug)/
# segment (the three ship byte-identical hook scripts), then the scripts/<hook>.sh
# tail. A MATCH is returned in its own namespace — `develop-pipeline-hook:scripts/<hook>.sh`
# — and anything else is returned verbatim, so the two can never be equal: a
# consumer's own `bash scripts/on-stop.sh` (task.120 bug.4) or even a bare
# `scripts/on-stop.sh` with no interpreter (bug.6) stays a different hook. The
# prefix carries a colon, which a hook command never begins with. Add a spelling
# here only with a fixture that carries it (develop-pipeline-install-hooks.test.sh).
hook_identity() {
  local id
  id=$(printf '%s' "$1" | sed -nE 's#^(bash +)?("?\$\{CLAUDE_PROJECT_DIR\}/)?(\.(claude|agents)/skills/)?develop-(story|task|bug)/(scripts/[^"[:space:]]+)"?$#\6#p')
  if [ -n "$id" ]; then printf 'develop-pipeline-hook:%s' "$id"; else printf '%s' "$1"; fi
}

# Adds a hook entry for `event` running `cmd` unless an existing entry already
# runs the same hook IDENTITY (any spelling). Idempotent. Run heal_hook first so
# the entry that satisfies this check is the canonical spelling, not a stray.
#
# Under --dry-run heal_hook writes nothing, so the file this reads still carries
# the spellings heal_hook just said it "would remove". Those must not count as
# "already registered" — a dry run that prints "removing X" and then "already
# registered (X)" contradicts itself and hides the add a real run performs
# (task.120 CR-1). Only an entry spelled exactly $cmd satisfies the check in
# dry-run mode; in a real run heal_hook has already removed every other spelling,
# so the two modes report the same outcome.
patch_hook() {
  local event="$1"
  local cmd="$2"

  local id existing
  id=$(hook_identity "$cmd")
  while IFS= read -r existing; do
    [ -n "$existing" ] || continue
    if $DRY_RUN && [ "$existing" != "$cmd" ]; then
      continue
    fi
    if [ "$(hook_identity "$existing")" = "$id" ]; then
      echo "  ✓ ${event}: already registered (${existing})"
      return 0
    fi
  done < <(jq -r --arg event "$event" '.hooks[$event][]?.hooks[]?.command // empty' "$SETTINGS_FILE")

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

# Removes every `hooks[]` ELEMENT under `event` whose `command` matches `pattern`
# (a jq regex); a matcher group is dropped only when its hooks[] becomes empty,
# and the event key only when no group remains. Idempotent — does nothing when
# no matching element exists. Used to heal older installs that registered the
# obsolete on-skill-return.sh PostToolUse hook.
#
# A group with no hooks[] key, or an already-empty hooks[], is left exactly as it
# is — there is nothing of ours in it to remove; iterating a null was how the heal
# aborted mid-run (task.120 cycle 3), and pruning on "empty after" rather than
# "emptied by this filter" dropped a consumer's pre-existing empty group whenever
# a sibling matched (cycle 4). An element with no `command` (a prompt-type hook)
# is read as "" so it neither matches nor errors. Element-level, not group-level
# (task.120 CR-2 / bug.3): a hand-edited group
# {matcher, hooks:[<ours>, <the consumer's own hook>]} is one group with two
# hooks, and removing the GROUP deleted the consumer's hook along with ours —
# silently, on every re-run. The strip list promises a consumer's unrelated hook
# is never touched; that has to hold inside a shared group too.
unpatch_hook() {
  local event="$1"
  local pattern="$2"

  local present
  present=$(jq --arg event "$event" --arg pat "$pattern" \
    '[.hooks[$event][]?.hooks[]? | select((.command // "") | test($pat))] | length' \
    "$SETTINGS_FILE" 2>/dev/null || echo 0)

  if [ "${present:-0}" = "0" ]; then
    return 0
  fi

  echo "  - ${event}: removing obsolete hook (${pattern})"

  local tmp
  tmp=$(mktemp)
  jq --arg event "$event" --arg pat "$pattern" \
    '(.hooks[$event]) |= map(
        if .hooks == null then .
        else (.hooks | length) as $before
             | .hooks |= map(select((.command // "") | test($pat) | not))
             | select($before == 0 or (.hooks | length) > 0)
        end)
     | if (.hooks[$event] | length) == 0 then del(.hooks[$event]) else . end' \
    "$SETTINGS_FILE" > "$tmp" || { rm -f "$tmp"; echo "Error: jq failed while editing ${SETTINGS_FILE} — file left unchanged." >&2; exit 1; }

  if $DRY_RUN; then
    echo "    (dry-run diff:)"
    diff -u "$SETTINGS_FILE" "$tmp" | sed 's/^/    /' || true
    rm -f "$tmp"
  else
    mv "$tmp" "$SETTINGS_FILE"
  fi
}

# Removes every `hooks[]` ELEMENT under `event` whose `command` exactly equals
# `cmd` (no regex, so no escaping needed for literal path strings); a group is
# dropped only when its hooks[] becomes empty. Idempotent. Same element-level
# rule as unpatch_hook, for the same reason (task.120 CR-2 / bug.3). The
# optional third argument labels the removal; heal_hook is its one caller.
unpatch_hook_exact() {
  local event="$1"
  local cmd="$2"
  local label="${3:-removing legacy pre-CLAUDE_PROJECT_DIR hook}"

  local present
  present=$(jq --arg event "$event" --arg cmd "$cmd" \
    '[.hooks[$event][]?.hooks[]? | select(.command == $cmd)] | length' \
    "$SETTINGS_FILE" 2>/dev/null || echo 0)

  if [ "${present:-0}" = "0" ]; then
    return 0
  fi

  echo "  - ${event}: ${label} (${cmd})"

  local tmp
  tmp=$(mktemp)
  jq --arg event "$event" --arg cmd "$cmd" \
    '(.hooks[$event]) |= map(
        if .hooks == null then .
        else (.hooks | length) as $before
             | .hooks |= map(select(.command != $cmd))
             | select($before == 0 or (.hooks | length) > 0)
        end)
     | if (.hooks[$event] | length) == 0 then del(.hooks[$event]) else . end' \
    "$SETTINGS_FILE" > "$tmp" || { rm -f "$tmp"; echo "Error: jq failed while editing ${SETTINGS_FILE} — file left unchanged." >&2; exit 1; }

  if $DRY_RUN; then
    echo "    (dry-run diff:)"
    diff -u "$SETTINGS_FILE" "$tmp" | sed 's/^/    /' || true
    rm -f "$tmp"
  else
    mv "$tmp" "$SETTINGS_FILE"
  fi
}

# heal_hook EVENT CMD — remove every entry under `event` whose command is the
# same hook as `cmd` (identity equal) but not spelled exactly `cmd`. No prefix
# case, no regex, no escaping: the bare-relative legacy form, the
# "${CLAUDE_PROJECT_DIR}"-quoted form under either root — each is one more
# spelling of the identity, and each converges on the spelling the resolver
# chose. Idempotent: a file that carries only `cmd` is untouched.
heal_hook() {
  local event="$1"
  local cmd="$2"
  local id existing
  id=$(hook_identity "$cmd")
  while IFS= read -r existing; do
    [ -n "$existing" ] || continue
    [ "$existing" = "$cmd" ] && continue
    [ "$(hook_identity "$existing")" = "$id" ] || continue
    unpatch_hook_exact "$event" "$existing" "removing duplicate spelling"
  done < <(jq -r --arg event "$event" '.hooks[$event][]?.hooks[]?.command // empty' "$SETTINGS_FILE")
}

# --- run ---------------------------------------------------------------------

echo "Installing develop-pipeline hooks"
echo "  Settings file: ${SETTINGS_FILE}"
echo "  Hook base:     ${BASE}"
$DRY_RUN && echo "  Mode:          DRY RUN (no writes)"
echo ""

# Heal, then add. heal_hook removes every other spelling of each hook — the
# legacy bare-relative form (pre-CLAUDE_PROJECT_DIR fix), the quoted form under
# the other root, both at once — so re-running this installer converges a
# settings file on ONE entry per event instead of adding a second that fires
# alongside the first. Under --dry-run each removal prints its diff and writes
# nothing; patch_hook then ignores the spellings heal_hook would have removed,
# so the dry run reports the same "removing X / adding canonical" sequence a
# real run performs (the add's diff is shown against the unhealed file).
heal_hook  "PreCompact"  "$PRECOMPACT_CMD"
patch_hook "PreCompact"  "$PRECOMPACT_CMD"
heal_hook  "Stop"        "$STOP_CMD"
patch_hook "Stop"        "$STOP_CMD"

# Migration: strip the obsolete PostToolUse/on-skill-return.sh hook from older installs.
unpatch_hook "PostToolUse" "on-skill-return\\.sh"

echo ""
if $DRY_RUN; then
  echo "Dry run complete. Re-run without --dry-run to apply."
else
  echo "✅ Done. Both hooks are now registered."
  echo "   • PreCompact:  graceful pause on context compaction"
  echo "   • Stop:        forced continuation when pipeline tries to stop mid-run"
  echo ""
  echo "   (Any obsolete PostToolUse/on-skill-return.sh hook from older installs is removed,"
  echo "    and any duplicate spelling of the same hook is healed to one entry per event.)"
  echo "   Re-running this script is safe — it skips entries that already exist."
fi
