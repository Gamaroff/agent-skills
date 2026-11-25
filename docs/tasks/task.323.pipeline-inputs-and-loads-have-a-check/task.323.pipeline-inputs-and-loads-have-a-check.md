---
id: task.323
title: "The QA loop's globs have a command, and a skill load leaves a record"
type: task
description: "Give the QA loop's testArtifactGlobs input one command that prints the array or refuses with a reason, and record each sub-skill load on the pipeline lock so a step that followed remembered text is seen."
tags: [develop-task, develop-story, develop-bug, qa-loop, observation]
category: refactoring
status: planned
priority: Medium
risk_level: medium
created: 2026-11-25
updated: 2026-11-25
estimated_effort_hours: 8
github_issue: 943
---

# Technical Task: The QA loop's globs have a command, and a skill load leaves a record

**GitHub Issue**: [#943](https://github.com/Gamaroff/agent-skills/issues/943)

**Status:** Planned

---

## 1. Overview

Two steps of the develop pipelines depend on something no command produces. The QA loop's two
classifiers take `qa.testArtifactGlobs` as JSON, and a table says where it comes from. Step 7 says
`/finalise` must be loaded through the Skill tool, and only the agent's memory says whether it was. This
task gives each a command.

**Scope**: one reader, two blocks of the QA loop, the skill-load check of task 311, three fields of the
pipeline lock, and two completion checklists.

**Key deliverables:**

- `qa-test-globs.js` prints the array, or a reason and exit 2;
- both QA-loop blocks bind the value with it;
- `skill-resolution.js check` records each load on the lock, and `loaded` reads the record;
- a compaction, a restore and a gaps result each make the record invalid;
- the Step 7 and Step 8 checklists ask for the record.

**Expected outcome**: a value is never typed by hand, and a step that followed remembered text is seen
before it is marked done.

---

## 2. Motivation

### Current Problems

1. **The globs had no command.** On task 319 cycle 5 the orchestrator wrote a reader, it returned YAML
   text, the classifier threw on `JSON.parse`, and the globs were typed by hand (obs #175).
2. **One of two blocks hides the fault.** `classifyNarrowingResidue`'s block reads an unparseable value as
   `[]` with no message. `classifyLoopRoute`'s block throws.
3. **`/finalise` ran from memory.** After a compaction on task 319, the orchestrator followed the steps of
   a skill loaded earlier. Every later check passed (obs #179). A compaction also cuts a loaded skill's
   text short, so the remembered steps can be part of it.
4. **The checklist item cannot fail.** "`/finalise` skill was invoked" is answered by the agent that may
   have forgotten.

### Benefits of Solution

1. The value has one source, one shape, and a reason when it cannot be read.
2. An inline list, which the YAML subset reads as text, is refused and not guessed.
3. Forgetting to load a skill after a compaction is found by a command.
4. It works in any agent. No hook is added.

---

## 3. Technical Background

Every name below was grepped or run at `6f6c67aad` (v0.69.0).

### Current Architecture

- **The globs.** `develop-pipeline-step-5-6-qa-loop.md:758` and `:1102` are table rows. The blocks read
  `$TEST_ARTIFACT_GLOBS_JSON` at `:769` (`JSON.parse`, throws) and `:1116` (`catch { … = []; }`). The text
  above the first table says what to do with an input that does not resolve: go on to 5b, and do not guess.
- **The configuration readers.** `read-config.sh` reads scalars, and answers `__MAP__` for a list.
  `yaml-subset.js` parses the block list. `ci-tree-equivalence.js` *(`readConfig`)* reads `ci.docsOnly`
  from the same file and refuses an inline list.
- **The load check (task 311).** `skill-resolution.js` `check --name --base-dir --root`. The rule
  `skill-resolution.md` § "After every load" makes the orchestrators run it. It writes nothing.
- **The lock.** `advance-pipeline-lock.sh`: `clear_pause` *(`jq 'del(.paused)'`)*, `restore_lock`
  *(`del(.halted_at, … .waiting_on)`)*, and the finalise hold *(`finalise not accepted`)*. The PreCompact
  hook writes `paused: {at, step, reason}`.
- **The checklists.** `develop-pipeline-step-7-finalise.md:551`, whose first item is the memory one, and
  Step 8's `## Invoke /commit-changes`.

### Other code that does this job

| Where | Relation |
| :-- | :-- |
| `ci-tree-equivalence.js` `readConfig` | **Beside.** It parses the `ci` and `pipeline` blocks, strictly, and exports no list reader. The new reader takes its refusals as the model |
| `skill-resolution.js` `check` | **Extended.** Same call, one more effect |
| The removed `on-skill-return.sh` hook (`b2561e9ef`, 2026-06-01) | **Not brought back.** It moved the lock when a skill loaded. The owner chose a record over a hook on 2026-11-25 |

### A decision the tests hold

`evals/shared/tests/qa-narrowing-offer-wiring.test.mjs` asserts that `[]`, an empty value and an
unparseable one each read as "no fold", with exit 0 and never an error. Observation #175 asked that an
unreadable value print a reason and not an empty list. The remedy is **narrowed**: the new command
refuses, and the narrowing block keeps its own fallback. The block gains one line on stderr, which those
tests do not read.

### Target Architecture

**`shared/resources/qa-test-globs.js [--root <dir>] [--json]`**

| Input | Output | Exit |
| :-- | :-- | --: |
| no file, no `qa`, no key, or an empty key | `[]` | 0 (`absent`) |
| a block list of strings, or `[]` | the array | 0 (`ok`) |
| an inline list, a scalar, a `qa` that is not a block mapping, an entry that is not a string, an unreadable file | nothing on stdout, the reason on stderr | 2 (`malformed`) |

Both blocks bind it: `TEST_ARTIFACT_GLOBS_JSON=$(command node …) || …`. On exit 2 the route classifier
does not run and the loop goes on to 5b, by the rule that stands there today. The narrowing check runs
with nothing folded. The Decisions Log gets the reason in both.

**The load record.** On a present lock, `check` writes
`skill_loads.<name> = {at, reason, base}`. The exit code and the JSON of `check` do not change. A lock that
is absent or is not an object is left alone. A paused mark is cleared before the write, through
`advance-pipeline-lock.sh --clear-pause`, as `set-waiting-on.sh` and `set-qa-phase.sh` do. A load is
the first thing a session does after a compaction, and while the mark is set the Stop hook allows every stop. `check --no-base-dir` records `unreadable`, for the two cases
the rule treats as one: no `Base directory` line, and "Unknown skill".

`skill-resolution.js loaded --name <skill> [--json]`:

| `reason` | Exit | When |
| :-- | --: | :-- |
| `recorded` | 0 | the record is there, and later than the last pause |
| `not-recorded` | 1 | no record, or it is not later than `last_pause_at`, or than `paused.at` while the mark is set |
| `no-lock` | 1 | no lock, or one that does not parse. Outside a pipeline there is nothing to check |
| `usage` | 2 | the call is wrong |

**What makes a record invalid**, each in `advance-pipeline-lock.sh`:

- `clear_pause` keeps the pause's time: `.last_pause_at = .paused.at | del(.paused)`;
- `restore_lock` also deletes `.skill_loads`: the session is a new one;
- a finalise hold whose DoD does not read ACCEPTED deletes `.skill_loads.finalise`: run 2 needs its own load.

**The checklists.** Step 7's first item becomes the command `loaded --name finalise`. Step 8 gets
`loaded --name commit-changes`. The Step 7 item proves "loaded since the last compaction and since the
last gaps result". The Step 8 item proves less, "loaded since the last compaction", because Steps 4 to 6
also load `commit-changes`. Each item says so. On `not-recorded`: load the skill through the Skill tool, run `check`, and
compare what was done with its text. A step already done and accepted is not run again.

**What it proves, and what it does not.** The record is written by a command the agent runs. It catches a
load that was forgotten. It does not catch one that was faked.

### What was tried, and what was not

| Remedy | Result |
| :-- | :-- |
| the reader's twelve input shapes, over `yaml-subset.js` | as the table above; an inline list arrives as the text `["a/**"]` and is refused |
| the three lock changes, in a scratch clone | `advance-pipeline-lock.test.sh` 235 of 235, before and after, in bash and zsh |
| a paused lock with an older finalise record, then a hold | the record goes, and `last_pause_at` holds the pause's time |

**Not exercised**: `check`'s write, `loaded`, and the two blocks. In the trial the hold deleted the record
on any hold. The plan narrows that to a DoD that was read and is not accepted.

---

## 4. Scope

### In Scope

✅ `qa-test-globs.js`, its tests, and both blocks

✅ `skill-resolution.js` `check` and `loaded`, and `skill-resolution.md`

✅ `advance-pipeline-lock.sh`: the pause, the restore and the hold

✅ The Step 7 and Step 8 checklists, and `develop-bug`'s Step 7

### Out of Scope

❌ **A harness hook.** The owner chose the record on 2026-11-25.

❌ **Refusing the 7 → 8 advance without a record.** A run that was in flight when the change was installed
has none. The checklist asks, and the lock does not refuse.

❌ **The YAML subset.** It does not learn inline lists.

❌ **Records for the QA loop's own loads** beyond what `check` already writes for them.

---

## 5. Breaking Changes

None - API stable. Two things a consumer may see:

- a `qa.testArtifactGlobs` written as an inline list or a scalar was read as no match, and now prints a
  reason. The loop behaves as before: it does not take the exit;
- the lock has three new fields. A reader that does not know them is not affected.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.323.plan.pipeline-inputs-and-loads-have-a-check.md](task.323.plan.pipeline-inputs-and-loads-have-a-check.md)

### Phase 1: The globs

**Risk Level**: Low

**Files**:
- `shared/resources/qa-test-globs.js` (new)
- `shared/resources/tests/qa-test-globs.test.mjs` (new)
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
- `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs`

**Changes**:
- [ ] Write the failing cases first (§ 8)
- [ ] Write the reader
- [ ] Bind the value in both blocks, and replace both table rows with the command
- [ ] Print the reason when the narrowing block folds nothing because the value did not parse

**Dependencies**: None

### Phase 2: The load record

**Risk Level**: Medium

**Files**:
- `shared/resources/skill-resolution.js`
- `shared/resources/advance-pipeline-lock.sh`
- `shared/resources/tests/skill-resolution.test.mjs`
- `shared/resources/tests/skill-resolution-reach.test.mjs`
- `shared/resources/advance-pipeline-lock.test.sh`

**Changes**:
- [ ] Write the failing cases first
- [ ] `check` records, and `loaded` reads
- [ ] `clear_pause`, `restore_lock` and the finalise hold
- [ ] `--no-base-dir`

**Dependencies**: None

### Phase 3: The rule and the checklists

**Risk Level**: Low

**Files**:
- `shared/resources/skill-resolution.md`
- `shared/resources/develop-pipeline-step-7-finalise.md`
- `shared/resources/develop-pipeline-step-8-commit.md`
- `shared/resources/develop-pipeline-hooks.md`
- `skills/develop-bug/SKILL.md`

**Changes**:
- [ ] State the record, what makes it invalid, and what it does not prove
- [ ] Say that after a compaction the skill in use is loaded again before its next step
- [ ] Replace the memory item of Step 7's checklist, and add Step 8's
- [ ] Say beside the removed hook's note why this is a record and not a hook

**Dependencies**: Phase 2

### Phase 4: Records and bundle

**Risk Level**: Low

**Files**:
- `CHANGELOG.md`
- `docs/reference/configuration.md`
- Generated copies under `skills/*/references/`

**Changes**:
- [ ] `docs/reference/configuration.md`: an inline `qa.testArtifactGlobs` is refused with a reason
- [ ] Write the CHANGELOG entry
- [ ] Run `npm run bundle`, then `npm run bundle:check`

**Dependencies**: Phases 1 to 3

---

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/qa-test-globs.js` - the globs as JSON, or a reason
2. ✅ `shared/resources/tests/qa-test-globs.test.mjs`

### Files to Modify (Core Implementation)

3. ✅ `shared/resources/skill-resolution.js` - the record and its reader
4. ✅ `shared/resources/advance-pipeline-lock.sh` - what makes a record invalid

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/skill-resolution.test.mjs`
6. ✅ `shared/resources/tests/skill-resolution-reach.test.mjs`
7. ✅ `shared/resources/advance-pipeline-lock.test.sh`
8. ✅ `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs`

### Files to Modify (Documentation)

9. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
10. ✅ `shared/resources/skill-resolution.md`
11. ✅ `shared/resources/develop-pipeline-step-7-finalise.md`
12. ✅ `shared/resources/develop-pipeline-step-8-commit.md`
13. ✅ `shared/resources/develop-pipeline-hooks.md`
14. ✅ `skills/develop-bug/SKILL.md`
15. ✅ `docs/reference/configuration.md`
16. ✅ `CHANGELOG.md`

### Generated

17. ✅ `skills/*/references/` copies, by `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**The globs**: the twelve shapes of the trial, the file that is a directory, and the file with no read
permission (skipped loudly for root). The classifier and the reader are one function over one reading.

**The load record**

| Case | `loaded` answers |
| :-- | :-- |
| `check` ran after the lock was made | `recorded` |
| No `check` | `not-recorded` |
| `check`, then a pause mark | `not-recorded` |
| `check`, a pause, the pause cleared | `not-recorded` |
| A pause, then `check` while the mark is set | `recorded`; the mark is gone, its snapshot is consumed, and `last_pause_at` is the pause's time |
| The same, with no `advance-pipeline-lock.sh` beside the script | `recorded`; the mark stays |
| `check` in the same second as the pause | `not-recorded` |
| `check`, a halt, `--restore` | `not-recorded` |
| `check finalise`, then a hold on a DoD with gaps | `not-recorded` |
| `check finalise`, then a hold with no `--dod` | `recorded` |
| `check finalise`, then an accepted advance | `recorded` |
| `check` of a `shadowed` skill | `recorded`, with the reason kept |
| `check --no-base-dir` | `recorded`, `unreadable` |
| No lock; a lock that is not JSON | `no-lock`, and the file is left as it was |
| `check` under each of these | exit code and JSON as before this task |

**The blocks**: both are extracted from the document and run in bash and zsh, with a good configuration, a
malformed one and none. On a malformed one the route block answers no route, and the loop goes to 5b.

**Command**: `command node --test shared/resources/tests/qa-test-globs.test.mjs shared/resources/tests/skill-resolution.test.mjs shared/resources/tests/skill-resolution-reach.test.mjs evals/shared/tests/qa-narrowing-offer-wiring.test.mjs && bash shared/resources/advance-pipeline-lock.test.sh`

**Temporary directories**: the shared helper removes each one in `t.after`.

### Consumer Tests

`skill-resolution-reach.test.mjs` runs the rule's command from a consumer-shaped tree that holds that one
script and no lock. It must stay green unchanged: without a lock nothing is written and no sibling is called.

### Performance Tests

Not applicable.

---

## 9. Success Criteria

### Functional

- [ ] Every shape of the globs table holds in a test that drives the CLI
- [ ] Both QA-loop blocks bind the value by the command, and neither table asks for a hand-made one
- [ ] The existing cases of `qa-narrowing-offer-wiring.test.mjs` pass unchanged
- [ ] Every row of the load-record table holds
- [ ] Step 7's and Step 8's checklists each name a command that exits non-zero with no record

### Performance

- [ ] Not applicable: one small JSON write for each load

### Code Quality

- [ ] Reverting each of the three lock changes alone turns a named test red (recorded in the QA report)
- [ ] `npm run test:remote` passes
- [ ] `npm run bundle:check` passes, and `shellcheck` passes on `advance-pipeline-lock.sh`
- [ ] `npm run validate -- skills/develop-bug/` passes

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` and `docs/reference/configuration.md` name the changes

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

#### 1. A write races another writer of the lock

**Risk**: `check` and a shell helper write the lock at the same moment, and one is lost
**Probability**: Low
**Impact**: Medium
**Mitigation**: the same temporary-file-and-rename write in the lock's own directory, and one short read-change-write. The orchestrator runs these calls one after the other

#### 2. A false `not-recorded` sends a run round again

**Risk**: a compaction during `/finalise` makes a good record invalid
**Probability**: Medium
**Impact**: Low
**Mitigation**: the rule is to load the skill again and compare, and not to run an accepted step again

### Low Risk Areas

#### 1. A run in flight at the upgrade

**Risk**: its lock has no records
**Probability**: Low
**Impact**: Low
**Mitigation**: the checklist says `not-recorded`, the agent loads once, and the run goes on

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a pipeline lock is corrupt or lost after a load, or a QA loop stops on a configuration that worked

**Steps**:
1. `git revert` the merge commit
2. `npm run bundle`, then `npm run bundle:check`

**Validation**: `bash shared/resources/advance-pipeline-lock.test.sh`, and one QA-loop block run by hand

### Partial Rollback (1-2 hours)

Phase 1 stands alone. Phases 2 and 3 revert together.

### Forward Fix (< 4 hours)

A missing reason text or a wrong checklist line is fixed forward.

### Rollback Triggers

**Critical**: the lock is damaged by a load

**Non-critical**: a `not-recorded` answer that one more load clears

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                      | Author      |
| ---------- | ------- | ------------------------------------------------ | ----------- |
| 2026-11-25 | 1.0     | Initial draft — cut from observations #175, #179 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The globs

- [ ] Failing cases
- [ ] Reader
- [ ] Blocks
- [ ] Narrowing message

### Phase 2: The load record

- [ ] Failing cases
- [ ] `check` and `loaded`
- [ ] Lock changes
- [ ] `--no-base-dir`

### Phase 3: The rule and the checklists

- [ ] Rule
- [ ] After a compaction
- [ ] Checklists
- [ ] Hook note

### Phase 4: Records and bundle

- [ ] Configuration reference
- [ ] CHANGELOG
- [ ] Bundle

---

## References

- Observation #175 — The QA loop's testArtifactGlobs input has no command that produces it
- Observation #179 — Finalise re-run followed a loaded skill without invoking it
- [Task 311](../task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name/task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md), the load check
- [Task 319](../task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md), the run both were seen on
- [Configuration reference](../../reference/configuration.md)

---

## Notes

**One task, not two.** Both close the same gap in the same documents: a step's input or claim with no
command behind it. The two parts share no code, so Phase 1 can be reverted alone.

QA will create, beside this document: the QA report, bug reports if any, and the quality gate.
