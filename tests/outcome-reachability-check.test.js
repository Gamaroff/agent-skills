"use strict";

/**
 * Outcome reachability — the review check stays stated at every site (task.145, obs #168).
 *
 * task.144's success criteria said an accept-all fixture would score
 * `present-but-inert`. `computeVerdict` returns that verdict only when some
 * hostile case was rejected, so an accept-all scores `absent`. `/review-task`
 * read the function in full and passed the claim; develop found it. Existence
 * was checked, reachability was not. The check that closes that gap lives at
 * four sites — the review that catches it (review-task Step 3), the authoring
 * step that introduces it (create-task 3.5), and the two siblings with the same
 * shape of claim (review-story Step 4, review-bug Step 3).
 *
 * What this holds is PRESENCE, not application: that a reviewer applies the
 * check is a behaviour no CI layer exercises for the review skills, and the
 * task's implementation report records a hand run as that evidence instead.
 *
 * Two scopes, and both are load-bearing:
 *
 * - SECTION-scoped, not file-scoped. A file-scoped grep passed on a site that
 *   lacked the text on task.144 (QA cycle 2, CR-4): a mention anywhere in a
 *   2,000-line SKILL.md satisfies it.
 * - The three elements are asserted on the check's OWN LIST ITEM, not on the
 *   section. Measured at review (task.145 review, finding I-2): `a function`
 *   already occurs in the review-task Step 3 and create-task 3.5 sections, so a
 *   section-scoped element assertion passes with the check deleted.
 *
 * The site list is the one enumeration; the floor asserts every heading was
 * found, so a renamed step heading turns red rather than shrinking the
 * population to nothing and passing.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { fenceStep, sectionOf } = require("./lib/markdown-section");

const REPO_ROOT = join(__dirname, "..");

// `holds` are the site's own load-bearing sentences, beyond the three shared
// elements: its VERDICT (what the check decides, and at what severity) and the
// STATE it judges against. The elements say what the check is about; a check
// whose verdict is deleted or inverted still names all three, which is how
// "Never flag it." passed cycle 1's suite (task.145 QA cycle 2, CR2-2).
//
// The three pre-implementation sites judge reachability against the function
// AS THE PLAN LEAVES IT — today's code cannot return an outcome the plan adds,
// and holding a task to today's behaviour is holding it to the behaviour it
// exists to change (CR2-1). review-bug runs before the fix too, but its planned
// change IS the fix, so its second hold is the stale-bug clause instead (CR2-3).
const PLANNED_STATE = {
  name: "planned-state walk",
  re: /as the plan leaves them/,
};
// A planned branch counts only when a named phase STATES it — otherwise "a later
// phase will add it" exempts anything (task.145 QA cycle 3, CR3-4).
//
// The whole canonical sentence, not its prefix: cycle 4 found the three sites
// agreeing on the prefix while only one carried the exclusion and the citation
// (CR4-2). The sentence between requirement and exclusion (naming the phase) is
// worded per site, because create-task has no finding to cite it in (CR5-3) —
// so it is held PER SITE, with the site's own noun. A shared `(phase|task)` and a
// `Name that \1 [^.]*\.` wildcard let a hedged or reverted naming sentence, and
// the wrong site's noun, pass (task.145 QA cycle 6, CR6-1 / bug 11; 5c CR-2).
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const namedPhaseSentence = (noun, naming) =>
  `only when a named ${noun} states it: the condition and the outcome it returns. ${naming} ` +
  `A ${noun} that only names the function, or a criterion that promises a later ${noun} will add the branch, does not count`;
const namedPhase = (noun, naming) => ({
  name: `named-${noun} requirement for a planned branch ("${naming}")`,
  re: new RegExp(escapeRe(namedPhaseSentence(noun, naming))),
});
const NAMED_PHASE = {
  "skills/review-task/SKILL.md": namedPhase(
    "phase",
    "Name that phase when you pass the criterion.",
  ),
  "skills/create-task/SKILL.md": namedPhase(
    "phase",
    "Name that phase in the criterion as a cross-reference: the phase states the branch, and the criterion only points at it.",
  ),
  "skills/review-story/SKILL.md": namedPhase(
    "task",
    "Name that task when you pass the criterion.",
  ),
};
// Anchored on the imperative, so a negated verdict ("Do not flag as Important
// when …") fails the hold instead of satisfying it (CR3-6).
const REVIEW_VERDICT = {
  name: "Important verdict on an unreachable outcome",
  re: /Flag as Important when the outcome is unreachable/,
};
// The rule is stated twice in each review section: in the check item and in the
// section's Common Hallucination Patterns list. Cycle 2 moved the item to the
// planned state and left the list line saying "no branch", so a reviewer
// following the list flagged the very outcome the item calls reachable (CR3-2).
// These are SECTION-scoped, because the list line is outside the item.
// One per site, each with its OWN check number: a shared "check (?:10|7)"
// accepted review-task pointing at its check 7 (an unrelated check) and
// review-story pointing at a check 10 it does not have (CR5-2).
const patternLine = (check) => ({
  name: `hallucination-pattern line judged against the planned state (check ${check})`,
  // …and carries its own severity: the line sits in a hallucination list whose
  // protocol files every hallucination as Critical, while the check says
  // Important (CR4-1).
  re: new RegExp(
    `❌ An outcome no current or planned branch of the named function returns for the stated input\\. Report it as Important under check ${check}, not as a Critical hallucination`,
  ),
});
const STALE_PATTERN = {
  name: "hallucination-pattern line still judging against today's code",
  re: /no branch of the named function returns/,
};
const SITES = [
  {
    file: "skills/review-task/SKILL.md",
    heading: "### Step 3: Technical Accuracy and Anti-Hallucination Review",
    holds: [
      PLANNED_STATE,
      NAMED_PHASE["skills/review-task/SKILL.md"],
      REVIEW_VERDICT,
    ],
    sectionHolds: [patternLine(10)],
    sectionForbids: [STALE_PATTERN],
  },
  {
    file: "skills/create-task/SKILL.md",
    heading: "### 3.5 Adversarial Quality Review",
    holds: [
      PLANNED_STATE,
      NAMED_PHASE["skills/create-task/SKILL.md"],
      {
        name: "put-to-the-author verdict (no auto-fix)",
        re: /Put it to the author, and never auto-fix it/,
      },
    ],
  },
  {
    file: "skills/review-story/SKILL.md",
    heading: "### Step 4: Technical Accuracy and Anti-Hallucination Review",
    holds: [
      PLANNED_STATE,
      NAMED_PHASE["skills/review-story/SKILL.md"],
      REVIEW_VERDICT,
    ],
    sectionHolds: [patternLine(7)],
    sectionForbids: [STALE_PATTERN],
  },
  {
    file: "skills/review-bug/SKILL.md",
    heading: "### Step 3: Reproducibility Clarity (the core gate)",
    holds: [
      {
        name: "Important verdict on an unreachable Expected outcome",
        re: /is a fix that cannot pass its own verification → Important/,
      },
      {
        name: "stale-bug clause, gated on the pre-pass",
        re: /Unless PREPASS_STALE reads reproduces: likely, report it under this step's likely-already-fixed rule/,
      },
      // A function that already returns the Expected outcome is also what a LIVE
      // bug looks like when its defect sits outside that function. The walk-only
      // STALE overrode a pre-pass that traced the whole path to `likely`, and
      // develop-bug then HALTed recommending the bug be closed (task.145 5c, CR-1).
      {
        name: "walk never overrides a pre-pass reproduces: likely",
        re: /When the pre-pass traced the path to reproduces: likely, the walk contradicts it: report Important[\s\S]*?never route it to STALE/,
      },
    ],
    // The rule the stale clause routes to was gated on PREPASS_STALE alone, so
    // the in-line finding produced NEEDS DETAIL instead of STALE (CR3-3). The
    // widened trigger lives in the same Step 3 section — and carries the same
    // pre-pass guard (CR-1).
    sectionHolds: [
      {
        name: "likely-already-fixed rule widened to the in-line walk, guarded by the pre-pass",
        re: /reachability walk above finds that the branch that fires today already returns the Expected outcome, unless the pre-pass reads reproduces: likely/,
      },
    ],
    sectionForbids: [
      {
        name: "walk-only trigger that overrides the pre-pass",
        re: /whatever the pre-pass said/,
      },
    ],
  },
];

// The three things the check must name: what goes in, what decides, and which
// way the decision goes. Without any one of them the check degrades into
// "verify the criterion", which the existence checks beside it already ask.
//
// Each pattern is the element's own phrase, never a word it contains: every item
// also says "walk that input through its decision branches", so a bare /branch/
// was met with the "branch that fires" wording deleted at three of the four sites
// (task.145 QA cycle 1, CR-1).
const ELEMENTS = [
  { name: "stated input", re: /stated input|reproduction input/ },
  { name: "deciding function", re: /named function/ },
  { name: "branch that fires", re: /branch that fires/ },
];

const CITATION = /obs #168\b/;
const LIST_ITEM = /^(\s*)(?:\d+\.|[-*])\s/;

/**
 * The list item whose first line carries the citation, through to the next
 * line at the item's own indentation or shallower (a sibling item, or the prose
 * after the list). Blank lines inside the item do not end it; fenced lines are
 * dropped, since a command in a fence is an example, not the check's wording.
 */
