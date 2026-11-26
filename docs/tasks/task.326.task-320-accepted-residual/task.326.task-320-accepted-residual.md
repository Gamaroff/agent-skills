---
id: task.326
title: "Task 320's accepted residual is closed"
type: task
description: "Close the three findings the owner accepted at task 320's QA loop limit: a comment opener inside an HTML block that hides a fenced heading, an exact ci or pipeline key behind `?` or an alias that reads as the defaults, and a closed comment holding a fence marker that is refused."
tags: [finalise, ci, skills-config]
category: refactoring
status: planned
priority: Low
risk_level: low
created: 2026-11-26
updated: 2026-11-26
estimated_effort_hours: 4
---

# Technical Task: Task 320's accepted residual is closed

**Status:** Planned

---

## 1. Overview

Task 320 reached its QA loop limit with three findings open. The owner accepted them on 2026-11-26
(`task.320.gate.6.task-319-leftover-findings.yml`, `WAIVED`) and moved them here. This task closes
all three, in the two engines task 320 changed.

**Key deliverables:**

- `partsOf` in `shared/resources/finalise-rerun-at-head.js` opens a comment block only where Markdown
  does, so a comment opener inside an HTML block no longer hides a fenced `## ` line (T320-CR-601,
  [bug 5](../task.320.task-319-leftover-findings/task.320.bug.5.opener-inside-an-html-block-hides-a-fence.md)).
- `partsOf` reads a closed comment as closed at any indent Markdown allows and inside a list item, so a
  legitimate document is no longer refused as `scan-broken` (T320-CR-603).
- `topLevelKeys` in `shared/resources/ci-tree-equivalence.js` refuses an exact `ci` or `pipeline`
  key written behind `?` with a comment, or as an alias, instead of reading the defaults (T320-CR-602).

**Expected outcome:** the eight security probe cases that reproduce at task 320's head (DoD run 2,
cases 19, 20 and 21) are held, and every case that held before still holds.

## 2. Motivation

**Current problems:**

- **T320-CR-601 (medium, fails open).** A criteria section holding an HTML block (`<details>`, `<div>`,
  `<pre>`, `<table>`), then a column-0 `<!--`, then a fence holding `## y`, then a listed command,
  with a closing `-->` later in the document, answers `none-named` at exit 0. The command is not
  re-run, and nothing says so. Recorded 4 of 4 in `task.320.qa.6.task-319-leftover-findings.md`
  (Findings table, row T320-CR-601).
- **T320-CR-602 (low, fails open).** `? ci # c` followed by `: docsOnly:`, or `*k :` after
  `a: &k ci`, and the same for `pipeline`, is read as the defaults. `? ci` alone is refused. Four of 4
  in the same report (row T320-CR-602).
- **T320-CR-603 (low, fails closed).** A closed comment holding a fence marker, indented 1 or 3 spaces
  or in a list item, with the command only under `## Other`, answers `scan-broken`. The same document
  at column 0 answers `none-named`. Of the 5021 tracked documents, none has this shape (QA report 6).

**Benefits:**

- The re-run engine's refusal is no longer bypassed by an HTML block (fails open → refused).
- A configuration opt-out is never silently replaced by the defaults.
- No legitimate document is refused for an indented closed comment.
- Task 320's criteria 1 and 8 hold without an exception.

## 3. Technical Background

**Current architecture** (grepped 2026-11-26 at `f1ad02845`):

- `partsOf(text)` — `shared/resources/finalise-rerun-at-head.js:325`. It opens a comment block on any
  line where `line.startsWith("<!--")` and the line is before the last `-->`
  (`comment = i < lastEnd && !line.includes("-->")`). It does not track HTML blocks, so an opener
  inside `<details>` opens a block that Markdown never opens there (601). `startsWith` also means an
  opener indented 1–3 spaces, or inside a list item, opens nothing, so the fence marker inside it is
  read as a real fence and the document splits wrongly (603).
- `topLevelKeys(text, parsed)` — `shared/resources/ci-tree-equivalence.js:471`. It returns
  `[...Object.keys(parsed), ...writtenKeys(text)]`. `writtenKeys` reads the anchor, tag and `?` forms
  (task 320, T320-CR-502), but not `?` followed by a comment, and not an alias key (`*k`).
