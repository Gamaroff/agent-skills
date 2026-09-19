# Bug Report: Task 124 - The working-tree probe classifies against `${BASE_BRANCH:-develop}`, and nothing ever binds BASE_BRANCH

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-14
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 5 (narrowed), code review finding CR-2 (reviewer confidence medium; raised to high on verification — no binding exists)

## Description
The Phase 0b working-tree probe (`shared/resources/develop-pipeline-resume-contract.md:104`) sets `BASE_REF="origin/${BASE_BRANCH:-develop}"` and classifies every dirty entry against it. No pipeline binds `BASE_BRANCH`: `grep -rn 'BASE_BRANCH=' shared/resources skills/*/SKILL.md skills/*/references` finds nothing; the Q1 base branch exists only as prose (`{Q1 base branch}`, Phase 0d) which a resume skips; the lock carries no base field (`branch, current_step, pr_url, qa_phase, report_path, skill, started_at, task_or_story_directory, task_or_story_id, tracker, tracker_issue`). The probe therefore always classifies against `origin/develop`.

## Steps to Reproduce
1. `grep -rn 'BASE_BRANCH' shared/resources/ skills/*/SKILL.md` → only the probe line reads it; nothing assigns it
2. `jq keys .claude/state/develop-pipeline.lock` → no base field
3. Reasoned case: develop-bug hotfix off `main`; an uncommitted forward-port whose bytes equal `origin/develop`'s copy → class (a) → `git checkout HEAD -- <p>` discards real work; a genuine Phase 0b overlay whose bytes equal `origin/main` (the real base) → class (c) → HALT

## Expected Behavior
The base is derived from recorded state: `gh pr view --json baseRefName` when the lock has `pr_url` (Steps 4+), otherwise a `base_branch` field the lock records at Step 1 from the Q1 answer — never an unbound shell variable with a `develop` default.

## Actual Behavior
Every pipeline probes against `origin/develop`; correct for the common case (feature off develop) and silently wrong for hotfix and epic-integration branches, in the direction that discards a file.

## Impact
The one probe outcome that deletes bytes (`git checkout HEAD --`) keys on a comparison against a branch that may not be the base. Narrow population (hotfix/epic-integration + resume + a dirty file that happens to equal develop), but the failure is data loss, not a HALT.

## Recommendation
Bind `BASE_REF` before the classification: from `gh pr view --json baseRefName -q .baseRefName` when `pr_url` is set (the `VCS=github` case; on Bitbucket read the PR's `destination.branch.name`), else from a `base_branch` lock field written at Step 1; fall back to `develop` only when neither exists, and say so in the probe's log line.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
The probe was written with `BASE_REF="origin/${BASE_BRANCH:-develop}"` on the assumption that the orchestrator binds `BASE_BRANCH` from the Q1 answer; nothing does — the Q1 value exists only as prose in Phase 0d (skipped on resume) and in the report's Pipeline Configuration row, and the lock carries no base field. The `:-develop` default then hid the gap on every feature-off-develop run, which is every run this task was tested on.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
The probe binds the base from recorded state before classifying: `gh pr view --json baseRefName` when the branch has a PR (Steps 4+); else the report's `| Feature branch base | … |` row (Steps 1–3; backtick-tolerant); else `develop` with a stderr line saying so. The Cost sentence names the extra call.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` (probe block + Cost sentence) and bundled copies

**Testing**:
- executed: the binding block extracted from the contract and run under bash and zsh on all three branches — PR present → `origin/develop`; no PR + report row `main` → `origin/main` (also with a backticked value); neither → `origin/develop` + the stderr line
- `npm run ci:fast` 3512 tests, 0 fail; `eval:develop-task` 16/16

**Verification Steps for QA**:
1. `grep -n 'BASE_BRANCH' shared/resources/develop-pipeline-resume-contract.md` → three assignments (gh, sed, default) precede the single read
2. On a branch with a PR: `gh pr view --json baseRefName -q .baseRefName` is what the probe compares against
3. With no PR: a fake report row `| Feature branch base | main |` yields `origin/main`; no row yields the stderr line

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 5 |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |
