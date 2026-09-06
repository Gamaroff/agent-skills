// security-input-corpus.test.mjs — the adversarial input corpus
//
// Each block below holds a property that makes the corpus usable as an oracle
// rather than as a list. The four that carry weight:
//
//   A — both directions.  A sink with no `legitimate` case is a corpus an
//                         implementation that refuses everything passes
//                         perfectly. This is the assertion that makes the
//                         accept direction a guarantee rather than an
//                         instruction a model may skip.
//   B — floors.           A sink cannot be added as an empty stub, and the two
//                         replayed corpora (task.67.bug.3's 14 and bug.6's 13)
//                         cannot be quietly trimmed. Every sink in SINKS must
//                         declare a floor here, so adding a sink without
//                         declaring one fails rather than passing vacuously.
//   C — unknown throws.   corpusFor("shel") returning [] would produce a probe
//                         that executes zero candidates and reports no
//                         findings — indistinguishable from a boundary that
//                         held.
//   D — doc parity.       The prose peer renders every case. Without this the
//                         document becomes the third stale copy the corpus
//                         exists to prevent (task.74 found exactly that).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  SINKS,
  DIRECTIONS,
  CASE_FIELDS,
  corpusFor,
  allCases,
} from "../security-input-corpus.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DOC = "security-input-corpus.md";
const docPath = join(here, "..", DOC);
let _doc;
const doc = () => (_doc ??= readFileSync(docPath, "utf-8"));

/**
 * Per-sink minimum case counts. These are floors, not exact counts — adding a
 * case is always allowed. Shrinking below the floor is what fails.
 *
 * shell-exec's floors are the measured corpora and are deliberately tight: 27
 * hostile is 14 (task.67.bug.3) + 13 (bug.6), and 4 legitimate is bug.6's 2
 * over-refusals plus 2 baselines. Each of those inputs cost a defect to learn.
 */
const FLOORS = Object.freeze({
  "url-authority": { hostile: 8, legitimate: 3 },
  "sql-orm": { hostile: 6, legitimate: 3 },
  "shell-exec": { hostile: 27, legitimate: 4 },
  path: { hostile: 7, legitimate: 3 },
  "template-render": { hostile: 5, legitimate: 3 },
});

const byDirection = (sink, direction) =>
  corpusFor(sink).filter((c) => c.direction === direction);

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

test("every case satisfies the frozen shape", () => {
  for (const c of allCases()) {
    assert.deepEqual(
      Object.keys(c).sort(),
      [...CASE_FIELDS].sort(),
      `case ${c.id}: keys do not match CASE_FIELDS — an engine reading a ` +
        `field that is sometimes absent cannot compute a verdict from it`,
    );
    assert.ok(
      Object.isFrozen(c),
      `case ${c.id} is not frozen — a probe could mutate the corpus it is ` +
        `testing against and every later probe would see the mutation`,
    );
  }
});

test("why and correct are non-empty prose on every case", () => {
  for (const c of allCases()) {
    for (const field of ["why", "correct"]) {
      assert.equal(
        typeof c[field],
        "string",
        `case ${c.id}: ${field} is not a string`,
      );
      assert.ok(
        c[field].trim().length > 0,
        `case ${c.id}: ${field} is empty — ${field === "correct" ? "without it the case is a list entry, not an oracle" : "a case nobody can explain is a case nobody will keep accurate"}`,
      );
    }
  }
});

test("input is a string on every case, and may legitimately be empty", () => {
  for (const c of allCases()) {
    assert.equal(
      typeof c.input,
      "string",
      `case ${c.id}: input is not a string`,
    );
  }
  // The empty string is itself a hostile input at two sinks, so emptiness is
  // asserted for `why`/`correct` above and deliberately NOT for `input`.
  const empties = allCases().filter((c) => c.input === "");
  assert.ok(
    empties.length >= 1,
    "the empty string has stopped being a case anywhere — it is one of the " +
      "unparseable-input axis's most reliable candidates",
  );
});

test("direction is one of DIRECTIONS on every case", () => {
  for (const c of allCases()) {
    assert.ok(
      DIRECTIONS.includes(c.direction),
      `case ${c.id}: direction "${c.direction}" is not one of ${DIRECTIONS.join(", ")}`,
    );
  }
});

test("sink is stamped correctly and ids are namespaced by it", () => {
  for (const sink of SINKS) {
    for (const c of corpusFor(sink)) {
      assert.equal(c.sink, sink, `case ${c.id}: sink field disagrees`);
      assert.ok(
        c.id.startsWith(`${sink}.`),
        `case ${c.id}: id is not namespaced by its sink, so a hostile case ` +
          `could be run against the wrong parser without anything noticing`,
      );
    }
  }
});

