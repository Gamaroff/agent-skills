---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-15'
related: 'task 203'
description: 'The engine is a refusing boundary, but no probe can reach its decision, and an empty `--root` is accepted'
---

# Bug Report: Task 203 - The engine is a refusing boundary, but no probe can reach its decision, and an empty `--root` is accepted

**Bug ID**: TASK-203-BUG-4
**Related**: [task.203.migrate-doc-numbering.md](./task.203.migrate-doc-numbering.md) (QA finding QA-1, gate 1)
**Status**: ✅ Closed
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 1)

---

## Bug Description

**Summary**: The engine is a refusing boundary, but no probe can reach its decision, and an empty `--root` is accepted.

**Expected Behavior**: The `--root` containment decision is reachable by `security-probe.mjs` and is probed with the `path` sink. An empty `--root` is refused rather than silently taken as the default.

**Actual Behavior**: The header says the run "stops rather than guessing", and `--root` refuses a root outside the repository. That makes it a boundary under `probe-boundary-rule.md`. But the decision sits inside `run()`, behind a `git rev-parse` that every probe sandbox fails, so `probes_executed` is 0. A hand probe also shows `--root ""` answering `already` against the configured default. The `path` corpus treats the empty input as hostile.

**Impact**: The finalise DoD zero-guard fails a boundary with `probes_executed: 0`. An empty `--root` (an unset shell variable, for example) runs against a root the caller did not name.

---

## Reproduction Steps

**Environment**: Linux, Node 26, `feature/task.203.migrate-doc-numbering` at `7ac5e445`.

**Steps to Reproduce**:

1. `node shared/resources/migrate-doc-numbering.mjs --json --root ""` → `{"reason":"already","root":"docs/prd"}`.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Related Files**: `shared/resources/migrate-doc-numbering.mjs (`run()`: the root resolution and the `root.startsWith("..")` check)`

---

## Success Criteria Violation

**Reference**: § 3 exit contract — `usage` for "a bad flag"; the QA boundary rule (`probes_executed` > 0 for a boundary).

**How It Failed**: The header says the run "stops rather than guessing", and `--root` refuses a root outside the repository. That makes it a boundary under `probe-boundary-rule.md`. But the decision sits inside `run()`, behind a `git rev-parse` that every probe sandbox fails, so `probes_executed` is 0. A hand probe also shows `--root ""` answering `already` against the configured default. The `path` corpus treats the empty input as hostile.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-15
**Developer**: qa-fix (develop-task pipeline, QA cycle 1)

**Root Cause Analysis**: The `--root` decision sat inside `run()`, behind `git rev-parse`, so no probe form reached it. `val()` also accepted an empty string, which then fell through to the configured default.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-15

**Fix Description**: New exported pure predicate `checkPrdRoot(rootArg, base)`. It refuses empty, NUL, percent-escaped, `..`-escaping and absolute-outside roots, and a root that resolves outside the base through a symlink: the nearest existing ancestor is realpath'd. `run()` resolves the root through it. `--root ""` and `--root=` are now `usage`.

**Files Modified**: `shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`

**Testing**: New test `QA-1: checkPrdRoot refuses …` (9 hostile and 5 legitimate inputs, with a real symlink fixture), plus the usage test extended with `--root ""`, `--root=` and `--root ../outside`. Mutation-proven: realpath check removed → red; empty-value guard removed → red. Probe: `security-probe.mjs --sink path --entry 'shared/resources/migrate-doc-numbering.mjs#checkPrdRoot' --args-json '["<base with uploads/link-to-etc → /etc>"]'` gives verdict `engages` with 11 executed (8/8 hostile rejected, 3/3 legitimate accepted, 0 escapes). The QA cycle-2 run records it. The full engine suite has 38/38 passing.

**Verification Steps for QA**: Run `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`, then re-run the reproduction above.

---

## Status History

| Date       | Status | Changed By | Notes       |
| ---------- | ------ | ---------- | ----------- |
| 2026-10-15 | New    | qa-task    | Bug created |
| 2026-10-15 | In Progress | qa-fix | Investigation started |
| 2026-10-15 | Ready for QA | qa-fix | Fix implemented (QA cycle 1) |
| 2026-10-15 | Closed | qa-task | Verified by task.203.qa.2.migrate-doc-numbering.md |

---

## Resolution Summary

[Filled when closed]
