# QA Report: Task 320 - Task 319's leftover findings are closed

**Task**: [Link to task document](./task.320.task-319-leftover-findings.md)
**Gate File**: [task.320.gate.3.task-319-leftover-findings.yml](./task.320.gate.3.task-319-leftover-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-25
**Testing Completed**: 2026-11-25
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T320-CR-201 | ✅ FIXED: the run halts and deletes nothing; one place states the recovery, with its condition and the checkout. Bug 2 closed |
| T320-CR-202 | ⚠️ PARTIAL: the recorded input is refused; a commented-out criteria heading is T320-CR-301 |
| T320-CR-203 | ✅ FIXED |
| T320-CR-204 | ✅ FIXED |
| T320-CR-205 | ✅ FIXED |
| T320-CR-206 | ⚠️ PARTIAL: T320-CR-302 (two characters left) and T320-CR-303 (too wide in a comment) |

Bug 1 is reopened for T320-CR-301 and T320-CR-304.

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-at-head.js:940`: T320-CR-301
- **[low]** `shared/resources/ci-tree-equivalence.js:560`: T320-CR-302
- **[low]** `shared/resources/ci-tree-equivalence.js:566`: T320-CR-303
- **[low]** `shared/resources/finalise-rerun-at-head.js:299`: T320-CR-304
- **[low]** `shared/resources/finalise-rerun-at-head.js:290`: T320-CR-305
- **[low]** `docs/reference/configuration.md:314`: T320-CR-306

---

## Executive Summary

Cycle 2's fixes close the inputs they name, and bug 2. The new comment removal runs after the document is split, which reopens the hole for a commented-out heading.

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

Direct tools, and one read-only reviewer (170 s, `duration_ms`).

Re-review scope: files changed since gate 2 (head 5afd1ebd54ae; 32 files) — default. Safety re-probe: false.

Diff review: code review.

CI on 8463205492d8: green

Step 4b: the two changed `SKILL.md` files have prose changes only, no changed block. Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: review commit). Changelog: cites (task 320).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1: The re-run engine | CONCERNS | Verified | T320-CR-301, 304, 305 |
| 2: `push-held.sh` | PASS | Verified | |
| 3: `tick-pr.sh` and the configuration | CONCERNS | Verified | T320-CR-302, 303 |
| 4: Documents | CONCERNS | Verified | T320-CR-306 |

**Overall Phase Completion**: 4/4 delivered

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | T319-CR-1201 | T319-CR-805, two tests | PARTIAL: T320-CR-301, 304 |
| 2 | T319-CR-1202 | T319-CR-1005 | PASS |
| 3 | T319-CR-1203 | T319-CR-1203 | PASS |
| 4 to 6 | T319-CR-1302, 1303, 1304 | `push-policy.test.mjs`, `tick-pr.test.mjs` | PASS |
| 7 | The limit of 1301 is stated | `tick-pr.sh`, `develop-next/SKILL.md`, `configuration.md` | PASS |
| 8 | Escaped keys refused | CR3-3, 406, the pipeline block | PASS |
| 9 | Marker edge | "ci.skipMarker is one printable line" | PARTIAL: T320-CR-302 |
| 10 | No new test over 30 s | durations below | PASS |
| 11 | Red before, red runs here | below | PASS |
| 12 | Mutation table | below | PASS |
| 13 | `npm test` under `CI=true`; bundle | 8897 tests, 0 fail on the second run; `bundle:check` 129 skills, 0 problems | PASS |
| 14 | `npm run validate -- skills/develop-next/` | exit 0 | PASS |
| 15 | CHANGELOG | cites | PASS |
| 16 | The reference on `ci.skipMarker` | `configuration.md` | PASS, once T320-CR-302 is closed |
| 17 | Task 319's Deferred Work | unchanged | PASS |

### The suite (criterion 13)

`npm run test:remote -- --timeout-min 60 --run test` at 8463205492d8, twice (the container sets `CI=true`).

| Run | Result |
| --- | --- |
| 1 | 8897 tests, 8893 pass, **1 fail**, 3 skipped, exit 1 |
| 2 | 8897 tests, 8894 pass, 0 fail, 3 skipped, exit 0 |

The failure of run 1 is SEC-1b for SIGTERM (`ci-tree-equivalence.test.mjs:3338`): the child was still there one second after the engine died. The branch changes neither that test nor the signal code of the engine, the test passed ten times of ten when run alone, and CI is green on this head. It is in the gate's `recommendations.future`.

### Durations (criterion 10)

Server `uptime`, run 1: before load 0.50, 1.57, 4.74; after 2.56, 10.10, 10.50. The other load is not this run's alone, and the slower of the two figures is the one that counts.

| Test | Run 1 | Run 2 |
| --- | --- | --- |
| no criterion the reader can find, read past (T319-CR-805) | 7.2 s | 1.7 s |
| no criterion the reader can find, refused (T319-CR-805) | 14.2 s | 4.3 s |
| a backtick with no partner (T319-CR-1005) | 6.1 s | 1.8 s |
| a file beside a submodule (T319-CR-1203) | 13.0 s | 2.8 s |
| the SIGSTOP case (T319-CR-1303) | 16.4 s | 13.6 s |
| a fetch that brought the commit and then failed (T319-CR-1302) | 13.3 s | 6.7 s |
| `start` from a subdirectory (T319-CR-1304) | 2.7 s | 3.6 s |
| a second spelling of a submodule's directory (T319-CR-1203) | 2.2 s | 0.4 s |
| the marker | under 0.1 s | under 0.1 s |

### Red before the change (criterion 11)

The cases of cycle 2, run against `5afd1ebd5`:

```bash
command node --test --test-name-pattern="T319-CR-805|T319-CR-1005|one printable line" \
  shared/resources/tests/finalise-rerun-at-head.test.mjs shared/resources/tests/push-policy.test.mjs
# 4 tests, 2 fail: "refused when a listed command is named (T319-CR-805)", "one printable line"
```

The runs against the merge base and `601134810` are in [QA report 1](./task.320.qa.1.task-319-leftover-findings.md) and [QA report 2](./task.320.qa.2.task-319-leftover-findings.md).

### Mutation table (criterion 12)

62 mutations, 61 red. The green one is `sub === d`, the equivalent shortcut of QA report 1. Those of cycle 2's fixes:

| Reverted | Test that went red | Outcome |
| --- | --- | --- |
| 101, 202 to 204: each shape of the allow-list, its limits, the comment removal, both reader headings (20) | T319-CR-805 | covered |
| 205: the quadratic matcher | T319-CR-805, read past or refused (run with a 20 s limit; at the default 60 s the mutant outlives the harness) | covered |
| 206: the row's start, end, end before a comment, what is in the quotes; the value's ends; a tab inside it (7) | the marker test | covered |

---

## Breaking Changes Validation

Documented with a migration path in the task (§ 6) and in CHANGELOG. **PASS**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

- **T320-CR-301**: [task.320.bug.1.criteria-heading-narrows-the-search.md](./task.320.bug.1.criteria-heading-narrows-the-search.md), reopened

### LOW Severity Issues (5)

T320-CR-302, T320-CR-303, T320-CR-304 (bug 1), T320-CR-305, T320-CR-306.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 5

---

## NFR Assessment

### Performance — PASS

T320-CR-205 is closed.

### Reliability — PASS

SEC-1b, above.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 81; escaped 0 (`task.320.qa.3.task-319-leftover-findings.security.run.json`)
- `parseConfig` 37 of 37, the criteria search 17 of 17, `parsePipelineConfig` 9 of 9, `push-held.sh --site` 18 of 18

### Maintainability — PASS

The deny-list became an allow-list.

---

## Code Review

**Correctness bugs (6):** each run by QA on this head, on `5afd1ebd5` and on `origin/develop`, with its control.

| Finding | Reviewer | Input | Here | `5afd1ebd5` | `develop` | Control |
| --- | --- | --- | --- | --- | --- | --- |
| T320-CR-301 | medium/high | a commented `## AC1`, or `## Acceptance Criteria` | `none-named` | `scan-broken` | `none-named` | no `## ` in the comment: `scan-broken` |
| T320-CR-302 | low/high | U+2028 after, U+2029 before, U+2028 outside the quotes | dropped | dropped | dropped | U+00A0: refused |
| T320-CR-303 | low/high | U+00A0 at the end of the comment, or before a `#` in it | refused | accepted | accepted | U+00A0 elsewhere in it: accepted |
| T320-CR-304 | low/high | `When the list below passes, this is done.` | `none-named` | `none-named` | `none-named` | `Below.`: `scan-broken` |
| T320-CR-305 | low/high | an opener in a fence | `scan-broken` | `none-named` | `none-named` | no opener: `none-named` |
| T320-CR-306 | low/medium | a section with a plain paragraph | `scan-broken` | `none-named` | `none-named` | the reference row says otherwise |

T320-CR-304 is the same at the base, and the class is in the task's scope (criterion 1), so it stays. A literal opener in a code span (the reviewer's second case of T320-CR-305) did not reproduce on this input: a list item stood before it.

**Cleanups (1):**

- `skills/finalise/SKILL.md:614`: the sentence puts "the reader returns no criterion" in front of the two refusals that need one to be read

All six bugs are in the gate. Boundary: true (`boundary_signals`: refused, refuses).

---

## Regression Testing

`lint:shell`, `bundle:check` and `validate` clean. **PASS**

---

## Test Artifacts

### Test Commands Executed

```bash
npm run test:remote -- --timeout-min 60 --run test        # twice, above
npm run validate -- skills/develop-next/                  # ok
npm run validate -- skills/finalise/                      # ok
npm run bundle:check                                      # 129 skills, 0 problems
npm run lint:shell                                        # clean
```

Coverage: not measured (the suite has no coverage run).

---

## Recommendations

### Immediate Actions (Blocking)

1. T320-CR-301

### Short-term Actions (Non-Blocking)

1. T320-CR-302 to T320-CR-306, and the cleanup

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T320-CR-301 is closed

---

**Next Steps**: `/qa-fix`
