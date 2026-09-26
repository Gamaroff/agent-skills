# Bug Report: Task 149 - qa-read-back.js reaches three 'could not look' states without exit 2

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 5)
**Date Found**: 2026-09-26

## Description

The script's contract is that "could not look" is exit 2 and never a pass. Three states break it (cycle-5 review):

1. **`--doc` is a directory (CR-1).** `realpathSync` accepts it, and `stage(doc)` then runs
   `git add -- <dir>`, staging the whole directory before `readFileSync` throws. The staging is the
   BUG-7 sweep reintroduced, through the placeholder being filled with the task directory.
2. **checkDocument falls back to the disk (CR-3).** When its own git calls fail it reports
   `tracked: false`, and only `missing` is possible. An untracked target then counts as resolved,
   and the script prints "every link resolves against the index" at exit 0 without having read the
   index.
3. **Uncaught throws (CR-4).** An unreadable document, or a throw from `readdirSync` or
   `checkDocument`, exits 1 with a stack trace. That reads as a HALT, not as "could not look".

## Recommendation

Refuse a non-regular `--doc` with exit 2 before any `git add`. Treat `links.tracked === false` as
exit 2. Wrap the body in try/catch and map unexpected errors to exit 2. Test each.

## Developer Fix Cycle

### Iteration 1

- A non-regular `--doc` is exit 2, checked before any `git add`. Test: a directory `--doc` stages nothing.
- Both link passes require `tracked`, and a disk fallback throws "could not read the index". Test: a
  corrupt `.git/index` gives `could-not-look`.
- The body is wrapped: an unexpected throw is exit 2 `could-not-look`. Test: an unreadable document
  exits 2 from the CLI.
- Mutation-proved: each of the three turns its test red.
- CR-5 cleanup: a failed stage is reported once, not again as "outside".

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 5 |
| 2026-09-26 | Ready for QA | qa-fix | Fixed in qa-fix cycle 5 |
