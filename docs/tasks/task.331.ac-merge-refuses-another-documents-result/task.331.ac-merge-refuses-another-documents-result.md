---
id: task.331
title: "The AC merge refuses another document's result"
type: task
description: "finalise-rerun-scope.js merge refuses an AC result whose story_file names another document, and /finalise keys its AC state files by work item as well as DoD run number, so one item's verdicts can never become another's record."
tags: [finalise, observation]
category: infrastructure
status: planned
priority: Medium
risk_level: low
created: 2026-11-26
updated: 2026-11-26
estimated_effort_hours: 8
github_issue: 958
---

# Technical Task: The AC merge refuses another document's result

**GitHub Issue**: [#958](https://github.com/Gamaroff/agent-skills/issues/958)

**Status:** Planned

---

## 1. Overview

`/finalise` Step 3c merges the AC agent's answer into the DoD record with `finalise-rerun-scope.js
merge`. The merge reads whatever file `--result` names, and the state files are named by DoD run number
alone. In task 329's DoD run 1, the merge read a result task 325 had left behind and merged task 325's
verdicts under task 329's ids. This task makes the merge refuse a result for another document, and
names the state files by work item.

**Scope**: the `merge` arm of `shared/resources/finalise-rerun-scope.js`, its tests, and the four
state-file paths in `skills/finalise/SKILL.md`.

**Key deliverables:**

- `merge` answers `result-document-mismatch` and writes nothing when the result's `story_file` names
  another document;
- the AC result and merged files carry the work item's stem: `finalise-ac-result-{stem}-{N}.yaml`.

**Expected outcome**: a stale AC result from another work item cannot reach a DoD record, whatever is
left in `.claude/state/`.

---

## 2. Motivation

### Current Problems

1. **The merge does not check whose result it reads.** In task 329's DoD run 1 the extract wrote
   nothing (`transcript-unreadable`). `merge` then read `.claude/state/finalise-ac-result-1.yaml`,
   left by task 325's DoD run 1, and merged its verdicts under task 329's ids #1–#7
   (`docs/tasks/task.329.git-name-probe-sink/task.329.dod.1.git-name-probe-sink.md`, deviation 5). A
   read of the output caught it.
2. **The file names invite the collision.** Every work item's first DoD run writes
   `finalise-ac-result-1.yaml` and `finalise-ac-merged-1.json`. So two items run in sequence in one
   checkout share both paths.
3. **The defence today is a human habit.** Task 325's DoD run 2 deleted the run-2 files by hand before
   its merge. Nothing in the skill says to.

### Benefits of Solution

1. A wrong-document result is refused by the engine, not caught by a reader.
2. Two work items finalised in one checkout never share a state path.
3. The refusal has a named reason, which Step 3c can route like `result-hash-mismatch`.

---

## 3. Technical Background

Every result below was read on 2026-11-26 at `ba0882a1f`.

### Current Architecture

- **The merge arm.** `shared/resources/finalise-rerun-scope.js:1144`
  *(`if (opts.cmd === "merge")`)* reads `--scope` and `--result`. It refuses a result whose hash is
  not `--sha256` (`reason: "result-hash-mismatch"`, `exitCode: 0`, writes nothing, `:1178`), then
  calls `merge(s, agentYaml, { document: s.document ?? null, … })` (`:1185`).
- **What the scope knows.** The scope result carries `document`, the repo-relative path `scope` was
  run with (`s.document = opts.doc`, `:1140`). Task 325's run-2 scope reads
  `docs/tasks/task.325.docs-only-rule-exclusions/task.325.docs-only-rule-exclusions.md`.
- **What the result carries.** `merge()` (`:725`) reads `ac_traceability` (`:737`). The AC prompt's
  contract writes `story_file: "<STORY_FILE>"` (`shared/resources/finalise-dod-ac-prompt.md:122`).
  The DoD runs of tasks 325 and 329 substituted an **absolute** path, and nothing in `merge()` reads
  `story_file` (`grep -n story_file shared/resources/finalise-rerun-scope.js`: no hit).
- **The state paths.** `skills/finalise/SKILL.md` names `finalise-ac-result-${DOD_N}.yaml` and
  `finalise-ac-merged-${DOD_N}.json` on 4 lines (`:1020`, `:1043`, `:1048`, `:1657`), and
  `shared/resources/tests/finalise-deferred-ci.test.mjs` on 7. The count came from
  `git grep -n 'finalise-ac-\(result\|merged\)-' -- skills shared docs ':!docs/tasks'`, excluding
  generated `references/` copies.
- **The fixtures.** `shared/resources/tests/finalise-rerun-scope.test.mjs` holds 27 `ac_traceability`
  fixtures (`grep -c`). 2 of them carry `story_file` (`:750`, `:2156`), both the test's own `DOC`
  (`:56`).

### Target Architecture

In the `merge` arm, after the hash check: when the result's `ac_traceability.story_file` is present
and, resolved against the repository root, is not the scope's `document`, answer
`{ reason: "result-document-mismatch", exitCode: 0, mode, message }` and write nothing. The message
names both paths. A result with no `story_file` merges as today.

**Narrowed to keep the decisions the tests hold.** A stricter rule would also refuse a missing
`story_file`. It would turn 25 of the 27 merge fixtures red, each of which holds a `merged` decision on
a result that never carried the field. The narrow rule refuses only what is known to be wrong.
Requiring the field is a later choice, for when every writer emits it.

The SKILL.md paths gain the stem: `finalise-ac-result-${STEM}-${DOD_N}.yaml` and
`finalise-ac-merged-${STEM}-${DOD_N}.json`, with `STEM` bound as Step 0 binds it.

### Important Clarifications

- **Absolute or relative.** `story_file` and `document` are compared after `path.resolve` against the
  repository root, so `/home/…/docs/tasks/t/t.md` and `docs/tasks/t/t.md` are one document.
- **Not the extract.** Task 327 makes a failed extract leave no file behind. That is the other half
  of observation #191, and it is not done here. This task holds even when a stale file exists.

---

## 4. Scope

### In Scope

✅ The `merge` arm of `finalise-rerun-scope.js` and its tests

✅ The AC state-file paths in `skills/finalise/SKILL.md` and `finalise-deferred-ci.test.mjs`

### Out of Scope

❌ **The extract leaving a stale file**: task 327.

❌ **Requiring `story_file`**: see § 3, narrowed.

❌ **Other `.claude/state` files** (the probe plan, the CI result): the probe plan's staleness is task 327's.

---

## 5. Breaking Changes

### Breaking Change 1: a mismatched result is refused

**What Changed**: `merge` answers `result-document-mismatch` and writes no record. Before, it merged.

**Impact**: a run that hand-copies a result for the wrong document now stops at Step 3c with a named
reason instead of writing a wrong record.

**Migration**: none. Step 3c routes the reason as it routes `result-hash-mismatch`.

### Breaking Change 2: the AC state files carry the stem

**What Changed**: `finalise-ac-result-{N}.yaml` becomes `finalise-ac-result-{stem}-{N}.yaml`, and the
same for the merged file.

**Migration**: none for a fresh run. A run resumed across the upgrade re-runs Step 3c, which the skill
already does when the file is absent.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.331.plan.ac-merge-refuses-another-documents-result.md](task.331.plan.ac-merge-refuses-another-documents-result.md)

### Phase 1: The refusal

**Risk Level**: Low

**Files**:
- `shared/resources/finalise-rerun-scope.js`
- `shared/resources/tests/finalise-rerun-scope.test.mjs`

**Changes**:
- [ ] Write the failing cases first (§ 8)
- [ ] Refuse a present, mismatched `story_file` with `result-document-mismatch`

**Dependencies**: task 327, which edits the same file and the Step 3c prose

### Phase 2: The state paths

**Risk Level**: Low

**Files**:
- `skills/finalise/SKILL.md`
- `shared/resources/tests/finalise-deferred-ci.test.mjs`

**Changes**:
- [ ] Add `${STEM}` to the four paths, and route `result-document-mismatch` in Step 3c's reason table
- [ ] Update the test's seven paths

**Dependencies**: Phase 1

### Phase 3: Records and bundle

**Risk Level**: Low

**Files**:
- `CHANGELOG.md`
- Generated copies under `skills/*/references/`

**Changes**:
- [ ] Write the CHANGELOG entry
- [ ] Run `npm run bundle`, then `npm run bundle:check`

**Dependencies**: Phases 1 and 2

---

## 7. Files Summary

### Files to Create

None.

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/finalise-rerun-scope.js` - the refusal
2. ✅ `skills/finalise/SKILL.md` - the four state paths and the reason row

### Files to Modify (Tests)

3. ✅ `shared/resources/tests/finalise-rerun-scope.test.mjs`
4. ✅ `shared/resources/tests/finalise-deferred-ci.test.mjs`

### Files to Modify (Documentation)

5. ✅ `CHANGELOG.md`

### Generated

6. ✅ `skills/*/references/finalise-rerun-scope.js` copies, by `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

| Case | Today | After |
| :-- | :-- | :-- |
| a result whose `story_file` is another document | `merged`, record written | `result-document-mismatch`, nothing written |
| the same, with `story_file` absolute and the scope relative, naming the same document | `merged` | `merged` |
| a result with no `story_file` | `merged` | `merged` |
| a mismatched result **and** a mismatched `--sha256` | `result-hash-mismatch` | `result-hash-mismatch` (the hash is checked first) |

**Command**: `command node --test shared/resources/tests/finalise-rerun-scope.test.mjs shared/resources/tests/finalise-deferred-ci.test.mjs`

### Mutation Tests

Each alone turns a named test red: the refusal removed; the comparison made on the raw strings, so an
absolute and a relative path differ.

### Consumer Tests

`npm run test:remote` runs the whole suite, including the eval tests that run the Step 3c blocks
(`evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`).

### Performance Tests

Not applicable.

---

## 9. Success Criteria

### Functional

- [ ] Every row of the § 8 table holds in a test
- [ ] `git grep -n 'finalise-ac-\(result\|merged\)-\${DOD_N}' -- skills shared` finds no path without the stem

### Performance

- [ ] Not applicable: no bound is claimed

### Code Quality

- [ ] Every mutation in § 8 is recorded in the QA report with the test it turned red
- [ ] `npm run test:remote` and `npm run bundle:check` pass

### Migration

- [ ] Step 3c's reason table routes `result-document-mismatch`
- [ ] `CHANGELOG.md` `[Unreleased]` names both changes of § 5

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

#### 1. A correct result is refused

**Risk**: a path spelling the comparison does not fold (a symlinked checkout, a trailing slash)
**Probability**: Low
**Impact**: Low (Step 3c stops with a named reason; nothing wrong is written)
**Mitigation**: compare resolved paths; the absolute-vs-relative row of § 8

#### 2. A resumed run looks for the old file name

**Risk**: a run started before the upgrade and resumed after it
**Probability**: Low
**Impact**: Low
**Mitigation**: the file is absent, and Step 3c re-runs

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a correct AC result refused

**Steps**:
1. `git revert` the merge commit
2. `npm run bundle`, then `npm run bundle:check`

**Validation**: the command of § 8

### Partial Rollback (1-2 hours)

Phase 2 (the paths) and Phase 1 (the refusal) can be reverted apart.

### Forward Fix (< 4 hours)

The path comparison, or the message.

### Rollback Triggers

**Critical**: a record written from another document's result

**Non-critical**: wording

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-26 | 1.0     | Initial draft — cut from observation #191 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The refusal

- [ ] Failing cases
- [ ] Refusal

### Phase 2: The state paths

- [ ] SKILL.md paths and reason row
- [ ] Test paths

### Phase 3: Records and bundle

- [ ] CHANGELOG
- [ ] Bundle

---

## References

- Observation #191 — finalise AC state files are keyed by run number only, so one work item's result merged into another's
- `docs/tasks/task.329.git-name-probe-sink/task.329.dod.1.git-name-probe-sink.md` (deviation 5, the incident)
- Task 327 (`docs/tasks/task.327.subagenthandback-replies-are-extracted/`), the extract half

## Notes

- QA report: `task.331.qa.{N}.ac-merge-refuses-another-documents-result.md`; gate: `task.331.gate.{N}.ac-merge-refuses-another-documents-result.yml`; bugs: `task.331.bug.{N}.{name}.md`, all in this directory.
