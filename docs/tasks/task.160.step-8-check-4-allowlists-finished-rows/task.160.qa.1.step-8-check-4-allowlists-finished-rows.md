# QA Report: Task 160 - Step 8 check 4 allowlists finished rows instead of denying two unfinished ones

**Task**: [task.160.step-8-check-4-allowlists-finished-rows.md](./task.160.step-8-check-4-allowlists-finished-rows.md)
**Gate File**: [task.160.gate.1.step-8-check-4-allowlists-finished-rows.yml](./task.160.gate.1.step-8-check-4-allowlists-finished-rows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-27
**Testing Completed**: 2026-09-27
**Gate Status**: CONCERNS

---

## Executive Summary

The check 4 allowlist does what the task says, and the evidence is measured rather than read. The probe engine ran the shipped block under bash and zsh on 21 rows: every hostile row was refused and every legitimate row admitted. The checklist suite passes 64/64, and CI is green on the PR head. One medium finding holds the gate at CONCERNS. The task moved Step 8's Pipeline Progress update to before the commit, but four other places still say it happens after the push.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete; status `ready-for-review`
- [x] All 4 implementation phases ticked
- [x] Tests passing (64/64 checklist suite; CI `test` green on `937220e8`)
- [x] Breaking changes documented (§ 5, four tightenings)
- [x] Code on feature branch with open PR #499

### Testing Approach

- [x] Automated Testing (executed checklist block, bash + zsh)
- [x] Regression Testing (CI suite on the PR head)
- [x] Security Review (probe engine, measured)
- [x] Code Review (independent read-only reviewer, Step 3b)

### Review Methodology

Direct tools, plus one independent read-only reviewer for Step 3b. This is a first review (no prior gate), in standard mode, and the task is a single-module prose/shell change. The traceability matrix came from the pipeline mapper (`.summaries/qa-traceability-matrix.md`): 18 criteria, 7 full, 7 partial and 4 none. The "none" rows are gate commands and the CHANGELOG, which are checked below.

Step 4b ran over `shared/resources/develop-pipeline-step-8-commit.md` under bash and zsh. It found 5 blocks and refused all 5 as `mutating`. The result was `no-executable-blocks`, which is informational: the file documents commit, push and cleanup commands. The Completion Checklist block that this task changes is executed directly by `step-8-completion-checklist.test.mjs`, which is stronger evidence than Step 4b.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | 21 new tests; 23 of 64 were red before the change |
| Phase 2: Allowlist check 4 | PASS | Verified | Header-located allowlist; `!col { next }` and fail-closed `\|\|` present; 3 copies re-bundled |
| Phase 3: Step 8 edits nothing after its commit | CONCERNS | Partial | Step 8 body is correct; four restatements elsewhere still prescribe a post-push update (CR-1) |
| Phase 4: Proof and gates | PASS | Verified | 8 mutation proofs recorded; CHANGELOG entry present; gates green |

**Overall Phase Completion**: 3/4 passed, 1 with concerns

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Finished shapes pass (bash, zsh) | pass | pass: finished-shapes case, plus probe cases `bare-tick`, `detail`, `tick-skipped`, `skip-fe0f`, `skip-bare`, `padded`, `crlf-done` | PASS |
| Unfinished shapes fail and name the row | fail + row printed | fail + row printed, other rows not printed | PASS |
| Bug variant uses the header lookup | unfinished fails, finished passes | as stated | PASS |
| Header-only table fails | `no step rows under the header` | as stated | PASS |
| No Status column fails | `no Status column in the header row` | as stated | PASS |
| Step 8 row set before its commit passes | pass | pass | PASS (see CR-2: the case cannot fail on the order) |
| Existing cases still pass | all | 64/64 | PASS |
| Performance | no change | one awk pass | PASS |
| Mutation proofs | each named case red | M1 to M8 recorded | PASS |
| Gates | green | ci:fast, lint:shell, bundle:check, check:generated, validate ×3; CI green | PASS |
| CHANGELOG | cites task 160, four tightenings | present | PASS |

---

## Breaking Changes Validation

### Breaking Change: rows at ❌ / ⚠️ / 🔄 / ⏸️ Skipped / empty now fail
Documented: Yes · Migration Path Provided: Yes · Migration Tested: Yes (the failure message prints the row) · Consumer Code Updated: N/A

### Breaking Change: header-only table fails
Documented: Yes · Migration Path Provided: Yes (none needed for template-built reports) · Migration Tested: Yes

### Breaking Change: table with no Status column fails
Documented: Yes · Migration Path Provided: Yes · Migration Tested: Yes

### Breaking Change: Step 8 no longer writes `Committed in {hash}`
Documented: Yes · Migration Path Provided: Yes · Consumer Code Updated: **Partial**. Four restatements still describe a post-push update (CR-1)

**Overall Breaking Changes Assessment:** CONCERNS (CR-1)

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: Step 8's post-push Pipeline Progress update is still prescribed in four places (CR-1)**
- **Severity**: MEDIUM
- **Category**: Quality (documentation drift in runnable prose)
- **Observation**: `shared/resources/develop-pipeline-step-8-commit.md` line 3 (frontmatter `description`), `skills/develop-task/SKILL.md:232`, `skills/develop-story/SKILL.md:245` and `skills/develop-bug/SKILL.md:244` still list "final push, Pipeline Progress update/✅, lock removal". Step Transition Protocol action 2 in each orchestrator also edits the just-completed row after Step 8 returns, with no Step 8 carve-out. The provenance is this branch: on `develop` those summaries agreed with the step body.
- **Impact**: an orchestrator that follows the summary edits the report after the Step 8 commit. Check 5 then fails, or the edit is left out of the commit, which is the defect Phase 3 set out to remove.
- **Recommendation**: correct the four restatements, add an N=8 note to action 2, and widen the prose guard test to scan them.
- **Bug Report**: none filed separately. The finding is tracked in the gate's `top_issues` and is being fixed in this loop's `/qa-fix` cycle.

### LOW Severity Issues (4, advisory — code review)

- CR-2, CR-3, CR-4, CR-5: see Code Review below.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4

---

## NFR Assessment

### Performance — PASS
One awk pass over the table rows.

### Reliability — PASS
The check fails closed on no table, no Status column, no step rows and an awk runtime error. M6 and M7 prove the last two.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 21 (copied from `task.160.qa.1.security.run.json` `totals.executed`)
- Check 4 is a boundary, because its refusal is what stops the completion banner. No engine entry form reaches a fenced block, so it was probed through a one-argument wrapper (`.claude/state/t160-probe-wrapper.mjs#check4Admits`). The wrapper reads the **shipped** block from the source on every call and runs it under bash and zsh, throwing on any disagreement. The 12 hostile rows were `❌ Failed`, `⚠️ Needs Attention`, `🔄 Cycle 3`, `⏸️ Skipped`, an empty cell, `⏳ Pending`, `⏸ Paused`, `not ✅ Done`, `⏭️ Skipped but failed`, a row with no Status cell, a tab-padded Pending and a CRLF Failed. All 12 were refused. The 9 legitimate rows were all admitted. Verdict `engages`; 0 reproduced.

### Maintainability — PASS
Each load-bearing line has a comment, and there is one authored source with three generated copies. The drift finding is carried in `top_issues` (CR-1).

---

## Code Review

An independent read-only reviewer ran over the 517-line branch diff (`docs/tasks` excluded). It ran the awk under BSD awk in bash and zsh, in UTF-8, C, POSIX and Latin-1 locales, against CRLF, tab, trailing-whitespace, empty and extra-selector cells, and across 126 committed completed reports. 15 of those reports fail the new check, and every one already fails the old deny-list. gawk and mawk are not installed on this host, so neither was run.

**Correctness bugs (4):**
- [medium/high] `shared/resources/develop-pipeline-step-8-commit.md:3` and three `SKILL.md` summaries: a post-push Pipeline Progress update is still prescribed. **Promoted to gate `top_issues` as CR-1** (`code_review_blocking=true`)
- [low/medium] `shared/resources/tests/step-8-completion-checklist.test.mjs` (the ordering case): it commits a fully finished report, so it is equivalent to the finished-report case and cannot fail on the order. Add the negative case or rename it (CR-2, advisory)
- [low/medium] the same test file (the prose guard): it is a deny-list of two exact phrases in one slice of one file (CR-3, advisory)
- [low/low] `shared/resources/develop-pipeline-step-8-commit.md` (the allowlist line): under a Latin-1 locale, `[^|[:alnum:]]*` counts the U+FE0F lead byte as alnum, so `⏭️ Skipped` is refused. This fails closed. Pin `LC_ALL=C` (CR-4, advisory)

**Cleanups (1):**
- `shared/resources/develop-pipeline-step-8-commit.md` (§ Invoke /commit-changes): the text says to report the hash in the Phase 2 completion output, but those templates have no commit field (CR-5)

**Mutation proofs** (made in Step 3 of this run against committed tests; not re-run independently in this cycle, which fixed nothing):

- mutation-proven: allowlist → deny-list → `❌ Failed` case → covered
- mutation-proven: `^✅` → exact `✅ Done` → finished-shapes case → covered
- mutation-proven: drop `⏭` clause → finished-shapes case → covered
- mutation-proven: header lookup → `col = 2` → Bug-variant case → covered
- mutation-proven: drop `no step rows` branch → header-only case → covered
- mutation-proven: drop `!col { next }` → no-Status-column case → covered
- mutation-proven: drop guard + fail-closed `||` → no-Status-column case → covered
- mutation-proven: re-add the post-push update line → prose guard → covered (CR-3 limits what this guard can see)

---

## Regression Testing

| Area | Result |
| --- | --- |
| Step 8 checklist checks 1, 2, 2b, 3, 5 (task.147 cases) | PASS |
| Step 8 check 4 task.159 cases (pause prose, Notes cells, no table) | PASS |
| Whole suite (CI `test` on `937220e8`) | PASS |
| Bundled copies (`bundle:check`) | PASS |
| Corpus: 123 committed completed reports | 17 refused by both old and new checks; 0 newly refused |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/develop-pipeline-step-8-commit.md` and its 3 bundled copies
- `shared/resources/tests/step-8-completion-checklist.test.mjs`
- `CHANGELOG.md`
- `skills/develop-{task,story,bug}/SKILL.md` (Step 8 summaries, for CR-1)

### Test Commands Executed
```bash
command node --test shared/resources/tests/step-8-completion-checklist.test.mjs   # 64/64
gh pr checks 499                                                                   # test, validate, shellcheck, link-check: pass
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-8-commit.md --json   # no-executable-blocks
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry '.claude/state/t160-probe-wrapper.mjs#check4Admits' --cases-file .claude/state/t160-probe-cases.json --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.160.step-8-check-4-allowlists-finished-rows/task.160.qa.1.security.run.json --json   # engages, 21 executed
```

Standards-named validation (`npm run validate -- skills/<skill>/` for develop-story, develop-task, develop-bug) ran in Step 3 of this run (exit 0 each), and CI `validate` passed on the PR head.

### Coverage Report
Not applicable. The change is a shell block in prose, covered by execution.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1: correct the four post-push Pipeline Progress restatements, add the N=8 carve-out to action 2, and widen the prose guard.

### Short-term Actions (Non-Blocking)
1. CR-2: add the negative ordering case.
2. CR-4: pin `LC_ALL=C` on the check-4 awk.
3. CR-5: give the hash a named field in the Phase 2 completion output, or drop the sentence.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the core change is correct and the evidence is measured. One medium drift finding in the documents that restate Step 8 contradicts the ordering this task introduced.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed

---

**QA Report**: co-located at `task.160.qa.1.step-8-check-4-allowlists-finished-rows.md`
**Gate File**: co-located at `task.160.gate.1.step-8-check-4-allowlists-finished-rows.yml`
**Next Steps**: `/qa-fix` for CR-1, then re-review
