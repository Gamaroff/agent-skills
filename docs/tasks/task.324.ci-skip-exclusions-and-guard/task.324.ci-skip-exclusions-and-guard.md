---
id: task.324
title: "The CI skip template can exclude paths, and a guard holds its wiring"
type: task
description: "Give the docs-only CI skip template a list of paths that are always code, with scripts and test files on it by default, and an optional guard that fails on an ungated heavy job, a feature-branch push trigger, or a skip pattern over a file a test reads."
tags: [ci, docs-only-skip, templates]
category: infrastructure
status: planned
priority: Medium
risk_level: medium
created: 2026-11-25
updated: 2026-11-25
estimated_effort_hours: 8
---

# Technical Task: The CI skip template can exclude paths, and a guard holds its wiring

**Status:** Planned

---

## 1. Overview

The optional docs-only CI template (`docs/examples/ci/`) skips a consumer's heavy jobs on a docs-only
change. Its docs set can be narrowed but not excluded from, and its default calls test fixtures and
scripts docs. Nothing checks that a consumer wired it safely, or that it stays so. This task adds the
exclusion and an optional guard.

**Scope**: both classifier templates, one new guard for GitHub Actions with its tests, and the runbook.

**Key deliverables:**

- `CODE_PATTERNS`: paths that are always code, whatever `DOCS_PATTERNS` says, in both templates;
- scripts and test files on that list by default;
- `check-ci-skip.mjs`: a guard with no dependencies, a self-test and an accept list;
- the runbook and its adoption prompt use both.

**Expected outcome**: a consumer can keep one file out of the skip, and a later edit that opens a way
to merge untested code fails a check.

---

## 2. Motivation

### Current Problems

1. **A path cannot be excluded.** `!docs/catalogue.md` in `DOCS_PATTERNS` excludes nothing. A consumer
   with one tested file in a directory must list all its siblings.
2. **The default covers tests and scripts.** `scripts/README.md`, `tests/fixtures/a.md`,
   `docs/scripts/build.sh` and `docs/x.test.js` are all docs (§ 3).
3. **The wiring is held by nothing.** A new heavy job without the gate runs on every push. A heavy job
   missing from the aggregate job's `needs` can fail and the required check still passes.
4. **The duplicate trigger comes back.** One edit to `push: branches:` restores two runs per push.
5. **A new reader is not noticed.** A test that starts to read a listed file makes the skip unsafe, and
   no diff to the workflow shows it.

### Benefits of Solution

1. A consumer excludes one path with one setting.
2. The default is safe for fixtures and scripts.
3. Four wiring mistakes become a failed check.
4. The consumer sees which tests read the files it skips on.

---

## 3. Technical Background

Every result below was run on 2026-11-25 at `17a112e6d`.

### Current Architecture

- **The docs test.** `docs/examples/ci/github-actions/classify-changes.sh:65` *(`is_docs()`)* and
  `docs/examples/ci/bitbucket-pipelines/classify-changes.sh:41` *(the same function)*. A path is docs
  when one `case` pattern of `DOCS_PATTERNS` matches. Default: `*.md docs/*`, and `*` matches `/`.
- **The two copies are held equal** by `is_docs is identical to the GitHub Actions template's, default
  and overridden` (`bitbucket-pipelines/classify-changes.test.js:360`).
- **Parity with the pipelines' rule.** `docs-set-parity.test.js` compares the template default with
  `ci.docsOnly.patterns` on five fixed paths. Its header says a deliberate divergence is spelled out
  there, path by path.
- **The wiring snippet.** `changes-job.yml`: the `changes` job, one gated job, and `ci-ok`, whose `needs`
  a consumer extends by hand. Only the `concurrency` block is held by a test (`changes-job.test.js`).

| Path | Today | With the default `CODE_PATTERNS` below |
| :-- | :-- | :-- |
| `scripts/README.md`, `tests/fixtures/a.md` | docs | code |
| `docs/scripts/build.sh`, `docs/x.test.js` | docs | code |
| `apps/web/README.md`, `docs/tasks/t.md`, `contest/a.md` | docs | docs |
| `src/a.ts` | code | code |

### Why the required check matters here

