# Bug Report: Task 149 - doc-links `linkState` reads two uncommittable targets as `untracked`

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (qa-task cycle 2, refute review CR-3 and CR-4; verified)
**Date Found**: 2026-09-26

## Description

`untracked` is the one non-blocking state, so anything misfiled there passes the read-back:

1. **Case mismatch (CR-3, platform variance).** `fs.existsSync` is case-insensitive on macOS, so a link
   `Report.md` to a file named `report.md` reads `untracked` there. On Linux CI the same link is dead.
2. **Outside the repository (CR-4).** A `../` link that resolves outside the repository to a file on
   disk reads `untracked`. `git check-ignore` exits 128 there, which `linkState` treats as "not ignored".
   Such a file can never be committed.

Verified in one scratch repository: `[r](Report.md)` with `report.md` tracked, and
`[o](../../outside.md)` → both `state: "untracked"`.

## Expected Behavior

Each gets a blocking state: a case mismatch is reported (for example `missing`, or its own
`case-mismatch`), and a resolved path outside the repository, or a check-ignore status other than 0/1,
is never `untracked`.

## Recommendation

When `existsSync` is true, compare the exact basename against `readdirSync` of its directory. Treat a
resolved path beginning with `..` as `outside-repo`. Map check-ignore's 0 to `ignored`, 1 to
`untracked`, and anything else to a blocking state. Add a test for each.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation

- `linkState()`: a resolved path above the repository is `outside-repo`.
- `existsExactly()` compares every component against the directory listing, so a case-mismatched name
  is `missing` on every filesystem.
- check-ignore status 0 is `ignored`, 1 is `untracked`, and anything else is `unverifiable`.
- Test: `Report.md`, `../Docs/b.md`, `../../outside.md`, `new.md` → missing, missing, outside-repo,
  untracked.
- Mutation-proved: `existsSync` in place of the exact check turns the test red on this
  case-insensitive host (on Linux `existsSync` is already exact), and dropping the `outside-repo`
  branch turns it red.

#### QA Verification (cycle 3) — Closed

Case-mismatch and outside-repo links now block (test plus two mutations). A final-component symlink that dangles or points outside still reads `untracked` (cycle-3 CR-1, low).

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 2 |
| 2026-09-26 | Ready for QA | qa-fix | Fixed in qa-fix cycle 2 |
| 2026-09-26 | Closed | QA Engineer | Verified in QA cycle 3 |
