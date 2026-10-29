# QA Report: Task 237 - Apply 5c doc-only findings on APPROVE

**Task**: [Link to task document](./task.237.carry-doc-only-findings-on-approve.md)
**Gate File**: [task.237.gate.1.carry-doc-only-findings-on-approve.yml](./task.237.gate.1.carry-doc-only-findings-on-approve.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-27
**Testing Completed**: 2026-10-27
**Gate Status**: CONCERNS

---

## Executive Summary

The rule change is correct. Both verdict rows carry the doc-only clause, the Carry section classifies
on `APPROVE` or `CONCERNS`, the classify and stage blocks are unchanged, and every restatement drops
the CONCERNS-only wording. One test gap holds the gate at CONCERNS. The new `CARRY_FIXED` sentence,
the one task.179's run obeyed in its old form, is guarded only by a negative pattern. Deleting it, or
reverting it with a period before "leave", leaves the suite green.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#767)

### Testing Approach

- [x] Automated Testing (unit, integration)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

The review used direct tools: 3 low-risk phases, prose and test only. The traceability matrix came
from the pipeline mapper (`.summaries/qa-traceability-matrix.md`, 11 criteria). One read-only
Explore reviewer did the Step 3b diff review. It was dispatched at 15:53:51Z, returned in 53.8 s
(`duration_ms` 53813), and was given the whole branch diff (first review, 1028 lines, 19 files).
TaskCreate tracking was not available in this session, so the phases were tracked in this report.

Step 4b ran over every changed in-scope file. For the result, see Test Artifacts.

---

## Implementation Verification

| Phase                          | Status   | Test Result | Notes |
| ------------------------------ | -------- | ----------- | ----- |
| Phase 1: The rule              | PASS     | Verified    | Three hunks, all prose outside the classify and stage fences (`git diff -U0`: `@@ -1464`, `@@ -1496`, `@@ -1602,2`) |
| Phase 2: The restatements      | PASS     | Verified    | Population greps re-run: 0 CONCERNS-only hits outside the released CHANGELOG entry; 9 bundled copies regenerated, `bundle:check` clean |
| Phase 3: Guard and record      | CONCERNS | Partial     | Row and Classify-on guards proved; the classify-keyed `CARRY_FIXED` sentence is unpinned (QA-1) |

**Overall Phase Completion**: 2/3 phases passed, 1 with concerns

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| SC1 APPROVE and CONCERNS rows carry the clause | test 13, mutation M1 red | PASS |
| SC2 carry prose names no verdict where it decides | "Classify on" half: test 14, M2 red. `CARRY_FIXED` half: negative only. M3 (old wording) red, but M4 (sentence deleted) and M5 (APPROVE key behind a period) green | CONCERNS (QA-1) |
| SC3 restatements no longer CONCERNS-only | grep: `skills/develop-task/SKILL.md:239`, `develop-story/SKILL.md:252`, `review-pr/SKILL.md:1072`, `finalise/SKILL.md:1491`, `develop-pipeline-step-7-finalise.md:147` read as changed. Structural, no test | PASS (verified by reading) |
| SC4 code and path-less findings still recorded, not fixed | the Carry prose at `develop-pipeline-step-5-6-qa-loop.md:1493`–`:1496` is unchanged; `acceptance-commit-carries-5c.test.mjs` classify cases | PASS |
| Perf: no new step or commit | blocks unchanged; carries-5c 24/24 | PASS |
| Perf: carries-5c passes unchanged | `git diff origin/develop...HEAD -- shared/resources/tests/` empty; 24/24 | PASS |
| Quality: each assertion mutation-proved | 3 of the task's named mutations red; M4 and M5 not covered | CONCERNS (QA-1) |
| Quality: bundle:check, validate | 128 skills, 0 problems; 4 skills ✓ | PASS |
| Quality: ci:fast, ci | ci:fast 6433/0 fail (implementation record); CI `test` pending @ 928fc789, other jobs pass | PASS for ci:fast; `ci` pending |
| Migration: CHANGELOG cites task 237 | `CHANGELOG.md:9` | PASS (the wording overstates coverage; QA-1) |
| Migration: no consumer action | diff touches no config or installer | PASS |

---

## Breaking Changes Validation

None documented, and none found. Behaviour on `APPROVE` is additive.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: The new `CARRY_FIXED` sentence is not pinned (QA-1)**
- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: [task.237.bug.1.carry-fixed-sentence-not-pinned.md](./task.237.bug.1.carry-fixed-sentence-not-pinned.md)
- **Observation**: `pr-review-loop-parity.test.mjs:803` has only `doesNotMatch(/`APPROVE`[^.]*leave\s+`CARRY_FIXED`\s+empty/)`. Mutation M4 deletes the classify-keyed sentence and gets 0 failures. Mutation M5 replaces it with "On `APPROVE` (as task.179 did), leave `CARRY_FIXED` empty" and gets 0 failures.
- **Impact**: the sentence this task changed can disappear or regress without a red test, and the CHANGELOG says the test pins it.
- **Recommendation**: add a positive assertion for the classify-keyed sentence, harden the negative one, and mutation-prove M4 and M5.
- **Priority**: P2

This finding enters `top_issues[]` under Step 5's rule. Half of SC2 has no committed test. It is a
separate rule from Step 3b's promotion rule: the reviewer's CR-1 is medium-confidence, and that
rule would not have promoted it.

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Prose and test change; no runtime path, no new pipeline step.

### Reliability — PASS
The classify and stage blocks are byte-identical, and `acceptance-commit-carries-5c.test.mjs` passes
24/24 unchanged. A 5c doc edit that fails the link check is restored by the existing stage block.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The diff adds no predicate-shaped function. The candidates checked were these:
  - the two new test functions, which are not shipped code;
  - the three QA-loop hunks, which are prose outside the classify and stage fences, the two
    boundaries this step touches by reference;
  - the one changed fenced line, the finalise 6a commit block, which is a `#` comment.
- The classify and stage boundaries themselves are unchanged and stay held by
  `acceptance-commit-carries-5c.test.mjs`.

### Maintainability — CONCERNS
QA-1: one of the two carry-prose sentences the task names as guarded is not pinned.

---

## Code Review

Advisory under the promotion rule: neither finding is `bug` + `confidence: high`. QA-1 carries
CR-1's substance into the gate through Step 5's rule.

**Correctness bugs (1):**
- [low/medium] `evals/shared/tests/pr-review-loop-parity.test.mjs:803` — the `CARRY_FIXED` guard is only a `doesNotMatch`, so it passes when the new sentence is deleted, or when a reverted APPROVE-keyed sentence has a period before "leave" → add a positive assertion for the classify-keyed sentence. **Confirmed by mutations M4 and M5.**

**Cleanups (1):**
- `CHANGELOG.md:16` — the entry says the test pins both carry-prose sentences, but the `CARRY_FIXED` one is only checked for one old wording's absence → add the CR-1 assertion, or reword.

Anchors: `finding-anchors.js --rev HEAD` gives `ok` for both.

**Mutation proofs** (`cp` snapshot and restore; tree identical afterwards):

- mutation-proven: APPROVE row clause removed → test 13 "APPROVE and CONCERNS both carry doc-only findings…" → covered
- mutation-proven: "Classify on `CONCERNS`" restored → test 14 "the carry prose names no verdict…" → covered
- mutation-proven: "On `APPROVE`, or a `CONCERNS` with nothing doc-only, leave `CARRY_FIXED` empty" restored → test 14 → covered
- mutation-proven: classify-keyed `CARRY_FIXED` sentence deleted → no test red → no-red-untested (QA-1)
- mutation-proven: "On `APPROVE` (as task.179 did), leave `CARRY_FIXED` empty" → no test red → no-red-untested (QA-1)

The proofs ran 3 of 5. The two uncovered directions are QA-1.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| `pr-review-loop-parity.test.mjs` | 33/33 PASS |
| `acceptance-commit-carries-5c.test.mjs` | 24/24 PASS, unchanged |
| Bundled copies | `bundle:check`: 128 skills, 0 problems |
| Whole suite | `npm run ci:fast` 6433 tests, 0 fail, 14 skipped (Step 3, with `.agents/skills` and `.claude/skills` moved aside) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/develop-pipeline-step-7-finalise.md`, `skills/{finalise,develop-task,develop-story,review-pr}/SKILL.md`, `evals/shared/tests/pr-review-loop-parity.test.mjs`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test --test-reporter=tap evals/shared/tests/pr-review-loop-parity.test.mjs
command node --test --test-reporter=tap shared/resources/tests/acceptance-commit-carries-5c.test.mjs
npm run bundle:check
python3 skills/create-skill/scripts/quick_validate.py skills/{develop-task,develop-story,finalise,review-pr}/
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed in-scope file> \
  --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
```

The standards-named validation command (`npm run validate` per changed skill) was run as
`quick_validate.py` on each of the four skills. The npm script takes one directory.

**Step 4b (execute documented commands).** Changed blocks across the six files: 1 total, 0
executed. The 1 is mutating: the finalise 6a commit block, where the only changed line is a comment.
At file level, `zero-blocks-executed` was reported on three files:

- `develop-pipeline-step-7-finalise.md`: 11 blocks, 2 placeholder, 9 mutating;
- `finalise/SKILL.md`: 39 blocks, 3 placeholder, 36 mutating, plus `changed-blocks-not-executed`
  for the 6a block;
- `review-pr/SKILL.md`: 16 blocks, 1 placeholder, 15 mutating.

The QA loop doc (26 blocks), develop-task (10) and develop-story (10) reported no finding and 0
changed blocks. No change touched a runnable block, so these findings are about the files, not this
change. They are recorded in the gate's `recommendations.future`.

### Coverage Report
Not applicable. These are prose-contract tests, with no line coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-1: pin the classify-keyed `CARRY_FIXED` sentence and harden the negative pattern (P2).

### Short-term Actions (Non-Blocking)
1. Reword the CHANGELOG coverage claim if QA-1's fix does not make it true.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the rule change is correct. One guarded sentence the task names is unguarded, and two mutations prove it.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-1 fixed

---

**QA Report**: co-located at `task.237.qa.1.carry-doc-only-findings-on-approve.md`
**Gate File**: co-located at `task.237.gate.1.carry-doc-only-findings-on-approve.yml`
**Next Steps**: `/qa-fix` for QA-1, then re-review.
