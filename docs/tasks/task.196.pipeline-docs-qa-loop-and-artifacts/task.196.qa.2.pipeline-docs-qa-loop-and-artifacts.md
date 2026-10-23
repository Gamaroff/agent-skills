# QA Report: Task 196 - Pipeline docs: QA loop, resume and artifacts (cycle 2)

**Task**: [Link to task document](./task.196.pipeline-docs-qa-loop-and-artifacts.md)
**Gate File**: [task.196.gate.2.pipeline-docs-qa-loop-and-artifacts.yml](./task.196.gate.2.pipeline-docs-qa-loop-and-artifacts.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 was a refute pass over the whole branch diff, not only cycle 1's fixes. All 11 gate-1 findings are fixed. Every claim the reviewer was asked to refute held: the convergence check fires from cycle 3, a not-converging halt re-enters at 5b, `/finalise` 6a commits the registry tick for tasks, and the Step 8 rows are right. Two new medium findings sit in `troubleshooting.md` tables: the route 2c trigger is incomplete, and the `no-code-moved` row tells the operator to do nothing where an untracked fix file needs a decision. Five low findings are label precision and one audit-report status.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL. Fix CR-1 and CR-2 first.

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| QA-1 not-converging resume edge | ✅ FIXED | Both READMEs: `HALTCONV -.-> S6`, labelled with the 5b re-entry |
| QA-2 half-cycle edge | ✅ FIXED | `S5half` node, edges to S5c and HALTQA |
| QA-3 Step 8 row | ✅ FIXED | `pipeline-artifacts.md:59` names handover files, Jira residue, the Step 7 check |
| QA-4 runbook Step 8 rows | ✅ FIXED | story-development.md:237/:275, task-development.md:116/:152 |
| QA-5 "three exits" | ✅ FIXED | Routes table with cosmetic residue and the half-cycle; the half-cycle row raised CR-1 |
| QA-6 fork labels | ✅ FIXED | Both READMEs; the wording raised CR-4 (low) |
| QA-7 DoD-gaps re-entry note | ✅ FIXED | Diagram 5 in both READMEs |
| QA-8 develop-batch pointer | ✅ FIXED | Links `../develop-next/SKILL.md` |
| QA-9 day-3 qa-gate sentence | ✅ FIXED | The new wording disagrees with lines 41 and 77 of the same file (CR-6, low) |
| QA-10 workflows.md budget | ✅ FIXED | Both lines say `QA_MAX_CYCLES` (default 5) |
| QA-11 halt snapshot rows | ✅ FIXED | The field list is still HALT-only (CR-5, low) |

---

## New Findings This Cycle

- **[medium]** `docs/reference/troubleshooting.md:201` (CR-1): the route 2c trigger omits MEDIUM 0 on the last gate, and omits that the last fix must have come from 5a, not from a 5c REQUEST CHANGES. Fix: name both.
- **[medium]** `docs/reference/troubleshooting.md:252` (CR-2): the `no-code-moved` row says "Nothing", but the refusal names untracked files the operator must judge. Fix: commit any that belong to the fix and re-invoke.
- **[low]** `skills/develop-task/README.md:131` and `develop-story/README.md:138` (CR-3): the S6half node names one of three route 2c conditions.
- **[low]** `skills/develop-task/README.md:114` and `develop-story/README.md:121` (CR-4): "non-waived gate" should read "no active waiver".
- **[low]** `skills/develop-task/README.md:461`, `develop-story/README.md:478` and `pipeline-artifacts.md:98` (CR-5): the snapshot field list omits `paused_at`/`pause_reason`.
- **[low]** `docs/runbooks/first-week/day-3-messy-path.md:58` (CR-6): disagrees with lines 41 and 77 about what `qa-gate` does.
- **[low]** `.agents/plans/doc-drift-audit-2026-10-07.md:836` (CR-7): SKILL-READMES-STANDARDS-29 is marked fixed, but part of it was deferred.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` at bbc1a4e0: 5969 tests, 0 failed)
- [x] Breaking changes documented (none; documentation only)
- [x] Code on feature branch with open PR (#701)

### Review Methodology

Re-review scope: whole branch diff `origin/develop...HEAD` (cycle 2 refute pass), 16 files, task directory excluded.

There is no code in the diff, so the Step 3b reviewer was an adversarial source check. One read-only Explore agent was dispatched at 19:22Z with the refute directive and asked to falsify each added claim against its source. It returned in 255552 ms (`duration_ms`). CR-1 and CR-2 were then confirmed in-line against `develop-pipeline-step-5-6-qa-loop.md:1808-1829`, `develop-pipeline-resume-contract.md:706` and `reenter-qa-after-finalise.sh:258-265`. `finding-anchors.js` returned `ok` for all 7 anchors.

Step 4b does not apply: the change set holds no runnable prose (no `SKILL.md` or `shared/resources/*.md` changed).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0: Re-verify | PASS | |
| Phase 1: Overview | PASS | workflows.md budget wording fixed |
| Phase 2: Reference | CONCERNS | troubleshooting.md CR-1, CR-2; pipeline-artifacts.md CR-5 |
| Phase 3: Runbooks | CONCERNS | day-3 CR-6 (low) |
| Phase 4: Standards | PASS | |
| Phase 5: Skill READMEs | CONCERNS | CR-3, CR-4, CR-5 (low) |
| Phase 6: Close-out | CONCERNS | audit report CR-7 (low) |

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| SC-1 every finding fixed or closed | PASS | 31/31; CR-7 asks for one status to be made partial |
| SC-2 no changed doc states the old behaviour | CONCERNS | CR-1, CR-2 |
| SC-3 added/changed commands run | PASS | No command added this cycle |
| SC-5 `doc-links.js` on every changed doc | PASS | ok on all changed docs |
| SC-6 CI link check | PASS | `link-check` pass @ bbc1a4e0 |
| SC-7 `npm run validate:all` | PASS | 128 passed |
| SC-8 audit report marks each finding | PASS | 31 lines; CR-7 on one of them |

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

CR-1 and CR-2, above. Both are doc-wording defects in the deliverable. They are carried in the gate for `/qa-fix`, and no bug-report files were created.

### LOW Severity Issues (5)

CR-3 to CR-7, above.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 5

---

## NFR Assessment

### Performance — PASS
No runtime change.

### Reliability — PASS
Documentation only.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (boundary: false. The diff adds no function.)

### Maintainability — CONCERNS
Two troubleshooting rows misstate operator action (CR-1, CR-2).

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `docs/reference/troubleshooting.md:201`: route 2c trigger incomplete (CR-1, promoted)
- [medium/medium] `docs/reference/troubleshooting.md:252`: `no-code-moved` row (CR-2, confirmed in-line, in the gate)
- [low/medium] `docs/runbooks/first-week/day-3-messy-path.md:58`: contradicts lines 41/77 (CR-6)

**Cleanups (4):** CR-3, CR-4, CR-5, CR-7, above.

Mutation proof: not applicable. No test guards a fix made in cycle 1.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` @ bbc1a4e0 | PASS: 5969 tests, 0 failed |
| Doc-reading tests (parity, chokepoint, executable-instructions, restricted-access, jira-interception, skill-shape) | PASS, 181/181 |
| `npm run validate:all` | PASS, 128 |
| Mermaid diagram 1 QA section | PASS (validator: valid) |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
npm run validate:all
command node --test evals/shared/tests/pr-review-loop-parity.test.mjs tests/doc-id-chokepoint.test.js tests/executable-instructions.test.js tests/restricted-access-docs.test.js shared/resources/tests/jira-interception.test.mjs evals/develop-next/protocol/skill-shape.test.mjs evals/develop-batch/protocol/skill-shape.test.mjs
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings> --rev HEAD --json
gh pr checks 701
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two medium findings remain in the task's own deliverable. There is no HIGH, and the suite is green.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed.

---

**Next Steps**: `/qa-fix` on gate 2, then QA cycle 3.
