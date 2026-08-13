// change-log.test.mjs — the document Change Log engine
//
// Each block below guards a defect class that was live before the engine was
// extracted from jira-sync.js, or that the extraction made newly reachable:
//
//   A — H3 headings.       `/^## Change Log/m` could not see the `### Change Log`
//                          that the epic and story templates emit, so a SECOND
//                          block was inserted at the top of the body.
//   B — block extent.      An H3 log ran to the next H2 and swallowed its siblings.
//   C — frontmatter.       A `description:` block scalar quoting `## Change Log`
//                          captured the insertion point (ported from
//                          jira-sync-publishing-fidelity.test.mjs).
//   D — legacy migration.  Two marker pairs, 2-column rows, dual-synced documents.
//   E — insertion anchors. "Before the first ##" put a log above the Epic Goal.
//   F — fenced examples.   A marker pair or heading inside a ``` block is a picture
//                          of a Change Log, not one. Documentation about this
//                          module is full of them.
//   G — bumpUpdated.       `updated` moves, `created` does not.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const CL = require("../change-log.js");

const ENTRY = {
  date: "2026-08-12",
  version: "",
  description: "Review passed",
  author: "review-epic",
};

// ---------------------------------------------------------------------------
// A — H3 headings are found and preserved
// ---------------------------------------------------------------------------

test("A: an H3 Change Log under a parent heading is updated in place, not duplicated", () => {
  const doc = [
    "# [Epic 3] Runbook wrappers",
    "",
    "## Epic Goal",
    "",
    "Ship the wrappers.",
    "",
    "## Notes & Updates",
    "",
    "### Change Log",
    "",
    "| Date | Version | Description | Author |",
    "|------|---------|-------------|--------|",
    "| 2026-05-11 | 1.0 | Initial draft | create-epic |",
    "",
    "### Open Questions",
    "",
    "- [ ] Who owns the satellites?",
    "",
  ].join("\n");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "epic" });

  assert.equal(
    out.match(/^#{2,3} Change Log$/gm).length,
    1,
    "must not add a second Change Log",
  );
  assert.match(out, /^### Change Log$/m, "heading level must be preserved");
  assert.ok(
    out.indexOf("## Epic Goal") < out.indexOf("Change Log"),
    "must not be inserted above Epic Goal",
  );
  assert.match(out, /^### Open Questions$/m, "sibling subsection must survive");
  assert.match(out, /\| 2026-05-11 \| 1\.0 \| Initial draft \| create-epic \|/);
  assert.match(out, /\| 2026-08-12 \|  \| Review passed \| review-epic \|/);
});

test("A: a numbered heading is found and its level preserved", () => {
  const doc = ["# PRD", "", "### 1.5 Change Log", "", "No rows yet.", ""].join("\n");
  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "prd" });

  assert.match(out, /^### Change Log$/m);
  assert.equal(out.match(/Change Log/g).length, 1);
});

test("A: an H2 log stays H2", () => {
  const doc = [
    "# Task",
    "",
    "## Change Log",
    "",
    "| Date | Version | Description | Author |",
    "|------|---------|-------------|--------|",
    "| 2026-05-11 | 1.0 | Initial draft | create-task |",
    "",
  ].join("\n");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });
  assert.match(out, /^## Change Log$/m);
  assert.doesNotMatch(out, /^### Change Log$/m);
});

test("A: 'Change Log Format' is not a Change Log heading", () => {
  const doc = ["# Doc", "", "## Change Log Format", "", "Prose.", ""].join("\n");
  assert.equal(CL.findChangeLog(doc), null);
});

// ---------------------------------------------------------------------------
// B — block extent stops at the same or shallower heading
// ---------------------------------------------------------------------------

test("B: an H3 log ends at the next H3, not the next H2", () => {
  const doc = [
    "## Notes & Updates",
    "",
    "### Change Log",
    "",
    "| 2026-05-11 |  | Initial | create-epic |",
    "",
    "### Sibling",
    "",
    "Kept.",
    "",
    "## Later H2",
    "",
    "Also kept.",
    "",
  ].join("\n");

  const found = CL.findChangeLog(doc);
  assert.equal(found.level, 3);
  assert.ok(
    doc.slice(found.start, found.end).indexOf("### Sibling") === -1,
    "block must not extend into the sibling subsection",
  );

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "epic" });
  assert.match(out, /^### Sibling$/m);
  assert.match(out, /^## Later H2$/m);
  assert.match(out, /Also kept\./);
});

