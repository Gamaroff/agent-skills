// ---------------------------------------------------------------------------
// qa-diminishing-returns.test.mjs
// ---------------------------------------------------------------------------
// The regression net for the QA loop's diminishing-returns exit.
//
// The rule ends a loop EARLY, so its failure direction is one-directional and
// unforgiving: a wrong exit ships work a later cycle would have caught, while a
// missed exit costs time. Every group below is therefore written to catch the
// exit firing when it should not, and only group 1 asserts that it fires at all.
//
// Defect classes guarded, one group each:
//
//   1. The rule does not fire when it should — the reconstructed run.
//   2. The rule fires on a run the Convergence check owns. The two guards must
//      never both claim the same sequence.
//   3. The rule fires on a residue that is not entirely machinery — a remaining
//      HIGH, a production-path MEDIUM, a finding naming no file.
//   4. ANTI-VACUITY. Every condition holds except the glob match. If this exits,
//      condition 2 is not being read and the rule is passing on absence.
//   5. Condition 3 is independent of condition 2 — a product defect filed
//      against a test file.
//   6. Absence read as evidence: an empty residue, an unconfigured consumer, a
//      missing gate. All must CONTINUE.
//   7. The module re-derives the HIGH count instead of taking it as input. Two
//      implementations of one count drift silently and each looks right alone.
//   8. Crash instead of verdict, and the scanner fooled by its own decoys.
//   9. Unassertable exit text. A reader six months later has to be able to tell
//      this exit from a stall.
//
// Fixtures are RECONSTRUCTIONS of a run recorded in another repository — see the
// fixtures README. They reproduce its documented shape, not its bytes.
//
// Run: node --test shared/resources/tests/qa-diminishing-returns.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = join(__dirname, "..", "qa-diminishing-returns.js");
const FIXTURES = join(__dirname, "fixtures", "qa-diminishing-returns");

const {
  classifyDiminishingReturns,
  describeDiminishingReturns,
  matchesAnyGlob,
  readTopIssues,
  readNfrStatuses,
  VERDICTS,
  CYCLE_FLOOR,
} = require(MODULE_PATH);

const fixture = (name) => readFileSync(join(FIXTURES, name), "utf8");

// The globs a consumer of this repo's own shape would configure.
const GLOBS = ["**/*.spec.ts", "**/*.test.*", "tests/**", "**/fixtures/**"];

// ── group 1 — it fires on the reconstructed run, at the right cycle ─────────

test("fires at the end of the second consecutive zero-HIGH cycle", () => {
  // The reconstructed run's HIGH sequence: 2, 0, 0, 0.
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 0, 0, 0],
    latestGateContent: fixture("residue-cycle3.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.EXIT);
  assert.equal(r.reason, "diminishing-returns");
  assert.equal(r.findings.length, 2);
  assert.ok(r.findings.every((f) => f.matched));
});

