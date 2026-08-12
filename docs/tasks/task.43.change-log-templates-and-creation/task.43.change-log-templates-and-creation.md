---
id: task.43
title: "Templates and creation skills emit the canonical Change Log"
type: task
description: "Give every PRD, epic, story, and task template the canonical Change Log section, and make the create-* skills seed its first row."
tags: [change-log, templates, documentation]
category: documentation
status: ready-for-review
priority: High
created: 2026-08-12
updated: 2026-08-12
assignee:
estimated_effort_hours: 16
github_issue: 202
---

# [Task 43] Templates and creation skills emit the canonical Change Log

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.43.review.1.change-log-templates-and-creation.md` implemented 2026-08-12

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

5. **Three epic-template copies, and all three have drifted apart.** Compare hashes, not line
   counts — equal line counts hide a difference, which is how this went unnoticed:

   | Copy | Lines | md5 |
   |---|---|---|
   | `docs/templates/epic-template.md` (canonical) | 709 | `546b4bfd9d6a7f923d4ce9c41f444c2d` |
   | `skills/epic-registry-manager/references/epic-template.md` | 709 | `4acc1c4adc2447859a8b4f4a60df55e7` |
   | `skills/documentation-standards-validator/references/epic-template.md` | 706 | `55a13925287f18062b77efb20096dc64` |

   - **canonical ↔ `documentation-standards-validator`: 9 lines.** Three frontmatter fields
     absent (`type`, `description`, `tags`) plus six stale reference links
     (`product-requirements.md`, `technical-implementation.md`, `DEVELOPER-QUICK-START.md`,
     `implementation-phases.md`, `IMPLEMENTATION-STATUS.md`, `CROSS-REFERENCE-GUIDE.md`).
   - **canonical ↔ `epic-registry-manager`: 18 lines.** A wholly *different frontmatter schema* —
     `epic_type`, `estimated_sprints`, `dependencies`, `completion_percentage`, `blocked_by`,
     `team`, `start_date`, `target_date`, a quoted `'[Epic N] Epic Name'` title, and an uppercase
     `NOT_STARTED | IN_PROGRESS | PARTIALLY_COMPLETE | COMPLETE` status enum, in place of the
     canonical `epic_number` / `type` / `description` / `tags` / `domain` / `📋 Planned` shape —
     plus the same six stale links.

   No test locks them, unlike the story-template pair at `tests/skill-protocol.test.js:174`.
   Consequence for Phase 2: byte-locking these three is **not** a copy-paste. It replaces
   `epic-registry-manager`'s frontmatter schema, which is a decision, not a side-effect.

### Benefits

1. A stakeholder opening any of the four document types finds the same section in a
   predictable place.
2. `develop`'s existing "update the task change log" instruction stops pointing at nothing.
3. The sync engine finds and extends an existing block instead of inventing one.
4. Byte-locking the template copies kills two live drifts, and prevents the next one.
5. It also clears a live standards violation: the `documentation-standards-validator` epic copy
   carries no `type:` field, which [`shared/resources/open-knowledge-format.md`](../../../shared/resources/open-knowledge-format.md)
   makes OKF's one hard requirement and the `review-*` skills grade as **Critical**. Reconciling
   toward the canonical fixes it — reconciling the other way would entrench it.
6. Protocol tests make a regression fail in CI rather than in a consumer repo.

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

- [x] Insert an unnumbered `## Change Log` after `## Stakeholder Sign-off`, before
      `## Progress Tracking`, with the canonical 4-column table and one placeholder row
- [x] Confirm `countMandatorySections()` still returns 11
- [x] Resolve the known frontmatter drift between the two copies and make them byte-identical

### Phase 2: Epic templates

**Risk**: Medium — three copies, all three mutually drifted, and one carries a different
frontmatter schema.
**Files**: `docs/templates/epic-template.md`,
`skills/epic-registry-manager/references/epic-template.md`,
`skills/documentation-standards-validator/references/epic-template.md`

**Decision — `docs/templates/epic-template.md` is the winner.** It is the OKF-conformant copy
(it alone carries `type` / `description` / `tags`), and it is already the compliance baseline
`review-epic/SKILL.md:177` loads. Both other copies reconcile toward it. This **replaces**
`epic-registry-manager`'s frontmatter schema — that is intended, not incidental, and the
verification step below is what makes it safe.

- [x] Replace the bulleted `### Change Log` under `## Notes & Updates` with a top-level
      `## Change Log` table placed immediately before `## Notes & Updates`
- [x] Reconcile the `documentation-standards-validator` copy (9 lines adrift: 3 absent
      frontmatter fields + 6 stale reference links) toward the canonical
