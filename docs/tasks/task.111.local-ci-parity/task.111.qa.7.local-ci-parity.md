# QA Report: Task 111 - One local command that runs every CI lane, and two coverage gaps the sweep found

**Task**: [Link to task document](./task.111.local-ci-parity.md)
**Gate File**: [task.111.gate.7.local-ci-parity.yml](./task.111.gate.7.local-ci-parity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16 (cycle 7)
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

The mechanism replacement did what it was for: every shape cycles 3–6 found reads correctly through PyYAML, and the real workflows are unchanged at 20 steps. The new reader has three small robustness points — the one that matters is an unquoted date-like scalar crashing `json.dumps` and being reported as a missing interpreter (MEDIUM, reproduced) — and three cleanups, one of which is a docstring that now says the opposite of what the code does. All in one file; one fix cycle.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

## Review Methodology

Direct tools plus one scoped diff reviewer (Explore, 104 s). QA probes: `python3` absent (loud, 5 failures; message shows `undefined`), YAML scalars (`run: |` single line, numeric `run`, null `run`/`uses`). `SAFETY_REPROBE=false`.

## Re-Review Context

| Gate-6 finding | Status | Verification on head `d4b830b0` |
| --- | --- | --- |
| CR-1 keys after `steps:` | FIXED | fixture parses to the one real step |
| CR-2 bare `-` item | FIXED | `["Bare dash", null, "npm run format:check"]` |
| CR-3 flow mapping / comments / quoted `uses:` | FIXED | all three in the cycle-6 fixture |
| CR-6 stale "two past the dash" comment | DONE | gone with the parser |

## New Findings This Cycle

- **[medium]** `:270` — date-like scalar → `json.dumps` TypeError → misreported as missing PyYAML (reproduced) **→ gate CR-1**
- **[low]** `:276` — spawn failure message renders `undefined` (reproduced) **→ gate CR-2**
- **[low]** `:310` — single-command block preceded by a comment line is blanked (medium confidence) **→ gate CR-3**
- cleanup `:198` — `workflowScripts()` docstring still claims regex parsing "deliberately"
- cleanup `:219` — `jobBlock()` is a dead second reader kept for a tautological test
- cleanup `:315` — ~15 python spawns per run; memoise

## Final Assessment

**Gate Status**: CONCERNS — one MEDIUM; maintainability CONCERNS (misleading docstring, dead reader).
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR-1/2/3 fixed (cleanups can ride along), re-reviewed (cycle 8).
