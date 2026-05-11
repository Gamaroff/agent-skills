---
id: task.33.develop-task-evals
title: "Build evals for develop-task pipeline (protocol + step-isolation + smoke)"
status: draft
type: task
category: testing
priority: medium
assignee: gamaroff
effort_estimate: 3d
created: 2026-05-11
github_issue: 68
depends_on: task.32.evals-reorganize-per-skill
---

# Task 33: Build evals for develop-task pipeline

**Status:** 📋 Planned
**Created:** 2026-05-11
**Category:** testing
**Priority:** Medium
**Assignee:** gamaroff
**Effort:** 3d
**Depends on:** task.32

## 1. Overview

Build a three-layer eval suite for the `develop-task` pipeline. Today, no automated coverage exists for develop-task's 8-step orchestration (create-branch → review-task → develop-loop → create-pr → qa-task → qa-fix → finalise → commit-changes). Manual smoke runs are the only signal. This task introduces protocol-level structural checks, step-isolation evals for each pipeline step, and an opt-in end-to-end smoke run against a sandboxed git repo + scratch GitHub repo.

**Key deliverables:**
- `evals/develop-task/protocol/` — pure structural assertions on `SKILL.md` + step files (no driver, no model calls)
- `evals/develop-task/step-isolation/` — one scenario folder per pipeline step, each runnable independently
- `evals/develop-task/smoke/` — full pipeline against a throwaway git repo (GH PR creation gated on `GH_TOKEN`)
- New shared infra in `evals/shared/lib/`: `git-sandbox.mjs`, `gh-sandbox.mjs`, `pipeline-recorder.mjs`
- `evals/develop-task/README.md` documenting layers, scenarios, and how to run smoke locally

**Expected outcome:** running `npm run eval:develop-task` (deterministic) gives confidence the pipeline structure hasn't drifted; `npm run eval:develop-task:smoke` (opt-in) exercises the full end-to-end flow including git ops and (optional) GitHub PR creation.

## 2. Motivation

### Current Problems

- Zero automated coverage for develop-task — regressions in step ordering, HALT terminators, or resume markers go undetected until a manual run breaks
- Step interactions are opaque: a change to `create-branch` SKILL.md can silently break `develop-task`'s assumptions about branch naming
- Recent develop-task tasks (28-31) have all been about pipeline correctness, with no eval to prevent re-regression
- Only signal today is users running `/develop-task` on real work and reporting breakage post-hoc
- New contributors can't validate develop-task changes before opening a PR

### Benefits of Solution

- Protocol layer catches structural drift in seconds with no model spend (CI-affordable on every push)
- Step-isolation surfaces regressions in individual sub-skills without running the whole pipeline (~1-2 min per step)
- Smoke layer is the only thing that exercises real git/GH ops, runs opt-in, and is the closest thing to "did the pipeline actually work"
- Shared infra (`git-sandbox`, `pipeline-recorder`) is reusable for develop-story (task.34) — write once
- Failed-iteration debugging: smoke layer keeps the sandbox tmpdir on failure for inspection
- Aligns with the per-skill eval ownership established by task.32

## 3. Technical Background

### Current Architecture (no evals)

```
skills/develop-task/
├── SKILL.md
├── README.md
└── scripts/
shared/resources/
├── develop-pipeline-step-0-resolve-and-prepare.md
├── develop-pipeline-step-1-create-branch.md
├── develop-pipeline-step-3-develop-loop.md
├── develop-pipeline-step-5-6-qa-loop.md
└── ...
```

No automated check that:
- All 8 steps exist in SKILL.md in correct order
- Each step has a HALT terminator
- Resume markers map to step boundaries
- Sub-skill invocations match step contracts

### Target Architecture

```
evals/
├── shared/
│   └── lib/
│       ├── git-sandbox.mjs           # NEW — init throwaway repo, fixture commits, cleanup
│       ├── gh-sandbox.mjs            # NEW — optional GH ops against $GH_REPO
│       └── pipeline-recorder.mjs     # NEW — wrap driver, record sub-skill invocations
└── develop-task/
    ├── README.md
    ├── assertions.mjs                # branchExists, prCreated, pipelineStepsRan, loopBoundedAt
    ├── protocol/
    │   ├── pipeline-shape.test.mjs   # parses SKILL.md + step files, asserts structure
    │   └── step-contract.test.mjs    # asserts step inputs/outputs match shared spec
    ├── step-isolation/
    │   ├── 01-create-branch/
    │   ├── 02-review-task/
    │   ├── 03-develop-loop/
    │   ├── 04-create-pr/
    │   ├── 05-qa-task/
    │   ├── 06-qa-fix/
    │   ├── 07-finalise/
    │   └── 08-commit-changes/
    └── smoke/
        └── 01-end-to-end-dry/
            ├── scenario.json
            ├── env.json              # GH_TOKEN_OPTIONAL=1
            └── README.md             # what passing looks like + cleanup notes
```

