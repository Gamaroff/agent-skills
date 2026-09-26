"use strict";

/**
 * QA evidence integrity — each rule is stated where the QA step runs (task.149).
 *
 * Four places where /qa-task and /qa-story recorded a claim that no check read
 * back, each closed by a mechanism with its own engine test:
 *
 *   obs #143  `--copy-as` seeds a directory at the path a block addresses
 *             (qa-execute-snippets.test.mjs QA-18..21)
 *   obs #156  an unexported predicate is exported and probed, never a reason for
 *             `boundary: false` (security-probe.test.mjs)
 *   obs #163  the validation commands the coding standards name are run, not only
 *             the test runner (no engine — a prose rule)
 *   obs #164  the document's links and `updated:` are read back AFTER the edit
 *             (doc-links.test.mjs `state`, change-log.test.mjs group I)
 *
 * What this file holds is PRESENCE, section-scoped: a mention anywhere in a
 * 2,000-line SKILL.md would satisfy a file-scoped grep with the rule deleted
 * from the step that runs it. The engine tests prove the mechanisms work;
 * neither proves a QA agent applies the rule — the implementation report
 * carries that evidence.
 *
 * SITES is the one enumeration. The floor asserts every heading is found, so a
 * renamed step turns this red naming the heading rather than shrinking the
 * population and passing.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { sectionOf } = require("./lib/markdown-section");

const REPO_ROOT = join(__dirname, "..");
const read = (rel) => readFileSync(join(REPO_ROOT, rel), "utf8");

const QA_TASK = "skills/qa-task/SKILL.md";
const QA_STORY = "skills/qa-story/SKILL.md";

const SITES = [
  // obs #143 — seed at the addressed path
  {
    file: QA_TASK,
    heading: "### Step 4b: Execute the Documented Commands",
    must: [/--copy-as docs:docs/, /obs #143/],
  },
  {
    file: QA_STORY,
    heading: "#### Phase 1.7: Execute the Documented Commands",
    must: [/--copy-as docs:docs/, /obs #143/],
  },
  // obs #156 — export and probe
  {
    file: QA_TASK,
    heading: "### Step 3b: Diff Code Review",
    must: [/not exported/, /export it/, /obs #156/],
  },
  {
    file: QA_STORY,
    heading: "#### Phase 1.6: Diff Code Review",
    must: [/not exported/, /export it/, /obs #156/],
  },
  // obs #163 — standards-named validation commands
  {
    file: QA_TASK,
    heading: "### Step 4: Run Tests",
    must: [
      /validation commands your coding standards name/,
      /npm run validate/,
      /obs #163/,
    ],
  },
  {
    file: QA_STORY,
    heading: "#### Phase 4: Standards Compliance Check",
    must: [
      /validation commands your coding standards name/,
      /npm run validate/,
      /obs #163/,
    ],
    // The path that does not exist in this layout (the pipeline loads
    // docs/architecture/concepts/coding-standards.md).
    mustNot: [/`docs\/coding-standards\.md`/],
  },
  {
    file: "skills/create-task/SKILL.md",
    heading: "### Section 9: Success Criteria",
    must: [/validation command the coding standards name/],
  },
  // obs #164 — read the claims back after the write
  {
    file: QA_TASK,
    heading: "### Step 12b: Read the claims back",
    must: [
      /doc-links\.js/,
      /--check-updated/,
      /`missing`/,
      /`untracked`/,
      /`ignored`/,
      /Step 12b: HALT/,
      /bumpUpdated/,
      /obs #164/,
    ],
  },
  {
    // qa-story's checklist sits inside this section, so its mustNot is asserted here.
    file: QA_STORY,
    heading: "### Review Completion",
    must: [
      /Read the claims back/,
      /doc-links\.js/,
      /--check-updated/,
      /`missing`/,
      /`untracked`/,
      /`ignored`/,
      /item 3e: HALT/,
      /obs #164/,
      /Every artifact the document links to resolves/,
    ],
    mustNot: [/QA report file created and saved/],
  },
  {
    file: QA_TASK,
    heading: "## Review Completion Checklist",
    must: [/Every artifact the document links to resolves/, /Step 12b/],
    // The self-assessed item this replaced — ticked from memory on task.141.
    mustNot: [/QA report file created and saved/],
  },
];

test("floor: every site's heading is found", () => {
  const missing = SITES.filter(
    (s) => sectionOf(read(s.file), s.heading) === null,
  ).map((s) => `${s.file} — ${s.heading}`);
  assert.deepEqual(missing, [], "a site heading was renamed or removed");
  assert.equal(SITES.length, 10, "ten sections carry the eleven prose sites");
});

for (const site of SITES) {
  test(`${site.file} § ${site.heading.replace(/^#+\s*/, "")} carries its rule`, () => {
    const section = sectionOf(read(site.file), site.heading);
    assert.ok(section, `heading not found: ${site.heading}`);
    const text = section.join("\n");
    for (const re of site.must) {
      assert.match(text, re, `${site.heading} lacks ${re}`);
    }
    for (const re of site.mustNot || []) {
      assert.doesNotMatch(text, re, `${site.heading} still carries ${re}`);
    }
  });
}

test("Step 12b runs AFTER Step 12 writes and BEFORE Step 13 posts", () => {
  const text = read(QA_TASK);
  const at = (h) => text.indexOf(`\n${h}`);
  const s12 = at("### Step 12: Update Task File");
  const s12b = at("### Step 12b: Read the claims back");
  const s13 = at("### Step 13: Post PR Comment");
  assert.ok(s12 > 0 && s12b > s12 && s13 > s12b, "order: 12 → 12b → 13");
});

test("qa-story item 3e sits after the Change Log row (3d) and before item 6 posts", () => {
  const section = sectionOf(read(QA_STORY), "### Review Completion").join("\n");
  const d = section.indexOf("d. **Append the verdict row");
  const e = section.indexOf("e. **Read the claims back**");
  const six = section.indexOf("6. **Post QA Summary to PR**");
  assert.ok(d > 0 && e > d && six > e, "order: 3d → 3e → 6");
});
