---
id: task.44.plan
title: "Implementation Plan: Review and edit skills log their document mutations"
type: plan
task-ref: task.44.change-log-review-and-edit.md
---

# Implementation Plan: Review and edit skills log their document mutations

> Requirements and success criteria: [task.44.change-log-review-and-edit.md](task.44.change-log-review-and-edit.md)

## Overview

Fourteen skills gain prose instructing them to append a Change Log row when they mutate a
document, and the four `review-*` skills gain a compliance check that grades the section's
presence and currency. No code — this is all SKILL.md instruction work, plus protocol-test
assertions that the instructions exist.

**Prerequisites**: task.42 (the spec and engine) and task.43 (templates that emit the
section). Writing a row into a section no template produces would just exercise task.42's
insertion fallback on every document.

## The row every writer produces

```markdown
| 2026-08-12 | 1.1 | Review passed (9/10) — ready for development | review-task |
```

Three rules that every one of the fourteen edits must state, because they are the ones
agents get wrong:

1. **Bump frontmatter `updated:` in the same edit.** The spec makes this mandatory; a row
   without it leaves OKF `timestamp` disagreeing with the log.
2. **Describe what changed, not that something changed.** `AC3 added — offline retry on 5xx`,
   not `Story edited`. A log of "edited" rows is not a history.
3. **`Author` is the skill name.** `review-task`, not `Claude`, not `Review-Story`.
   `review-story/SKILL.md:2097` currently writes `Review-Story` and
   `review-prd/SKILL.md:771` writes `Claude`; both get normalised.

**Link, never restate.** Each skill cites
`shared/resources/document-change-log.md` and shows one illustrative row. Fourteen embedded
copies of a column list is exactly the failure this series exists to remove — and the one
`37bcf3f` called out when it consolidated the card contract: "two hand-maintained copies of
its contract that had already drifted, plus two more independent builders."

## Phase-by-Phase Implementation Guide

### Phase 1: Review skills write their verdict row

**`skills/review-epic/SKILL.md`** — Step 11 (`:679`) applies Edit-tool fixes and adds a
`**Review**: ✅ …implemented YYYY-MM-DD` line after `**Last Updated**`. Step 10 (`:663`) sets
`last_reviewed` and possibly `status`. Add to Step 11, before the Step 11.5 sync:

```markdown
Append a Change Log row to the epic recording the review outcome, and bump frontmatter
`updated` to today. Format: [document-change-log.md](../../shared/resources/document-change-log.md).

| 2026-08-12 | 1.1 | Review passed (8/10) — 3 fixes applied, scope overlap with epic 2 noted | review-epic |

Write this **regardless of tracker platform**. Step 11.5's Jira sync also appends a row on
the Jira path; that is a sync record, not the review record, and the GitHub and no-tracker
paths get nothing without this step.
```

**`skills/review-task/SKILL.md`** — identical treatment in Step 8.5 (`:1388`), plus a row in
Step 9 (`:1455`) when the status is promoted to `Ready for Development`. The status row is
separate from the verdict row: a review can pass without promoting (the sign-off gate at
`:1470` can withhold it), and the log should show which happened.

**`skills/review-prd/SKILL.md:771`** — reshape:

```markdown
| YYYY-MM-DD | [version] | Applied [N] recommendations from review-prd | review-prd |
```

The line immediately above it already says to update the `updated` frontmatter field — keep
that and make the pairing explicit. Note in the step that a PRD created before task.43 may
still have a five-column table; append four columns anyway and do not rewrite the header.

**`skills/review-story/SKILL.md:2097`** — the row exists; change the Author cell from
`Review-Story` to `review-story` and cite the spec.

**`skills/review-bug/SKILL.md`** Step 6.5 (`:131`) — bugs use `## Status History`
(`| Date | Status | Changed By | Notes |`), not a Change Log:

```markdown
When you correct severity or priority, append a Status History row recording it. Leave the
Status cell at the bug's **current** lifecycle status — this step never transitions a bug.

| 2026-08-12 | New | review-bug | Severity Medium → High; priority P3 → P1 — affects checkout |
```

### Phase 2: Edit and change-management skills

