# QA Report: Task 184 - qa-results carried-block and log residuals

**Task**: [task.184.qa-results-carried-block-and-log-residuals.md](./task.184.qa-results-carried-block-and-log-residuals.md)
**Gate File**: [task.184.gate.1.qa-results-carried-block-and-log-residuals.yml](./task.184.gate.1.qa-results-carried-block-and-log-residuals.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-13
**Testing Completed**: 2026-10-13
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #644 (head `af294361`). The three planned shapes (5c CR-1 kept, 5c CR-2 refused, gate 6 CR6-1 refused) behave exactly as the success criteria state, and every new test is mutation-proved against committed tests. The independent diff review found one new defect: the `carried-tail:` rule refuses a document the engine's own write produces, so a later QA cycle would halt on its own output (CR-1, medium/high). Nothing is deleted; the defect is liveness.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4 checked)
- [x] Tests passing (`npm run ci:fast`, 5441 tests, 0 failures)
- [x] Breaking changes documented (§ 5, two refusals with migration)
- [x] Code on feature branch with open PR (#644, OPEN)

### Testing Approach

- [x] Automated Testing (engine, corpus, wiring suites; full fast gate)
- [x] Performance Testing (timed suites)
- [x] Regression Testing (corpus write survey; base-vs-head reproduction)
- [x] Security Review (boundary decision recorded)
- [x] Code Review (Step 3b independent reviewer)

### Review Methodology

Direct tools, plus one Step 3b reviewer subagent (Explore, read-only), dispatched 08:01:46 UTC, returned after 332 948 ms (`duration_ms` from its completion notice). First review — no prior gate; the scope is the whole `origin/develop...HEAD` diff (753 lines, the task's own artifacts excluded). The reviewer checked the base engine with exhaustive marker-less log combinations (2 levels × 7⁵), a 60k random carried-block fuzz and the 249-document corpus write survey (0 differences).

Step 4b: the change set modifies two `SKILL.md` files with fenced bash blocks. `qa-execute-snippets.mjs` over each: qa-task 1 runnable / 3 placeholder / 18 mutating, qa-story 1 / 4 / 16, 0 findings, shells `bash` only (`zsh-unavailable` on this host). The one changed block in each file — the Step 12 writer (qa-task `:1496`, qa-story `:2005`) — is refused `unrecognised-command: node (fail-closed)`; it is executed by `tests/qa-results-step12-wiring.test.js`, which passed.

---

## New Findings This Cycle

_First review — every finding is new._

- **[medium]** `shared/resources/qa-results.js:218` — CR-1: the tail rule fires when a bold `**Bug Reports**` block stops at a second carried label whose list follows a lead paragraph; the engine writes that shape, and its next write refuses it → record no tail when the stopping label opens its own carried block, and check the output in `checked()`.
- **[low]** `shared/resources/qa-results.js:224` — CR-2: the list-item/table-row regex is written twice (here and `introducesList`) → hoist to one constant.
- **[low]** `shared/resources/qa-results.js:629` — CR-3: `aboveTbl` repeats `underTablelessLog`'s "directly under a marker-less log" condition → compute it once.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: keep a nested block's tail (5c CR-1) | PASS | R5 green, mutation M1 → R5 red | `labelLen` stored; union in `carriedBlocks` |
| Phase 2: refuse under an ambiguous marker-less log (5c CR-2) | PASS | R3, R6 green; M2a → R3, R6 red; M2b → R6 red | R6 carries a third shape that holds the `underLog` term |
| Phase 3: refuse a carried list behind a label and a paragraph (CR6-1) | CONCERNS | R7 green; M3 → R7 red | CR-1: the rule also fires on an adjacent carried block |
| Phase 4: wording, hygiene, CHANGELOG | PASS | `bundle:check` 0, `validate` clean | R2 trimmed, R4 renamed; 7 task.183 passages + 1 row |

**Overall Phase Completion**: 4/4 implemented; 3 PASS, 1 CONCERNS

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| CR-1 nested shape keeps `[a]`, `[b]` once, `replaced` ×3 | R5 (`qa-results.test.mjs`), mutation M1 covered | PASS |
| CR-2 both variants refuse, `structural-line:` names the quoted row, unchanged | R6, M2a covered | PASS |
| CR3-2 shape refuses with `structural-line:\| 2026-09-25 \| 1.0 \| log-row \| y \|`; G1 still `replaced` | R3; G1 in suite green | PASS |
| CR6-1 refuses with `carried-tail:- [b](./b.md)`; R4 cases unchanged | R7, M3 covered; R4 green | PASS (with CR-1 against the same rule) |
| Suites under 2 s, `uptime` recorded | 1.08 s, load 0.55 (`time -p`; `/usr/bin/time` absent) | PASS |
| No network access: one `require(`, of `./change-log.js` | `grep -c 'require(' shared/resources/qa-results.js` → 1 | PASS |
| Corpus write survey 0 / 0 / 0 | `tests/qa-results-corpus.test.js` green | PASS |
| R5, R6, R7 mutation-proved, recorded | Proofs below | PASS |
| `ci:fast`, `bundle:check`, `validate` clean | 5441/0; 0 problems; qa-task, qa-story ✓ | PASS |
| CHANGELOG `(task 184)`; task 183 entry narrowed | `CHANGELOG.md:919`, task 183 bullet | PASS |
| Seven task.183 passages amended + one Change Log row | diff of task.183 doc | PASS |

---

## Breaking Changes Validation

### Breaking Change: marker-less log with a non-Date-first Date table above the section now refuses
Documented: Yes · Migration Path Provided: Yes (§ 5.1) · Migration Tested: Yes (R3, R6) · Consumer Code Updated: N/A

### Breaking Change: a carried list behind a label and a paragraph now refuses
Documented: Yes · Migration Path Provided: Yes (§ 5.2) · Migration Tested: Yes (R7) · Consumer Code Updated: N/A — but see CR-1: the same refusal also reaches a shape the engine itself writes, which § 5 does not describe.

**Overall Breaking Changes Assessment:** CONCERNS (CR-1)

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: carried-tail refuses a document the engine itself wrote**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.184.bug.1.carried-tail-refuses-engines-own-write.md](./task.184.bug.1.carried-tail-refuses-engines-own-write.md)
- **Observation**: reproduced — `**Bug Reports**` / `- [a]` / `### Notes` / `**Deferred Work**` / `Carried from cycle 3:` / `- CR-1 thing`, three writes: head `replaced`, `unbounded` (`carried-tail:- CR-1 thing`), `unbounded`; base `replaced` ×3.
- **Impact**: a QA loop halts at Step 12 on its own previous output. Nothing is lost.
- **Recommendation**: see the bug report.
- **Priority**: P2

### LOW Severity Issues (2)

CR-2 and CR-3 (cleanups, advisory) — see New Findings.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
Suites 1.08 s at load 0.55; the look-ahead is linear in the lines after a stop.

### Reliability — CONCERNS
CR-1: a write the engine produces is refused by its next write. Refusal is the safe direction, but the loop halts.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` — `shared/resources/qa-results.js#upsertQaResults` judges a work-item document and a section this pipeline renders. The only document sink, `markdown-structure`, models the implementation report, and the disqualified-entries table lists only `report-lint.js#lintReport`. Same decision as task.183 gates 1–6.

### Maintainability — PASS
Each rule carries its task and finding id. CR-2 / CR-3 are advisory cleanups.

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `shared/resources/qa-results.js:218` — CR-1, as above. Promoted to gate `top_issues` (`code_review_blocking=true`).

**Cleanups (2):**
- `shared/resources/qa-results.js:224` — CR-2: duplicated list/row regex → one constant.
- `shared/resources/qa-results.js:629` — CR-3: repeated under-log predicate → compute once.

All three anchors checked with `finding-anchors.js --rev HEAD`: `ok`.

Provenance (CR-1): base `origin/develop` writes the reproduction `replaced` ×3 — introduced by this change, and in scope (Phase 3's rule).

Boundary: `internal` (see Security). `probes_executed: 0`.

mutation-proven: carriedBlocks union disabled → R5 → covered
mutation-proven: `ambiguousAbove` dropped from the cut condition → R3, R6 → covered
mutation-proven: `ambiguousAbove` dropped from `underLog` → R6 → covered
mutation-proven: Phase 3 look-ahead disabled → R7 → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| qa-results engine suite | 88/88 PASS |
| Corpus write survey (`tests/qa-results-corpus.test.js`) | PASS — 0/0/0 |
| Step 12 wiring (both writer blocks) | PASS |
| Deferred Work placement, create-bug-report heading | PASS |
| Full fast gate | 5441 tests, 0 failures |

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `CHANGELOG.md`, the task.183 document.

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js
npm run ci:fast
npm run bundle:check
npm run validate -- skills/qa-task/ ; npm run validate -- skills/qa-story/
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --json
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-story/SKILL.md --json
node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings.json> --root . --rev HEAD --json
```

### Coverage Report
Not measured — the repository has no coverage tooling for `node --test` suites.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR-1 and add the three-write test (P2).

### Short-term Actions (Non-Blocking)
1. CR-2, CR-3 cleanups.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium finding, promoted under `code_review_blocking`; reliability NFR CONCERNS.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed

---

**QA Report**: co-located at `task.184.qa.1.qa-results-carried-block-and-log-residuals.md`
**Gate File**: co-located at `task.184.gate.1.qa-results-carried-block-and-log-residuals.yml`
**Next Steps**: `/qa-fix` cycle 1 for CR-1; re-review at cycle 2 (refute pass).
