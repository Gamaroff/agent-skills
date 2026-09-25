---
id: task.155
title: "[Task 155] QA Testing Results section: one write engine, one placement, refused when duplicated"
type: task
description: "Give the work item's `## QA Testing Results` section a write engine beside change-log.js. It replaces the section whole, places it in one canonical position outside the change-log block, and refuses a document that already carries more than one. Wire qa-task and qa-story Step 12 to it, repair the one corrupted document in the corpus, and hold the invariant with a corpus test."
tags: [qa-task, qa-story, change-log, engine, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-09-25
updated: 2026-09-25
assignee:
estimated_effort_hours: 16
github_issue: 486
---

# Technical Task: QA Testing Results section — one write engine, one placement, refused when duplicated

**Status:** Planned

**GitHub Issue**: [#486](https://github.com/Gamaroff/agent-skills/issues/486)

---

## 1. Overview

`qa-task` and `qa-story` Step 12 require the work item's `## QA Testing Results` section to be
**replaced whole** on every QA cycle, never patched field by field. Nothing performs that replacement.
Every run hand-writes the edit, and a hand-written "replace" whose boundaries are found by two
independent searches duplicates text instead of replacing it. This task gives the section an engine,
modelled on `change-log.js`, which already solved the same problem for the Change Log.

**Scope**: one new shared engine and its unit tests; Step 12 of two QA skills wired to it; one
corrupted document repaired; one corpus guard; CHANGELOG.

**Key deliverables**:

1. `shared/resources/qa-results.js`: `findQaResults` and `upsertQaResults`, which are fence-aware.
   Upsert replaces a single section whole, creates it in a canonical position, relocates one found
   inside the change-log block, and refuses on more than one (obs #178).
2. `qa-task` Step 12 and `qa-story` Step 12 write the section through the engine, one call each,
   never by string slicing.
3. `tests/qa-results-corpus.test.js`: no tracked work-item document carries more than one
   `## QA Testing Results`, or one inside the change-log markers. task.65, which carries three today,
   is repaired.

**Expected outcome**: a QA cycle's Step 12 write cannot stack a second section, because the engine
refuses rather than guesses. The one existing stacked document is repaired, and CI fails if another
appears.

---

## 2. Motivation

### Current Problems

1. **The rule has no mechanism.** qa-task Step 12 says "Replace the whole `## QA Testing Results`
   section from the gate just written — never patch it line by line", and qa-story Step 12 says the
   same. Neither names a tool, so every run writes its own. The Change Log has an engine
   (`change-log.js`) for exactly this reason. Its header records the text-search writes that landed
   rows inside fenced examples (task.42, task.43) and after a stray blank line (task.44, obs #113).
2. **A hand-written replacement stacked copies across three commits (obs #178).** On task.145
   (develop-next T145, 2026-09-25), cycle 1 inserted the section **after** the `## Change Log`
   heading, inside the change-log markers. Cycles 2–4 replaced
   `slice(indexOf("## QA Testing Results"), indexOf("## Change Log"))`. The heading index was
   already smaller than the section index, so each "replacement" duplicated the span. The committed
   document ended up with four stacked sections and four empty `## Change Log` headings. Only QA
   cycle 5's independent reviewer noticed (CR5-1, medium).
3. **It has happened before, and it is still in the tree.** `docs/tasks/task.65.registry-aware-selection/task.65.registry-aware-selection.md`,
   an **accepted** task, carries three `## QA Testing Results` sections. Survey command and
   definition: see § 8, *Corpus survey*.
4. **Placement is not defined, so it varies.** Of the tracked work-item documents that carry the
   section, some place it before the change-log block, some after, and most have no change-log
   markers at all. There is no one place a reader or a tool can expect it.

### Benefits of Solution

- A Step 12 write is one call whose failure modes are named reasons, not silent duplication.
- The one canonical placement makes the section findable by tools and people alike.
- The corpus guard turns the next stacked document into a red CI run instead of a finding five
  cycles later.
- The fence-aware placement logic is **reused** from `change-log.js`, not written a second time.

---

## 3. Technical Background

### Current Architecture

- **Writers**: `skills/qa-task/SKILL.md` § *Step 12: Update Task File*, and `skills/qa-story/SKILL.md`
  § *Step 12* item 3 (*Update Story/Task File with QA Results*). Both give the section template in a
  fence and the replace-whole rule in prose. Neither names a tool.
- **The Change Log engine**: `shared/resources/change-log.js` exports `bodyStart`, `fencedRanges`,
  `protectedRanges`, `insideProtected`, `findChangeLog`, `upsertChangeLog`, `bumpUpdated` and
  `ANCHORS` (story → `## Dev Agent Record`, task → `## Progress Tracking`, epic →
  `## Notes & Updates`). `findChangeLog` locates the block by `<!-- change-log-start -->` /
  `<!-- change-log-end -->` markers or by a hand-written heading, and it guards both the start scan
  and the end scan against fenced text (TASK-42-BUG-1, bug.13).
- **Interaction that made obs #178 worse**: `upsertChangeLog` **carries** any non-table text it
  finds inside its block (bug.13, `splitCarriedLines`: "a machine writer's edit is additive"). A QA
  section written inside the markers is therefore preserved on every Change Log write, where
  nothing will ever remove it.
- **Engine reach**: `qa-task` and `qa-story` already ship `references/change-log.js`. Sibling
  engines already `require("./change-log.js")`: `report-lint.js` for `fencedRanges`,
  `status-history.js` and `jira-sync.js`.

### Target Architecture

- **`shared/resources/qa-results.js`** (new, CommonJS, pure, no I/O). It requires `./change-log.js`
  for `protectedRanges`, `insideProtected`, `bodyStart`, `findChangeLog` and `ANCHORS`.
  - `findQaResults(content)` → `{ sections: [{ start, end, insideChangeLog }] }`. It finds every
    `## QA Testing Results` heading that is not inside a fence or an inline code span. Each span ends
    at the next unprotected heading of level ≤ 2, or at the change-log end marker when the section
    sits inside the block.
  - `upsertQaResults(content, section, { docType })` → `{ content, reason }`, where `reason` is one
    of these:

    | `reason` | When | Write |
    | --- | --- | --- |
    | `replaced` | exactly one section, outside the change-log block | replaced in place, whole |
    | `relocated` | exactly one section, inside the change-log block | removed from the block and inserted at the canonical position |
    | `created` | none | inserted at the canonical position |
    | `multiple` | more than one | **none**: `content` is returned unchanged |
    | `bad-section` | `section` does not start with `## QA Testing Results` | **none** |

  - **Canonical position**: immediately before the change-log block when the document has one (the
    marker block, or else a hand-written `## Change Log` heading, as `findChangeLog` reports it).
    Otherwise immediately before `ANCHORS[docType]`. Otherwise at the end of the document.
- **Step 12** in both QA skills: render the section from the gate as today, then write it with one
  `node -e` call to the engine. Stop and surface the `reason` on `multiple` or `bad-section`; never
  fall back to a hand edit.
- **Corpus guard**: a test over every tracked `docs/**/*.md` that carries the heading. Each document
  must have at most one `## QA Testing Results` and none inside the change-log markers. There is a
  non-vacuity floor on the number of documents scanned.

### Same-class mechanism inventory (obs #103)

- `change-log.js` `upsertChangeLog` locates and rewrites the **Change Log** block. `qa-results.js`
  **sits beside it** and does not extend it: the two sections have different lifecycles. The Change
  Log is append-only history; QA Testing Results is a snapshot replaced every cycle. Folding the
  snapshot into the append-only engine would put two write rules in one function.
  `qa-results.js` **reuses** its locating primitives rather than re-deriving fence handling. That is
  the part that took bug.13 three cycles to get right.
- `report-lint.js` checks the **implementation report's** section order. It does not read work-item
  documents, and it is not extended here.
- `upsertChangeLog`'s carry-through is **not** changed. Once the corpus guard holds, no QA section
  can sit inside the block for it to carry.

---

## 4. Scope

### In Scope

- ✅ `shared/resources/qa-results.js` and `shared/resources/tests/qa-results.test.mjs`
- ✅ `qa-task` Step 12 and `qa-story` Step 12 write through the engine; bundle refresh
- ✅ `tests/qa-results-corpus.test.js`, plus the repair of task.65
- ✅ CHANGELOG `[Unreleased]`

### Out of Scope

- ❌ **Rendering** the section from the gate. The template stays in Step 12 prose, and so does the
  NFR-status cross-check. This task owns placement and replacement, not content.
- ❌ Moving existing correctly placed single sections to the canonical position. The engine moves a
  section only when it writes it, so documents change the next time QA writes them. There is no
  corpus-wide rewrite.
- ❌ Changing `upsertChangeLog`'s carry-through rule.
- ❌ The develop pipelines' own QA Iteration History (implementation report). `report-lint.js` owns
  that.

---

## 5. Breaking Changes

None to any public contract. A QA write that previously appended a second section now **refuses**
with `reason: multiple`. That is intended: it surfaces a document that is already corrupt. A
section found inside the change-log block moves to the canonical position on its next write.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.155.plan.qa-results-section-engine.md](task.155.plan.qa-results-section-engine.md)

### Phase 1: the engine (Risk: Low)

**Files**: `shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`

- [ ] `findQaResults`: every unprotected `## QA Testing Results` heading, its span, and whether it sits inside the change-log marker block
- [ ] `upsertQaResults`: the five reasons in § 3's table, and the canonical position order (change-log block → `ANCHORS[docType]` → end)
- [ ] Reuse `change-log.js` exports for fences, inline code, frontmatter and the change-log block. Define no second fence scanner
- [ ] Unit tests for each reason, plus: a fenced example heading is ignored; a hand-written `## Change Log` with no markers; a document with neither; the task.145 corruption shape (heading inside the markers) → `relocated`, then `replaced` on the next write

### Phase 2: wire the QA skills (Risk: Medium)

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, and their bundled `references/` (generated)

- [ ] qa-task Step 12: after rendering, write through `upsertQaResults` with one `node -e` call. On `multiple` / `bad-section`, halt and print the `reason`. Never hand-edit as a fallback. Cite obs #178
- [ ] qa-story Step 12 item 3: the same, with `docType` story / task as the document is
- [ ] `npm run bundle`; confirm both skills ship `references/qa-results.js` with `npm run bundle:check`, and that no copy is `UNREACHED`

### Phase 3: corpus guard and repair (Risk: Low)

**Files**: `tests/qa-results-corpus.test.js`, `docs/tasks/task.65.registry-aware-selection/task.65.registry-aware-selection.md`

- [ ] Corpus test over tracked `docs/**/*.md` carrying the heading: at most one section, and none inside the change-log markers. There is a floor on documents scanned
- [ ] Repair task.65: keep the copy whose **Gate File** link names the highest-numbered gate and remove the others. Record the removed copies' gate numbers in the implementation report
- [ ] Mutation-prove: re-add a copy to task.65 → the corpus test goes red, naming the file

### Phase 4: docs and validation (Risk: Low)

**Files**: `CHANGELOG.md`

- [ ] CHANGELOG `[Unreleased]` › Changed cites `(task 155)`
- [ ] `npm run ci:fast`, `npm run bundle:check`, `npm run validate` for qa-task and qa-story

---

## 7. Files Summary

### Files to Add

1. ✅ `shared/resources/qa-results.js`: the engine
2. ✅ `shared/resources/tests/qa-results.test.mjs`: engine unit tests
3. ✅ `tests/qa-results-corpus.test.js`: corpus guard (inside the `tests/*.test.js` glob in `package.json`)

### Files to Modify

4. ✅ `skills/qa-task/SKILL.md`: Step 12 writes through the engine
5. ✅ `skills/qa-story/SKILL.md`: Step 12 item 3 writes through the engine
6. ✅ `docs/tasks/task.65.registry-aware-selection/task.65.registry-aware-selection.md`: two stacked copies removed
7. ✅ `CHANGELOG.md`

### Generated (never edited by hand; `npm run bundle`)

8. `skills/qa-task/references/qa-results.js`, `skills/qa-story/references/qa-results.js`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests (`shared/resources/tests/qa-results.test.mjs`)

- One case per `reason` in § 3's table, asserting both the returned `reason` and the resulting text.
- Placement: markers present → the section lands immediately before `<!-- change-log-start -->`;
  only a hand-written `## Change Log` → before that heading; neither → before `ANCHORS[docType]`;
  none of these → at the end.
- Protection: a `## QA Testing Results` inside a fence or an inline code span is neither found nor
  replaced.
- The obs #178 shape: a section inside the markers → `relocated`, and the next write → `replaced`,
  with exactly one heading.
- **Command**: `command node --test shared/resources/tests/qa-results.test.mjs`

### Corpus survey (the figure the guard re-measures, obs #117)

- **Definition**: tracked files (`git ls-files 'docs/**/*.md'`) whose text has a line exactly
  `## QA Testing Results`. For each, count the headings and record whether the first one falls
  between the change-log markers.
- **Command**: the survey script in the plan file (§ Phase 3). The corpus test records the numbers;
  this document does not state them, because they change with every QA run.

### Behaviour tests

- The corpus test fails on a re-stacked task.65 and names the file (mutation proof).
- The Step 12 wiring is **executed**, not grepped. A test extracts the Step 12 `node -e` block from
  each QA skill, runs it from a consumer-shaped cwd against a fixture document, and asserts a single
  section.

### Regression

- `npm test`, including `change-log.test.mjs`, because the engine reuses its primitives.

---

## 9. Success Criteria

### Functional

- [ ] `upsertQaResults` returns each of `replaced`, `relocated`, `created`, `multiple`, `bad-section` in the case § 3 names, and writes nothing on the last two
- [ ] A fenced or inline-code `## QA Testing Results` is never found and never replaced
- [ ] qa-task and qa-story Step 12 write through the engine; the extracted Step 12 call, run against a fixture, leaves exactly one section
- [ ] The corpus guard passes on the tree after the task.65 repair and fails, naming the file, when a second copy is re-added

### Performance

- [ ] The engine and corpus tests run in under two seconds combined
- [ ] No network access

### Code Quality

- [ ] No second fence scanner: `qa-results.js` imports its protection primitives from `change-log.js`
- [ ] Every new assertion is mutation-proved, and the implementation report records each result
- [ ] `npm run ci:fast`, `npm run bundle:check` and `npm run validate` are clean

### Migration

- [ ] CHANGELOG `[Unreleased]` cites `(task 155)`
- [ ] Observation #178 is set to `actioned` when this task's PR merges

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A QA run halts on `multiple` in a consumer repo that already has stacked documents**
   - Risk: the refusal surfaces old corruption in the middle of a pipeline.
   - Probability: Low. In this repo it happens in exactly one document, and that one is repaired
     here. · Impact: Medium (one QA cycle stops).
   - Mitigation: the `reason` names the file, and the fix is manual deletion of the stale copies.
     The engine never guesses which copy is current. The halt message states the repair rule used
     for task.65 (keep the highest gate).
2. **Placement moves a section on its next write**
   - Risk: a one-time diff in documents that currently place the section after the change-log block.
   - Probability: Medium · Impact: Low (a section moves; its content is replaced anyway).
   - Mitigation: stated in CHANGELOG. There is no corpus-wide rewrite, so each document moves once,
     when QA next writes it.

### Low Risk Areas

1. **Bundler reach**: a skill that runs the call without shipping the engine fails with
   `MODULE_NOT_FOUND` (the task.139 shape). `bundle:check`'s `UNREACHED` check and the executed
   Step 12 test both cover it.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a Step 12 write through the engine corrupts or drops section content in normal use.
- **Steps**: revert the PR. The skills return to the prose instruction, and the engine and tests are
  removed.
- **Validation**: `npm test` green on the reverted tree.

### Partial Rollback (1–2 hours)

- Keep the engine and corpus guard; revert the Step 12 wiring in the skill that misbehaves.

### Forward Fix

- A placement edge case gets a unit test and an engine fix. There is no rollback for a single
  document.

### Rollback Triggers

- **Critical**: lost section content, or a write inside a fence.
- **Non-critical**: an unexpected placement. Fix it forward.

---

<!-- change-log-start -->

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-25 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: the engine
- [ ] Phase 2: wire the QA skills
- [ ] Phase 3: corpus guard and repair
- [ ] Phase 4: docs and validation

---

## References

- Observation #178: qa-task Step 12 "replace the QA Testing Results section whole" has no engine; hand-rolled slicing stacked four copies
- task.145: [`task.145.review-outcome-reachability-check.md`](../task.145.review-outcome-reachability-check/task.145.review-outcome-reachability-check.md). QA cycle 5, CR5-1 and bug 10 carry the worked evidence (on its feature branch until PR #485 merges)
- `shared/resources/change-log.js`: the precedent engine, and the primitives reused here
- `shared/resources/document-change-log.md` § *How a writer appends a row*: the one-liner and alternation pattern the Step 12 call follows

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.155.qa.{N}.qa-results-section-engine.md`,
  `task.155.gate.{N}.qa-results-section-engine.yml`, bug reports `task.155.bug.{N}.{name}.md`.
- Once the engine exists, this task's own QA cycles write their section through it (Phase 2 onward).
