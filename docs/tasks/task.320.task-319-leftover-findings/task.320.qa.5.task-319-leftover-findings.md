# QA Report: Task 320 - Task 319's leftover findings are closed

**Task**: [Link to task document](./task.320.task-319-leftover-findings.md)
**Gate File**: [task.320.gate.5.task-319-leftover-findings.yml](./task.320.gate.5.task-319-leftover-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-25
**Testing Completed**: 2026-11-25
**Gate Status**: CONCERNS

---

## Re-Review Context

This cycle follows DoD run 1. Gate 4 was PASS, its four low findings carried.

| Previous issue | Status |
| --- | --- |
| DoD gap 1 (a near-miss key after a block scalar) | ✅ FIXED: the recorded inputs are refused. The exact key is T320-CR-502 |
| DoD gap 2 (a fence marker in a comment) | ⚠️ PARTIAL: the recorded input is read past, and the fix opens T320-CR-501 |
| DoD gap 3 (five timed runs) | open: taken on the final head |
| T320-CR-401 to T320-CR-404 | carried, unchanged |

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-at-head.js:312`: T320-CR-501, [bug 3](./task.320.bug.3.opener-as-text-hides-a-fence.md)
- **[medium]** `shared/resources/ci-tree-equivalence.js:694`: T320-CR-502, [bug 4](./task.320.bug.4.exact-key-the-parse-never-reached.md)
- **[low]** `shared/resources/ci-tree-equivalence.js:454`: T320-CR-503
- **[low]** `shared/resources/tests/ci-tree-equivalence.test.mjs:1497`: T320-CR-504

---

## Executive Summary

The fixes of the DoD gaps close the recorded inputs. The fence fix accepts documents that were refused before it, and the key fix loses one refusal and leaves the exact key unchecked.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#949)

### Review Methodology

Direct tools, and one read-only reviewer (205 s, `duration_ms`).

Re-review scope: files changed since gate 4 (head c160ee638e2d; 51 files) — default. Safety re-probe: false.

Diff review: code review. The reviewer read the fix commit whole and did not read the rest of the branch patch again line by line.

CI on 90aabca6ca9d: green

Step 4b: the fix changes no `SKILL.md` and no prompt. Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: review commit). Changelog: cites (task 320).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1: The re-run engine | CONCERNS | Verified | T320-CR-501 |
| 2: `push-held.sh` | PASS | Verified | unchanged |
| 3: `tick-pr.sh` and the configuration | CONCERNS | Verified | T320-CR-502, 503 |
| 4: Documents | PASS | Verified | |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | T319-CR-1201 | T319-CR-805 | CONCERNS: T320-CR-501 |
| 2 to 7 | as in [QA report 4](./task.320.qa.4.task-319-leftover-findings.md) | unchanged code | PASS |
| 8 | Escaped keys refused | CR3-3, 406, the pipeline block; `sweep` of 24 shapes before the key, all refused (develop: all accepted) | PASS; T320-CR-502 is the exact key |
| 9 | Marker edge | unchanged | PASS |
| 10 | No new test over 30 s | five runs on the final head | not verified this cycle |
| 11, 12 | Red before; mutation table | below | PASS |
| 13 | `npm test` under `CI=true`; bundle | 8897 tests, 8894 pass, 0 fail, 3 skipped; `bundle:check` 129 skills, 0 problems | PASS |
| 14 | `npm run validate` | `develop-next`, `finalise`: ok | PASS |
| 15 to 17 | Documents | unchanged; CHANGELOG cites | PASS |

### Red before the change (criterion 11)

The new cases were run before the fix and were red: CR3-3, the pipeline block, T319-CR-406, and T319-CR-805 (read past). The lone-CR case was red with its one line reverted.

### Mutation table (criterion 12)

Ten mutations of the fix in a full copy of the tracked tree; the baseline was green.

| Reverted | Test that went red | Outcome |
| --- | --- | --- |
| the source keys, at the `ci` / `pipeline` / `finalise` reader (3) | CR3-3 / the pipeline block / T319-CR-406 | covered |
| the indent filter | T319-CR-406, the pipeline block, T319-CR-805 | covered |
| column 0 only | CR3-3 | covered |
| the fence split on the raw text | T319-CR-805, read past | covered |
| `closedOnly` off; an opener on the last closing line (2) | T319-CR-805, refused | covered |
| the lone CR | the pipeline block | covered |
| the parsed keys | none, so they were removed; that was wrong (T320-CR-503) | no-red-untested |

---

## Breaking Changes Validation

Breaking change 1 now names the block scalar; migration path unchanged. **PASS**

---

## Issues Found

HIGH: 0. MEDIUM: 2 (T320-CR-501, T320-CR-502). LOW: 2 (T320-CR-503, T320-CR-504).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS

The five runs of criterion 10 are taken on the final head.

### Reliability — PASS

The suite and CI are green on this head.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 117; reproduced 6; escaped 0 (`task.320.qa.5.task-319-leftover-findings.security.run.json`)
- T320-CR-501 one case, T320-CR-502 four, T320-CR-503 one. The cases of the earlier cycles all hold

### Maintainability — PASS

One helper reads the keys.

---

## Code Review

**Correctness bugs (4):** each run by QA on this head, on `c160ee638` and on `origin/develop`, with its control.

| Finding | Reviewer | Input | Here | `c160ee638` | `develop` | Control (here) |
| --- | --- | --- | --- | --- | --- | --- |
| T320-CR-501 | medium/high | an opener in a sentence, in a sentence before an arrow, or escaped, then a fence | `none-named` | `scan-broken` | `none-named` | no closer, or no opener: `scan-broken` |
| T320-CR-502 | medium/high | the exact key, the file indented whole, or after a lone CR | accepted | accepted | accepted | the file not indented: refused |
| T320-CR-503 | low/high | `CI`, a CR, the colon | accepted | refused | refused | `CI:` refused |
| T320-CR-504 | low/high | a case joined to a comment | not run | run | (no such case) | the engine refuses the input |

T320-CR-502 is the same at the base. It stays in the gate: it is the class of DoD gap 1, and the reference says the parse must account for every row of the block.

Boundary: true (`boundary_signals`: refused, refuses).

---

## Regression Testing

`lint:shell`, `bundle:check` and `validate` clean. All 1,237 tracked YAML files parse as on `develop`. **PASS**

---

## Test Artifacts

### Test Commands Executed

```bash
npm run test:remote -- --timeout-min 60 --run test        # above
npm run validate -- skills/develop-next/                  # ok
npm run validate -- skills/finalise/                      # ok
npm run bundle:check                                      # 129 skills, 0 problems
npm run lint:shell                                        # clean
```

Coverage: not measured (the suite has no coverage run).

---

## Recommendations

### Immediate Actions (Blocking)

1. T320-CR-501 and T320-CR-502

### Short-term Actions (Non-Blocking)

1. T320-CR-503 and T320-CR-504; T320-CR-401 to T320-CR-404 stay carried

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: two medium findings
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL

---

**Next Steps**: `/qa-fix`, then gate 6
