# QA Report: Task 163 - Close task.162's step-8 follow-ups

**Task**: [task.163.stop-hook-step-8-follow-ups.md](./task.163.stop-hook-step-8-follow-ups.md)
**Gate File**: [task.163.gate.1.stop-hook-step-8-follow-ups.yml](./task.163.gate.1.stop-hook-step-8-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Testing Completed**: 2026-09-28
**Gate Status**: PASS

---

## Executive Summary

The review covered all five deliverables across the Stop hook, the resume contract and three test files on PR #506. Every guard is mutation-proven by a committed test, and all seven development mutations reproduced independently in this review. Two LOW accuracy findings are open. Both sit in the text this task exists to make accurate, so they are queued for a fix cycle rather than deferred.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (26/26 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (None)
- [x] Code on feature branch with open PR (#506, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (shell suites, node:test)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, with one read-only Explore subagent for the diff code review (Step 3b). The task has 3 low-risk phases in one module, and standard pipeline mode was used. First review (no prior gate), so the whole-branch diff was reviewed: 22 files, 1,078 lines.

The traceability matrix came from the pipeline's mapper, written by the orchestrator because the subagent was read-only. It showed 9 criteria: 5 full, 2 partial, 1 integration, 1 none. `code_review_blocking=true` (run-level override); the task has no frontmatter flag.

Step 4b ran over `shared/resources/develop-pipeline-resume-contract.md`, the one changed runnable-prose file.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The step-8 text is complete and consistent | PASS | Verified | develop-bug `STEP7_TAIL` and the contract clause name the checklist. The `STEPS_AHEAD` binding is in place. 5b/5c/5d were updated (43 → 47 assertions). CR-1 and CR-2 are wording follow-ups (LOW). |
| Phase 2: The guards have floors and fail in the right place | PASS | Verified | `STOP_HOOK` floor added. The parity test renders the hook at lock 8 and compares both tails with the contract. 4b has its three-way `case` and the `NOJQ_SETUP_OK` gate. |
| Phase 3: Proof and gates | PASS | Verified | M1–M7 reproduced in this review (see Code Review). Bundle, CHANGELOG and gates pass. |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| develop-bug reason at lock 8 names the checklist | Named | "…and Part B's Step 7 Completion Checklist" | PASS | 5b develop-bug. Attribution wording: CR-2 |
| Contract clause names the same checklist; parity test red on either drop | Same words, parity red | Equal; M1 and M2 red the parity test | PASS | |
| Lock 8 has no generic clause; lock 3 keeps it | 0 / present | 5d ×3, 5c | PASS | Banner-doc agreement: CR-1 |
| `--complete` population test fails when the hook contributes nothing | Red | M4 → red (floor) | PASS | |
| 4b fails at setup naming the command when `command -v` is empty; builtin skipped | Named failure; builtin absorbed | M5 → "4b setup: 'no-such-cmd-t163' not found on PATH"; M6 green | PASS | dev-only coverage (see Code Review) |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| No measurable change | None | Text and tests only | PASS | Parity test adds about 170ms |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `ci:fast` with `.agents/skills` aside | Green | 4,333 tests / 0 failed (Step 3 run) | PASS | Targeted suites re-run here: 47/0, 95/0, 89/0, 18/0 |
| `lint:shell`, `bundle:check` | Clean | Clean / 0 problems | PASS | |
| Mutations behave as stated, restore by `cmp` | 7/7 | 7/7, restore `ok ok ok`, tree unchanged | PASS | |
| CHANGELOG `[Unreleased]` cites (task 163) | Present | Present under › Fixed | PASS | Documentation criterion, judged against the document |

---

## Breaking Changes Validation

No breaking changes. The hook's reason is a prompt, not a parsed contract, and its only other reader (`develop-pipeline-on-stop.test.sh`) is updated.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0)

None.

### LOW Severity Issues (2)

- **CR-1 — the banner doc still derives the steps-ahead list from `current_step`.** `shared/resources/develop-pipeline-remaining-work-banner.md` Rules say "Derive the position and the steps-ahead list from the lock file's `current_step`". At lock 8 that yields Step 8 alone. The hook now says to list Step 7's tail first when its row is unfinished. → Add a lock-8 exception to that rule.
- **CR-2 — "Part B's" misattributes the checklist.** `develop-bug-step-7-close-bug.md` puts `## Step 7 Completion Checklist (verify before marking ✅)` at top level beside Parts A and B, and its items include Part A's (`/finalise --bug` invoked, DoD file present). → Say "the Step 7 Completion Checklist" in the hook, the contract, 5b and the parity floor.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS

Message text and test code only.

### Reliability — PASS

The reason is well-formed at every lock step (all 47 hook assertions pass, including the out-of-range, missing and unparseable guards). The 4b setup failure is counted and its dependent assertions are gated, so a missing tool fails once, under its own name.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No boundary in the change set (`boundary: false`). The predicate-shaped candidates checked were the `STEPS_AHEAD` `if` (a string selection, not accept or reject), the 4b `case` (test-fixture setup, not shipped code) and `stopHookReasonAt8` (a test helper). None prevents an action on a `false`. The new text reaches output only through `jq -n --arg reason`, which JSON-escapes it.

### Maintainability — PASS

The two copies of the Step 7 tail are now bound together by a parity test that compares them for equality, with phrase floors so a bad extraction fails loudly. The new binding follows the `POSITION` / `ALREADY_DONE` pattern.

---

## Code Review

Diff code review (Step 3b): one read-only Explore subagent, full branch diff. It ran advisory under `code_review_blocking=true`, and no high-confidence bug was found, so nothing was promoted automatically. Both findings were verified against the files and entered `top_issues[]` as LOW by QA judgement, because each is an inaccuracy in the text this task exists to correct.

**Correctness bugs (1):**
- [low/medium] `shared/resources/develop-pipeline-on-stop.sh:294` — CR-1. The new lock-8 steps-ahead clause disagrees with the banner doc's "derive from `current_step`" rule → add a lock-8 exception to the banner doc.

**Cleanups (1):**
- [low/medium] `shared/resources/develop-pipeline-on-stop.sh:258` — CR-2. "Part B's Step 7 Completion Checklist" misattributes a top-level checklist → say "the Step 7 Completion Checklist" in all four places.

Boundary rule (Step 3b.3): `boundary: false`. Candidates are named above under Security, and `probes_executed: 0`.

Platform variance (Step 3b.4): not applicable. No environment-derived value reaches a validating consumer. The parity test's temp dir goes to the hook as its cwd, and the hook does not validate it.

Provenance (Step 3b.5b): not applicable. No bug finding was reproduced as a defect in behaviour. CR-1 is a disagreement between two documents, and the banner-doc half predates this branch.

Mutation-proof spot check (Step 3c). All seven were re-run by QA with the development script (`cp` snapshot, `cmp`-checked restore; tree unchanged afterwards):

- mutation-proven: develop-bug `STEP7_TAIL` without the checklist → 5b develop-bug + parity test → covered
- mutation-proven: contract develop-bug clause without the checklist → parity test → covered
- mutation-proven: `STEPS_AHEAD` always generic → 5d ×3 → covered
- mutation-proven: every hook `--complete` → `--finish` → population test (hook floor) → covered
- mutation-proven: 4b loop names a missing command → "4b setup: 'no-such-cmd-t163' not found on PATH" → dev-only (no committed case exercises the empty arm)
- mutation-proven: `printf` added to the 4b loop → 4b green → absorbed (builtin arm, as intended)
- mutation-proven: contract story/task tail reworded → parity test → covered

Five of seven are `covered`. The 4b pair is `dev-only` and `absorbed`, as the criterion's nature implies: it describes a test fixture's own setup behaviour. This is logged under `recommendations.future`.

Step 4b (runnable prose): `develop-pipeline-resume-contract.md` has 30 blocks (2 runnable, 8 placeholder, 20 refused as mutating). It ran under bash and zsh with 0 findings. The diff changes no fenced block, only one sentence of the Phase 0b paragraph. Skipped blocks, by line:

- `write-redirection`: 34
- `rm -rf` deny-list: 72, 206
- `-o` output flag: 428
- `unrecognised-command` (fail-closed): 328, 356–360, 366–370, 376, 475, 538
- placeholders: 359, 360, 369, 370

---

## Regression Testing

| Area | Result |
| --- | --- |
| Stop hook at every lock step and QA phase (`develop-pipeline-on-stop.test.sh`) | PASS 47/0 |
| Lock helper incl. zsh, no-jq, restore (`advance-pipeline-lock.test.sh`) | PASS 95/0 |
| Step 8 checklist, resume record, fixtures (`step-8-completion-checklist.test.mjs`) | PASS 89/0 |
| PreCompact hook (`develop-pipeline-on-precompact.test.sh`) | PASS 18/0 |
| `npm run validate` on the 9 skills whose bundled copies changed | PASS 9/9 |
| Prettier over the tree | PASS |

---

## Test Artifacts

### Files Reviewed

`shared/resources/develop-pipeline-on-stop.sh`, `shared/resources/develop-pipeline-resume-contract.md`, `shared/resources/develop-pipeline-on-stop.test.sh`, `shared/resources/tests/step-8-completion-checklist.test.mjs`, `shared/resources/advance-pipeline-lock.test.sh`, `shared/resources/develop-pipeline-remaining-work-banner.md`, `skills/develop-bug/references/develop-bug-step-7-close-bug.md`, `CHANGELOG.md`.

### Test Commands Executed

```bash
bash shared/resources/develop-pipeline-on-stop.test.sh
bash shared/resources/advance-pipeline-lock.test.sh
node --test shared/resources/tests/step-8-completion-checklist.test.mjs
bash shared/resources/develop-pipeline-on-precompact.test.sh
npx prettier --check .
npm run validate -- skills/<s>/   # develop-bug develop-story develop-task qa-fix qa-story qa-task review-pr review-story review-task
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-resume-contract.md --json
bash t163-mutate.sh   # M1–M7, cp snapshot + cmp restore
```

### Coverage Report

Not applicable. These are shell and Markdown deliverables with no coverage instrumentation, and coverage is carried by the mutation proofs above.

---

## Recommendations

### Immediate Actions (Blocking)

None. The gate is PASS.

### Short-term Actions (Non-Blocking)

1. CR-1: add a lock-8 exception to the banner doc's steps-ahead derivation rule.
2. CR-2: say "the Step 7 Completion Checklist" rather than "Part B's …" in all four places.
3. Optional: a committed meta-test for 4b's empty arm (see gate `recommendations.future`).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All deliverables are present and every guard is proven red by a committed test, except 4b's fixture arm, which is dev-only by nature. Only LOW findings remain.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.163.qa.1.stop-hook-step-8-follow-ups.md`
**Gate File**: co-located at `task.163.gate.1.stop-hook-step-8-follow-ups.yml`
**Next Steps**: fix CR-1 and CR-2 in a qa-fix cycle, then re-review.
