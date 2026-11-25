# QA Report: Task 320 - Task 319's leftover findings are closed

**Task**: [Link to task document](./task.320.task-319-leftover-findings.md)
**Gate File**: [task.320.gate.6.task-319-leftover-findings.yml](./task.320.gate.6.task-319-leftover-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-25
**Testing Completed**: 2026-11-25
**Gate Status**: CONCERNS

---

## Re-Review Context

This is the last cycle the budget allows (6 of 6). It follows the qa-fix of gate 5.

| Previous issue | Status |
| --- | --- |
| T320-CR-501 (an opener that is only text hides a fence) | ✅ FIXED: the recorded inputs answer `scan-broken`. Its edges are T320-CR-601 and T320-CR-603 |
| T320-CR-502 (the exact key the parse never reaches) | ✅ FIXED: indented, lone-CR, anchor, tag and `?` forms refused. Its edge is T320-CR-602 |
| T320-CR-503 (a refusal lost) | ✅ FIXED |
| T320-CR-504 (a joined case) | ✅ FIXED |
| DoD gap 3 (five timed runs) | ✅ measured on this head, below |
| T320-CR-401 to T320-CR-404 | carried, unchanged |

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-at-head.js:334`: T320-CR-601, [bug 5](./task.320.bug.5.opener-inside-an-html-block-hides-a-fence.md)
- **[low]** `shared/resources/ci-tree-equivalence.js:463`: T320-CR-602
- **[low]** `shared/resources/finalise-rerun-at-head.js:334`: T320-CR-603

---

## Executive Summary

Every finding of gate 5 is fixed and held by a test that was red before. The two rules the fix introduced still miss three rarer shapes: an HTML block, a comment after an explicit key or an alias key, and an indented comment.

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

Direct tools, and one read-only reviewer (634 s, `duration_ms`).

Re-review scope: files changed since gate 5 (head 90aabca6ca9d; 37 files) — default. Safety re-probe: false (`qa-safety-clause1.sh` on gate 5).

Diff review: code review over the branch patch, scoped to the `shared/resources/` sources, with the delta since gate 5 named. The reviewer used markdown-it and PyYAML as outside controls.

CI on 7cae65a149fb: green (push of the qa-fix commit).

Step 4b: the fix changes no `SKILL.md` and no prompt. Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: review commit). Changelog: cites (task 320).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1: The re-run engine | CONCERNS | Verified | T320-CR-601, 603 |
| 2: `push-held.sh` | PASS | Verified | unchanged |
| 3: `tick-pr.sh` and the configuration | CONCERNS | Verified | T320-CR-602 |
| 4: Documents | PASS | Verified | |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | T319-CR-1201 | T319-CR-805, T320-CR-501 | CONCERNS: T320-CR-601, 603 |
| 2 to 7 | as in [QA report 4](./task.320.qa.4.task-319-leftover-findings.md) | unchanged code | PASS |
| 8 | Escaped keys refused | CR3-3, T319-CR-406, the pipeline block | PASS; T320-CR-602 is two rarer spellings |
| 9 | Marker edge | unchanged | PASS |
| 10 | No new test over 30 s | five timed runs, below | PASS |
| 11, 12 | Red before; mutation table | below | PASS |
| 13 | `npm test` under `CI=true`; bundle | 8898 tests, 8895 pass, 0 fail, 3 skipped; `bundle:check` 129 skills, 0 problems | PASS |
| 14 | `npm run validate` | `develop-next`, `finalise`: ok | PASS |
| 15 to 17 | Documents | CHANGELOG, configuration.md and Breaking Change 1 name the new refusals | PASS |

### Five timed runs (criterion 10)

The four suites (`ci-tree-equivalence`, `push-policy`, `finalise-rerun-at-head`, `tick-pr`) at `7cae65a14`, five times in a row on the laptop, with nothing else running. Each run: 235 tests, 235 pass. Seconds, median of five, then maximum:

| Test | Median | Max |
| --- | ---: | ---: |
| push-held says what is the remote's … (T319-CR-904, CR-905) | 26.0 | 27.1 |
| a HALT whose push … answers nothing still halts (T319-CR-505) | 21.8 | 22.3 |
| the entry to /finalise: nothing held leaves 5c's set staged … | 13.8 | 13.9 |
| push-held: a push the watcher killed while the script was stopped … | 13.5 | 13.6 |
| bitbucket: red, pending or unread CI never merges | 13.1 | 13.5 |

No test reaches 30 s at the median or at the maximum in any run.

| Run | Load before (1, 5, 15 min) | Load after |
| --- | --- | --- |
| 1 | 0.56, 0.55, 0.76 | 1.53, 1.20, 1.00 |
| 2 | 1.53, 1.20, 1.00 | 1.66, 1.60, 1.19 |
| 3 | 1.66, 1.60, 1.19 | 1.55, 1.73, 1.31 |
| 4 | 1.55, 1.73, 1.31 | 1.38, 1.76, 1.40 |
| 5 | 1.38, 1.76, 1.40 | 1.97, 2.05, 1.57 |

### Red before the change (criterion 11)

The cycle-5 cases were run against `90aabca6c`: CR3-3, the pipeline block, T319-CR-406 and T320-CR-501, 4 tests, 4 fail.

### Mutation table (criterion 12)

Twenty mutations of the cycle-5 fix in a full copy of the tracked tree; the baseline was green; all 20 red. One, a comment block that never closes, survived the first run, and a case was added for it.

| Reverted | Test that went red | Outcome |
| --- | --- | --- |
| written keys, parsed keys dropped from the union (2) | CR3-3, T319-CR-406, the pipeline block | covered |
| indent filter removed; column 0 only (2) | CR3-3, T319-CR-406, the pipeline block | covered |
| lone CR not a line end | CR3-3, T319-CR-406, the pipeline block | covered |
| `?` and anchor/tag prefixes not read (2) | CR3-3 | covered |
| written-key count off, or off by one either way (3) | CR3-3, and others | covered |
| each reader's call site (3) | CR3-3 / the pipeline block / T319-CR-406 | covered |
| no comment block; opener anywhere, indented, unclosed, closed on its own line (5) | T320-CR-501 | covered |
| a block never closes; fences read inside a block (2) | T320-CR-501, T319-CR-805 | covered |

---

## Breaking Changes Validation

Breaking Change 1 names the exact key in an indented or lone-CR file and behind an anchor, a tag or `?`; migration path: write the key plainly, at column 0, once. No tracked YAML file parses differently. **PASS**

---

## Issues Found

HIGH: 0. MEDIUM: 1 (T320-CR-601). LOW: 2 (T320-CR-602, T320-CR-603).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

Criterion 10 holds on this head (above).

### Reliability — PASS

The full suite is green on the server on this head, and CI is green.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 126; hostile reproduced 6; legitimate refused 2; escaped 0 (`task.320.qa.6.task-319-leftover-findings.security.run.json`)
- New cases: `task.320.qa.6.security.cases-{rerun,config,pipeline}.json`. T320-CR-601 two cases, T320-CR-602 four, T320-CR-603 two legitimate refused. All 117 earlier cases hold, the 6 that reproduced at gate 5 included

### Maintainability — PASS

The key checks live in `assertBlockRows`, which every block reader calls.

---

## Code Review

**Correctness bugs (3):** each run by QA on this head, with its control.

| Finding | Reviewer | Input | Here | `90aabca6c` (reviewer's run) | Control (here) |
| --- | --- | --- | --- | --- | --- |
| T320-CR-601 | medium/medium | `<details>`, `<div>`, `<pre>` or `<table>`, then a column-0 opener, then a fence holding `## y`; a comment later | `none-named` (4 of 4) | `none-named` | no later closer: `scan-broken` |
| T320-CR-602 | low/high | `? ci # c` then `: docsOnly:`; `*k :` after `a: &k ci`; the same for `pipeline` | defaults (4 of 4) | — | `? ci` alone: refused |
| T320-CR-603 | low/high | a closed comment holding a fence marker, indented 1 or 3 spaces, or in a list item; the command only under `## Other` | `scan-broken` (4 of 4) | `none-named` | at column 0: `none-named` |

QA's own run of the `90aabca6c` engine did not work in the scratch tree (every answer `failed`: the old engine against the current sibling modules), so that column is the reviewer's reading. T320-CR-601 is not a regression; T320-CR-603 is one, in shapes no tracked document has (5021 checked).

Boundary: true (`boundary_signals`: refused, refuses).

---

## Regression Testing

`lint:shell`, `bundle:check` and `validate` clean. All 1,238 tracked YAML files parse as on `origin/develop`; all 5,021 tracked Markdown files split as on `c160ee638` and `90aabca6c`. **PASS**

---

## Test Artifacts

### Test Commands Executed

```bash
npm run test:remote -- --timeout-min 60 --run test        # 8898 tests, 0 fail
npm run validate -- skills/develop-next/                  # ok
npm run validate -- skills/finalise/                      # ok
npm run bundle:check                                      # 129 skills, 0 problems
npm run lint:shell                                        # clean
```

Coverage: not measured (the suite has no coverage run).

---

## Recommendations

### Immediate Actions (Blocking)

1. T320-CR-601

### Short-term Actions (Non-Blocking)

1. T320-CR-602 and T320-CR-603; T320-CR-401 to T320-CR-404 stay carried

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL

---

**Next Steps**: the budget is spent (cycle 6 of 6): the loop escalates with these findings open
