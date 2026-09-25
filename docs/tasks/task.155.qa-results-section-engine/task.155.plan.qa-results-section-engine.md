---
id: task.155.plan
title: "Implementation Plan: QA Testing Results section — one write engine, one placement, refused when duplicated"
type: plan
task-ref: task.155.qa-results-section-engine.md
---

# Implementation Plan: QA Testing Results section engine

> Requirements and success criteria: [task.155.qa-results-section-engine.md](task.155.qa-results-section-engine.md)

## Overview

This adds a pure engine beside `change-log.js` that locates, replaces, relocates or creates the
`## QA Testing Results` section, and refuses a document that carries more than one. The two QA
skills' Step 12 write through it, and a corpus test holds the invariant.

## Phase-by-Phase Implementation Guide

### Phase 1: `shared/resources/qa-results.js`

Model the header comment on `change-log.js`: state the invariant, the reasons, and why the engine
refuses rather than guesses.

```js
"use strict";
const {
  protectedRanges,
  insideProtected,
  bodyStart,
  findChangeLog,
  ANCHORS,
} = require("./change-log.js");

const HEADING = "## QA Testing Results";
const RE_QA = /^## QA Testing Results[ \t]*$/gm;

function findQaResults(content) {
  const ranges = protectedRanges(content);
  const cl = findChangeLog(content); // { start, end, hasMarkers } | null
  const sections = [];
  for (const m of content.matchAll(RE_QA)) {
    if (m.index < bodyStart(content) || insideProtected(ranges, m.index)) continue;
    const insideChangeLog = !!(cl && cl.hasMarkers && m.index > cl.start && m.index < cl.end);
    // End: next unprotected heading of level <= 2 after the body, or the change-log
    // end marker when inside the block, whichever comes first.
    // Reuse the same end-scan shape as findChangeLog's hand-written branch.
    sections.push({ start: m.index, end: /* computed */ 0, insideChangeLog });
  }
  return { sections, changeLog: cl };
}

function upsertQaResults(content, section, { docType = "" } = {}) {
  if (!section.startsWith(HEADING)) return { content, reason: "bad-section" };
  const { sections, changeLog } = findQaResults(content);
  if (sections.length > 1) return { content, reason: "multiple", count: sections.length };
  // replaced | relocated | created — see the task's § 3 table
}

module.exports = { HEADING, findQaResults, upsertQaResults };
```

Canonical insertion point, in order:

1. `changeLog` found → insert at `changeLog.start`. When `hasMarkers` is true, that is the offset of
   `<!-- change-log-start -->`. Confirm this against `findMarkerBlock`'s return shape before relying
   on it.
2. else `ANCHORS[docType]` matches → insert before it.
3. else append, separated by one blank line.

Separate the inserted section with exactly one blank line on each side, and collapse runs of three
or more newlines at the seam. `change-log.js` has `trimSeam` for this; it is not exported, so either
export it or re-implement the one-line regex. Do not import private helpers by copying them in.

**Relocate** (one section, inside the change-log block): remove the span, then insert at the
canonical point computed on the **post-removal** text. That point is the block start, which the
removal did not move.

### Phase 2: Step 12 wiring

In `skills/qa-task/SKILL.md` § Step 12, add a fenced block after the template, following
`document-change-log.md` § *How a writer appends a row*:

```bash
command node -e '
  const fs = require("fs");
  const QR = require("./.agents/skills/qa-task/references/qa-results.js");
  const [file, sectionFile, docType] = process.argv.slice(1);
  const r = QR.upsertQaResults(fs.readFileSync(file, "utf8"),
                               fs.readFileSync(sectionFile, "utf8"), { docType });
  if (r.reason === "multiple" || r.reason === "bad-section") {
    console.error(`qa-results: ${r.reason}${r.count ? ` (${r.count} sections)` : ""} — ${file} not written`);
    process.exit(1);
  }
  fs.writeFileSync(file, r.content);
  console.log(`qa-results: ${r.reason}`);
' "$TASK_FILE" .claude/state/qa-results-section.md task
```

- The rendered section is written to `.claude/state/qa-results-section.md` first, so no shell quoting
  is applied to it.
- qa-story Step 12 item 3 uses the same block, with `qa-story` in the path and `story` or `task` as
  the docType.
- Reaching the bundle: follow `create-skill` § "A bundled copy nothing reaches is `UNREACHED`".
  Either cite `shared/resources/qa-results.js` in each SKILL.md, which the bundler rewrites to
  `references/`, or use the literal skill segment. Then `npm run bundle` and
  `npm run bundle:check`. `qa-results.js` requires `./change-log.js`, which both skills already
  ship; confirm `bundle-transitive.test.js` still passes.
- Check `tests/fenced-bash-positional-params.test.js` against the new block. It uses
  `process.argv`, not `$1`.

### Phase 3: corpus guard and task.65 repair

Survey command (the obs #117 definition; run it before and after the repair):

```bash
git ls-files 'docs/**/*.md' | xargs grep -l '^## QA Testing Results' | command node -e '
  const fs = require("fs");
  for (const f of require("fs").readFileSync(0, "utf8").trim().split("\n")) {
    const s = fs.readFileSync(f, "utf8");
    const n = (s.match(/^## QA Testing Results/gm) || []).length;
    const a = s.indexOf("<!-- change-log-start -->"), b = s.indexOf("<!-- change-log-end -->");
    const q = s.search(/^## QA Testing Results/m);
    if (n > 1 || (a >= 0 && q > a && q < b)) console.log(f, n);
  }'
```

- `tests/qa-results-corpus.test.js` (CommonJS, `node:test`) uses `findQaResults` from
  `shared/resources/qa-results.js`, not the regex above, so the guard and the engine share one
  definition of "a section". Assert `sections.length <= 1 && !sections[0]?.insideChangeLog` per
  file, plus a floor of at least 50 files scanned.
- task.65 repair: open each copy's **Gate File** link and keep the copy with the highest gate
  number. Delete the others with `upsertQaResults`? No: the engine refuses on `multiple` by design.
  Delete the stale copies by hand, naming each removed span in the implementation report, then run
  the survey to show zero.

## Key Patterns and References

- `shared/resources/report-lint.js` is the sibling-engine precedent: `require("./change-log.js")` for
  `fencedRanges`, with a header comment that states why.
- `change-log.js` `findChangeLog`: both the start scan and the end scan are fence-guarded
  (TASK-42-BUG-1). Mirror that for the QA section's end scan.
- Memory: run the executed Step 12 test from a consumer-shaped cwd. A gitignored `.agents/skills`
  symlink can mask a missing bundled copy locally.

## Testing Approach

- `command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js`, then `npm run ci:fast`.
- Mutation proofs, each from a `cp` snapshot:
  - drop the `insideProtected` guard → the fenced-heading test goes red;
  - make `multiple` write anyway → the multiple test goes red;
  - re-stack task.65 → the corpus test goes red;
  - remove the Step 12 call → the executed wiring test goes red.
