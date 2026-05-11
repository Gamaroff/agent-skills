---
id: task.34.develop-story-evals
title: "Build evals for develop-story pipeline (mirrors develop-task + epic-branch + resume coverage)"
status: accepted
type: task
category: testing
priority: medium
assignee: gamaroff
effort_estimate: 2d
created: 2026-05-11
completed_date: 2026-05-11
github_issue: 69
pr_number: 72
depends_on: task.33.develop-task-evals
---

# Task 34: Build evals for develop-story pipeline

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.34.review.develop-story-evals.md` implemented 2026-05-11
**Created:** 2026-05-11
**Category:** testing
**Priority:** Medium
**Assignee:** gamaroff
**Effort:** 2d
**Depends on:** task.33

## 1. Overview

Mirror the develop-task eval suite (task.33) for the `develop-story` pipeline, plus story-specific coverage that develop-task doesn't have: epic branch creation rules (Step 1a `create-epic-branch`, defined in `shared/resources/develop-pipeline-step-1-create-branch.md`), PR base-branch targeting (epic branch, not develop), and a resume-mid-loop scenario. Reuses the shared infra built in task.33 (`git-sandbox`, `gh-sandbox`, `pipeline-recorder`) — no new shared modules required.

**Key deliverables:**
- `evals/develop-story/protocol/` — structural assertions on `SKILL.md` + step files (extends task.33 protocol patterns)
- `evals/develop-story/step-isolation/` — one scenario per pipeline step (00-08, includes create-epic-branch)
- `evals/develop-story/smoke/` — happy-path end-to-end + resume-mid-loop scenario
- `evals/develop-story/assertions.mjs` — story-specific: `prTargetsEpicBranch`, `epicBranchExists`, `resumeRehydrated`
- `evals/develop-story/README.md`

**Expected outcome:** running `npm run eval:develop-story` (deterministic) catches story pipeline drift; `npm run eval:develop-story:smoke` (opt-in) covers full happy path + resume.

## 2. Motivation

### Current Problems

- develop-story has zero automated coverage — same situation develop-task was in pre-task.33
- develop-story has subtleties develop-task doesn't have:
  - **Epic branches**: Step 1a (`create-epic-branch`, in `shared/resources/develop-pipeline-step-1-create-branch.md`) creates `feature/epic.{n}.{name}` from develop on first story; subsequent stories branch from there. (Note: Phase 0d in `develop-story/SKILL.md` is the upfront-prompts step — Q1 base + Q2 PR target — not epic-branch creation.)
  - **PR base targeting**: story PRs target the epic branch, not develop — easy to silently regress
  - **Resume**: mid-loop kill must restore state from artefact; richer surface than develop-task's resume
- These three behaviours are exactly the ones a casual contributor would break without realizing
- Without evals, the only signal is a user opening `/develop-story` and discovering broken behaviour mid-flow

### Benefits of Solution

- Closes the coverage gap left after task.33 — both develop-* pipelines have automated guards
- Catches the most likely regression (PR base = develop instead of epic branch) before merge
- Documents the epic-branch contract explicitly via assertions, not just prose
- Reuses shared infra from task.33 — fast to author (~2d vs 3d for task.33)
- Resume scenario doubles as documentation for how resume should work (executable spec)
- Aligns develop-story with the per-skill eval ownership model

## 3. Technical Background

### Current Architecture (no evals)

```
skills/develop-story/
├── SKILL.md          # 9 steps; Phase 0d = upfront prompts (Q1 base + Q2 PR target), NOT epic branch
├── README.md
└── scripts/
shared/resources/
├── develop-pipeline-step-0-resolve-and-prepare.md
├── develop-pipeline-step-1-create-branch.md   # Step 1a (create-epic-branch) + Step 1b (story branch off epic)
├── develop-pipeline-step-3-develop-loop.md
├── develop-pipeline-step-5-6-qa-loop.md
└── develop-pipeline-resume-contract.md         # resume invariants
```

### Target Architecture

```
evals/develop-story/
├── README.md
├── assertions.mjs                 # prTargetsEpicBranch, epicBranchExists, resumeRehydrated
├── protocol/
│   ├── pipeline-shape.test.mjs    # 9 steps in correct order; SKILL.md description references create-epic-branch
│   ├── epic-branch-rules.test.mjs # parses shared/resources/develop-pipeline-step-1-create-branch.md
│   └── step-contract.test.mjs
├── step-isolation/
│   ├── 00-create-epic-branch/     # only-if-missing logic + base = develop
│   ├── 01-create-story-branch/    # always from epic branch
│   ├── 02-review-story/
│   ├── 03-develop-loop/
│   ├── 04-create-pr/              # --base = epic branch, NOT develop
│   ├── 05-qa-story/
│   ├── 06-qa-fix/
│   ├── 07-finalise/
│   └── 08-commit-changes/
└── smoke/
    ├── 01-end-to-end-dry/         # full happy path
    └── 02-resume-mid-loop/        # kill mid-qa-fix, resume, verify state restored
