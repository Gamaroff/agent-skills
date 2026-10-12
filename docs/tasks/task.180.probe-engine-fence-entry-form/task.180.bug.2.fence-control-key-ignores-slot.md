# Bug Report: Task 180 - A fence: control's record key ignores its slot and name

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 1, code review CR-2, verified against `controlKey`)
**Date Found**: 2026-10-12

## Description

`controlKey` (`shared/resources/security-probe.mjs`) keys every non-`cli:` control on `sink + entry`.
A `fence:` entry names a block, not how it was called: two probes of one block with different
`--slot` tokens, or with different `--name`s, write the same entry file, and the second silently
replaces the first. The result carries `slot`, but `toRecordEntry` never records it.

## Steps to Reproduce

Probe one block twice into one `--record`, with `--slot '<a>'` and then `--slot '<b>'` (or two
`--name`s): the record folds to one control and `totals.executed` counts only the second run.

## Expected Behavior

Two fence: probes that differ in slot or name are two controls, as two cli: probes that differ in
name are (task.144).

## Actual Behavior

One control; the first run's count and verdict vanish from the record without a warning.

## Impact

`probes_executed` undercounts, and a verdict the reviewer ran is missing from the block they paste.

## Recommendation

Record `slot` in the record entry, and key a fence: control on its `--name` when given, else on
`sink + entry + slot` — the cli: precedent — with a test that two slots on one block keep two entries.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-12
**Developer**: qa-fix (develop-task pipeline, QA cycle 1)

**Root cause**: `controlKey` had a branch for `cli:` only; every other form keyed on `sink + entry`, and `toRecordEntry` dropped `slot`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-12

`toRecordEntry` records `slot`; `controlKey` keys a `fence:` control on its `--name` when given, else `sink + entry + slot`. Documented in `probe-boundary-rule.md` §5.

**Files Modified**:
- `shared/resources/security-probe.mjs` — `toRecordEntry`, `controlKey`
- `shared/resources/tests/security-probe.test.mjs` — both identity directions: two slots → two controls; a re-run of one slot → one; one name across two slots → one

**Testing**: Mutation: the fence branch in `controlKey` removed → red (`two slots on one block are two controls`).

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-12 | New          | qa-task    | QA cycle 1 |
| 2026-10-12 | In Progress  | qa-fix     | Investigation started |
| 2026-10-12 | Ready for QA | qa-fix     | Fix implemented, mutation-proven |
| 2026-10-12 | Closed       | QA Engineer | Verified by qa.2 (TASK-180-002 FIXED; mutation F2 red) (closed at the PR review, PC trail finding) |
