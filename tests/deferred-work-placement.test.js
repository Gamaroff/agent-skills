"use strict";
/**
 * The loop-exit Deferred Work record has one home, and QA writes cannot reach it (task 171).
 *
 * Routes 2 and 2b of the develop pipelines' QA loop record the ids they carried "on the
 * work item". Until task 171 nothing said where, so a record could land inside
 * `## QA Testing Results`, where the next Step 12 replace deletes it (task.155 REL-030).
 * The step doc now states the home once, under `#### Where the Deferred Work record goes`,
 * with a fenced worked example of the record.
 *
 * This test EXECUTES that statement rather than grepping it: it extracts the worked
 * example by the subsection's own heading (not by the shared token `Deferred Work`,
 * obs #135), places it on a fixture task the way the statement says, runs three QA
 * Step 12 writes through `qa-results.js`, and asserts the record is byte-identical
 * after each one.
 *
 * Run: node --test tests/deferred-work-placement.test.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const test = require("node:test");
const {
  findQaResults,
  upsertQaResults,
} = require("../shared/resources/qa-results.js");

const REPO_ROOT = path.resolve(__dirname, "..");
const STEP_DOC = path.join(
  REPO_ROOT,
  "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
);
const SUBSECTION = "#### Where the Deferred Work record goes";

// The subsection's text: from its heading to the next unfenced heading of level <= 4
// (the worked example's own `## Deferred Work` sits inside a fence).
function statement() {
  const doc = fs.readFileSync(STEP_DOC, "utf8");
  const at = doc.indexOf(`\n${SUBSECTION}\n`);
  assert.ok(at !== -1, `${SUBSECTION} is missing from the step doc`);
  const lines = doc.slice(at + SUBSECTION.length + 2).split("\n");
  let fenced = false;
  const out = [];
  for (const line of lines) {
    if (/^```/.test(line)) fenced = !fenced;
    else if (!fenced && /^#{1,4} /.test(line)) break;
    out.push(line);
  }
  return out.join("\n");
}

// The subsection's one fenced markdown example.
function workedExample() {
  const fences = [...statement().matchAll(/^```markdown\n([\s\S]*?)\n```$/gm)];
  assert.equal(fences.length, 1, "exactly one worked example in the statement");
  return fences[0][1];
}

// The documented placement: immediately before the change-log block, or before the
// `## Change Log` heading when one sits directly above the marker block.
function place(doc, record) {
  const marker = doc.indexOf("<!-- change-log-start -->");
  assert.ok(marker !== -1, "fixture has a change-log block");
  const above = doc.slice(0, marker).replace(/\s+$/, "");
  const lineStart = above.lastIndexOf("\n") + 1;
  const at = /^## Change Log\b/.test(above.slice(lineStart))
    ? lineStart
    : marker;
  return `${doc.slice(0, at)}${record}\n\n${doc.slice(at)}`;
}

const FM = "---\ntype: task\nstatus: in-progress\n---\n\n# Task\n\n";
const LOG =
  "<!-- change-log-start -->\n\n## Change Log\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-10-05 | 1.0 | Initial draft | create-task |\n\n<!-- change-log-end -->\n";
const qa = (n) =>
  `## QA Testing Results\n\n**QA Status**: PASS\n**Gate File**: [gate.${n}](./x.gate.${n}.yml)\n\n### Key Findings\nNone (cycle ${n}).`;
const fixture = `${FM}## 11. Rollback Plan\n\nRevert.\n\n---\n\n${qa(1)}\n\n${LOG}\n---\n\n## Progress Tracking\n\n- [ ] Phase 1\n`;

test("the worked example is a ## Deferred Work H2, the heading the statement names", () => {
  const record = workedExample();
  assert.match(record, /^## Deferred Work\n/);
  assert.match(statement(), /The heading is `## Deferred Work`, an H2/);
});

test("the documented record survives three QA Step 12 writes byte-identical", () => {
  const record = workedExample();
  let doc = place(fixture, record);
  const [s] = findQaResults(doc).sections;
  assert.ok(
    s.end <= doc.indexOf(record),
    "the record sits outside the QA section's span",
  );
  for (let n = 2; n <= 4; n++) {
    const r = upsertQaResults(doc, qa(n), { docType: "task" });
    assert.equal(r.reason, "replaced", `write ${n}`);
    doc = r.content;
    assert.equal(
      doc.split(record).length - 1,
      1,
      `write ${n}: the record is present exactly once, unchanged`,
    );
  }
  assert.match(doc, /None \(cycle 4\)/);
  assert.ok(
    doc.indexOf("## Deferred Work") < doc.indexOf("<!-- change-log-start -->"),
    "the record stays above the change-log block",
  );
});

test("the same record written INSIDE the QA section is what this placement prevents", () => {
  // Non-vacuity: a bold-label record inside the section was task.155's REL-030 shape.
  // The engine now carries it (task 171), so it is not lost — but it is the placement
  // the statement forbids, and its survival depends on the carry rule, not on position.
  const inside = fixture.replace(
    "None (cycle 1).",
    "None (cycle 1).\n\n**Deferred Work**\n\n- REL-7 carried",
  );
  const r = upsertQaResults(inside, qa(2), { docType: "task" });
  assert.equal(r.reason, "replaced");
  assert.match(r.content, /\*\*Deferred Work\*\*\n\n- REL-7 carried/);
});

test("both loop exits point at the one statement instead of restating it", () => {
  const doc = fs.readFileSync(STEP_DOC, "utf8");
  const pointers =
    doc.split("(see **Where the Deferred Work record goes**)").length - 1;
  assert.equal(pointers, 2, "route 2 and route 2b each point at the statement");
  assert.doesNotMatch(
    doc,
    /under \*\*Deferred Work\*\*/,
    "the old unplaced phrasing is gone",
  );
});
