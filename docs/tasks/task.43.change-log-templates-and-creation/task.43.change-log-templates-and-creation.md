---
id: task.43
title: "Templates and creation skills emit the canonical Change Log"
type: task
description: "Give every PRD, epic, story, and task template the canonical Change Log section, and make the create-* skills seed its first row."
tags: [change-log, templates, documentation]
category: documentation
status: planned
priority: High
created: 2026-08-12
updated: 2026-08-12
assignee:
estimated_effort_hours: 16
github_issue: 202
---

# [Task 43] Templates and creation skills emit the canonical Change Log

**Status:** Planned

**GitHub Issue:** [#202](https://github.com/Gamaroff/agent-skills/issues/202)

---

## 1. Overview

Two of the four document types never get a Change Log at creation: `create-task`'s template
has no such section, and `create-epic`'s inline epic structure has none. The two epic/story
markdown templates that *do* have one emit a bulleted `### Change Log` that the sync engine
cannot find. The brownfield PRD template uses five columns where every other template uses
four.

This task makes every template emit the canonical section from task.42, and makes each
`create-*` skill write its first row.

**Scope**: Eight template files (three of them near-duplicate copies), six `create-*` skills,
new assertions in `tests/skill-protocol.test.js`, and eval-scenario assertions.

**Key deliverables**:

1. Every PRD / epic / story / task template carries the canonical section.
2. Every `create-*` skill seeds row one.
3. Protocol tests and eval scenarios pin it, mirroring how sign-off is pinned.

**Expected outcome**: A newly created document of any of the four types opens with a Change
Log containing one row.

---

## 2. Motivation

### Current Problems

1. **`create-task` emits no Change Log at all.** `skills/create-task/resources/task-template.md`
   ends with the unnumbered tail `Stakeholder Sign-off`, `Progress Tracking`, `References`,
   `Notes` — no Change Log. Yet `skills/develop/SKILL.md:719` instructs the agent to "Update
   task change log with date and summary of changes", and `sync-jira-task` appends one
   regardless. Real task documents show the result: `docs/tasks/task.38.jira-ladder-walking/task.38.jira-ladder-walking.md:847`
   carries an ad-hoc `### Change Log` with `| Date | Change |`, and
   `docs/tasks/task.22.finalise-dod-parallel-checks/task.22.finalise-dod-parallel-checks.md:214`
   carries a `### Change Log` with plain bullets. Three shapes across three documents,
   because there was no template to follow.

2. **`create-epic` emits no Change Log.** The inline epic structure at
   `skills/create-epic/SKILL.md:146-264` runs Epic Goal → Epic Description → Stories
   Breakdown → Compatibility Requirements → Risk Mitigation → Definition of Done →
   Completion Tracking. No Change Log. Every real epic in `docs/prd/onboarding/epics/`
   confirms it.

3. **The templates that have one emit an unfindable heading.**
   `docs/templates/epic-template.md:680` and
   `skills/documentation-standards-validator/references/story-template.md:701` both emit a
   bulleted `### Change Log` under `## Notes & Updates`. Task.42's engine can now read H3,
   but the bulleted form has no rows to read and no columns to append to.

4. **The brownfield PRD template disagrees with every other template.** Five columns
   (`Change, Date, Version, Description, Author`) at
   `skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml:118` against four
   everywhere else.

5. **Three epic-template copies, one already drifted.** `docs/templates/epic-template.md`
   (709 lines), `skills/epic-registry-manager/references/epic-template.md` (709, byte-equal),
   and `skills/documentation-standards-validator/references/epic-template.md` (706 — drifted).
   No test locks them, unlike the story-template pair at `tests/skill-protocol.test.js:174`.

### Benefits

1. A stakeholder opening any of the four document types finds the same section in a
   predictable place.
2. `develop`'s existing "update the task change log" instruction stops pointing at nothing.
3. The sync engine finds and extends an existing block instead of inventing one.
4. Byte-locking the template copies kills a live drift, and prevents the next one.
5. Protocol tests make a regression fail in CI rather than in a consumer repo.

---

## 3. Technical Background

### Current Architecture

| Template | Path | Today |
|---|---|---|
| Story (authoritative) | `skills/create-story/resources/story-template.yaml:168` + `review-story` copy | ✅ `change-log` section, 4 columns, correctly placed |
| Story (legacy md) | `skills/documentation-standards-validator/references/story-template.md:701` | ❌ bulleted `### Change Log` |
| Task | `skills/create-task/resources/task-template.md` + `review-task` copy | ❌ absent |
| Epic | `docs/templates/epic-template.md:680` + 2 copies | ❌ bulleted `### Change Log` |
| Epic (inline) | `skills/create-epic/SKILL.md:146` | ❌ absent |
| PRD greenfield | `skills/prd-template/resources/prd-tmpl.yaml:28` | ✅ 4 columns, nested under §1 |
| PRD brownfield | `skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml:115` | ⚠️ 5 columns |
| Bug | `skills/create-bug-report/assets/bug-report-template.md:119` | n/a — `## Status History` |

### Target Architecture

Every template emits the canonical block from
[`shared/resources/document-change-log.md`](../../../shared/resources/document-change-log.md):

```markdown
## Change Log

| Date       | Version | Description   | Author       |
|------------|---------|---------------|--------------|
| 2026-08-12 | 1.0     | Initial draft | create-task  |
```

Placement, chosen so the log sits with the other document-lifecycle sections rather than
inside the work content:

| Doc type | Position |
|---|---|
| Story | after `Stakeholder Sign-off`, before `Dev Agent Record` (unchanged — already correct) |
| Task | after `## Stakeholder Sign-off`, before `## Progress Tracking` — mirrors story |
| Epic | top-level `## Change Log`, before `## Notes & Updates` |
| PRD | `### Change Log` nested under §1 — unchanged, both templates |

### Important Clarifications

- **The task section must stay unnumbered.** `countMandatorySections()`
  (`skills/create-task/scripts/lib.js:122`) counts the literal strings `## 1. Overview` …
  `## 11. Rollback Plan` and `tests/skill-protocol.test.js:102` asserts the result is 11.
  An unnumbered tail section is invisible to that count — which is exactly why sign-off was
  added unnumbered, and why `tests/skill-protocol.test.js:218` re-asserts the 11 after it.
- **The epic heading is promoted to H2.** The bulleted `### Change Log` currently lives
  under `## Notes & Updates` alongside `### Open Questions` and `### Decisions Made`. Those
  two stay; the Change Log moves out and up, because it is a document-lifecycle record, not
  a note.
- **PRDs keep H3.** Promoting them would change the 8-section contract in
  `docs/standards/prd-documents.md:65`. Task.42's engine reads H3, so there is no need.

---

## 4. Scope

### In Scope

✅ `skills/create-task/resources/task-template.md` + `skills/review-task/resources/task-template.md`
✅ `docs/templates/epic-template.md` + the `epic-registry-manager` and
   `documentation-standards-validator` copies (including resolving the 3-line drift)
✅ `skills/documentation-standards-validator/references/story-template.md`
✅ `skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml` — 5 columns → 4
✅ `skills/prd-template/resources/prd-tmpl.yaml` — canonical instruction text
✅ `skills/create-story/resources/story-template.yaml` + `review-story` copy — instruction text only
✅ `create-epic`, `create-task`, `create-doc`, `create-parallel-stories`, `create-prd` — seed the row
✅ `tests/skill-protocol.test.js` — new assertions
✅ `evals/create-story/scenarios/01-happy`, `evals/create-task/scenarios/01-happy`

### Out of Scope

❌ The canonical spec and engine — task.42, a hard prerequisite
❌ `review-*` / `edit-*` skills — task.44
❌ `develop`, QA, `finalise`, sync skills — task.45
❌ Backfilling existing documents
❌ The missing `skills/create-story/resources/story-draft-checklist.md`
   (`create-story/SKILL.md:1025` references a file that does not exist) — unrelated pre-existing bug

---

## 5. Breaking Changes

### Breaking Change 1: brownfield PRD Change Log loses its `Change` column

**Before** (`brownfield-prd-tmpl.yaml:115-118`):

```yaml
- id: changelog
  title: Change Log
  type: table
  columns: [Change, Date, Version, Description, Author]
```

**After**:

```yaml
- id: changelog
  title: Change Log
  type: table
  columns: [Date, Version, Description, Author]
  instruction: |
    Canonical format: shared/resources/document-change-log.md. Append-only, newest last.
```

**Affected**: new brownfield PRDs, and `review-prd/SKILL.md:771`, which writes a 5-column row.

**Migration path**: existing brownfield PRDs keep their five columns — no backfill. The
leading `Change` cell duplicated `Description` in practice: the one real example,
`docs/prd/onboarding/prd.onboarding.md:72`, reads
`| Initial draft | 2026-05-11 | 0.1.0 | First PRD produced by dogfooded /create-prd brownfield run | dogfood-pipeline |`,
where `Initial draft` restates the Description. Task.44 updates `review-prd`'s writer in the
same series.

### Breaking Change 2: the epic Change Log moves out of `## Notes & Updates`

**Before**: `### Change Log` (bulleted) is the first subsection of `## Notes & Updates`.
**After**: a top-level `## Change Log` table sits immediately before `## Notes & Updates`,
which retains `### Open Questions` and `### Decisions Made`.

**Affected**: `review-epic/SKILL.md:177`, which loads `docs/templates/epic-template.md` as its
template-compliance baseline, and any consumer epic written from the old template.

**Migration path**: task.42's engine finds an existing `### Change Log` under the old heading
and updates it in place at its original level, so an un-migrated epic keeps working. Moving
it is a manual edit; nothing forces it. `review-epic`'s compliance list is updated in task.44.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.43.plan.change-log-templates-and-creation.md](task.43.plan.change-log-templates-and-creation.md)

### Phase 1: Task template

**Risk**: Medium — the 11-section contract is asserted in two places.
**Files**: `skills/create-task/resources/task-template.md`, `skills/review-task/resources/task-template.md`

- [ ] Insert an unnumbered `## Change Log` after `## Stakeholder Sign-off`, before
      `## Progress Tracking`, with the canonical 4-column table and one placeholder row
- [ ] Confirm `countMandatorySections()` still returns 11
- [ ] Resolve the known frontmatter drift between the two copies and make them byte-identical

### Phase 2: Epic templates

**Risk**: Medium — three copies, one already drifted.
**Files**: `docs/templates/epic-template.md`,
`skills/epic-registry-manager/references/epic-template.md`,
`skills/documentation-standards-validator/references/epic-template.md`

- [ ] Replace the bulleted `### Change Log` under `## Notes & Updates` with a top-level
      `## Change Log` table placed immediately before `## Notes & Updates`
- [ ] Diff the 706-line `documentation-standards-validator` copy against the 709-line
      canonical, identify the 3-line drift, and reconcile toward the canonical
- [ ] Make all three byte-identical

### Phase 3: Story and PRD templates

**Risk**: Low.
**Files**: `skills/documentation-standards-validator/references/story-template.md`,
`skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml`,
`skills/prd-template/resources/prd-tmpl.yaml`,
`skills/create-story/resources/story-template.yaml`, `skills/review-story/resources/story-template.yaml`

- [ ] Story markdown template: bulleted `### Change Log` → top-level `## Change Log` table,
      positioned to match the YAML template (after sign-off, before Dev Agent Record)
- [ ] Brownfield PRD: 5 columns → 4, plus the canonical instruction
- [ ] Greenfield PRD: add the canonical instruction (columns already correct)
- [ ] Story YAML pair: add the canonical instruction; keep byte-identical

### Phase 4: Creation skills seed row one

**Risk**: Low.
**Files**: `skills/create-epic/SKILL.md`, `skills/create-task/SKILL.md`,
`skills/create-doc/SKILL.md`, `skills/create-parallel-stories/SKILL.md`, `skills/create-prd/SKILL.md`
**Depends on**: Phases 1–3

- [ ] `create-epic`: add `## Change Log` to the inline epic structure at `:146`, and a step
      seeding `| {today} | 1.0 | Initial draft | create-epic |`
- [ ] `create-task`: seed the first row in step 4 (model: `create-story/SKILL.md:819`)
- [ ] `create-doc:138`: turn "Update change log if applicable" into a concrete instruction
      naming the canonical format
- [ ] `create-parallel-stories` §2.3: the mandatory parent-epic mutation writes a row on the epic
- [ ] `create-prd`: brownfield epic-append mode (`:501`) writes a row on the PRD
- [ ] Each skill links `shared/resources/document-change-log.md` rather than restating the format

### Phase 5: Tests, evals, bundle

**Risk**: Low.
**Files**: `tests/skill-protocol.test.js`, `evals/create-story/scenarios/01-happy/scenario.json`,
`evals/create-task/scenarios/01-happy/scenario.json`
**Depends on**: Phases 1–4

- [ ] Protocol tests mirroring the sign-off block at `tests/skill-protocol.test.js:157-230`:
      section present in each template; unnumbered on tasks; 11-count unchanged; the three
      epic copies byte-identical; the task pair byte-identical
- [ ] Eval assertions: `fileMatches` on `\n## Change Log\n` and `fileDoesNotMatch` on
      `\n## \d+\. Change Log`, following `evals/create-task/scenarios/04-sign-off-enabled`
- [ ] `npm run bundle`, then confirm a second run is a no-op
- [ ] `npm run generate-catalog` if any skill description changed

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/create-task/resources/task-template.md` — add unnumbered `## Change Log`
2. ✅ `skills/review-task/resources/task-template.md` — same; byte-lock to (1)
3. ✅ `docs/templates/epic-template.md` — promote and tabulate
4. ✅ `skills/epic-registry-manager/references/epic-template.md` — same
5. ✅ `skills/documentation-standards-validator/references/epic-template.md` — same + resolve 3-line drift
6. ✅ `skills/documentation-standards-validator/references/story-template.md` — promote and tabulate
7. ✅ `skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml` — 5 cols → 4
8. ✅ `skills/prd-template/resources/prd-tmpl.yaml` — instruction text
9. ✅ `skills/create-story/resources/story-template.yaml` — instruction text
10. ✅ `skills/review-story/resources/story-template.yaml` — same; stays byte-identical
11. ✅ `skills/create-epic/SKILL.md` — inline structure + seed step
12. ✅ `skills/create-task/SKILL.md` — seed step
13. ✅ `skills/create-doc/SKILL.md` — concrete write at `:138`
14. ✅ `skills/create-parallel-stories/SKILL.md` — parent-epic row
15. ✅ `skills/create-prd/SKILL.md` — brownfield append row

### Files to Modify (Tests)

16. ✅ `tests/skill-protocol.test.js`
17. ✅ `evals/create-story/scenarios/01-happy/scenario.json`
18. ✅ `evals/create-task/scenarios/01-happy/scenario.json`

### Files to Modify (Documentation)

19. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: template structure contracts
- **Location**: `tests/skill-protocol.test.js`
- **Command**: `node --test tests/skill-protocol.test.js`
- **Target**: every template asserted for section presence; the 11-count re-asserted after
  the addition; both duplicate-template families byte-locked

### Integration Tests

- **Scope**: a document produced end-to-end by `create-story` / `create-task` carries the section
- **Actions**: `npm run eval:create-story`, `npm run eval:create-task` (replay driver, hermetic)
- **Risk covered**: a template can be correct while the skill's own generation instructions
  omit the section — the eval exercises the skill, the protocol test exercises the file

### Contract Tests

- **Scope**: the 11-section contract survives
- **Actions**: `lib.countMandatorySections(template) === 11` — the assertion at
  `tests/skill-protocol.test.js:112`, plus the sign-off precedent's re-assertion at `:218`
- **Scope**: `npm run bundle` idempotence, and no hand-edited `references/` file

### Performance Tests

Not applicable — template and prose changes only.

### Consumer Tests

- **Scope**: `review-epic` loads `docs/templates/epic-template.md` as its compliance baseline
  (`review-epic/SKILL.md:177`)
- **Risk area**: promoting the epic heading changes what that baseline asserts. Task.44
  updates `review-epic`; until then, confirm the moved section does not make a conforming
  epic read as non-compliant

---

## 9. Success Criteria

### Functional

- [ ] `create-task`'s template contains an unnumbered `## Change Log` between Stakeholder
      Sign-off and Progress Tracking
- [ ] `create-epic`'s inline structure contains `## Change Log`
- [ ] All three epic templates carry a top-level `## Change Log` table and are byte-identical
- [ ] Both story templates and both PRD templates use the canonical four columns
- [ ] A document created by each of `create-{prd,epic,story,task}` opens with exactly one
      Change Log row

### Performance

- [ ] No measurable change to `create-*` runtime; assert only that the eval suites do not
      slow by more than a second

### Code Quality

- [ ] `npm test` passes, including the re-asserted 11-section count
- [ ] `npm run eval:create-story && npm run eval:create-task` pass
- [ ] `npm run bundle` idempotent; no `references/` file hand-edited
- [ ] `npm run generate-catalog` re-run if any description changed

### Migration

- [ ] Each touched skill links `shared/resources/document-change-log.md` rather than
      restating the format
- [ ] `CHANGELOG.md` updated
- [ ] The 3-line epic-template drift is resolved and locked

---

## 10. Risk Assessment

### High Risk Areas

1. **Breaking the 11-section contract**
   - **Risk**: adding a numbered section, or a heading whose text collides with a counted
     one, makes `countMandatorySections()` return something other than 11 and fails CI —
     or worse, passes locally and breaks a consumer's `create-task`.
   - **Probability**: Low — the counter matches literal numbered strings only
   - **Impact**: Critical
   - **Mitigation**: keep the section unnumbered and re-assert the count in the same test
     block, exactly as the sign-off addition did at `tests/skill-protocol.test.js:218`.
   - **Rollback**: remove the section from both task templates; nothing else depends on it.

### Medium Risk Areas

2. **The three epic-template copies drift further**
   - **Risk**: one copy gets the promotion and another does not. The
     `documentation-standards-validator` copy is already 3 lines adrift, which is how this
     class of bug announces itself.
   - **Probability**: High if unguarded
   - **Impact**: Medium
   - **Mitigation**: byte-lock all three in `tests/skill-protocol.test.js`, mirroring the
     story-template pair lock at `:174`, which exists because the task pair had already drifted.
   - **Rollback**: re-copy from `docs/templates/epic-template.md`.

3. **`review-epic`'s compliance baseline reads a moved section as missing**
   - **Risk**: `review-epic/SKILL.md:177` treats the template as the oracle; a conforming
     new epic could be graded non-compliant until task.44 lands.
   - **Probability**: Medium
   - **Impact**: Medium — an advisory finding, not a blocker
   - **Mitigation**: task.42's engine reads both levels; verify a new epic reviews clean
     before merging, and land task.44 promptly.

### Low Risk Areas

4. **Brownfield PRD column change orphans `review-prd`'s writer**
   - **Risk**: `review-prd/SKILL.md:771` writes a 5-column row into a 4-column table.
   - **Probability**: High until task.44
   - **Impact**: Low — a malformed row in one document type, visibly wrong
   - **Mitigation**: note it in `CHANGELOG.md`; task.44 fixes the writer. Sequence task.44
     immediately after.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `countMandatorySections()` returns anything but 11
- `npm run eval:create-task` or `eval:create-story` red
- A newly created document has two Change Logs, or one in the wrong place

**Steps**:
1. `git revert` the merge commit.
2. `npm run bundle`.
3. `npm test` to confirm green.

**Validation**: `node --test tests/skill-protocol.test.js` passes; a scratch `/create-task`
run produces the pre-change document shape.

### Partial Rollback (1-2 hours)

**When to use**: one template family is wrong and the rest are fine.

**Steps**: revert only that phase. The phases are independent by design — task templates
(Phase 1), epic templates (Phase 2) and story/PRD templates (Phase 3) share no files. Phase 4
degrades gracefully: a skill instructed to seed a row into a template that no longer has the
section will create the section via task.42's engine, at the correct anchor.

### Forward Fix (< 4 hours)

**When to use**: wrong placement in one template, or a missed copy.

**Approach**: fix the file, add the byte-lock assertion if it was missing, re-bundle. Do not
revert — placement is a one-line move.

### Rollback Triggers

**Critical (revert)**: the 11-count breaks; an eval scenario fails; a created document is
malformed.
**Non-critical (fix forward)**: a template copy missed; instruction wording; a
`review-epic` advisory finding caused by the moved heading.

---

## Progress Tracking

### Phase 1: Task template
- [ ] Not started

### Phase 2: Epic templates
- [ ] Not started

### Phase 3: Story and PRD templates
- [ ] Not started

### Phase 4: Creation skills seed row one
- [ ] Not started

### Phase 5: Tests, evals, bundle
- [ ] Not started

---

## References

- [`shared/resources/document-change-log.md`](../../../shared/resources/document-change-log.md) —
  the canonical spec (created by task.42; hard prerequisite)
- [`shared/resources/sign-off.md`](../../../shared/resources/sign-off.md) — the precedent for
  adding an unnumbered tail section to the task template without breaking the 11-count
- [`tests/skill-protocol.test.js`](../../../tests/skill-protocol.test.js) lines 157-230 —
  the sign-off assertion block to mirror
- [`docs/standards/task-documents.md`](../../standards/task-documents.md) — the 11 numbered
  sections and the unnumbered tail
- [`skills/create-task/scripts/lib.js`](../../../skills/create-task/scripts/lib.js) line 122 —
  `countMandatorySections`
- Prior task: task.42. Follow-on: task.44, task.45.

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, never a bundled `skills/*/references/` copy — except for
  the three `references/*-template.md` files, which are **not** bundled from `shared/` and
  are genuine hand-maintained copies. Those are the ones this task byte-locks.
- Keep the task Change Log section unnumbered.
- Land task.44 soon after: this task leaves `review-prd` writing a 5-column row into a
  4-column table.

### Known Issues

- `skills/create-story/SKILL.md:1025` references `resources/story-draft-checklist.md`, which
  does not exist. Pre-existing, unrelated, out of scope.
- `skills/review-task/resources/task-template.md` is missing the frontmatter block its
  `create-task` counterpart carries (noted at `tests/skill-protocol.test.js:175`). Phase 1
  resolves it, since it touches both files anyway.

### Future Improvements

- The three epic-template copies exist because two skills need the file at bundle time.
  Making `epic-template.md` a `shared/resources/` file would let `bundle_skill.py` maintain
  the copies and remove the drift class entirely. Larger change; worth a task of its own.
