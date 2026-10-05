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

test("every Bug Reports form a tracked document carries is one Step 5 counts as existing", () => {
  // Population, not recall: the forms come from the tracked tree. Step 5 used to check
  // only an H2; then only the H3 it writes — and missed the 18 H2 lists older filings
  // opened (task 171 QA cycle 2, CR2-1).
  const { execFileSync } = require("child_process");
  const files = execFileSync("git", ["ls-files", "-z", "--", "docs"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  })
    .split("\0")
    .filter((f) => f.endsWith(".md"));
  const forms = new Set();
  for (const f of files) {
    const text = fs.readFileSync(path.resolve(__dirname, "..", f), "utf8");
    for (const m of text.matchAll(
      /^(#{2,4} Bug Reports|\*\*Bug Reports\*\*)/gm,
    ))
      forms.add(m[1]);
  }
  assert.ok(forms.size >= 2, `scan-broken: only ${forms.size} forms found`);
  // Keyed on Step 5's own list line, not on the bare token: a history sentence that
  // merely mentions a form must not satisfy this.
  const list = /^Existing list forms[^:]*:(.*)$/m.exec(step5());
  assert.ok(list, "Step 5 states its existing list forms");
  const named = new Set([...list[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]));
  const written = /```markdown\n(#{2,4} [^\n]+)\n/.exec(step5())[1];
  assert.ok(
    named.has(written),
    "the written heading is one of the existing forms",
  );
  for (const form of forms) {
    assert.ok(named.has(form), `Step 5 does not count ${form} as existing`);
  }
});