### Pipeline-Recorder Design

Wraps an `AgentDriver` and intercepts sub-skill invocations (currently surfaced via `Skill` tool calls in transcripts). Records `[stepName, timestamp, status]` tuples. Assertions then check `pipelineStepsRan(transcript, ['create-branch', 'review-task', ...])`.

### Git-Sandbox Design

`createSandbox({ fixtureFiles, initialCommit })` returns `{ path, cleanup }`. Initializes a real git repo in `os.tmpdir()`, commits fixture files, returns a clean working tree. Cleanup deletes the directory.

## 4. Scope

### In Scope

- ✅ Protocol checks for develop-task SKILL.md + the 8 step files in `shared/resources/develop-pipeline-step-*.md`
- ✅ Step-isolation scenarios for all 8 pipeline steps (one folder each)
- ✅ One smoke scenario covering the full happy path
- ✅ Three new shared lib modules (`git-sandbox`, `gh-sandbox`, `pipeline-recorder`)
- ✅ Skill-specific assertion functions in `evals/develop-task/assertions.mjs`
- ✅ Replay-mode fixtures for every step-isolation scenario (so they run in CI without creds)
- ✅ `npm run eval:develop-task` (deterministic) + `npm run eval:develop-task:smoke` (opt-in)
- ✅ README documenting layers, how to run smoke locally, what `GH_TOKEN` enables

### Out of Scope

- ❌ develop-story evals (task.34 — but shared infra MUST be reusable)
- ❌ Resume mid-pipeline scenarios (deferred — develop-story has a richer resume story to test in task.34)
- ❌ Live tracker scenarios for develop-task (PR creation is the only tracker interaction; covered by smoke layer when `GH_TOKEN` set)
- ❌ Performance benchmarks of the pipeline itself (separate concern)
- ❌ Modifying `develop-task` SKILL.md or any sub-skill — eval changes only

## 5. Breaking Changes

### 5.1 npm Script Additions

**Before:** no scripts mention develop-task evals.

**After:**

```bash
npm run eval:develop-task           # protocol + step-isolation (deterministic, no creds)
npm run eval:develop-task:smoke     # full pipeline, requires git, opt-in GH_TOKEN
npm run eval:all                    # now includes eval:develop-task
```

**Affected:** CI workflow (must be updated to run new script), contributor docs.
**Migration:** mechanical — add to `eval:all`, add new CI job, document in `docs/evals.md`.

### 5.2 `evals/shared/lib/` New Exports

`git-sandbox.mjs`, `gh-sandbox.mjs`, and `pipeline-recorder.mjs` become public surface inside `shared/`. They are net-new — nothing breaks, but task.34 will depend on these signatures, so the API needs to be deliberate from day 1.

**Affected:** task.34 (develop-story evals).
**Migration:** N/A (additive).

**No breaking changes to develop-task SKILL.md or sub-skills.**

## 6. Implementation Plan

> Detailed implementation guide: [task.33.plan.develop-task-evals.md](task.33.plan.develop-task-evals.md)

### Phase 1 — Shared infra: git-sandbox + pipeline-recorder (Risk: Medium)

**Files:** `evals/shared/lib/git-sandbox.mjs`, `evals/shared/lib/pipeline-recorder.mjs`, `evals/shared/tests/git-sandbox.test.mjs`, `evals/shared/tests/pipeline-recorder.test.mjs`

- [ ] Implement `createSandbox({ fixtureFiles, initialCommit, branch })` returning `{ path, run, cleanup }`
- [ ] `run(cmd)` executes shell commands inside the sandbox, returns `{ stdout, stderr, code }`
- [ ] Unit tests: init, commit, branch create, cleanup deletes dir
- [ ] Implement `wrapDriver(driver)` that records `[skillName, args, status]` per Skill tool call in the transcript
- [ ] Unit tests: replay driver wrapped → recorded events match expected order

