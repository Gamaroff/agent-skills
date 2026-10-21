# QA Report: Task 222 - finalise gaps path fixes (cycle 2)

**Task**: [task.222.finalise-gaps-path-fixes.md](./task.222.finalise-gaps-path-fixes.md)
**Gate File**: [task.222.gate.2.finalise-gaps-path-fixes.yml](./task.222.gate.2.finalise-gaps-path-fixes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Executive Summary

All five cycle-1 findings are fixed, tested and mutation-proven. The cycle-2 refute pass re-read the whole branch and found two medium defects. The gap counter also enters retitled historical gaps sections, so a second gaps run overcounts. The Stop hook still tells an orchestrator at step 7 to advance to 8 once finalise completes, which a gaps outcome now forbids.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA-222-6 and QA-222-7 fixed)

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| QA-222-1 Step Transition Protocol advances before Step 7's outcome | medium | ✅ FIXED | Exception in the three protocols and both Step 7 docs; test "each develop-* Step Transition Protocol reads Step 7's outcome…"; QA mutation → red (`covered`) |
| QA-222-2 cooperation reference drops `--dod` | medium | ✅ FIXED | finalise block added; test runs the block as written |
| QA-222-3 `####` ends the Missing Criteria range | low | ✅ FIXED | `/^###?([^#]\|$)/`; QA mutation → red (`covered`) |
| QA-222-4 nested sub-bullets counted | low | ✅ FIXED | indent stack; nested and top-level-beside-categories fixtures |
| QA-222-5 empty `--dod` reason | low | ✅ FIXED | `DOD_FLAG`; "an empty --dod value" test |

---

## New Findings This Cycle

- **[medium]** `shared/resources/dod-gap-count.sh:49`: the section match is a prefix match, so retitled `— run N (historical, superseded)` sections are counted → anchor it to the current heading (QA-222-6)
- **[medium]** `shared/resources/develop-pipeline-on-stop.sh:269`: the lock-7 block reason says advance to 8 on completion → add a Step 7 outcome-first branch (QA-222-7)
- **[low]** `shared/resources/dod-gap-count.sh:50`: fences are tracked only inside the section, and a ``` line toggles a `~~~` fence → track fences from line 1 (QA-222-8)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking change documented (CHANGELOG, PR body)
- [x] Code on feature branch with open PR (#718)

### Review Methodology

This is a re-review, using direct tools plus one diff-review subagent. It is cycle 2, so the review was a full refute pass over the whole branch:

```
Re-review scope: unscoped — cycle 2 refute pass (whole origin/develop...HEAD, 22 files, generated references excluded)
```

The reviewer was dispatched at 15:01Z and returned with `duration_ms` 235466 (about 3.9 min). Every anchor checked `ok` with `finding-anchors.js`. `SAFETY_REPROBE=false` (clause 1 false; the prior security gate was PASS).

Step 4b ran over the 9 changed runnable-prose docs. One block changed this cycle: `pipeline-lock-cooperation.md`'s finalise block. It was refused as mutating because its helper does `rm -rf`, and the committed test "the cooperation reference's finalise block…" executes it. `skills/finalise/SKILL.md` has 2 changed blocks, also refused by design and executed by committed tests. `develop-pipeline-resume-contract.md:492` fails on an unchanged block (it reads a live lock); this was pre-existing at cycle 1. zsh is unavailable on this host; CI runs it.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce both defects (red) | PASS | Verified | Old-count baseline and lock tests |
| Phase 2: One gap-count definition | CONCERNS | Verified | Historical sections counted (QA-222-6), fence state (QA-222-8) |
| Phase 3: Hold the lock unless ACCEPTED | PASS | Verified | `DOD_FLAG` split; holds on every non-ACCEPTED input |
| Phase 4: Tests, doc sweep, bundle | CONCERNS | Verified | The Stop hook's lock-7 reason was missed by the sweep (QA-222-7) |

**Overall Phase Completion**: 4/4 implemented, 2 with concerns.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| 2 / 3 / 1 / 7 counts | `finalise-gaps-path.test.mjs` "counts only the Missing Criteria items" | PASS |
| a gaps run's count is the current run's gaps | Probe: a historical section plus a current one reads 4, want 1 (QA-222-6) | CONCERNS |
| GAPS DoD holds at 7 | `finalise-gaps-path.test.mjs`, lock tests | PASS |
| a gaps halt resumes at `/finalise` | Protocol and Step 7 docs pinned; Stop hook reason at lock 7 contradicts it (QA-222-7) | CONCERNS |
| ACCEPTED DoD moves 7 → 8 | `finalise-gaps-path.test.mjs`, step-8 premise test | PASS |
| `run_no_lock_split` unchanged | `advance-pipeline-lock.test.sh` 72/72 | PASS |
| `npm test` 0 failures | .249 fast gate: 6139 pass, 1 environmental (npm 9 notifier); CI `test` pending @ 0b404b98 | PASS (CI pending) |
| `bundle:check` clean | exit 0 | PASS |
| validate ×4 | ✓ finalise, develop-task, develop-story, develop-bug | PASS |
| shellcheck | clean, `--severity=warning` | PASS |

---

## Breaking Changes Validation

### Breaking Change: `--skill finalise` without `--dod` now holds at 7
Documented: Yes (CHANGELOG, PR body)
Migration Path Provided: Yes
Migration Tested: Yes
Consumer Code Updated: Yes. The cooperation reference was fixed in cycle 1. The Stop hook text is the remaining contradiction (QA-222-7).

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### MEDIUM Severity Issues (2)

**QA-222-6: The counter reads retitled historical gaps sections**
- **Category**: Functional
- **Observation**: `/^## Definition of Done - Gaps Identified/` matches `## Definition of Done - Gaps Identified — run 1 (historical, superseded)`. 25 tracked documents carry that shape.
- **Reproduced**: a historical section (3 closed) plus a current one (1 gap) reads 4, want 1. `docs/tasks/task.173…/task.173.fold-5c-review-into-acceptance-commit.md`, which has only historical sections, reads 6 where it should HALT.
- **Provenance**: the pre-task count used the same prefix match. It stays in `top_issues` because the gap count is this task's subject.
- **Recommendation**: match the exact current heading, reset `m` when `s` drops, and add the re-run fixtures.

