"use strict";

/**
 * Review: a plan's own command is run once, and a new CI environment gets a parity line
 * (task.298; obs #163).
 *
 * review-task Step 3 states the new check (found by name, its number derived here and never typed in;
 * a later check may follow it), and lists it in the three places that list checks by number or shape. create-task § 3.5
 * "Should Add" carries the matching environment-parity item.
 *
 * What this holds is PRESENCE, as its siblings do (tests/review-plan-shape-checks.test.js): that each
 * rule is stated at its site with its trigger, safe form, no-safe-form fallback, worked example and
 * severity. That a reviewer APPLIES it is a behaviour no CI layer exercises.
 *
 * REVIEW_RUN_PARITY_ROOT points the test at a copy of the tree, for the mutation proof.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { sectionOf } = require("./lib/markdown-section");

const ROOT = process.env.REVIEW_RUN_PARITY_ROOT || path.join(__dirname, "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const RT = "skills/review-task/SKILL.md";
const CT = "skills/create-task/SKILL.md";
const STEP3 = "### Step 3: Technical Accuracy and Anti-Hallucination Review";
const SHOULD_ADD = "#### ⚡ Should Add (present to user for confirmation)";
const NAME = "A plan's own command is run once, in a safe form";

const step3 = sectionOf(read(RT), STEP3);

/** The text of the numbered item `N. **name**` up to the next top-level numbered item. */
function itemByName(lines, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const head = new RegExp(`^(\\d+)\\. \\*\\*${escaped}\\*\\*`);
  const start = lines.findIndex((l) => head.test(l));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (
      /^\d+\. \*\*/.test(lines[i]) ||
      /^\*\*[A-Z][^*]+\*\*:?$/.test(lines[i].trim())
    ) {
      end = i;
      break;
    }
  }
  return {
    number: Number(lines[start].match(head)[1]),
    text: lines.slice(start, end).join("\n"),
  };
}

const highestNumber = (lines) =>
  Math.max(
    ...lines
      .map((l) => l.match(/^(\d+)\. \*\*/))
      .filter(Boolean)
      .map((m) => Number(m[1])),
  );

const item = step3 && itemByName(step3, NAME);

test("review-task Step 3 is found, and its numbered list is not vacuous", () => {
  assert.ok(step3, `heading "${STEP3}" not found in ${RT}`);
  assert.ok(
    highestNumber(step3) >= 31,
    "the Step 3 list is expected to reach at least check 31",
  );
});

test("the new check exists in the Step 3 list, and a later check does not break this", () => {
  assert.ok(item, `check "${NAME}" missing from ${RT} Step 3`);
  assert.ok(
    item.number >= 31,
    "the new check follows check 30 (it was added as 31)",
  );
  assert.ok(
    item.number <= highestNumber(step3),
    "the list reaches at least the new check; a later check may exceed it",
  );
});

test("the new check states its trigger, safe form, fallback, worked example and severities", () => {
  assert.ok(item, "check missing");
  const t = item.text;
  assert.match(t, /\(obs #163\)/, "obs id");
  assert.match(t, /^\s+- Trigger: /m, "Trigger: line");
  assert.match(t, /\*\*dry-run\*\*/, "the dry-run safe form");
  assert.match(t, /\*\*scratch\*\*/, "the scratch-target safe form");
  assert.match(t, /never the\s+real target/, "never the real target");
  assert.match(t, /`unrun — no safe form`/, "the no-safe-form fallback");
  assert.match(
    t,
    /Never improvise a flag/,
    "no improvised flag for a command without one",
  );
  assert.match(t, /^\s+- Worked example: .*task\.295/m, "worked example");
  assert.match(t, /\*\*Important\*\*/, "Important severity");
  assert.match(t, /\*\*Optional\*\*/, "Optional severity (unrun)");
});

test("control: the new check is not check 23 or check 11, and says how it differs from them", () => {
  assert.ok(item, "check missing");
  const c23 = itemByName(
    step3,
    "A parity claim enumerates the sibling's guards",
  );
  assert.ok(c23, "check 23 missing");
  assert.doesNotMatch(
    c23.text,
    /dry-run/,
    "check 23 is not about running a command",
  );
  assert.doesNotMatch(
    item.text,
    /guard list/,
    "the new check is not a guard-list check",
  );
  assert.match(item.text, /not check 11/, "distinguished from check 11");
  assert.match(item.text, /§ 3\.5/, "points at the create-task parity item");
});

test("the three list sites name the new check by its number", () => {
  assert.ok(item, "check missing");
  const n = item.number;
  const joined = step3.join("\n");
  assert.match(
    joined,
    new RegExp(`^- ❌ .+\\(check ${n}\\)$`, "m"),
    "❌ pattern line",
  );
  assert.match(
    joined,
    new RegExp(`^- \\*\\*Important\\*\\*: .*check ${n} \\(`, "m"),
    "Issues to Flag, Important line",
  );
  assert.match(
    joined,
    new RegExp(`^- \\*\\*Optional\\*\\*: .*\\(check ${n}\\)$`, "m"),
    "Issues to Flag, Optional line",
  );
  assert.match(
    read(RT),
    new RegExp(
      `^\\d+\\. \\*\\*[A-Za-z-]+ Verification\\*\\*: .+\\(Step 3 check ${n}\\)$`,
      "m",
    ),
    "Anti-Hallucination Protocol detection rule",
  );
});

test("create-task § 3.5 Should Add carries the environment-parity item", () => {
  const section = sectionOf(read(CT), SHOULD_ADD);
  assert.ok(section, `heading "${SHOULD_ADD}" not found in ${CT}`);
  const bullet = section.find((l) =>
    l.startsWith("- **CI scripts run in a new environment**"),
  );
  assert.ok(bullet, "the parity bullet is missing from Should Add");
  assert.match(
    bullet,
    /\(obs #163; review-task check \d+\)/,
    "obs id and check",
  );
  assert.match(bullet, /\*\*parity line\*\*/, "the parity line");
  for (const dimension of [
    "user",
    "base image",
    "shells",
    "awk variants",
    "tool versions",
  ])
    assert.ok(bullet.includes(dimension), `names "${dimension}"`);
  assert.match(bullet, /review-task check 23/, "distinguished from check 23");
  assert.match(bullet, /task\.295/, "worked example");
});

test("the create-task bullet cites the review-task check by the number it has", () => {
  assert.ok(item, "check missing");
  const section = sectionOf(read(CT), SHOULD_ADD);
  const bullet = section.find((l) =>
    l.startsWith("- **CI scripts run in a new environment**"),
  );
  assert.ok(bullet, "the parity bullet is missing");
  assert.ok(
    bullet.includes(`; review-task check ${item.number})`),
    `the bullet cites review-task check ${item.number}`,
  );
});
