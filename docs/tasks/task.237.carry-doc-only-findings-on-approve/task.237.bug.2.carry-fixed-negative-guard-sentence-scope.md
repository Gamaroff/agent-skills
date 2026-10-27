# Bug Report: Task 237 - The `CARRY_FIXED` negative guard is not scoped to the sentence it judges

**Task**: [Link](./task.237.carry-doc-only-findings-on-approve.md)
**Bug ID**: TASK-237-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-10-27

## Description

The carry-prose test (`pr-review-loop-parity.test.mjs`, "the carry prose names no verdict where it
decides whether to fix") holds success criterion 2's claim that the `CARRY_FIXED` rule names no
verdict. Its negative assertion scans forward from each `APPROVE` to the next period-plus-whitespace:

```
/`APPROVE`(?:[^.]|\.(?!\s))*leave\s+`CARRY_FIXED`\s+empty/
```

This scan is not the sentence that decides. It covers one verdict, in one word order, and its
boundary is wrong: an abbreviation ends the scan early, and a long span reaches into a neighbouring
clause. Code review CR-1 (QA cycle 2, the refute pass) found this. CR-4 (cleanup) also notes that
the test slices the Carry section by hand, which widens silently. The file's `sectionBetween` helper
asserts both markers instead.

## Steps to Reproduce

Each mutation was applied to `shared/resources/develop-pipeline-step-5-6-qa-loop.md` from a `cp`
snapshot, then `command node --test evals/shared/tests/pr-review-loop-parity.test.mjs`, then the
snapshot was restored. In each case the classify-keyed sentence was kept, so only the negative
assertion was tested:

1. **M7.** Add "On `CONCERNS` with nothing doc-only, leave `CARRY_FIXED` empty." → **0 failures**
   (a missed revert).
2. **M8.** Add "On `APPROVE` (e.g. a clean review), leave `CARRY_FIXED` empty." → **0 failures**
   (missed: "e.g. " ends the scan).
3. **M9.** Prefix the correct sentence with "An `APPROVE` usually clears nothing; " → **test 14
   fails** (a false positive on a sentence that keys correctly).

There is also an in-memory probe: "Leave `CARRY_FIXED` empty on `APPROVE`." does not match the
pattern, so a reversed word order is missed too.

## Expected Behavior

Any sentence that holds "leave `CARRY_FIXED` empty" and names `APPROVE` or `CONCERNS` turns the
test red, whatever the word order or abbreviation. A sentence that keys correctly passes, whatever
clause comes before it.

## Actual Behavior

M7 and M8 pass, and M9 fails.

## Impact

The test title claims "names no verdict", but the test enforces that for one verdict in one word
order. A CONCERNS-keyed revert of the exact shape task.179 obeyed can be added beside the correct
sentence, and no test fails.

## Recommendation

Read the Carry section with `sectionBetween`. Then find each sentence that holds
`leave\s+`CARRY_FIXED`\s+empty`, splitting on a period followed by whitespace and a capital letter
or backtick, so that "e.g. a" does not split. Assert that no such sentence names `APPROVE` or
`CONCERNS`. Mutation-prove M7, M8 and M9, and the reversed word order, plus M4 and M5.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Root Cause**: the negative assertion was a pattern anchored on one verdict token, and it scanned
forward to a punctuation boundary. Its unit was "from `APPROVE` to the next period" rather than "the
clause that decides". So it could not see a different verdict or a reversed word order, and it could
reach into a neighbouring clause. This is the second fix to the same guard (Step 2.6 trigger b,
repeat subject), so the move is to change the mechanism rather than widen the pattern again.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- The Carry section is read through `sectionBetween`, which asserts both markers, instead of a hand
  slice (CR-4).
- The section is split into clauses: at `;`, or at a period followed by a capital, a backtick, `*`
  or `(`. The test keeps the clauses that hold `leave CARRY_FIXED empty` (case-insensitive) and
  asserts that none names `APPROVE` or `CONCERNS`. A non-vacuity floor asserts that at least one
  such clause exists.
- QA-3 was fixed in the same cycle. The sentence now reads "When the classify block cleared no path,
  or no fix changed a cleared path, leave `CARRY_FIXED` empty". The positive pin matches it, and the
  bundled copies were regenerated.

**Files Modified**: `evals/shared/tests/pr-review-loop-parity.test.mjs`,
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, and its 2 bundled copies.

**Testing** (`cp` snapshot and restore). Each of these turns test 14 red:

| Mutation | Change |
| -------- | ------ |
| M2 | "Classify on" reverted |
| M3 | the old APPROVE sentence |
| M4 | the sentence deleted |
| M5 | an APPROVE key after `task.179` |
| M7 | a CONCERNS sentence added beside |
| M8 | an APPROVE key after "e.g." |
| M10 | the reversed word order |
| M11 | the QA-3 wording reverted |
| M12 | every leave-empty clause removed |

M1 turns test 13 red. M9 (an APPROVE clause before the correct sentence) stays green, so it is no
longer a false positive. Results: parity 33/33, carries-5c 24/24, `bundle:check` clean.

**Verification Steps for QA**: re-run M7, M8, M9 and M10.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-27 | New | qa-task | Found in QA cycle 2, refute pass (CR-1, CR-4) |
| 2026-10-27 | In Progress | qa-fix | Investigation started |
| 2026-10-27 | Ready for QA | qa-fix | Clause-scoped verdict check; M7, M8, M10 red, M9 green |
| 2026-10-27 | Closed | qa-task | Verified by task.237.qa.3.carry-doc-only-findings-on-approve.md |
