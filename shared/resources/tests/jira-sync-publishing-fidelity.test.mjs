"use strict";
/**
 * Unit tests for the four publishing-fidelity defects closed in
 * shared/resources/jira-sync.js (rebirth-wallet task.33 / RAPP-575).
 *
 * Every one of them FAILED SILENTLY. That is the property under test here, and
 * it is why each test asserts on observable output rather than on "no throw":
 * a defect that neither throws nor warns is indistinguishable from success, so
 * "it didn't crash" would have passed against every one of these bugs.
 *
 *   A  section aliases       — the list named `User Story`; 98% of stories use
 *                              `Story` or `Story Statement`, so their bodies
 *                              published as nothing and the sync said ✅
 *   B  description size cap  — over ~32,767 chars Jira rejects the whole PUT and
 *                              the issue silently keeps its OLD description
 *   C  changelog placement   — the insert point was found by scanning the whole
 *                              file, so a heading name quoted in frontmatter
 *                              captured it and the changelog was written INTO
 *                              the YAML, which still parsed
 *   E  frontmatter quoting   — hardcoded double quotes made every synced doc
 *                              prettier-dirty in a `singleQuote: true` repo
 *
 * Run: node --test shared/resources/tests/jira-sync-publishing-fidelity.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const lib = require(join(__dirname, "..", "jira-sync.js"));

const {
  extractBodySections,
  capDescriptionAdf,
  adfTextLength,
  upsertChangelog,
  formatYamlScalar,
  adf,
  JIRA_TEXT_LIMIT,
} = lib;

// ---------------------------------------------------------------------------
// A — section aliases
// ---------------------------------------------------------------------------

// The REAL card section list, not a mirror of it — a hand-copied list drifts
// from the thing it claims to pin, which is the defect class this file exists
// to catch.
const STORY_SECTIONS = require(
  join(repoRoot, "skills/sync-jira-story/scripts/sync-jira-story.js"),
).STORY_CARD_SECTIONS.map((s) => s.names);

const withHeading = (h) =>
  `# Story 1.1\n\n## ${h}\n\nAs a user I want a thing.\n\n## Acceptance Criteria\n\n- it works\n`;

for (const heading of ["User Story", "Story", "Story Statement"]) {
  test(`A: '## ${heading}' resolves via the alias list`, () => {
    const out = extractBodySections(withHeading(heading), STORY_SECTIONS);
    const names = out.map((s) => s.name);
    assert.ok(
      names.includes("User Story"),
      `'${heading}' did not resolve; got sections: ${JSON.stringify(names)}`,
    );
    assert.equal(
      out.find((s) => s.name === "User Story").content,
      "As a user I want a thing.",
    );
    // The regression this guards: the story body vanishing while AC survives,
    // which looked like a correctly-synced story with a thin description.
    assert.equal(names.length, 2, "acceptance criteria should still resolve");
  });
}

test("A: the emitted name is CANONICAL, so switching spellings does not churn hashBody", () => {
  const a = extractBodySections(withHeading("Story"), STORY_SECTIONS);
  const b = extractBodySections(withHeading("Story Statement"), STORY_SECTIONS);
  assert.deepEqual(
    a.map((s) => s.name),
    b.map((s) => s.name),
    "different accepted spellings must yield identical section names",
  );
});

test("A: numbering is still tolerated on an aliased heading", () => {
  const out = extractBodySections(
    "## 2. Story Statement\n\nbody text\n",
    STORY_SECTIONS,
  );
  assert.equal(out[0].name, "User Story");
  assert.equal(out[0].content, "body text");
});

test("A: a genuinely absent section warns naming EVERY accepted spelling", () => {
  const warnings = [];
  extractBodySections("## Nothing Here\n\nx\n", STORY_SECTIONS, {
    warn: (m) => warnings.push(m),
  });
  const joined = warnings.join("\n");
  // Reporting only the canonical name would send a reader off to rename a
  // heading that was already acceptable under a different alias.
  for (const alt of ["User Story", "Story Statement"]) {
    assert.ok(joined.includes(alt), `warning should mention '${alt}'`);
  }
});

// ---------------------------------------------------------------------------
// B — description size cap
// ---------------------------------------------------------------------------

const bigDoc = (blocks, perBlock) =>
  adf.doc(
    ...Array.from({ length: blocks }, () =>
      adf.paragraph(adf.text("x".repeat(perBlock))),
    ),
  );

test("B: a document under the limit is returned untouched", () => {
  const doc = bigDoc(3, 100);
  const out = capDescriptionAdf(doc, { limit: 10000 });
  assert.deepEqual(out, doc);
});

test("B: an oversized document is trimmed to fit and says so", () => {
  const doc = bigDoc(40, 1000); // 40,000 chars — over the real Jira limit
  const warnings = [];
  const out = capDescriptionAdf(doc, {
    sourceUrl: "https://example.invalid/doc.md",
    output: { warn: (m) => warnings.push(m) },
  });

  assert.ok(
    adfTextLength(out) < JIRA_TEXT_LIMIT,
    `capped doc is ${adfTextLength(out)}, still over ${JIRA_TEXT_LIMIT}`,
  );
  assert.ok(
    out.content.length < doc.content.length,
    "blocks should be dropped",
  );

  // Announced in the published description...
  const notice = JSON.stringify(out.content[out.content.length - 1]);
  assert.match(notice, /Truncated/);
  assert.match(notice, /example\.invalid/);
  // ...AND on stderr. Silent truncation would be the same defect class as the
  // silent failure it replaces.
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /over Jira's/);
});

test("B: trimming drops WHOLE blocks — never a half-emitted one", () => {
  const doc = bigDoc(40, 1000);
  const out = capDescriptionAdf(doc, {});
  // Every retained block bar the appended notice must be byte-identical to an
  // original. A sliced block would be structurally invalid ADF and rejected for
  // a different, even less obvious reason.
  for (const block of out.content.slice(0, -1)) {
    assert.ok(
      doc.content.some((o) => JSON.stringify(o) === JSON.stringify(block)),
      "retained block was modified rather than kept whole",
    );
  }
});

// ---------------------------------------------------------------------------
// C — changelog must never land inside frontmatter
// ---------------------------------------------------------------------------

// Four columns since the changelog moved to `change-log.js` (task.42). The engine
// widens a legacy 2-column row on read, so the old fixture would still have been
// accepted — this is the canonical shape it is widened *to*.
const ROW = "| 2026-07-31 |  | Updated: description | sync-jira-story |";

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
    "  is a heading name.",
    "---",
    "",
    "# Task 99",
    "",
    "## Overview",
    "",
    "text",
    "",
  ].join("\n");

  const out = upsertChangelog(doc, ROW);
  const fmEnd = out.indexOf("\n---", 3);
  const frontmatter = out.slice(0, fmEnd);

  assert.ok(
    !frontmatter.includes(ROW),
    "changelog row was written INTO the frontmatter block",
  );
  assert.ok(out.includes(ROW), "changelog row should still be added somewhere");
  assert.ok(
    out.indexOf(ROW) > fmEnd,
    "changelog must land in the body, after frontmatter",
  );
});

// These two previously asserted "the changelog precedes the first level-2 body
// heading". That WAS the defect: inserting before the first `##` is how a Change
// Log ended up above the Epic Goal, at the top of the document body. Task.42's
// Breaking Change 2 replaces that fallback with a doc-type anchor, falling back to
// end-of-document. `upsertChangelog` (the legacy shim) passes no docType, so these
// documents take the EOF path — which is the point: an unknown doc type appends
// somewhere harmless instead of guessing the top.

test("C: a document with no anchor gets the changelog appended at EOF, never at the top", () => {
  const doc = "---\nid: task.1\n---\n\n# Task 1\n\n## Overview\n\ntext\n";
  const out = upsertChangelog(doc, ROW);
  assert.ok(out.includes(ROW));
  assert.ok(
    out.indexOf(ROW) > out.indexOf("## Overview"),
    "changelog must NOT be inserted above the first body heading",
  );
  assert.ok(out.trimEnd().endsWith("<!-- change-log-end -->"));
});

test("C: a document with no frontmatter is unaffected", () => {
  const out = upsertChangelog("# Task\n\n## Overview\n\ntext\n", ROW);
  assert.ok(out.includes(ROW));
  assert.ok(out.indexOf(ROW) > out.indexOf("## Overview"));
});

// ---------------------------------------------------------------------------
// E — frontmatter quote style follows the consuming repo's Prettier config
// ---------------------------------------------------------------------------

test("E: singleQuote repos get single-quoted scalars", () => {
  const prev = process.env.JIRA_SYNC_QUOTE_STYLE;
  process.env.JIRA_SYNC_QUOTE_STYLE = "single";
  try {
    assert.equal(formatYamlScalar("RAPP-573"), "'RAPP-573'");
    assert.equal(formatYamlScalar(["a", "b"]), "['a', 'b']");
    // YAML escapes an embedded single quote by DOUBLING it — a backslash is
    // literal inside single quotes and would corrupt the value.
    assert.equal(formatYamlScalar("it's"), "'it''s'");
  } finally {
    if (prev === undefined) delete process.env.JIRA_SYNC_QUOTE_STYLE;
    else process.env.JIRA_SYNC_QUOTE_STYLE = prev;
  }
});

test("E: default stays double-quoted, matching Prettier's own default", () => {
  const prev = process.env.JIRA_SYNC_QUOTE_STYLE;
  process.env.JIRA_SYNC_QUOTE_STYLE = "double";
  try {
    assert.equal(formatYamlScalar("RAPP-573"), '"RAPP-573"');
    assert.equal(formatYamlScalar('say "hi"'), '"say \\"hi\\""');
  } finally {
    if (prev === undefined) delete process.env.JIRA_SYNC_QUOTE_STYLE;
    else process.env.JIRA_SYNC_QUOTE_STYLE = prev;
  }
});

test("E: numbers and booleans are never quoted", () => {
  assert.equal(formatYamlScalar(8), "8");
  assert.equal(formatYamlScalar(true), "true");
});
