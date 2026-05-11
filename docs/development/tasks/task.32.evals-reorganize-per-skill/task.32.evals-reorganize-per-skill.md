---
id: task.32.evals-reorganize-per-skill
title: "Reorganize evals/ from full-flow/ into per-skill structure"
status: accepted
type: task
category: refactoring
priority: medium
assignee: gamaroff
effort_estimate: 0.5d
created: 2026-05-11
github_issue: 67
---

# Task 32: Reorganize evals/ from full-flow/ into per-skill structure

**Status:** 🟢 Ready for Development
**Review**: ✅ All review recommendations from `task.32.review.1.evals-reorganize-per-skill.md` implemented 2026-05-11
**Created:** 2026-05-11
**Category:** refactoring
**Priority:** Medium
**Assignee:** gamaroff
**Effort:** 0.5d

## 1. Overview

Relocate the existing `evals/full-flow/` directory into a per-skill layout (`evals/shared/` + `evals/create-task/` + `evals/create-story/`) so that each skill's evals live next to the skill they exercise. Pure restructure — no behaviour changes, no new assertions, no new scenarios. Establishes the directory shape that task.33 and task.34 will populate for `develop-task` and `develop-story`.

**Key deliverables:**
- `evals/shared/` containing the runner, drivers, generic assertions, lib helpers, and infra tests from today's `full-flow/`
- `evals/create-task/scenarios/` containing scenarios 01 (happy) + 03 (HALT) + the task half of scenario 05 (live tracker)
- `evals/create-story/scenarios/` containing scenarios 02 (happy) + 04 (HALT)
- Updated `package.json` scripts and `docs/evals.md` to match the new paths

**Expected outcome:** `npm test` stays green. CI workflow runs unchanged. `evals/full-flow/` no longer exists.

## 2. Motivation

### Current Problems

- Single `full-flow/` folder mixes scenarios for two unrelated skills, making ownership ambiguous
- Adding evals for `develop-task` / `develop-story` would force either more scenario folders into `full-flow/` (worse mixing) or a parallel top-level structure (inconsistent)
- Naming (`full-flow/`) describes the *layer* not the *skill*, while the rest of the repo (`skills/<name>/`, `tests/`) is skill-organized
- New contributors trying to find "the create-task evals" have no obvious pointer

### Benefits of Solution

- Per-skill ownership: touching `skills/create-task/SKILL.md` → look in `evals/create-task/` to update assertions
- Establishes a uniform directory shape that scales to N skills with no repo restructure
- Keeps shared infra (runner, drivers, generic assertions) in one place — no duplication
- Reduces friction for adding `develop-task` and `develop-story` evals (task.33, task.34)
- Documentation surface shrinks: each skill's `README.md` describes only its own scenarios

## 3. Technical Background

### Current Architecture

```
evals/full-flow/
├── runner.mjs                # Generic — works for any scenario
├── assertions.mjs            # Generic + skill-specific mixed
├── README.md                 # Documents both create-task and create-story
├── drivers/                  # replay, claude-sdk, claude-cli, types
├── lib/tracker-cleanup.mjs
├── tests/                    # drivers.test.mjs, assertions.test.mjs, tracker-cleanup.test.mjs
└── scenarios/
    ├── 01-happy-task/        # create-task
    ├── 02-happy-story/       # create-story
    ├── 03-task-id-collision/ # create-task
    ├── 04-story-missing-core-config/  # create-story
    └── 05-tracker-payload-live/       # create-task
```

### Target Architecture

```
evals/
├── shared/
│   ├── runner.mjs
│   ├── assertions.mjs        # Only generic fns (fileExists, frontmatterHas, etc.)
│   ├── drivers/
│   ├── lib/tracker-cleanup.mjs
│   └── tests/
├── create-task/
│   ├── README.md             # create-task eval coverage
│   ├── assertions.mjs        # (Optional) skill-specific extensions
│   └── scenarios/
│       ├── 01-happy/         # was 01-happy-task
│       ├── 02-id-collision/  # was 03-task-id-collision
│       └── 03-tracker-live/  # was 05-tracker-payload-live (task variant)
└── create-story/
    ├── README.md
    └── scenarios/
        ├── 01-happy/         # was 02-happy-story
        └── 02-missing-core-config/  # was 04-story-missing-core-config
```

`docs/evals.md` becomes the navigation hub linking each skill's `README.md`.

## 4. Scope

### In Scope

