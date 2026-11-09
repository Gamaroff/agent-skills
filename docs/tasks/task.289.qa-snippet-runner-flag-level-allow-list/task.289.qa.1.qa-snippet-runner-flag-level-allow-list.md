# QA Report: Task 289 - QA snippet runner allows flags, not just commands

**Task**: [Link to task document](./task.289.qa-snippet-runner-flag-level-allow-list.md)
**Gate File**: [task.289.gate.1.qa-snippet-runner-flag-level-allow-list.yml](./task.289.gate.1.qa-snippet-runner-flag-level-allow-list.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: FAIL

---

## Executive Summary

The change replaces the flag-level deny-list with a per-command flag and operand table. It closes the seven known gaps and the extras, and its tests pass. The diff review found two inputs the table still lets through, and QA reproduced both by execution: a sed label followed by a command, and an ANSI-C quoted flag.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] Implementation phases 1 to 4 ticked; Phase 5 (optional) left out
- [x] Tests passing (252 of 252 in the engine file; `CI=true npm run ci:fast` exit 0)
- [x] Breaking changes documented
- [x] Code on the feature branch with an open PR (#864)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review. Adaptive strategy: security classifier, so the boundary rule was applied and the probe engine run.

Diff review: code review (the change set holds code). Reviewer dispatched and returned in the same session (about four minutes by its completion notice: 234574 ms).

CI on 74de549f: not read (qa-ci-read.sh not run this cycle; recorded as undecided, no gate entry).

Step 4b: ran the snippet engine over `qa-runnable-prose-detection.md` and `probe-boundary-rule.md`: 0 changed blocks in either, no findings.

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:1388` — a sed label ends at whitespace in GNU sed, not at `;` or a newline, so `sed ':a e echo PWNED' f` classifies runnable and runs `e` → parse the label as a whitespace-terminated word and require a separator after it.
- **[high]** `shared/resources/qa-execute-snippets.mjs:1191` — `shellWord` does not decode `$'...'`, so `sort $'-o' out in` has no leading dash and classifies runnable while bash writes `out` → treat `$'` and `$"` as quoting.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce and decide | PASS | Verified | Gap table and controls committed; owner decision recorded |
| Phase 2: The flag table | CONCERNS | Verified | `SAFE_FLAGS` complete; spelling bypass T289-CR-2 |
| Phase 3: Operators and expansions | CONCERNS | Verified | sed label bypass T289-CR-1; `DENY_PATTERNS` kept beside the table (logged deviation) |
| Phase 4: Real docs and prose | PASS | Verified | One block newly refused; prose, bundle, CHANGELOG done |
| Phase 5 (optional) | Not done | n/a | Left out by the developer; noted in the PR |

**Overall Phase Completion**: 4 of 5 (Phase 5 optional)

---

## Success Criteria Verification

- Seven gaps `mutating` with controls `runnable`: verified by the gap table tests (cited in the test file, task.289 section).
- Flag outside a table entry refused with `flag-not-allowed`: verified; both findings above are inputs where the flag is not seen as a flag.
- Criteria still open: `CI=true npm test` wall-time comparison and `CI=true npm run ci` were not run by the developer; the criterion text sits unticked in the task document.
- Criteria drift: clean (reviewed blob).
- CHANGELOG citation: `cites (task 289)`.

---

## Breaking Changes Validation

A block using a flag outside its command's table entry is no longer run. Documented in the PR and CHANGELOG. PASS.

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: sed label followed by a command (T289-CR-1)**
- **Severity**: HIGH
- **Category**: Security
- **Observation**: `sed ':a e echo PWNED' f` → classifier `runnable`; running it printed `PWNED`. Control `sed ':a;N;$!ba;s/\n/ /g' f` stays runnable.
- **Impact**: a documented block can execute an arbitrary command through the QA runner.
- **Recommendation**: see gate.

**Issue: ANSI-C quoted flag (T289-CR-2)**
- **Severity**: HIGH
- **Category**: Security
- **Observation**: `sort $'-o' out in` → classifier `runnable`; running it created `out`. Control `sort -u in` stays runnable.
- **Impact**: a flag spelled `$'-o'` bypasses every table entry.
- **Recommendation**: see gate.

**Total Issues**: HIGH: 2, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Developer-measured parity (460–487 ms against 472–499 ms); QA did not re-measure.

### Reliability — PASS
Fail-closed on every unknown shape the table models.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31
- Shell-exec corpus: 31 executed, 0 reproduced, 0 overblocked, 0 escaped (command: `security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock'`). The two failures above lie outside that corpus; both were reproduced by execution.

### Maintainability — PASS
Table beside the command list, with an audit test.

---

## Code Review

**Correctness bugs (2):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:1388` — sed label skipped to `;` or newline, GNU ends it at whitespace → parse the label as a word (promoted to the gate as T289-CR-1; reproduced by QA with a passing control, origin: code-review, reproduced by QA)
- [high/high] `shared/resources/qa-execute-snippets.mjs:1191` — `$'...'` not decoded → treat as quoting (promoted as T289-CR-2; reproduced by QA with a passing control)

**Cleanups (0):** none.

Boundary: `boundary: true`; `boundary_signals: ['refused', 'refuses']`; `probes_executed: 31`; `escaped: 0`.

Provenance (5b): both inputs are in the task's own scope (flag-spelling bypasses of the runner's flag judgement), so they stay in `top_issues[]` whatever the base does.

mutation-proven: disabled the `<>` refusal → `task.289 gap: the <> redirection opens a file read-write is refused as mutating` → covered
mutation-proven: made the generic flag loop return null → 11 task.289 tests red (gap rows for sort, uniq, file, diff, tail, date, abbreviation, expansions, probes, table audit) → covered

Two of the developer's 15 proofs were re-run by QA; the other 13 are the developer's own record (`dev-only` here, in the implementation report's Decisions Log). `git status --porcelain` was unchanged after each restore (`cmp` against the snapshot printed nothing).

---

## Regression Testing

Engine test file 252 of 252; `CI=true npm run ci:fast` exit 0 (developer run on the same tree before the PR); `npm run validate` passes for the seven skills with changed `references/`.

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true command node --test --test-name-pattern='task.289' shared/resources/tests/qa-execute-snippets.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --json
npm run -s validate -- skills/<changed skill>/
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T289-CR-1 and T289-CR-2 with failing-first rows and controls.

### Short-term Actions (Non-Blocking)
1. Measure `CI=true npm test` wall time and run the full `npm run ci` before finalise.
2. File Phase 5 (`ctx-wrap-` leak) as its own task.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced bypasses of the new safety table.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Next Steps**: `/qa-fix` the two findings, then re-review (cycle 2 is a full refute pass).
