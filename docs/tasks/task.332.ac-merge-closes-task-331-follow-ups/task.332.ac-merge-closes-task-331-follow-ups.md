---
id: task.332
title: "The AC merge closes task 331's follow-ups"
type: task
description: "finalise-rerun-scope.js merge requires --doc and a named story_file, /finalise keys its scope and extract files by work item, and the task 331 refusals each name their own cause and remedy."
tags: [finalise, ac-merge, follow-up]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-11-27
updated: 2026-11-28
assignee:
estimated_effort_hours: 8
github_issue: 963
---

# The AC merge closes task 331's follow-ups

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.332.review.1.ac-merge-closes-task-331-follow-ups.md` implemented 2026-11-27

**GitHub Issue**: [#963](https://github.com/Gamaroff/agent-skills/issues/963)

---

## 1. Overview

Task 331 (PR #962) made `finalise-rerun-scope.js merge` refuse another document's AC result and,
with `--doc`, another document's scope. Its DoD run 2 security review raised two spec challenges,
and its QA gates left advisories in `recommendations.future`. This task closes all of them.

**Scope**: the `merge` subcommand of `shared/resources/finalise-rerun-scope.js`, its tests, the
Step 3a and Step 3c blocks of `skills/finalise/SKILL.md`, the AC prompt's `story_file` rule, the
eval test that runs those blocks, and `CHANGELOG.md`.

**Key deliverables**:

- `merge` refuses a call with no `--doc` and a result with no `story_file`, so neither check can be
  skipped by leaving something out.
- The scope and extract state files carry the work item's stem, as the result and merged files
  already do.
- Each refusal names its own cause and remedy.

---

## 2. Motivation

### Current Problems

- **S1 (security spec challenge).** A result whose `ac_traceability` carries no `story_file` merges
  with no document check (`shared/resources/finalise-rerun-scope.js:1241` *(`const named =
  storyFileOf(agentYaml);`)*). Only the optional `--sha256` is left to guard it. The AC prompt always
  asks for the field (`shared/resources/finalise-dod-ac-prompt.md:122` *(`story_file:
  "<STORY_FILE>"`)*), so a result without it is malformed, not legacy.
- **S2 (security spec challenge, gate 3 CR-4).** `merge` without `--doc` skips
  `scope-document-mismatch` (`finalise-rerun-scope.js:1218` *(`opts.doc !== undefined &&`)*).
  Step 3c passes `--doc`, but any other caller can leave it out.
- **G3-1 (gate 3, medium/medium).** The scope file and the extract output are still keyed by run
  number alone: `skills/finalise/SKILL.md:637` *(`RERUN_SCOPE_FILE=".claude/state/finalise-rerun-scope-${DOD_N}.json"`)*,
  `:1025` *(`| tee ".claude/state/finalise-ac-extract-${DOD_N}.json"`)*, `:1060` and `:1062`. Two
  items at the same `DOD_N` in one checkout overwrite each other's scope. Task 331 detects that and
  HALTs. It does not prevent it, and the remedy for one item overwrites the other's scope.
  **It happens in practice, in consumer repos too.** On 2026-11-27, tinker-city ran `/finalise` for
  task.163 straight after task.162. DoD run 1's AC merge read `finalise-ac-result-1.yaml`, which
  task.162's run 1 had left behind (`story_file` was an absolute path to task.162, `pr_number: 1351`).
  The vendored copy predated task 327, so the extract failed on a `SubagentHandback` reply and wrote
  nothing. The merge then answered `merged` and recorded task.162's verdicts under task.163's ids. A
  person caught it by reading `story_file`. Record: tinker-city `develop` at `c6a30e0b`,
  `docs/tasks/task.163.infra-dns-scripts-hardening/task.163.implementation.1.infra-dns-scripts-hardening-initial-run.md`,
  `## Issues Log`, the two "Step 7" entries. This is the second occurrence after task 325 → task 329
  (observation #191), and the first in a consumer repo. Task 331's `result-document-mismatch`
  would now refuse that merge, but only because the stale file named its document. That is S1's
  gap: a run-number-keyed file with no `story_file` would still merge.
- **G3-2 (gate 3).** `scope-document-mismatch` covers different states with one message and one
  remedy (`SKILL.md:1072`).
- **G3-3 (gate 3).** The CHANGELOG resume sentence (`CHANGELOG.md:30-33`) covers a resume before
  Step 3c and after Step 3c (Step 6 action 2a). Read in full on 2026-11-27, it does not cover a resume
  that holds a pre-upgrade `result-unparseable` answer, or one between Step 3c and Step 3d.
- **Earlier advisories still standing**:
  - **G1-2.** A `story_file` naming a file that does not exist reports as "another document's
    answer".
  - **G1-3.** `storyFileOf` reads `parsed.ac_traceability ?? parsed` (`finalise-rerun-scope.js:741`),
    so a root-level `story_file` is read only when there is no `ac_traceability` block. One *beside*
    an `ac_traceability` block that lacks it is ignored.
  - **G1-4.** The `merge()` JSDoc (`:720-727`) sits above `storyFileOf`, not above `merge()`.
  - **G1-5.** The realpath branch of `sameDocument` (`:751`) has no test with a symlink or a
    nonexistent path.
  - **G2-4.** A bare basename or a case variant of the right path is refused. Probed 2026-11-27:
    `sameDocument(cwd, basename, path)` and `sameDocument(cwd, PATH.toUpperCase(), path)` both
    return `false`.

### Benefits of Solution

- No check in `merge` can be skipped by leaving out a flag or a field.
- Two items finalised in one checkout cannot share any AC state file.
- Every HALT says what went wrong and how to fix it.
- The exact-path rule for `story_file` is written down, so a refused correct answer is explained.

---

## 3. Technical Background

### Current Architecture

`merge` checks its inputs in this order (`finalise-rerun-scope.js:1195-1262`): usage (`--doc ''` is a
usage error), then the scope's document against `--doc` when `--doc` is given, then `--sha256`, then
the result's `story_file` against the scope's document when a `story_file` is present. Each refusal
writes nothing. `storyFileOf` (`:734`) and `sameDocument` (`:751`) are module-private.

Step 3a writes `finalise-rerun-scope-${DOD_N}.json`. The extract writes `finalise-ac-extract-${DOD_N}.json`.
Step 3c reads both, and also the stem-keyed `finalise-ac-result-${STEM}-${DOD_N}.yaml`, then writes
the stem-keyed `finalise-ac-merged-${STEM}-${DOD_N}.json` (task 331).

### Target Architecture

- `merge` requires `--doc`. Leaving it out is a usage error (exit 2), as `--doc ''` is today.
- A result with no `story_file` is refused as `result-document-unnamed`, and nothing is written.
  `storyFileOf` reads `ac_traceability.story_file`, then a root `story_file`.
- `result-document-unnamed` fires only on a result `merge()` would accept: one that parses **and**
  carries an `ac_traceability.acs` list. Any other result goes on to `merge()`, which answers
  `result-unparseable` as today. A parse that throws is not the only unparseable case:
  `parseYamlSubset("this is not the YAML you asked for\n")` returns `{}` without throwing (run
  2026-11-27), and that is the fixture of the existing `result-unparseable` test
  (`finalise-rerun-scope.test.mjs:1885`).
- A `story_file` that names no existing file keeps the reason `result-document-mismatch`, with its own
  message pointing at the answer, not the file. The Step 3c arm needs no new branch for it.
- The scope and extract files become `finalise-rerun-scope-${STEM}-${DOD_N}.json` and
  `finalise-ac-extract-${STEM}-${DOD_N}.json`.
- `scope-document-mismatch` splits in two. A scope with no `document` field becomes
  `scope-document-missing` (a pre-331 scope file: re-run Step 3a). A scope that names another
  document stays `scope-document-mismatch` (the wrong `--scope` path was passed, or a pre-upgrade file
  was read: re-run Step 3a for this item).

### Important Clarifications

- **One task, not several.** G3-1 changes what G3-2 splits. Once the scope file carries the stem,
  another item's Step 3a can no longer overwrite it, so the "overwritten scope" state of G3-2 becomes
  "the wrong file was passed". G3-1 goes first so the split is designed against the states that remain.
  S1 and S2 are one change to one function. The rest are small, and none is worth a PR alone.
- **S1 decision (made for the author, open to `/review-task`).** The task refuses a result with no
  `story_file`, rather than merging it with `verified: false`. Grounds: the prompt always asks for the
  field (`finalise-dod-ac-prompt.md:122`), so a missing one means a malformed answer. This reverses a
  decision a test holds (§ 5).
- **G2-4 decision.** Document the exact-path rule. Do not add a basename fallback: a fallback would
  accept another directory's file with the same name, which weakens the check task 331 added.
- **Decisions the tests hold** (obs #156). Measured 2026-11-27 with a scan of the `"merge",` argv
  lines in `shared/resources/tests/finalise-rerun-scope.test.mjs`: 6 calls build argv literally, at
  `:1873`, `:1895`, `:1982`, `:2000`, `:2095` and `:2303`. None passes `--doc`, and the first five
  build results with no `story_file`. `:2303` is `mergeDocCase`, which adds `--doc` only when asked.
  S1 and S2 make all six fail unless they change. One test asserts the opposite of S1 by name: `merge:
  a result with no story_file merges as before (CLI, task 331)` (`:2347`).

---

## 4. Scope

### In Scope

✅ S1, S2, G3-1, G3-2, G3-3, G1-2, G1-3, G1-4, G1-5 and G2-4, as § 2 states them.
✅ The tests that hold the reversed decisions, updated in the same change.
✅ The bundled copies, through `npm run bundle`.

### Out of Scope

❌ A basename or case-insensitive match for `story_file` (G2-4 decision, § 3).
❌ Changing the extract's own refusals, or the AC prompt beyond the `story_file` rule.
❌ Migrating state files a run left behind. A resume across the upgrade is handled by the CHANGELOG
   instructions (G3-3), the same way task 331 handled its renames.

---

## 5. Breaking Changes

### Breaking Change 1: `--doc` is required

- **Before:** `merge --scope s --result r` merges with no scope check.
- **After:** it is a usage error, exit 2, and nothing is written.
- **Affected:** callers outside Step 3c. In this repository that is only the tests at `:1873`,
  `:1895`, `:1982`, `:2000`, `:2095` and `mergeDocCase` (`:2281`).
- **Migration:** pass `--doc` with the document Step 3a scoped. Each named test adds `--doc` with its
  fixture document. `mergeDocCase` passes `--doc` by default, and a test that wants it missing says so.

### Breaking Change 2: a result must name its document

- **Before:** a result with no `story_file` merges.
- **After:** it answers `result-document-unnamed` and writes nothing. Step 3c HALTs with the remedy:
  re-run the extract, or hand-copy this item's AC agent answer.
- **Affected:** the five pre-331 tests' result fixtures, and the test at `:2347`, which is rewritten
  to assert the refusal.
- **Migration:** results add `story_file:` with the fixture document's path. The exception is the
  `result-unparseable` fixture at `:1885`, which stays as it is and still expects `result-unparseable`.

### Breaking Change 3: the scope and extract files carry the stem

- **Before:** `finalise-rerun-scope-{N}.json`, `finalise-ac-extract-{N}.json`.
- **After:** `finalise-rerun-scope-{stem}-{N}.json`, `finalise-ac-extract-{stem}-{N}.json`.
- **Affected:** a `/finalise` run resumed across the upgrade.
- **Migration:** before Step 3c, re-run Step 3a and the extract. After Step 3c, nothing else reads
  them. The CHANGELOG entry states this (G3-3).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.332.plan.ac-merge-closes-task-331-follow-ups.md](task.332.plan.ac-merge-closes-task-331-follow-ups.md)

### Phase 1: Stem-keyed scope and extract files (G3-1)

**Risk:** Low. **Depends on:** none.

- [x] Step 3a writes `finalise-rerun-scope-${STEM}-${DOD_N}.json` (`SKILL.md:637`)
- [x] The extract tees `finalise-ac-extract-${STEM}-${DOD_N}.json`, and Step 3c reads both new paths
  (`:1025`, `:1060`, `:1062`)
- [x] The eval test's scope path follows (`evals/shared/tests/finalise-rerun-scope-blocks.test.mjs:305`)

### Phase 2: The engine's refusals (S1, S2, G3-2, G1-2, G1-3, G1-4)

**Risk:** Low. **Depends on:** Phase 1 (G3-2's remedies name Phase 1's paths).

- [x] Failing tests first, one per row of § 8 (written after the engine change; each new test's red
  shown by its mutation instead — see the implementation report)
- [x] `--doc` required; `result-document-unnamed`; `scope-document-missing`; the nonexistent-file
  message; the root `story_file` fallback
- [x] Move the `merge()` JSDoc down to `merge()`
- [x] Update the six reversed-decision tests (§ 5)

### Phase 3: Step 3c arms and the exact-path rule (G3-2, G2-4)

**Risk:** Low. **Depends on:** Phase 2.

- [x] Step 3c adds `result-document-unnamed` and `scope-document-missing` arms, each with its own
  HALT remedy, and the `scope-document-mismatch` remedy is reworded for the states left after Phase 1
- [x] `finalise-dod-ac-prompt.md` says `story_file` must be the exact `<STORY_FILE>` path, unchanged

### Phase 4: Tests for the realpath branch, CHANGELOG, bundle (G1-5, G3-3)

**Risk:** Low. **Depends on:** Phases 1-3.

- [x] A symlinked spelling of the document merges; a nonexistent spelling is refused
- [x] `CHANGELOG.md` `[Unreleased]`: the three breaking changes, with a resume sentence that covers
  before Step 3c, between Step 3c and Step 3d, after Step 3d, and a pre-upgrade `result-unparseable` answer
- [x] `npm run bundle`

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. `shared/resources/finalise-rerun-scope.js`: refusals, `storyFileOf`, JSDoc
2. `skills/finalise/SKILL.md`: Step 3a and Step 3c paths and arms
3. `shared/resources/finalise-dod-ac-prompt.md`: the exact-path rule

### Files to Modify (Tests)

4. `shared/resources/tests/finalise-rerun-scope.test.mjs`
5. `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`

### Files to Modify (Documentation)

6. `CHANGELOG.md`

### Generated

7. The bundled copies of files 1 and 3 (`npm run bundle` names them)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

| Case | Today | After |
| :-- | :-- | :-- |
| `merge` with no `--doc` | merges | `usage`, exit 2, nothing written |
| a result with no `story_file` | `merged` | `result-document-unnamed`, nothing written |
| a result that parses to no `acs` list and names no document (`"this is not the YAML you asked for"`) | `result-unparseable` | `result-unparseable` (unchanged: `result-document-unnamed` does not fire) |
| a result with `story_file` at the root beside an `ac_traceability` block | `merged`, unchecked | checked: the same document merges, another is refused |
| a `story_file` naming a file that does not exist | `result-document-mismatch`, "another document's answer" | `result-document-mismatch`, message names the missing file |
| a scope with no `document` | `scope-document-mismatch` | `scope-document-missing` |
| a scope for another document | `scope-document-mismatch` | `scope-document-mismatch` (unchanged) |
| `story_file` a symlinked spelling of the document | `merged` (untested) | `merged` (tested) |
| a wrong `--sha256` with a result naming no document | `result-hash-mismatch` | `result-hash-mismatch` (the hash is still checked first) |

**Command**: `command node --test shared/resources/tests/finalise-rerun-scope.test.mjs evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`

### Mutation Tests

Each alone must turn a named test red:

1. `--doc` made optional again.
2. The `result-document-unnamed` refusal removed.
3. The root `story_file` fallback removed.
4. `scope-document-missing` folded back into `scope-document-mismatch`.
5. The realpath branch of `sameDocument` removed (only the symlink test catches this one).
6. Step 3a's scope path reverted to `finalise-rerun-scope-${DOD_N}.json` (the eval test catches it).
7. `result-document-unnamed` checked on every parsed result, not only one with an `acs` list (the
   `result-unparseable` test at `:1885` catches it).

### Consumer Tests

`npm run test:remote` runs the whole suite, including the Step 3c blocks under bash and zsh.

### Performance Tests

Not applicable.

---

## 9. Success Criteria

### Functional

- [ ] Every row of the § 8 table holds in a test in `shared/resources/tests/finalise-rerun-scope.test.mjs`
- [ ] The Step 3c block, run as substituted, reads the stem-keyed scope and extract paths: held by
  `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`
- [ ] `git grep -c 'finalise-\(rerun-scope\|ac-extract\)-\${DOD_N}' -- skills/finalise/SKILL.md`
  reads 0 (it reads 4 at `2da6e3247`)

### Performance

- [ ] Not applicable: no bound is claimed

### Code Quality

- [ ] Every mutation in § 8 is recorded in the QA report with the test it turned red
- [ ] `npm run test:remote` and `npm run bundle:check` pass

### Migration

- [ ] Step 3c's `case` has `result-document-unnamed` and `scope-document-missing` arms that HALT and
  name their remedies
- [ ] `CHANGELOG.md` `[Unreleased]` names the three changes of § 5 and the resume path for each
  point a run can be resumed from

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A resume across the upgrade.**
   - Risk: a paused `/finalise` run finds nothing at the new scope or extract path.
   - Probability: Low. Impact: Medium (a HALT, never a wrong record).
   - Mitigation: Step 3c already HALTs on a missing scope; the CHANGELOG names the re-run.

### Low Risk Areas

1. **Reversed test decisions.** The six tests in § 5 change on purpose. A reviewer reads each as a
   deliberate reversal, not as a test bent to fit the code.
2. **Bundled-copy drift.** `bundle:check` catches it.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** Step 3c HALTs on a correct, current-format answer; CI red on the finalise suites.
- **Steps:** revert the merge commit; `npm run bundle`; push.
- **Validation:** the task 331 tests pass again.

### Partial Rollback

- **When:** only the S1 refusal misfires (an agent that writes a correct answer without `story_file`).
- **Steps:** revert Phase 2's `result-document-unnamed` hunk and its test; keep the rest.

### Forward Fix

- **When:** a message or remedy is wrong but the refusal is right. Fix the text, not the check.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-28
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.332.qa.2.ac-merge-closes-task-331-follow-ups.md](./task.332.qa.2.ac-merge-closes-task-331-follow-ups.md)
- **Gate File**: [task.332.gate.2.ac-merge-closes-task-331-follow-ups.yml](./task.332.gate.2.ac-merge-closes-task-331-follow-ups.yml)

