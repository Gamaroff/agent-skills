"use strict";
/**
 * Unit tests for section extraction in shared/resources/jira-sync.js.
 *
 * These exist because of a defect that shipped silently: `sectionRe` matched
 * `## Overview` but not `## 1. Overview`, while create-task's own template emits
 * the numbered form and create-task/scripts/lib.js requires it literally. Two
 * subsystems in this repo disagreed about the heading contract, so every task
 * card created the intended way published a Jira description with no body — and
 * nothing failed, warned, or was ever asserted.
 *
 * The load-bearing test is `the canonical create-task template extracts every
 * section`: it feeds the REAL template through the REAL section list. Every
 * pre-existing test used hand-written unnumbered fixtures, which is precisely
 * why none of them caught it. Keep at least one test wired to real artifacts.
 *
 * Run: node --test shared/resources/tests/jira-sync-sections.test.mjs
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

const { extractBodySections, sectionRe } = require(
  join(__dirname, "..", "jira-sync.js"),
);

// The headings create-task's template WRITES. This is deliberately the full
// list, not the shorter set the Jira card publishes: the contract under test is
// that `extractBodySections` can read every heading the template emits, and it
// is `sectionRe` — shared by both — that broke last time.
const TEMPLATE_SECTIONS = [
  "Overview",
  "Motivation",
  "Technical Background",
  "Scope",
  "Breaking Changes",
  "Implementation Plan",
  "Files Summary",
  "Testing Strategy",
  "Success Criteria",
  "Risk Assessment",
  "Rollback Plan",
];

const names = (sections) => sections.map((s) => s.name);

// ---------------------------------------------------------------------------
// The regression that motivated this file
// ---------------------------------------------------------------------------

test("the canonical create-task template extracts every section", () => {
  const template = readFileSync(
    join(repoRoot, "skills/create-task/resources/task-template.md"),
    "utf8",
  );

  // Guard the premise: if the template stops being numbered this test would
  // pass for the wrong reason and stop pinning the contract.
  assert.match(
    template,
    /^## 1\. Overview$/m,
    "template is expected to use numbered headings — if this changed, the contract this test pins has moved",
  );

  const got = extractBodySections(template, TEMPLATE_SECTIONS);
  assert.deepEqual(
    names(got),
    TEMPLATE_SECTIONS,
    "every section create-task writes must be one sync-jira-task can read",
  );
});

// The card publishes a SUBSET of the above. Pin it against the real exported
// list rather than a mirror — a hand-copied list is how the last contract
// mismatch went unnoticed across 28 task cards.
test("the create-task template resolves every section the CARD publishes", () => {
  const { TASK_CARD_SECTIONS } = require(
    join(repoRoot, "skills/sync-jira-task/scripts/sync-jira-task.js"),
  );
  const template = readFileSync(
    join(repoRoot, "skills/create-task/resources/task-template.md"),
    "utf8",
  );
  const required = TASK_CARD_SECTIONS.filter((s) => !s.optional);
  const got = extractBodySections(template, required.map((s) => s.names));
  assert.deepEqual(
    names(got),
    required.map((s) => s.names[0]),
    "a card section the template never writes would publish an empty card",
  );
});

test("numbered and unnumbered headings extract identically", () => {
  const numbered =
    "## 1. Overview\n\nbody one\n\n## 2. Motivation\n\nbody two\n";
  const plain = "## Overview\n\nbody one\n\n## Motivation\n\nbody two\n";

  assert.deepEqual(
    extractBodySections(numbered, ["Overview", "Motivation"]),
    extractBodySections(plain, ["Overview", "Motivation"]),
  );
});

test("the returned name is canonical, never the matched text", () => {
  // Callers re-emit `name` as the Jira heading and feed it to hashBody. If this
  // returned "1. Overview" instead, adding or removing numbering in a doc would
  // churn the body hash and force a no-op description PUT on the next sync.
  const got = extractBodySections("## 3. Technical Background\n\nx\n", [
    "Technical Background",
  ]);
  assert.deepEqual(names(got), ["Technical Background"]);
});

test("`1)` numbering is tolerated as well as `1.`", () => {
  assert.deepEqual(
    names(extractBodySections("## 1) Overview\n\nx\n", ["Overview"])),
    ["Overview"],
  );
});

// ---------------------------------------------------------------------------
// Line anchoring — a second live defect found while fixing the first
// ---------------------------------------------------------------------------

test("a deeper sub-heading cannot impersonate the section", () => {
  const body =
    "# Card\n\n## 4. Scope\n\nthe real scope\n\n### Scope\n\nnested detail\n";
  const [scope] = extractBodySections(body, ["Scope"]);

  assert.ok(scope, "the h2 section must be found");
  assert.match(
    scope.content,
    /^the real scope/,
    "must match the h2, not the nested h3",
  );
  assert.match(
    scope.content,
    /### Scope/,
    "nested sub-headings belong to the parent section and must be preserved",
  );
});

test("headings deeper than h2 are not sections", () => {
  assert.deepEqual(
    extractBodySections("#### Overview\n\nx\n", ["Overview"]),
    [],
  );
});

test("a `## ` sequence mid-sentence is not a heading", () => {
  assert.deepEqual(
    extractBodySections("see ## Overview\nfor details\n", ["Overview"]),
    [],
  );
});

test("a section at the very start of the body is found", () => {
  // The `(?:^|\n)` anchor must accept start-of-string, not only a preceding \n.
  assert.deepEqual(
    names(extractBodySections("## Overview\n\nx\n", ["Overview"])),
    ["Overview"],
  );
});

// ---------------------------------------------------------------------------
// Name matching must stay exact
// ---------------------------------------------------------------------------

test("a section name that prefixes another does not match it", () => {
  assert.deepEqual(
    extractBodySections("## Testing Strategy\n\nx\n", ["Testing"]),
    [],
  );
  assert.deepEqual(
    extractBodySections("## Out of Scope\n\nx\n", ["Scope"]),
    [],
  );
});

test("regex metacharacters in a section name are escaped", () => {
  assert.deepEqual(
    names(extractBodySections("## C++ (notes)\n\nx\n", ["C++ (notes)"])),
    ["C++ (notes)"],
  );
});

test("an empty section is omitted rather than returned blank", () => {
  assert.deepEqual(
    extractBodySections("## Overview\n\n## Motivation\n\nx\n", ["Overview"]),
    [],
  );
});

test("sectionRe has no `m` flag", () => {
  // With `m`, the trailing `$` in the lookahead would mean end-of-LINE and
  // truncate every section to its first line.
  assert.equal(sectionRe("Overview").flags.includes("m"), false);
  const [sec] = extractBodySections("## Overview\n\nline one\nline two\n", [
    "Overview",
  ]);
  assert.equal(sec.content, "line one\nline two");
});

// ---------------------------------------------------------------------------
// Warnings — the deeper fix. Silence is how the original defect survived.
// ---------------------------------------------------------------------------

function collectWarnings() {
  const warnings = [];
  return { output: { warn: (msg) => warnings.push(String(msg)) }, warnings };
}

test("no warning is emitted without an output handle", () => {
  // hashBody() extracts from the same body in the same run and must stay silent,
  // or every sync double-warns.
  assert.doesNotThrow(() =>
    extractBodySections("## Nothing\n\nx\n", ["Overview"]),
  );
});

test("a partially matched body names the sections it dropped", () => {
  const { output, warnings } = collectWarnings();
  extractBodySections("## Overview\n\nx\n", ["Overview", "Motivation"], output);

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Motivation/);
  assert.doesNotMatch(
    warnings[0],
    /Overview/,
    "found sections must not be reported as missing",
  );
});

test("a wholly unmatched body warns that the description will be empty", () => {
  const { output, warnings } = collectWarnings();
  extractBodySections(
    "## Something Else\n\nx\n",
    ["Overview", "Motivation"],
    output,
  );

  assert.equal(warnings.length, 1);
  assert.match(
    warnings[0],
    /no body/i,
    "the all-missing case is a heading-contract mismatch and must say so plainly",
  );
  assert.match(
    warnings[0],
    /Overview, Motivation/,
    "must list what it expected",
  );
});

test("a fully matched body warns about nothing", () => {
  const { output, warnings } = collectWarnings();
  extractBodySections(
    "## Overview\n\nx\n\n## Motivation\n\ny\n",
    ["Overview", "Motivation"],
    output,
  );
  assert.deepEqual(warnings, []);
});

// ---------------------------------------------------------------------------
// Assignee resolution — a placeholder must never reach the Jira API
// ---------------------------------------------------------------------------

const { resolveAssignee, isAssigneePlaceholder } = require(
  join(__dirname, "..", "jira-sync.js"),
);

const ACCOUNT = "712020:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

test("frontmatter assignee wins over the configured default", () => {
  assert.equal(resolveAssignee(ACCOUNT, "712020:other"), ACCOUNT);
});

test("the configured default is used when frontmatter has none", () => {
  assert.equal(resolveAssignee(undefined, ACCOUNT), ACCOUNT);
  assert.equal(resolveAssignee("", ACCOUNT), ACCOUNT);
  assert.equal(resolveAssignee(null, ACCOUNT), ACCOUNT);
});

test("with neither set, nothing is sent", () => {
  // "" means omit the field entirely — on an update that leaves Jira's existing
  // assignee alone, rather than clearing it.
  assert.equal(resolveAssignee(undefined, ""), "");
});

test("`assignee: TBD` is dropped and warned about, not sent", () => {
  // This exact value shipped in the task template. Passed through as an
  // accountId it returns a bare HTTP 400 with nothing naming the cause.
  const warnings = [];
  const got = resolveAssignee("TBD", "", { warn: m => warnings.push(String(m)) });

  assert.equal(got, "", "a placeholder must never be sent");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /TBD/);
  assert.match(warnings[0], /accountId/);
});

test("a placeholder in frontmatter falls through to the configured default", () => {
  assert.equal(resolveAssignee("TBD", ACCOUNT), ACCOUNT);
});

test("a placeholder configured as the default is also refused", () => {
  assert.equal(resolveAssignee(undefined, "unassigned"), "");
});

test("placeholders are matched case- and whitespace-insensitively", () => {
  for (const v of ["TBD", "tbd", "  Tbd  ", "N/A", "none", "unassigned", "-", "?"]) {
    assert.equal(isAssigneePlaceholder(v), true, `${JSON.stringify(v)} should be a placeholder`);
  }
  for (const v of [ACCOUNT, "5b10a2844c20165700ede21g", "alice"]) {
    assert.equal(isAssigneePlaceholder(v), false, `${JSON.stringify(v)} should not be`);
  }
});

test("no warning is emitted without an output handle", () => {
  assert.doesNotThrow(() => resolveAssignee("TBD", ""));
});