- [x] Reconcile the `epic-registry-manager` copy (18 lines adrift: a different frontmatter
      schema + the same 6 stale links) toward the canonical
- [x] **Before locking**, grep `skills/epic-registry-manager/` for any instruction that reads
      the schema being replaced — `epic_type`, `estimated_sprints`, `dependencies`,
      `completion_percentage`, `blocked_by`, `team`, `start_date`, `target_date`, or the
      uppercase `NOT_STARTED`/`IN_PROGRESS`/`PARTIALLY_COMPLETE`/`COMPLETE` status enum. Any hit
      is a consumer of the old schema and must be updated in the same phase, or the skill will
      instruct against a template that no longer matches.
- [x] Make all three byte-identical, and assert it in `tests/skill-protocol.test.js` (Phase 5)

### Phase 3: Story and PRD templates

**Risk**: Low.
**Files**: `skills/documentation-standards-validator/references/story-template.md`,
`skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml`,
`skills/prd-template/resources/prd-tmpl.yaml`,
`skills/create-story/resources/story-template.yaml`, `skills/review-story/resources/story-template.yaml`

- [x] Story markdown template: bulleted `### Change Log` → top-level `## Change Log` table,
      positioned to match the YAML template (after sign-off, before Dev Agent Record)
- [x] Brownfield PRD: 5 columns → 4, plus the canonical instruction
- [x] Greenfield PRD: add the canonical instruction (columns already correct)
- [x] Story YAML pair: add the canonical instruction; keep byte-identical

### Phase 4: Creation skills seed row one

**Risk**: Low.
**Files**: `skills/create-epic/SKILL.md`, `skills/create-task/SKILL.md`,
`skills/create-doc/SKILL.md`, `skills/create-parallel-stories/SKILL.md`, `skills/create-prd/SKILL.md`
**Depends on**: Phases 1–3

- [x] `create-epic`: add `## Change Log` to the inline epic structure at `:146`, and a step
      seeding `| {today} | 1.0 | Initial draft | create-epic |`
- [x] `create-task`: seed the first row in step 4 (model: `create-story/SKILL.md:819`)
- [x] `create-doc:138`: turn "Update change log if applicable" into a concrete instruction
      naming the canonical format
- [x] `create-parallel-stories` §2.3: the mandatory parent-epic mutation writes a row on the epic
- [x] `create-prd`: brownfield epic-append mode (`:501`) writes a row on the PRD
- [x] Each skill links `shared/resources/document-change-log.md` rather than restating the format

### Phase 5: Tests, evals, bundle

**Risk**: Low.
**Files**: `tests/skill-protocol.test.js`, `evals/create-story/scenarios/01-happy/scenario.json`,
`evals/create-task/scenarios/01-happy/scenario.json`
**Depends on**: Phases 1–4

- [x] Protocol tests mirroring the sign-off block at `tests/skill-protocol.test.js:157-230`:
      section present in each template; unnumbered on tasks; 11-count unchanged; the three
      epic copies byte-identical; the task pair byte-identical
- [x] Eval assertions: `fileMatches` on `\n## Change Log\n` and `fileDoesNotMatch` on
      `\n## \d+\. Change Log`, following `evals/create-task/scenarios/04-sign-off-enabled`
- [x] `npm run bundle`, then confirm a second run is a no-op
- [x] `npm run generate-catalog` if any skill description changed

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/create-task/resources/task-template.md` — add unnumbered `## Change Log`
2. ✅ `skills/review-task/resources/task-template.md` — same; byte-lock to (1)
3. ✅ `docs/templates/epic-template.md` — promote and tabulate
4. ✅ `skills/epic-registry-manager/references/epic-template.md` — same + resolve 18-line drift
   (frontmatter schema replaced; check the skill for consumers of the old keys)
5. ✅ `skills/documentation-standards-validator/references/epic-template.md` — same + resolve
   9-line drift (restores the absent `type` / `description` / `tags`)
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

### Files Modified Beyond the Original Plan (discovered during implementation)

Each was a direct consequence of a planned change; none widened the task's goal.

16. ✅ `skills/documentation-standards-validator/references/prd-structure-guide.md` — documented the
    **old** epic frontmatter schema that Phase 2 replaced (`epic_type`, `estimated_sprints`,
    `NOT_STARTED …`). Found by the pre-lock consumer grep the review added to Phase 2. Left
    unchanged, the skill would have contradicted its own template.
17. ✅ `skills/prd-template/SKILL.md` — links the canonical spec. Required by the Migration success
    criterion ("each touched skill links `shared/resources/document-change-log.md`") and it is also
    what makes the bundler copy the spec into this skill's `references/`; the `.yaml` templates alone
    are never scanned by `bundle_skill.py`, which walks only `.md`/`.js`/`.mjs`/`.sh`.