GitHub reports a skipped job as `Success`, also when the check is required, and skips a job whose
`needs` failed. So a heavy job that is itself the required check passes when `changes` fails. The
aggregate job is what prevents that, and only for the jobs in its `needs`. Read in GitHub's
documentation on 2026-11-25. Not reproduced in a live repository.

### Target Architecture

**`CODE_PATTERNS`**, read in `is_docs` before `DOCS_PATTERNS`. A match is code. Same syntax, same
`set -f`. Unset means the default; set but empty means no path is always code.

```
scripts/* */scripts/* test/* */test/* tests/* */tests/* __tests__/* */__tests__/* *.test.* *.spec.*
```

**`check-ci-skip.mjs`**, in `docs/examples/ci/github-actions/`. It reads the workflow named by
`--workflow`, every other file in `.github/workflows/`, and the tracked tree. Rules:

| Rule | Fails when |
| :-- | :-- |
| 1 gate | a job that is not on the light list lacks `needs: changes`, or its `if:` is not one of two exact forms: `needs.changes.outputs.code == 'true'`, or that with `github.event_name == 'push' \|\|` before it. A job that needs a gated job, with no `if:` of its own, is gated through it |
| 2 aggregate | the aggregate job lacks `if: always()`, its `needs` lacks `changes` or any heavy job, or its steps do not read `needs.<job>.result` for each of them |
| 3 trigger | in any workflow not on the exempt list, `push` has no `branches:`, uses `branches-ignore:`, or names a branch outside the long-lived list (`main master develop release/**`, the runbook's). A `push` limited to `tags:` passes |
| 4 never docs | a tracked test file, script, build config or workflow reads as docs |
| 5 reader | a test or build config names a tracked file that reads as docs, and the pair is not on the accept list |

- **Rules 4 and 5 ask the consumer's own `classify-changes.sh`**, sourced, with the `DOCS_PATTERNS` and
  `CODE_PATTERNS` read from the workflow. A second matcher would drift.
- **No dependency, and it fails closed.** The template is copied, so it cannot ask for a YAML package.
  It reads the block style the snippet uses. A shape it cannot read (a flow mapping of jobs, an anchor
  in `on:` or `jobs:`, an expression as `DOCS_PATTERNS`, a reusable-workflow job) is exit 2 and names
  the line.
- **Lists are arguments**: `--light`, `--aggregate`, `--long-lived`, `--exempt` (workflow files),
  `--accept <file>`. An accept line
  is `<reader> <path>  # <reason>`. A line that matches nothing fails, so the list cannot go stale.
- Exit 0 pass, 1 a rule failed, 2 cannot read. `--self-test` builds one violating repository per rule
  and one clean one, and fails unless each rule fires on its own case only.

### The reader search, as measured

A consumer's own guard for this reads tests through the TypeScript parser. It is about 1,600 lines,
needs three packages, took four QA gates, and still lists shapes it cannot see. A text search was
prototyped instead. It takes whole quoted strings, in the raw text **and** in the text with adjacent
literals joined (`"docs", "a.md"`), and compares each with the end of every docs path. A directory
name counts only in a file that also calls a directory or glob read.

| Run | Docs files | Reader files | Findings |
| :-- | --: | --: | --: |
| six synthetic files, five readers (literal, joined, project input in a list, directory, same-directory) | 4 | 6 | all 5 readers, not the clean file |
| a consumer's live, hand-checked skip list | 4,345 | 593 | 4 |
| the same tree, with two directories and a README that tests are known to read | 98 | 593 | 13, with all 4 known readers among them |
| a second consumer, `docs/tasks/* docs/prd/* docs/bugs/*` | 5,047 | 1,012 | 25 |
| this repository, the same list | 6,835 | 639 | 200 |
| this repository, the default list (1.8 s) | 7,905 | 590 | 1,365 |

- **Joining the text in place hid a reader.** It also joins the items of a JSON list, so a project
  input between two others was missed. Hence the raw text as well. The test holds this.
- **This repository is the worst case**: its tests read its documents on purpose. The rule is for
  consumers, and this repository does not adopt the template.

### Tried

| Change | Result |
| :-- | :-- |
| `CODE_PATTERNS` with the default, both templates, scratch clone | the 71 committed template tests pass unchanged; ShellCheck clean; the table above; `CODE_PATTERNS='docs/catalogue.md'` excludes that file and not its sibling |
| The reader search | the table above |

**Not exercised**: rules 1 to 4, the workflow reader, the accept list, and any live GitHub run.

### Important Clarifications

- **The default diverges from `ci.docsOnly` on purpose.** The pipelines' rule keeps calling
  `tests/fixtures/a.md` docs. The parity test gains a list of the divergent paths. CI then runs where
  the pipeline may not wait, which the runbook already warns about.
- **Rule 2 sees that a result is read, not what is done with it.** A step that reads a failed result and
  exits 0 passes the guard. The guard's output and the runbook say so.
- **Rule 5 is a search, not a proof.** It cannot see a path built from variables, a script a heavy job
  runs, or a file read through another file. The guard's output and the runbook say so.

---

## 4. Scope

### In Scope

✅ `CODE_PATTERNS` in both classifier templates, with tests

✅ `check-ci-skip.mjs` for GitHub Actions, with tests and a self-test

✅ The runbook: the input row, the docs-set section, a guard section, step 2 of the adoption prompt

### Out of Scope

❌ **An exclusion in `ci.docsOnly`.** It is an engine and a configuration key, on by default, and
task 320 edits the same file. A task of its own, after 320.

❌ **A Bitbucket guard.** Most consumers are on GitHub, and the two configurations share no shape.

❌ **`setup-consumer.sh`.** The template stays optional.

❌ **This repository's own workflows.** It does not use the template.

---

## 5. Breaking Changes

### Breaking Change 1: scripts and test files are code by default

**What Changed**: `classify-changes.sh` reads a path under a `scripts/`, `test/`, `tests/` or
`__tests__/` directory, and a `*.test.*` or `*.spec.*` file, as code.

**Before**: a push that changes only `scripts/README.md` skips the heavy jobs.

**After**: it runs them.

**Impact**: only a consumer that copies the new script. It runs more, never less.

**Migration**: set `CODE_PATTERNS` to an empty value to keep the old answer.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.324.plan.ci-skip-exclusions-and-guard.md](task.324.plan.ci-skip-exclusions-and-guard.md)

