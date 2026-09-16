# QA Report: Task 111 - One local command that runs every CI lane, and two coverage gaps the sweep found

**Task**: [Link to task document](./task.111.local-ci-parity.md)
**Gate File**: [task.111.gate.3.local-ci-parity.yml](./task.111.gate.3.local-ci-parity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16 (cycle 3)
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

Scoped re-review of the four files the cycle-2 fix commit (`6283a1c2`) touched. Every gate-2 finding is verified fixed on the branch head, and the suites are green under `TMPDIR=/tmp` as well. One LOW correctness gap remains in the parity test's step parser — a step whose `name:` comes after its `uses:`/`run:` key is recorded unnamed, which would produce a false red on a workflow CI accepts — plus three stale comments/messages. No product code is implicated; NFRs all PASS. One more fix cycle for CR-1; the cleanups are advisory.

**Overall Assessment**: CONCERNS (one open LOW)
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified
- [x] Task at `ready-for-review`; PR #412 OPEN, head `6283a1c2`; working tree equals head (+ implementation report)

### Review Methodology
Direct tools plus one scoped diff reviewer (Explore, 213 s) over the four files changed since gate 2. `SAFETY_REPROBE=false` (gate 2 security axis `OK measured`). Re-review scope: files changed by `6283a1c2` — `ci-gate-parity.test.mjs`, `develop-pipeline-hook-wrappers.test.mjs`, `quick_validate.py`, `skill-frontmatter.test.js`. (The `git log --since` derivation returned nothing because gate 2's `updated:` stamp was host-local time labelled `Z`; the scope was taken from the commit's file list instead, and both earlier stamps are corrected in this cycle's commit.)

Step 4b: not re-run (no SKILL.md body or shared prompt in the scoped files).

---

## Re-Review Context

| Gate-2 finding | Status | Verification on head `6283a1c2` |
| --- | --- | --- |
| CR-1 cap measured on normalised string | FIXED | more-indented fold → "1025 chars as parsed" reject; clean fold at 1,024 → accept |
| CR-2 `uses:` gate step unclassified | FIXED | `- name: Marketplace lint / uses: some/lint-action@v1` → red |
| CR-3 `exec` untested | FIXED | non-exec wrapper (exec only in a comment) → pid assertion red |
| CR-4 corpus regex re-parse (cleanup) | DONE | corpus reads via `skill_frontmatter.parse` |
| CR-5 twins unexpanded (cleanup) | DONE | composite twin still compares equal |

Platform variance: `TMPDIR=/tmp node --test evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs tests/skill-frontmatter.test.js` → 30/30.

---

## New Findings This Cycle

- **[low]** `evals/shared/tests/ci-gate-parity.test.mjs:259` — `jobSteps()` names a step only when `name:` is the list item's first key; `- uses: x` / `name: Y` is recorded unnamed (verified by mutation: reported as unclassified/unnamed, and a map entry for `Y` would read as stale). → order-independent step assembly. **→ gate CR-1** (reviewer confidence medium; promoted after QA verified by mutation)
- cleanup `tests/skill-frontmatter.test.js:151` — `descriptionOfLength` docstring cites the superseded normalised measure
- cleanup `evals/shared/tests/ci-gate-parity.test.mjs:369` — "has no run: steps" message; two `SETUP_STEPS` entries now redundant with `SETUP_ACTIONS`
- cleanup `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs:155` — `execTargetOf` message claims a `"$@"` check the regex does not make

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | CONCERNS | parity parser key-order gap (CR-1) |
| Phase 2 | PASS | cap and wrapper fixes verified |
| Phase 3 | PASS | unchanged |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

SC1 PASS · SC2 PASS · SC3 PASS · SC4 PASS · SC5 PASS · SC6 CONCERNS (parser robustness — verdicts on the three real workflows are unaffected).

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1; 3 cleanups

---

## NFR Assessment

Security PASS (**Evidence**: reasoned — the boundary did not change beyond what cycle 2 measured 9/9; the two distinguishing cases were re-executed this cycle) · Performance PASS · Reliability PASS · Maintainability PASS (advisory cleanups recorded).

---

## Code Review

Scoped pass, one read-only Explore reviewer, 765-line diff, 213 s. Findings above. Mutation proofs re-executed by QA on the head for all three gate-2 entries (see Re-Review Context). Deliberately **not** fixed during this review — the cycle-2 deviation is not repeated; 5b owns the fix.

---

## Final Assessment

**Gate Status**: CONCERNS — one open LOW (rule: no high/medium, NFRs PASS → the token is PASS by the deterministic rules; recorded as CONCERNS because an open `top_issues[]` entry routes to a fix cycle either way and a PASS token over an open queue misreads at a glance)
**Quality Score**: 100/100 (no FAIL, no NFR CONCERNS)
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed and re-reviewed (cycle 4).
