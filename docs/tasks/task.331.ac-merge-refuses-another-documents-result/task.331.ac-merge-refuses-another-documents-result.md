---
id: task.331
title: "The AC merge refuses another document's result"
type: task
description: "finalise-rerun-scope.js merge refuses an AC result whose story_file names another document, and /finalise keys its AC state files by work item as well as DoD run number, so one item's verdicts can never become another's record."
tags: [finalise, observation]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-11-26
updated: 2026-11-27
estimated_effort_hours: 8
github_issue: 958
---

# Technical Task: The AC merge refuses another document's result

**GitHub Issue**: [#958](https://github.com/Gamaroff/agent-skills/issues/958)

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.331.review.1.ac-merge-refuses-another-documents-result.md` implemented 2026-11-27

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
  `finalise-ac-merged-${DOD_N}.json` on 4 lines (`:1021`, `:1045`, `:1050`, `:1659` at `92ed119de`),
  `shared/resources/tests/finalise-deferred-ci.test.mjs` on 7 (`:418`–`:715`), and
  `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` on 2 (`:240`, `:273`, each writing
  `finalise-ac-result-1.yaml` before it runs the Step 3c block). The count came from
  `git grep -n 'finalise-ac-\(result\|merged\|extract\)-' -- '*.test.*' 'tests/**' 'evals/**' skills shared ':!skills/*/references/*' ':!docs/tasks'`.
  The first count (`-- skills shared docs`) missed the `evals/` pair (review 1).
- **The extract block binds no `STEM`.** The Step 3c extract block (`SKILL.md:1015`–`:1023`) binds
  only `AC_AGENT_ID` and `DOD_N`; the merge block after it (`:1037`) already binds `STEM` with the
  placeholder guard.
- **Step 6 action 2a already guards ownership.** Its block reads `finalise-ac-merged-${DOD_N}.json`
  and checks `.record.document` against `STEM` (`OWN_DOC`), with the comment "The file is keyed by
  DOD_N alone and never removed" (`:1661`). That comment is false once the path carries the stem.
- **The fixtures.** `shared/resources/tests/finalise-rerun-scope.test.mjs` holds 27 `ac_traceability`
  fixtures (`grep -c`). 2 of them carry `story_file` (`:750`, `:2262`), both the test's own `DOC`
  (`:56`). `agentDoc` is at `:2259`. The eval test's `AGENT_ALL_PASS` (`:147`) carries no
  `story_file`, so it merges under the narrow rule.

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

**Added in QA cycle 2 (T331-CR-1).** `merge` takes an optional `--doc <document>`. With it, a scope
whose `document` is not that document (compared with the same resolved-path rule) is refused before
the hash check: `{ reason: "scope-document-mismatch", exitCode: 0, mode, message }`, nothing written.
`--doc ""` is a usage error. Step 3c binds `DOC_PATH` from `{document-path}`, guards it, passes
`--doc`, and HALTs in its own `case` arm with the remedy "re-run Step 3a, the AC agent and the
extract". Without it, a scope another item overwrote merged silently when the result named no
document, and a correct result that did name this document was refused as another document's answer.

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

❌ **`finalise-ac-extract-${DOD_N}.json` and `finalise-rerun-scope-${DOD_N}.json`**, the two other
DOD_N-only paths in the Step 3c chain. Renaming them stays out of scope. QA cycle 2 (T331-CR-1)
disproved the reasoning first written here: another item's Step 3a can overwrite the scope file
between this item's Step 3a and 3c, so it *can* carry another item's state into a merge. Step 3c
now passes `--doc`, and `merge` refuses such a scope as `scope-document-mismatch` (§ 3). A stale
extract record from another item would only give a hash the stem-keyed result does not match, which
`merge` refuses as `result-hash-mismatch`. Keying both files by stem is the follow-up recorded in
gate 3.

---

## 5. Breaking Changes

### Breaking Change 1: a mismatched result is refused

**What Changed**: `merge` answers `result-document-mismatch` and writes no record. Before, it merged.

**Impact**: a run that hand-copies a result for the wrong document now stops at Step 3c with a named
reason instead of writing a wrong record.

**Migration**: none. Step 3c routes the reason as it routes `result-hash-mismatch`: a HALT that
writes nothing. It gets its own `case` arm, so the HALT names the remedy (re-run the extract, or
hand-copy this item's agent answer) instead of the generic `merge answered …` line.

### Breaking Change 1b: another document's scope is refused (QA cycle 2)

**What Changed**: with `--doc`, `merge` answers `scope-document-mismatch` and writes no record when
the scope belongs to another document. Before, it merged.

**Impact**: Step 3c stops with a named reason instead of recording another item's criteria and
carried verdicts. Concurrent finalises of two items at one `DOD_N` in one checkout are still
unsupported: each remedy re-runs Step 3a and can overwrite the other's scope.

**Migration**: none. A caller that omits `--doc` keeps the old behaviour. Step 3c is the only CLI
caller.

### Breaking Change 2: the AC state files carry the stem

**What Changed**: `finalise-ac-result-{N}.yaml` becomes `finalise-ac-result-{stem}-{N}.yaml`, and the
same for the merged file.

**Migration**: none for a fresh run. A run resumed across the upgrade finds nothing at the new
paths. Before Step 3c, re-run the extract, then Step 3c. After Step 3c, Step 6 action 2a HALTs
(record present, merged result missing): move the record aside, then re-run Step 3a, the AC agent and
Step 3c (corrected in QA cycle 2, T331-CR-2).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.331.plan.ac-merge-refuses-another-documents-result.md](task.331.plan.ac-merge-refuses-another-documents-result.md)

### Phase 1: The refusal

**Risk Level**: Low

**Files**:
- `shared/resources/finalise-rerun-scope.js`
- `shared/resources/tests/finalise-rerun-scope.test.mjs`

**Changes**:
- [x] Write the failing cases first (§ 8)
- [x] Refuse a present, mismatched `story_file` with `result-document-mismatch`

**Dependencies**: task 327, which edits the same file and the Step 3c prose

### Phase 2: The state paths

**Risk Level**: Low

**Files**:
- `skills/finalise/SKILL.md`
- `shared/resources/tests/finalise-deferred-ci.test.mjs`
- `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`

**Changes**:
- [x] Add `${STEM}` to the four paths. The extract block gains a `STEM` binding with the same
  placeholder guard the merge block uses
- [x] Give `result-document-mismatch` its own HALT arm in Step 3c's `case`, naming the remedy
- [x] Rewrite the Step 6 action 2a comment that says the file is keyed by `DOD_N` alone; keep its
  `OWN_DOC` guard
- [x] Update the seven paths in `finalise-deferred-ci.test.mjs` and the two in
  `finalise-rerun-scope-blocks.test.mjs` (`finalise-ac-result-task.9-1.yaml`)

**Dependencies**: Phase 1

### Phase 3: Records and bundle

**Risk Level**: Low

**Files**:
- `CHANGELOG.md`
- Generated copies under `skills/*/references/`

**Changes**:
- [x] Write the CHANGELOG entry
- [x] Run `npm run bundle`, then `npm run bundle:check`

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
5. ✅ `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` - the two result paths it writes

### Files to Modify (Documentation)

6. ✅ `CHANGELOG.md`

### Generated

7. ✅ `skills/*/references/finalise-rerun-scope.js` copies, by `npm run bundle`

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

- [ ] Every row of the § 8 table holds in a test in `shared/resources/tests/finalise-rerun-scope.test.mjs`
- [ ] The Step 3c merge block and the Step 6 action 2a block, run as substituted, read the
  stem-keyed paths: held by `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` (it writes
  `finalise-ac-result-task.9-1.yaml` and the block merges it) and
  `shared/resources/tests/finalise-deferred-ci.test.mjs` (it stages `finalise-ac-merged-task.9-1.json`
  and the block reads it)
- [ ] `skills/finalise/SKILL.md` names every AC result and merged path with `${STEM}`: the four lines
  of § 3 read `finalise-ac-result-${STEM}-${DOD_N}.yaml` / `finalise-ac-merged-${STEM}-${DOD_N}.json`
  (calibrated: `git grep -c 'finalise-ac-\(result\|merged\)-\${DOD_N}' -- skills/finalise/SKILL.md`
  reads 4 at `92ed119de` and must read 0)

### Performance

- [ ] Not applicable: no bound is claimed

### Code Quality

- [ ] Every mutation in § 8 is recorded in the QA report with the test it turned red
- [ ] `npm run test:remote` and `npm run bundle:check` pass

### Migration

- [ ] Step 3c's `case` in `skills/finalise/SKILL.md` has a `result-document-mismatch` arm that HALTs
  and names the remedy
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

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-27
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.331.qa.3.ac-merge-refuses-another-documents-result.md](./task.331.qa.3.ac-merge-refuses-another-documents-result.md)
- **Gate File**: [task.331.gate.3.ac-merge-refuses-another-documents-result.yml](./task.331.gate.3.ac-merge-refuses-another-documents-result.yml)

### Test Coverage Summary
- **Tests Executed**: 74 (engine suite), 8963 (fast gate)
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
All gate-2 findings are fixed. Four medium-confidence advisories from the cycle-3 review are recorded as one follow-up: key the scope and extract files by stem, split scope-document-mismatch, fix the CHANGELOG resume detail, and make `--doc` required.

## Definition of Done - Gaps Identified

**Status:** IN PROGRESS

### QA Gate Status

**QA Report**: `task.331.qa.3.ac-merge-refuses-another-documents-result.md`
**Gate File**: `task.331.gate.3.ac-merge-refuses-another-documents-result.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 95/100

### Missing Criteria:

1. **Acceptance Criteria:**
   - [ ] § 9 Migration, Step 3c's `result-document-mismatch` arm (low): the arm is present at `skills/finalise/SKILL.md:1074` and names the remedy, but no test runs it. The eval Step 3c test drives only the `scope-document-mismatch` arm, so deleting the arm would leave every test green while the generic `*)` arm HALTs without the remedy.

### Next Steps:

- [ ] Add a per-shell test to `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`: a correct scope plus a result whose `story_file` is `task.8.other`, run through the substituted Step 3c block. Assert exit 1, `another document's answer`, the remedy text (`hand-copy THIS item's AC agent answer`, `never merge it`), and that no record is written. Mutation-prove it by deleting the arm.
- [ ] The test changes code outside the task directory, so it re-enters QA at 5a; then re-run `/finalise` (DoD run 2 is scoped to the reported gap).

**Estimated Effort:** Small (one test, about 30 minutes)

**Gap Report Generated:** 2026-11-27
**QA Gate Reference**: See `task.331.gate.3.ac-merge-refuses-another-documents-result.yml` for full details

**Detailed Verification Log:** See `task.331.dod.1.ac-merge-refuses-another-documents-result.md` for complete verification evidence and timestamps.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-26 | 1.0     | Initial draft — cut from observation #191 | create-task |
| 2026-11-27 | 1.1     | Review passed (8/10) — added the missed eval test pair, the extract-block STEM binding and the Step 6 comment to Phase 2; resolved Step 3c routing as a HALT; rescoped the grep criterion; refreshed drifted anchors | review-task |
| 2026-11-27 |         | Status → ready-for-development | review-task |
| 2026-11-27 |         | Implemented — 7 files (engine, SKILL.md, 3 tests, CHANGELOG, bundled copy), 4 new tests; status → ready-for-review | develop-task (inline) |
| 2026-11-27 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-11-27 |         | QA findings fixed — cycle 1, 1 finding (T331-CI-1: dead mailto autolink in the implementation report) | qa-fix |
| 2026-11-27 |         | QA gate CONCERNS (90/100) — cycle 2, 3 findings | qa-task |
| 2026-11-27 |         | QA findings fixed — cycle 2, 3 findings (T331-CR-1 scope-document-mismatch via merge --doc; T331-CR-2 CHANGELOG resume line; T331-CR-3 Step 6 2a prose) | qa-fix |
| 2026-11-27 |         | QA gate PASS (95/100) — cycle 3, 0 open findings, 4 advisories | qa-task |
| 2026-11-27 |         | PR review CONCERNS — PC-1 fixed: § 4 claim corrected; § 3 and § 5 describe `merge --doc` / `scope-document-mismatch` (§ 9 not reworded) | develop-task (5c) |
| 2026-11-27 |  | DoD incomplete — 1 gap identified (§ 9 Migration: result-document-mismatch arm untested) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The refusal

- [x] Failing cases
- [x] Refusal

### Phase 2: The state paths

- [x] SKILL.md paths, extract-block STEM, reason arm, Step 6 comment
- [x] Test paths (deferred-ci, eval blocks)

### Phase 3: Records and bundle

- [x] CHANGELOG
- [x] Bundle

---

## References

- Observation #191 — finalise AC state files are keyed by run number only, so one work item's result merged into another's
- `docs/tasks/task.329.git-name-probe-sink/task.329.dod.1.git-name-probe-sink.md` (deviation 5, the incident)
- Task 327 (`docs/tasks/task.327.subagenthandback-replies-are-extracted/`), the extract half

## Notes

- QA report: `task.331.qa.{N}.ac-merge-refuses-another-documents-result.md`; gate: `task.331.gate.{N}.ac-merge-refuses-another-documents-result.yml`; bugs: `task.331.bug.{N}.{name}.md`, all in this directory.
