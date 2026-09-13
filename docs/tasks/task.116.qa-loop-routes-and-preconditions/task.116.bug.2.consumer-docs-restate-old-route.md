# Bug Report: Task 116 - Consumer docs still restate "CONCERNS → qa-fix"

**Task**: [Link](./task.116.qa-loop-routes-and-preconditions.md)
**Bug ID**: TASK-116-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (Step 6 breaking-change sweep)
**Date Found**: 2026-09-13

## Description

The task's one behaviour change — a `CONCERNS` gate with no open finding now reaches 5c instead of 5b — is recorded in CHANGELOG and in the canonical loop document, but five lines across three consumer documents still state the pre-route-3 rule:

- `docs/runbooks/story-development.md:235` — "If `CONCERNS`/`FAIL`, `qa-fix` runs."
- `docs/runbooks/story-development.md:272` — "Applies fixes for `CONCERNS`/`FAIL` gates"
- `docs/runbooks/task-development.md:114` — "If `CONCERNS`/`FAIL`, `qa-fix` runs."
- `docs/runbooks/task-development.md:149` — "Applies fixes for `CONCERNS`/`FAIL` gates"
- `docs/runbooks/qa-flow.md:21` — mermaid edge `B -->|CONCERNS/FAIL| D[qa-fix]`

## Expected Behavior

Consumer docs say what the pipeline does: `FAIL`, or `CONCERNS` with an open finding, runs `qa-fix`; `CONCERNS` with no open finding hands to `review-pr`.

## Actual Behavior

They restate the verdict-token rule the task removed.

## Impact

A reader of the runbooks predicts a halt the pipeline no longer produces (or, worse, hand-steers around a route that now exists). Behaviour changes in this repo need a doc sweep — ~8–10 consumer docs restate pipeline behaviour independently and drift silently.

## Recommendation

Reword the five lines to key on an open finding rather than the token; in `qa-flow.md` split the mermaid edge into `FAIL / open finding → qa-fix` and `PASS / WAIVED / CONCERNS-no-open → review-pr`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-13
**Developer**: Claude (qa-fix, cycle 1)

**Root Cause Analysis**: the behaviour change was recorded in the canonical loop doc and CHANGELOG but the doc sweep over consumer runbooks was not done — the known drift class (~8–10 docs restate pipeline behaviour independently).

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-13

**Fix Description**: reworded all five lines to key on an open finding — `docs/runbooks/story-development.md` (:235, :272), `docs/runbooks/task-development.md` (:114, :149); split the `docs/runbooks/qa-flow.md` mermaid edges into `FAIL, or any open finding → qa-fix` and `PASS / WAIVED / CONCERNS with no open finding → review-pr`.

**Testing**: `grep -rn 'CONCERNS/FAIL\|If .CONCERNS' docs/runbooks docs/operations docs/concepts docs/reference` → no remaining restatement. `docs-link-check` unaffected (no links changed).

**Verification Steps for QA**: re-run the sweep grep; read the mermaid renders.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-09-13 | New          | QA         | Found in Step 6 breaking-change sweep (DOC-1) |
| 2026-09-13 | In Progress  | qa-fix     | Investigation started          |
| 2026-09-13 | Ready for QA | qa-fix     | Five lines reworded            |
