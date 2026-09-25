"use strict";

/**
 * Identity-rule probe — a fix to a rule that decides whether two things are the
 * same must prove both directions (task.146, obs #169).
 *
 * On task.144 four of five QA cycles circled one record key. Each fix split what
 * was one or merged what was two, and each fix's test proved only the direction
 * its finding named. Two sites now carry the probe:
 *
 *   - qa-fix Step 3.5, a third table beside the lifecycle and documentation
 *     tables (Should merge / Should not merge / Which direction …);
 *   - the cycle-2 `REFUTE PASS.` directive in qa-task and qa-story, as an
 *     Identity rules paragraph AFTER the four-transition list.
 *
 * The directive has three properties this test holds, each mutation-proved:
 *
 *   1. The two directives are one text in two files. qa-task and qa-story each
 *      carry it, and nothing held them together before this test: an edit to
 *      one alone passed CI.
 *   2. Both carry the Identity rules paragraph.
 *   3. The paragraph sits OUTSIDE the list that "probe these four transitions"
 *      introduces. A fifth bullet would make "four" false, and it would gate the
 *      identity probe on a lifecycle trigger that a normaliser or
 *      equality-predicate change does not share (task.146 review.1). Presence
 *      and parity alone do not catch that: both files could make the same wrong
 *      edit.
 *
 * This holds that the probe is STATED. It cannot hold that a qa-fix run APPLIES
 * it. That evidence is the worked application recorded in the task's
 * implementation report.
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// The fenced block whose first content line is `REFUTE PASS.`, fence to fence.
// Returns "" when there is no such block, so the floor below fails loudly
// instead of two missing blocks comparing equal.
function refuteBlock(rel) {
  const lines = read(rel).split("\n");
  const start = lines.findIndex((l) => /^\s*REFUTE PASS\./.test(l));
  if (start < 1 || !/^\s*```\s*$/.test(lines[start - 1])) return "";
  const end = lines.findIndex((l, i) => i > start && /^\s*```\s*$/.test(l));
  return end === -1 ? "" : lines.slice(start, end).join("\n");
}

// From a `### ` heading to the next `### ` heading.
function stepSection(rel, heading) {
  const text = read(rel);
  const start = text.indexOf(`\n${heading}`);
  if (start === -1) return "";
  const next = text.indexOf("\n### ", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

const TASK = "skills/qa-task/SKILL.md";
const STORY = "skills/qa-story/SKILL.md";

test("qa-task and qa-story carry one refute directive, byte for byte", () => {
  const a = refuteBlock(TASK);
  const b = refuteBlock(STORY);
  assert.ok(a.length > 0, `${TASK}: REFUTE PASS. block not found`);
  assert.ok(b.length > 0, `${STORY}: REFUTE PASS. block not found`);
  assert.equal(a, b, "the two REFUTE PASS. directives have drifted apart");
});

for (const rel of [TASK, STORY]) {
  test(`${rel}: the refute directive probes identity rules`, () => {
    const block = refuteBlock(rel);
    assert.match(block, /^\s*Identity rules — /m);
    assert.match(
      block,
      /one pair that must be the same and one\s+that must differ/,
    );
  });

  test(`${rel}: the identity entry sits outside the four-transition list`, () => {
    const block = refuteBlock(rel);
    const intro = block.search(/probe these four\s+transitions/);
    const identity = block.search(/^\s*Identity rules — /m);
    assert.ok(
      intro !== -1,
      "the 'probe these four transitions' introduction is missing",
    );
    assert.ok(
      identity > intro,
      "the Identity rules entry must follow the transition list",
    );
    const bullets = block.slice(intro, identity).match(/^\s*• /gm) || [];
    assert.equal(
      bullets.length,
      4,
      "'these four' must introduce exactly four bullets",
    );
    assert.doesNotMatch(
      block,
      /^\s*• Identity rules/m,
      "Identity rules is a paragraph, not a bullet",
    );
  });
}

test("qa-fix Step 3.5 probes both directions of an identity rule", () => {
  const section = stepSection("skills/qa-fix/SKILL.md", "### Step 3.5");
  assert.ok(section.length > 0, "qa-fix Step 3.5 not found");
  assert.match(
    section,
    /\*\*For a fix to an identity rule, probe both directions\.\*\*/,
  );
  for (const row of [
    "Should merge",
    "Should not merge",
    "Which direction did the last fix move?",
  ]) {
    assert.match(
      section,
      new RegExp(`^\\| \\*\\*${row.replace(/\?/g, "\\?")}\\*\\* \\|`, "m"),
      `row missing: ${row}`,
    );
  }
  assert.match(section, /drawn from real call\s+sites/);
  assert.match(section, /\(obs #169\)/);
});
