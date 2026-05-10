---
name: develop-task
description: Automates the full end-to-end task development lifecycle: create-branch → review-task → develop → create-pr → qa-task → qa-fix (iterative, up to 5 cycles) → finalise → commit-changes. Adapted from develop-story for standalone technical tasks (refactoring, infra, cleanup) in docs/development/tasks/. Features: Explore subagent for task resolution and pre-develop codebase mapping; context hygiene between steps; lite mode for low-risk tasks; resume with per-step artifact verification; optional task-register integration; `--base` branch pre-supplied to create-pr. Records all decisions in a co-located implementation report. Invoke with `/develop-task [task-file-path]` or "develop and QA this task end to end".
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
---

# Develop Task — Automated Lifecycle Orchestrator

This skill orchestrates the complete task development lifecycle, calling each skill in sequence and maintaining an implementation report that records every significant decision and issue encountered along the way.

## Setup — Graceful Pause Hook (one-time, per project)

Register the bundled `PreCompact` hook in the project's `.claude/settings.json` to enable graceful pause on context compaction. See `shared/resources/develop-pipeline-pause.md` for the full setup instructions, lock-file contract, and pause/resume semantics.

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash .agents/skills/develop-task/scripts/on-precompact.sh"
          }
        ]
      }
    ]
  }
}
```

Setup is optional — without the hook, pipelines still resume correctly via post-compaction recovery, just without the PR comment and pause-state report entry. The hook noops when no pipeline lock is active — zero overhead outside pipeline runs.

## When to Use This Skill

- User says `/develop-task <path>` or passes a task file path
- User wants to run a technical task through the full automated pipeline without hand-holding each step
- User wants an audit trail of decisions made during task implementation

---

## Phase 0: Resolve & Prepare

See `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` for the full resolve-and-prepare protocol: file/issue resolution (0a), pipeline state check (0b), upfront context reading including status handling and lite-mode detection (0c), tracker signal/board update (0c-reg), upfront Q&A (0d), implementation report creation with templates (0e), and pre-flight summary (0f).

> Phase 0 parallel dispatch (resolver + tracker poller + lite-mode detector) is defined in the shared resource above — do not duplicate the dispatch logic here. Modifications belong in `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`.

---

## Phase 1: Pipeline Execution

### Context Compression Recovery (CRITICAL — read this first)

If context was compressed while this pipeline was running (i.e., the conversation was summarized and you are now resuming), follow this sequence exactly — do not improvise:

**Step 0 — Re-read the full skill file before anything else:**
```bash
# The skill instructions in the system reminder are TRUNCATED after compression.
# Improvising steps from memory produces wrong artifacts and misses required invocations.
# Always read the full skill first:
cat .agents/skills/develop-task/SKILL.md
```
Output: "⚠️ Context recovery — re-reading full skill file before resuming."

**Step 0a — Dispatch stale-context detector (Phase 0a):**

Dispatch a read-only Explore subagent using `shared/resources/pipeline-resume-detector-prompt.md`. The subagent reads `.claude/state/develop-pipeline.lock`, lists `.summaries/step-*.json` in the task directory, and diffs artifact mtimes. It returns `recommended_step`, `deltas_since_pause`, and `blocking_issues`.

Surface the detector output to the user and wait for confirmation. If `blocking_issues` is non-empty: **HALT** — require manual resolution before resuming. Use `recommended_step` to narrow Step 1 verification scope.

See `shared/resources/develop-pipeline-resume-contract.md` — Phase 0a for the full dispatch, output validation, and blocking-issues protocol.

**Step 1 — Recover pipeline state from the implementation report:**
```bash
ls {task-directory}/task.{id}.implementation.*.md 2>/dev/null | sort | tail -1
```

1. Read the implementation report. Find the last ✅ step in the Pipeline Progress table.
2. **Verify each ✅ step's artifact exists up to `recommended_step - 1`** (see `shared/resources/develop-pipeline-resume-contract.md` — Phase 0b for the full contract). Steps at or after `recommended_step` are treated as ⏳ Pending. If Phase 0a failed validation, fall back to verifying all steps using `current_step` from the lock as the upper bound.
3. Output: "⚠️ Context recovery — last verified step: Step {recommended_step - 1}. Resuming from recommended step {recommended_step}."
4. Continue from `recommended_step` — do NOT re-run steps already verified, do NOT skip any pending steps.

**This recovery is mandatory even if the user did not explicitly re-invoke `/develop-task`.** If you are in a conversation where `develop-task` was previously running and context was then compressed, you are still the develop-task orchestrator and must complete all remaining steps. A context summary saying "next step: create-pr" does NOT mean the pipeline ends after create-pr — it means Step 4 is next, and Steps 5–8 still follow.

### Graceful Pause on Imminent Compaction (CRITICAL — read this second)

This complements the post-compaction recovery above. **Pre**-compaction graceful pause requires the `PreCompact` hook to be installed (see Setup section at the top of this file). When the hook fires:

1. The hook itself appends a "Pipeline Paused" entry to the implementation report, commits, pushes, and posts a PR/issue comment — all best-effort, all done before compaction proceeds.
2. The hook emits `🛑 PIPELINE-PAUSE-SIGNAL` as `additionalContext` to you, which appears as a `<system-reminder>` in your next turn.
3. The hook removes the lock file.

**When you observe `🛑 PIPELINE-PAUSE-SIGNAL` in a system reminder:**

1. **Stop everything.** Do not invoke any sub-skill. Do not edit the implementation report (the hook already did). Do not run any tools beyond what's needed for the user-facing summary.
2. **Output the pause banner**:
   ```
   ═══ DEVELOP-TASK PIPELINE: PAUSED — CONTEXT COMPACTION IMMINENT ═══
   ```
3. **Output the user-facing summary** using the template provided in the signal's `additionalContext`. If the signal indicates `tracker=jira`, add a single-line note that the Jira issue was *not* commented on (Jira pause is silent by design).
4. **HALT.** Do not proceed to any further step. The lock file has been removed by the hook; on next user invocation of `/develop-task <path>`, Phase 0b will detect the existing run, read the report, and resume cleanly.

**No additional report edits, no additional commits, no additional comments** — the hook already did all of that, and you have very little budget left before compaction proceeds. Spending it on duplicate work risks losing the user-facing summary entirely.

For the full lock-file format, hook contract, and half-done step recovery semantics, see `shared/resources/develop-pipeline-pause.md`.

### Context Management Rule (CRITICAL)

After EVERY step completes, before moving to the next step:
1. Retain only: step outcome (pass/fail), key decisions made, file paths of artifacts produced
2. Release all intermediate file contents from active consideration — do not re-read files that were already processed unless specifically needed
3. Summarize the step result in ≤5 bullet points in the implementation report, then treat step as closed

When a step dispatches subagents, persist their summaries per the convention in `shared/resources/subagent-summary-artifact.md` and update the implementation report's `Subagent summary ref` column in the same write. The on-disk JSON lets you safely release the subagent's verbose output from active context — resume reads the summary from disk if needed.

This prevents context accumulation across the 8-step pipeline.

**Never stop between steps.** This pipeline runs hands-free from Step 1 to Step 8. Never output a "done" or "complete" message and stop unless a step explicitly results in HALT or the pipeline has reached Step 8. Completing Step 4 (create-pr) is NOT a terminal state — Step 5 must follow immediately.

**Step banners (required).** Before starting each step, output a visible banner:
```
═══ DEVELOP-TASK PIPELINE: STEP {N}/8 — {STEP-NAME} ═══
```
This creates persistent checkpoints that survive context compression and make the pipeline position unambiguous.

**Lock file `current_step` update (required, Steps 2–8).** Immediately after the banner, update the pipeline lock file so the PreCompact hook knows where the pipeline is:
```bash
jq --argjson n {N} '.current_step = $n' .claude/state/develop-pipeline.lock \
  > .claude/state/develop-pipeline.lock.tmp && mv .claude/state/develop-pipeline.lock.tmp .claude/state/develop-pipeline.lock
