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

test("D: a document with BOTH legacy pairs collapses to one block, rows in date order", () => {
  const doc = [
    "# Story",
    "",
    "<!-- jira-sync-changelog-start -->",
    "## Change Log",
    "",
    "| 2026-04-28 09:40 | Jira story created |",
    "<!-- jira-sync-changelog-end -->",
    "",
    "## Middle Section",
    "",
    "<!-- github-sync-changelog-start -->",
    "## Change Log",
    "",
    "| 2026-03-01 12:00 | GitHub issue created |",
    "<!-- github-sync-changelog-end -->",
    "",
    "## Dev Agent Record",
    "",
  ].join("\n");

  const out = CL.upsertChangeLog(doc, ENTRY, { docType: "story" });

  assert.equal(out.match(/Change Log/g).length, 1, "collapses to one block");
  assert.ok(!out.includes("github-sync-changelog-start"));
  assert.ok(!out.includes("jira-sync-changelog-start"));
  assert.ok(
    out.indexOf("GitHub issue created") < out.indexOf("Jira story created"),
    "merged rows are ordered by date (2026-03-01 before 2026-04-28)",
  );
  assert.match(out, /^## Middle Section$/m, "unrelated section survives");
});

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
