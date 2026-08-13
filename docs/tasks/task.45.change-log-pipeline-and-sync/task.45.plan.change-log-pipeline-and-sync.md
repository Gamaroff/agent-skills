---
id: task.45.plan
title: "Implementation Plan: Pipeline, QA, finalise, and tracker sync write the Change Log"
type: plan
task-ref: task.45.change-log-pipeline-and-sync.md
---

# Implementation Plan: Pipeline, QA, finalise, and tracker sync write the Change Log

> Requirements and success criteria: [task.45.change-log-pipeline-and-sync.md](task.45.change-log-pipeline-and-sync.md)

## Overview

Two halves. The first is prose: the pipeline step documents, `develop`, the QA skills and
`finalise` gain instructions to append a milestone row. The second is code: the three
`sync-jira-*` scripts move onto `change-log.js`, the marker pairs unify, and the per-update
row is dropped from all six sync skills.

Do the prose half first. It is low-risk, delivers most of the stakeholder value on its own,
and is the clean partial-rollback boundary if the sync rewiring goes wrong.

**Prerequisites**: task.42, task.43 and task.44, in that order.

## Phase-by-Phase Implementation Guide

### Phase 1: Pipeline step documents

Three files, none of which mentions a Change Log today. Each gets a short block naming the
row and pointing at the writer — the step documents describe the contract, the skills do the
writing. Duplicating the write in both places is how two writers append two rows.

**`shared/resources/develop-pipeline-step-3-develop-loop.md`** — on exiting the loop:

```markdown
### Change Log

On **exiting** the develop loop — not per iteration — `/develop` appends one row to the work
item recording what was implemented:

| 2026-05-14 |  | Implemented — 12 files, 34 tests | develop |

Leave `Version` blank; only `/finalise` bumps it. Per-iteration detail belongs in the
implementation report, which already records every loop pass. Format:
[document-change-log.md](document-change-log.md).
```

**`shared/resources/develop-pipeline-step-5-6-qa-loop.md`** — state that `qa-story` /
`qa-task` write the verdict row and `qa-fix` writes the fix row, one each per loop exit, and
that the step itself writes nothing.

**`shared/resources/develop-pipeline-step-7-finalise.md`** — state that `/finalise` writes
the accepted (or gaps) row, and that it is the only pipeline writer that bumps `Version`.

Note the link is `document-change-log.md`, not `shared/resources/document-change-log.md` —
these files are themselves in `shared/resources/`, and `bundle_skill.py` rewrites
sibling references transitively.

### Phase 2: `develop` and the QA skills

**`skills/develop/SKILL.md`** — three edits.

`:582` (story flow, step 13) currently reads "Update Change Log with date and summary of
changes" inside the per-task loop. Move it out of the loop and make it explicit:

```markdown
13. (After all tasks complete) Append ONE Change Log row summarising the implementation:
    `| {today} |  | Implemented — {N} files, {M} tests | develop |`
    Bump frontmatter `updated`. One row per develop run, not per task.
```

`:719` (task flow, step 11) — the same, and this is the one that currently points at nothing:
until task.43 the task template had no Change Log section. Name the section explicitly so an
agent working an older document knows what to look for.

`:509` and `:850` — confirm `Change Log` remains on the authorised-sections lists. It is
already there; the risk is a well-meaning edit removing it while tightening the list.

**`skills/qa-story/SKILL.md:1273-1330`** — this block writes `## QA Testing Results` and
`## QA Completion Summary` and sets frontmatter `status` per the gate. Add the row alongside:

```markdown
Append a Change Log row recording the gate decision, in the same edit:

| 2026-05-14 |  | QA gate CONCERNS (6/10) — 2 findings | qa-story |

The authorisation block at `:926` lists the sections this skill may write; add `Change Log`
to it. Do NOT write the gate `.yml` from here — that is `qa-gate`'s alone.
```

Adding to the authorisation list matters: that block is a hard constraint the skill checks
itself against, and a write outside it is an anti-pattern the QA skills police.

**`skills/qa-task/SKILL.md:720`** (Step 12) — identical treatment.

**`skills/qa-fix/SKILL.md:559`** — already writes a row. Normalise: canonical four columns,
Author `qa-fix`, one row per fix cycle exit rather than per finding, and the iteration count
in the Description (`QA findings fixed — gate PASS (9/10), 2 iterations`). Also update the
three loose references at `:502`, `:747`, `:1041` so they all describe the same single write.

