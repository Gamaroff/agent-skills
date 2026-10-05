"use strict";
/**
 * create-bug-report task mode checks for the Bug Reports heading it writes (task 171, obs #240).
 *
 * Step 5 used to check whether a `## Bug Reports` section existed and then write
 * `### Bug Reports`. The check never matched what the step itself wrote, so every
 * later filing opened a second list — the REL-020 shape task.155's engine had to fold.
 *
 * The test keys on the step's own heading (`### Step 5: Update Task File Bug Reports
 * Section`), not on the shared token `Bug Reports` (obs #135), extracts the heading
 * the "doesn't exist" check names and the heading the fenced write produces, and
 * asserts they are the same text at the same level.
 *
 * Run: node --test tests/create-bug-report-bug-reports-heading.test.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const test = require("node:test");

const SKILL = path.resolve(__dirname, "../skills/create-bug-report/SKILL.md");
const STEP = "### Step 5: Update Task File Bug Reports Section";

function step5() {
  const text = fs.readFileSync(SKILL, "utf8");
  const at = text.indexOf(`\n${STEP}\n`);
  assert.ok(at !== -1, `${STEP} is missing`);
  const rest = text.slice(at + STEP.length + 2);
  const lines = rest.split("\n");
  let fenced = false;
  const out = [];
  for (const line of lines) {
    if (/^```/.test(line)) fenced = !fenced;
    else if (!fenced && /^#{1,3} /.test(line)) break;
    out.push(line);
  }
  return out.join("\n");
}

test("Step 5's existence check names the heading Step 5 writes", () => {
  const body = step5();
  const check = /If a `(#{2,4} [^`]+)` (?:heading|section) doesn't exist/.exec(
    body,
  );
  assert.ok(check, "Step 5 states an existence check on a heading");
  const fence = /```markdown\n(#{2,4} [^\n]+)\n/.exec(body);
  assert.ok(fence, "Step 5 writes a heading in a fenced markdown block");
  assert.equal(
    check[1],
    fence[1],
    "the checked heading is the written heading",
  );
});

test("the written heading is one the QA engine carries", () => {
  const { upsertQaResults } = require("../shared/resources/qa-results.js");
  const heading = /```markdown\n(#{2,4} [^\n]+)\n/.exec(step5())[1];
  const list = `${heading}\n\n- [task.9.bug.1.a.md](./task.9.bug.1.a.md) - 🆕 New`;
  const doc = `---\ntype: task\n---\n\n# T\n\n## QA Testing Results\n\n**QA Status**: PASS\n\n${list}\n`;
  const r = upsertQaResults(
    doc,
    "## QA Testing Results\n\n**QA Status**: FAIL",
    {
      docType: "task",
    },
  );
  assert.equal(r.reason, "replaced");
  assert.ok(r.content.includes(list), "the list survives a QA write");
});
