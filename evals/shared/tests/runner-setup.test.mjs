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
