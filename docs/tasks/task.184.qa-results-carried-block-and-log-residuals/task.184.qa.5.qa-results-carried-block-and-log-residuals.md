# QA Report: Task 184 - qa-results carried-block and log residuals

**Task**: [Link to task document](./task.184.qa-results-carried-block-and-log-residuals.md)
**Gate File**: [task.184.gate.5.qa-results-carried-block-and-log-residuals.yml](./task.184.gate.5.qa-results-carried-block-and-log-residuals.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-13
**Testing Completed**: 2026-10-13
**Gate Status**: PASS

---

## Executive Summary

Cycle 5 is the QA re-entry after `/finalise` found two Definition of Done gaps (`task.184.dod.1`). Since
gate 4's head (`9c5547be`), the only change outside the task directory is the `(task 184)` CHANGELOG
bullet moving from `## [v0.53.0]` to `## [Unreleased]`. The suites were re-timed at idle. No code changed,
the CHANGELOG move is correct, and the fast gate is green.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous item | Source | Status |
| --- | --- | --- |
| DoD gap 1 — CHANGELOG entry under released `[v0.53.0]` (5c PC-1) | `task.184.dod.1`, `task.184.pr-review.1` | ✅ FIXED — `5ab4839a`; the `[Unreleased]` section holds exactly one `task 184` line |
| DoD gap 2 — no idle timing on the head | `task.184.dod.1` AC5 | ✅ FIXED — ten runs recorded in the Implementation Summary (`3e7abe6f`) |
| Gate 4 future items (CR-1, CR-2, gate 2 CR-4, gate 1 CR-3) | gate 4 | Unchanged — carried forward as future work |

## New Findings This Cycle

None. Searched: the scoped change set since gate 4's head — `CHANGELOG.md` (one bullet moved, 13 lines,
byte-identical text) and the task directory's documents. No code file changed.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (§ 5)
- [x] Code on feature branch with open PR (#644, OPEN, head `d369c211`)

### Review Methodology

Direct tools — re-review with a document-only scope.

Re-review scope: files changed since gate 4 (head 9c5547befa79; 7 files) — default

Step 3b: not run — the scoped diff touches no reviewable code (`CHANGELOG.md` and documents in the task
directory only). No reviewer was dispatched.

Step 3c: no fix this cycle changed behaviour, so there is nothing to mutation-prove.

Step 4b: not applicable — no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: keep a nested block's tail | PASS | Verified (gate 4) | No change since gate 4 |
| Phase 2: refuse under an ambiguous marker-less log | PASS | Verified (gate 4) | No change since gate 4 |
| Phase 3: refuse a carried list behind a label and a paragraph | PASS | Verified (gate 4) | No change since gate 4 |
| Phase 4: wording, hygiene, CHANGELOG | PASS | Verified | CHANGELOG bullet now under `[Unreleased]` → `### Fixed` |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| CR-1, CR-2, CR3-2, CR6-1 (Functional) | R3–R7 in `shared/resources/tests/qa-results.test.mjs`, 110/110 in the targeted run | PASS |
| Suites under 2 s, `uptime` beside the figure, re-measured at finalise | Implementation Summary "Finalise re-measure": 10 runs, 9 under 2 s, median 1.14 s, one 4.13 s run while load rose to 2.62 | PASS — see Performance note |
| No network access (one `require(`) | `grep -c 'require(' shared/resources/qa-results.js` → `1` (unchanged since gate 4) | PASS |
| Corpus survey, mutation proofs, ci:fast / bundle:check / validate | Gate 4 evidence; `npm run ci:fast` re-run this cycle, exit 0 | PASS |
| CHANGELOG `[Unreleased]` cites `(task 184)` | `awk '/^## \[Unreleased\]/{p=1;next} /^## \[/{p=0} p' CHANGELOG.md \| grep -c "task 184"` → `1` | PASS |
| Seven task.183 passages amended | Unchanged since gate 4 | PASS |

---

## Breaking Changes Validation

Unchanged since gate 4. The CHANGELOG bullet's migration text moved with it, unedited.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS

Ten back-to-back runs on `5ab4839a`, once the 1-minute load average fell below 2.0. Nine came in at
1.08–1.62 s (median of all ten 1.14 s). One took 4.13 s while external load rose mid-run, and the next
six were 1.08–1.29 s. The criterion names no sample size; this cycle reads it as met on the median and
nine of ten runs. `/finalise` re-judges it.

### Reliability — PASS

No code change since gate 4.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false` for this cycle: the scoped change set adds no code. The engine's `internal` boundary
  record from gates 1–4 stands unchanged.

### Maintainability — PASS

CHANGELOG placement corrected; prettier clean on `CHANGELOG.md` and the task directory.

---

## Code Review

No reviewable code in the scoped diff, so no review ran this cycle. `boundary: false` — no predicate-shaped
function was added.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full `npm test` via `npm run ci:fast` (format check included) | PASS — exit 0, 5,430 pass, 0 fail, 14 skipped |
| `evals/shared/tests/changelog-entry-drift.test.mjs` | PASS (6/6) |

---

## Test Artifacts

### Files Reviewed

- `CHANGELOG.md`
- `task.184.qa-results-carried-block-and-log-residuals.md` (Implementation Summary)
- `task.184.implementation.1.qa-results-carried-block-and-log-residuals-initial-run.md`

### Test Commands Executed

```bash
npm run ci:fast
command node --test evals/shared/tests/changelog-entry-drift.test.mjs shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js
./node_modules/.bin/prettier --check CHANGELOG.md docs/tasks/task.184.qa-results-carried-block-and-log-residuals/*.md
awk '/^## \[Unreleased\]/{p=1;next} /^## \[/{p=0} p' CHANGELOG.md | grep -c "task 184"
```

No skill changed since gate 4, so no `npm run validate -- skills/<skill>/` run was needed this cycle.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. Gate 4's four future items, carried forward.
2. `changelog-entry-drift.test.mjs` passes with the bullet under a released heading on the branch, so it
   did not hold gap 1 before merge. Decide whether it should read the branch too.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Both DoD gaps are closed by document-level changes, verified against the committed tree. No
code changed and the fast gate is green.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.184.qa.5.qa-results-carried-block-and-log-residuals.md`
**Gate File**: co-located at `task.184.gate.5.qa-results-carried-block-and-log-residuals.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