// ---------------------------------------------------------------------------
// C — frontmatter is never the insertion point
// ---------------------------------------------------------------------------

test("C: a heading name quoted in frontmatter does not capture the changelog", () => {
  // The live shape: a `description:` value that mentions a heading. Before the
  // fix, `/^## /m` matched INSIDE the frontmatter block and the changelog was
  // written there — and the file still parsed as valid YAML, so nothing failed.
  const doc = [
    "---",
    "id: task.99",
    "description: >-",
    "  This card explains why",
    "  ## Change Log",
    "  matters to reviewers.",
    "---",
    "",
    "# Task 99",
    "",
    "## Progress Tracking",
    "",
    "- [ ] Phase 1",
    "",
  ].join("\n");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });
  const fmEnd = out.indexOf("\n---", 3);
  assert.ok(
    out.indexOf(CL.CL_START) > fmEnd,
    "changelog must land in the body, never inside frontmatter",
  );
  assert.match(out, /^description: >-$/m, "frontmatter must be intact");
});

// ---------------------------------------------------------------------------
// D — legacy marker pairs migrate in place
// ---------------------------------------------------------------------------

const legacyDoc = (start, end) =>
  [
    "# Story",
    "",
    start,
    "## Change Log",
    "",
    "| Date (UTC) | Change |",
    "|------------|--------|",
    "| 2026-04-28 09:40 | Initial Jira story created |",
    end,
    "",
    "## Dev Agent Record",
    "",
  ].join("\n");

test("D: a legacy jira-sync block is migrated in place, rows widened, no duplication", () => {
  const doc = legacyDoc(
    "<!-- jira-sync-changelog-start -->",
    "<!-- jira-sync-changelog-end -->",
  );
  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "story" });

  assert.equal(out.match(/Change Log/g).length, 1, "exactly one Change Log");
  assert.ok(!out.includes("jira-sync-changelog-start"), "legacy marker removed");
  assert.match(out, /<!-- change-log-start -->/);
  assert.match(
    out,
    /\| 2026-04-28 \|  \| Initial Jira story created \| sync-jira-story \|/,
    "row widened to 4 columns, HH:MM dropped, author inferred",
  );
});

test("D: a legacy github-sync block migrates the same way", () => {
  const doc = legacyDoc(
    "<!-- github-sync-changelog-start -->",
    "<!-- github-sync-changelog-end -->",
  );
  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "story" });

  assert.match(
    out,
    /\| 2026-04-28 \|  \| Initial Jira story created \| sync-github-story \|/,
  );
  assert.ok(!out.includes("github-sync-changelog-start"));
});

// Parameterised over BOTH document orderings. Testing only one is what let
// TASK-42-BUG-2 through: `findChangeLog` selected by LEGACY_MARKER_PAIRS array
// order rather than document position, so with github first, the github block was
// never examined and both blocks survived — while this test, built jira-first,
// stayed green.
const JIRA_BLOCK = [
  "<!-- jira-sync-changelog-start -->",
  "## Change Log",
  "",
  "| 2026-04-28 09:40 | Jira story created |",
  "<!-- jira-sync-changelog-end -->",
];
const GITHUB_BLOCK = [
  "<!-- github-sync-changelog-start -->",
  "## Change Log",
  "",
  "| 2026-03-01 12:00 | GitHub issue created |",
  "<!-- github-sync-changelog-end -->",
];