test("ids are unique across the whole corpus", () => {
  const ids = allCases().map((c) => c.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(
    dupes,
    [],
    `duplicate case ids: ${dupes.join(", ")} — a probe report keyed on id ` +
      `would silently merge two different cases into one row`,
  );
});

// ---------------------------------------------------------------------------
// A — both directions
// ---------------------------------------------------------------------------

test("every sink carries at least one legitimate case", () => {
  for (const sink of SINKS) {
    const legit = byDirection(sink, "legitimate");
    assert.ok(
      legit.length >= 1,
      `sink "${sink}" has no legitimate case — an implementation that ` +
        `refuses every input would pass this sink's corpus perfectly, and ` +
        `over-refusal is a defect in the same control`,
    );
  }
});

test("every sink carries at least one hostile case", () => {
  for (const sink of SINKS) {
    assert.ok(
      byDirection(sink, "hostile").length >= 1,
      `sink "${sink}" has no hostile case — it is a stub`,
    );
  }
});

// ---------------------------------------------------------------------------
// B — floors
// ---------------------------------------------------------------------------

test("every sink declares a floor, so a new sink cannot pass vacuously", () => {
  assert.deepEqual(
    [...SINKS].sort(),
    Object.keys(FLOORS).sort(),
    "SINKS and FLOORS disagree — a sink with no declared floor could be " +
      "added as an empty stub and every count assertion below would skip it",
  );
});

test("per-sink case counts meet their floors", () => {
  for (const sink of SINKS) {
    for (const direction of DIRECTIONS) {
      const actual = byDirection(sink, direction).length;
      const floor = FLOORS[sink][direction];
      assert.ok(
        actual >= floor,
        `sink "${sink}" has ${actual} ${direction} cases, below its floor of ` +
          `${floor}. Cases are only ever added here; a drop means one was ` +
          `deleted rather than superseded.`,
      );
    }
  }
});

test("the two replayed shell corpora have not been trimmed", () => {
  // 14 from task.67.bug.3 + 13 from bug.6. Each cost a measured defect to
  // learn, and each is replayed verbatim in
  // evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs.
  assert.ok(
    byDirection("shell-exec", "hostile").length >= 27,
    "shell-exec has fewer than 27 hostile cases — the 14 task.67.bug.3 " +
      "routes and the 13 bug.6 routes are the reason this corpus exists",
  );
  assert.ok(
    byDirection("shell-exec", "legitimate").length >= 4,
    "shell-exec has fewer than 4 legitimate cases — bug.6's 2 over-refusals " +
      "are measured accept-direction data and must not be dropped",
  );
});

// ---------------------------------------------------------------------------
// C — unknown sink throws
// ---------------------------------------------------------------------------

test("corpusFor throws on an unknown sink rather than returning []", () => {
  for (const bad of ["shel", "SHELL-EXEC", "url", "", "toString"]) {
    assert.throws(
      () => corpusFor(bad),
      /Unknown sink/,
      `corpusFor(${JSON.stringify(bad)}) did not throw. Returning an empty ` +
        `array would produce a probe that executes zero candidates and finds ` +
        `nothing — indistinguishable from a boundary that held.`,
    );
  }
});

test("corpusFor returns a frozen array for every known sink", () => {
  for (const sink of SINKS) {
    const cases = corpusFor(sink);
    assert.ok(Array.isArray(cases), `corpusFor("${sink}") is not an array`);
    assert.ok(
      Object.isFrozen(cases),
      `corpusFor("${sink}") is not frozen — a caller could push into the ` +
        `shared corpus and change what every later probe runs`,
    );
  }
});

test("allCases covers every sink and nothing else", () => {
  const all = allCases();
  assert.equal(
    all.length,
    SINKS.reduce((n, s) => n + corpusFor(s).length, 0),
    "allCases() does not equal the sum of the per-sink corpora",
  );
  assert.deepEqual(
    [...new Set(all.map((c) => c.sink))].sort(),
    [...SINKS].sort(),
    "allCases() covers a different set of sinks than SINKS",
  );
});

// ---------------------------------------------------------------------------
// D — the prose peer renders every case
// ---------------------------------------------------------------------------

/** Render a case exactly as security-input-corpus.md's tables do. */
const showInput = (s) =>
  s === ""
    ? "_(empty string)_"
    : "`" + JSON.stringify(s).slice(1, -1).replace(/\|/g, "\\|") + "`";

const row = (c) => `| ${showInput(c.input)} | ${c.why} | ${c.correct} |`;

test("the prose peer renders every case in the module", () => {
  const text = doc();
  for (const c of allCases()) {
    assert.ok(
      text.includes(row(c)),
      `${DOC} does not carry case ${c.id} with the module's wording. The ` +
        `document is the readable half of one corpus, not a summary of it — ` +
        `a case that exists in only one of the two is how this became a ` +
        `third stale copy in task.74.`,
    );
  }
});

test("the prose peer carries no case the module does not have", () => {
  // Every row in a case table starts with "| `" or "| _(empty string)_".
  const rows = doc()
    .split("\n")
    .filter((l) => /^\| (?:`|_\(empty string\)_)/.test(l));
  assert.equal(
    rows.length,
    allCases().length,
    `${DOC} has ${rows.length} case rows but the module has ` +
      `${allCases().length} cases. A row the module does not back is a case ` +
      `no probe will ever run.`,
  );
});

test("the prose peer states the method ordering and both directions", () => {
  const text = doc();
  for (const needle of [
    "What a sink is",
    "The method ordering",
    "Both directions, always",
  ]) {
    assert.ok(
      text.includes(needle),
      `${DOC}: the "${needle}" section is gone — it is what makes the case ` +
        `tables interpretable`,
    );
  }
  assert.ok(
    /Grep\b[^\n]*\bpresen/i.test(text),
    `${DOC}: the ranking no longer says what grep establishes. Presence is ` +
      `the thing that misleads, and saying so is the point of the ordering.`,
  );
});
