---
id: task.322
title: "QA lists every new test, and reviewers end only their own processes"
type: task
description: "Check a red-first criterion against the list of tests the branch adds instead of a chosen sample, and tell read-only reviewers to end processes only by the pid they recorded."
tags: [qa-task, qa-story, code-review, observation]
category: refactoring
status: planned
priority: Medium
risk_level: low
created: 2026-11-25
updated: 2026-11-25
estimated_effort_hours: 8
---

# Technical Task: QA lists every new test, and reviewers end only their own processes

**Status:** Planned

---

## 1. Overview

Two rules of the QA step are weaker than they read. "Every new test was red before its change" is
graded from the tests QA chose to mention. "Read-only" forbids file edits and says nothing about
processes. This task gives the first a check against the list, and the second one sentence.

**Scope**: one new script, one procedure in `mutation-proving.md`, its two callers, two reviewer prompts.

**Key deliverables:**

- `red-first.js` compares the tests a branch adds with the rows of the QA report, and names each one missing;
- one procedure for that evidence, cited by `qa-task` and `qa-story`;
- both reviewer prompts that allow execution say how a process is ended.

**Expected outcome**: a red-first criterion fails in QA, and not first in `/finalise`.

---

## 2. Motivation

### Current Problems

1. **A sample passed for the whole.** On task 319, eight QA gates passed "every new test was red before
   its change (QA report)". `/finalise` failed it: 45 new tests were in no row (obs #177).
2. **Nothing lists the members.** `mutation-proving.md` says how to prove one test. No step lists the
   tests a branch adds.
3. **The criterion is in use.** Tasks 319 and 320 both carry it.
4. **A reviewer ended other sessions' processes.** On task 319's gate 7, a read-only reviewer cleaned up
   with `pkill -f 'sleep 30'` and ended up to five processes named `timeout` (obs #176). It shared the
   machine with other sessions.

### Benefits of Solution

1. Each missing test is named, in the QA step that can still write the row.
2. A test that passes without the change is seen as one.
3. A reviewer cannot end a process it did not start and still follow its prompt.
4. One procedure, and not two copies in two skills.

---

## 3. Technical Background

Every name below was grepped or run at `6f6c67aad` (v0.69.0).

### Current Architecture

- **The reviewer prompts.** Two files allow execution, with the same rule:
  `code-review-prompt.md` *(`If you EXECUTE anything to verify a candidate`)* and
  `qa-docs-only-review-prompt.md:65` *(`If you EXECUTE anything to verify a claim`)*. Command:
  `grep -l 'If you EXECUTE anything' shared/resources/*prompt*.md`. No prompt names a way to end a
  process: the one `pid` hit, in `pipeline-resume-detector-prompt.md`, is not about ending one.
- **The proof rules.** `mutation-proving.md` § "Recording it". `skills/qa-task/SKILL.md:943` and
  `skills/qa-story/SKILL.md:498` *(`mutation-proven: <what you reverted>`)* carry the row's form.
- **The record hand-off (task 311).** `develop-pipeline-step-5-6-qa-loop.md:323` passes
  `record_criteria=` to `qa-task`: the criteria that say where their record lives. `qa-story` has no such
  argument.
- **The criteria reader.** `criteria-section.js` is the one reader of a work item's criteria.

### Other code that does this job

`finalise-rerun-scope.js` and the AC prompt's quantifier rule check members at `/finalise`. They **sit
after** this: they found the gap on task 319, eight gates late. No other script lists a branch's tests:
`git grep -ln 'test-reporter=tap' -- 'shared/resources/*.js' 'shared/resources/*.mjs'` finds none that
compares two trees (unverified beyond that search).

### The population

The criteria sections of the 320 task documents (`git ls-files 'docs/tasks/*/task.*.md'`, the documents
named `task.<n>.<name>.md`) were searched for a checkbox line with "red" beside "before", "first" or
"pre-change". Six lines matched, and reading them leaves three that ask for red-first evidence about
tests: tasks 226, 319 and 320. Task 250 asks it of one guard. The other two use the words for something
else. So **a pattern alone is not the trigger**: the QA step reads the criteria and decides, and the
script only checks the list.

### Target Architecture

**The list.** "The tests a branch adds" is, per test file that the branch adds or changes, the names the
runner reports on the head and not on the merge base. Names come from the runner, so the rule does not
depend on a language.

**`shared/resources/red-first.js`**, no I/O beyond its arguments:

```
red-first.js check --names <names.json> --report <qa-report.md> [--json]
```

`names.json` is a list of `{file, name, result}`, where `result` is `red`, `green` or `load-failure`, as
measured with the head's test files over the merge base's source. It answers:

| `reason` | Exit | When |
| :-- | --: | :-- |
| `ok` | 0 | every entry has a row, and every `green` or `load-failure` row also names a proof |
| `missing` | 1 | at least one entry has no row; each is named |
| `unproven` | 1 | at least one `green` or `load-failure` entry has a row and no proof; each is named |
| `no-tests` | 1 | the list is empty. A branch that adds no test cannot meet the criterion, and a broken listing looks the same |
| `usage` | 2 | an unreadable or malformed input |

**The procedure**, in `mutation-proving.md`, a new section "Red-first evidence for every new test":
list, run in a detached scratch worktree, write the table, run `check`, prove the rest one by one.

**The process rule**, one sentence beside the existing one in both prompts: a process you start is ended
by the pid or process group you recorded when you started it, and never by name or pattern.

### What was tried, and what was not

The listing was run on PR #937 (`a511895a0` to `b5057a5d2`) in a scratch clone: four test files, 48
seconds, load 2.

| File | New | Red | Green |
| :-- | --: | --: | --: |
| `ci-tree-equivalence.test.mjs` | 2 | 2 | 0 |
| `finalise-rerun-scope.test.mjs` | 3 | 3 | 0 |
| `criteria-section.test.mjs` | 0 | 0 | 0 |
| `tick-pr.test.mjs` (a new file) | 25 | 25 | 0 |

**What the last row shows.** Its 25 tests are red because `tick-pr.sh` does not exist on the merge base.
That meets "red before its change" and proves nothing about each test. The table's `why` column says
`subject absent`, so nobody reads it as a mutation proof.

**Not exercised**: `red-first.js` itself, and a file that fails at load.

---

## 4. Scope

### In Scope

✅ `red-first.js` and its tests

✅ The procedure in `mutation-proving.md`, and one citation each in `qa-task` and `qa-story`

✅ The process sentence in both prompts, and a test that a third such prompt cannot miss it

### Out of Scope

❌ **A runner for the listing.** Test runners differ between projects. The procedure gives the commands
for `node --test`, and says what any runner must provide.

❌ **`record_criteria` for `qa-story`.** Task 311 left it for a follow-up, and this does not need it.

❌ **Requiring red-first evidence of every task.** It is asked where a criterion asks for it.

❌ **Enforcing the process rule.** A prompt cannot. A sandbox for reviewers is another task.

---

## 5. Breaking Changes

None - API stable. A QA run with no red-first criterion does nothing new.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.322.plan.review-evidence-is-complete-and-clean.md](task.322.plan.review-evidence-is-complete-and-clean.md)

