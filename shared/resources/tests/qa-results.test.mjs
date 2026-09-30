// qa-results.test.mjs — the `## QA Testing Results` section engine (task 155, obs #178)
//
// Each block guards a defect class the engine exists to remove, or that its first
// design carried (task.155 review):
//
//   A — reasons.        replaced / relocated / created / multiple / bad-section, each
//                       asserted on both the returned reason and the resulting text.
//   B — placement.      markers → before the start marker; a hand-written heading →
//                       before it; neither → before ANCHORS[docType]; none → EOF.
//   C — protection.     a fenced or inline-code heading is neither found nor replaced.
//   D — obs #178.       a section inside the markers → relocated, then replaced, one copy.
//   E — span bounds.    a suffixed heading counts (task.65's copies); a section placed
//                       before the block never swallows its start marker (review C2);
//                       a `---` separator survives a replace.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const QR = require("../qa-results.js");

const count = (s, needle) => s.split(needle).length - 1;
const qaCount = (s) => QR.findQaResults(s).sections.length;

const section = (n) =>
  `## QA Testing Results\n\n**QA Status**: PASS\n**Gate File**: [gate.${n}](./x.gate.${n}.yml)\n\n### Key Findings\nNone (cycle ${n}).`;

const FM = "---\ntype: task\nstatus: in-progress\n---\n\n# Task\n\n";
const LOG =
  "<!-- change-log-start -->\n\n## Change Log\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | Initial draft | create-task |\n\n<!-- change-log-end -->\n";

const markerDoc = (mid = "") =>
  `${FM}## 11. Rollback Plan\n\nRevert.\n\n---\n\n${mid}${LOG}\n---\n\n## Progress Tracking\n\n- [ ] Phase 1\n`;

// ---------------------------------------------------------------------------
// A — reasons
// ---------------------------------------------------------------------------

test("A1 created: no section → inserted, reason created", () => {
  const r = QR.upsertQaResults(markerDoc(), section(1), { docType: "task" });
  assert.equal(r.reason, "created");
  assert.equal(qaCount(r.content), 1);
  assert.match(r.content, /cycle 1/);
});

test("A2 replaced: one section outside the block → replaced whole", () => {
  const once = QR.upsertQaResults(markerDoc(), section(1), {
    docType: "task",
  }).content;
  const r = QR.upsertQaResults(once, section(2), { docType: "task" });
  assert.equal(r.reason, "replaced");
  assert.equal(qaCount(r.content), 1);
  assert.doesNotMatch(r.content, /cycle 1/);
  assert.match(r.content, /cycle 2/);
});

test("A3 relocated: one section inside the markers → moved before the block", () => {
  const inside = LOG.replace(
    "<!-- change-log-end -->",
    `${section(1)}\n\n<!-- change-log-end -->`,
  );
  const doc = `${FM}## Body\n\ntext\n\n${inside}\n## Progress Tracking\n`;
  assert.equal(QR.findQaResults(doc).sections[0].insideChangeLog, true);
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "relocated");
  const { sections } = QR.findQaResults(r.content);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].insideChangeLog, false);
  assert.ok(sections[0].start < r.content.indexOf("<!-- change-log-start -->"));
  assert.doesNotMatch(r.content, /cycle 1/);
  assert.match(r.content, /\| 2026-09-25 \| 1\.0 \| Initial draft/);
});

test("A4 multiple: more than one section → content unchanged, count reported", () => {
  const doc = `${FM}${section(1)}\n\n${section(2)}\n\n## Progress Tracking\n`;
  const r = QR.upsertQaResults(doc, section(3), { docType: "task" });
  assert.equal(r.reason, "multiple");
  assert.equal(r.count, 2);
  assert.equal(r.content, doc);
});

