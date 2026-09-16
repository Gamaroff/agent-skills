# QA Report: Task 111 - One local command that runs every CI lane, and two coverage gaps the sweep found

**Task**: [Link to task document](./task.111.local-ci-parity.md)
**Gate File**: [task.111.gate.4.local-ci-parity.yml](./task.111.gate.4.local-ci-parity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16 (cycle 4)
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

Scoped re-review of the three test files `01be63a6` touched. Gate-3's finding is fixed and the parser records every step of the three real workflows correctly. But the fix made the leading dash optional on the key regexes, which lets keys at *any* indentation through: a `with:` input named `name:` overwrites the step name, and a `run: |` body line beginning `- ` is flushed as a phantom step — both reproduced with a synthetic block. No current workflow has either shape, so no present verdict is wrong; it is a false-red class against shapes CI accepts, which is exactly what the parity test must never produce. One MEDIUM; two cleanups.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Direct tools plus one scoped diff reviewer (Explore, 148 s) over the three files changed by `01be63a6`. `SAFETY_REPROBE=false`. Scope: files from the cycle-3 fix commit. Step 4b: n/a.

---

## Re-Review Context

| Gate-3 finding | Status | Verification on head `01be63a6` |
| --- | --- | --- |
| CR-1 name bound only when first key | FIXED | mapped `- uses:` / `name: Marketplace lint` → 13/13 green; parser dump over test/validate/shellcheck records all 21 steps with the right names |
| CR-2/3/4 comment cleanups | DONE | read |

---

## New Findings This Cycle

- **[medium]** `evals/shared/tests/ci-gate-parity.test.mjs:287` — key regexes match at any indentation; `with: name: coverage` → step name "coverage"; `run: |` body `- name: bogus / run: npm run oops` → phantom step (reproduced). → indent-aware matching; synthetic cases. **→ gate CR-1**
- cleanup `:295` — only bare `|` is normalised to an empty run; `|-`, `|+`, `>`, `>-` leave the indicator (harmless today)
- cleanup `:329` — trailing `name in scripts` filter in `greenScripts()` is redundant

---

## Implementation Verification

Phase 1 CONCERNS (parser indentation, CR-1) · Phase 2 PASS · Phase 3 PASS. **3/3.**

## Success Criteria

SC1–SC5 PASS · SC6 CONCERNS (parser false-red class).

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0; 2 cleanups

## NFR Assessment

Security PASS (reasoned — no boundary changed; cycle-2 probes stand) · Performance PASS · Reliability PASS · Maintainability PASS.

## Code Review

Scoped pass, one read-only Explore reviewer, 771-line diff, 148 s. CR-1 reproduced by QA with a synthetic block through the parser itself (`jobStepsFromText`). Not fixed during this review; 5b owns it.

## Final Assessment

**Gate Status**: CONCERNS — one MEDIUM (rule 2).
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed and re-reviewed (cycle 5, the last cycle in the budget).
