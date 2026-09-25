"use strict";

/**
 * qa-fix: offer the structural move before another prose patch (task.148).
 *
 * Two changes to qa-fix, each held here:
 *
 *   - Step 2.6 (obs #167, #172) — a four-move menu (consolidate the contract,
 *     scope the claim, waive, patch) offered on two triggers (the pipeline's
 *     narrowing-residue offer; a repeat subject), with a fixed fix-summary shape.
 *   - Step 3.5, documentation row 1 (obs #174, #177) — the probe's population
 *     is every executed document that restates the subject, found by a named
 *     command, not a grep of the edited file; and the fix summary carries a
 *     `Probe:` block, because a probe that leaves no record cannot be told apart
 *     from one that was skipped.
 *
 * The population command is not only asserted to be present: it is EXTRACTED
 * and RUN in a throwaway git repository whose layout has three files that count
 * and three that must not (a generated references/ copy, a test fixture, task
 * history). Dropping `:(glob)` lets the fixture in and the count becomes 4.
 *
 * This holds that the step is STATED and that its command WORKS. It cannot hold
 * that a fixer CHOOSES well; that evidence is the hand run recorded in the
 * task's implementation report.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.resolve(__dirname, "..");
const QA_FIX = "skills/qa-fix/SKILL.md";
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// From a `### ` heading to the next `### ` heading.
function stepSection(heading) {
  const text = read(QA_FIX);
  const start = text.indexOf(`\n${heading}`);
  if (start === -1) return "";
  const next = text.indexOf("\n### ", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

const step26 = stepSection(
  "### Step 2.6: Offer the structural move before another patch",
);
const step35 = stepSection(
  "### Step 3.5: Adversarial pass over the fixes themselves",
);

// The documentation-deliverable block: from its lead paragraph to the next
// bold-led paragraph that opens another probe family.
function documentationBlock() {
  const start = step35.indexOf("**For a documentation deliverable");
  if (start === -1) return "";
  const end = step35.indexOf("**For a fix to an identity rule", start);
  return step35.slice(start, end === -1 ? undefined : end);
}
const docBlock = documentationBlock();

// Row 1 of the documentation table.
const row1 =
  docBlock
    .split("\n")
    .find((l) =>
      l.startsWith("| **What did this edit make false elsewhere?**"),
    ) || "";

// The first ```bash block under the documentation table — row 1 points to it,
// because a table cell cannot hold a fence.
function populationCommand() {
  const m = docBlock.match(/```bash\n([\s\S]*?)\n```/);
  if (!m) return "";
  return m[1]
    .split("\n")
    .filter((l) => !/^\s*#/.test(l) && l.trim() !== "")
    .join("\n");
}

// ── Step 2.6 is stated ───────────────────────────────────────────────────────

test("Step 2.6 exists, between Step 2.5 and Step 3", () => {
  assert.ok(step26.length > 0, "no Step 2.6 heading");
  const text = read(QA_FIX);
  const at = text.indexOf("\n### Step 2.6:");
  assert.ok(at > text.indexOf("\n### Step 2.5:"));
  assert.ok(at < text.indexOf("\n### Step 3: Apply Changes"));
});

test("Step 2.6 carries the four moves, as table rows", () => {
  for (const move of [
    "Consolidate the contract",
    "Scope the claim",
    "Waive",
    "Patch",
  ]) {
    assert.match(
      step26,
      new RegExp(`^\\| \\*\\*${move}\\*\\* \\|`, "m"),
      `missing move row: ${move}`,
    );
  }
});

test("Step 2.6 carries both triggers", () => {
  assert.match(step26, /\*\*\(a\) the pipeline offer\*\*/);
  // The loop's prompt block opens with describeNarrowingResidue's own text.
  assert.match(step26, /opening `Narrowing residue — …`/);
  assert.match(step26, /\*\*\(b\) a repeat subject\*\*/);
});

test("Step 2.6 carries the fixed fix-summary shape", () => {
  assert.match(
    step26,
    /^Narrowing residue: \{subject\} \(\{trigger: pipeline offer \| repeat subject\}\)$/m,
  );
  assert.match(
    step26,
    /^Move: consolidate \| scope the claim \| waive \| patch — \{one sentence why\}$/m,
  );
});

