# QA Report: Task 320 - Task 319's leftover findings are closed

**Task**: [Link to task document](./task.320.task-319-leftover-findings.md)
**Gate File**: [task.320.gate.2.task-319-leftover-findings.yml](./task.320.gate.2.task-319-leftover-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-25
**Testing Completed**: 2026-11-25
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T320-CR-101 | ⚠️ PARTIAL: the recorded input is refused; T320-CR-202, 203 and 204 are inputs of the same class. Bug 1 reopened |
| T320-CR-102 | ⚠️ PARTIAL: the condition is stated, and cannot be carried out as written (T320-CR-201). Bug 2 reopened |
| T320-CR-103 | ✅ FIXED |
| T320-CR-104 | ⚠️ PARTIAL: an unquoted or outside character is refused; the quoted no-break space is still dropped (T320-CR-206) |
| T320-CR-105 | ✅ FIXED |

## New Findings This Cycle

Six, all in the fixes of cycle 1: T320-CR-201 (medium), T320-CR-202 to T320-CR-206 (low).

---

## Executive Summary

Cycle 1's fixes close the inputs they name. A refute pass over the whole branch found that the recovery for T319-CR-1301 fails at its first command, and that the rule for "nothing is written here" misses four shapes.

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

Direct tools, and one read-only reviewer over the whole branch diff, told to refute it (546 s, `duration_ms`). Safety re-probe: false.

CI on 5afd1ebd54ae: green

Step 4b: `skills/develop-next/SKILL.md` has prose changes only, no changed block. Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: review commit). Changelog: cites (task 320).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1: The re-run engine | CONCERNS | Verified | T320-CR-202 to 205 |
| 2: `push-held.sh` | PASS | Verified | |
| 3: `tick-pr.sh` and the configuration | CONCERNS | Verified | T320-CR-201, 206 |
| 4: Documents | CONCERNS | Verified | T320-CR-201 |

**Overall Phase Completion**: 4/4 delivered

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | T319-CR-1201 | T319-CR-805 | PARTIAL: T320-CR-202, 203, 204 |
| 2 | T319-CR-1202 | T319-CR-805 | PASS |
| 3 | T319-CR-1203 | T319-CR-1203 | PASS |
| 4 to 6 | T319-CR-1302, 1303, 1304 | `push-policy.test.mjs`, `tick-pr.test.mjs` | PASS |
| 7 | The limit of 1301 is stated | `tick-pr.sh`, `develop-next/SKILL.md`, `configuration.md` | CONCERNS: T320-CR-201 |
| 8 | Escaped keys refused | CR3-3, 406, the pipeline block | PASS |
| 9 | Marker edge | "ci.skipMarker is one printable line" | PARTIAL: T320-CR-206 |
| 10 | No new test over 30 s | durations below | PASS, with no room left in T319-CR-805 |
| 11 | Red before, red runs here | below | PASS |
| 12 | Mutation table | below | PASS |
| 13 | `npm test` under `CI=true`; bundle | 8895 tests, 0 fail; `bundle:check` 129 skills, 0 problems | PASS |
| 14 | `npm run validate -- skills/develop-next/` | exit 0 | PASS |
| 15 | CHANGELOG | cites | PASS |
| 16 | The reference on `ci.skipMarker` | `configuration.md` | PASS, once T320-CR-206 is closed |
| 17 | Task 319's Deferred Work | unchanged | PASS |

### Durations (criterion 10)

`npm run test:remote -- --timeout-min 60 --run test` at 5afd1ebd54ae (the container sets `CI=true`). `uptime` before: load 8.07, 11.94, 11.44. After: load 8.07, 16.95, 18.76.

| Test | Duration |
| --- | --- |
| no criterion the reader can find (T319-CR-805, extended) | 29.7 s |
| a file beside a submodule (T319-CR-1203) | 19.8 s |
| the SIGSTOP case (T319-CR-1303) | 16.4 s |
| a fetch that brought the commit and then failed (T319-CR-1302) | 11.6 s |
| `start` from a subdirectory (T319-CR-1304) | 4.4 s |
| a second spelling of a submodule's directory (T319-CR-1203) | 2.9 s |
| the marker | under 0.1 s |

### Red before the change (criterion 11)

The two suites as extended in cycle 1, run against `601134810`: 87 tests, 3 fail.

