"use strict";
/**
 * Relationship-assertion lint — the guard, its historical corpus, and its
 * false-positive floor.
 *
 * Task 89. Task 77 produced SIX instances of one bug class across eleven
 * independent gates: an assertion claiming a relationship — X routes to Y, X
 * fires at Y, X owns Y — while testing only that both names occur in the same
 * slice of prose. Each passed against the mutation it was written to catch.
 * TWO of the six were introduced by the fix for the previous instance.
 *
 * Three test groups, in the order that makes a failure readable:
 *
 *   1. RULE UNITS — each rule fires on a minimal positive and stays quiet on a
 *      minimal negative. When a live-suite finding is disputed, this is where
 *      the rule's actual contract is written down.
 *   2. THE HISTORICAL CORPUS — all six instances, reconstructed from the
 *      commits that closed them, must be flagged; the two mechanisms that
 *      survived adversarial attack must NOT be. The negative controls are the
 *      load-bearing half: a lint that flags the fix it recommends is worse than
 *      no lint.
 *   3. THE LIVE SUITE — the whole test corpus must be clean, or the offending
 *      assertion must carry a written suppression. This is what makes the
 *      guard a guard rather than a report.
 *
 * Run: node --test tests/relationship-assertion-lint.test.js
 * In CI: picked up by the existing `tests/*.test.js` glob in `npm test` — there
 * is deliberately no package.json entry to keep in step.
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { analyze } = require("./lib/relationship-assertion-lint.js");

const REPO_ROOT = path.resolve(__dirname, "..");
const FIXTURE_DIR = path.join(__dirname, "fixtures", "relationship-assertion");

/**
 * An assertion that trips a rule but is genuinely correct carries its reason on
 * the line above. A bare suppression is not acceptable — the comment is the
 * whole point, because it is what a future reader weighs against the finding.
 */
const SUPPRESSION = /relationship-assertion-lint:\s*allow\s+—?\s*\S/;

// ── 1. Rule units ────────────────────────────────────────────────────────────

test("rule A fires on a co-occurrence regex under a routing claim", () => {
  const findings = analyze(`
    assert.match(doc, /\\|[^|\\n]*REQUEST CHANGES[^|\\n]*\\|[^|\\n]*5b[^|\\n]*\\|/,
      "the REQUEST CHANGES row must route back to 5b");
  `);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "A");
});

test("rule A stays quiet when the pattern is anchored to the relationship cell", () => {
  const findings = analyze(`
    assert.match(row.action, /^Return to \\*\\*5b\\*\\*/,
      "REQUEST CHANGES must route back to 5b as a DIRECTIVE");
  `);
  assert.deepEqual(findings, []);
});

test("rule A stays quiet on a containment claim — presence is honestly tested", () => {
  const findings = analyze(`
    assert.match(doc, /qa-fix[\\s\\S]*review-pr/,
      "both skills must be named in the step file");
  `);
  assert.deepEqual(findings, []);
});

test("rule B fires on an unbounded literal ending in a renameable token", () => {
  const findings = analyze(`
    assert.match(section5c(), /--stage ready-for-merge/,
      "ready-for-merge must fire at 5c");
  `);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "B");
});

test("rule B stays quiet once the token is bounded by a lookahead", () => {
  const findings = analyze(`
    assert.match(section5c(), /--stage ready-for-merge(?![-\\w])/,
      "ready-for-merge must fire at 5c");
  `);
  assert.deepEqual(findings, []);
});

test("rule B stays quiet on doesNotMatch — a prefix there is stricter, not weaker", () => {
  const findings = analyze(`
    assert.doesNotMatch(branching, /--stage ready-for-merge/,
      "outcome branching must no longer signal ready-for-merge");
  `);
  assert.deepEqual(findings, []);
});