function citingItemOf(sectionLines) {
  let open = null;
  let start = -1;
  let indent = 0;
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const step = fenceStep(open, line);
    const fenced = open !== null || step.isFence;
    open = step.open;
    if (fenced) continue;
    const m = line.match(LIST_ITEM);
    if (m && CITATION.test(line)) {
      start = i;
      indent = m[1].length;
      break;
    }
  }
  if (start === -1) return null;

  const item = [sectionLines[start]];
  open = null;
  for (let i = start + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const step = fenceStep(open, line);
    // A fence that OPENS at the item's indentation or shallower is not inside
    // the item — it ends it, like any other line at that depth. Toggling on it
    // first glued the lines after it onto the item (task.145 QA cycle 1, CR-4).
    // Opening or CLOSING: a fence line at the item's depth or shallower is at
    // the item's own level, so the item ended before it (CR2-4 — the closing
    // side was still reachable after cycle 1's opening-only fix).
    if (step.isFence && line.match(/^\s*/)[0].length <= indent) break;
    const fenced = open !== null || step.isFence;
    open = step.open;
    if (fenced) continue;
    if (line.trim() === "") continue;
    const lead = line.match(/^\s*/)[0].length;
    if (lead <= indent) break;
    item.push(line);
  }
  return item.join("\n");
}

