/**
 * `extractStoriesBreakdown` is fence-aware.
 *
 * This script keeps its own copy of the section extractor by design — it is
 * standalone, and importing the canonical helper would pull the whole Jira
 * client into a skill that does not otherwise use it. The copy previously
 * matched a regex whose `(?=\n## |\n# |$)` lookahead cannot tell a heading from
 * a shell comment, so a `#` at column 0 inside a fenced block silently ended the
 * section and the Stories Breakdown table was truncated or lost entirely.
 *
 * The copy survived the fix that landed everywhere else because nothing here was
 * tested — the script had no `require.main` guard and no exports, so it could not
 * be required at all. Both are why this file exists.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { extractStoriesBreakdown } = require("../scripts/jira-create-epic.js");

const TABLE = [
  "| Story | Title | Status |",
  "| ----- | ----- | ------ |",
  "| 1.1 | First | planned |",
  "| 1.2 | Second | planned |",
].join("\n");

// ---------------------------------------------------------------------------
// The defect this file exists for
// ---------------------------------------------------------------------------

test("a `# ` comment inside a fence does not end the section", () => {
  const body = [
    "## Stories Breakdown",
    "",
    "```bash",
    "# every story, by status",
    "grep -r status docs/",
    "```",
    "",
    TABLE,
    "",
    "## Next Section",
  ].join("\n");

  const out = extractStoriesBreakdown(body);
  assert.match(out, /1\.2 \| Second/, "the table was truncated by the comment");
});

test("a `## ` heading inside a fence does not end the section either", () => {
  const body = [
    "## Stories Breakdown",
    "",
    "```markdown",
    "## Not a real heading",
    "```",
    "",
    TABLE,
  ].join("\n");

  assert.match(extractStoriesBreakdown(body), /1\.1 \| First/);
});

test("a four-backtick span wrapping ``` does not invert fence parity", () => {
  // The trap that broke the first attempt at the canonical fix: toggling on any
  // backtick run opens a block here, and every later heading disappears.
  const body = [
    "## Stories Breakdown",
    "",
    "Write a fence as ```` ``` ````, like so.",
    "",
    TABLE,
  ].join("\n");

  assert.match(extractStoriesBreakdown(body), /1\.2 \| Second/);
});

// ---------------------------------------------------------------------------
// Behaviours carried over from the regex it replaced
// ---------------------------------------------------------------------------

test("the heading is line-anchored — `### Stories Breakdown` cannot win", () => {
  const body = ["### Stories Breakdown", "", TABLE].join("\n");
  assert.equal(extractStoriesBreakdown(body), null);
});

test("numbering in the heading is tolerated", () => {
  const body = ["## 5. Stories Breakdown", "", TABLE].join("\n");
  assert.match(extractStoriesBreakdown(body), /1\.1 \| First/);
});

test("a single newline after the heading still yields the table", () => {
  const body = ["## Stories Breakdown", TABLE].join("\n");
  assert.match(extractStoriesBreakdown(body), /1\.1 \| First/);
});

test("the section is cut at the first `### Story N.M` subsection", () => {
  // Those subsections hold per-story detail, and a line of their prose
  // containing a `|` would leak in as a bogus row.
  const body = [
    "## Stories Breakdown",
    "",
    TABLE,
    "",
    "### Story 1.1: First",
    "",
    "Prose with a | pipe | in it.",
  ].join("\n");

  const out = extractStoriesBreakdown(body);
  assert.match(out, /1\.1 \| First/);
  assert.doesNotMatch(out, /Prose with a/);
});

test("a `###` inside a fence does not cut the section early", () => {
  const body = [
    "## Stories Breakdown",
    "",
    "```markdown",
    "### Story 9.9: an example, not a real subsection",
    "```",
    "",
    TABLE,
  ].join("\n");

  assert.match(extractStoriesBreakdown(body), /1\.2 \| Second/);
});

test("the next `## ` heading ends the section", () => {
  const body = [
    "## Stories Breakdown",
    "",
    TABLE,
    "",
    "## Dependencies",
    "",
    "| Not | A | Story |",
  ].join("\n");

  const out = extractStoriesBreakdown(body);
  assert.match(out, /1\.1 \| First/);
  assert.doesNotMatch(out, /Not \| A \| Story/);
});

test("an absent section returns null rather than an empty string", () => {
  assert.equal(extractStoriesBreakdown("## Overview\n\nNothing here.\n"), null);
});

test("an unterminated fence runs to the end rather than throwing", () => {
  const body = ["## Stories Breakdown", "", "```bash", "# oops"].join("\n");
  assert.doesNotThrow(() => extractStoriesBreakdown(body));
});