for (const [label, first, second] of [
  ["jira first", JIRA_BLOCK, GITHUB_BLOCK],
  ["github first", GITHUB_BLOCK, JIRA_BLOCK],
]) {
  test(`D: BOTH legacy pairs collapse to one block, rows in date order (${label})`, () => {
    const doc = [
      "# Story",
      "",
      ...first,
      "",
      "## Middle Section",
      "",
      ...second,
      "",
      "## Dev Agent Record",
      "",
    ].join("\n");

    const out = CL.upsertChangeLog(doc, ENTRY, { docType: "story" });

    assert.equal(
      out.match(/^#{2,3} Change Log$/gm).length,
      1,
      "collapses to exactly one block",
    );
    assert.ok(!out.includes("github-sync-changelog-start"), "github markers gone");
    assert.ok(!out.includes("jira-sync-changelog-start"), "jira markers gone");
    assert.ok(
      out.indexOf("GitHub issue created") < out.indexOf("Jira story created"),
      "merged rows ordered by date (2026-03-01 before 2026-04-28)",
    );
    assert.match(
      out,
      /\| 2026-03-01 \|  \| GitHub issue created \| sync-github-story \|/,
      "github row widened with inferred author",
    );
    assert.match(
      out,
      /\| 2026-04-28 \|  \| Jira story created \| sync-jira-story \|/,
      "jira row widened with inferred author",
    );
    assert.match(out, /^## Middle Section$/m, "unrelated section survives");
    assert.match(out, /^## Dev Agent Record$/m, "anchor section survives");
  });
}

test("D: an already-canonical 4-column row is never rewritten", () => {
  const row = "| 2026-05-11 | 1.0 | Initial draft | create-story |";
  assert.equal(
    CL.migrateLegacyEntries([row], { legacyAuthor: "sync-jira", docType: "story" })[0],
    row,
  );
});

// ---------------------------------------------------------------------------
// E — insertion anchors
// ---------------------------------------------------------------------------

for (const [docType, anchor] of [
  ["story", "## Dev Agent Record"],
  ["task", "## Progress Tracking"],
  ["epic", "## Notes & Updates"],
]) {
  test(`E: a ${docType} with no log gets one before ${anchor}`, () => {
    const doc = [
      "# Doc",
      "",
      "## Overview",
      "",
      "Body text.",
      "",
      anchor,
      "",
      "Tail.",
      "",
    ].join("\n");

    const out = CL.upsertChangeLog(doc, ENTRY, { docType });

    assert.ok(
      out.indexOf(CL.CL_START) < out.indexOf(anchor),
      "inserted before the anchor",
    );
    assert.ok(
      out.indexOf("## Overview") < out.indexOf(CL.CL_START),
      "NOT inserted at the top of the body",
    );
  });
}

test("E: an unknown docType appends at end of document", () => {
  const doc = ["# Doc", "", "## Overview", "", "Body.", ""].join("\n");
  const out = CL.upsertChangeLog(doc, ENTRY, {});

  assert.ok(
    out.indexOf("## Overview") < out.indexOf(CL.CL_START),
    "never inserted before the first ## — that is the defect being removed",
  );
  assert.ok(out.trimEnd().endsWith(CL.CL_END));
});

test("E: a missing anchor falls back to EOF rather than guessing", () => {
  const doc = ["# Story", "", "## Overview", "", "No Dev Agent Record here.", ""].join(
    "\n",
  );
  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "story" });
  assert.ok(out.trimEnd().endsWith(CL.CL_END));
});

test("E: existing rows are never reordered or rewritten", () => {
  const doc = [
    "## Change Log",
    "",
    "| Date | Version | Description | Author |",
    "|------|---------|-------------|--------|",
    "| 2026-05-11 | 1.0 | Initial draft | create-task |",
    "| 2026-01-02 | 1.1 | Out of order on purpose | review-task |",
    "",
  ].join("\n");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });
  const rows = out.split("\n").filter((l) => CL.isEntryRow(l));

  assert.match(rows[0], /Initial draft/);
  assert.match(rows[1], /Out of order on purpose/);
  assert.match(rows[2], /Review passed/, "new row appended last");
});

// ---------------------------------------------------------------------------
// F — fenced examples are not Change Logs
// ---------------------------------------------------------------------------

