# QA Report: Task 180 - security-probe: a fence: entry form for a fenced bash block in a step doc

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Gate File**: [task.180.gate.5.probe-engine-fence-entry-form.yml](./task.180.gate.5.probe-engine-fence-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Testing Completed**: 2026-10-12
**Gate Status**: FAIL

---

## Executive Summary

QA cycle 5, the one granted cycle, reviews qa-fix cycle 4 (`f21c0552`). All three cycle-4 findings are fixed and mutation-proven. The safety re-probe over the whole branch found a new HIGH in a different mechanism of the same file: the `fence:` form skips the pre-spawn `gh` text check, so a block that resolves `gh` to a path runs the host binary and the run is scored. It also found a MEDIUM: a substituted `$(…)` that writes outside the sandbox is unseen, contrary to a sentence this branch added.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-180-012: an exit-only hostile `expected` passes for a refusal | high | FIXED | `statesRefusalOutput` decline in `runFenceCase`; new test over five exit-only or blank shapes; QA mutations Q1 (whitespace counts as output) and Q2 (empty string counts) each red |
| TASK-180-013: work-dir watch misses deletions and empty directories | medium | FIXED | `workDirStamps` plus a two-way compare; trip-wire deletion test; QA mutations Q3 (deletions unseen) and Q4 (directories unseen after) each red |
| TASK-180-014: Success Criterion 1 restates the old rule | low | FIXED | SC1 now cites `scoreFenceRun` |

Bugs 6 and 7 → Closed.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`ci:fast` 5404 / 5390 pass / 0 fail at `f21c0552`, run in 5b)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#637, OPEN)

### Review Methodology

Direct tools plus one read-only Explore code reviewer. Reviewer dispatched 2026-10-12T15:50:20Z, `duration_ms` 273164.

Re-review scope: unscoped (prior gate: HIGH on a boundary, `SAFETY_REPROBE` clause 2). Clause 1 (`qa-safety-clause1.sh`) read `false`. Whole `origin/develop...HEAD` diff, 63 files, with the SAFETY RE-PROBE directive. Mutation proofs ran in a scratch worktree while the reviewer read the main tree.

Step 4b: run over the five changed in-scope docs (`qa-task` and `qa-story` `SKILL.md`, `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`). 0 findings. The runnable blocks ran; the rest were refused as placeholder or mutating by design.

---

## New Findings This Cycle

- **[HIGH]** `shared/resources/security-probe.mjs:1199`: `fence:` skips the `namesGh` pre-spawn check. A block that resolves `gh` to a path (`type -ap gh`) ran the host `gh` and was scored, where shell forms decline `needs-fake-gh` (TASK-180-015, bug 8). → Run the `gh` text check over the extracted block text.
- **[MEDIUM]** `shared/resources/security-probe.mjs:2481`: an injected `$(touch <abs>/pwned)` outside the sandbox is unseen. Verdict `engages`, 0 escapes (TASK-180-016, bug 9). → State the limit, or let a case name an outside path to check.
- **[LOW]** `shared/resources/security-probe.mjs:1214`: `replaceAll` rewrites every occurrence of a short slot, guard code included (CR-3, advisory, `recommendations.future`).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | 29 `fence entry` tests, 2 new this cycle |
| Phase 2: The entry form | CONCERNS | Partial | TASK-180-015, -016 |
| Phase 3: Routing and proof | PASS | Verified | task.167 proof: `engages`, 0 reproduced, 0 escapes |

**Overall Phase Completion**: 3/3 phases implemented; Phase 2 carries two open findings.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC1 `fence:` probes a block, scored per `scoreFenceRun` | CONCERNS | Tests hold the scoring order; TASK-180-015 lets a path-resolved `gh` run and be scored |
| SC2 missing heading/block → `entry-not-probeable` | PASS | committed tests |
| SC3 `fixture` env/files; outside path declined | PASS | committed tests |
| SC4 task.167's 13 cases: `engages`, 0 reproduced; flagless copy over-blocks 4 | PASS | committed tests; `qa.5.security.run.json` |
| SC5 four existing entry forms unchanged | PASS | `ci:fast` green |
| Performance: no new `timeout:` literal | PASS | `test-harness-concurrency` in `ci:fast` |

---

## Breaking Changes Validation

