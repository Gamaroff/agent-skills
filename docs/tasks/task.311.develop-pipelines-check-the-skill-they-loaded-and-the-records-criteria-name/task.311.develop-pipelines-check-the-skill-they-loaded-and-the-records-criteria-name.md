---
id: task.311
title: "Develop pipelines check the skill they loaded and the records criteria name"
type: task
description: "The develop pipelines trust the Skill tool to load this repository's copy of a sub-skill, and leave a criterion's named record location to be discovered by /finalise; this task makes the orchestrator verify the first and hand the second to QA."
tags: [develop-task, develop-story, develop-bug, qa-task, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-17
updated: 2026-11-17
estimated_effort_hours: 4
---

# Technical Task: Develop pipelines check the skill they loaded and the records criteria name

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.311.review.1.develop-pipelines-identity-check-and-record-handoff.md` implemented 2026-11-17

---

## 1. Overview

Two defects in the develop pipelines (`/develop-task`, `/develop-story`, `/develop-bug`) cost whole runs and were each seen twice. First, the Skill tool can load a same-named user-level copy of a sub-skill in place of this repository's copy, and nothing detects it (observation #69). Second, a success criterion that names where its record lives ("recorded in the QA report") is never checked against that place until `/finalise` grades it, three AC passes later (observation #160).

**Scope**: a deterministic identity check the orchestrators run after every sub-skill load (Phase 1), and a hand-off from the QA step to `qa-task` of the criteria that name a record location, with `qa-task` writing each record into its own committed report (Phase 2). Observations #5 and #6, reviewed alongside, were already in the tree and are closed; they are out of scope.

---

## 2. Motivation

### Current Problems

1. **A shadowed sub-skill passes unnoticed.** During the task.193 run (2026-10-19) `finalise` loaded the user-level synced copy, which has no publish boundary, no probe plan and no Step 8a; `create-pr` loaded a copy with no `--scope`; `review-pr` returned "Unknown skill". Task.232 (2026-10-25) repeated it for `qa-task`, `review-pr` and `finalise`. Each time the run noticed by luck.
2. **A trusting run would accept without the guarantees.** Accepting through the generic `finalise` skips the 6a–6c publish boundary and the second CI reading, and the run still looks complete.
3. **A record criterion is graded where it was never written.** Task 289's criteria #4–#7 said a record was "recorded in the QA report"; the developer wrote every one into the implementation report, which Step 8 commits only after `/finalise` grades. Three AC passes and two doc commits followed on a task that was otherwise done.
4. **The repair rewrote the criteria.** The first repair reworded criteria #5 and #9 to fit the evidence, and the AC agent failed that as an unapproved amendment. A second pass failed #7 because 13 of 15 mutation proofs named no test.

### Benefits

1. A substituted sub-skill is caught at the load, not at acceptance.
2. The identity check is a command with an exit code, not a thing the run must remember.
3. QA writes each named record where the criterion says, committed, so `/finalise` finds it.
4. A mutation proof names the red test, so the AC agent has no reason to fail it.

---

## 3. Technical Background

### Current Architecture

**Sub-skill invocation (Phase 1).** Each orchestrator's Step Transition Protocol invokes the next sub-skill through the Skill tool and does nothing to check what loaded: `skills/develop-task/SKILL.md:181`, `skills/develop-story/SKILL.md:188`, `skills/develop-bug/SKILL.md:176` (each the line `4. **Invoke the next sub-skill** via the Skill tool`; command: `git grep -n "Invoke the next sub-skill" -- 'skills/*/SKILL.md'` returns exactly these three). No repository file mentions the loaded skill's base directory: `git grep -n -i "base directory for this skill"` returns nothing. The Skill tool's own result does carry that line (`Base directory for this skill: <path>`), as the loads in this very session showed (`.claude/skills/create-task`, a path under the repository), so the marker exists and is cheap to read.

**QA invocation and record criteria (Phase 2).** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:304` dispatches `Skill(qa-task, args="traceability_matrix=… code_review_blocking=true")` and passes nothing about records. The engine that finds record-demanding criteria already exists, at `/finalise` only: `shared/resources/finalise-record-preflight.js` (`check --doc <file> --json`, reading the criteria section and the work item's directory listing; `listed[]` entries carry `index`, `criterion`, `location`, `state`; `skills/finalise/SKILL.md:600` runs it). Run on task.299's document it listed criterion 1 with `location: qa-report`. Its header states the limit: `ok` means a committed place **exists**, not that the record is **in** it (`finalise-record-preflight.js:25-30`). `create-task` already warns authors to name a committed location (obs #105, #77; `skills/create-task/SKILL.md`, "A measurement or record with nowhere committed to live").

### Target Architecture

**Phase 1.** A small engine, `shared/resources/skill-resolution.js`, with one command `check --name <skill> --base-dir <path> --root <repo>`. It classifies the base directory the Skill tool reported as `repo` (the path resolves, through symlinks, inside `<root>/skills/<name>` or `<root>/.agents/skills/<name>` or `<root>/.claude/skills/<name>`), `shadowed` (any other path for that name) or `unreadable`. `--json` prints a `reason`, peer of `finalise-record-preflight.js` (exit 0 `repo`, 1 `shadowed`, 2 usage). A `shadowed` result tells the orchestrator to read the repository `SKILL.md` and follow it, and to record the substitution in the Issues Log. The rule is stated once in one shared resource and cited from the three orchestrators' step 4.

**Phase 2.** At the QA step the orchestrator runs `finalise-record-preflight.js check` and passes its `listed` entries (criterion and location) to `qa-task` through a new dispatch argument. `qa-task` writes each record into the named committed report as it runs, with the command and its output, and a mutation proof row names the red test. The criterion's wording is never edited: the evidence moves.

---

## 4. Scope

### In Scope

✅ **Identity check**: the engine, its tests, the shared rule and the three orchestrators' citations.
✅ **Record hand-off**: the QA-step dispatch, the `qa-task` instruction and the mutation-proof naming rule.
✅ **Bundled copies** of the new and changed shared resources, `CHANGELOG.md`.

### Out of Scope

❌ **Changing how the Skill tool resolves names.** That is the harness's behaviour; the check only detects it.
❌ **`qa-story`'s equivalent.** The story pipeline's QA step gets the same hand-off in a follow-up once the task path is proven; this task does the task path and the shared step doc.
❌ **Observations #5 and #6.** Already in the tree (`develop-pipeline-step-3-develop-loop.md:324`; `develop-pipeline-autonomous-defaults.md:81-87`).

---

## 5. Breaking Changes

None - API stable. Both additions are new steps that pass on today's correct runs: a repository-resolved skill classifies `repo`, and a task whose criteria name no record location hands `qa-task` an empty list.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.311.plan.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md](task.311.plan.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md)

### Phase 1: The identity check

**Risk Level**: Medium

**Files**:
- `shared/resources/skill-resolution.js` (new), `shared/resources/skill-resolution.md` (new rule)
- `shared/resources/tests/skill-resolution.test.mjs` (new)
- `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md`

**Changes**:
- [ ] Measure first: record in the QA report the base directory each of the 5 sub-skills the pipeline invokes reports on this machine, with the command (`ls -la` of the load path), so the classification rests on real paths and not on the observation's wording.
- [x] Write the engine with `check`, classifying through `fs.realpathSync` and failing safe to `unreadable`.
- [x] Write the shared rule: after every Skill-tool load, run `check` with the reported base directory; on `shadowed` read the repository `SKILL.md` and follow it, and log the substitution.
- [x] Cite the rule from the three step-4 paragraphs, by citation (`#section`) so the orchestrators do not inherit the closure.
- [x] Tests over real shapes: a repository path, a `~/.claude/skills/synced/…` path, a symlink into the repository, a missing path.

**Dependencies**: none.

---

### Phase 2: The record hand-off

**Risk Level**: Low

**Files**:
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
- `skills/qa-task/SKILL.md`
- `shared/resources/tests/` (a test over the dispatch argument)

**Changes**:
- [x] Before the `qa-task` dispatch run `finalise-record-preflight.js check --doc "$TASK_FILE" --json` and pass `record_criteria=<path to the saved listing>`. The call goes in a **fenced bash block that binds every variable it reads** (`TASK_FILE`, `TASK_DIR`), so a test can extract and run it (obs #258) and `tests/unbound-default-reads.test.js`, which scans every `shared/resources/develop-pipeline-*.md`, stays green.
- [x] **Task variant only.** `develop-pipeline-step-5-6-qa-loop.md` is shared with `develop-story`, whose QA skill is `qa-story`, and `qa-story` is out of scope. Add the token to **both** task-variant dispatch forms (with and without the traceability matrix) and to neither story dispatch. Locate the sites with `git grep -n "Skill(qa-task" shared/resources/develop-pipeline-step-5-6-qa-loop.md`.
- [x] Note in the step doc that at QA time a criterion naming the QA report reads `state: location-absent` — the normal state, since QA writes that report; it is not a finding.
- [x] `qa-task`: read `record_criteria` (add it to the "Pipeline Skill args" list beside `traceability_matrix` and `code_review_blocking`); for each entry write the record into the named report with its command and output as the step runs.
- [x] `qa-task`: a mutation-proof record names the test that went red.
- [x] State that a criterion's wording is never edited to fit the evidence.

**Dependencies**: independent of Phase 1.

---

### Phase 3: Bundle, docs and gate

**Risk Level**: Low

**Changes**:
- [x] `npm run bundle`, `npm run generate-catalog`, a `CHANGELOG.md` entry citing this task.
- [x] Run the fast gate under `CI=true`.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/skill-resolution.js` (new) - the identity check
2. ✅ `shared/resources/skill-resolution.md` (new) - the rule, stated once
3. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md` - step 4 cites the rule
4. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` - the record hand-off
5. ✅ `skills/qa-task/SKILL.md` - writes each named record

### Files to Modify (Tests)

6. ✅ `shared/resources/tests/skill-resolution.test.mjs` (new)
7. ✅ a dispatch-argument test beside it

**Existing tests that enumerate the classes these files belong to** (found with `git grep -nE "readdirSync|git ls-files" -- 'tests/*.test.*'`; each must stay green and is named so the developer expects it):

- `tests/unbound-default-reads.test.js` — scans every `skills/*/SKILL.md` and `shared/resources/develop-pipeline-*.md`; the new fenced block and the three `SKILL.md` citations must bind what they read.
- `tests/fenced-bash-optional-file-globs.test.js` — scans every file in `shared/resources/`, so `skill-resolution.md` is in scope.
- `tests/bundle-citation.test.js`, `tests/bundle-comment-origin.test.js` and `bundle:check` — the new shared files, the citation form (`skill-resolution.md#after-every-load`) and the bundled `finalise-record-preflight.js` copy in `develop-task` (it has none today: `git ls-files skills/develop-task/references | grep -c finalise-record-preflight` → 0; the new step-doc call makes it a dependency, so the bundler adds it).
- `tests/test-runner-reach.test.js` — `shared/resources/tests/*.test.mjs` is already a `test:suite` glob, so the two new test files are reached; confirm with this test.

### Files to Modify (Documentation)

8. ✅ `CHANGELOG.md`, `docs/reference/skill-catalog.md` (generated)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `skill-resolution.js` over a repository path, a synced path, a symlink into the repository and a missing path; the `reason` and exit code for each.

**Command**: `TEST_LOCAL=1 npm run test:remote -- --run ci:fast` (or `npm run test:remote` when the LAN server is up).

### Mutation proofs

**Scope**: for each rule, revert the behaviour and name the red test: the engine returns `repo` for a synced path (the shadow test goes red); the dispatch omits `record_criteria` (the dispatch test goes red).

### Regression

The existing `finalise-record-preflight.test.mjs` and the transition-protocol parity test stay green.

---

## 9. Success Criteria

### Functional

- [ ] `skill-resolution.js check` classifies a `~/.claude/skills/synced/…/finalise` base directory as `shadowed` and a repository path as `repo`; a test per case, each mutation-proved with the red test named.
- [ ] The three orchestrators' step 4 cites the rule, and a test asserts the engine is reached from each (behaviour: the cited command runs and exits as specified, not a grep for the string).
- [ ] The QA-step dispatch passes `record_criteria`, and a test asserts the listing it passes matches `finalise-record-preflight.js check` on a fixture task.
- [ ] `skills/qa-task/SKILL.md` lists `record_criteria` among its Pipeline Skill args and instructs the step that writes each named record, with command and output, into the report the criterion names — held by the dispatch-argument test, which asserts the token appears in `qa-task`'s args list and in both task-variant dispatch forms and in neither story dispatch (mutation: drop the token from one form and name the red test). Recorded in the QA report's Findings table.

### Performance

- [ ] The identity check adds at most 1 second per sub-skill load, measured as the median of five runs with `uptime` beside each run, outliers reported, recorded in the QA report.

### Code Quality

- [ ] `npm run bundle:check`, `npm run format:check`, `npm run lint:shell` and `ci:fast` pass under `CI=true`.
- [ ] `python skills/create-skill/scripts/quick_validate.py` passes for `develop-task`, `develop-story`, `develop-bug` and `qa-task`.

### Migration

- [ ] `CHANGELOG.md` entry citing task 311.
- [ ] Bundled copies regenerated and `UNREACHED`-free.

---

## 10. Risk Assessment

### HIGH RISK

None.

### MEDIUM RISK

1. **The base directory the Skill tool reports is not stable across harness versions.**
   - Risk: the check misclassifies a correct load as `shadowed`.
   - Probability: Low. Impact: Medium (a spurious inline read).
   - Mitigation: the Phase 1 measurement fixes the real shapes first; the fail-safe is `unreadable`, which falls back to today's behaviour with a warning.
   - Rollback: revert the three citations.

### LOW RISK

1. **`record_criteria` is ignored by a `qa-task` run that does not know the argument.** Mitigation: the argument is additive, and an unknown argument leaves today's behaviour.

---

## 11. Rollback Plan

**Immediate (under 1 hour)**: revert the merge commit; no data or schema is touched.

**Partial**: revert Phase 2 alone (the QA dispatch and `qa-task` edit) and keep Phase 1.

**Forward fix**: a misclassification fixes forward by adding the real path shape to the engine's test and its list.

**Triggers**: Critical: a correct run halts on a false `shadowed`. Non-critical: a missed record fixes forward.

---

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-17 | 1.0 | Initial draft — cut from observations #69, #160 (#5 and #6, reviewed with them, were already in the tree) | create-task |
| 2026-11-17 | 1.1 | Review passed (8/10) — 5 Important fixes applied (task-variant-only dispatch, test for the qa-task criterion, executable fenced block, enumerating tests named, bundle dependency) | review-task |
|  |  | Status → ready-for-development | review-task |
| 2026-11-17 |  | Implemented — 20 files outside docs, 3 test files (18 tests), fast gate 8554 tests green | develop |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: The identity check
- [x] Phase 2: The record hand-off
- [x] Phase 3: Bundle, docs and gate

---

## References

- Observation #69 — Skill tool resolves develop-pipeline sub-skills to user-level synced copies that shadow the repo's
- Observation #160 — A criterion's named record location is never filled before finalise
- Observations #105, #77 (the authoring-side warning this completes); task 259 (`finalise-record-preflight.js`)

---

## Notes

Cut with task 312 from the 2026-11-17 observation review. The two tasks are independent: neither depends on the other.
