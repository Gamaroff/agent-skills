"use strict";
/**
 * Unit tests for card summarisation in shared/resources/jira-sync.js.
 *
 * A tracker card is a POINTER to the document, not a copy of it. Before this,
 * the Jira task card published all ELEVEN `## ` sections of the task document
 * verbatim plus the document's entire Change Log, on every sync — descriptions
 * grew until Jira rejected the whole PUT with CONTENT_LIMIT_EXCEEDED, which
 * failed silently and left cards stale.
 *
 * The contract these tests pin, in order of how badly each would hurt if it
 * broke:
 *
 *   1. Trimming is ANNOUNCED and the count is accurate. A reader who is not
 *      told they are seeing part of something believes they saw all of it.
 *   2. Content under the cap is passed through untouched, with no "+N more"
 *      noise on a card that is already complete.
 *   3. A realistic full task document lands an order of magnitude under Jira's
 *      limit — the whole point of the change.
 *
 * Spec: shared/resources/tracker-card-summary.md
 * Run: node --test shared/resources/tests/jira-sync-card-summary.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const lib = require(join(__dirname, "..", "jira-sync.js"));

const {
  CARD_MAX_LIST_ITEMS,
  CARD_MAX_SENTENCES,
  dropHeadingLines,
  firstTableIn,
  splitSentences,
  summariseSection,
  summaryBlockNodes,
  buildCardSections,
  adfTextLength,
  JIRA_TEXT_LIMIT,
} = lib;

const DOC_URL = "https://bitbucket.org/o/r/src/main/doc.md";
const textOf = (nodes) => JSON.stringify(nodes);

// ---------------------------------------------------------------------------
// A — list capping
// ---------------------------------------------------------------------------

test("A: a criteria list is capped and the dropped count is exact", () => {
  const items = Array.from({ length: 12 }, (_, i) => `- AC${i + 1}`).join("\n");
  const { text, omitted, kind } = summariseSection(items);
  assert.equal(kind, "list");
  assert.equal(text.split("\n").length, CARD_MAX_LIST_ITEMS);
  assert.equal(omitted, 12 - CARD_MAX_LIST_ITEMS);
  assert.match(text, /- AC1$/m);
  assert.doesNotMatch(text, /AC6/);
});

test("A: a list at or under the cap is passed through whole, with nothing omitted", () => {
  const items = Array.from({ length: CARD_MAX_LIST_ITEMS }, (_, i) => `- AC${i + 1}`).join("\n");
  const { text, omitted } = summariseSection(items);
  assert.equal(text, items);
  assert.equal(omitted, 0);
});

test("A: checkbox and numbered lists count as lists", () => {
  for (const src of [
    Array.from({ length: 8 }, (_, i) => `- [ ] item ${i}`).join("\n"),
    Array.from({ length: 8 }, (_, i) => `${i + 1}. item ${i}`).join("\n"),
  ]) {
    const { kind, omitted } = summariseSection(src);
    assert.equal(kind, "list");
    assert.equal(omitted, 8 - CARD_MAX_LIST_ITEMS);
  }
});

// A wrapped or nested bullet belongs to the item above it. Counting it as its
// own item would both miscount `omitted` and orphan the continuation line.
test("A: continuation and nested lines stay attached to their item", () => {
  const src = [
    "- first",
    "  continues here",
    "  - nested detail",
    "- second",
    "- third",
  ].join("\n");
  const { text, omitted } = summariseSection(src, { maxItems: 2 });
  assert.equal(omitted, 1, "three top-level items, two kept");
  assert.match(text, /continues here/);
  assert.match(text, /nested detail/);
  assert.doesNotMatch(text, /third/);
});

// A criteria section that opens with a lead-in sentence is PROSE whose bullets
// are its detail. Capping it as a list would silently drop the lead-in — the
// one line that gives the bullets their meaning.
test("A: a section opening with prose is not treated as a list", () => {
  const { kind, text } = summariseSection(
    "The task is done when all of the following hold:\n\n- one\n- two\n",
  );
  assert.equal(kind, "prose");
  assert.match(text, /done when all of the following hold/);
});

// ---------------------------------------------------------------------------
// B — prose capping
// ---------------------------------------------------------------------------

test("B: prose is capped at the sentence limit and the remainder is counted", () => {
  const src = "One. Two. Three. Four. Five. Six.";
  const { text, omitted, kind } = summariseSection(src);
  assert.equal(kind, "prose");
  assert.equal(splitSentences(text).length, CARD_MAX_SENTENCES);
  assert.equal(omitted, 6 - CARD_MAX_SENTENCES);
  assert.doesNotMatch(text, /Five/);
});

test("B: short prose is passed through untouched with nothing omitted", () => {
  const { text, omitted } = summariseSection("A single short overview.");
  assert.equal(text, "A single short overview.");
  assert.equal(omitted, 0);
});

test("B: only the first paragraph is kept, and later paragraphs count as omitted", () => {
  const { text, omitted } = summariseSection("Lead para.\n\nSecond para.\n\nThird para.");
  assert.equal(text, "Lead para.");
  assert.equal(omitted, 2);
});

// A missed split yields a slightly longer summary; a wrong one cuts a sentence
// in half. Abbreviations and decimals must not terminate a sentence.
test("B: abbreviations and decimals do not split a sentence", () => {
  assert.equal(splitSentences("Use the cache, e.g. Redis, for reads.").length, 1);
  assert.equal(splitSentences("It takes 2.5 hours to run.").length, 1);
  assert.equal(splitSentences("First. Second.").length, 2);
});

// ---------------------------------------------------------------------------
// C — grouping sub-headings
// ---------------------------------------------------------------------------

// Both cases below are taken from real documents in this repo, and both were
// broken by the first attempt at this change, which cut a section at its first
// `###`. Real authors put the content the card wants UNDERNEATH a grouping
// heading, so cutting there deleted exactly the wanted part and kept the
// preamble. Fixtures written by hand would not have caught it — these are
// shaped after `task.38`'s Success Criteria and `epic.1`'s Stories Breakdown.

test("C: criteria grouped under sub-headings still reach the card", () => {
  const src = [
    "### Functional", "",
    "- [x] one", "- [x] two", "- [x] three", "- [x] four", "- [x] five", "- [x] six", "",
    "### Non-Functional", "",
    "- [ ] seven",
  ].join("\n");
  const { kind, text, omitted } = summariseSection(src);
  assert.equal(kind, "list", "a section opening with a grouping heading is still a list");
  assert.equal(text.split("\n").length, CARD_MAX_LIST_ITEMS);
  assert.equal(omitted, 2, "7 criteria across both groups, 5 kept");
  assert.match(text, /one/);
});

test("C: heading lines are dropped, their content kept", () => {
  const out = dropHeadingLines("### Group\n\n- item\n").join("\n");
  assert.doesNotMatch(out, /### Group/);
  assert.match(out, /- item/);
});

test("C: a `###` inside a fenced block is code, not a heading", () => {
  const out = dropHeadingLines("```md\n### sample\n```\n").join("\n");
  assert.match(out, /### sample/, "a fenced sample must survive verbatim");
});

test("C: firstTableIn finds a table nested under a sub-heading", () => {
  const src = [
    "**Guidelines:**", "",
    "- authoring note that is not card content", "",
    "### Stories Overview", "",
    "| Story | Status |", "| ----- | ------ |", "| 1.1 | Not Started |", "",
    "### [Story 1.1] Detail", "",
    "| a | b |",
  ].join("\n");
  const table = firstTableIn(src);
  assert.match(table, /\| Story \| Status \|/);
  assert.match(table, /1\.1 \| Not Started/);
  assert.doesNotMatch(table, /authoring note/);
  assert.doesNotMatch(table, /\| a \| b \|/, "only the FIRST table");
});

test("C: firstTableIn returns empty when there is no table", () => {
  assert.equal(firstTableIn("just prose\n\nand more"), "");
});

// ---------------------------------------------------------------------------
// D — the "+N more" pointer
// ---------------------------------------------------------------------------

test("D: trimming emits a pointer naming the count and linking the document", () => {
  const nodes = summaryBlockNodes({
    heading: "Acceptance Criteria",
    content: Array.from({ length: 9 }, (_, i) => `- AC${i + 1}`).join("\n"),
    sourceUrl: DOC_URL,
    docLabel: "the story document",
  });
  const json = textOf(nodes);
  assert.match(json, /\+4 more in /);
  assert.match(json, /the story document/);
  assert.match(json, new RegExp(DOC_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("D: nothing trimmed means no pointer at all", () => {
  const nodes = summaryBlockNodes({
    heading: "Acceptance Criteria",
    content: "- only one",
    sourceUrl: DOC_URL,
  });
  assert.doesNotMatch(textOf(nodes), /more in/);
});

test("D: with no source URL the pointer still states the count", () => {
  const nodes = summaryBlockNodes({
    heading: "X",
    content: Array.from({ length: 7 }, (_, i) => `- i${i}`).join("\n"),
    sourceUrl: null,
  });
  assert.match(textOf(nodes), /\+2 more in the full document/);
});

test("D: an absent or blank section yields no nodes, not an empty heading", () => {
  assert.deepEqual(summaryBlockNodes({ heading: "X", content: "" }), []);
  assert.deepEqual(summaryBlockNodes({ heading: "X", content: "   \n\n" }), []);
});

// ---------------------------------------------------------------------------
// E — buildCardSections
// ---------------------------------------------------------------------------

const SPECS = [
  { heading: "Summary", names: ["User Story", "Story", "Story Statement"] },
  { heading: "Acceptance Criteria", names: ["Acceptance Criteria"] },
];

const headingsOf = (nodes) =>
  nodes.filter((n) => n.type === "heading").map((n) => n.content[0].text);

// The heading is FIXED, not the matched text: a story using `## Story Statement`
// and one using `## User Story` must produce byte-identical cards, or the body
// hash churns and fires a PUT that changes nothing.
test("E: the emitted heading is the spec's, not the document's", () => {
  for (const h of ["User Story", "Story", "Story Statement"]) {
    const nodes = buildCardSections(`## ${h}\n\nAs a user I want X.\n`, SPECS);
    assert.deepEqual(headingsOf(nodes), ["Summary"]);
  }
});

test("E: numbering on a heading does not change the output", () => {
  assert.deepEqual(
    buildCardSections("## 2. Story\n\nbody.\n", SPECS),
    buildCardSections("## Story\n\nbody.\n", SPECS),
  );
});

test("E: an optional section neither renders nor warns when absent", () => {
  const warnings = [];
  const specs = [
    { heading: "Summary", names: ["Overview"] },
    { heading: "Breaking Changes", names: ["Breaking Changes"], optional: true },
  ];
  const nodes = buildCardSections("## Overview\n\nbody.\n", specs, {
    output: { warn: (m) => warnings.push(String(m)) },
  });
  assert.deepEqual(headingsOf(nodes), ["Summary"]);
  assert.deepEqual(warnings, [], "an optional section must never warn");
});

test("E: a missing REQUIRED section still warns", () => {
  const warnings = [];
  buildCardSections("## Overview\n\nbody.\n", [
    { heading: "Summary", names: ["Overview"] },
    { heading: "Success Criteria", names: ["Success Criteria"] },
  ], { output: { warn: (m) => warnings.push(String(m)) } });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Success Criteria/);
});

test("E: transform runs before summarisation", () => {
  const nodes = buildCardSections("## Overview\n\n**Label:** text.\n", [
    { heading: "Summary", names: ["Overview"], transform: (t) => t.replace(/\*\*([^*\n]+):\*\*/g, "$1:") },
  ]);
  const json = textOf(nodes);
  assert.doesNotMatch(json, /\*\*Label:\*\*/);
  assert.match(json, /Label:/);
});

