# QA Report: Task 111 - One local command that runs every CI lane, and two coverage gaps the sweep found

**Task**: [Link to task document](./task.111.local-ci-parity.md)
**Gate File**: [task.111.gate.5.local-ci-parity.yml](./task.111.gate.5.local-ci-parity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16 (cycle 5 — last in the budget)
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

Scoped re-review of the one file `98a59e89` touched. Gate-4's finding is fixed and six further GitHub-accepted step shapes parse correctly. One MEDIUM remains: the key column is hard-wired to dash+2, so `-   name: X` (extra spaces after the dash — valid YAML, keys at dash+4) drops the step entirely, a **false green** that would hide a real gate step. QA found it by probing and the reviewer found it independently. Three cleanups. No workflow in this repository uses the spelling, so no present verdict is wrong — but the parity test's whole purpose is to be right about the workflow it has not seen yet. This is cycle 5: the open entry routes to 5b, and the loop limit then hands the decision to a human.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Direct tools plus one scoped diff reviewer (Explore, 139 s) over `ci-gate-parity.test.mjs`. `SAFETY_REPROBE=false`. Step 4b: n/a.

## Re-Review Context

| Gate-4 finding | Status | Verification on head `98a59e89` |
| --- | --- | --- |
| CR-1 keys read at any indentation | FIXED | `with: name: coverage` keeps the step name; heredoc body opens no phantom step; real workflows parse to the same 20 steps |
| CR-2/CR-3 cleanups | DONE | read |

QA probes beyond the reviewer's scope: quoted `name:`, an `if:` key, an `env:` block containing `NAME:`, flow-style `with: { …, name: flow }`, a `>` folded run, a comment line between steps — all correct.

## New Findings This Cycle

- **[medium]** `evals/shared/tests/ci-gate-parity.test.mjs:299` — `-   name: X` with keys at dash+4: run/uses skipped, step dropped (false green). Verified by QA and reviewer. **→ gate CR-1**
- cleanup `:317` — indicator regex rejects `|2-` ordering and a trailing `# comment`
- cleanup `:293` — comment says "at or left of"; guard is strictly less-than
- cleanup `:296` (medium confidence) — a job-level `needs:`/`runs-on:` list before `steps:` would open a phantom item

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0; 3 cleanups

## NFR Assessment

Security PASS (reasoned; cycle-2 probes stand) · Performance PASS · Reliability PASS · Maintainability PASS.

## Final Assessment

**Gate Status**: CONCERNS — one MEDIUM.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed in 5b; because the five-cycle budget is spent, a human confirms the fix (the mutation proof and fast gate will be on the branch) or re-runs a review cycle.
