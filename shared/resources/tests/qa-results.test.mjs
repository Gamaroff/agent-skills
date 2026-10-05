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
//   O — task 171.       task.155's recorded residuals: each shape either writes
//                       correctly or refuses with a `detail` naming the rule that fired.

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

test("G4 REL-006/REL-007: a misplaced section that quotes a dated table is refused, never cut (task 171)", () => {
  // Under a log, the engine cannot tell the section's quoted rows from the log's own:
  // task.155 cut at the last Date table and could leave either behind. Now refused.
  const doc = `${FM}## Body\n\ntext\n\n## Change Log\n\n${quoted}\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | Initial draft | create-task |\n`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.detail, "structural-line:| 2026-01-01 | 0.1 | quoted |");
  assert.equal(r.content, doc);
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

// ---------------------------------------------------------------------------
// K — QA cycle 6 (task.155 gate 6)
// ---------------------------------------------------------------------------

test("K1 REL-015: a numbered marker-less ### 1.5 Change Log is structure the guard protects", () => {
  const log =
    "### 1.5 Change Log\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | x | y |\n";
  const doc = `${FM}## Body\n\n${section(1)}\n\n\`\`\`\nstray\n\n${log}\n\`\`\`bash\necho\n\`\`\`\n\n## Next\n\nkeep\n`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "story" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.content, doc);
});

test("K2 REL-015: a numbered ## 12) Change Log directly above the marker block keeps its place", () => {
  const doc = `${FM}## Body\n\ntext\n\n## 12) Change Log\n\n<!-- change-log-start -->\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | x | y |\n\n<!-- change-log-end -->\n`;
  const r = QR.upsertQaResults(doc, section(1), { docType: "task" });
  assert.equal(r.reason, "created");
  assert.match(
    r.content,
    /None \(cycle 1\)\.\n\n## 12\) Change Log\n\n<!-- change-log-start -->/,
  );
});

// ---------------------------------------------------------------------------
// L — PR review 3 (task.155 5c): subsections another skill owns survive a replace
// ---------------------------------------------------------------------------

const bugList =
  "### Bug Reports\n\n- [task.9.bug.1.x.md](./task.9.bug.1.x.md) - 🆕 New - Priority: High - 2026-09-30\n- [task.9.bug.2.y.md](./task.9.bug.2.y.md) - 🆕 New - Priority: Low - 2026-09-30";

test("L1 CR-1: create-bug-report's ### Bug Reports list is carried through every replace", () => {
  let out = markerDoc(`${section(1)}\n\n${bugList}\n\n`);
  for (let n = 2; n <= 4; n++) {
    const r = QR.upsertQaResults(out, section(n), { docType: "task" });
    assert.equal(r.reason, "replaced");
    out = r.content;
  }
  assert.equal(count(out, "### Bug Reports"), 1);
  assert.equal(count(out, "task.9.bug.1.x.md"), 2); // link text + target, once
  assert.equal(count(out, "task.9.bug.2.y.md"), 2);
  assert.match(out, /None \(cycle 4\)\.\n\n### Bug Reports/);
  assert.doesNotMatch(out, /cycle [123]\)/);
});

test("L2 a render that brings its own carried block is bad-section — the engine owns carrying", () => {
  const doc = markerDoc(`${section(1)}\n\n${bugList}\n\n`);
  for (const own of [
    `${section(2)}\n\n### Bug Reports\n\n- [task.9.bug.1.x.md](./task.9.bug.1.x.md) - ✅ Closed`,
    `${section(2)}\n\n### Deferred Work\n\n- REL-1 carried`,
  ]) {
    const r = QR.upsertQaResults(doc, own, { docType: "task" });
    assert.equal(r.reason, "bad-section");
    assert.equal(r.content, doc);
  }
});

test("L3 QA's own stale subsections are still replaced whole", () => {
  const doc = markerDoc(
    `${section(1)}\n\n### QA Fix Cycle 1 — old\n\nstale history\n\n`,
  );
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.doesNotMatch(r.content, /stale history|QA Fix Cycle 1/);
});