test("F: a fenced heading is ignored and the samples are left byte-identical", () => {
  const sample = [
    "```markdown",
    "## Change Log",
    "",
    "| Date | Version | Description | Author |",
    "|------|---------|-------------|--------|",
    "| 2026-05-11 | 1.0 | Initial draft | create-story |",
    "```",
  ].join("\n");

  const doc = [
    "# Task 42",
    "",
    "## Technical Background",
    "",
    "Target shape:",
    "",
    sample,
    "",
    "## Progress Tracking",
    "",
    "- [ ] Phase 1",
    "",
  ].join("\n");

  assert.equal(CL.findChangeLog(doc), null, "a fenced heading is not a section");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });
  assert.ok(out.includes(sample), "the fenced sample must survive byte-identical");
  assert.ok(
    out.indexOf(CL.CL_START) < out.indexOf("## Progress Tracking"),
    "the real block goes at the task anchor",
  );
});

test("F: a fenced LEGACY marker pair is not migrated", () => {
  // This is the shape that actually fires: task.42's own §3 carries a complete
  // fenced jira-sync block. The marker path is checked before the heading path,
  // so filtering only headings would leave this wide open.
  const sample = [
    "```markdown",
    "<!-- jira-sync-changelog-start -->",
    "## Change Log",
    "",
    "| Date (UTC) | Change |",
    "|------------|--------|",
    "| 2026-04-28 09:40 | Initial Jira story created |",
    "<!-- jira-sync-changelog-end -->",
    "```",
  ].join("\n");

  const doc = ["# Task 42", "", "## Background", "", sample, "", "## Progress Tracking", ""].join(
    "\n",
  );

  assert.equal(CL.findChangeLog(doc), null);

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });
  assert.ok(out.includes(sample), "fenced legacy sample untouched");
  assert.ok(
    out.includes("| 2026-04-28 09:40 | Initial Jira story created |"),
    "the illustrative row must NOT be widened",
  );
});

test("F: a fenced NEW marker pair is ignored too", () => {
  const sample = [
    "```markdown",
    "<!-- change-log-start -->",
    "## Change Log",
    "",
    "| 2026-05-11 | 1.0 | Initial draft | create-story |",
    "<!-- change-log-end -->",
    "```",
  ].join("\n");

  const doc = ["# Spec", "", "## Example", "", sample, "", "## Progress Tracking", ""].join(
    "\n",
  );

  assert.equal(CL.findChangeLog(doc), null);
  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });
  assert.ok(out.includes(sample));
});

test("F: a ~~~ fence is respected the same as a backtick fence", () => {
  const doc = [
    "# Doc",
    "",
    "~~~markdown",
    "## Change Log",
    "~~~",
    "",
    "## Progress Tracking",
    "",
  ].join("\n");

  assert.equal(CL.findChangeLog(doc), null);
});

test("F: a fenced example AND a real log — only the real one is updated", () => {
  const sample = ["```markdown", "## Change Log", "", "| 2020-01-01 |  | Example | x |", "```"].join(
    "\n",
  );

  const doc = [
    "# Task",
    "",
    "## Background",
    "",
    sample,
    "",
    "## Change Log",
    "",
    "| Date | Version | Description | Author |",
    "|------|---------|-------------|--------|",
    "| 2026-05-11 | 1.0 | Initial draft | create-task |",
    "",
  ].join("\n");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });

  assert.ok(out.includes(sample), "fenced example untouched");
  assert.ok(!out.includes("| 2020-01-01 |  | Example | x |\n| 2026-08-12"),
    "new row must not be appended into the example");
  assert.match(out, /\| 2026-05-11 \| 1\.0 \| Initial draft \| create-task \|/);
  assert.match(out, /\| 2026-08-12 \|  \| Review passed \| review-epic \|/);
});

test("F: a longer fence is not closed by a shorter one inside it", () => {
  const doc = [
    "# Doc",
    "",
    "````markdown",
    "```",
    "## Change Log",
    "```",
    "````",
    "",
    "## Progress Tracking",
    "",
  ].join("\n");

  assert.equal(
    CL.findChangeLog(doc),
    null,
    "the inner ``` must not close the outer ````",
  );
});

test("F: fencedRanges reports nothing for a document with no fences", () => {
  assert.deepEqual(CL.fencedRanges("# Doc\n\nJust prose.\n"), []);
});

