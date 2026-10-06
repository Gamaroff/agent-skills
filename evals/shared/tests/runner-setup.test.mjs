"use strict";
// task.185 — runner.mjs's opt-in scenario fields: `setup`, `cliArgs`, `liveAssertions`, and
// the claude-cli driver's EVAL_TIMEOUT_MS. Each test builds a throwaway scenario and runs the
// REAL runner on it. Live paths use the real claude-cli driver against a fake `claude` binary
// on PATH, so what the driver hands the agent (env, PATH, argv) is observed, not assumed.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RUNNER = fileURLToPath(new URL("../runner.mjs", import.meta.url));

// A fake `claude`: records what it was given into the sandbox (its cwd), then optionally sleeps.
function fakeClaudeBin() {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "fake-claude-"));
  fs.writeFileSync(
    path.join(bin, "claude"),
    `#!/bin/sh
mkdir -p .eval
{
  echo "FOO=$FOO"
  echo "ARGS=$*"
  first=\${PATH%%:*}
  [ "$first" = "$(cat .eval/expected-prefix 2>/dev/null)" ] && echo PATH_PREFIX_OK
} > .eval/claude-seen.txt
[ -n "$FAKE_CLAUDE_SLEEP" ] && sleep "$FAKE_CLAUDE_SLEEP"
exit 0
`,
    { mode: 0o755 },
  );
  return bin;
}

const SETUP = `
import fs from "node:fs";
import path from "node:path";
export async function setup({ sandbox, scenarioDir, repoRoot, scenario }) {
  if (scenario.fixture && scenario.fixture.throw) throw new Error("setup exploded on purpose");
  const bin = path.join(sandbox, ".eval", "bin");
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(sandbox, ".eval", "expected-prefix"), bin);
  fs.writeFileSync(path.join(sandbox, "setup-ran.txt"),
    [scenarioDir, fs.existsSync(path.join(repoRoot, "evals", "shared", "runner.mjs"))].join("\\n"));
  return { env: { PATH: bin, FOO: "from-setup" } };
}
`;

function scenario(fields) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "runner-setup-"));
  const sc = path.join(dir, "scenarios", "01-x");
  fs.mkdirSync(sc, { recursive: true });
  fs.writeFileSync(path.join(dir, "setup.mjs"), SETUP);
  fs.writeFileSync(
    path.join(sc, "scenario.json"),
    JSON.stringify({ name: "01-x", prompt: "/noop", ...fields }),
  );
  return sc;
}

function run(sc, env = {}) {
  const r = spawnSync(process.execPath, [RUNNER, sc], {
    encoding: "utf8",
    env: { ...process.env, KEEP_SANDBOX: "", ...env },
  });
  const sandbox = (r.stderr.match(/→ sandbox: (\S+)/) || [])[1];
  return { ...r, sandbox };
}

