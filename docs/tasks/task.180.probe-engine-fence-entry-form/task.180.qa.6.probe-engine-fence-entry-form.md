# QA Report: Task 180 - security-probe: a fence: entry form for a fenced bash block in a step doc

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Gate File**: [task.180.gate.6.probe-engine-fence-entry-form.yml](./task.180.gate.6.probe-engine-fence-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Testing Completed**: 2026-10-12
**Gate Status**: FAIL

---

## Executive Summary

QA cycle 6, the granted cycle, reviews qa-fix cycle 5 (`243bc237`). Both cycle-5 findings are fixed and mutation-proven. The safety re-probe found the next gap of the same class. The `gh` text check reads the block and the inputs, but not what a case fixture runs, so a fixture script reached through `BASH_ENV` resolves the host `gh`. It also found that a kill after a side effect hides the side effect.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-180-015: `fence:` skips the `gh` text check | high | FIXED | new test (block and input both declined before any case runs; `ghost/bin/gh` still scored); QA mutations Q1 (the text argument ignored) and Q2 (the guard inverted) each red |
| TASK-180-016: outside writes unseen, contrary to §5 | medium | FIXED (limit stated) | engine header, §5, task doc and CHANGELOG state the limit; a test pins it |

Bugs 8 and 9 → Closed.

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore code reviewer. Dispatched 2026-10-12T16:20:41Z, `duration_ms` 290301. The orientation note listed the stated limits, so a restated limit would not be reported as new.

Re-review scope: unscoped (prior gate: HIGH on a boundary, `SAFETY_REPROBE` clause 2; clause 1 `false`). Whole `origin/develop...HEAD` diff, with the SAFETY RE-PROBE directive. Mutations ran in a scratch worktree.

Step 4b: the five in-scope docs are unchanged in structure since cycle 5; `probe-boundary-rule.md` gained prose only, with no new fenced block.

---

## New Findings This Cycle

- **[HIGH]** `shared/resources/security-probe.mjs:1253`: the `gh` text check skips fixture content. A `BASH_ENV` fixture script resolves the host `gh` (TASK-180-017, bug 10). → Make the guard structural: a case `PATH` with no directory that holds `gh`.
- **[MEDIUM]** `shared/resources/security-probe.mjs:2278`: a killed child scores `errored` before `expected.absent` is checked (TASK-180-018, bug 11). → Check `absent` first.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Tests first | PASS | 31 `fence entry` tests |
| Phase 2: The entry form | CONCERNS | TASK-180-017, -018 |
| Phase 3: Routing and proof | PASS | task.167 proof holds: `engages`, 0 reproduced |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC1 `fence:` probes a block, scored per `scoreFenceRun` | CONCERNS | TASK-180-017, -018 |
| SC2–SC5, Performance | PASS | committed tests; `ci:fast` green |

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: the gh text check misses fixture content**
- **Bug Report**: [task.180.bug.10.gh-text-check-misses-fixture-content.md](./task.180.bug.10.gh-text-check-misses-fixture-content.md)
- **Observation**: a `BASH_ENV` fixture with `type -ap gh` was not declined, and the cases ran (reproduced on 243bc237).
- **Recommendation**: a structural guard, not more text.

### MEDIUM Severity Issues (1)

**Issue: a kill after a side effect scores errored**
- **Bug Report**: [task.180.bug.11.killed-run-hides-side-effect.md](./task.180.bug.11.killed-run-hides-side-effect.md)
- **Observation**: `'$(touch pwned; kill -9 $$)'` → `errored`; verdict `engages`.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 26 (`task.180.qa.6.security.run.json` `totals.executed`)
- Both controls engage, 0 reproduced. TASK-180-017 and -018 are open.

### Performance — PASS · Reliability — PASS · Maintainability — PASS

---

## Code Review

boundary: true. probes_executed: 26.

**Correctness bugs (2):**
- [high/high] `shared/resources/security-probe.mjs:1253`: the `gh` text check skips fixture content. Promoted to TASK-180-017.
- [medium/high] `shared/resources/security-probe.mjs:2278`: a killed child scores errored before `absent` is checked. Promoted to TASK-180-018.

**Cleanups (0).**

Provenance: both are new to this branch (`fence:` does not exist on `origin/develop`).

mutation-proven: `namesGh` ignores its text argument → TASK-180-015 test → covered
mutation-proven: fence `gh` guard inverted → TASK-180-015 test → covered

---

## Test Artifacts

```bash
npm run ci:fast   # in 5b, at 243bc237
npm run bundle:check
npm run lint:shell
npm run validate -- skills/qa-task/   # also qa-story, review-security, finalise
node shared/resources/security-probe.mjs … --record task.180.qa.6.security.run.json --json   # the two cycle-5 controls
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH (TASK-180-017). The cycle-5 fixes hold.
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED

**Next Steps**: the QA budget (`qa_max_cycles` 6) is spent; the develop-task loop escalates.
