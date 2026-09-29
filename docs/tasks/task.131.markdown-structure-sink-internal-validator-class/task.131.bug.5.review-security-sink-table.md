# Bug Report: Task 131 - /review-security still lists five sinks and routes a two-argument validator to unverifiable

**Task**: [Link](./task.131.markdown-structure-sink-internal-validator-class.md)
**Bug ID**: TASK-131-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 2 refute review, verified)
**Date Found**: 2026-09-30

## Description

`shared/resources/security-review-prompt.md` names `url-authority`, `sql-orm`, `shell-exec`, `path`, `template-render` and says "No sink fits → report unverifiable". It does not know `markdown-structure` or `--args-json`.

## Expected Behavior

/review-security can probe a `(text, opts)` document validator through `markdown-structure` with `--args-json`.

## Actual Behavior

/review-security on `lintReport` reports `unverifiable` — the task.124 outcome.

## Recommendation

Add `markdown-structure` (and `filename`) to the sink table; document `--args-json` where the entry point is chosen.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: A second enumeration of the sinks, in the /review-security prompt, was not updated with the new sink or flag.

**Fix Description**: Sink table gains `filename` and `markdown-structure`; the entry-point rule now reads `await fn(input, ...args)` with `--args-json`, and names lintReport as the worked case; a new corpus test asserts every SINKS entry is named in both prompts that enumerate sinks.

**Files Modified**: `shared/resources/security-review-prompt.md`, `shared/resources/tests/security-input-corpus.test.mjs` (+ bundled copies)

**Testing**: Mutation-proven: removing the coded `markdown-structure` mentions → the new test red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Filed from QA cycle 2 |
| 2026-09-30 | Ready for QA | qa-fix | Fix implemented (cycle 2) |
| 2026-09-30 | Closed | QA Engineer | Verified in QA cycle 3 (gate.3) |
