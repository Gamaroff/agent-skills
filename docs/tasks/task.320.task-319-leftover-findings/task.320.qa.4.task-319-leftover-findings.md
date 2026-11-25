# QA Report: Task 320 - Task 319's leftover findings are closed

**Task**: [Link to task document](./task.320.task-319-leftover-findings.md)
**Gate File**: [task.320.gate.4.task-319-leftover-findings.yml](./task.320.gate.4.task-319-leftover-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-25
**Testing Completed**: 2026-11-25
**Gate Status**: PASS

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T320-CR-301 | ✅ FIXED |
| T320-CR-302 | ✅ FIXED |
| T320-CR-303 | ✅ FIXED |
| T320-CR-304 | ✅ FIXED: the recorded input is refused. Two paragraphs of prose are T320-CR-401 |
| T320-CR-305 | ✅ FIXED: fences and code spans. An indented code block is T320-CR-404 |
| T320-CR-306 | ✅ FIXED: the rule is stated; one clause of it is too wide (T320-CR-403) |

Bug 1 is closed: the headings it names no longer narrow the search. What T320-CR-401 adds is low and has its own id.

## New Findings This Cycle

- **[low]** `shared/resources/finalise-rerun-at-head.js:344`: T320-CR-401
- **[low]** `shared/resources/ci-tree-equivalence.js:565`: T320-CR-402
- **[low]** `docs/reference/configuration.md:314`: T320-CR-403
- **[low]** `shared/resources/finalise-rerun-at-head.js:299`: T320-CR-404

---

## Executive Summary

Cycle 3's fixes close the inputs they name. No high and no medium finding is left; four low ones are new.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#949)

### Review Methodology

Direct tools, and one read-only reviewer (325 s, `duration_ms`).

Re-review scope: files changed since gate 3 (head 8463205492d8; 29 files) — default. Safety re-probe: false.

Diff review: code review.

CI on c160ee638e2d: green

Step 4b: the one changed `SKILL.md` file has a prose change only, no changed block. Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: review commit). Changelog: cites (task 320).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1: The re-run engine | PASS | Verified | T320-CR-401, 404 (low) |
| 2: `push-held.sh` | PASS | Verified | |
| 3: `tick-pr.sh` and the configuration | PASS | Verified | T320-CR-402 (low) |
| 4: Documents | PASS | Verified | T320-CR-403 (low) |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | T319-CR-1201 | T319-CR-805, two tests | PASS; T320-CR-401 is beyond its inputs |
| 2 | T319-CR-1202 | T319-CR-1005 | PASS |
| 3 | T319-CR-1203 | T319-CR-1203 | PASS |
| 4 to 6 | T319-CR-1302, 1303, 1304 | `push-policy.test.mjs`, `tick-pr.test.mjs` | PASS |
| 7 | The limit of 1301 is stated | `tick-pr.sh`, `develop-next/SKILL.md`, `configuration.md` | PASS |
| 8 | Escaped keys refused | CR3-3, 406, the pipeline block | PASS |
| 9 | Marker edge | "ci.skipMarker is one printable line" | PASS; T320-CR-402 needs a quote with no partner |
| 10 | No new test over 30 s | durations below | PASS |
| 11 | Red before, red runs here | below | PASS |
| 12 | Mutation table | below | PASS |
| 13 | `npm test` under `CI=true`; bundle | 8897 tests, 0 fail; `bundle:check` 129 skills, 0 problems | PASS |
| 14 | `npm run validate -- skills/develop-next/` | exit 0 | PASS |
| 15 | CHANGELOG | cites | PASS |
| 16 | The reference on `ci.skipMarker` | `configuration.md` | PASS |
| 17 | Task 319's Deferred Work | unchanged | PASS |

### The suite (criterion 13)

`npm run test:remote -- --timeout-min 60 --run test` at c160ee638e2d (the container sets `CI=true`): 8897 tests, 8894 pass, 0 fail, 3 skipped, exit 0.

### Durations (criterion 10)

Server `uptime`: before load 0.38, 2.22, 5.22; after 0.43, 1.48, 3.36.

| Test | This cycle | Slowest of all cycles |
| --- | --- | --- |
| no criterion the reader can find, read past (T319-CR-805) | 2.3 s | 7.2 s |
| no criterion the reader can find, refused (T319-CR-805) | 5.6 s | 14.2 s |
| a backtick with no partner (T319-CR-1005) | 1.8 s | 6.1 s |
| a file beside a submodule (T319-CR-1203) | 2.7 s | 13.0 s |
| a second spelling of a submodule's directory (T319-CR-1203) | 0.3 s | 2.2 s |
| the SIGSTOP case (T319-CR-1303) | 13.6 s | 16.4 s |
| a fetch that brought the commit and then failed (T319-CR-1302) | 4.7 s | 13.3 s |
| `start` from a subdirectory (T319-CR-1304) | 2.7 s | 3.6 s |
| the marker | under 0.1 s | under 0.1 s |