```

### Resume Scenario Design

Smoke runner starts the pipeline, sends `SIGINT` after a known artefact write (e.g., qa-fix iteration 2 complete), then re-invokes `/develop-story` on the same story. Asserts:
- Resume detector fires
- State rehydrates from `.develop-state/` artefacts
- Loop continues from iteration 3, not from scratch
- Final state matches a fresh-run baseline

## 4. Scope

### In Scope

- ✅ Protocol checks for develop-story SKILL.md + relevant step files
- ✅ Epic branch rules check: Phase 0d documented, base = develop, only-if-missing
- ✅ Step-isolation for all 9 pipeline steps (00 through 08)
- ✅ Two smoke scenarios: happy path + resume mid-loop
- ✅ Story-specific assertions in `evals/develop-story/assertions.mjs`
- ✅ Replay-mode fixtures for every step-isolation scenario
- ✅ `npm run eval:develop-story` (deterministic) + `npm run eval:develop-story:smoke` (opt-in)
- ✅ README documenting layers + resume scenario gotchas

### Out of Scope

- ❌ New shared lib modules — task.33 builds all of them; if anything is missing, it's a bug in task.33's API design
- ❌ Multi-story scenarios (epic with N stories sharing a branch) — defer to a future task; one story per scenario is enough to prove the contract
- ❌ Modifying `develop-story` SKILL.md — eval changes only
- ❌ Cross-skill epic-branch sharing tests — covered implicitly by step-isolation `00-create-epic-branch` only-if-missing test

### Scope expansion (per review Q4)

- ✅ Modifying `qa-fix` (or `shared/resources/develop-pipeline-step-5-6-qa-loop.md`) to emit deterministic markers (e.g., `.task-state/qa-fix-iter-{N}.marker`) for the resume-mid-loop kill signal. **Marker emit MUST be guarded by `EVAL_MODE=1` env var so production qa-fix behaviour is byte-identical.**
- ✅ Extending `evals/shared/runner.mjs` to support `stages[]` (multi-invocation scenarios) and `killOn: { type: "marker", path }`. Required for the resume scenario.

## 5. Breaking Changes

### 5.1 npm Script Additions

**After:**

```bash
npm run eval:develop-story          # protocol + step-isolation
npm run eval:develop-story:smoke    # full pipeline + resume scenario
npm run eval:all                    # now includes eval:develop-story
```

**Affected:** CI workflow, contributor docs.
**Migration:** mechanical, same pattern as task.33.

### 5.2 Shared Lib Usage

If task.33's `git-sandbox`, `gh-sandbox`, or `pipeline-recorder` API requires extension to support resume scenarios (e.g., `pipeline-recorder` needs a `pause()` / `resume()` for the kill-and-restart flow), this task may need to extend those interfaces. Any extension is additive.

**Affected:** task.33 if changes are needed; no breaking impact.
**Migration:** N/A (additive).

**No breaking changes to develop-story SKILL.md or sub-skills.**

## 6. Implementation Plan

> Detailed implementation guide: [task.34.plan.develop-story-evals.md](task.34.plan.develop-story-evals.md)

### Phase 1 — Story-specific assertions (Risk: Low)

**Files:** `evals/shared/assertions.mjs` (extend; matches task.33 pattern — no skill-local file), `evals/shared/tests/develop-story-assertions.test.mjs`

- [x] `prTargetsEpicBranch(receipt, epicNum)` — fails loudly if base is `develop`
- [x] `epicBranchExists(repo, epicNum)` — git-sandbox query
- [x] `epicBranchBasedOn(repo, epicNum, expectedBase)` — uses `git rev-list --count {base}..{epic-branch}` plus first-commit check; **NOT** plain `merge-base` (too weak)
- [x] `resumeRehydrated(transcript, expectedStep, expectedIter)` — uses pipeline-recorder
- [x] Assertions live in `evals/shared/assertions.mjs` and are auto-imported by the runner (consistent with task.33). No `--assertions` flag.

**Dependencies:** task.33 (needs shared assertions API stable)

### Phase 2 — Protocol checks (Risk: Low)

**Files:** `evals/develop-story/protocol/pipeline-shape.test.mjs`, `epic-branch-rules.test.mjs`, `step-contract.test.mjs`

- [x] Parse `skills/develop-story/SKILL.md` — assert all 9 pipeline steps appear in order; assert description string mentions `create-epic-branch`
- [x] Parse `shared/resources/develop-pipeline-step-1-create-branch.md` — assert Step 1a documents: base=develop, only-if-missing semantics, naming pattern `feature/epic.{n}.{name}`
- [x] Parse `shared/resources/develop-pipeline-step-4-create-pr.md` — assert PR creation targets epic branch (e.g., `--base feature/epic.` or `EPIC_BRANCH` substitution), and does NOT hardcode `--base develop`
- [x] Assert resume markers + step boundaries match `shared/resources/develop-pipeline-resume-contract.md`

**Dependencies:** none (pure file parsing)

### Phase 3 — Step-isolation 00-04 (epic branch + create-pr emphasis) (Risk: Medium)

**Files:** `evals/develop-story/step-isolation/{00-04}-*/`

- [x] `00-create-epic-branch/` — fixture: clean repo. **Driver invokes `develop-story` (not standalone `create-branch`)** so step-1 sub-step 1a runs end-to-end; remaining pipeline steps short-circuited via fixture state. Asserts branch created from develop, name matches `feature/epic.{n}.{name}`
- [x] `00-create-epic-branch/` second variant: epic branch already exists. Asserts no-op, no error
- [x] `01-create-story-branch/` — fixture: epic branch exists. Asserts story branch created from epic branch, NOT develop
- [x] `02-review-story/` — story file with known issues. Asserts review report exists
- [x] `03-develop-loop/` — stub story. Asserts implementation report appended, loop bounded
- [x] `04-create-pr/` — branch with commits. Asserts `gh pr create --base feature/epic.{n}.{name}` called (dry-run when no GH_TOKEN)

**Dependencies:** Phase 1

### Phase 4 — Step-isolation 05-08 (Risk: Low)

**Files:** `evals/develop-story/step-isolation/{05-08}-*/`

- [x] `05-qa-story/` — story marked ready-for-review. Asserts qa report + gate file written
- [x] `06-qa-fix/` — gate with CONCERNS. Asserts fix loop bounded at 5
- [x] `07-finalise/` — accepted gate. Asserts DoD posted to PR, status updated, sprint-status.yaml updated (if exists)
- [x] `08-commit-changes/` — staged changes. Asserts commit message format

**Dependencies:** Phase 1

### Phase 5 — Smoke scenarios + runner/qa-fix extensions (Risk: High)

**Files:** `evals/develop-story/smoke/01-end-to-end-dry/`, `evals/develop-story/smoke/02-resume-mid-loop/`, `evals/shared/runner.mjs`, `skills/qa-fix/SKILL.md` (or `shared/resources/develop-pipeline-step-5-6-qa-loop.md`)

- [x] `01-end-to-end-dry/` — full happy path against git-sandbox + optional gh-sandbox
- [x] **Runner extension** (required, not optional): add `stages[]` support (multi-invocation scenarios) and `killOn: { type: "marker", path }` watch. Combine `events` across stages into `$EVENTS_COMBINED`.
- [x] **qa-fix marker emit** (scope expansion per Q4): write `.task-state/qa-fix-iter-{N}.marker` after each iteration completes, **guarded by `EVAL_MODE=1` env var** so production behaviour is byte-identical.
- [x] `02-resume-mid-loop/` — kill on marker after iter 2; re-invoke `/develop-story --resume`; assert resume detected, state restored, total qa-fix iters across both stages ≤ MAX_ITER (5)
- [x] Smoke scenarios keep tmpdir on failure

**Dependencies:** Phase 3, Phase 4

### Phase 6 — Scripts + CI + docs (Risk: Low)

**Files:** `package.json`, `.github/workflows/test.yml`, `docs/evals.md`, `evals/develop-story/README.md`

- [x] Add `eval:develop-story` and `:smoke` scripts; add to `eval:all`
- [x] CI: protocol + step-isolation on every push; smoke on `workflow_dispatch`
- [x] Update `docs/evals.md` with develop-story recipes
- [x] README documents resume scenario specifically — what passing vs failing looks like

**Dependencies:** Phase 5

## 7. Files Summary

### Core Implementation (new)

1. ✅ Story-specific assertions added to `evals/shared/assertions.mjs` (no skill-local file — matches task.33 pattern)
2. ✅ `evals/develop-story/protocol/pipeline-shape.test.mjs`
3. ✅ `evals/develop-story/protocol/epic-branch-rules.test.mjs`
4. ✅ `evals/develop-story/protocol/step-contract.test.mjs`
5. ✅ `evals/develop-story/step-isolation/00-create-epic-branch/` (+ second variant)
6. ✅ `evals/develop-story/step-isolation/01-create-story-branch/`
7. ✅ `evals/develop-story/step-isolation/02-review-story/`
8. ✅ `evals/develop-story/step-isolation/03-develop-loop/`
9. ✅ `evals/develop-story/step-isolation/04-create-pr/`
10. ✅ `evals/develop-story/step-isolation/05-qa-story/`
11. ✅ `evals/develop-story/step-isolation/06-qa-fix/`
12. ✅ `evals/develop-story/step-isolation/07-finalise/`
13. ✅ `evals/develop-story/step-isolation/08-commit-changes/`
14. ✅ `evals/develop-story/smoke/01-end-to-end-dry/`
15. ✅ `evals/develop-story/smoke/02-resume-mid-loop/`

### Tests (new)

16. ✅ `evals/shared/tests/develop-story-assertions.test.mjs`

### Docs (new)

17. ✅ `evals/develop-story/README.md`

### Modified

18. ✅ `package.json` — add `eval:develop-story` + `:smoke`; extend existing `eval:all` loop (preserve loop pattern, append `evals/develop-story/step-isolation/*/`)
19. ✅ `.github/workflows/test.yml` — extend deterministic + workflow_dispatch jobs
20. ✅ `docs/evals.md` — add develop-story recipes, update reference tables
21. ✅ `evals/shared/runner.mjs` — (a) auto-import new story assertions; (b) **add `stages[]` + `killOn: { type: "marker" }` support** for resume scenarios
22. ✅ `evals/shared/assertions.mjs` — append `prTargetsEpicBranch`, `epicBranchExists`, `epicBranchBasedOn`, `resumeRehydrated`
23. ✅ `skills/qa-fix/SKILL.md` (or `shared/resources/develop-pipeline-step-5-6-qa-loop.md`) — emit `.task-state/qa-fix-iter-{N}.marker` after each iter, guarded by `EVAL_MODE=1`

### Possibly Modified (only if task.33 API insufficient)

24. ⚠️ `evals/shared/lib/pipeline-recorder.mjs` — extend with observer callback if marker-watch insufficient
25. ⚠️ `evals/shared/lib/git-sandbox.mjs` — extend if `branchExists` not present

### Deleted

None.

## 8. Testing Strategy

### Unit Tests

- **Scope:** `develop-story/assertions.mjs` — story-specific fns
- **Actions:** each assertion gets a dedicated `*.test.mjs` with happy + sabotage cases
- **Command:** `npm run test:node`
- **Target:** 100% pass

### Integration Tests (replay mode)

- **Scope:** all 9 step-isolation scenarios
- **Actions:** replay driver consumes fixture artefacts, assertions verify
- **Command:** `npm run eval:develop-story`
- **Target:** all 9 pass deterministically without creds

### Smoke Tests (opt-in)

- **Scope:** end-to-end happy path + resume-mid-loop
- **Actions:** requires `ANTHROPIC_API_KEY` (and optionally `GH_TOKEN` + `GH_REPO`)
- **Command:** `npm run eval:develop-story:smoke`
- **Target:** both scenarios pass; resume scenario specifically asserts state restored, not duplicated

### Sabotage Tests (manual, recorded)

- Sabotage SKILL.md to set PR base to develop → confirm `prTargetsEpicBranch` fails loudly
- Sabotage Phase 0d to skip "only-if-missing" check → confirm protocol test fails
- Sabotage resume contract → confirm `resumeRehydrated` fails

### Regression Tests

- Run `npm test` — confirm task.33 develop-task evals still pass
- **Target:** no regressions

## 9. Success Criteria

### Functional

- [x] `npm run eval:develop-story` runs protocol + 9 step-isolation scenarios — all pass
- [x] `npm run eval:develop-story:smoke` happy-path scenario passes locally
- [x] Resume scenario correctly identifies and restores mid-loop state
- [x] `prTargetsEpicBranch` catches a sabotaged PR-base regression
- [x] `epicBranchExists` correctly handles only-if-missing semantics
- [x] All step-isolation fixtures run in CI without creds

### Performance

- [x] `npm run eval:develop-story` completes in <30s
- [x] Smoke happy-path completes in <10 min with `GH_TOKEN`
- [x] Resume scenario completes in <15 min (overhead from kill + re-invoke)
- [x] No `npm test` regression vs task.33 baseline

### Code Quality

- [x] Reuses task.33 shared infra without forking
- [x] All new assertions have unit tests
- [x] No skill-specific code in `evals/shared/`
- [x] `documentation-standards-validator` passes on `evals/develop-story/README.md`

### Migration

- [x] `docs/evals.md` updated with develop-story recipes
- [x] CI workflow extended; verified green
- [x] If shared infra extended in Phase 5, task.33's README + tests updated to match

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.34.qa.1.develop-story-evals.md`
**Gate File**: `task.34.gate.1.develop-story-evals.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 98/100

All Definition of Done criteria have been verified:

✅ **Acceptance Criteria**: All 45 checkboxes complete; all deliverable files present on disk
✅ **Tests**: 160/160 pass; all protocol + step-isolation scenarios deterministic
✅ **PR**: PR #72 open targeting main
✅ **Documentation**: docs/evals.md recipes 13+14; evals/develop-story/README.md; task document section 7
✅ **Security Review**: ✅ PASS — eval infrastructure only; EVAL_MODE guard on qa-fix marker verified
✅ **Compliance**: ✅ NOT_APPLICABLE — no user data, no UI, no new dependencies

**Deployment Readiness**: APPROVED

**Task marked as ACCEPTED on:** 2026-05-11

**Detailed Verification Log:** See `task.34.dod.1.develop-story-evals.md` for complete verification evidence.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-05-11
**Quality Score**: 98/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.34.qa.1.develop-story-evals.md](./task.34.qa.1.develop-story-evals.md)
- **Gate File**: [task.34.gate.1.develop-story-evals.yml](./task.34.gate.1.develop-story-evals.yml)

### Test Coverage Summary
- **Tests Executed**: 160
- **Phases Verified**: 6/6
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. All 160 tests pass. Story-specific assertions verified via unit tests. Mirrors task.33 patterns exactly.

## 10. Risk Assessment

### HIGH RISK

**1. Resume scenario requires touching production qa-fix sub-skill**
- **Risk:** marker emit lands in `qa-fix` (or step-5-6 shared resource). Even guarded by `EVAL_MODE=1`, an env-var check on every iter is a non-trivial change to a hot path.
- **Probability:** High — required by Phase 5 design (Q4 decision)
- **Impact:** qa-fix bug introduced via marker code; production iters slowed by env-check overhead; coupling between eval and prod skill
- **Mitigation:** (a) marker write is a single `if (process.env.EVAL_MODE === '1') { … }` at end of iter; (b) add unit test asserting `EVAL_MODE` unset → no FS write; (c) measure iter overhead before/after
- **Rollback:** revert qa-fix change; gate resume scenario as optional; file follow-up to redesign kill mechanism

### MEDIUM RISK

**2. Shared infra from task.33 needs extension and lands in this task**
- **Risk:** task.33 didn't anticipate every story-specific need; extending shared lib here fragments ownership
- **Probability:** Medium — likely some extension needed (e.g., pipeline-recorder pause/resume)
- **Impact:** shared infra changes cross-cut both tasks, harder to reason about
- **Mitigation:** any shared lib changes go through Phase 1 (assertions) of this task and must update task.33's tests + README; if changes are large, fold them back as a task.33 amendment
- **Rollback:** revert shared lib changes; story-specific scenarios skip the affected assertion

**3. PR base assertion fails when GH_TOKEN unset (dry-run mode)**
- **Risk:** dry-run captures intended `gh pr create --base` args, but if dry-run capture is incomplete, `prTargetsEpicBranch` can't assert
- **Probability:** Medium — depends on gh-sandbox dry-run quality from task.33
- **Impact:** assertion can't run in CI, only in opt-in smoke
- **Mitigation:** ensure gh-sandbox (task.33) records the intended base in dry-run mode; verify in Phase 3
- **Rollback:** gate `prTargetsEpicBranch` on `GH_TOKEN` set; rely on protocol check otherwise

### LOW RISK

**4. Step-isolation 00 (create-epic-branch) interaction with multi-story state**
- **Risk:** scenario fixtures don't reflect realistic multi-story repo state
- **Probability:** Low — step-isolation tests only one step
- **Impact:** step passes alone, real-world behaviour might differ; smoke catches it
- **Mitigation:** document scope explicitly in scenario README

**5. Mirror drift — develop-story evals diverge from develop-task evals over time**
- **Risk:** bug fixes applied to one but not the other
- **Probability:** Medium long-term, Low at task completion
- **Impact:** contributor confusion, missed regressions
- **Mitigation:** shared infra absorbs most cross-cutting concerns; protocol tests in both skills follow the same parsing pattern

## 11. Rollback Plan

### Immediate Rollback (< 30 min)

- **Triggers:**
  - Resume scenario flaking blocks CI
  - Shared lib extensions break task.33 evals
  - `npm test` red after merge
- **Steps:**
  1. Revert merge commit
  2. Confirm task.33 evals + `npm test` green
  3. Re-open as a follow-up task with the failure mode captured
- **Validation:** full `eval:all` green; develop-task evals untouched

### Partial Rollback (1-2 hours)

- **When to use:** protocol + step-isolation OK, only resume scenario flaky
- **Steps:**
  1. Remove `02-resume-mid-loop/` from CI run; mark as `optional: true`
  2. Document gap in README
  3. File follow-up task to harden resume eval
- **When to use:** shared lib extensions caused task.33 regressions
- **Steps:**
  1. Revert only the shared lib changes
  2. Adjust story-specific assertions to work with task.33's original API
  3. Re-test both skills

### Forward Fix (preferred for most issues)

- Single broken scenario → fix in follow-up commit
- Stale fixture → re-record per task.33's documented workflow
- Missed assertion → add in follow-up
- Threshold for revert: `npm test` red >2h with no clear path

### Rollback Triggers

- **Critical:** `npm test` red, develop-task evals broken, CI blocking other PRs
- **Non-critical:** resume scenario flake (gate it as optional, fix forward), README typos

---

## QA Artifacts (created during QA)

- QA report: `task.34.qa.1.develop-story-evals.md`
- Bug reports (if issues found): `task.34.bug.N.<name>.md`
- Quality gate: `task.34.gate.1.develop-story-evals.yml`
