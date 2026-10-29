# QA Report: Task 242 - Scope finalise re-runs

**Task**: [task.242.scope-finalise-re-runs.md](./task.242.scope-finalise-re-runs.md)
**Gate File**: [task.242.gate.2.scope-finalise-re-runs.yml](./task.242.gate.2.scope-finalise-re-runs.yml)
**Previous**: [task.242.qa.1.scope-finalise-re-runs.md](./task.242.qa.1.scope-finalise-re-runs.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 re-reviewed the whole branch diff as a refute pass. All eight cycle-1 findings are fixed, and each fix's test goes red when the fix is reverted. The independent reviewer found three new high defects in the engine. In each, a re-run carries or restores a PASS that the evidence no longer supports. One of them (CR2-2) was introduced by cycle 1's CR-3 fix.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Cycle-1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1: Step 3c reads `STEM`/`DOD_N` unbound | ✅ FIXED | `finalise-rerun-scope-blocks.test.mjs` runs 3c substituted and it writes `task.9.dod.1.ac.json`. Dropping the binding turns it red. |
| CR-2: Step 3a reads them unbound | ✅ FIXED | The same test's second run is `scoped (prior-record)`. Dropping the binding turns it red. |
| CR-3: reported-gap overturns a non-member FAIL | ⚠️ PARTIAL | The case with no failing member is fixed. A FAIL padded with an invented member still flips (CR2-2), as does an omitted criterion (CR2-1). |
| CR-4: an omitted re-check member keeps its PASS | ✅ FIXED | Engine test `a re-check member the agent omits is FAIL`. |
| CR-5: 7.6b lacks the AC record | ✅ FIXED | Bug-mode test `7.6b asserts THIS run's AC record pushed`. |
| CR-6 (advisory): an empty `acs` is PASS | ✅ FIXED | The `computeOverall` test asserts `NEEDS_MANUAL_REVIEW`. |
| CR-7 (advisory): 6a stages an earlier run's record | ✅ FIXED | Bug-mode test `derive the same AC record path`, plus the dod.0 control. |
| CR-8 (advisory): mismatch advisories lose their status | ✅ FIXED | Engine test covering empty and duplicate ids. |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-rerun-scope.js:501` (CR2-1): a member-shaped reported gap the agent omits flips to PASS when every prior member was PASS. → Keep the prior FAIL when there is no agent verdict.
- **[high]** `shared/resources/finalise-rerun-scope.js:505` (CR2-2): an invented FAIL member on unchanged evidence "explains" a non-member FAIL, which is then overturned and its note lost. → Make the non-member FAIL a structured field the engine reads.
- **[high]** `shared/resources/finalise-rerun-scope.js:145` (CR2-3): a cited path that was deleted, or renamed (`--name-only` reports only the new name), drops out of the evidence, so the PASS is carried. → Resolve against the tracked files plus the changed set, and diff with `--no-renames`.
- **[medium/medium]** `skills/finalise/SKILL.md:505` (CR2-4, advisory): the record keys on HEAD, but the agents judged the working tree. → Record the dirty paths and treat them as changed.

---

## Testing Scope

### Review Methodology

Direct tools plus one independent Explore reviewer for Step 3b.

- **Refute pass:** cycle 2 is a full refute pass over the whole `origin/develop...HEAD` diff (29 files, 5115-line patch) with the refute directive appended. The reviewer was dispatched at 2026-10-29T07:26:33Z and returned in 162.7 s (`duration_ms` from its completion notice).
- **Scope:** `Re-review scope: unscoped — cycle 2 refute pass (whole branch diff, 29 files)`.
- **Safety re-probe:** not run. Clause 1 is false, and the prior gate did not fail on security.
- **Anchors:** `finding-anchors.js` returned `ok`, and all 4 anchors are `ok` at 15185f81.
- **Provenance:** all 4 findings are in code this branch adds (`finalise-rerun-scope.js` is new), so none is `pre-existing`.
- **CI:** `CI on 15185f81e9e4: pending`, read once and not waited on.
- **Step 4b:** `skills/finalise/SKILL.md` has 4 changed blocks, all refused as `mutating`, so none executed. 42 blocks were found: 3 placeholder, 39 mutating. `shared/resources/finalise-dod-ac-prompt.md` has 0 changed blocks. The new `finalise-rerun-scope-blocks.test.mjs` executes the 3a and 3c fences, which covers the gap Step 4b cannot reach.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Engine `scope` | CONCERNS | CR2-3 |
| Engine `merge` | FAIL | CR2-1, CR2-2 |
| AC prompt Step 0 | PASS | Its rule is stated, but the engine cannot enforce it (CR2-2) |
| finalise 3a / 3c / 3d | PASS | Bound in-block and executed by test |
| finalise 6a / 6b | PASS | This run's record, mutation-proved |
| Bug-mode skip row | PASS | Unchanged since cycle 1 |

---

## Success Criteria Verification

SC-3 and SC-4 are the criteria this cycle's findings touch. SC-3 (the task.239 replay) still passes. The merge rules behind SC-4 fail on the inputs above. The other criteria are unchanged from cycle 1.

---

## Breaking Changes Validation

None. A first run with no record is `full`, which is the old behaviour.

---

## Issues Found

**Total Issues**: HIGH: 3, MEDIUM: 1 (advisory, not promoted), LOW: 0. Details are under **New Findings This Cycle** and in the gate.

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, as in cycle 1. The candidates were `resolveCitation`, `isReopened`, and the scope/merge classifiers. Each decides re-judge vs carry over pipeline-written records and git state. They touch no disk path, and no corpus sink models them.

### Performance — PASS
Unchanged.

### Reliability — FAIL
CR2-1, CR2-2 and CR2-3 each carry a PASS the evidence no longer supports.

### Maintainability — PASS
Fixes are commented with their finding ids, and the block test executes the real fences.

---

## Code Review

**Correctness bugs (4):**
- [high/high] `shared/resources/finalise-rerun-scope.js:501` (CR2-1, promoted to `TASK-242-CR2-1`). An omitted member-shaped reported gap passes.
- [high/high] `shared/resources/finalise-rerun-scope.js:505` (CR2-2, promoted to `TASK-242-CR2-2`). An invented advisory member overturns a non-member FAIL.
- [high/high] `shared/resources/finalise-rerun-scope.js:145` (CR2-3, promoted to `TASK-242-CR2-3`). A deleted or renamed cited path is dropped.
- [medium/medium] `skills/finalise/SKILL.md:505` (CR2-4, advisory). The record keys on HEAD, not on the tree that was judged.

**Cleanups (0).**

The reviewer also reported no defect in these areas:
- The 3a/3c guards under bash and zsh.
- `DOD_REST` on real DoD names (`task.N.dod.K.name.md` → K).
- Record chains across unparseable, reopened and rebased runs. Each falls back to `full`, or the write is skipped.

**Mutation proofs** (scratch worktree at 15185f81; baselines green after each):

- mutation-proven: drop 3a binding → `Steps 3a + 3c as substituted` → covered
- mutation-proven: drop 3c binding → `Steps 3a + 3c as substituted` → covered
- mutation-proven: members always overturn an agent FAIL → `agent FAIL that names no failing member stands` → covered
- mutation-proven: ignore `test_runs_per_pr: false` → `test_runs_per_pr: false keeps the criterion FAIL` → covered
- mutation-proven: an omitted re-check member keeps its prior status → `re-check member the agent omits is FAIL` → covered
- mutation-proven: drop the `computeOverall` empty guard → `computeOverall: PASS, PARTIAL and FAIL` → covered
- mutation-proven: mismatch advisory drops the status → `did not issue is reported with its own status` → covered
- mutation-proven: drop the 7.6b record → `7.6b asserts THIS run's AC record pushed` → covered
- mutation-proven: 7.6a derives a different path → `derive the same AC record path` → covered

9 of 9 proofs are covered.

---

## Regression Testing

The targeted suites passed 134/134: engine 37, blocks 2, bug-mode plus prompt contract 95. `TMPDIR=/tmp` also gives 134/134. `ci:fast` on this tree before the last task-document edit gave 6773 pass, 0 fail.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/finalise-rerun-scope.test.mjs evals/shared/tests/finalise-rerun-scope-blocks.test.mjs evals/shared/tests/finalise-bug-mode.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs
TMPDIR=/tmp command node --test (same four files)
npm run validate -- skills/finalise/
python3 skills/create-skill/scripts/quick_validate.py skills/{finalise,review-story,review-task}
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --diff-base <merge-base> --copy-as skills:.agents/skills --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR2-1: when there is no agent verdict, the prior FAIL stands.
2. CR2-2: read a non-member FAIL from a structured field, and keep the agent's note as an advisory when the members overturn its FAIL.
3. CR2-3: treat a deleted or renamed cited path as changed evidence.

### Short-term Actions (Non-Blocking)
1. CR2-4: record the dirty paths at merge, and re-judge them on the next scope.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: three high-confidence correctness bugs (`code_review_blocking`).
**Quality Score**: 40/100
**Deployment Recommendation**: BLOCKED

**Next Steps**: qa-fix cycle 2.
