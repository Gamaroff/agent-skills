# Bug Report: Task 194 - review-pr Step 6 prose still describes the pre-fix bad-rev behaviour

**Task**: [task.194.code-review-anchors-name-source-lines.md](./task.194.code-review-anchors-name-source-lines.md)
**Bug ID**: TASK-194-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 2 refute pass, CR2-3)
**Date Found**: 2026-10-07

## Description

`skills/review-pr/SKILL.md` Step 6 says that when the head commit is not available locally "every anchor reads `no-such-file` — the findings still render, marked". Since cycle 1 an unresolvable rev exits 2 `bad-rev` and annotates nothing.

## Steps to Reproduce

Read Step 6's paragraph after the checker block (`git grep -n 'head commit is not available' skills/review-pr/SKILL.md`).

## Expected Behavior

The paragraph says: on `bad-rev`, fetch the head and re-run; never render the findings as checked.

## Recommendation

Rewrite the sentence; run the documentation population probe on the behaviour phrase, not only the comment phrase that changed.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-07

**Fix Description**: Step 6's paragraph now says an unavailable head exits 2 `bad-rev` with nothing annotated: fetch and re-run, never render the findings as checked. The four exit-2 comments now name `bad-root` too.

**Files Modified**: `shared/resources/finding-anchors.js` (+ four bundled copies), `shared/resources/tests/finding-anchors.test.mjs`, the four dispatcher `SKILL.md` exit-2 comments, `skills/review-pr/SKILL.md` Step 6, `CHANGELOG.md`, the task document.

**Testing**: Documentation probe run on the behaviour phrases (`head commit is not available`, `every anchor reads`, `reads \`no-such-file\``, `bad-rev`): every hit updated or confirmed. No executable test holds a prose sentence; the engine behaviour it describes is held by the bad-rev test.

**Fix-cycle structural move**: consolidate — `checkTree()` is the one preflight for "could not look" (`--root` and `--rev`), and both read routes resolve a path against `--root`.

## Status History

| Date       | Status       | Changed By | Notes                |
| ---------- | ------------ | ---------- | -------------------- |
| 2026-10-07 | New          | qa-task    | Found in QA cycle 2  |
| 2026-10-07 | Ready for QA | qa-fix     | Fixed in cycle 2 fix |
| 2026-10-07 | Closed       | qa-task    | Verified in QA cycle 3 (gate 3) |