**Dependencies:** task.32 (needs `evals/shared/` to exist)

### Phase 2 — Shared infra: gh-sandbox (Risk: Medium)

**Files:** `evals/shared/lib/gh-sandbox.mjs`, `evals/shared/tests/gh-sandbox.test.mjs`

- [ ] Implement `createGhSandbox({ repo, cleanup })` — pushes branch, creates PR, returns receipt
- [ ] If `GH_TOKEN` unset, return `{ skipped: true, reason }` (never throw)
- [ ] Cleanup: close PR, delete branch (no destructive ops on default branch)
- [ ] Unit tests: skipped path; mocked `gh` cli for happy path

**Dependencies:** Phase 1

### Phase 3 — Skill-specific assertions (Risk: Low)

**Files:** `evals/develop-task/assertions.mjs`, `evals/shared/tests/develop-task-assertions.test.mjs`

- [ ] `branchExists(repo, namePattern)` using git-sandbox
- [ ] `prCreated(receipt, { base, titlePattern })`
- [ ] `pipelineStepsRan(recordedEvents, expectedSteps)` — order-sensitive subset check
- [ ] `loopBoundedAt(recordedEvents, skill, maxIter)` — guards qa-fix's 5-cycle cap
- [ ] `noLockFilesLeft(sandboxPath)` — guards always-run lock cleanup
- [ ] Register new fns in `evals/shared/runner.mjs` switch (or skill-local registration)

**Dependencies:** Phase 1

### Phase 4 — Protocol checks (Risk: Low)

**Files:** `evals/develop-task/protocol/pipeline-shape.test.mjs`, `evals/develop-task/protocol/step-contract.test.mjs`

- [ ] Parse `skills/develop-task/SKILL.md` — assert 8 named steps in order
- [ ] Parse each `shared/resources/develop-pipeline-step-*.md` — assert HALT terminator present
- [ ] Assert resume markers in SKILL.md match step boundaries
- [ ] Assert each step's documented inputs/outputs match the contract in `develop-pipeline-resume-contract.md`
- [ ] Tests run via `node --test`, no driver required

**Dependencies:** none (pure file parsing)

### Phase 5 — Step-isolation scenarios (Risk: Medium)

**Files:** `evals/develop-task/step-isolation/{01..08}-*/`

- [ ] Author 8 scenario folders (one per pipeline step)
- [ ] Each contains `scenario.json` + `answers.jsonl` + `env.json` + `replay/` fixtures
- [ ] Reuse driver registry — replay mode for CI, claude-sdk for live runs
- [ ] Each scenario's assertions target only that step's outputs
- [ ] Includes `qa-fix` iteration cap test (loopBoundedAt = 5)

**Dependencies:** Phase 3 (needs assertions), Phase 4 (parallel OK)

### Phase 6 — Smoke layer + scripts + docs (Risk: Medium)

**Files:** `evals/develop-task/smoke/01-end-to-end-dry/`, `evals/develop-task/README.md`, `package.json`, `.github/workflows/test.yml`, `docs/evals.md`

- [ ] Author end-to-end smoke scenario using git-sandbox + gh-sandbox
- [ ] Smoke scenario keeps tmpdir on failure for inspection (logged to stderr)
- [ ] Add `eval:develop-task` and `eval:develop-task:smoke` scripts
- [ ] Add to `eval:all`
- [ ] CI workflow: deterministic job runs `eval:develop-task` on every push; smoke job is `workflow_dispatch`-only
- [ ] README: what each layer covers, how to run smoke locally with/without `GH_TOKEN`, cleanup expectations
- [ ] Update `docs/evals.md` with new recipe ("test the develop-task pipeline")

**Dependencies:** Phase 5

## 7. Files Summary

### Core Implementation (new)

