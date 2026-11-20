# QA Report: Task 278 - QA loop readers read the right thing

**Task**: [Link to task document](./task.278.qa-loop-readers-read-the-right-thing.md)
**Gate File**: [task.278.gate.3.qa-loop-readers-read-the-right-thing.yml](./task.278.gate.3.qa-loop-readers-read-the-right-thing.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-16
**Testing Completed**: 2026-11-16
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's two defects are fixed and each is held by a committed test that goes red when the fix is reverted. The scoped review of the two fixes found no bug. One MEDIUM remains and no fix cycle can close it: the criterion-3 deviation needs an approver.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Cycle 2 finding | Status | Evidence |
| --- | --- | --- |
| T278-QA-2 criterion 3 deviation | NOT FIXED (needs an approver) | Recorded in the task Notes and the report; carried as T278-QA-2 |
| T278-QA-5 `workItemDir` not normalised | FIXED | five spellings of one directory match their own file; four other directories do not (`ci-tree-equivalence.test.mjs`); mutation below |
| T278-QA-6 dash-cut has no floor | FIXED | fold cuts only at a named test kind; row 21 (`user-service` vs `user`) stays two subjects; row 17 still folds; mutation below |

Re-review scope: files changed since gate 2 (head 7c038234f6c2; 16 files, of which 8 are bundled copies) — default.

---

## New Findings This Cycle

None that gate. Three low cleanups, all advisory (see Code Review).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`ci:fast` on the LAN server at the cycle 2 fix tree: 8533 pass, 0 fail, 3 skipped)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR (#915)

### Review Methodology

Direct tools plus one read-only Explore subagent for the scoped diff review, dispatched at 21:13Z and returned in 78 s (`duration_ms` 78054). The reviewer executed one must-be-the-same and one must-differ pair for each of the two fixes.

CI on 203e8456e525: pending (read once with `qa-ci-read.sh`; undecided, so nothing enters the gate).

Step 4b: the one changed block is a table row in prose; the two changed fenced blocks are unchanged since cycle 2 (refused as `mutating`, run by committed tests in bash and zsh).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: gate reader | PASS | 11 tests | unchanged |
| Phase 2: residue fold | PASS | rows 17-21 | named-kind allow-list |
| Phase 3: 5c `fix_path` | PASS | bash and zsh case, 12-case probe corpus | directory normalised |
| Phase 4: tests, bundle, sweep | PASS | bundle 0 problems | |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Other `readTopIssues` consumers pass existing fixtures unchanged | unchanged | one expectation moved | CONCERNS | T278-QA-2, awaiting an approver |
| All other criteria | as cycle 1 | unchanged | PASS | |

**Criteria drift**: `criteria-drift.js` reports `clean`.

---

## Breaking Changes Validation

None.

---

## Issues Found

### MEDIUM Severity Issues (1)

- **T278-QA-2** `accept-qa-residual.test.mjs`: the criterion-3 deviation needs an approver; do not reword the criterion.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS

Cycle 1 median -3.5% against develop; later cycles add a Set lookup and a path normalisation.

### Reliability — CONCERNS

An unparseable or non-array `testArtifactGlobs` reads as "no fold" with no message (cycle 2 CR-3, low, advisory).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12 (`escaped: 0`)
- `fixPathTarget` probed by `security-probe.mjs` (filename sink, `--args-json`, 12-case corpus): `engages`.

### Maintainability — PASS

One definition of the predicate and one of the fold rule; bundled copies in sync.

---

## Code Review

Reviewed: scoped patch, 2 delta changes plus tests and fixture (generated copies ignored).

**Correctness bugs (0).**

**Cleanups (3):**
- `shared/resources/qa-diminishing-returns.js:790` — [low/medium] a production file `user.js` with `tests/user-unit.test.mjs` still folds, and the suffix lookup is case-sensitive → accept as the trade-off of a name-based fold.
- `shared/resources/qa-diminishing-returns.js:773` — [low/medium] a multi-dot production file (`foo.d.ts`) never folds; the conservative direction.
- `shared/resources/tests/qa-narrowing-residue.test.mjs:298` — [low/high] no fixture row for a multi-suffix stem or a production name ending in a kind word; both behave correctly when executed.

**Boundary:** `boundary: true`, `probes_executed: 12`, `escaped: 0` (run record `task.278.qa.3.security.run.json`).

**Platform variance:** no environment-derived value reaches a validating consumer in this diff.

mutation-proven: `fixPathTarget` directory normalisation removed → `ci-tree-equivalence` spelling test (1 fail) → covered
mutation-proven: fold allow-list removed (cut at any dash) → `qa-narrowing-residue` row 21 (1 fail) → covered

Snapshots restored byte-identical (`git status --porcelain shared` empty) and both suites read 144 pass, 0 fail afterwards. Cycle 1's three proofs touch files this cycle did not change in a way that affects them.

---

## Regression Testing

`ci:fast` on the LAN server at the cycle 2 fix tree: formatting clean, `npm test` 8533 pass, 0 fail, 3 skipped.

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true npm run test:remote            # ci:fast on the LAN server
npm run bundle -- --check              # 0 problems
security-probe.mjs --sink filename --entry shared/resources/ci-tree-equivalence.js#fixPathTarget --args-json '["docs/tasks/task.9.x",["**/*.md","docs/**"]]' --cases-file tests/fixtures/probe/fix-path-target.cases.json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Obtain an approver for T278-QA-2.

### Short-term Actions (Non-Blocking)
1. The advisory items in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: all fixable findings are closed and held; one MEDIUM awaits an approver.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T278-QA-2 deviation approved

---

**QA Report**: co-located at `task.278.qa.3.qa-loop-readers-read-the-right-thing.md`
**Gate File**: co-located at `task.278.gate.3.qa-loop-readers-read-the-right-thing.yml`
**Next Steps**: loop exit decision (T278-QA-2 is the only open entry and is test machinery)
