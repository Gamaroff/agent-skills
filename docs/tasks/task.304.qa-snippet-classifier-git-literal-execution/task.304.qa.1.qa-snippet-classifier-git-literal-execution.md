# QA Report: Task 304 - QA snippet classifier refuses git literal execution

**Task**: [Link to task document](./task.304.qa-snippet-classifier-git-literal-execution.md)
**Gate File**: [task.304.gate.1.qa-snippet-classifier-git-literal-execution.yml](./task.304.gate.1.qa-snippet-classifier-git-literal-execution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-11
**Testing Completed**: 2026-11-11
**Gate Status**: FAIL

---

## Executive Summary

The change refuses every listed git literal-execution form, and the docs scan, differential, tests and bundle are clean. The new refusal can still be bypassed by three spellings that bash treats the same way and the classifier does not see: a wholly quoted option word, a quoted `export` operand, and a `GIT_` variable filled by `read` or `printf -v` and exported by name. Each writes a file under real bash.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All four implementation phases ticked
- [x] Tests passing
- [x] Breaking changes: none
- [x] Code on feature branch with open PR (#876)

### Testing Approach

- [x] Automated Testing (397 tests in the engine suite; `npm run ci:fast` 8376 pass by the developer)
- [x] Security Review (probe engine, 42 cases)
- [x] Code Review (Explore reviewer, then QA reproduction)
- [x] Regression Testing (docs scan)

### Review Methodology

Direct tools plus one read-only Explore code reviewer (standard mode). Step 4b: the one changed prose file, `shared/resources/qa-runnable-prose-detection.md`, holds 2 bash blocks (1 runnable, 1 mutating), none of them touched by the change, so no changed block executed and no finding.

Diff review: code review. The reviewer read a 372-line patch of the six non-bundled changed files; the seven bundled copies of the engine are generated from the source and are held by `npm run bundle:check` (0 problems).

CI on a32ecec7bca8: pending.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Calibrate the forms and the cost | PASS | Verified | The task records which forms write under bash and which do not. |
| Phase 2: Refuse the forms | CONCERNS | Partial | The listed unquoted forms are refused. Three quoted or indirect spellings are not. |
| Phase 3: Make the instrument see the class | CONCERNS | Partial | The `git` atom set has no quoted or `read` / `printf -v` atoms, so it did not find the bypasses (CR-4). |
| Phase 4: Measure, document, bundle | PASS | Verified | Docs scan 3466 blocks, newly runnable 0, newly refused 0. |

**Overall Phase Completion**: 2/4 clean, 2 with findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| Listed git forms classify mutating, each shown to write under bash | all | all 26 listed hostile spellings refused | PASS | probe record, 36 of 42 passed |
| Control table of safe git blocks stays runnable | all | 10 of 10 | PASS | includes `-c` after the subcommand and `--exclude` / `--encoding` on `log` |
| Differential writes nothing on the `git` set, old engine writes | 0 / >0 | 0 / 10 of 600 | PASS | but the set is blind to the three spellings below |
| Docs scan newly runnable 0 | 0 | 0 | PASS | 3466 blocks |
| Docs scan time within +10% | <=+10% | 406 ms vs 428 ms | PASS | five runs, load 3.3 |
| Every refusal mutation-proven | yes | developer-run | dev-only | not re-run this cycle; no fix was applied by QA |
| Spelling-independent refusal (the task's stated purpose) | refuse by form | quoted and indirect spellings bypass it | FAIL | T304-QA-1, -2, -3 |

CHANGELOG cites `(task 304)`; criteria drift: clean.

---

## Breaking Changes Validation

None documented, none expected. Blocks using the refused forms now classify `mutating`.

---

## Issues Found

### HIGH Severity Issues (3)

**T304-QA-1 — a wholly quoted option word is read as empty**
- **Severity**: HIGH
- **Observation**: `unquoteToken` removes the masked-quote placeholder, so `'--upload-pack=touch W'` becomes the empty string and the `ls-remote` check skips it. `git ls-remote '--upload-pack=touch W' .` and `git ls-remote "--exec=touch W" .` classify `runnable` and write `W` under real bash. The unquoted control (`--upload-pack='touch W'`) is refused.
- **Provenance**: same output on the develop engine, but the task names this class, so it is the task's unfinished work, not a pre-existing defect.
- **Recommendation**: restore the quoted text before matching.

**T304-QA-2 — a quoted `export` operand is read as empty**
- **Observation**: `export 'GIT_SSH_COMMAND=touch W'; git ls-remote ssh://x/y` and the double-quoted spelling classify `runnable` and write `W`. The unquoted export is refused (control).
- **Recommendation**: the same unmasking repair as T304-QA-1.

**T304-QA-3 — a `GIT_` variable filled by another builtin, then exported by name**
- **Observation**: `read GIT_SSH_COMMAND <<< 'touch W'; export GIT_SSH_COMMAND; git ls-remote ssh://x/y` and `printf -v GIT_SSH_COMMAND 'touch W'; export GIT_SSH_COMMAND; …` classify `runnable` and write `W`. Without the `export` nothing is written (control), which is why the refusal belongs on the export and on the fill target.
- **Recommendation**: refuse `export`, `declare`, `typeset`, `readonly` and `local` of any bare `GIT_` name, and a `GIT_` name as the target of `read`, `printf -v` and `mapfile`.

### MEDIUM / LOW

- **CR-4 (medium, advisory, folded into the recommendations):** the differential `git` atom set holds no quoted, `read`, `printf -v` or export-without-assignment atoms, so 600 blocks found 0 writes while these spellings write. Extend the set with the fix.
- **CR-5 (low cleanup, future):** `--exec-path` is in `GIT_FLAGS_WITH_OPERAND`, so `git --exec-path -c k=v status` has its `-c` skipped as an operand. Not exploitable: git exits at a bare `--exec-path`, and the fail-closed layer refuses it.

**Total Issues**: HIGH: 3, MEDIUM: 0 (one advisory), LOW: 0 (one cleanup)

---

## NFR Assessment

### Performance — PASS
Docs scan 406 ms against 428 ms on develop.

### Reliability — PASS
Fails closed on the listed forms.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 42 (run record: `task.304.qa.1.qa-snippet-classifier-git-literal-execution.security.run.json`, `escaped` 0)
- The classifier is a boundary: a false `runnable` means QA executes the block. 36 probes passed. 6 hostile spellings were classified runnable (reproduced); controls 10 of 10 accepted.

### Maintainability — PASS
One function pair beside the existing allow-list layer.

---

## Code Review

Reviewer: Explore subagent, read-only, over the 372-line patch of the six non-bundled files; about 130 spellings probed. Dispatch 2026-11-11T04:41:53Z; the completion notice reported a duration of 90973 ms. Boundary: true (the classifier), probed with `isRunnableBlock` through `security-probe.mjs` and a cases file.

**Correctness bugs (3):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:2575` — quoted option word read as empty (T304-QA-1)
- [high/high] `shared/resources/qa-execute-snippets.mjs:2617` — quoted export operand read as empty (T304-QA-2)
- [high/high] `shared/resources/qa-execute-snippets.mjs:2617` — `GIT_` variable filled by `read` / `printf -v`, exported by name (T304-QA-3)
- [medium/medium] `shared/resources/qa-execute-snippets.mjs:2594` — enumeration risk in the differential, advisory (CR-4)

**Cleanups (1):**
- `shared/resources/qa-execute-snippets.mjs:2519` — `--exec-path` operand skip precedes the `-c` test (CR-5)

All three bugs were reproduced by QA under real bash, with a control (the unquoted spelling, or the same block without `export`) that behaves as described, and on the develop engine. The reviewer's confidence is recorded unchanged.

mutation-proven: not run this cycle — QA applied no fix, and the developer's four proofs (each refusal disabled turned the bash table red) are `dev-only` until the fix cycle re-proves them.

boundary_signals: `["refused","are refused"]`; `boundary: true`.

---

## Regression Testing

- `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`: 397 pass, 0 fail, also under `TMPDIR=/tmp`.
- `npm run validate` over the seven bundled skills: all ok.
- Docs scan: runnable 251 before and after.

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `scripts/qa-snippets-differential.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs
TMPDIR=/tmp CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --cases-file task.304.qa.1.security.cases.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T304-QA-1, -2 and -3 in `shared/resources/qa-execute-snippets.mjs`, with a test row for each spelling that writes under bash first.
2. Extend the differential `git` atom set so the random run can form these spellings (CR-4).

### Short-term Actions (Non-Blocking)
1. CR-5: test `-c` and `--config-env` before the operand skip.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: three reproduced, high-confidence bypasses of a safety boundary, each in the class the task exists to close.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.304.qa.1.qa-snippet-classifier-git-literal-execution.md`
**Gate File**: co-located at `task.304.gate.1.qa-snippet-classifier-git-literal-execution.yml`
**Next Steps**: `/qa-fix` the three findings, then re-review (cycle 2 is a full refute pass).