test("rule C fires when two indexOf results are compared under a containment claim", () => {
  const findings = analyze(`
    const s5c = doc.indexOf("### 5c. ");
    const stage = doc.indexOf("--stage ready-for-merge");
    assert.ok(stage > s5c, "ready-for-merge must sit INSIDE 5c");
  `);
  assert.ok(
    findings.some((f) => f.rule === "C"),
    `expected a rule C finding, got ${JSON.stringify(findings)}`,
  );
});

test("rule C stays quiet when containment is asked directly", () => {
  const findings = analyze(`
    assert.ok(section5c().includes("--stage ready-for-merge-x"),
      "the stage call must sit inside 5c");
  `);
  assert.deepEqual(
    findings.filter((f) => f.rule === "C"),
    [],
  );
});

test("rule D fires when the enumeration is shorter than the non-vacuity guard", () => {
  const findings = analyze(`
    assert.ok(rows.length >= 5, "parse guard");
    for (const v of ["a", "b", "c", "d"]) {
      const row = rows.find((r) => r.key === v);
      assert.ok(row, "row must exist");
    }
  `);
  assert.ok(
    findings.some((f) => f.rule === "D"),
    `expected a rule D finding, got ${JSON.stringify(findings)}`,
  );
});

test("rule D stays quiet when every promised value is enumerated", () => {
  const findings = analyze(`
    assert.ok(rows.length >= 5, "parse guard");
    for (const v of ["a", "b", "c", "d", "e"]) {
      const row = rows.find((r) => r.key === v);
      assert.ok(row, "row must exist");
    }
  `);
  assert.deepEqual(
    findings.filter((f) => f.rule === "D"),
    [],
  );
});

test("assertions quoted inside comments and strings are not call sites", () => {
  const findings = analyze(`
    // assert.match(doc, /A[^|]*B/, "A must route to B");
    const doc = 'assert.match(doc, /A[^|]*B/, "A must route to B")';
  `);
  assert.deepEqual(findings, []);
});

// ── 2. The historical corpus ─────────────────────────────────────────────────

/**
 * The six instances, each pinned to the gate finding that named it and the
 * commit that closed it. Reconstructed with `git show <sha>` rather than
 * retyped — a fixture that does not match what the commit contained validates
 * nothing.
 */
const HISTORICAL = [
  {
    file: "instance-1.fixture.js",
    finding: "CY8-5",
    commit: "87e5bf9",
    rule: "A",
  },
  {
    file: "instance-2.fixture.js",
    finding: "CY9-3",
    commit: "8293765",
    rule: "A",
  },
  {
    file: "instance-3.fixture.js",
    finding: "CY10-1",
    commit: "ef3a0c1",
    rule: "A",
  },
  {
    file: "instance-4.fixture.js",
    finding: "CY11-1",
    commit: "18dd5b5",
    rule: "D",
  },
  {
    file: "instance-5.fixture.js",
    finding: "CY11-2",
    commit: "18dd5b5",
    rule: "C",
  },
  {
    file: "instance-6.fixture.js",
    finding: "in #5's fix",
    commit: "18dd5b5",
    rule: "B",
  },
];

const SURVIVORS = [
  {
    file: "survivor-1.fixture.js",
    what: "the parsed-row keying in pr-review-loop-parity.test.mjs",
  },
  {
    file: "survivor-2.fixture.js",
    what: "advance-pipeline-lock.test.sh, which RUNS the script and asserts the resulting step",
  },
];

test("the fixture corpus is present and complete — the parse is not vacuous", () => {
  const onDisk = fs
    .readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith(".fixture.js"))
    .sort();
  const expected = [...HISTORICAL, ...SURVIVORS].map((f) => f.file).sort();
  assert.deepEqual(
    onDisk,
    expected,
    "the fixture directory must hold exactly the six historical instances and the two negative controls — " +
      "if a fixture goes missing, every assertion below it passes while testing nothing, which is this task's own bug class",
  );
});

