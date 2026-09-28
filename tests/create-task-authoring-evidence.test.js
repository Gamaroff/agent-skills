"use strict";
/**
 * Authoring-evidence rules: are they stated, and stated in the right SECTION?
 *
 * task.150 added three rules to create-task § 3.5 (obs #127, #124, #135), one
 * paragraph to its Section 3 prompt (obs #127), and one check to review-task
 * Step 3 (obs #135). Each rule belongs to the step where its defect is written
 * or caught. A rule that drifts into another section is still in the file but is
 * no longer read at that moment.
 *
 * So this test is SECTION-scoped, not file-scoped. A file-wide regex passed on a
 * site that lacked the text (task.144 QA cycle 2). The reader below bounds each
 * section by its heading and the next heading of the same or a higher level, and
 * drops fenced blocks, so a rule quoted inside an example does not count.
 *
 * Words are asserted inside the rule's OWN block, from the line carrying its key
 * to the next top-level item, not anywhere in the section. Otherwise one rule's
 * wording could satisfy another rule's assertion.
 *
 * Keys are `obs #1NN\b`. They obey their own rule (obs #135): on develop at
 * `f88a997f`, `git grep -n -E 'obs #(124|127|135)\b' -- skills shared` returned
 * nothing, so no other rule shares them.
 *
 * What this does NOT show: that an author APPLIES a rule. That is behaviour, and
 * this repository has no eval layer for authoring skills. The implementation
 * report of task.150 records one hand run instead.
 *
 * Run: node --test tests/create-task-authoring-evidence.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

/**
 * The lines of the section under `heading`, fences removed. `null` when the
 * heading is not found, so a renamed heading fails the floor instead of making
 * every assertion vacuous.
 */
function sectionOf(file, heading) {
  const lines = fs.readFileSync(path.join(ROOT, file), "utf8").split("\n");
  const level = heading.match(/^#+/)[0].length;
  let inFence = false;
  let inSection = false;
  const out = [];
  for (const line of lines) {
    const fence = /^\s*(```|~~~)/.test(line);
    if (fence) {
      inFence = !inFence;
      if (inSection) out.push("```"); // keep a terminator where the fence was
      continue;
    }
    if (inFence) continue;
    const h = /^(#+)\s/.exec(line);
    if (h && inSection && h[1].length <= level) break;
    if (line.trim() === heading) {
      inSection = true;
      continue;
    }
    if (inSection) out.push(line);
  }
  return inSection ? out : null;
}

// A rule's block: the line carrying its key, through the lines before the next
// top-level item (`- `, `N. `), heading, bold-led paragraph or fence.
const TOP_LEVEL = /^(- |\d+\. |#|\*\*|```)/;

function blocksFor(section, key) {
  const blocks = [];
  for (let i = 0; i < section.length; i++) {
    if (!key.test(section[i])) continue;
    const block = [section[i]];
    for (
      let j = i + 1;
      j < section.length && !TOP_LEVEL.test(section[j]);
      j++
    ) {
      block.push(section[j]);
    }
    // Normalise whitespace so a phrase wrapped across two lines still matches.
    blocks.push(block.join(" ").replace(/\s+/g, " "));
  }
  return blocks;
}

const SITES = [
  {
    file: "skills/create-task/SKILL.md",
    heading: "### 3.5 Adversarial Quality Review",
    rules: [
      { key: /obs #127\b/, words: [/grep/, /\(unverified\)/] },
      {
        key: /obs #124\b/,
        words: [/each \*\*member\*\*|per member/, /file:line/],
      },
      {
        key: /obs #135\b/,
        words: [/grep the key/, /would \*\*not\*\* match/, /non-vacuity/],
      },
    ],
  },
  {
    file: "skills/create-task/SKILL.md",
    heading: "### Section 3: Technical Background",
    rules: [{ key: /obs #127\b/, words: [/grep/, /\(unverified\)/] }],
  },
  {
    file: "skills/review-task/SKILL.md",
    heading: "### Step 3: Technical Accuracy and Anti-Hallucination Review",
    rules: [
      {
        key: /obs #135\b/,
        words: [/grep the key/, /would \*\*not\*\* match/, /directories/],
      },
    ],
  },
];

test("every site section exists (non-vacuity floor)", () => {
  let found = 0;
  for (const site of SITES) {
    assert.ok(
      sectionOf(site.file, site.heading),
      `${site.file}: heading not found: ${site.heading} — renamed? The rules below would pass vacuously`,
    );
    found++;
  }
  assert.equal(found, 3);
});

for (const site of SITES) {
  for (const rule of site.rules) {
    test(`${site.file} › ${site.heading} carries the ${rule.key.source.replace("\\b", "")} rule`, () => {
      const section = sectionOf(site.file, site.heading);
      assert.ok(section, `heading not found: ${site.heading}`);
      const blocks = blocksFor(section, rule.key);
      assert.equal(
        blocks.length,
        1,
        `expected the key ${rule.key} exactly once in ${site.heading}, found ${blocks.length}`,
      );
      for (const w of rule.words) {
        assert.match(
          blocks[0],
          w,
          `the ${rule.key} rule in ${site.heading} lost its load-bearing words (${w})`,
        );
      }
    });
  }
}

test("review-task's patterns list names the shared-key hallucination", () => {
  const section = sectionOf(
    "skills/review-task/SKILL.md",
    "### Step 3: Technical Accuracy and Anti-Hallucination Review",
  );
  assert.ok(
    section.some((l) =>
      /^- ❌ .*test key that another rule's sites also match/.test(l),
    ),
    "the Common Hallucination Patterns line for check 13 is missing",
  );
});
