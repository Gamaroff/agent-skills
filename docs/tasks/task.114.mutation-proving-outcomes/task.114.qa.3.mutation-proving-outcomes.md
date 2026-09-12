# QA Report: Task 114 - mutation-proving.md documents the false green and the false red, and none of the other seven things a mutation run can tell you

**Task**: [Link to task document](./task.114.mutation-proving-outcomes.md)
**Gate File**: [task.114.gate.3.mutation-proving-outcomes.yml](./task.114.gate.3.mutation-proving-outcomes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-12
**Testing Completed**: 2026-09-12
**Gate Status**: PASS

---

## Executive Summary

Cycle 2's three MEDIUM findings are fixed and verified by probes QA chose independently of the fix's own tests. The narrowed cycle-3 review of the three files changed since gate 2 found nothing MEDIUM or HIGH: one LOW design refinement and two cleanups, recorded as advisory. Three cycles, HIGH sequence 0, 0, 0; the deliverable is complete, green, and its own instrument now passes the checks it prescribes.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

**Re-review scope**: since 2026-09-12T20:35:41Z (default) — `CHANGELOG.md`, `evals/shared/tests/mutation-proving-pointers-parity.test.mjs`, `shared/resources/mutation-proving.md`. Safety re-probe: not triggered (prior security `PASS reasoned`).

| Prior issue | Status | Verification |
| :-- | :-- | :-- |
| CR-1 (cycle 2) `case $?` dies under `set -e` | **FIXED** | The doc's literal step-4 block, extracted and run under `bash -c 'set -e …'` and `zsh -c 'set -e …'` against a real snapshot + edit: prints the hunk, `MUTATION APPLIED — … re-read it (row 10)`, and `reached` |
| CR-2 (cycle 2) locator + dedupe re-duplicate | **FIXED** | QA's own layout, inverse of qa-fix's: decoy *below* the hit, pointers 5 lines apart (windows overlap by 2) → exactly one report, at the line "four shapes" occupies (`skills/develop/SKILL.md:661`) |
| CR-3 (cycle 2) `-q` hides the diff | **FIXED** | Same run as CR-1: the hunk (`1c1 …`) is printed before the status word |
| CR-4 (cycle 2) scan too narrow | **FIXED** | Verified at cycle-2 qa-fix (gate-playbooks.md red); 9 pointer files found, floor 4 |
| CR-5 (cycle 2) CHANGELOG wording | **FIXED** | Read |
| CR-6 (cycle 2) first match only | **FIXED** | Verified at cycle-2 qa-fix (two counts → two reports); reviewer confirmed `matchAll` clones the `gi` regex so `lastIndex` stays 0 |

Bugs 3, 4, 5 → **Closed**.

---

## New Findings This Cycle

- **[low/medium]** `…parity.test.mjs:134` — `MIN_POINTER_FILES=4` is one pooled floor across SKILL.md bodies, authored references, bundled copies and shared sources (9 today, 5 non-SKILL), so a scan that stopped reading SKILL.md — the three consumers that carried the defect — would still clear it; the doc's own blind-iteration rule asks for a floor per direction. → per-collection floors. (advisory; `recommendations.future`)
- cleanup `…parity.test.mjs:56` — bundled copies of *other* shared resources are scanned, so one defect can be reported up to three times at AUTO-GENERATED paths. → skip banner-carrying files or map to source.
- cleanup `CHANGELOG.md:71` — one line runs to ~115 columns. → re-wrap.

None gate-affecting (deterministic rules: no medium, no high, no NFR CONCERNS/FAIL).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: the outcomes table | PASS | Verified | |
| Phase 2: the instrument rules | PASS | Verified | rule 3's snippet now: exit-code discriminated, set -e safe, prints the diff; cited under rule 5 |
| Phase 3: the corpus rules | PASS | Verified | |
| Phase 4: consumers | PASS | Verified | guard: emphasis/wrap-proof, offset-located, deduped, every count, authored references scanned |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| 1. Every §2 outcome has a rule and discriminating question | PASS | 12 observations → rows/rules as mapped in qa.1 |
| 2. No consumer states a count; a test asserts it | PASS | 0 counts; test red on 8 distinct mutations across three cycles |
| 3. Committed vs development-time distinguished | PASS | `covered` vs `dev-only` in both Step 3c texts |
| 4. Observations close naming the PR | N/A | operator action after merge (listed in the PR body) |

Tests 3232 pass / 0 fail; prettier clean; bundle 0 problems.

---

## Breaking Changes Validation

None. **Overall:** PASS

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1, cleanup: 2

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS (cycle-2 CONCERNS resolved: applied-check survives `set -e` on all three paths, both shells)
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0
### Maintainability — PASS

---

## Code Review

Step 3b, cycle 3: narrowed diff (708 lines, three files). `code_review_blocking=true` — nothing to promote (no bug ≥ medium).

**Correctness bugs (1, low):** pooled floor (above).
**Cleanups (2):** bundled-copy duplicates; CHANGELOG wrap.

**Mutation-proof spot check (Step 3c)** — on the committed test and the committed snippet, inputs chosen independently of the fix's own proofs:

```markdown
mutation-proven: decoy "four of five" BELOW the hit, pointers 5 apart → test 1 red, one report at skills/develop/SKILL.md:661 → covered
mutation-proven: step-4 block extracted verbatim, run under `set -e` in bash and zsh with a real edit → hunk printed, APPLIED, script continues → covered (instrument, not a test: the claim is about the snippet)
```

**Step 4b**: `shared/resources/mutation-proving.md` re-executed: 1 runnable / 0 placeholder / 2 mutating; missing-snapshot path prints the stop message under both shells; no disagreement.

---

## Regression Testing

Full `npm test` — PASS. BUNDLED_REFS parity — PASS. `npm run bundle -- --check` — 0 problems.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Per-collection non-vacuity floors (cycle-3 CR-1).
2. Skip AUTO-GENERATED copies in the scan (CR-2); re-wrap the CHANGELOG line (CR-3).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All findings from three cycles closed with independent verification; residue is one low design refinement and two cleanups, none gate-affecting.
**Quality Score**: 95/100 (−5 at reviewer's discretion for the advisory residue)

**Deployment Recommendation**: APPROVED

---

**QA Report**: `task.114.qa.3.mutation-proving-outcomes.md` · **Gate File**: `task.114.gate.3.mutation-proving-outcomes.yml`
**Next Steps**: Step 5c `/review-pr`; then `/finalise`.