for (const h of HISTORICAL) {
  test(`flags historical instance ${h.file} (${h.finding}, closed by ${h.commit})`, () => {
    const src = fs.readFileSync(path.join(FIXTURE_DIR, h.file), "utf8");
    const findings = analyze(src, h.file);
    assert.ok(
      findings.length > 0,
      `${h.file} (${h.finding}) went undetected — this instance was found by an adversarial reviewer ` +
        `eleven gates into task 77, which is exactly the cost this lint exists to remove`,
    );
    assert.ok(
      findings.some((f) => f.rule === h.rule),
      `${h.file} must be caught by rule ${h.rule}; it was caught by ${findings
        .map((f) => f.rule)
        .join(
          ", ",
        )} instead. A different rule catching it by accident means rule ${h.rule} is untested.`,
    );
  });
}

for (const s of SURVIVORS) {
  test(`does NOT flag ${s.file} — ${s.what}`, () => {
    const src = fs.readFileSync(path.join(FIXTURE_DIR, s.file), "utf8");
    const findings = analyze(src, s.file);
    assert.deepEqual(
      findings,
      [],
      `${s.file} survived nine structural attacks in gate 11 and is the mechanism this lint's own ` +
        `suggested replacement recommends. Flagging it would mean the guard punishes the fix it asks for:\n` +
        findings.map((f) => `  ${f.rule} @${f.line}: ${f.detail}`).join("\n"),
    );
  });
}

// ── 3. The live suite ────────────────────────────────────────────────────────

/**
 * The four roots that hold this repository's tests. `shared/resources/tests/`
 * is included deliberately: it holds 26 files that `npm test` runs, and an
 * assertion there can go vacuous exactly as easily.
 */
const ROOTS = [
  { dir: "evals", ext: ".test.mjs" },
  { dir: "tests", ext: ".test.js" },
  { dir: "shared/resources/tests", ext: ".test.mjs" },
  { dir: "skills", ext: ".test.js" },
];

