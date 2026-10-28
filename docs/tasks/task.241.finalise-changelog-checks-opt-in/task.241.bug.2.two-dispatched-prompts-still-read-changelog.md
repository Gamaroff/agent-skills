# Bug Report: Task 241 - Two dispatched DoD prompts still read CHANGELOG.md when the checks are off

**Task**: [Link](./task.241.finalise-changelog-checks-opt-in.md)
**Bug ID**: TASK-241-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, code review CR-2, population confirmed by grep)
**Date Found**: 2026-10-28

## Description

The task gated the two changelog checks it named: the docs subagent's Step 2 and action 6d. The
`CHANGELOG.md` entry, `configuration.md` and the 6d prose then all claim that when the key is unset,
**`/finalise` never reads `CHANGELOG.md`**. Nothing enumerated the other `CHANGELOG` readers among the
prompts `/finalise` dispatches, and two of them are still ungated:

- `shared/resources/finalise-dod-ac-prompt.md:66` (agent 1, a refactoring or task item): "Check
  `CHANGELOG.md` for an entry matching this story/task."
- `shared/resources/finalise-dod-fix-evidence-prompt.md:87` (agent 1, `--bug` mode): a fix that changes
  observable behaviour must have a `CHANGELOG.md` entry under `## [Unreleased]` citing `(bug N)`. Its
  output schema carries a `CHANGELOG.md` item (lines 140–142).

So a consumer that never opted in is still judged on this repository's convention, in the AC check and
in every bug finalise. That is the outcome the user asked to remove ("I want to avoid /finalise digging
into changelogs").

## Steps to Reproduce

```bash
grep -n -i changelog shared/resources/finalise-dod-ac-prompt.md shared/resources/finalise-dod-fix-evidence-prompt.md
```

## Expected Behavior

Every `CHANGELOG.md` read in a prompt `/finalise` dispatches is gated on `<CHANGELOG_ENFORCE>`, and a
test fails on any ungated one.

One case is not a changelog check and is out of scope: `finalise-dod-ac-prompt.md:48–50` handles a
documentation **criterion** that the work item itself writes, such as "the CHANGELOG cites the task".
That text is driven by the work item's own criteria.

## Actual Behavior

With `changelog.enforce` unset, agents 1 (task) and 1 (bug) still instruct a `CHANGELOG.md` read.

## Impact

The task's headline claim is false for two of the five DoD agent prompts, and consumers keep getting
changelog judgements.

## Recommendation

- Pass `<CHANGELOG_ENFORCE>` to agent 1 (both the AC and the fix-evidence prompts) and gate their
  changelog lines on it. When it is off, the changelog item reads `NOT_APPLICABLE`.
- Add an enumeration test: every line matching `CHANGELOG` in `shared/resources/finalise-dod-*-prompt.md`
  sits under a `<CHANGELOG_ENFORCE>` gate, or appears on an allow-list with a reason. Give the test a
  non-vacuity floor.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: the task named two sites, and nothing enumerated the other `CHANGELOG` readers among
the five DoD prompts. Agent 1's task arm and its bug-mode fix-evidence check each carried a changelog
check of their own, which duplicated agent 4's.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description**: one owner, so no second gate is needed (Step 2.6, consolidate).
- Agent 1 (`finalise-dod-ac-prompt.md` and `finalise-dod-fix-evidence-prompt.md`) no longer reads
  `CHANGELOG.md`. Both defer to agent 4's Step 2, which is already gated on `<CHANGELOG_ENFORCE>`.
- The fix-evidence output schema drops its `CHANGELOG.md` item.
- Agent 4's grep now also looks for the `(bug N)` citation, so bug mode keeps that check.
- Out of scope, as the report said: a work item's own criterion that names the changelog is still
  checked by agent 1, as a documentation criterion.
- Claims scoped to match, in `CHANGELOG.md`, `configuration.md` (×2) and `releases.md`.

**Files modified**: `shared/resources/finalise-dod-ac-prompt.md`,
`shared/resources/finalise-dod-fix-evidence-prompt.md`, `shared/resources/finalise-dod-docs-prompt.md`,
`evals/shared/tests/finalise-publish-boundary.test.mjs`, plus the three docs above.

**Testing**: a new enumeration test, "no dispatched DoD prompt but the gated docs prompt checks
CHANGELOG.md".
- It scans every `finalise-dod-*-prompt.md` (floor: 5 files).
- It allows one uppercase `CHANGELOG` mention per line, and only against a 5-entry allow-list with
  reasons.
- An allow-list entry that matches nothing fails the test.

**Mutation proof**:
- The AC line restored → 1 red.
- The fix-evidence item restored → 1 red.
- A deferral line carrying a second, checking mention → 1 red. The first draft of the test passed
  this one; tightened.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 1 (`task.241.qa.1.finalise-changelog-checks-opt-in.md`) |
| 2026-10-28 | In Progress | qa-fix | Investigation started (QA fix cycle 1) |
| 2026-10-28 | Ready for QA | qa-fix | Agent 4 is the one changelog owner; enumeration test added |