test("L4 the Bug Reports list is carried on relocate too", () => {
  const inside = LOG.replace(
    "<!-- change-log-end -->",
    `${section(1)}\n\n${bugList}\n\n<!-- change-log-end -->`,
  );
  const doc = `${FM}## Body\n\ntext\n\n${inside}\n## Progress Tracking\n`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "relocated");
  assert.equal(count(r.content, "### Bug Reports"), 1);
  assert.ok(
    r.content.indexOf("### Bug Reports") <
      r.content.indexOf("<!-- change-log-start -->"),
  );
});

// ---------------------------------------------------------------------------
// M — QA cycle 8 (task.155 gate 8): the carried list, exactly
// ---------------------------------------------------------------------------

test("M1 REL-020: two Bug Reports lists are merged into one, no link lost", () => {
  const second =
    "### Bug Reports\n\n- [task.9.bug.3.z.md](./task.9.bug.3.z.md) - 🆕 New - Priority: Medium - 2026-09-30";
  const doc = markerDoc(
    `${section(1)}\n\n${bugList}\n\n### Key Findings (old)\n\nx\n\n${second}\n\n`,
  );
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "replaced");
  assert.equal(count(r.content, "### Bug Reports"), 1);
  for (const b of ["bug.1.x", "bug.2.y", "bug.3.z"])
    assert.match(r.content, new RegExp(b));
  assert.doesNotMatch(r.content, /Key Findings \(old\)/); // QA-owned, replaced whole
});

test("M2 REL-021: only the list is carried — stale QA text after it is not", () => {
  const top = `## QA Testing Results\n\n${bugList}\n**QA Status**: FAIL\n**Quality Score**: 10/100\n\n- stale finding from the last cycle`;
  const doc = markerDoc(`${top}\n\n`);
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "replaced");
  assert.doesNotMatch(r.content, /10\/100|QA Status\*\*: FAIL|stale finding/);
  assert.match(r.content, /bug\.2\.y/);
});

test("M3 REL-023: near-miss headings still carry their list", () => {
  for (const h of [
    "### Bug reports",
    "#### Bug Reports",
    "### Bug Reports (2)",
  ]) {
    const doc = markerDoc(
      `${section(1)}\n\n${bugList.replace("### Bug Reports", h)}\n\n`,
    );
    const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
    assert.match(r.content, /bug\.1\.x/, h);
    assert.match(r.content, /bug\.2\.y/, h);
  }
});

test("M4 REL-022: a template comment between the section and the log survives a replace", () => {
  const lead =
    "<!-- The Change Log below is append-only.\n     Add a row per event. -->";
  const doc = `${FM}## Body\n\ntext\n\n${section(1)}\n\n---\n\n${lead}\n\n${LOG}`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "replaced");
  assert.ok(r.content.includes(lead));
  assert.match(r.content, /None \(cycle 2\)\.\n\n---\n\n<!-- The Change Log/);
});

test("M5 a carried list does not grow across replaces", () => {
  let out = markerDoc(`${section(1)}\n\n${bugList}\n\n`);
  const once = QR.upsertQaResults(out, section(2), { docType: "task" }).content;
  const twice = QR.upsertQaResults(once, section(2), {
    docType: "task",
  }).content;
  assert.equal(twice, once);
});

test("M6 a rich Bug Reports block — #### groups, a table, bold labels — is carried whole", () => {
  const rich =
    "### Bug Reports\n\n#### Open Bugs\n- None\n\n#### Closed (cycle 6)\n- [Bug 9.7](./task.9.bug.7.a.md) - closed\n\n| Bug | Status |\n|---|---|\n| [TASK-9-BUG-8](./task.9.bug.8.b.md) | fixed |\n\n**Open Bugs**\n\n- [bug.9](./task.9.bug.9.c.md) - open";
  const doc = markerDoc(`${section(1)}\n\n${rich}\n\n`);
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "replaced");
  assert.ok(r.content.includes(rich), "the block is carried verbatim");
});