```
Skip this for Step 1 (the lock is created at the *end* of Step 1, after the feature branch exists — see Step 1 below).

After each step: update the Pipeline Progress table (✅ Done / ❌ Failed / ⚠️ Needs Attention / ⏸️ Paused — see Graceful Pause section) and log any decisions or issues before moving on.

### Step 1: Create Branch

See `shared/resources/develop-pipeline-step-1-create-branch.md` for the full Step 1 protocol: lock collision check, pre-flight board/Jira verification, implementation report stash/restore, `/create-branch` invocation, post-branch steps, and pipeline lock file creation.

### Step 2: Review Task

See `shared/resources/develop-pipeline-step-2-review.md` for the full Step 2 protocol: gate check (skip conditions), `/review-task` invocation, output format autonomous decision, outcome detection, and blocking/non-blocking findings handling.

### Step 3: Develop

See `shared/resources/develop-pipeline-step-3-develop-loop.md` for the full Step 3 protocol: pre-develop codebase mapping (Explore subagent), plan file discovery, internal gate handling (draft/planned, high-risk, alignment), bounded develop loop with stall detection, Remaining Work Status banner, halt protocol, and **test-failure triage** (capture test output to `.claude/state/test-output-${ITER}-*.log`, dispatch Explore with `shared/resources/test-failure-triage-prompt.md`, main consumes summary only).

### Step 4: Create PR

See `shared/resources/develop-pipeline-step-4-create-pr.md` for the full Step 4 protocol: `/create-pr` invocation with `--base` and tracker-conditional `--issue`, implementation report exclusion, post-PR steps, Jira tracker update (PR-opened comment + In Review transition), failure handling, and the mandatory pipeline continuation banner.

### Step 5–6: QA Task / Fix Loop

See `shared/resources/develop-pipeline-step-5-6-qa-loop.md` for the full Steps 5–6 protocol: QA cycle counter setup, gate file location, QA skill invocation (with lite mode directive), PASS/CONCERNS/FAIL branching, no-code-change HALT, qa-fix invocation, commit/push per cycle, escalation entry, and loop limit HALT message.

### Step 7: Finalise

See `shared/resources/develop-pipeline-step-7-finalise.md` for the full Step 7 protocol: `/finalise` invocation, completion detection, DoD gaps halt (with commit + push), DoD-body-to-PR comment, tracker issue update (GitHub close + board Done, Jira Done transition), DoD summary file location, Step 7 Completion Checklist, and Pipeline Progress update.

**Lite mode applies to Step 5 only.** Step 7 (finalise + PR DoD comment + issue close + board Done) runs in full in every mode. Do NOT inline `/finalise` by writing the DoD file directly — invoke the skill. See the Step 7 Completion Checklist before marking the row ✅.

### Step 8: Commit Changes

See `shared/resources/develop-pipeline-step-8-commit.md` for the full Step 8 protocol: final implementation report update (Finished timestamp, Final Status, QA Iterations, Completion Summary), `/commit-changes` invocation, final push, Pipeline Progress update, and pipeline lock file removal.

---


## Phase 2: Completion

Output the final status:

```
✅ Task Development Complete

