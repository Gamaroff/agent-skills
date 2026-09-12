# QA Report: Task 114 - mutation-proving.md documents the false green and the false red, and none of the other seven things a mutation run can tell you

**Task**: [Link to task document](./task.114.mutation-proving-outcomes.md)
**Gate File**: [task.114.gate.2.mutation-proving-outcomes.yml](./task.114.gate.2.mutation-proving-outcomes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-12
**Testing Completed**: 2026-09-12
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's two MEDIUM findings are fixed and verified by QA's own independent mutations. The cycle-2
**refute pass** over the whole branch diff then found three MEDIUM defects *in those fixes* — each
correct in the steady state and wrong in a transition: the `case $?` snippet dies under `set -e` on
the APPLIED branch; the physical-line locator and the dedupe key combine to re-duplicate overlapping
windows (reproduced with the test's own constants); and the `-q`/redirect snippet no longer shows the
edit the surrounding prose tells the reader to look at. Two LOW findings and one cleanup accompany
them. HIGH findings: 0 (second consecutive zero).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

**Re-review scope**: full `origin/develop...HEAD` diff, reviewed to refute (cycle 2 — exactly one prior gate). Safety re-probe: not triggered (prior security axis `PASS reasoned`).

| Prior issue | Status | Verification |
| :-- | :-- | :-- |
| CR-1 (cycle 1) count guard evadable | **FIXED** | QA's own mutations, distinct from qa-fix's: `*four* shapes` in develop → test 1 red at `skills/develop/SKILL.md:659`; `**four**` + newline + `shapes` in qa-story → test 1 red at `skills/qa-story/SKILL.md:373`. Baseline 2/2 green between and after. → `covered`, `covered` |
| QA-1 (cycle 1) applied-check lies on missing snapshot | **FIXED** | 4b engine executed the revised block under bash and zsh: stdout `NO SNAPSHOT or diff error — step 1 was skipped; stop`, status 0, both shells |

Bugs 1 and 2 → **Closed**.

---

## New Findings This Cycle

- **[medium]** `shared/resources/mutation-proving.md:35` (and the Validate-the-probe block) — `diff -q … >/dev/null 2>&1; case $?` aborts under `set -e` on the APPLIED branch (verified: exits 1 before printing). → `rc=0; diff … || rc=$?; case $rc`. (CR-1, bug 3)
- **[medium]** `evals/shared/tests/mutation-proving-pointers-parity.test.mjs:124` — locator + dedupe key re-duplicate overlapping windows when an earlier line holds the bare count word ("four of five", which this change adds to both SKILL.md files). → locate from `m.index` via cumulative offsets; key on that. (CR-2, bug 4)
- **[medium]** `shared/resources/mutation-proving.md:30` — prose says "see the edit in the output"; snippet is `-q` + redirect. → print the diff on APPLIED. (CR-3, bug 5)
- **[low]** `…parity.test.mjs:57` — `sourceFiles()` skips authored `skills/*/references/*.md` (e.g. `double-check/references/gate-playbooks.md` points at the doc). → widen the walk; raise the floor. (CR-4)
- **[low]** `CHANGELOG.md:65` — "qa-story Step 3c" (section is unlabelled) and "four ways at authoring" (two + two). (CR-5)
- cleanup `…parity.test.mjs:120` — non-global regex reports only the first count claim per window. → `matchAll`. (CR-6)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: the outcomes table | PASS | Verified | unchanged since cycle 1 |
| Phase 2: the instrument rules | CONCERNS | Verified | rule 3's snippet fixed for the missing-snapshot case, now not set -e safe and no longer shows the diff (CR-1, CR-3) |
| Phase 3: the corpus rules | PASS | Verified | |
| Phase 4: consumers | CONCERNS | Verified | guard catches the cycle-1 spellings; locator/dedupe defect (CR-2); scan narrower than its header claims (CR-4) |

**Overall Phase Completion**: 4/4 delivered, 2 with MEDIUM findings

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| 1. Every §2 outcome has a rule and discriminating question | PASS | unchanged |
| 2. No consumer states a count; a test asserts it | CONCERNS | true today; the guard's scan is narrower than stated (CR-4) and its report can duplicate (CR-2) |
| 3. Committed vs development-time distinguished | PASS | |
| 4. Observations close naming the PR | N/A | operator action |

Tests 3232 pass / 0 fail; prettier clean; bundle 0 problems.

---

## Breaking Changes Validation

None. **Overall:** PASS

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 3 (bugs 3–5), LOW: 2 (CR-4, CR-5), cleanup: 1 (CR-6)

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
The applied-check's success path kills a `set -e` shell (CR-1).
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0
### Maintainability — PASS

---

## Code Review

Step 3b, cycle 2: whole-branch diff (800 lines), REFUTE directive appended. `code_review_blocking=true` → CR-1, CR-2, CR-3 (bug/medium/high) promoted to the gate.

**Correctness bugs (5):** CR-1..CR-5 as listed under New Findings.
**Cleanups (1):** CR-6.

**Mutation-proof spot check (Step 3c)** — on the committed test, the two spellings cycle 1 missed, using inputs different from qa-fix's own:

```markdown
mutation-proven: `*four* shapes` (single-star) in skills/develop/SKILL.md → test 1 "no source pointer … states a count" (develop:659) → covered
mutation-proven: `**four**` + hard wrap + `shapes` in skills/qa-story/SKILL.md → test 1 (qa-story:373) → covered
```

Two of two; both `covered`.

**Step 4b**: `shared/resources/mutation-proving.md` re-executed (the only changed in-scope file since gate 1 with runnable blocks): 1 runnable / 0 placeholder / 2 mutating; line 34 → both shells print the stop message on the missing-snapshot path; no disagreement. **The engine runs blocks without `set -e`, which is why CR-1 was found by the reviewer executing the block under `set -e` rather than by 4b** — noted for the record.

---

## Regression Testing

Full `npm test` — PASS. BUNDLED_REFS parity — PASS. `npm run bundle -- --check` — 0 problems.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 + CR-3 — set -e-safe capture and a visible diff on APPLIED, both snippets.
2. CR-2 — offset-based locator; pointer-independent dedupe key.

### Short-term Actions (Non-Blocking)
1. CR-4 widen the scan; CR-5 CHANGELOG wording; CR-6 matchAll.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle-1 findings closed; three MEDIUM defects in the fixes themselves, each bounded to one file with a stated fix. HIGH sequence 0, 0.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, CR-2, CR-3 fixed and re-reviewed.

---

**QA Report**: `task.114.qa.2.mutation-proving-outcomes.md` · **Gate File**: `task.114.gate.2.mutation-proving-outcomes.yml`
**Next Steps**: `/qa-fix` (cycle 2); cycle 3 narrowed to files changed since gate 2.
