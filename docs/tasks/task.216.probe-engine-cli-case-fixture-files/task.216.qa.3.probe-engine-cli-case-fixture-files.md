# QA Report: Task 216 - security-probe: the cli: form honours a case's fixture.files (and env)

**Task**: [Link to task document](./task.216.probe-engine-cli-case-fixture-files.md)
**Gate File**: [task.216.gate.3.probe-engine-cli-case-fixture-files.yml](./task.216.gate.3.probe-engine-cli-case-fixture-files.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: PASS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| TASK-216-QA2-1: docs say a `cli:` case fixture serves "a repository" | ✅ FIXED | The claim is scoped to data directories in the engine header, `probe-boundary-rule.md` §5, `finalise-dod-security-prompt.md` (two places), `security-input-corpus.mjs`, CHANGELOG and the task description. The reviewer searched SKILL.md files, `shared/resources` and CHANGELOG and found no stale restatement. |
| TASK-216-QA2-2: loader variables missing from `CLI_INTERPRETER_ENV` | ✅ FIXED | Four loader names were added. The `LD_PRELOAD` decline row goes red in both languages when it is removed (mutation, cycle 2). |

---

## Executive Summary

Both cycle 2 findings are fixed. The scoped review found one LOW: the docs say every `LD_*`/`DYLD_*`
variable is refused, but the code matches four exact names. The loop took the cosmetic-residue exit
(route 2b), so the LOW is carried to `recommendations.future` and to the task's `## Deferred Work`.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Testing Scope

### Review Methodology

Direct tools, plus one diff code-review subagent. It was dispatched at 06:40:50Z; its completion
notice gave `duration_ms` 54554.

Re-review scope: cycle 3, so only the files changed since gate 2's `head:` (`458d79e3..596d262d`),
13 files, with generated bundled copies excluded. The patch is each file's cumulative change against
`origin/develop`. No refute pass this cycle. The safety re-probe did not apply: the prior gate had no
security FAIL, and `qa-safety-clause1.sh` returned false.

Step 4b: `probe-boundary-rule.md` and `finalise-dod-security-prompt.md` changed, with 0 changed
fenced blocks.

---

## New Findings This Cycle

- **[low]** `shared/resources/security-probe.mjs:3161`: the docs say the `LD_*`/`DYLD_*` loader
  variables are refused (`finalise-dod-security-prompt.md:235`, CHANGELOG). But
  `CLI_INTERPRETER_ENV` is an exact-match list, checked with `.includes` at line 2591. So
  `LD_AUDIT`, `DYLD_FRAMEWORK_PATH` and `DYLD_FALLBACK_LIBRARY_PATH` pass, and only `LD_PRELOAD` has
  a test row. QA verified this against the source. Entered as TASK-216-QA3-1 and carried (route 2b).

---

## Implementation Verification

| Step | Status | Notes |
| ---- | ------ | ----- |
| 1. `runCliCase` honours `fixture` | PASS | TASK-216-QA3-1 (LOW) carried |
| 2. `OPTIONAL_CASE_FIELDS` comment | PASS | |
| 3. Docs | PASS | |
| 4. Tests | PASS | 96/96 `cli` tests |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| 1. `fixture.files` present in cwd, scored by exit | PASS | test "a case's fixture.files is written into its cwd…" |
| 2. A case without `fixture` is unchanged | PASS | 96/96 `cli` tests |
| 3. Malformed / escaping / steering / collision declined by name | PASS | decline tests. Loader-prefix completeness is carried as TASK-216-QA3-1 |

---

## Breaking Changes Validation

Unchanged: PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (carried, route 2b).

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12 (record `task.216.qa.3.security.run.json`; `reproduced` 0, `escaped` 0)
- Boundary: `boundary: true`, the same 13 cases ([cases](./task.216.qa.3.security.cases.json)).

### Performance — PASS
### Reliability — PASS
### Maintainability — PASS
The bundled copies match their sources (bundle check). `npm run validate` passes for `finalise`, `qa-story`, `qa-task` and `review-security`.

---

## Code Review

**Correctness bugs (1):**
- [low/high] `shared/resources/finalise-dod-security-prompt.md:235`: the wildcard claim does not match the exact-match list. Entered as TASK-216-QA3-1.

**Cleanups (1):**
- `shared/resources/tests/security-probe.test.mjs:4043`: only `LD_PRELOAD` has a decline row. This is folded into TASK-216-QA3-1's suggested action.

---

## Regression Testing

Fast gate on `596d262d`: 6201 tests, 0 fail.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No HIGH or MEDIUM. One LOW, carried by the cosmetic-residue exit.
**Quality Score**: 95/100
**Deployment Recommendation**: READY
**Next Steps**: 5c PR conformance review.
