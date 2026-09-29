# QA Report: Task 163 - Close task.162's step-8 follow-ups (cycle 2)

**Task**: [task.163.stop-hook-step-8-follow-ups.md](./task.163.stop-hook-step-8-follow-ups.md)
**Gate File**: [task.163.gate.2.stop-hook-step-8-follow-ups.yml](./task.163.gate.2.stop-hook-step-8-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Testing Completed**: 2026-09-28
**Gate Status**: CONCERNS

---

## Executive Summary

This cycle re-reviewed PR #506 after the cycle-1 fix (`555a93f2`), with a full-branch refute pass. That fix closed both cycle-1 findings as written, but the refute pass found a MEDIUM defect in the fix itself. The banner doc's new exception is keyed on the lock's value, so it also fires on the ordinary Step 7 → 8 transition. Three LOW findings sit on the same subject. The suites stay green; the defect is in prose guidance.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix CR-1)

---

## Re-Review Context

| Previous issue (gate 1) | Status | Evidence |
| --- | --- | --- |
| CR-1 — banner doc's steps-ahead rule disagreed with the hook's lock-8 clause | PARTIAL | The exception was added, but it is scoped to "a lock at 8", which is too broad (see this cycle's CR-1) |
| CR-2 — "Part B's Step 7 Completion Checklist" misattributed the checklist | PARTIAL | "Part B's" was removed, but the checklist is still listed inside Part B's "meaning …" list (this cycle's CR-2) |

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-remaining-work-banner.md:82` — the exception keys on "a lock at 8". The Step Transition Protocol runs action 1 (the lock advance to 8) before action 3 (the status block), so the Stop hook's stall-re-entry list reaches the ordinary Step 7 → 8 transition and a Step 8 HALT. The exception also covers only the list, while the hook changes the position too → scope it to a Stop-hook re-prompt.
- **[low]** `shared/resources/develop-pipeline-on-stop.sh:259` — the checklist is still inside Part B's "meaning …" list, and the parity test pins it there → close Part B's list before the checklist.
- **[low]** `shared/resources/develop-pipeline-on-stop.sh:295` — the lock-8 list names Step 7's tail only, while the completion line beside it covers any unfinished row at or below Step 7 → word it after the rule.
- **[low]** `shared/resources/tests/step-8-completion-checklist.test.mjs:757` — the banner↔hook test only checks that the phrase is present → anchor it to scope and position.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (None)
- [x] Code on feature branch with open PR (#506, OPEN)

### Review Methodology

Direct tools, plus one read-only Explore subagent. Cycle 2 has exactly one prior gate, so the diff code review ran as a **refute pass** over the whole branch diff: 27 files, 1,525 lines, with the refute directive appended. `SAFETY_REPROBE` is false, because the prior gate read security `OK reasoned`.

```
Re-review scope: unscoped (cycle 2 refute pass — whole branch diff)
```

Step 4b ran over the two changed runnable-prose candidates:

- `develop-pipeline-resume-contract.md`: 30 blocks (2 runnable, 8 placeholder, 20 mutating), 0 findings, bash and zsh. The skipped blocks are the same as cycle 1, and the diff changes no fence.
- `develop-pipeline-remaining-work-banner.md`: 0 fenced bash blocks, so Step 4b does not apply.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The step-8 text is complete and consistent | CONCERNS | Verified | CR-2 and CR-3 (LOW) are wording on the hook and contract |
| Phase 2: The guards have floors and fail in the right place | CONCERNS | Verified | CR-4 (LOW): the banner test is too weak |
| Phase 3: Proof and gates | PASS | Verified | M1–M9 reproduced in this review |

The CR-1 banner-doc work lives outside the task's original phases, as a cycle-1 fix.

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| develop-bug reason at lock 8 names the checklist | PASS | The checklist is named; grammar is CR-2 |
| Contract names the same checklist; parity red on either drop | PASS | M1, M2 and M9 go red |
| Lock 8 has no generic clause; lock 3 keeps it | PASS | 5d and 5c; the lock-8 list scope is CR-3 |
| Population test red when the hook contributes nothing | PASS | M4 |
| 4b setup names a missing command; builtin skipped | PASS | M5 and M6 (dev-only) |
| No measurable performance change | PASS | |
| Gates green | PASS | 47/0, 95/0, 90/0, 18/0; `validate` 9/9 |
| CHANGELOG cites (task 163) | PASS | |

---

## Breaking Changes Validation

None. **Overall:** PASS

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3. They are listed under **New Findings This Cycle** above. No bug report file was created for the MEDIUM finding, because it is tracked as gate entry CR-1 and is being fixed in the loop's next 5b.

---

## NFR Assessment

### Performance — PASS

Text and tests only.

### Reliability — PASS

The hook output is well-formed at every step. CR-1 is guidance an orchestrator reads, not hook output.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The same candidates were named as in cycle 1, plus one new test function, which accepts nothing.

### Maintainability — PASS

CR-4 is a claim-scope issue in one test, not a maintainability failure.

---

## Code Review

Refute pass (Explore). Under `code_review_blocking=true`, **CR-1 (bug, high confidence) was promoted to `top_issues[]` automatically** as MEDIUM. CR-2, CR-3 and CR-4 were entered by QA judgement as LOW, because they concern the same subject and are fixed in the same edit.

**Correctness bugs (3):**
- [medium/high] `shared/resources/develop-pipeline-remaining-work-banner.md:82` — CR-1, exception scope → scope it to a Stop-hook re-prompt.
- [low/medium] `shared/resources/develop-pipeline-on-stop.sh:259` — CR-2, checklist inside Part B's list → close the list first.
- [low/medium] `shared/resources/develop-pipeline-on-stop.sh:295` — CR-3, list narrower than the rule → "the first unfinished row at or below Step 7, if any, then Step 8".

**Cleanups (1):**
- [low/high] `shared/resources/tests/step-8-completion-checklist.test.mjs:757` — CR-4, the test checks only that the phrase is present.

Boundary rule: `boundary: false`, `probes_executed: 0`.

Mutation-proof spot check. QA re-ran the development script (M1–M9) with a `cmp`-checked restore, and the tree was unchanged afterwards:

- mutation-proven: banner doc lock-8 exception removed → "the banner doc and the Stop hook list the same steps ahead at lock 8" → covered. It is covered, but only for presence (CR-4).
- mutation-proven: hook develop-bug tail reverted to "Part B's" wording → 5b develop-bug + parity test → covered
- M1–M7: same outcomes as cycle 1 (covered ×5, dev-only, absorbed)

---

## Regression Testing

| Area | Result |
| --- | --- |
| `develop-pipeline-on-stop.test.sh` | PASS 47/0 |
| `advance-pipeline-lock.test.sh` | PASS 95/0 |
| `step-8-completion-checklist.test.mjs` | PASS 90/0 |
| `develop-pipeline-on-precompact.test.sh` | PASS 18/0 |
| `npm run validate` on the 9 affected skills | PASS 9/9 |

---

## Test Artifacts

### Test Commands Executed

```bash
bash shared/resources/develop-pipeline-on-stop.test.sh
bash shared/resources/advance-pipeline-lock.test.sh
node --test shared/resources/tests/step-8-completion-checklist.test.mjs
bash shared/resources/develop-pipeline-on-precompact.test.sh
npm run validate -- skills/<s>/
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed .md> --json
bash t163-mutate2.sh   # M1–M9
```

### Coverage Report

Not applicable. The change set is shell and Markdown, and coverage is carried by the mutation proofs.

---

## Recommendations

### Immediate Actions (Blocking)

1. CR-1: scope the banner-doc exception to a Stop-hook re-prompt.

### Short-term Actions (Non-Blocking)

1. CR-2, CR-3 and CR-4, fixed in the same edit.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One MEDIUM finding (CR-1, a defect in the cycle-1 fix) and three LOW findings on the same subject.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed and re-reviewed

---

**Next Steps**: qa-fix cycle 2, then re-review.
