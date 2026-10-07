# Bug Report: Task 194 - The working-tree reader follows a symlink out of --root

**Task**: [task.194.code-review-anchors-name-source-lines.md](./task.194.code-review-anchors-name-source-lines.md)
**Bug ID**: TASK-194-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1, security probe SEC-1)
**Date Found**: 2026-10-07

## Description

Without `--rev`, `makeReader` checks containment on the resolved path string only, then calls
`fs.readFileSync`, which follows symlinks. A symlink inside `--root` that points outside it is read.

## Steps to Reproduce

`security-probe.mjs --sink path` against `makeReader` over a fixture root holding
`uploads/link-to-etc -> /etc`: case `symlink-escape` (`uploads/link-to-etc/passwd`) is `accepted`.
Run record: `task.194.qa.1.security.run.json`.

## Expected Behavior

The path is refused (`no-such-file`), as the other seven hostile path cases are.

## Actual Behavior

The outside file is read. A finding naming it with a wrong `line_text` prints that outside line in
the `actual` field of a `text-mismatch` result.

## Impact

Limited to working-tree runs (`/review-code` on a working-tree target); with `--rev`, `git show`
returns the link text, not the target.

## Recommendation

Compare `fs.realpathSync` of the file against `fs.realpathSync` of the root and return `null` when
it escapes; add a symlink case to `finding-anchors.test.mjs`.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-07

**Root Cause**: `makeReader` judged containment on the lexical path, then `readFileSync` followed the symlink.

**Fix Description**: The working-tree reader takes `realpathSync` of the file and of the root and refuses (`null`, so `no-such-file`) a file whose real path is outside the real root. A link that stays inside the root still reads. The `--rev` path is unchanged: `git show` returns link text, not the target.

**Files Modified**:
- `shared/resources/finding-anchors.js` (and its four bundled copies)
- `shared/resources/tests/finding-anchors.test.mjs`
- The four dispatcher `SKILL.md` blocks' `exit 2` comment (now names `bad-rev`); `CHANGELOG.md`; the task's Target Architecture

**Testing**: New test `the working-tree reader refuses a symlink that escapes --root and keeps one that stays inside`. Mutation (real-path check removed) turned it red. `security-probe.mjs --sink path` re-run: `engages`, `symlink-escape` rejected (11 cases).

**Verification Steps for QA**: Re-run the path-sink probe against `makeReader`; `symlink-escape` must be `rejected`.

## Status History

| Date       | Status       | Changed By | Notes                            |
| ---------- | ------------ | ---------- | -------------------------------- |
| 2026-10-07 | New          | qa-task    | Found in QA cycle 1              |
| 2026-10-07 | Ready for QA | qa-fix     | Fixed in cycle 1 fix             |
