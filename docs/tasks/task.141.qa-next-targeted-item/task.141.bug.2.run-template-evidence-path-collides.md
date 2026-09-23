# Bug Report: Task 141 - The run template still names the colliding evidence path

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Bug ID**: TASK-141-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA (cycle 1, diff code review CR-2, reproduced by reading both files)
**Date Found**: 2026-09-22

## Description

`SKILL.md` Step 3 was changed by this task to read:

> Evidence … goes under `.claude/state/qa-next/<id>/<run-file-basename>/` — the run file's own name
> without `.md`, so a same-day re-run's screenshots do not overwrite the first run's either.

`assets/run.template.md` — the file the agent actually fills in, and a file **this diff touches** to
add the `Run` row — still names the old path on both of its evidence lines:

- line 30: `` **Report:** `{{path under .claude/state/qa-next/<id>/<date>-<env>/ — a copy of uatReportDir}}` ``
- line 41: `` **Evidence:** `{{path under .claude/state/qa-next/<id>/<date>-<env>/}}` ``

## Expected Behavior

One statement of the evidence path. The template's placeholders name the run-file basename, matching
Step 3.

## Actual Behavior

Two statements. `<date>-<env>/` is fixed within a session, so a second run on the same day writes its
screenshots and its copy of `uatReportDir` over the first run's — the precise collision
`--run-path` was added to eliminate, arriving through the template instead of through the filename.

## Impact

The run file is what a reader opens to check a verdict, and it would point at evidence that had been
overwritten by a later run. It defeats the change's own purpose on the re-run path, which is the only
path this task adds.

## Recommendation

Change both placeholders to `.claude/state/qa-next/<id>/<run-file-basename>/`. The template and
Step 3 then state one path — the template being where the agent reads it, and Step 3 being where the
rule is argued.

## Notes

The two files disagreeing is the enumeration class in `docs/reference/anti-patterns.md`: one
behaviour, two authored statements, and the one that drifted is the one nobody executes.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-22

**Root Cause**: the evidence path was stated in two authored places and only one was updated. The
diff touched `run.template.md` to add the `Run` row, so the file was open and the stale lines were
two lines away from the edit — which is the ordinary shape of this failure, not an unusual one.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-22

**Fix Description**: both template placeholders now name `<run-file-basename>`, matching Step 3.

**A prose fix nothing enforces drifts again**, so the agreement is now asserted:
`evals/qa-next/unit/uat-status.test.mjs` extracts every `.claude/state/qa-next/<id>/…/` segment from
both files and requires the union to be exactly `["<run-file-basename>"]`. It carries a non-vacuity
floor — at least one match in `SKILL.md`, at least two in the template — because a matcher that
matched nothing would pass on precisely the defect it was written for.

**Files Modified**:

- `skills/qa-next/assets/run.template.md` — both evidence placeholders
- `evals/qa-next/unit/uat-status.test.mjs` — the agreement test

**Testing**: **Mutation-proved** — restoring `<date>-<env>/` on the template's Report line turns the
new test red.

**Verification Steps for QA**:

1. `grep -n "claude/state/qa-next/<id>" skills/qa-next/SKILL.md skills/qa-next/assets/run.template.md` — every hit reads `<run-file-basename>`.
2. `node --test evals/qa-next/unit/uat-status.test.mjs` — the agreement test passes.

---

## Status History

| Date       | Status       | Changed By | Notes                                         |
| ---------- | ------------ | ---------- | --------------------------------------------- |
| 2026-09-22 | New          | qa-task    | Found in QA cycle 1 (CR-2)                    |
| 2026-09-22 | In Progress  | qa-fix     | Two authored statements, one updated          |
| 2026-09-22 | Ready for QA | qa-fix     | Both placeholders fixed; agreement now tested |
| 2026-09-23 | Closed       | qa-task    | Verified FIXED in QA cycle 2 ([qa.2](./task.141.qa.2.qa-next-targeted-item.md)); closure recorded late, prompted by PR review 1 PC-1 |
