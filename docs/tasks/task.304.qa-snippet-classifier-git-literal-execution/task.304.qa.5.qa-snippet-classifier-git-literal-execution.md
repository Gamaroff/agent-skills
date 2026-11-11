# QA Report: Task 304 - QA snippet classifier refuses git literal execution

**Task**: [Link to task document](./task.304.qa-snippet-classifier-git-literal-execution.md)
**Gate File**: [task.304.gate.5.qa-snippet-classifier-git-literal-execution.yml](./task.304.gate.5.qa-snippet-classifier-git-literal-execution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-11
**Gate Status**: FAIL (70/100)

---

## Executive Summary

The cycle 4 finding (T304-QA-9, an unlisted global flag hiding the subcommand) is fixed: an unknown git global flag before the subcommand is now refused, and switching that refusal off turns 3 tests red. The safety re-probe found a hole of a different kind in the same boundary. The scan reads the git subcommand twice, once on the raw words and once on the unquoted words, and a quote or backslash inside the spelling of an operand-taking flag makes them disagree.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

This is the fifth gate, the last in the budget. The loop ends here and the finding goes to a human.

---

## Re-Review Context

| Previous finding | Status |
| --- | --- |
| T304-QA-9: an unlisted global flag that takes an operand (`--attr-source`) hides the subcommand | ✅ FIXED. `git --attr-source log -c ...` and the invented-flag form are refused as an unknown git global flag. Both rows write under bash, so the refusal is correct. Controls stay runnable. |

Re-review scope: unscoped (prior gate failed on security). Whole `origin/develop...HEAD` diff of the engine, the safety re-probe applied.

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:2536` — gitSubcommand and gitArgsHazard (line 2634) find the subcommand independently, and a quote or backslash inside an operand-taking global flag hides the flag from the first and not the second (T304-QA-10).
  Admitted as `git:log`, run by bash as `fetch --upload-pack`:
  - `git --names"pace" log fetch --upload-pack='touch M' .`
  - `git --"namespace" status fetch --upload-pack='touch M' .`
  - `git --work-"tree" log fetch --upload-pack='touch M' .`

  Reproduced by QA under bash with a planted marker. Control: the bare `--namespace log fetch ...` is refused. `git log -1` stays runnable. The same inputs are runnable on `origin/develop`, but the task names this defect class (git literal execution through quoted forms) in scope, so it stays in `top_issues[]` and is not routed to `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: refusals for -c / --config-env / GIT_ / ls-remote | PASS | Verified | |
| Phase 2: quote, brace, name-assembly and flag forms | CONCERNS | Verified | T304-QA-10 open |
| Phase 3: tests, differential, docs scan | PASS | Verified | |
| Phase 4: docs and bundles | PASS | Verified | |

**Overall Phase Completion**: 4/4 phases verified, one with an open finding.

## Success Criteria Verification

Criteria unchanged (criteria_drift: clean). The refusal criteria hold for every listed form. They do not hold for the quoted-flag spelling above, which is the open finding.

## Breaking Changes Validation

None. Not applicable.

## Issues Found

### HIGH Severity Issues (1)

**Issue: T304-QA-10, two parses of one git command line**
- **Severity**: HIGH
- **Category**: Security
- **Observation**: see New Findings. Reproduced by execution.
- **Impact**: a block documented as read-only can run a literal command under the QA harness.
- **Recommendation**: parse the git words once and feed one result to the allow-list and to the hazards; refuse when the two disagree.
- **Priority**: P0

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Docs scan: 3470 blocks, runnable 251 before and after, newly refused 0. Differential `git` set on the LAN server: 0 writes in 20000, but its atoms do not include a quoted flag spelling, which is why it did not see this.

### Reliability — PASS
Fails closed on the forms the task lists plus brace, quote, read/printf, name-assembly forms and unknown global flags.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 69 (run record `task.304.qa.5.qa-snippet-classifier-git-literal-execution.security.run.json`, escaped 0)
- 66 behaved as required. 3 hostile cases with a quoted operand-taking global flag classified runnable and write under real bash. All cycle 4 cases pass.

### Maintainability — CONCERNS
Fifth consecutive gate with a HIGH on the same file. Convergence readings 3, 2, 2, 1, 1.

---

## Code Review

Reviewer: Explore subagent, read-only, safety re-probe, about 230 inputs through `classifyBlock` only. Route: code review. Boundary: true (the classifier), probed through `security-probe.mjs` with `isRunnableBlock`.

**Correctness bugs (2, one root cause):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:2544` — a quote or backslash inside an operand-taking flag hides it from gitSubcommand but not from gitArgsHazard (CR-1). Promoted to T304-QA-10.
- [high/high] `shared/resources/qa-execute-snippets.mjs:2540` — the same mismatch in more spellings, `-\C`, `--super-"prefix"`, `--"namespace"`, `--work-"tree"` (CR-2). QA reproduced `--names"pace"`, `--"namespace"` and `--work-"tree"` writing under bash; `-\C` and `--super-"prefix"` classify runnable but write nothing (git errors on the operand), so they are recorded as the same defect class with no measured write. Merged into T304-QA-10.

**Cleanups (0).** Low-confidence note: `git ls-remote ext::sh ...` classifies runnable; real git refuses `ext::` by default, so it runs nothing unless config enables it. Recorded in `recommendations.future`.

mutation-proven: the cycle 4 fix (unknown-flag refusal switched off with `false &&`) → `qa-execute-snippets.test.mjs` 3 tests red → covered

Provenance (5b): the T304-QA-10 inputs behave the same on `origin/develop`; kept in the gate because the task names this class in scope.

---

## Regression Testing

Engine tests 404 pass. Remote fast gate on the LAN server after the cycle 4 fix: 8383 pass, 0 fail. CI `test` is red on this head and on develop (pre-existing, run 42959047359).

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `scripts/qa-snippets-differential.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/qa-execute-snippets.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --cases-file task.304.qa.5.security.cases.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Parse the git command line once (T304-QA-10). The gate budget is spent: a human decides whether to extend it or accept the residual.

### Short-term Actions (Non-Blocking)
1. Add a quoted-flag atom to the differential's `git` set.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH, reproduced by execution, in the same file for the fifth gate.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.304.qa.5.qa-snippet-classifier-git-literal-execution.md`
**Gate File**: co-located at `task.304.gate.5.qa-snippet-classifier-git-literal-execution.yml`
**Next Steps**: human decision on the exhausted budget.
