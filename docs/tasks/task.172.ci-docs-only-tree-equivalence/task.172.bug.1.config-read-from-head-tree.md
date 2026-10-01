# Bug Report: Task 172 - The engine reads its docs patterns from the head it is judging

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-1
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1 diff review, reproduced by QA)
**Date Found**: 2026-10-01

## Description

`readConfig` reads `skills-config.yaml` from the working tree, which is the head being judged. A commit
that changes code **and** sets `ci.docsOnly.patterns` to `["**"]` (or sets `checkCommand` to `true`) makes its
own code diff read as documentation. Reproduced: a head that edits `src/a.js` and widens the patterns,
over a green ancestor, returns `tree-equivalent` and exits 0.

## Expected Behavior

The rule's own configuration cannot be changed by the commit it is deciding about.

## Actual Behavior

`tree-equivalent`, exit 0, over a code change.

## Impact

The one property the engine exists to hold (exit 0 only when the delta is documentation) is bypassable by
whoever authors the head. An unreviewed code commit is recorded as CI-verified.

## Recommendation

Treat any change to `skills-config.yaml` in the ancestor..head diff as `code-changed`, whatever the
patterns say. Add a test that widens the patterns in the head's own commit.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 1)

Reproduced by QA before gating; reproduction re-run before the fix and after it.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Root cause: `readConfig` reads `skills-config.yaml` from the head being judged, so the commit under judgement could
change the rule that judges it.

Fix: `isDocsPath` in `shared/resources/ci-tree-equivalence.js` never treats a path whose basename is
`skills-config.yaml` as documentation, whatever the patterns say. A config change in the delta is therefore
`code-changed`. A config the owner committed before the green commit still applies to every other path.

Files: `shared/resources/ci-tree-equivalence.js` (and its bundled copies).
Tests: `CR-1: a head that changes code AND widens ci.docsOnly.patterns ...` and `CR-1: a config change is code even
when it is the ONLY change, at any depth; the owner's committed config still applies elsewhere` in
`shared/resources/tests/ci-tree-equivalence.test.mjs`. Mutation proof: removing the basename rule turns both red.
Accepted and documented: an uncommitted local edit to the config is the operator's own and is not judged.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-01 | New          | QA         | Found in QA cycle 1            |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started          |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |
