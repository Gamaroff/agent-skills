# QA Report: Task 249 - /finalise grades every kind of criterion fairly

**Task**: [task.249.finalise-grades-every-criterion-kind.md](./task.249.finalise-grades-every-criterion-kind.md)
**Gate File**: [task.249.gate.1.finalise-grades-every-criterion-kind.yml](./task.249.gate.1.finalise-grades-every-criterion-kind.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-01
**Testing Completed**: 2026-11-01
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #805 at `58cdf4f9`. All four phases are in place. The full local CI chain is green, and the new `DEFERRED-CI` path is tested and mutation-proven. Two MEDIUM defects remain, both verified by reading the code. A resolved CI-state verdict is carried to a later DoD run instead of being re-graded. Step 3b.1's new spec check looks cases up by id alone.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (11/11 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#805)

### Testing Approach

- [x] Automated Testing (unit, executed snippet)
- [x] Regression Testing
- [x] Security Review (probe executed)
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only Explore code reviewer. This is a first review: the whole branch diff, `origin/develop...HEAD`, 22 files. The reviewer was dispatched at 20:56:13Z and returned in 144 s (`duration_ms` 144098).

CI on 58cdf4f994c3: pending

- Step 4b ran on 7 changed in-scope files. Only one changed fenced block exists: finalise Step 6 action 2a. It is classified `mutating` because it rewrites the merged result and the AC record, so Step 4b did not execute it (`changed-blocks-not-executed`).
  - `shared/resources/tests/finalise-deferred-ci.test.mjs` does execute that block, as written, under bash.
  - zsh is not installed on this host (`zsh-unavailable`), so the zsh arm ran nowhere locally. The `ci-tool-skips` guard requires zsh in CI's `test.yml`.
  - The other `zero-blocks-executed` results are on files whose changed hunks hold no fenced block: review-task, review-story, create-story (`changed.total: 0`).
  - create-task: `no-executable-blocks` (information).
- Standards-named validation: `npm run validate -- skills/<s>/` passed for finalise, review-task, review-story, create-task and create-story.

---

## New Findings This Cycle

First review: every finding below is new.

- **[medium]** `shared/resources/finalise-rerun-scope.js:838` — T249-QA-1 (CR-2). See Issues Found.
- **[medium]** `skills/finalise/SKILL.md:683` — T249-QA-2 (CR-1). See Issues Found.
- **[low]** `skills/finalise/SKILL.md:1307` — CR-3. Recommendation.
- **[cleanup]** `skills/finalise/SKILL.md:674` — CR-4. Recommendation.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: DEFERRED-CI end to end | CONCERNS | Verified | Engine, `resolve-ci`, Step 6 action 2a, 20 tests. T249-QA-1 is a re-run defect |
| Phase 2: Process criteria and record location | PASS | Verified (structural pins) | AC prompt names five kinds; create-task and create-story guidance |
| Phase 3: Spec-tied probe verdicts | CONCERNS | Reviewed only | T249-QA-2: case lookup by id |
| Phase 4: Record-location check at review | PASS | Verified (validate) | review-task check 22, review-story check 18 |

**Overall Phase Completion**: 4/4 implemented, 2 with open findings.

---

## Success Criteria Verification

| Criterion | Kind | Evidence | Status |
| --- | --- | --- | --- |
| `computeOverall` never PASS while any DEFERRED-CI | behaviour | `finalise-deferred-ci.test.mjs` "computeOverall: an unresolved DEFERRED-CI is never PASS"; mutation-proven | PASS |
| Step 6 resolves SUCCESS/FAILURE/other and rebinds `AC_OVERALL` | behaviour | the fence tests in `finalise-deferred-ci.test.mjs` (SUCCESS, FAILURE, PENDING, no merged result, placeholder HALT) | PASS for one run. T249-QA-1 is the re-run gap |
| AC prompt defines process and CI-state kinds; five kinds; measured locations | documentation | `shared/resources/finalise-dod-ac-prompt.md` Step 3; pinned by `finalise-dod-ac-kinds.test.mjs` | PASS |
| Security prompt `spec_ref` + `spec_challenges[]`; Step 3b.1 disposition | documentation | `finalise-dod-security-prompt.md` Step 4.2; `skills/finalise/SKILL.md` item 3a | CONCERNS (T249-QA-2) |
| review-task / review-story record-location check, Important | documentation | `skills/review-task/SKILL.md` check 22; `skills/review-story/SKILL.md` check 18 | PASS |
| `npm run ci` and `npm run test:clean-checkout` pass | measured | See below | PASS (2 environmental reds, explained) |
| `npm run bundle:check` 0 problems | measured | `bundle:check exit=0` | PASS |
| CHANGELOG cites task 249 | documentation | `changelog-cites.sh` → `cites (task 249)` | PASS |

**The `npm run ci` run.**
- The test step was run with `CI=true` and reported 7026 tests, 7011 pass, 2 fail, 13 skipped.
  - `ci-tool-skips`: under `CI=true` it requires zsh, and this laptop has none. Real CI installs zsh, so this is a local artefact.
  - `bundle-comment-origin` §2: an ENOENT on another suite's transient `.t131-mutant-*` directory, a parallel-run race. Re-run alone it reports 5/5 pass.
  - The same suite run without `CI=true` (`ci:fast`, at the same tree) reported 7026 tests, 0 fail.
- Every later stage exited 0: `eval:all`, `validate:all`, `check:generated`, `bundle:check`, `lint:shell`, `lint:secrets`.
- `test:clean-checkout` exited 0.

**Criteria drift**: `clean` (base `review-commit`).

---

## Breaking Changes Validation

None documented, and none found. An AC record that has no `DEFERRED-CI` entry merges and scopes exactly as before. The existing `finalise-rerun-scope.test.mjs` suite passes 52/52.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: T249-QA-1 — a CI-state verdict is carried past the reading that graded it**
- **Severity**: MEDIUM
- **Category**: Functional
- **What was observed**:
  - `resolve-ci` rewrites a `DEFERRED-CI` entry to `status: PASS`. Its `code_citation` is the CI config.
  - On the next DoD run, `scope()` (`finalise-rerun-scope.js:383-416`) re-judges only non-PASS entries and entries whose evidence paths changed. A CI-state PASS citing an unchanged `.github/workflows/*.yml` goes to `carry` (`:415`).
  - Step 6 action 2a then finds nothing deferred.
- **Impact**: a later head is accepted on the CI result of an earlier head. That is the exact inversion of obs #110.
- **Recommendation**: scope() always re-judges an entry carrying `ci_reading`. Add a test with a resolved prior entry.

**Issue: T249-QA-2 — the spec_ref lookup matches cases by id alone**
- **Severity**: MEDIUM
- **Category**: Security / Functional
- **What was observed**:
  - Item 3a says to find a reproduced probe's case "by its `id`".
  - `security-probe-plan.mjs` refuses duplicate ids only within one entry, and corpus case ids are shared by every control on a sink.
  - Step 3b.1 item 3 already forbids id matching for severities, for this reason (task.189 CR2-1).
- **Impact**: a corpus probe, or another entry's probe, can be read as an inline case that contradicts its spec and be moved out of `probes[]`. That would hide a real security FAIL.
- **Recommendation**: resolve the case through the probe's `key`: entry index → that entry's cases file. A probe from an entry with no inline cases is exempt.

### LOW Severity Issues (2)

- **CR-3** `skills/finalise/SKILL.md:1307`: Step 6 action 2a skips silently in two different situations.
  - A bug run, where skipping is correct.
  - A story or task run whose merged file is missing. There it leaves `AC_OVERALL` non-PASS with no message.
  - Fix: HALT when `$AC_RECORD` exists but the merged result does not.
- **CR-4** (cleanup) `skills/finalise/SKILL.md:674`: item 3a says it runs "before grading", but it is listed after item 3's grading re-dispatch.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
One JSON read and write per DoD run. No hot path.

### Reliability — CONCERNS
T249-QA-1, plus CR-3 (low).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 13 (`totals.executed` from `task.249.qa.1.security.run.json`). 0 reproduced, 0 escaped.
- **Boundary**: true.
  - The criteria classifier matched `never` (SC-1).
  - The probed predicate is `ciResolution`, which decides whether a CI rollup grades a deferred criterion. It returns `null` for an undecided rollup, which the engine scores as rejected.
  - Hostile inputs were 11 rollups that must not decide the criterion: PENDING, NONE, CANCELLED, UNKNOWN, empty, lowercase, padded, trailing newline, the recorded tree-equivalent line, NEUTRAL and `__proto__`.
  - Legitimate inputs were SUCCESS and FAILURE.
  - The cases carry the sink label `filename` because no corpus sink models a CI rollup token. Cases: `task.249.qa.1.security.cases.json`.
- T249-QA-2 is a correctness defect in how the DoD routes probe results, not a hole in a boundary. It is recorded under Functional.

### Maintainability — PASS
The change is small and exported. It adds 20 tests and 2 assertions, and the proofs below cover it.

---

## Code Review

Code review is promoted to blocking (`code_review_blocking=true`). No finding is `confidence: high`, so none was promoted automatically. QA verified CR-1 and CR-2 against the code and raised them itself as T249-QA-2 and T249-QA-1.

**Correctness bugs (3):**
- [medium/medium] `shared/resources/finalise-rerun-scope.js:838` — a resolved CI-state PASS is carried on the next run → re-judge entries with `ci_reading` (T249-QA-1)
- [medium/medium] `skills/finalise/SKILL.md:683` — the inline case is looked up by id across cases files → look it up by the probe's key (T249-QA-2)
- [low/medium] `skills/finalise/SKILL.md:1307` — a silent skip when the merged file is missing on a story/task run → HALT when the AC record exists (CR-3)

**Cleanups (1):**
- `skills/finalise/SKILL.md:674` — item 3a runs after item 3's grading → reorder (CR-4)

All four anchors were checked by `finding-anchors.js`: `ok`.

**Mutation proofs:**

mutation-proven: `computeOverall` treats DEFERRED-CI as PASS → "computeOverall: an unresolved DEFERRED-CI is never PASS" → covered (dev, Step 3)
mutation-proven: `ciResolution` maps PENDING → PASS → "resolve: PENDING rollup decides nothing" → covered (dev, Step 3)
mutation-proven: Step 6 fence drops the `AC_OVERALL=` rebind → "fence (bash): SUCCESS rebinds AC_OVERALL to PASS" → covered (dev, Step 3)
mutation-proven: `recordStatus` coerces DEFERRED-CI to FAIL → "merge (full): DEFERRED-CI survives into acs and the record" → covered (dev, Step 3)
mutation-proven: `mergeReportedGap` drops its DEFERRED-CI short-circuit → "merge (reported-gap with members): an agent DEFERRED-CI is kept" → covered (QA, scratch worktree; baseline 20/20 after restore)

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-rerun-scope.test.mjs` (scope/merge) | PASS 52/52 |
| AC kinds structural pins (`finalise-dod-ac-kinds`, `review-task-measured-criterion`) | PASS 11/11 |
| Full suite (`ci:fast`) | PASS 7026, 0 fail |
| Clean checkout | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/finalise-rerun-scope.js`, `shared/resources/tests/finalise-deferred-ci.test.mjs`, `shared/resources/finalise-dod-ac-prompt.md`, `shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md`, `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/create-task/SKILL.md`, `skills/create-story/SKILL.md`, `CHANGELOG.md`

### Test Commands Executed
```bash
npm run ci:fast
CI=true npm run ci                      # test step: 2 environmental reds (see Success Criteria)
command node --test tests/bundle-comment-origin.test.js
npm run eval:all; npm run validate:all; npm run check:generated; npm run bundle:check; npm run lint:shell; npm run lint:secrets
bash scripts/test-clean-checkout.sh
npm run validate -- skills/{finalise,review-task,review-story,create-task,create-story}/
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'shared/resources/finalise-rerun-scope.js#ciResolution' --cases-file docs/tasks/task.249.finalise-grades-every-criterion-kind/task.249.qa.1.security.cases.json --record docs/tasks/task.249.finalise-grades-every-criterion-kind/task.249.qa.1.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed-file> --diff-base <merge-base> --copy-as skills:.agents/skills --json
```

### Coverage Report
Not measured: the repository runs `node --test` with no coverage instrument.

---

## Recommendations

### Immediate Actions (Blocking)
1. T249-QA-1: re-judge CI-state entries on every run.
2. T249-QA-2: look the case up by the probe's key.

### Short-term Actions (Non-Blocking)
1. CR-3: HALT instead of skipping silently.
2. CR-4: reorder item 3a.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: There are two verified MEDIUM defects, one in the engine's re-run path and one in the new DoD prose. Everything else is green.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T249-QA-1 and T249-QA-2 are fixed and re-reviewed.

---

**QA Report**: co-located at `task.249.qa.1.finalise-grades-every-criterion-kind.md`
**Gate File**: co-located at `task.249.gate.1.finalise-grades-every-criterion-kind.yml`
**Next Steps**: `/qa-fix` for T249-QA-1 and T249-QA-2, then QA cycle 2 (refute pass).
