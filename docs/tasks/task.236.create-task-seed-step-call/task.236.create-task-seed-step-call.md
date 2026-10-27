---
id: task.236
title: "create-task 1.1 omits the required taskId argument to seedFromObservations"
type: task
description: "In § 1.1 step 3, name the second argument: `seedFromObservations(entries, { taskId: <Next Available Task Number> })`, and say the id must be read from the registry first."
tags: [create-task, observation]
category: documentation
status: ready-for-review
priority: Medium
created: 2026-10-27
updated: 2026-10-27
assignee:
estimated_effort_hours: 8
github_issue: 760
---

# Technical Task: create-task 1.1 omits the required taskId argument to seedFromObservations

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.236.review.1.create-task-seed-step-call.md` implemented 2026-10-27

**GitHub Issue**: [#760](https://github.com/Gamaroff/agent-skills/issues/760)

---

## 1. Overview

`create-task` § 1.1 step 3 tells the agent how to call `seedFromObservations`, but leaves out the
`taskId` argument the function requires, so following the prose exactly throws on the first call.
This task replaces the prose description with one runnable block that makes the call correctly. A
test runs that block from `SKILL.md`, so the step and the function cannot drift apart again.

**Scope**: `skills/create-task/SKILL.md` § 1.1 step 3, and one new test in
`skills/create-task/tests/`.

**Key deliverables**:

1. Step 3 is a fenced `bash` block. It reads the task id from the registry and calls
   `seedFromObservations` **once**, with every selected entry and `{ taskId }`.
2. A test extracts that block from `SKILL.md`, runs it against a scratch observation log, and
   asserts the seed it prints.

**Expected outcome**: the next `/create-task --from-observation` run seeds on the first attempt.

---

## 2. Motivation

### Current Problems

1. **The step throws if followed exactly.** `SKILL.md:205-208` says to pass
   `{ frontmatter: <the scan entry>, body: <the file's text> }` to `seedFromObservations`. The
   signature is `seedFromObservations(entries, { taskId } = {})` (`scripts/lib.js:316`), and a
   missing id throws `seedFromObservations: taskId is required (it names the park condition)`
   (`scripts/lib.js:323-324`). It threw on the task.235 run (2026-10-26). The id had to be found
   by reading the source.
2. **"For each entry" contradicts step 4.** Step 3 opens "For each entry, read … and pass". The
   function takes **all** the entries in one array: a multi-entry seed returns `title: null` with
   `titleReason: "multiple-entries"` (`scripts/lib.js:383`), and step 4 asks for a title exactly
   in that case. Calling it once per entry never produces that reason, and gives one References
   list and one Change Log description per entry instead of one each.
3. **Nothing holds the prose to the function.** All 24 calls to `seedFromObservations` in
   `skills/create-task/tests/from-observation.test.js` pass a `taskId`
   (`grep -c "seedFromObservations(" skills/create-task/tests/from-observation.test.js`). None
   reads `SKILL.md`, so a wrong step doc passes every test.
4. **The id comes from a different section.** The task id is "auto-generated" in § 1 from the
   registry's **Next Available Task Number**. § 1.1 never says the seed needs it, or that the id
   must be read first.

### Benefits

1. **First-attempt seeding**: the block makes the correct call, and the agent runs it as it stands.
2. **One call, right outputs**: a multi-entry run gets `multiple-entries`, one References list and
   one Change Log row.
3. **Held by behaviour, not text**: the test runs the block, so changing either the block or the
   function's contract turns it red (`feedback_assert_behaviour_not_source_text`).
4. **Smaller step doc**: one block replaces a paragraph of call description.

---

## 3. Technical Background

### Current Architecture

Grepped on 2026-10-27 at `develop` `21b03e8c`.

- `skills/create-task/SKILL.md:205` — step 3 "**Seed.** For each entry, read `${OBS_LOG_DIR}/<file>`
  …" is prose, with no fenced block. Steps 1 (`SKILL.md:190-193`, the scan) and § 5 step 2b
  (`SKILL.md:717`, the park) are fenced `bash` blocks.
- `skills/create-task/scripts/lib.js:316` — `function seedFromObservations(entries, { taskId } = {})`;
  exported at `scripts/lib.js:456`.
- `grep -rn "seedFromObservations" skills shared --include=*.md` returns one prose site:
  `skills/create-task/SKILL.md:208`. No other skill describes the call.
- `shared/resources/qa-execute-snippets.mjs:70` — `export function extractBlocks(markdown)`
  returns every fenced `bash` block with its opening line. Five tests under
  `shared/resources/tests/` already import it, for example `halt-snippet-glob-safe.test.mjs:27`.
- `skills/create-task/tests/from-observation.test.js:42` — `SCRATCH_ROOT` is a repo-local scratch
  directory. The observation engine refuses `/tmp` as ephemeral, so the new test reuses this
  pattern.
- `package.json` `test:suite` already globs `'skills/create-task/tests/*.test.js'`, so a new test
  file there runs in `npm test` and in CI with no glob edit.

### Target Architecture

Step 3 becomes a single fenced block, roughly:

```bash
source .agents/skills/create-task/references/resolve-observation-workspace.sh || exit 1
TASK_ID="{the registry's Next Available Task Number}"
OBS_IDS="{the selected ids, comma-separated}"
command node .agents/skills/create-task/references/observation-log.js scan --json \
  | command node -e '…select by file prefix, read each body from $OBS_LOG_DIR,
       call seedFromObservations(entries, { taskId }) ONCE, print the JSON…' "$TASK_ID" "$OBS_IDS"
```

The prose around it keeps what the block cannot say: what each returned field is for, and the
grep-before-write rule (obs #127).

### Important Clarifications

- **The function does not change.** `taskId` is required for a reason: the park vector names
  `task.<id> merged to develop`. Making it optional would let a seed with no park condition through.
  The prose is wrong, not the function.
- **The test runs the block, it does not grep it.** A test that checks `SKILL.md` contains
  `taskId` passes on a block that still throws.

---

## 4. Scope

### In Scope

✅ **Step doc**: `skills/create-task/SKILL.md` § 1.1 step 3. § 1.1 also gains one line saying the
seed needs the task id from § 1.
✅ **Test**: a new `skills/create-task/tests/seed-step-block.test.js`.
✅ **CHANGELOG**: `[Unreleased]` entry.

### Out of Scope

❌ **`seedFromObservations` itself**: correct as written; see § 3.
❌ **Steps 1, 2 and 4 of § 1.1, and § 5 step 2b**: they are already blocks, or they are decisions
rather than calls.
❌ **A general prose-vs-signature checker** for every skill: no second instance is known. This task
fixes the one site.

---

## 5. Breaking Changes

None. The change is to documentation and adds one test. The function's contract is unchanged.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.236.plan.create-task-seed-step-call.md](task.236.plan.create-task-seed-step-call.md)

### Phase 1: Test first (Risk: Low)

**Files**: `skills/create-task/tests/seed-step-block.test.js` (new)

- [x] Locate the step 3 block in `SKILL.md` by its `seedFromObservations` call, and assert exactly one block makes it.
- [x] Run it under bash in a consumer-shaped scratch directory, against two fixture observations.
      Initialise the log with the engine's `init`, then write the fixture files directly, as
      `from-observation.test.js:322-330` does. Do not author them through the engine's `write`: two
      entries on one skill with overlapping titles return `possible-duplicate` and write nothing,
      and the control case needs a file whose prefix disagrees with its id, which `write` cannot make.
- [x] Assert the printed seed: `ids` `[a, b]`, `titleReason` `multiple-entries`, two park vectors naming `task.<TASK_ID>`.
- [x] Before the step is rewritten, the test is red: today there is no block, so the first assertion fails.

### Phase 2: Rewrite step 3 (Risk: Low)

**Files**: `skills/create-task/SKILL.md`

- [x] Replace the step 3 call description with the block from § 3, keeping the field list and the grep rule as prose.
- [x] Add one line to § 1.1 that the seed needs the task id from § 1, read before step 3.
- [x] The Phase 1 test passes.

### Phase 3: Prove and ship (Risk: Low)

**Files**: `CHANGELOG.md`

- [x] Mutation proofs: drop `{ taskId }` from the block → red; switch to a per-entry loop → red.
- [x] `npm run bundle:check` clean; `npm run validate -- skills/create-task/`.
- [x] `npm run ci` green with `.agents/skills` and `.claude/skills` moved aside. (`npm run ci:fast`
      green with both moved aside: 6418 tests, 6404 pass, 0 fail, 14 skipped, both new tests among
      them. The full `npm run ci` is `develop-next`'s merge gate on the PR head.)
- [x] CHANGELOG `[Unreleased]`.

---

## 7. Files Summary

**Documentation**

1. ✅ `skills/create-task/SKILL.md`: § 1.1 step 3 and one line in § 1.1
2. ✅ `CHANGELOG.md`: `[Unreleased]`

**Tests**

3. ✅ `skills/create-task/tests/seed-step-block.test.js`: new

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the step 3 block, executed. The engine and the function run for real; nothing is
  mocked.
- **Command**: `command node --test skills/create-task/tests/seed-step-block.test.js`
- **Target**: one test per assertion in Phase 1, each seen red first.

### Control case

The fixtures are two new observations, not #104, so the test cannot pass on the example that
motivated it. One fixture's frontmatter id disagrees with its file prefix, a case
`seedFromObservations` must refuse: running the block on that pair must exit non-zero.

### Regression

- `skills/create-task/tests/from-observation.test.js` passes unchanged.
- `npm run ci` with symlinks aside: the block runs through `.agents/skills`, which CI does not have,
  so the test builds its own consumer-shaped tree (`project_gitignored_agents_symlink_masks_ci_failures`).

---

## 9. Success Criteria

### Functional

- [x] Exactly one fenced `bash` block in `SKILL.md` calls `seedFromObservations`, and it passes `{ taskId }`.
- [x] Run on two open fixture observations, the block prints one seed: `ids` holds both,
      `titleReason` is `multiple-entries`, and each park vector's `--parked-until` names `task.<TASK_ID>`.
- [x] Run on a pair where one entry's frontmatter id disagrees with its file prefix, the block exits non-zero.
- [x] § 1.1 says the task id is read from the registry before the seed.

### Performance

- [x] The new test runs in under 5 seconds, measured on the PR head with
      `uptime; time command node --test skills/create-task/tests/seed-step-block.test.js` and the
      figure and load recorded in the implementation report.
- [x] The existing create-task suite is untouched:
      `git diff develop -- skills/create-task/tests/from-observation.test.js` is empty.

### Code Quality

- [x] `node:test` + `node:assert` only; Prettier clean.
- [x] Each mutation in Phase 3 turns a named test red.
- [x] `npm run validate -- skills/create-task/` passes; `npm run bundle:check` clean.

### Migration

- [x] CHANGELOG `[Unreleased]` records the change.
- [x] No other skill restates the call (`grep -rn "seedFromObservations" skills shared --include=*.md` returns only lines of `skills/create-task/SKILL.md` § 1.1, and the only call among them is inside the new block).

---

## 10. Risk Assessment

### HIGH RISK

None identified.

### MEDIUM RISK

1. **The test passes locally and fails in CI**
   - Risk: the block's `.agents/skills/…` paths resolve through the gitignored local symlink.
   - Probability: Medium. Impact: Low (CI red, nothing ships).
   - Mitigation: the test builds a scratch tree with `.agents/skills/create-task` pointing at the
     repository's `skills/create-task`, and runs `npm run ci` with the symlinks moved aside.
   - Rollback: revert the test commit.

### LOW RISK

1. **The block's guard text breaks bash parsing**: an apostrophe in a `${VAR:?message}` guard
   breaks the parse (obs #47). Mitigation: no apostrophes in guard messages; the test runs the block
   under bash.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the create-task suite or CI goes red because of the new test.
- **Steps**: revert the merge commit on `develop`.
- **Validation**: `command node --test skills/create-task/tests/*.test.js` green.

### Partial Rollback

- **When**: the test is flaky but the step doc is right.
- **Steps**: revert the test file only, and open a bug for the flake.

### Forward Fix

- **When**: the block works but the surrounding prose misleads.
- **Approach**: edit the prose; the test does not read it.

### Rollback Triggers

- **Critical**: the block itself throws on valid input.
- **Non-critical**: wording.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-27
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.236.qa.2.create-task-seed-step-call.md](./task.236.qa.2.create-task-seed-step-call.md)
- **Gate File**: [task.236.gate.2.create-task-seed-step-call.yml](./task.236.gate.2.create-task-seed-step-call.yml)

### Test Coverage Summary
- **Tests Executed**: 49
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 1's three findings are fixed and mutation-proven. One new medium (QA2-1): the block double-quotes the substituted task number and ids, so bash expands `$(...)` and a double quote can run a command before the node guard reads the text.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                               | Author      |
| ---------- | ------- | ----------------------------------------- | ----------- |
| 2026-10-27 | 1.0     | Initial draft — cut from observation #104 | create-task |
| 2026-10-27 | 1.1     | Review passed (8/10) — performance criteria given a command and a measurable bound; fixture authoring pinned to direct file writes (engine `write` would answer `possible-duplicate`); grep criterion and two line anchors tightened | review-task |
| 2026-10-27 |         | Status → ready-for-development             | review-task |
| 2026-10-27 |         | Implemented — 3 files, 2 tests             | develop     |
| 2026-10-27 |         | QA gate CONCERNS (70/100) — 3 findings     | qa-task     |
| 2026-10-27 |         | QA findings fixed — cycle 1, 3 findings    | qa-fix      |
| 2026-10-27 |         | QA gate CONCERNS (90/100) — 1 finding      | qa-task     |
| 2026-10-27 |         | QA findings fixed — cycle 2, 1 finding     | qa-fix      |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Test first
- [x] Block located, run, asserted; seen red

### Phase 2: Rewrite step 3
- [x] Block in place; § 1.1 line added; test green

### Phase 3: Prove and ship
- [x] Mutations, bundle check, validate, CI, CHANGELOG

---

## Implementation Record

**Completion Date**: 2026-10-27

### Implementation Summary

§ 1.1 step 3 of `create-task` is now one fenced `bash` block. It re-sources the observation
workspace resolver, scans, selects each id's file by prefix, and calls
`seedFromObservations(entries, { taskId })` once over every selected entry. The step's opening
sentence says the task id is the registry's **Next Available Task Number** and must be read first.
The new `seed-step-block.test.js` extracts that block from `SKILL.md` and runs it.

### Implementation Approach

1. **Phase 1**: wrote `skills/create-task/tests/seed-step-block.test.js` (2 tests). It builds a
   repo-local scratch workspace with its own `.agents/skills/create-task` link, initialises the log
   with the engine, writes the fixture files directly, substitutes the block's two placeholders by
   `split`/`join`, and runs the block under `bash`. Seen red first: `exactly one bash block … calls
   seedFromObservations`.
2. **Phase 2**: replaced the prose call description with the block. The placeholders are
   `{next-task-number}` and `{observation-ids}`. The field list, the identity rule and the
   grep-before-write rule (obs #127) stay as prose after it. "It throws" became "the block exits
   non-zero, naming the entry".
3. **Phase 3**: three mutations, each restored:
   - drop `{ taskId }` → the multi-entry test is red (`taskId is required`);
   - a per-entry loop → the multi-entry test is red (`ids` is `[1]`);
   - `|| true` after the pipeline → the control test is red (it exits 0 on a mismatched id).

### Testing Results

- `command node --test skills/create-task/tests/seed-step-block.test.js`: 2/2 pass.
- `command node --test skills/create-task/tests/*.test.js`: 46/46 pass.
- `npm run ci:fast` with `.agents/skills` and `.claude/skills` moved aside: 6418 tests, 6404 pass,
  0 fail, 14 skipped.
- `npm run validate -- skills/create-task/` ✓; `npm run bundle:check`: 128 skills, 0 problems.

### Deferred Work

None.

---

## References

- Observation #104 — create-task 1.1 omits the required taskId argument to seedFromObservations
- [task.150](../task.150.create-task-authoring-evidence/task.150.create-task-authoring-evidence.md): introduced `--from-observation` and `seedFromObservations`
- [task.235](../task.235.select-next-external-precondition/task.235.select-next-external-precondition.md): the run that hit the defect

---

## Notes

### Important Reminders

- Use `extractBlocks` from `qa-execute-snippets.mjs`, required by path, not a new fence regex
  (obs #48). Do not write the `shared/resources/` literal in a skill's `.js` file: it is a bundling
  instruction. Build the path with `path.join`, as `from-observation.test.js` does.

### Future Improvements

- If a second step doc is found describing a call its function would refuse, consider a general
  checker. Until then, one site, one test.

---

**Status:** Ready for Review

**Next Steps**:

1. `/develop-task docs/tasks/task.236.create-task-seed-step-call/task.236.create-task-seed-step-call.md`
2. QA will create:
   - QA Report: `task.236.qa.[number].create-task-seed-step-call.md`
   - Bug Reports (if needed): `task.236.bug.[N].[name].md`
   - Quality Gate: `task.236.gate.[number].create-task-seed-step-call.yml`
