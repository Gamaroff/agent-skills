# Bug Report: Task 123 - 'three routes' / 'routes 1–3' survives in seven consumers after §5c grew to five

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 1, diff code review CR-4 — verified)
**Date Found**: 2026-09-19

## Description
The `three routes` → `five routes` edit was applied where the diff happened to look (step doc, two resume-contract artifact rows, the parity test), but the population of files stating §5c's route cardinality was never enumerated. `grep -rn 'three routes\|routes 1–3'` still hits: `develop-pipeline-resume-contract.md:129` (the 5c sub-state table, a changed file), `docs/runbooks/qa-flow.md:184` (a changed file), `skills/review-pr/SKILL.md:555`, `shared/resources/pr-conformance-prompt.md:64`, `shared/resources/qa-findings-ingester-prompt.md:28,172`, `docs/runbooks/story-development.md:298`, `docs/runbooks/task-development.md:180`.

## Steps to Reproduce
See the QA report (`task.123.qa.1.qa-loop-exits-and-re-entry.md`, Code Review section, CR-4) — the reproduction is in the finding.

## Expected Behavior
Every consumer that states the cardinality of §5c's accepting-route set states the current one, and a test enumerates the population so the next change cannot miss a site.

## Actual Behavior
Seven sites say three; §5c says five. The set is stated once by design (task.116) and its consumers are supposed to point, not restate — restating the count is the same enumeration-drift class.

## Impact
A reader of the conformance prompt or the findings ingester is told a route-2b/2c gate cannot reach 5c.

## Recommendation
Fix every hit; add `assert.doesNotMatch(text, /three (accepting )?routes|routes 1–3/)` to the `consumers` loop in `pr-review-loop-parity.test.mjs` (and add `pr-conformance-prompt`, `ingester prompt`, both runbooks and `review-pr` SKILL.md to that loop where absent) so the population is checked, not listed by hand.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 1 (CR-4) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 1 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: The route count was edited where the diff looked; the population of consumers restating §5c's cardinality was never enumerated.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- All seven sites now say five routes (the conformance prompt lists them: 1, 2, 2b, 2c, 3).
- `pr-review-loop-parity.test.mjs` reads §5c's count (`**N routes out of 5a**`) and fails any of 15 restaters (the seven consumers, the loop doc, both SKILL.md, the step-4/step-7 docs, the banner catalogue, finalise and qa-fix) that states a different count or `routes 1–3`. Mutation-proven: reintroducing one "three" turns it red.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md`, `docs/runbooks/qa-flow.md`, `skills/review-pr/SKILL.md`, `shared/resources/pr-conformance-prompt.md`, `shared/resources/qa-findings-ingester-prompt.md`, `docs/runbooks/story-development.md`, `docs/runbooks/task-development.md`
- `evals/shared/tests/pr-review-loop-parity.test.mjs`

**Testing**:
- parity 30/30; mutant (one restored "three") → 1 red.

**Verification Steps for QA**:
1. `grep -rn "three routes\|routes 1–3" shared skills docs --exclude-dir=references` → no hits outside historical task.116 artifacts.
| 2026-09-19 | Closed | QA | Verified in QA cycle 2 (refute pass): fix present on `b9c32281`, suites green |