test("setup runs before the driver in replay too; a scenario's assertions see what it wrote", () => {
  const sc = scenario({
    setup: "../../setup.mjs",
    assertions: [
      { fn: "fileExists", args: ["$SANDBOX/setup-ran.txt"] },
      { fn: "fileMatches", args: ["$SANDBOX/setup-ran.txt", "\\ntrue$"] },
    ],
  });
  const r = run(sc, { DRIVER: "replay" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /2\/2 assertions passed/);
});

test("setup env reaches the driver: FOO merged, PATH prefixed, cliArgs appended", () => {
  const sc = scenario({
    setup: "../../setup.mjs",
    cliArgs: ["--allowedTools", "Bash", "Read"],
    assertions: [
      {
        fn: "fileMatches",
        args: ["$SANDBOX/.eval/claude-seen.txt", "(^|\\n)FOO=from-setup\\n"],
      },
      {
        fn: "fileMatches",
        args: ["$SANDBOX/.eval/claude-seen.txt", "\\nPATH_PREFIX_OK\\n"],
      },
      {
        fn: "fileMatches",
        args: [
          "$SANDBOX/.eval/claude-seen.txt",
          "--add-dir \\S+ --allowedTools Bash Read\\n",
        ],
      },
    ],
  });
  const bin = fakeClaudeBin();
  const r = run(sc, {
    DRIVER: "claude-cli",
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /3\/3 assertions passed/);
});

test("a setup that throws fails the scenario with exit 1 and removes the sandbox", () => {
  const sc = scenario({
    setup: "../../setup.mjs",
    fixture: { throw: true },
    assertions: [],
  });
  const r = run(sc, { DRIVER: "replay" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /setup error: .*setup exploded on purpose/);
  assert.ok(r.sandbox, "runner printed the sandbox path");
  assert.equal(fs.existsSync(r.sandbox), false, "sandbox removed");
});

test("a setup path that does not resolve is a setup error, not a crash", () => {
  const sc = scenario({ setup: "../../no-such-setup.mjs", assertions: [] });
  const r = run(sc, { DRIVER: "replay" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /setup error/);
  assert.equal(fs.existsSync(r.sandbox), false);
});

test("liveAssertions are skipped under replay and enforced under a live driver", () => {
  const sc = scenario({
    assertions: [],
    liveAssertions: [
      { fn: "fileExists", args: ["$SANDBOX/never-written.txt"] },
    ],
  });
  const replay = run(sc, { DRIVER: "replay" });
  assert.equal(replay.status, 0, replay.stderr);
  assert.match(replay.stderr, /0\/0 assertions passed/);

  const bin = fakeClaudeBin();
  const live = run(sc, {
    DRIVER: "claude-cli",
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
  });
  assert.equal(live.status, 1);
  assert.match(live.stderr, /0\/1 assertions passed/);
});

test("EVAL_TIMEOUT_MS bounds a live run: a slow agent fails the scenario", () => {
  const sc = scenario({ assertions: [] });
  const bin = fakeClaudeBin();
  const r = run(sc, {
    DRIVER: "claude-cli",
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    EVAL_TIMEOUT_MS: "300",
    FAKE_CLAUDE_SLEEP: "5",
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /driver error: claude-cli exited null/);
});

test("a scenario with none of the new fields runs exactly as before", () => {
  const sc = scenario({
    assertions: [{ fn: "fileAbsent", args: ["$SANDBOX/setup-ran.txt"] }],
  });
  const r = run(sc, { DRIVER: "replay" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /1\/1 assertions passed/);
});

// task.185 QA cycle 1, CR-1: a skip exits 0 by default (eval:all relies on it) and with the caller's
// code when EVAL_SKIP_EXIT asks for one; a code that collides with fail/usage is ignored.
test("a skip exits 0, or EVAL_SKIP_EXIT when it is a code in 3–125", () => {
  const sc = scenario({ requiresLiveDriver: true, assertions: [] });
  assert.equal(run(sc, { DRIVER: "replay" }).status, 0);
  assert.equal(run(sc, { DRIVER: "replay", EVAL_SKIP_EXIT: "3" }).status, 3);
  for (const ignored of ["1", "2", "0", "200", "x"]) {
    assert.equal(
      run(sc, { DRIVER: "replay", EVAL_SKIP_EXIT: ignored }).status,
      0,
      ignored,
    );
  }
  // An empty PATH: neither `which` nor `claude` resolves (QA cycle 2, CR-6).
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "no-claude-"));
  const r = run(scenario({ assertions: [] }), {
    DRIVER: "claude-cli",
    PATH: bin,
    EVAL_SKIP_EXIT: "3",
  });
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stderr, /skipped: `claude` binary not found on PATH/);
});

// task.185 QA cycle 2, QA-3: a driver error exits 1 by default and EVAL_DRIVER_ERROR_EXIT on request.
test("a driver error exits 1, or EVAL_DRIVER_ERROR_EXIT when it is a code in 3–125", () => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "bad-claude-"));
  fs.writeFileSync(path.join(bin, "claude"), "#!/bin/sh\nexit 1\n", {
    mode: 0o755,
  });
  const sc = scenario({ assertions: [] });
  const env = {
    DRIVER: "claude-cli",
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
  };
  assert.equal(run(sc, env).status, 1);
  assert.equal(run(sc, { ...env, EVAL_DRIVER_ERROR_EXIT: "4" }).status, 4);
  assert.equal(
    run(sc, { ...env, EVAL_DRIVER_ERROR_EXIT: "2" }).status,
    1,
    "2 collides with usage",
  );
});