test("Step 2.6 cites obs #167 and obs #172, and yields to Step 2.5", () => {
  assert.match(step26, /obs #167/);
  assert.match(step26, /obs #172/);
  assert.match(step26, /Step 2\.5 wins/);
});

// ── Step 3.5 row 1 is rewritten ─────────────────────────────────────────────

test("Step 3.5's documentation lead paragraph reaches other files", () => {
  assert.match(docBlock, /in this file or in another file that restates it/);
  assert.doesNotMatch(docBlock, /\*sentence elsewhere in the same file\*/);
});

test("row 1 no longer greps the edited file; it names the population, its size and Step 2.6", () => {
  assert.ok(row1, "no row 1 in the documentation table");
  assert.doesNotMatch(row1, /Grep the file/);
  assert.match(row1, /population command below/);
  assert.match(row1, /population size/);
  assert.match(row1, /Step 2\.6's \*\*consolidate\*\* move exists for/);
  // CR-3: an offer, not a verdict — the fixer records the move it chose.
  assert.match(row1, /which move you chose/);
  assert.doesNotMatch(row1, /A population above 1 is Step 2\.6/);
  assert.match(row1, /obs #174/);
});

test("row 1 requires a Probe: block with the command and every hit's disposition, citing obs #177", () => {
  assert.match(row1, /`Probe:` block/);
  assert.match(row1, /the command as run/);
  assert.match(row1, /`updated` or `unaffected — \{why\}`/);
  assert.match(row1, /obs #177/);
  // The shape is shown, not only named.
  assert.match(docBlock, /^Probe: /m);
  assert.match(docBlock, /^Population: \{N\}$/m);
  assert.match(docBlock, /^Move: \{when N > 1 — /m);
});

// ── behaviour: the population command returns exactly the restating files ──

test("the population command returns exactly the 4 hand-authored restating files in a fixture repository", () => {
  const cmd = populationCommand();
  assert.ok(
    cmd.startsWith("comm -23"),
    `no population command found: ${JSON.stringify(cmd)}`,
  );
  assert.match(
    cmd,
    /<subject phrase>/,
    "the command's placeholder has moved; update this test",
  );

  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "qa-fix-population-"));
  try {
    const phrase = "who restores the lock";
    const files = {
      // count
      "skills/a/SKILL.md": `Rule: ${phrase} is the orchestrator.\n`,
      "skills/b/SKILL.md": `Also: ${phrase.toUpperCase()} — restated.\n`,
      "shared/resources/x.md": `The contract says ${phrase}.\n`,
      // must not count
      // a HAND-AUTHORED reference counts (CR-1: 70 of the repo's 478 are)
      "skills/b/references/hand.md": `---\nname: hand\n---\n\nStep doc: ${phrase}.\n`,
      // a generated copy does not — known by its marker line (here at line 5, after
      // frontmatter, as the bundler writes it), not by its directory
      "skills/a/references/x.md": `---\nname: x\ndescription: copy\n---\n<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/x.md. Regenerate via npm run bundle. -->\n\nGenerated copy: ${phrase}.\n`,
      "shared/resources/tests/fixtures/y.md": `Fixture: ${phrase}.\n`,
      "docs/tasks/t.md": `History: ${phrase}.\n`,
    };
    for (const [rel, body] of Object.entries(files)) {
      fs.mkdirSync(path.join(repo, path.dirname(rel)), { recursive: true });
      fs.writeFileSync(path.join(repo, rel), body);
    }
    const git = (...args) =>
      execFileSync("git", args, { cwd: repo, encoding: "utf8" });
    git("init", "-q");
    git("add", ".");

    const run = cmd.split("<subject phrase>").join(phrase);
    const out = execFileSync("bash", ["-c", run], {
      cwd: repo,
      encoding: "utf8",
    });
    const hits = out.trim().split("\n").filter(Boolean).sort();
    assert.deepEqual(hits, [
      "shared/resources/x.md",
      "skills/a/SKILL.md",
      "skills/b/SKILL.md",
      "skills/b/references/hand.md",
    ]);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ── CR-5: the posted fix summary has somewhere to put these blocks ──────────

test("the Step 7 fix-summary template carries a slot for Probe:, Narrowing residue: and Struck mechanism:", () => {
  // The whole file, not stepSection: the template itself holds `### ` headings,
  // which would end a heading-to-heading slice inside it. FIX_SUMMARY= occurs once.
  const m = read(QA_FIX).match(/FIX_SUMMARY="([\s\S]*?)\n"\n/);
  assert.ok(m, "no FIX_SUMMARY template in Step 7");
  const tpl = m[1];
  assert.match(tpl, /### 🔎 Probe and structural move/);
  for (const block of [
    "Probe:",
    "Narrowing residue:",
    "Move:",
    "Struck mechanism:",
  ]) {
    assert.ok(tpl.includes(block), `the template does not name ${block}`);
  }
});