/**
 * Prose as a reader sees it: a phrase wrapped across lines or split by emphasis
 * ("**named\n  function**") is still the phrase. Matching the raw text would
 * make an element's presence depend on where prettier chose to wrap.
 */
function asProse(item) {
  return item.replace(/\*\*|`/g, "").replace(/\s+/g, " ");
}

/** A section's unfenced lines as prose — fenced examples are not the rule. */
function sectionProse(sectionLines) {
  let open = null;
  const kept = [];
  for (const line of sectionLines) {
    const step = fenceStep(open, line);
    const fenced = open !== null || step.isFence;
    open = step.open;
    if (!fenced) kept.push(line);
  }
  return asProse(kept.join("\n"));
}

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

test("floor: every site's section heading is found", () => {
  assert.equal(SITES.length, 4, "the site list is the four task.145 sites");
  const found = SITES.filter(
    (s) => sectionOf(read(s.file), s.heading) !== null,
  );
  assert.equal(
    found.length,
    SITES.length,
    `section heading not found in: ${SITES.filter((s) => !found.includes(s))
      .map((s) => `${s.file} › "${s.heading}"`)
      .join(", ")} — a renamed heading must be updated here, not dropped`,
  );
});

for (const site of SITES) {
  test(`${site.file}: the outcome-reachability check is stated in its section`, () => {
    const section = sectionOf(read(site.file), site.heading);
    assert.ok(section, `${site.file}: heading "${site.heading}" not found`);
    const item = citingItemOf(section);
    assert.ok(
      item,
      `${site.file} › "${site.heading}": no list item cites obs #168 — the outcome-reachability check is missing from this site`,
    );
    const prose = asProse(item);
    for (const el of [...ELEMENTS, ...site.holds]) {
      assert.match(
        prose,
        el.re,
        `${site.file} › "${site.heading}": the obs #168 check does not name the ${el.name}`,
      );
    }
    const whole = sectionProse(section);
    for (const el of site.sectionHolds || []) {
      assert.match(
        whole,
        el.re,
        `${site.file} › "${site.heading}": the section does not carry the ${el.name}`,
      );
    }
    for (const el of site.sectionForbids || []) {
      assert.doesNotMatch(
        whole,
        el.re,
        `${site.file} › "${site.heading}": the section still carries a ${el.name}`,
      );
    }
  });
}