- Both functions are read by the near-miss and block-row checks task 320 added: `assertBlockRows`
  and the re-run's criteria scan (`finalise-rerun-at-head.js:991`, `:1000`).

**Target architecture:**

- `partsOf` follows CommonMark's rules for an HTML block (type 2, `<!--`, opens at an indent of 0–3
  spaces, and inside a list item's content), and opens no comment while inside an HTML block of types
  6 and 7 (`<details>`, `<div>`, `<pre>`, `<table>` and the like) until its blank-line end.
- `writtenKeys` strips a trailing comment from a `?` key row before reading the key, and resolves an
  alias key against the anchors written in the file, so either form counts as a written `ci` or
  `pipeline` key and goes through the same refusal.

The probe cases are in `docs/tasks/task.320.task-319-leftover-findings/task.320.dod.2.security.cases.{20,21,22}.json`
(plan entries 19, 20 and 21; file indexes are 1-based).

## 4. Scope

**In scope:**

- ✅ `partsOf` in `shared/resources/finalise-rerun-at-head.js` (601, 603)
- ✅ `writtenKeys` / `topLevelKeys` in `shared/resources/ci-tree-equivalence.js` (602)
- ✅ Tests in `finalise-rerun-at-head.test.mjs`, `ci-tree-equivalence.test.mjs` and `push-policy.test.mjs`
- ✅ Closing task 320's bug 5

**Out of scope:**

- ❌ T320-CR-401 to 404, which task 320 carries separately
- ❌ A full CommonMark parser. The rules above cover the HTML block types that hide a fence, nothing more

## 5. Breaking Changes

**1. Two key spellings are refused that were read as the defaults.** Before: `? ci # c` / `: docsOnly:`
gave the default `ci` block. After: it is refused as a usage error, as `? ci` alone already is.
Affected: a `skills-config.yaml` using either spelling (none in this repository). Migration: write the
key plainly, `ci:`.

No other change is breaking: 601 turns a silent `none-named` into the refusal criterion 1 always
promised, and 603 turns a refusal into the answer the column-0 form already gives.

## 6. Implementation Plan

> Detailed implementation guide: [task.326.plan.task-320-accepted-residual.md](task.326.plan.task-320-accepted-residual.md)

### Phase 1: Comment blocks by Markdown's rule (Risk: Medium)

Files: `shared/resources/finalise-rerun-at-head.js`, `shared/resources/tests/finalise-rerun-at-head.test.mjs`

- [ ] Write the T320-CR-601 cases (each HTML block type, with and without a later closer) and see them red
- [ ] Write the T320-CR-603 cases (indent 1 and 3, list item) and see them red
- [ ] Track HTML blocks of types 6 and 7 in `partsOf`; open no comment inside one
- [ ] Open a comment at an indent of 0–3 spaces and inside a list item's content
- [ ] Controls: an indent of 4 is code, not a comment; a column-0 opener still behaves as today

### Phase 2: Keys behind `?` with a comment, and alias keys (Risk: Low)

Files: `shared/resources/ci-tree-equivalence.js`, `shared/resources/tests/ci-tree-equivalence.test.mjs`, `shared/resources/tests/push-policy.test.mjs`

- [ ] Write the four T320-CR-602 cases (`ci` and `pipeline`, each form) and see them red
- [ ] Strip a trailing comment from a `?` row in `writtenKeys`
- [ ] Resolve an alias key against the file's anchors in `writtenKeys`
- [ ] Controls: an alias that names another key is not counted; a `#` inside a quoted key is kept

### Phase 3: Verify and close (Risk: Low)

- [ ] Re-run the DoD 2 probe plan (`security-probe-plan.mjs` with `task.320.dod.2.security.plan.json`); 0 reproduced
- [ ] Mutation table: revert each remedy, name the test that goes red
- [ ] Close task 320's bug 5; CHANGELOG entry citing (task 326)

## 7. Files Summary

**Core implementation:**

1. ✅ `shared/resources/finalise-rerun-at-head.js` — `partsOf`
2. ✅ `shared/resources/ci-tree-equivalence.js` — `writtenKeys`

