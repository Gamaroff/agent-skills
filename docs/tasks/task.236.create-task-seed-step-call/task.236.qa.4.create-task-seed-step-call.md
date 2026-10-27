# QA Report: Task 236 - create-task 1.1 omits the required taskId argument to seedFromObservations

**Task**: [task.236.create-task-seed-step-call.md](./task.236.create-task-seed-step-call.md)
**Gate File**: [task.236.gate.4.create-task-seed-step-call.yml](./task.236.gate.4.create-task-seed-step-call.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-27
**Testing Completed**: 2026-10-27
**Gate Status**: PASS

---

## Executive Summary

Cycle 4 re-enters QA after `/finalise` found CI `test` red: the probe test asserted 18 executed cases, and CI's zsh doubled the count to 36. The fix (`1689d7cb`) asserts the count per shell. It is mutation-proven against a two-shell run, the scoped review found nothing, and the local suites are green.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Source | Status |
| --- | --- | --- |
| CI `test` red: `seed-step-block.test.js:355` expects 18 executed, CI gives 36 (bash + zsh) | `task.236.dod.1` Step 5 | ✅ FIXED (`1689d7cb`), locally under two shells; CI `test` on the fix head was still running when this gate was written |
| Gate 3 `top_issues` | gate 3 | none open |

## New Findings This Cycle

None. Searched the scoped diff since gate 3's head `7cb55772`: 1 code file (`skills/create-task/tests/seed-step-block.test.js`) and 10 task-directory documents. The reviewer checked the new assertion against `security-probe.mjs` (`probeShells`, `runFenceCase`, every return path), and looked for other one-shell counts in the create-task tests, `seed-block-probe.js` and `SKILL.md`. It found none.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#763)

### Review Methodology

Direct tools (a re-review), plus one Explore code-review subagent. Dispatched 07:24:15Z; returned in 52.8 s (`duration_ms` 52756).

Re-review scope: files changed since gate 3 (head 7cb55772f522; 11 files) — default

Step 4b: the runnable prose in `skills/create-task/SKILL.md` is unchanged since gate 3, so its seed block was run through the fence probe below rather than through `qa-execute-snippets`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: runnable seed block | PASS | Verified | unchanged since gate 3 |
| Phase 2: § 1.1 order and wording | PASS | Verified | unchanged |
| Phase 3: mutation proofs | PASS | Verified | the probe count assertion is now per shell |

**Overall Phase Completion**: 3/3

---

## Code Review

**Correctness bugs (0):** none.

**Cleanups (0):** none.

mutation-proven: revert the per-shell assertion to `executed === caseCount`, with a stand-in zsh on PATH → `the probe engine scores every seed-block case as its direction requires` red with `36 !== 18` → covered
mutation-proven: the fixed assertion under one shell (host) and under two (stand-in zsh) → passes both → covered

Boundary: `boundary: true`, the fenced seed guard in `skills/create-task/SKILL.md` § "Steps 3 to 6: seed, ask, cite and park". The probe ran from the shipped harness `buildSeedProbe`, record `task.236.qa.4.security.run.json`: probes_executed: 18, escaped: 0, reproduced 0.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| AC1–AC4, AC6–AC11 | as gate 3 | unchanged code | PASS |
| AC5 new test < 5 s | < 5 s | 4.504 s at load 5.15; 4.80 s earlier | PASS (thin margin) |
| CI green on the head | green | pending @ 1689d7cb | read at `/finalise` |

---

## Breaking Changes Validation

None. The change is a test assertion.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS

4.504 s at load 5.15 against the 5 s bound. The margin is thin and carried as future work.

### Reliability — PASS

The assertion no longer depends on which shells the host has.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 18
- Escaped 0, reproduced 0. With a stand-in zsh, 36 runs, every case scored correctly.

### Maintainability — PASS

`validate` rc 0; Prettier clean.

---

## Regression Testing

`npm run ci:fast` with `.agents/skills` and `.claude/skills` moved aside: TEST_EXIT=0, 6422 tests, 6408 pass, 0 fail, 14 skipped. Symlinks restored. The create-task suite: 50/50.

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test skills/create-task/tests/*.test.js
PATH=<scratch>/fakezsh:$PATH command node --test skills/create-task/tests/seed-step-block.test.js
command node <scratch>/qa4-probe.js "$PWD" docs/tasks/task.236.create-task-seed-step-call/task.236.qa.4.security.run.json
npm run validate -- skills/create-task/
npm run ci:fast
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The DoD gap is closed, the fix is mutation-proven, and no new finding was raised.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

**Next Steps**: Step 5c PR review, then `/finalise` once CI `test` is green on `1689d7cb`.