// task.185 QA cycle 3: EVAL_FAIL_EXIT is used ONLY when assertions ran and failed. A setup error
// keeps exit 1, so a caller asking for the fail code can read every other exit as "did not run".
test("EVAL_FAIL_EXIT marks failed assertions and nothing else", () => {
  const failing = scenario({
    assertions: [{ fn: "fileExists", args: ["$SANDBOX/never.txt"] }],
  });
  assert.equal(run(failing, { DRIVER: "replay" }).status, 1);
  assert.equal(
    run(failing, { DRIVER: "replay", EVAL_FAIL_EXIT: "5" }).status,
    5,
  );
  const passing = scenario({ assertions: [] });
  assert.equal(
    run(passing, { DRIVER: "replay", EVAL_FAIL_EXIT: "5" }).status,
    0,
  );
  const brokenSetup = scenario({
    setup: "../../setup.mjs",
    fixture: { throw: true },
    assertions: [],
  });
  assert.equal(
    run(brokenSetup, { DRIVER: "replay", EVAL_FAIL_EXIT: "5" }).status,
    1,
  );
  assert.equal(
    run(passing, { DRIVER: "no-such-driver", EVAL_FAIL_EXIT: "5" }).status,
    1,
  );
});

// task.186 A1: a setup whose promise never settles leaves Node with an empty event loop, and it
// exits with process.exitCode. That used to be 0 — a pass for a run that judged nothing.
test("a setup that never settles is not a pass: the runner exits non-zero (A1)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "runner-hang-"));
  fs.writeFileSync(
    path.join(dir, "hang.mjs"),
    "export function setup() { return new Promise(() => {}); }\n",
  );
  const sc = path.join(dir, "sc");
  fs.mkdirSync(sc);
  fs.writeFileSync(
    path.join(sc, "scenario.json"),
    JSON.stringify({
      name: "hang",
      setup: "../hang.mjs",
      assertions: [{ fn: "fileAbsent", args: ["$SANDBOX/never.txt"] }],
    }),
  );
  const r = run(sc, { DRIVER: "replay" });
  assert.notEqual(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /assertions passed/);
  // Not the fail code either: nothing was judged.
  assert.notEqual(
    run(sc, { DRIVER: "replay", EVAL_FAIL_EXIT: "75" }).status,
    75,
  );
});

// task.186 A2: unknown assertion names are refused before the sandbox, the setup or the driver.
test("an unknown assertion fn is refused before any setup or driver runs (A2)", () => {
  for (const key of ["assertions", "liveAssertions"]) {
    const sc = scenario({
      setup: "../../setup.mjs",
      [key]: [{ fn: "fileExsts", args: ["$SANDBOX/x"] }],
    });
    const r = run(sc, { DRIVER: "replay", EVAL_FAIL_EXIT: "75" });
    assert.equal(r.status, 1, `${key}: ${r.stderr}`);
    assert.match(
      r.stderr,
      new RegExp(`${key}\\[0\\]: unknown assertion fn "fileExsts"`),
    );
    assert.equal(r.sandbox, undefined, `${key}: no sandbox was made`);
  }
});

