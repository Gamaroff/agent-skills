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

### Iteration 2

#### QA Verification (Ready for QA → Reopened)

**Date**: 2026-09-13 (QA cycle 2, CR-3 and CR-5)

**Reopening reason**: PARTIAL. The five lines were reworded, but (a) the new wording — "`qa-fix` runs on … any gate with an open `top_issues[]` entry" — is now *wrong* for an active `WAIVED` gate, which carries its HIGH entries open and hands to 5c, and the same rows still say "a `PASS`/`WAIVED` gate hands to `review-pr`" although arm 5 sends a `PASS` with an open LOW to 5b; (b) three more sentences carry the two-route premise: `docs/runbooks/qa-flow.md:167`, `shared/resources/qa-findings-ingester-prompt.md:28`, and the loop doc's own Convergence-check preamble (`develop-pipeline-step-5-6-qa-loop.md:377` "A gate that hands to 5c (`PASS` / `WAIVED`)").

**Re-fix required**: state the accepting-route set once (§5c) and have every consumer sentence point at it or match it exactly — `qa-fix` runs on `FAIL` or an open entry not covered by an active waiver; `PASS`/`CONCERNS` with no open entry and active `WAIVED` hand to `review-pr`.

#### Fix Implementation — Iteration 2 (In Progress → Ready for QA)

**Date**: 2026-09-13

**Fix Description**: the four runbook rows now say "`qa-fix` runs on `FAIL`, or on an open `top_issues[]` entry that no active waiver covers; a non-`FAIL` gate with no open finding, or an active `WAIVED`, hands to `review-pr` (the accepting-route set, stated once in §5c)" and "a gate in the accepting-route set hands to `review-pr`"; the qa-fix rows read "`FAIL` gates and open entries no active waiver covers". The three further sentences — `qa-flow.md:167`, `qa-findings-ingester-prompt.md:28`, the Convergence-check preamble — name the set the same way; the mermaid edge reads `no open finding, or active WAIVED`.

**Testing**: "stated once" test pins the ingester prompt, `qa-flow.md` and the Convergence preamble against the token-pair premise; mutation-proved (ingester revert → red).

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-09-13 | New          | QA         | Found in Step 6 breaking-change sweep (DOC-1) |
| 2026-09-13 | In Progress  | qa-fix     | Investigation started          |
| 2026-09-13 | Ready for QA | qa-fix     | Five lines reworded            |
| 2026-09-13 | Reopened     | QA         | Cycle 2: partial — see Iteration 2 |
| 2026-09-13 | Ready for QA | qa-fix     | Cycle 2: iteration 2 fix |
