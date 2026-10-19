---
type: bug
status: ready-for-qa
severity: medium
priority: P2
updated: 2026-10-19
---

# Bug Report: Task 192 - SKILL.md read-back sections omit the verdict check and the lock retry

**Task**: [task.192](./task.192.read-back-checks-this-cycles-verdict.md)
**Bug ID**: TASK-192-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, from code review CR-1)
**Date Found**: 2026-10-19

## Description

`qa-read-back.js` now HALTs when this cycle's verdict is missing from the document, and retries a
`git add` that fails on a held `.git/index.lock`. The two places an agent reads what the read-back
checks were not updated: `skills/qa-task/SKILL.md` Step 12b (line 1606) and
`skills/qa-story/SKILL.md` Review Completion 3e (line 2144) still say it "checks four things" and
that "a `git add` that fails halts".

## Steps to Reproduce

`grep -n "checks four things" skills/qa-task/SKILL.md skills/qa-story/SKILL.md` — two hits; neither
list mentions `**Gate Decision**`, the QA Change Log row or `index.lock`.

## Expected Behavior

Each list names the verdict check with its remedy and states the lock retry.

## Actual Behavior

Four checks listed; a verdict HALT has no documented meaning or remedy beside the block that runs it.

## Impact

An agent meeting the new HALT has only the printed problem to go on; the skill text contradicts the
engine on item 2.

## Recommendation

Add item 5 (verdict: the QA section's `**Gate Decision**` and the newest `qa-task`/`qa-story` row
name this cycle's gate token; remedy: re-render the section from the gate and append the row) and
amend item 2 (a held `index.lock` is retried at 200/400/800 ms, once per run) in both files.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: the task's Files Summary listed the engine, its tests and the bundled copies, but
not the two SKILL.md sections that restate what the engine checks, so the behaviour change had no
doc sweep. Population: `checks four things` and `that fails halts` each hit exactly
`skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: both lists now read "checks five things"; item 2 states the `index.lock`
retry (200/400/800 ms, once per run, `stageAttempts`); a new item 5 states the verdict check, the
rows it ignores, what else halts and the remedy.

**Files Modified**:

- `skills/qa-task/SKILL.md` — Step 12b
- `skills/qa-story/SKILL.md` — Review Completion 3e

**Testing**: `npm run validate -- skills/qa-task/` and `-- skills/qa-story/` pass;
`tests/qa-read-back-block.test.js` (lifts both blocks verbatim) passes.

**Verification Steps for QA**: `grep -n "checks five things" skills/qa-*/SKILL.md` returns two
hits, and each list carries item 5.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-19 | New | qa-task | Raised by task.192.qa.1.read-back-checks-this-cycles-verdict.md |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Both SKILL.md read-back lists updated |