- ✅ Move `evals/full-flow/{runner,assertions,drivers,lib,tests}` → `evals/shared/`
- ✅ Split scenarios into `evals/create-task/scenarios/` and `evals/create-story/scenarios/`
- ✅ Renumber scenarios within each skill (01, 02, 03 — no gaps)
- ✅ Rewrite scenario `$SANDBOX` paths and `replay/` fixtures only if directory rename breaks them
- ✅ Update `package.json` scripts
- ✅ Update `docs/evals.md` recipes + canonical references section
- ✅ Update `.github/workflows/test.yml` paths
- ✅ Split `evals/full-flow/README.md` into per-skill READMEs

### Out of Scope

- ❌ New assertion functions
- ❌ New scenarios
- ❌ New drivers
- ❌ Behavioural changes to runner, replay logic, or tracker cleanup
- ❌ Splitting `assertions.mjs` into per-skill files (defer until skill-specific assertions actually exist — task.33 will introduce the first ones)

## 5. Breaking Changes

### 5.1 npm Script Names

**Before:**
```bash
npm run eval:full-flow
npm run eval:full-flow:all
npm run eval:full-flow:cli
npm run eval:full-flow:sdk
```

**After:**
```bash
npm run eval:create-task
npm run eval:create-story
npm run eval:all
npm run eval:create-task:cli
npm run eval:create-task:sdk
npm run eval:create-story:cli
npm run eval:create-story:sdk
```

**Affected:** any local shell history, contributor docs, CI workflow files.
**Migration:** clean cut — repo is solo-owned, no need for deprecated aliases.

### 5.2 Scenario Directory Paths

Anything that hard-codes `evals/full-flow/scenarios/...` (CI workflow, contributor scripts, agent prompts in skills) must be updated.

**Migration path:** mechanical find/replace; tracked in phase 4 checkboxes.

## 6. Implementation Plan

> Detailed implementation guide: [task.32.plan.evals-reorganize-per-skill.md](task.32.plan.evals-reorganize-per-skill.md)

### Phase 1 — Create new directory skeleton (Risk: Low)

**Files:** `evals/shared/`, `evals/create-task/`, `evals/create-story/`

- [ ] `mkdir -p evals/shared/{drivers,lib,tests}`
- [ ] `mkdir -p evals/create-task/scenarios evals/create-story/scenarios`
- [ ] Verify directories empty before next phase

**Dependencies:** none

### Phase 2 — Move shared infrastructure (Risk: Low)

**Files:** `evals/full-flow/{runner.mjs,assertions.mjs}`, `evals/full-flow/drivers/*`, `evals/full-flow/lib/*`, `evals/full-flow/tests/*`

- [ ] `git mv evals/full-flow/runner.mjs evals/shared/runner.mjs`
- [ ] `git mv evals/full-flow/assertions.mjs evals/shared/assertions.mjs`
- [ ] `git mv evals/full-flow/drivers evals/shared/drivers`
- [ ] `git mv evals/full-flow/lib evals/shared/lib`
- [ ] `git mv evals/full-flow/tests evals/shared/tests`
- [ ] Update internal imports (relative paths shift)

**Dependencies:** Phase 1

### Phase 3 — Move + rename scenarios (Risk: Medium)

**Files:** `evals/full-flow/scenarios/*`

- [ ] `git mv evals/full-flow/scenarios/01-happy-task evals/create-task/scenarios/01-happy`
- [ ] `git mv evals/full-flow/scenarios/03-task-id-collision evals/create-task/scenarios/02-id-collision`
- [ ] `git mv evals/full-flow/scenarios/05-tracker-payload-live evals/create-task/scenarios/03-tracker-live`
- [ ] `git mv evals/full-flow/scenarios/02-happy-story evals/create-story/scenarios/01-happy`
- [ ] `git mv evals/full-flow/scenarios/04-story-missing-core-config evals/create-story/scenarios/02-missing-core-config`
- [ ] Audit each `scenario.json` for hardcoded paths to old folder names — update to `$SANDBOX` relatives
- [ ] Update `scenario.json:name` field in all 5 scenarios to match new dir basenames (`01-happy`, `02-id-collision`, `03-tracker-live`, `01-happy`, `02-missing-core-config`)
- [ ] Rewrite stale prose path in `evals/create-task/scenarios/03-tracker-live/README.md` (`evals/full-flow/lib/tracker-cleanup.mjs` → `evals/shared/lib/tracker-cleanup.mjs`)
- [ ] `git rm evals/full-flow/README.md` (content rescued into Phase 5 split)
- [ ] `rmdir evals/full-flow/scenarios && rmdir evals/full-flow`

**Dependencies:** Phase 2

### Phase 4 — Update scripts + workflows (Risk: Medium)

**Files:** `package.json`, `.github/workflows/test.yml`

