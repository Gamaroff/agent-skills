---
id: task.43.plan
title: "Implementation Plan: Templates and creation skills emit the canonical Change Log"
type: plan
task-ref: task.43.change-log-templates-and-creation.md
---

# Implementation Plan: Templates and creation skills emit the canonical Change Log

> Requirements and success criteria: [task.43.change-log-templates-and-creation.md](task.43.change-log-templates-and-creation.md)

## Overview

Add the canonical Change Log section to the four template families that lack it or emit it
wrongly, make the five `create-*` skills seed row one, and pin all of it with protocol tests
and eval assertions modelled on how stakeholder sign-off was pinned.

**Prerequisite**: task.42 must be merged. `shared/resources/document-change-log.md` is the
text every skill links instead of restating the format.

## The canonical block

Every template emits exactly this, with a single placeholder row:

```markdown
## Change Log

| Date       | Version | Description   | Author      |
|------------|---------|---------------|-------------|
| YYYY-MM-DD | 1.0     | Initial draft | create-task |
```

## Phase-by-Phase Implementation Guide

### Phase 1: Task template

**Files**: `skills/create-task/resources/task-template.md`,
`skills/review-task/resources/task-template.md`

Insert between `## Stakeholder Sign-off` (`:374`) and `## Progress Tracking` (`:387`):

```markdown
## Change Log

Append-only record of changes to this document. Newest last. Canonical format:
[document-change-log.md](../../../shared/resources/document-change-log.md).

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| YYYY-MM-DD | 1.0     | Initial draft | create-task |

---
```

**The heading must not be numbered.** `countMandatorySections()`
(`skills/create-task/scripts/lib.js:122`) counts literal substrings `"## 1. Overview"` …
`"## 11. Rollback Plan"`. An unnumbered heading is invisible to it — the same reason
`## Stakeholder Sign-off` is unnumbered. Verify immediately:

```bash
node -e '
const lib=require("./skills/create-task/scripts/lib.js");
const fs=require("fs");
console.log(lib.countMandatorySections(
  fs.readFileSync("skills/create-task/resources/task-template.md","utf8")));'
# must print 11
```

Then reconcile the pair. `review-task`'s copy is 9 lines shorter — it is missing the YAML
frontmatter block that `create-task`'s copy carries (noted at
`tests/skill-protocol.test.js:175`). Copy `create-task`'s file over `review-task`'s wholesale,
then confirm byte equality:

```bash
cmp skills/create-task/resources/task-template.md skills/review-task/resources/task-template.md
```

### Phase 2: Epic templates

**Files**: `docs/templates/epic-template.md`,
`skills/epic-registry-manager/references/epic-template.md`,
`skills/documentation-standards-validator/references/epic-template.md`

Current shape at `docs/templates/epic-template.md:678-700`:

```markdown
## Notes & Updates

### Change Log

**[Date]**: [Change description]

- [Detail 1]
- [Detail 2]

### Open Questions
```

Target — the log lifts out to its own H2 immediately *before* `## Notes & Updates`, which
keeps Open Questions and Decisions Made:

```markdown
## Change Log

Append-only record of changes to this document. Newest last. Canonical format:
[document-change-log.md](../../shared/resources/document-change-log.md).

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| YYYY-MM-DD | 1.0     | Initial draft | create-epic |

---

## Notes & Updates

### Open Questions
```

Note the relative link depth differs per copy — `docs/templates/` is two levels from the
repo root, `skills/*/references/` is three. Get each right; `tests/executable-instructions.test.js`
fails on a broken doc reference.

Then resolve the drift. Diff before editing so the 3 lines are known rather than guessed:

```bash
diff docs/templates/epic-template.md \
     skills/documentation-standards-validator/references/epic-template.md
```

Reconcile toward `docs/templates/epic-template.md` — it is the canonical copy and the one
`review-epic/SKILL.md:177` loads. Apply the Change Log edit to the canonical file, then copy
it over both others verbatim.

### Phase 3: Story and PRD templates

**`skills/documentation-standards-validator/references/story-template.md:699-707`** — same
promotion as the epic template. Position it to match the YAML template's ordering: after the
sign-off section, before Dev Agent Record. This file is a legacy expanded markdown template
whose section order differs from the YAML; place the log immediately before
`## QA Testing Results` if no Dev Agent Record heading exists, and note the choice in the
commit message.

**`skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml:115-118`**:

