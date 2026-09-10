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
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { COMMENT_STAGES } = require("../tracker-comment.js");
const {
  LEAD_TEMPLATES,
  LEAD_STAGES,
  GATE_MEANING,
  BOOLEAN_SLOTS,
  NUMERIC_SLOTS,
  TEXT_SLOTS,
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

// ── Slot coercion and lookup safety (QA cycle 1: T104-001, T104-005) ────────

test("a string slot that means 'no' is treated as absent, not as truthy", () => {
  // T104-001, the cycle-1 HIGH. Slot values arrive from `--slot k=v` as STRINGS
  // and templates consume them by truthiness, so "false" rendered the BLOCKING
  // sentence — the opposite of what the caller said, in the one paragraph a
  // non-technical reader cannot check against the body underneath it.
  for (const falsey of [
    "false",
    "no",
    "0",
    "none",
    "null",
    "undefined",
    "",
    "  ",
  ]) {
    const lead = renderLead("review", { blocking: falsey });
    assert.ok(
      !lead.includes("Some things need answering"),
      `blocking=${JSON.stringify(falsey)} rendered the blocking sentence`,
    );
    assert.ok(lead.includes("Nothing is blocking"));
  }
});

test("a slot that means 'yes' still renders", () => {
  // The other direction: coercion must not swallow real values.
  assert.ok(
    renderLead("review", { blocking: "true" }).includes(
      "Some things need answering",
    ),
  );
  assert.ok(
    renderLead("develop-complete", { count: "3" }).includes(
      "(3 separate pieces of work)",
    ),
  );
  assert.ok(
    renderLead("qa-gate", { blocking_count: "2" }).includes("2 of them"),
  );
  assert.ok(renderLead("qa-cycle", { cycle: "4" }).includes("round 4"));
});

test("a numeric-zero slot reads as absent, not as the number nought", () => {
  assert.ok(
    !renderLead("develop-complete", { count: "0" }).includes("separate pieces"),
    "count=0 rendered '(0 separate pieces of work)'",
  );
  assert.ok(
    !renderLead("qa-gate", { blocking_count: "0" }).includes("0 of them"),
    "blocking_count=0 rendered '0 of them must be dealt with'",
  );
});

test("a prototype-chain key returns null rather than throwing or leaking", () => {
  // T104-005. `LEAD_TEMPLATES[key]` walked the prototype chain and CALLED what it
  // found: __proto__ and valueOf threw, constructor returned an object, toString
  // returned "[object Undefined]". The docblock promises null and never throws,
  // and tracker-comment.js's exit-2 guard depends on it. "nonsense" cannot catch
  // this class, which is why it is enumerated.
  for (const key of [
    "__proto__",
    "constructor",
    "toString",
    "valueOf",
    "hasOwnProperty",
    "isPrototypeOf",
    "propertyIsEnumerable",
  ]) {
    let result;
    assert.doesNotThrow(() => {
      result = renderLead(key, {});
    }, `renderLead(${key}) threw`);
    assert.equal(result, null, `renderLead(${key}) returned ${typeof result}`);
    assert.equal(hasTemplate(key), false);
  }
});

test("slots are read as own properties, never through the prototype chain", () => {
  const hostile = Object.create({ title: "PWNED", pr: "PWNED" });
  assert.ok(!renderLead("work-started", hostile).includes("PWNED"));
  assert.ok(!renderLead("done", hostile).includes("PWNED"));
});

// ── Slot coercion is per-type (QA cycle 2) ─────────────────────────────────

test("a TEXT slot is passed through, even when it reads like a negation", () => {
  // The cycle-2 finding, and it was self-inflicted by the cycle-1 fix: one
  // falsey-string list applied to every slot dropped a text slot legitimately
  // valued "No", "None" or "0". Swallowing a real value is the worse failure —
  // it is silent in the other direction and nothing in the output hints at it.
  for (const [stage, slots, needle] of [
    ["work-started", { title: "No" }, "No"],
    ["work-started", { title: "None" }, "None"],
    ["work-started", { title: "0" }, "0"],
    ["in-review", { pr: "0" }, "0"],
    ["review", { outcome: "no" }, "no"],
  ]) {
    const lead = renderLead(stage, slots);
    assert.ok(
      lead.includes(needle),
      `${stage} dropped a legitimate text slot ${JSON.stringify(slots)}`,
    );
    assert.notEqual(
      lead,
      renderLead(stage, {}),
      `${stage} rendered as though the slot were absent`,
    );
  }
});

test("a NUMERIC slot rejects a non-numeric string rather than rendering NaN", () => {
  for (const junk of ["abc", "3 pieces", "--"]) {
    const lead = renderLead("develop-complete", { count: junk });
    assert.ok(!lead.includes("NaN"), `count=${junk} leaked NaN`);
    assert.equal(lead, renderLead("develop-complete", {}));
  }
  assert.ok(
    renderLead("develop-complete", { count: "3" }).includes("(3 separate"),
  );
});

test("an unknown verdict reaches the mapper and gets the safe fallback", () => {
  // Distinct from being filtered out: the slot IS passed through, and
  // verdictSentence maps anything it does not know to a sentence that asserts
  // nothing about the outcome.
  const lead = renderLead("qa-gate", { verdict: "none" });
  assert.ok(lead.includes("recorded below"));
  assert.ok(!lead.includes("no problems"), "must not read as reassurance");
});

test("every slot a template reads is classified as boolean, numeric or text", () => {
  // Enumeration drift, the class this repository keeps paying for. The coercion
  // lists live apart from the templates that consume them, so a new template
  // introducing a boolean slot would get TEXT semantics by default — which
  // re-opens the cycle-1 HIGH for that slot, because `--slot newflag=false` is a
  // truthy string. Scanning the source for `s.<name>` reads is what makes the
  // lists unable to fall quietly behind the templates.
  const src = readFileSync(
    new URL("../stakeholder-summary.js", import.meta.url),
    "utf8",
  );
  // Only the template bodies — everything from LEAD_TEMPLATES to its close.
  const from = src.indexOf("const LEAD_TEMPLATES");
  const to = src.indexOf("const CYCLE_SUFFIX");
  assert.ok(from > 0 && to > from, "could not locate the template block");
  const names = new Set(
    [...src.slice(from, to).matchAll(/\bs\.([A-Za-z_][A-Za-z0-9_]*)/g)].map(
      (m) => m[1],
    ),
  );
  // Non-vacuity: a regex that matched nothing would pass this test silently.
  assert.ok(
    names.size >= 4,
    `only found ${names.size} slot reads — scan broke`,
  );

  const classified = new Set([
    ...BOOLEAN_SLOTS,
    ...NUMERIC_SLOTS,
    ...TEXT_SLOTS,
  ]);
  for (const name of names) {
    assert.ok(
      classified.has(name),
      `template slot "${name}" is not in BOOLEAN_SLOTS, NUMERIC_SLOTS or TEXT_SLOTS — ` +
        `it would silently get text semantics, and a boolean slot then renders its ` +
        `affirmative branch for --slot ${name}=false`,
    );
  }
  // And the converse: a classified name no template reads is dead weight.
  for (const name of classified) {
    assert.ok(
      names.has(name),
      `"${name}" is classified but no template reads it`,
    );
  }
});
