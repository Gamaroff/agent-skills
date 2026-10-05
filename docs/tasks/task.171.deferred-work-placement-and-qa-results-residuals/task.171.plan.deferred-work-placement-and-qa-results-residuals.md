---
id: task.171.plan
title: "Implementation Plan: Deferred Work placement and qa-results engine residuals"
type: plan
task-ref: task.171.deferred-work-placement-and-qa-results-residuals.md
---

# Implementation Plan: Deferred Work placement and qa-results engine residuals

> Requirements and success criteria: [task.171.deferred-work-placement-and-qa-results-residuals.md](task.171.deferred-work-placement-and-qa-results-residuals.md)

## Overview

This task fixes REL-030 at its source by giving the loop-exit Deferred Work record a home outside the
QA section. It then closes task.155's recorded residuals in `qa-results.js`. Each residual is closed
in one of two ways: the engine refuses the write and names the rule that fired, or it carries the
content precisely. Measure first: every new structural rule is run over the tracked corpus before it
is committed, and the bar is 0 false refusals.

## Phase-by-Phase Implementation Guide

### Phase 1: Deferred Work has one home

`shared/resources/develop-pipeline-step-5-6-qa-loop.md` currently says, at `:685` (route 2, On exit
step 4) and again at `:737` (route 2b, step 3):

> record the same ids on the work item under **Deferred Work**.

Add one subsection, for example `#### Where the Deferred Work record goes`, directly before the
route-2 *On exit* list, with this substance and one fenced `markdown` worked example of the record
(the test extracts it by this subsection's heading):

- The heading is `## Deferred Work` (an H2), and it is never placed inside `## QA Testing Results`.
  An H2 ends that section's span, so no QA write reaches the record.
- If the section is absent, create it immediately before the change-log block. With no change log,
  create it before `## Progress Tracking` (task) or `## Dev Agent Record` (story). With neither,
  create it at the end of the document.
- If the section is present, append the ids as list items. Do not open a second section.
- A legacy `### Deferred Work` already inside the QA section is left where it is; the engine
  carries it. New ids go to the H2.

Replace both existing sentences with "record the same ids on the work item (see **Where the Deferred
Work record goes**)". Do not restate the rule: two statements drift, and that is the enumeration class.

**Executed test (`tests/deferred-work-placement.test.js`).** Extract the placement rule's worked
example from the step doc, apply it to a fixture task document that has a QA section and a
change-log block, then run `upsertQaResults` three times. Assert that the `## Deferred Work` section
is byte-identical after each write. Without `npm run bundle`, the bundled copies drift, and
`bundle:check` catches that.

### Phase 2: engine residuals

**Measure first.** Before committing each new structural rule, run this over the tracked corpus:

```bash
command node -e '
const QR=require("./shared/resources/qa-results.js");const fs=require("fs");const {execFileSync}=require("child_process");
const files=execFileSync("git",["ls-files","docs/**/*.md"],{encoding:"utf8"}).trim().split("\n");
const sig=(t)=>[(t.match(/change-log-(start|end) -->/g)||[]).length,(t.match(/^\| \d{4}-\d\d-\d\d/gm)||[]).length,(t.match(/^#{1,2} /gm)||[]).length];
const tally={};let lost=0,idem=0;
for(const f of files){const s=fs.readFileSync(f,"utf8");if(!QR.findQaResults(s).sections.length)continue;
 const r=QR.upsertQaResults(s,"## QA Testing Results\n\nprobe",{docType:f.includes("/tasks/")?"task":"story"});const k=r.reason+(r.detail?":"+r.detail.split(":")[0]:"");tally[k]=(tally[k]||0)+1;
 const a=sig(s),b=sig(r.content);if(b.some((v,i)=>v<a[i]))lost++;
 if(r.content&&QR.upsertQaResults(r.content,"## QA Testing Results\n\nprobe",{docType:f.includes("/tasks/")?"task":"story"}).content!==r.content)idem++}
console.log({tally,lost,idem})'
```

Every row of the tally except `replaced` is a false refusal.

**1. `removesStructure` (REL-007/008, setext).** Extend `RE_STRUCTURAL`, or add a check beside it:

- a dated log row: `isEntryRow(line)` imported from `./change-log.js`. Do not restate
  `RE_ENTRY_ROW`;
