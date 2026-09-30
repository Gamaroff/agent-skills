"use strict";
/**
 * QA Testing Results — the Step 12 writer is EXECUTED, not grepped (task.155).
 *
 * qa-task Step 12 and qa-story Step 12 item 3 each carry one fenced bash block that
 * writes the section through `qa-results.js`. Grepping for the call proves the text
 * exists, not that it runs: a wrong require path, a missing bundled copy (the
 * task.139 MODULE_NOT_FOUND shape) or a misbound variable all pass a grep.
 *
 * This test extracts each block verbatim (dedented — qa-story's sits inside a
 * numbered list), runs it with bash from a consumer-shaped cwd that holds ONLY the
 * skill's own bundled `references/` under `.agents/skills/<skill>/`, and asserts:
 *   1. a fixture with its section inside the change-log block ends with exactly one
 *      section, outside the block, and a second run replaces it in place;
 *   2. a fixture with two stacked sections halts non-zero and is left byte-identical.
 *
 * Run: node --test tests/qa-results-step12-wiring.test.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("node:assert/strict");
const test = require("node:test");
const { spawnSync } = require("child_process");
const { findQaResults } = require("../shared/resources/qa-results.js");

const REPO_ROOT = path.resolve(__dirname, "..");
const MARKER = "# QA Testing Results writer (task 155)";

const SKILLS = [
  { skill: "qa-task", fileVar: "TASK_FILE", docName: "task.9.fixture.md" },
  { skill: "qa-story", fileVar: "STORY_FILE", docName: "story.9.1.fixture.md" },
];

// The one ```bash fence whose body carries MARKER, dedented by its fence's indent.
function extractBlock(skill) {
  const lines = fs
    .readFileSync(path.join(REPO_ROOT, "skills", skill, "SKILL.md"), "utf8")
    .split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^( *)```bash\s*$/.exec(lines[i]);
    if (!open) continue;
    const indent = open[1].length;
    const body = [];
    let j = i + 1;
    for (; j < lines.length && !/^ *```\s*$/.test(lines[j]); j++) {
      body.push(lines[j].slice(Math.min(indent, lines[j].search(/\S|$/))));
    }
    if (body.some((l) => l.includes(MARKER))) blocks.push(body.join("\n"));
    i = j;
  }
  return blocks;
}

function consumerDir(skill) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-results-wiring-"));
  const refs = path.join(dir, ".agents", "skills", skill, "references");
  fs.mkdirSync(refs, { recursive: true });
  for (const f of ["qa-results.js", "change-log.js"]) {
    fs.copyFileSync(
      path.join(REPO_ROOT, "skills", skill, "references", f),
      path.join(refs, f),
    );
  }
  fs.mkdirSync(path.join(dir, ".claude", "state"), { recursive: true });
  return dir;
}

const section = (n) =>
  `## QA Testing Results\n\n**QA Status**: PASS\n**Gate File**: [g](./x.gate.${n}.yml)\n\n### Key Findings\nCycle ${n}.\n`;

const LOG =
  "<!-- change-log-start -->\n\n## Change Log\n\n| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-09-30 | 1.0 | Initial draft | create-task |\n\n";

function run(block, dir, fileVar, docPath) {
  return spawnSync("bash", ["-c", block], {
    cwd: dir,
    env: { ...process.env, [fileVar]: docPath },
    encoding: "utf8",
  });
}

for (const { skill, fileVar, docName } of SKILLS) {
  test(`${skill} Step 12 carries exactly one engine-writer block`, () => {
    assert.equal(extractBlock(skill).length, 1);
  });

  test(`${skill} Step 12 writer relocates, then replaces — one section, outside the block`, () => {
    const [block] = extractBlock(skill);
    const dir = consumerDir(skill);
    try {
      const doc = path.join(dir, docName);
      fs.writeFileSync(
        doc,
        `---\ntype: task\n---\n\n# Doc\n\n## Body\n\ntext\n\n${LOG}${section(1)}\n<!-- change-log-end -->\n`,
      );
      const sectionFile = path.join(
        dir,
        ".claude",
        "state",
        "qa-results-section.md",
      );

      fs.writeFileSync(sectionFile, section(2));
      const r1 = run(block, dir, fileVar, doc);
      assert.equal(r1.status, 0, r1.stderr);
      assert.match(r1.stdout, /qa-results: relocated/);

      fs.writeFileSync(sectionFile, section(3));
      const r2 = run(block, dir, fileVar, doc);
      assert.equal(r2.status, 0, r2.stderr);
      assert.match(r2.stdout, /qa-results: replaced/);
      assert.equal(
        fs.existsSync(sectionFile),
        false,
        "the consumed section file is removed (CR-4)",
      );

      const text = fs.readFileSync(doc, "utf8");
      const { sections } = findQaResults(text);
      assert.equal(sections.length, 1);
      assert.equal(sections[0].insideChangeLog, false);
      assert.match(text, /Cycle 3\./);
      assert.doesNotMatch(text, /Cycle [12]\./);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`${skill} Step 12 writer halts on stacked sections and writes nothing`, () => {
    const [block] = extractBlock(skill);
    const dir = consumerDir(skill);
    try {
      const doc = path.join(dir, docName);
      const stacked = `---\ntype: task\n---\n\n${section(1)}\n---\n\n${section(2)}\n`;
      fs.writeFileSync(doc, stacked);
      fs.writeFileSync(
        path.join(dir, ".claude", "state", "qa-results-section.md"),
        section(3),
      );
      const r = run(block, dir, fileVar, doc);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /HALT qa-results: multiple \(2 sections\)/);
      assert.equal(fs.readFileSync(doc, "utf8"), stacked);
      assert.ok(
        fs.existsSync(
          path.join(dir, ".claude", "state", "qa-results-section.md"),
        ),
        "a refused write keeps the section file for the operator",
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
