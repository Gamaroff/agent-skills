# QA Report: Task 304 - QA snippet classifier refuses git literal execution

**Task**: [Link to task document](./task.304.qa-snippet-classifier-git-literal-execution.md)
**Gate File**: [task.304.gate.7.qa-snippet-classifier-git-literal-execution.yml](./task.304.gate.7.qa-snippet-classifier-git-literal-execution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-11
**Gate Status**: PASS (95/100)

---

## Executive Summary

The cycle 6 finding (T304-QA-11, an escaped space splitting one word into two tokens) is fixed by deleting the construct, not by teaching the scan another spelling. The scan no longer reads git global-flag operands: only `-C` with one plain word is kept, every other operand-taking flag is refused, and every flag token ahead of the subcommand must be plain text. The safety re-probe found nothing: the reviewer tried about 250 inputs and QA ran 78 probes, none of which run a literal string or write a file.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Status |
| --- | --- |
| T304-QA-11: an escaped space in a flag operand splits one word into two tokens, and both readers agree on the wrong subcommand | ✅ FIXED. `git --namespace a\ log fetch --upload-pack=./hook.sh .` (a write under bash) and the `--namespace=a\ log` form are refused. Controls stay runnable. |

Re-review scope: unscoped (prior gate failed on security). Whole `origin/develop...HEAD` diff of the engine, the safety re-probe applied.

## New Findings This Cycle

None. Searched unscoped (prior gate: security FAIL): the full `origin/develop...HEAD` diff of `shared/resources/qa-execute-snippets.mjs`. Re-enumerated the git boundary's inputs: the character classes `GIT_PLAIN_WORD` and `GIT_PLAIN_FLAG` admit, repeated and combined flags, every `--flag=value` form, the options of each allow-listed subcommand, and several git invocations on one line. About 250 inputs went through `classifyBlock` and 78 through the probe engine.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: refusals for -c / --config-env / GIT_ / ls-remote | PASS | Verified | |
| Phase 2: quote, brace, name-assembly, flag, reader-agreement and operand forms | PASS | Verified | |
| Phase 3: tests, differential, docs scan | PASS | Verified | |
| Phase 4: docs and bundles | PASS | Verified | |

**Overall Phase Completion**: 4/4 phases passed.

## Success Criteria Verification

Criteria unchanged (criteria_drift: clean). Each refusal criterion holds for every form the task lists and for the forms found across the seven gates.

## Breaking Changes Validation

None. Not applicable. One accepted cost: a git global flag with a separate operand other than `-C <plain word>` is now refused.

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Docs scan: 3472 blocks, runnable 251 before and after, newly refused 0. Differential `git` set on the LAN server with the escaped-space atoms: 0 writes in 20000. Remote fast gate: 8384 pass, 0 fail.

### Reliability — PASS
Fails closed on every form the task lists plus brace, quote, name-assembly, unknown-flag, reader-disagreement and escaped-space forms.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 78 (run record `task.304.qa.7.qa-snippet-classifier-git-literal-execution.security.run.json`, escaped 0)
- 0 hostile cases reproduced, 77 behaved as required, 1 legitimate control (`git --namespace 'a b' log -1`, from cycle 6) is now refused on purpose. That overblock is the accepted cost of not reading operands, not a hole.

### Maintainability — PASS
The fix deletes the operand reading instead of adding another spelling. Convergence readings 3, 2, 2, 1, 1, 1, 0.

---

## Code Review

Reviewer: Explore subagent, read-only, safety re-probe, about 250 inputs through `classifyBlock` only. Route: code review. Boundary: true (the classifier), probed through `security-probe.mjs` with `isRunnableBlock`.

**Correctness bugs (0).** Confirmed only, not findings: PAGER (`PAGER='touch x' git -p log`), pre-existing and not a GIT_ name, routed to `recommendations.future`; repo-controlled config reached through `-C` or `--git-dir=x`, which is not a literal from the snippet and was already true for `-C`.

**Cleanups (0).** Low-confidence note: `git ls-remote ext::sh ...` classifies runnable; real git refuses `ext::` by default, so it runs nothing unless config enables it.

mutation-proven: `-C` plain-word check switched off → `qa-execute-snippets.test.mjs` row `git -C 'a b' log -1` red → covered
mutation-proven: plain-flag check switched off → the `--namespace=a\ log` bash-verified row red → covered
mutation-proven: operand-flag refusal switched off → the `git --namespace x log -1` unit row red → covered
mutation-proven: reader-agreement check (cycle 5) was proven at fix cycle 5 and QA cycle 6; not re-run this cycle → not-run

---

## Regression Testing

Engine tests 405 pass. Remote fast gate on the LAN server after the fix: 8384 pass, 0 fail. CI `test` is red on this head and on develop (pre-existing, run 42959047359).

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `scripts/qa-snippets-differential.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/qa-execute-snippets.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --cases-file task.304.qa.7.security.cases.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Decide whether to refuse a PAGER assignment or `-p`/`--paginate` beside git (outside the task as written).
2. Fix the red `test` CI check on develop (pre-existing).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding; the operand reading that caused seven gates is gone.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.304.qa.7.qa-snippet-classifier-git-literal-execution.md`
**Gate File**: co-located at `task.304.gate.7.qa-snippet-classifier-git-literal-execution.yml`
**Next Steps**: review the PR (5c), then finalise.