The second column is of the tests as they stand since cycle 2 split T319-CR-805; before the split, that test took 29.7 s ([QA report 2](./task.320.qa.2.task-319-leftover-findings.md)).

### Document population (task § 10, medium risk 1)

Added after the PR review (PC-1), at the code head c160ee638e2d. Tracked documents under `docs/` whose
file name equals their directory's and starts `task.` or `story.`: 342. `readCriteriaEntries` returns
`null` for none and an empty list for one, `task.308.pause-commits-cancel-the-step-7-ci-poll` (its
criteria are plain list items). With a listed command under another heading, that document reads
`none-named` here and on `origin/develop`; the control, a document with no criteria, reads `scan-broken`
on both. No document's answer changes.

### Red before the change (criterion 11)

The cases of cycle 3, run against `846320549`:

```bash
command node --test --test-name-pattern="T319-CR-805|T319-CR-1005|one printable line" \
  shared/resources/tests/finalise-rerun-at-head.test.mjs shared/resources/tests/push-policy.test.mjs
# 4 tests, 3 fail: both of T319-CR-805, "one printable line"
```

The earlier runs are in QA reports [1](./task.320.qa.1.task-319-leftover-findings.md), [2](./task.320.qa.2.task-319-leftover-findings.md) and [3](./task.320.qa.3.task-319-leftover-findings.md).

### Mutation table (criterion 12)

85 mutations, 84 red. The green one is `sub === d`, the equivalent shortcut of QA report 1. Those of cycle 3's fixes:

| Reverted | Test that went red | Outcome |
| --- | --- | --- |
| 301: comments out of the known sections, out of the AC parts; the two searches; the two NULs; the empty item (7) | T319-CR-805, read past or refused | covered |
| 304: Then alone, Given alone, the heading, When, bold Then, the whole rule (6) | T319-CR-805 | covered |
| 305: the fence, the fence in a comment, the span, its run length, two escapes, the short comment (7) | T319-CR-805 | covered |
| 302: the separators | the marker test | covered |
| 303: the cut, the anchored quotes, a separator in the comment (3) | the marker test | covered |

---

## Breaking Changes Validation

Documented with a migration path in the task (§ 6) and in CHANGELOG. **PASS**

---

## Issues Found

HIGH: 0. MEDIUM: 0. LOW: 4 (T320-CR-401 to T320-CR-404).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 4

---

## NFR Assessment

### Performance — PASS

Durations above.

### Reliability — PASS

The suite and CI are green on this head.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 93; escaped 0 (`task.320.qa.4.task-319-leftover-findings.security.run.json`)
- `parseConfig` 45 of 45, the criteria search 21 of 21, `parsePipelineConfig` 9 of 9, `push-held.sh --site` 18 of 18

### Maintainability — PASS

Comments are handled once.

---

## Code Review

**Correctness bugs (4):** each run by QA on this head, on `846320549` and on `origin/develop`, with its control.

| Finding | Reviewer | Input | Here | `846320549` | `develop` | Control (here) |
| --- | --- | --- | --- | --- | --- | --- |
| T320-CR-401 | low/high | a Given paragraph, a Then paragraph | `none-named` | `none-named` | `none-named` | without Given: `scan-broken` |
| T320-CR-402 | low/high | `it's #x` and a no-break space | dropped | refused | dropped | `it's x` and a no-break space: refused |
| T320-CR-402 | low/high | `x"`, a no-break space, `#"` | refused | accepted | accepted | `its #x` and a no-break space: a comment, accepted |
| T320-CR-403 | low/medium | `## AC1` with criteria, the command under `## Notes` | `scan-broken` | `scan-broken` | `none-named` | in `## Success Criteria`: `none-named` |
| T320-CR-404 | low/medium | an opener in indented code | `scan-broken` | `scan-broken` | `none-named` | no opener: `none-named` |

T320-CR-401 is the same at the base, and the class is in the task's scope (criterion 1), so it is a finding of this task.

**Cleanups (1):**

- `shared/resources/tests/finalise-rerun-at-head.test.mjs:1355`: on a disk that folds names the test returns on its first row and passes having asserted nothing → `t.skip` with the reason

Boundary: true (`boundary_signals`: refused, refuses).

---

## Regression Testing

`lint:shell`, `bundle:check` and `validate` clean. **PASS**

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

None.

### Short-term Actions (Non-Blocking)

1. T320-CR-401 to T320-CR-404, and the cleanup

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no high and no medium finding
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: the PR review (5c)