// ---------------------------------------------------------------------------
// F — hashBody must hash what is PUBLISHED
// ---------------------------------------------------------------------------

// The card no longer carries most of the task document, so hashing the raw
// sections would make an edit to (say) the Rollback Plan flip the hash and fire
// a description PUT that changes nothing a reader can see.
test("F: a body hash tracks the card, not the document", () => {
  const { hashBody } = require(
    join(repoRoot, "skills/sync-jira-task/scripts/sync-jira-task.js"),
  );
  const base = "## Overview\n\nSummary text.\n\n## Success Criteria\n\n- one\n\n## Rollback Plan\n\nRevert.\n";
  const h = (body) => hashBody({ body, taskBbUrl: DOC_URL, relatedDocLinks: [], linkResolver: null });

  assert.equal(h(base), h(base), "identical input must hash identically");
  assert.equal(
    h(base),
    h(base.replace("Revert.", "Revert the commit, then redeploy and notify the team.")),
    "editing a section the card does not publish must not churn the hash",
  );
  assert.notEqual(
    h(base),
    h(base.replace("- one", "- one changed")),
    "editing a section the card DOES publish must still be detected",
  );
});

// ---------------------------------------------------------------------------
// G — the end-to-end size claim
// ---------------------------------------------------------------------------

// The reason the change exists. Fed the real create-task template, the card must
// land far under Jira's limit rather than creeping toward the wholesale-PUT
// rejection that `capDescriptionAdf` was written to catch.
test("G: the real create-task template produces a card an order of magnitude under Jira's limit", () => {
  const { buildDescriptionAdf, TASK_CARD_SECTIONS } = require(
    join(repoRoot, "skills/sync-jira-task/scripts/sync-jira-task.js"),
  );
  const template = readFileSync(
    join(repoRoot, "skills/create-task/resources/task-template.md"),
    "utf8",
  );

  const doc = buildDescriptionAdf({
    body: template,
    frontmatter: { category: "refactoring", status: "planned" },
    taskBbUrl: DOC_URL,
  });
  const size = adfTextLength(doc);

  assert.ok(size > 0, "the card must not be empty");
  assert.ok(
    size < JIRA_TEXT_LIMIT / 10,
    `card is ${size} chars — expected well under ${Math.floor(JIRA_TEXT_LIMIT / 10)}`,
  );
  // The eleven-section mirror is gone: at most Summary, Success Criteria,
  // Breaking Changes, Metadata, Source Documents.
  const headings = headingsOf(doc.content);
  assert.ok(headings.length <= 5, `too many blocks on the card: ${headings.join(", ")}`);
  assert.ok(!headings.includes("Change Log"), "the card must never carry a Change Log");
  for (const dropped of ["Motivation", "Implementation Plan", "Rollback Plan", "Risk Assessment"]) {
    assert.ok(!headings.includes(dropped), `${dropped} belongs in the document, not the card`);
  }
  assert.equal(TASK_CARD_SECTIONS.length, 3);
});