test("F: markers NAMED in inline code spans are not a marker block", () => {
  // Found by running the engine against task.42's own document: the Phase 2
  // checklist names both markers in backticks, and unguarded that pair reads as a
  // complete block — so the whole bullet was replaced by a generated table.
  const bullet =
    "- [ ] Create `change-log.js` with `CL_START`/`CL_END` = `<!-- change-log-start -->` /\n" +
    "      `<!-- change-log-end -->` plus a `LEGACY_MARKER_PAIRS` table";

  const doc = ["# Task 42", "", "## Implementation Plan", "", bullet, "", "## Progress Tracking", ""].join(
    "\n",
  );

  assert.equal(CL.findChangeLog(doc), null, "inline-code mentions are not a block");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });
  assert.ok(out.includes(bullet), "the checklist bullet must survive byte-identical");
  assert.ok(
    out.indexOf(CL.CL_START + "\n## Change Log") < out.indexOf("## Progress Tracking"),
    "the real block still goes at the task anchor",
  );
});

test("F: a real unbackticked marker beside inline-code mentions is still found", () => {
  // The guard must not over-reach: prose naming the markers, followed by a genuine
  // block, must still resolve to the genuine block.
  const doc = [
    "# Doc",
    "",
    "The markers are `<!-- change-log-start -->` and `<!-- change-log-end -->`.",
    "",
    "<!-- change-log-start -->",
    "## Change Log",
    "",
    "| Date | Version | Description | Author |",
    "|------|---------|-------------|--------|",
    "| 2026-05-11 | 1.0 | Initial draft | create-task |",
    "<!-- change-log-end -->",
    "",
  ].join("\n");

  const found = CL.findChangeLog(doc);
  assert.ok(found, "the genuine block must be found");
  assert.ok(
    doc.slice(found.start).startsWith("<!-- change-log-start -->\n## Change Log"),
    "found the real block, not the prose mention",
  );

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });
  assert.match(out, /The markers are `<!-- change-log-start -->` and/, "prose intact");
  assert.equal(CL.extractEntries(out).length, 2);
});

test("F: inlineCodeRanges pairs equal-length backtick runs only", () => {
  const ranges = CL.inlineCodeRanges("a `one` b ``two`` c");
  assert.equal(ranges.length, 2);
});

test("F: a fenced heading INSIDE the Change Log does not end the block (TASK-42-BUG-1)", () => {
  // The start-scan was guarded but the end-scan was not, so the block ended at a
  // fenced `##`. On rewrite that consumed the opening fence, left an orphaned
  // closing fence (mis-pairing every later fence in the file), and stranded the
  // rows below it OUTSIDE the log, where the next write would not carry them.
  const doc = [
    "# Doc",
    "",
    "## Change Log",
    "",
    "| Date | Version | Description | Author |",
    "|------|---------|-------------|--------|",
    "| 2026-01-01 | 1.0 | First | create-task |",
    "",
    "```markdown",
    "## Example heading in a fence",
    "```",
    "",
    "| 2026-02-02 |  | Second | qa-task |",
    "",
  ].join("\n");

  assert.equal(CL.extractEntries(doc).length, 2, "both rows are inside the block");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });

  assert.equal(CL.extractEntries(out).length, 3, "both rows survive, plus the new one");
  assert.match(out, /\| 2026-02-02 \|  \| Second \| qa-task \|/, "row not stranded");
  assert.equal(
    (out.match(/^```/gm) || []).length % 2,
    0,
    "fences stay balanced — no orphaned closing fence",
  );
  assert.doesNotMatch(
    out,
    /^## Example heading in a fence$/m,
    "the fenced line is not promoted to a real heading",
  );

  // Residual, and correct: non-row content that sits INSIDE the section is not
  // preserved, because regenerating a block has always replaced everything
  // between its bounds with markers + heading + table. That is what a Change Log
  // section is. The defect was never "the fence is rewritten" — it was that the
  // block ENDED at the fence, which stranded the rows below it outside the log
  // and left the closing fence orphaned. Both are asserted above.
});

test("F: an H3 log with a fenced heading inside still ends at the next real sibling", () => {
  const doc = [
    "## Notes & Updates",
    "",
    "### Change Log",
    "",
    "| 2026-01-01 |  | First | create-epic |",
    "",
    "```markdown",
    "### Fenced sibling",
    "```",
    "",
    "| 2026-02-02 |  | Second | review-epic |",
    "",
    "### Real Sibling",
    "",
    "Kept.",
    "",
  ].join("\n");

  assert.equal(CL.extractEntries(doc).length, 2);
  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "epic" });
  assert.equal(CL.extractEntries(out).length, 3);
  assert.match(out, /^### Real Sibling$/m);
  assert.match(out, /Kept\./);
  assert.match(out, /^### Change Log$/m, "level preserved");
});

