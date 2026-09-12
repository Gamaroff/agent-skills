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
  PR_COMMENT_STAGES,
  GATE_MEANING,
  BOOLEAN_SLOTS,
  NUMERIC_SLOTS,
  TEXT_SLOTS,
  renderLead,
  hasTemplate,
} = require("../stakeholder-summary.js");

/**
 * Every stage that has an audience: tracker-issue moments plus pull-request
 * moments. The per-stage tests below iterate THIS, not COMMENT_STAGES alone —
 * iterating one namespace would leave the other's leads with no rendering test
 * and no jargon check at all, which is the shape of coverage that reads as
 * present and is not.
 */
const ALL_STAGES = [...COMMENT_STAGES, ...PR_COMMENT_STAGES];

/**
 * Non-vacuity floor. Every assertion below iterates ALL_STAGES; an empty or
 * truncated import would make the whole file pass without testing anything, which
 * is the failure a coverage test is least able to notice about itself. Both
 * halves are floored separately — a floor on the total alone would pass with one
 * namespace empty, which is precisely the import failure worth catching.
 */
test("the imported stage lists are populated", () => {
  assert.ok(Array.isArray(COMMENT_STAGES), "COMMENT_STAGES must be an array");
  assert.ok(
    COMMENT_STAGES.length >= 11,
    `expected at least 11 tracker stages, got ${COMMENT_STAGES.length}`,
  );
  assert.ok(
    Array.isArray(PR_COMMENT_STAGES),
    "PR_COMMENT_STAGES must be an array",
  );
  assert.ok(
    PR_COMMENT_STAGES.length >= 3,
    `expected at least 3 pull-request stages, got ${PR_COMMENT_STAGES.length}`,
  );
});

for (const stage of ALL_STAGES) {
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

for (const stage of ALL_STAGES) {
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

test("every catalogue key belongs to exactly one audience", () => {
  // The converse of the coverage test above: a lead for a stage nothing can
  // produce is dead weight that reads as coverage. Since task 106 there are two
  // audiences — a tracker issue and a pull request — so the check is membership
  // in the UNION rather than in COMMENT_STAGES alone.
  const known = new Set([...COMMENT_STAGES, ...PR_COMMENT_STAGES]);
  for (const stage of LEAD_STAGES) {
    assert.ok(
      known.has(stage),
      `catalogue has "${stage}", which is in neither COMMENT_STAGES nor PR_COMMENT_STAGES`,
    );
  }
});

test("the two audiences are disjoint", () => {
  // A stage in both lists has an ambiguous audience, and the ambiguity resolves
  // differently in each engine: tracker-comment.js would accept it as a --stage
  // while the pull-request path would also claim it. The union check above is
  // satisfied by such a stage, so it needs its own assertion.
  const trackerStages = new Set(COMMENT_STAGES);
  const overlap = PR_COMMENT_STAGES.filter((s) => trackerStages.has(s));
  assert.deepEqual(
    overlap,
    [],
    `stages claimed by both audiences: ${overlap.join(", ")}`,
  );
});

test("every pull-request stage actually has a template", () => {
  // PR_COMMENT_STAGES is hand-maintained beside the catalogue. A name listed
  // there with no template renders null at the call site, and a null lead is an
  // absent paragraph rather than an error — silent in the direction that matters.
  for (const stage of PR_COMMENT_STAGES) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(LEAD_TEMPLATES, stage),
      `PR_COMMENT_STAGES lists "${stage}", which has no template`,
    );
  }
});