function walk(dir, ext, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "fixtures") continue;
      walk(full, ext, out);
    } else if (e.name.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * The whole `//` comment block immediately above line `line` (1-indexed).
 *
 * Scanning the block rather than a fixed number of lines is deliberate: a
 * suppression must carry a REASON, reasons run to three or four lines, and a
 * two-line window silently ignored every suppression long enough to be useful —
 * which reads, from the failure output, exactly like the suppression not being
 * there at all.
 */
function commentBlockAbove(lines, line) {
  const block = [];
  for (let i = line - 2; i >= 0; i--) {
    const t = lines[i].trim();
    if (t === "") continue;
    if (!t.startsWith("//")) break;
    block.unshift(t);
  }
  return block.join("\n");
}

function liveSuiteFiles() {
  const files = [];
  for (const r of ROOTS)
    files.push(...walk(path.join(REPO_ROOT, r.dir), r.ext));
  return files.sort();
}

test("the live suite is scanned — the corpus is not empty", () => {
  const files = liveSuiteFiles();
  assert.ok(
    files.length >= 60,
    `expected at least 60 test files across the four roots, found ${files.length} — ` +
      `if the walk breaks, the clean-suite assertion below passes while scanning nothing`,
  );
});

/**
 * The bait: a textbook rule-A defect. Appended to a file, it must be found. If
 * it is not, the scanner desynced somewhere earlier in that file and everything
 * after the desync is invisible — the analyser reports a blind file and a clean
 * one identically.
 */
const BAIT = `\nassert.match(doc, /ALPHA[^|]*BRAVO/, "ALPHA must route to BRAVO");\n`;

function baitIsFound(source) {
  return analyze(source + BAIT, "bait").some((f) =>
    f.snippet.includes("ALPHA"),
  );
}

/**
 * Regex literals in value positions the scanner once rejected. Each carries an
 * ODD number of quote characters, so a misparse opens a phantom string that
 * runs to end of file and swallows the bait.
 *
 * Asserted ONE AT A TIME, and that is the whole point. The first version of this
 * guard put all of them in a single probe file — where the apostrophe in
 * `return /it's/` was closed by the apostrophe in a LATER line, re-syncing the
 * mask and leaving the keyword arm unproven. Reverting the keyword arm kept the
 * suite green: the guard had the exact defect it was written to catch, one level
 * down, which is instance 2 and instance 6 of this task's own corpus wearing a
 * different hat. Isolation is what stops one shape rescuing another.
 */
const VALUE_POSITIONS = [
  {
    name: "after `=>` (arrow body)",
    code: `const f = (l) => /it's here/.test(l);`,
  },
  { name: "after `>` (comparison)", code: `const c = a > /don't/.test(b);` },
  { name: "after `return`", code: `function g(x) { return /it's/.test(x); }` },
  { name: "after `typeof`", code: `const t = typeof /won't/.source;` },
  { name: "after `case`", code: `switch (k) { case /isn't/.source: break; }` },
  {
    name: "backtick inside the regex",
    code: "const f = (l) => /a`b/.test(l);",
  },
  {
    name: "escaped slash then apostrophe",
    code: `const f = (l) => /a\\/b'c/.test(l);`,
  },
];

for (const vp of VALUE_POSITIONS) {
  test(`the scanner survives a regex literal ${vp.name} (CY1-1)`, () => {
    assert.ok(
      baitIsFound(vp.code + "\n"),
      `the scanner went blind on a regex literal ${vp.name}. It was parsed as division, so the quote ` +
        `inside it opened a phantom string that ran to end of file — every assertion after this point ` +
        `is invisible to every rule, and the analyser cannot tell such a file from a clean one. ` +
        `Silent under-detection, in the one tool whose purpose is catching checks that cannot observe ` +
        `what they claim.\n  code: ${vp.code}`,
    );
  });
}

test("the scanner survives all value positions together, in one file", () => {
  // The combination, not only each shape — two individually-handled positions
  // can still interact through the shared quote state.
  const probe = fs.readFileSync(
    path.join(FIXTURE_DIR, "scanner-hostile.probe.js"),
    "utf8",
  );
  assert.ok(
    baitIsFound(probe),
    "the scanner went blind somewhere in the combined probe, even though each value position passes " +
      "in isolation — the desync comes from their interaction",
  );
});

test("no file in the live corpus is invisible to the scanner", () => {
  const blind = [];
  for (const file of liveSuiteFiles()) {
    if (!baitIsFound(fs.readFileSync(file, "utf8"))) {
      blind.push(path.relative(REPO_ROOT, file));
    }
  }
  assert.deepEqual(
    blind,
    [],
    "the scanner is blind to the tail of these files, so the clean-suite result below is not " +
      "trustworthy for them — it reports 'no findings' because it stopped looking, not because " +
      "there are none:\n" +
      blind.map((f) => `  ${f}`).join("\n"),
  );
});

test("the live suite carries no unsuppressed relationship-assertion findings", () => {
  const offenders = [];
  for (const file of liveSuiteFiles()) {
    const src = fs.readFileSync(file, "utf8");
    const lines = src.split("\n");
    for (const f of analyze(src, path.relative(REPO_ROOT, file))) {
      if (SUPPRESSION.test(commentBlockAbove(lines, f.line))) continue;
      offenders.push(f);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "relationship-assertion findings in the live suite:\n" +
      offenders
        .map(
          (f) =>
            `  ${f.file}:${f.line}  [rule ${f.rule}]\n` +
            `    ${f.detail}\n` +
            `    pattern: ${f.snippet}\n` +
            `    fix: ${f.replacement}`,
        )
        .join("\n\n") +
      "\n\nIf an assertion here is genuinely correct, put " +
      "`// relationship-assertion-lint: allow — <reason>` on the line above it. " +
      "A bare suppression is not acceptable: the reason is what a future reader weighs.",
  );
});
