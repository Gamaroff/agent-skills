# Bug Report: Task 125 - finalise 7.7 derives `DOD_PATH` and `FINAL_GATE` with directory-wide globs, so a story/task bug co-located with its parent publishes the PARENT's DoD path and gate verdict as its own

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-8
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-2 refute review CR-1 (verified: `ls docs/tasks/task.67.*/*.dod.*.md | sort | tail -1` sorts `task.67.dod.1` after `task.67.bug.3.dod.1`; the parent's `task.67.gate.2` is the only gate in the directory)
**File**: `skills/finalise/SKILL.md:1460`

## Description
Step 7.7 (canonical PR comment) runs `DOD_PATH=$(ls {document-directory}/*.dod.*.md | sort | tail -1)` and `FINAL_GATE=$(ls {document-directory}/*.gate.*.yml | sort | tail -1 …)`. The bug-mode `pr-comment` marker says `DOD_PATH` is the bug DoD and `FINAL_GATE` is the verify-loop verdict, but changes neither derivation. For a task bug (`docs/tasks/task.67.x/task.67.bug.3.*`) or a story bug, the parent's `task.67.dod.1.*.md` sorts after `task.67.bug.3.dod.1.*.md` and the parent's gate is the only `*.gate.*.yml` — so the PR comment for the bug cites the parent's DoD file and the parent's gate verdict. 6b already keys on `${STEM}`; 7.7 does not.

## Steps to Reproduce
1. A task directory holding `task.67.dod.1.x.md`, `task.67.gate.2.x.yml` and `task.67.bug.3.dod.1.y.md`.
2. Run the 7.7 derivations as written.
3. `DOD_PATH` = the parent's DoD; `FINAL_GATE` = the parent's gate.

## Expected Behavior
In bug mode both derivations key on the bug stem: `${STEM}.dod.*.md`, and `FINAL_GATE` is the verify loop's verdict (there is no bug gate).

## Actual Behavior
Directory-wide globs; the parent's artefacts win the sort.

## Impact
The canonical PR comment — the one reader-facing summary — reports another work item's evidence for two of the three bug modes.

## Recommendation
Add the bug-mode substitution to 7.7 explicitly: `DOD_PATH=$(ls {document-directory}/${STEM}.dod.*.md | sort | tail -1)` and `FINAL_GATE` = the verify-loop verdict (`PASS` on cycle N) with the gate glob skipped; add an executed test over a fixture directory that holds both a parent's and a bug's artefacts.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 2)

**Root Cause**: Step 7.7's `DOD_PATH`/`FINAL_GATE` lines were inherited unchanged from the story/task path, which assumes the document owns its directory; a co-located bug does not, and `sort | tail -1` prefers the parent's `.dod.` over the bug's `.bug.N.dod.`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: 6b now keys `DOD_PATH` on `${STEM}.dod.*.md` (STEM is the bug prefix in bug mode, bound at 6a) and, under `DOC_KIND=bug`, sets `FINAL_GATE` from `VERIFY_VERDICT` — the verify loop's last `**Verdict**`, bound in Step 2 — instead of globbing gates; the task/story branch keys its gate glob on the stem too. The `pr-comment` marker and the skip-table row now describe what the block does.

**Files Modified**:
- `skills/finalise/SKILL.md` — 6b derivation, `pr-comment` marker, skip table row, 6a STEM comment
- `evals/shared/tests/finalise-bug-mode.test.mjs` — the 6b lines are EXECUTED (bash + zsh) over a fixture holding `task.67.dod.1`, `task.67.gate.2` and `task.67.bug.3.dod.1`: bug mode → the bug's DoD and `PASS`; task mode → the parent's DoD and `FAIL`

**Testing**: Executed test green in both shells; mutation: `DOD_PATH` reverted to the directory glob → 2 red; `DOC_KIND=bug` branch disabled → 2 red. ci:fast 3693/3693.

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**QA Engineer**: QA Engineer
**Verified in**: QA cycle 3 (Re-Review Context table of `task.125.qa.3.develop-bug-finalise-mode-and-issue-create.md`)

**Verification Result**: ✅ Fixed
**Verification Notes**: 6b keyed on ${STEM}; executed fixture with a parent DoD beside the bug's.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 2 (refute pass) |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
| 2026-09-21 | Closed | QA Engineer | Fix verified in QA cycle 3 — 6b keyed on ${STEM}; executed fixture with a parent DoD besi… |
