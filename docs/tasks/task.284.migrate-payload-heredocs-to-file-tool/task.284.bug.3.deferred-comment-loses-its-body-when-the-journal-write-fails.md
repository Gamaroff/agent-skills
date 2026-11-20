# Bug Report: Task 284 - A deferred comment loses its only copy when the journal write fails

**Task**: [Link](./task.284.migrate-payload-heredocs-to-file-tool.md)
**Bug ID**: TASK-284-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 2, code review CR-1, reproduced by execution)
**Date Found**: 2026-11-20

## Description

QA cycle 1's fix made `tracker-comment.js` remove `--body-file` in `emit` when the outcome is `posted`,
`already` or `deferred`. The `deferred` outcome has two paths. When the journal write works, the record
carries the body on stdin, so removing the file is safe. When the journal write throws, the `catch`
(`shared/resources/tracker-comment.js`, near line 810) warns and emits `deferred` with **no `record`**.
`emit` then removes the file, and the comment body exists nowhere: not posted, not journalled, not on
disk. The contract sentence added in cycle 1 ("the deferred record already carries the body") is false
on that path.

## Steps to Reproduce

Run the engine with `ACCESS_TRACKER=manual` in a repository where `.claude/state/tracker-actions.jsonl`
cannot be appended to (for example, it is a directory), with a body file in place:

```bash
node <scratchpad>/repro-cr1.cjs
# control (journal works)  : reason=deferred record=7f2f51ea bodyFileExists=false   (correct: the record holds the body)
# journal write fails      : reason=deferred record=none     bodyFileExists=false   (the body is lost)
```

Against the base engine the file survives both runs (`bodyFileExists=true`).

## Expected Behavior

A body file is removed only when its content has been delivered or recorded: `posted`, `already`, or
`deferred` **with a record id**. A deferred outcome with no record keeps the file.

## Actual Behavior

The file is removed on every `deferred` outcome.

## Impact

Under `access.tracker: manual` with an unwritable journal, a pipeline comment is dropped silently. The
engine already prints a warning for the journal failure, but the caller then has nothing to retry.

## Recommendation

In `emit`, consume on `posted` and `already`, and on `deferred` only when `payload.record` is set. Add a
test that forces the journal failure and asserts the body file remains, and one that asserts it is
consumed when the record exists. Correct the contract sentence to say "a deferred outcome that has a
record".

## Developer Fix Cycle

### Iteration 1

**Root cause**: cycle 1 put `deferred` in the set of outcomes that consume the body file, on the premise
that the journal record carries the body. The journal-write-failure `catch` also emits `deferred`, with
no `record`, so the premise is false on that path.

**Fix** (`shared/resources/tracker-comment.js`, `emit`): `deferred` consumes the file only when
`payload.record` is set. `tracker-comment-contract.md`, `file-write-rules.md#fresh-body-post` and the
CHANGELOG entry now say "deferred into the journal"; bundled copies regenerated.

**Tests**: two new tests in `shared/resources/tests/tracker-comment.test.mjs`: a deferral with a working
journal consumes the file; a deferral whose journal path is unwritable keeps it. Mutation proof: with the
guard replaced by `true`, the journal-failure test went red (85 pass, 1 fail); restored with `cmp` clean,
86 pass.

**Probe**: `git grep` for "already there or deferred", "already` or `deferred`" and "deferred record
already carries" over the executed documents. Population: 3. `tracker-comment-contract.md` and
`file-write-rules.md` updated; `develop-pipeline-step-7-finalise.md:545` lists acceptable `reason`
values and states no consumption rule, so it is unaffected. The CHANGELOG entry was updated too.

**Importers audited**: the change narrows when a file is removed and widens nothing accepted, so no
importer is affected.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-20 | New | qa-task | Found in QA cycle 2, reproduced by execution |
| 2026-11-20 | Ready for QA | qa-fix | Fix applied in QA cycle 2; verification in the next gate |
