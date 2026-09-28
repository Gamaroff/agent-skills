# Bug Report: Task 154 - bundle-missing-source §2 fails with "no summary line" on a stale copy, contradicting its own comment

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Bug ID**: TASK-154-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (qa-task cycle 1, code review CR-1)
**Date Found**: 2026-09-29

## Description

`tests/bundle-missing-source.test.js` §2 uses `spawnSync` so that a stale bundled copy does not turn
the test red, and its comment says so. The test then requires the summary line
`bundle freshness: N skill(s) checked`. `check_all` prints that line only when it finds zero problems.
With any problem it prints `❌ bundle freshness: N problem(s) across M skill(s)` instead.

## Steps to Reproduce

1. Make any bundled copy stale and cite no missing source.
2. Run `node --test tests/bundle-missing-source.test.js`.
3. §2 fails with `no summary line in --check output`.

## Expected Behavior

§2 fails only on a missing-source warning or on a skill count below the floor, as its comment says.

## Actual Behavior

A freshness problem that belongs to `bundle-check-mode.test.js` and CI's `bundle:check` turns §2 red,
and the message misnames the cause.

## Recommendation

Read the skill count from a source that does not depend on freshness, or accept both summary forms.
Then add a fixture case for the stale form, so the comment's claim is tested.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Root Cause**: §2 used the zero-problem summary line for two jobs at once: proving the run finished,
and supplying the skill count. `check_all` prints that line only when it finds no problems.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: The new `readCheckOutput(stdout)` returns `{missing, completed}`. `completed`
accepts either summary form (`✅` or `❌ bundle freshness:`). The skill count now comes from the
filesystem (`skills/*/SKILL.md`, the set `--check` walks), not from the freshness line. The new §1e
builds a fixture with a stale copy. It asserts that `--check` fails on it (the premise) and that the
reader still returns `{missing: [], completed: true}`.

**Files Modified**: `tests/bundle-missing-source.test.js`

**Testing**: 6/6 pass. Mutation F5 made the reader require the zero-problem line again, and §1e went
red.

## Status History

| Date       | Status       | Changed By | Notes                    |
| ---------- | ------------ | ---------- | ------------------------ |
| 2026-09-29 | New          | qa-task    | Found in QA cycle 1      |
| 2026-09-29 | In Progress  | qa-fix     | Investigation started    |
| 2026-09-29 | Ready for QA | qa-fix     | Fix implemented (cycle 1) |
| 2026-09-29 | Closed       | qa-task    | Verified in QA cycle 2    |
