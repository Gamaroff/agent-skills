# QA Report: Task 270 - finalise bookkeeping is mechanical

**Task**: [Link to task document](./task.270.finalise-bookkeeping-is-mechanical.md)
**Gate File**: [task.270.gate.1.finalise-bookkeeping-is-mechanical.yml](./task.270.gate.1.finalise-bookkeeping-is-mechanical.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: CONCERNS

---

## Executive Summary

All three finalise bookkeeping fixes are in place, held by committed tests with controls, and mutation-proved. CI on the PR head (6 checks) and the full local suite are green. One MEDIUM finding stops a PASS: no CHANGELOG entry cites task 270.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (add the CHANGELOG entry)

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer for the diff. Step 4b (execute the documented commands): the change touches fenced bash in `skills/finalise/SKILL.md`; its 6a block is executed under bash and zsh by `finalise-6a-registry-staging.test.mjs`, which is the committed per-PR evidence.

CI on 39a1608c: 6 checks, all completed with SUCCESS (test, validate, link-check, shellcheck, secret-scan, branch-source check).

The reviewer ran 2026-11-07 17:58Z to about 18:00Z; its completion notice reported 23.5 s of work (`duration_ms` 23515). It was independent of the author, but it used 4 tool calls, so I enumerated the DoD-number readers myself (below).

---

## New Findings This Cycle

First review: the section below is the full list.

- **[medium]** `CHANGELOG.md` — no `[Unreleased]` entry cites (task 270) → add one (T270-QA-1).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: fill script | PASS | Verified | gaps rewrite and placeholder halt; `{CI_ROLLUP}` exempt |
| 2: 6a staging | PASS | Verified | `find`, run number from `DOD_PATH`, bash and zsh |
| 3: `DOD_N` namespace | PASS | Verified | `-name "${STEM}.dod.*"` |
| 4: tests, bundle, sweep | PASS | Verified | bundle check 0 problems |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| gaps fill leaves no accepted-path text; surviving placeholder halts | PASS | `finalise-gaps-path.test.mjs`, new gaps-fill and placeholder-halt tests (bash and zsh) |
| 6a leaves no `dod.N.security.*` path untracked | PASS | `finalise-6a-registry-staging.test.mjs`, security-artefact test plus no-artefact control |
| `DOD_N` is 3 on the obs #96 layout | PASS | `next-numbered.test.mjs`, DOD_N test; old pattern answers 2 as control |
| npm test within 10% of develop (median of five alternating runs) | CONCERNS | Not run as specified. Branch run: 189 s, exit 0, load 3.6. The changed suites run in about 2 s, under 1% of total |
| mutation proof for each fix | PASS | see below |
| bundle check 0 problems; `CI=true npm test` passes | PASS | 8013 tests, 8011 pass, 0 fail, 2 skipped |
| `finalise-bug-mode.test.mjs` passes | PASS | 98 pass, 0 fail |
| accepted bug DoD fixture unchanged by the fill | PASS | accepted-keeps-its-text test in `finalise-gaps-path.test.mjs` |

### Mutation proofs (recorded by the developer during Step 3, re-read here)

mutation-proven: gaps rewrite disabled → the two gaps-fill tests → covered
mutation-proven: placeholder halt disabled → four halt tests → covered
mutation-proven: `DOD_N` pattern reverted → two DOD_N tests → covered
mutation-proven: 6a staging append dropped → two staging tests → covered

I did not re-run the mutations in this cycle; they are the developer's, restored afterwards (working tree was clean at the start of this cycle).

---

## Code Review

Reviewer result: no findings, 5 files. I checked the population it was asked about: every reader of the DoD number (`develop-pipeline-step-7-finalise.md`, `develop-pipeline-resume-contract.md`, `review-pr`) looks up the newest DoD *document* with `*.md`, which is correct for a reader. Only the allocator needed the wider pattern. `newest-numbered.sh:10` has a header example that uses the narrow pattern for a reader, which is correct.

**Correctness bugs (0).** **Cleanups (0).**

boundary: internal. The placeholder halt reads only the bug DoD this pipeline writes; no corpus sink models it. Covered by committed tests with controls. No candidate named beyond that function.

---

## NFR Assessment

### Performance: CONCERNS
The 10% criterion was not measured as written. Bounded estimate above.

### Reliability: PASS
### Security: PASS (evidence: reasoned, probes executed: 0)
### Maintainability: PASS

---

## Issues Found

### MEDIUM Severity Issues (1)

- **T270-QA-1** `CHANGELOG.md`: no entry cites (task 270); `/finalise` 6d halts on it. Fix: add an `[Unreleased]` entry.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true npm run ci:fast
CI=true npm test
CI=true node --test evals/shared/tests/finalise-bug-mode.test.mjs
npm run validate -- skills/finalise/
bash .agents/skills/qa-task/references/changelog-cites.sh task.270
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: CHANGELOG entry added

**Next Steps**: run `/qa-fix` for T270-QA-1, then re-review.
