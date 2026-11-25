# QA Report: Task 320 - Task 319's leftover findings are closed

**Task**: [Link to task document](./task.320.task-319-leftover-findings.md)
**Gate File**: [task.320.gate.1.task-319-leftover-findings.yml](./task.320.gate.1.task-319-leftover-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-25
**Testing Completed**: 2026-11-25
**Gate Status**: CONCERNS

---

## Executive Summary

Six of the seven findings are closed in the form they were recorded, and one (T319-CR-1201) only in part: a heading that contains the word "criteria" still narrows the search when the known section is empty. The recovery text added for T319-CR-1301 can delete a tick that never landed. Three low findings stand beside them.

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

Direct tools, and one read-only reviewer over the whole branch diff (138 s, `duration_ms`). Diff review: code review. First review, so no scope narrowing.

CI on 6011348109d8: 1 failed (0 pre-existing). QA reads the failure as pre-existing: see "CI" below.

Step 4b: `skills/develop-next/SKILL.md` has prose changes only: changed blocks 0, executed 0; 21 blocks in the file, all refused as mutating (`no-executable-blocks`). Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: review commit). Changelog: cites (task 320). Record criteria: #11 names this report, and its record is below.

### CI

`test` failed on "lockctl take is atomic: of eight simultaneous takes exactly one wins": two takers won. Neither `scripts/remote-test/lockctl.sh` nor its test is in this change. Cause, measured:

