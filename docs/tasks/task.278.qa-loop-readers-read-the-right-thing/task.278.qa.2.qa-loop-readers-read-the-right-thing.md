# QA Report: Task 278 - QA loop readers read the right thing

**Task**: [Link to task document](./task.278.qa-loop-readers-read-the-right-thing.md)
**Gate File**: [task.278.gate.2.qa-loop-readers-read-the-right-thing.yml](./task.278.gate.2.qa-loop-readers-read-the-right-thing.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-16
**Testing Completed**: 2026-11-16
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's fixes hold: three of its four findings are closed, each by a committed test that goes red when the fix is reverted, and the `fix_path` boundary is now probed by the engine (12 executed, 0 escaped). The refute pass found two defects in the new code, both reproduced, and the criterion-3 deviation still needs an approver.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Cycle 1 finding | Status | Evidence |
| --- | --- | --- |
| T278-QA-1 CHANGELOG entry | FIXED | `changelog-cites.sh task.278` answers `cites (task 278)` |
| T278-QA-2 criterion 3 deviation | NOT FIXED (escalated) | Recorded in the task Notes; no approver yet. Carried as T278-QA-2 |
| T278-QA-3 globs wiring test | FIXED | Wiring test runs the block with globs set, empty, unset and unparseable in bash and zsh; mutation below |
| T278-QA-4 `fix_path` boundary | FIXED | `fixPathTarget` extracted; probe `engages`, 12 executed, 0 escaped; mutation below |

Re-review scope: unscoped — cycle 2 is always a full refute pass over `origin/develop...HEAD` (generated `references/` copies and `docs/` excluded from the reviewed patch).

---

## New Findings This Cycle

- **[medium]** `shared/resources/ci-tree-equivalence.js:180` — `fixPathTarget` never normalises `workItemDir`, so `./docs/tasks/t`, `docs/tasks//t` and `docs/tasks/t/` drop a legitimate `fix_path` (reproduced) → normalise it (T278-QA-5).
- **[medium]** `shared/resources/qa-diminishing-returns.js:767` — the fold cuts a test stem at every dash with no floor, so `src/tests/user-service.test.ts` folds onto `src/user.ts` (reproduced) → exact stem or a documented boundary (T278-QA-6).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`ci:fast` on the LAN server at the cycle 1 fix tree: 8531 pass, 0 fail, 3 skipped)
- [x] Breaking changes: none (both new inputs are optional)
- [x] Code on feature branch with open PR (#915)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review, run as the cycle 2 refute pass over the whole branch diff (1759 lines, non-generated files). The reviewer was dispatched at 20:52Z and returned in 160 s (`duration_ms` 160407).

CI on 7c038234f6c2: pending (read once with `qa-ci-read.sh`; undecided, so nothing enters the gate).

Step 4b: two changed blocks in `develop-pipeline-step-5-6-qa-loop.md`, both refused by the snippet allow-list as `mutating`, so `changed-blocks-not-executed`, unchanged from cycle 1. Committed tests run the classify block (`acceptance-commit-carries-5c`, bash and zsh) and the narrowing block (`qa-narrowing-offer-wiring`, now with globs, bash and zsh).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: gate reader | PASS | 11 tests | unchanged since cycle 1 |
| Phase 2: residue fold | CONCERNS | rows 17-20 | dash-cut has no floor (T278-QA-6) |
| Phase 3: 5c `fix_path` | CONCERNS | bash and zsh case, 12-case probe corpus | `workItemDir` not normalised (T278-QA-5) |
| Phase 4: tests, bundle, sweep | PASS | bundle 0 problems | CHANGELOG cites task 278 |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Three motivating shapes classify correctly, named tests | yes | unchanged from cycle 1 | PASS | |
| Other `readTopIssues` consumers pass existing fixtures unchanged | unchanged | one expectation moved | CONCERNS | T278-QA-2, awaiting an approver |
| Wall time within 10% of develop | <= 10% | -3.5% (cycle 1 measurement) | PASS | no hot path changed since |
| Each change has a mutation proof | yes | five proofs across both cycles | PASS | below |
| `bundle --check` 0 problems; `CI=true npm test` passes | yes | 0 problems; 8531 pass | PASS | |

**Criteria drift**: `criteria-drift.js` reports `clean`; no criterion text changed.

---

## Breaking Changes Validation

None.

---

## Issues Found

### MEDIUM Severity Issues (3)

- **T278-QA-2** `accept-qa-residual.test.mjs`: the criterion-3 deviation needs an approver; do not reword the criterion.
- **T278-QA-5** `ci-tree-equivalence.js`: normalise `workItemDir` in `fixPathTarget`.
- **T278-QA-6** `qa-diminishing-returns.js`: give the fold's dash-cut a floor or fold on the exact stem.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 0

---

## NFR Assessment

### Performance — PASS

Cycle 1 median -3.5% against develop; cycle 1's changes add one small function and tests.

### Reliability — CONCERNS

An unparseable or non-array `testArtifactGlobs` reads as "no fold" with no message, where the HIGH-sequence input in the same block reports could-not-look as an error (CR-3, low, advisory).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12 (`escaped: 0`)
- `fixPathTarget` run through `security-probe.mjs` (filename sink, `--args-json` carrying the work-item directory and patterns, 12-case corpus): `engages`. The probe passes one canonical work-item directory, which is why T278-QA-5 was not seen by it.

### Maintainability — PASS

The predicate lives once in `ci-tree-equivalence.js` with a test and a corpus; bundled copies in sync.

---

## Code Review

Reviewed: refute pass over the whole branch diff (15 non-generated files).

**Correctness bugs (3):**
- [medium/high] `shared/resources/ci-tree-equivalence.js:180` — `workItemDir` never normalised → T278-QA-5 (reproduced by QA: `./docs/tasks/t`, `docs/tasks//t`, `docs/tasks/t/` all return `null`, the canonical form returns the file).
- [medium/medium] `shared/resources/qa-diminishing-returns.js:767` — dash-cut has no floor → T278-QA-6 (reproduced by QA: `["src/tests/**"]` gives `narrowing-residue` for `src/user.ts` + `src/tests/user-service.test.ts`; no globs gives `medium-files-differ`; the exact stem `user.test.ts` folds as intended).
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1095` — unparseable globs read as "no fold" without a message → advisory (`recommendations.future`).

**Cleanups (2):**
- `shared/resources/tests/ci-tree-equivalence.test.mjs` — the corpus needs `--args-json` to score under the engine and no test runs it through the engine; several hostile cases are refused by the directory check alone → advisory.
- `shared/resources/qa-diminishing-returns.js:762` — only a literal `tests/` directory folds → advisory.

**Boundary:** `boundary: true`, `probes_executed: 12`, `escaped: 0` (run record `task.278.qa.2.security.run.json`).

**Platform variance:** no environment-derived value reaches a validating consumer in this diff.

mutation-proven: `fixPathTarget` directory check removed → `ci-tree-equivalence` fixPathTarget test (1 fail) and probe `present-but-inert` → covered
mutation-proven: globs argv read replaced by `"[]"` → `qa-narrowing-offer-wiring` configured-globs case, bash and zsh (2 fail) → covered

Snapshots restored byte-identical (`cmp` silent) and both suites read 129 pass, 0 fail afterwards. Cycle 1's three mutation proofs (gate reader, fold, `fix_path` branch) are unchanged by this cycle's commit, which touched none of those files.

---

## Regression Testing

`ci:fast` on the LAN server at the cycle 1 fix tree: formatting clean, `npm test` 8531 pass, 0 fail, 3 skipped.

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true npm run test:remote            # ci:fast on the LAN server
npm run bundle -- --check              # 0 problems
npm run validate -- skills/review-pr/  # ok
security-probe.mjs --sink filename --entry shared/resources/ci-tree-equivalence.js#fixPathTarget --args-json '["docs/tasks/task.9.x",["**/*.md","docs/**"]]' --cases-file tests/fixtures/probe/fix-path-target.cases.json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T278-QA-5 and T278-QA-6; obtain an approver for T278-QA-2.

### Short-term Actions (Non-Blocking)
1. CR-3, CR-4, CR-5 (see the gate's `recommendations.future`).
2. Symlinked `*.md` in the 5c carry (pre-existing).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: cycle 1's findings are closed and held; the refute pass found two reproduced defects in the new code, and one criterion deviation awaits an approver.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T278-QA-5 and T278-QA-6 fixed and re-verified; T278-QA-2 deviation approved

---

**QA Report**: co-located at `task.278.qa.2.qa-loop-readers-read-the-right-thing.md`
**Gate File**: co-located at `task.278.gate.2.qa-loop-readers-read-the-right-thing.yml`
**Next Steps**: qa-fix cycle
