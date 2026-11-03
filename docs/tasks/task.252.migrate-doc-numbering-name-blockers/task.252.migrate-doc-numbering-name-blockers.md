---
id: task.252
title: "migrate-doc-numbering: name every document it cannot classify"
type: task
description: "Make migrate-doc-numbering.mjs raise a named blocker, in dry-run and --check, for every document under the PRD root it would otherwise skip silently, and print a classified/skipped count."
tags: [migrate-doc-numbering, doc-id, blockers]
category: refactoring
status: ready-for-review
pr_number: 817
priority: High
created: 2026-11-03
updated: 2026-11-03
estimated_effort_hours: 8
---

# migrate-doc-numbering: name every document it cannot classify

**Status:** Ready for Review

---

## 1. Overview

`shared/resources/migrate-doc-numbering.mjs` skips any epic directory, story directory or file whose name the id grammar rejects, and says nothing. This task makes each such document a named blocker (path plus reason) raised by the dry run and by `--check`, before `--apply` writes anything, and adds a `N classified, M skipped` line to the plan output.

**Scope**: the discovery stage and the verify stage of the one script, its test file, and the docs that list its blocker codes. Source: the tinker-city handoff of 2026-11-03 (gap 1), written from memory and reproduced here before this task was cut.

---

## 2. Motivation

### Current Problems

