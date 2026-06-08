#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/advance-pipeline-lock.sh. Regenerate via `npm run bundle`.
# advance-pipeline-lock.sh — single-source lock advancer for develop-{story,task} pipelines.
#
# Replaces the inline jq snippet that was duplicated across SKILL.md, on-stop.sh,
# step-N reference docs, and per-step orchestrator instructions. Centralising the
# advance logic enables:
#   • Sub-skill self-advance — each sub-skill calls this on successful completion
#   • Stop hook (on-stop.sh) — fallback advance instruction in block reason
#   • Orchestrator manual advance — same command, no jq one-liner to typo
#
# All paths share the same idempotency + safety semantics.
#
# Usage:
#   advance-pipeline-lock.sh <next_step_number>     # advance to specific step (1..8)
#   advance-pipeline-lock.sh --complete             # remove lock (Step 8 done)
#   advance-pipeline-lock.sh --skill <skill-name>   # advance based on sub-skill that just returned
#
# Behaviour:
#   • No lock file  → exit 0, silent noop (no active pipeline)
#   • jq missing    → exit 0, warn to stderr (degraded mode, same as on-stop.sh)
#   • next <= current → exit 0, idempotent noop (already advanced)
#   • next > current  → atomic write via tmpfile + mv, print confirmation to stdout
#
# Skill→next-step mapping (--skill mode). Only unambiguous transitions advance;
# qa-story/qa-fix are noops because Steps 5–6 form an iterative loop the
# orchestrator must manage explicitly.
#
#   create-branch   → 2   (Step 1 done)
#   review-story    → 3   (Step 2 done)
#   review-task     → 3
#   develop         → 4   (Step 3 done)
#   create-pr       → 5   (Step 4 done)
#   qa-story        → noop (loop)
#   qa-task         → noop (loop)
#   qa-fix          → noop (loop)
#   finalise        → 8   (Step 7 done)
#   commit-changes  → remove lock ONLY when current_step >= 8 (terminal commit);
#                     nested invocations (create-pr Step 4, qa-fix Steps 5–6) preserve the lock
#
# Always exits 0 on safe paths. Non-zero only on argument error or jq failure.

set -uo pipefail

LOCK="${PIPELINE_LOCK:-.claude/state/develop-pipeline.lock}"

usage() {
  cat <<USAGE >&2
Usage:
  $0 <next_step_number>     # 1..8
  $0 --complete             # remove lock (pipeline finished)
  $0 --skill <skill-name>   # advance based on returning sub-skill name
USAGE
  exit 1
}

[ $# -ge 1 ] || usage

[ -f "$LOCK" ] || exit 0

if ! command -v jq >/dev/null 2>&1; then
  echo "advance-pipeline-lock: jq not installed; cannot advance lock" >&2
  exit 0
fi

NEXT=""
case "$1" in
  --complete)
    rm -f "$LOCK"
    echo "advance-pipeline-lock: pipeline complete, lock removed"
    exit 0
    ;;
  --skill)
    [ $# -ge 2 ] || usage
    SKILL_NAME="$2"
    case "$SKILL_NAME" in
      create-branch)              NEXT=2 ;;
      review-story|review-task)   NEXT=3 ;;
      develop)                    NEXT=4 ;;
      create-pr)                  NEXT=5 ;;
      qa-story|qa-task|qa-fix)    exit 0 ;;  # iterative loop, orchestrator manages
      finalise)                   NEXT=8 ;;
      commit-changes)
        # commit-changes is the ONLY pipeline sub-skill invoked at more than one step:
        #   - Step 4 (create-pr commits code before opening the PR)
        #   - Steps 5–6 (each qa-fix cycle commits fixes)
        #   - Step 8 (terminal commit)
        # Only the Step 8 invocation means "pipeline complete". For the nested
        # invocations the lock MUST be preserved so the PreCompact/Stop hooks keep
        # working through the back half of the run.
        CUR=$(jq -r '.current_step // 0' "$LOCK" 2>/dev/null)
        case "$CUR" in ''|null) CUR=0 ;; esac
        if [ "$CUR" -ge 8 ] 2>/dev/null; then
          rm -f "$LOCK"
          echo "advance-pipeline-lock: pipeline complete (commit-changes at step $CUR), lock removed"
        else
          echo "advance-pipeline-lock: commit-changes nested at step $CUR — lock preserved" >&2
        fi
        exit 0
        ;;
      *)
        # Unknown skill = not a pipeline sub-skill = silent noop
        exit 0
        ;;
    esac
    ;;
  --help|-h)
    usage
    ;;
  *)
    NEXT="$1"
    ;;
esac

# Validate NEXT is an integer 1..8
case "$NEXT" in
  1|2|3|4|5|6|7|8) ;;
  *)
    echo "advance-pipeline-lock: invalid next step '$NEXT' (expected 1..8)" >&2
    exit 1
    ;;
esac

CURRENT=$(jq -r '.current_step // 0' "$LOCK" 2>/dev/null)
if [ -z "$CURRENT" ] || [ "$CURRENT" = "null" ]; then
  CURRENT=0
fi

# Idempotent: already at or past the target step
if [ "$NEXT" -le "$CURRENT" ] 2>/dev/null; then
  exit 0
fi

if ! jq --argjson n "$NEXT" '.current_step = $n' "$LOCK" > "$LOCK.tmp"; then
  rm -f "$LOCK.tmp"
  echo "advance-pipeline-lock: jq write failed" >&2
  exit 1
fi
mv "$LOCK.tmp" "$LOCK"
echo "advance-pipeline-lock: step $CURRENT → $NEXT"
exit 0
