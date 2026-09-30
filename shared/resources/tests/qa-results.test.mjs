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

// ---------------------------------------------------------------------------
// F — QA cycle 1 findings (task.155 gate 1)
// ---------------------------------------------------------------------------

test("F1 REL-001: a section carrying a second H1/H2 is bad-section; a fenced H2 is refused too (cycle 5)", () => {
  const doc = markerDoc();
  const withSibling = `${section(1)}\n\n## QA Completion Summary\n\nDone.`;
  const r = QR.upsertQaResults(doc, withSibling, { docType: "task" });
  assert.equal(r.reason, "bad-section");
  assert.equal(r.content, doc);
  const withH1 = `${section(1)}\n\n# Stray title`;
  assert.equal(QR.upsertQaResults(doc, withH1).reason, "bad-section");
  const fenced = `${section(1)}\n\n\`\`\`markdown\n## Example heading\n\`\`\``;
  assert.equal(
    QR.upsertQaResults(doc, fenced, { docType: "task" }).reason,
    "bad-section", // since cycle 5: the fence-blind guard refuses what it could not later replace
  );
  const h3 = `${section(1)}\n\n### Sub-heading\n\nx`;
  assert.equal(
    QR.upsertQaResults(doc, h3, { docType: "task" }).reason,
    "created",
  );
});

test("F2 REL-002: marker-less ## Change Log with the section before its table → relocated, rows kept", () => {
  const table =
    "| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | Initial draft | create-task |\n";
  const doc = `${FM}## Body\n\ntext\n\n## Change Log\n\n${section(1)}\n\n${table}\n## Progress Tracking\n`;
  const [s] = QR.findQaResults(doc).sections;
  assert.equal(s.insideChangeLog, true);
  const r1 = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r1.reason, "relocated");
  assert.match(
    r1.content,
    /None \(cycle 2\)\.\n\n## Change Log\n\n\| Date \| Version/,
  );
  assert.match(r1.content, /\| 2026-09-25 \| 1\.0 \| Initial draft/);
  const r2 = QR.upsertQaResults(r1.content, section(3), { docType: "task" });
  assert.equal(r2.reason, "replaced");
  assert.equal(qaCount(r2.content), 1);
  assert.match(r2.content, /\| 2026-09-25 \| 1\.0 \| Initial draft/);
});

test("F3 REL-003: a section inside a LATER marker block is contained, and its end marker survives", () => {
  const legacy =
    "<!-- jira-sync-changelog-start -->\n\n## Jira Sync Log\n\n| Date | Change |\n| --- | --- |\n| 2026-01-01 | synced |\n\n<!-- jira-sync-changelog-end -->\n";
  const current = LOG.replace(
    "<!-- change-log-end -->",
    `${section(1)}\n\n<!-- change-log-end -->`,
  );
  const doc = `${FM}## Body\n\ntext\n\n${legacy}\n${current}\n## Progress Tracking\n`;
  const [s] = QR.findQaResults(doc).sections;
  assert.equal(s.insideChangeLog, true);
  assert.ok(s.end <= doc.indexOf("<!-- change-log-end -->"));
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "relocated");
  assert.equal(count(r.content, "<!-- change-log-end -->"), 1);
  assert.equal(count(r.content, "<!-- jira-sync-changelog-end -->"), 1);
  assert.equal(qaCount(r.content), 1);
  assert.equal(QR.findQaResults(r.content).sections[0].insideChangeLog, false);
});

test("F4 a section AFTER a marker-less change log with no table following is not misplaced", () => {
  const doc = `${FM}## Change Log\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | x | y |\n\n${section(1)}\n\n## Next\n`;
  const [s] = QR.findQaResults(doc).sections;
  assert.equal(s.insideChangeLog, false);
  assert.equal(QR.upsertQaResults(doc, section(2)).reason, "replaced");
});

// ---------------------------------------------------------------------------
// G — QA cycle 2 findings (task.155 gate 2): the misplaced shape, precisely
// ---------------------------------------------------------------------------

const quoted =
  "## QA Testing Results\n\n**QA Status**: PASS\n\n### Key Findings\n\n| Date | Version | Note |\n| --- | --- | --- |\n| 2026-01-01 | 0.1 | quoted |\n\nStale tail line.";

test("G1 REL-004: a section after a finished marker-less log, quoting a Date table, is replaced whole", () => {
  const doc = `${FM}## Change Log\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | x | y |\n\n${quoted}\n\n## Next\n`;
  assert.equal(QR.findQaResults(doc).sections[0].insideChangeLog, false);
  const r = QR.upsertQaResults(doc, section(2));
  assert.equal(r.reason, "replaced");
  assert.doesNotMatch(r.content, /Stale tail line|quoted/);
  assert.match(r.content, /\| 2026-09-25 \| 1\.0 \| x \| y \|/);
});

