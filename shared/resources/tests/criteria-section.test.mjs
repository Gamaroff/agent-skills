/**
 * criteria-section — the one criteria reader, held equal to jira-sync.js (task.248).
 *
 * criteria-section.js restates jira-sync.js extractSection's heading rule so
 * the boundary CLI does not vendor jira-sync.js's closure into every skill that
 * bundles probe-boundary-signals.mjs. This suite is what keeps the restatement
 * honest: over every task and story document in docs/, the two readers return
 * the same section, byte for byte.
 *
 * Run: node --test shared/resources/tests/criteria-section.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..", "..");
const require = createRequire(import.meta.url);
const cs = require("../criteria-section.js");
const { extractSection } = require("../jira-sync.js");

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/^(task|story)\.[0-9][^/]*\.md$/.test(e.name)) out.push(p);
  }
  return out;
}

test("criteriaSection equals jira-sync's Success-then-Acceptance read over every work item in docs/", () => {
  const docs = walk(join(REPO_ROOT, "docs"));
  let withSection = 0;
  const differ = [];
  for (const f of docs) {
    const body = readFileSync(f, "utf8");
    const want =
      extractSection(body, "Success Criteria") ??
      extractSection(body, "Acceptance Criteria");
    if (want !== null) withSection++;
    if (cs.criteriaSection(body) !== want)
      differ.push(f.slice(REPO_ROOT.length + 1));
  }
  assert.deepEqual(differ, []);
  // Non-vacuity: a walk that found nothing, or a reader that returns null for
  // everything, would pass the equality above.
  assert.ok(
    docs.length >= 200,
    `only ${docs.length} work items found under docs/`,
  );
  assert.ok(withSection >= 150, `only ${withSection} carry a criteria section`);
});

test("a fenced '## ' line does not end the section; a numbered heading starts it", () => {
  const body =
    "## 9. Success Criteria\n\n- [ ] One.\n\n```md\n## Not a heading\n```\n\n- [ ] Two.\n\n## 10. Next\n";
  const entries = cs.readCriteriaEntries(body);
  assert.deepEqual(
    entries.map((e) => e.line),
    ["One.", "Two."],
  );
});

test("continuation: indented lines up to the next criterion, heading or unindented line", () => {
  const body = [
    "## Success Criteria",
    "",
    "- [x] First.",
    "      *(note one,",
    "      continued.)*",
    "",
    "      *(second paragraph of the note.)*",
    "",
    "- [ ] Second.",
    "Unindented prose ends it.",
    "      not a continuation of Second",
    "### Sub",
    "1. Third, numbered.",
    "   its note",
  ].join("\n");
  const e = cs.readCriteriaEntries(body);
  assert.deepEqual(e, [
    {
      line: "First.",
      continuation: [
        "*(note one,",
        "continued.)*",
        "",
        "*(second paragraph of the note.)*",
      ],
    },
    { line: "Second.", continuation: [] },
    { line: "Third, numbered.", continuation: ["its note"] },
  ]);
  assert.equal(cs.readCriteriaEntries("# x\n\n## Overview\n"), null);
});
