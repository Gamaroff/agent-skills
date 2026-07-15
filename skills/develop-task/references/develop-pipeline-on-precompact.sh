#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/develop-pipeline-on-precompact.sh. Regenerate via `npm run bundle`.
# on-precompact.sh — PreCompact hook for /develop-task and /develop-story pipelines.
#
# Runs when Claude Code is about to compact the conversation. If a develop-task
# or develop-story pipeline is active (lock file present), this hook:
#   0. Writes a develop-pipeline.last-halt.json resume snapshot (a lock superset,
#      pause_reason: "precompact") BEFORE any lock removal, so even a hook run killed
#      mid-flow by the harness (SIGTERM/timeout) leaves recoverable resume state for
#      the Phase 0b resume detector
#   1. Appends a "Paused — Context Compaction" entry to the implementation report
#   2. Commits the report and pushes to remote (best-effort)
#   3. Posts a pause comment to the PR (best-effort)
#   4. Posts a pause comment to the GitHub issue (best-effort, GitHub tracker only)
#   5. Removes the lock file
#   6. Emits a PIPELINE-PAUSE-SIGNAL via additionalContext so the agent halts cleanly
#
# Jira trackers are intentionally NOT commented on — pause is silent on Jira side
# by design (no MCP access from a shell hook, and curl-based Jira REST would
# require user-managed credentials).
#
# Always exits 0. Failures are logged to stderr and never block compaction.

set -uo pipefail

# Lock path — env-overridable for test isolation (mirrors advance-pipeline-lock.sh).
LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"
# Resume snapshot, co-located with the lock. Written BEFORE any lock removal so a
# killed/partial hook run always leaves a recoverable artifact (see write_pause_snapshot).
SNAPSHOT="$(dirname "$LOCK")/develop-pipeline.last-halt.json"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

emit_empty() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreCompact","additionalContext":""}}'
  exit 0
}

# write_pause_snapshot — persist a resume snapshot (a superset of the lock) to
# $SNAPSHOT. Tagged pause_reason: "precompact" + paused_at, and aliases the lock's
# current_step to halt_step — the field the Phase 0b resume detector maps to LOCK_STEP.
# This MUST run before the EXIT trap is armed and before any rm of the lock, so every
# exit path — success OR harness-kill (SIGTERM/timeout) — leaves a recoverable artifact.
# Degrades to a verbatim cp when jq is unavailable (current_step is still preserved in
# the copied lock). Guarded with || true: a snapshot failure must never abort the hook
# or block compaction.
write_pause_snapshot() {
  if command -v jq >/dev/null 2>&1; then
    jq --arg ts "$NOW" \
       '. + {paused_at: $ts, pause_reason: "precompact", halt_step: .current_step}' \
       "$LOCK" > "$SNAPSHOT" 2>/dev/null || cp -f "$LOCK" "$SNAPSHOT" 2>/dev/null || true
  else
    cp -f "$LOCK" "$SNAPSHOT" 2>/dev/null || true
  fi
}

# No lock = no active pipeline = noop. Return BEFORE writing a snapshot or arming the
# EXIT trap, so a stray re-fire neither clobbers an existing snapshot nor touches a
# lock that isn't there (idempotence).
if [ ! -f "$LOCK" ]; then
  emit_empty
fi

# Lock confirmed present — write the resume snapshot NOW, before the EXIT trap that
# removes the lock is even armed. This closes the "lock removed, no snapshot" window
# that a mid-run harness kill would otherwise open.
write_pause_snapshot

# Always-run cleanup: ensure lock is removed regardless of which exit path is
# taken (including SIGTERM/timeout from the harness, jq-missing degraded mode,
# or unexpected errors). A leftover lock would block the next pipeline
# invocation with a collision halt — so removing it on any exit is safer than
# leaving it. Safe because write_pause_snapshot already persisted resume state.
# Idempotent — `rm -f` on success path is a noop.
trap 'rm -f "$LOCK"' EXIT

# jq is required for safe parsing — degrade gracefully if missing.
# The EXIT trap will remove the lock; the cp-fallback snapshot above already
# preserved resume state so the next invocation can recover via Phase 0b.
if ! command -v jq >/dev/null 2>&1; then
  echo "on-precompact: jq not found, skipping pause processing (lock removed by EXIT trap; resume snapshot preserved at $SNAPSHOT)" >&2
  emit_empty
fi

SKILL=$(jq -r '.skill // ""' "$LOCK" 2>/dev/null)
REPORT=$(jq -r '.report_path // ""' "$LOCK" 2>/dev/null)
TASK_ID=$(jq -r '.task_or_story_id // ""' "$LOCK" 2>/dev/null)
BRANCH=$(jq -r '.branch // ""' "$LOCK" 2>/dev/null)
PR_URL=$(jq -r '.pr_url // ""' "$LOCK" 2>/dev/null)
TRACKER=$(jq -r '.tracker // ""' "$LOCK" 2>/dev/null)
TRACKER_ISSUE=$(jq -r '.tracker_issue // ""' "$LOCK" 2>/dev/null)
CURRENT_STEP=$(jq -r '.current_step // 0' "$LOCK" 2>/dev/null)
# NOW is set once near the top (used by both write_pause_snapshot and the report entry).