Reproduced 2026-11-03 on a throwaway git repo built by `make-fixture.sh` (cases copied into this task's test). The fixture holds a dotted-slug epic, a `-1` sub-story, a lowercase sub-story and a stray misnamed file.

1. **The dry run and `--check` are silent.** `command node shared/resources/migrate-doc-numbering.mjs --root docs/prd` printed `1 PRD, 1 epic(s), 1 story(ies)` and listed none of the four bad documents.
2. **`--apply` then moves them half-way.** The PRD directory was renamed to `prd.1.onb/`, and the three bad-name documents were carried into it unrenamed (`epic.2.discovery-2.0-thing`, `story.1.2-1.dash`, `story.1.3a.lower`). The tool ended `post-check-failed` with three `bad-shape` findings, and the tree was left mixed.
3. **The stray file is never mentioned.** `feature-exploration-2026-07-11.md` stayed outside the new PRD directory, and the corpus check passed over it.
4. **A green result is not complete.** In tinker-city the author could only find the skips by comparing story directories on disk with the plan's count.

### Benefits of the fix

1. A bad name is reported by the run that would have mishandled it, with its path and the rule it broke.
2. `--apply` cannot start on a tree that contains one.
3. The `classified/skipped` line gives an author a number to compare, instead of a diff to eyeball.
4. The fix is held by a fixture test, so it cannot regress silently.

---

## 3. Technical Background

### Current Architecture

- `discover()` (`shared/resources/migrate-doc-numbering.mjs:357`) classifies each name through `classify()` (`:211`), which calls `docId.parse` then `docId.parseLegacy`.
- Epic directories are taken only when `classify` succeeds and the kind is `epic` (`:441`: `if (!c || c.kind !== "epic" || c.artifact) continue;`). Story directories likewise (`:459`). A rejected name falls through the `continue` and is never recorded.
- `discover()` returns `{ root, files, dirs, prds, epics, stories, unreadable }` (`:474`). There is no `unclassified` member, so `verify()` (`:1474`) has nothing to report.
- Blocker codes are a closed list (`:60` header comment, the array near `:95`). An unknown code is not accepted by the renderer.
- The grammar in `doc-id.js` takes one uppercase letter as a sub-story suffix and rejects a dot in a slug. Both facts were seen in the fixture run above (`bad-number`).

### Target Architecture

- `discover()` records, in a new `unclassified` list, every directory directly under an `epics/` or `stories/` directory, and every file in a PRD directory, that is neither classified nor a recognised non-document. Each entry carries `path` and `reason`.
- Each entry becomes a blocker `unclassified-document` (path plus reason, and the nearest valid spelling when one is obvious, such as `4.1.1A` for `4.1.1a`). **It is raised from `plan()`'s `planned.blockers`, not from `verify()`**: the run function (`migrate-doc-numbering.mjs`, the `planned.fileMap.size === 0 && !planned.blockers.length` branch, about `:2085`) returns `already` or `post-check-failed` *before* `verify()` is called, so a blocker raised only in `verify()` would never fire on a tree whose only defect is a bad name. That is the tree this task most needs to catch.
- The plan output prints `N documents classified, M skipped`, where `N` = `counts.prds + counts.epics + counts.stories` (the existing `counts` object) and `M` = `unclassified.length`. Both are added to `--json` beside `counts`.
- A name that is genuinely not a document (README, index, sprint-review summary, artifacts) is recognised by a short allowlist, so a clean corpus produces `M = 0`. **The allowlist covers directories as well as files** (for example an `assets/` directory or a dot-directory under `epics/`), because the directory-position rule would otherwise flag them.

### Important Clarifications

- Whether a stray file is a blocker was left to the maintainer by the handoff. **Decision recorded here:** a directory in an epic or story position is always a blocker, because its position says it is a document. A loose file is a blocker unless the allowlist names it. Phase 1 measures this on the repository's own `docs/prd` tree and on the fixture, and the allowlist is whatever makes the real tree read `M = 0`. **Exceptions found in QA and the PR review (recorded 2026-11-03):** a PRD directory that holds an `index.md` is a sharded PRD (`/shard-prd` writes its section files there), and so is an L3 PRD, so loose files in them are not checked. The trade-off is that a stray file beside an `index.md` is silent. Directories named `assets`, or starting with a dot or an underscore, are not documents.
- Renaming the offending documents stays the author's job. This task does not rewrite names.

---

## 4. Scope

### In Scope

✅ **Discovery**: record unclassified directories and files.
✅ **Verify**: the new blocker code, in dry-run, `--check` and `--apply`.
✅ **Output**: the `classified/skipped` line, in text and `--json`.
✅ **Tests**: the fixture cases from the handoff.

### Out of Scope

❌ Automatic renaming of bad names.
❌ Link re-pointing, frontmatter checks, the registry stub and downstream-script warnings (task 253).
❌ Changing the id grammar in `doc-id.js`.

---

## 5. Breaking Changes

**What Changed**: a tree that migrated before, with unclassifiable names silently left behind, now answers `blocked` (exit 1) until those names are fixed.

**Before**: `dry-run` exit 0 and `--check` `already`, with the bad documents ignored.

**After**: `blocked` or `needs-migration`, naming each document. `--json` gains an `unclassified` array and a `classified`/`skipped` pair of counts.

**Impact**: a consumer that ran this tool in CI and relied on exit 0 must fix its names. That is the intended change.

**Migration Path**: rename each named document to a valid spelling (`discovery-2-0-…`, `4.1.1A`) and re-run. The blocker text names the path and the rule.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.252.plan.migrate-doc-numbering-name-blockers.md](task.252.plan.migrate-doc-numbering-name-blockers.md)

### Phase 1: Measure and write the failing fixture test

**Risk Level**: Low

**Files**:
- `shared/resources/tests/migrate-doc-numbering.test.mjs`

**Changes**:
- [ ] Add a real-git-repo test with the fixture's four bad documents. It asserts the dry run, `--check` and `--apply` each name all four, and that `--apply` writes nothing.
- [ ] Add a control for the branch that matters most: a tree migrated in every other respect (nothing left to move) with one bad name must answer `blocked`, not `already` or `post-check-failed`.
- [ ] Measure the false-positive risk before code lands, without the new blocker (it does not exist yet): walk this repository's `docs/prd` with a throwaway read-only script that applies `docId.parse` / `parseLegacy` to every directory under an `epics/` or `stories/` directory and every loose file in a PRD directory, and record the command and the list of unclassified names in the plan file. The allowlist is built from that list. After Phase 3, re-run the real tool for the `0 skipped` criterion.
- [ ] Record the baseline for the walk-count criterion now: the length of `calls.readDir` on the clean fixture (`memIo`), as a number in the plan file.

**Dependencies**: none.

---

### Phase 2: Record the unclassified set in discovery

**Risk Level**: Medium

**Files**:
- `shared/resources/migrate-doc-numbering.mjs`