```yaml
      - id: changelog
        title: Change Log
        type: table
        columns: [Date, Version, Description, Author]      # was: [Change, Date, Version, Description, Author]
        instruction: |
          Append-only record of changes to this PRD, newest last. Canonical format:
          shared/resources/document-change-log.md. Leave Version blank for machine-written rows.
```

**`skills/prd-template/resources/prd-tmpl.yaml:28-32`** — columns already correct; replace
`instruction: Track document versions and changes` with the same canonical instruction text.

**`skills/create-story/resources/story-template.yaml:168-174`** — the section is already
correct. Add only the canonical instruction:

```yaml
  - id: change-log
    title: Change Log
    type: table
    columns: [Date, Version, Description, Author]
    instruction: |
      Append-only record of changes to this story, newest last. Canonical format:
      shared/resources/document-change-log.md. Leave Version blank for machine-written rows.
    owner: scrum-master
    editors: [scrum-master, dev-agent, qa-agent]
```

Copy the file to `skills/review-story/resources/story-template.yaml` — the pair is byte-locked
at `tests/skill-protocol.test.js:174` and that test will catch a miss.

### Phase 4: Creation skills seed row one

The model is `skills/create-story/SKILL.md:816-822`, which already does this:

```markdown
2. Add entry to Change Log table:
   ```markdown
   | 2025-10-30 | 1.0 | Initial draft created by Scrum Master | SM Agent |
   ```
```

Update that example to use the skill name (`create-story`) in the Author cell rather than
`SM Agent`, matching the canonical spec's Author rule.

**`skills/create-epic/SKILL.md`** — two edits. Add to the inline epic structure at `:146-264`,
between `## Completion Tracking` (`:246`) and the conditional Visual Diagram section:

```markdown
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| {{today}}  | 1.0     | Initial draft | create-epic |
```

Then add a bullet to Post-Creation Validation (`:332`) confirming the row was written and
frontmatter `updated` matches its date.

**`skills/create-task/SKILL.md`** — in step 4 "Document Generation", after the frontmatter
bullet, add: seed the Change Log with `| {today} | 1.0 | Initial draft | create-task |` and
ensure `updated` matches.

**`skills/create-doc/SKILL.md:138`** — replace "Update change log if applicable" with a
concrete instruction: when the template declares a `changelog` section, write
`| {today} | 1.0 | Initial draft | create-doc |`, and on any later section-by-section save
that revises an already-written section, append a row rather than editing one. Link the spec.

**`skills/create-parallel-stories/SKILL.md` §2.3** (`:212-230`) — this step mandatorily
mutates the parent epic (frontmatter `estimated_stories`, the Stories Overview table, the
mermaid diagram, dependency notes, DoD counts) and leaves no trace. Add a final bullet:
append a row to the parent epic's Change Log, e.g.
`| {today} | | Stories 1-1/1-2 added — estimated_stories 4 → 6 | create-parallel-stories |`.

**`skills/create-prd/SKILL.md:501`** — brownfield extension mode appends an epic to an
existing PRD's "Epic and Story Structure". Add a row to that PRD's Change Log:
`| {today} | | Epic {N} appended | create-prd |`.

In every case **link** `shared/resources/document-change-log.md` rather than restating the
column list. Six restatements is the problem being solved.

### Phase 5: Tests, evals, bundle

**`tests/skill-protocol.test.js`** — add a block after the sign-off block (`:157-230`),
mirroring its structure:

```js
// ===========================================================================
// Change Log — every document template carries the canonical section, the task
// section stays UNNUMBERED (numbering it breaks the 11-section contract), and
// the duplicate template families stay byte-identical.
// ===========================================================================
const CHANGE_LOG_HEADING = "Change Log";

for (const skill of ["create-task", "review-task"]) {
  test(`change-log — ${skill} task template carries an unnumbered Change Log`, () => {
    const tpl = fs.readFileSync(
      path.join(SKILLS_DIR, skill, "resources", "task-template.md"), "utf-8");
    assert.match(tpl, new RegExp(`^## ${CHANGE_LOG_HEADING}$`, "m"));
    assert.doesNotMatch(tpl, new RegExp(`^## \\d+\\.\\s*${CHANGE_LOG_HEADING}`, "m"),
      "Change Log must stay unnumbered — numbering it breaks the 11-section contract");
    assert.match(tpl, /\| Date +\| Version +\| Description +\| Author +\|/);
  });
}

