# Bug Report: Task 194 - An unresolvable --root reads as "the reviewer is wrong"

**Task**: [task.194.code-review-anchors-name-source-lines.md](./task.194.code-review-anchors-name-source-lines.md)
**Bug ID**: TASK-194-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 2 refute pass, CR2-2)
**Date Found**: 2026-10-07

## Description

When `--root` does not exist, `realRoot` is null and every `path:line` finding reads `no-such-file` (exit 1, `malformed-anchors`) — the same could-not-look ambiguity cycle 1 closed for `--rev`.

## Steps to Reproduce

`node shared/resources/finding-anchors.js --findings-file <f> --root /nonexistent/x --json` → `malformed-anchors`, exit 1, all `no-such-file`.

## Expected Behavior

Exit 2 with `reason: bad-root` before any anchor is checked.

## Recommendation

Validate `--root` once (exists, is a directory) next to the `--rev` check; add a test.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-07

**Fix Description**: `checkTree()` stats `--root` first: not a directory → exit 2 `reason: bad-root`, no results, nothing annotated, before `--rev` is resolved.

**Files Modified**: `shared/resources/finding-anchors.js` (+ four bundled copies), `shared/resources/tests/finding-anchors.test.mjs`, the four dispatcher `SKILL.md` exit-2 comments, `skills/review-pr/SKILL.md` Step 6, `CHANGELOG.md`, the task document.

**Testing**: New test `a --root that is not a directory exits 2 bad-root and annotates nothing, before --rev is read` (missing path and a file; with no rev, a good rev and a bad rev). Mutation (root check skipped) turned it red.

**Fix-cycle structural move**: consolidate — `checkTree()` is the one preflight for "could not look" (`--root` and `--rev`), and both read routes resolve a path against `--root`.

## Status History

| Date       | Status       | Changed By | Notes                |
| ---------- | ------------ | ---------- | -------------------- |
| 2026-10-07 | New          | qa-task    | Found in QA cycle 2  |
| 2026-10-07 | Ready for QA | qa-fix     | Fixed in cycle 2 fix |
| 2026-10-07 | Closed       | qa-task    | Verified in QA cycle 3 (gate 3) |