**Changes**:
- [ ] Add `unclassified` to the `discover()` result, filled at the two `continue` sites and for loose files in PRD directories.
- [ ] Add the allowlist of recognised non-documents (files and directories), with a reason beside each entry.
- [ ] Sweep the existing test file for fixtures that hold a loose file or an odd directory the new rule would flag (`git grep -n` the fixture names in `shared/resources/tests/migrate-doc-numbering.test.mjs`, for example the `README.md`, `index.md` and `goals.md` entries) and list each as a test to update or an allowlist entry. A fixture that flips from exit 0 to `blocked` fails with a message about the exit code, not about the new rule.

**Dependencies**: Phase 1.

---

### Phase 3: Raise the blocker and print the count

**Risk Level**: Medium

**Files**:
- `shared/resources/migrate-doc-numbering.mjs`

**Changes**:
- [ ] Add `unclassified-document` to the blocker-code list and the header comment.
- [ ] Emit one blocker per entry into `planned.blockers` (in `plan()`), so it is present on the early `already` / `post-check-failed` branch as well as on the `verify()` path. Include the suggested spelling where the name is a lowercase or dashed sub-story suffix.
- [ ] Print `N documents classified, M skipped` in the text and `--json` output (definitions in section 3).
- [ ] Held by the Phase 1 control test: a tree with nothing left to move and one bad name answers `blocked`, never `already`.

**Dependencies**: Phase 2.

---

### Phase 4: Mutation proof and docs

**Risk Level**: Low

**Files**:
- `skills/review-prd/SKILL.md` (lists the blocker codes at about line 464; the generated copy `skills/review-prd/references/migrate-doc-numbering.mjs` changes through `npm run bundle`)
- `CHANGELOG.md`

**Changes**:
- [ ] Revert the `plan()` blocker emission and confirm the Phase 1 test goes red. Revert the `discover()` recording and confirm it goes red again. Restore both.
- [ ] Update the docs that list blocker codes. Find them with `grep -rln "displaced-frontmatter" docs shared skills CHANGELOG.md`, ignoring `docs/tasks/` history and the roadmap's history rows; as measured on 2026-11-03 that leaves `skills/review-prd/SKILL.md`, `CHANGELOG.md` and the script header. `docs/standards/file-naming.md` and `docs/contributing/traps.md` do not list the codes and are not edited.
- [ ] Run `npm run bundle` and `npm test`.

**Dependencies**: Phase 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/migrate-doc-numbering.mjs` — discovery, verify, output.

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/migrate-doc-numbering.test.mjs` — the fixture cases and the mutation checks.

### Files to Modify (Documentation)

3. ✅ `skills/review-prd/SKILL.md` (blocker-code list) and the script header comment (command in Phase 4).
4. ✅ `CHANGELOG.md`.

Generated copies of the script under `skills/*/references/` change through `npm run bundle`, not by hand. Find them with `git ls-files | grep migrate-doc-numbering`.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `discover()` and `verify()` over the in-memory io the test file already provides (`memIo`).

**Actions**:
- [ ] A dotted-slug epic, a `-1` story, a lowercase story and a stray file each yield one `unclassified` entry.
- [ ] A clean tree yields none, and `M = 0`.

**Command**: `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`

### Integration Tests

**Scope**: a real temporary git repo, as `gitRepo()` in the same test file builds.

**Actions**:
- [ ] Dry run, `--check` and `--apply` all report the four documents. `--apply` leaves `git status` clean.
- [ ] After the four names are fixed, the same repo migrates and a second run answers `already`.

### Control case

The fixture is the incident, so a pass could mean the tool recognised it. Add one bad name the issue text never mentions (an uppercase-then-lowercase suffix, `4.1.1Ab`) and one valid name it must leave alone (`4.1.1A`).

---

## 9. Success Criteria

### Functional

- [ ] On the fixture repo, the dry run and `--check` each name all four bad documents and exit 1.
- [ ] `--apply` on that repo exits 1 and changes no file.
- [ ] After the names are fixed, `--apply` succeeds and `--check` answers `already`.
- [ ] The `--json` output carries `classified` and `skipped` counts.

### Performance

