# QA Report: Task 160 - Step 8 check 4 allowlists finished rows instead of denying two unfinished ones (cycle 2)

**Task**: [task.160.step-8-check-4-allowlists-finished-rows.md](./task.160.step-8-check-4-allowlists-finished-rows.md)
**Gate File**: [task.160.gate.2.step-8-check-4-allowlists-finished-rows.yml](./task.160.gate.2.step-8-check-4-allowlists-finished-rows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-27
**Testing Completed**: 2026-09-27
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's finding (CR-1) is fixed and held by tests. All four Step 8 restatements now put the Pipeline Progress update before the commit. The cycle-2 refute pass then found a consequence of the reordering itself. Step 8 now writes its own row ✅ before the commit, push and checklist, so a HALT or pause inside Step 8 leaves a committed report that says Step 8 finished. The resume contract reads only that row for Step 8. Check 4 itself stays measured correct.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR2-1, CR2-2 fixed)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (medium): four Step 8 restatements prescribed a post-push Pipeline Progress update | FIXED | `e299eae7`. The step doc's description and the develop-task, develop-story and develop-bug summaries now name the rows before the commit, and action 2 carries a Step 8 carve-out. 7 guard tests; 4 reversions each went red |
| CR-2..CR-5 (advisory) | not addressed | still advisory; carried in `recommendations.future` |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists; status `ready-for-review`
- [x] All 4 phases ticked
- [x] Tests passing: checklist suite 71/71; CI `test`, `validate`, `shellcheck`, `link-check` all pass on `e299eae7`
- [x] Breaking changes documented
- [x] PR #499 open

### Testing Approach

- [x] Automated Testing (executed checklist block, bash + zsh)
- [x] Regression Testing (CI on the PR head)
- [x] Security Review (probe engine, measured)
- [x] Code Review (independent refute pass, Step 3b)

### Review Methodology

Direct tools, plus one independent read-only reviewer. This is cycle 2, so the reviewer read the **whole branch diff** as a refute pass (662 lines, 9 files) rather than the files changed since gate 1.

Re-review scope: whole branch (cycle 2 refute pass; `SAFETY_REPROBE=false`, because the prior gate's security axis was PASS/measured)

Step 4b ran over the three changed orchestrator `SKILL.md` files, under bash and zsh. The first run reported `execution-failure` on the one runnable block, `cat .agents/skills/<skill>/SKILL.md`. That was a harness seeding error: the temp copy had no `.agents/` tree. Re-run with `--copy-as skills/<skill>:.agents/skills/<skill>`, all three had 0 findings (1 runnable, 7 mutating, 1 placeholder, or 0 for develop-bug). Per the rule, a block that fails only because it was seeded at the wrong path is a harness finding, not a prose finding.

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-8-commit.md` (§ Final Implementation Report Update) — **CR2-1.** Step 8 writes its own row `✅ Done` before `/commit-changes`, the push and the Completion Checklist. If any of those fails, the error-recovery HALT rule ("commit the report before any halt") commits the report with Step 8 ✅. A PreCompact pause inside Step 8 does the same: the hook *prints* "Pipeline Progress for this step is now `⏸️ Paused`" (`develop-pipeline-on-precompact.sh:188`) but never edits the row. `develop-pipeline-resume-contract.md` says "Steps 2 and 8 do not require artifact verification beyond reading the implementation report", and Context Compression Recovery resumes after "the last ✅ step". A resumed run can therefore skip a commit, push and checklist that never succeeded. Under the old order the row stayed `⏳ Pending` until after the push, and that was the signal. **Provenance: new to this branch.** The reordering introduced it, and it was verified by reading each reader (resume contract, recovery procedure, hook, HALT rule). → The HALT paths inside Step 8 must set the row to `❌ Failed` before committing, and resume must verify a ✅ Step 8 against git (`verify-push-state.sh` scoped to the work item), not the row alone.
- **[low]** `skills/develop-task/SKILL.md` (action 2), and the same text in develop-story and develop-bug — **CR2-2.** The carve-out requires the row to read exactly `✅ Done`, but check 4 admits any ✅-prefixed cell. A `✅ Done (…)` row would pass check 4 and then fail this, with no route out except the post-commit edit task 160 removed. → Use check 4's predicate, and make a mismatch a HALT.

**Pre-existing, routed to future (not gated):** the resume detector sets `recommended_step = LOCK_STEP + 1` when no summary is expected, while the lock records the *pending* step. A run halted at Step 8 is therefore recommended step 9, which is outside 1..8. This is independent of this branch, so the CR2-1 fix must not rely on the detector.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | 71/71 |
| Phase 2: Allowlist check 4 | PASS | Verified | Probe engages, 21/21 |
| Phase 3: Step 8 edits nothing after its commit | CONCERNS | Partial | Reordering is consistent everywhere (CR-1 fixed), but the failure path inside Step 8 now records success (CR2-1) |
| Phase 4: Proof and gates | PASS | Verified | Gates green; CI green |

**Overall Phase Completion**: 3/4 passed, 1 with concerns

---

## Success Criteria Verification

Unchanged from cycle 1, all PASS. The one addition is SC6 (Step 8 ordering): a correct run satisfies checks 3–5 together, but a failed run now reports success (CR2-1).

---

## Breaking Changes Validation

The four documented tightenings are unchanged. The Step 8 ordering change has one undocumented consequence: the failure-path signal is lost (CR2-1). **Assessment:** CONCERNS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**CR2-1**: see New Findings. Tracked in the gate; being fixed in this loop's `/qa-fix` cycle.

### LOW Severity Issues (1)

**CR2-2**: see New Findings.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
Check 4 fails closed on every empty-evidence shape. The resume-signal regression is carried in `top_issues` (CR2-1).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 21 (from `task.160.qa.2.security.run.json` `totals.executed`)
- Re-run on `e299eae7` through `.claude/state/t160-probe-wrapper.mjs#check4Admits`, which runs the shipped block under bash and zsh: 12 hostile rows refused, 9 legitimate rows admitted, verdict `engages`, 0 reproduced.

### Maintainability — PASS
All four restatements agree and are test-held.

---

## Code Review

Independent refute reviewer (Explore, read-only, about 3 minutes), whole branch diff.

**Correctness bugs (2):**
- [medium/medium] `shared/resources/develop-pipeline-step-8-commit.md:21` — the ✅ row written before the commit makes a HALT or pause inside Step 8 read as done on resume. **Verified by QA and entered as CR2-1** (QA's own finding: the reviewer's confidence was medium, so it would not have been auto-promoted)
- [low/medium] `skills/develop-task/SKILL.md:133` — the action-2 exact match `✅ Done` is stricter than check 4. **Entered as CR2-2**

**Cleanups (0).**

**Mutation proofs** (this cycle's fix, `e299eae7`, made during `/qa-fix` against committed tests):

- mutation-proven: develop-bug summary → old order → `develop-bug SKILL.md's Step 8 summary…` → covered
- mutation-proven: develop-bug `Pipeline Progress ✅` re-added after the push → same test → covered
- mutation-proven: develop-story action-2 carve-out removed → `develop-story's Step Transition Protocol…` → covered
- mutation-proven: step-doc description → old order → `the step document's description…` → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Checklist suite (bash + zsh) | PASS, 71/71 |
| CI on `e299eae7` (test, validate, shellcheck, link-check) | PASS |
| Step 4b, three orchestrator SKILL.md files (seeded) | PASS, 0 findings |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/develop-pipeline-step-8-commit.md`, `develop-pipeline-resume-contract.md`, `develop-pipeline-on-precompact.sh`, `pipeline-resume-detector-prompt.md`
- `skills/develop-{task,story,bug}/SKILL.md`
- `shared/resources/tests/step-8-completion-checklist.test.mjs`

### Test Commands Executed
```bash
gh pr checks 499                                            # all pass on e299eae7
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry '.claude/state/t160-probe-wrapper.mjs#check4Admits' --cases-file .claude/state/t160-probe-cases.json --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.160.step-8-check-4-allowlists-finished-rows/task.160.qa.2.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/<skill>/SKILL.md --copy-as skills/<skill>:.agents/skills/<skill> --json   # ×3
```

Standards-named validation: `npm run validate -- skills/<skill>/` for develop-story, develop-task and develop-bug ran in `/qa-fix` (exit 0 each), and CI `validate` passed.

### Coverage Report
Not applicable. The change is prose plus a shell block, covered by execution.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR2-1: make a HALT inside Step 8 leave the row unfinished (`❌ Failed`), and verify a ✅ Step 8 on resume against git.
2. CR2-2: use check 4's predicate for the action-2 confirmation; a mismatch is a HALT.

### Short-term Actions (Non-Blocking)
1. Pre-existing: resume detector `recommended_step = LOCK_STEP + 1` against a lock that records the pending step (named follow-up).
2. Carried: CR-2 (executed ordering test), CR-4 (`LC_ALL=C`), CR-5 (commit-hash field).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: cycle 1's finding is fixed; the refute pass found a medium consequence of the reordering on the failure path.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR2-1 and CR2-2 fixed

---

**QA Report**: co-located at `task.160.qa.2.step-8-check-4-allowlists-finished-rows.md`
**Gate File**: co-located at `task.160.gate.2.step-8-check-4-allowlists-finished-rows.yml`
**Next Steps**: `/qa-fix` for CR2-1 and CR2-2, then re-review
