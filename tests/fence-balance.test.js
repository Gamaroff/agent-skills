"use strict";
/**
 * Fence-balance guard (task.280, obs #48): every tracked SKILL.md and shared resource ends with
 * no fence left open.
 *
 * WHY A BALANCE CHECK AND NOT A COUNT
 * -----------------------------------
 * The first design compared `extractBlocks`' bash-block count with the raw ```bash line count
 * per file. Measured on 2026-11-18 that fails five balanced files, because a ```bash example
 * nested inside a ````markdown wrapper is a raw line and correctly not a block. The check
 * `fenceProblems` (shared/resources/qa-execute-snippets.mjs) shares `extractBlocks`' own line
 * walk, so there is one definition of where a fence opens and closes.
 *
 * A stray four-backtick fence once put two steps of create-epics-from-shards inside a code block
 * and a test that read the file by regex passed for five QA cycles. A fence left open surfaces
 * here the moment it is authored.
 */
const test = require("node:test");
const { before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
// Assembled, so the fence-reader ratchet and the relationship-assertion scanner see no fence literal here.
const FENCE = String.fromCharCode(96).repeat(3);

let extractBlocks;
let fenceProblems;
before(async () => {
  ({ extractBlocks, fenceProblems } =
    await import("../shared/resources/qa-execute-snippets.mjs"));
});

/** Tracked `skills/*\/SKILL.md` and `shared/resources/*.md` (staged files count, as in bundle-comment-origin). */
function filesInScope() {
  const out = execFileSync(
    "git",
    ["ls-files", "-z", "--", "skills/*/SKILL.md", "shared/resources/*.md"],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  return out
    .split("\0")
    .filter(Boolean)
    .filter((f) =>
      /^skills\/[^/]+\/SKILL\.md$|^shared\/resources\/[^/]+\.md$/.test(f),
    )
    .filter((f) => fs.existsSync(path.join(REPO_ROOT, f)));
}

/**
 * Balanced files whose raw ```bash line count exceeds their block count, because an example fence
 * nests inside a longer wrapper. They are the control: a count comparison fails them, a balance
 * check must not.
 */
const NESTED_EXAMPLE_FILES = [
  "shared/resources/security-review-prompt.md",
  "skills/create-parallel-stories/SKILL.md",
  "skills/mermaid-architect/SKILL.md",
  "skills/qa-story/SKILL.md",
  "skills/qa-task/SKILL.md",
];

test("no tracked SKILL.md or shared resource ends with a fence left open", () => {
  const files = filesInScope();
  assert.ok(
    files.length >= 150,
    `non-vacuity floor: expected ≥ 150 files in scope (193 on 2026-11-18), found ${files.length}`,
  );
  const bad = [];
  for (const rel of files) {
    for (const p of fenceProblems(
      fs.readFileSync(path.join(REPO_ROOT, rel), "utf8"),
    )) {
      bad.push(`${rel}:${p.line} ${p.kind}`);
    }
  }
  assert.deepEqual(
    bad,
    [],
    `a fence is left open (a stray or missing closing fence swallows the rest of the file):\n  ${bad.join("\n  ")}`,
  );
});

test("control: files with an example fence nested in a longer wrapper are balanced although raw ```bash lines exceed their blocks", () => {
  for (const rel of NESTED_EXAMPLE_FILES) {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    // A raw line count, not a reader: the fence token is assembled so the ratchet sees no fence regex here.
    const rawFence = new RegExp("^\\s*" + FENCE + "bash");
    const raw = text.split("\n").filter((l) => rawFence.test(l)).length;
    const blocks = extractBlocks(text).length;
    assert.ok(
      raw > blocks,
      `${rel}: the control is only a control while raw (${raw}) exceeds blocks (${blocks}); pick another nested-example file if this one changed`,
    );
    assert.deepEqual(
      fenceProblems(text),
      [],
      `${rel} is balanced and must pass`,
    );
  }
});

test("an unclosed fence is flagged with the line of its opening fence", () => {
  const doc = ["# T", "", "```bash", "echo hi", ""].join("\n");
  assert.deepEqual(fenceProblems(doc), [{ line: 3, kind: "unclosed-fence" }]);
});

test("a stray closing fence surfaces as an open fence at the end of the file", () => {
  const doc = [
    "```bash",
    "echo one",
    "```",
    "",
    "text",
    "```", // stray: reads as an opener, never closed
    "",
    "more text",
  ].join("\n");
  assert.deepEqual(fenceProblems(doc), [{ line: 6, kind: "unclosed-fence" }]);
});

test("a stray four-backtick fence that swallows a later block leaves the file open", () => {
  const doc = [
    "````markdown", // never closed: the shape that hid Steps 6-7 in obs #48
    "step six",
    "```bash",
    "echo seven",
    "```",
    "",
  ].join("\n");
  assert.deepEqual(fenceProblems(doc), [{ line: 1, kind: "unclosed-fence" }]);
});

test("a balanced document, with a nested example, has no problem", () => {
  const doc = [
    "````markdown",
    "```bash",
    "echo example",
    "```",
    "````",
    "",
    "```bash",
    "echo real",
    "```",
    "",
  ].join("\n");
  assert.deepEqual(fenceProblems(doc), []);
  assert.deepEqual(
    extractBlocks(doc).map((b) => b.code),
    ["echo real"],
    "extractBlocks still returns the real block only",
  );
});
