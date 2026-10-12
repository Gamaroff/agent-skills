# QA Report: Task 180 - security-probe fence: entry form (cycle 4)

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Gate File**: [task.180.gate.4.probe-engine-fence-entry-form.yml](./task.180.gate.4.probe-engine-fence-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Testing Completed**: 2026-10-12
**Gate Status**: FAIL

---

## Executive Summary

This cycle re-reviews qa-fix cycle 3 (`1a31af72`). That cycle was the third-strike **replace**: it deleted the stderr classifier, added a `<shell> -n` parse check, made `expected` required on hostile `fence:` cases, normalised the collision check and added a work-dir write watch. The cycle-3 fixes hold. The unscoped safety re-probe then reproduced a false `engages` one level down: the required `expected` accepts an exit code alone, and a shell that stopped or an injected `exit` produces exactly that.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-180-009 — the stderr classifier read non-fatal errors after the guard as "never answered" | HIGH | FIXED (mechanism replaced) | `shellDiagnostic` deleted. The word-split `cd` regression test reproduces `f.split`/`f.nodir`. Mutation M3 (parse check removed) and M1 (decline removed) are `covered` |
| TASK-180-010 — the collision decline compared raw paths | MEDIUM | FIXED | `./pwned`, `b/../pwned` and `PWNED` are declined. Mutation M4 is `covered` |
| TASK-180-011 — writes beside the case directory were not observed | LOW | PARTIAL | A file write is recorded (M5 `covered`). Deletions and empty directories are not; see TASK-180-013 |

---

## Testing Scope

### Review Methodology

Direct tools. The diff review was one read-only Explore subagent, dispatched 15:13:37Z, with a `duration_ms` of 213610 (about 3.6 min).

Re-review scope: unscoped (prior gate's HIGH concerns a classifier — safety re-probe, clause 2). Full `origin/develop...HEAD` diff, 52 files, 8679 patch lines, reviewed at the `shared/resources` sources.

Step 4b ran over the 6 changed in-scope docs:

| File | runnable | placeholder | mutating | findings |
| --- | --- | --- | --- | --- |
| `skills/qa-task/SKILL.md` | 1 | 3 | 17 | 0 |
| `skills/qa-story/SKILL.md` | 1 | 4 | 15 | 0 |
| `shared/resources/finalise-dod-security-prompt.md` | 0 | 0 | 1 | 0 |
| `shared/resources/probe-boundary-rule.md` | 0 | 0 | 1 | 0 |
| `shared/resources/security-review-prompt.md` | 0 | 0 | 1 | 0 |
| `skills/review-security/SKILL.md` | 0 | 0 | 1 | 0 |

The four files with only a mutating block emit `no-executable-blocks` (information, not a finding). zsh was not run (`zsh-unavailable`).

---

## New Findings This Cycle

- **[HIGH]** `shared/resources/security-probe.mjs:2342`: the hostile `expected` requirement accepts `{exit: 1}` alone. `${x:?boom}` and `"; exit 1; "` match it, so an accept-all block reads `engages` (TASK-180-012, bug 6). → Require a non-empty stdout or stderr. Decline exit-only cases.
- **[MEDIUM]** `shared/resources/security-probe.mjs:2442`: the work-dir watch misses a deletion (the gh trip-wire removed) and an empty directory (TASK-180-013, bug 7). → Compare both ways and include directories.
- **[LOW]** task doc Success Criterion 1 still states the exit-status rule for every case (TASK-180-014). → Cite `scoreFenceRun`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | 28 `fence entry` tests |
| Phase 2: The entry form | CONCERNS | Partial | TASK-180-012, -013 |
| Phase 3: Routing and proof | PASS | Verified | 7-site population re-measured; docs cite `scoreFenceRun` |

**Overall Phase Completion**: 2/3 phases passed

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| fence: probes a block; exit-status scoring | CONCERNS | Holds for legitimate cases only (TASK-180-014). The hostile path is now compared against `expected` (TASK-180-012) |
| Missing heading/block → named decline | PASS | extraction tests |
| fixture env/files; escaping path declined | PASS | fixture test |
| task.167 13 cases → engages, 0 reproduced; flagless copy over-blocks 4 | PASS | tests and engine run (`qa.4.security.run.json`) |
| Existing four entry forms unchanged | PASS | `ci:fast` 0 fail |
| No new `timeout:` literal | PASS | `parseCheck` uses `timeoutMs`; harness-concurrency test green |
| Mutations red | PASS | 4 QA spot-check mutations `covered` |
| `ci:fast`, `bundle:check`, `lint:shell`, `validate` ×4, catalog unchanged | PASS | all clean this cycle |
| § 7 population names `fence:` | PASS | routing parity test |
| CHANGELOG cites task 180 | PASS | updated for the cycle-3 rule |

---

## Breaking Changes Validation

The cycle-3 rule declines a hostile `fence:` case with no `expected`. The form is new on this branch, and its only shipped fixture (task.167) carries `expected`. No consumer outside this branch is affected. **Assessment**: PASS.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: an exit-only `expected` passes for a refusal**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.180.bug.6.exit-only-expected-passes-for-refusal.md](./task.180.bug.6.exit-only-expected-passes-for-refusal.md)
- **Observation**: Against an accept-all block, hostile `${x:?boom}` and `"; exit 1; "`, each with `expected: {exit: 1}`, score `rejected`, and the verdict is `engages`
- **Impact**: A false `engages`, the same class as -001, -005 and -009
- **Recommendation**: Require a non-empty stdout or stderr in a hostile case's `expected`
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: the work-dir watch misses deletions and directories**
- **Bug Report**: [task.180.bug.7.work-dir-watch-misses-deletes-and-dirs.md](./task.180.bug.7.work-dir-watch-misses-deletes-and-dirs.md)
- **Observation**: An input that runs `rm -f ../.probe-harness/bin/gh; mkdir ../pwned-dir` gives `escapes: []`
- **Recommendation**: Compare both ways, and include directory entries

### LOW Severity Issues (1)

- TASK-180-014: Success Criterion 1 restates the old rule.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
`ci:fast`: 5402 tests, 5388 pass, 0 fail. `parseCheck` adds one `-n` spawn per case per shell, under `spawnBudget`.

### Reliability — PASS
The cycle-3 fixes are mutation-covered.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 26
- Both controls `engages`, 0 reproduced (`task.180.qa.4.security.run.json`). CONCERNS for TASK-180-012 and -013.

### Maintainability — PASS
The scoring order is stated once, in `scoreFenceRun`.

---

## Code Review

Correctness bugs (3):

- [high/high] `shared/resources/security-probe.mjs:2342`: an exit-only `expected` passes for a refusal. Promoted to TASK-180-012.
- [medium/medium] `shared/resources/security-probe.mjs:2442`: the work-dir watch misses deletions and directories. Confirmed by QA and entered as TASK-180-013.
- [medium/low] `shared/resources/security-probe.mjs:2402`: platform-variance. There is no `GIT_CEILING_DIRECTORIES`, so git in a case can find a repository above a `TMPDIR` that sits inside a work tree. **Provenance: pre-existing.** `caseEnv` on `origin/develop` sets none for the shell arm either, so this goes to `recommendations.future`.

Cleanups (0).

Mutation spot check, run after the reviewer returned and restored from `cp` snapshots; `git status` was unchanged:

- mutation-proven: hostile-without-expected decline removed → "a hostile case with no `expected` is declined" → covered
- mutation-proven: parse check disabled → "a substitution that breaks the block's syntax is errored by the parse check" → covered
- mutation-proven: raw collision compare → "an expected.absent name the case's own fixture writes is declined" → covered
- mutation-proven: work-dir watch disabled → "a write beside the case directory … is an escape" → covered

Boundary: **true**. Both probes were re-run this cycle: the shipped fast-gate precondition via `fence:` (13 cases, `engages`) and `resolveEntry`'s fence: branch (13, `engages`). `probes_executed: 26`, from the record's `totals.executed`.

---

## Regression Testing

`ci:fast` (symlink moved aside): 0 fail. `bundle:check` 0 problems. `lint:shell` clean. `validate` passes for qa-task, qa-story, review-security and finalise. The catalog is unchanged.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
npm run bundle:check
npm run lint:shell
npm run validate -- skills/{qa-task,qa-story,review-security,finalise}/
npm run generate-catalog
node shared/resources/qa-execute-snippets.mjs --file <each changed doc> --json
node shared/resources/security-probe.mjs --sink filename --entry 'fence:shared/resources/develop-pipeline-step-3-develop-loop.md#Precondition — the gate must resolve before the first iteration' --slot '<fastGateCommand>' --cases-file shared/resources/tests/fixtures/fence-probe/t167-cases.json --record task.180.qa.4.security.run.json --json
node shared/resources/security-probe.mjs --sink path --entry 'shared/resources/security-probe.mjs#resolveEntry' --cases-file task.180.qa.1.security.cases.json --record task.180.qa.4.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-180-012: a hostile `fence:` case's `expected` must carry a non-empty stdout or stderr.

### Short-term Actions (Non-Blocking)
1. TASK-180-013: compare the watch both ways.
2. TASK-180-014: cite the rule in Success Criterion 1.
3. CR-3 (future): set `GIT_CEILING_DIRECTORIES` in `caseEnv`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH (rule 1). The `fence:` scoring path has now had a HIGH in four consecutive cycles: 1, 1, 1, 1.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.180.qa.4.probe-engine-fence-entry-form.md`
**Gate File**: co-located at `task.180.gate.4.probe-engine-fence-entry-form.yml`
**Next Steps**: qa-fix cycle 4 on TASK-180-012..014, or the pipeline's convergence escalation
