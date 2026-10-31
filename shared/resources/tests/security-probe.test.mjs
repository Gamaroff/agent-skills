/**
 * security-probe — the four verdicts, the states that must not collapse, and the
 * containment that makes running a probe safe without an interpreter on the
 * snippet allow-list.
 *
 * The point of this suite is the STATE SEPARATION, not the happy path. Every
 * defect in the series this task closes has the same shape: two distinguishable
 * conditions rendered as one value, where one of them looks like success.
 * `probes_executed: 0` read as a pass. `declined` folded into `executed: 0`. A
 * stub that throws on everything scored as a control that engages. Each of those
 * has a test here, and each of those tests is mutation-proved below — reverting
 * the branch it guards must turn it red, or it is asserting nothing.
 *
 * Run: node --test shared/resources/tests/security-probe.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

import {
  ARGV_SLOTS,
  CLI_PREFIX,
  cliControlKey,
  OUTCOMES,
  VERDICTS,
  compareExpected,
  computeVerdict,
  defaultRepoRoot,
  describeBadCase,
  emitBlock,
  expectedProblem,
  extractFencedBlock,
  FENCE_PREFIX,
  fixtureProblem,
  isLaunchFailure,
  isPythonCrash,
  main,
  namesGh,
  ghFreePath,
  parseArgvTemplate,
  pathAssertionProblem,
  caseKey,
  isCasePath,
  probeShells,
  readRecord,
  recordEntriesDir,
  recordRun,
  resolveEntry,
  runProbeSpec,
  SHELL_ARGV_PREFIX,
  shellArgvSpawnArgs,
  toRecordEntry,
  validateCases,
} from "../security-probe.mjs";
import { corpusFor, DIRECTIONS, SINKS } from "../security-input-corpus.mjs";
import { sandboxEnv } from "../qa-execute-snippets.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = defaultRepoRoot();
const FIXTURES = "shared/resources/tests/fixtures/security-probe";

const entry = (name) => `${FIXTURES}/${name}.mjs#validateHost`;

/**
 * A small hand-built case set in the corpus shape.
 *
 * Deliberately NOT the real corpus: these tests are about the ENGINE's verdict
 * logic, and pinning them to 12 live corpus cases would make an unrelated
 * task.79 edit red this suite for a reason that has nothing to do with the
 * engine. The real corpus is exercised once, separately, below.
 */
const CASES = [
  {
    id: "t.slash",
    sink: "url-authority",
    input: "evil.example.com/x",
    why: "a / ends the authority",
    correct: "reject",
    direction: "hostile",
  },
  {
    id: "t.at",
    sink: "url-authority",
    input: "user@evil.example.com",
    why: "userinfo re-points the host",
    correct: "reject",
    direction: "hostile",
  },
  {
    id: "t.space",
    sink: "url-authority",
    input: "evil example.com",
    why: "whitespace in an authority",
    correct: "reject",
    direction: "hostile",
  },
  {
    id: "t.plain",
    sink: "url-authority",
    input: "db.internal",
    why: "an ordinary hostname",
    correct: "accept",
    direction: "legitimate",
  },
  {
    id: "t.port",
    sink: "url-authority",
    input: "db.internal:5432",
    why: "host with an explicit port",
    correct: "accept",
    direction: "legitimate",
  },
];

const hostileOnly = CASES.filter((c) => c.direction === "hostile");
const legitimateOnly = CASES.filter((c) => c.direction === "legitimate");

// ── The four verdicts, each produced by a fixture ─────────────────────────────

test("engages: hostile input rejected, legitimate input accepted", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: CASES,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.equal(r.executed, 5);
  assert.equal(r.reproduced.length, 0);
  assert.equal(r.overblocked.length, 0);
  assert.equal(r.declined.length, 0);
  assert.equal(r.passed, 5);
});

test("present-but-inert: a control that rejects some hostile input and lets one through", () => {
  // The high-severity verdict. `inert-control` rejects whitespace and `@` — so a
  // reviewer reading it sees a control and believes it — but passes `/`, which
  // is the re-pointing route. Worse than absent precisely because it has already
  // been reviewed.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("inert-control"),
    cases: CASES,
  });
  assert.equal(r.verdict, "present-but-inert", JSON.stringify(r.cases));
  assert.deepEqual(r.reproduced, ["t.slash"]);
  assert.equal(r.executed, 5);
});

test("absent: no hostile case is rejected at all", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("absent-control"),
    cases: CASES,
  });
  assert.equal(r.verdict, "absent");
  assert.equal(r.reproduced.length, 3, "every hostile case reproduces");
  assert.equal(r.executed, 5);
});

test("unverifiable: zero cases — never engages, never a pass", () => {
  // The one this whole task exists for. An empty case list must not render as
  // success at ANY layer: not in the verdict, not in `passed`, and not in the
  // process exit code (see the CLI test below).
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: [],
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "no-cases-executed");
  assert.equal(r.executed, 0);
  assert.equal(r.passed, 0);
  assert.notEqual(r.verdict, "engages");
});

test("unverifiable: a control that rejects EVERY input is not an engaging control", () => {
  // A stub that throws unconditionally rejects all three hostile cases, so the
  // naive rule "no hostile case reproduced" would score it `engages`. Requiring
  // at least one legitimate case to pass is what separates a control that works
  // from a function that is not implemented yet.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("rejects-everything"),
    cases: CASES,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "rejects-every-input");
  assert.equal(
    r.overblocked.length,
    2,
    "both legitimate cases were over-blocked",
  );
});

test("unverifiable: hostile evidence alone is required — legitimate cases cannot carry a verdict", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: legitimateOnly,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "no-hostile-evidence");
});

test("hostile-only cases cannot produce engages either", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: hostileOnly,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "no-legitimate-evidence");
});

// ── declined is its own state ────────────────────────────────────────────────

test("a non-importable entry is DECLINED, not reported as executed: 0", () => {
  // The state separation. Both conditions render as "nothing ran", but they
  // answer different questions — declined says the engine could not reach the
  // target, executed-zero says it reached it and found nothing to run.
  // Collapsing them is what makes a broken probe indistinguishable from a clean
  // one.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: `${FIXTURES}/does-not-exist.mjs#validateHost`,
    cases: CASES,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.executed, 0);
  assert.ok(r.declined.length > 0, "declined must be populated, not empty");
  assert.equal(r.declined[0].reason, "entry-not-probeable");
});

test("an export that is not a function is declined, with the reason", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("not-a-function"),
    cases: CASES,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.ok(r.declined.length > 0);
  assert.match(r.declined[0].detail, /not a function/);
});

test("an unexported predicate is declined with the remedy — export it — not as not-a-function (obs #156)", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("module-private"),
    cases: CASES,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.declined[0].reason, "entry-not-probeable");
  assert.match(r.declined[0].detail, /not exported/);
  assert.match(r.declined[0].detail, /export it/);
  assert.doesNotMatch(r.declined[0].detail, /not a function/);
});

test("a present non-function export keeps its own message, not the not-exported one", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("not-a-function"),
    cases: CASES,
  });
  assert.match(r.declined[0].detail, /is not a function/);
  assert.doesNotMatch(r.declined[0].detail, /not exported/);
});

test("an unknown sink is declined rather than yielding an empty corpus", () => {
  const r = runProbeSpec({
    sink: "not-a-real-sink",
    entry: entry("engaging-control"),
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.declined[0].reason, "unknown-sink");
  assert.equal(r.executed, 0);
});

// ── Entry-path containment ───────────────────────────────────────────────────

test("an entry path outside the repo root is rejected BEFORE import", () => {
  // Containment must precede the import: `import()` runs the module's top level,
  // so a post-hoc check would fire after arbitrary code had already executed.
  for (const bad of [
    "/etc/passwd#x",
    "../../../etc/passwd#x",
    "shared/resources/../../../../tmp/evil.mjs#x",
  ]) {
    const r = resolveEntry(bad, REPO_ROOT);
    assert.equal(r.ok, false, bad);
    assert.equal(r.reason, "outside-repo-root", bad);
  }
});

test("a traversal that resolves back inside the root is allowed", () => {
  // The check is on the RESOLVED path, not the literal — otherwise a legitimate
  // relative path containing `..` would be refused for looking suspicious.
  const r = resolveEntry(
    "shared/resources/../resources/security-probe.mjs#main",
    REPO_ROOT,
  );
  assert.equal(r.ok, true);
  assert.equal(r.exportName, "main");
});

test("a malformed entry spec is rejected with bad-entry, not a crash", () => {
  for (const bad of ["", "no-hash-here.mjs", "#onlyExport", "trailing.mjs#"]) {
    const r = resolveEntry(bad, REPO_ROOT);
    assert.equal(r.ok, false, JSON.stringify(bad));
    assert.equal(r.reason, "bad-entry", JSON.stringify(bad));
  }
});

test("runProbeSpec refuses an out-of-root entry and never executes a case", () => {
  const outside = mkdtempSync(join(tmpdir(), "probe-outside-"));
  try {
    const evil = join(outside, "evil.mjs");
    writeFileSync(evil, "export function validateHost(){ return 1; }\n");
    const r = runProbeSpec({
      sink: "url-authority",
      entry: `${evil}#validateHost`,
      cases: CASES,
    });
    assert.equal(r.verdict, "unverifiable");
    assert.equal(r.declined[0].reason, "outside-repo-root");
    assert.equal(r.executed, 0);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

// ── Containment sentinel ─────────────────────────────────────────────────────

test("the sentinel fires when a probe writes outside its working directory", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("escaping-probe"),
    cases: [CASES[0]],
  });
  assert.ok(r.escapes.length > 0, "an escaping write must be reported");
  assert.match(r.escapes[0].path, /escaped\.txt/);
});

// ── Inputs never reach a shell ───────────────────────────────────────────────

test("shell metacharacters in an input are data, not code", () => {
  // The property that makes an interpreter on SAFE_COMMANDS unnecessary. If the
  // input were interpolated into a shell string, this case would run `id` and
  // the outcome would not be a clean rejection.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: [
      {
        id: "t.injection",
        sink: "url-authority",
        input: '"; touch /tmp/probe-pwned-$$; echo "',
        why: "shell metacharacters",
        correct: "reject",
        direction: "hostile",
      },
      CASES[3],
    ],
  });
  assert.equal(r.verdict, "engages");
  assert.equal(r.reproduced.length, 0);
});

// ── The real corpus wires up ─────────────────────────────────────────────────

test("the engine runs against the real task.79 corpus", () => {
  // One end-to-end pass over the live corpus, to catch a shape mismatch between
  // the two modules. The ASSERTION is deliberately weak — the corpus is task.79's
  // to change — but a broken wiring would show as every case declining.
  const cases = corpusFor("url-authority");
  assert.ok(cases.length > 0);
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("absent-control"),
  });
  assert.equal(r.executed, cases.length, "every corpus case executed");
  assert.equal(r.declined.length, 0);
  assert.ok(VERDICTS.includes(r.verdict));
});

// ── Vocabulary ───────────────────────────────────────────────────────────────

test("computeVerdict only ever returns a known verdict", () => {
  const shapes = [
    [],
    [{ id: "a", direction: "hostile", outcome: "errored" }],
    [{ id: "a", direction: "hostile", outcome: "accepted" }],
    [
      { id: "a", direction: "hostile", outcome: "accepted" },
      { id: "b", direction: "hostile", outcome: "rejected" },
      { id: "c", direction: "legitimate", outcome: "accepted" },
    ],
    [
      { id: "a", direction: "hostile", outcome: "rejected" },
      { id: "c", direction: "legitimate", outcome: "accepted" },
    ],
  ];
  for (const s of shapes) {
    const { verdict } = computeVerdict(s);
    assert.ok(VERDICTS.includes(verdict), `${verdict} is not a known verdict`);
  }
  assert.deepEqual([...OUTCOMES], ["rejected", "accepted", "errored"]);
});

// ── Result shape (QA cycle 1: TASK80-002) ────────────────────────────────────

test("every result path returns the same key set", () => {
  // The defect this guards is a MISSING KEY, which no per-path assertion about
  // values can see. `escapes` was present only on the success path, so all four
  // early returns handed back an object where `result.escapes` was undefined —
  // and a consumer doing `result.escapes.length` throws a TypeError on exactly
  // the paths a probe most often takes, since a declined or unverifiable target
  // is the common case in v1 by this engine's own admission.
  //
  // Comparing key SETS rather than individual keys is deliberate: it also
  // catches the reverse mistake, a path that grows a field the others lack.
  const F = "shared/resources/tests/fixtures/security-probe";
  const paths = {
    success: {
      sink: "url-authority",
      entry: entry("engaging-control"),
      cases: CASES,
    },
    "decline: out-of-root": {
      sink: "url-authority",
      entry: "/etc/passwd#x",
      cases: CASES,
    },
    "decline: unknown sink": {
      sink: "not-a-real-sink",
      entry: entry("engaging-control"),
    },
    "zero cases": {
      sink: "url-authority",
      entry: entry("engaging-control"),
      cases: [],
    },
    "entry not probeable": {
      sink: "url-authority",
      entry: `${F}/does-not-exist.mjs#validateHost`,
      cases: CASES,
    },
  };

  const expected = Object.keys(runProbeSpec(paths.success)).sort();
  assert.ok(
    expected.includes("escapes"),
    "the success path must carry escapes",
  );

  for (const [name, spec] of Object.entries(paths)) {
    const r = runProbeSpec(spec);
    assert.deepEqual(
      Object.keys(r).sort(),
      expected,
      `${name} returns a different key set`,
    );
    assert.ok(
      Array.isArray(r.escapes),
      `${name}: escapes must be an array, not undefined`,
    );
  }
});

// ── CLI argument validation (QA cycle 1: TASK80-001, TASK80-003) ─────────────

test("--timeout is validated: a bad value exits 2 rather than crashing", () => {
  // Before this, `Number(argv[++i])` yielded NaN for a missing or non-numeric
  // value; NaN survived the `??` default and reached spawnSync, which threw an
  // uncaught RangeError [ERR_OUT_OF_RANGE] — a stack trace instead of the exit 2
  // this file's header documents for a bad argument.
  //
  // `0` is in this list and is the dangerous one: it is a plausible typo, it
  // parses as a number, and `timeout: 0` means NO timeout to spawnSync — so it
  // silently removed the per-case containment rather than failing loudly.
  const good = entry("engaging-control");
  for (const bad of ["abc", "0", "-1", "1.5", "1e3", "0x10", "+5", ""]) {
    assert.equal(
      main(["--sink", "url-authority", "--entry", good, "--timeout", bad]),
      2,
      `--timeout ${JSON.stringify(bad)} must exit 2`,
    );
  }
  // Surrounding whitespace is TOLERATED, not rejected — `readInt` trims before
  // testing, so " 5" means 5ms. Pinned so a future tightening of the regex is a
  // deliberate decision rather than an accident.
  assert.notEqual(
    main(["--sink", "url-authority", "--entry", good, "--timeout", " 5000"]),
    2,
    "a whitespace-padded integer must parse — any exit but 2 means it was not a parse failure",
  );

  // The flag given last, with no value at all.
  assert.equal(
    main(["--sink", "url-authority", "--entry", good, "--timeout"]),
    2,
    "--timeout with no value must exit 2",
  );
});

test("a sandbox escape forces a non-zero exit even on an otherwise-clean verdict", () => {
  // The verdict describes the control under probe; the escape describes the
  // probe itself. A caller reading only `$?` must not be told the second was
  // fine because the first was.
  // The fixture must EARN a clean verdict, or this test is vacuous. Built on
  // `escaping-probe` it was: that fixture rejects everything, so it scores
  // `unverifiable` and exits 1 whether or not the guard exists — removing the
  // guard left the suite green. `engaging-but-escaping` scores `engages`, so the
  // escape is the only thing that can make the exit non-zero.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-but-escaping"),
    cases: CASES,
  });
  assert.equal(
    r.verdict,
    "engages",
    "precondition: the verdict alone would exit 0",
  );
  assert.ok(r.escapes.length > 0, "precondition: the sentinel fired");

  const code = main([
    "--sink",
    "url-authority",
    "--entry",
    entry("engaging-but-escaping"),
    "--json",
  ]);
  assert.notEqual(
    code,
    0,
    "an escaping probe must never exit 0, even on `engages`",
  );
});

test("runProbeSpec validates timeoutMs itself — the API, not only the CLI", () => {
  // Cycle 1 validated the flag and left the parameter open, so the reported
  // symptom was fixed while the mechanism it named stayed reachable by the
  // route that mattered: `task.81` calls this function, never the CLI.
  //
  // Both values below previously reached spawnSync — NaN as an uncaught
  // RangeError, 0 as "no timeout". Now both fall back to the budget, so the
  // probe still runs and still returns a verdict.
  for (const bad of [NaN, 0, -1, 1.5, "abc", null, undefined, {}]) {
    const r = runProbeSpec({
      sink: "url-authority",
      entry: entry("engaging-control"),
      cases: CASES,
      timeoutMs: bad,
    });
    assert.equal(
      r.verdict,
      "engages",
      `timeoutMs ${JSON.stringify(bad)} must fall back to the budget, not throw`,
    );
    assert.equal(r.executed, CASES.length);
  }

  // A GOOD value is still honoured — the fallback must not swallow every input.
  const good = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: CASES,
    timeoutMs: 30000,
  });
  assert.equal(good.verdict, "engages");
});

// ── The shell entry form (task.128) ──────────────────────────────────────────
//
// A boundary delivered as a bash script is reached through `shell:<path>`: each
// materialised case is written into a fixture directory beside the sink's
// bracketing controls and the script is run against it under every shell in
// `probeShells()`. The tests below pin the three properties that make the form
// honest — the count is cases × shells, the task.121 defect reproduces BY
// STDOUT on the pre-fix script, and containment runs before anything spawns.

const SHELL_FIXTURES = "shared/resources/tests/fixtures/security-probe";
const FIXED_SCRIPT = "shell:shared/resources/qa-cycle.sh";
const PREFIX_SCRIPT = "shell:tests/fixtures/qa-cycle.prefix.sh";

test("shell entry: the fixed qa-cycle.sh engages, executed = cases × shells", () => {
  const cases = corpusFor("filename");
  const shells = probeShells();
  const r = runProbeSpec({ sink: "filename", entry: FIXED_SCRIPT });
  assert.deepEqual(r.shells, [...shells]);
  assert.equal(r.executed, cases.length * shells.length);
  assert.equal(r.declined.length, 0, JSON.stringify(r.declined));
  assert.deepEqual(r.reproduced, []);
  assert.deepEqual(r.overblocked, []);
  assert.equal(r.verdict, "engages");
  assert.equal(r.escapes.length, 0);
});

test("shell entry: the pre-fix qa-cycle.sh reproduces the newline case BY STDOUT, under every shell", () => {
  // The red fixture is the script as it was before a412f59a. With the
  // bracketing controls the hostile name is processed between gate 3 and gate
  // 12, so the aborted loop prints 3 — the lower, wrong cycle the task.121
  // finalise probe found — and stdout, not only stderr, carries the finding.
  const r = runProbeSpec({ sink: "filename", entry: PREFIX_SCRIPT });
  assert.equal(r.verdict, "present-but-inert", r.reason);
  for (const shell of probeShells()) {
    assert.ok(
      r.reproduced.includes(`filename.newline-in-name@${shell}`),
      `newline case not reproduced under ${shell}: ${JSON.stringify(r.reproduced)}`,
    );
    const hit = r.cases.find(
      (c) => c.id === "filename.newline-in-name" && c.shell === shell,
    );
    assert.match(
      hit.detail,
      /stdout "3\\n" ≠ "12\\n"/,
      `the reproduction must be visible on stdout, not only stderr: ${hit.detail}`,
    );
  }
  // Every other hostile name is handled by the pre-fix script too — the
  // defect was one name, and the verdict says so: inert, not absent.
  assert.equal(
    r.reproduced.length,
    probeShells().length,
    `only the newline case reproduces: ${JSON.stringify(r.reproduced)}`,
  );
});

test("shell entry: a leaked error on stderr fails the case even when stdout is right", () => {
  // `expected.stderr: ""` is the order-independent half of the signal. Prove it
  // is read: the same run with stderr ignored would pass this comparison.
  const run = {
    stdout: "12\n",
    status: 0,
    stderr: "line 56: arithmetic error\n",
  };
  const withStderr = compareExpected(
    { stdout: "12\n", exit: 0, stderr: "" },
    run,
    "/nonexistent",
  );
  assert.equal(withStderr.length, 1);
  assert.match(withStderr[0], /^stderr /);
  const without = compareExpected(
    { stdout: "12\n", exit: 0 },
    run,
    "/nonexistent",
  );
  assert.deepEqual(without, []);
});

test("shell entry: `absent` catches a side effect when stdout is right", () => {
  // eval-names.sh re-parses each name and prints 12 regardless, so the
  // command-substitution cases are caught ONLY by the marker file they create.
  const r = runProbeSpec({
    sink: "filename",
    entry: `shell:${SHELL_FIXTURES}/eval-names.sh`,
  });
  for (const shell of probeShells()) {
    for (const id of [
      "filename.command-substitution",
      "filename.backtick-substitution",
    ]) {
      assert.ok(
        r.reproduced.includes(`${id}@${shell}`),
        `${id} under ${shell}`,
      );
      const hit = r.cases.find((c) => c.id === id && c.shell === shell);
      assert.match(hit.detail, /was created/, hit.detail);
    }
  }
  assert.equal(
    r.escapes.length,
    0,
    "a write INSIDE the fixture is not an escape",
  );
});

test("shell entry: an out-of-root script is refused before anything spawns", () => {
  const r = runProbeSpec({ sink: "filename", entry: "shell:/etc/passwd" });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "outside-repo-root");
  assert.equal(r.executed, 0);
  assert.equal(
    r.cases.length,
    0,
    "no case may run against an out-of-root script",
  );
  assert.equal(r.shells, null);
});

test("shell entry: a missing or non-file script is DECLINED, never scored absent (BUG-2)", () => {
  // Before the fix a missing path made every run exit 127, every case mismatch
  // expected, and the verdict read absent with executed = cases × shells —
  // "could not look" scored as "the control is absent", with a count behind it.
  for (const entry of [
    "shell:shared/resources/does-not-exist.sh",
    "shell:shared/resources", // a directory
  ]) {
    const r = runProbeSpec({ sink: "filename", entry });
    assert.equal(r.verdict, "unverifiable", entry);
    assert.equal(r.reason, "entry-not-probeable", entry);
    assert.equal(r.executed, 0, `${entry}: nothing may count as executed`);
    assert.equal(r.reproduced.length, 0);
    assert.match(r.declined[0].detail, /not a readable regular file/);
  }
});

