# Bug Report: Task 173 - The 5c classifier is silent on findings it could not parse

**Task**: [task.173.fold-5c-review-into-acceptance-commit.md](./task.173.fold-5c-review-into-acceptance-commit.md)
**Bug ID**: TASK-173-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, code review CR-2)
**Date Found**: 2026-10-08

## Description

The 5c classifier (`develop-pipeline-step-5-6-qa-loop.md:1434`) prints nothing and exits 0 both when
there is nothing to classify and when it could not parse the report: a missing `## Machine-Readable
Findings` section or `yaml` fence, an entry whose first key is not `id:`, or an entry with no `ref:`.

## Expected Behavior

Every `- id:` entry produces exactly one `doc-only` or `record` line; a missing section/fence, or an
entry that produced no line, is a HALT. An empty-but-present `findings: []` is a clean zero.

## Actual Behavior

Unparsed findings are neither fixed nor recorded as not fixed — the `empty` vs `broken` confusion.

## Recommendation

Count entries vs printed lines; exit non-zero naming the gap.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-08

**Fix Description**: the classifier exits 1 when the `## Machine-Readable Findings` section or its
`yaml` fence is missing, or when the number of list entries differs from the number of lines it
printed; the shell HALTs with "cannot classify". An empty list is still a clean zero.

**Testing**: four cases (no section, entry without `ref:`, entry whose first key is not `id:`, empty
list) under bash and zsh; mutation-proved (count check removed → red).

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-08 | New | qa-task | QA cycle 1, CR-2 |
| 2026-10-08 | Ready for QA | qa-fix | Fixed in QA cycle 1 fix pass |