### Test Coverage Summary
- **Tests Executed**: full suite 8,975/8,978 pass, 0 fail, 3 skipped; blocks test 18/18
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
- Gate 1's T332-QA-1, T332-CR-1 and T332-CR-2 are fixed and mutation-proven.
- T332-CR2-1 (medium, reproduced): after a successful extract, the hand-copy remedy in both Step 3c document arms is refused as `result-hash-mismatch`, which has no remedy of its own.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-27 | 1.0     | Initial draft — from task 331's DoD run 2 spec challenges and QA gate 1-3 advisories | create-task |
| 2026-11-27 | 1.1     | G3-1: add the tinker-city task.162 → task.163 occurrence (first in a consumer repo) | Claude |
| 2026-11-27 | 1.2     | Review passed (9/10): document checks gated on an `acs` list so `result-unparseable` stays reachable; GitHub issue #963 linked | review-task |
| 2026-11-27 |         | Status → ready-for-development | review-task |
| 2026-11-28 |         | Implemented Phases 1–4: `--doc` required, `result-document-unnamed`, `scope-document-missing`, stem-keyed scope/extract paths, exact-path prompt rule; 7 mutations proved; status → ready-for-review | develop |
| 2026-11-28 |         | QA gate CONCERNS (70/100) — 3 findings | qa-task |
| 2026-11-28 |         | QA findings fixed — gate 1's 3 MEDIUM (CHANGELOG citation, two Step 3c remedies), 1 iteration | qa-fix |
| 2026-11-28 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-11-28 |         | QA findings fixed — gate 2's 1 MEDIUM (hand copy after an extract), plus the zsh `--sha256` argument, 1 iteration | qa-fix |
<!-- change-log-end -->

## Progress Tracking

### Phase 1: Stem-keyed scope and extract files

- [x] SKILL.md paths
- [x] Eval test path

### Phase 2: The engine's refusals

- [x] Failing tests
- [x] Refusals and fallback
- [x] JSDoc
- [x] Reversed-decision tests

### Phase 3: Step 3c arms and the exact-path rule

- [x] Arms
- [x] AC prompt rule

### Phase 4: Tests, CHANGELOG, bundle

- [x] Symlink and nonexistent tests
- [x] CHANGELOG
- [x] Bundle

---

## References

- Task 331: `docs/tasks/task.331.ac-merge-refuses-another-documents-result/`
  - DoD run 2, Step 3 Recommendations: `task.331.dod.2.ac-merge-refuses-another-documents-result.md`
  - Gate advisories: `task.331.gate.{1,2,3}.ac-merge-refuses-another-documents-result.yml` `recommendations.future`
- PR #962

## Notes

- QA report: `task.332.qa.{N}.ac-merge-closes-task-331-follow-ups.md`; gate:
  `task.332.gate.{N}.ac-merge-closes-task-331-follow-ups.yml`; bugs: `task.332.bug.{N}.{name}.md`, all
  in this directory.