18. ✅ `skills/brownfield-prd-template/SKILL.md` — same reason.
19. ✅ `skills/documentation-standards-validator/SKILL.md` — same reason; its check (3) is the
    Change Log header check, which now names the canonical format.

### Files to Modify (Tests)

20. ✅ `tests/skill-protocol.test.js` — 13 new assertions
21. ✅ `evals/create-story/scenarios/01-happy/scenario.json` — 3 new assertions
22. ✅ `evals/create-task/scenarios/01-happy/scenario.json` — 3 new assertions
23. ✅ `evals/create-story/scenarios/01-happy/replay/docs/stories/story.178.8.example-feature.md` —
    replay fixture; it **is** the recorded output the assertions run against, so it must carry the
    section the skill now emits
24. ✅ `evals/create-task/scenarios/01-happy/replay/docs/tasks/task.42.cache-lib-simplification.md` —
    same

### Files Added (generated by `npm run bundle`, not hand-written)

25. ✅ `references/document-change-log.md` inside each of `create-doc`, `create-epic`, `create-prd`,
    `create-story`, `create-task`, `create-parallel-stories`, `prd-template`,
    `brownfield-prd-template`, `documentation-standards-validator`

### Files to Modify (Documentation)

26. ✅ `CHANGELOG.md`

### Files to Delete

None.

### Out of Scope, Found During Implementation

- `skills/create-architecture-doc/resources/templates/brownfield-architecture-tmpl.yaml:74` carries the
  same legacy five-column `[Change, Date, Version, Description, Author]` form the brownfield PRD
  template had — while its three sibling architecture templates (`architecture-tmpl.yaml`,
  `fullstack-architecture-tmpl.yaml`, `front-end-architecture-tmpl.yaml`) already use the canonical
  four. **Deliberately not changed here**: architecture documents are outside this task's declared
  scope and outside the canonical spec, which covers "a PRD, epic, story, or task document"
  (`shared/resources/document-change-log.md:8`). Worth its own small task.
- `skills/epic-registry-manager/SKILL.md:103` shows a registry example row with Status `NOT_STARTED`,
  while the live `docs/development/epic-registry.md` uses `✅ Accepted` / `📋 Planned`. Pre-existing
  and unrelated to the frontmatter schema this task replaced — that is a registry-table column, not
  epic frontmatter.

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

- [x] `create-task`'s template contains an unnumbered `## Change Log` between Stakeholder
      Sign-off and Progress Tracking
- [x] `create-epic`'s inline structure contains `## Change Log`
- [x] All three epic templates carry a top-level `## Change Log` table and are byte-identical,
      reconciled toward `docs/templates/epic-template.md` per the Phase 2 decision — with
      `epic-registry-manager`'s replaced frontmatter schema confirmed to have no remaining
      consumer in that skill
- [x] Both story templates and both PRD templates use the canonical four columns
- [x] A document created by each of `create-{prd,epic,story,task}` opens with exactly one
      Change Log row

### Performance

- [x] No measurable change to `create-*` runtime; assert only that the eval suites do not
      slow by more than a second

### Code Quality

- [x] `npm test` passes, including the re-asserted 11-section count
- [x] `npm run eval:create-story && npm run eval:create-task` pass
- [x] `npm run bundle` idempotent; no `references/` file hand-edited
- [x] `npm run generate-catalog` re-run if any description changed

### Migration

- [x] Each touched skill links `shared/resources/document-change-log.md` rather than
      restating the format
- [x] `CHANGELOG.md` updated
- [x] The 3-line epic-template drift is resolved and locked

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
   - **Risk**: one copy gets the promotion and another does not. Both non-canonical copies are
     *already* adrift — 9 lines and 18 lines respectively — which is how this class of bug
     announces itself. The 18-line case is a different frontmatter schema, so a careless
     reconciliation silently rewrites what `epic-registry-manager` tells authors to emit.
   - **Probability**: High if unguarded — it has already happened twice
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
- [x] Complete — unnumbered `## Change Log` added between Stakeholder Sign-off and Progress
      Tracking in both copies; `countMandatorySections()` re-verified at 11; the pair is now
      byte-identical (the `review-task` copy had been missing the whole YAML frontmatter block
      and used a legacy `**Task ID**:` header)

### Phase 2: Epic templates
- [x] Complete — bulleted `### Change Log` replaced by a top-level `## Change Log` table placed
      immediately before `## Notes & Updates`; all three copies reconciled toward the canonical
      and byte-locked. Pre-lock grep found one real consumer of the replaced frontmatter schema
      (`documentation-standards-validator/references/prd-structure-guide.md`), updated in the
      same phase

