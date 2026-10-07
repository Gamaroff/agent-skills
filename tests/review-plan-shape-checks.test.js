"use strict";

/**
 * Review plan-shape checks — stated at every site (task.187; obs #129, #203, #242, #252, #255, #258,
 * #264, #269, #279, #285).
 *
 * Each check closes a plan shape that passed /review-task and failed later: a removed literal still
 * pinned by a test, another writer inside a replaced region, a pattern identity key over a shell
 * command, a test file the runner never reaches, unlisted resume-reconstruction states, a site list
 * with no search behind it. review-task Step 3 states them as checks 15–20, review-story Step 4 as
 * 11–16. Step 6 / Step 7 (review-task) and Step 5 (review-story) gain the criterion and risk rules.
 *
 * What this holds is PRESENCE, as its four siblings do: that each rule is stated at each site, with
 * its trigger, worked example and severity. That a reviewer APPLIES it is a behaviour no CI layer
 * exercises. Every pattern line must name the number of the heading it sits beside (the CR5-2 guard
 * from tests/outcome-reachability-check.test.js), per file.
 *
 * REVIEW_SHAPE_ROOT points the test at a copy of the tree, for the mutation proof.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { sectionOf } = require("./lib/markdown-section");
const { countsOfKinds } = require("./lib/count-of-kinds");

const ROOT = process.env.REVIEW_SHAPE_ROOT || path.join(__dirname, "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const CHECKS = [
  { name: "Removed-literal test sweep", obs: 203, notApplicable: true },
  {
    name: "Other writers in a replaced region",
    obs: 242,
    notApplicable: true,
    question: true,
  },
  { name: "Identity over a shell command string", obs: 252, question: true },
  { name: "Test file reached by the runner", obs: 255, notApplicable: true },
  { name: "Reconstruction states for a resume rule", obs: 264, question: true },
  { name: "A site list carries its grep", obs: 129 },
];

const SITES = [
  {
    file: "skills/review-task/SKILL.md",
    step: "### Step 3: Technical Accuracy and Anti-Hallucination Review",
    stepLabel: "Step 3",
    first: 15,
  },
  {
    file: "skills/review-story/SKILL.md",
    step: "### Step 4: Technical Accuracy and Anti-Hallucination Review",
    stepLabel: "Step 4",
    first: 11,
  },
];

/** The text of the numbered item `N. **name**` up to the next top-level numbered item. */
function itemOf(lines, number, name) {
  const head = new RegExp(
    `^${number}\\. \\*\\*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\*\\*`,
  );
  const start = lines.findIndex((l) => head.test(l));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (
      /^\d+\. \*\*/.test(lines[i]) ||
      /^\*\*[A-Z][^*]+\*\*:?$/.test(lines[i].trim())
    ) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

for (const site of SITES) {
  const text = read(site.file);
  const section = sectionOf(text, site.step);

  test(`${site.file}: the ${site.stepLabel} section is found`, () => {
    assert.ok(section, `${site.file}: heading "${site.step}" not found`);
  });

  const items = CHECKS.map((c, i) => ({ ...c, number: site.first + i }));

  test(`${site.file}: floor — all six checks are present`, () => {
    const found = items.filter((c) => itemOf(section, c.number, c.name));
    assert.equal(
      found.length,
      6,
      `found ${found.length} of 6 checks in ${site.stepLabel}`,
    );
  });

  for (const c of items) {
    test(`${site.file} check ${c.number} (${c.name}): trigger, worked example, severity`, () => {
      const item = itemOf(section, c.number, c.name);
      assert.ok(
        item,
        `check ${c.number} "${c.name}" missing from ${site.stepLabel}`,
      );
      assert.match(item, new RegExp(`\\(obs #${c.obs}\\)`), "obs id");
      assert.match(item, /^\s+- Trigger: /m, "Trigger: line");
      assert.match(item, /^\s+- Worked example: /m, "Worked example: line");
      assert.match(item, /\*\*Important\*\*/, "Important severity");
      if (c.notApplicable)
        assert.match(
          item,
          /^\s+- Not applicable when /m,
          "not-applicable line",
        );
    });

    test(`${site.file} check ${c.number}: pattern, detection and question lines name its number`, () => {
      const joined = section.join("\n");
      assert.match(
        joined,
        new RegExp(`^- ❌ .+\\(check ${c.number}\\)$`, "m"),
        "❌ pattern line",
      );
      assert.match(
        text,
        new RegExp(
          `^\\d+\\. \\*\\*[A-Za-z-]+ Verification\\*\\*: .+\\(${site.stepLabel} check ${c.number}\\)$`,
          "m",
        ),
        "Detection Rules line",
      );
      if (c.question)
        assert.match(
          joined,
          new RegExp(`^- When .+\\(check ${c.number}\\): `, "m"),
          "Questions to Collect line",
        );
    });
  }
}

const RT = "skills/review-task/SKILL.md";
const RS = "skills/review-story/SKILL.md";

test(`${RT} Step 6: check 2 control case; check 4's two items under their own lead-in, no count of kinds`, () => {
  const s = sectionOf(
    read(RT),
    "### Step 6: Consistency and Completeness Review",
  );
  assert.ok(s, "Step 6 not found");
  const joined = s.join("\n");
  assert.match(
    joined,
    /\*\*Behavioural evidence that re-runs its own example needs a control case\*\* \(obs #176, #285\)/,
  );
  assert.match(
    joined,
    /Three shapes reach that point, and each is \*\*Important\*\* here:/,
    "the intro still counts three",
  );
  assert.match(
    joined,
    /Two more shapes fail later than review, and each is \*\*Important\*\* too:/,
  );
  assert.match(
    joined,
    /\*\*A behaviour fix in prose lands in an executable block\*\* \(obs #258\)/,
  );
  assert.match(
    joined,
    /\*\*A criterion's test runs on CI's platform\*\* \(obs #279\)/,
  );
  const start = s.findIndex((l) =>
    /^4\. \*\*Success Criteria Measurability\*\*/.test(l),
  );
  const end = s.findIndex((l, i) => i > start && /^5\. \*\*/.test(l));
  assert.ok(start !== -1 && end > start, "check 4 bounds");
  assert.deepEqual(
    countsOfKinds(s.slice(start, end).join("\n")),
    [],
    "check 4 states no count of kinds",
  );
});

test(`${RT} Step 7: the guard-exemption rule with its differential oracle`, () => {
  const s = sectionOf(
    read(RT),
    "### Step 7: Risk Assessment and Rollback Review",
  );
  assert.ok(s, "Step 7 not found");
  const joined = s.join("\n");
  assert.match(
    joined,
    /exemption to a refuse-by-default guard[\s\S]*?\*\*differential oracle\*\*[\s\S]*?\(obs #269\)/,
  );
  assert.match(
    joined,
    /\*\*Important\*\*: .*a guard exemption with no differential oracle/,
  );
});

test(`${RS} Step 5: testing items, acceptance-criteria classification, guard exemptions`, () => {
  const s = sectionOf(read(RS), "### Step 5: Completeness and Gap Analysis");
  assert.ok(s, "Step 5 not found");
  const joined = s.join("\n");
  assert.match(
    joined,
    /\*\*Behavioural evidence that re-runs its own example needs a control case\*\* \(obs #176, #285\)/,
  );
  assert.match(
    joined,
    /\*\*A behaviour fix in prose lands in an executable block\*\* \(obs #258\)/,
  );
  assert.match(joined, /\*\*A test runs on CI's platform\*\* \(obs #279\)/);
  const c10 = itemOf(s, 10, "Acceptance Criteria Classification");
  assert.ok(c10, "check 10 missing");
  assert.match(
    c10,
    /\(\.\.\/review-task\/SKILL\.md#step-6-consistency-and-completeness-review\)/,
    "cites review-task check 4",
  );
  assert.match(
    c10,
    /\(references\/finalise-dod-ac-prompt\.md#step-3-check-each-acceptance-criterion\)/,
    "cites the AC prompt",
  );
  assert.match(c10, /\*\*Important\*\*/);
  assert.deepEqual(countsOfKinds(c10), [], "check 10 states no count of kinds");
  const c11 = itemOf(s, 11, "Guard exemptions");
  assert.ok(c11, "check 11 missing");
  assert.match(c11, /\*\*differential oracle\*\*/);
  assert.match(c11, /\*\*Important\*\*/);
});
