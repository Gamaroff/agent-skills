"use strict";

/**
 * Change Log engine reachability — every skill whose prose RUNS `change-log.js`
 * must SHIP `change-log.js` (task.139, obs #152).
 *
 * `shared/resources/document-change-log.md` § "How a writer appends a row" is the
 * one statement of how a Change Log row is written: a `node -e` one-liner that
 * `require`s `./.agents/skills/{…}/references/change-log.js`, under the rule
 * "append through `change-log.js`, never by text search" and "a writer that
 * cannot reach the engine reports that as a skipped step; it does not fall back
 * to a regex". That second rule is correct, and it is also what made the defect
 * invisible: `develop` told the agent to run the one-liner and its bundle did
 * not carry the module, so on task.136 the call failed MODULE_NOT_FOUND and in
 * every consumer install the Implemented row was silently skipped.
 *
 * The bundler follows an invocation out of shared text only when the skill
 * segment names the skill being bundled — literally, or inside a `{a|b|c}`
 * alternation (create-skill § "A bundled copy nothing reaches is `UNREACHED`").
 * A bare `{placeholder}` names no skill and is skipped BY DESIGN (following it
 * over-matched 38 files, measured 2026-09-17). So the contract's one-liner
 * carries the spelled alternation, and this test keeps that alternation equal
 * to the set of skills whose prose runs the engine — two enumerations of one
 * fact, and the test is what keeps them from drifting (docs/reference/
 * anti-patterns.md § enumeration).
 *
 * The population is DERIVED from the prose, never listed here: a list in the
 * test would be a third enumeration. The anchor is the instruction phrase both
 * writers use, not the filename — the bug skills mention `change-log.js` in a
 * "do not reach for it" warning and must not match. The floor (≥ 2) is what
 * stops a rewording of the phrase from emptying the population and passing
 * (obs #117: a figure a test re-measures needs its definition recorded).
 *
 * Scoping mirrors mutation-call-site-coverage.test.js: canonical sources only
 * (`skills/<s>/SKILL.md`), never `skills/*​/references/` — those are bundle
 * echoes of the contract and would match the one-liner in every copy.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");
const CONTRACT = "shared/resources/document-change-log.md";
const ENGINE = "shared/resources/change-log.js";

// The instruction that RUNS the engine. develop (§ Develop Task Workflow step
// 12, § Develop Story Workflow step 14) and finalise (§ 7.3) both spell it this
// way; the population derivation depends on the phrase, so a writer that
// rewords it drops out and the floor below turns that red.
//
// `\s+`, not a literal space: prose wraps, and develop's story-workflow site
// already reads "Append through\n    `change-log.js`" (SKILL.md ~589). A
// single-space matcher saw develop only because its task-workflow site happens
// to sit on one line — a writer whose only instance is wrapped would have been
// silently absent from the population with every test green (QA cycle 1, CR-2).
const RUNS_ENGINE = /through\s+`change-log\.js`/;
const RUNS_ENGINE_ALL = new RegExp(RUNS_ENGINE.source, "g");

// The one-liner's require, with the skill segment the bundler follows: a
// `{a|b|c}` alternation or a literal single skill name — the same two forms
// INVOKE_REF_RE in bundle_skill.py accepts, with the same character class
// (`[A-Za-z0-9|-]`). A space or a `_` inside the braces would make the bundler
// skip it silently, so the test refuses the same characters rather than
// matching what the bundler cannot; a single-writer contract spelled without
// braces is valid to the bundler and therefore valid here (QA cycle 1, CR-3).
const ALTERNATION_RE =
  /require\("\.\/\.agents\/skills\/(\{[A-Za-z0-9|-]+\}|[A-Za-z0-9-]+)\/references\/change-log\.js"\)/;

// The bundler's header for a `.js` copy is exactly one leading line; the shared
// source has no shebang, so the header is line 1 (bundle_skill.py
// autogen_header / inject_header).
const AUTOGEN_HEADER_RE = /^\/\/ AUTO-GENERATED[^\n]*\n/;

const POPULATION_FLOOR = 2;

function population() {
  return fs
    .readdirSync(SKILLS_DIR)
    .filter((s) => fs.existsSync(path.join(SKILLS_DIR, s, "SKILL.md")))
    .filter((s) =>
      RUNS_ENGINE.test(
        fs.readFileSync(path.join(SKILLS_DIR, s, "SKILL.md"), "utf8"),
      ),
    )
    .sort();
}

function alternation() {
  const text = fs.readFileSync(path.join(REPO_ROOT, CONTRACT), "utf8");
  const m = text.match(ALTERNATION_RE);
  assert.ok(
    m,
    `${CONTRACT}: the one-liner's require names no skill segment the bundler can follow — ` +
      `expected {a|b|c} or a literal skill name (create-skill § UNREACHED)`,
  );
  const group = m[1].replace(/^\{|\}$/g, "");
  const members = group.split("|").filter(Boolean);
  assert.equal(
    members.length,
    new Set(members).size,
    `${CONTRACT}: the alternation repeats a skill — {${group}}`,
  );
  return members.sort();
}

test("the phrase matcher sees the instruction across a line wrap", () => {
  // Self-check on the instrument (non-vacuity on the regex, not the inventory):
  // both spellings the repo produces must match, and a mention that does not
  // instruct the append must not.
  assert.ok(
    RUNS_ENGINE.test(
      "**Append through `change-log.js`, never by text search**",
    ),
  );
  assert.ok(
    RUNS_ENGINE.test(
      "**Append through\n    `change-log.js`, never by text search**",
    ),
  );
  assert.ok(!RUNS_ENGINE.test("do not reach for `change-log.js` here"));

  // develop instructs the append at two sites — the story workflow (wrapped)
  // and the task workflow (one line). The derivation must see both, or a
  // future edit that drops the one-line site leaves develop in the population
  // by luck rather than by reading.
  const develop = fs.readFileSync(
    path.join(SKILLS_DIR, "develop", "SKILL.md"),
    "utf8",
  );
  const hits = develop.match(RUNS_ENGINE_ALL) || [];
  assert.ok(
    hits.length >= 2,
    `skills/develop/SKILL.md: expected the instruction at both the story-workflow and ` +
      `task-workflow sites, matched ${hits.length}`,
  );
});

test("population floor: at least two skills instruct the append through the engine", () => {
  const p = population();
  assert.ok(
    p.length >= POPULATION_FLOOR,
    `only ${p.length} skills/*/SKILL.md matched ${RUNS_ENGINE} (floor ${POPULATION_FLOOR}) — ` +
      `the instruction phrase moved, not the writers; update RUNS_ENGINE and every writer in one commit`,
  );
});

test("every skill whose prose runs the engine ships it, byte-identical to the shared source", () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, ENGINE), "utf8");
  for (const s of population()) {
    const copy = path.join(SKILLS_DIR, s, "references", "change-log.js");
    assert.ok(
      fs.existsSync(copy),
      `${s}: SKILL.md runs change-log.js but skills/${s}/references/change-log.js is missing — ` +
        `name ${s} in the alternation in ${CONTRACT} and run npm run bundle`,
    );
    const body = fs.readFileSync(copy, "utf8").replace(AUTOGEN_HEADER_RE, "");
    assert.equal(
      body,
      src,
      `${s}: references/change-log.js differs from ${ENGINE} — regenerate with npm run bundle, never hand-copy`,
    );
  }
});

test("the contract's alternation and the running population are the same set", () => {
  const a = alternation();
  const p = population();
  const notShipped = p.filter((s) => !a.includes(s));
  const notRunning = a.filter((s) => !p.includes(s));
  assert.deepEqual(
    { notInAlternation: notShipped, notInPopulation: notRunning },
    { notInAlternation: [], notInPopulation: [] },
    `${CONTRACT} alternation {${a.join("|")}} ≠ skills whose prose runs the engine [${p.join(", ")}]` +
      (notShipped.length
        ? ` — add to the alternation: ${notShipped.join(", ")}`
        : "") +
      (notRunning.length
        ? ` — named but their SKILL.md does not run it: ${notRunning.join(", ")}`
        : ""),
  );
});
