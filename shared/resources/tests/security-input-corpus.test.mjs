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
  renderCorpusTables,
  renderRow,
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

// ---------------------------------------------------------------------------
// Purity — the corpus supplies inputs, it does not run them
// ---------------------------------------------------------------------------

test("the module imports nothing and has no side-effecting builtin", () => {
  const src = readFileSync(
    join(here, "..", "security-input-corpus.mjs"),
    "utf-8",
  );
  // Strip string literals and template literals first: the corpus legitimately
  // CONTAINS `${process.env.SECRET}` as a template-render case input, and a
  // naive grep would read that hostile input as a hostile module.
  const code = src
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``")
    .replace(/^\s*\/\/.*$/gm, "");

  const imports = code.match(
    /^\s*import\s|[^.\w]require\s*\(|^\s*export\s+\*/gm,
  );
  assert.equal(
    imports,
    null,
    "security-input-corpus.mjs has acquired an import — the corpus is inputs " +
      "only, and a dependency is the first step to one that runs them: " +
      `${imports?.join(", ")}`,
  );

  for (const forbidden of [
    "child_process",
    "node:fs",
    "node:net",
    "node:http",
    "execSync",
    "spawnSync",
    "eval(",
    "new Function",
    "process.env",
    "globalThis",
  ]) {
    assert.ok(
      !code.includes(forbidden),
      `security-input-corpus.mjs references "${forbidden}" outside a string ` +
        `literal. Importing this module must be safe in any context, including ` +
        `a security review of the module itself.`,
    );
  }
});

test("importing the module has no observable side effect", async () => {
  const before = {
    exit: process.listenerCount("exit"),
    cwd: process.cwd(),
    argv: process.argv.length,
  };
  await import("../security-input-corpus.mjs?purity-probe");
  assert.equal(
    process.listenerCount("exit"),
    before.exit,
    "import added an exit listener",
  );
  assert.equal(
    process.cwd(),
    before.cwd,
    "import changed the working directory",
  );
  assert.equal(process.argv.length, before.argv, "import mutated argv");
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

test("allCases is memoised and at least as large as the declared floors", () => {
  // Asserting the length against SINKS.flatMap(corpusFor) would restate
  // allCases()'s own body and could never fail. FLOORS is an independent source
  // of truth, so it can.
  const floor = Object.values(FLOORS).reduce(
    (n, f) => n + f.hostile + f.legitimate,
    0,
  );
  assert.ok(
    allCases().length >= floor,
    `allCases() returned ${allCases().length} cases, below the ${floor} the ` +
      `FLOORS table declares`,
  );
  assert.equal(
    allCases(),
    allCases(),
    "allCases() is not memoised — it re-freezes a fresh array per call, so the " +
      "freeze protects nothing shared",
  );
});

// ---------------------------------------------------------------------------
// D — the prose peer IS the renderer's output
// ---------------------------------------------------------------------------
// One assertion replaces three. Comparing against renderCorpusTables() catches
// every drift the old row-by-row checks caught AND three they could not: a case
// rendered under the wrong sink heading, a hostile case rendered under
// "Legitimate", and a stale hand-written count sentence. There is also no second
// renderer in this file to fall out of step with the one that generated the doc.

test("the prose peer contains the generated tables verbatim", () => {
  const tables = renderCorpusTables();
  assert.ok(
    doc().includes(tables),
    `${DOC} is not in step with renderCorpusTables(). The case tables are ` +
      `GENERATED — regenerate them rather than editing by hand:\n\n` +
      `  cd shared/resources && node -e 'import("./security-input-corpus.mjs")` +
      `.then((m) => process.stdout.write(m.renderCorpusTables()))'\n\n` +
      `A case that exists in only one of the two is how this became a third ` +
      `stale copy in task.74.`,
  );
});

test("every case appears in the document, under its own sink and direction", () => {
  // Belt and braces on the block match above: if the block assertion fails, this
  // names WHICH case moved, which the includes() check cannot.
  const text = doc();
  for (const sink of SINKS) {
    const sinkStart = text.indexOf(`### \`${sink}\``);
    assert.ok(sinkStart >= 0, `${DOC}: no section for sink "${sink}"`);
    const nextSink = SINKS.map((s2) => text.indexOf(`### \`${s2}\``))
      .filter((i) => i > sinkStart)
      .sort((a, b) => a - b)[0];
    const section = text.slice(
      sinkStart,
      nextSink === undefined ? undefined : nextSink,
    );

    for (const direction of DIRECTIONS) {
      const heading =
        direction === "hostile"
          ? "#### Hostile — must not be accepted"
          : "#### Legitimate — must still be accepted";
      const start = section.indexOf(heading);
      assert.ok(start >= 0, `${DOC}: sink "${sink}" has no ${direction} table`);
      const otherHeading =
        direction === "hostile"
          ? "#### Legitimate — must still be accepted"
          : "#### Hostile — must not be accepted";
      const otherAt = section.indexOf(otherHeading, start);
      const slice = section.slice(start, otherAt > start ? otherAt : undefined);

      for (const c of corpusFor(sink).filter(
        (x) => x.direction === direction,
      )) {
        assert.ok(
          slice.includes(renderRow(c)),
          `${DOC}: case ${c.id} is not in the "${sink}" ${direction} table`,
        );
      }
    }
  }
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
