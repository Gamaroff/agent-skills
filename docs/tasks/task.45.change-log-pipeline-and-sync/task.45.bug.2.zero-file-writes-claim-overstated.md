# Bug Report: Task 45 - "Zero file writes" claim overstates what the code guarantees

**Task**: [Link](./task.45.change-log-pipeline-and-sync.md)
**Bug ID**: TASK-45-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-13

## Description

Three code comments and one ticked success criterion assert that a no-op sync performs **zero file writes**. The implementation does not provide that guarantee: `fs.writeFileSync` is called unconditionally in all three `updateXFile` functions, regardless of whether any Change Log entry was produced.

What the change *does* guarantee is narrower and still valuable: a no-op sync adds **no Change Log row** and performs **no marker migration**, so the file content is byte-identical and `git diff` is empty. That is a real property. It is not "zero writes".

## Steps to Reproduce

```bash
grep -n "writeFileSync" skills/sync-jira-task/scripts/sync-jira-task.js
```

`fs.writeFileSync(filePath, content, "utf-8")` sits after the entry loop with no guard. The loop body is skipped when `changeLogEntries` is empty; the write is not. The same shape holds in `sync-jira-story.js` and `sync-jira-epic.js` — and in the epic fast path, `updateEpicFile` is still called with an empty `skipEntries` array and still writes.

## Expected Behavior

Claims in code and in the task document match what the code does. Either:

- **(a)** the wording is corrected to the accurate guarantee — "no Change Log row, no marker migration, and therefore no content change / empty `git diff`"; or
- **(b)** the write is genuinely skipped when nothing changed, by comparing against the content read at the top of the function.

## Actual Behavior

Four locations assert the stronger claim:

| Location | Text |
| --- | --- |
| `skills/sync-jira-task/scripts/sync-jira-task.js:266` | "keeps two consecutive no-op syncs at zero file writes" |
| `skills/sync-jira-story/scripts/sync-jira-story.js:382` | "that is what holds a no-op sync at zero file writes" |
| `shared/resources/jira-sync.js:438` | "syncs at zero writes rather than churning every document" |
| `task.45…md:463` | `- [x] A no-op sync still performs zero file writes` — **ticked** |

The task's own §8 baseline claim — *"the no-op fast path at `sync-jira-epic.js:887` today performs zero writes"* — is likewise inaccurate about the pre-change behaviour: that path also called `updateEpicFile`, which also wrote.

## Impact

Contained but real, and of a kind this task exists to prevent.

1. **A ticked criterion that the literal wording does not satisfy.** The task's own live-verification step defines the check operationally as `git diff --stat # must be empty`, which the implementation *does* satisfy. So the behaviour is correct and the criterion is defensible — but only under a definition the criterion does not state. A future reader auditing "zero file writes" against `strace` or a file-watcher will find it false and reasonably conclude the narrowing regressed.

2. **The comments are load-bearing.** They explain *why* the entry loop is structured as it is. A maintainer who later adds an early `return` believing writes are already skipped, or who removes the perceived redundancy, would be reasoning from a false premise.

3. **No behavioural defect.** Content is unchanged on a no-op, `git diff` is empty, no Change Log row is written, and migration does not fire. The property the task actually cares about holds and is covered by test `H: migration does not fire when nothing else is being written`, which asserts byte-identity rather than write count — correctly.

## Recommendation

Take option **(a)** — correct the wording. Option (b) changes behaviour on a path that also refreshes `jira_last_synced_at`, which is a wider change than this task should carry and is not needed for the guarantee anyone depends on.

1. Reword the three code comments to the accurate claim: no row, no migration, no content change — hence an empty `git diff` — rather than "zero file writes".
2. Reword success criterion `:463` to *"A no-op sync writes no Change Log row and leaves the file byte-identical (empty `git diff`)"* and keep it ticked, since that is verified by test H.
3. Correct the §8 baseline sentence, which misdescribes the pre-change epic fast path.
4. Leave the deferred live-Jira criterion unticked as it already is.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-08-13 | New | QA Engineer | Filed at gate 1 (FAIL) |
| 2026-08-13 | Ready for QA | qa-fix | Fixed in cycle 1 |