None. The new rule for hostile `expected` applies only to the new `fence:` form.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: fence: skips the pre-spawn gh text check**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.180.bug.8.fence-skips-gh-text-detector.md](./task.180.bug.8.fence-skips-gh-text-detector.md)
- **Observation**: reproduced on `f21c0552`: the host `gh --version` ran inside a probe run with no `--fake-gh`, and the run was scored.
- **Impact**: a probe can run the real `gh` with host credentials. Measured plausibility: 0 shipped docs resolve `gh` to a path. The severity is kept as the reviewer returned it, not re-rated.
- **Recommendation**: apply `GH_COMMAND_WORD` / `GH_VARIABLE` to the extracted block.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: outside writes under source substitution are unseen**
- **Severity**: MEDIUM
- **Category**: Security / documentation accuracy
- **Bug Report**: [task.180.bug.9.outside-write-unseen-under-source-substitution.md](./task.180.bug.9.outside-write-unseen-under-source-substitution.md)
- **Observation**: `'$(touch <abs>/pwned)'` created the file; verdict `engages`, 0 escapes.
- **Recommendation**: state the limit or watch a named outside path.
- **Priority**: P2

### LOW Severity Issues (1)

- CR-3: a short slot rewrites guard code silently (advisory).

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
`ci:fast` green. `workDirStamps` walks only the work dir, once before and once after each case per shell.

### Reliability — PASS
The cycle-4 fixes hold under 4 QA mutations.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 26 (`task.180.qa.5.security.run.json` `totals.executed`)
- Both controls engage with 0 reproduced. TASK-180-015 and -016 are open.

### Maintainability — PASS
The hostile-`expected` rule is stated once in the engine; the docs cite it.

---

## Code Review

boundary: true (the `fence:` admission and scoring path, and the shipped fast-gate precondition it probes). probes_executed: 26.

**Correctness bugs (3):**
- [high/high] `shared/resources/security-probe.mjs:1199`: `fence:` skips the `gh` text check; a path-resolved `gh` runs the host binary. Promoted to TASK-180-015.
- [medium/high] `shared/resources/security-probe.mjs:2481`: an outside absolute-path write under substitution is unseen. Promoted to TASK-180-016.
- [low/low] `shared/resources/security-probe.mjs:1214`: a short slot rewrites guard code. Advisory.

**Cleanups (0).**

Provenance: TASK-180-015 and -016 are new to this branch: `fence:` does not exist on `origin/develop`, and the §5 sentence was added here.

mutation-proven: whitespace-only output admitted as a refusal → TASK-180-012 test → covered
mutation-proven: empty string admitted as a refusal → TASK-180-012 test → covered
mutation-proven: deletions not compared → TASK-180-013 test → covered
mutation-proven: after-snapshot without directories → TASK-180-013 test → covered

---

## Regression Testing

`ci:fast` 5404 tests, 0 fail. Both security-probe controls engage. The four existing entry forms are unchanged.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast   # in 5b, .agents/skills moved aside, at f21c0552
npm run bundle:check
npm run lint:shell
npm run validate -- skills/qa-task/   # also qa-story, review-security, finalise
node shared/resources/qa-execute-snippets.mjs --file <each changed doc> --json
node shared/resources/security-probe.mjs --sink filename --entry 'fence:shared/resources/develop-pipeline-step-3-develop-loop.md#Precondition — the gate must resolve before the first iteration' --slot '<fastGateCommand>' --cases-file shared/resources/tests/fixtures/fence-probe/t167-cases.json --record task.180.qa.5.security.run.json --json
node shared/resources/security-probe.mjs --sink path --entry 'shared/resources/security-probe.mjs#resolveEntry' --cases-file task.180.qa.1.security.cases.json --record task.180.qa.5.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-180-015: apply the `gh` text check to the extracted block.
2. TASK-180-016: state the outside-write limit, or watch a named path.

### Short-term Actions (Non-Blocking)
1. CR-3: surface a slot that occurs more than once.
2. `GIT_CEILING_DIRECTORIES` in `caseEnv` (carried).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH (TASK-180-015). The cycle-4 fixes themselves hold.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.180.qa.5.probe-engine-fence-entry-form.md`
**Gate File**: co-located at `task.180.gate.5.probe-engine-fence-entry-form.yml`
**Next Steps**: the QA budget (`qa_max_cycles` 5) is spent; the develop-task loop escalates.