- [ ] Replace `eval:full-flow*` scripts with `eval:create-task`, `eval:create-story`, `eval:all`, `:cli` and `:sdk` variants per skill
- [ ] Update `npm test` chain if it references full-flow
- [ ] Update CI workflow path filters and run commands
- [ ] Run `npm test` and confirm green

**Dependencies:** Phase 3

### Phase 5 — Documentation (Risk: Low)

**Files:** `docs/evals.md`, new `evals/create-task/README.md`, new `evals/create-story/README.md`, removed `evals/full-flow/README.md`

- [ ] Write per-skill READMEs (`evals/create-task/README.md`, `evals/create-story/README.md`) using content rescued from old `evals/full-flow/README.md` (removed in Phase 3)
- [ ] Add `evals/shared/README.md` describing the runner contract + how to add a driver
- [ ] Update `docs/evals.md` recipes + canonical references to point at new paths
- [ ] Rename L4 layer label from "Full-flow" to "End-to-end" in:
  - [ ] `AGENTS.md:178` (paragraph mentioning "(unit → fixture → protocol → full-flow)")
  - [ ] `docs/evals.md:185` (`**L4 Full-flow**` heading + table row)
  - [ ] `docs/README.md:19` ("(unit → protocol → full-flow)")
- [ ] Update `AGENTS.md` evals paragraph path references (`evals/full-flow/README.md` → `evals/shared/README.md`)

**Dependencies:** Phase 4

## 7. Files Summary

### Moved (git mv — no content change)

1. ✅ `evals/full-flow/runner.mjs` → `evals/shared/runner.mjs`
2. ✅ `evals/full-flow/assertions.mjs` → `evals/shared/assertions.mjs`
3. ✅ `evals/full-flow/drivers/replay.mjs` → `evals/shared/drivers/replay.mjs`
4. ✅ `evals/full-flow/drivers/claude-sdk.mjs` → `evals/shared/drivers/claude-sdk.mjs`
5. ✅ `evals/full-flow/drivers/claude-cli.mjs` → `evals/shared/drivers/claude-cli.mjs`
6. ✅ `evals/full-flow/drivers/types.mjs` → `evals/shared/drivers/types.mjs`
7. ✅ `evals/full-flow/lib/tracker-cleanup.mjs` → `evals/shared/lib/tracker-cleanup.mjs`
8. ✅ `evals/full-flow/tests/drivers.test.mjs` → `evals/shared/tests/drivers.test.mjs`
9. ✅ `evals/full-flow/tests/assertions.test.mjs` → `evals/shared/tests/assertions.test.mjs`
10. ✅ `evals/full-flow/tests/tracker-cleanup.test.mjs` → `evals/shared/tests/tracker-cleanup.test.mjs`

### Moved + Renamed (scenarios)

11. ✅ `evals/full-flow/scenarios/01-happy-task/` → `evals/create-task/scenarios/01-happy/`
12. ✅ `evals/full-flow/scenarios/03-task-id-collision/` → `evals/create-task/scenarios/02-id-collision/`
13. ✅ `evals/full-flow/scenarios/05-tracker-payload-live/` → `evals/create-task/scenarios/03-tracker-live/`
14. ✅ `evals/full-flow/scenarios/02-happy-story/` → `evals/create-story/scenarios/01-happy/`
15. ✅ `evals/full-flow/scenarios/04-story-missing-core-config/` → `evals/create-story/scenarios/02-missing-core-config/`

### Modified

16. ✅ `package.json` — replace `eval:full-flow*` scripts with per-skill scripts
17. ✅ `.github/workflows/test.yml` — update paths and script names
18. ✅ `docs/evals.md` — recipes + reference tables point at new paths
19. ✅ `AGENTS.md` — update evals paragraph if it names old paths

### New

20. ✅ `evals/shared/README.md` — runner contract, driver-adding guide
21. ✅ `evals/create-task/README.md` — what create-task evals cover, how to run
22. ✅ `evals/create-story/README.md` — same for create-story

### Deleted

23. ❌ `evals/full-flow/README.md` (content split into the 3 new READMEs above)
24. ❌ `evals/full-flow/` directory

## 8. Testing Strategy

### Unit Tests

- **Scope:** shared/tests/ (drivers, assertions, tracker-cleanup) — unchanged behaviour
- **Actions:** confirm all node tests still discovered + green after path moves
- **Command:** `npm run test:node`
- **Target:** 100% pass — no test logic changes, only locations

### Integration Tests

- **Scope:** replay-mode scenarios for both create-task and create-story
- **Actions:** run `npm run eval:all` and confirm 5 scenarios pass
- **Command:** `npm run eval:all`

