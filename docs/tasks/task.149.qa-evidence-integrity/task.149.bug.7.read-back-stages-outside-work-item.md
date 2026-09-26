# Bug Report: Task 149 - Pass 1 stages any untracked link target in the repository, directories included

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 4)
**Date Found**: 2026-09-26

## Description

Pass 1 runs `git add` on every `untracked` target the document links (cycle-4 review CR-3). That
includes an untracked **directory**, since doc-links accepts directory links, and files **outside the
work-item directory**. A QA read-back can therefore sweep unrelated uncommitted work into the index
for the QA commit. That is the other-session contamination the develop pipeline's Step 4 scoping
exists to prevent.

## Recommendation

Auto-stage only regular files under the work item's own directory. Any other `untracked` target
blocks, with a message saying to stage it deliberately. Add block-test scenarios for a linked
untracked file outside the directory and for a linked untracked directory.

## Developer Fix Cycle

### Iteration 1

**Move: consolidate the contract** (qa-fix Step 2.6, taken on the pipeline's narrowing-residue offer:
every MEDIUM on gates 3 and 4 named `skills/qa-task/SKILL.md`). The read-back logic moved out of two
fenced blocks into one bundled script, `shared/resources/qa-read-back.js`, tested directly by
`shared/resources/tests/qa-read-back.test.mjs` (14 cases, task- and story-shaped fixtures, five mutations
red). Each SKILL.md block is now one call.

Pass 1 stages only `untracked` link targets that are **regular files under the work item's directory**.
Anything else (a directory, or a file elsewhere in the repository) is reported and halts, so a human
stages it deliberately. Tests: an untracked link outside the work item halts and is not staged, an
untracked directory link halts, and an unrelated untracked file is not staged. Mutation: staging
anywhere turns two tests red.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 4 |
| 2026-09-26 | Ready for QA | qa-fix | Fixed in qa-fix cycle 4 |