### Phase 1: `CODE_PATTERNS`

**Risk Level**: Low

**Files**:
- `docs/examples/ci/github-actions/classify-changes.sh`
- `docs/examples/ci/bitbucket-pipelines/classify-changes.sh`
- `docs/examples/ci/github-actions/classify-changes.test.js`
- `docs/examples/ci/bitbucket-pipelines/classify-changes.test.js`
- `docs/examples/ci/github-actions/docs-set-parity.test.js`

**Changes**:
- [ ] Write the failing cases first (§ 8)
- [ ] Add the list to `is_docs` in both scripts, read before `DOCS_PATTERNS`
- [ ] Clear `CODE_PATTERNS` in each test that clears `DOCS_PATTERNS`
- [ ] Spell out the divergent paths in the parity test
- [ ] Name the variable in both snippets and both script headers

**Dependencies**: None

### Phase 2: The guard's wiring rules

**Risk Level**: Medium

**Files**:
- `docs/examples/ci/github-actions/check-ci-skip.mjs` (new)
- `docs/examples/ci/github-actions/check-ci-skip.test.js` (new)

**Changes**:
- [ ] Write the failing cases first
- [ ] Write the workflow reader: block style only, exit 2 and the line on anything else
- [ ] Write rules 1 to 3
- [ ] Assert that the shipped `changes-job.yml` snippet passes

**Dependencies**: None

### Phase 3: The guard's path rules

**Risk Level**: Medium

**Files**:
- the same two

**Changes**:
- [ ] Write the failing cases first
- [ ] Write rules 4 and 5 through the sourced classifier
- [ ] Write the accept list, and fail on a line that matches nothing
- [ ] Write `--self-test`

**Dependencies**: Phases 1 and 2

### Phase 4: Runbook and records

**Risk Level**: Low

**Files**:
- `docs/runbooks/ci-docs-only-skip.md`
- `CHANGELOG.md`