### Phase 1: The check

**Risk Level**: Low

**Files**:
- `shared/resources/red-first.js` (new)
- `shared/resources/tests/red-first.test.mjs` (new)

**Changes**:
- [ ] Write the failing cases first (§ 8)
- [ ] Write `check`, with the five reasons of § 3
- [ ] Read table rows with the fence rule of `criteria-section.js`, so a fenced example is not a row

**Dependencies**: None

### Phase 2: The procedure and its callers

**Risk Level**: Low

**Files**:
- `shared/resources/mutation-proving.md`
- `skills/qa-task/SKILL.md`
- `skills/qa-story/SKILL.md`

**Changes**:
- [ ] Write "Red-first evidence for every new test": the listing, the run, the table, the check
- [ ] Give the `node --test` commands in a block that a test extracts and runs
- [ ] Cite it from both skills, beside the mutation-proof paragraph, without restating it
- [ ] In `qa-task`, name the criterion's entry in `record_criteria` as one way to see it

**Dependencies**: Phase 1

### Phase 3: The process rule

**Risk Level**: Low

**Files**:
- `shared/resources/code-review-prompt.md`
- `shared/resources/qa-docs-only-review-prompt.md`
- `tests/explore-prompts-no-write.test.js`

**Changes**:
- [ ] Add the sentence to both prompts
- [ ] Add a test: every prompt that allows execution carries it. The population is read from the tree

**Dependencies**: None

### Phase 4: Records and bundle

**Risk Level**: Low

**Files**:
- `CHANGELOG.md`
- Generated copies under `skills/*/references/`

**Changes**:
- [ ] Write the CHANGELOG entry
- [ ] Run `npm run bundle`, then `npm run bundle:check`

**Dependencies**: Phases 1 to 3

