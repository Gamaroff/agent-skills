# QA Report: Task 164 - Close task.163's deferred follow-ups (cycle 2)

**Task**: [Link to task document](./task.164.task-163-deferred-follow-ups.md)
**Gate File**: [task.164.gate.2.task-163-deferred-follow-ups.yml](./task.164.gate.2.task-163-deferred-follow-ups.yml)
**Previous Gate**: [task.164.gate.1.task-163-deferred-follow-ups.yml](./task.164.gate.1.task-163-deferred-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| QA-164-1 (medium): "One exception" plus a HALT rule that overrides it | FIXED | The rule now opens "Two firing points are exceptions…", then Exception 1 and Exception 2. F1 (carve-out removed) and F4 ("One exception" restored) each red |
| QA-164-2 (low): story/task-only HALT example | FIXED | `{STEP-NAME}` with FINALISE / FINALISE & CLOSE. The pin reads the names off the hook. F2 red |
| QA-164-3 (low): restatement check covered the exception span only | FIXED | The fragments are checked against the whole doc. F3 (fragment placed in Exception 2) red |
| QA-164-4 (low): spawnSync timeout read as bare `null` | FIXED (partially accurate comment, see QA-164-8) | `why` = status, signal, error on the status assertions. Diagnostic text, so dev-only |

**Re-review scope**: unscoped. This is cycle 2, the mandatory refute pass over the whole `origin/develop...HEAD` diff (1323 lines, 13 files). The prior gate had no security FAIL and no `unverified` evidence, so `SAFETY_REPROBE` was false.

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-remaining-work-banner.md:92`. Exception 2 explains the HALT/`current_step` difference only at lock 8. `develop` (→4) and `create-pr` (→5) also self-advance before their step's tail runs, confirmed from `advance-pipeline-lock.sh:400-409` and the self-advance blocks in `skills/{develop,create-pr,finalise}/SKILL.md`. (`review-task` has none.) → State it generally, with lock 8 as the example (QA-164-5)
- **[low]** `CHANGELOG.md:316`. The entry still gives the story/task-only HALT example → name both (QA-164-6)
- **[low]** `shared/resources/develop-pipeline-remaining-work-banner.md:91`. "starts at that step" is not stated as "the halted step is listed first", and nothing pins it → state it plainly and pin it (QA-164-7)
- **[low]** `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs:11`. The comment says "every assertion message", but only the status checks carry `why` → carry it in all of them (QA-164-8)
- **[low]** `shared/resources/advance-pipeline-lock.test.sh:137`. In the direct `npm test` run, a developer-exported seam changes 4b silently → print a notice when the seam is set (QA-164-9)

Provenance: all five were introduced on this branch. QA-164-8 comes from cycle 1's own fix.

**Severity note.** The reviewer rated CR-1 medium/medium, and QA keeps MEDIUM. Exception 2's operative sentence ("the step being executed when it halted") is already general and correct. The explanation that follows names one case of several, and that is the narrow restatement pattern this task was opened to remove.

---

## Review Methodology

Direct tools, plus an independent Explore reviewer for Step 3b with the REFUTE PASS directive appended. The reviewer refuted cycle 1's fixes first, then read the whole change and checked for stale references to the old anchors elsewhere in the repository. It found none; the only remaining one is the CHANGELOG (QA-164-6).

Step 4b: not applicable. The banner doc still has no fenced bash block.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: banner doc | CONCERNS | QA-164-5 (medium), QA-164-7 (low) |
| Phase 2: tests | PASS | Cycle-1 pins proven (F1–F4) |
| Phase 3: 4b seam + meta-test | CONCERNS | QA-164-8, QA-164-9 (low) |
| Phase 4: proof and gates | CONCERNS | QA-164-6 (CHANGELOG, low) |

---

## Success Criteria Verification

Unchanged from cycle 1: every functional criterion is met and mutation-proven. The HALT-rule criterion is met; its explanation is incomplete (QA-164-5). Code quality: `ci:fast` 4337 pass, 0 fail, 1 skipped at `b49b7761` with `.agents/skills` aside. `bundle:check` rc 0. `npm run validate` rc 0 for develop-bug, develop-story and develop-task (this review).

---

## Breaking Changes Validation

**Overall:** PASS. There is still one printed-output change, and `halt_step` is untouched.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4 (see New Findings). No separate bug file; the findings are in the gate's `top_issues[]` for this pipeline's `/qa-fix`.

---

## NFR Assessment

### Performance — PASS
No production change.

### Reliability — PASS
The hook is unchanged; `halt_step` is untouched.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, unchanged from gate 1. The candidate considered was 4b's `case` over `command -v` output; it lacks the boundary signal because it is test-fixture setup and not a guard on an action.

### Maintainability — CONCERNS
QA-164-5.

---

## Code Review

**Correctness bugs (3):**
- [medium/medium] `shared/resources/develop-pipeline-remaining-work-banner.md:92`: the lock-ahead case is explained only at lock 8 (→ QA-164-5)
- [low/high] `CHANGELOG.md:316`: the story/task-only HALT example (→ QA-164-6)
- [low/low] `shared/resources/develop-pipeline-remaining-work-banner.md:91`: the halted step being listed first is not stated or pinned (→ QA-164-7)

**Cleanups (2):**
- `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs:11`: the comment overclaims where `why` goes (→ QA-164-8)
- `shared/resources/advance-pipeline-lock.test.sh:137`: a leaked seam is silent in the direct run (→ QA-164-9)

The findings were promoted by QA's own verification, not mechanically. No finding was `bug` + `high` confidence, except QA-164-6, which is LOW.

**Mutation-proof spot check (re-run independently, `cmp` restores, tree unchanged):**

- mutation-proven: carve-out sentence removed → banner test → covered
- mutation-proven: HALT example back to story/task-only → HALT pin → covered
- mutation-proven: hook fragment placed in Exception 2 → banner test (whole-doc check) → covered
- mutation-proven: "One exception" restored → banner test → covered
- QA-164-4's `why` text → dev-only (diagnostic message; no assertion can observe it without a forced timeout)

---

## Regression Testing

`step-8-completion-checklist.test.mjs` passes on the tree. The three targeted tests had a green baseline between mutations. The 4b meta-test passed 3/3 in cycle 1's fix run (37–42s per case under host load ~40).

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL (QA-164-5 resolved)

**Next Steps**: `/qa-fix` QA-164-5 to QA-164-9, then QA cycle 3.