- [ ] The discovery walk is not repeated: a planned unit test asserts `calls.readDir.length` on the clean `memIo` fixture equals the baseline recorded in Phase 1 (the array holds one path per directory read, so compare its length).

### Code Quality

- [ ] `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs` passes.
- [ ] `npm test` and `npm run bundle:check` pass.
- [ ] Reverting Phase 3's emission turns the new test red (recorded in the QA report).

### Migration

- [ ] `CHANGELOG.md` records the new blocker and the exit-code change.
- [ ] Running the tool over this repository's own `docs/prd` reports `0 skipped` (command and result in the QA report).

---

## 10. Risk Assessment

### High Risk Areas

**1. False positives on a real tree**
- **Risk**: a legitimate file the allowlist misses becomes a blocker and stops a migration that was fine.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: Phase 1 runs the tool on this repository's `docs/prd` and on the fixture's clean variant before any code lands. The allowlist is built from that measurement.
- **Rollback**: revert the commit. The tool returns to silent skipping.

### Medium Risk Areas

**1. Wording of the reason**
- **Risk**: a reason that does not say how to fix the name.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: the suggested spelling for the two suffix cases, asserted in the test.
- **Rollback**: none needed; wording only.

### Low Risk Areas

**1. Docs lag**
- **Risk**: a doc lists the blocker codes and misses the new one.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the Phase 4 grep.
- **Rollback**: none needed.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- The tool blocks a tree that has no real bad name.

**Steps**:
1. `git revert` the merge commit.
2. `npm run bundle` to restore the generated copies.

**Verification**: `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs` passes on the reverted tree.

---

### Partial Rollback (1-2 hours)

**When to Use**: only the stray-file rule is wrong.

**Steps**:
1. Keep the directory-position blockers. Drop the loose-file rule and its test.

---

### Forward Fix (< 4 hours)

**When to Use**: a missing allowlist entry.

**Approach**: add the entry with its reason and a test line.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- A false positive on a tree that the previous version migrated correctly.

**Non-Critical (Forward Fix)**:
- Reason wording, a missing allowlist entry.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-03
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.252.qa.3.migrate-doc-numbering-name-blockers.md](./task.252.qa.3.migrate-doc-numbering-name-blockers.md)
- **Gate File**: [task.252.gate.3.migrate-doc-numbering-name-blockers.yml](./task.252.gate.3.migrate-doc-numbering-name-blockers.yml)

### Test Coverage Summary
- **Tests Executed**: 91
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
The PR-review finding PC-2 (directory allowlist) is fixed and held by a test. No new findings.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-03 | 1.0     | Initial draft | create-task |
| 2026-11-03 | 1.1     | Review passed (8/10) — blocker moved from verify() to plan() so the early `already` branch cannot bypass it; Phase 1 measurement reordered; Phase 4 doc list corrected; allowlist covers directories; walk-count criterion names its test | review-task |
| 2026-11-03 |         | Status → ready-for-development | review-task |
| 2026-11-03 |         | Implemented — 5 files, 7 new tests (89 pass) | develop |
| 2026-11-03 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-11-03 |         | QA findings fixed — cycle 1, 1 finding | qa-fix |
| 2026-11-03 |         | QA gate PASS (100/100) — 0 findings | qa-task |
| 2026-11-03 |         | QA findings fixed — cycle 2, 3 findings (PR review) | qa-fix |
| 2026-11-03 |         | QA gate PASS (100/100) — 0 findings | qa-task |

<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: fixture test and measurement
- [x] Phase 2: discovery records the unclassified set
- [x] Phase 3: blocker and count
- [x] Phase 4: mutation proof and docs (mutation results go in the QA report)

QA artifacts will land beside this file: `task.252.qa.[n].…md`, `task.252.bug.[n].…md`, `task.252.gate.[n].…yml`.

## References

- Handoff: tinker-city session of 2026-11-03, `handoff-migrate-doc-numbering-gaps.md` (gap 1). Not committed; the findings are restated above.
- Fixture builder used for the reproduction: `make-fixture.sh` in the 2026-11-03 session scratchpad. Its cases are copied into the Phase 1 test.
- Sibling: task 253 (the remaining handoff gaps). Independent of this task in outcome.
