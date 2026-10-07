# Bug Report: Task 194 - An unresolvable --rev reads as "the reviewer is wrong"

**Task**: [task.194.code-review-anchors-name-source-lines.md](./task.194.code-review-anchors-name-source-lines.md)
**Bug ID**: TASK-194-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 1, code review CR-1)
**Date Found**: 2026-10-07

## Description

`makeReader` in `shared/resources/finding-anchors.js` returns `null` for every `git show` failure.
An unknown or unfetched `--rev` therefore reports every finding as `no-such-file`, and the CLI exits 1
with `malformed-anchors`. "Could not look" and "the reviewer named a missing file" reach one verdict.

## Steps to Reproduce

```bash
command node shared/resources/finding-anchors.js --findings-file <any findings JSON> --rev no-such-rev --json
```

## Expected Behavior

Exit 2 with a reason naming the revision that does not resolve.

## Actual Behavior

`reason: malformed-anchors`, exit 1, `no-such-file` on every finding. The unit test
`--rev reads the committed file through git show` asserts this behaviour for `no-such-rev`.

## Impact

`/review-pr` on a merged PR whose head was not fetched marks every anchor unverified, `/qa-*` null
the `file` of every promoted finding, and `/review-code --fix` skips every finding — with nothing
saying the checker could not read the tree.

## Recommendation

Resolve the rev once (`git rev-parse --verify --quiet <rev>^{commit}`) before reading any file and
exit 2 with a named reason when it fails; update the unit test to expect exit 2.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-07

**Root Cause**: `makeReader` swallowed every `git show` failure as `null`, so an unresolvable rev and an absent path were one state.

**Fix Description**: `resolveRev()` resolves `--rev` once (`git rev-parse --verify --quiet <rev>^{commit}`) before any read. A rev that names no commit exits 2 with `reason: bad-rev`, writes no verdicts and annotates nothing; the reader then reads through the resolved SHA.

**Files Modified**:
- `shared/resources/finding-anchors.js` (and its four bundled copies)
- `shared/resources/tests/finding-anchors.test.mjs`
- The four dispatcher `SKILL.md` blocks' `exit 2` comment (now names `bad-rev`); `CHANGELOG.md`; the task's Target Architecture

**Testing**: `--rev reads the committed file through git show` now asserts exit 2, `bad-rev`, no results, and no `anchor_check` written under `--annotate`. Mutation (`resolveRev` bypassed) turned it red.

**Verification Steps for QA**: `node shared/resources/finding-anchors.js --findings-file <f> --rev no-such-rev --json` → exit 2, `reason: bad-rev`.

## Status History

| Date       | Status       | Changed By | Notes                            |
| ---------- | ------------ | ---------- | -------------------------------- |
| 2026-10-07 | New          | qa-task    | Found in QA cycle 1              |
| 2026-10-07 | Ready for QA | qa-fix     | Fixed in cycle 1 fix             |
| 2026-10-07 | Closed       | qa-task    | Verified in QA cycle 2 (gate 2)  |