// ---------------------------------------------------------------------------
// N — PR review 4 (task.155 5c): the pipeline's Deferred Work record is carried
// ---------------------------------------------------------------------------

test("N1 PC-1: a ### Deferred Work block inside the section survives every replace", () => {
  const deferred =
    "### Deferred Work\n\nCarried from gate 3 (route 2b):\n\n- **REL-7** (LOW) — a residual shape\n- **REL-8** (LOW) — another\n\n| Id | Reason |\n|---|---|\n| REL-7 | cosmetic |";
  let out = markerDoc(`${section(1)}\n\n${deferred}\n\n`);
  for (let n = 2; n <= 4; n++) {
    const r = QR.upsertQaResults(out, section(n), { docType: "task" });
    assert.equal(r.reason, "replaced");
    out = r.content;
  }
  assert.ok(out.includes(deferred), "carried verbatim");
  assert.equal(count(out, "### Deferred Work"), 1);
});

test("N2 both carried blocks survive together, Bug Reports before Deferred Work", () => {
  const deferred = "### Deferred Work\n\n- REL-7 carried";
  // Written in the opposite order, so the assertion pins the engine's order (CR-3).
  const doc = markerDoc(`${section(1)}\n\n${deferred}\n\n${bugList}\n\n`);
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "replaced");
  assert.ok(r.content.includes(bugList) && r.content.includes(deferred));
  assert.ok(r.content.indexOf(bugList) < r.content.indexOf(deferred));
});

// ---------------------------------------------------------------------------
// O — task 171: task.155's Deferred Work residuals
// ---------------------------------------------------------------------------

const replaceThrice = (doc) => {
  let out = doc;
  for (let n = 2; n <= 4; n++) {
    const r = QR.upsertQaResults(out, section(n), { docType: "task" });
    assert.equal(r.reason, "replaced", `write ${n}`);
    out = r.content;
  }
  return out;
};

test("O1 REL-008: under a log whose header is not Date-first, the rows are refused, not lost", () => {
  for (const header of ["| Date (UTC) | Change |", "| Change | Date |"]) {
    const doc = `${FM}## Body\n\ntext\n\n## Change Log\n\n${section(1)}\n\n${header}\n| --- | --- |\n| 2026-01-02 | synced |\n`;
    const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
    assert.equal(r.reason, "unbounded", header);
    assert.equal(r.detail, "structural-line:| 2026-01-02 | synced |");
    assert.equal(r.content, doc);
  }
});

test("O2 REL-008: inside a marker block before a log holding two Date tables, refused", () => {
  const two =
    "<!-- change-log-start -->\n\n## Change Log\n\n" +
    `${section(1)}\n\n` +
    "| Date | Change |\n| --- | --- |\n| 2026-01-01 | first |\n\n" +
    "| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-02-02 | 1.0 | second | x |\n\n<!-- change-log-end -->\n";
  const doc = `${FM}## Body\n\ntext\n\n${two}`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.detail, "structural-line:| 2026-01-01 | first |");
  assert.equal(r.content, doc);
});

test("O3 REL-007: a section after the block's own log rows that quotes a dated table is refused", () => {
  const doc = markerDoc().replace(
    "<!-- change-log-end -->",
    `${quoted}\n\n<!-- change-log-end -->`,
  );
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.detail, "structural-line:| 2026-01-01 | 0.1 | quoted |");
  // Without a quoted dated row the same misplaced section still relocates whole.
  const plain = markerDoc().replace(
    "<!-- change-log-end -->",
    `${section(1)}\n\n<!-- change-log-end -->`,
  );
  const r2 = QR.upsertQaResults(plain, section(2), { docType: "task" });
  assert.equal(r2.reason, "relocated");
  assert.equal(count(r2.content, "| 2026-09-25 | 1.0 | Initial draft"), 1);
});