**Changes**:
- [ ] Document `CODE_PATTERNS`, and replace the "a pattern cannot exclude" and "nothing in this template notices" points
- [ ] Add a guard section with its limits, and where to run it: in a job that is never skipped
- [ ] Add the guard to step 2 of the adoption prompt
- [ ] Write the CHANGELOG entry

**Dependencies**: Phases 1 to 3

---

## 7. Files Summary

### Files to Create

1. ✅ `docs/examples/ci/github-actions/check-ci-skip.mjs` - the guard
2. ✅ `docs/examples/ci/github-actions/check-ci-skip.test.js` - its tests

### Files to Modify (Core Implementation)

3. ✅ `docs/examples/ci/github-actions/classify-changes.sh` - `CODE_PATTERNS`
4. ✅ `docs/examples/ci/bitbucket-pipelines/classify-changes.sh` - the same
5. ✅ `docs/examples/ci/github-actions/changes-job.yml` - the variable, in a comment
6. ✅ `docs/examples/ci/bitbucket-pipelines/bitbucket-pipelines.yml` - the same

### Files to Modify (Tests)

7. ✅ `docs/examples/ci/github-actions/classify-changes.test.js`
8. ✅ `docs/examples/ci/bitbucket-pipelines/classify-changes.test.js`
9. ✅ `docs/examples/ci/github-actions/docs-set-parity.test.js`

### Files to Modify (Documentation)

10. ✅ `docs/runbooks/ci-docs-only-skip.md`
11. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

| Classifier case (each in both templates) | Today | After |
| :-- | :-- | :-- |
| a push of `scripts/README.md` only | `code=false` | `code=true` |
| a push of `tests/fixtures/a.md`, or `docs/x.test.js`, only | `code=false` | `code=true` |
| `contest/a.md` (a name that only contains `test`) | `code=false` | `code=false` |
| `CODE_PATTERNS='docs/catalogue.md'`, that file | `code=false` | `code=true` |
| the same, its sibling | `code=false` | `code=false` |
| `CODE_PATTERNS` empty, `scripts/README.md` | `code=false` | `code=false` |
| a path on both lists | docs | code |
| a pattern that matches files in the runner's own directory | never expanded | never expanded |

| Guard case | Expected |
| :-- | :-- |
| the shipped snippet, and a clean repository | exit 0 |
| a heavy job with no `if:`; with `if: always()`; with a near miss (`!= 'false'`) | exit 1, rule 1, the job named |
| a heavy job with the gate but no `needs: changes` | exit 1, rule 1 |
| an ungated job on the light list | exit 0 |
| a job that needs a gated job, with no `if:`; with `if: always()` | exit 0; exit 1 |
| the aggregate without one heavy job, without `changes`, or without `if: always()` | exit 1, rule 2 |
| a heavy job in the aggregate's `needs`, whose result no step reads | exit 1, rule 2, the job named |
| `on: [push, pull_request]`; `push:` with no branches; `feature/**`; `**`; `branches-ignore` | exit 1, rule 3 |
| the same trigger in a second workflow file | exit 1, rule 3, the file named |
| a push-only workflow on `feature/**` beside a pull-request one | exit 1, rule 3, the file named |
| `push: tags:` only; a workflow on the exempt list | exit 0 |
| `DOCS_PATTERNS: "*"`, with `CODE_PATTERNS` empty | exit 1, rule 4 |
| each of the five readers of § 3, on a skipped file | exit 1, rule 5, reader and path named |
| the same reader, accepted; an accept line that matches nothing | exit 0; exit 1 |
| a path in a comment or inside a longer message | exit 0 |
| flow-style jobs, an anchor in `jobs:`, an expression as `DOCS_PATTERNS`, a missing workflow | exit 2, the line or file named |
| no tracked docs file, or no reader file at all | exit 2: the search looked at nothing |

**Command**: `command node --test 'docs/examples/ci/*/*.test.js'` (already in `npm test`)

**Temporary directories**: a shared helper removes each one in `t.after`.

### Mutation Tests

