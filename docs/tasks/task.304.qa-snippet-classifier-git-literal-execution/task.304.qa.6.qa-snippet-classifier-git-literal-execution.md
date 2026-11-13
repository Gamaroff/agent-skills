# QA Report: Task 304 - QA snippet classifier refuses git literal execution

**Task**: [Link to task document](./task.304.qa-snippet-classifier-git-literal-execution.md)
**Gate File**: [task.304.gate.6.qa-snippet-classifier-git-literal-execution.yml](./task.304.gate.6.qa-snippet-classifier-git-literal-execution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-11
**Gate Status**: FAIL (70/100)

---

## Executive Summary

The cycle 5 finding (T304-QA-10, two readers naming different subcommands) is fixed: a git line whose readings disagree is refused, and switching that check off turns the quoted `--namespace` row red. The safety re-probe found one more way into the same boundary. The scan splits a command line on whitespace before either reader sees it, so a backslash-escaped space inside a flag's operand becomes two tokens for both readers and one word for bash.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

This is the sixth gate. The owner extended the budget once after the fifth. A human decides what comes next.

---

## Re-Review Context

| Previous finding | Status |
| --- | --- |
| T304-QA-10: a quote inside an operand-taking global flag made two readers name different subcommands | ✅ FIXED. The three quoted forms are refused with the disagreement reason. Controls stay runnable. |

Re-review scope: unscoped (prior gate failed on security). Whole `origin/develop...HEAD` diff of the engine, the safety re-probe applied.

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:2669` — the line is split on whitespace before either reader runs, so `a\ log` is two tokens for the readers and one word for bash (T304-QA-11).
  `git --namespace a\ log fetch --upload-pack=./hook.sh .` is admitted as `git:log`, and bash runs `fetch --upload-pack`. Reproduced by QA under bash with a planted hook. Controls: `git --namespace 'a b' log -1` and `git log -1` behave. The same input is runnable on `origin/develop`; the task names git literal execution through quoting in scope, so it stays in `top_issues[]`.
- **[medium, carried]** PAGER: not a GIT_ name, pre-existing, routed to `recommendations.future` as in gate 4.
- **[low, carried]** `git ls-remote ext::...` classifies runnable; real git refuses it by default.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: refusals for -c / --config-env / GIT_ / ls-remote | PASS | Verified | |
| Phase 2: quote, brace, name-assembly, flag and reader-agreement forms | CONCERNS | Verified | T304-QA-11 open |
| Phase 3: tests, differential, docs scan | PASS | Verified | |
| Phase 4: docs and bundles | PASS | Verified | |

**Overall Phase Completion**: 4/4 phases verified, one with an open finding.

## Success Criteria Verification

Criteria unchanged (criteria_drift: clean). The refusal criteria hold for every listed form except the escaped-space operand above.

## Breaking Changes Validation

None. Not applicable.

## Issues Found

### HIGH Severity Issues (1)

**Issue: T304-QA-11, the line is split before it is read**
- **Severity**: HIGH
- **Category**: Security
- **Observation**: see New Findings. Reproduced by execution.
- **Impact**: a block documented as read-only can run a literal command under the QA harness.
- **Recommendation**: stop reading flag operands. Refuse any git line with an operand-taking global flag before the subcommand, except `-C` with one plain word.
- **Priority**: P0

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Docs scan: 3471 blocks, runnable 251 before and after, newly refused 0. Differential `git` set on the LAN server: 0 writes in 20000; its atoms have no escaped-space operand, which is why it did not see this.

### Reliability — PASS
Fails closed on the forms the task lists plus brace, quote, name-assembly, unknown-flag and reader-disagreement forms.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 72 (run record `task.304.qa.6.qa-snippet-classifier-git-literal-execution.security.run.json`, escaped 0)
- 70 behaved as required. 2 hostile cases with an escaped-space operand classified runnable; one writes under real bash, the other errors in git first. All cycle 5 cases pass.

### Maintainability — CONCERNS
Sixth consecutive gate with a HIGH on the same file. Convergence readings 3, 2, 2, 1, 1, 1.

---

## Code Review

Reviewer: Explore subagent, read-only, safety re-probe, about 150 inputs through `classifyBlock` only. Route: code review. Boundary: true (the classifier), probed through `security-probe.mjs` with `isRunnableBlock`.

**Correctness bugs (3):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:2669` — escaped space in an operand: both readers agree on the wrong subcommand. Promoted to T304-QA-11.
- [medium/high] `shared/resources/qa-execute-snippets.mjs:2778` — PAGER. Pre-existing, not a GIT_ name; routed to `recommendations.future`.
- [low/medium] `shared/resources/qa-execute-snippets.mjs:2693` — `ext::` remote helper on ls-remote; default-blocked by git.

**Cleanups (0).**

mutation-proven: the cycle 5 fix (reader-agreement check switched off with `false &&`) → `qa-execute-snippets.test.mjs` quoted `--namespace` row red → covered

Provenance (5b): the T304-QA-11 inputs behave the same on `origin/develop`; kept in the gate because the task names this class in scope.

---

## Regression Testing

Engine tests 404 pass. Remote fast gate on the LAN server after the cycle 5 fix: 8383 pass, 0 fail. CI `test` is red on this head and on develop (pre-existing, run 42959047359).

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `scripts/qa-snippets-differential.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/qa-execute-snippets.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --cases-file task.304.qa.6.security.cases.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Refuse operand-taking global flags before the subcommand (except `-C <plain word>`) instead of reading their operand (T304-QA-11). A human decides whether to continue.

### Short-term Actions (Non-Blocking)
1. Add an escaped-space operand atom to the differential's `git` set.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH, reproduced by execution, in the same file for the sixth gate.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.304.qa.6.qa-snippet-classifier-git-literal-execution.md`
**Gate File**: co-located at `task.304.gate.6.qa-snippet-classifier-git-literal-execution.yml`
**Next Steps**: human decision.
