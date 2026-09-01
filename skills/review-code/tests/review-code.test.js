"use strict";
/**
 * review-code contract tests.
 * Prose-driven skill — assert the structural invariants of SKILL.md.
 *
 * The invariant this file exists for: **Step 4 posts PR comments, and PR
 * comments are a VCS operation.** It branched on `$TRACKER` until task 68, so
 * a repo hosting code on Bitbucket while tracking issues on GitHub took the
 * `gh` arm against a Bitbucket PR — `gh` cannot address one, the comment never
 * landed, and the run reported success. Nothing was red. These tests are the
 * only thing standing between that defect and a silent reintroduction.
 *
 * Run: node --test 'skills/review-code/tests/*.test.js'
 *      (the directory form `node --test skills/review-code/tests/` fails
 *       MODULE_NOT_FOUND here, same as review-pr)
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const SKILL = read("SKILL.md");

/**
 * Step 4's section text, sliced from its heading to the next `### Step`.
 * Scoping every branch-key assertion to this slice is deliberate: a bare
 * `assert.doesNotMatch(SKILL, /TRACKER=github/)` would forbid the token
 * everywhere in the file, including in a future *issue-shaped* branch where it
 * would be correct. The rule is not "never mention TRACKER" — it is "do not
 * branch PR-shaped work on TRACKER".
 */
const STEP_4 = (() => {
  const m = SKILL.match(/### Step 4 — `--comment`[\s\S]*?(?=\n### Step )/);
  assert.ok(
    m,
    "Step 4 section present and followed by a later ### Step heading",
  );
  return m[0];
})();

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------
test("SKILL.md declares name: review-code", () => {
  assert.match(SKILL, /^---[\s\S]*?\nname:\s*review-code\s*\n/);
});

test("frontmatter carries only the authored fields", () => {
  const fm = SKILL.match(/^---\n([\s\S]*?)\n---/)[1];
  assert.doesNotMatch(
    fm,
    /^managed-by:/m,
    "managed-by is injected at package time",
  );
  assert.doesNotMatch(fm, /^source:/m, "source is injected at package time");
});

// ---------------------------------------------------------------------------
// Step 4 — PR-shaped work branches on $VCS, never on $TRACKER
// ---------------------------------------------------------------------------
test("Step 4 branches on VCS, not TRACKER", () => {
  assert.doesNotMatch(
    STEP_4,
    /TRACKER=(github|bitbucket|jira)/,
    "Step 4 posts PR comments — a VCS operation. Branching it on TRACKER takes " +
      "the gh arm against a Bitbucket PR in a Bitbucket-VCS + GitHub-tracker repo, " +
      "and the comment silently never lands.",
  );
});

test("Step 4 declares a VCS=github arm", () => {
  assert.match(STEP_4, /\*\*GitHub\*\*\s*\(`VCS=github`\)/);
});

test("Step 4 declares a VCS=bitbucket arm", () => {
  assert.match(STEP_4, /\*\*Bitbucket\*\*\s*\(`VCS=bitbucket`\)/);
});

test("both platform arms are present — neither may be dropped", () => {
  const arms = STEP_4.match(/`VCS=(github|bitbucket)`/g) || [];
  assert.ok(arms.includes("`VCS=github`"), "GitHub arm present");
  assert.ok(arms.includes("`VCS=bitbucket`"), "Bitbucket arm present");
});

test("the Bitbucket arm is no longer conflated with a tracker", () => {
  // The pre-task-68 text read "**Bitbucket / Jira**" — grouping a VCS with a
  // tracker as though they were alternatives to each other, which is the
  // category error that produced the wrong branch key in the first place.
  assert.doesNotMatch(STEP_4, /Bitbucket\s*\/\s*Jira/);
});

// ---------------------------------------------------------------------------
// The rule is stated, not merely obeyed
// ---------------------------------------------------------------------------
test("Step 4 states the VCS-vs-TRACKER rule in review-pr's wording", () => {
  assert.match(
    STEP_4,
    /Branch on `\$VCS` for everything PR-shaped, on `\$TRACKER` for everything issue-shaped/,
    "the rule must be stated verbatim as review-pr states it, so the two sibling " +
      "skills cannot drift into disagreeing about the same decision",
  );
});

test("review-pr and review-code state the identical rule", () => {
  // Cross-skill consistency: if review-pr's wording is ever reworded, this
  // fails and whoever changes one is told to change the other.
  const RULE =
    "**Branch on `$VCS` for everything PR-shaped, on `$TRACKER` for everything issue-shaped.**";
  const reviewPr = fs.readFileSync(
    path.join(ROOT, "..", "review-pr", "SKILL.md"),
    "utf8",
  );
  assert.ok(reviewPr.includes(RULE), "review-pr states the rule");
  assert.ok(SKILL.includes(RULE), "review-code states the same rule");
});

// ---------------------------------------------------------------------------
// The Bitbucket arm names a recipe that actually exists
// ---------------------------------------------------------------------------
test("the Bitbucket arm names a real, resolvable recipe", () => {
  assert.match(STEP_4, /bitbucket-auth\.sh/, "names the credential resolver");
  assert.match(
    STEP_4,
    /pullrequests\/\$\{PR_ID\}\/comments/,
    "names the actual REST endpoint rather than gesturing at 'the platform's PR-comment path'",
  );
  assert.match(
    STEP_4,
    /finalise\/SKILL\.md.*Step 7/s,
    "points at finalise Step 7, which carries both arms",
  );
});

test("the dead /qa-story step 6 pointer is gone and stays gone", () => {
  // `/qa-story` has no numbered Step 6 in its main review flow at all — its
  // workflow lives under an unnumbered `### Review Workflow`. The old pointer
  // sent an implementer to a step that does not exist.
  assert.doesNotMatch(
    STEP_4,
    /mirror\s+`?\/qa-story`?\s+step\s*6/i,
    "/qa-story has no step 6 to mirror",
  );
});

test("the finalise pointer resolves to a real file with a real Step 7", () => {
  // Guards the pointer against bit-rot: a cross-reference that names a section
  // is only useful while that section exists.
  const finalise = fs.readFileSync(
    path.join(ROOT, "..", "finalise", "SKILL.md"),
    "utf8",
  );
  assert.match(
    finalise,
    /### Step 7: Mark as Accepted and Generate Artifacts/,
    "finalise Step 7 exists under the name review-code points at",
  );
  assert.match(
    finalise,
    /bitbucket-auth\.sh/,
    "finalise Step 7 has a Bitbucket arm",
  );
});
