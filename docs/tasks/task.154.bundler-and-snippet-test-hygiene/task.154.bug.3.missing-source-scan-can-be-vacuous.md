# Bug Report: Task 154 - bundle-missing-source §2 passes on a scan that covered nothing

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Bug ID**: TASK-154-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 2, refute pass CR-1)
**Date Found**: 2026-09-29

## Description

Cycle 1's fix for bug 2 combined two changes. §2 now accepts the `❌` summary form, and it now counts
skills on disk instead of skills the scan walked. Together those make §2 vacuous on one path.
`check_skill` returns `([], False)` for a skill that `resolve_paths` cannot resolve, and it does so
before `discover_needed` runs, so no missing-source warning can print for that skill. `check_all`
then prints `❌ bundle freshness: 0 problem(s) across 0 skill(s)`. With every skill unresolved, §2
still reads `missing: []`, `completed: true`, and a filesystem count of 129 or more.

## Expected Behavior

The non-vacuity floor measures the scan itself, and §2 fails when any skill went unresolved.

## Recommendation

Make the scan report how many skills it resolved and scanned, on both the clean and the problem
path. For example, `check_all` could print the scanned count in its `❌` summary. §2 then asserts
that count against `MIN_SKILLS` and fails on any unresolved skill. Add a fixture case for an
unresolvable skill.

## Developer Fix Cycle

### Iteration 1

**Fix**: `check_all` now prints `N skill(s) checked, U unresolved` beneath its `❌` summary.
The clean path already printed its scan size. §2's `readCheckOutput()` takes `checked` and
`unresolved` from `--check` itself, from whichever form it printed, and no longer counts skills on
disk. §2 asserts that the scan printed a count, that `unresolved === 0`, and that
`checked >= MIN_SKILLS`. The new §1f checks one unresolvable target and asserts that the reader
returns `{checked: 0, unresolved: 1}`.

**Files**: `skills/create-skill/scripts/bundle_skill.py`, `tests/bundle-missing-source.test.js`,
`CHANGELOG.md`. `bundle-check-mode.test.js` still passes, and no test pinned the old two-line summary.

**Mutation-proven**: G1 removed the scan-size line, and §1e and §1f went red.

## Status History

| Date       | Status       | Changed By | Notes                     |
| ---------- | ------------ | ---------- | ------------------------- |
| 2026-09-29 | New          | qa-task    | Found in QA cycle 2       |
| 2026-09-29 | Ready for QA | qa-fix     | Fix implemented (cycle 2) |