Each of these, alone, turns a named test red: the order of the two lists in `is_docs`; each guard rule
disabled; the raw-text half of the reader search removed; the joined-text half removed; the exit 2 of
each unreadable shape turned into a pass; the stale accept line ignored.

### Consumer Tests

`npm run test:remote` runs the whole suite. The guard runs on a copy of the snippet in a temporary
repository.

### Performance Tests

Not applicable. The prototype took 1.8 s on 9,802 tracked files, once.

---

## 9. Success Criteria

### Functional

- [ ] Every row of the two § 8 tables holds in a test that runs the script or the guard
- [ ] `--self-test` exits 0, and exits 1 with any one rule disabled
- [ ] `is_docs` is still identical in the two templates
- [ ] The guard imports only Node built-in modules

### Performance

- [ ] Not applicable: no bound is claimed

### Code Quality

- [ ] Every mutation in § 8 is recorded in the QA report with the test it turned red
- [ ] `npm run test:remote` passes
- [ ] `npm run lint:shell` passes
- [ ] No shipped line names a consumer, its tickets or its product

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` names the new default and the setting that restores the old one
- [ ] The runbook states what the reader search cannot see

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

#### 1. The guard passes an unsafe workflow

**Risk**: a YAML shape the reader misreads hides a job or a trigger
**Probability**: Medium
**Impact**: High
**Mitigation**: block style only, exit 2 on any other shape, and the job and trigger counts are printed

#### 2. The reader search is trusted too far

**Risk**: a consumer reads exit 0 as proof
**Probability**: Medium
**Impact**: Medium
**Mitigation**: the output and the runbook list what it cannot see; rule 4 and the default list need no search

#### 3. The search is too noisy to keep

**Risk**: a consumer with many doc-reading tests turns it off
**Probability**: Medium
**Impact**: Low
**Mitigation**: the accept list, and the measured counts in § 3; a narrow list gave 4 and 25 findings

### Low Risk Areas

#### 1. More CI runs after a re-copy

**Risk**: a change to a file under `scripts/` that nothing runs now starts the suite
**Probability**: High
**Impact**: Low
**Mitigation**: it is the safe direction, and `CODE_PATTERNS` overrides it

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a `code=false` on a change that holds code

**Steps**:
1. `git revert` the merge commit
2. Tell adopters to copy the previous `classify-changes.sh`, or to remove the gates (runbook, § Rolling back)

**Validation**: `command node --test 'docs/examples/ci/*/*.test.js'`

### Partial Rollback (1-2 hours)

The guard (Phases 2 and 3) can be removed alone. Phase 1 does not depend on it.

### Forward Fix (< 4 hours)

A false finding of the guard is fixed forward; the accept list covers it meanwhile.

### Rollback Triggers

**Critical**: a wrong skip

**Non-critical**: noise, wording

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                              | Author      |
| ---------- | ------- | -------------------------------------------------------- | ----------- |
| 2026-11-25 | 1.0     | Initial draft — from a consumer's CI adoption lessons    | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: `CODE_PATTERNS`

- [ ] Failing cases
- [ ] Both scripts
- [ ] Parity test

### Phase 2: The guard's wiring rules

- [ ] Failing cases
- [ ] Workflow reader
- [ ] Rules 1 to 3

### Phase 3: The guard's path rules

- [ ] Failing cases
- [ ] Rules 4 and 5
- [ ] Accept list and self-test

### Phase 4: Runbook and records

- [ ] Runbook
- [ ] CHANGELOG

---

## References

- [Docs-Only CI Skip runbook](../../runbooks/ci-docs-only-skip.md)
- [Task 174](../task.174.ci-docs-only-classifier-template/task.174.ci-docs-only-classifier-template.md), the template
- [Task 319](../task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md), the push rule and `ci.skipMarker`
- [Task 320](../task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md), the open task on `ci-tree-equivalence.js`

---

## Notes

The prose half of the same lessons (triggers, the docs set, Bitbucket's step condition, the adoption
prompt) is in the runbook already, on the branch that added this document.

Rule 2 (the aggregate) was not asked for. It is here because a heavy job missing from the aggregate, or
whose result the aggregate does not read, can fail while the required check is green.

QA will create, beside this document: the QA report, bug reports if any, and the quality gate.