test("O4 a correctly placed section may still quote dated rows and replace them", () => {
  // The dated-row guard is scoped to sections under a log; G1/G2 stay replaceable.
  const doc = `${FM}## Body\n\ntext\n\n${quoted}\n\n${LOG}`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "replaced");
  assert.doesNotMatch(r.content, /quoted/);
  // …and a render may carry a dated table of its own (a QA history, say).
  const r2 = QR.upsertQaResults(markerDoc(), quoted, { docType: "task" });
  assert.equal(r2.reason, "created");
  assert.match(r2.content, /\| 2026-01-01 \| 0\.1 \| quoted \|/);
});

test("O5 setext: an underlined heading in a span or a render is refused, with the line", () => {
  const doc = `${FM}## Body\n\ntext\n\n${section(1)}\n\nAccidental heading\n---\n\nmore\n\n${LOG}`;
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.detail, "structural-line:Accidental heading / ---");
  const r2 = QR.upsertQaResults(
    markerDoc(),
    `${section(2)}\n\nTitle\n=====\n\nx`,
    {
      docType: "task",
    },
  );
  assert.equal(r2.reason, "bad-section");
  assert.equal(r2.detail, "structural-line:Title / =====");
  // Not setext: a break after a blank line, and a table delimiter row.
  const ok = `${section(1)}\n\npara\n\n---\n\n| a | b |\n|---|---|\n| 1 | 2 |`;
  assert.equal(
    QR.upsertQaResults(markerDoc(), ok, { docType: "task" }).reason,
    "created",
  );
});

test("O6 REL-024: a comment closing the section before a heading is content, not a separator", () => {
  const doc = `${FM}## Body\n\ntext\n\n${section(1)}\n\n<!-- cycle note -->\n\n## Next\n\nx\n`;
  const [s] = QR.findQaResults(doc).sections;
  assert.match(doc.slice(s.start, s.end), /<!-- cycle note -->/);
  const out = QR.upsertQaResults(doc, section(2), { docType: "task" }).content;
  assert.equal(
    count(out, "<!-- cycle note -->"),
    0,
    "replaced with the section",
  );
  // A render that ends in a comment is refused rather than stacked under a change log.
  const r = QR.upsertQaResults(markerDoc(), `${section(2)}\n\n<!-- note -->`, {
    docType: "task",
  });
  assert.equal(r.reason, "bad-section");
  assert.equal(r.detail, "trailing-comment");
});

