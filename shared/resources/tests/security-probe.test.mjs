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
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ARGV_SLOTS,
  CLI_PREFIX,
  cliControlKey,
  OUTCOMES,
  VERDICTS,
  compareExpected,
  computeVerdict,
  defaultRepoRoot,
  expectedProblem,
  isLaunchFailure,
  main,
  parseArgvTemplate,
  probeShells,
  readRecord,
  recordEntriesDir,
  recordRun,
  resolveEntry,
  runProbeSpec,
  toRecordEntry,
} from "../security-probe.mjs";
import { corpusFor } from "../security-input-corpus.mjs";
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

test("shell entry: a malformed expected is declined with its reason, never scored or thrown (BUG-11)", () => {
  const base = corpusFor("filename").slice(0, 2);
  const bad = [
    [{ stdout: 12 }, /expected\.stdout.*must be a string/],
    [{ stdout: null }, /expected\.stdout.*must be a string/],
    [{ exit: "0" }, /expected\.exit.*must be an integer/],
    [{ exit: 0, absent: 5 }, /expected\.absent.*must be an array/],
    [{ exit: 0, absent: ["a/b"] }, /expected\.absent.*must be an array/],
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
      "--argv on a JS entry": /cli: entry form only/,
      "--argv on a shell: entry": /cli: entry form only/,
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
  assert.match(onJs.declined[0].detail, /cli: entry form only/);
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