// A partially-migrated document: one block still legacy, one already current.
// Reachable during the task.43-45 rollout, when fourteen vendored copies of the
// engine may be of different vintages. Sweeping only the legacy pairs left the
// current block standing, so the document kept two Change Logs (TASK-42-BUG-3).
const CURRENT_BLOCK = [
  "<!-- change-log-start -->",
  "## Change Log",
  "",
  "| Date | Version | Description | Author |",
  "|------|---------|-------------|--------|",
  "| 2026-05-05 | 1.0 | Current row | create-story |",
  "<!-- change-log-end -->",
];

for (const [label, first, second] of [
  ["legacy first", JIRA_BLOCK, CURRENT_BLOCK],
  ["current first", CURRENT_BLOCK, JIRA_BLOCK],
]) {
  test(`D: a legacy block beside a CURRENT block collapses to one (${label}) — TASK-42-BUG-3`, () => {
    const doc = [
      "# Story",
      "",
      ...first,
      "",
      "## Middle",
      "",
      ...second,
      "",
      "## Dev Agent Record",
      "",
    ].join("\n");

    const out = CL.upsertChangeLog(doc, ENTRY, { docType: "story" });

    assert.equal(
      out.match(/^#{2,3} Change Log$/gm).length,
      1,
      "exactly one Change Log",
    );
    assert.equal(
      (out.match(/<!-- change-log-start -->/g) || []).length,
      1,
      "exactly one opening marker",
    );
    assert.ok(!out.includes("jira-sync-changelog-start"), "legacy markers gone");
    assert.equal(CL.extractEntries(out).length, 3, "all rows preserved");
    assert.match(out, /Jira story created/, "legacy row kept");
    assert.match(out, /Current row/, "already-canonical row kept");
    assert.match(out, /^## Middle$/m, "unrelated section survives");
  });
}

test("D: collapsing a block leaves no more than one blank line at the seam", () => {
  const doc = [
    "# Story",
    "",
    ...CURRENT_BLOCK,
    "",
    "## Middle",
    "",
    ...JIRA_BLOCK,
    "",
    "## Dev Agent Record",
    "",
  ].join("\n");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "story" });
  assert.doesNotMatch(out, /\n{3,}/, "no run of 3+ newlines anywhere in the output");
});

test("D: a 3-cell legacy row keeps all of its text", () => {
  // Neither legacy writer emitted 3 cells, so this only arises from a hand edit.
  // Widening must not silently drop the third cell.
  const [row] = CL.migrateLegacyEntries(["| 2026-01-01 | Desc | Extra |"], {
    legacyAuthor: "sync-jira",
    docType: "task",
  });
  assert.match(row, /Desc/);
  assert.match(row, /Extra/, "the third cell must not be dropped");
});

// ---------------------------------------------------------------------------
// G — bumpUpdated
// ---------------------------------------------------------------------------

test("G: bumpUpdated sets updated and leaves created alone", () => {
  const doc = [
    "---",
    "id: task.42",
    "created: 2026-01-01",
    "updated: 2026-01-01",
    "---",
    "",
    "# Task",
    "",
  ].join("\n");

  const out = CL.bumpUpdated(doc, "2026-08-12");
  assert.match(out, /^updated: 2026-08-12$/m);
  assert.match(out, /^created: 2026-01-01$/m, "created must not move");
});

test("G: bumpUpdated adds the key after created when absent", () => {
  const doc = ["---", "id: task.42", "created: 2026-01-01", "---", "", "# Task", ""].join(
    "\n",
  );
  const out = CL.bumpUpdated(doc, "2026-08-12");
  assert.match(out, /^created: 2026-01-01\nupdated: 2026-08-12$/m);
});

test("G: bumpUpdated leaves a document with no frontmatter unchanged", () => {
  const doc = "# Task\n\nNo frontmatter.\n";
  assert.equal(CL.bumpUpdated(doc, "2026-08-12"), doc);
});