**`skills/qa-gate/SKILL.md`** — no change. Confirm it still only writes the `.yml`.

### Phase 3: `finalise`

**`skills/finalise/SKILL.md:756`** (Step 7) currently sets `status: accepted`, `updated`,
`completed_date`, `pr_number` and appends `## Definition of Done - PASSED ✅`. Add to the
same edit:

```markdown
Append the acceptance row and bump the document's minor Version — this is the only pipeline
step that bumps Version:

| 2026-05-15 | 1.2 | DoD passed — accepted (PR #204) | finalise |
```

**`:1249`** (Step 8, gaps path — header at `:1200`) — status is deliberately unchanged there, so no Version bump:

```markdown
| 2026-05-15 |  | DoD incomplete — 3 gaps identified | finalise |
```

Step 7 also re-runs `sync-jira-{story,task}` at `:1005`, which appends its own row today.
After Phase 4 that sync writes a row only if it transitions the status — which at acceptance
it does. So an accepted document gets two rows: `DoD passed — accepted` from `finalise` and
`Status → done` from the sync. That is correct and worth stating in the step, because it
looks like a duplicate at a glance.

### Phase 4: Tracker sync

The code half. Start with the Jira scripts, since they are testable without network.

**The three call sites:**

```js
// skills/sync-jira-story/scripts/sync-jira-story.js:378   (epic :503, task :258)
// before:
content = lib.upsertChangelog(content, changeEntry);       // changeEntry = "| 2026-… | Updated: … |"

// after:
const CL = require("../references/change-log.js");
content = CL.upsertChangeLog(content, {
  date: today,
  description: `Jira story created (${key})`,   // or `Status → ${target}`
  author: "sync-jira-story",
}, { docType: "story" });
```

**The narrowing.** Today the row is written whenever the body hash changed. Replace that
condition with two explicit ones:

```js
// A row is written for exactly two events. Everything else — description edits,
// summary changes, link re-pointing, hash refreshes — is deliberately silent:
// both trackers keep a full issue history with actor and timestamp, and the
// document now records WHY the body changed via the review/develop/QA rows.
if (created)            → `${Tracker} ${type} created (${key})`
if (statusTransitioned) → `Status → ${targetStatus}`
```

Then delete the `skipChangelog` plumbing (`sync-jira-epic.js:887`) — it exists to suppress
the row on the no-op fast path, and with the new conditions that path writes nothing anyway.
Grep for the flag before deleting; confirm it is not read elsewhere.

**Migration must not run on the no-op path.** This is the subtle one. `migrateLegacyEntries()`
rewrites a legacy marker block into the canonical form — but if it runs unconditionally, every
sync rewrites the document, defeating the fast path and churning git history. That is the
exact defect `37bcf3f` fixed by making `hashBody` hash only what is published:

```js
// NO GUARD IS NEEDED, and `migrateLegacyMarkers` does not exist. Migration runs
// INSIDE upsertChangeLog (change-log.js:398-429). Simply do not call it unless a
// row is earned, and the no-op path can never migrate:
for (const entry of changeLogEntries) {          // empty on a no-op sync
  content = CL.upsertChangeLog(content, entry, { docType: "task" });
}
```

Assert it: two consecutive no-op syncs must produce zero file writes.

**Remove the task.42 wrappers.** With the three call sites moved, delete `upsertChangelog`,
`buildChangelogBlock`, `findHandWrittenChangelog` and `extractEntries` from `jira-sync.js`'s
export list at `:4045-4054` and their wrapper bodies. An orphaned shim is how the next reader
concludes there are two supported call styles.

**The three GitHub SKILL.md files** (`sync-github-story:213`, `sync-github-epic:216`,
`sync-github-task:180`) each embed a full format spec. Replace all three with:

```markdown
## Change Log

Append a row to the local document per
[document-change-log.md](../references/document-change-log.md). Write a row for exactly two
events — issue created, and status transition. A body or title update writes **no** row:
GitHub keeps its own issue history, and the document records why the body changed.

| 2026-08-12 |  | GitHub issue created (#204) | sync-github-story |
```

