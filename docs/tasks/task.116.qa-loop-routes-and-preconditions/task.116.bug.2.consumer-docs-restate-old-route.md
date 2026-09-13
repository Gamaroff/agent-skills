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

### Iteration 3

#### QA Verification (Ready for QA → Reopened)

**Date**: 2026-09-13 (QA cycle 3)

**Reopening reason** (cycle 3, CR-6): six more two-route lines in unchanged parts of changed files — `qa-flow.md:70-80` ("Clean gate | PASS / WAIVED" in the How-the-loop-ends table), loop doc `:18-23` ("two ways the loop reaches Step 7"), `:317-318` ("On a clean gate 5a writes pending" — undefined for route 3), `:1002`, and the verification snippets `story-development.md:297` / `task-development.md:179` ("Gate file exists and is PASS or WAIVED"). **Re-fix**: sweep to "a gate in §5c's accepting-route set"; add route 3 as a row of the table; 5a writes the `pending` placeholder on any gate that routes to 5c.

#### Fix Implementation — Iteration 3 (In Progress → Ready for QA)

**Date**: 2026-09-13 (qa-fix, cycle 3)

**Fix Description**: every consumer now carries a **pointer** ("any of §5c's three routes") and no paraphrase: loop doc :18–23 (three routes, all through 5c), :317 (`pending` placeholder on any gate that routes to 5c), :1002, Convergence preamble; `qa-flow.md` How-the-loop-ends table gains the route-3 row and its intro says four ways / three to 5c; `story-development.md:297` and `task-development.md:179` verification snippets read the cycle entry's Action row; the ingester prompt and both runbook rows point at §5c. The parity test now forbids six paraphrase shapes in six consumers and requires the `§5c` pointer in each.

**Testing**: `pr-review-loop-parity` 29/29; `npm run ci:fast` 3269/3268/0.

### Iteration 4

#### QA Verification (Ready for QA → Reopened)

**Date**: 2026-09-13 (QA cycle 4, CR-2/3/4)

**Reopening reason**: pointers landed, but (a) the runbook verification snippets' *commands* still grep the gate token while their new comment says to read the Action row (`story-development.md:297`, `task-development.md:179`); (b) `qa-findings-ingester-prompt.md:172` still says "the gate that sent the run to 5c reads `PASS`"; (c) `skills/review-pr/SKILL.md:194,546` still state the predicate as the token pair while the prompt they load forbids it. **Re-fix**: make the snippet check what the comment says (grep the implementation report's last `### QA Cycle` entry for `**Action**: Proceeding to 5c`); reword :172; point both review-pr sentences at §5c and the Action row.

#### Fix Implementation — Iteration 4 (In Progress → Ready for QA)

**Date**: 2026-09-13 (qa-fix, cycle 4)

**Fix Description**: runbook verification snippets now grep the implementation report's last `### QA Cycle` entry for `**Action**: Proceeding to 5c` (the check matches its comment); `qa-findings-ingester-prompt.md:172` → "carries no open fix target on any of §5c's three routes"; `skills/review-pr/SKILL.md:194,546` point at §5c and the Action row; `qa-flow.md` Clean-gate row → "route 1 — … (see §5c)". `review-pr/SKILL.md` added to the parity test's paraphrase-forbidden consumers.

**Testing**: `pr-review-loop-parity` 30/30; mutation (review-pr sentence reverted) → red.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-09-13 | New          | QA         | Found in Step 6 breaking-change sweep (DOC-1) |
| 2026-09-13 | In Progress  | qa-fix     | Investigation started          |
| 2026-09-13 | Ready for QA | qa-fix     | Five lines reworded            |
| 2026-09-13 | Reopened     | QA         | Cycle 2: partial — see Iteration 2 |
| 2026-09-13 | Ready for QA | qa-fix     | Cycle 2: iteration 2 fix |
| 2026-09-13 | Reopened     | QA         | Cycle 3: partial — see Iteration 3 |
| 2026-09-13 | Ready for QA | qa-fix     | Cycle 3: Iteration 3 fix |
| 2026-09-13 | Reopened     | QA         | Cycle 4: three stale sentences + snippet commands |
| 2026-09-13 | Ready for QA | qa-fix     | Cycle 4: iteration 4 fix |
