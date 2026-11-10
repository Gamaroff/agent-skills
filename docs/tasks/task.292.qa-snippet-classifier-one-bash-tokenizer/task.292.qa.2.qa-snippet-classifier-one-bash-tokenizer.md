# QA Report: Task 292 - One bash tokenizer for the QA snippet classifier (cycle 2)

**Task**: [Link to task document](./task.292.qa-snippet-classifier-one-bash-tokenizer.md)
**Gate File**: [task.292.gate.2.qa-snippet-classifier-one-bash-tokenizer.yml](./task.292.gate.2.qa-snippet-classifier-one-bash-tokenizer.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Testing Completed**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's fix holds: bug 1 is verified and closed. The cycle 2 refute pass, run as a safety re-probe, found a second write that classifies runnable. `commandInvocations` removes arithmetic with a regex that stops at the first `)`, so a command substitution inside `$(( ))` disappears before the command scan. QA reproduced it by execution; `develop` gives the same verdict. It is HIGH because a write classifies runnable, and it is a regex copy of a bash rule, the thing this task replaces.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (362/362 under `CI=true`)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#869)

### Review Methodology

Whole-branch diff (`origin/develop...HEAD`, 9866 lines, head `aac91b15`), reviewed to refute, plus a safety re-probe because gate 1 failed on security. One read-only Explore reviewer, dispatched 05:31Z, returned within 70 s (`duration_ms` 69185). It probed about 70 inputs against real bash in a scratch directory.

Diff review: code review.
Step 4b: not applicable — no runnable prose in the change set.
CI on aac91b150289: pending (read once, not waited on).

Re-review scope: unscoped (prior gate failed on security).

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| T292-QA-1 (`<<` read as a heredoc in `$[ ]`, `(( ))`, `name[ ]=`) | FIXED | Nine shift rows and controls pass in the suite; arith differential seed 41 (60000 blocks) 0 writes; reviewer found no shift shape runnable. Bug 1 closed. |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:2557` — the arithmetic regex `/\$\(\([^)]*\)\)/g` erases a `$( )` or backtick inside `$(( ))`, so `echo $((1+$(touch W)))` classifies runnable and bash writes → drive removal from the tokenizer or refuse the shape (T292-QA-2, bug 2).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1–4 | PASS | Verified | Unchanged since gate 1 except the cycle 1 fix |

**Overall Phase Completion**: 4/4

## Issues Found

### HIGH Severity Issues (1)

**Issue: arithmetic regex erases a nested command substitution**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.292.bug.2.arithmetic-regex-erases-nested-substitution.md](./task.292.bug.2.arithmetic-regex-erases-nested-substitution.md)
- **Observation**: five shapes classify runnable and bash writes (see the bug report)
- **Impact**: QA could execute a block that writes
- **Recommendation**: tokenizer-driven removal, or refuse a `$((` body holding `$(` or a backtick; add rows, a `+` atom, and a mutation proof
- **Priority**: P0

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Slice test 3.26 s (bound 10 s). Docs scan unchanged in verdicts.

### Reliability — PASS
Unmodelled shapes throw and fail closed.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (`shell-exec` sink, entry `isRunnableBlock`, record `task.292.qa.2.security.run.json`: 31 executed, 0 reproduced, 0 escaped)
- The corpus and the `arith` atom set do not reach the shape: the set has no operator atom, so `$((` is never followed by `+` and a `$(`.

### Maintainability — PASS
The follow-up on the `WORD` and assignment regexes stands; T292-QA-2 is a third regex that parses a bash construct.

---

## Code Review

**Correctness bugs (1):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:2557` — arithmetic regex stops at the first `)`, erasing a nested substitution → tokenizer-driven removal. Promoted to the gate as T292-QA-2 (origin: code-review, reproduced by QA).

Reproduction (scratch directory, real bash): `classifyBlock("echo $((1+$(touch W)))")` is `runnable`; `bash -c` on it creates `W`. Control: `echo $((1))` runnable (correct), `echo $((1+2)); touch W` mutating, `echo $(( (1) + $(touch W) ))` mutating. Provenance: the `develop` engine gives `runnable` for the first two shapes, and no tracked Markdown contains the shape, so it is not new. The task states the class as in scope (replace regex copies of bash rules; the next random probe finds no neighbour), so it stays in `top_issues[]`.

Neighbours probed: backtick form, double-quoted form, unquoted heredoc body and `${x:-$((…))}` (`placeholder`, so not run) classify as the first; `$(( $(echo 1) + 1 ))` and `$((1+$(date)))` are runnable and harmless.

**Cleanups (0):** none.

mutation-proven: not run this cycle (no fix to prove; cycle 1's three proofs stand) → — → not-run

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Engine suite, `CI=true` | PASS 362/362 |
| Differential `arith`, seed 41, 60000 blocks | PASS 0 writes (1662 runnable) |
| Differential all six sets, seed 42, 30000 each | PASS 0 writes |
| Docs scan | PASS 3445 blocks, runnable 257 → 257, 0 newly runnable, 0 newly refused |

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/qa-execute-snippets.test.mjs
command node scripts/qa-snippets-differential.mjs --atoms arith --count 60000 --seed 41
command node scripts/qa-snippets-differential.mjs --atoms all --count 30000 --seed 42
command node scripts/qa-snippets-docscan.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --repo-root "$PWD" --record task.292.qa.2.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T292-QA-2.

### Short-term Actions (Non-Blocking)
1. Sweep for every remaining regex that parses a bash construct (`WORD`, the assignment regex, and any like the one above) in one follow-up task.

## Final Assessment

**Gate Status**: FAIL
**Rationale**: a write classifies runnable (T292-QA-2).
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Next Steps**: qa-fix cycle 2. This is the second HIGH on `qa-execute-snippets.mjs`; a third would trip the third-strike rule, so the fix should sweep the class, not the instance.
