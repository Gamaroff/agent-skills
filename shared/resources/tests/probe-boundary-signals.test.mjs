/**
 * probe-boundary-signals — the boundary rule as data, and the two fixtures that
 * showed two readers of one rule reaching opposite decisions (task.121, obs #121).
 *
 * The test calls the classifier; it never greps the prose. A test of prose
 * proves the string exists, not that it works.
 *
 * Run: node --test shared/resources/tests/probe-boundary-signals.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BOUNDARY_SIGNALS,
  classifyBoundaryText,
  renderSignalBullets,
} from "../probe-boundary-signals.mjs";
import { classifyBoundaryText as viaEngine } from "../security-probe.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..", "..");
const read = (rel) => readFileSync(join(REPO_ROOT, rel), "utf8");

/** The script's own words — every `#` line of its header. */
const qaCycleHeader = () =>
  read("shared/resources/qa-cycle.sh")
    .split("\n")
    .filter((l) => l.startsWith("#"))
    .join("\n");

/** task.121 gate 5, `nfr_validation.security.notes`, verbatim. */
const GATE_5_NOTE =
  "No boundary delivered across five cycles; the cycle string is validated by both CLIs against a fixed stage list; the helper reads filenames and prints a bounded integer.";

test("qa-cycle.sh's header classifies as a boundary by its own words", () => {
  const r = classifyBoundaryText(qaCycleHeader());
  assert.equal(r.boundary, true);
  // One entry per signal (CR-8): "refuses rather than" is one occurrence, not two.
  assert.equal(
    r.matched.filter((m) => m.signal === "self-declared-refusal").length,
    1,
    JSON.stringify(r.matched),
  );
  assert.ok(
    r.matched.some(
      (m) =>
        m.signal === "self-declared-refusal" &&
        /refuses rather than/i.test(m.phrase),
    ),
    JSON.stringify(r.matched),
  );
});

test("the task.121 gate-5 note carries no signal — which is why the old rule missed the script", () => {
  // The note describes the deliverable from outside ("reads filenames and
  // prints a bounded integer"); the signal is in the script's own header, which
  // the gate's reader did not read as a signal because every signal it had was
  // JS-shaped. Pinned so the fixture stays what it was: the record of the
  // failure, not a positive case.
  const r = classifyBoundaryText(GATE_5_NOTE);
  assert.equal(r.boundary, false, JSON.stringify(r.matched));
  // …and the deliverable the note was ABOUT is a boundary once its own words are read.
  const together = classifyBoundaryText(`${GATE_5_NOTE}\n\n${qaCycleHeader()}`);
  assert.equal(together.boundary, true);
});

test("a header with none of the phrases is not a boundary — the negative case is explicit", () => {
  for (const text of [
    "# render the QA report as markdown and print it to stdout",
    "# migrate the schema: add the `updated` column and backfill from `created`",
    "# format every table in the document; a formatter never changes meaning", // "never" alone is not a doc signal
  ]) {
    const r = classifyBoundaryText(text);
    assert.equal(r.boundary, false, `${text}: ${JSON.stringify(r.matched)}`);
  }
});

test("criteria vocabulary applies only under scope: criteria", () => {
  const text = "- [ ] The CLI must not accept a stage outside the list";
  assert.equal(classifyBoundaryText(text).boundary, false);
  const r = classifyBoundaryText(text, { scope: "criteria" });
  assert.equal(r.boundary, true);
  assert.equal(r.matched[0].signal, "criteria-vocabulary");
});

test("every signal has an id and a description; text signals carry phrases", () => {
  assert.ok(
    BOUNDARY_SIGNALS.length >= 5,
    "the fifth signal is the task.128 one",
  );
  const ids = new Set();
  for (const s of BOUNDARY_SIGNALS) {
    assert.ok(s.id && s.description, JSON.stringify(s));
    assert.ok(!ids.has(s.id), `duplicate signal id ${s.id}`);
    ids.add(s.id);
    if (s.phrases) {
      assert.ok(s.phrases.length > 0, `${s.id}: empty phrase list`);
      for (const re of s.phrases)
        assert.ok(re instanceof RegExp, `${s.id}: phrase is not a RegExp`);
    }
  }
  assert.ok(ids.has("self-declared-refusal"));
  assert.match(renderSignalBullets(), /^- an exported predicate/m);
});

test("the engine re-exports the classifier, so a bundled copy ships the module", () => {
  assert.equal(viaEngine, classifyBoundaryText);
});

test("classifyBoundaryText refuses a non-string rather than classifying it as nothing", () => {
  assert.throws(() => classifyBoundaryText(undefined), TypeError);
});

// ── Prose parity ─────────────────────────────────────────────────────────────

test("the finalise prompt's Step 1b lists every signal the module defines", () => {
  const prompt = read("shared/resources/finalise-dod-security-prompt.md");
  const step1b = prompt.slice(
    prompt.indexOf("### Step 1b"),
    prompt.indexOf("### Step 2"),
  );
  // A key phrase per signal — the description's opening words — so a signal
  // added to the module without a bullet in the prompt turns this red.
  for (const s of BOUNDARY_SIGNALS) {
    const key = s.description
      .replace(/[`*]/g, "")
      .split(/[(—,]/)[0]
      .trim()
      .slice(0, 40);
    assert.ok(
      step1b.replace(/[`*]/g, "").includes(key),
      `Step 1b does not name signal "${s.id}" (looked for "${key}")`,
    );
  }
  assert.ok(
    step1b.includes("probe-boundary-signals.mjs"),
    "Step 1b must cite the module",
  );
});

