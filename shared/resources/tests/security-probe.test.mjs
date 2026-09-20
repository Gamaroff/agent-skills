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
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  OUTCOMES,
  VERDICTS,
  compareExpected,
  computeVerdict,
  defaultRepoRoot,
  isLaunchFailure,
  main,
  probeShells,
  readRecord,
  resolveEntry,
  runProbeSpec,
  toRecordEntry,
} from "../security-probe.mjs";
import { corpusFor } from "../security-input-corpus.mjs";

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
