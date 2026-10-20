---
id: task.220
title: "No consumer names in shipped skills"
type: task
description: "Remove one consumer's names — its product and repository name, its brand, its Jira key and Jira host — from every shipped skill and shared resource, including the consumer format profile in the wireframe skill, and add tests/no-consumer-names.test.js so they cannot come back."
tags: [consumer-neutral, guard-test, bundles, provenance-notes, wireframe]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-20
updated: 2026-10-20
assignee:
estimated_effort_hours: 4
github_issue: 709
---

# Technical Task: No consumer names in shipped skills

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.220.review.1.no-consumer-names-in-shipped-skills.md` implemented 2026-10-20

**GitHub Issue**: [#709](https://github.com/Gamaroff/agent-skills/issues/709)

---

## 1. Overview

The library names one of its consumers throughout what it ships: the consumer's repository name in
provenance notes, its Jira project key in examples and test fixtures, its Jira host in one test, and
a whole format profile for its design system in the wireframe skill. This task removes or neutralises
each one and adds a guard test so the names cannot return.

`<BRAND>` (in a file name) and the other placeholders are defined in the plan, which spells no
consumer name; neither document does.

**Scope**: every tracked file under `skills/` and `shared/`, including the bundled
`skills/*/references/` copies (regenerated, not hand-edited). Repository history (`CHANGELOG.md`,
`docs/tasks/`, `docs/bugs/`) is out of scope.

---

## 2. Motivation

### Current Problems

1. **The library reads as written for one consumer.** Usage examples (`jira-stage.js --issue <KEY>-123`),
   the `review-pr` target table and its parser comments, and the `finalise` and pipeline-step
   provenance notes all name the same project.
2. **A skill ships one consumer's format.** `skills/wireframe/references/html-formats/` holds a single
   profile, for that consumer's hi-fi phone screens (its brand name, its `s5-*` class vocabulary, its
   repository paths), and `SKILL.md`'s profile table names it.
3. **The guard covers almost nothing.** `shared/resources/tests/pipeline-answers-generic.test.mjs`
   scans only the files task.201 touched, and it carries seven line exemptions for exactly the names
   this task removes. Nothing caught the wireframe profile.

### Benefits

1. **Neutral examples.** A reader in any project sees `PROJ-702`, not someone else's board.
2. **No consumer's format in a shared skill.** The wireframe skill's rules stay; the format they were
   measured on goes.
3. **One guard for the whole shipped tree.** A consumer name anywhere under `skills/` or `shared/` fails CI.
4. **The exemption list goes.** No exemption can outlive what it excuses if there are none.

---

## 3. Technical Background

### Current Architecture

- **No repo-wide guard.** `tests/no-consumer-names.test.js` does not exist yet; this task creates it.
- **The older guard.** `pipeline-answers-generic.test.mjs` defines its own `CONSUMER_NAMES` and an
  `EXEMPT` list of exact lines (step-0 lookup comments, the step-2 review note, three `finalise` lines).
  Its test 4 fails when an exemption no longer matches a line, so removing the names breaks it unless
  `EXEMPT` is emptied in the same change.
- **The wireframe profile.** `skills/wireframe/SKILL.md` § "Working from an existing UI", step 2, has
  a profile table with one row, linking `references/html-formats/<BRAND>-hifi.md`. Two tests in
  `skills/wireframe/tests/wireframe.test.js` hold that directory to account: "every HTML format profile
  carries a worked example" (with a non-vacuity floor of one profile) and "SKILL.md's profile table and
  references/html-formats/ list the same profiles". With the only profile gone, the first loses its
  population and the second reads a directory git no longer has.
- **Bundled copies.** `npm run bundle` regenerates `skills/*/references/` from `shared/resources/`, so
  the copies of `jira-sync.js`, `jira-stage.js`, `resolve-platform.sh`, `platform-detection.md` and the
  `develop-pipeline-step-*` docs are fixed by fixing their source and re-bundling.

**Measure the population, don't trust a number here.** Phase 1's guard prints every hit as
`path:line: text`. On 2026-10-20 the hits sat in these source files (plus their bundled copies):
`shared/resources/{develop-pipeline-step-0-resolve-and-prepare.md, develop-pipeline-step-2-review.md,
jira-stage.js, jira-sync.js, platform-detection.md, resolve-platform.sh}`,
`shared/resources/tests/{generate-prd-epic-index, jira-stage, jira-stage-fixtures,
jira-sync-no-transition, jira-sync-publishing-fidelity}.test.mjs`, `skills/finalise/SKILL.md`,
`skills/review-pr/{SKILL.md, scripts/parse-target.sh, tests/review-pr.test.js}`,
`skills/scaffold-tracker-workflow/{scripts/scaffold-tracker-workflow.js,
tests/scaffold-tracker-workflow.test.js}`, `skills/sync-jira-bug/tests/{end-to-end,
relative-doc-links}.test.js`, `skills/sync-jira-task/tests/sync-jira-task.test.js`, and
`skills/wireframe/{SKILL.md, references/html-formats/<BRAND>-hifi.md}`.

**The key has three spellings, and one of them is in file names.** Besides the upper-case key, the
tree holds the key in lower case (`shared/resources/tests/fixtures/` has ten payload files whose names
start with it, `jira-stage-fixtures.test.mjs` loads them by name about 35 times, and one fixture
`baseUrl` is the lower-case key's `atlassian.net` host) and as an identifier prefix
(`<KEY>_COLUMNS`, `<KEY>_TYPES`, `<KEY>_RECORD`). A case-sensitive `\b<KEY>\b` misses both: `_` is a
word character, and lower case is not upper case. Measured 2026-10-20 (review 1) with
`git ls-files skills shared | xargs grep -IoniE '[a-z0-9_]*<key>[a-z0-9_]*'` and
`git ls-files skills shared | grep -i <key>`.

### Target Architecture

- `tests/no-consumer-names.test.js` walks `git ls-files skills shared` and fails on the consumer's
  product/repository name, Jira key, brand and Jira host, in any case, in a file's **path** as well as
  its contents. The key and brand patterns are bounded by letters, not by `\b`, so `<KEY>_RECORD` and
  `<key>-story-….json` match while English words that contain the letters do not.
- Provenance notes keep their date and their lesson and say "a consumer project" or "a consumer's
  board/card".
- Example keys use `PROJ`, example hosts `acme.atlassian.net`, the example board id `12`.
- `pipeline-answers-generic.test.mjs` keeps its scanner and its calibration samples; `EXEMPT` is empty,
  with a comment pointing at `tests/no-consumer-names.test.js`.
- The wireframe skill ships no format profile: `references/html-formats/` is deleted, step 2 says there
  is no built-in profile and that a project keeps its own outside `.agents/skills/` (which a reinstall
  overwrites), and the two profile tests are removed with the directory.

### Important Clarifications

- **Fixture values are examples too.** A test asserting `PROJ-70` does not prefix-match `PROJ-702`
  proves the same thing it proved with the old key. Rename consistently within each test.
- **The wireframe rules stay.** Only the profile and its table row go. The general conversion rules in
  `SKILL.md` were learned on that format but name nothing in it.
- **`CHANGELOG.md` and `docs/` keep their history.** Release notes and task records cite consumer
  reports by design, and nothing executes them. The roadmap's open `T38-fixtures` row names a fixture
  file not yet captured; whoever captures it uses the renamed `proj-` prefix.
- **Fixture file names are renamed, not just their references.** The ten payload files move to a
  `proj-` prefix with `git mv`, and every reference in `jira-stage-fixtures.test.mjs` follows. The
  suite discovers fixtures by `.json` suffix and loads each by name, so nothing else changes.
- **Evidence in this task's own documents is masked.** The guard's red output prints the names. Record
  it in the implementation report as `path: count` per file, never as the raw lines, so the task's
  documents stay as free of the names as the plan is.

---

## 4. Scope

### In Scope

✅ **Guard**: create `tests/no-consumer-names.test.js` over `skills/` and `shared/`.
✅ **Provenance notes**: reword in `jira-sync.js`, `develop-pipeline-step-2-review.md`, `finalise/SKILL.md`
and the five `shared/resources/tests/` files.
✅ **Examples and fixtures**: the Jira key (all three spellings), host and board id in shared resources, `review-pr`,
`scaffold-tracker-workflow`, `sync-jira-bug` and `sync-jira-task`.
✅ **Fixture file names**: rename the ten `shared/resources/tests/fixtures/<key>-*.json` files to `proj-*.json`.
✅ **Wireframe**: delete `references/html-formats/<BRAND>-hifi.md`, rewrite `SKILL.md` step 2 without a
profile table, remove the two profile tests.
✅ **Older guard**: empty `EXEMPT` in `pipeline-answers-generic.test.mjs`.
✅ **Bundles**: `npm run bundle` and commit the regenerated copies.

### Out of Scope

❌ **`CHANGELOG.md`, `docs/tasks/`, `docs/bugs/`, `docs/prd/`** — history, not shipped instructions.
❌ **A loader for project-owned wireframe profiles or themes** — considered and declined on 2026-10-20.
❌ **The consumer's own copy of its profile** — the consumer keeps it in its repository before it next
reinstalls the skills; that is the consumer's work, not this library's.
❌ **The repository owner's GitHub URLs** — they name this library's home, not a consumer.

---

## 5. Breaking Changes

### Breaking Change 1: the wireframe skill no longer ships a format profile

**What Changed**: `skills/wireframe/references/html-formats/<BRAND>-hifi.md` is deleted and `SKILL.md` no
longer lists it.

**Impact**: the one consumer whose format it describes loses it from its vendored copy on its next
`setup-consumer.sh --update`. No other consumer used it.

**Migration Path**: before updating, that consumer copies the profile into its own repository (outside
`.agents/skills/`) and points its agents at it from its own instructions file.

Nothing else changes behaviour: the other edits are comments, prose, examples and test fixture values.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.220.plan.no-consumer-names-in-shipped-skills.md](task.220.plan.no-consumer-names-in-shipped-skills.md)

### Phase 1: Add the guard and see it red

**Risk Level**: Low

**Files**:

- `tests/no-consumer-names.test.js` (new)

**Changes**:

- [x] Write the guard (shape in the plan): a scanner test with calibration samples, a non-vacuity test
      over the walk, the content scan, and a path scan.
- [x] Run it; both scans must fail and list the hits. Keep that list as the population for Phases 2–3,
      and record it in the implementation report as `path: count` (masked).

**Dependencies**: none

---

### Phase 2: Neutralise the sources

**Risk Level**: Low

**Files**: the source files Phase 1 lists, except the wireframe skill (never a `skills/*/references/` copy).

**Changes**:

- [x] Reword each provenance note (exact edits in the plan).
- [x] `git mv` the ten `<key>-*.json` fixtures to `proj-*.json`.
- [x] Replace the remaining key (all three spellings), host and board id with the neutral forms.
- [x] Empty `EXEMPT` in `pipeline-answers-generic.test.mjs`.

**Dependencies**: Phase 1

---

### Phase 3: Remove the wireframe skill's consumer profile

**Risk Level**: Low

**Files**:

- `skills/wireframe/references/html-formats/<BRAND>-hifi.md` (delete)
- `skills/wireframe/SKILL.md`
- `skills/wireframe/tests/wireframe.test.js`

**Changes**:

- [x] Delete the profile; rewrite step 2 of "Working from an existing UI" without the table.
- [x] Remove the two profile tests and the `FORMATS_DIR` helper.

**Dependencies**: Phase 1

---

### Phase 4: Re-bundle and verify

**Risk Level**: Low

**Changes**:

- [x] `npm run bundle`, then `npm run bundle:check` clean.
- [x] `npm run validate -- skills/wireframe`.
- [x] Guard green; `npm run ci:fast` green.
- [x] `CHANGELOG.md` `[Unreleased]` entry, with the breaking change and its migration path.

**Dependencies**: Phases 2 and 3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/jira-sync.js` - four comments
2. ✅ `shared/resources/jira-stage.js` - usage example key
3. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` - lookup example keys
4. ✅ `shared/resources/develop-pipeline-step-2-review.md` - provenance note
5. ✅ `shared/resources/platform-detection.md`, `shared/resources/resolve-platform.sh` - example key
6. ✅ `skills/finalise/SKILL.md` - three provenance lines
7. ✅ `skills/review-pr/SKILL.md`, `skills/review-pr/scripts/parse-target.sh` - example keys and URLs
8. ✅ `skills/scaffold-tracker-workflow/scripts/scaffold-tracker-workflow.js` - one comment
9. ✅ `skills/wireframe/SKILL.md` - step 2 without the profile table

### Files to Modify (Tests)

10. ✅ `tests/no-consumer-names.test.js` - new
11. ✅ `shared/resources/tests/pipeline-answers-generic.test.mjs` - empty EXEMPT
12. ✅ `shared/resources/tests/{generate-prd-epic-index,jira-stage,jira-stage-fixtures,jira-sync-no-transition,jira-sync-publishing-fidelity}.test.mjs`
13. ✅ `skills/review-pr/tests/review-pr.test.js`, `skills/scaffold-tracker-workflow/tests/scaffold-tracker-workflow.test.js`,
    `skills/sync-jira-bug/tests/{end-to-end,relative-doc-links}.test.js`, `skills/sync-jira-task/tests/sync-jira-task.test.js`
14. ✅ `skills/wireframe/tests/wireframe.test.js` - remove the two profile tests

### Files to Rename

15a. ✅ `shared/resources/tests/fixtures/<key>-*.json` (10 files) → `proj-*.json`
15b. ✅ `shared/resources/tests/jira-stage-fixtures.test.mjs` — loads the renamed fixtures (also under item 12)

### Files to Modify (Generated)

15. ✅ `skills/*/references/*` - regenerated by `npm run bundle`

### Files to Modify (Documentation)

16. ✅ `CHANGELOG.md` - `[Unreleased]` entry

### Files to Delete

17. ❌ `skills/wireframe/references/html-formats/<BRAND>-hifi.md` - one consumer's format profile

---

## 8. Testing Strategy

### Unit Tests

**Actions**:

- [x] `tests/no-consumer-names.test.js` red after Phase 1, green after Phase 4.
- [x] Its scanner test flags each sample — including the lower-case key, a `<KEY>_` identifier and a
      `<key>-….json` path — and ignores look-alikes (`rapport`, `TRAPPED`, `wrapper`, `bootstrapped`, `orbit`).
- [x] `pipeline-answers-generic.test.mjs` green with an empty `EXEMPT`.
- [x] Every test file whose fixtures changed passes with the same test count as before.
- [x] The wireframe suite passes with two tests fewer, and none of its other tests changed.

**Command**: `npm run ci:fast`, and each touched test file with `node --test <file>`.

### Contract Tests

- [x] No `scripts/` behaviour changes: the `review-pr` target-parser tests and the jira-stage walk
      tests pass with the renamed fixtures and the same assertion count.

---

## 9. Success Criteria

### Functional

- [x] `tests/no-consumer-names.test.js` walks `skills/` and `shared/`, scans paths and contents, and passes.
- [x] Before Phase 2 it failed on the same tree (red shown in the implementation report as masked `path: count` lines).
- [x] `skills/wireframe/references/html-formats/` no longer exists and `SKILL.md` links nothing in it.
- [x] `npm run ci:fast` passes.

### Performance

- [ ] The guard adds under 2 s to the test run — measured on the PR's head commit with
      `uptime; time command node --test tests/no-consumer-names.test.js`, both outputs recorded in the
      implementation report.

### Code Quality

- [x] `npm run bundle:check` is clean after the commit.
- [x] No `skills/*/references/` file was hand-edited.
- [x] `npm run validate -- skills/wireframe` passes.

### Migration

- [x] `CHANGELOG.md` `[Unreleased]` records the change, the removed profile and its migration path.

---

## 10. Risk Assessment

### Medium Risk Areas

**1. A fixture rename that changes what a test proves**

- **Risk**: renaming a key in an assertion but not in its input makes a test fail, or worse, pass vacuously.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: rename per file in one pass; compare each touched file's test count before and after.
- **Rollback**: revert that file.

**2. The consumer loses its profile on its next update**

- **Risk**: the consumer reinstalls before copying the profile out, and its agents lose the format notes.
- **Probability**: Medium
- **Impact**: Minor (the file is recoverable from git history)
- **Mitigation**: the CHANGELOG entry names the file and the migration step.
- **Rollback**: the consumer restores it from this repository's history into its own tree.

### Low Risk Areas

**1. A missed bundled copy**

- **Risk**: a copy keeps the old text.
- **Mitigation**: the guard walks the copies too, and the bundle check fails on a stale copy.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:

- A test suite fails after merge that passed before it.

**Steps**:

1. `git revert` the task's merge commit on `develop`.
2. Run `npm test`.

**Verification**: the suite is back to its pre-merge result.

### Partial Rollback (1-2 hours)

**When to Use**: one renamed fixture breaks one test.

**Steps**:

1. Restore that test file's previous fixture values.
2. Leave the guard scope wide and add a reasoned `SELF` entry only if the fixture truly needs the name.

### Forward Fix (< 4 hours)

Fix the fixture in place; the guard stays wide.

---

## Change Log

| Date       | Version | Description                                                              | Author          |
| ---------- | ------- | ------------------------------------------------------------------------ | --------------- |
| 2026-10-20 | 1.0     | Initial draft                                                            | create-task     |
| 2026-10-20 | 1.1     | Create the guard here; add the wireframe skill's consumer profile to scope | Lorien Gamaroff |
| 2026-10-20 |         | GitHub issue created (#709)                                              | sync-github-task |
| 2026-10-20 | 1.2     | Review passed (8/10) after fixes — guard patterns case-insensitive and letter-bounded, path scan added, ten fixture files renamed, `<KEY>_` identifiers and lower-case host in the edit pass, performance bound given its command, red evidence masked | review-task |
| 2026-10-20 |         | Status → ready-for-development                                           | review-task |
| 2026-10-20 |         | Implemented — 34 files (1 new guard, 10 fixtures renamed, 1 profile deleted) + 126 regenerated copies; guard 4 tests, 2 profile tests removed | develop |

---

## Progress Tracking

- [x] Phase 1: Add the guard and see it red
- [x] Phase 2: Neutralise the sources
- [x] Phase 3: Remove the wireframe skill's consumer profile
- [x] Phase 4: Re-bundle and verify

---

## References

- `shared/resources/tests/pipeline-answers-generic.test.mjs` — task.201's narrower guard
- `tests/bundled-links.test.js` — the `git ls-files` walk the new guard follows
- [`docs/development/project-completion-roadmap.md`](../../development/project-completion-roadmap.md) — Phase 12