test("G: bumpUpdated does not touch an `updated:` that appears in the body", () => {
  const doc = ["---", "id: t", "updated: 2026-01-01", "---", "", "updated: not-frontmatter", ""].join(
    "\n",
  );
  const out = CL.bumpUpdated(doc, "2026-08-12");
  assert.match(out, /^updated: not-frontmatter$/m, "body line untouched");
  assert.equal(out.match(/updated: 2026-08-12/g).length, 1);
});

// ---------------------------------------------------------------------------
// Round-trip / formatting
// ---------------------------------------------------------------------------

test("fmtEntry emits four cells with a blank version by default", () => {
  assert.equal(
    CL.fmtEntry({ date: "2026-08-12", description: "Thing happened", author: "finalise" }),
    "| 2026-08-12 |  | Thing happened | finalise |",
  );
});

test("extractEntries reads back exactly what upsertChangeLog wrote", () => {
  let doc = "# Task\n\n## Progress Tracking\n\n- [ ] Phase 1\n";
  doc = CL.upsertChangeLog(doc, { date: "2026-01-01", description: "One", author: "a" }, {
    docType: "task",
  });
  doc = CL.upsertChangeLog(doc, { date: "2026-02-02", description: "Two", author: "b" }, {
    docType: "task",
  });

  const entries = CL.extractEntries(doc);
  assert.equal(entries.length, 2);
  assert.match(entries[0], /One/);
  assert.match(entries[1], /Two/);
});

test("an unrelated four-column body table is not absorbed into the log", () => {
  const doc = [
    "# Task",
    "",
    "## Files Summary",
    "",
    "| File | Type | Owner | Notes |",
    "|------|------|-------|-------|",
    "| a.js | src  | me    | none  |",
    "",
    "## Progress Tracking",
    "",
  ].join("\n");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "task" });
  assert.match(out, /\| a\.js \| src  \| me    \| none  \|/, "table untouched");
  assert.equal(CL.extractEntries(out).length, 1, "only the new row is an entry");
});

// ---------------------------------------------------------------------------
// H — narrowed tracker-sync rules (task.45)
// ---------------------------------------------------------------------------
// The policy lives in `jira-sync.js`'s `buildChangeLogEntries`; the guarantee it
// buys lives here. The property under test throughout is that a sync which
// changes nothing writes nothing — including markers. Migration is a side effect
// of writing a row, so "no row" and "no rewrite" are the same statement.

const JS = require("../jira-sync.js");

const syncArgs = (over = {}) => ({
  created: false,
  issueKey: "PROJ-42",
  statusOutcome: null,
  author: "sync-jira-task",
  docNoun: "task",
  date: "2026-08-13",
  ...over,
});

test("H: a body-only sync writes no row", () => {
  // The single most important case. `transitioned: false` covers no-target,
  // already-in-target and no-available-transition alike — none is an event.
  const entries = JS.buildChangeLogEntries(
    syncArgs({ statusOutcome: { transitioned: false, reason: "no-target" } }),
  );
  assert.deepEqual(entries, [], "a body/summary/label update must earn no row");
});

test("H: issue creation writes exactly one row", () => {
  const entries = JS.buildChangeLogEntries(syncArgs({ created: true }));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].description, "Jira task created (PROJ-42)");
  assert.equal(entries[0].author, "sync-jira-task");
  assert.equal(entries[0].version, undefined, "sync rows never bump Version");
});

test("H: a status transition writes exactly one row naming the landed status", () => {
  const entries = JS.buildChangeLogEntries(
    syncArgs({ statusOutcome: { transitioned: true, to: "In Progress" } }),
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].description, "Status → In Progress");
});

test("H: create + transition in one run writes both rows, creation first", () => {
  const entries = JS.buildChangeLogEntries(
    syncArgs({ created: true, statusOutcome: { transitioned: true, to: "To Do" } }),
  );
  assert.equal(entries.length, 2);
  assert.match(entries[0].description, /created/);
  assert.match(entries[1].description, /Status →/);
});

