# QA Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Task**: [Link to task document](./task.319.ci-runs-only-where-needed.md)
**Gate File**: [task.319.gate.6.ci-runs-only-where-needed.yml](./task.319.gate.6.ci-runs-only-where-needed.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-24
**Testing Completed**: 2026-11-24
**Gate Status**: CONCERNS

---

## Executive Summary

All 10 findings of cycle 5 are fixed for the case each one reported, and the suites and CI are green on this head. The re-review found no high defect. Four medium and four low defects stand, each reproduced by QA with a control. Six of the eight came in with the cycle 5 fixes.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| CR-801 | ✅ FIXED for the reported form | committed settings test; the fix opened CR-1001, CR-1002 and CR-1004 |
| CR-802 | ✅ FIXED | committed test: the streams are named one by one |
| CR-803 | ✅ FIXED | reproduction at this head: five line starts, all `scan-broken` |
| CR-804 | ✅ FIXED | reproduction at this head: a replaced configuration blob, `not-configured` |
| CR-805 | ✅ FIXED for the reported form | reproduction at this head: `none-named`, preflight `empty`. Gap: CR-1003 |
| CR-901 | ✅ FIXED for the reported form | reproduction at this head: the hook's file is not there 7 s later. Gap: CR-1101 |
| CR-902 | ✅ FIXED for the reported form | reproduction at this head: `landed`. Gap: CR-1102 |
| CR-904 | ✅ FIXED | reproduction at this head: `no scratch file could be made` |
| CR-905 | ✅ FIXED for the reported form | reproduction at this head: one answer before and after a fetch. Gap: CR-1103 |
| CR-906 | ✅ FIXED | reproduction at this head: `may still take it` |

---

## New Findings This Cycle

Gate ids T319-CR-1001 to T319-CR-1005 and T319-CR-1101 to T319-CR-1103. Each is listed with its line under Code Review.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#937)

### Review Methodology

Re-review scope: files changed since gate 5 (head 8bf94fef4c35; 45 files) — default

The prior gate was CONCERNS with no high finding and security PASS on measured evidence, so no clause of the safety re-probe holds. Generated `skills/*/references/` copies and this work item's records were left out, and `bundle:check` holds the copies equal to their sources.

Two read-only reviewers with the shared prompt: the re-run engine (431 s, `duration_ms`) and the push and tick scripts. The session crashed while the second one ran; it was started again and returned after 579 s. That second reviewer created no scratch repository, so its evidence came from functions run with git stubbed; QA reproduced each of its findings with real git before gating it. Diff review: code review.

CI on f0e45bb0e107: green

Step 4b: the changed blocks push, merge or write, so the snippet engine refuses them as `mutating`. Run by tests instead: the terminal-HALT blocks and the two finalise-entry blocks (`push-policy.test.mjs`), the tick blocks (`tick-pr.test.mjs`). **Not run by any test**: the QA loop's own push blocks.

Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: reviewed blob). Changelog: cites (task 319). Record criteria: two listed, neither names this report.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 0: Reader table | PASS | Verified | |
| 1: Decision helper | PASS | Verified | 40 tests with the held-commit script |
| 2: Every push site | CONCERNS | Verified | CR-1101, CR-1103 |
| 3: Skip marker | PASS | Verified | |
| 4: Finalise halts | CONCERNS | Verified | CR-1001 to CR-1005 |
| 5: Bitbucket | CONCERNS | Verified | CR-1102 |
| 6: Ship | PASS | Verified | |

