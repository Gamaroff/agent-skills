---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-12'
updated: '2026-09-12'
related: 'none — cross-cutting (change-log engine; every sync/QA/finalise writer that appends a Change Log row)'
description: "On the un-migrated (hasMarkers:false) path — the path every not-yet-migrated document takes on its first Change Log write — change-log.js regenerates the section from table rows alone, silently discarding prose and any nested ### subsection under the H2 heading."
---

**Bug ID**: bug.13
**Related**: none — cross-cutting (`shared/resources/change-log.js`; every writer that calls `upsertChangeLog` — the four `sync-jira-*`, four `sync-github-*`, `qa-*`, `finalise`, `develop`)
**Status**: 🆕 New
**Priority**: High
**Severity**: Major
**Created**: 2026-09-12
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: `upsertChangeLog` in `shared/resources/change-log.js` rebuilds the `## Change Log`
section from the rows it can parse plus any *other* line that starts with `|`. On a document whose
section has **no** `<!-- change-log-start/end -->` markers — which is every document that has not
yet been migrated, i.e. the state of every document on its **first** write — anything under the
heading that is not a pipe-line is dropped: an authoring note, a paragraph explaining a version bump,
and a nested `### …` subsection with its whole body.

**Expected Behavior**: the first write on an un-migrated document inserts the markers, appends the
row, and carries every other line of the section through unchanged. A machine writer's edit is
additive; it never deletes text a human wrote.

**Actual Behavior**: prose and nested `###` blocks inside the `## Change Log` span are discarded.
Table rows survive, the following `## Section` survives, so the loss is easy to miss — the document
still reads as well-formed.

**Impact**: silent, unrecoverable-by-the-writer content loss on a *documented* input. The spec
(`shared/resources/document-change-log.md`) says PRDs keep a nested `### Change Log` and readers
"accept H2 or H3 with optional numbering" — so nested `###` under an H2 log is within the input the
engine claims to handle. Because the migration is "additive and going-forward only", every legacy
document in a consumer repo hits this path exactly once, at a moment nobody is reading the diff (a
sync, a QA cycle, a finalise). First recorded in the 2026-09-07 handoff as carried follow-up 3a(1);
re-confirmed by execution on 2026-09-12; the engine has not been touched since 2026-08-17.

---

## Reproduction Steps

**Environment**: any; `command node` v26. Pure engine call, no tracker or network.

**Steps to Reproduce**:

1. Build a probe document: frontmatter, a `## Overview` section, then

   ```markdown
   ## Change Log

   AUTHORING NOTE prose.

   | Date | Version | Description | Author |
   | --- | --- | --- | --- |
   | 2026-09-01 | 1.0 | Initial | a |
   | 2026-09-02 | 1.1 | Edit | b |

   ### Nested

   Nested body.

   ## Next Section

   Next section body.
   ```

2. Run the engine:

   ```bash
   command node --input-type=module -e '
     import fs from "node:fs";
     const { upsertChangeLog } = await import("./shared/resources/change-log.js");
     const before = fs.readFileSync("probe.md", "utf8");
     const after = upsertChangeLog(before, { date: "2026-09-12", version: "1.2", description: "Probe append", author: "probe" }, { docType: "story" });
     fs.writeFileSync("after.md", after);
   '
   diff probe.md after.md
   ```

3. Observe the diff.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Test Output** (2026-09-12, `develop` @ `6ce3280e`):

```
findChangeLog => {"start":114,"end":422,"level":2,"hasMarkers":false}
LOST   AUTHORING NOTE prose
LOST   ### Nested heading
LOST   Nested body
KEPT   row 2026-09-01
KEPT   row 2026-09-02
KEPT   new row
KEPT   ## Next Section
KEPT   Next section body
```

```diff
9c9
<
---
> <!-- change-log-start -->
12,13d11
< AUTHORING NOTE prose.
<
17a16,17
> | 2026-09-12 | 1.2 | Probe append | probe |
> <!-- change-log-end -->
19,22d18
< ### Nested
<
< Nested body.
<
```

(Run 2026-09-12 from the recipe above, verbatim. The `| --- |` separator is also rewritten to
`|------|` style — cosmetic, expected.)

**Related Files**:

- `shared/resources/change-log.js` — `findChangeLog` (≈339-350) ends an H2 span at the next `#{1,2}`
  heading, so a nested `###` falls **inside** the span; `upsertChangeLog` (≈399-420, 460) regenerates
  the block from `isEntryRow` rows plus `unparsed` lines that start with `|` and nothing else.
- `shared/resources/tests/change-log.test.mjs` — the sibling-`###` cases (≈116-141, 716) all place
  the `###` *outside* the span (an H3 log followed by a sibling H3). No test asserts prose or a nested
  subsection survives a write. The "numbered heading" case (≈77) contains prose but asserts only on
  heading count.
- The source comment near `findChangeLog` describes a fix for a *related* case (an H3 log ending at
  the next `###` or `##`). That fix is real and does not cover this one. Do not read it as closing this.

---

## Scope & Impact

**Reference**: `shared/resources/document-change-log.md` (canonical spec — "readers accept H2 or H3
with optional numbering and preserve the level found"; migration is in place and additive).

**How It Failed**: the engine preserves the *heading level* it found but not the *content* under it.
Cross-cutting because the engine is shared by every machine writer and the input class is "every
document not yet migrated" — no single story or task owns the documents that will lose text.

---

## Recommendation

1. On the `hasMarkers:false` path, carry every non-row line of the span through verbatim, in its
   original position relative to the table (prose above stays above; a nested `###` block after the
   table stays after the new row and **inside** the markers, since the spec's marker pair delimits the
   whole section).
2. Add the missing test: a document with prose + table + nested `###` + following `##`, asserted
   line-by-line for presence after the write (both `hasMarkers:false` and, as a control, `true`).
3. Mutation-prove it: revert the fix and confirm the new test is the one that goes red — not a
   neighbour (obs #41).
4. Re-run the four `sync-jira-*` and four `sync-github-*` suites unchanged; they exercise the marked
   path and must not move.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)

**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:

- [file]

**Testing**: [How the fix was tested]

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date       | Status | Changed By        | Notes                                                                    |
| ---------- | ------ | ----------------- | ------------------------------------------------------------------------ |
| 2026-09-12 | New    | repo sweep (Claude) | Filed from the 2026-09-12 sweep; carried as handoff follow-up 3a(1) since 2026-09-07 |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