test("G2 REL-004: a section after a closed marker block, quoting a Date table, is replaced whole", () => {
  const doc = `${FM}## Body\n\ntext\n\n${LOG}\n${quoted}\n\n## Next\n`;
  assert.equal(QR.findQaResults(doc).sections[0].insideChangeLog, false);
  const r = QR.upsertQaResults(doc, section(2));
  assert.equal(r.reason, "replaced");
  assert.doesNotMatch(r.content, /Stale tail line|quoted/);
});

test("G3 REL-005: a legacy | Date | Change | log under a marker-less heading keeps its rows", () => {
  const doc = `${FM}## Body\n\ntext\n\n## Change Log\n\n${section(1)}\n\n| Date | Change |\n| --- | --- |\n| 2026-01-01 | synced |\n| 2026-01-02 | resynced |\n`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "relocated");
  assert.match(r.content, /## Change Log\n\n\| Date \| Change \|/);
  assert.equal(count(r.content, "synced |"), 2);
  assert.doesNotMatch(r.content, /cycle 1/);
});

test("G4 REL-006: a misplaced section that quotes a Date table leaves nothing of itself in the log", () => {
  const doc = `${FM}## Body\n\ntext\n\n## Change Log\n\n${quoted}\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | Initial draft | create-task |\n`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "relocated");
  const log = r.content.slice(r.content.indexOf("## Change Log"));
  assert.doesNotMatch(log, /Stale tail line|quoted|QA Status/);
  assert.match(log, /\| 2026-09-25 \| 1\.0 \| Initial draft/);
});

test("G5 a marker-less log with prose but no table above the section is still the misplaced shape", () => {
  const doc = `${FM}## Change Log\n\nSee below.\n\n${section(1)}\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | x | y |\n`;
  assert.equal(QR.findQaResults(doc).sections[0].insideChangeLog, true);
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "relocated");
  assert.match(r.content, /See below\.\n\n\| Date \| Version/);
  assert.match(r.content, /\| 2026-09-25 \| 1\.0 \| x \| y \|/);
});

test("G6 a section further down, after a table-less marker-less log and another section, is not misplaced", () => {
  const doc = `${FM}## Change Log\n\nNone yet.\n\n## Other\n\nx\n\n${quoted}\n\n## Next\n`;
  assert.equal(QR.findQaResults(doc).sections[0].insideChangeLog, false);
  const r = QR.upsertQaResults(doc, section(2));
  assert.equal(r.reason, "replaced");
  assert.doesNotMatch(r.content, /Stale tail line|quoted/);
});

// ---------------------------------------------------------------------------
// H — PR review 1 findings (task.155 5c)
// ---------------------------------------------------------------------------

test("H1 CR-1: a section above a marker-less ### Change Log never swallows the log", () => {
  const doc = `${FM}## Dev Notes\n\nx\n\n### Change Log\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | Initial draft | create-story |\n`;
  let out = doc;
  for (let n = 1; n <= 3; n++) {
    const r = QR.upsertQaResults(out, section(n), { docType: "story" });
    assert.equal(r.reason, n === 1 ? "created" : "replaced");
    out = r.content;
  }
  assert.equal(qaCount(out), 1);
  assert.match(
    out,
    /None \(cycle 3\)\.\n\n### Change Log\n\n\| Date \| Version/,
  );
  assert.match(
    out,
    /\| 2026-09-25 \| 1\.0 \| Initial draft \| create-story \|/,
  );
});

test("H2 CR-2: a trailing --- in the caller's section does not stack across replaces", () => {
  let out = `${FM}## Body\n\ntext\n\n## Next\n`;
  for (let n = 1; n <= 3; n++) {
    out = QR.upsertQaResults(out, `${section(n)}\n\n---\n`, {}).content;
  }
  assert.equal(count(out, "\n---\n"), 1); // the frontmatter close only
  assert.equal(qaCount(out), 1);
});

// ---------------------------------------------------------------------------
// I — PR review 2 (task.155 5c): an unclosed fence must never widen a write
// ---------------------------------------------------------------------------

test("I1 CR-1: a section with an unbalanced fence is bad-section, never written", () => {
  const doc = markerDoc();
  const slip = `${section(1)}\n\n\`\`\`bash\nnpm test\n`;
  const r = QR.upsertQaResults(doc, slip, { docType: "task" });
  assert.equal(r.reason, "bad-section");
  assert.equal(r.content, doc);
  const nested = `${section(1)}\n\n\`\`\`\`markdown\n\`\`\`\ninner\n\`\`\`\n`; // outer never closed
  assert.equal(
    QR.upsertQaResults(doc, nested, { docType: "task" }).reason,
    "bad-section",
  );
});

