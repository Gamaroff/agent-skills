#!/usr/bin/env bash
# on-skill-return.sh — PostToolUse hook for develop-{story,task} pipelines.
#
# Fires after every tool call. When the tool is `Skill` and the skill that just
# returned is one of the pipeline sub-skills, this hook:
#
#   1. Advances the pipeline lock automatically (via advance-pipeline-lock.sh).
#   2. Injects an additionalContext system-reminder containing the next-step
#      banner and the next sub-skill to invoke.
#
# This eliminates the orchestrator-discipline failure mode where the model,
# under context pressure after a 3-deep nested sub-skill return, summarises
# instead of executing the Step Transition Protocol. The lock advance is
# deterministic and the next-step instruction is delivered as a system
# reminder *in the same turn as the sub-skill return* — exactly when the model
# needs it.
#
# Escape valves (the hook ALWAYS exits 0; degraded paths skip injection):
#   • tool_name != "Skill"          → silent noop
#   • no lock file                  → silent noop (no active pipeline)
#   • skill not in pipeline mapping → silent noop
#   • iterative QA loop skills      → silent noop (orchestrator manages loop)
#   • jq missing or malformed input → silent noop (degraded)
#
# Output (only on a real pipeline transition):
#   { "hookSpecificOutput": { "hookEventName": "PostToolUse",
#                             "additionalContext": "<banner + next-skill>" } }
#
# Always exits 0. Never blocks tool execution (PostToolUse cannot anyway).

set -uo pipefail

LOCK=".claude/state/develop-pipeline.lock"

# Resolve the helper script. Hook is installed at one of:
#   .agents/skills/develop-story/scripts/on-skill-return.sh
#   .claude/skills/develop-story/scripts/on-skill-return.sh
# Helper is bundled into the same skill's references/ directory by the bundler.
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$HOOK_DIR")"
HELPER="${SKILL_DIR}/references/advance-pipeline-lock.sh"

emit_noop() { exit 0; }

# Read PostToolUse input from stdin
INPUT="{}"
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null || echo "{}")
fi

command -v jq >/dev/null 2>&1 || emit_noop

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null)
[ "$TOOL_NAME" = "Skill" ] || emit_noop

# Skill tool_input shape: {"skill": "<name>", "args": "..."}
SKILL_NAME=$(echo "$INPUT" | jq -r '.tool_input.skill // ""' 2>/dev/null)
[ -n "$SKILL_NAME" ] || emit_noop

# Strip plugin: prefix if present (e.g. "myplugin:create-pr" → "create-pr")
SKILL_NAME="${SKILL_NAME##*:}"

[ -f "$LOCK" ] || emit_noop

# Pipeline sub-skill mapping. Iterative QA loop skills are intentionally absent
# (the orchestrator manages PASS/CONCERNS/FAIL branching).
case "$SKILL_NAME" in
  create-branch)            NEXT=2; NEXT_NAME="REVIEW";          NEXT_SKILL_STORY="/review-story"; NEXT_SKILL_TASK="/review-task" ;;
  review-story|review-task) NEXT=3; NEXT_NAME="DEVELOP";         NEXT_SKILL_STORY="/develop";      NEXT_SKILL_TASK="/develop" ;;
  develop)                  NEXT=4; NEXT_NAME="CREATE PR";       NEXT_SKILL_STORY="/create-pr";    NEXT_SKILL_TASK="/create-pr" ;;
  create-pr)                NEXT=5; NEXT_NAME="QA REVIEW";       NEXT_SKILL_STORY="/qa-story";     NEXT_SKILL_TASK="/qa-task" ;;
  finalise)                 NEXT=8; NEXT_NAME="COMMIT CHANGES";  NEXT_SKILL_STORY="/commit-changes"; NEXT_SKILL_TASK="/commit-changes" ;;
  commit-changes)
    # Step 8 done — remove lock, no next step
    if [ -x "$HELPER" ]; then
      "$HELPER" --complete >/dev/null 2>&1 || true
    else
      rm -f "$LOCK"
    fi
    emit_noop
    ;;
  *)
    emit_noop
    ;;
esac

CURRENT=$(jq -r '.current_step // 0' "$LOCK" 2>/dev/null)

# Only advance if the returning skill matches the expected step transition
# (i.e. current_step + 1 == NEXT). Otherwise it's a stray skill call, not a
# pipeline step return.
if [ "$NEXT" -ne "$((CURRENT + 1))" ] 2>/dev/null; then
  emit_noop
fi

PIPELINE_SKILL=$(jq -r '.skill // "develop-story"' "$LOCK" 2>/dev/null)
if [ "$PIPELINE_SKILL" = "develop-task" ]; then
  NEXT_SKILL="$NEXT_SKILL_TASK"
  BANNER_PREFIX="DEVELOP-TASK"
else
  NEXT_SKILL="$NEXT_SKILL_STORY"
  BANNER_PREFIX="DEVELOP-STORY"
fi

REPORT=$(jq -r '.report_path // .report // "<implementation report>"' "$LOCK" 2>/dev/null)

# Advance the lock. Helper is idempotent + safe; falls back to inline jq if
# helper is missing (shouldn't happen post-bundle).
if [ -x "$HELPER" ]; then
  "$HELPER" "$NEXT" >/dev/null 2>&1 || true
else
  jq --argjson n "$NEXT" '.current_step = $n' "$LOCK" > "$LOCK.tmp" 2>/dev/null \
    && mv "$LOCK.tmp" "$LOCK" || rm -f "$LOCK.tmp"
fi

CONTEXT=$(cat <<EOF
🔁 ${BANNER_PREFIX} pipeline auto-advanced to step ${NEXT}/8 — ${NEXT_NAME}.

Lock already advanced (no Bash needed). FIRST action this turn:
  1. Edit Pipeline Progress in \`${REPORT}\` — mark Step ${CURRENT} as ✅ Done.
  2. Output banner (literal):
     ═══ ${BANNER_PREFIX} PIPELINE: STEP ${NEXT}/8 — ${NEXT_NAME} ═══
  3. Invoke ${NEXT_SKILL} via the Skill tool.

NO prose first. NO acknowledgement of this message. NO summary of the previous step.
EOF
)

jq -n --arg ctx "$CONTEXT" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
exit 0