test("change-log — adding the section does not change the 11-section count", () => {
  const lib = require(path.join(SKILLS_DIR, "create-task", "scripts", "lib.js"));
  const tpl = fs.readFileSync(
    path.join(SKILLS_DIR, "create-task", "resources", "task-template.md"), "utf-8");
  assert.equal(lib.countMandatorySections(tpl), 11);
});

test("change-log — create-task and review-task ship byte-identical task templates", () => {
  // The pair is hand-maintained and has already drifted once (review-task's copy
  // lost its frontmatter). Lock it now that both carry the Change Log.
  const a = fs.readFileSync(path.join(SKILLS_DIR, "create-task", "resources", "task-template.md"), "utf-8");
  const b = fs.readFileSync(path.join(SKILLS_DIR, "review-task", "resources", "task-template.md"), "utf-8");
  assert.equal(a, b, "task-template.md copies have diverged — re-copy the create-task version");
});

test("change-log — all three epic-template copies are byte-identical", () => {
  // documentation-standards-validator's copy was 3 lines adrift before this lock.
  const canonical = fs.readFileSync(path.join(REPO_ROOT, "docs/templates/epic-template.md"), "utf-8");
  for (const p of [
    "skills/epic-registry-manager/references/epic-template.md",
    "skills/documentation-standards-validator/references/epic-template.md",
  ]) {
    assert.equal(fs.readFileSync(path.join(REPO_ROOT, p), "utf-8"), canonical,
      `${p} has diverged — re-copy docs/templates/epic-template.md`);
  }
});

test("change-log — both PRD templates and both story templates use the canonical columns", () => {
  for (const p of [
    "skills/prd-template/resources/prd-tmpl.yaml",
    "skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml",
    "skills/create-story/resources/story-template.yaml",
  ]) {
    assert.match(fs.readFileSync(path.join(REPO_ROOT, p), "utf-8"),
      /columns: \[Date, Version, Description, Author\]/,
      `${p} must use the canonical four columns`);
  }
});
```

Check whether `REPO_ROOT` already exists in that file; if only `SKILLS_DIR` is defined, derive
it the same way.

**Eval scenarios.** Follow `evals/create-task/scenarios/04-sign-off-enabled/scenario.json`,
which already expresses exactly this pair of assertions for sign-off. Add to
`evals/create-task/scenarios/01-happy/scenario.json` and
`evals/create-story/scenarios/01-happy/scenario.json`:

```json
{ "type": "fileMatches",       "file": "<doc>", "pattern": "\\n## Change Log\\n" },
{ "type": "fileDoesNotMatch",  "file": "<doc>", "pattern": "\\n## \\d+\\. Change Log" }
```

Use the same `file` value the existing section assertions in each scenario use.

**Bundle and catalog:**

```bash
npm run bundle
npm test
npm run eval:create-story && npm run eval:create-task
npm run bundle && git diff --stat    # must be empty
npm run generate-catalog             # only if a skill description changed
```

## Key Patterns and References

- **`tests/skill-protocol.test.js:157-230`** — the sign-off block. Same problem, same shape:
  a new template section, an unnumbered-heading guard, a re-assertion of the 11-count, and a
  byte-lock on the duplicated copies. Read it before writing the new block.
- **`evals/create-task/scenarios/04-sign-off-enabled/scenario.json`** — the present/absent
  regex pair to copy.
- **`skills/create-story/SKILL.md:816-822`** — the only `create-*` skill that already seeds a
  row; the others copy its shape.
- **`shared/resources/sign-off.md:64`** — "The section is owned by the document's author
  skill and is absent from `develop`'s write allow-list." The Change Log is the opposite:
  it is *on* the allow-list (`skills/develop/SKILL.md:509`), which is why task.45 exists.
- The three `references/*-template.md` files are **not** produced by `bundle_skill.py` — it
  bundles from `shared/resources/` only. They are genuine hand-maintained copies, which is
  why they drift and why this task locks them.

## Testing Approach

```bash
node -e '...countMandatorySections...'           # first, after Phase 1 — cheapest signal
node --test tests/skill-protocol.test.js         # template contracts
npm run eval:create-story && npm run eval:create-task   # generation actually emits it
npm test                                          # nothing else regressed
npm run bundle && git diff --stat                 # idempotent
```

Run the `countMandatorySections` check the moment Phase 1's edit lands — it is a one-line
command and it catches the single highest-impact failure in this task before anything else
is built on top of it.
