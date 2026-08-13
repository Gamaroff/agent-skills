/**
 * Fence-aware section extraction — the regression suite for the silent truncation.
 *
 * `sectionRe`'s lookahead `(?=\n## |\n# |$)` cannot tell a heading from a shell
 * comment, so a `# ` at column 0 inside a ```bash block ENDED the section there.
 * Everything after it vanished from the Jira description with no warning on
 * stderr and nothing in the output to show content had been dropped — the
 * document looked complete and the description looked deliberate.
 *
 * Measured on one card before the fix: a Technical Background cut from 13,965
 * characters to 2,283, discarding a dependency table and an open-questions block.
 * The workaround in the wild was indenting the comment two spaces, which is a
 * thing every author had to remember forever.
 *
 * The symptom is also indistinguishable from `CONTENT_LIMIT_EXCEEDED`, so the
 * first instinct is to blame document size and start deleting prose.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const { extractBodySections, extractSection, toRelativeDocLink } = require(
  join(__dirname, "..", "jira-sync.js"),
);

const body = (...lines) => lines.join("\n");

// ---------------------------------------------------------------------------
// The defect itself
// ---------------------------------------------------------------------------

test("a `# ` comment inside a fence does not end the section", () => {
  const doc = body(
    "## Technical Background",
    "before the fence",
    "",
    "```bash",
    "# every absolute URL, grouped by ref",
    "grep -rho 'https://example.test' docs/",
    "```",
    "",
    "after the fence",
    "",
    "## Scope",
    "scope body",
  );

  const [tb] = extractBodySections(doc, ["Technical Background"]);
  assert.match(tb.content, /before the fence/);
  assert.match(
    tb.content,
    /after the fence/,
    "content after the fence was dropped",
  );
  assert.doesNotMatch(tb.content, /scope body/, "swallowed the next section");
});

test("the sections after a fenced `# ` are still found", () => {
  // The truncation did not only shorten one section — every heading after the
  // fenced comment became unreachable, because the section that swallowed them
  // reported them as its own content.
  const doc = body(
    "## Overview",
    "```sh",
    "# a comment",
    "```",
    "",
    "## Scope",
    "scope body",
    "",
    "## Rollback Plan",
    "rollback body",
  );

  const found = extractBodySections(doc, [
    "Overview",
    "Scope",
    "Rollback Plan",
  ]);
  assert.deepEqual(
    found.map((s) => s.name),
    ["Overview", "Scope", "Rollback Plan"],
  );
  assert.equal(found[1].content, "scope body");
  assert.equal(found[2].content, "rollback body");
});

test("a `## ` heading inside a fence does not end the section either", () => {
  const doc = body(
    "## Overview",
    "real content",
    "```markdown",
    "## Not A Heading",
    "```",
    "trailing content",
    "",
    "## Scope",
    "scope body",
  );

  const [overview] = extractBodySections(doc, ["Overview"]);
  assert.match(overview.content, /trailing content/);
});

test("tilde fences are honoured, not only backticks", () => {
  const doc = body(
    "## Overview",
    "~~~bash",
    "# a comment",
    "~~~",
    "after",
    "",
    "## Scope",
    "scope body",
  );
  const [overview] = extractBodySections(doc, ["Overview"]);
  assert.match(overview.content, /after/);
});

test("an indented fence still opens a block", () => {
  // RE_FENCE allows leading whitespace, so a fence nested in a list item counts.
  const doc = body(
    "## Overview",
    "- item:",
    "  ```bash",
    "  # comment",
    "  ```",
    "after",
    "",
    "## Scope",
    "scope body",
  );
  const [overview] = extractBodySections(doc, ["Overview"]);
  assert.match(overview.content, /after/);
});

// ---------------------------------------------------------------------------
// Fence parity — the failure mode that arrives from the other direction
// ---------------------------------------------------------------------------
// Naive toggling on any ``` run breaks on a document that DOCUMENTS fences.
// Found by the "every real task card passes preflight" integration test, on a
// card explaining the change-log format; these pin it at the unit level.

test("a four-backtick span wrapping ``` does not open a block", () => {
  // The normal way to show a fence inside prose. Toggling here would invert the
  // parity for the rest of the document and hide every later heading.
  const doc = body(
    "## Overview",
    "Use a ```` ``` ```` or `~~~` fenced block.",
    "",
    "## Scope",
    "scope body",
    "",
    "## Rollback Plan",
    "rollback body",
  );

  const found = extractBodySections(doc, [
    "Overview",
    "Scope",
    "Rollback Plan",
  ]);
  assert.deepEqual(
    found.map((s) => s.name),
    ["Overview", "Scope", "Rollback Plan"],
    "later headings went missing — fence parity inverted",
  );
});

test("a shorter fence inside a longer one is content, not a close", () => {
  const doc = body(
    "## Overview",
    "````markdown",
    "```bash",
    "# still inside the outer fence",
    "```",
    "````",
    "after",
    "",
    "## Scope",
    "scope body",
  );
  const found = extractBodySections(doc, ["Overview", "Scope"]);
  assert.equal(found.length, 2);
  assert.match(found[0].content, /after/);
  assert.equal(found[1].content, "scope body");
});

test("a closing fence may not carry an info string", () => {
  // ```` ```js ```` mid-block opens nothing and closes nothing; only a bare run does.
  const doc = body(
    "## Overview",
    "```js",
    "// code",
    "```",
    "prose",
    "",
    "## Scope",
    "scope body",
  );
  const found = extractBodySections(doc, ["Overview", "Scope"]);
  assert.equal(found.length, 2, "the block never closed");
  assert.match(found[0].content, /prose/);
});

test("backtick and tilde fences do not close each other", () => {
  const doc = body(
    "## Overview",
    "```",
    "~~~",
    "# not a heading",
    "```",
    "after",
    "",
    "## Scope",
    "scope body",
  );
  const found = extractBodySections(doc, ["Overview", "Scope"]);
  assert.equal(found.length, 2);
  assert.equal(found[1].content, "scope body");
});

// ---------------------------------------------------------------------------
// Everything sectionRe already guaranteed must survive the rewrite
// ---------------------------------------------------------------------------

test("numbered headings are still tolerated", () => {
  const doc = body(
    "## 3. Technical Background",
    "content",
    "",
    "## 4. Scope",
    "s",
  );
  const [tb] = extractBodySections(doc, ["Technical Background"]);
  assert.equal(
    tb.name,
    "Technical Background",
    "canonical name, not the matched text",
  );
  assert.equal(tb.content, "content");
});

test("`### sub-headings` are preserved inside a section", () => {
  const doc = body(
    "## Overview",
    "intro",
    "### Detail",
    "detail body",
    "",
    "## Scope",
    "s",
  );
  const [overview] = extractBodySections(doc, ["Overview"]);
  assert.match(overview.content, /### Detail/);
  assert.match(overview.content, /detail body/);
});

test("a section running to end-of-document is captured whole", () => {
  const doc = body("## Overview", "first", "", "## Rollback Plan", "last line");
  const [rollback] = extractBodySections(doc, ["Rollback Plan"]);
  assert.equal(rollback.content, "last line");
});

test("an empty section is reported missing, not empty", () => {
  const doc = body("## Overview", "", "## Scope", "scope body");
  const found = extractBodySections(doc, ["Overview", "Scope"]);
  assert.deepEqual(
    found.map((s) => s.name),
    ["Scope"],
  );
});

test("a level-1 heading ends a section", () => {
  const doc = body("## Overview", "content", "", "# Appendix", "not overview");
  const [overview] = extractBodySections(doc, ["Overview"]);
  assert.equal(overview.content, "content");
});

test("a partial name does not match a longer heading", () => {
  const doc = body("## Scope Creep", "wrong", "", "## Scope", "right");
  const [scope] = extractBodySections(doc, ["Scope"]);
  assert.equal(scope.content, "right");
});

test("extractSection returns null for an absent heading", () => {
  assert.equal(extractSection("## Overview\nx", "Nonexistent"), null);
});

test("extractSection distinguishes absent from empty", () => {
  assert.equal(
    extractSection("## Overview\n\n## Scope\ns", "Overview").trim(),
    "",
  );
  assert.equal(extractSection("## Overview\n\n## Scope\ns", "Missing"), null);
});

test("an unterminated fence runs to the end rather than throwing", () => {
  const doc = body(
    "## Overview",
    "```bash",
    "# comment",
    "",
    "## Scope",
    "scope body",
  );
  assert.doesNotThrow(() => extractBodySections(doc, ["Overview", "Scope"]));
  const [overview] = extractBodySections(doc, ["Overview"]);
  assert.match(overview.content, /# comment/);
});

// ---------------------------------------------------------------------------
// toRelativeDocLink — the local-file counterpart of buildBitbucketUrl
// ---------------------------------------------------------------------------

test("a sibling file is linked with an explicit ./", () => {
  assert.equal(
    toRelativeDocLink(
      "/repo/docs/tasks/t.62/task.md",
      "/repo/docs/tasks/t.62/plan.md",
    ),
    "./plan.md",
  );
});

test("a file in another directory walks up", () => {
  assert.equal(
    toRelativeDocLink(
      "/repo/docs/prd/p/epics/e.1/stories/s.1.1/story.md",
      "/repo/docs/prd/p/epics/e.1/epic.md",
    ),
    "../../epic.md",
  );
});

test("linking a file to itself yields its own basename, not an empty href", () => {
  assert.equal(
    toRelativeDocLink("/repo/docs/a.md", "/repo/docs/a.md"),
    "./a.md",
  );
});

test("the result never starts with a bare word", () => {
  // A bare `task.62.md` is a valid relative link but reads like prose in a
  // markdown source; `./task.62.md` is unambiguous to a human skimming the diff.
  const rel = toRelativeDocLink("/repo/docs/a.md", "/repo/docs/sub/b.md");
  assert.ok(rel.startsWith("./"), `expected an explicit prefix, got ${rel}`);
  assert.equal(rel, "./sub/b.md");
});