test("the item reader does not reach past the citing item", () => {
  // The sibling text carries every element and every hold, so each
  // doesNotMatch below can actually fail (cycle 2, CR2-6 — the fixture said
  // "a branch" after the element narrowed to "branch that fires").
  // The named-phase sentences come from the same builder the holds use: this
  // test is about SCOPE, and each site's wording is held by the site tests.
  const SIBLING =
    "   - a named function, a stated input, the branch that fires, as the plan leaves them;" +
    [
      ["phase", "Name that phase when you pass the criterion."],
      [
        "phase",
        "Name that phase in the criterion as a cross-reference: the phase states the branch, and the criterion only points at it.",
      ],
      ["task", "Name that task when you pass the criterion."],
    ]
      .map(([noun, naming]) => ` ${namedPhaseSentence(noun, naming)};`)
      .join("") +
    " Flag as Important when the outcome is unreachable;" +
    " Put it to the author, and never auto-fix it; it is a fix that cannot pass its own verification → Important;" +
    " Unless `PREPASS_STALE` reads `reproduces: likely`, report it under this step's likely-already-fixed rule;" +
    " When the pre-pass traced the path to `reproduces: likely`, the walk contradicts it: report **Important**, and never route it to STALE";
  for (const el of [...ELEMENTS, ...SITES.flatMap((s) => s.holds)]) {
    assert.match(asProse(SIBLING), el.re, `fixture must carry ${el.name}`);
  }
  // Self-test of the scope that makes the element assertions non-vacuous: text
  // naming every element in a SIBLING item must not satisfy the citing one.
  const section = [
    "1. **Other check** (obs #1):",
    SIBLING,
    "",
    "2. **The check** (obs #168):",
    "   - only the citation lives here",
    "",
    "3. **Next check**:",
    SIBLING,
  ];
  const item = citingItemOf(section);
  assert.equal(
    item,
    "2. **The check** (obs #168):\n   - only the citation lives here",
  );
  for (const el of [...ELEMENTS, ...SITES.flatMap((s) => s.holds)])
    assert.doesNotMatch(asProse(item), el.re);
});

test("the section reader skips a quoted heading and survives long or tilde fences", () => {
  // CR-3 (task.145 QA cycle 1). Each case is a way the old toggle-on-```
  // reader ran the section past the real next heading, widening the scope the
  // per-site assertions read.
  const H = "### Step 3: Check";
  const quoted = [
    "```markdown",
    H,
    "```",
    "",
    H,
    "real body",
    "### Step 4: Next",
    "outside",
  ].join("\n");
  assert.deepEqual(sectionOf(quoted, H), ["real body"]);

  const longFence = [
    H,
    "````markdown",
    "```bash",
    "echo inner",
    "````",
    "after fence",
    "### Step 4: Next",
    "outside",
  ].join("\n");
  assert.deepEqual(sectionOf(longFence, H), [
    "````markdown",
    "```bash",
    "echo inner",
    "````",
    "after fence",
  ]);

  const tilde = [
    H,
    "~~~",
    "### not a heading",
    "~~~",
    "body",
    "### Step 4: Next",
  ].join("\n");
  assert.deepEqual(sectionOf(tilde, H), [
    "~~~",
    "### not a heading",
    "~~~",
    "body",
  ]);

  const crlf = [H, "body", "### Step 4: Next", "outside"].join("\r\n");
  assert.deepEqual(sectionOf(crlf, H), ["body"]);
});

