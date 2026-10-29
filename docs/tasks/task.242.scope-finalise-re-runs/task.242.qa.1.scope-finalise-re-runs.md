# QA Report: Task 242 - Scope finalise re-runs

**Task**: [Link to task document](./task.242.scope-finalise-re-runs.md)
**Gate File**: [task.242.gate.1.scope-finalise-re-runs.yml](./task.242.gate.1.scope-finalise-re-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: FAIL

---

## Executive Summary

The engine `finalise-rerun-scope.js` is well tested and its suite passes. Two spot-checked mutation proofs hold. The wiring in `skills/finalise/SKILL.md` is broken: the new Step 3a and Step 3c blocks read `$STEM` and `$DOD_N` without binding them. Every fenced block runs as its own shell, so Step 3c HALTs on every story and task run, and Step 3a can never find a prior record. Three medium defects are also open: two in the merge rules and one in the 7.6b push assertion.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (18/18 boxes ticked)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#781)

The §9 Success Criteria boxes are unticked; they were verified here from evidence, not from the boxes.

### Testing Approach

- [x] Automated Testing (unit, contract)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only code-review subagent (Step 3b). Dispatched 2026-10-29T07:09:54Z; the completion notice reported `duration_ms` 179983.

The review diff was `origin/develop...HEAD`, excluding the generated `skills/*/references/` copies (byte copies of the `shared/resources/` sources, held by `bundle:check`) and the task's own docs.

`CI on d2e9c3eb0c0d: green`

Step 4b ran on `skills/finalise/SKILL.md` and `shared/resources/finalise-dod-ac-prompt.md` (`--diff-base` the merge base, bash and zsh):

- **Changed blocks:** 3 changed, 0 executed, 3 `mutating`. These are line 491 (write-redirection), line 725 (write-redirection) and line 1565 (deny-list: `git push`). Finding `changed-blocks-not-executed`, medium confidence.
- **Whole file:** 42 blocks, 0 runnable, 3 placeholder, 39 mutating (`zero-blocks-executed`, medium).
- **AC prompt:** no bash blocks.

Because the changed blocks never execute, Step 4b could not catch CR-1 or CR-2.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Engine `finalise-rerun-scope.js` | CONCERNS | Verified | CR-3, CR-4 in `merge` |
| Engine tests | PASS | 33/33 | `TMPDIR=/tmp` re-run 33/33 |
| AC prompt Step 0 + schema | PASS | Contract tests green | Step 3 heading byte-identical |
| finalise SKILL.md wiring | FAIL | Contract tests green | CR-1, CR-2 (unbound reads); CR-5 (6b list) |
| Bug-mode row + marker | PASS | `finalise-bug-mode.test.mjs` green | |
| Bundle, CHANGELOG, pipeline docs | PASS | `bundle:check` 0 problems | |

**Overall Phase Completion**: 18/18 boxes ticked. Phases 4 and 5 carry defects.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 full reasons | `finalise-rerun-scope.test.mjs` per-reason tests | PASS |
| SC-2 per-criterion reasons, `#N` ids, text hash | same suite; story and task fixtures | PASS |
| SC-3 task.239 replay | `replay task.239` test; spot-check S2 went red | PASS (engine) |
| SC-4 carried status kept | merge tests | PASS, but CR-4 leaves an omitted re-check member carried |
| SC-5 overall recomputed | merge and computeOverall tests; spot-check S1 went red | PASS |
| SC-6 3a runs scope, 3c runs merge and writes the record | contract test reads the commands | **FAIL**: the blocks cannot run as written (CR-1, CR-2) |
| SC-7 Step 0 before Step 3; heading byte-identical | contract test | PASS |
| SC-8 scope line and advisory list in the 3d template | contract test | PASS |
| SC-9 bug-mode marker | `finalise-bug-mode.test.mjs` | PASS |
| SC-10 performance | not applicable | N/A |
| SC-11 guards mutation-proved | implementation report M1–M28 against a 24-guard list; 2 re-proved here | PASS |
| SC-12 `ci:fast` and `bundle:check` | CI green on `d2e9c3eb`; `bundle:check` 0 problems | PASS |
| SC-13 CHANGELOG | `CHANGELOG.md` [Unreleased] entry | PASS |

---

## Breaking Changes Validation

### Breaking Change: a re-run carries untouched passes

- **Documented**: Yes (CHANGELOG, PR body)
- **Migration path provided**: Yes. The first run is `no-prior-record`; move the newest `*.ac.json` aside to force a full run.
- **Migration tested**: N/A
- **Consumer code updated**: Yes. The bundled copies were regenerated.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (2)

**TASK-242-CR-1: the Step 3c merge block never binds `STEM`/`DOD_N`**

- **Severity**: HIGH. **Category**: Functional.
- **Observation**: `skills/finalise/SKILL.md:726-731` builds `AC_RECORD` from `${STEM}` and `${DOD_N}`, and passes `--dod-n "$DOD_N"`. Both are bound only in Step 0's block and Step 3b.1's own block, which re-binds them at lines 581-582. With `DOD_N` empty, the engine rejects `--dod-n ""` with exit 2 and the block HALTs.
- **Impact**: every story and task `/finalise` run stops at Step 3c.
- **Recommendation**: bind both values at the top of the block with a placeholder guard. Add a test that catches an unbound read.

**TASK-242-CR-2: the Step 3a scope block never binds `STEM`/`DOD_N`**

- **Severity**: HIGH. **Category**: Functional.
- **Observation**: `skills/finalise/SKILL.md:495-497`. The glob becomes `.dod.*.ac.json` and the scope file becomes `finalise-rerun-scope-.json`.
- **Impact**: no prior record is ever found, and every run reports `full (no-prior-record)` at exit 0. The feature is inert, and nothing reports it.
- **Recommendation**: the same binding and guard as CR-1.

### MEDIUM Severity Issues (3)

- **TASK-242-CR-3** (`shared/resources/finalise-rerun-scope.js:487`): a reported-gap recompute can PASS a criterion whose agent FAIL rests on a non-member reason, such as `test_runs_per_pr: false`.
- **TASK-242-CR-4** (`shared/resources/finalise-rerun-scope.js:468`): a re-check member that the agent omits keeps its prior PASS. An omitted criterion becomes FAIL; an omitted member should too.
- **TASK-242-CR-5** (`skills/finalise/SKILL.md:1696`): 7.6b's `ARTIFACTS` list does not include the AC record that 6a stages and the step-7 doc says is asserted.

### LOW Severity Issues (2)

- CR-7 (`skills/finalise/SKILL.md:1618`): on an unparseable run, 6a stages the newest record in the series, which is an earlier run's.
- The §9 Success Criteria checkboxes are unticked.

**Total Issues**: HIGH: 2, MEDIUM: 3, LOW: 2

No bug-report files were created. Every finding is a code-review finding carried in the gate's `top_issues[]` with a `file:` and a suggested action, and `/qa-fix` consumes it from there.

---

## NFR Assessment

### Performance — PASS

One JSON read and one `git diff --name-only` per run.

### Reliability — FAIL

CR-1 HALTs every story and task finalise run. CR-2 makes the scoped path unreachable.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Candidates named:
  - `resolveCitation`: matches tokens against the `git ls-files` set only and never touches disk. An unresolved citation fails toward re-judging.
  - `isReopened`: a status read.
  - The 3a and 3c HALT blocks: they test the engine's exit code; they do not classify repository state.
- No hostile-input sink fits. The record path is caller-built, not untrusted input.

### Maintainability — CONCERNS

CR-5: one artefact-list site was not enumerated when the AC record was added.

---

## Code Review

Blocking is on (`code_review_blocking=true` from the pipeline). Every anchor checks `ok`.

**Correctness bugs (7):**

- [high/high] `skills/finalise/SKILL.md:731`: Step 3c reads `${STEM}`/`$DOD_N` unbound, and the empty `--dod-n` HALTs. Bind both with a guard. → TASK-242-CR-1
- [high/high] `skills/finalise/SKILL.md:495`: Step 3a reads `${STEM}`/`${DOD_N}` unbound, so the prior record is never found. Bind both with a guard. → TASK-242-CR-2
- [medium/high] `shared/resources/finalise-rerun-scope.js:487`: the reported-gap recompute overturns a FAIL whose reason is not a member. Keep the FAIL. → TASK-242-CR-3
- [medium/high] `shared/resources/finalise-rerun-scope.js:468`: an omitted re-check member is carried as PASS. Count it as FAIL. → TASK-242-CR-4
- [medium/high] `skills/finalise/SKILL.md:1696`: 7.6b `ARTIFACTS` lacks the AC record. Add it and pin the 6a/6b agreement. → TASK-242-CR-5
- [medium/medium] `shared/resources/finalise-rerun-scope.js:410`: an empty merged `acs` computes PASS. Return NEEDS_MANUAL_REVIEW. (advisory)
- [low/medium] `skills/finalise/SKILL.md:1618`: on an unparseable run, 6a may stage an earlier run's record. Test for this run's exact path. (advisory)

**Cleanups (1):**

- `shared/resources/finalise-rerun-scope.js:559`: the id-mismatch advisory re-looks-up entries by string id. Collect them in the first loop instead.

**Provenance:** every finding is in code this branch adds, so none is pre-existing.

**Mutation spot check** (scratch worktree; the reviewed tree was not touched):

```
mutation-proven: computeOverall drops the docs.every(docOk) term → "merge: overall is recomputed from acs and docs, never copied" + "computeOverall: PASS, PARTIAL and FAIL" → covered
mutation-proven: reported-gap member recompute disabled → "replay task.239: scope makes SC-11 a reported-gap…" → covered
```

2 of the 28 implementation-report proofs were re-run; both hold.

---

## Regression Testing

- The bug-mode table test, the DoD prompt contract tests and `bundle:check` are green.
- PR CI on `d2e9c3eb` is green.
- `review-task` and `review-story` link to the Step 3 anchor, and the heading is byte-identical.

---

## Test Artifacts

### Files Reviewed

`shared/resources/finalise-rerun-scope.js`, `shared/resources/tests/finalise-rerun-scope.test.mjs`, `shared/resources/finalise-dod-ac-prompt.md`, `skills/finalise/SKILL.md`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`, `evals/shared/tests/finalise-bug-mode.test.mjs`, `shared/resources/develop-pipeline-step-7-finalise.md`, `shared/resources/develop-pipeline-step-8-commit.md`, `CHANGELOG.md`

### Test Commands Executed

```bash
command node --test shared/resources/tests/finalise-rerun-scope.test.mjs evals/shared/tests/finalise-bug-mode.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs   # 126/126
TMPDIR=/tmp command node --test shared/resources/tests/finalise-rerun-scope.test.mjs   # 33/33
npm run validate -- skills/finalise/   # ok
npm run bundle:check   # 0 problems
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --diff-base <merge-base> --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 781   # green
```

The coverage tool is not configured for `node:test` suites in this repository, so no coverage figures were measured.

---

## Recommendations

### Immediate Actions (Blocking)

1. CR-1, CR-2: bind `STEM` and `DOD_N` in the 3a and 3c blocks, with a placeholder HALT.
2. CR-3, CR-4: fix the merge rules, with tests.
3. CR-5: add the AC record to 7.6b `ARTIFACTS`.

### Short-term Actions (Non-Blocking)

1. CR-6: return NEEDS_MANUAL_REVIEW when the merged `acs` is empty.
2. CR-7: stage this run's exact record path.
3. CR-8: tidy the id-mismatch advisory lookup.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two high-severity defects make Step 3c HALT on every run and make the scoped path unreachable.
**Quality Score**: 30/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.242.qa.1.scope-finalise-re-runs.md`
**Gate File**: co-located at `task.242.gate.1.scope-finalise-re-runs.yml`
**Next Steps**: `/qa-fix` on gate 1, then QA cycle 2 (full-diff refute pass).