**The three `ensure-*-jira-issue` skills** carry a side-effect note to NARROW, not delete — under
the narrowed rules both the creation row and the status row still fire, so the note stays true.
The three `ensure-*-github-issue` siblings have no such note:
`ensure-story-jira-issue:102`, `ensure-task-jira-issue:96`, `ensure-epic-jira-issue:91` each
say the delegate "may also advance the status and append a Change Log entry" and float a
hypothetical `--no-status-transition` flag. Delete only that flag clause and reframe the rest as
documented, intended behaviour rather than a side effect to apologise for.

**`skills/develop-bug/SKILL.md`** — one line only, near its Status History writes at `:161`:
bugs use `## Status History`, not a Change Log; see the spec. No behaviour change.

### Phase 5: Tests and live verification

**`shared/resources/tests/change-log.test.mjs`** — extend with the sync rules:

```js
test("a body-only sync writes no row", () => { /* created=false, statusTransitioned=false */ });
test("issue creation writes exactly one row", () => { /* … */ });
test("a status transition writes exactly one row", () => { /* … */ });
test("both legacy marker pairs in one document collapse to a single block, date-ordered", () => {
  // The dual-sync case: a document synced to Jira AND GitHub grew two blocks.
  // Rows from both must survive, merged, in date order, under one marker pair.
});
test("migration does not fire when nothing else is being written", () => {
  // Guards the no-op fast path. If this fails, every sync rewrites every document.
});
```

**Eval scenarios.** `evals/develop-story/step-isolation/07-finalise` already ships a replay
fixture with a story at `accepted`
(`evals/develop-story/step-isolation/07-finalise/replay/.../story.5.1.example.md`). Extend
its assertions:

```json
{ "type": "fileMatches", "file": "…/story.5.1.example.md",
  "pattern": "\\| \\d{4}-\\d{2}-\\d{2} \\| [\\d.]+ \\| DoD passed[^|]*\\| finalise \\|" }
```

Do the same for `03-develop-loop` (implementation row) and `05-qa-story` (verdict row), and
their `develop-task` equivalents.

**Live verification** — the part no fixture covers:

```bash
# 1. Two consecutive no-op syncs: zero file writes, zero new rows.
node skills/sync-jira-task/scripts/sync-jira-task.js --file docs/tasks/task.42.../task.42....md
git diff --stat    # must be empty
node skills/sync-jira-task/scripts/sync-jira-task.js --file docs/tasks/task.42.../task.42....md
git diff --stat    # must be empty

# 2. Body change: still no row.
#    Edit the Overview, sync, confirm the description updated in Jira and the
#    Change Log gained nothing.

# 3. Status transition: exactly one row.
#    Move frontmatter status, sync, confirm one `Status → …` row.

# 4. Read-only card preflight still clean:
node skills/sync-jira-task/scripts/sync-jira-task.js --file <doc> --check-card
```

Record the outcome in the DoD — it is a success criterion, and it is the only evidence that
the narrowing works against a real tracker.

Then:

```bash
npm test
npm run eval:develop-story && npm run eval:develop-task
npm run bundle && git diff --stat    # empty
```

## Key Patterns and References

- **`shared/resources/jira-sync.js:772` `extractBodySections`** and the `hashBody` change in
  commit `37bcf3f` — the precedent for "hash and write only what actually changed". The
  migration guard is the same idea applied to markers.
- **`CHANGELOG.md:527`** — the four-cards-published-empty incident. Two subsystems disagreed
  about a heading contract and the sync reported `✅` each time. Any Change Log defect will
  fail the same silent way, which is why the live check is non-negotiable.
- **`skills/qa-story/SKILL.md:926`** — the authorisation block listing writable sections.
  `Change Log` must be added there, not just written.
- **`docs/reference/anti-patterns.md`** — dev skills must never write a gate file. The
  converse holds here: `qa-gate` must never write the document.
- **`shared/resources/tracker-card-summary.md:81`** — the reasoning for dropping sync churn,
  quoted almost verbatim into the narrowed rules.

## Testing Approach

Run in this order; each stage gates the next:

```bash
node --test shared/resources/tests/change-log.test.mjs      # narrowed rules + migration guard
node --test shared/resources/tests/jira-sync-*.test.mjs     # sync unchanged where it should be
npm run eval:develop-story && npm run eval:develop-task     # rows appear at the right steps
# live: two no-op syncs → zero writes; body change → no row; status change → one row
npm test
npm run bundle && git diff --stat
```

The migration guard test and the live no-op check are the two that matter. Everything else
in this task is additive prose; those two are the ones that can quietly rewrite every
document in a consumer repo on every sync.
