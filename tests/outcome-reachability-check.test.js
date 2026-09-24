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

const REPO_ROOT = join(__dirname, "..");

const SITES = [
  {
    file: "skills/review-task/SKILL.md",
    heading: "### Step 3: Technical Accuracy and Anti-Hallucination Review",
  },
  {
    file: "skills/create-task/SKILL.md",
    heading: "### 3.5 Adversarial Quality Review",
  },
  {
    file: "skills/review-story/SKILL.md",
    heading: "### Step 4: Technical Accuracy and Anti-Hallucination Review",
  },
  {
    file: "skills/review-bug/SKILL.md",
    heading: "### Step 3: Reproducibility Clarity (the core gate)",
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
// A fence opens on three or more backticks or tildes and closes only on the
// same character, at least as long, with nothing after it (CommonMark). A bare
// "starts with ```" toggle is inverted by a four-backtick or tilde fence and
// then reads the rest of the file as the wrong side of it (task.145 QA cycle 1,
// CR-3).
const FENCE_OPEN = /^(\s*)(`{3,}|~{3,})/;

/**
 * Advance the fence state over one line. `open` is the opening marker while
 * inside a fence, else null. Returns the new state and whether this line is a
 * fence line (opening or closing) — a fence line is never prose.
 */
function fenceStep(open, line) {
  const m = line.match(FENCE_OPEN);
  if (!m) return { open, isFence: false };
  const marker = m[2];
  if (open === null) return { open: marker, isFence: true, lead: m[1].length };
  const closes =
    marker[0] === open[0] &&
    marker.length >= open.length &&
    line.slice(m[0].length).trim() === "";
  return closes ? { open: null, isFence: true } : { open, isFence: false };
}

/**
 * Lines from `heading` to the next heading of the same or higher level. A
 * heading-shaped line inside a fence is example text, not structure, so fenced
 * lines are carried but never end the section. Returns null when the heading is
 * absent — the floor's signal.
 */
function sectionOf(text, heading) {
  const lines = text.split(/\r?\n/);
  // The start heading is found OUTSIDE fences too: a quoted copy of the heading
  // inside an earlier example must not become the section's start.
  let open = null;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const step = fenceStep(open, lines[i]);
    const wasFenced = open !== null || step.isFence;
    open = step.open;
    if (!wasFenced && lines[i].trimEnd() === heading) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  const level = heading.match(/^#+/)[0].length;
  const out = [];
  open = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    const step = fenceStep(open, line);
    const fenced = open !== null || step.isFence;
    open = step.open;
    if (!fenced) {
      const h = line.match(/^(#+)\s/);
      if (h && h[1].length <= level) break;
    }
    out.push(line);
  }
  return out;
}

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
    if (open === null && step.isFence && step.lead <= indent) break;
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
    for (const el of ELEMENTS) {
      assert.match(
        prose,
        el.re,
        `${site.file} › "${site.heading}": the obs #168 check does not name the ${el.name}`,
      );
    }
  });
}

test("the item reader does not reach past the citing item", () => {
  // Self-test of the scope that makes the element assertions non-vacuous: text
  // naming every element in a SIBLING item must not satisfy the citing one.
  const section = [
    "1. **Other check** (obs #1):",
    "   - a named function, a stated input, a branch",
    "",
    "2. **The check** (obs #168):",
    "   - only the citation lives here",
    "",
    "3. **Next check**:",
    "   - a named function, a stated input, a branch",
  ];
  const item = citingItemOf(section);
  assert.equal(
    item,
    "2. **The check** (obs #168):\n   - only the citation lives here",
  );
  for (const el of ELEMENTS) assert.doesNotMatch(asProse(item), el.re);
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