test("I2 CR-1: an existing section holding an unclosed fence is unbounded — nothing after it is touched", () => {
  const doc = `${FM}## Body\n\ntext\n\n## QA Testing Results\n\n\`\`\`\nstray\n\n${LOG}\n## Notes\n\nkeep me\n`;
  const [s] = QR.findQaResults(doc).sections;
  assert.equal(s.unbounded, true);
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.content, doc);
});

test("I3 REL-011: a created section that would land inside an unclosed fence is unplaceable", () => {
  const doc = `${FM}## Body\n\n\`\`\`\nnever closed\n`;
  const r = QR.upsertQaResults(doc, section(1), { docType: "task" });
  assert.equal(r.reason, "unplaceable");
  assert.equal(r.content, doc);
});

test("I4 a balanced fence in the section, at its very end, is fine", () => {
  const ok = `${section(1)}\n\n\`\`\`bash\nnpm test\n\`\`\``;
  let out = markerDoc();
  for (let n = 0; n < 3; n++)
    out = QR.upsertQaResults(out, ok, { docType: "task" }).content;
  assert.equal(qaCount(out), 1);
  assert.equal(count(out, "<!-- change-log-end -->"), 1);
  assert.match(out, /\| 2026-09-25 \| 1\.0 \| Initial draft/);
});

// ---------------------------------------------------------------------------
// J — QA cycle 5 (task.155 gate 5): a write never removes structure
// ---------------------------------------------------------------------------

test("J1 REL-012: a stray fence closed by a LATER fence cannot widen a replace over the Change Log", () => {
  const stray = `${section(1)}\n\n\`\`\`\nstray\n\n`;
  const doc = `${FM}## Body\n\ntext\n\n${stray}${LOG}\n## Notes\n\n\`\`\`bash\necho later\n\`\`\`\n\n## After\n\nkeep me\n`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.content, doc);
});

test("J2 REL-012: the same shape under a marker-less log refuses too", () => {
  const doc = `${FM}## Body\n\n${section(1)}\n\n\`\`\`\nstray\n\n## Change Log\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | x | y |\n\n\`\`\`\nlater\n\`\`\`\n`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.content, doc);
});

test("J3 REL-014: an indented H2 after the section is never swallowed", () => {
  const doc = `${FM}${section(1)}\n\n  ## Indented next section\n\nkeep me\n`;
  const r = QR.upsertQaResults(doc, section(2));
  assert.equal(r.reason, "unbounded");
  assert.equal(r.content, doc);
});

test("J4 REL-013: a ## Change Log heading directly above the marker block stays with its block", () => {
  const log = `## Change Log\n\n<!-- change-log-start -->\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | x | y |\n\n<!-- change-log-end -->\n`;
  const doc = `${FM}## Body\n\ntext\n\n${log}`;
  const r = QR.upsertQaResults(doc, section(1), { docType: "task" });
  assert.equal(r.reason, "created");
  assert.match(
    r.content,
    /None \(cycle 1\)\.\n\n## Change Log\n\n<!-- change-log-start -->/,
  );
  const r2 = QR.upsertQaResults(r.content, section(2), { docType: "task" });
  assert.equal(r2.reason, "replaced");
  assert.match(
    r2.content,
    /None \(cycle 2\)\.\n\n## Change Log\n\n<!-- change-log-start -->/,
  );
});

test("J5 a section the engine writes is always one it can replace next cycle", () => {
  const fencedH2 = `${section(1)}\n\n\`\`\`markdown\n## Example\n\`\`\``;
  assert.equal(
    QR.upsertQaResults(markerDoc(), fencedH2, { docType: "task" }).reason,
    "bad-section",
  );
  // A hand-edited document that already carries one is refused, never widened.
  const doc = markerDoc(`${fencedH2}\n\n`);
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.content, doc);
});

test("J6 the guard catches a bare marker block alone (no heading in the removed text)", () => {
  const block =
    "<!-- change-log-start -->\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | x | y |\n\n<!-- change-log-end -->\n";
  const doc = `${FM}## Body\n\n${section(1)}\n\n\`\`\`\nstray\n\n${block}\n\`\`\`bash\necho\n\`\`\`\n\n## Next\n\nkeep\n`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.content, doc);
});

test("J7 the guard catches a marker-less ### Change Log alone", () => {
  const log =
    "### Change Log\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | x | y |\n";
  const doc = `${FM}## Body\n\n${section(1)}\n\n\`\`\`\nstray\n\n${log}\n\`\`\`bash\necho\n\`\`\`\n\n## Next\n\nkeep\n`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "story" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.content, doc);
});
