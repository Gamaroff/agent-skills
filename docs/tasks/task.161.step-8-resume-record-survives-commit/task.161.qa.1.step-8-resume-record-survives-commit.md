# QA Report: Task 161 - Step 8 keeps its resume record until the Completion Checklist passes

**Task**: [Link to task document](./task.161.step-8-resume-record-survives-commit.md)
**Gate File**: [task.161.gate.1.step-8-resume-record-survives-commit.yml](./task.161.gate.1.step-8-resume-record-survives-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-27
**Testing Completed**: 2026-09-27
**Gate Status**: CONCERNS

---

## Executive Summary

This first review covered the whole branch diff (`origin/develop...0f2e0e0c`). All four phases are delivered, the suite is green, and every new guard was mutation-proven. The independent diff reviewer found one defect that this change introduces: on a host with no `jq`, `advance-pipeline-lock.sh --complete` exits at its jq gate before its own arm. Cleanup's `rm -f` used to cover that, and it is gone, so the lock is never removed there and Step 8 cannot pass (CR-1, medium, high confidence).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix CR-1)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4, all checkboxes ticked)
- [x] Tests passing
- [x] Breaking changes documented (none to an interface; the lock's longer lifetime is described in § 5)
- [x] Code on feature branch with open PR (#501, OPEN)

### Testing Approach

- [x] Automated Testing (unit, integration: executed-prose tests under bash and zsh)
- [x] Regression Testing (full `ci:fast`)
- [x] Security Review (boundary analysis; reasoned)
- [x] Code Review (independent Explore subagent, Step 3b)

### Review Methodology

Direct tools, plus one read-only Explore subagent for the diff code review. The task has 4 phases across several modules, and the default "direct tools first" strategy applied. The reviewer ran over the full branch diff with the regenerated `skills/*/references/` copies excluded; `npm run bundle:check` shows those are byte-identical to their sources. First review, so there is no re-review scope line.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The lock survives the Step 8 commit | CONCERNS | Verified | `commit-changes` arm is a no-op. The checklist runs checks 2–5, then `--complete`, then check 1, and Cleanup keeps the lock. Stop hook step-8 reason and the hooks reference are updated. **CR-1:** `--complete` is gated on `jq` |
| Phase 2: A Step 8 HALT is resumable | PASS | Verified | HALT-at-8 snapshot, failing-checklist-keeps-lock, and `--restore` reads 8, each run under bash and zsh |
| Phase 3: Resume names step 8 | PASS | Verified | Detector clamp. Resume contract asides removed. CR-2 order and CR-1 lines in all three orchestrators. Two population tests |
| Phase 4: Proof and gates | PASS | Verified | Five dev-time mutations, plus one more this cycle (below); gates green; CHANGELOG entry present |

**Overall Phase Completion**: 4/4 delivered; 1 with a finding

---

## Success Criteria Verification

**Functional:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `--skill commit-changes` at step 8 leaves the lock | exit 0, lock at 8 | `advance-pipeline-lock.test.sh` scenario 4 | PASS |
| Checklist removes the lock only via `--complete` after checks 2–5 | yes | "a passing checklist removes the lock at step 8 through --complete" [bash, zsh] | PASS (on a host with jq; see CR-1) |
| A failing checklist keeps the lock at 8 | yes | "a failing checklist exits before --complete and the lock stays at 8" [bash, zsh] | PASS |
| HALT at 8 snapshots `halt_step` 8 | bash + zsh | "a Step 8 HALT after /commit-changes snapshots halt_step 8, and --restore reads 8" | PASS |
| Detector recommends 8, never 9 | no row yields 9 | "the resume detector recommends 8, never 9" | PASS |
| Every generic Pipeline Progress update carries the Step 8 exception | floor 3 | population test, floor 6 | PASS |
| Recovery exception precedes the items it overrides | 3 orchestrators | "Context Compression Recovery re-runs Step 8…" ×3 | PASS |
| Stop hook step-8 reason names the checklist; hooks doc says step 8 is guarded | yes | on-stop test ×3 orchestrators | PASS (wording, see CR-2) |
| Every `--complete` mention names the checklist | floor 6 | population test | PASS |

**Code Quality / Migration:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `ci:fast` with `.agents/skills` aside | 0 fail | 4331 pass / 0 fail / 1 skipped (4332) | PASS |
| `lint:shell`, `bundle:check`, `check:generated` | exit 0 | exit 0 each | PASS |
| `validate` for commit-changes, develop-{task,story,bug} | exit 0 | exit 0 each | PASS |
| Phase 4 mutations red under bash, restored by `cmp` | all | 5/5 dev-time, plus M6 this cycle | PASS |
| CHANGELOG `[Unreleased]` cites (task 161) | yes | present | PASS |
| Step-8 doc no longer names the post-commit gap | yes | "What it does not cover" gone (asserted) | PASS |

---

## Breaking Changes Validation

### Breaking Change: the lock outlives the Step 8 commit

- Documented: Yes (§ 5)
- Migration Path Provided: N/A (no interface change)
- Migration Tested: the population check is recorded in the implementation report, and 34 readers are classified
- Consumer Code Updated: Yes (the Stop hook text and the hooks reference)
- Notes: a newer helper with an older orchestrator keeps a lock after Step 8, because the old doc's Cleanup `rm` still removes it. That combination is safe.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: `--complete` cannot remove the lock on a host with no `jq` (CR-1)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: none filed. The finding is carried in the gate's `top_issues[]` for `/qa-fix`, the develop pipeline's code-review-and-fix route.
- **Observation**: `advance-pipeline-lock.sh` checks for `jq` (lines 133–136) and exits 0 with "jq not installed; cannot advance lock" **before** the `--complete` arm. Reproduced with `jq` masked off PATH: exit 0, and the lock is still present.
- **Provenance**: new with this change. On `origin/develop` the same gate existed, but Step 8 Cleanup ended with `rm -f .claude/state/develop-pipeline.lock`, which removed the lock whatever the helper did. This diff deletes that line and makes `--complete` the only remover.
- **Impact**: on a jq-less host, check 1 fails every time ("lock file still present"), Step 8 never passes, and the next run's Step 1 halts on a lock collision.
- **Recommendation**: handle `--complete` before the jq gate. It needs no parse, and the `require_parsable_lock` comment already says `--complete` is exempt. Add a test with `jq` off PATH.
- **Priority**: P1

### LOW Severity Issues (2, advisory)

- **CR-2** (`develop-pipeline-on-stop.sh`, the step-8 completion line): it says unconditionally that "Step 8's row is already ✅". The lock reads 8 from the end of `/finalise`, so a stop during Step 7's tail, or before Step 8's report update, is told to skip the report update. Checks 3 and 4 would catch that, but only after a failed round. Recommended to fix alongside CR-1: make the sentence conditional.
- **CR-3** (cleanup, `advance-pipeline-lock.sh` `commit-changes` arm): the arm is a no-op, but it still parses the lock to print `current_step`, so a corrupt lock makes it exit 1.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
One `--complete` call added and one `rm` removed. No loop or I/O added.

### Reliability — CONCERNS
CR-1 (jq-less host) and CR-2 (the Stop hook wording in the window between `/finalise`'s advance and Step 8's report update). The rollback plan is unchanged and valid.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The predicate-shaped code the diff touches, and the signal each lacks:
  - the `commit-changes` arm: its only decision is removed, and it now refuses nothing;
  - the Stop hook's `elif [ "$NEXT" = "8" ]`: it selects a message, and nothing is accepted or rejected on it;
  - the Completion Checklist's checks 2–5: their predicates are unchanged, and only the placement of `--complete` moves (its order is executed by the new tests).
- No input parsing, secrets or authorization are touched.

### Maintainability — PASS
Two population tests and a detector guard replace named-line checks. Each carries a non-vacuity floor.

---

## Code Review

Independent read-only Explore subagent over the full branch diff: 19 files, bundled copies excluded. It returned in 2 min 13 s. `code_review_blocking` resolved **true** (pipeline override, and there is no per-doc `false`).

**Correctness bugs (2):**
- [medium/high] `shared/resources/develop-pipeline-step-8-commit.md:257` (root in `shared/resources/advance-pipeline-lock.sh:133`): `--complete` is gated on `jq`, so with Cleanup's `rm` removed a jq-less host never removes the lock → handle `--complete` before the jq gate and test with `jq` off PATH. **Promoted to gate `top_issues[]` as CR-1.**
- [low/medium] `shared/resources/develop-pipeline-on-stop.sh:147`: the step-8 line asserts the row is already ✅, which is false before Step 8's report update → make it conditional. Advisory (CR-2).

**Cleanups (1):**
- `shared/resources/advance-pipeline-lock.sh:396`: the no-op arm still runs `require_parsable_lock` → print a fixed line or read best-effort (CR-3).

**Step 3c — mutation proofs:**

- mutation-proven: restore Cleanup's `rm -f .claude/state/develop-pipeline.lock` (M6) → `halt-snippet-glob-safe` F1 [bash, zsh] and "the Step 8 commit and Cleanup leave the record" [bash] red → covered
- Dev-time proofs M1–M5 (recorded in the implementation report) → covered:
  - M1: arm `rm` restored → `advance-pipeline-lock.test.sh` + HALT-at-8 test
  - M2: `--complete` above check 4 → failing-checklist test
  - M3: detector clamp dropped → detector guard
  - M4: a CR-1 suffix dropped → population test
  - M5: Stop-hook generic line restored → on-stop test

**Step 4b — execute the documented commands.** The engine ran over all 9 changed prose files. First pass: 6 `execution-failure` findings in three files. All were harness seeding misses in blocks this diff did not change: `cat .agents/skills/<skill>/SKILL.md` in the three orchestrators, and `cat .claude/state/develop-pipeline.lock` in the detector prompt. The rerun seeded those paths with `--copy-as skills:.agents/skills` and a lock copy at `.claude/state`. After that, each file's 1 runnable block passed under bash and zsh, with 0 findings.

Every block the diff did change was refused as `mutating`:

| File | Line | Block | Reason |
| --- | --- | --- | --- |
| step-8 doc | L120 | Cleanup | `rm` |
| step-8 doc | L176 | Checklist | `rm` |
| develop-task | L296 | HALT | `rm` |
| develop-story | L309 | HALT | `rm` |
| develop-bug | L313 | HALT | `rm` |

These are executed instead by the new tests, which cut them by anchor and run them in fixture repos under bash and zsh. The other refusals were `bash`/`node`/`gh`/`git add`/`git push` or write redirections. Placeholders: detector L129 and L190; develop-task L75; develop-story L80; several in the resume contract. zsh available.

---

## Regression Testing

- `ci:fast` (format + every per-skill suite + evals): 4331 pass / 0 fail.
- The first `ci:fast` run (development) had 9 failures, and both causes were fixed before commit:
  - 8 were `halt-snippet-glob-safe` F1–F4, which pinned the old Cleanup;
  - 1 was `bundle-comment-origin` §2.
- `develop-pipeline-on-stop.test.sh` 35/0, `develop-pipeline-on-precompact.test.sh` in the suite, and `advance-pipeline-lock.test.sh` 92/0.

---

## Test Artifacts

### Files Reviewed
`advance-pipeline-lock.sh`, `develop-pipeline-on-stop.sh`, `develop-pipeline-step-8-commit.md`, `develop-pipeline-hooks.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-resume-contract.md`, `pipeline-lock-cooperation.md`, `skills/{commit-changes,develop-task,develop-story,develop-bug}/SKILL.md`, and the 4 test files.

### Test Commands Executed
```bash
mv .agents/skills .agents/skills.aside && npm run ci:fast; mv .agents/skills.aside .agents/skills   # 4331/0
npm run lint:shell && npm run bundle:check && npm run check:generated                             # 0/0/0
npm run validate -- skills/{commit-changes,develop-task,develop-story,develop-bug}/                # 0 each
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --json
PATH=<dir without jq> PIPELINE_LOCK=<tmp>/lock bash shared/resources/advance-pipeline-lock.sh --complete   # CR-1 repro: rc 0, lock present
```

### Coverage Report
Not applicable: shell and prose. Coverage is by executed-prose tests and population tests with floors.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1: `--complete` must remove the lock without `jq`.

### Short-term Actions (Non-Blocking)
1. CR-2: make the Stop hook's step-8 sentence conditional (cheap; fix alongside CR-1).
2. CR-3: drop the parse from the no-op `commit-changes` arm.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium, high-confidence correctness bug that this change introduces. Everything else passes.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed.

---

**QA Report**: co-located at `task.161.qa.1.step-8-resume-record-survives-commit.md`
**Gate File**: co-located at `task.161.gate.1.step-8-resume-record-survives-commit.yml`
**Next Steps**: `/qa-fix` (cycle 1) for CR-1, with CR-2 and CR-3 alongside; then re-review.
