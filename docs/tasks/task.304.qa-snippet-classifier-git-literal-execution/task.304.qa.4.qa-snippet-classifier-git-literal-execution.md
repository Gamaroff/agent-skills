# QA Report: Task 304 - QA snippet classifier refuses git literal execution

**Task**: [Link to task document](./task.304.qa-snippet-classifier-git-literal-execution.md)
**Gate File**: [task.304.gate.4.qa-snippet-classifier-git-literal-execution.yml](./task.304.gate.4.qa-snippet-classifier-git-literal-execution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-11
**Testing Completed**: 2026-11-11
**Gate Status**: FAIL

---

## Executive Summary

The cycle 3 findings are fixed and no longer reproduce. This cycle was a safety re-probe (the prior gate failed on security) and found a different hole in the same boundary: git global flags that take a separate operand are a closed list, and an unlisted one hides the real subcommand from the scan, so `-c` and `ls-remote --upload-pack` behind it classify `runnable` and write a file under real bash.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All four implementation phases ticked
- [x] Tests passing (403 in the engine suite, remote fast gate 8382 pass)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR (#876)

### Testing Approach

- [x] Automated Testing
- [x] Security Review (probe engine, 63 cases)
- [x] Code Review (Explore reviewer, then QA reproduction)
- [x] Regression Testing

### Review Methodology

Direct tools plus one read-only Explore code reviewer. The prior gate failed on security, so the safety re-probe directive was appended and the diff was the whole branch (not narrowed to the cycle 3 fix). Re-review scope: unscoped (prior gate failed on security).

Diff review: code review. The reviewer read a 642-line patch of the five non-bundled changed files. The seven bundled copies of the engine are generated and held by `npm run bundle:check`.

Reviewer timing: dispatched at about 2026-11-11T06:40Z against a 12 minute budget; the completion notice reported a duration of 114415 ms.

CI on f13b57a8d32c: 1 failed (1 pre-existing). The `test` check is red on `develop` too (run 42959047359), so it is routed to `recommendations.future`, not `top_issues[]`.

Heavy runs went to the LAN server (the laptop was overheating): the differential `git` set ran there, 0 writes in 20000. The probe engine and the one mutation proof ran locally (short).

Step 4b: the change set touches `shared/resources/qa-runnable-prose-detection.md` (a prose paragraph, no new fenced block) and no `SKILL.md`. Not applicable.

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| T304-QA-7 brace hides the exported `GIT_` name | FIXED | five spellings refused, bash-verified rows; control `export FOO=1; git log -1` stays runnable |
| T304-QA-8 quote or backslash split `GIT_` name | FIXED | same rule; empty single and double quotes and a backslash all refused |
| CR-3 brace scan joined across words | FIXED | per-word scan, joined only across a trailing backslash; test with a mutation proof |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:2641` — an unlisted git global flag that takes an operand hides the subcommand (T304-QA-9)
- **[low, pre-existing]** `shared/resources/qa-execute-snippets.mjs:2740` — `PAGER` is run by git under a terminal (CR-2, routed to `recommendations.future`)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Calibrate the forms and the cost | PASS | Verified | |
| Phase 2: Refuse the forms | CONCERNS | Partial | the subcommand scan relies on a closed list of operand-taking global flags |
| Phase 3: Make the instrument see the class | PASS | Verified | the differential `git` set now has name-assembly atoms |
| Phase 4: Measure, document, bundle | PASS | Verified | docs scan 3469 blocks, runnable 251 before and after, newly refused 0 |

**Overall Phase Completion**: 3/4 clean, 1 with findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| Listed git forms classify mutating, each shown to write under bash | all | all, plus quoted, brace, name-assembly and indirect spellings | PASS | |
| Control table stays runnable | all | all | PASS | |
| Differential writes nothing on the `git` set | 0 | 0 of 20000 (LAN server) | PASS | blind to unlisted global flags (see findings) |
| Docs scan newly runnable 0 | 0 | 0 | PASS | |
| Every refusal mutation-proven | yes | name rule re-run by QA | PASS | name rule off turns one test red |
| Spelling-independent refusal (the task's stated purpose) | refuse by form | an unlisted global flag bypasses | FAIL | T304-QA-9 |

CHANGELOG cites `(task 304)`; criteria drift: clean.

---

## Breaking Changes Validation

None documented, none expected.

---

## Issues Found

### HIGH Severity Issues (1)

**T304-QA-9 — unlisted git global flag hides the subcommand**
- **Severity**: HIGH
- **Observation**: `git --attr-source log -c core.sshCommand='touch M' ls-remote ssh://x/y` and `git --attr-source log ls-remote --upload-pack='touch M' .` classify `runnable` (the develop engine too); bash writes M under git 2.56. `--attr-source` takes a separate operand and is not in `GIT_FLAGS_WITH_OPERAND`, so the scan reads `log` as the subcommand.
- **Control**: `git log -1` stays runnable; the benign `git --attr-source HEAD log -1` is refused by an earlier layer.
- **Provenance**: identical on the develop engine; the task names the global `-c` refusal, so a bypass of it is the task's unfinished work.
- **Recommendation**: invert the list (see gate). Do not add one more spelling: git adds global flags over time.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0 (two advisory, routed to future)

### LOW (advisory, pre-existing)

- **CR-2:** `PAGER` is run by `git --paginate log` when stdout is a terminal (reproduced with script(1), not under a pipe). Same on develop, and PAGER is not a `GIT_` name, so outside the task as written.
- **CR-4 (carried):** a `GIT_` substring in harmless text is refused. Accepted fail-closed cost.

---

## NFR Assessment

### Performance — PASS
Docs scan unchanged: 3469 blocks, runnable 251 before and after.

### Reliability — PASS
Fails closed on every form the task lists plus brace, quote, read/printf and name-assembly forms.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 63 (run record `task.304.qa.4.qa-snippet-classifier-git-literal-execution.security.run.json`, `escaped` 0)
- 60 behaved as required; 3 hostile cases hiding the subcommand behind an unlisted global flag were classified runnable (2 write under real bash; the third is an invented flag, the same hole).

### Maintainability — CONCERNS
Fourth consecutive gate with a HIGH on the same file. Readings are 3, 2, 2, 1: the loop converges, but the closed list of flags is the same kind of enumeration the earlier cycles removed.

---

## Code Review

Reviewer: Explore subagent, read-only, safety re-probe, about 330 probes. Boundary: true (the classifier), probed with `isRunnableBlock` through `security-probe.mjs`.

**Correctness bugs (2):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:2641` — operand table lacks `--attr-source` (T304-QA-9, reproduced by QA)
- [low/medium] `shared/resources/qa-execute-snippets.mjs:2740` — `PAGER` (CR-2, reproduced under a pty, pre-existing)

**Cleanups (0).**

mutation-proven: exported-name rule off (`if (false && nameWhy !== null)`) → the task.304 table test went red (1 fail of 11 task.304 tests) → covered

boundary_signals: `["refused","are refused"]`; `boundary: true`.

---

## Regression Testing

- `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`: 403 pass, 0 fail (developer, cycle 3).
- Remote fast gate (developer, cycle 3 fix): 8382 pass, 0 fail.
- Docs scan: runnable 251 before and after, newly refused 0.
- Differential `git` set on the LAN server: 0 writes in 20000.

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `scripts/qa-snippets-differential.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
CI=true node --test --test-name-pattern='task.304' shared/resources/tests/qa-execute-snippets.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --cases-file task.304.qa.4.security.cases.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Replace the enumerated operand-flag list with a fail-closed allow-list of global flags before the subcommand. Add bash-verified rows, a differential atom and a mutation proof.

### Short-term Actions (Non-Blocking)
1. Decide whether a follow-up task should refuse string-executing variables (`PAGER`, `LESSOPEN`, `EDITOR`) beside git.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one reproduced high-confidence bypass of a safety boundary, in the class the task exists to close.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.304.qa.4.qa-snippet-classifier-git-literal-execution.md`
**Gate File**: co-located at `task.304.gate.4.qa-snippet-classifier-git-literal-execution.yml`
**Next Steps**: `/qa-fix` the one finding with a structural change (invert the flag list). The file has had a HIGH four gates in a row, so the fix must replace the mechanism or waive.
