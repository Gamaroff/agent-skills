# QA Report: Task 254 - security-probe: a cli: entry can run a fixture setup

**Task**: [Link to task document](./task.254.probe-engine-cli-fixture-setup.md)
**Gate File**: [task.254.gate.2.probe-engine-cli-fixture-setup.yml](./task.254.gate.2.probe-engine-cli-fixture-setup.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Testing Completed**: 2026-11-03
**Gate Status**: PASS

---

## Executive Summary

Cycle 2 re-reviewed the whole branch diff as a refute pass. The cycle-1 finding (T254-QA-1) is closed by a test that counts `bash` spawns, and that test goes red when an extra spawn is added. The reviewer found one low-confidence advisory item and no defect that gates.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (285)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#818, head 98995154)

### Review Methodology

Direct tools plus one read-only Explore reviewer, run as the cycle-2 refute pass over the whole branch diff against `origin/develop` (2485 lines, docs and generated skill copies excluded). The reviewer was given the four transition probes, the identity rules and the resource-bound probes.
CI on 989951549a52: green.
Reviewer dispatched 2026-11-03T12:59Z; the completion notice reports `duration_ms` 58536.
Step 4b: not applicable — no fenced block in the cycle-1 fix (a code comment and a test).

Re-review scope: unscoped — cycle 2 is a full refute pass over the whole branch diff.

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T254-QA-1 (medium): the no-extra-process criterion is held only by a record field | ✅ FIXED — test "cli entry: a run with no --fixture-setup spawns no bash for a setup; with one it spawns exactly one per case (task.254 QA-1)" |
| CR-2 (cleanup): stale record-field comment | ✅ FIXED — the comment now names the `cli:` form |
| CR-1 (low): `cli:` setup runs on the host PATH, textual `gh` scan | Carried as advisory in `recommendations.future` |

## New Findings This Cycle

- **[low/medium]** `shared/resources/security-probe.mjs:2442` — `materialiseFixture` attaches `MATERIALISE_NAME_CODE` to the NUL branch as well as the `/` branch, so a `filename`-sink input containing NUL is told "an input that is a path needs a sink that is not materialised", which is wrong for NUL. The NUL test covers only the `url-authority` sink. → attach the code only for `/`, or add a NUL code, and test the `filename` sink with a NUL input. Advisory: `bug` at `medium` confidence does not gate. The advice is a decline message, not an accept/reject decision.

Searched unscoped. The reviewer read the setup helper, its timeout and process-group kill, the `gh` scan, the shell and `cli:` call sites, and the new test's PATH restore and temp-dir cleanup. It ran the six task.254 tests. The four transitions (bulk teardown, in-flight, error path, reconnect) do not apply to a per-case, run-to-completion child, and the error path is covered by the failing and escaping setup tests.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Reproduce both causes | PASS | Verified | Unchanged since cycle 1. |
| 2: One setup helper | PASS | Verified | `runCaseSetup`, called by both arms. |
| 3: Decline wording | PASS | Verified | `cannotMaterialiseDetail` names the sink. |
| 4: Docs, bundles, proof | PASS | Verified | `bundle:check` 128 skills, 0 problems. |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

All twelve criteria hold; the one open in cycle 1 now cites a test.

| Criterion | Evidence | Status |
| --- | --- | --- |
| No extra process without a setup, asserted by a test | The spawn-counting test: 0 `bash` spawns without a setup, 2 with `REPO_SETUP` over two cases. Mutation below. | PASS |
| Every other criterion | As recorded in QA report 1; no code under them changed in the cycle-1 fix except a comment | PASS |

**Criteria drift:** clean (`criteria-drift.js`, base: review-commit).
**CHANGELOG:** `cites (task 254)`.

---

## Issues Found

None at gate level. **Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
The new test observes zero extra spawns without a setup.

### Reliability — PASS
Failing, timed-out and escaping setups are errored with a named detail.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Boundary decision: `boundary: false`, criteria classifier `["never"]` ("errored, never rejected" is outcome classification, not an input gate). `materialiseFixture` is a predicate-shaped function the diff touches (it gained an error code); its accept/reject behaviour is unchanged.
- Escapes: 0.

### Maintainability — PASS
One shared helper; the stale comment is fixed.

---

## Code Review

Advisory. The only finding is a `bug` at `medium` confidence, so it does not reach the gate under `code_review_blocking`.

**Correctness bugs (1):**
- [low/medium] `shared/resources/security-probe.mjs:2442` — NUL on the `filename` sink gets path advice → attach the code only for `/` and test the NUL case.

**Cleanups (0).**

**Mutation proofs** (engine snapshot taken with `cp`, restored and compared to HEAD afterwards):
- mutation-proven: an extra `bash -c true` spawn on the `cli:` no-setup path → "cli entry: a run with no --fixture-setup spawns no bash for a setup…" went red (0 pass, 1 fail) → covered. After restoring, the same test passes.

---

## Regression Testing

285 of 285 tests in `security-probe.test.mjs` pass; the four skill `validate` runs pass; `bundle:check` reports 0 problems.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs   # 285 pass
command node --test --test-name-pattern 'spawns no bash' shared/resources/tests/security-probe.test.mjs   # red under mutation, green restored
npm run bundle:check   # 128 skills, 0 problems
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 818   # CI green
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The cycle-1 finding is closed and proven; the refute pass found nothing that gates.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.254.qa.2.probe-engine-cli-fixture-setup.md`
**Gate File**: co-located at `task.254.gate.2.probe-engine-cli-fixture-setup.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
