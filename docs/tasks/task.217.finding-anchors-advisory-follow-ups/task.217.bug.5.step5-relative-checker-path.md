# Bug Report: Task 217 - Step 5 says it answers the same from any directory, but HALTs from a subdirectory

**Task**: [Link](./task.217.finding-anchors-advisory-follow-ups.md)
**Bug ID**: TASK-217-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 3 diff review, CR-1)
**Date Found**: 2026-10-24

## Description

The review-code Step 5 block runs the checker as
`command node .agents/skills/review-code/references/finding-anchors.js --fix-list …`. That path is
relative to the cwd. The prose above the block says the checker reads its tree and root from the
stamp, "so … the block gives the same answer from any directory". The engine does. The block does
not: from a subdirectory node cannot find the script, exits 1, and the block HALTs with "finding-anchors
produced no apply list".

The committed block test (`skills/review-code/tests/review-code.test.js`, the "Step 5 skips a finding
whose working tree differs" test) replaces that relative path with an absolute path to the engine
before it runs the block from `sub/`. So the test passes on the exact case the claim makes and the
block fails.

The failure is closed: nothing is applied. The defect is that the documented behaviour, and the BUG-4
verification step that relies on it, are false.

## Steps to Reproduce

1. Annotate any findings file with `finding-anchors.js --annotate`, from the repository root.
2. `cd skills` and run the Step 5 block as shipped.

## Expected Behavior

The same apply list as from the root, as the prose says. Or the prose says the block runs from the
repository root, and the test runs the real path.

## Actual Behavior

`Error: Cannot find module '…/skills/.agents/skills/review-code/references/finding-anchors.js'`, then
`HALT: finding-anchors produced no apply list …`, exit 1.

## Impact

Low in practice: it fails closed, and every block in the skill runs from the repository root. But
the claim was made specifically to close BUG-4, and the test that holds it cannot see the case.

## Recommendation

Resolve the script from `git rev-parse --show-toplevel` and HALT if that fails, or narrow the claim
to the checker. Then make the block test run the shipped relative path from `sub/`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-24
**Developer**: qa-fix

**Root Cause Analysis**: The cycle-2 fix made the checker cwd-independent (it reads the root from its stamp) and the prose extended that claim to the block. The block names the checker by a root-relative path, as every block in the skill does, so the block is not cwd-independent. The test swapped that path for an absolute one before running the block from `sub/`, which made the over-claim pass.

**Structural move (qa-fix Step 2.6)**: scope the claim. Every block in this skill runs from the repository root; resolving this one block from `git rev-parse --show-toplevel` would make it the single exception and restate a rule the skill holds once. So the claim narrows to what is true: the checker's answer does not depend on the cwd, and the block runs from the root and fails closed elsewhere.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-24

**Fix Description**: The Step 5 prose and the block comment say the checker answers the same from any directory and the block runs from the repository root, HALTing and applying nothing from anywhere else. The CHANGELOG entry says the same. The block test no longer rewrites the checker path: the fixture installs the shipped checker at `.agents/skills/review-code/references/finding-anchors.js`, and the block runs exactly as shipped.

**Files Modified**:

- `skills/review-code/SKILL.md`: the Step 5 prose and the block comment.
- `CHANGELOG.md`: the task 217 `--fix-list` bullet.
- `skills/review-code/tests/review-code.test.js`: the Step 5 block test runs the shipped root-relative path. From the root, it asserts the apply list; from `sub/`, it asserts that the checker returns the same list, and that the block HALTs with nothing listed to apply.

**Testing**: `review-code.test.js` 18/18. Three mutations, each red on the Step 5 test: resolving the checker from the top level (so the block works from `sub/`), the repo-only path `skills/review-code/references/…`, and a block that ignores the checker's exit. The Step 5 `fence:` probe engages 23/23.

**Verification Steps for QA**:

1. From `skills/`, run the Step 5 block as shipped. It HALTs with "finding-anchors produced no apply list", and nothing is applied.
2. Run the checker by its absolute path from `skills/`. The list matches the one from the root.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-24 | New | qa-task | Found by task.217.qa.3.finding-anchors-advisory-follow-ups.md (CR-1) |
| 2026-10-24 | In Progress | qa-fix | Investigation started |
| 2026-10-24 | Ready for QA | qa-fix | Fix implemented — Step 5 cwd claim scoped, block test runs the shipped path |
| 2026-10-24 | Closed | qa-task | Verified by task.217.qa.4.finding-anchors-advisory-follow-ups.md |
