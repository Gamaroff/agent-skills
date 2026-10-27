# QA Report: Task 235 - select-next honours an external precondition (cycle 2)

**Task**: [task.235.select-next-external-precondition.md](./task.235.select-next-external-precondition.md)
**Gate File**: [task.235.gate.2.select-next-external-precondition.yml](./task.235.gate.2.select-next-external-precondition.yml)
**Previous Report**: [task.235.qa.1.select-next-external-precondition.md](./task.235.qa.1.select-next-external-precondition.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-27
**Testing Completed**: 2026-10-27
**Gate Status**: PASS

---

## Executive Summary

Cycle 2 is a refute pass over the whole branch diff at `6f9acd1f`. Cycle 1's CR-1 is fixed and mutation-proven. The refute pass found that the fix itself ends a quoted value at an escaped or doubled quote. That finding is new, LOW and high-confidence, so it is promoted. No tracked document carries the shape.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-235-CR-1: a quoted value containing ` #` is truncated | low | ✅ FIXED | `235 CR-1` test passes. Reverting the quote branch turns it red (185/186) in a scratch worktree at HEAD. Probe cases `ext-l5` and `ext-l6` hold the full condition. |
| Cycle 1 CR-2 (advisory): dependency count keyed on reason text | low | open, advisory | Re-raised this cycle as CR-3, still advisory. |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#761, OPEN)

### Review Methodology

Direct tools, plus one read-only Explore subagent for the Step 3b diff review. Measured times: dispatched 04:21:42Z; returned in 113,307 ms (`duration_ms`).

```
Re-review scope: unscoped — cycle 2 refute pass (whole origin/develop...HEAD diff, 16 files)
```

`SAFETY_REPROBE=false`: clause 1 reads false from gate 1 (security PASS). Clauses 2 and 3 do not hold.

Step 4b: `skills/create-task/SKILL.md` has 0 changed blocks this cycle (`no-executable-blocks` note), so it is unchanged from cycle 1.

---

## New Findings This Cycle

- **[low]** `skills/develop-next/scripts/select-next.mjs:1082`: the cycle 1 quote fix stops at the first matching quote character. `"a \"b\" merged"` returns a stub that ends in a backslash, and `'repo''s PR merged'` returns `repo`. Promoted as TASK-235-CR2-1. Fix: skip escaped and doubled quotes, and unescape them.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reader + frontier check | PASS | Verified | externalBlockOf re-probed |
| Phase 2: rationale + roadmap-complete detail | PASS | Verified | CR-3 cleanup advisory |
| Phase 3: docs and rule sites | PASS | Verified | "Quote the value" bullet added |
| Phase 4: tests | PASS | Verified | 186/186 |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Unit suite | all pass | 186/186 (`command node --test evals/develop-next/unit/select-next.test.mjs`) | PASS |
| Fast gate | green | `npm run ci:fast` 6,416 tests, 0 fail (qa-fix cycle 1, attempt 2, at the committed tree) | PASS |
| Wall time | ≤ 110% of develop | 102.7% (cycle 1). Not re-measured; the fix adds one `indexOf` | PASS |
| validate | 0 errors | `npm run validate -- skills/develop-next/` and `skills/create-task/` both pass | PASS |
| Formatting | clean | `prettier --check` clean | PASS |

---

## Breaking Changes Validation

None. The new key is optional. The reviewer compared old and new `frontmatterScalar` on all 522 tracked frontmatter values and found 0 differences.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

- TASK-235-CR2-1: an escaped or doubled quote ends a quoted value early. It is new to this branch: base reads the whole text, though it keeps the escapes.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS

Cycle 1 measured 102.7%. This cycle's change is a constant-cost scan per quoted scalar.

### Reliability — PASS

Every tracked document parses the same as before.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 21
- `security-probe.mjs --entry select-next.mjs#externalBlockOf` with 21 cases (17 hostile, 4+2 legitimate) gives verdict `engages`, 0 reproduced and 0 escaped. Record: `task.235.qa.2.security.run.json`.

### Maintainability — PASS

The neutral example names keep the develop-batch consumer-fact guard green.

---

## Code Review

**Correctness bugs (2):**

- [low/high] `skills/develop-next/scripts/select-next.mjs:1082`: an escaped or doubled quote ends a quoted value early → skip and unescape `\"` and `''`. **Promoted: TASK-235-CR2-1.**
- [low/medium] `skills/develop-next/scripts/select-next.mjs:1023`: `blocked_on_external: false` holds the row on a condition named "false" → treat YAML `false`/`no` as unset, or reject them. Advisory (medium confidence).

**Cleanups (1):**

- `skills/develop-next/scripts/select-next.mjs:940`: the document-status count is a remainder, so malformed rows land in it → count causes on a positive marker. Advisory.

boundary: true (externalBlockOf). probes_executed: 21. escaped: 0.

mutation-proven: quote branch in frontmatterScalar disabled → `235 CR-1` red (185/186) → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| develop-batch protocol suite (consumer-fact guard) | PASS |
| Full fast tier | PASS (6,416, 0 fail) |

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test evals/develop-next/unit/select-next.test.mjs
npm run -s validate -- skills/develop-next/ ; npm run -s validate -- skills/create-task/
command node .agents/skills/qa-task/references/security-probe.mjs --sink markdown-structure \
  --cases-file t235-probe-cases-2.json --entry 'skills/develop-next/scripts/select-next.mjs#externalBlockOf' \
  --record docs/tasks/task.235.select-next-external-precondition/task.235.qa.2.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/create-task/SKILL.md \
  --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
```

### Coverage Report

Not measured (the Node test runner has no coverage instrumentation configured for this suite).

---

## Recommendations

### Immediate Actions (Blocking)

None. The gate is PASS. TASK-235-CR2-1 enters the fix loop as a promoted LOW.

### Short-term Actions (Non-Blocking)

1. CR-2: decide whether `false`/`no` is an unset value or a filing error.
2. CR-3: count rationale causes on a positive marker.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No HIGH or MEDIUM findings and every NFR passes. One promoted LOW.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.235.qa.2.select-next-external-precondition.md`
**Gate File**: co-located at `task.235.gate.2.select-next-external-precondition.yml`
**Next Steps**: qa-fix cycle 2 for TASK-235-CR2-1
