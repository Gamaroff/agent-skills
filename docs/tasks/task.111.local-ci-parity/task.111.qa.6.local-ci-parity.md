# QA Report: Task 111 - One local command that runs every CI lane, and two coverage gaps the sweep found

**Task**: [Link to task document](./task.111.local-ci-parity.md)
**Gate File**: [task.111.gate.6.local-ci-parity.yml](./task.111.gate.6.local-ci-parity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16 (cycle 6 — beyond the five-cycle budget by the user's decision)
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

Gate-5's finding is fixed. The scoped reviewer, asked to construct shapes rather than read code, found five more the hand-rolled step parser misreads: job keys written after `steps:` (MEDIUM, phantom step), a bare `-` item (MEDIUM, step dropped — false green), flow-mapping items, trailing comments on plain values, quoted `uses:` values (LOW). QA reproduced the two MEDIUMs. **Four consecutive cycles have now each found a new YAML shape in the same new parser.** Patching it a fifth time is the loop's failure mode; the third-strike menu applies in spirit: replace the mechanism with a real YAML read.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

## Review Methodology

Direct tools plus one scoped diff reviewer (Explore, 154 s), prompted to construct and run shapes. QA's own probes: two jobs in one file (bounded), CRLF, name value on the next line (unnamed → loud red), flow-style `steps: [ … ]` (no steps → loud red), reusable-workflow job (no steps → loud red), blank/comment lines inside a step. `SAFETY_REPROBE=false`.

## Re-Review Context

| Gate-5 finding | Status | Verification on head `f80ebd21` |
| --- | --- | --- |
| CR-1 `-   name:` step dropped | FIXED | keys at dash+4 recorded; 20 real steps unchanged |
| CR-2/3/4 cleanups | DONE | read |

## New Findings This Cycle

- **[medium]** keys after `steps:` still parsed → phantom step (reproduced) **→ gate CR-1**
- **[medium]** bare `-` item dropped → false green (reproduced) **→ gate CR-2**
- **[low]** flow-mapping item unrecorded; trailing `# comment` kept in plain values; quoted `uses:` misses `SETUP_ACTIONS` **→ gate CR-3**
- cleanup: header comment still says "two past the dash"

## Final Assessment

**Gate Status**: CONCERNS — two MEDIUM; maintainability CONCERNS.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — replace the parser with a real YAML read (PyYAML via `python3`, the repo's existing hard dependency), keep every synthetic fixture, re-review.