test("a pull-request stage is refused by the tracker-comment engine", () => {
  // The whole point of the split. If this ever passes a PR stage, a paragraph
  // about unanchored review findings can be posted onto a board card — read by
  // exactly the people the lead was written to spare.
  const { COMMENT_STAGES: engineStages } = require("../tracker-comment.js");
  for (const stage of PR_COMMENT_STAGES) {
    assert.ok(
      !engineStages.includes(stage),
      `"${stage}" is a pull-request stage but tracker-comment.js would accept it as --stage`,
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

// ── Step 5c PR-review findings (CR-1, CR-2, CR-6) ──────────────────────────

test("a numeric slot renders its COERCED value, not the source text", () => {
  // CR-1: the numeric branch validated with Number() and then stored the raw
  // string, throwing the coercion away — so "0x10" and "1e3" reached a sentence
  // written for a non-technical reader in source form.
  assert.ok(
    renderLead("develop-complete", { count: "0x10" }).includes("(16 separate"),
    "0x10 must render as 16",
  );
  assert.ok(
    renderLead("develop-complete", { count: "1e3" }).includes("(1000 separate"),
  );
  assert.ok(renderLead("qa-cycle", { cycle: "0x2" }).includes("round 2"));
});

test("a numeric slot rejects values that are not positive whole numbers", () => {
  // A negative or fractional count is a caller error, not a fact worth printing.
  for (const bad of ["-3", "2.5", "Infinity", "-1"]) {
    assert.equal(
      renderLead("develop-complete", { count: bad }),
      renderLead("develop-complete", {}),
      `count=${bad} should be dropped`,
    );
  }
  assert.ok(
    renderLead("develop-complete", { count: 16 }).includes("(16 separate"),
  );
});

test("a non-scalar slot value never reaches the sentence", () => {
  // CR-2: an object interpolated as "[object Object]", and `[]` is truthy so an
  // empty array fired a boolean slot's affirmative branch.
  assert.ok(
    !renderLead("work-started", { title: { a: 1 } }).includes("[object"),
  );
  assert.equal(
    renderLead("work-started", { title: { a: 1 } }),
    renderLead("work-started", {}),
  );
  assert.ok(
    !renderLead("review", { blocking: [] }).includes(
      "Some things need answering",
    ),
    "an empty array must not fire the affirmative branch",
  );
  assert.ok(
    renderLead("review", { blocking: true }).includes(
      "Some things need answering",
    ),
    "a real boolean must still fire it",
  );
});

test("the cycle suffix is legal only for cycle-scoped stages", () => {
  // CR-6: the strip applied to every stage, so hasTemplate("done-3") was true
  // while tracker-comment's isKnownStage rejects it — two enumerations of one
  // rule, disagreeing, kept apart only by call order.
  assert.ok(hasTemplate("qa-cycle-3"));
  assert.ok(hasTemplate("qa-fix-11"));
  assert.equal(hasTemplate("done-3"), false);
  assert.equal(hasTemplate("review-1"), false);
  assert.equal(renderLead("done-3", {}), null);
  assert.equal(renderLead("qa-cycle-3", {}), renderLead("qa-cycle", {}));
});

test("the catalogue and the comment engine agree on which stages take a suffix", () => {
  // Two lists, one rule — CYCLE_SCOPED_STAGES in tracker-comment.js and the
  // catalogue's own strip list. Held equal BEHAVIOURALLY: every engine stage
  // that accepts a suffix must resolve to a template with one, and every stage
  // that does not must not. bug.14 added `pipeline-paused` to both; a later
  // addition to only one would make the engine accept a stage the catalogue
  // cannot lead, which is exit 2 with nothing posted.
  const {
    COMMENT_STAGES,
    CYCLE_SCOPED_STAGES,
    isKnownStage,
  } = require("../tracker-comment.js");
  assert.ok(
    CYCLE_SCOPED_STAGES.length >= 3,
    "non-vacuity: expected ≥3 suffixed stages",
  );
  for (const stage of COMMENT_STAGES) {
    const suffixed = `${stage}-2`;
    assert.equal(
      hasTemplate(suffixed),
      isKnownStage(suffixed),
      `"${suffixed}": catalogue says ${hasTemplate(suffixed)}, engine says ${isKnownStage(suffixed)}`,
    );
  }
  assert.ok(hasTemplate("pipeline-paused-4"));
  assert.equal(
    renderLead("pipeline-paused-4", {}),
    renderLead("pipeline-paused", {}),
  );
});
