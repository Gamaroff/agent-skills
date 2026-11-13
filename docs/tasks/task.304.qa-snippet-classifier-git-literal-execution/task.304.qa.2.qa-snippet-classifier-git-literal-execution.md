# QA Report: Task 304 - QA snippet classifier refuses git literal execution

**Task**: [Link to task document](./task.304.qa-snippet-classifier-git-literal-execution.md)
**Gate File**: [task.304.gate.2.qa-snippet-classifier-git-literal-execution.yml](./task.304.gate.2.qa-snippet-classifier-git-literal-execution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-11
**Testing Completed**: 2026-11-11
**Gate Status**: FAIL

---

## Executive Summary

The three cycle 1 bypasses are fixed and no longer reproduce. This cycle was a refute pass with a safety re-probe, and it found the same class in a new spelling: bash brace expansion rebuilds `--upload-pack`, `--exec` and `--config-env` after the classifier has read the text. Six brace spellings classify `runnable` and write a file under real bash.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All four implementation phases ticked
- [x] Tests passing (398 in the engine suite, also under `TMPDIR=/tmp`)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR (#876)

### Testing Approach

- [x] Automated Testing
- [x] Security Review (probe engine, 51 cases)
- [x] Code Review (Explore refute reviewer, then QA reproduction)
- [x] Regression Testing

### Review Methodology

Direct tools plus one read-only Explore code reviewer. Cycle 2 is a refute pass (`REFUTE_PASS`) and the prior gate failed on security, so the safety re-probe directive was appended too. Re-review scope: unscoped (prior gate failed on security).

Diff review: code review. The reviewer read a 447-line patch of the five non-bundled changed files. The seven bundled copies of the engine are generated and held by `npm run bundle:check`.

Reviewer timing: set-up clock read 2026-11-11T05:04:37Z before dispatch; the completion notice reported a duration of 1559860 ms (about 26 minutes, past the 12 minute budget set on the lock; it returned, so no kill or inline fallback applied).

CI on ea72576dfd31: green.

Step 4b: the change set touches `shared/resources/qa-runnable-prose-detection.md` (a prose paragraph, no new fenced block) and no `SKILL.md`; the cycle 2 delta is the engine, its test, the differential and bundled copies. Not applicable to the delta.

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| T304-QA-1 quoted option word read as empty | ✅ FIXED | `git ls-remote '--upload-pack=...' .` and the double-quoted `--exec` form classify mutating; five committed rows prove it under bash |
| T304-QA-2 quoted `export` operand | ✅ FIXED | quoted export rows refused |
| T304-QA-3 `GIT_` filled by `read` / `printf -v`, exported by name | ✅ FIXED | read, printf -v, printf -vNAME, set -a rows refused |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:2609` — brace expansion hides `--upload-pack` / `--exec` (T304-QA-4)
- **[high]** `shared/resources/qa-execute-snippets.mjs:2580` — brace expansion hides `--config-env` (T304-QA-5)
- **[medium]** `shared/resources/qa-execute-snippets.mjs:2562` — `--exec-path` runs a planted `git-upload-pack` under `ls-remote`, contradicting the code comment (T304-QA-6)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Calibrate the forms and the cost | PASS | Verified | |
| Phase 2: Refuse the forms | CONCERNS | Partial | Listed, quoted and read/printf forms refused; brace-rewritten options are not |
| Phase 3: Make the instrument see the class | CONCERNS | Partial | The differential `git` set has no brace atom, so 20000 blocks found 0 writes while brace spellings write |
| Phase 4: Measure, document, bundle | PASS | Verified | Docs scan 3467 blocks, runnable 251 before and after, newly refused 0 |

**Overall Phase Completion**: 2/4 clean, 2 with findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| Listed git forms classify mutating, each shown to write under bash | all | all, plus quoted and indirect spellings | PASS | |
| Control table stays runnable | all | all | PASS | |
| Differential writes nothing on the `git` set | 0 | 0 of 20000 | PASS | blind to brace spellings (see findings) |
| Docs scan newly runnable 0 | 0 | 0 | PASS | 3467 blocks, newly refused 0 |
| Every refusal mutation-proven | yes | 2 of 3 re-run by QA this cycle | PASS | the nested flag-operand check is untested |
| Spelling-independent refusal (the task's stated purpose) | refuse by form | brace-rewritten options bypass | FAIL | T304-QA-4, -5, -6 |

CHANGELOG cites `(task 304)`; criteria drift: clean.

---

## Breaking Changes Validation

None documented, none expected. Blocks using the refused forms now classify `mutating`.

---

## Issues Found

### HIGH Severity Issues (2)

**T304-QA-4 — brace expansion hides the `ls-remote` option**
- **Severity**: HIGH
- **Observation**: `git ls-remote --upload-pa{ck,ck}='touch W' .` classifies `runnable`; bash expands it to `--upload-pack=touch W` and writes W. Also `--{upload-pack,upload-pack}=`, `--upload-pack{,}=` and `--exe{c,c}=`.
- **Control**: the unbraced spelling is refused; `git log --format={%h,%s} -1` writes nothing and stays runnable.
- **Provenance**: the develop engine also classifies all of them runnable; the task names this class, so it is unfinished task work, not a pre-existing defect.
- **Recommendation**: refuse any git argument that holds an unquoted brace, rather than another spelling.

**T304-QA-5 — brace expansion hides `--config-env`**
- **Severity**: HIGH
- **Observation**: `X='touch W' git --config-e{nv,nv}=core.sshCommand=X ls-remote ssh://h/x` and the `{,}` form classify `runnable` and write W. The `X=` prefix is not a `GIT_` name, so the name rule does not see it.
- **Recommendation**: the same refusal.

### MEDIUM Severity Issues (1)

**T304-QA-6 — `--exec-path` runs a planted `git-upload-pack` under `ls-remote`**
- **Observation**: with an executable `git-upload-pack` in the named directory, `git --exec-path=$PWD ls-remote .` classifies `runnable` and bash runs it. The code comment says `--exec-path` runs nothing for the safe subcommands; that measurement was taken without `ls-remote` and is wrong. The block cannot create the file itself, so exposure is low.
- **Recommendation**: refuse a non-empty `--exec-path` value, correct the comment, add a bash-verified row.

### LOW (advisory)

- **CR-4 (cleanup):** a `GIT_` substring in quoted or argument text is now refused (`git log --grep="GIT_SSH"`, a URL containing it). Fail-closed, and the docs scan shows 0 newly refused. Accept as the documented cost.
- **Untested guard:** removing the nested `-c` / `--config-env` check on a flag operand turns no test red (`no-red-untested`). Add a test or drop the check.

**Total Issues**: HIGH: 2, MEDIUM: 1, LOW: 0 (two advisory)

---

## NFR Assessment

### Performance — PASS
Docs scan unchanged: 3467 blocks, runnable 251 before and after.

### Reliability — PASS
Fails closed on the listed, quoted and indirect-fill forms.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 51 (run record: `task.304.qa.2.qa-snippet-classifier-git-literal-execution.security.run.json`, `escaped` 0)
- The classifier is a boundary: a false `runnable` means QA executes the block. 45 probes passed; 6 hostile brace spellings were classified runnable (reproduced). The cycle 1 cases and the three new controls pass.

### Maintainability — CONCERNS
Two consecutive cycles found a HIGH in one literal-text matcher over a shell word. A third spelling-level patch is unlikely to end it.

---

## Code Review

Reviewer: Explore subagent, read-only, refute pass plus safety re-probe, about 100 blocks probed under bash. Boundary: true (the classifier), probed with `isRunnableBlock` through `security-probe.mjs`. All findings' anchors verified (`anchor_check: ok`).

**Correctness bugs (3):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:2609` — brace expansion hides `--upload-pack` / `--exec` (T304-QA-4)
- [high/high] `shared/resources/qa-execute-snippets.mjs:2580` — brace expansion hides `--config-env` (T304-QA-5)
- [low/medium] `shared/resources/qa-execute-snippets.mjs:2562` — `--exec-path` comment is false for `ls-remote` (T304-QA-6, QA reproduced it, so it gates at any confidence under 5d)

**Cleanups (1):**
- `shared/resources/qa-execute-snippets.mjs:2654` — a `GIT_` substring in harmless text is now refused (accepted cost)

Reproduction (7 forms, bash vs classifier vs develop engine): all seven wrote under bash and classified `runnable` on both engines; the unbraced control classified `mutating`; two read-only controls stayed `runnable` and wrote nothing.

mutation-proven: nested flag-operand `-c` check removed → no test red → no-red-untested
mutation-proven: arguments read from the collapsed scan instead of the raw reading → quoted option rows and the differential went red → covered
mutation-proven: GIT_ name rule disabled → read / printf / set -a rows and the differential went red → covered

boundary_signals: `["refused","are refused"]`; `boundary: true`.

---

## Regression Testing

- `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`: 398 pass, 0 fail, also under `TMPDIR=/tmp`.
- Remote fast gate (developer, cycle 1 fix): 8377 pass, 0 fail.
- Docs scan: runnable 251 before and after, newly refused 0.

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `scripts/qa-snippets-differential.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs
TMPDIR=/tmp CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --cases-file task.304.qa.2.security.cases.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T304-QA-4, -5 and -6 by changing the shape: refuse any git argument whose text the shell can still rewrite (an unquoted brace), instead of listing spellings. Add a bash-verified row for each, and brace atoms to the differential `git` set.

### Short-term Actions (Non-Blocking)
1. Add a test for the nested flag-operand check or drop it.
2. Accept or narrow the `GIT_` substring false refusal.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced high-confidence bypasses of a safety boundary, in the class the task exists to close.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.304.qa.2.qa-snippet-classifier-git-literal-execution.md`
**Gate File**: co-located at `task.304.gate.2.qa-snippet-classifier-git-literal-execution.yml`
**Next Steps**: `/qa-fix` the three findings with a structural change, then re-review (cycle 3, scoped to files changed since this gate).
