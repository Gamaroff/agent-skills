# Bug Report: Task 170 - DoD lookup reads a co-located bug's DoD as the task's verdict

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Bug ID**: TASK-170-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 1 diff code review, CR-1)
**Date Found**: 2026-10-03

## Description

`reenter-qa-after-finalise.sh` finds the newest DoD file with
`newest_numbered "$DOC_DIR" dod -name '*.dod.*.md'` — a directory-wide pattern. A task or story bug
writes its own `{bug-prefix}.dod.{N}.{name}.md` (finalise § running summary, bug mode), and
`/finalise` itself keys the lookup on the work item's stem for exactly this reason (TASK-125-BUG-8).

## Steps to Reproduce

1. A work-item directory holding `task.42.dod.1.x.md` (`**Final Status:** ❌ GAPS IDENTIFIED`) and
   `task.42.bug.3.dod.2.x.md` (`**Final Status:** ✅ ACCEPTED`), a step-7 halt snapshot, a gate, and a
   code change past the gate's head.
2. `bash shared/resources/reenter-qa-after-finalise.sh docs/tasks/task.42.example`

## Expected Behavior

The task's own DoD (`task.42.dod.1`) is read; the re-entry is accepted.

## Actual Behavior

`reenter-qa: refused (dod-not-gaps) — the newest DoD file '…/task.42.bug.3.dod.2.x.md' does not carry **Final Status:** ❌ GAPS`
(reproduced 2026-10-03 in a throwaway repo).

## Impact

The re-entry is refused and the operator resumes at step 7 — `/finalise` re-runs over a head no gate
has read, the defect task.170 exists to close.

## Recommendation

Key the lookup on the work item's stem as finalise does (`-name "${STEM}.dod.*.md"`, stem from the
document directory's `task.N` / `story.N.M` prefix, excluding `*.bug.*`), and add a suite case with
a higher-numbered co-located bug DoD.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-03

**Root Cause**: the lookup pattern `*.dod.*.md` matched every DoD in the directory, including a co-located bug's.

**Fix Description**: the stem (`task.{id}` / `story.{epic}.{story}`) is taken from the directory name and the lookup is `${STEM}.dod.*.md`, as finalise keys its own; a directory with no such stem is a usage error (exit 2).

**Files Modified**:
- `shared/resources/reenter-qa-after-finalise.sh` — stem-keyed lookup.
- `shared/resources/reenter-qa-after-finalise.test.sh` — a higher-numbered bug DoD ACCEPTED (task GAPS re-enters), a bug DoD GAPS over an accepted task DoD (refused), a `task.420` DoD beside `task.42` (not read), a non-work-item directory (exit 2).

**Testing**: suite 38/38; reverting to the directory-wide pattern turns the three DoD cases red.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-03 | New          | QA         | Found in QA cycle 1            |
| 2026-10-03 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 1        |
| 2026-10-03 | Closed       | QA         | Verified in QA cycle 2         |