test("H: a transition reporting no landed status writes no row", () => {
  // `transitioned` without `to` would render "Status → undefined". Guard it.
  const entries = JS.buildChangeLogEntries(
    syncArgs({ statusOutcome: { transitioned: true, to: null } }),
  );
  assert.deepEqual(entries, []);
});

test("H: migration does not fire when nothing else is being written", () => {
  // Guards the no-op fast path. If this fails, every sync rewrites every
  // document — the exact defect `37bcf3f` fixed for hashBody, reintroduced via
  // markers. The mechanism is structural: migration lives inside upsertChangeLog,
  // so an empty entry list means the document is never passed through it.
  const legacy = [
    "---",
    "id: task.1",
    "---",
    "",
    "# Task",
    "",
    "<!-- jira-sync-changelog-start -->",
    "## Change Log",
    "",
    "| Date (UTC) | Change |",
    "|------------|--------|",
    "| 2026-01-01 09:00 | Initial Jira task created |",
    "<!-- jira-sync-changelog-end -->",
    "",
    "## Progress Tracking",
    "",
  ].join("\n");

  const entries = JS.buildChangeLogEntries(syncArgs());
  assert.deepEqual(entries, [], "precondition: a no-op sync earns no entries");

  // Simulate the caller loop faithfully: no entries means no call at all.
  let out = legacy;
  for (const e of entries) out = CL.upsertChangeLog(out, e, { docType: "task" });

  assert.equal(out, legacy, "a no-op sync must leave the file byte-identical");
  assert.match(out, /jira-sync-changelog-start/, "legacy markers survive untouched");
});

test("H: migration DOES fire on the first sync that writes for another reason", () => {
  // The other half of the guarantee: deferring migration must not mean never.
  const legacy = [
    "---",
    "id: task.1",
    "---",
    "",
    "# Task",
    "",
    "<!-- jira-sync-changelog-start -->",
    "## Change Log",
    "",
    "| Date (UTC) | Change |",
    "|------------|--------|",
    "| 2026-01-01 09:00 | Initial Jira task created |",
    "<!-- jira-sync-changelog-end -->",
    "",
    "## Progress Tracking",
    "",
  ].join("\n");

  const entries = JS.buildChangeLogEntries(
    syncArgs({ statusOutcome: { transitioned: true, to: "Done" } }),
  );
  assert.equal(entries.length, 1);

  let out = legacy;
  for (const e of entries) out = CL.upsertChangeLog(out, e, { docType: "task" });

  assert.doesNotMatch(out, /jira-sync-changelog-start/, "legacy pair migrated away");
  assert.match(out, /<!-- change-log-start -->/, "canonical pair adopted");
  assert.match(out, /Initial Jira task created/, "historical row preserved");
  assert.match(out, /Status → Done/, "new row appended");
});

test("H: both legacy marker pairs in one document collapse to a single block", () => {
  // The dual-sync case: a document synced to Jira AND GitHub grew two blocks.
  const dual = [
    "# Task",
    "",
    "<!-- jira-sync-changelog-start -->",
    "## Change Log",
    "",
    "| Date (UTC) | Change |",
    "|------------|--------|",
    "| 2026-01-01 09:00 | Jira task created |",
    "<!-- jira-sync-changelog-end -->",
    "",
    "<!-- github-sync-changelog-start -->",
    "## Change Log",
    "",
    "| Date (UTC) | Change |",
    "|------------|--------|",
    "| 2026-02-02 10:00 | GitHub issue created |",
    "<!-- github-sync-changelog-end -->",
    "",
    "## Progress Tracking",
    "",
  ].join("\n");

  const out = CL.upsertChangeLog(
    dual,
    { date: "2026-08-13", description: "Status → Done", author: "sync-jira-task" },
    { docType: "task" },
  );

  assert.equal(
    (out.match(/## Change Log/g) || []).length,
    1,
    "exactly one Change Log heading must survive",
  );
  assert.doesNotMatch(out, /jira-sync-changelog-start/);
  assert.doesNotMatch(out, /github-sync-changelog-start/);
  // Neither history is discarded — losing rows is worse than never having had them.
  assert.match(out, /Jira task created/);
  assert.match(out, /GitHub issue created/);
  assert.match(out, /Status → Done/);
});