- a setext H1/H2: a line matching `^ {0,3}(=+|-+)[ \t]*$` whose previous line is non-blank and not a
  table, list, quote or heading line. First repair task.118: its `### Key Findings` paragraph is
  followed directly by `---`, which makes it an accidental setext H2. Insert one blank line before
  the `---`. That was the only setext hit in task.155's corpus measurement.

Return the offending line in the refusal detail: `structural-line:<the line, trimmed, ≤ 60 chars>`.

**2. Carry.**

- REL-028: collect blocks for every name in `CARRIED_SUBSECTIONS`, sort them by start, and drop any
  block whose start lies inside an earlier kept block's span. Merge after that, per name.
- REL-025: in `collectBlocks`, end a block at the next unprotected heading whose level is at most the
  block heading's own level, as well as at the `RE_QA_FIELD` stop. Today it is any `^#{1,3}`.
- REL-027 and legacy REL-030: accept a bold label on its own line (`^\*\*(Bug Reports?|Deferred Work)\*\*:?\s*$`)
  and the singular `Bug Report` as a block start. A bold-label block ends at the next heading, or the
  next bold label line, or the next `RE_QA_FIELD` line.
- CR-4: when a later block folds into the first, keep its heading text as a bold line above its body.

**3. `trimSeparator` (REL-024).** Peel a trailing HTML comment block only when the text at `rawEnd`
is a change-log marker or a change-log heading (`RE_HEADING` or `RE_LOG_HEADING`). Otherwise the
comment is section content.

**4. CRLF.** Detect the document's line ending once:
`const EOL = /\r\n/.test(content) ? "\r\n" : "\n"`. Use it in `insertAt`, in the replace seam and in
`mergeCarried`'s joins. Normalise the rendered section to the document's line ending before writing.

**5. CR-5.** In `findQaResults`, a section whose start immediately follows a marker-less or
H2 `## Change Log` heading that sits directly above a marker block is `insideChangeLog: true`. This
is the shape `canonicalOffset` placed before REL-013 was fixed. Relocate it as usual.

**6. Detail (PR review 5 CR-1).** `normaliseSection` returns `{ body }` or `{ refuse: detail }`, and
`upsertQaResults` passes `detail` through on `bad-section`, `unbounded` and `multiple`. In both
SKILL.md Step 12 blocks, change the halt to print
`HALT qa-results: ${r.reason}${r.detail ? " (" + r.detail + ")" : ""}`. The repair hint stays as it
is.

**7. Cleanup.** Delete `linksIn` and `collectBlocks`' `end` field. Rename test N2 back to a plain
statement and assert that `### Bug Reports` precedes `### Deferred Work` (CR-3).

### Phase 3: create-bug-report heading check

`skills/create-bug-report/SKILL.md:291` reads:

> If a `## Bug Reports` section doesn't exist, add it in the QA & Quality Assurance section.

and `:294` writes `### Bug Reports`. Change the check to the written heading (`### Bug Reports`), and
also accept the `####` and bold forms the engine carries. A second filing then appends to the existing
list instead of opening a new one.

**Test (`tests/create-bug-report-bug-reports-heading.test.js`).** Read the task-mode Step 5 block. Extract the
heading named in the "doesn't exist" check and the heading in the fenced write, and assert they are
the same heading text and level. The test keys on the Step 5 heading `### Step 5: Update Task File Bug
Reports Section`, not on the shared token `Bug Reports` (obs #135).

## Key Patterns and References

- task.155's corpus and fault-injection scripts are recorded in its implementation report, QA cycles
  5–10. Reuse their shapes for the unit tests.
- Mutation proofs follow `references/mutation-proving.md`. Use a `cp` snapshot, revert, confirm red,
  restore. Record one proof per new assertion, as task.155's DoD AC8 required.
- `change-log.js`: reuse `isEntryRow`, `RE_HEADING`, `CL_START`/`CL_END`/`LEGACY_MARKER_PAIRS`.
  Do not restate their patterns.

## Testing Approach

- `command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js tests/deferred-work-placement.test.js tests/create-bug-report-bug-reports-heading.test.js`
- Run the measurement script above before and after each Phase 2 rule. The bar is 0 / 0 / 0.
- Run `npm run ci:fast` per iteration, and `npm run ci` once at merge.
