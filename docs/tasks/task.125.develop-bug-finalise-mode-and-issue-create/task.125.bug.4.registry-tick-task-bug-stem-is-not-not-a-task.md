# Bug Report: Task 125 - `registry-tick` marker promises `not-a-task` on a bug run, but a header-block task bug (`task.67.bug.3.*.md`, no `type:`) matches the `^task\.(\d+)\.` stem and answers `not-accepted`

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Diff code review CR-4 (verified: registry-tick.js lines 236–262 — an absent `type` passes; the stem regex matches `task.67.bug.3.`)
**File**: `shared/resources/registry-tick.js:237`

## Description
`registry-tick.js` keys on `base.match(/^task\.(\d+)\./)` and lets an absent `type:` through by design. A task bug file `task.67.bug.3.name.md` matches with taskId 67; a header-block bug (the frontmatter-less shape this diff explicitly supports through `bug-doc.js`) has no `type:`, so the guard passes, the engine reads the *bug's* status (`ready-for-qa`/`verified`, never `accepted`) and answers `not-accepted` — whose Step 7.4 table row says "Investigate — step 2 above should have set it", a step bug mode skips.

## Steps to Reproduce
1. `docs/tasks/task.67.x/task.67.bug.3.name.md` with a `**Bug ID**:` header block and no frontmatter.
2. `node registry-tick.js --file <that> --json`.
3. `reason: not-accepted` (not `not-a-task`).

## Expected Behavior
A bug document of any shape answers `not-a-task` and touches no registry.

## Actual Behavior
A header-block task bug is treated as task 67 and reports a status mismatch.

## Impact
`finalise --bug` on a task bug logs a reason the mode's own table calls an investigation item; worst case a `status: accepted` task bug (none exist, but nothing prevents it) ticks task 67's registry row.

## Recommendation
In `registry-tick.js`, treat a stem containing `.bug.<N>.` as `not-a-task` before the id match (one regex), add a test for the header-block task-bug shape, and keep the marker's promise as written.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 1)

**Root Cause**: `registry-tick.js` matched the id on `^task\.(\d+)\.` and let an absent `type:` through by design, so `task.67.bug.3.*.md` in its header-block shape resolved to task 67.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: A `.bug.<N>.` segment in the stem (`/(^|\.)bug\.\d+\./`) now short-circuits the id match to `null` before the kind guard runs, so every bug shape answers `not-a-task` in both the tick and `--annotate` arms.

**Files Modified**:
- `shared/resources/registry-tick.js` — `isBugStem`
- `shared/resources/tests/registry-tick.test.mjs` — header-block task bug (tick + annotate) and a frontmatter task bug reading `status: accepted` with no `type:`
- 3 bundled `references/registry-tick.js` copies

**Testing**: 2 new tests green; mutation: stem rule removed → 2 red (the header-block bug answered `not-accepted`, the accepted one ticked task 68's row).

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**QA Engineer**: QA Engineer
**Verified in**: QA cycle 2 (Re-Review Context table of `task.125.qa.2.develop-bug-finalise-mode-and-issue-create.md`)

**Verification Result**: ✅ Fixed
**Verification Notes**: registry-tick bug-stem rule, registry-tick.test.mjs.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 1 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
| 2026-09-21 | Closed | QA Engineer | Fix verified in QA cycle 2 — registry-tick bug-stem rule, registry-tick.test.mjs |