test("shell entry: a TARGET's own 126/127 exit is compared, not declined (BUG-7)", () => {
  // `bash "$1"` never consults the shebang and the readability check runs
  // before launch, so a 126/127 that reaches the comparison is the target's
  // own answer — a hostile name run as a command under `set -e` — and must be
  // scored against `expected` like any other exit, or a reproduction becomes
  // a decline (cycle-1 fix 2 did exactly that).
  const dir = mkdtempSync(
    join(REPO_ROOT, "shared/resources/tests/.t128-launch-"),
  );
  try {
    const script = join(dir, "exits-127.sh");
    writeFileSync(script, "#!/usr/bin/env bash\nexit 127\n", { mode: 0o755 });
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell:${relative(REPO_ROOT, script)}`,
    });
    assert.ok(r.executed > 0, "a target exit is a run, not a decline");
    assert.equal(r.declined.length, 0, JSON.stringify(r.declined));
    // Every hostile case mismatches expected (exit 127 ≠ 0) → accepted → the
    // script that "refuses everything by dying" is scored, not excused.
    assert.ok(r.reproduced.length > 0);
    assert.match(r.cases[0].detail, /exit 127 ≠ 0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell entry: a target that RUNS each name is compared, not declined as a launch failure (BUG-9)", () => {
  // bash prefixes runtime errors INSIDE the script with the script path
  // (`<script>: line 9: <fixture>/x: Permission denied`, exit 126) — the same
  // path a launch failure names. Containment alone declined the very
  // scenario BUG-7 was fixed for.
  const r = runProbeSpec({
    sink: "filename",
    entry: `shell:${SHELL_FIXTURES}/runs-names.sh`,
  });
  assert.equal(r.declined.length, 0, JSON.stringify(r.declined));
  assert.ok(r.executed > 0);
  const hit = r.cases.find((c) => c.direction === "hostile");
  assert.match(hit.detail, /exit 126 ≠ 0/, hit.detail);
});

test("isLaunchFailure: a runtime error inside the script is NOT a launch failure (BUG-9)", () => {
  const p = "/repo/shared/resources/x.sh";
  assert.equal(
    isLaunchFailure(
      {
        status: 126,
        stderr: `${p}: line 9: /tmp/fixture/x.gate.5.yml: Permission denied\n`,
      },
      p,
    ),
    false,
  );
  assert.equal(
    isLaunchFailure(
      {
        status: 127,
        stderr: `${p}: line 9: /tmp/fixture/x: No such file or directory\n`,
      },
      p,
    ),
    false,
  );
  // A path with regex metacharacters is matched literally.
  const odd = "/repo/a+b (c)/x.sh";
  assert.equal(
    isLaunchFailure(
      { status: 127, stderr: `bash: ${odd}: No such file or directory\n` },
      odd,
    ),
    true,
  );
});

test("shell entry: an absent name that always exists or that the fixture creates is declined (BUG-13)", () => {
  const base = corpusFor("filename").slice(0, 2);
  for (const absent of [["."], [".."], ["!.gate.3.control.yml"]]) {
    const r = runProbeSpec({
      sink: "filename",
      entry: FIXED_SCRIPT,
      cases: base.map((c) => ({ ...c, expected: { ...c.expected, absent } })),
    });
    assert.equal(r.executed, 0, JSON.stringify(absent));
    assert.equal(r.reason, "entry-not-probeable");
  }
  // A case whose absent names its OWN input is the same collision.
  const self = base.map((c) => ({
    ...c,
    expected: { ...c.expected, absent: [c.input] },
  }));
  const r = runProbeSpec({
    sink: "filename",
    entry: FIXED_SCRIPT,
    cases: self,
  });
  assert.equal(r.executed, 0);
  assert.match(r.declined[0].detail, /the fixture itself creates/);
  assert.match(
    expectedProblem({ exit: 0, absent: [".."] }),
    /other than \. and \.\./,
  );
});

test("isLaunchFailure: bash 3.2's lower-case message is recognised (CR-2)", () => {
  const p = "/repo/x.sh";
  assert.equal(
    isLaunchFailure({ status: 126, stderr: `${p}: ${p}: is a directory\n` }, p),
    true,
  );
  assert.equal(
    isLaunchFailure(
      { status: 127, stderr: `bash: ${p}: no such file or directory\n` },
      p,
    ),
    true,
  );
});

test("shell entry: escapes and shells survive the all-errored decline (CR-3)", () => {
  // A target that writes beside itself and then never answers on any case:
  // every run errors, the run collapses to an entry-level decline, and the
  // escapes it produced must still be reported.
  const dir = mkdtempSync(
    join(REPO_ROOT, "shared/resources/tests/.t128-errall-"),
  );
  try {
    const script = join(dir, "writes-then-hangs.sh");
    writeFileSync(
      script,
      '#!/usr/bin/env bash\ntouch "$HOME/PWNED-h"\nsleep 30\n',
      { mode: 0o755 },
    );
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell:${relative(REPO_ROOT, script)}`,
      cases: corpusFor("filename").slice(0, 1),
      timeoutMs: 300,
    });
    assert.equal(r.reason, "entry-not-probeable");
    assert.equal(r.executed, 0);
    assert.ok(r.escapes.length > 0, "the escape must survive the collapse");
    assert.deepEqual(r.shells, [...probeShells()]);
    assert.ok(toRecordEntry(r).escaped > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("record: totals.escaped sums every control's escapes, and the emitted block carries it (obs #73)", () => {
  // qa-task read totals.executed and totals.reproduced and gated PASS over a record whose one
  // control had escaped 10 times; /finalise, reading the same record per control, halted on it.
  // The count lives in totals now, where both readers already look.
  const dir = mkdtempSync(join(REPO_ROOT, "shared/resources/tests/.obs73-"));
  try {
    const leaky = join(dir, "leaky.sh");
    writeFileSync(
      leaky,
      '#!/usr/bin/env bash\ntouch "$HOME/PWNED-$RANDOM"\nprintf \'%s\\n\' "$1"\n',
      { mode: 0o755 },
    );
    const clean = join(dir, "clean.sh");
    writeFileSync(clean, "#!/usr/bin/env bash\nprintf '%s\\n' \"$1\"\n", {
      mode: 0o755,
    });
    const cases = corpusFor("filename").slice(0, 2);
    const record = join(dir, "x.security.run.json");
    const leakyRun = runProbeSpec({
      sink: "filename",
      entry: `shell:${relative(REPO_ROOT, leaky)}`,
      cases,
    });
    const cleanRun = runProbeSpec({
      sink: "filename",
      entry: `shell:${relative(REPO_ROOT, clean)}`,
      cases,
    });
    assert.ok(
      leakyRun.escapes.length > 0,
      "premise: the leaky control escapes",
    );
    assert.equal(
      cleanRun.escapes.length,
      0,
      "premise: the clean control does not",
    );
    recordRun(record, leakyRun, { name: "leaky" });
    recordRun(record, cleanRun, { name: "clean" });

    const rec = readRecord(record);
    const perControl = rec.controls.map((c) => c.escaped);
    assert.equal(rec.totals.escaped, leakyRun.escapes.length);
    assert.equal(
      rec.totals.escaped,
      perControl.reduce((a, b) => a + b, 0),
    );
    // The snapshot a jq reader opens carries the same total.
    assert.equal(
      JSON.parse(readFileSync(record, "utf8")).totals.escaped,
      rec.totals.escaped,
    );

    const block = emitBlock(rec);
    assert.match(block, new RegExp(`^  escaped: ${rec.totals.escaped}$`, "m"));
    assert.match(block, /^ {6}escaped: 0$/m, "the clean control reads 0");
    assert.match(emitBlock(null), /^ {2}escaped: 0$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell entry: a malformed expected is declined with its reason, never scored or thrown (BUG-11)", () => {
  const base = corpusFor("filename").slice(0, 2);
  const bad = [
    [{ stdout: 12 }, /expected\.stdout.*must be a string/],
    [{ stdout: null }, /expected\.stdout.*must be a string/],
    [{ exit: "0" }, /expected\.exit.*must be an integer/],
    [{ exit: 0, absent: 5 }, /expected\.absent.*must be an array/],
    [{ exit: 0, absent: ["../a"] }, /expected\.absent.*must be an array/],
    [{ exit: 0, absent: ["/abs"] }, /expected\.absent.*must be an array/],
    [{ exit: 0, absent: ["a/../../b"] }, /expected\.absent.*must be an array/],
    [{ exit: 0, removed: ["../a"] }, /expected\.removed.*must be an array/],
    [{ exit: 0, removed: ["/abs"] }, /expected\.removed.*must be an array/],
    [
      { exit: 0, removed: ["a/../../b"] },
      /expected\.removed.*must be an array/,
    ],
    [{ exit: 0, removed: 5 }, /expected\.removed.*must be an array/],
    [{ exit: 0, stderr: 7 }, /expected\.stderr.*must be a string/],
  ];
  for (const [expected, re] of bad) {
    let r;
    assert.doesNotThrow(() => {
      r = runProbeSpec({
        sink: "filename",
        entry: PREFIX_SCRIPT,
        cases: base.map((c) => ({ ...c, expected })),
      });
    }, JSON.stringify(expected));
    assert.equal(r.executed, 0, JSON.stringify(expected));
    assert.match(r.declined[0].detail, re, JSON.stringify(expected));
  }
  assert.equal(
    expectedProblem({ stdout: "12\n", exit: 0, stderr: "", absent: ["PWNED"] }),
    null,
  );
  assert.match(expectedProblem("nope"), /not an object/);
});

test("shell entry: side effects in HOME, TMPDIR or beside the script are escapes (BUG-12)", () => {
  try {
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell:${SHELL_FIXTURES}/writes-home-tmp-self.sh`,
    });
    const paths = r.escapes.map((e) => e.path);
    for (const marker of ["PWNED-home", "PWNED-tmp", "PWNED-self"]) {
      assert.ok(
        paths.some((p) => p.endsWith(marker)),
        `${marker} not reported as an escape: ${JSON.stringify(paths.slice(0, 6))}`,
      );
    }
    // Every escape names the shell it happened under.
    assert.ok(r.escapes.every((e) => e.shell && e.id.endsWith(`@${e.shell}`)));
    // Neither the real HOME nor the reader's real temp dir was written to.
    assert.equal(existsSync(join(process.env.HOME, "PWNED-home")), false);
    assert.equal(existsSync(join(tmpdir(), "PWNED-tmp")), false);
  } finally {
    // The script writes beside itself — in the real fixtures directory — so
    // the marker is removed whether or not the assertions held.
    rmSync(join(REPO_ROOT, SHELL_FIXTURES, "PWNED-self"), { force: true });
  }
});

test("isLaunchFailure: bash's own open failure, keyed on its message AND the code", () => {
  const p = "/repo/shared/resources/x.sh";
  const fails = (status, stderr) => isLaunchFailure({ status, stderr }, p);
  assert.equal(fails(127, `bash: ${p}: No such file or directory\n`), true);
  assert.equal(fails(126, `bash: ${p}: Permission denied\n`), true);
  assert.equal(fails(126, `${p}: ${p}: Is a directory\n`), true);
  assert.equal(fails(126, `bash: ${p}: cannot execute binary file\n`), true);
  // A target that exits 127 with its own stderr (or none) is NOT a launch failure.
  assert.equal(fails(127, ""), false);
  assert.equal(
    fails(127, "x.sh: line 3: frobnicate: command not found\n"),
    false,
  );
  // bash's message about a DIFFERENT path is not about this script.
  assert.equal(
    fails(127, "bash: /other/thing: No such file or directory\n"),
    false,
  );
  // The message without the code is not a launch failure either.
  assert.equal(fails(0, `bash: ${p}: Permission denied\n`), false);
});

test("shell entry: a side effect a no-cd script writes to its cwd is caught by absent (BUG-5)", () => {
  // eval-names-nocd.sh never cd's into the fixture; its `$(touch PWNED)`
  // lands in the child's cwd. With cwd: workDir that was invisible to both
  // `absent` (which looks in the fixture) and the sentinel (which skips
  // workDir); the child now runs IN the fixture.
  const r = runProbeSpec({
    sink: "filename",
    entry: `shell:${SHELL_FIXTURES}/eval-names-nocd.sh`,
  });
  for (const shell of probeShells()) {
    for (const id of [
      "filename.command-substitution",
      "filename.backtick-substitution",
    ]) {
      assert.ok(
        r.reproduced.includes(`${id}@${shell}`),
        `${id} under ${shell}`,
      );
      const hit = r.cases.find((c) => c.id === id && c.shell === shell);
      assert.match(hit.detail, /was created/, hit.detail);
    }
  }
  assert.equal(r.escapes.length, 0);
});

test("shell entry: an expected that compares nothing is declined, never a vacuous pass (BUG-8)", () => {
  // With `expected: {}` every run "matched" and the PRE-FIX script scored
  // engages. The corpus schema test cannot see a --cases-file; the engine must.
  const base = corpusFor("filename").slice(0, 2);
  for (const expected of [{}, { absent: ["PWNED"] }]) {
    const cases = base.map((c) => ({ ...c, expected }));
    const r = runProbeSpec({ sink: "filename", entry: PREFIX_SCRIPT, cases });
    assert.equal(r.executed, 0, JSON.stringify(expected));
    assert.equal(r.verdict, "unverifiable");
    assert.match(r.declined[0].detail, /compares nothing/);
  }
  // A single comparable key is enough to be scored.
  const one = base.map((c) => ({ ...c, expected: { exit: c.expected.exit } }));
  assert.ok(
    runProbeSpec({ sink: "filename", entry: FIXED_SCRIPT, cases: one })
      .executed > 0,
  );
});

test("shell entry: the record carries which shells ran (CR-5), and declined/escape ids carry the shell (CR-6)", () => {
  const r = runProbeSpec({ sink: "filename", entry: FIXED_SCRIPT });
  const entryRow = toRecordEntry(r, { name: "x" });
  assert.deepEqual(entryRow.shells, [...probeShells()]);
  assert.equal(
    toRecordEntry(
      runProbeSpec({ sink: "url-authority", entry: entry("engaging-control") }),
    ).shells,
    null,
  );
  // Round-trip through a record on disk and the emitted block.
  const dir = mkdtempSync(join(tmpdir(), "probe-shells-"));
  try {
    const record = join(dir, "run.json");
    const out = [];
    const write = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk) => (out.push(String(chunk)), true);
    try {
      main([
        "--sink",
        "filename",
        "--entry",
        "shell:shared/resources/qa-cycle.sh",
        "--record",
        record,
        "--repo-root",
        REPO_ROOT,
      ]);
      main(["--emit-block", record]);
    } finally {
      process.stdout.write = write;
    }
    assert.deepEqual(readRecord(record).controls[0].shells, [...probeShells()]);
    assert.match(
      out.join(""),
      new RegExp(`shells: \\[${probeShells().join(", ")}\\]`),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  // CR-6: a declined case under two shells is two ids, not one id twice.
  // (One valid case alongside, or the all-errored path collapses the run to a
  // single entry-level decline by design.)
  const [first, second] = corpusFor("filename");
  const { expected: _e, ...stripped } = first;
  const d = runProbeSpec({
    sink: "filename",
    entry: FIXED_SCRIPT,
    cases: [stripped, second],
  });
  assert.deepEqual(
    d.declined.map((x) => x.id),
    probeShells().map((sh) => `${first.id}@${sh}`),
  );
});

test("a NUL byte in an entry is bad-entry for BOTH forms, and the shell form never throws (BUG-3)", () => {
  assert.equal(
    resolveEntry("shell:shared/resources/qa-cycle\u0000.sh", REPO_ROOT).reason,
    "bad-entry",
  );
  assert.equal(
    resolveEntry("shared/resources/x\u0000.mjs#f", REPO_ROOT).reason,
    "bad-entry",
  );
  let r;
  assert.doesNotThrow(() => {
    r = runProbeSpec({
      sink: "filename",
      entry: "shell:shared/resources/qa-cycle\u0000.sh",
    });
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "bad-entry");
});

test("shell entry: a sink that is not materialised is declined, never executed", () => {
  const r = runProbeSpec({ sink: "path", entry: FIXED_SCRIPT });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "entry-not-probeable");
  assert.equal(r.executed, 0);
  assert.match(r.declined[0].detail, /not materialised/);
});

test("shell entry: a case with no `expected` is declined, not scored", () => {
  const stripped = corpusFor("filename").map(
    ({ expected: _e, ...rest }) => rest,
  );
  const r = runProbeSpec({
    sink: "filename",
    entry: FIXED_SCRIPT,
    cases: stripped,
  });
  assert.equal(r.executed, 0);
  assert.equal(r.verdict, "unverifiable");
});

test("resolveEntry: the shell prefix takes no export name and the same containment", () => {
  const ok = resolveEntry("shell:shared/resources/qa-cycle.sh", REPO_ROOT);
  assert.equal(ok.ok, true);
  assert.equal(ok.kind, "shell");
  assert.equal("exportName" in ok, false);
  assert.equal(resolveEntry("shell:", REPO_ROOT).reason, "bad-entry");
  assert.equal(resolveEntry("shell:a.sh#x", REPO_ROOT).reason, "bad-entry");
  assert.equal(
    resolveEntry("shell:../x.sh", REPO_ROOT).reason,
    "outside-repo-root",
  );
  assert.equal(
    resolveEntry("shell:node_modules/x/y.sh", REPO_ROOT).reason,
    "outside-repo-root",
  );
  const js = resolveEntry(entry("engaging-control"), REPO_ROOT);
  assert.equal(js.kind, "js");
});

test("shell entry: the CLI form runs and records the same shape as the JS form", () => {
  const dir = mkdtempSync(join(tmpdir(), "probe-shell-cli-"));
  try {
    const record = join(dir, "run.json");
    const out = [];
    const write = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk) => (out.push(String(chunk)), true);
    let rc;
    try {
      rc = main([
        "--sink",
        "filename",
        "--entry",
        "shell:shared/resources/qa-cycle.sh",
        "--record",
        record,
        "--name",
        "qa-cycle",
        "--repo-root",
        REPO_ROOT,
      ]);
    } finally {
      process.stdout.write = write;
    }
    assert.equal(rc, 0, out.join(""));
    assert.match(out.join(""), /^engages .* executed (\d+)/);
    const emitted = [];
    process.stdout.write = (chunk) => (emitted.push(String(chunk)), true);
    try {
      main(["--emit-block", record]);
    } finally {
      process.stdout.write = write;
    }
    assert.match(emitted.join(""), /evidence: measured/);
    assert.match(
      emitted.join(""),
      /entry: shell:shared\/resources\/qa-cycle\.sh/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── The shell-fn entry form (task.136) ───────────────────────────────────────
//
// A boundary delivered as a SOURCED LIBRARY — a file whose header says "source
// it" and whose function is then called — is reached through
// `shell-fn:<path>#<function>`: the file is sourced and the function called with
// the case's input as argv, under every shell in `probeShells()`. The `shell:`
// form run against such a file sources it and exits — the function never runs,
// every case mismatches, and the verdict reads `absent` with `escaped 0`. That
// is the task.125 result these rows exist to make unreachable. A function that
// consults `gh` is answered by the `--fake-gh` directory on PATH, so the
// filtering branch is the branch that runs.

const FN_LIB = "shared/resources/gh-labels.sh";
const FN_ENTRY = `shell-fn:${FN_LIB}#gh_labels_filter`;
const FAKE_GH = "tests/fixtures/fake-gh";
const FN_FIXTURES = "tests/fixtures/shell-fn";
const LABEL_CASES = JSON.parse(
  readFileSync(join(REPO_ROOT, FN_FIXTURES, "gh-labels.cases.json"), "utf8"),
);

test("resolveEntry: shell-fn:<path>#<fn> resolves with kind shell-fn and the function name", () => {
  const r = resolveEntry(FN_ENTRY, REPO_ROOT);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.kind, "shell-fn");
  assert.equal(r.fnName, "gh_labels_filter");
  assert.equal(r.entryPath, join(REPO_ROOT, FN_LIB));
  assert.equal("exportName" in r, false);
});

test("resolveEntry: shell-fn: without a function, or with a name no shell accepts, is bad-entry naming the form", () => {
  for (const bad of [
    "shell-fn:",
    `shell-fn:${FN_LIB}`,
    `shell-fn:${FN_LIB}#`,
    "shell-fn:#gh_labels_filter",
    `shell-fn:${FN_LIB}#not a name`,
    `shell-fn:${FN_LIB}#$(id)`,
  ]) {
    const r = resolveEntry(bad, REPO_ROOT);
    assert.equal(r.ok, false, bad);
    assert.equal(r.reason, "bad-entry", bad);
    assert.match(r.detail, /shell-fn:path#function|shell function name/, bad);
  }
  // The `shell:` form's own refusal of a `#` still points at the new form.
  assert.equal(resolveEntry("shell:a.sh#x", REPO_ROOT).reason, "bad-entry");
});

test("resolveEntry: shell-fn: takes the same containment as shell:", () => {
  assert.equal(
    resolveEntry("shell-fn:/etc/passwd#f", REPO_ROOT).reason,
    "outside-repo-root",
  );
  assert.equal(
    resolveEntry("shell-fn:../x.sh#f", REPO_ROOT).reason,
    "outside-repo-root",
  );
  assert.equal(
    resolveEntry("shell-fn:node_modules/x/y.sh#f", REPO_ROOT).reason,
    "outside-repo-root",
  );
  assert.equal(
    resolveEntry(`shell-fn:${FN_LIB}\u0000#f`, REPO_ROOT).reason,
    "bad-entry",
  );
  let r;
  assert.doesNotThrow(() => {
    r = runProbeSpec({
      sink: "filename",
      entry: `shell-fn:shared/resources/gh-labels\u0000.sh#f`,
      cases: LABEL_CASES,
    });
  });
  assert.equal(r.reason, "bad-entry");
});

test("shell-fn entry: gh_labels_filter engages against the label cases behind the fake gh, executed = cases × shells", () => {
  const shells = probeShells();
  const r = runProbeSpec({
    sink: "filename",
    entry: FN_ENTRY,
    cases: LABEL_CASES,
    fakeGh: FAKE_GH,
  });
  assert.equal(
    r.verdict,
    "engages",
    JSON.stringify(
      {
        reason: r.reason,
        declined: r.declined,
        cases: r.cases.filter((c) => c.detail),
      },
      null,
      1,
    ),
  );
  assert.deepEqual(r.shells, [...shells]);
  assert.equal(r.executed, LABEL_CASES.length * shells.length);
  assert.equal(r.declined.length, 0, JSON.stringify(r.declined));
  assert.deepEqual(r.reproduced, []);
  assert.deepEqual(r.overblocked, []);
  assert.equal(r.escapes.length, 0, JSON.stringify(r.escapes));
  assert.equal(r.fakeGh, join(REPO_ROOT, FAKE_GH));
});

test("shell-fn entry: the shell: form run against the same library is the task.125 result — sourced, never called", () => {
  // The pre-task shape: `bash gh-labels.sh <fixture-dir>` defines the function
  // and exits 0 with nothing on stdout. Every legitimate case mismatches, the
  // function's filtering branch never runs, and the count looks complete.
  const r = runProbeSpec({
    sink: "filename",
    entry: `shell:${FN_LIB}`,
    cases: LABEL_CASES,
    fakeGh: FAKE_GH,
  });
  assert.notEqual(r.verdict, "engages");
  assert.equal(r.executed, LABEL_CASES.length * probeShells().length);
  assert.ok(r.overblocked.length > 0, "every legitimate label is dropped");
});

test("shell-fn entry: a function that echoes every argument unfiltered is absent", () => {
  const r = runProbeSpec({
    sink: "filename",
    entry: `shell-fn:${FN_FIXTURES}/echo-unfiltered.sh#echo_all`,
    cases: LABEL_CASES,
    fakeGh: FAKE_GH,
  });
  assert.equal(r.verdict, "absent", JSON.stringify(r.declined));
  assert.equal(r.reason, "no-hostile-case-was-rejected");
  assert.equal(r.executed, LABEL_CASES.length * probeShells().length);
  // Every hostile case is reproduced under every shell, and the ids say which.
  for (const shell of probeShells()) {
    assert.ok(
      r.reproduced.includes(`label.undefined-label@${shell}`),
      `undefined label not reproduced under ${shell}`,
    );
  }
});

test("shell-fn entry: a library that fails to source is declined with exit 97 on every case, never scored", () => {
  // A syntax error in the library makes `source` fail. Exit 97 is reserved for
  // that so the failure is a NAMED decline rather than a silent `absent` — and
  // the fixture is written at test time, because a tracked `.sh` with a syntax
  // error would fail the ShellCheck lane by design.
  const dir = mkdtempSync(join(REPO_ROOT, FN_FIXTURES, ".t136-source-"));
  try {
    const lib = join(dir, "syntax-error.sh");
    writeFileSync(lib, "#!/usr/bin/env bash\nbroken() {\n  if [ 1 ]; then\n", {
      mode: 0o644,
    });
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell-fn:${relative(REPO_ROOT, lib)}#broken`,
      cases: LABEL_CASES,
      fakeGh: FAKE_GH,
    });
    assert.equal(r.verdict, "unverifiable");
    assert.equal(r.reason, "entry-not-probeable");
    assert.equal(r.executed, 0, "a source failure is not an execution");
    assert.match(r.declined[0].detail, /source .* failed \(exit 97\)/);
    assert.equal(r.cases.length, LABEL_CASES.length * probeShells().length);
    assert.ok(
      r.cases.every((c) => c.outcome === "errored" && /exit 97/.test(c.detail)),
      JSON.stringify(r.cases.slice(0, 2)),
    );
    assert.deepEqual(r.shells, [...probeShells()]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell-fn entry: a function the library does not define is declined, not scored as a 127 mismatch", () => {
  const r = runProbeSpec({
    sink: "filename",
    entry: `shell-fn:${FN_LIB}#no_such_function`,
    cases: LABEL_CASES,
    fakeGh: FAKE_GH,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "entry-not-probeable");
  assert.equal(r.executed, 0);
  assert.match(r.declined[0].detail, /no_such_function.*not defined/);
});

test("shell-fn entry: --fake-gh must name a directory holding an executable gh, else bad-fake-gh before anything spawns", () => {
  for (const bad of [
    "tests/fixtures/does-not-exist",
    FN_FIXTURES, // a directory with no gh in it
    `${FAKE_GH}/gh`, // the file, not its directory
  ]) {
    const r = runProbeSpec({
      sink: "filename",
      entry: FN_ENTRY,
      cases: LABEL_CASES,
      fakeGh: bad,
    });
    assert.equal(r.verdict, "unverifiable", bad);
    assert.equal(r.reason, "bad-fake-gh", bad);
    assert.equal(r.executed, 0, bad);
    assert.equal(r.cases.length, 0, `${bad}: nothing may spawn`);
  }
  // Outside the repo root is refused by the same containment as an entry.
  const r = runProbeSpec({
    sink: "filename",
    entry: FN_ENTRY,
    cases: LABEL_CASES,
    fakeGh: "/usr/bin",
  });
  assert.equal(r.reason, "bad-fake-gh");
});

test("shell-fn entry: the fake gh refuses to answer outside the probe (FAKE_GH unset)", () => {
  // The engine sets FAKE_GH=1 for the run it owns. Anywhere else — a shell
  // whose PATH was left pointing at the fixture — the fake exits 2 by name.
  const gh = join(REPO_ROOT, FAKE_GH, "gh");
  const bare = spawnSync(
    gh,
    ["label", "list", "--json", "name", "-q", ".[].name"],
    {
      encoding: "utf8",
      env: { PATH: process.env.PATH },
    },
  );
  assert.equal(bare.status, 2);
  assert.match(bare.stderr, /FAKE_GH unset/);
  const armed = spawnSync(
    gh,
    ["label", "list", "--json", "name", "-q", ".[].name"],
    {
      encoding: "utf8",
      env: { PATH: process.env.PATH, FAKE_GH: "1" },
    },
  );
  assert.equal(armed.status, 0);
  assert.equal(
    armed.stdout,
    "priority:high\npriority:medium\npriority:low\ntask\nbug\n",
  );
  const json = spawnSync(gh, ["label", "list", "--json", "name"], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, FAKE_GH: "1" },
  });
  assert.deepEqual(
    JSON.parse(json.stdout).map((l) => l.name),
    ["priority:high", "priority:medium", "priority:low", "task", "bug"],
  );
  const other = spawnSync(gh, ["repo", "view"], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, FAKE_GH: "1" },
  });
  assert.equal(other.status, 2);
  assert.match(other.stderr, /unsupported subcommand: repo view/);
});

test("shell-fn entry: the CLI form runs with --cases-file and --fake-gh and records fake_gh on the entry", () => {
  const dir = mkdtempSync(join(tmpdir(), "probe-shell-fn-cli-"));
  try {
    const record = join(dir, "run.json");
    const out = [];
    const write = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk) => (out.push(String(chunk)), true);
    let rc;
    try {
      rc = main([
        "--sink",
        "filename",
        "--entry",
        FN_ENTRY,
        "--cases-file",
        join(REPO_ROOT, FN_FIXTURES, "gh-labels.cases.json"),
        "--fake-gh",
        FAKE_GH,
        "--record",
        record,
        "--name",
        "gh_labels_filter",
        "--repo-root",
        REPO_ROOT,
      ]);
    } finally {
      process.stdout.write = write;
    }
    assert.equal(rc, 0, out.join(""));
    assert.match(out.join(""), /^engages .* executed (\d+)/);
    const control = readRecord(record).controls[0];
    assert.equal(control.entry, FN_ENTRY);
    assert.equal(control.fake_gh, join(REPO_ROOT, FAKE_GH));
    assert.deepEqual(control.shells, [...probeShells()]);
    assert.equal(control.executed, LABEL_CASES.length * probeShells().length);
    // A JS-form entry carries no fake_gh.
    assert.equal(
      toRecordEntry(
        runProbeSpec({
          sink: "url-authority",
          entry: entry("engaging-control"),
        }),
      ).fake_gh,
      null,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell-fn entry: --fake-gh without an operand, and an unreadable directory, are argument errors", () => {
  const err = [];
  const write = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk) => (err.push(String(chunk)), true);
  try {
    assert.equal(
      main(["--sink", "filename", "--entry", FN_ENTRY, "--fake-gh"]),
      2,
    );
  } finally {
    process.stderr.write = write;
  }
  assert.match(err.join(""), /--fake-gh requires an operand/);
});

// ── task.136 QA cycle 1 — the fixes, each with its row ───────────────────────

test("shell-fn entry: --fake-gh on a JS-form entry is bad-fake-gh, never recorded as having answered (TASK-136-BUG-1)", () => {
  // The JS runner hands the entry JSON on stdin and spawns no shell, so a fake
  // on PATH can never answer it. Before the fix the directory was validated,
  // ignored by the runner, and RECORDED as `fake_gh` — a record claiming a
  // fixture answered when the real binary did.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    fakeGh: FAKE_GH,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "bad-fake-gh");
  assert.match(r.declined[0].detail, /shell entry forms only/);
  assert.equal(r.executed, 0, "nothing may spawn");
  assert.equal(
    r.fakeGh,
    null,
    "a declined fake is not recorded as the one that answered",
  );
  assert.equal(toRecordEntry(r).fake_gh, null);
  // The same directory on the shell: form is accepted (it does consult PATH).
  const sh = runProbeSpec({
    sink: "filename",
    entry: FIXED_SCRIPT,
    fakeGh: FAKE_GH,
  });
  assert.equal(sh.verdict, "engages");
  assert.equal(sh.fakeGh, join(REPO_ROOT, FAKE_GH));
});

test("shell-fn entry: a function that itself exits 97 or 98 is SCORED, not declined as a broken library (CR-2)", () => {
  const dir = mkdtempSync(join(REPO_ROOT, FN_FIXTURES, ".t136-collide-"));
  try {
    const lib = join(dir, "collides.sh");
    writeFileSync(
      lib,
      '#!/usr/bin/env bash\nrefuse97() { case "$1" in bug) printf "bug\\n";; *) exit 97;; esac; }\n',
      { mode: 0o644 },
    );
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell-fn:${relative(REPO_ROOT, lib)}#refuse97`,
      cases: LABEL_CASES,
      fakeGh: FAKE_GH,
    });
    // Every hostile case mismatches on exit (99 ≠ 0) → reproduced; the one
    // legitimate `bug` case matches → the control is absent, with a full count.
    assert.equal(r.declined.length, 0, JSON.stringify(r.declined));
    assert.equal(r.executed, LABEL_CASES.length * probeShells().length);
    assert.notEqual(r.verdict, "unverifiable");
    const hostile = r.cases.find((c) => c.id === "label.undefined-label");
    assert.match(hostile.detail, /exit 99 ≠ 0/, hostile.detail);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell-fn entry: a slash-bearing input is a case, not a materialisation failure (CR-3)", () => {
  // `area/backend` is a real label shape. The shell: form must still refuse
  // it (a directory entry cannot carry a separator); the shell-fn form passes
  // it as argv and writes no per-case file.
  const cases = [
    {
      id: "label.slash",
      input: "area/backend",
      direction: "hostile",
      expected: { stdout: "", exit: 0 },
    },
    {
      id: "label.ok",
      input: "bug",
      direction: "legitimate",
      expected: { stdout: "bug\n", exit: 0, stderr: "" },
    },
  ];
  const fn = runProbeSpec({
    sink: "filename",
    entry: FN_ENTRY,
    cases,
    fakeGh: FAKE_GH,
  });
  assert.equal(fn.verdict, "engages", JSON.stringify(fn.declined));
  assert.equal(fn.declined.length, 0);
  const slash = fn.cases.find((c) => c.id === "label.slash");
  assert.deepEqual(
    slash.fixture,
    ["!.gate.3.control.yml", "~.gate.12.control.yml"],
    "no per-case file is claimed",
  );
  const script = runProbeSpec({ sink: "filename", entry: FIXED_SCRIPT, cases });
  assert.match(script.declined[0].detail, /path separator/);
  // A NUL in a shell-fn input is still declined — argv cannot carry it.
  const nul = runProbeSpec({
    sink: "filename",
    entry: FN_ENTRY,
    cases: [{ ...cases[0], id: "label.nul", input: "a\u0000b" }, cases[1]],
    fakeGh: FAKE_GH,
  });
  assert.match(nul.declined[0].detail, /NUL/);
});

test("shell-fn entry: the fake gh's issue create records its argv to FAKE_GH_LOG and answers a URL (CR-4)", () => {
  const dir = mkdtempSync(join(tmpdir(), "fake-gh-log-"));
  try {
    const log = join(dir, "gh.log");
    const gh = join(REPO_ROOT, FAKE_GH, "gh");
    const r = spawnSync(
      gh,
      ["issue", "create", "--title", "t", "--label", "bug"],
      {
        encoding: "utf8",
        env: { PATH: process.env.PATH, FAKE_GH: "1", FAKE_GH_LOG: log },
      },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "https://example.invalid/issues/1\n");
    assert.equal(
      readFileSync(log, "utf8"),
      "issue\ncreate\n--title\nt\n--label\nbug\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell-fn entry: a missing library is declined BEFORE anything spawns, not only by the source failing", () => {
  const r = runProbeSpec({
    sink: "filename",
    entry: "shell-fn:shared/resources/does-not-exist.sh#f",
    cases: LABEL_CASES,
    fakeGh: FAKE_GH,
  });
  assert.equal(r.reason, "entry-not-probeable");
  assert.match(r.declined[0].detail, /not a readable regular file/);
  assert.equal(
    r.cases.length,
    0,
    "the pre-spawn check, not exit 97, is what declined it",
  );
  assert.equal(r.shells, null);
});

// ── task.136 QA cycle 2 — the fixes, each with its row ───────────────────────

test("shell-fn entry: a library that exits at top level is declined via the EXIT trap, never scored absent (TASK-136-BUG-2)", () => {
  // `source` runs the library in the harness shell: a top-level `exit 1`
  // ended the harness with 1 before `|| exit 97` ran, every case mismatched,
  // and the verdict was a SCORED absent with a full count.
  const dir = mkdtempSync(join(REPO_ROOT, FN_FIXTURES, ".t136-toplevel-exit-"));
  try {
    const lib = join(dir, "exits.sh");
    writeFileSync(
      lib,
      "#!/usr/bin/env bash\nf() { printf 'bug\\n'; }\nexit 1\n",
      {
        mode: 0o644,
      },
    );
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell-fn:${relative(REPO_ROOT, lib)}#f`,
      cases: LABEL_CASES,
      fakeGh: FAKE_GH,
    });
    assert.equal(r.verdict, "unverifiable");
    assert.equal(r.reason, "entry-not-probeable");
    assert.equal(
      r.executed,
      0,
      "a top-level exit is a source failure, not 20 executions",
    );
    assert.match(r.declined[0].detail, /source .* failed \(exit 97\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell-fn entry: under set -e the function's own 97 is still re-mapped and scored (TASK-136-BUG-2 / CR-3)", () => {
  const dir = mkdtempSync(join(REPO_ROOT, FN_FIXTURES, ".t136-errexit-"));
  try {
    const lib = join(dir, "errexit.sh");
    writeFileSync(
      lib,
      '#!/usr/bin/env bash\nset -e\nrefuse97() { case "$1" in bug) printf "bug\\n";; *) return 97;; esac; }\nreached() { false; printf "reached\\n"; }\n',
      { mode: 0o644 },
    );
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell-fn:${relative(REPO_ROOT, lib)}#refuse97`,
      cases: LABEL_CASES,
      fakeGh: FAKE_GH,
    });
    assert.equal(r.declined.length, 0, JSON.stringify(r.declined));
    assert.equal(r.executed, LABEL_CASES.length * probeShells().length);
    assert.match(
      r.cases.find((c) => c.id === "label.undefined-label").detail,
      /exit 99 ≠ 0/,
    );
    // errexit is still in force INSIDE the function: `false` stops it before
    // it can print.
    const e = runProbeSpec({
      sink: "filename",
      entry: `shell-fn:${relative(REPO_ROOT, lib)}#reached`,
      cases: [
        {
          id: "x.ok",
          input: "bug",
          direction: "legitimate",
          expected: { stdout: "reached\n", exit: 0 },
        },
        {
          id: "x.h",
          input: "zzz",
          direction: "hostile",
          expected: { stdout: "", exit: 0 },
        },
      ],
      fakeGh: FAKE_GH,
    });
    assert.equal(e.declined.length, 0);
    const ok = e.cases.find((c) => c.id === "x.ok");
    assert.match(
      ok.detail,
      /stdout "" ≠ "reached\\n"/,
      "errexit stopped the function before printf",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell-fn entry: a library that names gh without --fake-gh is declined needs-fake-gh, not scored through the passthrough (CR-2)", () => {
  const r = runProbeSpec({
    sink: "filename",
    entry: FN_ENTRY,
    cases: LABEL_CASES,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "needs-fake-gh");
  assert.equal(r.executed, 0, "nothing may spawn without the fixture");
  assert.match(r.declined[0].detail, /names `gh`.*--fake-gh/);
  // A library that does not name gh runs without one.
  const e = runProbeSpec({
    sink: "filename",
    entry: `shell-fn:${FN_FIXTURES}/echo-unfiltered.sh#echo_all`,
    cases: LABEL_CASES,
  });
  assert.equal(e.reason, "no-hostile-case-was-rejected");
});

// ── task.140: the sentinel and the fake-gh gate reach every library shape ───
//
// Seven limits task.136's QA cycle 3, PR review and finalise recorded as verified
// and not fixed there. Each row below was red against the task.136 engine; each
// change is mutation-proved by its own row (task.140 implementation report).

/** Write each named library into a fresh temp dir inside the repo; returns the dir. */
function t140Libs(tag, libs) {
  const dir = mkdtempSync(join(REPO_ROOT, FN_FIXTURES, `.t140-${tag}-`));
  for (const [name, text] of Object.entries(libs)) {
    writeFileSync(join(dir, name), text, { mode: 0o644 });
  }
  return dir;
}

test("shell-fn entry: a library that installs its own EXIT trap before a guard is still a named decline (task.140, c3-CR-1)", () => {
  // The library's trap REPLACES the harness's; the guard's `exit 1` then ends
  // the harness with 1, every case mismatches, and the verdict was a scored
  // absent. Shadowing `exit` intercepts the call before any trap fires.
  const dir = t140Libs("own-trap", {
    "own-trap.sh":
      '#!/usr/bin/env bash\ntrap "true" EXIT\nf() { printf \'hi\\n\'; }\n[ -n "$NOPE" ] || exit 1\n',
  });
  try {
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell-fn:${relative(REPO_ROOT, join(dir, "own-trap.sh"))}#f`,
      cases: LABEL_CASES,
      fakeGh: FAKE_GH,
    });
    assert.equal(r.verdict, "unverifiable", JSON.stringify(r.declined));
    assert.equal(r.reason, "entry-not-probeable");
    assert.equal(
      r.executed,
      0,
      "a displaced guard is a source failure, not executions",
    );
    assert.match(r.declined[0].detail, /source .* failed \(exit 97\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell-fn entry: a set -e library whose top-level command fails is declined, not sourced to completion (task.140, PR-review CR-1)", () => {
  // On the left of `||` both shells suspend errexit for everything the library
  // runs at top level, so `set -e; false` was sourced to completion and SCORED —
  // where a consumer's own `source` would have aborted.
  const dir = t140Libs("errexit-src", {
    "errexit-src.sh":
      "#!/usr/bin/env bash\nset -e\nfalse\nf() { printf 'reached\\n'; }\n",
  });
  try {
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell-fn:${relative(REPO_ROOT, join(dir, "errexit-src.sh"))}#f`,
      cases: LABEL_CASES,
      fakeGh: FAKE_GH,
    });
    assert.equal(r.verdict, "unverifiable", JSON.stringify(r.declined));
    assert.equal(r.reason, "entry-not-probeable");
    assert.equal(r.executed, 0);
    assert.match(r.declined[0].detail, /source .* failed \(exit 97\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell entry: a script whose body names gh without --fake-gh is needs-fake-gh, same as the shell-fn form (task.140, c3-CR-2)", () => {
  const dir = t140Libs("shell-gh", {
    "names-gh.sh":
      '#!/usr/bin/env bash\ngh label list >/dev/null 2>&1\nprintf "%s\\n" "$1"\n',
  });
  try {
    const entry = `shell:${relative(REPO_ROOT, join(dir, "names-gh.sh"))}`;
    const r = runProbeSpec({ sink: "filename", entry, cases: LABEL_CASES });
    assert.equal(r.verdict, "unverifiable");
    assert.equal(r.reason, "needs-fake-gh");
    assert.equal(r.executed, 0, "the host gh must never run");
    assert.match(r.declined[0].detail, /names `gh`.*--fake-gh/);
    // Given the fixture, the same script runs and is scored.
    const e = runProbeSpec({
      sink: "filename",
      entry,
      cases: LABEL_CASES,
      fakeGh: FAKE_GH,
    });
    assert.notEqual(e.reason, "needs-fake-gh");
    assert.equal(e.executed, LABEL_CASES.length * probeShells().length);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('shell-fn entry: gh reached as gh;, gh>, (gh), "$GH" or through a one-level source is detected (task.140, c3-CR-3)', () => {
  const dir = t140Libs("gh-shapes", {
    "semi.sh": "#!/usr/bin/env bash\nf() { gh; printf '%s\\n' \"$1\"; }\n",
    "redir.sh":
      "#!/usr/bin/env bash\nf() { gh>/dev/null 2>&1; printf '%s\\n' \"$1\"; }\n",
    "paren.sh":
      "#!/usr/bin/env bash\nf() { (gh) || true; printf '%s\\n' \"$1\"; }\n",
    "var.sh":
      '#!/usr/bin/env bash\nGH=gh\nf() { "$GH" api x >/dev/null 2>&1; printf \'%s\\n\' "$1"; }\n',
    // Resolved against the LIBRARY's directory (tests/fixtures/shell-fn/.t140-…/).
    "src-rel.sh":
      "#!/usr/bin/env bash\n# shellcheck source=/dev/null\nsource ../../../../shared/resources/gh-labels.sh\nf() { printf '%s\\n' \"$1\"; }\n",
    // Resolved against the ROOT — the repository's own idiom is cwd-relative
    // (`source references/gh-labels.sh`).
    "src-root.sh":
      "#!/usr/bin/env bash\n# shellcheck source=/dev/null\n. shared/resources/gh-labels.sh\nf() { printf '%s\\n' \"$1\"; }\n",
  });
  try {
    for (const lib of [
      "semi.sh",
      "redir.sh",
      "paren.sh",
      "var.sh",
      "src-rel.sh",
      "src-root.sh",
    ]) {
      const r = runProbeSpec({
        sink: "filename",
        entry: `shell-fn:${relative(REPO_ROOT, join(dir, lib))}#f`,
        cases: LABEL_CASES,
      });
      assert.equal(r.reason, "needs-fake-gh", lib);
      assert.equal(r.executed, 0, lib);
    }
    // Not over-matched: a variable that merely starts with GH, a word that
    // merely contains gh, and a sourced file outside the root do not decline.
    const clean = t140Libs("gh-clean", {
      "clean.sh":
        '#!/usr/bin/env bash\n# shellcheck source=/dev/null\nsource /etc/profile.does-not-exist\nf() { : "$GH_TOKEN" high; printf \'%s\\n\' "$1"; }\n',
    });
    try {
      const r = runProbeSpec({
        sink: "filename",
        entry: `shell-fn:${relative(REPO_ROOT, join(clean, "clean.sh"))}#f`,
        cases: LABEL_CASES,
      });
      assert.notEqual(r.reason, "needs-fake-gh", JSON.stringify(r.declined));
    } finally {
      rmSync(clean, { recursive: true, force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveEntry: a symlink inside the root that points outside it is refused outside-repo-root (task.140 — the task.128 limit closed)", () => {
  const outside = mkdtempSync(join(tmpdir(), "t140-outside-"));
  const dir = mkdtempSync(join(REPO_ROOT, FN_FIXTURES, ".t140-symlink-"));
  try {
    // The row proves nothing if TMPDIR lies inside the repo (QA cycle 1, CR-5).
    assert.ok(
      !(realpathSync(outside) + sep).startsWith(realpathSync(REPO_ROOT) + sep),
      `${outside} must be outside ${REPO_ROOT} for this row to test anything — set TMPDIR elsewhere`,
    );
    writeFileSync(join(outside, "f.sh"), "f() { :; }\n", { mode: 0o644 });
    symlinkSync(outside, join(dir, "link"));
    const rel = relative(REPO_ROOT, join(dir, "link", "f.sh"));
    for (const e of [`shell-fn:${rel}#f`, `shell:${rel}`, `${rel}#f`]) {
      const r = resolveEntry(e, REPO_ROOT);
      assert.equal(r.ok, false, e);
      assert.equal(r.reason, "outside-repo-root", e);
    }
    // Symmetric: a root reached THROUGH a symlink still contains its own files,
    // and an in-tree symlink to an in-tree file still resolves.
    const viaLink = join(outside, "root-link");
    symlinkSync(REPO_ROOT, viaLink);
    const ok = resolveEntry(FN_ENTRY, viaLink);
    assert.equal(ok.ok, true, JSON.stringify(ok));
    symlinkSync(join(REPO_ROOT, FN_LIB), join(dir, "lib-link.sh"));
    const inTree = resolveEntry(
      `shell-fn:${relative(REPO_ROOT, join(dir, "lib-link.sh"))}#gh_labels_filter`,
      REPO_ROOT,
    );
    assert.equal(inTree.ok, true, JSON.stringify(inTree));
    assert.equal(inTree.entryPath, join(REPO_ROOT, FN_LIB));
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("shell-fn entry: a library that replaces the EXIT trap and then fails under set -e is declined, in both orderings (task.140 QA cycle 1, CR-1 / TASK-140-BUG-1)", () => {
  // errexit ends the shell WITHOUT calling the shadowed exit, so the EXIT trap
  // decides the status — and the library had replaced it. The second ordering
  // was declined (97) by the task.136 body and scored (1) by task.140's first
  // body on bash 5 and zsh: a regression this row pins.
  const dir = t140Libs("trap-errexit", {
    "before.sh":
      "#!/usr/bin/env bash\ntrap true EXIT\nset -e\nfalse\nf() { printf 'hi\\n'; }\n",
    "after.sh":
      "#!/usr/bin/env bash\nf() { printf 'hi\\n'; }\ntrap true EXIT\nset -e\nfalse\n",
  });
  try {
    for (const lib of ["before.sh", "after.sh"]) {
      const r = runProbeSpec({
        sink: "filename",
        entry: `shell-fn:${relative(REPO_ROOT, join(dir, lib))}#f`,
        cases: LABEL_CASES,
        fakeGh: FAKE_GH,
      });
      assert.equal(
        r.reason,
        "entry-not-probeable",
        `${lib}: ${JSON.stringify(r.declined)}`,
      );
      assert.equal(r.executed, 0, lib);
      assert.match(r.declined[0].detail, /source .* failed \(exit \d+\)/, lib);
    }
    // A library's NON-EXIT trap still installs: only EXIT is the harness's.
    const intTrap = t140Libs("int-trap", {
      "int.sh":
        "#!/usr/bin/env bash\ntrap 'printf int' INT\nf() { printf '%s\\n' \"$1\"; }\n",
    });
    try {
      const r = runProbeSpec({
        sink: "filename",
        entry: `shell-fn:${relative(REPO_ROOT, join(intTrap, "int.sh"))}#f`,
        cases: LABEL_CASES,
        fakeGh: FAKE_GH,
      });
      assert.equal(r.declined.length, 0, JSON.stringify(r.declined));
      assert.equal(r.executed, LABEL_CASES.length * probeShells().length);
    } finally {
      rmSync(intTrap, { recursive: true, force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell-fn entry: --fake-gh containment is decided on real paths, like an entry's (task.140 QA cycle 1, CR-2 / TASK-140-BUG-2)", () => {
  const outside = mkdtempSync(join(tmpdir(), "t140-fake-outside-"));
  const dir = mkdtempSync(join(REPO_ROOT, FN_FIXTURES, ".t140-fakegh-"));
  try {
    assert.ok(
      !(realpathSync(outside) + sep).startsWith(realpathSync(REPO_ROOT) + sep),
    );
    cpSync(join(REPO_ROOT, FAKE_GH, "gh"), join(outside, "gh"));
    symlinkSync(outside, join(dir, "fake"));
    const r = runProbeSpec({
      sink: "filename",
      entry: FN_ENTRY,
      cases: LABEL_CASES,
      fakeGh: relative(REPO_ROOT, join(dir, "fake")),
    });
    assert.equal(r.reason, "bad-fake-gh", JSON.stringify(r.declined));
    assert.equal(r.executed, 0);
    assert.equal(r.cases.length, 0, "nothing may spawn");
    // An in-tree symlink to the in-tree fixture is still a fixture.
    symlinkSync(join(REPO_ROOT, FAKE_GH), join(dir, "in-tree"));
    const ok = runProbeSpec({
      sink: "filename",
      entry: FN_ENTRY,
      cases: LABEL_CASES,
      fakeGh: relative(REPO_ROOT, join(dir, "in-tree")),
    });
    assert.equal(ok.verdict, "engages", JSON.stringify(ok.declined));
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("namesGh: quoted or backslashed gh, a non-line-initial source, and a root reached through a symlink (task.140 QA cycle 1, CR-3 / CR-6)", () => {
  const dir = t140Libs("gh-more", {
    "dq.sh": 'f() { "gh" api x; }\n',
    "sq.sh": "f() { 'gh' api x; }\n",
    "bs.sh": "f() { \\gh api x; }\n",
    "and.sh":
      "[ -f shared/resources/gh-labels.sh ] && source shared/resources/gh-labels.sh\nf() { :; }\n",
    "semi.sh": "set -e; . shared/resources/gh-labels.sh\nf() { :; }\n",
    "then.sh":
      "if true; then source shared/resources/gh-labels.sh; fi\nf() { :; }\n",
    "clean.sh":
      "f() { printf 'high ghost %s\\n' \"$1\"; }  # ends in gh-less words\n",
  });
  const viaLink = mkdtempSync(join(tmpdir(), "t140-rootlink-"));
  try {
    for (const lib of [
      "dq.sh",
      "sq.sh",
      "bs.sh",
      "and.sh",
      "semi.sh",
      "then.sh",
    ]) {
      assert.equal(namesGh(join(dir, lib), REPO_ROOT), true, lib);
    }
    assert.equal(namesGh(join(dir, "clean.sh"), REPO_ROOT), false, "clean.sh");
    // CR-6: the export realpaths its own root, so a lexical root through a
    // symlink still follows an in-tree source.
    const link = join(viaLink, "root");
    symlinkSync(REPO_ROOT, link);
    assert.equal(
      namesGh(realpathSync(join(dir, "semi.sh")), link),
      true,
      "root via symlink",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(viaLink, { recursive: true, force: true });
  }
});

test("shell-fn entry: any way the shell dies during the source is declined — no trap-install shape escapes (task.140 QA cycle 2, CR-1 / TASK-140-BUG-3)", () => {
  // The decline keys on a POSITIVE marker the body writes once the source has
  // returned, not on filtering how a library installs a trap: each of these
  // replaced the harness's EXIT trap past the cycle-1 shadow.
  const dir = t140Libs("trap-shapes", {
    "lower.sh":
      "#!/usr/bin/env bash\ntrap true exit\nset -e\nfalse\nf() { :; }\n",
    "builtin.sh":
      "#!/usr/bin/env bash\nbuiltin trap true EXIT\nset -e\nfalse\nf() { :; }\n",
    "command.sh":
      "#!/usr/bin/env bash\ncommand trap true EXIT\nset -e\nfalse\nf() { :; }\n",
    "trapexit.sh": "TRAPEXIT() { return 0; }\nset -e\nfalse\nf() { :; }\n",
    "exec.sh": "f() { :; }\nexec true\n",
  });
  try {
    for (const lib of [
      "lower.sh",
      "builtin.sh",
      "command.sh",
      "trapexit.sh",
      "exec.sh",
    ]) {
      const r = runProbeSpec({
        sink: "filename",
        entry: `shell-fn:${relative(REPO_ROOT, join(dir, lib))}#f`,
        cases: LABEL_CASES,
        fakeGh: FAKE_GH,
      });
      assert.equal(
        r.reason,
        "entry-not-probeable",
        `${lib}: ${JSON.stringify(r.declined)}`,
      );
      assert.equal(r.executed, 0, lib);
      assert.match(r.declined[0].detail, /source .* failed \(exit \d+\)/, lib);
      assert.deepEqual(
        r.escapes,
        [],
        `${lib}: the harness marker is not an escape`,
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell entry forms: gh reached at RUN time without --fake-gh trips the wire and is declined, however it is spelled (task.140 QA cycle 2, CR-2 / CR-3 / TASK-140-BUG-4)", () => {
  // The static detector cannot read these; the trip-wire gh first on PATH can.
  const dir = t140Libs("gh-runtime", {
    "default.sh":
      '#!/usr/bin/env bash\nf() { "${GH_BIN:-gh}" api x >/dev/null 2>&1; printf \'%s\\n\' "$1"; }\n',
    "assign.sh":
      '#!/usr/bin/env bash\nGH_CLI=gh\nf() { "$GH_CLI" api x >/dev/null 2>&1; printf \'%s\\n\' "$1"; }\n',
    // Absolute: at run time cwd is the fixture dir, where a root-relative source
    // would fail before gh was ever reached.
    "if-source.sh": `#!/usr/bin/env bash\nif source ${JSON.stringify(join(REPO_ROOT, FN_LIB))}; then :; fi\nf() { gh_labels_filter "$1"; }\n`,
    "script.sh":
      '#!/usr/bin/env bash\nX=gh\n"$X" label list >/dev/null 2>&1\nprintf \'%s\\n\' "$1"\n',
  });
  try {
    for (const [lib, form] of [
      ["default.sh", "shell-fn"],
      ["assign.sh", "shell-fn"],
      ["if-source.sh", "shell-fn"],
      ["script.sh", "shell"],
    ]) {
      const rel = relative(REPO_ROOT, join(dir, lib));
      const entry = form === "shell" ? `shell:${rel}` : `shell-fn:${rel}#f`;
      const r = runProbeSpec({ sink: "filename", entry, cases: LABEL_CASES });
      assert.equal(
        r.reason,
        "needs-fake-gh",
        `${lib}: ${JSON.stringify(r.declined)}`,
      );
      assert.equal(r.executed, 0, lib);
      assert.match(r.declined[0].detail, /invoked .gh. at run time/, lib);
      assert.deepEqual(r.escapes, [], `${lib}: the trip-wire is not an escape`);
    }
    // A library that sources gh-labels but never CALLS gh runs and is scored:
    // the guarantee is that the host gh never runs, not that a mention declines.
    const quiet = t140Libs("gh-quiet", {
      "quiet.sh": `#!/usr/bin/env bash\nif source ${JSON.stringify(join(REPO_ROOT, FN_LIB))}; then :; else exit 3; fi\nf() { printf '%s\\n' "$1"; }\n`,
    });
    try {
      const r = runProbeSpec({
        sink: "filename",
        entry: `shell-fn:${relative(REPO_ROOT, join(quiet, "quiet.sh"))}#f`,
        cases: LABEL_CASES,
      });
      assert.notEqual(r.reason, "needs-fake-gh", JSON.stringify(r.declined));
      assert.equal(r.executed, LABEL_CASES.length * probeShells().length);
    } finally {
      rmSync(quiet, { recursive: true, force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell entry forms: the trip-wire decline keeps what the runs observed — escapes, cases, shells (task.140 QA cycle 3, TASK-140-BUG-5)", () => {
  // Writes $HOME (an escape: HOME is inside the sandbox root, outside the work
  // dir) AND reaches gh. The decline must not replace the escapes with [].
  const dir = t140Libs("gh-escape", {
    "both.sh":
      '#!/usr/bin/env bash\nf() { : > "$HOME/escaped"; X=gh; "$X" api x >/dev/null 2>&1; printf \'%s\\n\' "$1"; }\n',
    "home-only.sh":
      '#!/usr/bin/env bash\nf() { : > "$HOME/escaped"; printf \'%s\\n\' "$1"; }\n',
  });
  try {
    const run = (lib) =>
      runProbeSpec({
        sink: "filename",
        entry: `shell-fn:${relative(REPO_ROOT, join(dir, lib))}#f`,
        cases: LABEL_CASES,
      });
    const both = run("both.sh");
    const homeOnly = run("home-only.sh");
    assert.equal(both.reason, "needs-fake-gh", JSON.stringify(both.declined));
    assert.equal(both.executed, 0, "nothing is scored");
    assert.ok(
      homeOnly.escapes.length > 0,
      "control: the HOME write is an escape",
    );
    assert.equal(
      both.escapes.length,
      homeOnly.escapes.length,
      "the decline reports the same escapes the unscored run observed",
    );
    assert.deepEqual(both.shells, probeShells());
    assert.equal(both.cases.length, LABEL_CASES.length * probeShells().length);
    assert.equal(both.fakeGh, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell entry forms: gh called under env -i still trips the wire — the marker path is in the stub, not the environment (task.140 QA cycle 3, TASK-140-BUG-6)", () => {
  const dir = t140Libs("gh-env-i", {
    "envi.sh":
      '#!/usr/bin/env bash\nf() { X=gh; env -i PATH="$PATH" "$X" api x >/dev/null 2>&1; printf \'%s\\n\' "$1"; }\n',
    "envi-script.sh":
      '#!/usr/bin/env bash\nX=gh\nenv -i PATH="$PATH" "$X" label list >/dev/null 2>&1\nprintf \'%s\\n\' "$1"\n',
  });
  try {
    for (const [lib, form] of [
      ["envi.sh", "shell-fn"],
      ["envi-script.sh", "shell"],
    ]) {
      const rel = relative(REPO_ROOT, join(dir, lib));
      const entry = form === "shell" ? `shell:${rel}` : `shell-fn:${rel}#f`;
      const r = runProbeSpec({ sink: "filename", entry, cases: LABEL_CASES });
      assert.equal(
        r.reason,
        "needs-fake-gh",
        `${lib}: ${JSON.stringify(r.declined)}`,
      );
      assert.equal(r.executed, 0, lib);
      // The RUN-TIME decline, not the static detector's: the trip-wire fired.
      assert.match(r.declined[0].detail, /invoked .gh. at run time/, lib);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shell entry forms: an ABSOLUTE path to a gh binary bypasses the trip-wire — a stated limit this row pins (task.140 QA cycle 2, probe-boundary-rule.md §5)", () => {
  const outside = mkdtempSync(join(tmpdir(), "t140-abs-gh-"));
  const dir = t140Libs("gh-abs", {});
  try {
    const bin = join(outside, "gh");
    const mark = join(outside, "ran");
    writeFileSync(bin, `#!/bin/sh\n: > ${JSON.stringify(mark)}\n`, {
      mode: 0o755,
    });
    writeFileSync(
      join(dir, "abs.sh"),
      `#!/usr/bin/env bash\nf() { ${JSON.stringify(bin)} api x; printf '%s\\n' "$1"; }\n`,
      { mode: 0o644 },
    );
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell-fn:${relative(REPO_ROOT, join(dir, "abs.sh"))}#f`,
      cases: LABEL_CASES,
    });
    assert.notEqual(
      r.reason,
      "needs-fake-gh",
      "the limit: an absolute path is not on PATH",
    );
    assert.ok(existsSync(mark), "the absolute-path binary did run");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("shell entry forms: a library that puts another directory ahead of the trip-wire on PATH reaches it — a stated limit this row pins (task.140 QA cycle 4, TASK-140-BUG-7)", () => {
  const outside = mkdtempSync(join(tmpdir(), "t140-prepend-gh-"));
  const dir = t140Libs("gh-prepend", {});
  try {
    mkdirSync(join(outside, "bin"));
    const mark = join(outside, "ran");
    writeFileSync(
      join(outside, "bin", "gh"),
      `#!/bin/sh\n: > ${JSON.stringify(mark)}\n`,
      {
        mode: 0o755,
      },
    );
    writeFileSync(
      join(dir, "prepend.sh"),
      `#!/usr/bin/env bash\nf() { export PATH=${JSON.stringify(join(outside, "bin"))}:"$PATH"; X=gh; "$X" api x; printf '%s\\n' "$1"; }\n`,
      { mode: 0o644 },
    );
    const r = runProbeSpec({
      sink: "filename",
      entry: `shell-fn:${relative(REPO_ROOT, join(dir, "prepend.sh"))}#f`,
      cases: LABEL_CASES,
    });
    assert.notEqual(
      r.reason,
      "needs-fake-gh",
      "the limit: a gh ahead of the trip-wire on PATH answers instead",
    );
    assert.ok(existsSync(mark), "the prepended gh did run");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("resolveEntry: a missing path is contained by its deepest existing ancestor (task.140 QA cycle 2, CR-5)", () => {
  const outside = mkdtempSync(join(tmpdir(), "t140-missing-"));
  const dir = mkdtempSync(join(REPO_ROOT, FN_FIXTURES, ".t140-missing-"));
  try {
    symlinkSync(outside, join(dir, "link"));
    // A symlinked intermediate with a missing leaf is an escape, not an entry.
    const esc = resolveEntry(
      `shell-fn:${relative(REPO_ROOT, join(dir, "link", "nope.sh"))}#f`,
      REPO_ROOT,
    );
    assert.equal(esc.reason, "outside-repo-root", JSON.stringify(esc));
    // A missing file under a root reached through a symlink is inside.
    const via = join(outside, "root");
    symlinkSync(REPO_ROOT, via);
    const ok = resolveEntry(`shell-fn:${join(via, "tests", "nope.sh")}#f`, via);
    assert.equal(ok.ok, true, JSON.stringify(ok));
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("shell-fn entry: expected.absent may name the case's own input — no per-case file is created for this form (CR-4)", () => {
  const cases = [
    {
      id: "x.self",
      input: "PWNED",
      direction: "hostile",
      expected: { stdout: "", exit: 0, absent: ["PWNED"] },
    },
    {
      id: "x.ok",
      input: "bug",
      direction: "legitimate",
      expected: { stdout: "bug\n", exit: 0 },
    },
  ];
  const fn = runProbeSpec({
    sink: "filename",
    entry: FN_ENTRY,
    cases,
    fakeGh: FAKE_GH,
  });
  assert.equal(fn.verdict, "engages", JSON.stringify(fn.declined));
  // The shell: form still refuses it — that form does create the file.
  const sh = runProbeSpec({ sink: "filename", entry: FIXED_SCRIPT, cases });
  assert.match(sh.declined[0].detail, /which the fixture itself creates/);
});

// ── The cli entry form (task.144) ────────────────────────────────────────────
//
// A boundary delivered as a MULTI-FLAG NODE CLI is reached through
// `cli:<path>` plus an `--argv` template whose one `{input}` element carries the
// case. The verdict is the exit status (or `expected`, when a case carries one),
// and the sandbox is the shell arm's. The rows below guard the three things a
// fourth entry form could get wrong without any existing row noticing: the
// template contract (refused vs declined), the sandbox (the child's HOME, TMPDIR
// and cwd), and the record (two templates on one script are two controls).

const CLI = (name) => `cli:${FIXTURES}/cli-${name}.mjs`;
const HOST_ARGV = ["--mode", "strict", "--host", "{input}"];

/** Run `main` with stdout and stderr captured; returns { rc, out, err }. */
function runMain(args) {
  const out = [];
  const err = [];
  const w = process.stdout.write.bind(process.stdout);
  const e = process.stderr.write.bind(process.stderr);
  process.stdout.write = (c) => (out.push(String(c)), true);
  process.stderr.write = (c) => (err.push(String(c)), true);
  let rc;
  try {
    rc = main(args);
  } finally {
    process.stdout.write = w;
    process.stderr.write = e;
  }
  return { rc, out: out.join(""), err: err.join("") };
}

test("cli entry: resolveEntry returns kind cli with the same containment, and refuses an export name", () => {
  const r = resolveEntry(CLI("refuser"), REPO_ROOT);
  assert.equal(r.ok, true);
  assert.equal(r.kind, "cli");
  assert.equal(r.entryPath, join(REPO_ROOT, FIXTURES, "cli-refuser.mjs"));
  assert.equal(CLI_PREFIX, "cli:");
  assert.equal(
    resolveEntry("cli:../../etc/x.mjs", REPO_ROOT).reason,
    "outside-repo-root",
  );
  assert.equal(
    resolveEntry("cli:/etc/x.mjs", REPO_ROOT).reason,
    "outside-repo-root",
  );
  const hashed = resolveEntry(`${CLI("refuser")}#main`, REPO_ROOT);
  assert.equal(hashed.reason, "bad-entry");
  assert.match(hashed.detail, /--argv/);
  assert.equal(resolveEntry("cli:", REPO_ROOT).reason, "bad-entry");
});

test("cli entry: parseArgvTemplate accepts whole-element slots and refuses every other shape, by name", () => {
  assert.deepEqual(ARGV_SLOTS, ["{input}", "{fixture}"]);
  assert.deepEqual(parseArgvTemplate('["--dir","{fixture}","--x","{input}"]'), {
    ok: true,
    template: ["--dir", "{fixture}", "--x", "{input}"],
  });
  assert.equal(
    parseArgvTemplate(["{input}", "{fixture}", "{fixture}"]).ok,
    true,
  );
  const refused = {
    "not JSON": ["[--x", /not JSON/],
    "an object": ['{"a":1}', /JSON array of strings/],
    "a non-string element": ['["{input}", 3]', /element 1 is number/],
    "no {input}": ['["--x"]', /exactly one "\{input\}" element, got 0/],
    "two {input}": ['["{input}","{input}"]', /got 2/],
    "an unknown slot": ['["{input}","{home}"]', /unknown slot \{home\}/],
    "an embedded slot": ['["--env={input}"]', /embeds \{input\}/],
    "an embedded fixture": ['["{input}","{fixture}/x"]', /embeds \{fixture\}/],
    "a NUL": [["{input}", "a\u0000b"], /NUL/],
  };
  for (const [name, [raw, re]] of Object.entries(refused)) {
    const r = parseArgvTemplate(raw);
    assert.equal(r.ok, false, `${name} must be refused`);
    assert.match(r.detail, re, name);
  }
});

test("cli entry: every malformed --argv / cli: combination exits 2 with bad-argv and writes no record", () => {
  const dir = mkdtempSync(join(tmpdir(), "probe-cli-argv-"));
  try {
    const record = join(dir, "run.json");
    const combos = {
      "cli: without --argv": ["--entry", CLI("refuser")],
      "--argv on a JS entry": [
        "--entry",
        entry("engaging-control"),
        "--argv",
        '["{input}"]',
      ],
      "--argv on a shell: entry": [
        "--entry",
        FIXED_SCRIPT,
        "--argv",
        '["{input}"]',
      ],
      "two {input}": [
        "--entry",
        CLI("refuser"),
        "--argv",
        '["{input}","{input}"]',
      ],
      "an embedded slot": [
        "--entry",
        CLI("refuser"),
        "--argv",
        '["--h={input}"]',
      ],
      "non-JSON": ["--entry", CLI("refuser"), "--argv", "[oops"],
    };
    // Each combination names ITS rule, so a guard shadowed by a later one
    // (the parser also refuses a missing --argv) is still proved on its own.
    const NAMED = {
      "cli: without --argv": /needs --argv/,
      "--argv on a JS entry": /cli: and shell-argv: entry forms only/,
      "--argv on a shell: entry": /cli: and shell-argv: entry forms only/,
      "two {input}": /got 2/,
      "an embedded slot": /embeds \{input\}/,
      "non-JSON": /not JSON/,
    };
    for (const [name, args] of Object.entries(combos)) {
      const { rc, err } = runMain([
        "--sink",
        "url-authority",
        ...args,
        "--record",
        record,
      ]);
      assert.equal(rc, 2, `${name}: exit 2`);
      assert.match(err, /^bad-argv: /, `${name}: named`);
      assert.match(err, NAMED[name] ?? /./, `${name}: says which rule`);
      assert.equal(existsSync(record), false, `${name}: no record`);
      assert.equal(
        existsSync(recordEntriesDir(record)),
        false,
        `${name}: no entry dir`,
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli entry: runProbeSpec declines bad-argv for a library caller, and never runs a case", () => {
  const noArgv = runProbeSpec({
    sink: "url-authority",
    entry: CLI("refuser"),
    cases: CASES,
  });
  assert.equal(noArgv.reason, "bad-argv");
  assert.equal(noArgv.verdict, "unverifiable");
  assert.equal(noArgv.executed, 0);
  const onJs = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: CASES,
    argv: ["{input}"],
  });
  assert.equal(onJs.reason, "bad-argv");
  assert.match(
    onJs.declined[0].detail,
    /cli: and shell-argv: entry forms only/,
  );
  const bad = runProbeSpec({
    sink: "url-authority",
    entry: CLI("refuser"),
    cases: CASES,
    argv: ["--host"],
  });
  assert.equal(bad.reason, "bad-argv");
  assert.equal(bad.cases.length, 0);
});

test("cli entry: a script that is not .mjs/.js, or missing, is declined entry-not-probeable before anything spawns", () => {
  const sh = runProbeSpec({
    sink: "url-authority",
    entry: `cli:${FIXTURES}/eval-names.sh`,
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.equal(sh.reason, "entry-not-probeable");
  assert.match(sh.declined[0].detail, /\.mjs \/ \.js/);
  const missing = runProbeSpec({
    sink: "url-authority",
    entry: `cli:${FIXTURES}/cli-does-not-exist.mjs`,
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.equal(missing.reason, "entry-not-probeable");
  assert.equal(missing.cases.length, 0);
});

test("cli entry: a refusing CLI engages — executed equals the case count, one probe per case", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: CLI("refuser"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.equal(r.executed, CASES.length);
  assert.equal(r.shells, null);
  assert.deepEqual(r.argv, HOST_ARGV);
  assert.deepEqual(r.escapes, []);
  // Exit status is the verdict: the hostile cases exited 3, the legitimate 0.
  for (const c of r.cases) {
    assert.equal(c.exit, c.direction === "hostile" ? 3 : 0, c.id);
  }
});

test("cli entry: an inert CLI is present-but-inert and an unguarded one is absent", () => {
  const inert = runProbeSpec({
    sink: "url-authority",
    entry: CLI("inert"),
    cases: CASES,
    argv: ["--host", "{input}"],
  });
  assert.equal(inert.verdict, "present-but-inert");
  assert.deepEqual(inert.reproduced, ["t.slash"]);
  const all = runProbeSpec({
    sink: "url-authority",
    entry: CLI("accept-all"),
    cases: CASES,
    argv: ["--host", "{input}"],
  });
  assert.equal(all.verdict, "absent");
  assert.equal(all.executed, CASES.length);
});

test("cli entry: a CLI that crashes is errored — declined entry-not-probeable, never scored as refusing everything", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: CLI("crasher"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  // Exit 1 on every case, which is what a refusal looks like. Scored, the
  // hostile cases would be "rejected" and the legitimate "rejected" too —
  // rejects-every-input — and a crash-only-on-hostile CLI would read engages.
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "entry-not-probeable");
  assert.equal(r.executed, 0);
  assert.match(r.declined[0].detail, /crashed \(exit 1\).*cannot start/);
});

test("cli entry: a CLI that never exits is errored by the timeout, not scored", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: CLI("hangs"),
    cases: CASES.slice(0, 1),
    argv: HOST_ARGV,
    timeoutMs: 300,
  });
  assert.equal(r.reason, "entry-not-probeable");
  assert.match(r.declined[0].detail, /killed by SIG\w+ \(timeout 300ms\)/);
});

test("cli entry: the input reaches the CLI as ONE argv element, byte-identical, in the sandbox", () => {
  const dir = mkdtempSync(join(tmpdir(), "probe-cli-echo-"));
  try {
    const out = join(dir, "echo.jsonl");
    const inputs = [
      "two words",
      `quote " and ' mixed`,
      "$(touch PWNED) `id` ${HOME}",
      "-leading-dash",
      "--looks=like-a-flag",
      "line\nbreak",
      "tab\there",
      "ünïcödé ✓",
      "",
    ];
    const cases = inputs.map((input, i) => ({
      id: `echo.${i}`,
      input,
      direction: "legitimate",
    }));
    const CANARY = "PROBE_CLI_PARENT_CANARY";
    process.env[CANARY] = "must-not-cross";
    let r;
    try {
      r = runProbeSpec({
        sink: "url-authority",
        entry: CLI("echo"),
        cases,
        argv: ["--out", out, "--x", "{input}", "--dir", "{fixture}"],
      });
    } finally {
      delete process.env[CANARY];
    }
    assert.equal(r.executed, inputs.length, JSON.stringify(r.declined));
    const lines = readFileSync(out, "utf8")
      .trimEnd()
      .split("\n")
      .map(JSON.parse);
    assert.equal(lines.length, inputs.length);
    const allowed = new Set([...SANDBOX_ENV_KEYS, "LC_ALL"]);
    lines.forEach((l, i) => {
      assert.equal(l.argv.length, 6, `case ${i}: argv count`);
      assert.equal(l.argv[3], inputs[i], `case ${i}: byte-identical`);
      // {fixture} is the case's own fixture directory, and it is the cwd
      // (compared by basename: cwd comes back realpath'd, /private/var on macOS).
      assert.match(l.argv[5], /[/\\]work[/\\]fixture-[^/\\]+$/);
      assert.equal(basename(l.argv[5]), basename(l.cwd));
      // The env is the sandbox's: the parent's canary did not cross, and no
      // key outside sandboxEnv() + LC_ALL did either — bar the one macOS
      // CoreFoundation injects into every process it launches.
      assert.ok(
        !l.envKeys.includes(CANARY),
        "the parent env leaked into the child",
      );
      for (const k of l.envKeys.filter((k) => !/^__CF_/.test(k)))
        assert.ok(allowed.has(k), `unexpected env key ${k}`);
      assert.notEqual(l.home, process.env.HOME);
      assert.match(l.home, /security-probe-[^/]+\/home$/);
      assert.match(l.tmp, /security-probe-[^/]+\/tmp$/);
    });
    // `$(touch PWNED)` was data: nothing was created anywhere the probe watches.
    assert.deepEqual(r.escapes, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** The keys sandboxEnv() carries — read from the function, not restated. */
const SANDBOX_ENV_KEYS = Object.keys(sandboxEnv({ cwd: "/" }));

test("cli entry: a write to os.homedir() is an escape, and exits 1 even on an engaging verdict", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: CLI("writes-home"),
    cases: CASES,
    argv: ["--host", "{input}"],
  });
  assert.equal(r.verdict, "engages");
  assert.equal(r.escapes.length, CASES.length);
  assert.match(r.escapes[0].path, /home[/\\]cli-probe-side-effect$/);
  const { rc } = runMain([
    "--sink",
    "url-authority",
    "--entry",
    CLI("writes-home"),
    "--argv",
    '["--host","{input}"]',
  ]);
  assert.equal(rc, 1);
});

test("cli entry: a case carrying `expected` is compared, not exit-scored — and a malformed one is declined", () => {
  const legit = { id: "e.ok", input: "db.internal", direction: "legitimate" };
  // Exit-scored, an unguarded CLI accepts it (exit 0) ...
  const byExit = runProbeSpec({
    sink: "url-authority",
    entry: CLI("accept-all"),
    cases: [legit],
    argv: ["--host", "{input}"],
  });
  assert.equal(byExit.cases[0].outcome, "accepted");
  // ... compared against an `expected` it does not meet, the same run is a
  // mismatch — over-blocked — which only the comparison can see.
  const compared = runProbeSpec({
    sink: "url-authority",
    entry: CLI("accept-all"),
    cases: [{ ...legit, expected: { stdout: "something else\n" } }],
    argv: ["--host", "{input}"],
  });
  assert.equal(compared.cases[0].outcome, "rejected");
  assert.match(compared.cases[0].detail, /stdout/);
  // A hostile case whose `expected` the refusal matches is rejected.
  const hostile = runProbeSpec({
    sink: "url-authority",
    entry: CLI("refuser"),
    cases: [
      {
        id: "e.bad",
        input: "a/b",
        direction: "hostile",
        expected: { exit: 3 },
      },
      { ...legit, expected: { exit: 0, stdout: "db.internal\n" } },
    ],
    argv: HOST_ARGV,
  });
  assert.equal(hostile.verdict, "engages", JSON.stringify(hostile.cases));
  const malformed = runProbeSpec({
    sink: "url-authority",
    entry: CLI("refuser"),
    cases: [{ ...legit, expected: { stdout: 12 } }],
    argv: HOST_ARGV,
  });
  assert.equal(malformed.executed, 0);
  assert.match(
    malformed.declined[0].detail,
    /expected\.stdout. must be a string/,
  );
});

test("cli entry: the record carries the template, keys on its skeleton, and leaves every other form's entry-file name unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "probe-cli-record-"));
  try {
    const record = join(dir, "run.json");
    const a = runProbeSpec({
      sink: "url-authority",
      entry: CLI("refuser"),
      cases: CASES,
      argv: HOST_ARGV,
    });
    const b = runProbeSpec({
      sink: "url-authority",
      entry: CLI("refuser"),
      cases: CASES,
      // A DIFFERENT guarded flag: the case goes to --mode, not --host.
      argv: ["--host", "db.internal", "--mode", "{input}"],
    });
    const js = runProbeSpec({
      sink: "url-authority",
      entry: entry("engaging-control"),
      cases: CASES,
    });
    recordRun(record, a, { name: "host-a" });
    recordRun(record, b, { name: "host-b" });
    recordRun(record, js, { name: "js" });
    const rec = readRecord(record);
    assert.equal(
      rec.controls.length,
      3,
      "two guarded flags on one script are two controls",
    );
    const byName = Object.fromEntries(rec.controls.map((c) => [c.name, c]));
    assert.deepEqual(byName["host-a"].argv, HOST_ARGV);
    assert.equal(byName.js.argv, null);
    assert.equal(toRecordEntry(js).argv, null);
    // The template, never a substituted input.
    assert.ok(!JSON.stringify(byName["host-a"]).includes("evil.example.com"));
    // A JS entry's file name is the pre-task.144 key: sha256(sink \0 entry).
    const legacy = createHash("sha256")
      .update(`url-authority\u0000${entry("engaging-control")}`)
      .digest("hex")
      .slice(0, 24);
    assert.ok(readdirSync(recordEntriesDir(record)).includes(`${legacy}.json`));
    // Re-running one control replaces only its own entry.
    recordRun(record, a, { name: "host-a" });
    assert.equal(readRecord(record).controls.length, 3);
    const { out } = runMain(["--emit-block", record]);
    assert.match(out, /argv: \["--mode","strict","--host","\{input\}"\]/);
    assert.match(out, /evidence: measured/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli entry: every cli result path returns the JS form's key set", () => {
  const expected = Object.keys(
    runProbeSpec({
      sink: "url-authority",
      entry: entry("engaging-control"),
      cases: CASES,
    }),
  ).sort();
  const paths = {
    success: { entry: CLI("refuser"), argv: HOST_ARGV },
    "bad-argv": { entry: CLI("refuser") },
    "not a script": { entry: `cli:${FIXTURES}/eval-names.sh`, argv: HOST_ARGV },
    crashed: { entry: CLI("crasher"), argv: HOST_ARGV },
  };
  for (const [name, spec] of Object.entries(paths)) {
    const r = runProbeSpec({ sink: "url-authority", cases: CASES, ...spec });
    assert.deepEqual(Object.keys(r).sort(), expected, `${name} key set`);
  }
});

// ── The cli entry form, Python (task.215) ────────────────────────────────────
//
// `cli:<path>.py` runs the script under `python3 -E -s -B` with the same argv
// template, sandbox and verdict rules as the Node arm. Two things differ, and
// each row below holds one: a Python crash exits 1 exactly as a refusal does,
// so it is told apart by its traceback frame, not by a Node footer; and the
// interpreter is the host's, so the result says which one ran.

const PY = (name) => `cli:${FIXTURES}/${name}.py`;

test("cli entry (python): a refusing .py CLI engages under python3, one probe per case, and the result names the interpreter", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-refuser"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.equal(r.executed, CASES.length);
  assert.equal(r.shells, null);
  assert.deepEqual(r.escapes, []);
  assert.equal(r.interpreter.name, "python3");
  assert.match(r.interpreter.version, /^Python 3\.\d+/);
  for (const c of r.cases) {
    assert.equal(c.exit, c.direction === "hostile" ? 3 : 0, c.id);
  }
});

test("cli entry (python): the child runs as python3 -E -s -B, never -I", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-flags"),
    cases: CASES.filter((c) => c.direction === "legitimate"),
    argv: HOST_ARGV,
  });
  // A run that declines before spawning has no cases, and the loop below
  // would then check no flag at all (QA cycle 1, CR-2).
  assert.equal(r.interpreter?.name, "python3", JSON.stringify(r));
  assert.equal(
    r.executed,
    CASES.filter((c) => c.direction === "legitimate").length,
  );
  for (const c of r.cases) {
    assert.equal(c.outcome, "accepted", `${c.id}: ${c.detail}`);
  }
});

test("cli entry (python): a script that imports a sibling module runs, and writes no __pycache__ escape", () => {
  // A bytecode directory left by a manual run is not this run's; clear it so
  // the existence check below reads only what the probe wrote.
  rmSync(join(REPO_ROOT, FIXTURES, "__pycache__"), {
    recursive: true,
    force: true,
  });
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-imports-sibling"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.deepEqual(r.escapes, []);
  assert.equal(
    existsSync(join(REPO_ROOT, FIXTURES, "__pycache__")),
    false,
    "python wrote bytecode beside the fixture",
  );
});

test("cli entry (python): an uncaught exception and a SyntaxError are errored — never scored as refusals", () => {
  for (const [name, shape] of [
    ["cli-crasher", /RuntimeError: cannot start/],
    ["cli-syntax-error", /SyntaxError/],
    // The traceback does not end on the exception: a two-line message, then
    // an atexit line. The detail still names the exception (QA cycle 1).
    ["cli-crasher-multiline", /ValueError: cannot start/],
    // No traceback reaches stderr at all: stderr is None, or the traceback is
    // cut to the bare line a refusal could print (QA cycle 2).
    ["cli-crasher-stderr-none", /RuntimeError: cannot start/],
    ["cli-crasher-tracebacklimit", /KeyError: 'no policy/],
  ]) {
    const r = runProbeSpec({
      sink: "url-authority",
      entry: PY(name),
      cases: CASES,
      argv: HOST_ARGV,
    });
    // Both exit 1 on every case — what a refusal exits with. Scored, every
    // case would read `rejected` and the control would look like it refuses.
    assert.equal(r.verdict, "unverifiable", name);
    assert.equal(r.reason, "entry-not-probeable", name);
    assert.equal(r.executed, 0, name);
    assert.match(r.declined[0].detail, /crashed \(exit 1\)/, name);
    assert.match(r.declined[0].detail, shape, name);
  }
});

test("cli entry (python): a crash behind a replaced excepthook is errored on the inputs it crashes on — never a refusal", () => {
  // The fixture answers legitimate input and crashes on hostile input after
  // replacing sys.excepthook (as rich and Typer do): exit 1, no frame on
  // stderr. Read off stderr, every hostile case scored `rejected` and the
  // verdict was `engages` — a false pass (QA cycle 2, TASK-215-QA2-1).
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-crasher-excepthook"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.notEqual(r.verdict, "engages", JSON.stringify(r));
  const hostile = CASES.filter((c) => c.direction === "hostile");
  assert.ok(hostile.length > 0);
  for (const c of hostile) {
    const got = [...r.cases, ...r.declined].find((x) => x.id === c.id);
    assert.ok(got, `${c.id} missing`);
    assert.equal(got.outcome, "errored", `${c.id}: ${got.detail}`);
    assert.match(
      got.detail,
      /crashed \(exit 1\).*ValueError: cannot parse host/,
    );
  }
  for (const c of r.cases.filter((x) => x.direction === "legitimate")) {
    assert.equal(c.outcome, "accepted", c.id);
  }
});

test("cli entry (python): a crash whose exception cannot be printed is errored — the signal is not the exception's text", () => {
  // The replaced excepthook prints nothing: exit 1, empty stderr. A marker
  // built from the exception's text was lost when formatting it raised, and
  // every hostile case scored `rejected` (QA cycle 3, TASK-215-QA3-1). Its
  // str() raises; the second fixture's class name cannot be read at all, so
  // the detail has nothing to name.
  for (const [name, detail] of [
    ["cli-crasher-unprintable", /rather than answering: UnprintableError$/],
    ["cli-crasher-nameless", /rather than answering: uncaught exception$/],
  ]) {
    const r = runProbeSpec({
      sink: "url-authority",
      entry: PY(name),
      cases: CASES,
      argv: HOST_ARGV,
    });
    assert.notEqual(r.verdict, "engages", `${name}: ${JSON.stringify(r)}`);
    const hostile = CASES.filter((c) => c.direction === "hostile");
    assert.ok(hostile.length > 0);
    for (const c of hostile) {
      const got = [...r.cases, ...r.declined].find((x) => x.id === c.id);
      assert.ok(got, `${name} ${c.id} missing`);
      assert.equal(got.outcome, "errored", `${name} ${c.id}: ${got.detail}`);
      assert.match(got.detail, /crashed \(exit 1\)/, name);
      assert.match(got.detail, detail, name);
    }
    for (const c of r.cases.filter((x) => x.direction === "legitimate")) {
      assert.equal(c.outcome, "accepted", `${name} ${c.id}`);
    }
  }
});

test("cli entry (python): a forked child that crashes does not override the script's answer", () => {
  // The child unwinds into the bootstrap with the crash fd still open. Were it
  // to write the marker, every case — a parent that answered 0 or 3 — would
  // read `errored` (QA cycle 3, TASK-215-QA3-2).
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-fork-child-crash"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r));
  assert.equal(r.executed, CASES.length);
  for (const c of r.cases) {
    assert.equal(c.exit, c.direction === "hostile" ? 3 : 0, c.id);
  }
});

test("cli entry (python): a forked daemon does not hold the case open past the script's answer", () => {
  // The daemon outlives the answer by 4 s; the per-case timeout is 2 s. Were
  // the crash fd left open in the child, every case would wait for the timeout
  // and read `errored` (QA cycle 3, TASK-215-QA3-3).
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-fork-daemon"),
    cases: CASES,
    argv: HOST_ARGV,
    timeoutMs: 2000,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r));
  assert.equal(r.executed, CASES.length);
  for (const c of r.cases) {
    assert.equal(c.exit, c.direction === "hostile" ? 3 : 0, c.id);
  }
});

test("cli entry (python): a case with no exit record is errored — a closed fd 3, a forged line and os._exit never score", () => {
  // The channel is positive: the bootstrap writes `answer <nonce>` or
  // `crash <nonce>` on every exit it controls, and a case without one is
  // errored. cli-closes-record-fd closes fd 3 and opens its own file there,
  // then crashes behind a quiet excepthook on hostile input; read as "no crash
  // record, so it answered", every hostile case scored `rejected` and the
  // verdict was `engages` (QA cycle 4, TASK-215-QA4-1). cli-forged-record
  // writes nonce-less `answer` / `crash` lines itself and leaves by os._exit.
  for (const name of ["cli-closes-record-fd", "cli-forged-record"]) {
    const r = runProbeSpec({
      sink: "url-authority",
      entry: PY(name),
      cases: CASES,
      argv: HOST_ARGV,
    });
    assert.equal(r.verdict, "unverifiable", `${name}: ${JSON.stringify(r)}`);
    assert.equal(r.reason, "entry-not-probeable", name);
    assert.equal(r.executed, 0, name);
    assert.equal(r.cases.length, CASES.length, name);
    for (const c of r.cases) {
      assert.equal(c.outcome, "errored", `${name} ${c.id}: ${c.detail}`);
      assert.match(c.detail, /without the bootstrap's exit record/, name);
      // Exit 7: the bootstrap wrote into the script's own fd 3.
      assert.notEqual(
        c.exit,
        7,
        `${name} ${c.id}: record written into the script's file`,
      );
    }
  }
});

test("cli entry (python): a forged answer record does not outrank the crash that follows it", () => {
  // cli-forged-answer-crash writes `answer <nonce>` with the real nonce (it is
  // on sys.orig_argv), then crashes behind a quiet excepthook. Read with the
  // answer first, every hostile case scored `rejected` (QA cycle 5 mutation:
  // "answer wins over crash" reddened nothing).
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-forged-answer-crash"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.notEqual(r.verdict, "engages", JSON.stringify(r));
  const hostile = CASES.filter((c) => c.direction === "hostile");
  assert.ok(hostile.length > 0);
  for (const c of hostile) {
    const got = [...r.cases, ...r.declined].find((x) => x.id === c.id);
    assert.ok(got, `${c.id} missing`);
    assert.equal(got.outcome, "errored", `${c.id}: ${got.detail}`);
    assert.match(
      got.detail,
      /crashed \(exit 1\).*ValueError: cannot parse host/,
    );
  }
});

test("cli entry (python): a failed flush at shutdown (exit 120) is errored, never a refusal", () => {
  // The body answers, then python3 cannot flush stdout and exits 120. Read
  // as a refusal, every hostile case scored `rejected` and the verdict read
  // `engages` (QA cycle 6, TASK-215-QA6-1).
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-shutdown-flush-crash"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.notEqual(r.verdict, "engages", JSON.stringify(r));
  const hostile = CASES.filter((c) => c.direction === "hostile");
  assert.ok(hostile.length > 0);
  for (const c of hostile) {
    const got = [...r.cases, ...r.declined].find((x) => x.id === c.id);
    assert.ok(got, `${c.id} missing`);
    assert.equal(got.outcome, "errored", `${c.id}: ${got.detail}`);
    assert.match(got.detail, /failed at shutdown \(exit 120/);
  }
});

test("cli entry (python): a crash outside the main frame is scored by python3's exit status — never a pass", () => {
  // The stated limit (probe-boundary-rule.md): a worker thread that raises
  // while the main thread exits 0 is what `python3 <entry>` reports, so a
  // hostile case reads `accepted` — a reproduction, the false-alarm direction.
  // What must never happen is a pass (QA cycle 5, TASK-215-QA5-1). Every
  // hostile case is looked up, and the thread is shown to have raised, so a
  // fixture that simply accepts every input cannot pass (QA cycle 6, QA6-3).
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-thread-crash"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.notEqual(r.verdict, "engages", JSON.stringify(r));
  const hostile = CASES.filter((c) => c.direction === "hostile");
  assert.ok(hostile.length > 0);
  for (const c of hostile) {
    const got = [...r.cases, ...r.declined].find((x) => x.id === c.id);
    assert.ok(got, `${c.id} missing`);
    assert.equal(got.outcome, "accepted", `${c.id}: ${got.detail}`);
    assert.equal(got.exit, 0, c.id);
  }
  const direct = spawnSync(
    "python3",
    [
      PY("cli-thread-crash").slice("cli:".length),
      "--mode",
      "strict",
      "--host",
      hostile[0].input,
    ],
    { encoding: "utf8" },
  );
  assert.equal(direct.status, 0, direct.stderr);
  assert.match(direct.stderr, /Exception in thread/);
});

test("cli entry (python): __main__ is still the script's module after the body returns", () => {
  // cli-main-atexit's atexit handler exits 8 unless __main__ is the script's
  // module; runpy swapped the bootstrap back in (QA cycle 3, TASK-215-QA3-4).
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-main-atexit"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  for (const c of r.cases) {
    assert.equal(c.exit, c.direction === "hostile" ? 3 : 0, c.id);
  }
});

test("cli entry (python): the script runs as python3 <path> runs it — __main__, argv[0] and its own directory", () => {
  // The bootstrap that catches a crash must not change how the script runs:
  // cli-main-guard exits 9 unless sys.argv[0] is itself, and answers only
  // under `if __name__ == "__main__"`; cli-imports-sibling needs sys.path[0].
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-main-guard"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.equal(r.executed, CASES.length);
  for (const c of r.cases) {
    assert.equal(c.exit, c.direction === "hostile" ? 3 : 0, c.id);
  }
});

test("cli entry (python): a plain sys.exit(1) refusal, and a refusal that prints an exception-shaped line, stay rejected", () => {
  for (const name of ["cli-exit-one", "cli-refuser-error-text"]) {
    const r = runProbeSpec({
      sink: "url-authority",
      entry: PY(name),
      cases: CASES,
      argv: HOST_ARGV,
    });
    assert.equal(r.verdict, "engages", `${name}: ${JSON.stringify(r.cases)}`);
    assert.equal(r.executed, CASES.length, name);
    for (const c of r.cases) {
      if (c.direction === "hostile") {
        assert.equal(c.outcome, "rejected", `${name} ${c.id}`);
        assert.equal(c.exit, 1, `${name} ${c.id}`);
      }
    }
  }
});

test("cli entry (python): a traceback on a non-1 exit is not a crash — the exit status still answers", () => {
  // Python prints an "Exception ignored" traceback from a failing __del__ and
  // carries on; an uncaught exception always exits 1. So a refusal exiting 3,
  // and an acceptance exiting 0, are answers even with a traceback on stderr.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-refuser-unraisable"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.equal(r.executed, CASES.length);
  for (const c of r.cases) {
    assert.equal(c.exit, c.direction === "hostile" ? 3 : 0, c.id);
  }
});

test("cli entry (python): isPythonCrash reads the traceback, not the last line", () => {
  const tb = [
    "Traceback (most recent call last):",
    '  File "/x/a.py", line 2, in <module>',
    '    raise ValueError("x")',
    "ValueError: x",
  ].join("\n");
  const syntax = [
    '  File "/x/a.py", line 1',
    "    def f(:",
    "          ^",
    "SyntaxError: invalid syntax",
  ].join("\n");
  const interrupt = [
    "Traceback (most recent call last):",
    '  File "/x/a.py", line 3, in <module>',
    "    time.sleep(9)",
    "KeyboardInterrupt",
  ].join("\n");
  const dotted = [
    "Traceback (most recent call last):",
    '  File "/x/a.py", line 3, in <module>',
    "json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)",
  ].join("\n");
  assert.equal(isPythonCrash(tb), true);
  assert.equal(isPythonCrash(`${tb}\n\n`), true);
  assert.equal(isPythonCrash(syntax), true);
  assert.equal(isPythonCrash(interrupt), true);
  assert.equal(isPythonCrash(dotted), true);
  // Real Python 3 crashes whose last stderr line is not the exception
  // (QA cycle 1, TASK-215-QA1-1 — each was read as a refusal).
  const multiline = [
    "Traceback (most recent call last):",
    '  File "/x/a.py", line 1, in <module>',
    '    raise ValueError("cannot start\\nsee docs")',
    "ValueError: cannot start",
    "see docs at https://example.invalid/policy",
  ].join("\n");
  const group = [
    "  + Exception Group Traceback (most recent call last):",
    '  |   File "/x/a.py", line 1, in <module>',
    '  |     raise ExceptionGroup("startup failed", [ValueError("a")])',
    "  | ExceptionGroup: startup failed (1 sub-exception)",
    "  +-+---------------- 1 ----------------",
    "    | ValueError: a",
    "    +------------------------------------",
  ].join("\n");
  const trailing = `${tb}\ncleanup done, bye`;
  const noted = `${tb}\nhint (set POLICY_PATH)`;
  const importedSyntax = [
    "Traceback (most recent call last):",
    '  File "/x/main.py", line 2, in <module>',
    "    import helper",
    '  File "/x/helper.py", line 1',
    "    def f(:",
    "          ^",
    "SyntaxError: invalid syntax",
  ].join("\n");
  for (const [name, text] of Object.entries({
    multiline,
    group,
    trailing,
    noted,
    importedSyntax,
  })) {
    assert.equal(isPythonCrash(text), true, name);
  }
  assert.equal(
    isPythonCrash(
      [
        "Traceback (most recent call last):",
        '  File "/x/a.py", line 9, in <module>',
        "__main__.Refused: no",
      ].join("\n"),
    ),
    true,
    "a custom exception class is a crash too",
  );
  assert.equal(isPythonCrash("ValueError: refused host 'a/b'"), false);
  assert.equal(isPythonCrash("refused: 'a/b' is not a bare host"), false);
  assert.equal(isPythonCrash(""), false);
  // Each clause is load-bearing on its own: an exception-shaped last line
  // after a frame-shaped log line but with no Traceback header is not a
  // runtime crash, and a SyntaxError-shaped refusal with no frame is not a
  // compile error.
  assert.equal(
    isPythonCrash('  File "/etc/policy.cfg", line 4\nPermissionError: refused'),
    false,
  );
  assert.equal(isPythonCrash("SyntaxError: refused input"), false);
  assert.equal(isPythonCrash(undefined), false);
  // A frame alone, at column 0, is a log line, not a traceback frame.
  assert.equal(
    isPythonCrash(
      'Traceback (most recent call last):\nFile "/x", line 1\nValueError: x',
    ),
    false,
  );
  // A traceback followed by a refusal message reads as a crash: the probe
  // cannot tell a caught-and-printed failure from an uncaught one, and
  // `errored` ("could not look") is the safe direction — never a false pass.
  // runCliCase asks only on exit 1, so a refusal exiting 3 is not affected.
  assert.equal(
    isPythonCrash(`${tb}\nrecovered — refused: 'a/b' is not a bare host`),
    true,
  );
});

test("cli entry (python): a write to $HOME is an escape inside the sandbox, never the real home", () => {
  const real = join(
    process.env.HOME ?? "/nonexistent",
    "cli-probe-side-effect-py",
  );
  const before = existsSync(real);
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-writes-home"),
    cases: CASES,
    argv: ["--host", "{input}"],
  });
  assert.equal(r.verdict, "engages");
  assert.equal(r.escapes.length, CASES.length);
  assert.match(r.escapes[0].path, /home[/\\]cli-probe-side-effect-py$/);
  assert.equal(existsSync(real), before, "the real HOME was written");
});

test("cli entry (python): a .py entry with no --argv is bad-argv, and nothing runs", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-refuser"),
    cases: CASES,
  });
  assert.equal(r.reason, "bad-argv");
  assert.equal(r.cases.length, 0);
  assert.equal(r.interpreter, null);
});

test("cli entry (python): with no python3 on PATH the entry is declined once, by name, and no case spawns", () => {
  const emptyBin = mkdtempSync(join(tmpdir(), "probe-no-python-"));
  try {
    const child = spawnSync(
      process.execPath,
      [
        join(REPO_ROOT, "shared/resources/security-probe.mjs"),
        "--sink",
        "url-authority",
        "--entry",
        PY("cli-refuser"),
        "--argv",
        JSON.stringify(HOST_ARGV),
        "--json",
      ],
      { cwd: REPO_ROOT, encoding: "utf8", env: { PATH: emptyBin } },
    );
    const r = JSON.parse(child.stdout);
    assert.equal(r.verdict, "unverifiable", child.stderr);
    assert.equal(r.reason, "entry-not-probeable");
    assert.equal(r.declined.length, 1);
    assert.match(r.declined[0].detail, /python3/);
    assert.equal(r.executed, 0);
    assert.equal(r.cases.length, 0);
    assert.equal(r.interpreter, null);
  } finally {
    rmSync(emptyBin, { recursive: true, force: true });
  }
});

test("cli entry (python): a python3 that answers --version but cannot start a case is declined, never scored", () => {
  // probePython runs under the engine's environment and every case under
  // caseEnv, so an interpreter that needs the real HOME passes the probe and
  // then exits 1 on every case before the bootstrap runs. Read off the exit
  // status, every case scored `rejected` (QA cycle 4, TASK-215-QA4-2); with no
  // exit record, every case is errored and the entry is declined once.
  const shimBin = mkdtempSync(join(tmpdir(), "probe-python-shim-"));
  try {
    const shim = join(shimBin, "python3");
    writeFileSync(
      shim,
      '#!/bin/sh\nif [ "$1" = --version ]; then echo "Python 3.99.0"; exit 0; fi\necho "Fatal Python error: init_fs_encoding" >&2\nexit 1\n',
    );
    chmodSync(shim, 0o755);
    const child = spawnSync(
      process.execPath,
      [
        join(REPO_ROOT, "shared/resources/security-probe.mjs"),
        "--sink",
        "url-authority",
        "--entry",
        PY("cli-refuser"),
        "--argv",
        JSON.stringify(HOST_ARGV),
        "--json",
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: { PATH: `${shimBin}:${process.env.PATH}` },
      },
    );
    const r = JSON.parse(child.stdout);
    assert.equal(r.interpreter?.version, "Python 3.99.0", child.stderr);
    assert.equal(r.verdict, "unverifiable", JSON.stringify(r));
    assert.equal(r.reason, "entry-not-probeable");
    assert.equal(r.declined.length, 1);
    assert.match(r.declined[0].detail, /without the bootstrap's exit record/);
    assert.match(r.declined[0].detail, /Fatal Python error/);
    assert.equal(r.executed, 0);
  } finally {
    rmSync(shimBin, { recursive: true, force: true });
  }
});

test("cli entry (python): the record entry carries the interpreter, and null for a Node CLI", () => {
  const py = runProbeSpec({
    sink: "url-authority",
    entry: PY("cli-refuser"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.deepEqual(toRecordEntry(py).interpreter, py.interpreter);
  assert.equal(toRecordEntry(py).interpreter.name, "python3");
  const node = runProbeSpec({
    sink: "url-authority",
    entry: CLI("refuser"),
    cases: CASES,
    argv: HOST_ARGV,
  });
  assert.equal(node.interpreter, null);
  assert.equal(toRecordEntry(node).interpreter, null);
});

test("cli entry (python): every .py result path returns the JS form's key set", () => {
  const expected = Object.keys(
    runProbeSpec({
      sink: "url-authority",
      entry: entry("engaging-control"),
      cases: CASES,
    }),
  ).sort();
  const paths = {
    success: { entry: PY("cli-refuser"), argv: HOST_ARGV },
    "bad-argv": { entry: PY("cli-refuser") },
    crashed: { entry: PY("cli-crasher"), argv: HOST_ARGV },
  };
  for (const [name, spec] of Object.entries(paths)) {
    const r = runProbeSpec({ sink: "url-authority", cases: CASES, ...spec });
    assert.deepEqual(Object.keys(r).sort(), expected, `${name} key set`);
  }
});

test("cli entry: the first real consumer — uat-status.mjs --run-path D.1 --env {input} is probed, not declined", () => {
  // The boundary task.141's finalise could not reach: `--env`'s label guard
  // lives behind a flag parser and a three-argument function. A minimal
  // registry is built here rather than imported from the qa-next suite.
  const root = mkdtempSync(join(tmpdir(), "probe-cli-uat-"));
  const dir = mkdtempSync(join(tmpdir(), "probe-cli-uat-rec-"));
  try {
    mkdirSync(join(root, "docs/qa"), { recursive: true });
    writeFileSync(
      join(root, "docs/qa/uat-surfaces.json"),
      JSON.stringify({
        excludedPrds: [],
        defaultSurface: "D",
        surfaces: [{ letter: "D", title: "Score" }],
        epicSurface: {},
        storySurface: {},
        storyNa: {},
      }),
    );
    writeFileSync(
      join(root, "docs/qa/uat-registry.md"),
      [
        "### D. Score",
        "",
        "| # | Function | What it does | Entry | Stories | Items | Automated by | UAT | Last run | Notes / bug |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
        "| D.1 | Play a game | A visitor plays. | /games |  |  |  | ⬜ untested |  |  |",
        "",
      ].join("\n"),
    );
    const cases = [
      ["env.traverse", "../x", "hostile"],
      ["env.slash", "a/b", "hostile"],
      ["env.seq", "x-02", "hostile"],
      ["env.two-digit", "10", "hostile"],
      ["env.lan", "lan", "legitimate"],
      ["env.ci", "ci", "legitimate"],
    ].map(([id, input, direction]) => ({ id, input, direction }));
    const casesFile = join(dir, "cases.json");
    writeFileSync(casesFile, JSON.stringify(cases));
    const record = join(dir, "run.json");
    const { rc, out } = runMain([
      "--sink",
      "path",
      "--entry",
      "cli:skills/qa-next/scripts/uat-status.mjs",
      "--argv",
      JSON.stringify(["--root", root, "--run-path", "D.1", "--env", "{input}"]),
      "--cases-file",
      casesFile,
      "--record",
      record,
      "--name",
      "uat-status --env",
      "--json",
    ]);
    const r = JSON.parse(out);
    assert.equal(r.executed, cases.length, JSON.stringify(r.declined));
    // Before task.143 this read `present-but-inert`: runPathFor refused only a
    // trailing -NN, so `x-02` was rejected while `../x` and `a/b` were accepted.
    // task.143 refuses a path separator or `..` in the label, and judges the
    // BUILT name — so a two-digit label (`10` → `<date>-10.md`, read as run 10)
    // is refused too. Every hostile case now rejects; both legitimate ones pass.
    assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
    assert.deepEqual(r.reproduced, []);
    assert.equal(rc, 0);
    const rec = readRecord(record);
    assert.equal(rec.totals.executed, cases.length);
    assert.equal(rec.controls[0].argv[5], "{input}");
    // --run-path creates runs/D.1/ under --root on success. That is the test's
    // own registry, not the sandbox, so it is not an escape — stated so a later
    // reader does not take it for one.
    assert.ok(existsSync(join(root, "docs/qa/runs/D.1")));
    assert.deepEqual(r.escapes, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli entry: re-running one control with a different per-run operand REPLACES its entry (task.144 QA-1)", () => {
  // The control is the argv SKELETON, not the whole template. Keyed on the
  // template, a re-run whose only difference is a per-run path (a scratch
  // --cases-file, a mkdtemp --root) recorded a second control: one control run
  // twice read as two, executed was counted twice, and the first verdict stayed
  // in --emit-block with nothing to retire it.
  const dir = mkdtempSync(join(tmpdir(), "probe-cli-rekey-"));
  try {
    const record = join(dir, "run.json");
    for (const run of ["a", "b"]) {
      recordRun(
        record,
        runProbeSpec({
          sink: "url-authority",
          entry: CLI("refuser"),
          cases: CASES,
          argv: [
            "--mode",
            "strict",
            "--host",
            "{input}",
            "--scratch",
            join(dir, `run-${run}`),
          ],
        }),
        { name: "host guard" },
      );
    }
    const rec = readRecord(record);
    assert.equal(rec.controls.length, 1, "one control, re-run");
    assert.equal(
      rec.totals.executed,
      CASES.length,
      "executed is not counted twice",
    );
    // The record still carries the template of the run that won.
    assert.equal(rec.controls[0].argv[5], join(dir, "run-b"));
    // A positional {input} is keyed by its position: two positions, two controls.
    for (const argv of [
      ["{input}", "--mode", "strict"],
      ["--mode", "strict", "x", "{input}"],
    ]) {
      recordRun(
        record,
        runProbeSpec({
          sink: "url-authority",
          entry: CLI("accept-all"),
          cases: CASES,
          argv,
        }),
      );
    }
    assert.equal(readRecord(record).controls.length, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli entry: the control key is the template skeleton — values dropped, flags and positionals kept (task.144 QA cycle 3, CR-1)", () => {
  // Keyed on the flag before "{input}" alone, two DIFFERENT controls that share
  // an input flag merged: uat-status's --set … --note {input} and --accept …
  // --note {input} both keyed as --note, and add {input} / remove {input} as
  // #1 — the later run silently replaced the earlier. The skeleton keeps every
  // flag and bare positional and drops only the VALUES of flags, so per-run
  // paths still collapse while dispatch flags and subcommands stay distinct.
  const k = cliControlKey;
  // Different dispatch, same guarded flag → different controls.
  assert.notEqual(
    k(["--set", "D.1", "blocked", "--note", "{input}"]),
    k(["--accept", "D.1", "--note", "{input}"]),
  );
  // Different subcommand, same slot position → different controls.
  assert.notEqual(k(["add", "{input}"]), k(["remove", "{input}"]));
  // Different guarded flag → different controls.
  assert.notEqual(
    k(["--host", "db.internal", "--mode", "{input}"]),
    k(["--mode", "strict", "--host", "{input}"]),
  );
  // A flag's VALUE is dropped: a per-run path, a scratch root, a row id.
  assert.equal(
    k(["--root", "/tmp/a", "--run-path", "D.1", "--env", "{input}"]),
    k(["--root", "/var/x/b", "--run-path", "D.1", "--env", "{input}"]),
  );
  assert.equal(
    k(["--cases=/tmp/a.json", "--host", "{input}"]),
    k(["--cases=/tmp/b.json", "--host", "{input}"]),
  );
  // A slot is kept wherever it sits, including as a flag's value.
  assert.notEqual(
    k(["--dir", "{fixture}", "--x", "{input}"]),
    k(["--dir", "/d", "--x", "{input}"]),
  );
  // End to end: an analogue of the uat-status pair (a dispatch flag before a
  // shared input flag) lands in two record entries.
  const dir = mkdtempSync(join(tmpdir(), "probe-cli-skeleton-"));
  try {
    const record = join(dir, "run.json");
    for (const argv of [
      ["--mode", "strict", "--set", "{input}"],
      ["--mode", "strict", "--accept", "D.1", "--set", "{input}"],
    ]) {
      recordRun(
        record,
        runProbeSpec({
          sink: "url-authority",
          entry: CLI("accept-all"),
          cases: CASES,
          argv,
        }),
      );
    }
    assert.equal(readRecord(record).controls.length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli entry: a supplied --name IS a cli: control's identity; without one a differing replacement is reported (task.144 QA cycle 4, CR-1/CR-2)", () => {
  // Every value-dropping heuristic has a counter-example: the suite's own
  // cli-refuser behaves differently under --mode strict and --mode lax, and the
  // skeleton keys both as --mode *. Identity the caller STATES cannot be
  // mis-derived, so a supplied --name is the key; the skeleton is only the
  // fallback, and a fallback write that replaces an entry whose full argv
  // differs says so instead of doing it silently.
  const dir = mkdtempSync(join(tmpdir(), "probe-cli-name-"));
  try {
    const strict = ["--mode", "strict", "--host", "{input}"];
    const lax = ["--mode", "lax", "--host", "{input}"];
    // Named: two controls, whatever the skeleton says.
    const named = join(dir, "named.json");
    recordRun(
      named,
      runProbeSpec({
        sink: "url-authority",
        entry: CLI("refuser"),
        cases: CASES,
        argv: strict,
      }),
      { name: "host guard, strict" },
    );
    recordRun(
      named,
      runProbeSpec({
        sink: "url-authority",
        entry: CLI("refuser"),
        cases: CASES,
        argv: lax,
      }),
      { name: "host guard, lax" },
    );
    assert.equal(
      readRecord(named).controls.length,
      2,
      "two names, two controls",
    );
    // Same name, a positional per-run path that the skeleton keeps: one control.
    const pos = join(dir, "pos.json");
    for (const run of ["a", "b"]) {
      recordRun(
        pos,
        runProbeSpec({
          sink: "url-authority",
          entry: CLI("accept-all"),
          cases: CASES,
          argv: [join(dir, run), "--host", "{input}"],
        }),
        { name: "positional scratch" },
      );
    }
    const posRec = readRecord(pos);
    assert.equal(posRec.controls.length, 1, "one name, one control");
    assert.equal(
      posRec.totals.executed,
      CASES.length,
      "executed is not counted twice",
    );
    // Unnamed: the skeleton decides, and a replacement whose argv differs is reported.
    const unnamed = join(dir, "unnamed.json");
    const replaced = [];
    recordRun(
      unnamed,
      runProbeSpec({
        sink: "url-authority",
        entry: CLI("refuser"),
        cases: CASES,
        argv: strict,
      }),
      { onReplace: (prev, next) => replaced.push([prev.argv, next.argv]) },
    );
    recordRun(
      unnamed,
      runProbeSpec({
        sink: "url-authority",
        entry: CLI("refuser"),
        cases: CASES,
        argv: lax,
      }),
      { onReplace: (prev, next) => replaced.push([prev.argv, next.argv]) },
    );
    assert.equal(readRecord(unnamed).controls.length, 1);
    assert.deepEqual(replaced, [[strict, lax]]);
    // An identical re-run is not a "differing" replacement.
    recordRun(
      unnamed,
      runProbeSpec({
        sink: "url-authority",
        entry: CLI("refuser"),
        cases: CASES,
        argv: lax,
      }),
      { onReplace: () => replaced.push("again") },
    );
    assert.equal(replaced.length, 1);
    // Through the CLI the report is a warning on stderr, and the write still happens.
    const viaMain = join(dir, "main.json");
    for (const argv of [strict, lax]) {
      const { err } = runMain([
        "--sink",
        "url-authority",
        "--entry",
        CLI("refuser"),
        "--argv",
        JSON.stringify(argv),
        "--record",
        viaMain,
      ]);
      if (argv === lax)
        assert.match(err, /replaced .*--mode","strict".* with .*--mode","lax"/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli entry: a NAMED re-run whose argv differs is a normal replacement — no warning; names are keyed trimmed (task.144 QA cycle 5, CR-1/CR-3)", () => {
  // The replace report exists for the DERIVED key, where a skeleton can merge
  // two controls. A named control's re-run with a new scratch path is exactly
  // the same-name replacement §5 describes; warning "pass --name" to a caller
  // who passed it teaches everyone to ignore the warning.
  const dir = mkdtempSync(join(tmpdir(), "probe-cli-named-rerun-"));
  try {
    const record = join(dir, "run.json");
    const errs = [];
    for (const run of ["a", "b"]) {
      const { err } = runMain([
        "--sink",
        "url-authority",
        "--entry",
        CLI("accept-all"),
        "--argv",
        JSON.stringify(["--host", "{input}", "--scratch", join(dir, run)]),
        "--record",
        record,
        "--name",
        run === "a" ? "named control" : "  named control  ",
      ]);
      errs.push(err);
    }
    assert.doesNotMatch(
      errs.join(""),
      /replaced control/,
      "a named re-run is not a collision",
    );
    const rec = readRecord(record);
    assert.equal(
      rec.controls.length,
      1,
      "a name and its padded spelling are one control",
    );
    // One control, so the total is that control's own count — not doubled.
    assert.equal(rec.totals.executed, rec.controls[0].executed);
    assert.ok(rec.totals.executed > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli entry: a probe declined before its template is used keeps its identity — the corrected re-run REPLACES it (task.144 5c CR-1)", () => {
  // A wrong --repo-root makes resolveEntry decline `outside-repo-root` before
  // the template was ever attached to the result. That entry was recorded with
  // argv: null, so controlKey dropped its --name (and, unnamed, its skeleton):
  // the corrected re-run keyed differently, landed in a SECOND entry, and the
  // stale `unverifiable` control stayed in the record beside the real verdict.
  const dir = mkdtempSync(join(tmpdir(), "probe-cli-decline-rerun-"));
  try {
    const entry = `cli:${join(REPO_ROOT, FIXTURES, "cli-refuser.mjs")}`;
    for (const named of [true, false]) {
      const record = join(dir, `run-${named ? "named" : "unnamed"}.json`);
      const common = [
        "--sink",
        "url-authority",
        "--entry",
        entry,
        "--argv",
        JSON.stringify(HOST_ARGV),
        "--record",
        record,
        ...(named ? ["--name", "host guard"] : []),
      ];
      const wrong = runMain([...common, "--repo-root", dir]);
      assert.notEqual(
        wrong.rc,
        2,
        "a decline is a probe outcome, not an argument error",
      );
      let rec = readRecord(record);
      assert.equal(rec.controls.length, 1);
      assert.equal(rec.controls[0].verdict, "unverifiable");
      assert.deepEqual(
        rec.controls[0].argv,
        HOST_ARGV,
        "the declined control records the template it was given",
      );

      const right = runMain(common);
      assert.equal(right.rc, 0, right.err);
      rec = readRecord(record);
      assert.equal(
        rec.controls.length,
        1,
        `${named ? "named" : "unnamed"}: the corrected re-run replaces the declined control`,
      );
      assert.equal(rec.controls[0].verdict, "engages");
      assert.equal(rec.totals.executed, rec.controls[0].executed);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli entry: a named cli: control is keyed on its name even when the result carries no template (task.144 5c CR-1)", () => {
  // A library caller's bad-argv decline has no template to record. Its name is
  // still its identity, so its corrected run lands on the same entry.
  const dir = mkdtempSync(join(tmpdir(), "probe-cli-badargv-rerun-"));
  try {
    const record = join(dir, "run.json");
    const spec = { sink: "url-authority", entry: CLI("refuser") };
    recordRun(record, runProbeSpec({ ...spec, argv: '["--host={input}"]' }), {
      name: "host guard",
    });
    recordRun(
      record,
      runProbeSpec({ ...spec, argv: JSON.stringify(HOST_ARGV) }),
      {
        name: "host guard",
      },
    );
    const rec = readRecord(record);
    assert.equal(rec.controls.length, 1);
    assert.equal(rec.controls[0].verdict, "engages");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// task.158 (TASK-149 gate 7 CR-2) — both containment sites use isWithin, so a
// directory whose name BEGINS with two dots is inside the root, not an escape.
// A bare startsWith("..") refused it. The root itself stays refused: isWithin(root,
// root) is true, so that refusal is a separate `=== root` test at each site.
test("resolveEntry: an entry under a `..name` directory inside the root is accepted; the root itself, `../x` and an outside absolute path are still refused (task.158)", () => {
  const root = mkdtempSync(join(tmpdir(), "probe-dotdot-"));
  try {
    const inside = resolveEntry("..fixtures/control.mjs#f", root);
    assert.equal(inside.ok, true, JSON.stringify(inside));
    assert.equal(inside.exportName, "f");
    const deep = resolveEntry("shell:..fixtures/sub/c.sh", root);
    assert.equal(deep.ok, true, JSON.stringify(deep));
    for (const bad of [
      ".#f",
      "../x.mjs#f",
      "..fixtures/../../x.mjs#f",
      "/etc/passwd#x",
      "shell:../x.sh",
    ]) {
      const r = resolveEntry(bad, root);
      assert.equal(r.ok, false, bad);
      assert.equal(r.reason, "outside-repo-root", bad);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-fn entry: a --fake-gh directory named `..name` inside the repo root is accepted, and the repo root itself is still bad-fake-gh (task.158)", () => {
  // The name must begin with `..` at the FIRST segment below the root — that is
  // the only place a bare startsWith("..") misfires. A disposable root holds the
  // library under probe and the `..name` fake-gh directory, so nothing is ever
  // written into the live repository (task.158 QA cycle 1, CR-4).
  const root = mkdtempSync(join(tmpdir(), "probe-dotdot-gh-"));
  const dotdot = join(root, "..fake-gh");
  try {
    mkdirSync(join(root, dirname(FN_LIB)), { recursive: true });
    cpSync(join(REPO_ROOT, FN_LIB), join(root, FN_LIB));
    cpSync(join(REPO_ROOT, FAKE_GH), dotdot, { recursive: true });
    const ok = runProbeSpec({
      sink: "filename",
      entry: FN_ENTRY,
      cases: LABEL_CASES,
      fakeGh: basename(dotdot),
      repoRoot: root,
    });
    assert.notEqual(ok.reason, "bad-fake-gh", JSON.stringify(ok.reason));
    assert.ok(ok.executed > 0, `the probe ran: ${JSON.stringify(ok.reason)}`);
    const atRoot = runProbeSpec({
      sink: "filename",
      entry: FN_ENTRY,
      cases: LABEL_CASES,
      fakeGh: ".",
      repoRoot: root,
    });
    assert.equal(atRoot.reason, "bad-fake-gh");
    // Refused by CONTAINMENT, not by the later "no gh in it" check — the root
    // holds no gh either, so the reason alone cannot tell the two apart.
    assert.match(atRoot.declined[0].detail, /is outside/);
    assert.equal(atRoot.executed, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── task.216: a cli: case carries fixture.files and fixture.env ─────────────
//
// A CLI that refuses on what it finds in a data directory (no items.json)
// had no legitimate case that could be accepted: the cli: arm built the case
// directory from the sink's controls alone and ignored the case's `fixture`, so
// every input read as overblocked. Each row runs under Node and Python.

const NEEDS_DATA = [
  ["node", `cli:${FIXTURES}/cli-needs-data.mjs`],
  ["python", `cli:${FIXTURES}/cli-needs-data.py`],
];
const DATA_ARGV = ["merge-back", "{input}"];
const dataCase = (extra = {}) => ({
  id: "d.legit",
  input: ".",
  direction: "legitimate",
  ...extra,
});

for (const [lang, ENTRY] of NEEDS_DATA) {
  test(`cli entry (${lang}): a case's fixture.files is written into its cwd before the run — with it accepted, without it rejected`, () => {
    const withFiles = runProbeSpec({
      sink: "url-authority",
      entry: ENTRY,
      cases: [dataCase({ fixture: { files: { "items.json": '["MARKER"]' } } })],
      argv: DATA_ARGV,
    });
    assert.equal(withFiles.executed, 1, JSON.stringify(withFiles.declined));
    assert.equal(
      withFiles.cases[0].outcome,
      "accepted",
      JSON.stringify(withFiles.cases),
    );
    // The same case with no fixture: the file is what made it pass.
    const without = runProbeSpec({
      sink: "url-authority",
      entry: ENTRY,
      cases: [dataCase()],
      argv: DATA_ARGV,
    });
    assert.equal(without.cases[0].outcome, "rejected");
    assert.match(without.cases[0].detail, /no items\.json/);
    // A nested path lands inside the case directory too.
    const nested = runProbeSpec({
      sink: "url-authority",
      entry: ENTRY,
      cases: [
        dataCase({
          input: "data",
          fixture: { files: { "data/items.json": "MARKER" } },
        }),
      ],
      argv: DATA_ARGV,
    });
    assert.equal(nested.cases[0].outcome, "accepted", JSON.stringify(nested));
  });

  test(`cli entry (${lang}): fixture.env reaches the child; HOME, PATH, NODE_OPTIONS and any LD_*/DYLD_* variable in it are declined by name`, () => {
    const env = runProbeSpec({
      sink: "url-authority",
      entry: ENTRY,
      cases: [dataCase({ fixture: { env: { PROBE_MARKER: "MARKER" } } })],
      argv: DATA_ARGV,
    });
    assert.equal(env.cases[0].outcome, "accepted", JSON.stringify(env));
    for (const [key, detail] of [
      ["HOME", /may not set HOME — the sandbox owns it/],
      ["PATH", /may not set PATH on the cli: form — it steers the interpreter/],
      [
        "NODE_OPTIONS",
        /may not set NODE_OPTIONS on the cli: form — it steers the interpreter/,
      ],
      [
        "LD_PRELOAD",
        /may not set LD_PRELOAD on the cli: form — it steers the interpreter/,
      ],
      [
        "LD_AUDIT",
        /may not set LD_AUDIT on the cli: form — it steers the interpreter/,
      ],
      [
        "DYLD_FRAMEWORK_PATH",
        /may not set DYLD_FRAMEWORK_PATH on the cli: form — it steers the interpreter/,
      ],
    ]) {
      const r = runProbeSpec({
        sink: "url-authority",
        entry: ENTRY,
        cases: [dataCase({ fixture: { env: { [key]: "/tmp/x" } } })],
        argv: DATA_ARGV,
      });
      assert.equal(r.executed, 0, `${key}: ${JSON.stringify(r.cases)}`);
      assert.match(r.declined[0].detail, detail);
    }
    // The control (task.226): a name that only contains a loader prefix is not
    // a loader variable, so a predicate that matches too much is red here.
    const control = runProbeSpec({
      sink: "url-authority",
      entry: ENTRY,
      cases: [
        dataCase({
          fixture: {
            env: { MY_LD_FLAG: "x" },
            files: { "items.json": "MARKER" },
          },
        }),
      ],
      argv: DATA_ARGV,
    });
    assert.equal(control.executed, 1, JSON.stringify(control));
    assert.equal(control.cases[0].outcome, "accepted", JSON.stringify(control));
  });

  test(`cli entry (${lang}): a malformed fixture, a path that leaves the case directory, or an expected.absent name the fixture writes is declined, never scored`, () => {
    for (const [fixture, extra, detail] of [
      [3, {}, /`fixture` is not an object/],
      [{ files: { "../out.json": "MARKER" } }, {}, /leaves the case directory/],
      [
        { files: { "items.json": "MARKER" } },
        { expected: { exit: 0, absent: ["items.json"] } },
        /which the fixture itself creates/,
      ],
    ]) {
      const r = runProbeSpec({
        sink: "url-authority",
        entry: ENTRY,
        cases: [dataCase({ fixture, ...extra })],
        argv: DATA_ARGV,
      });
      assert.equal(r.executed, 0, JSON.stringify(r.cases));
      assert.match(r.declined[0].detail, detail);
    }
  });

  test(`cli entry (${lang}): a fixture case carrying \`expected\` is still compared, not exit-scored`, () => {
    const files = { "items.json": "MARKER" };
    const met = runProbeSpec({
      sink: "url-authority",
      entry: ENTRY,
      cases: [dataCase({ fixture: { files }, expected: { stdout: "ok\n" } })],
      argv: DATA_ARGV,
    });
    assert.equal(met.cases[0].outcome, "accepted", JSON.stringify(met.cases));
    const missed = runProbeSpec({
      sink: "url-authority",
      entry: ENTRY,
      cases: [
        dataCase({ fixture: { files }, expected: { stdout: "other\n" } }),
      ],
      argv: DATA_ARGV,
    });
    assert.equal(missed.cases[0].outcome, "rejected");
    assert.match(missed.cases[0].detail, /stdout/);
  });
}

// ── task.131: --args-json, the { ok: false } rule, and markdown-structure ────

const requireCjs = createRequire(import.meta.url);
const { loadTemplate } = requireCjs("../report-lint.js");
const LINT_ENTRY = "shared/resources/report-lint.js#lintReport";
const LINT_ARGS = () => [{ sections: loadTemplate() }];

test("task.131: a returned { ok: false } is a rejection and { ok: true } an acceptance", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: `${FIXTURES}/result-object-control.mjs#validateHost`,
    cases: CASES,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.deepEqual(r.reproduced, []);
  assert.deepEqual(r.overblocked, []);
  assert.equal(r.executed, CASES.length);
});

test("task.131: an INHERITED ok is not read — the rule is own-property only", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: `${FIXTURES}/result-object-control.mjs#inheritedOk`,
    cases: CASES,
  });
  assert.equal(
    r.verdict,
    "absent",
    "every answer is a truthy object → accepted",
  );
  assert.equal(r.reproduced.length, hostileOnly.length);
});

test("task.131: without --args-json a two-argument control rejects everything; with it, it engages", () => {
  const argsEntry = `${FIXTURES}/args-control.mjs#validateHost`;
  const bare = runProbeSpec({
    sink: "url-authority",
    entry: argsEntry,
    cases: CASES,
  });
  assert.equal(bare.verdict, "unverifiable");
  assert.equal(bare.reason, "rejects-every-input");
  assert.equal(bare.args, null);

  const args = [{ allow: legitimateOnly.map((c) => c.input) }];
  const r = runProbeSpec({
    sink: "url-authority",
    entry: argsEntry,
    cases: CASES,
    args,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.deepEqual(r.args, args, "the result states how the export was called");
  assert.deepEqual(toRecordEntry(r).args, args, "and so does the record");
});

test("task.131: args is declined bad-args on a non-JS form or when it is not an array", () => {
  const notArray = runProbeSpec({
    sink: "url-authority",
    entry: `${FIXTURES}/args-control.mjs#validateHost`,
    cases: CASES,
    args: { allow: [] },
  });
  assert.equal(notArray.verdict, "unverifiable");
  assert.equal(notArray.reason, "bad-args");
  const shell = runProbeSpec({
    sink: "filename",
    entry: `shell:${FIXTURES}/runs-names.sh`,
    args: [1],
  });
  assert.equal(shell.reason, "bad-args");
  assert.equal(shell.executed, 0);
});

test("task.131: --args-json on the CLI — a JS entry runs; a non-array, non-JSON or shell entry exits 2", () => {
  const casesDir = mkdtempSync(join(tmpdir(), "probe-args-"));
  try {
    const casesFile = join(casesDir, "cases.json");
    writeFileSync(casesFile, JSON.stringify(CASES));
    const ok = runMain([
      "--sink",
      "url-authority",
      "--entry",
      `${FIXTURES}/args-control.mjs#validateHost`,
      "--args-json",
      JSON.stringify([{ allow: ["db.internal", "db.internal:5432"] }]),
      "--cases-file",
      casesFile,
      "--json",
    ]);
    assert.equal(ok.rc, 0, ok.err);
    assert.equal(JSON.parse(ok.out).verdict, "engages");
  } finally {
    rmSync(casesDir, { recursive: true, force: true });
  }
  for (const [label, argv] of Object.entries({
    "not JSON": ["--entry", entry("engaging-control"), "--args-json", "[oops"],
    "not an array": ["--entry", entry("engaging-control"), "--args-json", "{}"],
    "shell entry": [
      "--entry",
      `shell:${FIXTURES}/runs-names.sh`,
      "--args-json",
      "[1]",
    ],
    "cli entry": [
      "--entry",
      `cli:${FIXTURES}/cli-refuser.mjs`,
      "--argv",
      '["{input}"]',
      "--args-json",
      "[1]",
    ],
  })) {
    const r = runMain(["--sink", "url-authority", ...argv]);
    assert.equal(r.rc, 2, `${label}: ${r.err}`);
    assert.match(r.err, /bad-args/, label);
  }
});

test("task.131: lintReport through the markdown-structure sink engages — every hostile refused, every legitimate accepted", () => {
  const cases = corpusFor("markdown-structure");
  const r = runProbeSpec({
    sink: "markdown-structure",
    entry: LINT_ENTRY,
    args: LINT_ARGS(),
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.equal(r.executed, cases.length);
  assert.deepEqual(r.reproduced, []);
  assert.deepEqual(r.overblocked, []);
  assert.deepEqual(r.declined, []);
});

test("task.131: each markdown-structure hostile case trips exactly the code(s) it is named for", () => {
  // The isolation property is what makes the mutant below catchable: a case
  // tripping several codes still refuses when one check is dropped.
  const { lintReport } = requireCjs("../report-lint.js");
  const EXPECTED = {
    "duplicated-header-block": ["header-block-duplicated"],
    "second-h1": ["multiple-h1"],
    "trailing-duplicate-body": [
      "section-duplicated",
      "trailing-duplicate-body",
    ],
    "section-out-of-order": ["section-out-of-order"],
    "section-duplicated": ["section-duplicated"],
    "heading-only-inside-fence": ["section-missing"],
    "heading-only-inside-fence-crlf": ["section-missing"],
    "qa-cycle-duplicated": ["qa-cycle-duplicated"],
    "empty-document": ["variant-undetected"],
  };
  const hostile = corpusFor("markdown-structure").filter(
    (c) => c.direction === "hostile",
  );
  assert.deepEqual(
    hostile.map((c) => c.id.replace("markdown-structure.", "")).sort(),
    Object.keys(EXPECTED).sort(),
    "every hostile case has an expectation, and no expectation is orphaned",
  );
  for (const c of hostile) {
    const r = lintReport(c.input, { sections: loadTemplate() });
    const codes = [...new Set(r.problems.map((p) => p.code))].sort();
    assert.deepEqual(
      codes,
      EXPECTED[c.id.replace("markdown-structure.", "")],
      c.id,
    );
  }
});

test("task.131: the real report-lint fixtures score the same way through the runner — corrupt refused, green accepted", () => {
  const FIX = join(REPO_ROOT, "shared/resources/tests/fixtures/report-lint");
  const green = readdirSync(join(FIX, "green")).filter((f) =>
    f.endsWith(".md"),
  );
  assert.ok(green.length >= 5, "the five green fixtures are present");
  const cases = [
    {
      id: "fixture.corrupt-task117",
      sink: "markdown-structure",
      input: readFileSync(join(FIX, "corrupt-task117.md"), "utf8"),
      why: "task.117's doubled HALT commit",
      correct: "refused",
      direction: "hostile",
    },
    ...green.map((f) => ({
      id: `fixture.green.${f}`,
      sink: "markdown-structure",
      input: readFileSync(join(FIX, "green", f), "utf8"),
      why: "an accepted report",
      correct: "accepted",
      direction: "legitimate",
    })),
  ];
  const r = runProbeSpec({
    sink: "markdown-structure",
    entry: LINT_ENTRY,
    cases,
    args: LINT_ARGS(),
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.equal(r.executed, cases.length);
});

test("task.131: a lintReport mutant without the header-block check is caught by the isolated case", () => {
  // Copied, never edited in place: the mutant lives in a temp dir inside the
  // repo root (the engine's containment) beside the two files it requires.
  const dir = mkdtempSync(
    join(REPO_ROOT, "shared/resources/tests/.t131-mutant-"),
  );
  try {
    for (const f of [
      "report-lint.js",
      "change-log.js",
      "implementation-report-template.md",
    ]) {
      cpSync(join(REPO_ROOT, "shared/resources", f), join(dir, f));
    }
    const src = readFileSync(join(dir, "report-lint.js"), "utf8");
    const push =
      /problems\.push\(\{\s*code: "header-block-duplicated",[\s\S]*?\}\);\n/;
    assert.ok(
      push.test(src),
      "the header-block push is where the mutant expects it",
    );
    writeFileSync(join(dir, "report-lint.js"), src.replace(push, ""));
    const r = runProbeSpec({
      sink: "markdown-structure",
      entry: `${relative(REPO_ROOT, dir)}/report-lint.js#lintReport`,
      args: LINT_ARGS(),
    });
    assert.deepEqual(r.reproduced, [
      "markdown-structure.duplicated-header-block",
    ]);
    assert.equal(r.verdict, "present-but-inert");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── The fence: entry form (task.180) ─────────────────────────────────────────
//
// `fence:<doc.md>#<heading>` + `--slot` runs the first ```bash block under a
// heading as a script, per case, with the case's input substituted for the
// slot's text. The docs are written into a temp ROOT per test and passed as
// `repoRoot`, so containment is exercised for real and the shipped tree is
// never edited.

const FENCE_DOC = [
  "# Fixture doc",
  "",
  "### Admit",
  "",
  "```bash",
  'GATE="<slot>"',
  '[ "$GATE" = "ok" ] || { echo REFUSED; exit 1; }',
  "```",
  "",
  "### Refuse everything",
  "",
  "```bash",
  ': "<slot>"',
  "echo REFUSED",
  "exit 1",
  "```",
  "",
].join("\n");

/** A temp root holding `files` ({relpath: text}); returns the root. */
function fenceRoot(files) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "probe-fence-")));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

const fenceCase = (id, direction, input, extra = {}) => ({
  id,
  sink: "filename",
  input,
  why: "fence fixture",
  correct: direction === "hostile" ? "refused" : "admitted",
  direction,
  ...extra,
});

// A hostile fence: case states the guard's refusal (TASK-180-009) as output a
// stopped shell cannot also produce (TASK-180-012): Admit's guard prints
// REFUSED and exits 1.
const ADMIT_CASES = [
  fenceCase("f.ok", "legitimate", "ok"),
  fenceCase("f.bad", "hostile", "bad", {
    expected: { exit: 1, stdout: "REFUSED\n" },
  }),
];

test("fence entry: resolveEntry returns kind fence with the heading, and refuses a malformed or escaping spec", () => {
  const root = fenceRoot({ "doc.md": FENCE_DOC });
  try {
    const r = resolveEntry("fence:doc.md#Admit", root);
    assert.equal(r.ok, true);
    assert.equal(r.kind, "fence");
    assert.equal(r.heading, "Admit");
    assert.equal(r.entryPath, join(root, "doc.md"));
    assert.equal(FENCE_PREFIX, "fence:");
    // The FIRST # splits: a heading may carry one, a path may not.
    assert.equal(
      resolveEntry("fence:doc.md#C# and F#", root).heading,
      "C# and F#",
    );
    assert.equal(resolveEntry("fence:doc.md", root).reason, "bad-entry");
    assert.equal(resolveEntry("fence:doc.md#   ", root).reason, "bad-entry");
    assert.equal(resolveEntry("fence:#H", root).reason, "bad-entry");
    assert.equal(resolveEntry("fence:x.js#H", root).reason, "bad-entry");
    assert.equal(
      resolveEntry("fence:../outside.md#H", root).reason,
      "outside-repo-root",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: extraction takes the block under THIS heading, and a missing heading or block is a named decline", () => {
  const root = fenceRoot({ "doc.md": FENCE_DOC });
  try {
    // Under "Admit" the block admits ok and refuses bad → engages. Were the
    // heading ignored, the doc's first block would still be taken here — so the
    // second heading's block is what pins it (below).
    const admit = runProbeSpec({
      entry: "fence:doc.md#Admit",
      slot: "<slot>",
      cases: ADMIT_CASES,
      repoRoot: root,
    });
    assert.equal(admit.verdict, "engages", JSON.stringify(admit.cases));
    assert.deepEqual(admit.escapes, []);

    const refuse = runProbeSpec({
      entry: "fence:doc.md#Refuse everything",
      slot: "<slot>",
      cases: ADMIT_CASES,
      repoRoot: root,
    });
    // Its block is `exit 1`: the ok case is over-blocked, which only the
    // SECOND heading's block does. Extraction that ignored the heading would
    // run the first block and admit ok.
    assert.deepEqual(
      refuse.overblocked,
      probeShells().map((s) => `f.ok@${s}`),
      "the block under the second heading ran",
    );

    const missing = runProbeSpec({
      entry: "fence:doc.md#Nope",
      slot: "<slot>",
      cases: ADMIT_CASES,
      repoRoot: root,
    });
    assert.equal(missing.verdict, "unverifiable");
    assert.equal(missing.reason, "entry-not-probeable");
    assert.match(missing.declined[0].detail, /heading not found: "Nope"/);
    assert.equal(missing.executed, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a heading with no bash block under it, or two identical headings, is a named decline", () => {
  const doc = [
    "## Prose only",
    "",
    "Words, and an sh block — not bash:",
    "",
    "```sh",
    "exit 0",
    "```",
    "",
    "## Twice",
    "",
    "```bash",
    "exit 0",
    "```",
    "",
    "## Twice",
    "",
  ].join("\n");
  const root = fenceRoot({ "doc.md": doc });
  try {
    const prose = extractFencedBlock(doc, "Prose only");
    assert.equal(prose.ok, false);
    assert.match(prose.detail, /no bash block under heading "Prose only"/);
    const twice = extractFencedBlock(doc, "Twice");
    assert.equal(twice.ok, false);
    assert.match(twice.detail, /ambiguous — it appears at lines 9 and 15/);
    const r = runProbeSpec({
      entry: "fence:doc.md#Prose only",
      slot: "exit",
      cases: ADMIT_CASES,
      repoRoot: root,
    });
    assert.equal(r.reason, "entry-not-probeable");
    assert.match(r.declined[0].detail, /no bash block/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a heading-shaped # comment inside a fence neither ends the section nor matches the heading (review I2)", () => {
  const doc = [
    "## Setup",
    "",
    "```bash",
    "# Gate",
    "exit 0",
    "```",
    "",
    "## Gate",
    "",
    "```yaml",
    "# a yaml comment, heading-shaped",
    "key: value",
    "```",
    "",
    "```bash",
    "# Bind the value first.",
    'GATE="<slot>"',
    '[ "$GATE" = "ok" ] || exit 1',
    "```",
    "",
  ].join("\n");
  const got = extractFencedBlock(doc, "Gate");
  assert.equal(got.ok, true, got.detail);
  assert.equal(
    got.headingLine,
    8,
    "the real heading, not the comment at line 4",
  );
  assert.equal(got.line, 15, "the bash block after the yaml block's comment");
  assert.match(got.code, /GATE="<slot>"/);
});

test("fence entry: exit status is the verdict — non-zero with no expected is rejected, a hang is errored", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Three",
      "",
      "```bash",
      ': "<slot>"',
      "exit 3",
      "```",
      "",
      "## Hang",
      "",
      "```bash",
      ': "<slot>"',
      "sleep 5",
      "```",
      "",
    ].join("\n"),
  });
  try {
    const three = runProbeSpec({
      entry: "fence:doc.md#Three",
      slot: "<slot>",
      cases: [fenceCase("f.x", "legitimate", "x")],
      repoRoot: root,
    });
    assert.equal(three.cases.length, probeShells().length);
    assert.ok(
      three.cases.every((c) => c.outcome === "rejected" && c.exit === 3),
    );
    const hang = runProbeSpec({
      entry: "fence:doc.md#Hang",
      slot: "<slot>",
      cases: [fenceCase("f.x", "legitimate", "x")],
      timeoutMs: 300,
      repoRoot: root,
    });
    assert.equal(hang.cases.length, probeShells().length);
    assert.ok(hang.cases.every((c) => c.outcome === "errored"));
    assert.match(hang.cases[0].detail, /timed out/);
    assert.equal(hang.reason, "entry-not-probeable");
    assert.equal(hang.executed, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: --slot is required with fence:, refused elsewhere, and must appear in the block", () => {
  const root = fenceRoot({ "doc.md": FENCE_DOC });
  try {
    const none = runProbeSpec({
      entry: "fence:doc.md#Admit",
      cases: ADMIT_CASES,
      repoRoot: root,
    });
    assert.equal(none.reason, "bad-slot");
    const absent = runProbeSpec({
      entry: "fence:doc.md#Admit",
      slot: "<absent>",
      cases: ADMIT_CASES,
      repoRoot: root,
    });
    assert.equal(absent.reason, "bad-slot");
    assert.match(absent.declined[0].detail, /does not appear in the block/);
    const onShell = runProbeSpec({
      entry: FIXED_SCRIPT,
      slot: "<slot>",
      sink: "filename",
    });
    assert.equal(onShell.reason, "bad-slot");
    assert.match(onShell.declined[0].detail, /fence: entry form only/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: the slot replacement is a function — $& in the input is text", () => {
  const root = fenceRoot({
    "doc.md": ["## Echo", "", "```bash", "printf %s '<slot>'", "```", ""].join(
      "\n",
    ),
  });
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Echo",
      slot: "<slot>",
      cases: [
        fenceCase("f.amp", "legitimate", "a$&b", {
          expected: { stdout: "a$&b", exit: 0 },
        }),
      ],
      repoRoot: root,
    });
    assert.equal(r.cases.length, probeShells().length);
    assert.ok(
      r.cases.every((c) => c.outcome === "accepted"),
      JSON.stringify(r.cases),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: the slot is script source — a $(…) input runs, in the case directory, never outside it (review C1)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Assign",
      "",
      "```bash",
      'X="<slot>"',
      "exit 0",
      "```",
      "",
      "## Home",
      "",
      "```bash",
      ': "<slot>"',
      ': > "$HOME/leak"',
      "```",
      "",
    ].join("\n"),
  });
  try {
    // `absent` looks in the case directory: the substitution ran there, so the
    // hostile case mismatches (accepted) — and no escape is recorded.
    const sub = runProbeSpec({
      entry: "fence:doc.md#Assign",
      slot: "<slot>",
      cases: [
        fenceCase("f.sub", "hostile", "$(touch PWNED)", {
          expected: { exit: 0, stdout: "REFUSED\n", absent: ["PWNED"] },
        }),
      ],
      repoRoot: root,
    });
    assert.equal(sub.cases.length, probeShells().length);
    assert.ok(
      sub.cases.every(
        (c) => c.outcome === "accepted" && /PWNED/.test(c.detail),
      ),
      JSON.stringify(sub.cases),
    );
    assert.deepEqual(sub.escapes, []);
    assert.equal(existsSync(join(root, "PWNED")), false);
    // HOME is the sandbox's, outside the work dir: a write there IS an escape.
    const home = runProbeSpec({
      entry: "fence:doc.md#Home",
      slot: "<slot>",
      cases: [fenceCase("f.home", "legitimate", "x")],
      repoRoot: root,
    });
    assert.ok(
      home.escapes.some((e) => e.path === "home/leak"),
      JSON.stringify(home.escapes),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: fixture env and files reach the block; a path that leaves the case directory is declined", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Env",
      "",
      "```bash",
      ': "<slot>"',
      '[ "$X" = 1 ]',
      "```",
      "",
      "## Files",
      "",
      "```bash",
      ': "<slot>"',
      '[ "$(cat pkg/a.txt)" = hi ]',
      "```",
      "",
    ].join("\n"),
  });
  try {
    const env = runProbeSpec({
      entry: "fence:doc.md#Env",
      slot: "<slot>",
      cases: [
        fenceCase("f.env", "legitimate", "x", { fixture: { env: { X: "1" } } }),
      ],
      repoRoot: root,
    });
    assert.equal(env.cases.length, probeShells().length);
    assert.ok(
      env.cases.every((c) => c.outcome === "accepted"),
      JSON.stringify(env.cases),
    );
    const files = runProbeSpec({
      entry: "fence:doc.md#Files",
      slot: "<slot>",
      cases: [
        fenceCase("f.files", "legitimate", "x", {
          fixture: { files: { "pkg/a.txt": "hi" } },
        }),
      ],
      repoRoot: root,
    });
    assert.equal(files.cases.length, probeShells().length);
    assert.ok(
      files.cases.every((c) => c.outcome === "accepted"),
      JSON.stringify(files.cases),
    );
    const escape = runProbeSpec({
      entry: "fence:doc.md#Files",
      slot: "<slot>",
      cases: [
        fenceCase("f.esc", "legitimate", "x", {
          fixture: { files: { "../escape": "x" } },
        }),
      ],
      repoRoot: root,
    });
    assert.equal(escape.cases.length, probeShells().length);
    assert.ok(escape.cases.every((c) => c.outcome === "errored"));
    assert.match(escape.cases[0].detail, /leaves the case directory/);
    assert.equal(escape.executed, 0);
    // The sandbox owns HOME, TMPDIR and LC_ALL: a fixture may not set them.
    assert.match(fixtureProblem({ env: { HOME: "/" } }), /sandbox owns it/);
    assert.match(fixtureProblem({ files: { a: 1 } }), /must be a string/);
    assert.match(fixtureProblem({ argv: [] }), /unknown keys: argv/);
    assert.equal(fixtureProblem(undefined), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: the block is read on every run — editing it between two runs changes the verdict", () => {
  const root = fenceRoot({ "doc.md": FENCE_DOC });
  try {
    const spec = {
      entry: "fence:doc.md#Admit",
      slot: "<slot>",
      cases: ADMIT_CASES,
      repoRoot: root,
    };
    assert.equal(runProbeSpec(spec).verdict, "engages");
    writeFileSync(
      join(root, "doc.md"),
      FENCE_DOC.replace(
        '[ "$GATE" = "ok" ] || { echo REFUSED; exit 1; }',
        "exit 0",
      ),
    );
    const after = runProbeSpec(spec);
    assert.notEqual(after.verdict, "engages");
    assert.deepEqual(
      after.reproduced,
      probeShells().map((s) => `f.bad@${s}`),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: --slot missing with fence:, or given with another form, exits 2 with bad-slot", () => {
  const cases = {
    missing: ["--entry", "fence:doc.md#Admit"],
    misplaced: ["--entry", FIXED_SCRIPT, "--slot", "<slot>"],
  };
  for (const [name, args] of Object.entries(cases)) {
    const { rc, err } = runMain(["--sink", "filename", ...args]);
    assert.equal(rc, 2, name);
    assert.match(err, /^bad-slot: /, name);
  }
  const { rc, err } = runMain([
    "--sink",
    "filename",
    "--entry",
    "fence:doc.md#Admit",
    "--slot",
    "<slot>",
    "--args-json",
    "[]",
  ]);
  assert.equal(rc, 2);
  assert.match(err, /^bad-args: /);
});

test("fence entry: every fence result path returns the JS form's key set", () => {
  const root = fenceRoot({ "doc.md": FENCE_DOC });
  try {
    const expected = Object.keys(
      runProbeSpec({ entry: entry("engaging-control"), cases: CASES }),
    ).sort();
    const paths = {
      success: {
        entry: "fence:doc.md#Admit",
        slot: "<slot>",
        cases: ADMIT_CASES,
      },
      "no slot": { entry: "fence:doc.md#Admit", cases: ADMIT_CASES },
      "missing heading": {
        entry: "fence:doc.md#Nope",
        slot: "<slot>",
        cases: ADMIT_CASES,
      },
      "all errored": {
        entry: "fence:doc.md#Admit",
        slot: "<slot>",
        cases: [fenceCase("f.e", "legitimate", 7)],
      },
    };
    for (const [name, spec] of Object.entries(paths)) {
      const r = runProbeSpec({ ...spec, repoRoot: root });
      assert.deepEqual(Object.keys(r).sort(), expected, `${name} key set`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// task.167's 13 cases, reconstructed from its DoD (lines 123–128) — the original
// cases file lived under the gitignored .claude/state/ and is not in the repo.
// Run against the SHIPPED block: the probe its finalise ran through a
// hand-written wrapper, now through the engine.
const T167_CASES = JSON.parse(
  readFileSync(
    join(
      REPO_ROOT,
      "shared/resources/tests/fixtures/fence-probe/t167-cases.json",
    ),
    "utf8",
  ),
);
const T167_HEADING =
  "Precondition — the gate must resolve before the first iteration";
const T167_DOC = "shared/resources/develop-pipeline-step-3-develop-loop.md";

test("fence entry: task.167's 13 cases against the shipped fast-gate precondition — engages, 0 reproduced, no escape", () => {
  assert.equal(T167_CASES.length, 13);
  const r = runProbeSpec({
    entry: `fence:${T167_DOC}#${T167_HEADING}`,
    slot: "<fastGateCommand>",
    sink: "filename",
    cases: T167_CASES,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.equal(r.executed, 13 * probeShells().length);
  assert.deepEqual(r.reproduced, []);
  assert.deepEqual(r.overblocked, []);
  assert.deepEqual(r.escapes, []);
});

test("fence entry: without --loglevel=notice the same cases over-block the 4 silent-environment legitimate cases", () => {
  const text = readFileSync(join(REPO_ROOT, T167_DOC), "utf8");
  const parts = text.split("npm run --loglevel=notice 2>/dev/null");
  assert.equal(
    parts.length,
    2,
    "the shipped block carries the flag exactly once",
  );
  const root = fenceRoot({ "doc.md": parts.join("npm run 2>/dev/null") });
  try {
    const r = runProbeSpec({
      entry: `fence:doc.md#${T167_HEADING}`,
      slot: "<fastGateCommand>",
      sink: "filename",
      cases: T167_CASES,
      repoRoot: root,
    });
    const silent = [
      "defined-env-silent",
      "defined-npmrc-silent",
      "defined-env-and-npmrc-silent",
      "defined-compound-silent",
    ];
    assert.deepEqual(
      [...r.overblocked].sort(),
      silent.flatMap((id) => probeShells().map((s) => `${id}@${s}`)).sort(),
    );
    assert.deepEqual(r.reproduced, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a substitution that breaks the block's syntax is errored by the parse check, never a refusal — an accept-all block cannot score engages (TASK-180-001)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Accept all",
      "",
      "```bash",
      'X="<slot>"',
      "exit 0",
      "```",
      "",
      "## Refuses loudly",
      "",
      "```bash",
      'X="<slot>"',
      '[ "$X" = ok ] || { echo "syntax error: refused" >&2; exit 2; }',
      "```",
      "",
    ].join("\n"),
  });
  const refusal = { exit: 2, stderr: "syntax error: refused\n" };
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Accept all",
      slot: "<slot>",
      cases: [
        fenceCase("f.quote", "hostile", 'a"b', { expected: refusal }),
        fenceCase("f.ok", "legitimate", "ok"),
      ],
      repoRoot: root,
    });
    const quote = r.cases.filter((c) => c.id === "f.quote");
    assert.equal(quote.length, probeShells().length);
    assert.ok(
      quote.every(
        (c) => c.outcome === "errored" && /does not parse/.test(c.detail),
      ),
      JSON.stringify(quote),
    );
    assert.notEqual(r.verdict, "engages", JSON.stringify(r.cases));
    // Control: a guard that REFUSES with exit 2 and the words "syntax error" on
    // stderr parses, so it is scored against its stated refusal — and a
    // legitimate case it over-blocks is rejected with stderr quoted (CR-4).
    const loud = runProbeSpec({
      entry: "fence:doc.md#Refuses loudly",
      slot: "<slot>",
      cases: [
        fenceCase("f.bad", "hostile", "bad", { expected: refusal }),
        fenceCase("f.ok", "legitimate", "ok"),
        fenceCase("f.near", "legitimate", "ok2"),
      ],
      repoRoot: root,
    });
    assert.equal(loud.cases.length, 3 * probeShells().length);
    assert.ok(
      loud.cases
        .filter((c) => c.id === "f.bad")
        .every((c) => c.outcome === "rejected"),
      JSON.stringify(loud.cases),
    );
    assert.ok(
      loud.cases
        .filter((c) => c.id === "f.near")
        .every((c) => c.outcome === "rejected" && /refused/.test(c.detail)),
      "the rejection detail quotes stderr (CR-4)",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a hostile case with no `expected` is declined, never scored by exit status (TASK-180-009)", () => {
  const root = fenceRoot({ "doc.md": FENCE_DOC });
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Admit",
      slot: "<slot>",
      cases: [
        fenceCase("f.ok", "legitimate", "ok"),
        fenceCase("f.bare", "hostile", "bad"),
      ],
      repoRoot: root,
    });
    const bare = r.cases.filter((c) => c.id === "f.bare");
    assert.equal(bare.length, probeShells().length);
    assert.ok(
      bare.every(
        (c) =>
          c.outcome === "errored" &&
          /hostile fence: case has no `expected`/.test(c.detail),
      ),
      JSON.stringify(bare),
    );
    assert.notEqual(r.verdict, "engages");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a hostile `expected` with no non-empty stdout or stderr is declined — an accept-all block never reads engages (TASK-180-012)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Accept all",
      "",
      "```bash",
      'X="<slot>"',
      "exit 0",
      "```",
      "",
    ].join("\n"),
  });
  try {
    // The two inputs the finding names, each under the two exit-only shapes —
    // and a whitespace-only output, which a bare `echo` also produces.
    for (const expected of [
      { exit: 1 },
      { exit: 1, stdout: "" },
      { exit: 1, stdout: "", stderr: "" },
      { exit: 1, stderr: " \n" },
      { exit: 1, absent: ["pwned"] },
    ]) {
      const r = runProbeSpec({
        entry: "fence:doc.md#Accept all",
        slot: "<slot>",
        cases: [
          fenceCase("f.expansion", "hostile", "${x:?boom}", { expected }),
          fenceCase("f.inject", "hostile", '"; exit 1; "', { expected }),
          fenceCase("f.ok", "legitimate", "ok"),
        ],
        repoRoot: root,
      });
      const hostile = r.cases.filter((c) => c.direction === "hostile");
      assert.equal(hostile.length, 2 * probeShells().length);
      assert.ok(
        hostile.every(
          (c) =>
            c.outcome === "errored" &&
            /states no refusal output/.test(c.detail),
        ),
        JSON.stringify({ expected, cases: r.cases }),
      );
      assert.notEqual(r.verdict, "engages", JSON.stringify(expected));
    }
    // The other direction: a non-empty refusal output is admitted and scored —
    // the same accept-all block reproduces on both inputs.
    const scored = runProbeSpec({
      entry: "fence:doc.md#Accept all",
      slot: "<slot>",
      cases: [
        fenceCase("f.expansion", "hostile", "${x:?boom}", {
          expected: { exit: 1, stderr: "refused\n" },
        }),
        fenceCase("f.inject", "hostile", '"; exit 1; "', {
          expected: { exit: 1, stdout: "refused\n" },
        }),
        fenceCase("f.ok", "legitimate", "ok"),
      ],
      repoRoot: root,
    });
    assert.equal(scored.verdict, "absent", JSON.stringify(scored.cases));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a runtime error AFTER the guard let the input through is the guard's failure, not errored — the word-split cd case reproduces (TASK-180-009)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Relative only",
      "",
      "```bash",
      "P='<slot>'",
      'case "$P" in /*) echo REFUSED; exit 1 ;; esac',
      "cd $P",
      "```",
      "",
    ].join("\n"),
  });
  const refusal = { exit: 1, stdout: "REFUSED\n" };
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Relative only",
      slot: "<slot>",
      cases: [
        fenceCase("f.abs", "hostile", "/etc", { expected: refusal }),
        fenceCase("f.split", "hostile", "x y", { expected: refusal }),
        fenceCase("f.nodir", "hostile", "nosuchdir", { expected: refusal }),
        fenceCase("f.ok", "legitimate", "d", {
          fixture: { files: { "d/k": "" } },
        }),
      ],
      repoRoot: root,
    });
    assert.deepEqual(
      [...r.reproduced].sort(),
      ["f.nodir", "f.split"]
        .flatMap((id) => probeShells().map((s) => `${id}@${s}`))
        .sort(),
      JSON.stringify(r.cases),
    );
    assert.equal(r.verdict, "present-but-inert");
    assert.ok(r.cases.every((c) => c.outcome !== "errored"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a control is keyed on its --name, else its slot — two slots stay two, a re-run stays one (TASK-180-002)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Two",
      "",
      "```bash",
      'A="<a>"; B="<b>"',
      '[ "$A" = ok ] && [ "$B" = ok ]',
      "```",
      "",
    ].join("\n"),
  });
  const dir = mkdtempSync(join(tmpdir(), "probe-fence-record-"));
  try {
    const record = join(dir, "run.json");
    const run = (slot, name) =>
      recordRun(
        record,
        runProbeSpec({
          entry: "fence:doc.md#Two",
          slot,
          sink: "filename",
          cases: [fenceCase("f.ok", "legitimate", "ok")],
          repoRoot: root,
        }),
        { name },
      );
    run("<a>");
    run("<b>");
    let controls = readRecord(record).controls;
    assert.equal(controls.length, 2, "two slots on one block are two controls");
    assert.deepEqual(controls.map((c) => c.slot).sort(), ["<a>", "<b>"]);
    run("<a>");
    assert.equal(
      readRecord(record).controls.length,
      2,
      "a re-run of one slot replaces only its own entry",
    );
    run("<a>", "named");
    run("<b>", "named");
    controls = readRecord(record).controls;
    assert.equal(
      controls.filter((c) => c.name === "named").length,
      1,
      "a --name is the identity: the same name on another slot is one control",
    );
    assert.equal(controls.length, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fence entry: an empty --slot exits 2 with bad-slot and writes no record (TASK-180-003)", () => {
  const dir = mkdtempSync(join(tmpdir(), "probe-fence-slot-"));
  try {
    const record = join(dir, "run.json");
    const { rc, err } = runMain([
      "--sink",
      "filename",
      "--entry",
      "fence:doc.md#Admit",
      "--slot",
      "",
      "--record",
      record,
    ]);
    assert.equal(rc, 2);
    assert.match(err, /^bad-slot: /);
    assert.equal(existsSync(recordEntriesDir(record)), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fence entry: an expected.absent name the case's own fixture writes is declined, never scored (TASK-180-004)", () => {
  const root = fenceRoot({
    "doc.md": ["## G", "", "```bash", ': "<slot>"', "exit 0", "```", ""].join(
      "\n",
    ),
  });
  try {
    for (const [files, absent] of [
      [{ pwned: "" }, ["pwned"]],
      [{ "dir/x": "" }, ["dir"]],
      // Normalised and case-folded (TASK-180-010): each writes `pwned`.
      [{ "./pwned": "" }, ["pwned"]],
      [{ "b/../pwned": "" }, ["pwned"]],
      [{ PWNED: "" }, ["pwned"]],
    ]) {
      const r = runProbeSpec({
        entry: "fence:doc.md#G",
        slot: "<slot>",
        cases: [
          fenceCase("f.collide", "hostile", "x", {
            fixture: { files },
            expected: { exit: 0, stdout: "REFUSED\n", absent },
          }),
        ],
        repoRoot: root,
      });
      assert.equal(r.cases.length, probeShells().length);
      assert.ok(
        r.cases.every(
          (c) =>
            c.outcome === "errored" && /fixture itself creates/.test(c.detail),
        ),
        JSON.stringify(r.cases),
      );
      assert.notEqual(r.verdict, "absent");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a fatal expansion or an injected exit against an accept-all block mismatches the stated refusal — reproduced, never errored or rejected (TASK-180-005)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Accept all",
      "",
      "```bash",
      'X="<slot>"',
      "exit 0",
      "```",
      "",
    ].join("\n"),
  });
  const refusal = { exit: 1, stdout: "REFUSED\n" };
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Accept all",
      slot: "<slot>",
      cases: [
        fenceCase("f.expansion", "hostile", "${x:?boom}", {
          expected: refusal,
        }),
        fenceCase("f.unset", "hostile", "${x?}", { expected: refusal }),
        fenceCase("f.inject", "hostile", '"; exit 1; "', { expected: refusal }),
        fenceCase("f.ok", "legitimate", "ok"),
      ],
      repoRoot: root,
    });
    assert.deepEqual(
      [...r.reproduced].sort(),
      ["f.expansion", "f.inject", "f.unset"]
        .flatMap((id) => probeShells().map((s) => `${id}@${s}`))
        .sort(),
      JSON.stringify(r.cases),
    );
    assert.equal(r.verdict, "absent");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a write beside the case directory, under the work dir, is an escape (TASK-180-011)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Beside",
      "",
      "```bash",
      ': "<slot>"',
      ": > ../pwned",
      ": > ../.probe-harness/planted",
      "```",
      "",
    ].join("\n"),
  });
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Beside",
      slot: "<slot>",
      cases: [fenceCase("f.x", "legitimate", "x")],
      repoRoot: root,
    });
    for (const s of probeShells()) {
      for (const path of ["work/pwned", "work/.probe-harness/planted"]) {
        assert.ok(
          r.escapes.some((e) => e.id === `f.x@${s}` && e.path === path),
          JSON.stringify(r.escapes),
        );
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a deletion or an empty directory under the work dir is an escape — the gh trip-wire stub cannot be removed unseen (TASK-180-013)", () => {
  const root = fenceRoot({
    "doc.md": ["## Echo", "", "```bash", ': "<slot>"', "```", ""].join("\n"),
  });
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Echo",
      slot: "<slot>",
      cases: [
        fenceCase(
          "f.x",
          "legitimate",
          "$(rm -f ../.probe-harness/bin/gh; mkdir ../pwned-dir)",
        ),
      ],
      repoRoot: root,
    });
    // The first shell deletes the stub; a later shell finds it already gone,
    // so the deletion is that first shell's escape. The directory is each
    // shell's own (mkdir fails on the second, which changes nothing).
    const first = `f.x@${probeShells()[0]}`;
    for (const path of ["work/.probe-harness/bin/gh", "work/pwned-dir/"]) {
      assert.ok(
        r.escapes.some((e) => e.id === first && e.path === path),
        JSON.stringify(r.escapes),
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a block or an input that names gh is declined needs-fake-gh before anything runs — a path-resolved gh never reaches the host (TASK-180-015)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Path gh",
      "",
      "```bash",
      'X="<slot>"',
      'real=$(type -ap gh | tail -1); "$real" --version > ran-gh',
      '[ "$X" = ok ] || { echo REFUSED; exit 1; }',
      "```",
      "",
      "## Plain",
      "",
      "```bash",
      'X="<slot>"',
      '[ "$X" = ok ] || { echo REFUSED; exit 1; }',
      "```",
      "",
    ].join("\n"),
  });
  const cases = [
    fenceCase("f.ok", "legitimate", "ok"),
    fenceCase("f.bad", "hostile", "bad", {
      expected: { exit: 1, stdout: "REFUSED\n" },
    }),
  ];
  try {
    const block = runProbeSpec({
      entry: "fence:doc.md#Path gh",
      slot: "<slot>",
      cases,
      repoRoot: root,
    });
    assert.equal(block.reason, "needs-fake-gh", JSON.stringify(block));
    assert.equal(block.verdict, "unverifiable");
    // Declined BEFORE any spawn — the run-time trip-wire also declines
    // needs-fake-gh, but only after cases ran, and it never sees a path-resolved gh.
    assert.deepEqual(block.cases ?? [], [], JSON.stringify(block.cases));
    assert.match(block.declined[0].detail, /--fake-gh/);
    // The slot is source: an input that names gh is the same exposure.
    const input = runProbeSpec({
      entry: "fence:doc.md#Plain",
      slot: "<slot>",
      cases: [
        ...cases,
        fenceCase("f.gh", "hostile", "$(gh --version)", {
          expected: { exit: 1, stdout: "REFUSED\n" },
        }),
      ],
      repoRoot: root,
    });
    assert.equal(input.reason, "needs-fake-gh", JSON.stringify(input));
    assert.deepEqual(input.cases ?? [], [], JSON.stringify(input.cases));
    // The other direction: a block and inputs that only CONTAIN the letters
    // (a path ending in /gh, `ghost`) are probed and scored as usual.
    const plain = runProbeSpec({
      entry: "fence:doc.md#Plain",
      slot: "<slot>",
      cases: [
        ...cases,
        fenceCase("f.ghost", "hostile", "ghost/bin/gh", {
          expected: { exit: 1, stdout: "REFUSED\n" },
        }),
      ],
      repoRoot: root,
    });
    assert.equal(plain.verdict, "engages", JSON.stringify(plain.cases));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a write to an absolute path outside the sandbox is NOT observed — the stated limit, pinned (TASK-180-016)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Case guard",
      "",
      "```bash",
      "X='<slot>'",
      'case "$X" in ok) ;; *) echo REFUSED; exit 1 ;; esac',
      "```",
      "",
    ].join("\n"),
  });
  const outside = realpathSync(mkdtempSync(join(tmpdir(), "probe-outside-")));
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Case guard",
      slot: "<slot>",
      cases: [
        fenceCase("f.ok", "legitimate", "ok"),
        fenceCase("f.out", "hostile", `'$(touch ${outside}/pwned)'`, {
          expected: { exit: 1, stdout: "REFUSED\n" },
        }),
      ],
      repoRoot: root,
    });
    // The injection ran, and the engine did not see it: probe-boundary-rule.md
    // §5 and the engine header state this limit. If this row starts failing,
    // the limit was closed — update both statements with it.
    assert.ok(existsSync(join(outside, "pwned")));
    assert.deepEqual(r.escapes, []);
    assert.equal(r.verdict, "engages");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("ghFreePath: a PATH directory holding gh is replaced by a copy without it; others, and relative entries, are kept (TASK-180-017)", () => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "ghfree-")));
  try {
    const withGh = join(base, "with");
    const without = join(base, "without");
    mkdirSync(withGh);
    mkdirSync(without);
    for (const [dir, name] of [
      [withGh, "gh"],
      [withGh, "tool"],
      [without, "other"],
    ]) {
      writeFileSync(join(dir, name), "#!/bin/sh\n");
      chmodSync(join(dir, name), 0o755);
    }
    const farmRoot = join(base, "farm");
    const out = ghFreePath(`${withGh}:rel:${without}`, farmRoot).split(":");
    assert.equal(out.length, 3);
    assert.ok(out[0].startsWith(farmRoot), out[0]);
    assert.deepEqual(readdirSync(out[0]), ["tool"]);
    assert.equal(out[1], "rel");
    assert.equal(out[2], without);
    // Built once: a second call reuses the same copy.
    assert.equal(ghFreePath(withGh, farmRoot), out[0]);
    // With a cwd, a relative entry is resolved there and shadowed like an
    // absolute one: a fixture PATH of `../with` must not keep gh in reach (CR-2).
    const cwd = join(base, "case");
    mkdirSync(cwd);
    const rel = ghFreePath("../with:../without", farmRoot, cwd).split(":");
    assert.equal(rel[0], out[0]);
    assert.equal(rel[1], "../without");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("fence entry: no PATH lookup reaches a host gh, whatever runs it — a BASH_ENV fixture script included (TASK-180-017)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Plain",
      "",
      "```bash",
      "X='<slot>'",
      'case "$X" in ok) ;; *) echo REFUSED; exit 1 ;; esac',
      "```",
      "",
    ].join("\n"),
  });
  // A stand-in for the host's gh, first on the PATH the engine inherits. It
  // writes a marker OUTSIDE the sandbox when it runs.
  const host = realpathSync(mkdtempSync(join(tmpdir(), "probe-host-gh-")));
  const marker = join(host, "host-gh-ran");
  writeFileSync(join(host, "gh"), `#!/bin/sh\n: > "${marker}"\n`);
  chmodSync(join(host, "gh"), 0o755);
  const savedPath = process.env.PATH;
  process.env.PATH = `${host}:${savedPath}`;
  try {
    const fixture = {
      env: { BASH_ENV: "./init.sh" },
      files: {
        // The name is assembled at run time, so the pre-spawn text check cannot
        // see it and the run reaches ghFreePath (TASK-180-020).
        "init.sh":
          'n=g; for g in $(type -ap "${n}h"); do "$g" --version >/dev/null 2>&1; done\n',
      },
    };
    const r = runProbeSpec({
      entry: "fence:doc.md#Plain",
      slot: "<slot>",
      cases: [
        fenceCase("f.ok", "legitimate", "ok", { fixture }),
        fenceCase("f.bad", "hostile", "bad", {
          fixture,
          expected: { exit: 1, stdout: "REFUSED\n" },
        }),
      ],
      repoRoot: root,
    });
    // Cases ran: a pre-spawn decline cannot satisfy this test.
    assert.ok((r.cases ?? []).length > 0, JSON.stringify(r));
    assert.equal(existsSync(marker), false, "the host gh ran");
    // The trip-wire answered at run time, so the run is declined, not scored.
    assert.equal(r.reason, "needs-fake-gh", JSON.stringify(r));
  } finally {
    process.env.PATH = savedPath;
    rmSync(root, { recursive: true, force: true });
    rmSync(host, { recursive: true, force: true });
  }
});

test("fence entry: a fixture that names gh — a default-path lookup included — is declined before anything runs (TASK-180-019)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Plain",
      "",
      "```bash",
      "X='<slot>'",
      'case "$X" in ok) ;; *) echo REFUSED; exit 1 ;; esac',
      "```",
      "",
    ].join("\n"),
  });
  try {
    for (const fixture of [
      {
        env: { BASH_ENV: "./init.sh" },
        files: { "init.sh": "env -u PATH gh --version\n" },
      },
      {
        env: { BASH_ENV: "./init.sh" },
        files: { "init.sh": "command -p gh --version\n" },
      },
      { env: { PROMPT_COMMAND: "gh api user" } },
    ]) {
      const r = runProbeSpec({
        entry: "fence:doc.md#Plain",
        slot: "<slot>",
        cases: [
          fenceCase("f.ok", "legitimate", "ok", { fixture }),
          fenceCase("f.bad", "hostile", "bad", {
            expected: { exit: 1, stdout: "REFUSED\n" },
          }),
        ],
        repoRoot: root,
      });
      assert.equal(r.reason, "needs-fake-gh", JSON.stringify(fixture));
      assert.deepEqual(r.cases ?? [], [], JSON.stringify(r.cases));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("emit-block: two unnamed fence: controls on one block render as two, and a heading with # keeps its name (TASK-180-021)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## C# and F#",
      "",
      "```bash",
      'A="<a>"; B="<b>"',
      '[ "$A" = ok ] && [ "$B" = ok ] || { echo REFUSED; exit 1; }',
      "```",
      "",
    ].join("\n"),
  });
  const record = join(root, "run.json");
  const cases = [
    fenceCase("f.ok", "legitimate", "ok"),
    fenceCase("f.bad", "hostile", "bad", {
      expected: { exit: 1, stdout: "REFUSED\n" },
    }),
  ];
  try {
    for (const slot of ["<a>", "<b>"]) {
      const r = runProbeSpec({
        entry: "fence:doc.md#C# and F#",
        slot,
        cases,
        repoRoot: root,
      });
      recordRun(record, r);
    }
    assert.equal(readRecord(record).controls.length, 2);
    const { out } = runMain(["--emit-block", record]);
    const names = [...out.matchAll(/- name: (.*)/g)].map((m) => m[1]);
    assert.equal(names.length, 2, out);
    assert.notEqual(names[0], names[1], out);
    assert.ok(
      names.every((n) => n.includes("C# and F#")),
      out,
    );
    assert.match(out, /slot: "?<a>"?/);
    assert.match(out, /slot: "?<b>"?/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a side effect followed by a kill is a reproduction, not errored (TASK-180-018)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Case guard",
      "",
      "```bash",
      "X='<slot>'",
      'case "$X" in ok) ;; *) echo REFUSED; exit 1 ;; esac',
      "```",
      "",
    ].join("\n"),
  });
  const refusal = { exit: 1, stdout: "REFUSED\n" };
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Case guard",
      slot: "<slot>",
      cases: [
        fenceCase("f.ok", "legitimate", "ok"),
        fenceCase("f.bad", "hostile", "bad", { expected: refusal }),
        fenceCase("f.kill", "hostile", "'$(touch pwned; kill -9 $$)'", {
          expected: { ...refusal, absent: ["pwned"] },
        }),
      ],
      repoRoot: root,
    });
    assert.deepEqual(
      r.reproduced,
      probeShells().map((sh) => `f.kill@${sh}`),
      JSON.stringify(r.cases),
    );
    assert.notEqual(r.verdict, "engages");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a side effect expected.absent names is a reproduction even when the shell then stops (TASK-180-006)", () => {
  const root = fenceRoot({
    "doc.md": [
      "## Two contexts",
      "",
      "```bash",
      'echo "checking <slot>"',
      "x='<slot>'",
      "```",
      "",
    ].join("\n"),
  });
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Two contexts",
      slot: "<slot>",
      cases: [
        fenceCase("f.side", "hostile", "$(touch pwned)'", {
          expected: { exit: 0, stdout: "REFUSED\n", absent: ["pwned"] },
        }),
      ],
      repoRoot: root,
    });
    assert.deepEqual(
      r.reproduced,
      probeShells().map((s) => `f.side@${s}`),
      JSON.stringify(r.cases),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a declined fence: run keeps its slot, so its record key matches the corrected re-run (TASK-180-007)", () => {
  const root = fenceRoot({ "doc.md": FENCE_DOC });
  try {
    const r = runProbeSpec({
      entry: "fence:../elsewhere.md#Admit",
      slot: "<slot>",
      cases: ADMIT_CASES,
      repoRoot: root,
    });
    assert.equal(r.reason, "outside-repo-root");
    assert.equal(r.slot, "<slot>");
    assert.equal(toRecordEntry(r).slot, "<slot>");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fence entry: a CRLF doc resolves its heading and yields an LF block (TASK-180-008)", () => {
  const doc = FENCE_DOC.split("\n").join("\r\n");
  const got = extractFencedBlock(doc, "Admit");
  assert.equal(got.ok, true, got.detail);
  assert.equal(got.code.includes("\r"), false);
  assert.match(got.code, /GATE="<slot>"/);
});

// ── The shell-argv: entry form (task.181) ─────────────────────────────────────
//
// `shell-argv:<path>` + `--argv` runs a bash script that takes several
// arguments or flags, the case's input crossing as ONE element of the template,
// exactly as `cli:` runs a Node CLI. Each shell from probeShells() is the
// CALLER and bash the interpreter, as for `shell:`. An optional
// `--fixture-setup` script builds each (case, shell) directory first; a setup
// that fails is `errored`, never a verdict. The scripts are written into a temp
// ROOT per test and passed as `repoRoot`, so containment is exercised for real.

// Refuses (exit 1) unless $1 is a plain lower-case name and $2 a directory.
// A split input moves $# off 2: exit 7, which no case expects, so it scores as
// a reproduction. `${1,,}` is bash-only — under a zsh INTERPRETER it is a bad
// substitution, so a zsh-interpreted run could never accept "alpha".
const TWO_ARGS_SH = [
  "#!/usr/bin/env bash",
  "# Refuses rather than guesses: a name and a directory, nothing else.",
  '[ "$#" -eq 2 ] || { echo "argc=$#" >&2; exit 7; }',
  'lower="${1,,}"',
  '[[ "$1" =~ ^[a-z]+$ ]] && [ "$lower" = "$1" ] || { echo "REFUSED name" >&2; exit 1; }',
  '[ -d "$2" ] || { echo "REFUSED dir" >&2; exit 1; }',
  "exit 0",
  "",
].join("\n");

const SA_TEMPLATE = ["{input}", "{fixture}"];

// No `sink`: a materialised sink would also write the input as a file name in
// the case directory (cli:'s rule), which "../x" cannot be.
const saCase = (id, direction, input, extra = {}) => ({
  id,
  input,
  why: "shell-argv fixture",
  correct: direction === "hostile" ? "refused" : "admitted",
  direction,
  ...extra,
});

const SA_CASES = [
  saCase("sa.ok", "legitimate", "alpha"),
  saCase("sa.space", "hostile", "a b", { expected: { exit: 1 } }),
  saCase("sa.subst", "hostile", "$(touch PWNED)", {
    expected: { exit: 1, absent: ["PWNED"] },
  }),
  saCase("sa.dash", "hostile", "-n", { expected: { exit: 1 } }),
  saCase("sa.dotdot", "hostile", "../x", { expected: { exit: 1 } }),
];

/** A temp root with the two-args script plus `files`; returns the root. */
function saRoot(files = {}) {
  return fenceRoot({ "two-args.sh": TWO_ARGS_SH, ...files });
}

test("shell-argv entry: resolveEntry returns kind shell-argv with shell:'s containment, and refuses a hash or an escape", () => {
  const root = saRoot();
  try {
    assert.equal(SHELL_ARGV_PREFIX, "shell-argv:");
    const r = resolveEntry("shell-argv:two-args.sh", root);
    assert.equal(r.ok, true);
    assert.equal(r.kind, "shell-argv");
    assert.equal(r.entryPath, join(root, "two-args.sh"));
    assert.equal(
      resolveEntry("shell-argv:../outside.sh", root).reason,
      "outside-repo-root",
    );
    assert.equal(
      resolveEntry("shell-argv:/etc/x.sh", root).reason,
      "outside-repo-root",
    );
    assert.equal(
      resolveEntry("shell-argv:two-args.sh#f", root).reason,
      "bad-entry",
    );
    assert.equal(resolveEntry("shell-argv:", root).reason, "bad-entry");
    // The three shell prefixes are disjoint: neither older form claims it.
    assert.equal(resolveEntry("shell:two-args.sh", root).kind, "shell");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: every malformed flag combination exits 2 by name and writes no record", () => {
  const root = saRoot({ "setup.sh": "exit 0\n" });
  const dir = mkdtempSync(join(tmpdir(), "probe-sa-argv-"));
  try {
    const record = join(dir, "run.json");
    const combos = {
      "shell-argv: without --argv": [
        ["--entry", "shell-argv:two-args.sh"],
        /^bad-argv: .*needs --argv/,
      ],
      "--argv on a shell: entry": [
        ["--entry", "shell:two-args.sh", "--argv", '["{input}"]'],
        /^bad-argv: --argv applies to the cli: and shell-argv: entry forms only/,
      ],
      "--args-json with shell-argv:": [
        [
          "--entry",
          "shell-argv:two-args.sh",
          "--argv",
          '["{input}"]',
          "--args-json",
          "[]",
        ],
        /^bad-args: /,
      ],
      "--fixture-setup on a cli: entry": [
        [
          "--entry",
          "cli:x.mjs",
          "--argv",
          '["{input}"]',
          "--fixture-setup",
          "setup.sh",
        ],
        /^bad-fixture-setup: --fixture-setup applies to the shell-argv: entry form only/,
      ],
      "an embedded slot": [
        ["--entry", "shell-argv:two-args.sh", "--argv", '["--n={input}"]'],
        /^bad-argv: .*embeds \{input\}/,
      ],
    };
    for (const [name, [args, re]] of Object.entries(combos)) {
      const { rc, err } = runMain([
        "--sink",
        "filename",
        "--repo-root",
        root,
        ...args,
        "--record",
        record,
      ]);
      assert.equal(rc, 2, `${name}: exit 2 (stderr: ${err})`);
      assert.match(err, re, `${name}: names its rule`);
      assert.equal(existsSync(record), false, `${name}: no record`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: runProbeSpec declines bad-argv / bad-args for a library caller, and never runs a case", () => {
  const root = saRoot();
  try {
    const noArgv = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      cases: SA_CASES,
      repoRoot: root,
    });
    assert.equal(noArgv.reason, "bad-argv");
    assert.equal(noArgv.executed, 0);
    const onShell = runProbeSpec({
      sink: "filename",
      entry: "shell:two-args.sh",
      cases: SA_CASES,
      argv: ["{input}"],
      repoRoot: root,
    });
    assert.equal(onShell.reason, "bad-argv");
    assert.match(
      onShell.declined[0].detail,
      /cli: and shell-argv: entry forms only/,
    );
    const withArgs = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      cases: SA_CASES,
      argv: SA_TEMPLATE,
      args: [],
      repoRoot: root,
    });
    assert.equal(withArgs.reason, "bad-args");
    const setupOnShell = runProbeSpec({
      sink: "filename",
      entry: "shell:two-args.sh",
      cases: SA_CASES,
      fixtureSetup: "two-args.sh",
      repoRoot: root,
    });
    assert.equal(setupOnShell.reason, "bad-fixture-setup");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: {input} reaches the script as ONE element under every shell, bash interprets, and exit status is the verdict", () => {
  const root = saRoot();
  try {
    const r = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      cases: SA_CASES,
      argv: SA_TEMPLATE,
      repoRoot: root,
    });
    assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
    assert.deepEqual(r.shells, probeShells());
    assert.equal(r.executed, SA_CASES.length * probeShells().length);
    // A split input would exit 7 and reproduce; a zsh-interpreted run would
    // reject "alpha" on `${1,,}` and overblock it.
    assert.deepEqual(r.reproduced, [], JSON.stringify(r.cases));
    assert.deepEqual(r.overblocked, [], JSON.stringify(r.cases));
    assert.equal(r.verdict, "engages");
    assert.deepEqual(r.argv, SA_TEMPLATE);
    for (const shell of probeShells()) {
      const ok = r.cases.find((c) => c.id === "sa.ok" && c.shell === shell);
      assert.equal(ok?.outcome, "accepted", `alpha accepted under ${shell}`);
    }
    assert.deepEqual(r.escapes, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: every shell is the caller and bash the interpreter — held without zsh on the host", () => {
  const args = ["a b", "/tmp/f"];
  assert.deepEqual(shellArgvSpawnArgs("zsh", "/r/s.sh", args), [
    "-f",
    "-c",
    'bash "$@"',
    "zsh",
    "/r/s.sh",
    "a b",
    "/tmp/f",
  ]);
  // The body really does run the script under bash with the elements intact:
  // spawned here under bash as the caller, the script's own $BASH_VERSION and
  // $# answer.
  const root = fenceRoot({
    "who.sh": 'printf "%s|%s|%s" "${BASH_VERSION:+bash}" "$#" "$1"\n',
  });
  try {
    const r = spawnSync(
      "bash",
      shellArgvSpawnArgs("bash", join(root, "who.sh"), args),
      { encoding: "utf8" },
    );
    assert.equal(r.stdout, "bash|2|a b");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: a split {input} is caught — the discriminator the one-element rule rests on", () => {
  // The same script, called with the input spread over TWO elements by a
  // template that names the fixture twice: $# is 3, the script exits 7, and a
  // hostile case expecting exit 1 reproduces. Proves exit 7 is visible.
  const root = saRoot();
  try {
    const r = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      cases: [saCase("sa.space", "hostile", "a b", { expected: { exit: 1 } })],
      argv: ["{input}", "{fixture}", "{fixture}"],
      repoRoot: root,
    });
    assert.equal(r.reproduced.length, probeShells().length);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: --fixture-setup runs per (case, shell) before the script, after the case fixture is written", () => {
  const needsReady = [
    "#!/usr/bin/env bash",
    '[ -f "$2/ready" ] || { echo "REFUSED unready" >&2; exit 1; }',
    '[ "$1" = "alpha" ] || { echo "REFUSED" >&2; exit 1; }',
    "",
  ].join("\n");
  // The setup reads the case's own fixture file (written first) and its env.
  const setup = [
    "#!/usr/bin/env bash",
    'cd "$1" || exit 9',
    "[ -f seed.txt ] || exit 4",
    '[ "${PROBE_SEED_ENV:-}" = "yes" ] || exit 5',
    "touch ready",
    "",
  ].join("\n");
  const root = fenceRoot({ "needs-ready.sh": needsReady, "setup.sh": setup });
  try {
    const fixture = {
      files: { "seed.txt": "x" },
      env: { PROBE_SEED_ENV: "yes" },
    };
    const r = runProbeSpec({
      entry: "shell-argv:needs-ready.sh",
      cases: [
        saCase("sa.ok", "legitimate", "alpha", { fixture }),
        saCase("sa.bad", "hostile", "beta", { fixture, expected: { exit: 1 } }),
      ],
      argv: ["{input}", "{fixture}"],
      fixtureSetup: "setup.sh",
      repoRoot: root,
    });
    assert.deepEqual(r.declined, [], JSON.stringify(r.cases));
    assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
    assert.equal(r.fixtureSetup, join(root, "setup.sh"));
    assert.equal(toRecordEntry(r).fixture_setup, join(root, "setup.sh"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: a failing setup is errored for every (case, shell), never rejected", () => {
  const root = saRoot({ "setup-fails.sh": "exit 3\n" });
  try {
    const r = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      cases: SA_CASES,
      argv: SA_TEMPLATE,
      fixtureSetup: "setup-fails.sh",
      repoRoot: root,
    });
    assert.equal(r.executed, 0);
    assert.equal(r.verdict, "unverifiable");
    assert.equal(r.reason, "entry-not-probeable");
    assert.equal(r.cases.length, SA_CASES.length * probeShells().length);
    for (const c of r.cases) {
      assert.equal(c.outcome, "errored", JSON.stringify(c));
      assert.match(c.detail, /fixture setup exited 3/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: a setup outside the root, missing, or with a malformed case fixture is declined, not scored", () => {
  const root = saRoot();
  try {
    const outside = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      cases: SA_CASES,
      argv: SA_TEMPLATE,
      fixtureSetup: "../setup.sh",
      repoRoot: root,
    });
    assert.equal(outside.reason, "bad-fixture-setup");
    assert.match(outside.declined[0].detail, /outside/);
    const missing = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      cases: SA_CASES,
      argv: SA_TEMPLATE,
      fixtureSetup: "nope.sh",
      repoRoot: root,
    });
    assert.equal(missing.reason, "bad-fixture-setup");
    const badFixture = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      cases: [saCase("sa.ok", "legitimate", "alpha", { fixture: 3 })],
      argv: SA_TEMPLATE,
      repoRoot: root,
    });
    assert.equal(badFixture.executed, 0);
    assert.match(badFixture.cases[0].detail, /fixture/);
    const leaves = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      cases: [
        saCase("sa.ok", "legitimate", "alpha", {
          fixture: { files: { "../out.txt": "x" } },
        }),
      ],
      argv: SA_TEMPLATE,
      repoRoot: root,
    });
    assert.equal(leaves.executed, 0);
    assert.match(leaves.cases[0].detail, /leaves the case directory/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: a script or setup naming gh with no --fake-gh is declined needs-fake-gh", () => {
  const root = saRoot({
    "gh-script.sh": '#!/usr/bin/env bash\ngh issue view "$1"\n',
    // Named on a branch that never runs: only the pre-spawn read of the SETUP
    // can decline it — the run-time trip-wire never fires.
    "gh-setup.sh": "#!/usr/bin/env bash\nif false; then gh auth status; fi\n",
  });
  try {
    const script = runProbeSpec({
      entry: "shell-argv:gh-script.sh",
      cases: SA_CASES,
      argv: ["{input}"],
      repoRoot: root,
    });
    assert.equal(script.reason, "needs-fake-gh");
    const setup = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      cases: SA_CASES,
      argv: SA_TEMPLATE,
      fixtureSetup: "gh-setup.sh",
      repoRoot: root,
    });
    assert.equal(setup.reason, "needs-fake-gh");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: a timeout is errored, and a write outside the fixture is an escape", () => {
  const root = saRoot({
    "slow.sh": "#!/usr/bin/env bash\nsleep 5\n",
    "escapes.sh": '#!/usr/bin/env bash\ntouch "$HOME/pwned"\nexit 1\n',
  });
  try {
    const slow = runProbeSpec({
      entry: "shell-argv:slow.sh",
      cases: [saCase("sa.ok", "legitimate", "alpha")],
      argv: ["{input}"],
      timeoutMs: 300,
      repoRoot: root,
    });
    assert.equal(slow.executed, 0);
    for (const c of slow.cases) assert.equal(c.outcome, "errored");
    const esc = runProbeSpec({
      entry: "shell-argv:escapes.sh",
      cases: [saCase("sa.bad", "hostile", "x")],
      argv: ["{input}"],
      repoRoot: root,
    });
    assert.ok(esc.escapes.length > 0, JSON.stringify(esc));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: the record carries the argv template and setup, and two templates on one script are two controls", () => {
  const root = saRoot();
  const dir = mkdtempSync(join(tmpdir(), "probe-sa-rec-"));
  try {
    const record = join(dir, "run.json");
    for (const argv of [SA_TEMPLATE, ["{input}", "{fixture}", "--x"]]) {
      const r = runProbeSpec({
        entry: "shell-argv:two-args.sh",
        cases: SA_CASES,
        argv,
        repoRoot: root,
      });
      recordRun(record, r, {});
    }
    const controls = readRecord(record).controls;
    assert.equal(controls.length, 2);
    for (const c of controls) assert.ok(Array.isArray(c.argv));
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: the proof run — reenter-qa-after-finalise.sh is reached by the engine, every case past its usage line (task.181)", () => {
  const dir = mkdtempSync(join(tmpdir(), "probe-sa-proof-"));
  try {
    const record = join(dir, "run.json");
    const SA = "shared/resources/tests/fixtures/shell-argv";
    const { rc, out, err } = runMain([
      "--entry",
      "shell-argv:shared/resources/reenter-qa-after-finalise.sh",
      "--argv",
      '["{input}","docs/tasks/task.42.example/report.md"]',
      "--fixture-setup",
      `${SA}/reenter-qa-setup.sh`,
      "--cases-file",
      `${SA}/reenter-qa-cases.json`,
      "--record",
      record,
      "--json",
    ]);
    const r = JSON.parse(out);
    const cases = JSON.parse(
      readFileSync(join(REPO_ROOT, SA, "reenter-qa-cases.json"), "utf8"),
    );
    assert.equal(rc, 0, `stderr: ${err}\n${JSON.stringify(r.cases)}`);
    assert.equal(r.verdict, "engages");
    assert.deepEqual(r.declined, []);
    assert.equal(r.executed, cases.length * probeShells().length);
    // The usage line exits 2; every run here exits 0 (the re-entry) or 1 (a
    // refusal of the script's own), so none stopped at argument parsing.
    for (const c of r.cases) {
      assert.ok(c.exit === 0 || c.exit === 1, JSON.stringify(c));
    }
    const totals = readRecord(record);
    assert.ok(totals.totals.executed > 0);
    assert.equal(
      totals.controls[0].fixture_setup,
      join(REPO_ROOT, SA, "reenter-qa-setup.sh"),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── task.181 QA cycle 1 — TASK-181-001: a case fixture must not reach the host gh ──
//
// shell-argv: honours a case's fixture as fence: does, so it takes fence:'s two
// gh hardenings over it: the pre-spawn text check over fixture env values and
// file contents, and ghFreePath, which hides every PATH directory holding a gh.
// A fake "host" gh is planted on the test process's PATH, so both rows hold on a
// host with no real gh as well as one with it.

/** Run fn with a directory holding an executable `gh` first on process PATH. */
function withPlantedGh(fn) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "planted-gh-")));
  writeFileSync(join(dir, "gh"), "#!/bin/sh\necho planted-gh\n");
  chmodSync(join(dir, "gh"), 0o755);
  const saved = process.env.PATH;
  process.env.PATH = `${dir}:${saved ?? ""}`;
  try {
    return fn();
  } finally {
    process.env.PATH = saved;
    rmSync(dir, { recursive: true, force: true });
  }
}

test("shell-argv entry: a case fixture that names gh is declined needs-fake-gh before anything spawns (TASK-181-001)", () => {
  const root = saRoot({ "plain.sh": '#!/usr/bin/env bash\n[ -n "$1" ]\n' });
  try {
    const helper =
      'for p in $(type -ap gh); do case $p in *probe-harness*) ;; *) "$p" > ghran.txt 2>&1; break;; esac; done\n';
    for (const fixture of [
      { env: { BASH_ENV: "./helper.sh" }, files: { "helper.sh": helper } },
      { env: { PROBE_CMD: "gh auth status" } },
    ]) {
      const r = withPlantedGh(() =>
        runProbeSpec({
          entry: "shell-argv:plain.sh",
          argv: ["{input}"],
          cases: [
            saCase("sa.fx", "hostile", "x", {
              fixture,
              expected: { exit: 0, absent: ["ghran.txt"] },
            }),
          ],
          repoRoot: root,
        }),
      );
      assert.equal(r.reason, "needs-fake-gh", JSON.stringify(r.cases));
      assert.equal(r.executed, 0);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: a fixture that spells gh without naming it still finds no host gh on PATH (TASK-181-001, ghFreePath)", () => {
  const root = saRoot({ "plain.sh": '#!/usr/bin/env bash\n[ -n "$1" ]\n' });
  try {
    // `${G}h` with G=g spells gh without the text "gh" — only the PATH
    // shadowing can stop it.
    const helper =
      'for p in $(type -ap "${G}h"); do case $p in *probe-harness*) ;; *) "$p" > ghran.txt 2>&1; break;; esac; done\n';
    const r = withPlantedGh(() =>
      runProbeSpec({
        entry: "shell-argv:plain.sh",
        argv: ["{input}"],
        cases: [
          saCase("sa.fx", "hostile", "x", {
            fixture: {
              env: { BASH_ENV: "./helper.sh", G: "g" },
              files: { "helper.sh": helper },
            },
            expected: { exit: 0, absent: ["ghran.txt"] },
          }),
        ],
        repoRoot: root,
      }),
    );
    assert.deepEqual(r.reproduced, [], JSON.stringify(r.cases));
    assert.equal(r.executed, probeShells().length);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── task.181 QA cycle 2 — TASK-181-002 / -003: escape accounting for shell-argv: ──
//
// The setup builds its case directory and nothing else: a write elsewhere errors
// that run, named, and is never charged to the entry under probe (TASK-181-002).
// The entry's runs are watched beside the case directory as fence:'s are — the
// sentinel skips the work dir, so only the work-dir snapshot sees a write to a
// sibling case or a deletion in the harness dir (TASK-181-003).

test("shell-argv entry: a setup that writes outside its case directory errors the run and charges the entry nothing (TASK-181-002)", () => {
  const root = saRoot({
    "ok.sh": '#!/usr/bin/env bash\n[ "$1" = alpha ] || exit 1\n',
    "setup-tmp.sh": "#!/usr/bin/env bash\nmktemp >/dev/null\n",
    "setup-inside.sh":
      '#!/usr/bin/env bash\nmktemp "$1/scratch.XXXXXX" >/dev/null\n',
  });
  try {
    const cases = [
      saCase("a.ok", "legitimate", "alpha"),
      saCase("a.bad", "hostile", "beta"),
    ];
    const outside = runProbeSpec({
      entry: "shell-argv:ok.sh",
      argv: ["{input}"],
      fixtureSetup: "setup-tmp.sh",
      cases,
      repoRoot: root,
    });
    assert.deepEqual(outside.escapes, [], JSON.stringify(outside.escapes));
    assert.equal(outside.executed, 0);
    for (const c of outside.cases) {
      assert.equal(c.outcome, "errored");
      assert.match(c.detail, /fixture setup wrote outside the case directory/);
    }
    const inside = runProbeSpec({
      entry: "shell-argv:ok.sh",
      argv: ["{input}"],
      fixtureSetup: "setup-inside.sh",
      cases,
      repoRoot: root,
    });
    assert.deepEqual(inside.escapes, []);
    assert.equal(inside.verdict, "engages", JSON.stringify(inside.cases));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: a write beside the case directory, or a deletion in the harness, is an escape (TASK-181-003)", () => {
  const root = saRoot({
    "writes.sh": '#!/usr/bin/env bash\ntouch "$1"\nexit 1\n',
    "deletes.sh":
      "#!/usr/bin/env bash\nrm -f ../.probe-harness/bin/gh\nexit 1\n",
  });
  try {
    const up = runProbeSpec({
      entry: "shell-argv:writes.sh",
      argv: ["{input}"],
      cases: [saCase("w.up", "hostile", "../pwned", { expected: { exit: 1 } })],
      repoRoot: root,
    });
    assert.ok(
      up.escapes.some((e) => e.path.endsWith("/pwned")),
      JSON.stringify(up.escapes),
    );
    const del = runProbeSpec({
      entry: "shell-argv:deletes.sh",
      argv: ["{input}"],
      cases: [saCase("w.del", "hostile", "x", { expected: { exit: 1 } })],
      repoRoot: root,
    });
    assert.ok(
      del.escapes.some((e) => e.path.endsWith(".probe-harness/bin/gh")),
      JSON.stringify(del.escapes),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: a setup that is killed reports why, not always a timeout (CR-4)", () => {
  const root = saRoot({
    "slow-setup.sh": "#!/usr/bin/env bash\nsleep 5\n",
    "self-kill.sh": "#!/usr/bin/env bash\nkill -TERM $$\n",
  });
  try {
    const slow = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      argv: SA_TEMPLATE,
      fixtureSetup: "slow-setup.sh",
      cases: [saCase("sa.ok", "legitimate", "alpha")],
      timeoutMs: 300,
      repoRoot: root,
    });
    for (const c of slow.cases) assert.match(c.detail, /timed out after 300ms/);
    const killed = runProbeSpec({
      entry: "shell-argv:two-args.sh",
      argv: SA_TEMPLATE,
      fixtureSetup: "self-kill.sh",
      cases: [saCase("sa.ok", "legitimate", "alpha")],
      repoRoot: root,
    });
    for (const c of killed.cases) {
      assert.equal(c.outcome, "errored");
      assert.doesNotMatch(c.detail, /timed out/);
      assert.match(c.detail, /SIGTERM/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── task.181 /finalise DoD gaps — AC2 and AC6 members held by tests ──────────
//
// The DoD's quantifier rule (dod.1): every member of a set criterion needs its
// own test. AC2 lists `shell-fn:` among the forms `--argv` is still refused for;
// AC6 lists the run-time trip-wire and `--fake-gh` among the shell forms' `gh`
// handling `shell-argv:` takes.

test("shell-argv entry: --argv is still refused for a shell-fn: entry — CLI exit 2 and library decline (task.181 AC2)", () => {
  const root = fenceRoot({ "lib.sh": "f() { printf '%s\\n' \"$1\"; }\n" });
  const dir = mkdtempSync(join(tmpdir(), "probe-sa-fnargv-"));
  try {
    const record = join(dir, "run.json");
    const { rc, err } = runMain([
      "--sink",
      "filename",
      "--repo-root",
      root,
      "--entry",
      "shell-fn:lib.sh#f",
      "--argv",
      '["{input}"]',
      "--record",
      record,
    ]);
    assert.equal(rc, 2, err);
    assert.match(
      err,
      /^bad-argv: --argv applies to the cli: and shell-argv: entry forms only/,
    );
    assert.equal(existsSync(record), false);
    const r = runProbeSpec({
      sink: "filename",
      entry: "shell-fn:lib.sh#f",
      cases: SA_CASES,
      argv: ["{input}"],
      repoRoot: root,
    });
    assert.equal(r.reason, "bad-argv");
    assert.equal(r.executed, 0);
    assert.match(r.declined[0].detail, /cli: and shell-argv: entry forms only/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: a gh call the text check cannot see is caught by the run-time trip-wire and declined (task.181 AC6)", () => {
  // `X=gh; "$X"` names no `gh` the pre-spawn detector reads, so only the
  // trip-wire first on PATH can answer — and then nothing is scored.
  const root = saRoot({
    "calls-gh.sh":
      '#!/usr/bin/env bash\nX=gh\n"$X" auth status >/dev/null 2>&1\n[ "$1" = alpha ]\n',
  });
  try {
    const r = runProbeSpec({
      entry: "shell-argv:calls-gh.sh",
      cases: SA_CASES,
      argv: ["{input}"],
      repoRoot: root,
    });
    assert.equal(r.reason, "needs-fake-gh", JSON.stringify(r.declined));
    assert.equal(r.executed, 0);
    assert.match(r.declined[0].detail, /invoked .gh. at run time/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shell-argv entry: --fake-gh is accepted and its gh answers the run (task.181 AC6)", () => {
  // The script refuses unless the fake answered — so `alpha` accepted proves
  // the fake was first on PATH, armed with FAKE_GH=1.
  const root = saRoot({
    "fake/gh":
      '#!/bin/sh\n[ "$FAKE_GH" = 1 ] || { echo "FAKE_GH unset" >&2; exit 2; }\necho fake-gh-answered\n',
    "asks-gh.sh":
      '#!/usr/bin/env bash\nout=$(gh api x)\n[ "$out" = fake-gh-answered ] || exit 9\n[ "$1" = alpha ] || exit 1\n',
  });
  try {
    chmodSync(join(root, "fake/gh"), 0o755);
    const r = runProbeSpec({
      entry: "shell-argv:asks-gh.sh",
      cases: [
        saCase("sa.ok", "legitimate", "alpha"),
        saCase("sa.bad", "hostile", "beta", { expected: { exit: 1 } }),
      ],
      argv: ["{input}"],
      fakeGh: "fake",
      repoRoot: root,
    });
    assert.deepEqual(r.declined, [], JSON.stringify(r.cases));
    assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
    assert.equal(r.fakeGh, join(root, "fake"));
    assert.equal(toRecordEntry(r).fake_gh, join(root, "fake"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── task.190: refuse what the engine cannot score ─────────────────────────────

// runMain (above, with the cli: tests) captures main()'s stdout and stderr.

/** A temp dir holding a record path and a cases file; removed by the caller. */
function recordFixture(cases) {
  const dir = mkdtempSync(join(tmpdir(), "probe-t190-"));
  const record = join(dir, "run.json");
  const casesFile = join(dir, "cases.json");
  if (cases !== undefined) writeFileSync(casesFile, JSON.stringify(cases));
  return { dir, record, casesFile };
}

const noRecord = (record) =>
  !existsSync(record) && !existsSync(recordEntriesDir(record));

test("validateCases: an unknown direction is refused, naming the case and the accepted values (obs #201)", () => {
  const bad = validateCases([
    CASES[0],
    { ...CASES[3], id: "t.benign", direction: "benign" },
  ]);
  assert.deepEqual(bad, {
    id: "t.benign",
    field: "direction",
    value: "benign",
    accepted: [...DIRECTIONS],
  });
});

test("validateCases: a present sink outside SINKS is refused; an absent sink is not (control)", () => {
  assert.deepEqual(validateCases([{ ...CASES[0], sink: "nope" }]), {
    id: CASES[0].id,
    field: "sink",
    value: "nope",
    accepted: [...SINKS],
  });
  // Control: sink is optional on a case — the run's sink applies. The check
  // must not over-fire on an absent optional field.
  const { sink, ...noSink } = CASES[3];
  assert.equal(sink, "url-authority");
  assert.equal(validateCases([{ ...noSink, direction: "legitimate" }]), null);
  assert.equal(validateCases(CASES), null);
});

test("validateCases: a null sink is absent, as the readers' `c.sink ?? sink` treat it (CR-3)", () => {
  assert.equal(validateCases([{ ...CASES[0], sink: null }]), null);
});

test("describeBadCase never throws: a BigInt or circular value still renders (CR-2)", () => {
  const circular = {};
  circular.self = circular;
  for (const value of [10n, circular]) {
    const line = describeBadCase({
      id: "c1",
      field: "sink",
      value,
      accepted: ["a"],
    });
    assert.match(line, /^case "c1" has sink .+; accepted: a$/);
  }
  // Control: a JSON value renders as before.
  assert.equal(
    describeBadCase({
      id: "c1",
      field: "sink",
      value: "nope",
      accepted: ["a"],
    }),
    'case "c1" has sink "nope"; accepted: a',
  );
});

test("validateCases: a non-array file and a non-object case are refused; an id-less case is named by index", () => {
  assert.equal(validateCases({ cases: [] }).field, "cases");
  assert.deepEqual(validateCases([CASES[0], "x"]), {
    id: "#1",
    field: "case",
    value: "string",
    accepted: ["object"],
  });
  assert.equal(validateCases([null]).value, "null");
  assert.equal(validateCases([{ direction: "sideways" }]).id, "#0");
});

test("validateCases: every case of every sink's corpus passes — a failure is a corpus bug", () => {
  let n = 0;
  for (const sink of SINKS) {
    const cases = corpusFor(sink);
    n += cases.length;
    assert.equal(validateCases(cases), null, sink);
  }
  assert.ok(n > 0, "the corpus loop measured something");
});

test("CLI: a cases file with an unknown direction exits 2 bad-cases, runs nothing and writes no record", () => {
  const fx = recordFixture([
    ...CASES,
    { ...CASES[3], id: "t.benign", direction: "benign" },
  ]);
  try {
    const r = runMain([
      "--entry",
      entry("engaging-control"),
      "--cases-file",
      fx.casesFile,
      "--record",
      fx.record,
    ]);
    assert.equal(r.rc, 2, r.err);
    assert.match(
      r.err,
      /^bad-cases: case "t\.benign" has direction "benign"; accepted: hostile, legitimate\n$/,
    );
    assert.equal(r.out, "", "nothing ran: no verdict line");
    assert.ok(noRecord(fx.record), "no record written");
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
  }
});

test("CLI: a case sink outside SINKS exits 2 bad-cases with the sink list; --json prints the reason", () => {
  const fx = recordFixture([{ ...CASES[0], sink: "nope" }]);
  try {
    const r = runMain([
      "--entry",
      entry("engaging-control"),
      "--cases-file",
      fx.casesFile,
      "--record",
      fx.record,
      "--json",
    ]);
    assert.equal(r.rc, 2, r.err);
    assert.match(
      r.err,
      new RegExp(`has sink "nope"; accepted: ${SINKS.join(", ")}`),
    );
    const j = JSON.parse(r.out);
    assert.equal(j.reason, "bad-cases");
    assert.match(j.detail, /case "t\.slash" has sink "nope"/);
    assert.ok(noRecord(fx.record));
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
  }
});

test("CLI control: a valid cases file runs and records as before", () => {
  const fx = recordFixture(CASES);
  try {
    const r = runMain([
      "--entry",
      entry("engaging-control"),
      "--cases-file",
      fx.casesFile,
      "--record",
      fx.record,
    ]);
    assert.equal(r.rc, 0, r.err);
    assert.match(r.out, /^engages /);
    const rec = readRecord(fx.record);
    assert.equal(rec.controls.length, 1);
    assert.equal(rec.controls[0].executed, CASES.length);
    assert.deepEqual(rec.controls[0].declined_cases, []);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
  }
});

test("runProbeSpec: supplied cases the scorer cannot place are declined bad-cases before any case runs", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: [{ ...CASES[0], direction: "benign" }],
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "bad-cases");
  assert.equal(r.executed, 0);
  assert.match(
    r.declined[0].detail,
    /has direction "benign"; accepted: hostile, legitimate/,
  );
});

test("runProbeSpec: a BigInt or circular case value is declined bad-cases, not thrown (CR-2)", () => {
  const circular = {};
  circular.self = circular;
  for (const sink of [10n, circular]) {
    const r = runProbeSpec({
      sink: "url-authority",
      entry: entry("engaging-control"),
      cases: [{ ...CASES[0], sink }],
    });
    assert.equal(r.reason, "bad-cases");
    assert.equal(r.executed, 0);
  }
});

test("CLI: a missing entry exits 2 entry-not-found and writes no record, for every entry form with a path (obs #211)", () => {
  const missing = `${FIXTURES}/t190-does-not-exist`;
  const forms = [
    ["js", [`${missing}.mjs#validateHost`]],
    ["shell", [`shell:${missing}.sh`]],
    ["shell-fn", [`shell-fn:${missing}.sh#fn`]],
    ["cli", [`cli:${missing}.mjs`, "--argv", '["{input}"]']],
    ["shell-argv", [`shell-argv:${missing}.sh`, "--argv", '["{input}"]']],
    ["fence", [`fence:${missing}.md#Heading`, "--slot", "<x>"]],
  ];
  for (const [form, [ent, ...rest]] of forms) {
    const fx = recordFixture();
    try {
      const r = runMain([
        "--sink",
        "filename",
        "--entry",
        ent,
        ...rest,
        "--record",
        fx.record,
        "--json",
        "--repo-root",
        REPO_ROOT,
      ]);
      assert.equal(r.rc, 2, `${form}: ${r.err}`);
      assert.ok(r.err.startsWith("entry-not-found: "), `${form}: ${r.err}`);
      assert.ok(r.err.includes("t190-does-not-exist"), form);
      assert.ok(r.err.includes(`(repo root ${REPO_ROOT})`), form);
      assert.equal(JSON.parse(r.out).reason, "entry-not-found", form);
      assert.ok(noRecord(fx.record), `${form}: no record written`);
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  }
});

test("CLI: a resolveEntry failure is left to runProbeSpec — an escape is still declined, not refused as missing", () => {
  const r = runMain([
    "--sink",
    "url-authority",
    "--entry",
    "../outside.mjs#f",
    "--json",
    "--repo-root",
    REPO_ROOT,
  ]);
  assert.equal(r.rc, 1, r.err);
  assert.equal(JSON.parse(r.out).reason, "outside-repo-root");
});

test("toRecordEntry carries each declined case's id, reason and detail beside the count (obs #207)", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("not-a-function"),
    cases: CASES,
  });
  assert.equal(r.declined.length, 1);
  const fx = recordFixture();
  try {
    recordRun(fx.record, r, { name: "t190" });
    const row = readRecord(fx.record).controls[0];
    assert.equal(row.declined, 1);
    assert.deepEqual(row.declined_cases, [
      {
        id: r.declined[0].id,
        reason: r.declined[0].reason,
        detail: r.declined[0].detail,
      },
    ]);
    assert.match(row.declined_cases[0].detail, /not a function/);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
  }
});

/**
 * Copy the engine and its sibling imports, walked transitively from the source,
 * into `dest`. A hand list of the imports goes stale the first time the engine
 * gains one (review-security.test.js, task.128).
 */
function copyEngine(dest) {
  const src = join(__dirname, "..");
  const seen = new Set();
  const walk = (f) => {
    if (seen.has(f)) return;
    seen.add(f);
    const text = readFileSync(join(src, f), "utf8");
    for (const m of text.matchAll(
      /(?:from|import)\s+["']\.\/([A-Za-z0-9._-]+\.m?js)["']/g,
    )) {
      walk(m[1]);
    }
  };
  walk("security-probe.mjs");
  mkdirSync(dest, { recursive: true });
  for (const f of seen) cpSync(join(src, f), join(dest, f));
  return join(dest, "security-probe.mjs");
}

/** defaultRepoRoot() as the copy at `engine` computes it, run from `cwd`. */
function rootFrom(engine, cwd, env = process.env) {
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "const m = await import(process.argv[1]); process.stdout.write(m.defaultRepoRoot());",
      pathToFileURL(engine).href,
    ],
    { cwd, encoding: "utf8", env },
  );
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

test("defaultRepoRoot: a bundled copy defaults to the git top level; a shared/resources copy to two up; no git falls back (obs #211)", () => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "probe-t190-root-")));
  try {
    const repo = join(base, "repo");
    mkdirSync(repo);
    const init = spawnSync("git", ["init", "-q", repo], { encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    // A bundled copy: two levels up is <repo>/skills, not the repository.
    const bundled = copyEngine(join(repo, "skills", "x", "references"));
    assert.equal(rootFrom(bundled, repo), repo);
    // A source-tree copy under a nested shared/resources: two levels up, which
    // here is NOT the git top level — so the result tells the branches apart.
    const source = copyEngine(join(repo, "sub", "shared", "resources"));
    assert.equal(rootFrom(source, repo), join(repo, "sub"));
    // Outside any git checkout: git fails and the copy falls back to two up.
    const loose = copyEngine(join(base, "loose", "a", "references"));
    const env = { ...process.env, GIT_CEILING_DIRECTORIES: base };
    delete env.GIT_DIR;
    delete env.GIT_WORK_TREE;
    assert.equal(
      rootFrom(loose, join(base, "loose"), env),
      join(base, "loose"),
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ── Path assertions: nested `absent` and `removed` (task.232) ───────────────
//
// `absent` and `removed` take a path relative to the case directory, and one
// helper, pathAssertionProblem, decides for every runner whether the paths
// can be scored. The runner rows run on all five forms that read `expected`,
// because each builds the list of what its fixture creates in its own way: a
// rule held on one form says nothing about another (TASK-181-001).

test("expectedProblem: absent and removed take relative paths inside the case directory, and refuse the rest", () => {
  const valid = ["pwned", "a/b", ".claude/state/x", "./a", "a//b", "a/"];
  const refused = [
    "",
    ".",
    "..",
    "a/..",
    // normalize keeps a trailing separator: each of these is the case
    // directory itself, which always exists (QA1-2)
    "./",
    ".//",
    "a/../",
    "a/./..//",
    "../",
    "../a",
    "/abs",
    "a/../../b",
    "a\0b",
    5,
  ];
  for (const k of ["absent", "removed"]) {
    for (const p of valid) {
      assert.equal(expectedProblem({ exit: 0, [k]: [p] }), null, `${k} ${p}`);
    }
    for (const p of refused) {
      assert.match(
        expectedProblem({ exit: 0, [k]: [p] }),
        new RegExp(`expected\\.${k}.*must be an array of relative paths`),
        `${k} ${JSON.stringify(p)}`,
      );
    }
    for (const v of [5, "x", null, {}]) {
      assert.match(
        expectedProblem({ exit: 0, [k]: v }),
        new RegExp(`expected\\.${k}.*must be an array`),
        `${k} ${JSON.stringify(v)}`,
      );
    }
  }
  // `removed` compares nothing on its own, as `absent` does not: a script that
  // deletes everything satisfies it.
  assert.match(expectedProblem({ removed: ["a"] }), /compares nothing/);
});

test("expectedProblem: against the engine before task.232, the only absent shape that flips is an in-directory nested path (review 1, I4)", () => {
  // `base` is what the engine at develop 0b714103 returned for `absent: [v]`,
  // measured on 2026-10-25 before the change (implementation report, Step 3).
  // Every base refusal still refuses, every base acceptance still accepts, and
  // a row may flip only refuse → accept, and only when it stays in the case
  // directory.
  const rows = [
    ["", "refuse", "refuse"],
    [".", "refuse", "refuse"],
    ["..", "refuse", "refuse"],
    ["a\0b", "refuse", "refuse"],
    [5, "refuse", "refuse"],
    ["pwned", "accept", "accept"],
    ["PWNED2", "accept", "accept"],
    [".hidden", "accept", "accept"],
    ["../a", "refuse", "refuse"],
    ["/abs", "refuse", "refuse"],
    ["a/../../b", "refuse", "refuse"],
    ["a/..", "refuse", "refuse"],
    ["a/b", "refuse", "accept"],
    [".claude/state/x", "refuse", "accept"],
    ["./a", "refuse", "accept"],
    ["a//b", "refuse", "accept"],
    ["a/", "refuse", "accept"],
    // The case directory spelled with a trailing separator (QA1-2): base
    // refused every "/", and head must too.
    ["./", "refuse", "refuse"],
    ["a/../", "refuse", "refuse"],
  ];
  for (const [v, base, head] of rows) {
    const got =
      expectedProblem({ exit: 0, absent: [v] }) === null ? "accept" : "refuse";
    assert.equal(got, head, JSON.stringify(v));
    if (base !== head) {
      assert.equal(base, "refuse", `${JSON.stringify(v)} may only widen`);
      // A flip names a path strictly inside the case directory: resolved
      // against a root, it is neither the root nor outside it. A syntactic
      // "has a slash, no .. segment" test passed "./" (QA1-2).
      const root = join(sep, "case-root");
      const at = join(root, String(v));
      assert.ok(
        typeof v === "string" &&
          !v.startsWith("/") &&
          at !== root &&
          at.replace(/\/+$/, "") !== root &&
          at.startsWith(root + sep),
        `${JSON.stringify(v)} flips but is not a path strictly inside the case directory`,
      );
    }
  }
  // The non-array shapes base refused are still refused.
  for (const v of [5, "x", null, {}]) {
    assert.notEqual(expectedProblem({ exit: 0, absent: v }), null);
  }
});

test("pathAssertionProblem: an absent path the fixture creates, or an ancestor of one, is declined — normalised and case-folded", () => {
  // The five rows of the fence arm's TASK-180-004 test, now on every form.
  for (const [created, absent] of [
    [["pwned"], ["pwned"]],
    [["dir/x"], ["dir"]],
    [["./pwned"], ["pwned"]],
    [["b/../pwned"], ["pwned"]],
    [["PWNED"], ["pwned"]],
    [["sub/marker"], ["sub/marker"]],
    [["sub/marker"], ["./sub//marker"]],
    // A trailing separator is the same path to the scorer (QA1-3).
    [["sub/marker"], ["sub/"]],
    [["sub/marker"], ["./sub//"]],
    [["sub/marker"], ["sub/marker/"]],
    [["pwned"], ["pwned/"]],
  ]) {
    assert.match(
      pathAssertionProblem({ exit: 0, absent }, created),
      /names "[^"]+", which the fixture itself creates/,
      JSON.stringify([created, absent]),
    );
  }
});

test("pathAssertionProblem: an absent path beneath a file the fixture creates is declined — it can never exist", () => {
  for (const [created, absent] of [
    [["f"], ["f/x"]],
    [["F"], ["f/x"]],
    [["a/b"], ["a/b/c/d"]],
  ]) {
    assert.match(
      pathAssertionProblem({ exit: 0, absent }, created),
      /beneath a file the fixture creates — it can never exist/,
      JSON.stringify([created, absent]),
    );
  }
});

test("pathAssertionProblem: removed must name a path the fixture creates, matched exactly — never case-folded (review 1, C1)", () => {
  assert.match(
    pathAssertionProblem({ exit: 0, removed: ["nothere"] }, ["a"]),
    /names "nothere", which the fixture does not create — it would pass with nothing removed/,
  );
  // On a case-sensitive filesystem `foo` never exists beside a fixture `Foo`,
  // so a folded match would pass with nothing removed.
  assert.match(
    pathAssertionProblem({ exit: 0, removed: ["foo"] }, ["Foo"]),
    /which the fixture does not create/,
  );
  // An ancestor directory of a created file is not a created path.
  assert.match(
    pathAssertionProblem({ exit: 0, removed: ["sub"] }, ["sub/t"]),
    /which the fixture does not create/,
  );
  assert.equal(
    pathAssertionProblem({ exit: 0, removed: ["foo"] }, ["foo"]),
    null,
  );
  assert.equal(
    pathAssertionProblem({ exit: 0, removed: ["./sub//t"] }, ["sub/t"]),
    null,
  );
});

test("pathAssertionProblem: a path in both lists is declined by the other two rules; one in neither, or no paths at all, passes (review 1, I5)", () => {
  const both = { exit: 0, absent: ["a"], removed: ["a"] };
  assert.match(pathAssertionProblem(both, ["a"]), /fixture itself creates/);
  assert.match(pathAssertionProblem(both, []), /fixture does not create/);
  // Prefixes are not ancestors.
  assert.equal(pathAssertionProblem({ exit: 0, absent: ["a"] }, ["ab"]), null);
  assert.equal(pathAssertionProblem({ exit: 0, absent: ["ab"] }, ["a"]), null);
  assert.equal(pathAssertionProblem({ exit: 0, absent: ["b/c"] }, ["a"]), null);
  assert.equal(pathAssertionProblem({ exit: 0 }, ["a"]), null);
  assert.equal(pathAssertionProblem(undefined, ["a"]), null);
});

// The five forms. Each runs one case that performs `action` in its case
// directory — `nested-write` writes sub/marker, `remove` deletes the form's
// `made` path, `keep` does nothing, `symlink-out` plants out -> / — and prints
// ok. `made` is a path the form's own fixture creates: the input file for
// shell:, a sink control for shell-fn: (which writes no input file), and a
// nested `fixture.files` key for the three forms that take one.
const PA_SCRIPT = {
  "nested-write": "nested-write",
  remove: "remover",
  keep: "non-remover",
  "symlink-out": "symlink-out",
};
const PA_FENCE_DOC = [
  "## P",
  "",
  "```bash",
  'case "<slot>" in',
  "  nested-write) mkdir -p sub && : > sub/marker ;;",
  "  remove) rm -f target sub/target ;;",
  "  symlink-out) ln -s / out ;;",
  "esac",
  "printf 'ok\\n'",
  "```",
  "",
].join("\n");
const paCase = (action, expected, direction) => ({
  id: `pa.${action}`,
  why: "task.232 path assertion",
  correct: direction === "hostile" ? "refused" : "admitted",
  direction,
  expected,
});
const PA_FILES = { "sub/target": "" };
const PATH_FORMS = [
  {
    name: "shell:",
    made: "target",
    run: (action, expected, direction) =>
      runProbeSpec({
        sink: "filename",
        entry: `shell:${SHELL_FIXTURES}/${PA_SCRIPT[action]}.sh`,
        cases: [{ ...paCase(action, expected, direction), input: "target" }],
      }),
  },
  {
    name: "shell-fn:",
    made: "~.gate.12.control.yml",
    run: (action, expected, direction) =>
      runProbeSpec({
        sink: "filename",
        entry: `shell-fn:${SHELL_FIXTURES}/path-actions-lib.sh#path_action`,
        cases: [{ ...paCase(action, expected, direction), input: action }],
      }),
  },
  {
    name: "cli:",
    made: "sub/target",
    run: (action, expected, direction) =>
      runProbeSpec({
        sink: "url-authority",
        entry: CLI("path-actions"),
        argv: ["{input}"],
        cases: [
          {
            ...paCase(action, expected, direction),
            input: action,
            fixture: { files: PA_FILES },
          },
        ],
      }),
  },
  {
    name: "shell-argv:",
    made: "sub/target",
    run: (action, expected, direction) =>
      runProbeSpec({
        entry: `shell-argv:${SHELL_FIXTURES}/${PA_SCRIPT[action]}.sh`,
        argv: ["{input}"],
        cases: [
          {
            ...paCase(action, expected, direction),
            input: action,
            fixture: { files: PA_FILES },
          },
        ],
      }),
  },
  {
    name: "fence:",
    made: "sub/target",
    run: (action, expected, direction) => {
      const root = fenceRoot({ "doc.md": PA_FENCE_DOC });
      try {
        return runProbeSpec({
          entry: "fence:doc.md#P",
          slot: "<slot>",
          cases: [
            fenceCase(`pa.${action}`, direction, action, {
              fixture: { files: PA_FILES },
              expected,
            }),
          ],
          repoRoot: root,
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
];

/** Every result row of a one-case run: one per shell, or one for cli:. */
function paRows(r) {
  assert.ok(r.cases.length >= 1, JSON.stringify(r));
  return r.cases;
}

for (const form of PATH_FORMS) {
  test(`${form.name} path assertions: a nested absent side effect is caught`, () => {
    const r = form.run(
      "nested-write",
      { stdout: "ok\n", absent: ["sub/marker"] },
      "hostile",
    );
    for (const row of paRows(r)) {
      assert.equal(row.outcome, "accepted", JSON.stringify(row));
      assert.match(row.detail, /sub\/marker was created/, row.detail);
    }
  });

  test(`${form.name} path assertions: an absent path the fixture creates is declined`, () => {
    // Spelled as the fixture writes it, and with a trailing separator, which
    // the scorer resolves to the same path (QA1-3).
    for (const spelling of [form.made, `${form.made}/`]) {
      const r = form.run(
        "keep",
        { stdout: "ok\n", absent: [spelling] },
        "hostile",
      );
      assert.equal(r.executed, 0, `${spelling}: ${JSON.stringify(r.cases)}`);
      for (const row of paRows(r)) {
        assert.equal(row.outcome, "errored", JSON.stringify(row));
        assert.match(
          row.detail,
          /which the fixture itself creates/,
          row.detail,
        );
      }
    }
  });

  test(`${form.name} path assertions: an absent path beneath a file the fixture creates is declined`, () => {
    const r = form.run(
      "keep",
      { stdout: "ok\n", absent: [`${form.made}/x`] },
      "hostile",
    );
    assert.equal(r.executed, 0, JSON.stringify(r.cases));
    for (const row of paRows(r)) {
      assert.match(
        row.detail,
        /beneath a file the fixture creates/,
        row.detail,
      );
    }
  });

  test(`${form.name} path assertions: a removed path the run deletes passes`, () => {
    const r = form.run(
      "remove",
      { stdout: "ok\n", removed: [form.made] },
      "legitimate",
    );
    assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
    for (const row of paRows(r)) {
      assert.equal(row.outcome, "accepted", JSON.stringify(row));
    }
  });

  test(`${form.name} path assertions: a removed path the run leaves is a mismatch`, () => {
    const r = form.run(
      "keep",
      { stdout: "ok\n", removed: [form.made] },
      "legitimate",
    );
    assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
    for (const row of paRows(r)) {
      assert.equal(row.outcome, "rejected", JSON.stringify(row));
      assert.match(row.detail, / was not removed/, row.detail);
    }
  });

  test(`${form.name} path assertions: a removed path the fixture does not create is declined`, () => {
    for (const removed of [["nothere"], [form.made.toUpperCase()]]) {
      const r = form.run("remove", { stdout: "ok\n", removed }, "legitimate");
      assert.equal(r.executed, 0, JSON.stringify(r.cases));
      for (const row of paRows(r)) {
        assert.match(
          row.detail,
          /which the fixture does not create/,
          row.detail,
        );
      }
    }
  });

  test(`${form.name} path assertions: a path whose ancestor resolves outside the case directory is a mismatch, never read through`, () => {
    // out -> /, so out/tmp is the host's /tmp, which exists: an existence
    // check that followed the link would report "out/tmp was created".
    const r = form.run(
      "symlink-out",
      { stdout: "ok\n", absent: ["out/tmp"] },
      "hostile",
    );
    for (const row of paRows(r)) {
      assert.equal(row.outcome, "accepted", JSON.stringify(row));
      assert.match(
        row.detail,
        /out\/tmp: an ancestor resolves outside the case directory/,
        row.detail,
      );
      assert.doesNotMatch(row.detail, /was created/, row.detail);
    }
  });
}

test("shell-argv path assertions: a recursive cleanup the change never mentions is scored by removed (obs #176 control)", () => {
  const files = { "tmp/a": "", "tmp/b": "" };
  const cases = [
    saCase("rt.clean", "legitimate", "tmp", {
      fixture: { files },
      expected: { stdout: "ok\n", exit: 0, removed: ["tmp/a", "tmp/b"] },
    }),
    saCase("rt.dry", "legitimate", "--dry-run", {
      fixture: { files },
      expected: { stdout: "ok\n", exit: 0, removed: ["tmp/a", "tmp/b"] },
    }),
  ];
  const r = runProbeSpec({
    entry: `shell-argv:${SHELL_FIXTURES}/rm-tree.sh`,
    argv: ["{input}"],
    cases,
  });
  assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
  for (const shell of probeShells()) {
    const clean = r.cases.find((c) => c.id === "rt.clean" && c.shell === shell);
    assert.equal(clean?.outcome, "accepted", JSON.stringify(clean));
    const dry = r.cases.find((c) => c.id === "rt.dry" && c.shell === shell);
    assert.equal(dry?.outcome, "rejected", JSON.stringify(dry));
    assert.match(dry.detail, /tmp\/a was not removed/);
  }
});

test("task.227 regression: the two --complete cleanup cases, rewritten with removed, are executed and accepted under every shell", () => {
  const all = JSON.parse(
    readFileSync(
      join(
        REPO_ROOT,
        "docs/tasks/task.227.step-8-checklist-no-rm/task.227.dod.1.security.cases.3.json",
      ),
      "utf8",
    ),
  );
  const ids = ["complete.ok-clear-no-lock", "complete.ok-clear-with-lock"];
  const cases = all
    .filter((c) => ids.includes(c.id))
    .map(({ expected: { absent, ...rest }, ...c }) => ({
      ...c,
      expected: { ...rest, removed: absent },
    }));
  assert.equal(cases.length, 2);
  const r = runProbeSpec({
    entry: "shell-argv:shared/resources/advance-pipeline-lock.sh",
    argv: ["{input}"],
    cases,
  });
  assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
  assert.equal(r.executed, ids.length * probeShells().length);
  for (const shell of probeShells()) {
    for (const id of ids) {
      const row = r.cases.find((c) => c.id === id && c.shell === shell);
      assert.equal(row?.outcome, "accepted", JSON.stringify(row));
    }
  }
});

test("fence entry: a dangling symlink expected.absent names is a reproduction even when the shell then stops — the leaf is lstat'd, not followed (task.232)", () => {
  // TASK-180-006's shape with the side effect a link to nowhere: existsSync
  // follows it, finds nothing, and the stopped shell read as errored.
  const root = fenceRoot({
    "doc.md": [
      "## Two contexts",
      "",
      "```bash",
      'echo "checking <slot>"',
      "x='<slot>'",
      "```",
      "",
    ].join("\n"),
  });
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Two contexts",
      slot: "<slot>",
      cases: [
        fenceCase("f.link", "hostile", "$(ln -s /nonexistent-t232 pwned)'", {
          expected: { exit: 0, stdout: "REFUSED\n", absent: ["pwned"] },
        }),
      ],
      repoRoot: root,
    });
    assert.deepEqual(
      r.reproduced,
      probeShells().map((s) => `f.link@${s}`),
      JSON.stringify(r.cases),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("caseKey: one spelling per case path — normalised, trailing separators dropped; isCasePath compares by it (QA1-2, QA1-3)", () => {
  for (const [p, key] of [
    ["sub/", "sub"],
    ["./sub//", "sub"],
    ["a//b/", "a/b"],
    ["./", "."],
    ["a/../", "."],
    ["a/./..//", "."],
    ["pwned", "pwned"],
  ]) {
    assert.equal(caseKey(p), key, JSON.stringify(p));
  }
  // Exported, so the probe's JS entry form reaches the boundary (QA1-5).
  for (const p of ["./", ".//", "a/../", "../", "", "/abs", "a\0b"]) {
    assert.equal(isCasePath(p), false, JSON.stringify(p));
  }
  for (const p of ["sub/", "a/b", ".claude/state/x", "./a"]) {
    assert.equal(isCasePath(p), true, JSON.stringify(p));
  }
});

test("fence entry: an absent path the run left unreadable is a reproduction even when the shell then stops (QA2-2)", () => {
  // The run plants loop -> loop, so lstat of loop/x is ELOOP: neither present
  // nor missing. It is still a side effect, and it outranks the stopped shell.
  const root = fenceRoot({
    "doc.md": [
      "## Two contexts",
      "",
      "```bash",
      'echo "checking <slot>"',
      "x='<slot>'",
      "```",
      "",
    ].join("\n"),
  });
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Two contexts",
      slot: "<slot>",
      cases: [
        fenceCase("f.loop", "hostile", "$(ln -s loop loop)'", {
          expected: { exit: 0, stdout: "REFUSED\n", absent: ["loop/x"] },
        }),
      ],
      repoRoot: root,
    });
    assert.deepEqual(
      r.reproduced,
      probeShells().map((s) => `f.loop@${s}`),
      JSON.stringify(r.cases),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/** A fence document whose one block runs the case's input, then prints `ok`. */
const OK_BLOCK = {
  "doc.md": ["## Block", "", "```bash", "<slot>", 'echo "ok"', "```", ""].join(
    "\n",
  ),
};

/**
 * Run `fn` with TMPDIR pointed at a fresh directory, so the probe's sandbox
 * (`mkdtempSync(join(tmpdir(), …))`) lands there. Returns `fn`'s result and
 * what is left in that directory afterwards: a sandbox the teardown did not
 * remove (task.234).
 */
function withFreshTmpdir(fn) {
  const tmp = mkdtempSync(join(tmpdir(), "t234-tmp-"));
  const saved = process.env.TMPDIR;
  process.env.TMPDIR = tmp;
  try {
    const result = fn();
    return { result, left: readdirSync(tmp) };
  } finally {
    if (saved === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = saved;
    spawnSync("chmod", ["-R", "u+rwx", tmp], { stdio: "ignore" });
    rmSync(tmp, { recursive: true, force: true });
  }
}

test("runProbeSpec: a case that leaves a mode-000 directory still returns its results — the sandbox teardown restores permissions (QA2-1)", (t) => {
  // Root reads through mode 000, so rmSync never fails there.
  if (process.getuid?.() === 0) return t.skip("root reads through mode 000");
  const root = fenceRoot(OK_BLOCK);
  try {
    const { result: r, left } = withFreshTmpdir(() =>
      runProbeSpec({
        entry: "fence:doc.md#Block",
        slot: "<slot>",
        cases: [
          fenceCase(
            "f.lock",
            "hostile",
            "mkdir -p locked && chmod 000 locked",
            {
              expected: { exit: 0, stdout: "ok\n", absent: ["pwned"] },
            },
          ),
        ],
        repoRoot: root,
      }),
    );
    assert.equal(r.cases.length, probeShells().length, JSON.stringify(r.cases));
    for (const row of r.cases) {
      assert.equal(row.outcome, "rejected", JSON.stringify(row));
    }
    assert.deepEqual(left, [], "the probe sandbox was not removed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runProbeSpec: a case that nests past PATH_MAX and leaves a mode-000 leaf still returns its results, and its sandbox is removed (task.234 A)", (t) => {
  if (process.getuid?.() === 0) return t.skip("root reads through mode 000");
  // Built by relative mkdir + cd, so the case never needs a path past PATH_MAX;
  // 30 × 200 bytes is ~6,000, past Linux's 4,096. An absolute-path walk stops
  // at ENAMETOOLONG and never reaches the leaf.
  const seg = "a".repeat(200);
  const deep = `for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do mkdir ${seg} && cd ${seg} || exit 1; done; mkdir locked && chmod 000 locked`;
  const root = fenceRoot(OK_BLOCK);
  try {
    const { result: r, left } = withFreshTmpdir(() =>
      runProbeSpec({
        entry: "fence:doc.md#Block",
        slot: "<slot>",
        cases: [
          fenceCase("f.deep", "hostile", deep, {
            expected: { exit: 0, stdout: "ok\n", absent: ["pwned"] },
          }),
        ],
        repoRoot: root,
      }),
    );
    assert.equal(r.cases.length, probeShells().length, JSON.stringify(r.cases));
    for (const row of r.cases) {
      assert.equal(row.outcome, "rejected", JSON.stringify(row));
    }
    assert.deepEqual(left, [], "the probe sandbox was not removed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runProbeSpec: the teardown never follows a symlink out of the sandbox — a directory outside keeps its mode (task.234 B)", (t) => {
  if (process.getuid?.() === 0) return t.skip("root reads through mode 000");
  const outside = mkdtempSync(join(tmpdir(), "t234-outside-"));
  chmodSync(outside, 0o500);
  const root = fenceRoot(OK_BLOCK);
  try {
    const { left } = withFreshTmpdir(() =>
      runProbeSpec({
        entry: "fence:doc.md#Block",
        slot: "<slot>",
        cases: [
          fenceCase(
            "f.link",
            "hostile",
            `mkdir locked && ln -s '${outside}' locked/link && chmod 000 locked`,
            { expected: { exit: 0, stdout: "ok\n", absent: ["pwned"] } },
          ),
        ],
        repoRoot: root,
      }),
    );
    assert.deepEqual(left, [], "the probe sandbox was not removed");
    assert.equal(
      (statSync(outside).mode & 0o777).toString(8),
      "500",
      "the teardown changed the mode of a directory outside the sandbox",
    );
  } finally {
    chmodSync(outside, 0o700);
    rmSync(outside, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("runProbeSpec: a shell case's background write that lands after the case exits is killed before it lands (task.234 D, watchedSpawn)", async () => {
  // The grandchild releases the case's stdio; one that keeps it holds
  // spawnSync open until it finishes, and its write is seen in time.
  const markerDir = mkdtempSync(join(tmpdir(), "t234-marker-"));
  const marker = join(markerDir, "late");
  const root = fenceRoot(OK_BLOCK);
  try {
    const r = runProbeSpec({
      entry: "fence:doc.md#Block",
      slot: "<slot>",
      cases: [
        fenceCase(
          "f.late",
          "hostile",
          `(sleep 0.3; touch '${marker}') >/dev/null 2>&1 </dev/null &`,
          { expected: { exit: 0, stdout: "ok\n" } },
        ),
      ],
      repoRoot: root,
    });
    assert.equal(r.cases.length, probeShells().length, JSON.stringify(r.cases));
    await sleepMs(600);
    assert.equal(existsSync(marker), false, "the background write landed");
  } finally {
    rmSync(markerDir, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});

test("runProbeSpec: a module case's background write that lands after the case exits is killed before it lands (task.234 D, module runner)", async () => {
  const markerDir = mkdtempSync(join(tmpdir(), "t234-marker-"));
  const marker = join(markerDir, "late");
  // Not `detached`: the grandchild stays in the case's process group.
  const root = fenceRoot({
    "late.mjs": [
      'import { spawn } from "node:child_process";',
      "export function validateHost(input) {",
      "  spawn(",
      "    process.execPath,",
      `    ["-e", ${JSON.stringify(`setTimeout(() => require("node:fs").writeFileSync(${JSON.stringify(marker)}, ""), 300)`)}],`,
      '    { stdio: "ignore" },',
      "  ).unref();",
      "  return input;",
      "}",
      "",
    ].join("\n"),
  });
  try {
    const r = runProbeSpec({
      sink: "url-authority",
      entry: "late.mjs#validateHost",
      cases: [CASES[0]],
      repoRoot: root,
    });
    assert.equal(r.executed, 1, JSON.stringify(r.cases));
    await sleepMs(600);
    assert.equal(existsSync(marker), false, "the background write landed");
  } finally {
    rmSync(markerDir, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});

test("compareExpected: a path the run left unreadable — a symlink loop, a mode-000 ancestor — is a mismatch, never a throw (QA1-4)", (t) => {
  const run = { stdout: "", stderr: "", status: 0 };
  const loop = mkdtempSync(join(tmpdir(), "t232-eloop-"));
  try {
    symlinkSync("loop", join(loop, "loop"));
    assert.deepEqual(
      compareExpected({ exit: 0, absent: ["loop/x"] }, run, loop),
      ["loop/x could not be read (ELOOP)"],
    );
    assert.deepEqual(
      compareExpected({ exit: 0, removed: ["loop/x"] }, run, loop),
      ["loop/x could not be read (ELOOP)"],
    );
  } finally {
    rmSync(loop, { recursive: true, force: true });
  }
  // Root reads through mode 000, so the EACCES half has nothing to measure there.
  if (process.getuid?.() === 0) return t.skip("root reads through mode 000");
  const locked = mkdtempSync(join(tmpdir(), "t232-eacces-"));
  try {
    mkdirSync(join(locked, "locked"));
    chmodSync(join(locked, "locked"), 0o000);
    assert.deepEqual(
      compareExpected({ exit: 0, absent: ["locked/x"] }, run, locked),
      ["locked/x could not be read (EACCES)"],
    );
  } finally {
    chmodSync(join(locked, "locked"), 0o700);
    rmSync(locked, { recursive: true, force: true });
  }
});