### Regression Tests

- Run `npm test` (full chain including platform resolver) and confirm green
- Diff old vs new test output count: should match exactly (~78 tests)

**No new tests required** — this task adds no behaviour. If a test fails post-move, it's a path issue and gets fixed in the same task, not deferred.

## 9. Success Criteria

### Functional

- [ ] `npm test` green (platform + L1 + L2 + L3 + L4 replay)
- [ ] `npm run eval:all` runs all 5 replay scenarios — all pass
- [ ] No `evals/full-flow/` directory exists in working tree
- [ ] `git mv` history preserved (commits show renames, not delete+add)

### Performance

- [ ] `npm test` runtime within ±10% of pre-reorg baseline (no infrastructure regression)

### Code Quality

- [ ] No orphaned references to `full-flow` anywhere except in commit messages and CHANGELOG
- [ ] All driver imports resolve (no broken relative paths)
- [ ] `documentation-standards-validator` passes on the 3 new READMEs

### Migration

- [ ] `docs/evals.md` updated — every recipe shows the new script/path
- [ ] `AGENTS.md` updated if it referenced old paths
- [ ] CI workflow runs green on first push

## 10. Risk Assessment

### HIGH RISK

None. Pure file moves with deterministic test coverage.

### MEDIUM RISK

**1. Hidden hardcoded paths in scenarios or drivers**
- **Risk:** a scenario JSON or driver imports `evals/full-flow/...` by string
- **Probability:** Medium — replay fixtures may contain path artefacts
- **Impact:** scenario fails, but failure is loud + caught by `npm run eval:all`
- **Mitigation:** Phase 3 audit step + `grep -r "full-flow" evals/ scripts/ docs/`
- **Rollback:** revert the move commit; tests go green again

### LOW RISK

**2. Scenario renumbering breaks an external doc**
- **Risk:** a blog post / external README links to `01-happy-task/`
- **Probability:** Low — repo is internal
- **Impact:** dead link only
- **Mitigation:** full-text search the repo for old scenario names

## 11. Rollback Plan

### Immediate Rollback (< 5 min)

- **Triggers:** `npm test` red after merge OR CI workflow fails on next push
- **Steps:**
  1. `git revert <merge-commit>` (pure file moves, no schema changes)
  2. Push revert
  3. Verify CI green
- **Validation:** `npm test` green; `evals/full-flow/` exists again

### Partial Rollback

N/A — this task is atomic. Either all moves land or none.

### Forward Fix (preferred for any single-file path issue)

- A broken import → fix the path in a follow-up commit, no revert
- A doc link missed → fix in a follow-up commit
- Threshold for revert: anything blocking `npm test` for >30 min

### Rollback Triggers

- **Critical:** `npm test` red, CI red
- **Non-critical:** doc link broken, README typo, missing redirect — fix forward

---

## QA Artifacts (created during QA)

- QA report: [task.32.qa.1.evals-reorganize-per-skill.md](./task.32.qa.1.evals-reorganize-per-skill.md)
- Quality gate: [task.32.gate.1.evals-reorganize-per-skill.yml](./task.32.gate.1.evals-reorganize-per-skill.yml)
- Bug reports: None (0 issues found)

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer (automated pipeline)
**Testing Date**: 2026-05-11
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.32.qa.1.evals-reorganize-per-skill.md](./task.32.qa.1.evals-reorganize-per-skill.md)
- **Gate File**: [task.32.gate.1.evals-reorganize-per-skill.yml](./task.32.gate.1.evals-reorganize-per-skill.yml)

### Test Coverage Summary
- **Tests Executed**: 78/78 (npm test) + 4/4 replay evals
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. All success criteria met. Zero orphaned `full-flow` references.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED
**Accepted:** 2026-05-11

### QA Report Summary

**QA Report**: `task.32.qa.1.evals-reorganize-per-skill.md`
**Gate File**: `task.32.gate.1.evals-reorganize-per-skill.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria verified:

✅ **Success Criteria:** All 4 criteria met (npm test 78/78, eval:all 4/4, full-flow removed, history preserved)
✅ **PR:** #70 open at https://github.com/Gamaroff/agent-skills/pull/70
✅ **Documentation:** docs/evals.md, AGENTS.md, docs/README.md updated; 3 new READMEs created
✅ **Security:** PASS — pure restructure, no new logic/deps/auth changes
✅ **Compliance:** NOT_APPLICABLE — internal refactoring only
✅ **Performance:** PASS — npm test timing stable; 19 evals tests newly discovered

**Detailed Verification Log:** See `task.32.dod.1.evals-reorganize-per-skill.md` for complete verification evidence.