**Tests:**

3. ✅ `shared/resources/tests/finalise-rerun-at-head.test.mjs`
4. ✅ `shared/resources/tests/ci-tree-equivalence.test.mjs`
5. ✅ `shared/resources/tests/push-policy.test.mjs`

**Bundled copies:** `npm run bundle` refreshes each skill's `references/` copy of both engines.

**Documentation:**

6. ✅ `CHANGELOG.md`
7. ✅ `docs/tasks/task.320.task-319-leftover-findings/task.320.bug.5.opener-inside-an-html-block-hides-a-fence.md` — status

## 8. Testing Strategy

**Unit tests.** New cases in the three suites above, each red before its change.
Command: `command node --test shared/resources/tests/finalise-rerun-at-head.test.mjs shared/resources/tests/ci-tree-equivalence.test.mjs shared/resources/tests/push-policy.test.mjs`.

**Corpus.** Every tracked Markdown document answers as it does at `develop` (`git ls-files '*.md'`
through the re-run's criteria scan), and every tracked YAML file parses as it does at `develop`.

**Security.** The DoD 2 probe plan (22 entries, 194 cases) re-run against the change: 0 reproduced.

**Control cases.** Each rule has one instance of the same defect the cases above never name (a
`<section>` block, a `? pipeline` with a `#` in a quoted key) and one correct instance it must leave
alone.

## 9. Success Criteria

**Functional:**

- [ ] A criteria section whose HTML block holds a column-0 `<!--`, then a fence holding `## y`, then a listed command, is refused, with and without a later closer (T320-CR-601)
- [ ] A closed comment holding a fence marker, indented 1–3 spaces or in a list item, answers as the column-0 form does (T320-CR-603)
- [ ] An exact `ci` or `pipeline` key behind `?` with a comment, or as an alias, is refused (T320-CR-602)
- [ ] The DoD 2 probe plan of task 320 reproduces 0 cases, recorded in the QA report

**Code quality:**

- [ ] Every new test was red before its change; the red runs are in the QA report
- [ ] Reverting any one remedy turns a named test red; the table is in the QA report
- [ ] `npm test` passes under `CI=true`; `npm run bundle` leaves no diff

**Migration:**

- [ ] CHANGELOG `[Unreleased]` cites (task 326) and names the refused key spellings
- [ ] Task 320's bug 5 reads Closed, citing this task

## 10. Risk Assessment

**MEDIUM — the HTML-block rule changes how every criteria section is split.** Probability: low.
Impact: a document that answered `none-named` could start answering a command. Mitigation: the corpus
check above, compared with `develop`. Rollback: revert Phase 1 alone.

**LOW — the alias rule reads anchors the YAML subset may not.** Mitigation: resolve only an anchor
written on a top-level key row; anything else stays as it is.

**LOW — the bundle drifts.** Mitigation: `npm run bundle:check` in the gate.

## 11. Rollback Plan

**Immediate (< 1 hour).** Trigger: a tracked document's answer differs from `develop`, or a tracked
YAML file is refused. Steps: revert the phase's commit, run `npm run bundle`, re-run the three suites.

**Partial.** Phases 1 and 2 touch different engines, so each reverts alone.

**Forward fix.** A new spelling that slips past either rule is a forward fix with its own case.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-11-26 | 1.0 | Initial draft: task 320's accepted residual (T320-CR-601, 602, 603) | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: Comment blocks by Markdown's rule
- [ ] Phase 2: Keys behind `?` with a comment, and alias keys
- [ ] Phase 3: Verify and close

## References

- [Task 320](../task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md) — gate 6 `WAIVED`, DoD run 2
- [Task 320 QA report 6](../task.320.task-319-leftover-findings/task.320.qa.6.task-319-leftover-findings.md)
- [Task 320 bug 5](../task.320.task-319-leftover-findings/task.320.bug.5.opener-inside-an-html-block-hides-a-fence.md)

## Notes

- QA report: `task.326.qa.{N}.task-320-accepted-residual.md`
- Bug reports: `task.326.bug.{N}.{name}.md`
- Quality gate: `task.326.gate.{N}.task-320-accepted-residual.yml`