**QA-222-7: The Stop hook's lock-7 reason advances to 8 on completion**
- **Category**: Functional
- **Observation**: `develop-pipeline-on-stop.sh:269` (generic `COMPLETION_LINE`) and :277 (`ALREADY_DONE`).
- **Impact**: a stop during the gaps tail sends the orchestrator to the numeric 8 that the Step 7 exception forbids.
- **Recommendation**: add a NEXT=7 branch, and a lock-7 scenario in `develop-pipeline-on-stop.test.sh`.

### LOW Severity Issues (1)

- **QA-222-8** `shared/resources/dod-gap-count.sh:50`: fence parity. Reproduced: a fenced example plus a real section with 2 gaps reads 1, want 2.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
`finalise-gaps-path.test.mjs` runs in under 1 s.

### Reliability — CONCERNS
QA-222-7 leaves a Stop-hook path past the hold at 7. QA-222-6 miscounts a re-run.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`, unchanged from gate 1. Both inputs are artefacts this pipeline writes, and no sink models them. Cycle 1 changed only the awk body, which still reads one file and writes nothing.

### Maintainability — PASS
One count definition, and one test pins the Step 7 exception across five documents.

---

## Code Review

Code review is blocking for this run (`code_review_blocking=true`). CR-1 and CR-2 are `bug`/`high`, so they were promoted as QA-222-6 and QA-222-7. CR-3 is `bug`/`medium`; QA raised it to `top_issues` as low after reproducing it (QA-222-8).

**Correctness bugs (3):**
- [medium/high] `shared/resources/dod-gap-count.sh:49`: the prefix match counts historical sections. → QA-222-6
- [medium/high] `shared/resources/develop-pipeline-on-stop.sh:269`: the lock-7 reason advances to 8. → QA-222-7
- [low/medium] `shared/resources/dod-gap-count.sh:50`: fence state is tracked only inside the section. → QA-222-8

**Cleanups (0)**

mutation-proven: develop-task Step 7 exception removed → "each develop-* Step Transition Protocol reads Step 7's outcome…" red → covered
mutation-proven: `/^###?([^#]|$)/` reverted to `/^##/` → "dod-gap-count.sh: #### headings, sub-bullets and fences…" red → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Lock helper (all skills' `--skill` mapping) | PASS: 72/72 |
| Stop hook | PASS: 49/49 |
| Step 8 completion checklist, finalise bug mode, gaps path | PASS: 129/129 |
| Full suite (.249 fast gate) | 6139 pass, 1 environmental |

---

## Test Artifacts

### Test Commands Executed
```bash
node --test shared/resources/tests/finalise-gaps-path.test.mjs evals/shared/tests/finalise-bug-mode.test.mjs shared/resources/tests/step-8-completion-checklist.test.mjs   # 129/129
bash shared/resources/advance-pipeline-lock.test.sh        # 72 passed
bash shared/resources/develop-pipeline-on-stop.test.sh     # 49 passed
npm run bundle:check                                       # 0
npm run validate -- skills/{finalise,develop-task,develop-story,develop-bug}/
shellcheck --severity=warning shared/resources/dod-gap-count.sh shared/resources/advance-pipeline-lock.sh
bash shared/resources/dod-gap-count.sh <probe>             # cr1: 4 (want 1); cr3: 1 (want 2)
```

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-222-6: anchor the counter to the current heading.
2. QA-222-7: add the Stop hook's lock-7 branch.

### Short-term Actions (Non-Blocking)
1. QA-222-8 (same file as QA-222-6).
2. The npm 9.2.0 update-notifier failure on .249.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The cycle-1 fixes hold. The refute pass found two medium defects on the same two claims: the count, and the hold at 7.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-222-6 and QA-222-7 fixed

---

**QA Report**: co-located at `task.222.qa.2.finalise-gaps-path-fixes.md`
**Gate File**: co-located at `task.222.gate.2.finalise-gaps-path-fixes.yml`
**Next Steps**: `/qa-fix`, then re-review (cycle 3).
