"use strict";

/**
 * Call-site population check (obs #120) — stated at every site (task 129).
 *
 * A task that scopes itself as "the N call sites of engine X" makes a claim
 * about a population. Review checked the N it named and never the population:
 * on task.121 the pre-pass grepped for the named sites and confirmed each, and
 * the collector the task's own guard reuses found two more in scope. The check
 * that closes that gap lives at five sites — review-task Step 3 and its
 * Detection Rules, review-story Step 4 and its Detection Rules, and the
 * authoring twin in create-task 3.5 — and both pre-pass Agent C prompts carry
 * the instruction that feeds it.
 *
 * What this holds is PRESENCE, not application — as in its siblings
 * tests/review-property-checks.test.js and tests/outcome-reachability-check.test.js:
 * section-scoped, with the check's elements and verdicts asserted on its OWN
 * list item, because "Important" occurs throughout these sections and a
 * section-scoped assertion on it passes with the check deleted.
 *
 * The families audit cannot hold the review-task/review-story wording: no family
 * in skill-families.md covers the review skills. So the "same wording in both"
 * property is asserted here directly.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { sectionOf, citingItemOf, asProse } = require("./lib/markdown-section");

const REPO_ROOT = join(__dirname, "..");

const RT = "skills/review-task/SKILL.md";
const RS = "skills/review-story/SKILL.md";
const CT = "skills/create-task/SKILL.md";
const RT_STEP = "### Step 3: Technical Accuracy and Anti-Hallucination Review";
const RS_STEP = "### Step 4: Technical Accuracy and Anti-Hallucination Review";
const CT_STEP = "### 3.5 Adversarial Quality Review";
const RULES = "### Detection Rules";
const CITE = /obs #120\b/;

// What the review check must name: when it fires, what it runs, what it compares.
const TRIGGER = [
  { name: "enumeration trigger", re: /enumerates (?:invocations|call sites)/ },
  { name: "all-call-sites trigger", re: /all call sites of/ },
  { name: "the collector", re: /call-sites\.js/ },
];
// Verdicts, anchored on the arrow so a negated sentence fails the hold.
const REVIEW_HOLDS = [
  {
    name: "Important verdict on an unnamed site",
    re: /does not name → Important/,
  },
  {
    name: "Important verdict on a disagreeing count",
    re: /disagrees with the collector's → Important/,
  },
  {
    name: "stated-exclusion carve-out",
    re: /A stated exclusion is not a finding/,
  },
  {
    name: "empty-is-an-instrument-claim rule",
    re: /reason: empty is a claim about the instrument/,
  },
];

const SITES = [
  {
    file: RT,
    heading: RT_STEP,
    citation: CITE,
    elements: TRIGGER,
    holds: REVIEW_HOLDS,
  },
  {
    file: RS,
    heading: RS_STEP,
    citation: CITE,
    elements: TRIGGER,
    holds: REVIEW_HOLDS,
  },
  {
    file: RT,
    heading: RULES,
    citation: /Population Verification/,
    elements: [TRIGGER[2]],
    holds: [
      {
        name: "MUST-be-diffed rule",
        re: /MUST be diffed against the collector's/,
      },
    ],
  },
  {
    file: RS,
    heading: RULES,
    citation: /Population Verification/,
    elements: [TRIGGER[2]],
    holds: [
      {
        name: "MUST-be-diffed rule",
        re: /MUST be diffed against the collector's/,
      },
    ],
  },
  {
    file: CT,
    heading: CT_STEP,
    citation: CITE,
    elements: [TRIGGER[2], TRIGGER[1]],
    holds: [
      {
        name: "measure-not-recall rule",
        re: /measure the population instead of recalling it/,
      },
      {
        name: "scope-or-exclusion rule",
        re: /as in scope or as a stated exclusion/,
      },
    ],
  },
];

const read = (rel) => readFileSync(join(REPO_ROOT, rel), "utf8");
const label = (s) => `${s.file} › "${s.heading}" (${s.citation.source})`;

test("floor: every site's section heading is found", () => {
  assert.equal(SITES.length, 5, "the site list is the five task 129 sites");
  const missing = SITES.filter(
    (s) => sectionOf(read(s.file), s.heading) === null,
  );
  assert.deepEqual(
    missing.map(label),
    [],
    "a renamed heading must be updated here, not dropped",
  );
});

for (const site of SITES) {
  test(`${label(site)}: the check is stated on its own item`, () => {
    const section = sectionOf(read(site.file), site.heading);
    assert.ok(section, `${site.file}: heading "${site.heading}" not found`);
    const item = citingItemOf(section, site.citation);
    assert.ok(
      item,
      `${label(site)}: no list item cites ${site.citation.source} — the check is missing from this site`,
    );
    const prose = asProse(item);
    for (const el of [...site.elements, ...site.holds]) {
      assert.match(
        prose,
        el.re,
        `${label(site)}: the check does not carry the ${el.name}`,
      );
    }
  });
}

test("each review check runs its own skill's bundled collector", () => {
  // The command sits in a fence inside the list item, which the item reader
  // drops, so it is asserted on the raw section. The path names the skill the
  // bundler copies call-sites.js into — a review-story path in review-task
  // would run nothing on a consumer that installed one skill and not the other.
  for (const [file, heading, skill] of [
    [RT, RT_STEP, "review-task"],
    [RS, RS_STEP, "review-story"],
  ]) {
    const raw = sectionOf(read(file), heading).join("\n");
    assert.ok(
      raw.includes(
        `command node .agents/skills/${skill}/references/call-sites.js --engine`,
      ),
      `${file}: the population check does not run .agents/skills/${skill}/references/call-sites.js`,
    );
  }
});

test("review-task and review-story state the check in the same words", () => {
  // Only the check number, the list indent and the skill in the command path
  // may differ. Anything else is drift between two copies of one rule.
  const norm = (file, heading, skill) =>
    asProse(citingItemOf(sectionOf(read(file), heading), CITE))
      .replace(/^\d+\. /, "N. ")
      .replaceAll(skill, "SKILL");
  assert.equal(
    norm(RT, RT_STEP, "review-task"),
    norm(RS, RS_STEP, "review-story"),
  );
});

test("the checks are numbered after the last existing check", () => {
  // review-task had checks 1–13 and review-story 1–9 when task 129 landed; the
  // hallucination-pattern lines cite these numbers, so a renumbering must move
  // both together.
  const rt = sectionOf(read(RT), RT_STEP).join("\n");
  assert.match(rt, /^14\. \*\*Call-site population\*\* \(obs #120\):/m);
  assert.match(
    rt,
    /❌ A list of an engine's call sites taken from the author's recall, never diffed against the collector \(check 14\)/,
  );
  const rs = sectionOf(read(RS), RS_STEP).join("\n");
  assert.match(rs, /^10\. \*\*Call-site population\*\* \(obs #120\):/m);
  assert.match(
    rs,
    /❌ A list of an engine's call sites taken from the author's recall, never diffed against the collector \(check 10\)/,
  );
});

test("both pre-pass Agent C prompts run the collector and return population_diff", () => {
  for (const [file, skill] of [
    ["shared/resources/review-task-prepass-prompts.md", "review-task"],
    ["shared/resources/review-story-prepass-prompts.md", "review-story"],
  ]) {
    const agentC = sectionOf(
      read(file),
      "## Agent C — Codebase Already-Implemented Scan",
    );
    assert.ok(agentC, `${file}: Agent C section not found`);
    const raw = agentC.join("\n");
    assert.ok(
      raw.includes(
        `command node .agents/skills/${skill}/references/call-sites.js --engine`,
      ),
      `${file}: Agent C does not run the ${skill} collector`,
    );
    assert.match(
      raw,
      /^population_diff:$/m,
      `${file}: Agent C's schema has no population_diff`,
    );
  }
});