# Sanity: if we don't even know which skill, bail gracefully
if [ -z "$SKILL" ]; then
  echo "on-precompact: lock file missing 'skill' field, skipping" >&2
  rm -f "$LOCK"
  emit_empty
fi

# Append pause entry to report
if [ -n "$REPORT" ] && [ -f "$REPORT" ]; then
  {
    echo ""
    echo "---"
    echo ""
    echo "## Pipeline Paused — $NOW"
    echo ""
    echo "⏸️ **Context compaction imminent.** The \`/${SKILL}\` orchestrator was halted by the PreCompact hook before Claude's context could be summarised."
    echo ""
    echo "**State at pause**:"
    echo ""
    echo "- Skill: \`/${SKILL}\`"
    echo "- Branch: \`${BRANCH}\`"
    echo "- Last step boundary: Step ${CURRENT_STEP}"
    echo "- PR: ${PR_URL:-not yet created}"
    echo "- Tracker: ${TRACKER:-none} ${TRACKER_ISSUE:+#${TRACKER_ISSUE}}"
    echo ""
    echo "**Resume**: re-invoke \`/${SKILL} <path>\` (same path) and choose **Resume from last completed step** when prompted. Phase 0b will read this report, verify completed-step artifacts, and re-run Step ${CURRENT_STEP}."
    echo ""
    echo "**Pipeline Progress** for this step is now \`⏸️ Paused\` — equivalent to \`⏳ Pending\` for resume purposes (the step will re-run from the start)."
    echo ""
  } >> "$REPORT" || echo "on-precompact: failed to append to report" >&2

  # Best-effort commit + push
  git add "$REPORT" 2>/dev/null || true
  git commit -m "docs(${SKILL}): pipeline paused at step ${CURRENT_STEP} — context compaction imminent" >/dev/null 2>&1 || true
  git push origin HEAD >/dev/null 2>&1 || true
fi

# Best-effort PR comment
if [ -n "$PR_URL" ] && command -v gh >/dev/null 2>&1; then
  PR_BODY=$(printf '⏸️ **Pipeline paused — context compaction imminent**\n\nThe `/%s` orchestrator paused at Step %s because Claude'\''s context window approached its limit.\n\n**State saved in**: `%s`\n\n**To resume**: re-invoke `/%s <path>` (same path) and choose **Resume from last completed step** when prompted.' \
    "$SKILL" "$CURRENT_STEP" "$REPORT" "$SKILL")
  gh pr comment "$PR_URL" --body "$PR_BODY" >/dev/null 2>&1 || true
fi

# Best-effort GitHub issue comment (Jira intentionally skipped)
if [ "$TRACKER" = "github" ] && [ -n "$TRACKER_ISSUE" ] && command -v gh >/dev/null 2>&1; then
  ISSUE_BODY=$(printf '⏸️ Pipeline paused at Step %s — context compaction imminent. State saved in `%s`. Resume with `/%s <path>`.' \
    "$CURRENT_STEP" "$REPORT" "$SKILL")
  gh issue comment "$TRACKER_ISSUE" --body "$ISSUE_BODY" >/dev/null 2>&1 || true
fi

# Remove the lock file so a stray re-fire is a noop
rm -f "$LOCK"

# Build the agent signal
SIGNAL=$(cat <<EOF
🛑 PIPELINE-PAUSE-SIGNAL

The \`/${SKILL}\` pipeline was paused at Step ${CURRENT_STEP} due to imminent context compaction.

**Done by the hook (no action needed from you):**
- Implementation report appended with pause entry, committed, and pushed: \`${REPORT}\`
- PR comment posted: ${PR_URL:-(no PR yet)}
- GitHub issue comment posted: ${TRACKER_ISSUE:+#${TRACKER_ISSUE} (${TRACKER})}${TRACKER_ISSUE:-(no tracker issue)}
- Lock file removed

**What you must do now:**
1. STOP all further pipeline work immediately. Do not invoke any more sub-skills, do not update the report, do not run any tools.
2. Output the user-facing pause summary below, then HALT.
3. If \`tracker=jira\` and \`tracker_issue\` is set above, note in the summary that the Jira issue was NOT commented on (pause is silent on Jira side by design).

**User-facing summary template:**

\`\`\`
⏸️ Pipeline Paused — Context Compaction Imminent

Skill:                 /${SKILL}
Paused at:             Step ${CURRENT_STEP}
Branch:                ${BRANCH}
PR:                    ${PR_URL:-(none yet)}
Implementation Report: ${REPORT}

The hook saved state, committed the report, pushed to remote, and posted a PR comment.
Resume with: /${SKILL} <path>   (choose 'Resume from last completed step' when prompted)
\`\`\`
EOF
)

jq -n --arg msg "$SIGNAL" '{hookSpecificOutput: {hookEventName: "PreCompact", additionalContext: $msg}}'

exit 0
