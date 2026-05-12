#!/usr/bin/env bash
# on-stop.sh — Stop hook for /develop-task and /develop-story pipelines.
#
# Fires when the assistant attempts to stop. If a pipeline lock is active and
# the current step has not yet reached 8, returns a `decision: "block"` JSON
# that forces the orchestrator to continue with the Step Transition Protocol
# for the next step.
#
# This is the structural fix for the failure mode where a sub-skill returns
# control with a "complete" message and the orchestrator yields to the user
# under context pressure (instead of executing Bash → Edit → banner → invoke).
#
# Loop protection: Claude Code passes `stop_hook_active: true` in the hook
# input when this hook has already fired and blocked once for the current
# stop attempt. Honour that flag — otherwise the agent will be stuck in a
# blocking loop.
#
# Escape valves (the hook will ALLOW stop when any of these are true):
#   • no lock file present (no active pipeline)
#   • `current_step >= 8` (pipeline finishing on Step 8)
#   • `current_step < 1` (lock malformed)
#   • `stop_hook_active: true` in input (Claude Code's anti-loop signal)
#   • jq is missing (degraded mode)
#
# The orchestrator's terminal-HALT protocol removes the lock file before
# stopping, so legitimate halts pass this hook naturally.
#
# Always exits 0. Failures degrade to allowing stop.

set -uo pipefail

LOCK=".claude/state/develop-pipeline.lock"

emit_allow() {
  # Empty stdout = allow stop. Standard hook noop.
  exit 0
}

# Read hook input from stdin (may be empty in tests / interactive shells)
INPUT="{}"
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null || echo "{}")
fi

# jq is required for safe parsing
if ! command -v jq >/dev/null 2>&1; then
  emit_allow
fi

# Loop protection: never block twice in a row for the same stop attempt
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null)
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  emit_allow
fi

# No lock = no active pipeline = allow stop
[ -f "$LOCK" ] || emit_allow

CURRENT_STEP=$(jq -r '.current_step // 0' "$LOCK" 2>/dev/null)
if [ -z "$CURRENT_STEP" ] || [ "$CURRENT_STEP" = "null" ]; then
  emit_allow
fi

# Pipeline finished or malformed → allow stop
if [ "$CURRENT_STEP" -ge 8 ] 2>/dev/null; then
  emit_allow
fi
if [ "$CURRENT_STEP" -lt 1 ] 2>/dev/null; then
  emit_allow
fi

SKILL=$(jq -r '.skill // "develop-story"' "$LOCK")
REPORT=$(jq -r '.report_path // .report // "<implementation report>"' "$LOCK")
NEXT=$((CURRENT_STEP + 1))

case "$NEXT" in
  2) NEXT_NAME="REVIEW";          NEXT_SKILL_STORY="/review-story";  NEXT_SKILL_TASK="/review-task" ;;
  3) NEXT_NAME="DEVELOP";         NEXT_SKILL_STORY="/develop";       NEXT_SKILL_TASK="/develop" ;;
  4) NEXT_NAME="CREATE PR";       NEXT_SKILL_STORY="/create-pr";     NEXT_SKILL_TASK="/create-pr" ;;
  5) NEXT_NAME="QA REVIEW";       NEXT_SKILL_STORY="/qa-story";      NEXT_SKILL_TASK="/qa-task" ;;
  6) NEXT_NAME="QA FIX (if needed)"; NEXT_SKILL_STORY="/qa-fix";     NEXT_SKILL_TASK="/qa-fix" ;;
  7) NEXT_NAME="FINALISE";        NEXT_SKILL_STORY="/finalise";      NEXT_SKILL_TASK="/finalise" ;;
  8) NEXT_NAME="COMMIT CHANGES";  NEXT_SKILL_STORY="/commit-changes"; NEXT_SKILL_TASK="/commit-changes" ;;
  *) emit_allow ;;
esac

if [ "$SKILL" = "develop-task" ]; then
  NEXT_SKILL="$NEXT_SKILL_TASK"
  BANNER_PREFIX="DEVELOP-TASK"
else
  NEXT_SKILL="$NEXT_SKILL_STORY"
  BANNER_PREFIX="DEVELOP-STORY"
fi

REASON=$(cat <<EOF
🔁 PIPELINE-CONTINUE-REQUIRED — DO NOT STOP

The \`/${SKILL}\` pipeline is active at Step ${CURRENT_STEP}/8. Step ${CURRENT_STEP} just completed but Steps ${NEXT}–8 MUST still run. The orchestrator is hands-free through Step 8.

**Required next actions (same turn, in this order, no prose between tool calls):**

1. **Bash** — advance lock to step ${NEXT} (this is the binding signal that the next step has started):
\`\`\`
jq --argjson n ${NEXT} '.current_step = \$n' .claude/state/develop-pipeline.lock > .claude/state/develop-pipeline.lock.tmp && mv .claude/state/develop-pipeline.lock.tmp .claude/state/develop-pipeline.lock
\`\`\`
2. **Edit** — mark Step ${CURRENT_STEP} as \`✅ Done\` in the Pipeline Progress table of \`${REPORT}\`.
3. **Output banner** (literal text, no prose around it):
\`\`\`
═══ ${BANNER_PREFIX} PIPELINE: STEP ${NEXT}/8 — ${NEXT_NAME} ═══
\`\`\`
4. **Invoke**: \`${NEXT_SKILL}\` via the Skill tool with the appropriate arguments (story/task path).

**If you genuinely cannot continue** (failed sub-skill, missing dependency, autonomous-defaults miss requiring user input): apply the terminal HALT protocol from SKILL.md — commit the implementation report via \`/commit-changes\`, snapshot the lock to \`.claude/state/develop-pipeline.last-halt.json\`, remove \`.claude/state/develop-pipeline.lock\`, then surface the user-facing halt banner. Removing the lock satisfies this hook on the next stop attempt.

Do NOT emit a terminal "complete" message and stop. Do NOT print "Returning to pipeline orchestrator". Issue the Bash lock-update call FIRST, before any prose.
EOF
)

jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
exit 0
