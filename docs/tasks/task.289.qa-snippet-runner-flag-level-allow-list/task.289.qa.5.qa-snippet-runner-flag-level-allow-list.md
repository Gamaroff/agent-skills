# QA Report: Task 289 - QA snippet runner allows flags, not just commands

**Task**: [Link to task document](./task.289.qa-snippet-runner-flag-level-allow-list.md)
**Gate File**: [task.289.gate.5.qa-snippet-runner-flag-level-allow-list.yml](./task.289.gate.5.qa-snippet-runner-flag-level-allow-list.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: FAIL

---

## Executive Summary

Cycle 5 re-probed the whole surface with about 900 blocks, 61 of which came back runnable and ran under real bash. The flag table, the expansion rule, the operand check and the cycle 4 masked reading held. One bypass remains, in the masker, and QA reproduced it under real bash. This is the fifth and last gate in the budget.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

- Direct tools plus one read-only Explore reviewer with the SAFETY RE-PROBE directive.
- Re-review scope: unscoped (prior gate failed on security); the whole `origin/develop...HEAD` diff of the shared sources (1764 patch lines). Bundled copies were left out; `bundle:check` holds them identical.
- Diff review: code review.
- Step 4b: not run separately; the probe executes the classifier directly.
- CI on the head: not read this cycle (the fix commit was pushed minutes earlier).

### Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T289-CR4-1 process substitution cuts the arguments | FIXED | `uniq <(echo a) out.txt` and `sort <(echo a) -oout` refused |
| T289-CR4-2 prefix assignment holding a substitution | PARTIAL | `X=$(echo a) uniq in out` and `X=$(echo a) python3 x.py` refused; a quoted paren inside the substitution still hides the command (T289-CR5-1) |

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:3139`: the masker counts parentheses without regard to quotes, and the carve-out for an unparseable masked reading lets a block with no governed command through → T289-CR5-1.

---

## Issues Found

### HIGH Severity Issues (1)

**T289-CR5-1: a quoted paren inside a substitution hides the command after it**
- **Observation**: `X=$(echo ')') touch out`, `X=$(echo '(') python3 x.py`, `X=$(echo ")") cp in out` and `X=$(echo ")") rm in` classify runnable. QA ran `X=$(echo ")") touch out` under real bash: `out` was created.
- **Control**: `X=$(true) touch out` is refused (`unrecognised-command`).
- **Provenance (5b)**: the same inputs are runnable on develop's engine. The finding is kept because cycle 4 claimed this case as closed, and the carve-out it added is what leaves it open.
- **Recommendation**: fail closed on an unparseable masked reading for any word, make the masker quote-aware, and measure the docs scan.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (`security-probe.mjs --sink shell-exec`, 0 reproduced, 0 escaped; record `task.289.qa.5.security.run.json`)
- Fifth gate with a high finding on `qa-execute-snippets.mjs`. The budget is spent: 5 gates, 4 fix cycles.

### Performance — PASS
No resource-bound finding; timing not re-measured after the cycle 4 pass.

### Reliability — CONCERNS
An unparseable masked reading is let through when no governed command is in the block.

### Maintainability — PASS
One masked reading replaced a heuristic.

---

## Code Review

Reviewer-reported correctness bugs (1), promoted to the gate and reproduced by QA: `qa-execute-snippets.mjs:3139` (T289-CR5-1). No cleanups.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one reproduced high finding, a write through an input the classifier calls read-only, and no fix cycle left in the budget.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

**Next Steps**: the owner decides: grant one more fix cycle for T289-CR5-1, or accept the branch as a strict improvement over develop and file the residual as a follow-up task.