### Phase 3: Story and PRD templates
- [x] Complete — legacy story markdown template promoted and tabulated (placed before
      `## QA Testing Results`, the plan's documented fallback, as the file has neither a
      Sign-off nor a Dev Agent Record heading); brownfield PRD 5 columns → 4; both PRD
      templates and the story YAML pair carry the canonical instruction

### Phase 4: Creation skills seed row one
- [x] Complete — `create-epic` (inline structure + Post-Creation Validation), `create-task`
      (step 4.2), `create-story` (Author cell now the skill name), `create-doc` (concrete
      first-save + revision-append instruction), `create-parallel-stories` (§2.3 bullet 6 —
      the mandatory parent-epic mutation now leaves a trace), `create-prd` (brownfield
      extend mode)

### Phase 5: Tests, evals, bundle
- [x] Complete — 13 protocol tests added (`npm test`: 1158/1158 pass); 6 eval assertions added
      across both `01-happy` scenarios with their replay fixtures updated
      (`eval:create-task` 12/12, `eval:create-story` 15/15); `npm run bundle` idempotent and
      every byte-lock verified to survive it; `generate-catalog` not required (no skill
      `description:` changed)

---

## Implementation Record

**Started**: 2026-08-12
**Completed**: 2026-08-12
**Branch**: `feature/task.43.change-log-templates-and-creation`

### Implementation Summary

All five phases landed. Every PRD / epic / story / task template now emits the canonical four-column
Change Log; all six `create-*` skills seed row one and link the canonical spec instead of restating the
columns; both duplicate-template families are byte-locked in CI; and the drift the task set out to kill
turned out to be twice the size described and was resolved with an explicit schema decision.

### Implementation Approach

**Placement follows the sign-off precedent, not a new rule.** On tasks the section is unnumbered and
sits between `## Stakeholder Sign-off` and `## Progress Tracking`; `countMandatorySections()` matches
literal numbered strings, so the tail section is invisible to it. Verified at 11 immediately after the
Phase 1 edit — the cheapest signal for the task's highest-impact risk — and re-asserted in the test
suite. On epics the log was promoted out of `## Notes & Updates` to its own H2 immediately above it,
with Open Questions and Decisions Made left behind. PRDs keep `### Change Log` under §1.

**The canonical-spec reference is written as the plain `shared/resources/document-change-log.md` path
inside an HTML comment**, not as the relative markdown link the plan sketched. Two reasons: the coding
standard requires the explicit path form ("never use symlinks or relative paths"), and a relative link
cannot be correct in three files at three different depths while they stay byte-identical. Putting it in
a comment also mirrors how the sign-off block carries its spec pointer, and keeps a path that means
nothing from a consumer's `docs/tasks/` out of every generated document.

**Byte-locking and bundling interact, and the interaction was verified rather than assumed.**
`bundle_skill.py` excludes `references/` from its in-place rewrite (Pass 1, and therefore Pass 3), so
the two bundled epic copies keep the literal `shared/resources/...` string and stay byte-equal to
`docs/templates/epic-template.md`. The `create-task` / `review-task` template pair *is* rewritten — but
identically in both, because both live under `resources/`. Every lock was re-checked with `cmp` after
bundling, and the bundle was confirmed idempotent by content hash.

**The Phase 2 schema decision.** The task claimed two of the three epic copies were byte-equal; they
were not, and the `epic-registry-manager` copy carried an entirely different frontmatter schema that an
equal line count had hidden. Reconciling toward the canonical replaces that schema, so the pre-lock
consumer grep the review added ran first: it found `prd-structure-guide.md` documenting the old shape,
which was updated in the same phase. `epic-registry-manager/SKILL.md:103`'s `NOT_STARTED` is a registry
*table* value, not frontmatter, and is left alone.

### Testing Results

| Suite | Result |
|---|---|
| `node --test tests/skill-protocol.test.js` | 36/36 pass (13 new) |
| `npm test` (full) | **1158/1158 pass**, 0 fail |
| `npm run eval:create-task` | 12/12 assertions pass |
| `npm run eval:create-story` | 15/15 assertions pass |
| `countMandatorySections()` | 11 — unchanged |
| `npm run bundle` twice | idempotent (no content or status delta) |
| Byte-locks after bundling | task pair ✅, epic trio ✅, story YAML pair ✅ |

### Deferred Work

None within scope. Two items found outside it are recorded under §7 "Out of Scope, Found During
Implementation": the brownfield **architecture** template's five-column log, and the stale
`NOT_STARTED` registry example. Task.44 remains the owner of `review-prd`'s five-column writer, exactly
as this task's Risk 4 anticipated.

### Notes

No Change Log was added to this task document itself — §4 excludes backfilling existing documents, and
the pipeline-side writers are task.45's scope.

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
