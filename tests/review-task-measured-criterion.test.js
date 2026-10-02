"use strict";

/**
 * review-task flags the success criteria finalise fails by construction (task 166; obs #206, #222).
 *
 * Finalise's AC agent passes a criterion without a per-PR test only when it is one of the test-free
 * kinds finalise-dod-ac-prompt.md Step 3 lists. Three shapes fit no kind and so fail at
 * acceptance, two pipeline steps after the review that could have caught them with one edit:
 *
 * - a non-functional criterion held by neither a planned test nor a measured bound (the bound rule in review-task Step 6 check 4) (task.164 AC7);
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
const { sectionOf, citingItemOf } = require("./lib/markdown-section");
// One normaliser for every phrase this file reads, the same one the count pin uses (QA cycle 5, CR5-4).
const {
  prose: asProse,
  countsOfKinds,
  FIXTURES,
} = require("./lib/count-of-kinds");

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
    first:
      /A non-functional criterion is held by a planned test or by a measured bound/,
    holds: [
      "numeric bound with the command that measures it",
      // The trigger carries the split itself (cycle 4, CR4-1): a command never holds a bound a test
      // could assert.
      "A bound a per-PR test could assert is held only by that planned per-PR test",
      "a measuring command does not hold it",
      "A bound no per-PR test could assert",
      "A criterion held neither way",
      // An unbounded criterion is held by its planned test, as finalise's behaviour path holds it
      // (cycle 1 CR-2, restored after the cycle-4 rewrite dropped it — cycle 5, CR5-1).
      "A criterion that states no numeric bound is held by its planned per-PR test",
      // Exceptions (CR4-4, CR4-5).
      "the post-merge rule still does",
      'line the AC agent can cite is finalise\'s "no unit tests applicable" kind, not a criterion this rule flags',
      "name the test that pins it, or — for a bound no per-PR test could assert — state the bound and the command",
    ],
  },
  {
    name: "behaviour-without-test rule (obs #222)",
    first: /A behaviour criterion names the test/,
    holds: [
      "no planned test",
      "name the test that pins it",
      "other than a non-functional one, which the rule above judges",
    ],
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

// The AC prompt owns the list of test-free kinds and its count (QA cycle 1, CR-1). Check 4 names
// every kind the prompt bullets, so a kind added there reds this test until review-task names it,
// and check 4 states no count of its own, so there is no second number to drift.
const AC = "shared/resources/finalise-dod-ac-prompt.md";
function acKinds() {
  const doc = readFileSync(join(__dirname, "..", AC), "utf8");
  const head = doc.search(
    /\*\*\w+ kinds of criterion may carry `test_citation/,
  );
  assert.notEqual(head, -1, `${AC}: no test-free kinds heading sentence`);
  const end = doc.indexOf("`test_runs_per_pr` is `null`", head);
  assert.notEqual(end, -1, `${AC}: no closing sentence after the kinds`);
  return [...doc.slice(head, end).matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) =>
    // Through the same asProse as the check-4 text, so backticks and emphasis are stripped on both
    // sides (QA cycle 2, CR2-4): "No unit tests applicable." → no unit tests applicable;
    // A measured criterion. → measured criterion.
    asProse(m[1])
      .replace(/["]/g, "")
      .replace(/\.$/, "")
      .replace(/^an? /i, "")
      .trim()
      .toLowerCase(),
  );
}

test("check 4 names every test-free kind the AC prompt lists, and counts none of them", () => {
  const kinds = acKinds();
  assert.ok(
    kinds.length >= 3,
    `${AC}: expected at least three bulleted kinds, found ${kinds}`,
  );
  const item = citingItemOf(
    check4(),
    /Classify each criterion the way finalise will/,
  );
  assert.ok(item, `${SKILL}: check 4 has no "Classify each criterion" item`);
  const prose = asProse(item).toLowerCase();
  // A whole-phrase match, so "unmeasured criterion" does not stand in for "measured criterion".
  const named = (k) =>
    new RegExp(
      `(^|[^\\w-])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\w-])`,
    ).test(prose);
  for (const k of kinds)
    assert.ok(named(k), `${SKILL}: check 4 does not name the "${k}" kind`);
  const counts = countsOfKinds(check4().join("\n"));
  assert.deepEqual(counts, [], `${SKILL}: check 4 counts the kinds`);
});

test("Step 6 Issues to Flag names all three findings under Important", () => {
  const step6 = sectionOf(text, STEP_6);
  const line = step6.find((l) => l.startsWith("- **Important**:"));
  assert.ok(line, `${SKILL}: Step 6 Issues to Flag has no Important line`);
  for (const f of [
    "a non-functional criterion held neither way the bound rule names",
    "a behaviour criterion with no planned test",
    "a criterion that can only be met after merge",
  ])
    assert.ok(
      line.includes(f),
      `Issues to Flag (Important) does not name: ${f}`,
    );
});

test("the shared count-of-kinds pattern matches a restated count and nothing else", () => {
  for (const t of FIXTURES.match)
    assert.equal(
      countsOfKinds(t).length,
      1,
      `should match: ${JSON.stringify(t)}`,
    );
  for (const t of FIXTURES.noMatch)
    assert.equal(
      countsOfKinds(t).length,
      0,
      `should not match: ${JSON.stringify(t)}`,
    );
});
