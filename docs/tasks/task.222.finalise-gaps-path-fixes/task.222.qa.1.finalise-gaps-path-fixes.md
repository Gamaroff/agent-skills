# QA Report: Task 222 - finalise gaps path fixes

**Task**: [task.222.finalise-gaps-path-fixes.md](./task.222.finalise-gaps-path-fixes.md)
**Gate File**: [task.222.gate.1.finalise-gaps-path-fixes.yml](./task.222.gate.1.finalise-gaps-path-fixes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Executive Summary

Both defects are fixed and covered by committed tests: the gap count reads only `### Missing Criteria`, and `--skill finalise` advances the lock only on an ACCEPTED DoD. Two sites outside the helper still send a reader past the new hold: the orchestrators' Step Transition Protocol advances the lock before checking finalise's outcome, and the shared cooperation reference shows the call without `--dod`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA-222-1 and QA-222-2 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking change documented (CHANGELOG, PR body)
- [x] Code on feature branch with open PR (#718)

### Testing Approach

- [x] Automated Testing (unit, executed prose)
- [x] Performance Testing (measured by the developer; checked)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools plus one diff-review subagent (first review, 4 phases, single area). Traceability matrix from the Step 5 mapper: `.summaries/qa-traceability-matrix.md`. Diff reviewer dispatched 14:09Z, returned in 221 s (`duration_ms` 221081). Diff scope: `origin/develop...HEAD` without the generated `skills/*/references/*` copies (1525 patch lines, 20 files).

Step 4b ran over the 7 changed docs with fenced bash. `skills/finalise/SKILL.md`: 2 changed blocks, 0 executed. Both were refused on their helpers (`fill-verification-complete.sh`, write-redirection; `advance-pipeline-lock.sh`, `rm -rf`), which is deny-listed by design. Both blocks are executed by committed tests: `finalise-bug-mode.test.mjs` runs Step 8.5, and `finalise-gaps-path.test.mjs` runs the cooperation block. Other docs: no changed blocks. `develop-pipeline-resume-contract.md:492` failed on an unchanged block (it reads a live lock), so that one is pre-existing and not this change. zsh is unavailable on this host; CI runs it.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce both defects (red) | PASS | Verified | Old-count baseline test and lock tests present |
| Phase 2: One gap-count definition | PASS | Verified | `dod-gap-count.sh`; Step 8.5 arm; Step 8.4 rule. Low edge cases QA-222-3/4 |
| Phase 3: Hold the lock unless ACCEPTED | PASS | Verified | Guard after parse and idempotency; arm literal intact |
| Phase 4: Tests, doc sweep, bundle | CONCERNS | Verified | Sweep missed `pipeline-lock-cooperation.md` (QA-222-2); orchestrator protocol ordering (QA-222-1) |

**Overall Phase Completion**: 4/4 implemented, 1 with concerns.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| 2 / 3 / 1 / 7 counts | `finalise-gaps-path.test.mjs` "counts only the Missing Criteria items" | PASS |
| "(2 of them)" lead | `finalise-bug-mode.test.mjs` (task 222 test) | PASS |
| GAPS DoD holds at 7 | `finalise-gaps-path.test.mjs`; mutation-proven by QA (below) | PASS |
| ACCEPTED DoD moves 7 → 8 | `finalise-gaps-path.test.mjs`, step-8 premise test | PASS |
| no `--dod` / missing / unfilled hold | `finalise-gaps-path.test.mjs`, one test per case | PASS |
| bug-mode accepted / gaps | `finalise-gaps-path.test.mjs` | PASS |
| `run_no_lock_split` unchanged | `advance-pipeline-lock.test.sh` 72/72 | PASS |
| `npm test` +≤2% | Committed measurement in § 9 (≈0.9%, command named) | PASS |
| `npm test` 0 failures | CI `test` pass @ 9b2a3d32 (4m52s, with zsh) | PASS |
| `bundle:check` clean | exit 0 (QA re-run) | PASS |
| validate ×4 | ✓ finalise, develop-task, develop-story, develop-bug (QA re-run) | PASS |
| shellcheck | clean, `--severity=warning` (QA re-run) | PASS |
| mutations red | developer M1–M3; QA re-ran M2 → 5 red | PASS |
| CHANGELOG entry | `CHANGELOG.md:96` cites `(task 222)` and `--dod` | PASS |
| restatements qualified | § 3 search re-run: qualified. Missed by the search's population: `pipeline-lock-cooperation.md` | CONCERNS |

---

## Breaking Changes Validation

### Breaking Change: `--skill finalise` without `--dod` now holds at 7
Documented: Yes (CHANGELOG, PR body)
Migration Path Provided: Yes (reinstall skills together)
Migration Tested: Yes (no-`--dod` test holds; with `--dod` advances)
Consumer Code Updated: Yes for finalise SKILL.md. Not for `pipeline-lock-cooperation.md` (QA-222-2)

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### MEDIUM Severity Issues (2)

**QA-222-1: The Step Transition Protocol advances the lock before reading finalise's outcome**
- **Category**: Functional
- **Observation**: `skills/develop-task/SKILL.md:152` (and develop-story :159, develop-bug :147) puts `advance-pipeline-lock.sh {N+1}` first, "FIRST. ALWAYS.", when a sub-skill returns. `develop-pipeline-step-7-finalise.md` § Detecting Completion reads the status only "after finalise returns". If the orchestrator follows the protocol on a gaps return, it writes 8 itself.
- **Impact**: The task's § 3 resume state "finalise found gaps → lock 7, snapshot halt_step 7" depends on the orchestrator not doing this. The step-8 rule's "first unfinished row at or below Step 7" still recovers the resume, but task.170's re-entry offer keys on `halt_step` 7.
- **Recommendation**: Add a Step 7 exception: check the status first, and advance to 8 only on `accepted`.

**QA-222-2: The shared cooperation reference drops `--dod`**
- **Category**: Quality
- **Observation**: `shared/resources/pipeline-lock-cooperation.md:16-20` shows `--skill <this-skill-name> 2>/dev/null` and lists `finalise` as an example.
- **Impact**: A skill author following it would always hold at 7 and lose the stderr reason.
- **Recommendation**: Add a finalise exception block.

### LOW Severity Issues (3)

- **QA-222-3** `shared/resources/dod-gap-count.sh:37`: a `####` heading ends the subsection. Reproduced: HALT "lists no gap" when 3 were expected. Corpus count: 0 of 27.
- **QA-222-4** `shared/resources/dod-gap-count.sh:47`: nested sub-bullets are counted. Reproduced: reads 4 when 2 were expected. Corpus count: 0 of 27.
- **QA-222-5** `shared/resources/advance-pipeline-lock.sh:514`: an empty `--dod` value reports "no --dod given".

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Performance — PASS
The added tests cost about 2.6 s of a 300 s suite, about 0.9%.

### Reliability — CONCERNS
The helper holds on every non-ACCEPTED input, and a corrupt lock still exits 1. QA-222-1 leaves an orchestrator path that can advance past the hold.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`. The entries are `shared/resources/dod-gap-count.sh` (input: the `## Definition of Done - Gaps Identified` section that finalise Step 8.4 writes into the task document) and `shared/resources/advance-pipeline-lock.sh` `--dod` (input: the DoD summary that finalise writes). Both are artefacts this pipeline writes. No sink models them: a `filename`-sink run (`shell:` form, 14 executed) overblocked all 5 legitimate cases, because the cases are file names with no gaps section, so it was discarded. The ACCEPTED match is a fixed `grep -q` with no evaluation of the input. Neither script writes anything except the lock, through the existing `mktemp`/`mv` path.

### Maintainability — PASS
One definition of the count. The restatement search was re-run, and one population miss was found (QA-222-2).

---

## Code Review

Code review is blocking for this run (`code_review_blocking=true`). No finding was high-confidence, so none was promoted automatically. QA raised CR-1 and CR-2 to `top_issues` as medium on its own reading, and CR-3 and CR-4 as low after reproducing them.

**Correctness bugs (4):**
- [medium/medium] `skills/develop-task/SKILL.md:152`: the protocol advances before Step 7's check. → QA-222-1
- [medium/medium] `shared/resources/pipeline-lock-cooperation.md:20`: finalise is shown without `--dod`. → QA-222-2
- [low/medium] `shared/resources/dod-gap-count.sh:37`: `/^##/` also matches `####`. → QA-222-3
- [low/low] `shared/resources/dod-gap-count.sh:47`: nested bullets are counted. → QA-222-4

**Cleanups (1):**
- `shared/resources/advance-pipeline-lock.sh:514`: separate the "empty `--dod`" reason. → QA-222-5

Every anchor was checked with `finding-anchors.js`: all `ok`.

mutation-proven: finalise guard replaced with `if false` → `finalise-gaps-path.test.mjs` (5 lock tests) red → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Lock helper (all skills' `--skill` mapping) | PASS: 72/72 |
| Stop hook | PASS: 49/49 |
| Step 8 completion checklist | PASS |
| finalise bug mode | PASS |
| Full suite (CI, with zsh) | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
node --test shared/resources/tests/finalise-gaps-path.test.mjs evals/shared/tests/finalise-bug-mode.test.mjs shared/resources/tests/step-8-completion-checklist.test.mjs   # 125/125
bash shared/resources/advance-pipeline-lock.test.sh        # 72 passed
bash shared/resources/develop-pipeline-on-stop.test.sh     # 49 passed
npm run bundle:check                                       # 0
npm run validate -- skills/{finalise,develop-task,develop-story,develop-bug}/
shellcheck --severity=warning shared/resources/dod-gap-count.sh shared/resources/advance-pipeline-lock.sh
gh pr checks 718                                           # all pass
```

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-222-1: add the status-first Step 7 exception to the three protocols and the step-7 doc.
2. QA-222-2: add the finalise exception to `pipeline-lock-cooperation.md`.

### Short-term Actions (Non-Blocking)
1. QA-222-3, -4 and -5 (cheap, same files).
2. The npm 9.2.0 update-notifier failure on .249 (see the gate's `recommendations.future`).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The two defects are fixed and proven. Two medium sites contradict the new hold.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-222-1 and QA-222-2 fixed

---

**QA Report**: co-located at `task.222.qa.1.finalise-gaps-path-fixes.md`
**Gate File**: co-located at `task.222.gate.1.finalise-gaps-path-fixes.yml`
**Next Steps**: `/qa-fix`, then re-review.