Task:                  {task filename}
Branch:                {branch name}
PR:                    {PR URL}
QA Cycles:             {N}
Implementation Report: {report file path}

All pipeline steps completed successfully. The task is completed and all changes committed.
```

For any other halt:

```
⚠️ Task Development Paused — Human Input Required

Task:                  {task filename}
Paused at:             Step {N} — {step name}
Reason:                {concise reason}
Implementation Report: {report file path}

The implementation report has a full account of what was completed and what needs attention.
```

---

## Autonomous Decision Defaults

Every default applied must be recorded in the Decisions Log.

See `shared/resources/develop-pipeline-autonomous-defaults.md` for the full shared autonomous-mode default-behavior table (covers all rows common to both `develop-story` and `develop-task`).

### Skill-specific defaults (develop-task only)

| Situation | Default |
|-----------|---------|
| review-task Step 8.5 (implement fixes?) | Auto-answer "Yes, apply all critical + important fixes" — pipeline needs the task fully corrected before Step 3 runs `/develop` |
| review-task Step 9 (update status?) when status needs updating | Auto-answer "Yes, fixes complete" — pipeline needs `Ready for Development` before Step 3 |
| review-task Step 9 (update status?) when outcome is NEEDS REVISION or REQUIRES REWORK | HALT — task is not ready; surface review findings to user before proceeding |

If a situation arises that is not in this table or the shared defaults table and the stakes are non-trivial, **HALT and ask the user**. Log the question and the user's answer in the Decisions Log.

---

## Error Recovery Principles

- **Never silently continue past a failed step.** Every failure is logged and surfaced to the user.
- **Always use `/commit-changes` to commit** — never raw `git commit`. This ensures consistent commit quality, conventional messages, and proper staging.
- **Commit the report before any halt.** Invoke `/commit-changes` for the report before surfacing any HALT so the audit trail is in git even when the pipeline doesn't complete.
- **Push after every commit during the QA loop.** The PR must stay current with the local branch (`git push origin HEAD`).
- **The implementation report is the primary recovery tool.** Always include its path in halt messages.
- **Remove the lock file before every terminal HALT.** After committing the report (per the rule above), run `rm -f .claude/state/develop-pipeline.lock` so a future PreCompact firing in this same session won't try to commit again. The lock is recreated automatically when the user re-invokes `/develop-task` and the resume flow re-enters Step 1 (or the resume verification confirms it should remain past Step 1). The graceful-pause hook also removes the lock itself if it runs — this rule covers the non-hook halt paths.
- If a sub-skill cannot be found, log the error and tell the user to verify the skill is installed in `.agents/skills/`.

---

## File References

- Tasks: `docs/development/tasks/task.{id}.{name}/`
- Task file: `task.{id}.{name}.md`
- Implementation report: `task.{id}.implementation.{N}.{descriptive-name}.md`
- Review report: `task.{id}.review.{YYYY-MM-DD}.md` (generated by Step 2 `/review-task`)
- QA gate: `task.{id}.gate.{N}.{name}.yml` (co-located in task directory; `docs/qa/gates/tasks/` path is legacy and removed)
- QA report: `task.{id}.qa.{N}.{name}.md` (co-located in task directory)
- DoD summary: `task.{id}.dod.{N}.{name}.md`

## Related Skills

- `/create-branch` — Step 1
- `/review-task` — Step 2
- `/develop` — Step 3
- `/create-pr` — Step 4
- `/qa-task` — Step 5
- `/qa-fix` — Step 6
- `/finalise` — Step 7
- `/commit-changes` — Step 8