---

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/red-first.js` - compares the new tests with the report
2. ✅ `shared/resources/tests/red-first.test.mjs` - drives the script and the procedure's block

### Files to Modify (Core Implementation)

3. ✅ `shared/resources/mutation-proving.md` - the procedure
4. ✅ `skills/qa-task/SKILL.md` - the citation
5. ✅ `skills/qa-story/SKILL.md` - the citation
6. ✅ `shared/resources/code-review-prompt.md` - the process rule
7. ✅ `shared/resources/qa-docs-only-review-prompt.md` - the process rule

### Files to Modify (Tests)

8. ✅ `tests/explore-prompts-no-write.test.js` - the process rule's population

### Files to Modify (Documentation)

9. ✅ `CHANGELOG.md`

### Generated

10. ✅ `skills/*/references/` copies of 1, 3, 6 and 7, by `npm run bundle`. `mutation-proving.md` is
    bundled into six skills today, so `red-first.js` would follow it into all six. Cite it as
    `red-first.js` in the procedure's prose, and make the dependency from the two QA skills alone

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

| Case | Answer |
| :-- | :-- |
| Every new test has a row, all red | `ok` |
| One of three has no row | `missing`, that one named |
| Two tests of one name in two files, one row | `missing`, the other file named |
| A `green` entry with a row and no proof | `unproven` |
| A `green` entry whose row names a proof token other than `covered` | `unproven` |
| A `load-failure` entry with a proof | `ok` |
| The row is inside a fenced block | `missing` |
| A name with a pipe, a backtick or a newline | matched as the procedure writes it |
| An empty list | `no-tests` |
| A list that is not JSON, or a report that does not read | `usage`, exit 2 |

**The procedure's block** runs in a temporary repository with one changed and one new test file, in bash
and zsh. The expected list is written by hand, and includes one test that is green on the merge base.

**The process rule**: the test removes the sentence from a copy of each prompt and sees the check fail.
It also checks a third, made-up prompt that allows execution without the sentence.

**Control case**: the list test uses a branch that has nothing to do with task 319's files.

**Command**: `command node --test shared/resources/tests/red-first.test.mjs tests/explore-prompts-no-write.test.js`

**Temporary directories**: a shared helper removes each one, and each worktree, in `t.after`.

### Consumer Tests

`npm run test:remote`. `mutation-proving-pointers-parity.test.mjs` reads every pointer to the document
this task adds a section to.

### Performance Tests

Not applicable.

---

## 9. Success Criteria

### Functional

- [ ] Every row of the § 8 table holds in a test that drives the CLI
- [ ] The procedure's block, extracted and run, lists the new tests of a repository made for the test
- [ ] `qa-task` and `qa-story` each cite the procedure once and restate none of it
- [ ] Every prompt that allows execution carries the process rule, and a new one without it turns the test red

### Performance

- [ ] Not applicable: the check reads two files

### Code Quality

- [ ] Every new test was red before its change. The table is made by this task's own procedure (recorded in the QA report)
- [ ] `npm run test:remote` passes
- [ ] `npm run bundle:check` passes
- [ ] `npm run validate -- skills/qa-task/` and `npm run validate -- skills/qa-story/` pass

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` names both changes

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

#### 1. The run costs minutes on a large branch

**Risk**: task 319's 93 files were one pass, but a slow suite is not
**Probability**: Medium
**Impact**: Low
**Mitigation**: only test files the branch adds or changes are run, on the LAN server where the project has one, and only when a criterion asks

#### 2. Red for the wrong reason reads as proof

**Risk**: a test is red because its subject does not exist
**Probability**: High
**Impact**: Medium
**Mitigation**: the table has a `why` column. `subject absent` meets a red-first criterion and is not a mutation proof

### Low Risk Areas

#### 1. A test whose name changed

**Risk**: a renamed test reads as new
**Probability**: High
**Impact**: Low
**Mitigation**: it gets a row like any other. If it is green on the merge base, the proof is the old test's

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: QA stops on a task that has no red-first criterion

**Steps**:
1. `git revert` the merge commit
2. `npm run bundle`, then `npm run bundle:check`

**Validation**: run `/qa-task` on a task without the criterion and read that no table is asked for

### Partial Rollback (1-2 hours)

Phase 3 stands alone and can stay. Phases 1 and 2 revert together.

### Forward Fix (< 4 hours)

A row form the script does not read is fixed forward.

### Rollback Triggers

**Critical**: `check` answers `ok` with a test missing

**Non-critical**: wording

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                      | Author      |
| ---------- | ------- | ------------------------------------------------ | ----------- |
| 2026-11-25 | 1.0     | Initial draft — cut from observations #176, #177 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The check

- [ ] Failing cases
- [ ] `check`
- [ ] Fence rule

### Phase 2: The procedure and its callers

- [ ] Procedure
- [ ] Commands
- [ ] Citations
- [ ] `record_criteria`

### Phase 3: The process rule

- [ ] Prompts
- [ ] Population test

### Phase 4: Records and bundle

- [ ] CHANGELOG
- [ ] Bundle

---

## References

- Observation #176 — Read-only reviewers kill processes by name pattern
- Observation #177 — QA passes an every-new-test-was-red criterion without listing the new tests
- [Task 311](../task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name/task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md), the record hand-off
- [Task 319](../task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md), the run both were seen on
- [Mutation-proving](../../../shared/resources/mutation-proving.md)

---

## Notes

**One task, not two.** The process rule is one sentence in two prompts and is not worth a pipeline run
of its own. Both are about what a QA run may claim and touch.

QA will create, beside this document: the QA report, bug reports if any, and the quality gate.
