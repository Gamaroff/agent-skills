# QA Report: Task 168 - Harden task.135's gate-head scoping

**Task**: [Link to task document](./task.168.gate-head-scoping-hardening.md)
**Gate File**: [task.168.gate.1.gate-head-scoping-hardening.yml](./task.168.gate.1.gate-head-scoping-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: CONCERNS

---

## Executive Summary

All six task.135 follow-ups are implemented as planned. Each has an executed test under bash and zsh, and each mutation proof goes red. The diff review found that the new uncommitted-fix HALT is both too wide and too narrow. It fires on untracked files that develop-pipeline Step 4 restores into the tree (CR-1), and it guards only the cycle-3+ scoped arm, while the success criterion covers every arm (CR-2). Three low findings are about stderr and test fidelity.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1 and CR-2 fixed and re-reviewed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (3/3, 11/11 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none; one new HALT named)
- [x] Code on feature branch with open PR (#562)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, executed-fence)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only diff-review subagent (Step 3b). First review: whole-branch diff `origin/develop...HEAD`, 23 files, 3,197 lines. Reviewer dispatched 2026-10-03T15:19:23Z; duration 183 s (completion notice `duration_ms` 183390).

- Step 4b — the engine ran on `skills/qa-task/SKILL.md` (20 blocks: 1 runnable, 3 placeholder, 16 mutating), `skills/qa-story/SKILL.md` (19: 1 / 4 / 14) and `shared/resources/qa-re-review-scope.md` (2: all mutating, `no-executable-blocks` note). Shells: bash and zsh. Zero findings. Every block this diff changed was refused: qa-task L170, L201, L303 and L419; qa-story L247, L502 and L884. The reasons were `unrecognised-command: bash/awk/git merge-base` and `write-redirection`. Those blocks are executed instead by `qa-scope-from-head.test.mjs`, which cuts them from the shipped fences and runs them in scratch repositories under both shells (F, I, J and L1–L9).
- Platform variance: `TMPDIR=/tmp command node --test shared/resources/tests/qa-scope-from-head.test.mjs shared/resources/tests/qa-safety-clause1.test.mjs` → 91 tests, 0 fail.

---

## New Findings This Cycle

First review — every finding below is new.

- **[medium]** `shared/resources/qa-re-review-scope.md:223` — the uncommitted-fix HALT counts untracked files outside the work item. Develop-pipeline Step 4 restores held out-of-scope untracked files into the tree, so a healthy pipeline branch HALTs at cycle 3+. → Make the HALT tracked-only and warn on untracked files (T168-QA1-CR-1).
- **[medium]** `shared/resources/qa-re-review-scope.md` — the check guards only the scoped arm. Cycle 2, the safety re-probe arm and the schema-1 arm also read committed history. → Run the check whenever `PRIOR_GATES >= 1` (T168-QA1-CR-2).
- **[low]** `skills/qa-task/SKILL.md:181` (and :314; qa-story :258, :513) — the first `qa-cycle.sh` call in the rebind discards stderr. → Keep stderr (T168-QA1-CR-3).
- **[low]** `evals/shared/tests/qa-re-review-scope-parity.test.mjs:1168` — the call-count assertion counts prose mentions. → Assert the call per fence (T168-QA1-CR-4).
- **[low]** `shared/resources/tests/gate-head-freshness.test.mjs:329` — the agreement test uses a hard-coded sed. → Extract the shipped sed (T168-QA1-CR-5).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: trigger validates its head; helper rebinds read rc | PASS | Verified | L1, L2, L7, L8 (bash + zsh); CR-3 (low) on stderr |
| Phase 2: one clause-1 script | PASS | Verified | Awk moved byte-for-byte (`diff` clean); L9; 16 script tests; parity 58/58 |
| Phase 3: literal paths, uncommitted fix, `field()` | CONCERNS | Partial | L3–L6 green; CR-1 and CR-2 on the HALT's reach |

**Overall Phase Completion**: 3/3 implemented; 2 PASS, 1 CONCERNS

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Non-40-hex / off-branch head → `CODE_MOVED=1` | Yes | Yes | PASS | L1, L2 |
| `:`-named file stays in the cycle-3+ patch | Yes | Yes | PASS | L3 (root-level `:colon.sh`) |
| Security-FAIL gate + bound `false` → whole-branch | Yes | Yes | PASS | L9, both skills |
| Step 3b HALTs on an uncommitted change outside the work item | Yes | Scoped arm only | CONCERNS | CR-2; and too wide on untracked (CR-1) |
| `qa-cycle.sh` refusal in steps 2 and 5 → HALT naming the reason | Yes | Yes | PASS | L7, L8; CR-3 for the unnumbered-gate shape |
| `field()` and the shell sed agree on `head: '<sha>'  ` | Yes | Yes | PASS | Agreement test; CR-5 (fidelity) |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Six mutation proofs | 6 | 7 red | PASS | Re-run by QA; see Code Review |
| Test E + `extractProbe()` | green | green | PASS | |
| `npm run validate` qa-task / qa-story | clean | clean | PASS | |
| `npm run ci:fast` | 0 fail | 5,243 / 0 | PASS | from develop; suites re-run here 91/0 |

**Migration:** CHANGELOG `[Unreleased]` › Fixed names the six fixes — PASS.

---

## Breaking Changes Validation

### Breaking Change: uncommitted-fix HALT on the scoped arm
Documented: Yes (§5)
Migration Path Provided: Yes (commit the fix before re-review)
Migration Tested: Yes (L4)
Consumer Code Updated: N/A
Notes: §5 claims a develop-pipeline run never reaches the HALT. CR-1 falsifies that for untracked files: Step 4's Restore Held Files block puts them back into the tree.

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: Uncommitted-fix HALT fires on untracked files the pipeline restores (T168-QA1-CR-1)**
- **Severity**: MEDIUM
- **Category**: Functional / Reliability
- **Observation**: `DIRTY=$(git status --porcelain -- . ":(exclude)$WORK_ITEM_DIR" ":(exclude).claude/state")` includes `??` lines. Develop-pipeline Step 4's Pre-flight Guard holds out-of-scope untracked files, and "Restore Held Files" puts them back before the QA loop.
- **Impact**: A cycle-3+ re-review HALTs on a healthy branch, which is the rollback trigger §11 names.
- **Recommendation**: HALT on tracked changes only, warn on untracked ones, and add a fixture.
- **Priority**: P1

**Issue: Uncommitted-fix check covers one arm of four (T168-QA1-CR-2)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: The cycle 2, safety re-probe and schema-1 arms run `git diff "$BASE...HEAD"` with no dirty check.
- **Impact**: An uncommitted fix is reviewed as absent on those arms, and the success criterion is unmet.
- **Recommendation**: Move the check above the arm selection for re-reviews (`PRIOR_GATES >= 1`).
- **Priority**: P1

### LOW Severity Issues (3)

- CR-3: the first `qa-cycle.sh` call in the new rebinds discards stderr.
- CR-4: the parity call-count assertion counts prose mentions.
- CR-5: the `field()` agreement test runs a copied sed, not the shipped one.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Performance — PASS
One extra `git status` and one script call per cycle.

### Reliability — CONCERNS
CR-1: a false HALT at cycle 3+. CR-2: a missed guard on three arms.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- **boundary: internal**: `shared/resources/qa-safety-clause1.sh#main` reads only a QA gate file (`*.gate.N.*.yml`) that qa-task and qa-story write. No corpus sink models gate YAML: `markdown-structure` models the implementation report, and `filename` models names this script never validates. It checks readability only, reports on stdout and always exits 0. A `--sink filename` probe was attempted and returned `absent` (28 executed, none rejected), which measures a property the script does not claim. Its record was not kept as gate evidence. The script's behaviour is executed by 16 direct tests and the parity suite's replays (real security-FAIL gates, a broken `awk`, a held-open stdin).
- Other predicate-shaped additions: the trigger's head check and the `WORK_ITEM_DIR` refusal are guards inside fenced blocks whose inputs are a gate's `head:` and an agent-bound directory. Both are executed by L1, L2 and L6.

### Maintainability — PASS
Clause 1 has one definition. The scope block is identical across three copies (test E).

---

## Code Review

From Step 3b. `code_review_blocking=true` was passed, but no finding is `bug` + `high` confidence, so none was promoted automatically. CR-1, CR-2 and CR-3 entered `top_issues[]` as QA's own findings after QA verified them against `develop-pipeline-step-4-create-pr.md` (Restore Held Files) and the arm structure of the scope block.

**Correctness bugs (3):**
- [medium/medium] `shared/resources/qa-re-review-scope.md:223` — the HALT counts untracked files the pipeline restores → tracked-only HALT plus an untracked warning (T168-QA1-CR-1)
- [medium/medium] `skills/qa-task/SKILL.md:519` — the guard covers only the scoped arm → move it above arm selection (T168-QA1-CR-2)
- [low/medium] `skills/qa-task/SKILL.md:181` — the first rebind call discards stderr → keep it (T168-QA1-CR-3)

**Cleanups (2):**
- `evals/shared/tests/qa-re-review-scope-parity.test.mjs:1168` — the call count includes prose → assert per fence (T168-QA1-CR-4)
- `shared/resources/tests/gate-head-freshness.test.mjs:329` — a hard-coded sed → extract the shipped one (T168-QA1-CR-5)

**Mutation proofs (re-run by QA; working tree verified unchanged afterwards):**
- mutation-proven: head validation disabled → L1/L2 [bash, zsh] red (4) → covered
- mutation-proven: `--literal-pathspecs` dropped (shared rule) → L3 [bash, zsh] red → covered
- mutation-proven: Step 3b clause-1 OR removed (qa-story) → L9 qa-story red → covered (qa-task proven at develop, same shape)
- mutation-proven: dirty-tree HALT disabled → L4 red → covered
- mutation-proven: `.claude/state` exclusion dropped → L5 red → covered
- mutation-proven: step-2/5 refusal HALT disabled (qa-story) → L7/L8 qa-story red (4) → covered
- mutation-proven: old `field()` order → agreement test red → covered

---

## Regression Testing

- `qa-re-review-scope-parity.test.mjs` 58/58. All replay gates (task.67 gates 1–2) are unchanged.
- `qa-scope-from-head.test.mjs` 75/75. The task.135 tests A–K stay green.
- `npm run ci:fast` 5,243 / 0 (develop), `eval:develop-task` 13/13, `eval:develop-story` 68/68 (develop).

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-re-review-scope.md`, `shared/resources/qa-safety-clause1.sh`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, the four test files, `CHANGELOG.md`, the bundled copies.

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-scope-from-head.test.mjs shared/resources/tests/gate-head-freshness.test.mjs evals/shared/tests/qa-re-review-scope-parity.test.mjs shared/resources/tests/qa-safety-clause1.test.mjs
TMPDIR=/tmp command node --test shared/resources/tests/qa-scope-from-head.test.mjs shared/resources/tests/qa-safety-clause1.test.mjs
npm run validate -- skills/qa-task/ ; npm run validate -- skills/qa-story/
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --json
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'shell:shared/resources/qa-safety-clause1.sh' …   # boundary: internal — see Security
```

### Coverage Report
Not instrumented. The repository's suites are behavioural (`node:test`) with no coverage tooling.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1: make the HALT tracked-only, warn on untracked files, add a fixture (P1).
2. CR-2: run the check for every re-review arm, add a cycle-2 fixture (P1).

### Short-term Actions (Non-Blocking)
1. CR-3, CR-4, CR-5 — cheap; they ride the same fix cycle.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No high findings. Two verified medium findings on the new HALT's reach.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed and re-reviewed

---

**QA Report**: co-located at `task.168.qa.1.gate-head-scoping-hardening.md`
**Gate File**: co-located at `task.168.gate.1.gate-head-scoping-hardening.yml`
**Next Steps**: `/qa-fix` (cycle 1), then re-review (cycle 2 — refute pass)