1. ✅ `evals/shared/lib/git-sandbox.mjs` — throwaway git repo helper
2. ✅ `evals/shared/lib/gh-sandbox.mjs` — optional GH PR creation/cleanup
3. ✅ `evals/shared/lib/pipeline-recorder.mjs` — driver wrapper recording sub-skill calls
4. ✅ `evals/develop-task/assertions.mjs` — skill-specific assertion fns
5. ✅ `evals/develop-task/protocol/pipeline-shape.test.mjs`
6. ✅ `evals/develop-task/protocol/step-contract.test.mjs`
7. ✅ `evals/develop-task/step-isolation/01-create-branch/{scenario,answers,env}.json` + `replay/`
8. ✅ `evals/develop-task/step-isolation/02-review-task/...`
9. ✅ `evals/develop-task/step-isolation/03-develop-loop/...`
10. ✅ `evals/develop-task/step-isolation/04-create-pr/...`
11. ✅ `evals/develop-task/step-isolation/05-qa-task/...`
12. ✅ `evals/develop-task/step-isolation/06-qa-fix/...` (includes loop cap test)
13. ✅ `evals/develop-task/step-isolation/07-finalise/...`
14. ✅ `evals/develop-task/step-isolation/08-commit-changes/...`
15. ✅ `evals/develop-task/smoke/01-end-to-end-dry/{scenario,answers,env}.json` + `README.md`

### Tests (new)

16. ✅ `evals/shared/tests/git-sandbox.test.mjs`
17. ✅ `evals/shared/tests/gh-sandbox.test.mjs`
18. ✅ `evals/shared/tests/pipeline-recorder.test.mjs`
19. ✅ `evals/shared/tests/develop-task-assertions.test.mjs`

### Docs (new)

20. ✅ `evals/develop-task/README.md`

### Modified

21. ✅ `package.json` — add `eval:develop-task` and `:smoke` scripts; add to `eval:all`
22. ✅ `.github/workflows/test.yml` — add deterministic job + workflow_dispatch smoke job
23. ✅ `docs/evals.md` — recipes 11/12 (test develop-task), reference table updates
24. ✅ `evals/shared/runner.mjs` — register new assertion fns (or via skill-local registration)
25. ✅ `evals/shared/README.md` — document new lib helpers

### Deleted

None.

## 8. Testing Strategy

### Unit Tests

- **Scope:** shared lib helpers (git-sandbox, gh-sandbox, pipeline-recorder) + new assertion fns
- **Actions:** dedicated `*.test.mjs` per module; mock external commands where possible
- **Command:** `npm run test:node`
- **Target:** 100% pass; new tests bring suite to ~95+ tests

### Integration Tests (replay mode)

- **Scope:** each step-isolation scenario in replay mode
- **Actions:** runner consumes scenario.json, replay driver provides fixture artefacts, assertions verify
- **Command:** `npm run eval:develop-task`
- **Target:** all 8 step scenarios pass deterministically without creds

### Smoke Tests (opt-in)

- **Scope:** end-to-end pipeline against a real git sandbox + (optional) scratch GH repo
- **Actions:** requires `ANTHROPIC_API_KEY` (and optionally `GH_TOKEN` + `GH_REPO`)
- **Command:** `npm run eval:develop-task:smoke`
- **Target:** passes locally + via `workflow_dispatch` CI job; sandbox cleaned up unconditionally

### Regression Tests

- Run `npm test` — confirm no existing tests broken by new shared lib additions
- **Target:** zero regressions in the ~78-test baseline

### Failed-Iteration Debugging

- Smoke scenario keeps sandbox tmpdir on failure; runner prints path to stderr
- Manual `cd $TMPDIR && git log` reveals what the pipeline actually did

## 9. Success Criteria

### Functional

- [ ] `npm run eval:develop-task` runs all protocol + step-isolation scenarios — all pass
- [ ] `npm run eval:develop-task:smoke` runs locally with `ANTHROPIC_API_KEY` and exits 0
- [ ] Smoke scenario creates real git commits + (optional) GH PR; cleanup runs unconditionally
- [ ] Pipeline-recorder accurately records sub-skill invocations from a known transcript
- [ ] All 8 step-isolation scenarios pass in replay mode without creds
- [ ] Protocol checks fail loudly when SKILL.md step is removed/reordered (manually verified by sabotage)

### Performance

- [ ] `npm run eval:develop-task` (deterministic) completes in <30s
- [ ] Smoke run completes in <10 min when `GH_TOKEN` set; <5 min in dry mode
- [ ] Adding new shared lib does not slow `npm test` by >10%

### Code Quality

- [ ] All new modules covered by unit tests
- [ ] No new lint warnings; consistent with existing `evals/shared/` style
- [ ] Skill-specific assertions registered in runner without modifying generic assertion file
- [ ] `documentation-standards-validator` passes on `evals/develop-task/README.md`

