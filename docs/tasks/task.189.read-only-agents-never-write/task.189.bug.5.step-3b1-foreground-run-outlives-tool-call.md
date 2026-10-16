---
type: bug
id: task.189.bug.5
status: ready-for-qa
severity: medium
priority: P2
created: 2026-10-16
---

# Bug Report: Task 189 - Step 3b.1's foreground run can outlive the tool call that runs it

**Task**: [task.189.read-only-agents-never-write.md](./task.189.read-only-agents-never-write.md)
**Bug ID**: TASK-189-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 3, finding QA3-1, from reviewer CR-1)
**Date Found**: 2026-10-16

## Description

`skills/finalise/SKILL.md` Step 3b.1 item 2 ("**Run it** — one call, from the repository root") runs the whole probe plan as one foreground shell call. The agent host stops a foreground call at its tool timeout (120 s default, 600 s maximum), while `security-probe-plan.mjs` bounds each engine run at 20 minutes and runs entries one after another, so a plan with several shell-form or fence-form controls can outlive the call. The redirect to `.claude/state/probe-plan-result.json` is then left empty or partial, and the step has no instruction for that.

## Expected Behavior

Step 3b.1 runs the plan backgrounded with its result written to a file read on a later turn — the pattern `/finalise` already uses for its other long runs — and treats a missing or partial result file as "still running" or as a refusal, never as an empty plan.

## Actual Behavior

The block is a foreground call, and a killed call leaves `probe-plan-result.json` absent or empty with no stated meaning.

## Impact

A long plan produces no probe result; the orchestrator improvises, or reads an empty file as nothing executed.

## Recommendation

Run the Step 3b.1 block backgrounded (`run_in_background`, marked with `set-waiting-on.sh`), end it with an exit-code line, and state that a missing or non-JSON result file is not a result. Have the runner write its JSON atomically (temp + rename) so a partial file never reads as one.

## Developer Fix Cycle

### Iteration 1

#### Investigation

**Date**: 2026-10-16
**Developer**: qa-fix (develop-task Step 5b, cycle 3)

**Root Cause**: Step 3b.1 was written as a foreground call with a plain `> result.json` redirect, so a killed call left an empty or partial result and nothing said what that meant.

#### Fix Implementation

**Fix Description**: Step 3b.1 item 2 runs the block backgrounded (`run_in_background`, wait marked with `set-waiting-on.sh`). The block removes any stale result first, writes to `result.json.tmp`, and moves it into place only when `jq -e .` parses it; otherwise it prints `probe-plan: no result — the run did not complete`, which the prose says is never an empty plan. Same cycle: the runner refuses inline cases with a repeated id (CR3-2); the prompt names all six owned flags literally and a test checks every listing site against the exported `OWNED_FLAGS` (CR3-3); `runPlan` defaults its engine like the CLI.

**Files Modified**: `skills/finalise/SKILL.md`, `shared/resources/security-probe-plan.mjs`, `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/tests/read-only-agent-writes.test.mjs`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`

**Testing**: `read-only-agent-writes.test.mjs` 17/17 — new: a runner killed mid-write leaves no result (stale removed, partial not moved); duplicate inline ids refused; owned-flag sites checked against `OWNED_FLAGS`. Four mutation proofs (E1–E4), each red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-16 | New | qa-task | Found by task.189.qa.3.read-only-agents-never-write.md |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA cycle 3 |