test("A5 bad-section: not a QA section, or two of them → content unchanged", () => {
  const doc = markerDoc();
  for (const bad of [
    "## Something Else\n\nx",
    "QA Testing Results",
    "### QA Testing Results\n\nx",
    `${section(1)}\n\n${section(2)}`,
    undefined,
  ]) {
    const r = QR.upsertQaResults(doc, bad, { docType: "task" });
    assert.equal(r.reason, "bad-section", String(bad));
    assert.equal(r.content, doc);
  }
});

// ---------------------------------------------------------------------------
// B — placement
// ---------------------------------------------------------------------------

test("B1 markers present → section sits immediately before the start marker", () => {
  const r = QR.upsertQaResults(markerDoc(), section(1), { docType: "task" });
  assert.match(r.content, /None \(cycle 1\)\.\n\n<!-- change-log-start -->/);
  assert.match(r.content, /---\n\n## QA Testing Results/);
});

test("B2 hand-written ## Change Log, no markers → before that heading", () => {
  const doc = `${FM}## Body\n\ntext\n\n## Change Log\n\n| Date | Version | Description | Author |\n\n## Progress Tracking\n`;
  const r = QR.upsertQaResults(doc, section(1), { docType: "task" });
  assert.equal(r.reason, "created");
  assert.match(r.content, /None \(cycle 1\)\.\n\n## Change Log/);
});

test("B3 no change log → before ANCHORS[docType]", () => {
  const task = `${FM}## Body\n\ntext\n\n## Progress Tracking\n\n- [ ] x\n`;
  assert.match(
    QR.upsertQaResults(task, section(1), { docType: "task" }).content,
    /None \(cycle 1\)\.\n\n## Progress Tracking/,
  );
  const story = `${FM}## Body\n\ntext\n\n## Dev Agent Record\n\nx\n`;
  assert.match(
    QR.upsertQaResults(story, section(1), { docType: "story" }).content,
    /None \(cycle 1\)\.\n\n## Dev Agent Record/,
  );
});

test("B4 no change log and no anchor → appended at the end", () => {
  const doc = `${FM}## Body\n\ntext\n`;
  const r = QR.upsertQaResults(doc, section(1), { docType: "task" });
  assert.ok(r.content.endsWith("None (cycle 1).\n"));
  assert.match(r.content, /text\n\n## QA Testing Results/);
});

test("B5 a fenced anchor is not the anchor", () => {
  const doc = `${FM}## Body\n\n\`\`\`markdown\n## Progress Tracking\n\`\`\`\n\ntext\n`;
  const r = QR.upsertQaResults(doc, section(1), { docType: "task" });
  assert.ok(r.content.endsWith("None (cycle 1).\n"));
});

// ---------------------------------------------------------------------------
// C — protection
// ---------------------------------------------------------------------------

test("C1 a fenced ## QA Testing Results is neither found nor replaced", () => {
  const fenced =
    "```markdown\n## QA Testing Results\n\n**QA Status**: example\n```\n";
  const doc = `${FM}## Step 12\n\n${fenced}\n## Progress Tracking\n`;
  assert.equal(qaCount(doc), 0);
  const r = QR.upsertQaResults(doc, section(1), { docType: "task" });
  assert.equal(r.reason, "created");
  assert.ok(r.content.includes(fenced), "the fenced example is untouched");
});

test("C2 an inline-code mention is not a heading", () => {
  const doc = `${FM}## Body\n\nThe section is \`## QA Testing Results\`.\n`;
  assert.equal(qaCount(doc), 0);
});

test("C3 a heading inside frontmatter is ignored", () => {
  const doc = `---\ntype: task\ndescription: |\n## QA Testing Results\n---\n\n## Body\n`;
  assert.equal(qaCount(doc), 0);
});

test("C4 a fenced heading INSIDE a real section does not end it", () => {
  const withFence = `## QA Testing Results\n\n\`\`\`\n## Not a heading\n\`\`\`\n\ntail line`;
  const doc = `${FM}${withFence}\n\n## Next\n`;
  const [s] = QR.findQaResults(doc).sections;
  assert.match(doc.slice(s.start, s.end), /tail line/);
});

// ---------------------------------------------------------------------------
// D — the obs #178 corruption shape
// ---------------------------------------------------------------------------

test("D1 section between ## Change Log and its table → relocated, table stays, then replaced", () => {
  const corrupt = LOG.replace(
    "## Change Log\n\n",
    `## Change Log\n\n${section(1)}\n\n`,
  );
  const doc = `${FM}## Body\n\ntext\n\n${corrupt}\n## Progress Tracking\n`;
  const r1 = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r1.reason, "relocated");
  const block = r1.content.slice(
    r1.content.indexOf("<!-- change-log-start -->"),
    r1.content.indexOf("<!-- change-log-end -->"),
  );
  assert.match(block, /## Change Log\n\n\| Date \| Version/);
  assert.doesNotMatch(block, /QA Testing Results/);
  const r2 = QR.upsertQaResults(r1.content, section(3), { docType: "task" });
  assert.equal(r2.reason, "replaced");
  assert.equal(qaCount(r2.content), 1);
  assert.equal(count(r2.content, "## Change Log"), 1);
  assert.match(r2.content, /cycle 3/);
});

test("D2 five writes in a row never stack a second copy", () => {
  let doc = markerDoc();
  for (let n = 1; n <= 5; n++) {
    doc = QR.upsertQaResults(doc, section(n), { docType: "task" }).content;
  }
  assert.equal(qaCount(doc), 1);
  assert.equal(count(doc, "<!-- change-log-start -->"), 1);
  assert.equal(count(doc, "<!-- change-log-end -->"), 1);
  assert.equal(count(doc, "## Change Log"), 1);
  assert.match(doc, /cycle 5/);
});

// ---------------------------------------------------------------------------
// E — span bounds (task.155 review C1, C2, I1)
// ---------------------------------------------------------------------------

test("E1 suffixed headings count: task.65's stacked copies are three sections", () => {
  const doc = `${FM}${section(1)}\n\n---\n\n## QA Testing Results — Cycle 2 (re-review)\n\nx\n\n---\n\n## QA Testing Results — Cycle 3 (verification)\n\ny\n`;
  assert.equal(qaCount(doc), 3);
  assert.equal(QR.upsertQaResults(doc, section(4)).reason, "multiple");
});

test("E2 an H3 ### QA Testing Results is a subsection, not a section", () => {
  assert.equal(qaCount(`${FM}## QA\n\n### QA Testing Results\n\nx\n`), 0);
});

test("E3 a section directly before the marker block does not swallow the start marker", () => {
  const doc = markerDoc(`${section(1)}\n\n`);
  const [s] = QR.findQaResults(doc).sections;
  assert.ok(s.end <= doc.indexOf("<!-- change-log-start -->"));
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "replaced");
  assert.equal(count(r.content, "<!-- change-log-start -->"), 1);
  assert.equal(count(r.content, "<!-- change-log-end -->"), 1);
});

test("E4 a --- separator after the section survives a replace", () => {
  const doc = `${FM}## Body\n\ntext\n\n---\n\n${section(1)}\n\n---\n\n## Definition of Done\n\ndone\n`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "replaced");
  assert.match(r.content, /None \(cycle 2\)\.\n\n---\n\n## Definition of Done/);
  assert.equal(count(r.content, "\n---\n"), 3); // frontmatter close + two separators
});

test("E5 a setext underline is content, not a separator", () => {
  const doc = `${FM}## QA Testing Results\n\nLast line\n---\n\n## Next\n`;
  const [s] = QR.findQaResults(doc).sections;
  assert.match(doc.slice(s.start, s.end), /Last line\n---\n$/);
});

test("E6 replace is idempotent on the section text", () => {
  const once = QR.upsertQaResults(markerDoc(), section(1), {
    docType: "task",
  }).content;
  const twice = QR.upsertQaResults(once, section(1), {
    docType: "task",
  }).content;
  assert.equal(twice, once);
});
