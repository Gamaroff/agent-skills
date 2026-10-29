# Bug Report: Task 237 - The new `CARRY_FIXED` sentence is not pinned by any test

**Task**: [Link](./task.237.carry-doc-only-findings-on-approve.md)
**Bug ID**: TASK-237-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-10-27

## Description

Success criterion 2 says the carry prose keys `CARRY_FIXED` "on what the classify block cleared"
and cites `pr-review-loop-parity.test.mjs` as its test. That test holds only the negative half. Its
`doesNotMatch` (`/`APPROVE`[^.]*leave\s+`CARRY_FIXED`\s+empty/`, line 803) forbids one old
wording. Nothing asserts that the new sentence ("When the classify block cleared no path, leave
`CARRY_FIXED` empty") exists. The CHANGELOG entry says the test "pins both carry-prose sentences",
which overstates it. Code review CR-1 and CR-2 (QA cycle 1) raised this, and the mutations below
confirm it.

## Steps to Reproduce

Each mutation was applied to `shared/resources/develop-pipeline-step-5-6-qa-loop.md` from a `cp`
snapshot, then `command node --test evals/shared/tests/pr-review-loop-parity.test.mjs`, then the
snapshot was restored:

1. Delete the sentence "When the classify block cleared no path, leave `CARRY_FIXED` empty: the
   block then only asserts the report is staged." → **0 failures**.
2. Replace it with "On `APPROVE` (as task.179 did), leave `CARRY_FIXED` empty". This is an
   APPROVE-keyed sentence with a period between `APPROVE` and "leave" → **0 failures**.

## Expected Behavior

Removing the classify-keyed sentence, or putting an APPROVE-keyed one back in any wording, turns
the carry-prose test red with a named message.

## Actual Behavior

Both mutations leave the suite green.

## Impact

The sentence task.179's run obeyed is the one this task changed. It can be deleted, or reverted
with a period in the wrong place, and no test fails. The CHANGELOG claims stronger coverage than
the test gives.

## Recommendation

Add a positive assertion that the Carry section contains the classify-keyed `CARRY_FIXED`
sentence, for example `/cleared no path, leave\s+`CARRY_FIXED`\s+empty/`. Widen the negative
pattern too, so a period inside the sentence (`task.179`) cannot hide an APPROVE key, for example
by scanning the `CARRY_FIXED` sentence's own text rather than `[^.]*`. Then mutation-prove both
directions.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Root Cause**: the carry-prose test had only a `doesNotMatch`. A negative assertion cannot tell
"the sentence is right" from "the sentence is gone". Its `[^.]*` also ended the scan at the first
period, including the one in `task.179`.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- Added `assert.match(carry, /When the classify block cleared no path, leave\s+`CARRY_FIXED`\s+empty/)`.
- Widened the negative pattern to `/`APPROVE`(?:[^.]|\.(?!\s))*leave\s+`CARRY_FIXED`\s+empty/`, so a
  sentence ends only at a period followed by whitespace.

**Files Modified**: `evals/shared/tests/pr-review-loop-parity.test.mjs`. No change was made to
`CHANGELOG.md`: its claim that the test "pins both carry-prose sentences" is now true.

**Testing** (`cp` snapshot and restore of `shared/resources/develop-pipeline-step-5-6-qa-loop.md`):

- M4 (sentence deleted) → red;
- M5 (APPROVE key behind `task.179`) → red;
- M6 (M5's sentence added beside the kept one) → red. This one isolates the negative pattern:
  the old pattern returns `false` on this text and the new one `true`.
- M1–M3 stay red, and the restored suite is 33/33.

**Verification Steps for QA**: re-run M4 and M5 from this report's Steps to Reproduce, and expect
test 14 to go red for each.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-27 | New | qa-task | Found in QA cycle 1 (CR-1, CR-2) |
| 2026-10-27 | In Progress | qa-fix | Investigation started |
| 2026-10-27 | Ready for QA | qa-fix | Positive pin + widened negative; M4–M6 red |
| 2026-10-27 | Closed | qa-task | Verified by task.237.qa.2.carry-doc-only-findings-on-approve.md (M4, M5 red) |
