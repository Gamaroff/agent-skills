# QA Report: Task 160 - Step 8 check 4 allowlists finished rows instead of denying two unfinished ones (cycle 6)

**Task**: [task.160.step-8-check-4-allowlists-finished-rows.md](./task.160.step-8-check-4-allowlists-finished-rows.md)
**Gate File**: [task.160.gate.6.step-8-check-4-allowlists-finished-rows.yml](./task.160.gate.6.step-8-check-4-allowlists-finished-rows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-27
**Testing Completed**: 2026-09-27
**Gate Status**: PASS

---

## Executive Summary

This cycle was granted to gate `c3a2bd6f`, the cycle-5 fix that no gate had read. All four cycle-5 findings are fixed. The two that change behaviour are held by tests that go red under mutation. The independent reviewer raised two low items. Neither is a high-confidence bug, and both are recorded as advisory. Check 4, the core deliverable, is still measured correct: the probe engages on 21 of 21 cases.

**Overall Assessment**: PASS · **Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR5-1 (medium): the step-8 rule could skip an unfinished Step 7 | FIXED | In the resume contract Phase 0b, "the Step 8 row is not evidence", resume starts from the first unfinished row, and "an unfinished Step 7 row still wins". The premise (`/finalise` moves the lock from 7 to 8) is executed by a test, and mutating `finalise) NEXT=8` turns it red |
| CR5-2 (medium): a surviving lock at 8 was not named | FIXED | The contract says "whether it survived or was restored". All 3 SKILL.md exceptions say "surviving or restored". Guarded |
| CR5-3 (low): the HALT sentence was false for a lint-failed HALT | FIXED | The step-8 doc now says a HALT whose report fails lint skips the commit, keeps its lock at 8, and is resumable |
| CR5-4 (low): step-0 had no pointer to the rule | FIXED | Shared Resume Logic now reads "Except the Step 8 row: … develop-pipeline-resume-contract.md". Guarded |

---

## Testing Scope

### Review Methodology

Direct tools, plus one independent read-only reviewer (Explore, about 2.5 minutes, 24 tool calls).

Re-review scope: since 2026-09-27T15:01:36Z (default; gate.5's `updated:` was checked against `date -u`). 28 files, a 1895-line diff (`c3a2bd6f` plus `36c42825`, the report). The file list was built as a bash array.

Step 4b ran under bash and zsh with 0 findings in every file:
- The three orchestrator `SKILL.md` files, seeded with `--copy-as skills/<s>:.agents/skills/<s>`: 1 runnable block each.
- `develop-pipeline-resume-contract.md`: 2 runnable.
- `develop-pipeline-step-0-resolve-and-prepare.md`: 3 runnable, with `--bind EPIC_REF/EPIC_NUM/INPUT` and `--copy-as docs:docs`. Unbound, it reported `zero-blocks-executed`. That was an under-configured run, not a prose finding: the three placeholder blocks are develop-story resolution blocks this diff does not touch.
- `develop-pipeline-step-8-commit.md`: `no-executable-blocks`, informational.

---

## New Findings This Cycle

- **[low/medium, advisory] CR6-1** at `shared/resources/develop-pipeline-step-8-commit.md:101`. Step 8 says to report the final commit hash in the Phase 2 completion output, but none of the three Phase 2 templates has a Commit field. Verified by reading. It was introduced in `937220e8` (this branch), not by this cycle. → Add a `Commit:` line to the three templates, or drop the instruction. Moved to recommendations.future.
- **[cleanup] CR6-2** at `shared/resources/tests/step-8-completion-checklist.test.mjs:809`. The "row set ✅ before its own commit" case overlaps the finished-report case and would still pass if the order were reversed. The prose guard beside it is what holds the ordering. → Replace it with the negative case.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Tests first | PASS | Suite green |
| Phase 2: Allowlist check 4 | PASS | Probe engages 21/21 |
| Phase 3: Step 8 edits nothing after its commit | PASS | The resume rule is now scoped to the Step 8 row (CR5-1..4 fixed) |
| Phase 4: Proof and gates | PASS | `ci:fast`, `lint:shell`, `bundle:check`, `check:generated`, validate ×3 and CI are green |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC1–SC6 check-4 behaviour | PASS | Executed cases in the checklist suite under bash and zsh; probe 21/21 |
| SC7 existing cases still pass | PASS | `ci:fast`: 4322 pass, 0 fail, 1 skipped |
| SC8 performance | PASS | One awk pass, unchanged |
| SC9 mutation proofs | PASS | Earlier cycles' proofs, plus two this cycle (below) |
| SC10 gates | PASS | `ci:fast` (with `.agents/skills` moved aside), `lint:shell`, `bundle:check` and `check:generated` all exit 0 |
| SC11 validate | PASS | `npm run validate -- skills/develop-{task,story,bug}/` all exit 0 |
| SC12 CHANGELOG | PASS | Unchanged since gate.1 |

---

## Breaking Changes Validation

None. Check 4 admits every finished shape the templates produce.

---

## Issues Found

HIGH: 0 · MEDIUM: 0 · LOW: 1 (CR6-1, advisory) · cleanup: 1 (CR6-2)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
The resume rule no longer skips an unfinished Step 7. The pre-existing post-commit window (`a284dfdd`) is outside this task and is filed as task.161.
### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 21 (from `task.160.qa.6.security.run.json` `totals.executed`)
### Maintainability — PASS

---

## Code Review

**Correctness bugs (1):**
- [low/medium] `shared/resources/develop-pipeline-step-8-commit.md:101`. The final commit hash is to be reported in the Phase 2 output, but no template has a field for it. → Add `Commit:` to the three templates (CR6-1, advisory)

**Cleanups (1):**
- `shared/resources/tests/step-8-completion-checklist.test.mjs:809`. The before-commit case does not discriminate the ordering. → Use the negative case (CR6-2)

None was promoted to `top_issues`, because neither is a high-confidence bug.

**Mutation proofs (cycle-5 fix, bash, `cp` snapshot, restore checked with `cmp`):**
- mutation-proven: contract "an unfinished Step 7 row still wins" → "Step 7 is ignored" → `the step document names the resume record, not the row or git, as Step 8's evidence` red → covered (a prose guard)
- mutation-proven: `advance-pipeline-lock.sh` `finalise) NEXT=8` → `NEXT=7` → `finalise's lock cooperation moves the record to step 8 before Step 7's tail runs` red → covered (executed)

The baseline was green before and after both mutations, and `git status` for both files was clean afterwards.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`ci:fast`) | PASS: 4322 pass, 0 fail |
| CI on `36c42825` | PASS (test, validate, shellcheck, link-check, branch policy) |

---

## Test Artifacts

### Test Commands Executed
```bash
bash scope.sh qa6-review.diff    # array-built scoped diff since gate.5
mv .agents/skills .agents/skills.aside && npm run ci:fast; mv .agents/skills.aside .agents/skills
command node skills/qa-task/references/security-probe.mjs --sink filename --entry '.claude/state/t160-probe-wrapper.mjs#check4Admits' --cases-file .claude/state/t160-probe-cases.json --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.160.step-8-check-4-allowlists-finished-rows/task.160.qa.6.security.run.json --json
command node skills/qa-task/references/qa-execute-snippets.mjs --file skills/<s>/SKILL.md --copy-as skills/<s>:.agents/skills/<s> --json
command node skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-0-resolve-and-prepare.md --bind EPIC_REF=1 --bind EPIC_NUM=1 --bind INPUT=498 --copy-as docs:docs --json
npm run validate -- skills/<s>/; npm run lint:shell; npm run bundle:check; npm run check:generated
gh pr checks 499
```

### Coverage Report
Not applicable. This change is prose and shell run by the test harness.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. task.161: the pre-existing Step 8 post-commit resume gap
2. CR6-1: add a Commit field to the three Phase 2 templates
3. CR6-2: replace the non-discriminating before-commit case

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Deployment**: APPROVED

---

**QA Report**: co-located at `task.160.qa.6.step-8-check-4-allowlists-finished-rows.md`
**Gate File**: co-located at `task.160.gate.6.step-8-check-4-allowlists-finished-rows.yml`
**Next Steps**: 5c `/review-pr`
