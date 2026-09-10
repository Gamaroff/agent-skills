"use strict";
/**
 * stakeholder-summary.test.mjs — the plain-language lead catalogue.
 *
 * Two properties are held down here, and they fail in opposite directions:
 *
 *   EVERY STAGE HAS A LEAD. The stage list is IMPORTED from tracker-comment.js,
 *       never restated. Restating it would make this file agree with itself while
 *       disagreeing with the engine — two enumerations of "what stages exist" drift
 *       silently and in the worst direction, the catalogue passing while the engine
 *       carries a stage it cannot render. The import is what makes adding a stage
 *       without a lead fail here rather than in production.
 *
 *   EVERY LEAD READS WITH NO SLOTS. The slot-free rendering is the one that ships
 *       first — no call site passes slots yet — so it is simultaneously the most
 *       visible and the least likely to be exercised by a caller-driven test.
 *
 * Run: node --test shared/resources/tests/stakeholder-summary.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { COMMENT_STAGES } = require("../tracker-comment.js");
const {
  LEAD_TEMPLATES,
  LEAD_STAGES,
  GATE_MEANING,
  renderLead,
  hasTemplate,
} = require("../stakeholder-summary.js");

/**
 * Non-vacuity floor. Every assertion below iterates COMMENT_STAGES; an empty or
 * truncated import would make the whole file pass without testing anything, which
 * is the failure a coverage test is least able to notice about itself.
 */
test("the imported stage list is populated", () => {
  assert.ok(Array.isArray(COMMENT_STAGES), "COMMENT_STAGES must be an array");
  assert.ok(
    COMMENT_STAGES.length >= 11,
    `expected at least 11 stages, got ${COMMENT_STAGES.length}`,
  );
});

for (const stage of COMMENT_STAGES) {
  test(`${stage} has a lead that renders with no slots`, () => {
    assert.ok(hasTemplate(stage), `no template for stage "${stage}"`);
    const lead = renderLead(stage, {});
    assert.ok(lead, `renderLead("${stage}", {}) returned ${lead}`);
    assert.ok(
      lead.trim().length > 40,
      `lead for "${stage}" is too short to answer three questions: ${JSON.stringify(lead)}`,
    );
    // Two to four sentences. A one-sentence lead cannot answer what happened,
    // what it means and what happens next; five is a summary of the body.
    const sentences = lead
      .trim()
      .split(/(?<=\.)\s+/)
      .filter(Boolean);
    assert.ok(
      sentences.length >= 2 && sentences.length <= 4,
      `lead for "${stage}" has ${sentences.length} sentences, expected 2-4`,
    );
  });
}

/**
 * The deny-list is a FLOOR, not the property. Passing it does not make a paragraph
 * comprehensible — the standard's worked examples are the actual specification. It
 * exists to catch the mechanical leaks (a path, a backtick, an unexpanded acronym)
 * that no reviewer should have to spend attention on.
 *
 * `/\//` is deliberately blunt: no lead has a legitimate reason to contain a slash,
 * and a blunt rule that holds beats a precise one that needs maintaining.
 */
const JARGON = [
  /\bPR\b/,
  /\bAC\b/,
  /\bDoD\b/,
  /\bCI\b/,
  /\bNFR\b/,
  /\bQA\b/,
  /\bgate\b/i,
  /\bregression\b/i,
  /\bcommit\b/i,
  /\bbranch\b/i,
  /\bStep \d/,
  /\d+\/\d+/,
  /`/,
  /\//,
  /\p{Extended_Pictographic}/u,
];

for (const stage of COMMENT_STAGES) {
  test(`${stage} lead is free of jargon, paths and emoji`, () => {
    const lead = renderLead(stage, {});
    for (const pattern of JARGON) {
      assert.ok(
        !pattern.test(lead),
        `lead for "${stage}" matches deny-list ${pattern}: ${JSON.stringify(lead)}`,
      );
    }
  });
}

test("a cycle suffix resolves to the unsuffixed template", () => {
  assert.equal(renderLead("qa-cycle-3", {}), renderLead("qa-cycle", {}));
  assert.equal(renderLead("qa-fix-2", {}), renderLead("qa-fix", {}));
  assert.ok(hasTemplate("qa-cycle-11"));
});

test("an unknown stage returns null and does not throw", () => {
  assert.equal(renderLead("nonsense"), null);
  assert.equal(renderLead(""), null);
  assert.equal(renderLead(undefined), null);
  assert.equal(renderLead(null), null);
  assert.equal(renderLead(42), null);
  assert.equal(hasTemplate("nonsense"), false);
  assert.equal(hasTemplate(undefined), false);
});

test("slots are folded into the sentence, not appended", () => {
  const withSlot = renderLead("work-started", { title: "Cache the token" });
  assert.ok(withSlot.includes("Cache the token"));
  // The slot lands inside the first sentence, not after the final full stop.
  assert.ok(
    withSlot.indexOf("Cache the token") <
      withSlot.indexOf("Nothing has changed"),
    "slot value must be folded into the opening sentence",
  );
});

test("a verdict token is mapped to a sentence, never passed through", () => {
  for (const verdict of Object.keys(GATE_MEANING)) {
    const lead = renderLead("qa-gate", { verdict });
    assert.ok(
      !lead.includes(verdict),
      `raw verdict token "${verdict}" leaked into the lead: ${JSON.stringify(lead)}`,
    );
    assert.ok(
      lead.includes(GATE_MEANING[verdict]),
      `verdict "${verdict}" did not render its sentence`,
    );
  }
});

test("an unknown verdict does not assert that nothing was wrong", () => {
  // The one direction this must not fail in: a missing or malformed verdict must
  // never render as reassurance. It points at the body instead.
  for (const verdict of [undefined, "", "WAT", 7, null]) {
    const lead = renderLead("qa-gate", { verdict });
    assert.ok(lead, "qa-gate must still render");
    assert.ok(
      !lead.includes(GATE_MEANING.PASS),
      `unknown verdict ${JSON.stringify(verdict)} rendered the PASS sentence`,
    );
    assert.ok(lead.includes("recorded below"));
  }
});

test("the catalogue is frozen and its stage list matches its keys", () => {
  assert.ok(Object.isFrozen(LEAD_TEMPLATES));
  assert.ok(Object.isFrozen(GATE_MEANING));
  assert.deepEqual([...LEAD_STAGES].sort(), Object.keys(LEAD_TEMPLATES).sort());
});

test("every catalogue key is a stage the engine knows", () => {
  // The converse of the coverage test above: a lead for a stage the engine cannot
  // produce is dead weight that reads as coverage.
  const known = new Set(COMMENT_STAGES);
  for (const stage of LEAD_STAGES) {
    assert.ok(
      known.has(stage),
      `catalogue has "${stage}", which is not in COMMENT_STAGES`,
    );
  }
});