test("a closing fence at the item's own indentation ends the citing item", () => {
  // CR2-4 (task.145 QA cycle 2): an inner fence opened inside the item and
  // closed at column 0. CommonMark ends the item at the column-0 line.
  const section = [
    "- (obs #168):",
    "  - a named function",
    "  ```bash",
    "  echo",
    "```",
    "  - stated input, branch that fires",
  ];
  assert.equal(citingItemOf(section), "- (obs #168):\n  - a named function");
});

test("a four-backtick fence opens, and a heading quoted inside it is not structure", () => {
  // CR3-1 (task.145 QA cycle 3): the cycle-2 info-string guard stopped every
  // ```` fence opening, and the only long-fence case still passed because its
  // inner and outer fences happened to pair. This one has no inner fence.
  const H = "### Step 3: Check";
  const text = [
    H,
    "````markdown",
    "### Step 4: Quoted",
    "````",
    "body",
    "### Step 4: Next",
    "outside",
  ].join("\n");
  assert.deepEqual(sectionOf(text, H), [
    "````markdown",
    "### Step 4: Quoted",
    "````",
    "body",
  ]);
  const bare = [
    H,
    "````",
    "### Step 4: Quoted",
    "````",
    "body",
    "### Step 4: Next",
  ].join("\n");
  assert.deepEqual(sectionOf(bare, H), [
    "````",
    "### Step 4: Quoted",
    "````",
    "body",
  ]);
});

test("a backtick line whose info string holds a backtick opens no fence", () => {
  // CR2-5: "```js` x" is a paragraph. Treating it as a fence ran the section
  // past the real next heading.
  const H = "### Step 3: Check";
  const text = [H, "```js` x", "body", "### Step 4: Next", "outside"].join(
    "\n",
  );
  assert.deepEqual(sectionOf(text, H), ["```js` x", "body"]);
});

test("a fence at the item's own indentation ends the citing item", () => {
  // CR-4 (task.145 QA cycle 1): the old reader toggled on the fence before the
  // indentation test, so a column-0 fence after the item did not end it and the
  // indented lines after the fence were glued on.
  const section = [
    "- **The check** (obs #168):",
    "  only the citation lives here",
    "```bash",
    "echo example",
    "```",
    "  - a named function, a stated input, the branch that fires",
  ];
  assert.equal(
    citingItemOf(section),
    "- **The check** (obs #168):\n  only the citation lives here",
  );
});

test("review-bug Step 6: a walk that contradicts a pre-pass `likely` is NEEDS DETAIL, never STALE", () => {
  // The recommendation table is what develop-bug Step 2 acts on: a STALE row
  // that fires on the walk alone HALTs the pipeline recommending the bug be
  // closed, while the pre-pass says it still reproduces (task.145 5c, CR-1).
  const H = "## Step 6: Generate Output";
  const section = sectionOf(read("skills/review-bug/SKILL.md"), H);
  assert.ok(section, `skills/review-bug/SKILL.md: heading "${H}" not found`);
  const row = (label) => {
    // Keyed on the FIRST cell: the STALE row also says "Outranks NEEDS DETAIL".
    const rows = section.filter(
      (l) => l.startsWith("|") && (l.split("|")[1] || "").includes(label),
    );
    assert.equal(rows.length, 1, `exactly one ${label} row in the table`);
    return asProse(rows[0]);
  };
  assert.match(
    row("STALE (already fixed)"),
    /reachability walk found the branch that fires today already returns the Expected outcome and PREPASS_STALE is not likely/,
    "the STALE row's walk trigger must be guarded by the pre-pass",
  );
  assert.match(
    row("NEEDS DETAIL"),
    /reachability walk contradicts a pre-pass reproduces: likely \(the report names the wrong function or input\)/,
    "the NEEDS DETAIL row must catch a walk that contradicts a pre-pass likely",
  );
});
