# QA Report: Task 325 - The docs-only CI rule can exclude a path (cycle 2)

**Task**: [task.325.docs-only-rule-exclusions.md](./task.325.docs-only-rule-exclusions.md)
**Gate File**: [task.325.gate.2.docs-only-rule-exclusions.yml](./task.325.gate.2.docs-only-rule-exclusions.yml)
**Previous**: [task.325.qa.1.docs-only-rule-exclusions.md](./task.325.qa.1.docs-only-rule-exclusions.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Testing Completed**: 2026-11-26
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's fix holds: T325-CR-101 is closed. The fresh refute pass found that `readConfig` accepts an exclusion spelled so that it can never match. QA reproduced it by execution. It is a new medium finding, T325-CR-201. One low cleanup is T325-CR-202.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (ci:fast at 0dfb19811: 8904 tests, 0 failed)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#954)

### Testing Approach

- [x] Automated Testing (unit, integration)
- [x] Regression Testing
- [x] Security Review (probe engine)
- [x] Code Review (refute pass)

### Review Methodology

Re-review: the previous gate was CONCERNS, and code moved since its head (`code_moved=1`). Diff review: code review with a full refute pass. One Explore subagent was dispatched and returned in about 124 s (`duration_ms` 124075).

CI on 0dfb1981117f: pending

Step 4b: I ran `qa-execute-snippets.mjs --diff-base <merge-base>` on the four changed executed documents. The changed set is 0 blocks in each, so there is nothing to execute. `skills/finalise/SKILL.md` reports `zero-blocks-executed`. The merge-base copy reports the same finding, so it is pre-existing and recorded under future recommendations.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: the exclusion in `isDocsPath` | PASS | Unchanged since cycle 1 |
| Phase 2: usage errors | CONCERNS | The refusal catches only a bare `!` (T325-CR-201) |
| Phase 3: docs and bundle | PASS | T325-CR-101 fixed at all prose readers |

---

## Success Criteria Verification

Same as cycle 1; no criterion moved (`criteria-drift`: `clean`, base review-commit). CHANGELOG: `cites (task 325)`.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: an exclusion that can never match is accepted (T325-CR-201)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: Reproduced by execution at 0dfb19811. `isDocsPath("docs/catalogue.md", ["docs/**", X])` gives these results:

  | X | result |
  | --- | --- |
  | `"!docs/catalogue.md"` (control) | false |
  | `"! docs/catalogue.md"` | true |
  | `"!./docs/catalogue.md"` | true |
  | `"!/docs/catalogue.md"` | true |
  | `" !docs/catalogue.md"` | true |

  A `skills-config.yaml` holding `- "! docs/catalogue.md"` goes through `readConfig` without error. The patterns come back as `["docs/**","! docs/catalogue.md"]`.
- **Impact**: the owner thinks a file is excluded, but it stays documentation. A mistyped exclusion fails open and gives no signal.
- **Recommendation**: refuse these spellings in `interpretConfig`, beside the bare-`!` refusal.
- **Priority**: P2

### LOW Severity Issues (1)

**T325-CR-202**: `isDocsPath`'s non-array branch always returns false: `isDocsPath("docs/x.md", "docs/**")` is false. Return false directly.

### Closed

**T325-CR-101**: the prose readers now state the exclusion rule. QA re-read each site at this head.

**Total open**: HIGH 0, MEDIUM 1, LOW 1

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11. The run record is `task.325.qa.2.docs-only-rule-exclusions.security.run.json`, with `escaped` 0.
- Two hostile acceptances, the same pre-existing pair as cycle 1. T325-CR-201 is a gap in config validation, not a path-sink escape.

### Reliability — CONCERNS
T325-CR-201.

### Performance — PASS
### Maintainability — PASS

---

## Code Review

**Correctness bugs (1):**
- [medium/medium] `shared/resources/ci-tree-equivalence.js:783`: the bare-`!` refusal misses exclusions that can never match. QA reproduced this by execution (table above), so per 5d it gates at any confidence. Promoted to T325-CR-201.

**Cleanups (1):**
- [low/high] `ci-tree-equivalence.js:182`: the non-array branch. QA verified it. Promoted to T325-CR-202.

The reviewer listed every code reader of `ci.docsOnly.patterns`: `finalise-delta.js`, `finalise-rerun-at-head.js`, `reenter-qa-after-finalise.sh`, `push-policy.sh` engine mode, the 5c carry classifier and `fixPathTarget`. Each one goes through `isDocsPath` and `interpretConfig`, so fixing the validator fixes every reader. All 8 generated copies are byte-identical to their sources.

**Boundary**: `boundary: true`, `probes_executed: 11`, `escaped: 0`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full `ci:fast` at 0dfb19811 (LAN server) | PASS (8904 tests, 0 failed) |

---

## Recommendations

### Immediate Actions (Blocking)
1. T325-CR-201: refuse an exclusion that can never match (P2).

### Short-term Actions (Non-Blocking)
1. T325-CR-202: make the non-array branch return false directly.
2. Pre-existing: encoded-traversal and symlink paths (see gate).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one open medium, reproduced by execution.
**Quality Score**: 88/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: T325-CR-201 fixed.

---

**Next Steps**: `/qa-fix` for T325-CR-201 and T325-CR-202, then QA cycle 3.