test("O7 REL-025: a #### Bug Reports block stops at QA's next #### subsection", () => {
  const block = "#### Bug Reports\n\n- [bug.1](./task.9.bug.1.a.md) - open";
  const doc = markerDoc(
    `${section(1)}\n\n${block}\n\n#### Recommendations\n\nStale advice.\n\n`,
  );
  const out = replaceThrice(doc);
  assert.equal(count(out, block), 1);
  assert.doesNotMatch(out, /Stale advice|#### Recommendations/);
});

test("O8 REL-027: a bold-label list and a singular heading are carried", () => {
  const bold = "**Bug Reports**\n\n- [bug.2](./task.9.bug.2.b.md) - open";
  const singular = "### Bug Report\n\n- [bug.3](./task.9.bug.3.c.md) - open";
  for (const list of [bold, singular]) {
    const out = replaceThrice(markerDoc(`${section(1)}\n\n${list}\n\n`));
    assert.equal(count(out, list), 1, list.split("\n")[0]);
  }
  // A bold-label block ends at the next bold label: QA's own label is not carried.
  const doc = markerDoc(
    `${section(1)}\n\n${bold}\n\n**Recommendations**\n\nStale.\n\n`,
  );
  assert.doesNotMatch(replaceThrice(doc), /Stale\./);
});

test("O9 REL-030 legacy: a bold **Deferred Work** record inside the section is carried", () => {
  const rec = "**Deferred Work**\n\n- REL-7 (LOW) — carried";
  const out = replaceThrice(markerDoc(`${section(1)}\n\n${rec}\n\n`));
  assert.equal(count(out, rec), 1);
});

test("O10 REL-028: a Deferred Work block nested in a Bug Reports block is carried once", () => {
  const nested =
    "### Bug Reports\n\n- [bug.4](./task.9.bug.4.d.md) - open\n\n#### Deferred Work\n\n- REL-9 carried";
  const out = replaceThrice(markerDoc(`${section(1)}\n\n${nested}\n\n`));
  assert.equal(count(out, nested), 1);
  assert.equal(count(out, "- REL-9 carried"), 1);
});

test("O11 CR-4: a folded block keeps its heading text as a bold line", () => {
  const first = "### Bug Reports\n\n- [bug.5](./task.9.bug.5.e.md) - open";
  const second = "### Bug Reports (2)\n\n- [bug.6](./task.9.bug.6.f.md) - open";
  const out = replaceThrice(
    markerDoc(`${section(1)}\n\n${first}\n\n${second}\n\n`),
  );
  assert.match(
    out,
    /- \[bug\.5\][^\n]*\n\n\*\*Bug Reports \(2\)\*\*\n\n- \[bug\.6\]/,
  );
  assert.equal(count(out, "bug.6.f.md"), 1);
});

test("O12 CRLF: every seam a write makes uses the document's line ending", () => {
  const crlf = (s) => s.replace(/\n/g, "\r\n");
  const bare = (s) => (s.match(/(?<!\r)\n/g) || []).length;
  const withList = markerDoc(`${section(1)}\n\n${bugList}\n\n`);
  for (const [doc, want] of [
    [crlf(markerDoc()), "created"],
    [crlf(withList), "replaced"],
    [
      crlf(
        LOG.replace("## Change Log\n\n", `## Change Log\n\n${section(1)}\n\n`),
      ),
      "relocated",
    ],
  ]) {
    const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
    assert.equal(r.reason, want);
    assert.equal(bare(r.content), 0, `${want}: no bare LF`);
    assert.equal(
      QR.upsertQaResults(r.content, section(2), { docType: "task" }).content,
      r.content,
      `${want}: idempotent`,
    );
  }
});

test("O13 CR-5: a section stranded between ## Change Log and its marker block moves above the heading", () => {
  const stranded = `${FM}## Body\n\ntext\n\n## Change Log\n\n${section(1)}\n\n<!-- change-log-start -->\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-25 | 1.0 | x | y |\n\n<!-- change-log-end -->\n`;
  assert.equal(QR.findQaResults(stranded).sections[0].insideChangeLog, true);
  const r = QR.upsertQaResults(stranded, section(2), { docType: "task" });
  assert.equal(r.reason, "relocated");
  assert.match(
    r.content,
    /None \(cycle 2\)\.\n\n## Change Log\n\n<!-- change-log-start -->/,
  );
  const r2 = QR.upsertQaResults(r.content, section(3), { docType: "task" });
  assert.equal(r2.reason, "replaced");
  assert.match(
    r2.content,
    /None \(cycle 3\)\.\n\n## Change Log\n\n<!-- change-log-start -->/,
  );
});

test("O14 PR review 5 CR-1: every refusal names the rule that fired", () => {
  const cases = [
    [markerDoc(), "not a section", "bad-section", "not-a-section"],
    [
      markerDoc(),
      `${section(1)}\n\n\`\`\`\nopen`,
      "bad-section",
      "unclosed-fence",
    ],
    [
      markerDoc(),
      `${section(1)}\n\n${bugList}`,
      "bad-section",
      "carried-block:Bug Reports",
    ],
    [
      markerDoc(),
      `${section(1)}\n\n## Other`,
      "bad-section",
      "structural-line:## Other",
    ],
    [
      markerDoc(`${section(1)}\n\n${section(1)}\n\n`),
      section(2),
      "multiple",
      "multiple:2",
    ],
    [
      markerDoc(`${section(1)}\n\n\`\`\`\nopen\n\n`),
      section(2),
      "unbounded",
      "unclosed-fence",
    ],
  ];
  for (const [doc, render, reason, detail] of cases) {
    const r = QR.upsertQaResults(doc, render, { docType: "task" });
    assert.equal(r.reason, reason, detail);
    assert.equal(r.detail, detail);
    assert.equal(r.content, doc);
  }
});