test("does not fire one cycle early — cycle 2 is below the floor", () => {
  // Cycle 2 of the same run: HIGH is already 0 and the residue is already all
  // machinery, so ONLY the cycle floor stops it. This is the assertion that
  // proves the floor is load-bearing rather than incidental.
  const r = classifyDiminishingReturns({
    cycle: 2,
    highCounts: [2, 0],
    latestGateContent: fixture("residue-cycle2.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.CONTINUE);
  assert.equal(r.reason, "below-cycle-floor");
  assert.equal(CYCLE_FLOOR, 3);
});

test("does not fire on cycle 1 of the run, where HIGH is 2", () => {
  const r = classifyDiminishingReturns({
    cycle: 1,
    highCounts: [2],
    latestGateContent: fixture("residue-cycle1.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.CONTINUE);
});

test("still fires on cycle 4 — the exit is not a one-shot at cycle 3", () => {
  const r = classifyDiminishingReturns({
    cycle: 4,
    highCounts: [2, 0, 0, 0],
    latestGateContent: fixture("residue-cycle4.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.EXIT);
});

// ── group 2 — the Convergence check's run is never claimed by this one ──────

test("never fires on the 7,7,7,7,4 sequence, at any cycle", () => {
  const seq = [7, 7, 7, 7, 4];
  for (let cycle = 1; cycle <= seq.length; cycle++) {
    const r = classifyDiminishingReturns({
      cycle,
      highCounts: seq,
      latestGateContent: fixture("flat-high-cycle3.yml"),
      testArtifactGlobs: GLOBS,
    });
    assert.equal(
      r.verdict,
      VERDICTS.CONTINUE,
      `cycle ${cycle} of 7,7,7,7,4 must not exit`,
    );
  }
});

test("a flat non-zero HIGH sequence reports the Convergence check's territory", () => {
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [7, 7, 7],
    latestGateContent: fixture("flat-high-cycle3.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.reason, "high-findings-remain");
  assert.match(r.detail, /Convergence check/);
});

// ── group 3 — a residue that is not entirely machinery ─────────────────────

test("one quiet cycle is not enough — the previous gate must be zero too", () => {
  // `2, 1, 0` at cycle 3: the LATEST gate has no HIGH, but the one before it did.
  // The rule needs two consecutive zero-HIGH readings, and this is the case that
  // separates "finished" from "briefly quiet".
  //
  // Added after mutation-proving: replacing the condition with `hN !== 0` alone
  // left every test green, because every other fixture whose latest count is zero
  // also has a zero before it. The half of condition 1 that does the work was
  // held by nothing.
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 1, 0],
    latestGateContent: fixture("residue-cycle3.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.CONTINUE);
  assert.equal(r.reason, "high-findings-remain");
  assert.match(r.detail, /1 then 0/);
});

test("one remaining HIGH blocks the exit", () => {
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 0, 1],
    latestGateContent: fixture("one-high.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.CONTINUE);
  assert.equal(r.reason, "high-findings-remain");
});

test("a MEDIUM on a production path blocks the exit", () => {
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: fixture("production-medium.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.CONTINUE);
  assert.equal(r.reason, "non-test-finding");
  assert.match(r.detail, /src\/pipeline\/gate\.ts/);
});

test("a finding carrying no file: blocks the exit", () => {
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: fixture("missing-file.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.CONTINUE);
  assert.equal(r.reason, "finding-without-file");
});

// ── group 4 — ANTI-VACUITY ─────────────────────────────────────────────────

test("anti-vacuity: every condition holds except the glob match, and it does not exit", () => {
  // If this passes only because some OTHER condition failed, the test is not
  // testing what it claims. So first assert the same gate DOES exit once the
  // globs are widened to cover it — which pins that the glob match is the one
  // and only thing standing between this input and an exit.
  const args = {
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: fixture("no-glob-match.yml"),
  };
  const withoutCoverage = classifyDiminishingReturns({
    ...args,
    testArtifactGlobs: GLOBS,
  });
  assert.equal(withoutCoverage.verdict, VERDICTS.CONTINUE);
  assert.equal(withoutCoverage.reason, "non-test-finding");

  const withCoverage = classifyDiminishingReturns({
    ...args,
    testArtifactGlobs: [...GLOBS, "verification/**"],
  });
  assert.equal(withCoverage.verdict, VERDICTS.EXIT);
});

test("a substring match is not a glob match", () => {
  // `src/latest-price.ts` contains "test". A rule that matched on substrings
  // would read production code as machinery — the exact failure the glob engine
  // exists to prevent.
  assert.equal(matchesAnyGlob("src/latest-price.ts", ["**/*test*"]), true);
  assert.equal(matchesAnyGlob("src/latest-price.ts", GLOBS), false);
});

test("** crosses directories, * does not", () => {
  assert.equal(matchesAnyGlob("a/b/c.spec.ts", ["**/*.spec.ts"]), true);
  assert.equal(matchesAnyGlob("a/b/c.spec.ts", ["*.spec.ts"]), false);
  assert.equal(matchesAnyGlob("c.spec.ts", ["**/*.spec.ts"]), true); // zero dirs
  assert.equal(matchesAnyGlob("tests/a/b.mjs", ["tests/**"]), true);
});

test("a capitalised path is matched as written, not case-folded", () => {
  // TASK-99-001. `readKeysInto` folded EVERY captured value, including `file:`,
  // which is a path rather than an enumeration. The glob is written against the
  // real path and was matched against the folded one, so any glob carrying a
  // capital letter could never match — the exit silently never fired, which from
  // the consumer's side is byte-identical to never having configured the key.
  //
  // Every other fixture and glob in this file is lowercase, so the fold was a
  // no-op suite-wide: 32/32 passed with the defect present, the anti-vacuity
  // test included. This is the only case in the file that exercises it.
  const gate = [
    "top_issues:",
    "  - id: X",
    "    severity: MEDIUM",
    "    file: src/Components/Button/Button.spec.tsx",
    "    status: open",
    "",
    "nfr_validation:",
    "  security:",
    "    status: PASS",
  ].join("\n");

  // The path survives verbatim...
  const entry = readTopIssues(gate)[0];
  assert.equal(entry.file, "src/Components/Button/Button.spec.tsx");
  // ...while the enumeration is still folded, which is what makes the fix a
  // narrowing rather than a removal.
  assert.equal(entry.severity, "medium");

  // ...and a correctly-cased glob therefore matches, so the exit fires.
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [0, 0, 0],
    latestGateContent: gate,
    testArtifactGlobs: ["src/Components/**"],
  });
  assert.equal(r.verdict, VERDICTS.EXIT);
  assert.equal(r.findings[0].file, "src/Components/Button/Button.spec.tsx");

  // And case still matters in the other direction — a lowercase glob does NOT
  // match a capitalised path. Without this half, re-introducing the fold on the
  // GLOB side instead of the path side would pass.
  assert.equal(
    matchesAnyGlob("src/Components/Button.spec.tsx", ["src/components/**"]),
    false,
  );
});

test("a run of stars collapses — no catastrophic backtracking", () => {
  // Found at the DoD security gate by EXECUTING the predicate against generated
  // candidates, not by reading it: four QA cycles had walked past it.
  //
  // `*` × N compiled to `[^/]*` × N — adjacent quantifiers, the textbook
  // catastrophic-backtracking shape. Measured before the fix against a
  // 60-character path: 8 stars 15ms, 10 stars 193ms, 12 stars 2.2s, 14 stars
  // **23 seconds**, and rising ~10× per star. Not a vulnerability — both inputs
  // are repo-controlled — but a hang, in a rule that runs inside the QA loop.
  //
  // The bound is generous on purpose. A tight one would make this test a
  // flake-generator on a loaded machine, and the defect it guards is four orders
  // of magnitude away from the bound, not a few percent.
  const started = Date.now();
  assert.equal(matchesAnyGlob("a".repeat(200), ["*".repeat(40) + "X"]), false);
  const elapsed = Date.now() - started;
  assert.ok(
    elapsed < 2000,
    `40-star glob took ${elapsed}ms — backtracking has returned`,
  );

  // Collapsing must be a no-op on MEANING, which is why it is safe: three or more
  // consecutive stars mean exactly what two mean in glob semantics.
  assert.equal(
    matchesAnyGlob("a/b/c", ["***"]),
    matchesAnyGlob("a/b/c", ["**"]),
  );
  assert.equal(
    matchesAnyGlob("a/b/x", ["****/x"]),
    matchesAnyGlob("a/b/x", ["**/x"]),
  );
  // And the single-star / double-star distinction must survive the collapse.
  assert.equal(matchesAnyGlob("a/b/c.spec.ts", ["**/*.spec.ts"]), true);
  assert.equal(matchesAnyGlob("a/b/c.spec.ts", ["*.spec.ts"]), false);
});

test("path normalisation does not widen the match", () => {
  assert.equal(matchesAnyGlob("./a/b.spec.ts", ["**/*.spec.ts"]), true);
  assert.equal(matchesAnyGlob("a\\b.spec.ts", ["**/*.spec.ts"]), true);
  assert.equal(matchesAnyGlob("/a/b.spec.ts", ["**/*.spec.ts"]), true);
  // A glob metacharacter in the PATH must not be interpreted as a glob.
  assert.equal(matchesAnyGlob("src/a.ts", ["src/*.ts"]), true);
  assert.equal(matchesAnyGlob("src/anything", ["src/a.ts"]), false);
});

// ── group 5 — condition 3 is independent of condition 2 ────────────────────

test("a product-defect signal blocks the exit even when every file: is machinery", () => {
  const gate = fixture("product-defect-nfr.yml");
  // Condition 2 alone would pass: the only finding names a .spec.ts file.
  const issues = readTopIssues(gate);
  assert.equal(issues.length, 1);
  assert.ok(matchesAnyGlob(issues[0].file, GLOBS));

  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: gate,
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.CONTINUE);
  assert.equal(r.reason, "product-defect-signal");
  assert.match(r.detail, /concerns/);
});

test("an explicit category: bug on a production path blocks the exit", () => {
  // `category:` is optional and absent from every real gate today; the rule
  // honours it when a QA skill starts emitting it.
  const gate = [
    "top_issues:",
    "  - id: X",
    "    severity: medium",
    "    category: bug",
    "    file: src/pipeline/gate.ts",
    "    status: open",
    "",
    "nfr_validation:",
    "  security:",
    "    status: PASS",
  ].join("\n");
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [0, 0, 0],
    latestGateContent: gate,
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.reason, "product-defect-signal");
});

test("an absent nfr_validation block is not itself a defect signal", () => {
  // Condition 3 fails on POSITIVE evidence only. Demanding proof of a negative
  // would make every gate fail it, which is a dead rule rather than a safe one.
  const gate = [
    "top_issues:",
    "  - id: X",
    "    severity: low",
    "    file: src/pipeline/guard.spec.ts",
    "    status: open",
  ].join("\n");
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [0, 0, 0],
    latestGateContent: gate,
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.EXIT);
});

// ── group 6 — absence is never read as evidence ────────────────────────────

test("an empty residue does not exit", () => {
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: fixture("empty-residue.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.CONTINUE);
  assert.equal(r.reason, "no-residue");
});

test("an unconfigured consumer never exits — the default is the fail-safe", () => {
  for (const globs of [[], undefined, null]) {
    const r = classifyDiminishingReturns({
      cycle: 3,
      highCounts: [2, 0, 0],
      latestGateContent: fixture("residue-cycle3.yml"),
      testArtifactGlobs: globs,
    });
    assert.equal(
      r.verdict,
      VERDICTS.CONTINUE,
      `globs=${JSON.stringify(globs)}`,
    );
    assert.equal(r.reason, "non-test-finding");
  }
});

test("a missing gate is reported as unreadable, not as an empty residue", () => {
  // Byte-identical from the caller's side unless the reasons differ: "the gate
  // raised nothing" and "there is no gate here" need different responses.
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: null,
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.CONTINUE);
  assert.equal(r.reason, "gate-unreadable");
  assert.notEqual(r.reason, "no-residue");
});

test("a short or missing HIGH sequence does not exit", () => {
  for (const highCounts of [undefined, [], [0], [0, null, 0]]) {
    const r = classifyDiminishingReturns({
      cycle: 3,
      highCounts,
      latestGateContent: fixture("residue-cycle3.yml"),
      testArtifactGlobs: GLOBS,
    });
    assert.equal(r.verdict, VERDICTS.CONTINUE);
    assert.equal(r.reason, "high-counts-missing");
  }
});

// ── group 7 — HIGH is input, not re-derived ────────────────────────────────

test("the module does not count HIGH findings itself", () => {
  // The verdict must follow the SUPPLIED counts, even when they contradict the
  // gate's own contents. That is what proves the count is an input: a module
  // that re-derived it would ignore the argument and read the gate.
  //
  // The gate here raises two HIGH findings; the caller says zero.
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: fixture("residue-cycle1.yml"),
    testArtifactGlobs: ["src/**"],
  });
  assert.notEqual(r.reason, "high-findings-remain");

  // And the converse: a gate with no HIGH at all, with counts that say otherwise.
  const r2 = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 2, 2],
    latestGateContent: fixture("residue-cycle3.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r2.reason, "high-findings-remain");
});

test("the module source contains no HIGH-counting logic", () => {
  // A behavioural test cannot catch a re-derivation added as a cross-check that
  // happens to agree with the input on every fixture. This one can, and it is
  // the only assertion in this file that reads source text — deliberately, and
  // only because the property is about what the module must NOT do.
  const src = readFileSync(MODULE_PATH, "utf8");
  const code = src
    .split(/\r?\n/)
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
  assert.doesNotMatch(code, /severity[^\n]*===[^\n]*["']high["']/);
  assert.doesNotMatch(code, /["']high["'][^\n]*===[^\n]*severity/);
});

// ── group 8 — never throws; the scanner is not fooled ──────────────────────

test("never throws on the shapes a pipeline produces on a bad day", () => {
  const inputs = [
    undefined,
    null,
    {},
    { cycle: "3", highCounts: [0, 0, 0], latestGateContent: "" },
    { cycle: 3, highCounts: "0,0,0", latestGateContent: "top_issues:" },
    { cycle: 3, highCounts: [0, 0, 0], latestGateContent: 42 },
    { cycle: 3.5, highCounts: [0, 0, 0], latestGateContent: "top_issues: []" },
    {
      cycle: 3,
      highCounts: [0, 0, 0],
      latestGateContent: "top_issues:\n  - ",
      testArtifactGlobs: [null, 42, ""],
    },
  ];
  for (const input of inputs) {
    const r = classifyDiminishingReturns(input);
    assert.equal(typeof r.verdict, "string");
    assert.equal(typeof r.reason, "string");
    assert.notEqual(
      r.verdict,
      VERDICTS.EXIT,
      `malformed input must never exit: ${JSON.stringify(input)}`,
    );
  }
});

test("a `severity: high` inside a block scalar is prose, not a field", () => {
  // residue-cycle2.yml carries exactly this decoy in its `finding: >-` block.
  // The scanner must read two entries with severities medium and low.
  const issues = readTopIssues(fixture("residue-cycle2.yml"));
  assert.equal(issues.length, 2);
  assert.deepEqual(
    issues.map((e) => e.severity),
    ["medium", "low"],
  );
});

test("a wrapped prose line beginning with '- ' does not split an entry", () => {
  const gate = [
    "top_issues:",
    "  - id: A",
    "    severity: medium",
    "    file: a.spec.ts",
    "    finding: >-",
    "      A list inside prose:",
    "      - one",
    "      - two",
    "    status: open",
  ].join("\n");
  const issues = readTopIssues(gate);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].file, "a.spec.ts");
});

test("a gate with no top_issues block reads as [] and a non-string reads as null", () => {
  assert.deepEqual(readTopIssues("gate: PASS\nquality_score: 100"), []);
  assert.equal(readTopIssues(null), null);
  assert.equal(readNfrStatuses(undefined), null);
  assert.deepEqual(readNfrStatuses("gate: PASS"), []);
});

test("the top_issues block ends at the next column-0 key", () => {
  // `waiver:` and everything after it must not be scanned as entries — a
  // `status: closed` down there would otherwise be read into the last entry.
  const issues = readTopIssues(fixture("residue-cycle3.yml"));
  assert.equal(issues.length, 2);
  assert.deepEqual(
    issues.map((e) => e.status),
    ["open", "open"],
  );
});

// ── group 9 — the exit is distinguishable from a stall in the record ────────

test("the exit message says it is a clean exit, not a stall", () => {
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: fixture("residue-cycle3.yml"),
    testArtifactGlobs: GLOBS,
  });
  const msg = describeDiminishingReturns(r);
  assert.match(msg, /CLEAN exit, not a stall/);
  assert.match(msg, /nothing was blocked/);
});

test("a non-exit message names the reason that stopped it", () => {
  const r = classifyDiminishingReturns({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: fixture("production-medium.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.match(describeDiminishingReturns(r), /not taken \(non-test-finding\)/);
});

test("describeDiminishingReturns survives a missing verdict", () => {
  assert.match(describeDiminishingReturns(null), /no verdict/);
  assert.match(describeDiminishingReturns(undefined), /no verdict/);
});

// ── the module reads no filesystem, like its sibling ────────────────────────

test("the module touches no filesystem API", () => {
  // Same property as review-report-freshness.js, for the same reason: a rule
  // that consults the disk decides differently in a fresh clone than on a
  // developer's machine, and this one is believed in both.
  const src = readFileSync(MODULE_PATH, "utf8");
  const code = src
    .split(/\r?\n/)
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
  assert.doesNotMatch(code, /require\(\s*["']node:fs["']\s*\)/);
  assert.doesNotMatch(code, /require\(\s*["']fs["']\s*\)/);
  assert.doesNotMatch(code, /readFileSync|statSync|existsSync/);
});
