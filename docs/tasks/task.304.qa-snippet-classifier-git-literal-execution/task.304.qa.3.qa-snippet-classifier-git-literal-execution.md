# QA Report: Task 304 - QA snippet classifier refuses git literal execution

**Task**: [Link to task document](./task.304.qa-snippet-classifier-git-literal-execution.md)
**Gate File**: [task.304.gate.3.qa-snippet-classifier-git-literal-execution.yml](./task.304.gate.3.qa-snippet-classifier-git-literal-execution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-11
**Testing Completed**: 2026-11-11
**Gate Status**: FAIL

---

## Executive Summary

The cycle 2 findings are fixed and no longer reproduce. This cycle was a safety re-probe (the prior gate failed on security) and found the same class one step away: the `GIT_` name is judged as text, so an exported name that bash assembles from braces, empty quotes or a backslash classifies `runnable` and writes a file under real bash.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All four implementation phases ticked
- [x] Tests passing (400 in the engine suite, also under `TMPDIR=/tmp`)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR (#876)

### Testing Approach

- [x] Automated Testing
- [x] Security Review (probe engine, 57 cases)
- [x] Code Review (Explore reviewer, then QA reproduction)
- [x] Regression Testing

### Review Methodology

Direct tools plus one read-only Explore code reviewer. The prior gate failed on security, so the safety re-probe directive was appended and the diff was the whole branch (not narrowed to the cycle 2 fix). Re-review scope: unscoped (prior gate failed on security).

Diff review: code review. The reviewer read a 551-line patch of the five non-bundled changed files. The seven bundled copies of the engine are generated and held by `npm run bundle:check`.

Reviewer timing: dispatched at 2026-11-11T05:51:56Z against a 12 minute budget; the completion notice reported a duration of 60665 ms.

CI on ad5d8660eaaa: pending at the time of review (not a precondition; gated once at `/finalise`).

Step 4b: the change set touches `shared/resources/qa-runnable-prose-detection.md` (a prose paragraph, no new fenced block) and no `SKILL.md`. Not applicable.

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| T304-QA-4 brace hides `--upload-pack` / `--exec` | ✅ FIXED | six brace spellings refused; bash-verified rows; mutation (brace rule off) turns 4 tests red |
| T304-QA-5 brace hides `--config-env` | ✅ FIXED | `--config-e{nv,nv}` and `{,}` forms refused |
| T304-QA-6 `--exec-path=<dir>` | ✅ FIXED | refused; planted `git-upload-pack` row; mutation turns 1 test red |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:2658` — brace expansion hides the `GIT_` name in an export operand (T304-QA-7)
- **[high]** `shared/resources/qa-execute-snippets.mjs:2688` — a `GIT_` name split by quotes or a backslash is not matched (T304-QA-8)
- **[low, advisory]** `shared/resources/qa-execute-snippets.mjs:2621` — the brace scan runs over the joined argument list (CR-3)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Calibrate the forms and the cost | PASS | Verified | |
| Phase 2: Refuse the forms | CONCERNS | Partial | git arguments are judged as shell words now; the `GIT_` name is still judged as text |
| Phase 3: Make the instrument see the class | CONCERNS | Partial | the differential `git` set has brace atoms for options, none for names |
| Phase 4: Measure, document, bundle | PASS | Verified | docs scan 3468 blocks, runnable 251 before and after, newly refused 0 |

**Overall Phase Completion**: 2/4 clean, 2 with findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| Listed git forms classify mutating, each shown to write under bash | all | all, plus quoted, brace and indirect spellings | PASS | |
| Control table stays runnable | all | all | PASS | |
| Differential writes nothing on the `git` set | 0 | 0 of 20000 | PASS | blind to name-assembly spellings (see findings) |
| Docs scan newly runnable 0 | 0 | 0 | PASS | |
| Every refusal mutation-proven | yes | brace rule and `--exec-path` re-run by QA | PASS | |
| Spelling-independent refusal (the task's stated purpose) | refuse by form | name assembled by the shell bypasses | FAIL | T304-QA-7, -8 |

CHANGELOG cites `(task 304)`; criteria drift: clean.

---

## Breaking Changes Validation

None documented, none expected.

---

## Issues Found

### HIGH Severity Issues (2)

**T304-QA-7 — brace expansion hides the exported `GIT_` name**
- **Severity**: HIGH
- **Observation**: `export GIT_{SSH_COMMAND,X}='touch W'; git ls-remote ssh://h/x` and the `G{IT_...}` form classify `runnable`; bash writes W.
- **Control**: the unbraced export is refused; `export FOO=1; git log -1` stays runnable.
- **Provenance**: the develop engine classifies the same input runnable; the task names `GIT_` environment forms, so it is the task's unfinished work.
- **Recommendation**: judge the assignment site, not the name text (see gate).

**T304-QA-8 — quote or backslash split `GIT_` name**
- **Severity**: HIGH
- **Observation**: `export GI''T_SSH_COMMAND=...`, `export GI""T_...` and `export GIT\_SSH_COMMAND=...` classify `runnable`; bash writes W.
- **Recommendation**: the same refusal.

**Total Issues**: HIGH: 2, MEDIUM: 0, LOW: 0 (two advisory)

### LOW (advisory)

- **CR-3:** the brace scan is joined across all arguments; a false refusal was not confirmed. Scan per word.
- **CR-4 (carried):** a `GIT_` substring in harmless text is refused. Accepted fail-closed cost.

---

## NFR Assessment

### Performance — PASS
Docs scan unchanged: 3468 blocks, runnable 251 before and after.

### Reliability — PASS
Fails closed on every form the task lists plus brace, quote and read/printf forms.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 57 (run record `task.304.qa.3.qa-snippet-classifier-git-literal-execution.security.run.json`, `escaped` 0)
- 52 behaved as required; 5 hostile `GIT_`-name spellings were classified runnable and write under real bash. All cycle 2 cases pass.

### Maintainability — CONCERNS
Third consecutive gate with a HIGH on the same file and the same kind of mechanism (matching the text of a shell word).

---

## Code Review

Reviewer: Explore subagent, read-only, safety re-probe plus refute, about 60 probes under bash. Boundary: true (the classifier), probed with `isRunnableBlock` through `security-probe.mjs`. Anchors: the reviewer's line numbers were against a working copy and are re-checked below.

**Correctness bugs (2):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:2658` — brace expansion hides the `GIT_` name (T304-QA-7)
- [high/high] `shared/resources/qa-execute-snippets.mjs:2688` — quote or backslash split `GIT_` name (T304-QA-8)

**Cleanups (1):**
- `shared/resources/qa-execute-snippets.mjs:2621` — brace scan joined across all arguments (CR-3, low)

Reproduction (12 forms, bash vs new engine vs develop engine): the 5 hostile forms wrote under bash and classified `runnable` on both engines; the 3 refused forms (`declare -x` with a brace name, a bare brace prefix, `set -a` with a quote-split bare assignment) were refused by earlier layers; controls (`export GIT_SSH_COMMAND=...` unbraced refused, `export FOO=1; git log -1` and `git log -1` runnable) behaved as required.

mutation-proven: brace rule off → 4 tests red (brace rows and the bash pair test) → covered
mutation-proven: `--exec-path=<dir>` rule off → the `--exec-path=<dir> with ls-remote` row red → covered

boundary_signals: `["refused","are refused"]`; `boundary: true`.

---

## Regression Testing

- `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`: 400 pass, 0 fail, also under `TMPDIR=/tmp`.
- Remote fast gate (developer, cycle 2 fix): 8379 pass, 0 fail.
- Docs scan: runnable 251 before and after, newly refused 0.

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `scripts/qa-snippets-differential.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs
TMPDIR=/tmp CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --cases-file task.304.qa.3.security.cases.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Judge the assignment site, not the name text: in a block that runs git, refuse an assignment-making command's operand whose name is not a plain literal identifier, and refuse allexport. Add name-assembly atoms to the differential and bash-verified rows.

### Short-term Actions (Non-Blocking)
1. Scan for braces per word (CR-3).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced high-confidence bypasses of a safety boundary, in the class the task exists to close.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.304.qa.3.qa-snippet-classifier-git-literal-execution.md`
**Gate File**: co-located at `task.304.gate.3.qa-snippet-classifier-git-literal-execution.yml`
**Next Steps**: `/qa-fix` the two findings with a structural change; this is the third strike on the file, so the fix must replace the mechanism or waive, not patch it again.
