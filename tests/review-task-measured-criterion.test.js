"use strict";

/**
 * review-task flags the success criteria finalise fails by construction (task 166; obs #206, #222).
 *
 * Finalise's AC agent passes a criterion without a per-PR test only when it is one of three
 * test-free kinds (finalise-dod-ac-prompt.md Step 3). Three shapes fit no kind and so fail at
 * acceptance, two pipeline steps after the review that could have caught them with one edit:
 *
 * - a non-functional criterion with no numeric bound or no measuring command (task.164 AC7);
 * - a behaviour criterion that names no test planned to hold it (task.142 AC7/AC8);
 * - a criterion that can only be met after merge, when finalise runs before it (task.142 AC16).
 *
 * review-task Step 6 check 4 now raises each at Important. What this holds is PRESENCE and
 * SEVERITY, not application: that a reviewer applies the rule is a behaviour no CI layer exercises
 * for the review skills. Each rule is read from its OWN list item, and the severity is asserted
 * there — a check-4-scoped `**Important**` would stay green with one rule moved to Optional while
 * the other two still say Important.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { sectionOf, citingItemOf, asProse } = require("./lib/markdown-section");

const SKILL = "skills/review-task/SKILL.md";
const STEP_6 = "### Step 6: Consistency and Completeness Review";
const text = readFileSync(join(__dirname, "..", SKILL), "utf8");

// Check 4's lines: from its numbered item to the next one (`5. **`), inside Step 6.
function check4() {
  const step6 = sectionOf(text, STEP_6);
  assert.ok(step6, `${SKILL}: no "${STEP_6}" heading`);
  const start = step6.findIndex((l) =>
    /^4\. \*\*Success Criteria Measurability\*\*/.test(l),
  );
  assert.notEqual(
    start,
    -1,
    `${SKILL}: Step 6 has no check 4 "Success Criteria Measurability"`,
  );
  const end = step6.findIndex((l, i) => i > start && /^5\. \*\*/.test(l));
  assert.notEqual(end, -1, `${SKILL}: Step 6 check 4 has no following check 5`);
  return step6.slice(start, end);
}

const RULES = [
  {
    name: "bound-and-measurement rule (obs #206)",
    first: /A non-functional criterion states its bound/,
    holds: [
      "numeric bound",
      "the command that measures it",
      "state the bound and the command",
    ],
  },
  {
    name: "behaviour-without-test rule (obs #222)",
    first: /A behaviour criterion names the test/,
    holds: ["no planned test", "name the test that pins it"],
  },
  {
    name: "post-merge rule (obs #222)",
    first: /A criterion can be met before merge/,
    holds: [
      "after merge",
      "finalise runs before merge",
      "move it to Deferred Work or Notes",
    ],
  },
];

for (const rule of RULES) {
  test(`review-task check 4 carries the ${rule.name} at Important`, () => {
    const item = citingItemOf(check4(), rule.first);
    assert.ok(item, `${SKILL}: check 4 has no item for the ${rule.name}`);
    const prose = asProse(item);
    for (const h of rule.holds)
      assert.ok(prose.includes(h), `${rule.name}: lacks "${h}"`);
    assert.match(
      item,
      /\*\*Important\*\*/,
      `${rule.name}: not raised at **Important**`,
    );
    assert.doesNotMatch(
      item,
      /\*\*(Critical|Optional)\*\*/,
      `${rule.name}: carries a second severity`,
    );
  });
}

test("Step 6 Issues to Flag names all three findings under Important", () => {
  const step6 = sectionOf(text, STEP_6);
  const line = step6.find((l) => l.startsWith("- **Important**:"));
  assert.ok(line, `${SKILL}: Step 6 Issues to Flag has no Important line`);
  for (const f of [
    "a non-functional criterion with no numeric bound or no stated measurement",
    "a behaviour criterion with no planned test",
    "a criterion that can only be met after merge",
  ])
    assert.ok(
      line.includes(f),
      `Issues to Flag (Important) does not name: ${f}`,
    );
});