**Overall Phase Completion**: 7/7 delivered, 4/7 without a finding

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | Every push site calls push-policy; scan with a non-vacuity case | `push-policy.test.mjs` scan tests | PASS |
| 2 | Simulated five-cycle run | `push-policy.test.mjs` five-cycle tests | PASS |
| 3 | The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.test.sh`, 42 passed at this head | PASS |
| 4 | skipMarker never on a commit with code | `push-policy.test.mjs` marker tests | PASS |
| 5 | A named command is graded on a run at the head | `finalise-rerun-at-head.test.mjs` | CONCERNS (CR-1001, CR-1002) |
| 6 | The probe scores an `eslint:` entry | `security-probe-eslint.test.mjs` | PASS |
| 7 | Bitbucket poll writes the same line, from the destination's key | `finalise-ci-poll.test.mjs` | PASS |
| 8 | `tickVia: pr` ticks through a PR merged by the gate | `tick-pr.test.mjs` | CONCERNS (CR-1102) |
| 9 | Push count in the QA report, before and after, with the command | Below | PASS |
| 10 | `npm test` under `CI=true`; every new test red before its change | Below | PASS |
| 11 | `npm run bundle` leaves no diff; `git status` recorded | Below | PASS |
| 12 | Four keys in the reference with defaults, `eager` as the old behaviour | `docs/reference/configuration.md` | PASS |
| 13 | CHANGELOG names each part | `CHANGELOG.md` `[Unreleased]` | PASS |

### Push counts (criterion 9)

Command: `command node --test shared/resources/tests/push-policy.test.mjs` at `f0e45bb0e`:

```
pushes before (eager): 9; after (batched): 6
```

### Suite under CI=true, and red-first proofs (criterion 10)

`npm run ci:fast` on the LAN server with `CI=true`, on the tree committed as `f0e45bb0e` less one Change Log row: 8886 tests, 8883 passed, 0 failed, 3 skipped. `npm run eval:all` on the same tree: exit 0.

The proofs were run in the fix pass, on the code of this head, and were not repeated here. Each names a committed test:

| Reverted behaviour | Test that went red | Outcome |
| ------------------ | ------------------ | ------- |
| the case-sensitive listing, and the ignored files left out of it | `finalise-rerun-at-head.test.mjs` | covered |
| streams named one by one | `finalise-rerun-at-head.test.mjs` | covered |
| each block start, narrowed and widened | `finalise-rerun-at-head.test.mjs` | covered |
| the list read past replacements | `finalise-rerun-at-head.test.mjs` | covered |
| no readable criterion: always and never refused, by line, by paragraph | `finalise-rerun-at-head.test.mjs` | covered |
| the group kill, the kill on exit | `push-policy.test.mjs` | covered |
| no scratch file, the fetch, the ahead answer, the second question, the hint line | `push-policy.test.mjs` | covered; the hint line only after its test was corrected |
| local questions: not asked of the remote, not waited for, not guessed | `push-policy.test.mjs` | covered |
| rows read, both directions, per file, blank and CRLF rows, only edits | `tick-pr.test.mjs` | covered |
| each git read that fails | `tick-pr.test.mjs` | covered; one check is redundant with the file count |
| the 5c route's own site | `push-policy.test.mjs` | covered, by reading the document |

### Bundle (criterion 11)

`bundle:check` reports 129 skills, 0 problems. `git status --short` at this head lists no tracked change outside this work item: the implementation report (modified) and this cycle's QA files (untracked).

---

## Breaking Changes Validation

### Breaking Change: a pause and a record-only cycle no longer push

Documented: Yes
Migration Path Provided: Yes (`pipeline.pushRecordCommits: eager`)
Migration Tested: Yes

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None. Searched the 13 authored code and document files changed since gate 5.

### MEDIUM Severity Issues (4)

T319-CR-1001, CR-1002, CR-1101 and CR-1102. Each is described in the Code Review section and tracked by its gate entry; no separate bug file.

### LOW Severity Issues (4)

T319-CR-1003 to CR-1005 and CR-1103.

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 4

---

## NFR Assessment

### Performance — PASS
Push counts above.

### Reliability — CONCERNS
A hook can outlive a SIGKILL of the caller's group (CR-1101); a tick that has not landed can read as landed when all its rows are generic (CR-1102); a clean tree is refused on a case-insensitive disk after a case-only rename (CR-1002).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 108 (`task.319.qa.6.ci-runs-only-where-needed.security.run.json`, `totals.executed`); escaped 0
- `parseRerunList`: engages, 38 of 38. `push-policy --site`: engages, 48 of 48. `push-held --site`: engages, 22 of 22.
- `tick-pr.sh` and the tree comparison take a repository and not one input, so no engine form reaches them; they were probed by reproduction scripts in scratch repositories, which do not count toward the total.

### Maintainability — PASS
One decision helper, one site table, one push per HALT.

---

## Code Review

Anchors: all `ok` (`finding-anchors.js --rev HEAD`; CR-1002 shares CR-1001's line). `code_review_blocking=true` from the pipeline. `boundary: true`.

**Correctness bugs (8 in the gate):**

- [medium/high] `shared/resources/finalise-rerun-at-head.js:622` — CR-1001, reproduced by QA: `*.gen.js` and `!Keep.gen.js`, `core.ignorecase=true`, untracked `keep.gen.js` → `ran`; control `Keep.gen.js` → `dirty-tree`
- [medium/high] `shared/resources/finalise-rerun-at-head.js:622` — CR-1002, reproduced by QA on a casefold tmpfs: `src` renamed to `Src` on disk, `git status` empty → `dirty-tree: Src/a.js`; control before the rename → `ran`
- [low/high] `shared/resources/finalise-rerun-at-head.js:836` — CR-1003, reproduced by QA: two documents → `none-named`; control with `### AC1` → `scan-broken`
- [low/high] `shared/resources/finalise-rerun-at-head.js:548` — CR-1004, reproduced by QA: `:/build/o.js` → `ran`; control `c/build/o.js` → `dirty-tree`
- [low/high] `shared/resources/finalise-rerun-at-head.js:251` — CR-1005, reproduced by QA: a stray backtick in the paragraph before → `none-named`; control without it → `ran`
- [medium/medium] `shared/resources/push-held.sh:71` — CR-1101, reproduced by QA: SIGKILL to the caller's group → hook alive; control, SIGTERM to the script → hook gone
- [medium/medium] `shared/resources/tick-pr.sh:134` — CR-1102, reproduced by QA: the same generic edit to another item, `merge-tree` exit 1 → `landed`; control with unique rows → `resume`. The reviewer graded it low on likelihood; QA grades it medium because the tick branch is deleted
- [low/high] `shared/resources/push-held.sh:139` — CR-1103, reproduced by QA: the fetch fails after `ls-remote` answered → "held commits would be rejected" with nothing held; control → `nothing held`