| Where | `mkdir` | 300 rounds of 8 simultaneous `mkdir` on one path: rounds with more than one winner |
| --- | --- | --- |
| this machine | GNU coreutils 9.12 | 0 |
| container `ubuntu:26.04` (the runner's image) | uutils coreutils 0.10.0 | 259 |

The develop run before this one used the same image (20261116.202.1) and passed by luck. `pre-existing`, in the gate's `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1: The re-run engine | CONCERNS | Verified | T320-CR-101, 103, 105 |
| 2: `push-held.sh` | PASS | Verified | |
| 3: `tick-pr.sh` and the configuration | CONCERNS | Verified | T320-CR-102, 104 |
| 4: Documents | PASS | Verified | T320-CR-102 is in the documents too |

**Overall Phase Completion**: 4/4 delivered

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | T319-CR-1201 | `finalise-rerun-at-head.test.mjs` (805) | PARTIAL: T320-CR-101 |
| 2 | T319-CR-1202 | the same test | PARTIAL: T320-CR-103 |
| 3 | T319-CR-1203 | `finalise-rerun-at-head.test.mjs` (1203) | PASS; T320-CR-105 is the opposite direction |
| 4 | T319-CR-1302 | `push-policy.test.mjs` (1302, 904) | PASS |
| 5 | T319-CR-1303 | `push-policy.test.mjs` (1303) | PASS |
| 6 | T319-CR-1304 | `tick-pr.test.mjs` (1304) | PASS |
| 7 | The limit of 1301 is stated | `tick-pr.sh`, `develop-next/SKILL.md`, `configuration.md` | CONCERNS: T320-CR-102 |
| 8 | Escaped keys refused | CR3-3, 406, "the pipeline block refuses" | PASS |
| 9 | Marker edge | "ci.skipMarker is one printable line" | PARTIAL: T320-CR-104 |
| 10 | No new test over 30 s | durations below | PASS |
| 11 | Red before, red runs here | below | PASS, for this head; repeated in the last cycle's report |
| 12 | Mutation table | below | PASS, the same |
| 13 | `npm test` under `CI=true`; `npm run bundle` no diff | 8895 tests, 0 fail; `bundle:check` 129 skills, 0 problems | PASS |
| 14 | `npm run validate -- skills/develop-next/` | exit 0 | PASS |
| 15 | CHANGELOG | `changelog-cites.sh task.320`: cites | PASS |
| 16 | The reference on `ci.skipMarker` | `configuration.md` | CONCERNS: T320-CR-104 |
| 17 | Task 319's Deferred Work | seven entries "Closed by task 320" | PASS |

### Durations (criterion 10)

`npm run test:remote -- --timeout-min 60 --run test` at 6011348109d8 (the container sets `CI=true`). `uptime` before: load 22.74, 11.36, 13.51. After: load 0.42, 3.29, 8.38.

| Test | Duration |
| --- | --- |
| the SIGSTOP case (T319-CR-1303) | 13.7 s |
| a fetch that brought the commit and then failed (T319-CR-1302) | 5.0 s |
| no criterion the reader can find (T319-CR-805, extended) | 4.2 s |
| `start` from a subdirectory (T319-CR-1304) | 2.9 s |
| a file beside a submodule (T319-CR-1203) | 1.6 s |
| a second spelling of a submodule's directory (T319-CR-1203) | 0.3 s |
| the list (406), the marker and the pipeline block, each | under 0.01 s |

### Red before the change (criterion 11)

The new and extended tests, run against the source at the merge base `eb0226de6`:

| Test | Failure |
| --- | --- |
| CR3-3, an escaped `ci` | not refused |
| 406, an escaped `finalise` | not refused |
| 805, a fenced `## ` line, another criteria heading, backtick and unindented line | `none-named` |
| 1203, a file beside a submodule | not `dirty-tree` |
| the marker's edge | accepted |
| the pipeline block, escaped `pipeline` | not refused |
| 1303, stopped past the bound | `exit 137` |
| 904 with the 1302 cases | `could not be fetched (exit 1` |
| 1304 from a subdirectory | `resume` for `landed` |

Controls, green before and after: "a second spelling of a submodule's directory is the submodule (T319-CR-1203)" and both T319-CR-902 tests.

### Mutation table (criterion 12)

Each row reverts one remedy in a scratch copy. 20 of 21 are red.

| Reverted | Test that went red | Outcome |
| --- | --- | --- |
| 1201 fence-aware split; whole document; CRLF split (3) | T319-CR-805 | covered |
| 1202 joined text | T319-CR-805 | covered |
| 1203 beside a submodule; inode comparison; every parent (3) | T319-CR-1203 | covered |
| 1203 `sub === d` | none | no-red-dead (an equivalent shortcut: the inode comparison gives the same answer) |
| 1302 presence check; no submodules; refuse at all; reason read before (4) | T319-CR-1302 | covered |
| 1303 timeout; only past the bound (2) | T319-CR-1303 | covered |
| 1304 from the top | T319-CR-1304 | covered |
| escapes in `normKey`, seen by `ci`, `pipeline` and `finalise` (3) | CR3-3; the pipeline block; T319-CR-406 | covered |
| escapes in `listKeyRows` | T319-CR-406 | covered |
| marker edge; marker length of the trimmed text (2) | one printable line | covered |

---

## Breaking Changes Validation

Both are documented with a migration path in the task (§ 6) and in CHANGELOG: an escaped `ci`, `pipeline` or `finalise`, and a control or format character at the marker's edge. Migration tested by the tests named above. **PASS**, with T320-CR-104 for the spelling the second one misses.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

- **T320-CR-101**: [task.320.bug.1.criteria-heading-narrows-the-search.md](./task.320.bug.1.criteria-heading-narrows-the-search.md)
- **T320-CR-102**: [task.320.bug.2.tick-recovery-deletes-an-unlanded-tick.md](./task.320.bug.2.tick-recovery-deletes-an-unlanded-tick.md)

### LOW Severity Issues (3)

T320-CR-103, T320-CR-104 and T320-CR-105, below.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Performance — PASS

No new test over 30 s.

### Reliability — PASS

T320-CR-102 is an instruction, counted as a finding.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 56; escaped 0 (`task.320.qa.1.task-319-leftover-findings.security.run.json`)
- `parseConfig` 19 of 19, the criteria search (`cli:` form) 10 of 10, `parsePipelineConfig` 9 of 9, `push-held.sh --site` 18 of 18

### Maintainability — PASS

One reader of YAML escapes for three keys and the list rows.

---

## Code Review

**Correctness bugs (5):**

- [medium/high] `shared/resources/finalise-rerun-at-head.js:874`: T320-CR-101. Reproduced: `none-named`; control `## Rollback`: `scan-broken`. The base answers the same, and the shape is in scope (criterion 1)
- [medium/medium] `skills/develop-next/SKILL.md:661`: T320-CR-102. Reproduced by the committed test at `tick-pr.test.mjs:617`: an unlanded tick answers `resume`. Control: a landed tick beside a changed row answers `landed`
- [low/high] `shared/resources/finalise-rerun-at-head.js:903`: T320-CR-103. Reproduced: `none-named`; controls (indented, and no stray backtick): `scan-broken`
- [low/high] `shared/resources/ci-tree-equivalence.js:561`: T320-CR-104. Reproduced: an unquoted BOM or tab at the edge and a quoted NBSP or U+3000 are accepted and dropped; control, a quoted BOM: refused
- [low/high] `shared/resources/finalise-rerun-at-head.js:638` ⚠️ unverified anchor (text-mismatch): T320-CR-105, line 645. Reproduced: `dirty-tree`; controls (no submodule, and the base): `ran`

**Cleanups (0):** none.

All five are in the gate (`code_review_blocking`, and each reproduced by QA).

Boundary: true (`boundary_signals`: refused, refuses). Platform variance: no environment-derived path reaches a validating consumer in the diff.

---

## Regression Testing

Full suite green; `lint:shell`, `format:check` and `bundle:check` clean. **PASS**

---

## Test Artifacts

### Test Commands Executed

```bash
npm run test:remote -- --timeout-min 60 --run test        # 8895 tests, 8892 pass, 0 fail, 3 skipped, exit 0
npm run validate -- skills/develop-next/                  # ok
npm run bundle:check                                      # 129 skills, 0 problems
npm run lint:shell                                        # clean
npm run format:check                                      # clean
```

Files reviewed: the five changed sources under `shared/resources/`, their four suites, `skills/develop-next/SKILL.md`, `docs/reference/configuration.md`, `CHANGELOG.md`.

Coverage: not measured (the suite has no coverage run).

---

## Recommendations

### Immediate Actions (Blocking)

1. T320-CR-101 and T320-CR-102

### Short-term Actions (Non-Blocking)

1. T320-CR-103, T320-CR-104, T320-CR-105
2. `lockctl.sh` on a host with uutils coreutils (pre-existing)

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: two medium findings
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T320-CR-101 and T320-CR-102 are closed

---

**Next Steps**: `/qa-fix`
