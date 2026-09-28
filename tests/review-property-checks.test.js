"use strict";

/**
 * Review property checks — invariant verification (obs #161) and released-shape
 * diff (obs #170) stay stated at every site (task 151).
 *
 * Every check review-task ran before task 151 verified that a named thing
 * EXISTS. Two defects passed review that way:
 *
 * - task.141 claimed zero-padding keeps a basename sort chronological. Every
 *   existence check passed; one `node -e` line falsified it (obs #161).
 * - task.143 scoped its legacy handling to the one field its QA finding named;
 *   the released shape at v0.51.0 lacked three more (obs #170).
 *
 * The checks that close those gaps live at eight sites: review-task Step 3 and
 * its Detection Rules, review-story Step 4 and its Detection Rules, and the
 * authoring twins in create-task 3.5.
 *
 * What this holds is PRESENCE, not application — that a reviewer applies a
 * check is a behaviour no CI layer exercises for the review skills; the task's
 * implementation report records hand runs as that evidence instead.
 *
 * Scope, as in its sibling tests/outcome-reachability-check.test.js: SECTION-
 * scoped (a mention elsewhere in a 2,000-line SKILL.md cannot satisfy a site),
 * and the elements and verdicts are asserted on the check's OWN LIST ITEM —
 * `Critical` and `Important` occur throughout these sections, so a section-
 * scoped assertion on them passes with the check deleted.
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

// What an invariant check must name: what it acts on, what it does, and the
// inputs it does it with. "run" alone would pass on a check that says "do not
// run it" — hence the verdict holds below.
const INVARIANT = [
  { name: "run/execute verb", re: /\b(run|execut)/i },
  { name: "existing function", re: /existing function/i },
  { name: "inputs", re: /\binputs\b/i },
];
const RELEASED = [
  { name: "git show", re: /git show <tag>:<path>/ },
  { name: "release tag", re: /\btag\b/ },
  { name: "diff", re: /\bdiff/i },
];

// Verdicts, anchored on the imperative so a negated or inverted sentence fails
// instead of satisfying the hold (the task.145 CR3-6 lesson).
const FALSIFIED_CRITICAL = {
  name: "Critical verdict on a falsified invariant",
  re: /Report a falsified invariant as Critical/,
};
const UNCOVERED_IMPORTANT = {
  name: "Important verdict on an uncovered field",
  re: /does not cover → Important/,
};
const CITE_TAG = { name: "cite-the-tag requirement", re: /must cite the tag/ };

const SITES = [
  {
    file: RT,
    heading: RT_STEP,
    citation: /obs #161\b/,
    elements: INVARIANT,
    holds: [FALSIFIED_CRITICAL],
    sectionHolds: [
      {
        name: "hallucination-pattern line for an unrun property",
        re: /❌ A property of an existing function asserted for new inputs, and never run on them \(check 11\)/,
      },
      {
        name: "falsified invariant in the Critical flag list",
        re: /Critical: Invented libraries\/APIs, incorrect paths, wrong patterns, a falsified invariant \(check 11\)/,
      },
    ],
  },
  {
    file: RT,
    heading: RULES,
    citation: /Invariant Verification/,
    elements: INVARIANT.slice(0, 1),
    holds: [
      {
        name: "MUST-be-executed rule",
        re: /MUST be executed on those inputs/,
      },
    ],
  },
  {
    file: RS,
    heading: RS_STEP,
    citation: /obs #161\b/,
    elements: INVARIANT,
    holds: [FALSIFIED_CRITICAL],
    sectionHolds: [
      {
        name: "hallucination-pattern line for an unrun property",
        re: /❌ A property of an existing function asserted for new inputs, and never run on them \(check 8\)/,
      },
    ],
  },
  {
    file: RS,
    heading: RULES,
    citation: /Invariant Verification/,
    elements: INVARIANT.slice(0, 1),
    holds: [
      {
        name: "MUST-be-executed rule",
        re: /MUST be executed on those inputs/,
      },
    ],
  },
  {
    file: CT,
    heading: CT_STEP,
    citation: /obs #161\b/,
    elements: INVARIANT,
    holds: [
      {
        name: "Critical verdict on a falsified property",
        re: /A falsified property is Critical/,
      },
    ],
  },
  {
    file: RT,
    heading: RT_STEP,
    citation: /obs #170\b/,
    elements: RELEASED,
    holds: [UNCOVERED_IMPORTANT, CITE_TAG],
  },
  {
    file: RS,
    heading: RS_STEP,
    citation: /obs #170\b/,
    elements: RELEASED,
    holds: [UNCOVERED_IMPORTANT, CITE_TAG],
  },
  {
    file: CT,
    heading: CT_STEP,
    citation: /obs #170\b/,
    elements: RELEASED,
    holds: [
      {
        name: "cover-every-field requirement",
        re: /cover every field the diff shows, and cite the tag/,
      },
    ],
  },
];

const read = (rel) => readFileSync(join(REPO_ROOT, rel), "utf8");
const label = (s) => `${s.file} › "${s.heading}" (${s.citation.source})`;

test("floor: every site's section heading is found", () => {
  assert.equal(SITES.length, 8, "the site list is the eight task 151 sites");
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
    const whole = asProse(section.join("\n"));
    for (const el of site.sectionHolds || []) {
      assert.match(
        whole,
        el.re,
        `${label(site)}: the section does not carry the ${el.name}`,
      );
    }
  });
}

test("review-task numbers the new checks after outcome reachability", () => {
  // task.145 landed check 10 first; the two new checks append as 11 and 12,
  // and review-story's as 8 and 9 after its check 7. The pattern lines above
  // cite those numbers, so a renumbering must move both together.
  const rt = sectionOf(read(RT), RT_STEP).join("\n");
  assert.match(rt, /^11\. \*\*Invariant verification\*\* \(obs #161\):/m);
  assert.match(
    rt,
    /^12\. \*\*Released-shape diff for compatibility handling\*\* \(obs #170\):/m,
  );
  const rs = sectionOf(read(RS), RS_STEP).join("\n");
  assert.match(rs, /^8\. \*\*Invariant verification\*\* \(obs #161\):/m);
  assert.match(
    rs,
    /^9\. \*\*Released-shape diff for compatibility handling\*\* \(obs #170\):/m,
  );
});

test("the item reader does not reach past the citing item", () => {
  // Self-test of the scope that makes the per-item holds non-vacuous: a sibling
  // item carrying every element and verdict must not satisfy the citing one.
  const SIBLING =
    "   - run the existing function on the inputs; Report a falsified invariant as Critical;" +
    " git show <tag>:<path> and diff; does not cover → Important; must cite the tag";
  const section = [
    "10. **Other check** (obs #168):",
    SIBLING,
    "",
    "11. **The check** (obs #161):",
    "    - only the citation lives here",
    "",
    "12. **Next check** (obs #170):",
    SIBLING,
  ];
  const item = citingItemOf(section, /obs #161\b/);
  assert.equal(
    item,
    "11. **The check** (obs #161):\n    - only the citation lives here",
  );
  for (const el of [
    ...INVARIANT,
    ...RELEASED,
    FALSIFIED_CRITICAL,
    UNCOVERED_IMPORTANT,
    CITE_TAG,
  ]) {
    assert.match(asProse(SIBLING), el.re, `fixture must carry ${el.name}`);
    assert.doesNotMatch(asProse(item), el.re);
  }
});