### Migration

- [ ] `docs/evals.md` updated with develop-task recipes
- [ ] CI workflow updated and verified green
- [ ] `evals/shared/README.md` documents new lib helpers + their contract

## 10. Risk Assessment

### HIGH RISK

**1. Pipeline-recorder coupling to driver internals**
- **Risk:** recording sub-skill invocations requires hooking into how each driver surfaces `Skill` tool calls; if the SDK changes its event shape, recorder breaks
- **Probability:** Medium — Anthropic SDK is stable but evolving
- **Impact:** protocol checks pass but step-isolation false-positives become possible
- **Mitigation:** define a narrow `RecordedEvent` interface in `pipeline-recorder.mjs`; each driver maps to it. Cover the mapping with unit tests using fixture transcripts.
- **Rollback:** skip pipeline-recorder, fall back to artefact-based assertions only (less precise but functional)

### MEDIUM RISK

**2. Smoke scenario flakiness from real git/GH interactions**
- **Risk:** network blips, GH rate limits, race conditions in cleanup
- **Probability:** Medium — every external integration is flaky at some rate
- **Impact:** smoke job fails intermittently, eroding trust
- **Mitigation:** smoke is opt-in only (workflow_dispatch); retries on transient errors; cleanup runs in `finally` so failures don't leak
- **Rollback:** mark smoke scenario as `optional: true` in scenario.json; runner reports skip not fail

**3. Step-isolation fixtures going stale**
- **Risk:** replay fixtures encode the current shape of each step's output; if a sub-skill changes its output, fixtures need re-recording
- **Probability:** Medium — sub-skills evolve
- **Impact:** step-isolation goes red on unrelated changes; contributors stop trusting it
- **Mitigation:** document fixture re-recording workflow in README; provide a `make refresh-fixtures` script in Phase 6
- **Rollback:** temporarily skip the affected scenario via runner's skip flag

**4. Git-sandbox cleanup leaving directories on crash**
- **Risk:** process killed mid-run leaves tmpdirs lying around
- **Probability:** Low (test process) but Medium impact for dev disks over time
- **Impact:** disk bloat, potential confusion if old sandboxes inspected
- **Mitigation:** prefix all sandbox dirs with `agent-skills-eval-` for easy `rm -rf`; document cleanup script
- **Rollback:** N/A (cosmetic)

### LOW RISK

**5. Step-isolation fails to catch interaction bugs**
- **Risk:** each step passes alone but combinations fail; smoke layer is the only catch
- **Probability:** High in theory, Low in practice (smoke layer is the safety net)
- **Impact:** false confidence from green step-isolation
- **Mitigation:** clearly document in README that step-isolation is unit-level; smoke is the integration check
- **Rollback:** N/A

## 11. Rollback Plan

### Immediate Rollback (< 30 min)

- **Triggers:**
  - `npm test` red after merge from new shared lib regression
  - Smoke job blocking development
  - Pipeline-recorder generating false positives that block CI
- **Steps:**
  1. Revert the merge commit
  2. Re-run `npm test` to confirm green baseline restored
  3. File a follow-up task with the failure mode captured
- **Validation:** `npm test` green; `npm run eval:create-task` and `eval:create-story` still pass

### Partial Rollback (1-2 hours)

- **When to use:** protocol layer good but step-isolation flaky
- **Steps:**
  1. Remove `evals/develop-task/step-isolation/` from CI run
  2. Keep protocol + smoke (smoke already opt-in)
  3. Mark in README as "step-isolation: experimental"
- **When to use:** shared lib OK but smoke failing intermittently
- **Steps:** drop smoke from `eval:all`, leave it `workflow_dispatch`-only

### Forward Fix (preferred for almost everything)

- Single broken assertion → fix in follow-up commit
- Stale fixture → re-record + commit
- Missed sub-skill in protocol check → add to assertion list
- Threshold for revert: only if `npm test` is red for >2h with no clear fix path

### Rollback Triggers

- **Critical:** `npm test` red, CI blocking other PRs
- **Non-critical:** README typos, doc link issues, single scenario flake — fix forward

---

## QA Artifacts (created during QA)

- QA report: `task.33.qa.1.develop-task-evals.md`
- Bug reports (if issues found): `task.33.bug.N.<name>.md`
- Quality gate: `task.33.gate.1.develop-task-evals.yml`