// task.186 A2: the dispatch table is the one list of names. Every assertion assertions.mjs exports
// (aggregate is the combiner, not an assertion) must be in it, so a new assertion cannot be added
// without becoming dispatchable — and a name in the table must dispatch.
test("every exported assertion is dispatchable, and only those names (A2)", async () => {
  const A = await import("../assertions.mjs");
  const { ASSERTION_FNS, dispatchAssertion } =
    await import("../lib/assertion-dispatch.mjs");
  const exported = Object.keys(A)
    .filter((k) => typeof A[k] === "function" && k !== "aggregate")
    .sort();
  assert.ok(
    exported.length >= 17,
    `non-vacuous: ${exported.length} assertions`,
  );
  assert.deepEqual([...ASSERTION_FNS].sort(), exported);
  assert.match(
    dispatchAssertion("constructor", [], {}).reason,
    /unknown assertion fn/,
  );
});

// task.186 A5: the fake gh needs jq for -q/--jq. Without it a scenario cannot be judged, so the
// install refuses as a skip — could-not-run under repeat — rather than letting the run fail.
// task.186 A5, scoped by QA cycle 2 (C2-CR-1): the fake gh needs jq only when the agent can call
// it. A replay run never calls gh, so it installs and is JUDGED without jq; a live run without jq
// cannot be judged, so the install refuses as a skip — could-not-run under repeat.
function noJqScenario() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "runner-nojq-"));
  const fakeGh = new URL("../lib/fake-gh.mjs", import.meta.url).href;
  fs.writeFileSync(
    path.join(dir, "gh-setup.mjs"),
    `import { installFakeGh } from ${JSON.stringify(fakeGh)};
export function setup({ sandbox }) { return { env: installFakeGh(sandbox, {}) }; }
`,
  );
  const sc = path.join(dir, "sc");
  fs.mkdirSync(sc);
  fs.writeFileSync(
    path.join(sc, "scenario.json"),
    JSON.stringify({
      name: "nojq",
      setup: "../gh-setup.mjs",
      assertions: [{ fn: "fileAbsent", args: ["$SANDBOX/never.txt"] }],
    }),
  );
  return sc;
}

test("a replay run without jq installs the fake gh and is judged (A5, C2-CR-1)", () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "runner-empty-path-"));
  const r = run(noJqScenario(), {
    DRIVER: "replay",
    PATH: empty,
    EVAL_SKIP_EXIT: "73",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /1\/1 assertions passed/);
  assert.doesNotMatch(r.stderr, /skipped/);
});

test("a live run without jq is a skip naming jq, not a failed run (A5)", () => {
  // A PATH holding a fake `claude` and `which` (the driver's availability probe) and no jq.
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "runner-live-nojq-"));
  fs.writeFileSync(path.join(bin, "claude"), "#!/bin/sh\nexit 0\n", {
    mode: 0o755,
  });
  const which = spawnSync("/bin/sh", ["-c", "command -v which"], {
    encoding: "utf8",
  }).stdout.trim();
  fs.symlinkSync(which, path.join(bin, "which"));
  const r = run(noJqScenario(), {
    DRIVER: "claude-cli",
    PATH: bin,
    EVAL_SKIP_EXIT: "73",
  });
  assert.equal(r.status, 73, r.stderr);
  assert.match(r.stderr, /skipped: .*jq/);
  assert.equal(fs.existsSync(r.sandbox), false, "sandbox removed");
});

// task.186 A6: a killed `claude` has status null; the error must say why (ETIMEDOUT, SIGTERM).
test("a driver killed by its timeout names the error code and the signal (A6)", () => {
  const sc = scenario({ assertions: [] });
  const bin = fakeClaudeBin();
  const r = run(sc, {
    DRIVER: "claude-cli",
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    EVAL_TIMEOUT_MS: "300",
    FAKE_CLAUDE_SLEEP: "5",
  });
  assert.equal(r.status, 1);
  assert.match(
    r.stderr,
    /driver error: claude-cli exited null \(ETIMEDOUT, SIGTERM\)/,
  );
});
