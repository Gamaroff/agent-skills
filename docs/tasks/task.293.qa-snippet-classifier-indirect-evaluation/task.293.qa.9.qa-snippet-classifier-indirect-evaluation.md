# QA Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Task**: [Link to task document](./task.293.qa-snippet-classifier-indirect-evaluation.md)
**Gate File**: [task.293.gate.9.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.9.qa-snippet-classifier-indirect-evaluation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: CONCERNS

---

## Executive Summary

Gate 9 ran on a fourth owner-granted extra cycle, scoped to routes that keep the substitution text in the source. The independent reviewer found no block that classifies `runnable` and runs a command. It tried early-closing bracket shapes, backtick substitutions holding a bracket, builtins outside the evaluating-word list, and about 18,000 random array-subscript blocks. The gate is CONCERNS, not PASS: the owner narrowed the task at gate 5 and the documented residuals stay open.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: READY, with the residuals documented and the allow-list task filed

---

## Testing Scope

Direct tools plus one read-only Explore subagent for the diff review (code route; gate 9, whole branch diff of 5399 lines, safety re-probe; the prior gate failed on security). The reviewer ran about 2 minutes (measured from its completion notice); its independent review ran, with an empty findings list. It did not run the full test file or the helper false-positive scan; QA's own docs scan and `ci:fast` cover those.

CI on 134931e556a6: pending at the read (undecided; recorded, gate unchanged). Clean-checkout `ci:fast` on the LAN server: see the update below.

### Re-Review Context

| Previous finding | Status |
| --- | --- |
| T293-QA-11 quoted separator resets the depth | FIXED |

## New Findings This Cycle

None.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reproduce | PASS | Verified | 383/383 tests, real-bash table |
| Phase 2: refuse | PASS | Verified | No bypass in about 18,000 fuzzed blocks |
| Phase 3: prove | PASS | Verified | Differential 0 writes, docs scan +4.5%, mutations red |

**Overall Phase Completion**: 3/3

---

## NFR Assessment

- **Security**: CONCERNS. 31 probes, 0 escaped; documented residuals stay open (printf octal launder, a bracket or dollar arriving by expansion, a literal split across quote tokens).
- **Performance**: PASS (+4.5% median against the +10% bound).
- **Reliability**: PASS.
- **Maintainability**: CONCERNS (nine gates; detection of hazardous text cannot be exhaustive).

---

## Code Review

No findings. Verified by the reviewer: a `]` before the literal that bash also treats as closing leaves nothing to run (the text is a plain value); a quoted `[` that bash counts as nesting is counted the same way by the depth map; `mapfile`, `getopts`, `wait` and `coproc` with a literal operand are refused by the unrecognised-command rule; the bundled copies match the source.

---

## Recommendations

### Future
1. File the allow-list design as its own task (closes the documented residuals).
2. Two advisory cleanups (a test that cannot fail on the ordering it names; a test locking the dependency on the unrecognised-command rule).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no reproduced bypass of the refusal this task delivers; owner-accepted residuals documented.
**Quality Score**: 88/100

**Deployment Recommendation**: READY

**Next Steps**: Step 5c PR conformance review, then finalise