| Test | Failure |
| --- | --- |
| 805 | an empty known section: `none-named` |
| 1203 | an ignored file beside a submodule: `dirty-tree` |
| the marker test | an unquoted BOM: accepted |

The runs against the merge base are in [QA report 1](./task.320.qa.1.task-319-leftover-findings.md).

### Mutation table (criterion 12)

41 mutations, 40 red. The green one is `sub === d`, the equivalent shortcut of QA report 1. The 20 of cycle 1's fixes:

| Reverted | Test that went red | Outcome |
| --- | --- | --- |
| 101: only a known section places; headings; comments; rules; a fenced line; AC headings; both reader headings (7) | T319-CR-805 | covered |
| 103: line breaks; blank line; the count joins lines (3) | T319-CR-805 | covered |
| 105: ignored left out; nothing left out wrongly; NUL rows; own case rule (4) | T319-CR-1203 | covered |
| 104: the row check; only in `ci`; a tab; CRLF; a lone CR; a space before the colon (6) | the marker test | covered |

---

## Breaking Changes Validation

Documented with a migration path in the task (§ 6) and in CHANGELOG. **PASS**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

- **T320-CR-201**: [task.320.bug.2.tick-recovery-deletes-an-unlanded-tick.md](./task.320.bug.2.tick-recovery-deletes-an-unlanded-tick.md), reopened

### LOW Severity Issues (5)

T320-CR-202, T320-CR-203 and T320-CR-204 ([bug 1](./task.320.bug.1.criteria-heading-narrows-the-search.md), reopened), T320-CR-205, T320-CR-206.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 5

---

## NFR Assessment

### Performance — PASS

T320-CR-205 is counted as a finding.

### Reliability — PASS

T320-CR-201 is an instruction, counted as a finding.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 69; escaped 0 (`task.320.qa.2.task-319-leftover-findings.security.run.json`)
- `parseConfig` 29 of 29, the criteria search 13 of 13, `parsePipelineConfig` 9 of 9, `push-held.sh --site` 18 of 18

### Maintainability — PASS

One helper added.

---

## Code Review

**Correctness bugs (6):** as returned, with the reviewer's CR-1 and CR-5 recorded as one finding, and T320-CR-206 found by QA.

- [medium/high] `skills/develop-next/SKILL.md:663`: T320-CR-201. Confirmed by reading: `start` checks the tick branch out and exits (`tick-pr.sh:182`), so deleting it fails; the `landed` arm goes back to the base first (`restore_base`, `tidy`). The header's shorter condition: `tick-pr.sh:105` ([low/medium], the reviewer's CR-5)
- [low/high] `shared/resources/finalise-rerun-at-head.js:271`: T320-CR-202. Reproduced: `none-named`; control: `scan-broken`
- [low/high] `shared/resources/finalise-rerun-at-head.js:275`: T320-CR-203. Reproduced for the fence, the tag and the underlined heading; control: `scan-broken`
- [low/high] `shared/resources/finalise-rerun-at-head.js:913`: T320-CR-204. Reproduced: `none-named`; control: `scan-broken`
- [low/high] `shared/resources/finalise-rerun-at-head.js:271`: T320-CR-205. Reproduced: 259, 514, 1554 ms; control 219 ms
- [low/high] `shared/resources/ci-tree-equivalence.js`: T320-CR-206, the part of T320-CR-104 that was not fixed. Reproduced: a quoted no-break space at the end is accepted and dropped; control, a quoted BOM: refused

**Cleanups (0):** none.

All are in the gate. Boundary: true (`boundary_signals`: refused, refuses).

---

## Regression Testing

Full suite green; `lint:shell` and `bundle:check` clean. **PASS**

---

## Test Artifacts

### Test Commands Executed

```bash
npm run test:remote -- --timeout-min 60 --run test        # 8895 tests, 8892 pass, 0 fail, 3 skipped, exit 0
npm run validate -- skills/develop-next/                  # ok
npm run bundle:check                                      # 129 skills, 0 problems
npm run lint:shell                                        # clean
```

Coverage: not measured (the suite has no coverage run).

---

## Recommendations

### Immediate Actions (Blocking)

1. T320-CR-201

### Short-term Actions (Non-Blocking)

1. T320-CR-202 to T320-CR-206
2. Build T319-CR-805 on one fixture, so that it has room under 30 s

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T320-CR-201 is closed

---

**Next Steps**: `/qa-fix`