test("no shipped prose still says a non-JS entry point is unverifiable (BUG-10)", () => {
  // The contract test below keys on sites that name the JS form; three sites
  // that named neither form kept the old rule. This is the population check
  // for that: zero matches of the old phrasing, and — so the check cannot pass
  // on a renamed phrase — at least one site carrying the new one.
  const files = [];
  for (const f of readdirSync(join(REPO_ROOT, "shared/resources"))) {
    if (f.endsWith(".md")) files.push(`shared/resources/${f}`);
  }
  for (const d of readdirSync(join(REPO_ROOT, "skills"))) {
    files.push(`skills/${d}/SKILL.md`);
  }
  const OLD =
    /Non-JS entry points are (a stated v1 limit|`?unverifiable`?)|importable ES module export\.\*\* Non-JS/;
  const NEW = /shell:/;
  const stale = [];
  let routed = 0;
  for (const rel of files) {
    let text;
    try {
      text = read(rel);
    } catch {
      continue;
    }
    if (OLD.test(text)) stale.push(rel);
    if (NEW.test(text) && /non-JS|not JS|bash script/i.test(text)) routed += 1;
  }
  assert.deepEqual(
    stale,
    [],
    "these sites still tell a reader that non-JS is unverifiable",
  );
  assert.ok(
    routed >= 3,
    `only ${routed} site(s) route non-JS to shell: — the new phrasing moved`,
  );
});

test("every site that names the JS entry form also names the shell entry form", () => {
  // Contract test with a non-vacuity floor: the JS form appears at least at the
  // finalise prompt, the security-review prompt and both QA Step 3b sites.
  const files = [];
  for (const f of readdirSync(join(REPO_ROOT, "shared/resources"))) {
    if (f.endsWith(".md")) files.push(`shared/resources/${f}`);
  }
  for (const d of readdirSync(join(REPO_ROOT, "skills"))) {
    files.push(`skills/${d}/SKILL.md`);
  }
  const jsForm = /--entry\s+'[^']*#<?[A-Za-z]*(?:export|exportName|Options)>?'/;
  const shellForm = /--entry\s+'shell:/;
  // task.136: a site that routes a bash SCRIPT must also route a sourced
  // LIBRARY, or a reader of gh-labels.sh has a form that sources it and exits
  // (the task.125 result) and no route to the one that calls the function.
  const shellFnForm = /--entry\s+'shell-fn:/;
  const fakeGh = /--fake-gh/;
  let sites = 0;
  for (const rel of files) {
    let text;
    try {
      text = read(rel);
    } catch {
      continue;
    }
    if (!jsForm.test(text)) continue;
    sites += 1;
    assert.ok(
      shellForm.test(text),
      `${rel} names the JS entry form but not the shell one — a reader of a bash boundary has no route from this site`,
    );
    assert.ok(
      shellFnForm.test(text),
      `${rel} names the shell entry form but not shell-fn: — a reader of a sourced library has no route from this site (task.136)`,
    );
    assert.ok(
      fakeGh.test(text),
      `${rel} names shell-fn: but not --fake-gh — a function that consults gh has no offline route from this site`,
    );
  }
  assert.ok(
    sites >= 3,
    `only ${sites} site(s) name the JS entry form — the pattern no longer matches`,
  );
});

test("every site that routes a non-JS entry names the cli: form too (task.144 CR-1)", () => {
  // The contract test above keys on sites that spell the JS `--entry` form, and
  // review-security's SKILL.md routes non-JS entries in prose without ever
  // spelling it — so when task.144 added `cli:`, that site kept saying `shell:`
  // was the only route and "two positionals" the decline, and nothing noticed.
  // This population is keyed on the ROUTING statement itself (the same
  // predicate the BUG-10 test counts), so a site that routes non-JS entries
  // cannot omit the form a multi-flag Node CLI takes.
  const files = [];
  for (const f of readdirSync(join(REPO_ROOT, "shared/resources"))) {
    if (f.endsWith(".md")) files.push(`shared/resources/${f}`);
  }
  for (const d of readdirSync(join(REPO_ROOT, "skills"))) {
    files.push(`skills/${d}/SKILL.md`);
  }
  const routesNonJs = (t) =>
    /shell:/.test(t) && /non-JS|not JS|bash script/i.test(t);
  const missing = [];
  let sites = 0;
  for (const rel of files) {
    let text;
    try {
      text = read(rel);
    } catch {
      continue;
    }
    if (!routesNonJs(text)) continue;
    sites += 1;
    if (!/cli:/.test(text)) missing.push(rel);
  }
  assert.deepEqual(
    missing,
    [],
    "these sites route a non-JS entry but never name cli: — a multi-flag Node CLI has no route from them",
  );
  assert.ok(
    sites >= 5,
    `only ${sites} site(s) route a non-JS entry — the predicate no longer matches`,
  );
});