Provenance: CR-1005's line is older than this cycle and new in this pull request; the other seven are of the cycle 5 changes. None is pre-existing on the base.

Platform variance: CR-1002 above; no CI job runs on a case-insensitive disk.

---

## Regression Testing

`push-policy` (40), `tick-pr` (25), `finalise-rerun-at-head` (39), `criteria-section` (3) and the pre-compact suite (42): PASS at this head; the rest by `ci:fast` above.

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/push-policy.test.mjs             # 40 pass
command node --test shared/resources/tests/tick-pr.test.mjs                 # 25 pass
command node --test shared/resources/tests/finalise-rerun-at-head.test.mjs  # 39 pass
bash shared/resources/develop-pipeline-on-precompact.test.sh                # 42 passed, 0 failed
npm run test:remote                                                         # ci:fast, 8883 pass
npm run test:remote -- --run eval:all                                       # exit 0
npm run validate -- skills/<changed-skill>/                                 # develop-next, -bug, -story, -task, finalise valid
```

---

## Recommendations

### Immediate Actions (Blocking)
1. The four medium findings

### Short-term Actions (Non-Blocking)
1. The four low findings

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no high finding; four medium findings
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: the four medium findings fixed, or accepted by the owner

---

**QA Report**: co-located at `task.319.qa.6.ci-runs-only-where-needed.md`
**Gate File**: co-located at `task.319.gate.6.ci-runs-only-where-needed.yml`
**Next Steps**: qa-fix cycle 6, then gate 7, the last of the budget