**`skills/edit-story/SKILL.md`** — Step 5 "Apply Changes" (`:248`) gains a mandatory final
sub-step. Then **delete** the advisories at `:272` ("Consider updating Change Log section if
not already done") and `:532` ("Change Log should be updated - Consider adding entry for
significant edits"). Leaving them alongside a mandatory instruction is how an agent decides
the write is optional.

```markdown
6. **Append a Change Log row** (mandatory) describing the change and bump frontmatter
   `updated`. Describe the substance, not the act:

   | 2026-08-12 | 1.2 | AC3 added — offline retry on 5xx | edit-story |

   Not `Story edited`. Format: [document-change-log.md](../../shared/resources/document-change-log.md).
```

**`skills/edit-epic/SKILL.md`** — same, in Step 6 "Apply Changes" (`:366`). Its cascade
analysis (`:206`) identifies affected child stories; the row should name the cascade when one
occurred: `| 2026-08-12 | 1.3 | Story 4.2 removed from scope — 3 child stories re-pointed | edit-epic |`.

**`skills/correct-course/SKILL.md`** and **`skills/change-management/SKILL.md`** — neither
applies edits; both emit a Sprint Change Proposal that a PO or SM applies. Add a subsection
to the proposal template (`correct-course:243`, `change-management:223`), after the per-artifact
edit sections:

```markdown
## Change Log rows to add

Paste one row into each artifact's Change Log when applying the edits above.

| Artifact | Row |
|---|---|
| `story.4.2.checkout.md` | `\| 2026-08-12 \| 1.3 \| AC2 relaxed — offline retry deferred to epic 5 \| correct-course \|` |
| `epic.4.checkout.md`    | `\| 2026-08-12 \| 1.2 \| Story 4.2 descoped per sprint change proposal \| correct-course \|` |
```

That keeps the proposal the single artifact a human works from, rather than making them
derive the rows.

### Phase 3: Structural rewrite skills

**`shard-doc` (3B.2 `:120`, 3B.4 `:155`) and `shard-prd` (Step 4 `:157`)** — sharding
destroys the source structure. Two writes:

- the generated `index.md` gets a Change Log with
  `| {today} | 1.0 | Sharded from {source} — {N} sections | shard-prd |`
- each shard gets a one-line provenance note pointing at the index

Do **not** copy the source document's Change Log into every shard — that multiplies one
history into N and none of them is authoritative.

**`enforce-standards` §4.2 (`:368`)** — a rename or move writes a row on the document it
moved: `| {today} | | Renamed from epic_163_account_security.md per file-naming standard | enforce-standards |`.
Only when the moved file is a PRD/epic/story/task document; source-file renames and
import-reference rewrites get nothing.

**`epic-registry-manager` Steps 4-6 (`:91`)** — it creates epic files directly, bypassing
`create-epic`. Seed row one exactly as task.43 makes `create-epic` do:
`| {today} | 1.0 | Initial draft | epic-registry-manager |`. The registry row itself is not a
Change Log concern.

### Phase 4: Grading

This is the phase that can halt pipelines. Build it last and test it hardest.

**The check**, added to each `review-*` template-compliance step:

```markdown
**Change Log** (skip entirely when `change-log.enabled: false` in `skills-config.yaml`)

1. **Presence** — the document has a Change Log section with at least one row.
2. **Currency** — the newest row is consistent with frontmatter `status`. Flag ONLY when
   `status` has advanced past `draft`/`planned` and no row mentions a review, a status
   change, or an implementation event. A document reviewed with no findings still has a row
   (Phase 1 writes one), so a genuinely quiet document is not a false positive.

Grade per `change-log.enforcement`:

| `enforcement`        | Missing or stale                                | Effect on the pipeline |
|----------------------|--------------------------------------------------|------------------------|
| `advisory` (default) | **Important** issue + readiness-score deduction  | none — verdict may still be GO |
| `blocking`           | **Critical** → NO-GO                             | `develop-*` HALTs at Step 2 |
| `off`                | not checked                                      | none                   |
```

Copy the table shape verbatim from `shared/resources/sign-off.md:147` — same three levels,
same consequences, same wording about the status gate being what actually stops a run.

Reviewer output, mirroring `sign-off.md:162`:

```markdown
- **[Important]** Change Log is stale — newest row is `1.0 Initial draft` (2026-05-11) but
  status is `ready-for-development`. Enforcement is `advisory`, so this does not block
  development.
```

Per-skill insertion points:

| Skill | Compliance list | Rubric rows |
|---|---|---|
| `review-story` | `:540` — Change Log already listed; add currency | — |
| `review-task` | `:425-470` | `:1244`, `:1686` |
| `review-epic` | template baseline `:177`; step table `:130` | `:445`, `:547` |
| `review-prd` | `:226` — presence already checked; add currency and grading | `:506`, `:613` |

**`skills/documentation-standards-validator/SKILL.md:25`** — check (3) is named and never
defined. Define it in the Mechanical checks section:

```markdown
**(3) Change Log header.** The document carries a `## Change Log` (or `### Change Log` for
PRDs, where it nests under §1) with the four canonical columns and at least one row, and
frontmatter `updated` is not older than the newest row's Date. Canonical format:
[document-change-log.md](../../shared/resources/document-change-log.md). Bug reports are
exempt — they carry `## Status History` instead.
```

Note this skill deliberately ships no linter (`:23`): each consuming repo implements the
checks itself. So the deliverable here is the *definition*, precise enough for a repo to
implement, not a script.

### Phase 5: Tests, bundle, manual verification

**`tests/skill-protocol.test.js`** — extend the existing sign-off config-gate test at `:232`,
which already asserts that four skills document their gate. Add its Change Log twin:

```js
for (const skill of ["review-story", "review-task", "review-epic", "review-prd"]) {
  test(`change-log — ${skill} documents the config gate and links the spec`, () => {
    const { content } = loadSkill(skill);
    assert.match(content, /change-log\.enabled/);
    assert.match(content, /change-log\.enforcement/);
    assert.match(content, /(shared\/resources|references)\/document-change-log\.md/);
    // advisory must be the documented default — a wrong default halts every
    // consumer pipeline at review, because the gate withholds the status promotion.
    assert.match(content, /advisory[^\n]*default|default[^\n]*advisory/i);
  });
}
```

**Manual verification** — the part that actually de-risks Phase 4:

```bash
# A task.43-era document: should report clean.
/review-task --validate docs/tasks/task.45.change-log-pipeline-and-sync/task.45.change-log-pipeline-and-sync.md

