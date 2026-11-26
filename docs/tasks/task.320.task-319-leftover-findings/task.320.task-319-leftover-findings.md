---
id: task.320
title: "Task 319's leftover findings are closed"
type: task
description: "Close the seven low findings task 319 carried forward and the two points its Definition of Done left to the owner: three in the re-run engine, two in push-held.sh, two in tick-pr.sh, escaped configuration keys, and the edge characters of ci.skipMarker."
tags: [ci, push-policy, finalise, develop-next, skills-config]
category: refactoring
status: accepted
priority: Low
risk_level: low
created: 2026-11-25
updated: 2026-11-26
completed_date: 2026-11-26
estimated_effort_hours: 8
github_issue: 938
pr_number: 949
---

# Technical Task: Task 319's leftover findings are closed

**GitHub Issue**: [#938](https://github.com/Gamaroff/agent-skills/issues/938)

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.320.review.1.task-319-leftover-findings.md` implemented 2026-11-25

---

## 1. Overview

Task 319 was accepted with seven low findings carried forward and two points left to the owner. This
task closes all nine. Each is small, and each makes an engine answer something that is not so, or
accept a setting without reading it.

**Scope**: `finalise-rerun-at-head.js`, `push-held.sh`, `tick-pr.sh`, `ci-tree-equivalence.js`, the
one export the first of them needs from `criteria-section.js`, their tests, and two documents.

**Key deliverables:**

- the re-run engine refuses the three documents or trees it now reads past (T319-CR-1201, 1202, 1203);
- `push-held.sh` says what the remote holds after a failed fetch or a stopped script (T319-CR-1302, 1303);
- `tick-pr.sh start` answers the same from a subdirectory (T319-CR-1304), and its one known limit is
  written down (T319-CR-1301);
- an escaped spelling of a block name in `skills-config.yaml` is refused, and `ci.skipMarker` is
  checked before it is trimmed.

**Expected outcome**: the Deferred Work list of task 319 has no open entry, and each entry has a test
that was red before its fix, except T319-CR-1301, which is a documented limit.

---

## 2. Motivation

### Current Problems

1. **A listed command is silently not run.** In three unusual documents or trees the re-run engine
   answers `none-named` or `ran` where it should refuse. `/finalise` then grades a criterion on
   evidence that is older than the head, or on a tree that is not the head.
2. **A HALT says the wrong thing about the push.** A push that reached the server is reported as
   failed, and a commit that was fetched is reported as not fetched. The person reading the PR after a
   HALT acts on that line.
3. **A landed tick is recorded again.** Started in a subdirectory, `tick-pr.sh start` answers `resume`
   for a tick that is already on the base.
4. **A setting is ignored without a word.** A block name written with a YAML escape is neither read nor
   refused. For `ci` that loses an opt-out: `enabled: false` under `"c\x69"` leaves the rule on.
5. **The reference and the code disagree on `ci.skipMarker`.** The reference says no control or format
   character; a byte-order mark or a tab at the edge is accepted and dropped.

### Benefits of closing them together

1. **No silent answer is left** in the four engines task 319 added or extended, among the known cases.
2. **One QA pass** over four small scripts, in place of several.
3. **The remedies are already tried.** § 3 records each one run against a reproduction and the suites.
4. **The carried-forward list is empty**, so the next gate on these files starts clean.

---

## 3. Technical Background

Source of the findings: `recommendations.future` in
[gate 9 of task 319](../task.319.ci-runs-only-where-needed/task.319.gate.9.ci-runs-only-where-needed.yml)
and its [DoD run 2](../task.319.ci-runs-only-where-needed/task.319.dod.2.ci-runs-only-where-needed.md)
(§ Recommendations for the owner). The gate's remedies carry no `remedy:` mark, so each was a claim.
All of them were run on 2026-11-25 at `b005792a9`, in a scratch clone; results below.

### Current Architecture

| Finding | Where (grepped 2026-11-25) | Input | Answer today | Control |
| --- | --- | --- | --- | --- |
| T319-CR-1201 | `shared/resources/finalise-rerun-at-head.js:840` *(`.split(/^(?=## )/m)`)* | no criterion read, and a fenced `## ` line in the section | `none-named` | `# ` in the fence: `scan-broken` |
| T319-CR-1201 | the same, line 845 *(`const where`)* | no criteria heading the reader knows, and a `## Rollback criteria` | `none-named` | `## Rollback`: `scan-broken` |
| T319-CR-1202 | `finalise-rerun-at-head.js:872` *(`const lost`)* | one criterion with a stray backtick and an unindented line that names the command | `none-named` | without the backtick: `scan-broken` |
| T319-CR-1203 | `finalise-rerun-at-head.js:624` *(`byFold.has`)* | untracked `SUB/x.js` beside a submodule `sub`, `core.ignorecase=true`, a case-sensitive disk | `ran` | `SUB2/x.js`: `dirty-tree` |
| T319-CR-1301 | `shared/resources/tick-pr.sh:101` *(`landed()`)* | conflict resolved on the forge, squashed, remote branch deleted | `resume` | none; a limit |
| T319-CR-1302 | `shared/resources/push-held.sh:154` *(`git fetch --quiet --no-tags`)* | the fetch brings the commit and fails on a locked tracking ref | "could not be fetched" | no lock: `nothing held` |
| T319-CR-1303 | `push-held.sh:98` *(`rc=${rc:-$?}`)* | the script stopped (SIGSTOP) for 11 s on a 3 s bound; the server has the push | "the push failed (exit 137: )" | not stopped: `pushed` |
| T319-CR-1304 | `tick-pr.sh:113` *(`git diff-tree`)* | `start` run in a subdirectory, landed tick whose merge conflicts | `resume` | from the top: `landed` |
| Escaped key | `shared/resources/ci-tree-equivalence.js:398` *(`normKey`)* | `"pipelin\x65":`, `"c\x69":`, or `"finalis\x65":` holding no list | not read, not refused | `Pipeline:`: refused |
| Marker edge | `ci-tree-equivalence.js:548` *(`const m = v.trim()`)* | a BOM or a tab at the edge of `ci.skipMarker` | accepted, dropped | inside the value: refused |

The open point named only the `pipeline` key. Running it showed the class is wider: `ci` and a
`finalise` block without a list behave the same, because all three near-miss checks go through
`normKey` and it does not decode escapes. `listKeyRows` in `finalise-rerun-at-head.js` already decodes
them, for the list key only.

The existing functions of this kind, and what happens to each:

- `shows` and `lazilyNamed` (`finalise-rerun-at-head.js`): reused. The joining loop inside
  `lazilyNamed` is taken out so the backtick check can read the same text. No second reader is added.
- `makeFenceTracker` (`shared/resources/criteria-section.js:42`, not exported): exported and reused.
- The escape decoding inside `listKeyRows`: moved to one helper in `ci-tree-equivalence.js`, which the
  engine already requires. It replaces the copy there.

### Target Architecture

Each remedy as run, against the reproduction and against the four suites (`finalise-rerun-at-head`,
`tick-pr`, `push-policy`, `ci-tree-equivalence`: 227 tests, 227 passed before any change).

| Finding | Remedy as run | Reproduction after it |
| --- | --- | --- |
| T319-CR-1201 | split on `## ` outside fences; search the whole document when the reader knows no heading | both inputs `scan-broken` |
| T319-CR-1202 | apply `shows` to the lazily joined text too | `scan-broken` |
| T319-CR-1203 | an untracked path is the tree's own when a parent folds to a submodule and is not that directory (device and inode) | `dirty-tree`; with no such path, `ran` |
| T319-CR-1302 | after a failed fetch, refuse only when the commit is still absent. `--no-recurse-submodules` was applied too and is **unverified**: no reproduction had a submodule | `nothing held`; a fetch that brought nothing is still refused |
| T319-CR-1303 | 124 when the command ended by SIGKILL and the bound has passed | `pushed`; a SIGKILL inside the bound still answers `exit 137` |
| T319-CR-1304 | run the search from the top of the repository | `landed` |
| Escaped key | `normKey` decodes the escapes first | all three refused, naming the key |
| Marker edge | test the value before it is trimmed | BOM and tab refused; spaces at the ends still dropped; a CRLF file still read |

**One remedy failed on its first form.** For T319-CR-1304, `git -C "$(git rev-parse --show-toplevel)"
rev-list` passed the reproduction and turned one committed test red
(`a read that fails is never a landed tick`, T319-CR-902): its fake `git` recognises the call by its
first words. The form that passes both is a `cd` to the top inside the command substitution that
already holds the pipeline. With it, `tick-pr` is 25 of 25.

The other three suites passed with every remedy applied (226 of 227 in that run, the one failure being
the test above).

**What landed is wider than the table in two rows.** QA cycles 1 to 3 found more inputs of the same
class. For T319-CR-1201 the whole document is also searched when the criteria section is there and holds
no criterion shape (§ 5, Breaking Change 3). For the marker's edge the whole row is checked, its comment
included (§ 5, Breaking Change 2).

### Important Clarifications

- **T319-CR-1301 stays a limit.** Asking the forge for a merged PR would not settle it: the head that
  was merged holds the forge's own resolution commit, and with the branch deleted there may be no ref
  of it to compare with (Bitbucket: unverified). `landed` deletes the tick branch, so a guess is the
  worse answer. `resume` deletes nothing and leads to a second PR, which conflicts at its merge. That
  second PR was traced by task 319's QA, not run.
- **The marker.** Two answers were open: refuse the edge character, or document that it is dropped.
  This task refuses, because the reference already says so and the change is one identifier. Spaces at
  the ends stay dropped, and the reference says it. The owner can reverse this at review.
- **The watcher keeps `$OUT` here.** It removes the scratch file only when the script itself is gone
  (`push-held.sh:83`, *`[ "$SECONDS" -gt $((end + 5)) ] || rm -f "$OUT"`*). Past the bound it kills the
  group and leaves the file, so the question to the remote that follows a 124 has where to write.
- **The T319-CR-1201 remedy is this task's, not the gate's.** The gate proposed the reader's section
  together with the other criteria headings. That leaves the `## Rollback criteria` input at
  `none-named`, so the whole document is searched when the reader knows no heading.
- **`normKey` has no other caller.** `git grep -n normKey -- shared/resources ':!shared/resources/tests/*'`
  finds the near-miss checks of `ci`, `docsOnly`, `pipeline`, `finalise` and `rerunAtHead`, and nothing
  else.

---

## 4. Scope

### In Scope

✅ **Re-run engine**: T319-CR-1201, T319-CR-1202, T319-CR-1203
✅ **Push at a HALT**: T319-CR-1302, T319-CR-1303
✅ **Tick through a PR**: T319-CR-1304, and the limit of T319-CR-1301 in the documents
✅ **Configuration**: escaped block names (`ci`, `pipeline`, `finalise`), and the edge of `ci.skipMarker`
✅ **The records**: the reference, the CHANGELOG, and the Deferred Work entries of task 319

### Out of Scope

❌ **An escaped `developNext` key**: `statedMergeStrategy` reads no near miss at all, and what it does
not read states nothing, which turns the marker off. That is the safe answer.
❌ **The other two entries of gate 9's `recommendations.future`** (a scan example for a push-policy call
in prose, and a test for the watcher of a killed script): they are test ideas, not findings.
❌ **An emoji with a zero-width joiner as a marker**: refused by decision in task 319.
❌ **Escapes anywhere else in `skills-config.yaml`**: the YAML subset keeps them as text, by design.

---

## 5. Breaking Changes

### Breaking Change 1: an escaped block name is a usage error

**What Changed**: a top-level key that decodes to `ci`, `pipeline` or `finalise` is refused where it
was ignored. (An escaped key **under** one of them is refused today, as an unknown key.) After a block
scalar (`note: |`), at which the parse stops, every near miss of these names was ignored (`CI` too); it
is refused there as it is elsewhere. So is the key in any spelling, the exact one included, where the
parse does not read it: in a file indented whole, after a lone CR, or behind an anchor, a tag or the
`?` of an explicit key.

**Before**:

```yaml
"c\x69":            # ignored: the docs-only rule stays on
  docsOnly:
    enabled: false
```

**After**:

```
c\x69 looks like ci; the key is exactly "ci"
```

**Impact**: a project that wrote an escape in one of these names. None is known. The block was never
read, so nothing that worked stops working. A single-quoted `'c\x69'` is literal text in YAML and is
refused too: the parse does not keep the quote. No tracked YAML file in this repository parses
differently.

**Migration Path**: write the key plainly, at column 0, once.

### Breaking Change 2: a marker with a control or format character at its edge is a usage error

**What Changed**: a byte-order mark, a tab or another control or format character at the start or end
of a quoted `ci.skipMarker` is refused. So is a space that is not a plain one (a no-break space) at
either end of the value, quoted or not, and a control or format character anywhere on the key's row, its
comment included. A tab outside the quotes is still dropped.

**Before**: `skipMarker: "[skip ci]<TAB>"` was read as `[skip ci]`.

**After**: `ci.skipMarker must be one printable line of at most 80 characters, with nothing but plain
spaces at its ends`.

**Impact**: a project with such a character on that row. The reference already forbids it in the value,
and the key first shipped in `v0.69.0` (2026-11-25).

**Migration Path**: delete the character. Plain spaces at the ends need no change.

### Breaking Change 3: the re-run refuses more documents in which it can read no criterion

**What Changed**: in a document in which no criterion can be read, a command listed in
`finalise.rerunAtHead` is refused wherever it stands, when the document has no `Success Criteria` or
`Acceptance Criteria` section, or when neither such a section nor an AC heading holds a criterion shape:
a list item, a table row, a Given or When line with a Then line after it, or (under an AC heading) a
line of text.

**Before**: any heading with "criteria" in it narrowed the search to that section, so a command elsewhere
was `none-named`.

**After**: `scan-broken`, naming the command.

**Impact**: a project that lists commands, with such a document. Of this repository's 342 task and story
documents none changes its answer (§ 10).

**Migration Path**: write the criteria as a checklist or a numbered list.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.320.plan.task-319-leftover-findings.md](task.320.plan.task-319-leftover-findings.md)

### Phase 1: The re-run engine

**Risk Level**: Medium

**Files**:

- `shared/resources/finalise-rerun-at-head.js`
- `shared/resources/criteria-section.js`
- `shared/resources/tests/finalise-rerun-at-head.test.mjs`

**Changes**:

- [x] Write the failing cases of T319-CR-1201, 1202 and 1203, each with its control
- [x] Split the document on headings outside fences; search the whole document when the reader knows no heading
- [x] Take the joining loop out of `lazilyNamed`; apply `shows` to the joined text
- [x] Count an untracked path under a directory that folds to a submodule and is not it

**Dependencies**: none

---

### Phase 2: The push and the tick

**Risk Level**: Medium

**Files**:

- `shared/resources/push-held.sh`
- `shared/resources/tick-pr.sh`
- `shared/resources/tests/push-policy.test.mjs`
- `shared/resources/tests/tick-pr.test.mjs`

**Changes**:

- [x] Write the failing cases of T319-CR-1302, 1303 and 1304, each with its control
- [x] After a failed fetch, refuse only when the commit is still absent; fetch without submodules
- [x] Answer 124 for a SIGKILL past the bound
- [x] Search for the landing commit from the top of the repository
- [x] State T319-CR-1301 as a limit in `tick-pr.sh`'s header

**Dependencies**: none

---

### Phase 3: The configuration

**Risk Level**: Low

**Files**:

- `shared/resources/ci-tree-equivalence.js`
- `shared/resources/finalise-rerun-at-head.js`
- `shared/resources/tests/ci-tree-equivalence.test.mjs`
- `shared/resources/tests/push-policy.test.mjs`
- `shared/resources/tests/finalise-rerun-at-head.test.mjs`

**Changes**:

- [x] Write the failing cases: an escaped `ci`, `pipeline` and `finalise`, alone and beside a plain block
- [x] Write the case that holds `listKeyRows`' own use of the helper (green before and after, red when that use is reverted)
- [x] Decode the escapes in `normKey`, through one helper that `listKeyRows` uses too
- [x] Check `ci.skipMarker` before it is trimmed, with a spaces case and a CRLF case that stay accepted

**Dependencies**: Phase 1 (the same engine file)

---

### Phase 4: Records and bundle

**Risk Level**: Low

**Files**:

- `docs/reference/configuration.md`
- `skills/develop-next/SKILL.md`
- `skills/finalise/SKILL.md` (added in QA: the re-run's refusals in its table)
- `CHANGELOG.md`
- `docs/tasks/task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md`
- the generated copies under `skills/*/references/`

**Changes**:

- [x] Reference: the trimming of `ci.skipMarker`, the escaped-key refusal, and the T319-CR-1301 limit in the `developNext.tickVia` row
- [x] `develop-next`: the limit beside its `resume` and `landed` sentence
- [x] CHANGELOG `[Unreleased]`, citing `(task 320)`
- [x] Task 319 § Deferred Work: each entry names task 320 (a Change Log row with it)
- [x] `npm run bundle`, committed

**Dependencies**: Phases 1 to 3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/finalise-rerun-at-head.js` - T319-CR-1201, 1202, 1203; the shared escape helper
2. ✅ `shared/resources/criteria-section.js` - export `makeFenceTracker`
3. ✅ `shared/resources/push-held.sh` - T319-CR-1302, 1303
4. ✅ `shared/resources/tick-pr.sh` - T319-CR-1304; the limit in its header
5. ✅ `shared/resources/ci-tree-equivalence.js` - escaped keys; the marker's edge

### Files to Modify (Tests)

6. ✅ `shared/resources/tests/finalise-rerun-at-head.test.mjs`
7. ✅ `shared/resources/tests/push-policy.test.mjs`
8. ✅ `shared/resources/tests/tick-pr.test.mjs`
9. ✅ `shared/resources/tests/ci-tree-equivalence.test.mjs`

### Files to Modify (Documentation)

10. ✅ `docs/reference/configuration.md`
11. ✅ `skills/develop-next/SKILL.md`
12. ✅ `CHANGELOG.md`
13. ✅ `docs/tasks/task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md`
14. ✅ `skills/finalise/SKILL.md`

### Generated

15. ✅ the copies of files 1 to 5 under `skills/*/references/`, listed by
    `git ls-files 'skills/*/references/<name>'` (measured 2026-11-25: 1, 6, 3, 2 and 6)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each finding, through the real CLI or script and a real temporary repository, in the suite
that already holds its neighbours.

**Actions**:

- [x] Each case of § 3's first table, and its control, as a test
- [x] T319-CR-1203 on a disk that folds names: the same directory under two spellings is not a second one (the fake-`git` fixture of T319-CR-1002 stands in for that disk)
- [x] T319-CR-1303 both ways: a SIGKILL past the bound, and one inside it
- [x] T319-CR-1302 both ways: a failed fetch that brought the commit, and one that did not
- [x] An escaped list key under another block (`notes:` holding `"rerun\x41tHead":`) is still refused. Once `normKey` decodes, it refuses every other escaped case before `listKeyRows` is reached, so this input alone holds that half of the shared helper (review 1, I-1)
- [x] Every temporary directory is removed in `t.after`

**Command**: `command node --test shared/resources/tests/finalise-rerun-at-head.test.mjs shared/resources/tests/tick-pr.test.mjs shared/resources/tests/push-policy.test.mjs shared/resources/tests/ci-tree-equivalence.test.mjs`

**Mutations**: revert each remedy alone. Each must turn at least one named test red. For T319-CR-1302
the check that the commit is present and `--no-recurse-submodules` are two layers: a test with a
submodule whose fetch fails must go red when only the second is removed, or the second is left out.
The escape helper has two uses, `normKey` and `listKeyRows`: revert the decoding in each alone.

### Consumer Tests

**Scope**: `npm run test:remote` on the LAN server, which runs `ci:fast`; then the suite under
`CI=true`. `ci:fast` runs neither linter of the merge gate (`npm run ci`), and this task edits two
shell scripts: run `npm run lint:shell` and `npm run lint:secrets` too.

### Performance Tests

None. T319-CR-1203 adds one lookup per untracked path.

---

## 9. Success Criteria

### Functional

- [ ] A document with no criterion the reader can find is refused when it names a listed command past a fenced `## ` line, or beside a heading that only contains "criteria" (T319-CR-1201)
  Amendment: a comment opener inside an HTML block that hides the fenced line (T320-CR-601, bug 5) is moved to task.326 and is not graded here — approved by Lorien Gamaroff (2026-11-26)
- [ ] A listed command that one criterion hides behind both a stray backtick and an unindented line is refused (T319-CR-1202)
- [ ] An untracked file in a directory that differs from a submodule's only in case answers `dirty-tree` under `core.ignorecase=true` on a disk that does not fold names (T319-CR-1203)
- [ ] `push-held.sh` refuses "could not be fetched" only when the commit is not here after the fetch (T319-CR-1302)
- [ ] `push-held.sh`, stopped past its bound, answers `pushed` when the remote has HEAD; a push killed inside its bound is still reported as failed (T319-CR-1303)
- [ ] `tick-pr.sh start` gives the same answer from a subdirectory as from the top (T319-CR-1304)
- [ ] The limit of T319-CR-1301 is stated in `tick-pr.sh`, `skills/develop-next/SKILL.md` and `docs/reference/configuration.md`
- [ ] An escaped spelling of the top-level key `ci`, `pipeline` or `finalise` is refused, alone and beside the plain key
- [ ] `ci.skipMarker` with a control or format character at its edge is refused; spaces at its ends and a CRLF file are still accepted

### Performance

- [ ] The four suites gain no test that waits longer than 30 s (the SIGSTOP case needs about 15), read from their per-test durations, measured on the PR's head commit with `uptime` beside them, in the QA report

### Code Quality

- [ ] Every new test was red before its change; the red runs are recorded in the QA report
- [ ] Reverting any one remedy turns a named test red; the mutation table is in the QA report
- [ ] `npm test` passes under `CI=true`, and `npm run bundle` leaves no diff
- [ ] `npm run validate -- skills/develop-next/` passes

### Migration

- [ ] CHANGELOG `[Unreleased]` cites `(task 320)` and names the two new refusals
- [ ] The configuration reference says what `ci.skipMarker` drops and what it refuses
- [ ] Each Deferred Work entry of task 319 names task 320

---

## 10. Risk Assessment

### High Risk Areas

None. No remedy deletes, overwrites or pushes anything that is not pushed today.

### Medium Risk Areas

**1. The whole-document search refuses more documents**

- **Risk**: a work item in which no criterion can be read, and a listed command in prose, is now refused where a `… criteria` heading used to narrow the search: one with no criteria section, and one whose criteria section and AC headings hold no criterion shape (§ 5, Breaking Change 3).
- **Probability**: Low. Work items carry `Success Criteria` or `Acceptance Criteria`.
- **Impact**: Minor. The refusal is loud and names the command.
- **Mitigation**: measured 2026-11-25 over the tracked documents under `docs/` whose file name equals their directory's and starts `task.` or `story.` (337): `readCriteriaEntries` returns `null` for none of them, so no answer here changes. Repeat it at QA and put the count in the QA report. (Done in QA report 4: 342 documents, `null` for none, an empty list for one, whose answer is the same as on `develop`.)
- **Rollback**: revert Phase 1's first change.

**2. A SIGKILL that was not the watcher's is read as a timeout**

- **Risk**: a push killed from outside just past its bound takes the path that asks the remote again.
- **Probability**: Low.
- **Impact**: Minor. Asking the remote is the true answer in that case too.
- **Mitigation**: only status 137 and only past the bound.

### Low Risk Areas

**1. An escaped key in a consumer's file**

- **Risk**: a configuration that was accepted is refused.
- **Probability**: Low.
- **Impact**: Minor. The message names the key.
- **Mitigation**: CHANGELOG entry.

**2. `cd` to an empty path**

- **Risk**: outside a work tree `--show-toplevel` prints nothing. bash 5.3 refuses `cd ""`; older versions stay where they are.
- **Impact**: none. Both lead to `resume` or to today's behaviour.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:

- `/finalise` refuses a work item that passed before, with a criterion the reader can find
- a HALT prints `pushed` when the remote does not have HEAD

**Steps**:

1. Revert the PR's merge commit on `develop`
2. `npm run bundle`, and confirm it leaves no diff
3. Reopen the Deferred Work entries of task 319

**Verification**: the four suites pass at the reverted head.

### Partial Rollback (1-2 hours)

**When to Use**: one phase misbehaves. Phases 1, 2 and 3 revert alone; Phase 3 shares one helper with
Phase 1's file and is reverted first.

### Forward Fix (< 4 hours)

**When to Use**: a message that reads wrong, or a document that states a limit badly.

### Rollback Triggers

**Critical (Immediate Rollback)**: a tick branch deleted that had not landed.

**Non-Critical (Forward Fix)**: a refusal whose message does not name the cause.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-26
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.320.qa.7.task-319-leftover-findings.md](./task.320.qa.7.task-319-leftover-findings.md)
- **Gate File**: [task.320.gate.7.task-319-leftover-findings.yml](./task.320.gate.7.task-319-leftover-findings.yml)

### Test Coverage Summary

- **Tests Executed**: 8898
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Cycle 7 (re-entry after DoD run 2): the `finalise.deferralApprover` key is accepted by every strict reader and the suite is green. The residual T320-CR-601/602/603 still reproduces and is deferred to task.326 by the owner; nothing is open in the queue.

## Definition of Done - Gaps Identified — run 1 (historical, superseded)

**Status:** IN PROGRESS (superseded by run 2 below)

### QA Gate Status

**QA Report**: `task.320.qa.4.task-319-leftover-findings.md`
**Gate File**: `task.320.gate.4.task-319-leftover-findings.yml`
**Gate Status**: PASS (100/100)

### Missing Criteria:

1. **Security Review** (probes run on the PR head, `task.320.dod.1.security.run.json`):
   - [ ] An escaped `ci`, `pipeline` or `finalise` key after a block scalar (`note: |`) is accepted and its block dropped. Criterion 8 and breaking change 1 say it is refused. Three probes medium, one low; the same on `origin/develop`
   - [ ] A fence marker inside a closed HTML comment makes a legitimate document `scan-broken` (low, fails closed; `origin/develop` answers `none-named`)

2. **Acceptance Criteria:**
   - [ ] Criterion 10: the QA report records one measured run; the bound is graded on the median of five, each with its load (low; every reading meets the bound)

### Next Steps:

- [ ] Read near-miss keys from the source's top-level rows, as `ciBlockRows` does, and not from the parse
- [ ] Make the fence split ignore a fence marker inside a comment
- [ ] Record five timed runs, each with its load, in the next QA report

**Estimated Effort:** Small (1-2 hours, a QA cycle included)

**Gap Report Generated:** 2026-11-25

**Detailed Verification Log:** See `task.320.dod.1.task-319-leftover-findings.md`.

## Definition of Done - Gaps Identified — run 2 (historical, superseded)

**Status:** IN PROGRESS

### QA Gate Status

**QA Report**: `task.320.qa.6.task-319-leftover-findings.md`
**Gate File**: `task.320.gate.6.task-319-leftover-findings.yml`
**Gate Status**: WAIVED (90/100). The residual (T320-CR-601, 602, 603) was accepted by the owner at the loop-limit escalation on 2026-11-26.

### Missing Criteria:

1. **Acceptance Criteria:**
   - [ ] Criterion 1 (high): T320-CR-601 (bug 5) is inside the criterion's wording. An HTML block before a column-0 `<!--` hides a fenced `## ` line, and the head answers `none-named` where the criterion requires a refusal. The gate waiver does not amend the criterion.
   - [ ] Criterion 10 (low): the command that produced the per-test timings in QA report 6 is not named.

2. **Security Review** (`task.320.dod.2.security.run.json`, 194 probes executed):
   - [ ] 8 probes reproduce the waived residual: T320-CR-601 (2), T320-CR-602 (4) and T320-CR-603 (2). They are not deferred, because no `deferrals.json` names them.

### Next Steps:

- [ ] Owner decision on criterion 1: fix T320-CR-601 in code (re-enters QA at 5a), or amend criterion 1 to move the HTML-block case to a named follow-up task (document-only, resumes at Step 7)
- [ ] If the residual is deferred, write `deferrals.json` beside this task, naming that follow-up task, and have the owner approve it
- [ ] Name the four-suite timing command beside the table in QA report 6

**Estimated Effort:** Small if the residual is deferred (documents only); Medium if T320-CR-601 is fixed (a QA cycle included)

**Gap Report Generated:** 2026-11-26

**Detailed Verification Log:** See `task.320.dod.2.task-319-leftover-findings.md`.

## Definition of Done - Gaps Identified — run 3 (historical, superseded)

**Status:** IN PROGRESS

### QA Gate Status

**QA Report**: `task.320.qa.7.task-319-leftover-findings.md`
**Gate File**: `task.320.gate.7.task-319-leftover-findings.yml`
**Gate Status**: CONCERNS (90/100). `top_issues` is empty, and the residual T320-CR-601/602/603 is deferred to task.326.

### Missing Criteria:

1. **Acceptance Criteria:**
   - [ ] Criterion 10 (low): the per-test timings in QA report 6 were measured at `7cae65a14`, which is not tree-equivalent to the head (`skills-config.yaml` changed in `7f22f93d2`). The figures met the bound, but they must be re-measured.

### Next Steps:

- [ ] Run the four suites five times, one after another, at the current head. Record `uptime` and the full command loop, and take the per-test seconds from TAP `duration_ms`
- [ ] Record the result in QA report 7, and correct its "#10 PASS because no engine changed" line

**Estimated Effort:** Small (document-only; about 10 minutes of timing runs)

**Gap Report Generated:** 2026-11-26

**Detailed Verification Log:** See `task.320.dod.3.task-319-leftover-findings.md`.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.320.qa.7.task-319-leftover-findings.md`
**Gate File**: `task.320.gate.7.task-319-leftover-findings.yml`
**Gate Status**: ⚠️ CONCERNS (90/100). `top_issues` is empty, and the residual T320-CR-601/602/603 is deferred to task.326 with the owner's approval.

All Definition of Done criteria have been verified:

✅ **Acceptance Criteria:** 17 of 17. Criterion 1 passes under its approved amendment, and criterion 10 was re-measured at a head tree-equivalent to the acceptance head (slowest test median 25.5 s, max 26.0 s, against a 30 s bound)
✅ **PR Review & Tests:** PR #949. 5c PR review 3 APPROVE. CI reading 1 SUCCESS at `aa1c04f98` over 6 checks
✅ **Documentation:** CHANGELOG cites (task 320). The configuration reference and the develop-next and finalise SKILL.md files are updated
✅ **Security Review:** PASS. 194 probes executed, 0 escaped, and all 8 reproductions (6 case ids) are deferred to task.326 through `deferrals.json`
✅ **Compliance Review:** not applicable (internal tooling, no personal, payment, UI or health data)

**Task marked as ACCEPTED on:** 2026-11-26

**Detailed Verification Log:** See `task.320.dod.4.task-319-leftover-findings.md` for complete verification evidence and timestamps.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-25 | 1.0     | Initial draft | create-task |
| 2026-11-25 | 1.1     | Review passed (9/10) — added the test that holds `listKeyRows`' decoding, the two merge-gate linters and where the durations are measured | review-task |
| 2026-11-25 |         | Status → ready-for-development | review-task |
| 2026-11-25 |  | Implemented — 31 files, 5 tests added and 6 extended | develop |
| 2026-11-25 |  | QA gate CONCERNS (90/100) — 5 findings | qa-task |
| 2026-11-25 |  | QA findings fixed — cycle 1, 5 findings | qa-fix |
| 2026-11-25 |  | QA gate CONCERNS (90/100) — 6 findings | qa-task |
| 2026-11-25 |  | QA findings fixed — cycle 2, 6 findings | qa-fix |
| 2026-11-25 |  | QA gate CONCERNS (90/100) — 6 findings | qa-task |
| 2026-11-25 |  | QA findings fixed — cycle 3, 6 findings | qa-fix |
| 2026-11-25 |  | QA gate PASS (100/100) — 4 findings | qa-task |
| 2026-11-25 |  | PR review CONCERNS — 5 document findings fixed (breaking changes, risk 1, file lists, notes, the QA report's population count) | review-pr |
| 2026-11-25 |  | DoD incomplete — 3 gaps identified | finalise |
| 2026-11-25 |  | DoD gaps 1 and 2 fixed — near-miss keys read from the source, fence markers in comments | qa-fix |
| 2026-11-25 |  | QA gate CONCERNS (90/100) — 4 findings | qa-task |
| 2026-11-25 |  | QA cycle 5 fixes — T320-CR-501 to 504 | qa-fix |
| 2026-11-25 |  | QA gate CONCERNS (90/100) — 3 findings | qa-task |
| 2026-11-26 |  | QA residual accepted at the loop-limit escalation — gate 6 WAIVED | Lorien Gamaroff |
| 2026-11-26 |  | PR review CONCERNS — 5 trail and consistency findings fixed (bugs 3–5, pr_number, updated) | review-pr |
| 2026-11-26 |  | DoD incomplete — 3 gaps identified (criterion 1 against the waived T320-CR-601, criterion 10, security residual) | finalise |
| 2026-11-26 | 1.2 | Criterion 1 amended: T320-CR-601 moved to task.326 (approved by the owner); residual T320-CR-601/602/603 to be closed there | Lorien Gamaroff |
| 2026-11-26 |  | QA gate CONCERNS (90/100) — 0 open findings; residual deferred to task.326 | qa-task |
| 2026-11-26 |  | DoD incomplete — 1 gap identified (criterion 10 timings measured off a tree-equivalent head) | finalise |
| 2026-11-26 | 1.3 | DoD passed — accepted (PR #949) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The re-run engine

- [x] Failing cases
- [x] T319-CR-1201
- [x] T319-CR-1202
- [x] T319-CR-1203

### Phase 2: The push and the tick

- [x] Failing cases
- [x] T319-CR-1302
- [x] T319-CR-1303
- [x] T319-CR-1304
- [x] T319-CR-1301 stated

### Phase 3: The configuration

- [x] Failing cases
- [x] Escaped keys
- [x] Marker edge

### Phase 4: Records and bundle

- [x] Documents
- [x] CHANGELOG
- [x] Task 319 entries
- [x] Bundle

---

## Implementation Summary

**Completion Date**: 2026-11-25

**Approach**: each remedy as the plan gives it, tests first. The eight with a remedy were red before
their change, each for its stated reason; T319-CR-1301 is a stated limit. Two decisions the plan left open:

- **T319-CR-1302, `--no-recurse-submodules` is kept.** It was unverified in the trial. A populated
  submodule whose pointer the fetched commit moves is asked by a plain fetch (the control) and not by
  `push-held.sh`; removing the flag alone turns that test red.
- **T319-CR-1301's advice names the remote branch too.** `open` has pushed it by the time the second PR
  exists.

Beyond the plan: the `finalise.rerunAtHead` row of the configuration reference says what the
whole-document search refuses and that an escaped `finalise` is refused.

**Testing Results**: `ci:fast` on the LAN server, 8895 tests, 8892 pass, 0 fail, 3 skipped; 232 of them
are the four suites (227 before). ShellCheck, gitleaks and `bundle:check` clean. Mutations, each in a scratch
copy of the tree, each remedy reverted alone: 20 of 21 red. The green one,
`sub === d` in `besideSub`, is a shortcut: the same directory has the same inode, so the answer does not
change. Population of § 10's first risk, measured again: 342 documents, `readCriteriaEntries` is `null`
for none.

**Red before the change**: the test of each finding. Within a test the first failing case ends the run,
so T319-CR-1202's and the later cases were seen red through their own mutation. The controls were green
before, as controls are: among them `a second spelling of a submodule's directory is the submodule`
(red when the inode comparison is removed) and the escaped list key (red when `listKeyRows` stops
decoding).

## Deferred Work

- **T320-CR-401** (LOW) — carried to gate 4 `recommendations.future` (route 2b, cycle 4): prose paragraphs that start with Given or When and with Then count as criteria
- **T320-CR-402** (LOW) — carried to gate 4 `recommendations.future` (route 2b, cycle 4): with a quote that has no partner, the row check and the parse of `ci.skipMarker` disagree on where the comment starts
- **T320-CR-403** (LOW) — carried to gate 4 `recommendations.future` (route 2b, cycle 4): the reference says an AC heading places the criteria of a document with neither criteria section; it is always searched whole
- **T320-CR-404** (LOW) — carried to gate 4 `recommendations.future` (route 2b, cycle 4): an unclosed comment opener in an indented code block removes the criteria after it, and the document is refused

---

## References

- [Task 319](../task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md) § Deferred Work
- [Task 319 gate 9](../task.319.ci-runs-only-where-needed/task.319.gate.9.ci-runs-only-where-needed.yml), `recommendations.future`
- [Task 319 QA report 7](../task.319.ci-runs-only-where-needed/task.319.qa.7.ci-runs-only-where-needed.md), where the seven were reproduced
- [Task 319 DoD run 2](../task.319.ci-runs-only-where-needed/task.319.dod.2.ci-runs-only-where-needed.md), the two open points
- [Configuration reference](../../reference/configuration.md)

---

## Notes

**One task, not four.** The nine are separate fixes, but they share test files and one review, and
none is worth a pipeline run of its own.

**The trial is not the implementation.** It was made in a scratch clone outside the repository, and
none of it was committed. When this document was written nothing in `shared/resources/` had been changed and no test had been written.

QA will create, beside this document: the QA report, bug reports if any, and the quality gate.