# A pre-task.43 document: should report ONE Important finding and still return GO.
/review-task --validate docs/tasks/task.22.finalise-dod-parallel-checks/task.22.finalise-dod-parallel-checks.md
```

The second is the one that matters. If it returns NO-GO, the default is wrong and every
consumer pipeline halts on its existing corpus.

Then:

```bash
npm run bundle
npm test
npm run eval:develop-story && npm run eval:develop-task   # step-isolation 02-review-* must stay green
npm run bundle && git diff --stat                          # empty
npm run generate-catalog                                   # if any description changed
```

## Key Patterns and References

- **`shared/resources/sign-off.md:141-170`** — the enforcement table and reviewer-output
  wording. This task is the same shape: a config-gated document section, seeded by `create-*`,
  graded advisory-by-default by `review-*`. Copy the structure rather than inventing one.
- **`tests/skill-protocol.test.js:232`** — the four-skill config-gate documentation test.
- **`shared/resources/review-pipeline-step-0a-branch-setup.md:12`** — already names "Change
  Log entries" among the review artifacts that must land on a feature branch, so the branch
  handling needs no change.
- **`skills/review-story/SKILL.md:2097`** — the one review skill that already writes a row;
  the others copy its placement, not its Author cell.
- **`shared/resources/tracker-card-summary.md:81`** — the standing claim that "the local file
  holds the authoritative log". Phase 1 is what makes that true on the GitHub path.

## Testing Approach

Order matters — Phase 4 is the risk, so verify it against a real legacy document before
touching anything else:

```bash
node --test tests/skill-protocol.test.js        # instructions exist and cite the spec
/review-task --validate <a pre-task.43 doc>     # Important + GO, never NO-GO
npm run eval:develop-story                       # step-isolation 02-review-story green
npm test
npm run bundle && git diff --stat
```

If the legacy-document check returns NO-GO under default config, stop and fix the default
before merging. Everything else in this task is additive and safe; that one line is not.
