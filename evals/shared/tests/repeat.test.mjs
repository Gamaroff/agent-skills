"use strict";
// task.185 — repeat.mjs: N sequential runs of the real runner, a pass rate, and an exit code
// keyed on --min-pass (or scenario.json live.minPass). The stub scenario's setup hook keeps a
// run counter beside the scenario and writes the asserted file only on odd runs, so it passes
// exactly on alternate runs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPEAT = fileURLToPath(new URL("../repeat.mjs", import.meta.url));

function alternatingScenario(extra = {}) {
  const sc = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-"));
  fs.writeFileSync(
    path.join(sc, "setup.mjs"),
    `import fs from "node:fs";
import path from "node:path";
export function setup({ sandbox, scenarioDir }) {
  const counter = path.join(scenarioDir, "count");
  const n = (fs.existsSync(counter) ? Number(fs.readFileSync(counter, "utf8")) : 0) + 1;
  fs.writeFileSync(counter, String(n));
  if (n % 2 === 1) fs.writeFileSync(path.join(sandbox, "pass.txt"), "ok");
}
`,
  );
  fs.writeFileSync(
    path.join(sc, "scenario.json"),
    JSON.stringify({
      name: "alt",
      setup: "setup.mjs",
      assertions: [{ fn: "fileExists", args: ["$SANDBOX/pass.txt"] }],
      ...extra,
    }),
  );
  return sc;
}

function repeat(args, env = {}) {
  return spawnSync(process.execPath, [REPEAT, ...args], {
    encoding: "utf8",
    env: { ...process.env, DRIVER: "replay", EVAL_RUNS: "", ...env },
  });
}

test("--runs 4 --min-pass 2 on an alternating scenario: passed 2/4, exit 0", () => {
  const r = repeat([alternatingScenario(), "--runs", "4", "--min-pass", "2"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    r.stdout,
    /run 1\/4: pass\nrun 2\/4: fail\nrun 3\/4: pass\nrun 4\/4: fail\n/,
  );
  assert.match(r.stdout, /passed 2\/4 \(min 2\)\n$/);
});

test("--min-pass 3 on the same scenario: exit 1", () => {
  const r = repeat([alternatingScenario(), "--runs", "4", "--min-pass", "3"]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /passed 2\/4 \(min 3\)/);
});

test("min-pass defaults to scenario.json live.minPass, then to every run", () => {
  let r = repeat([
    alternatingScenario({ live: { minPass: 1 } }),
    "--runs",
    "2",
  ]);
  assert.equal(r.status, 0, r.stdout);
  assert.match(
    r.stdout,
    /passed 1\/2 \(min 1, live\.minPass 1\/5 scaled to 1\/2\)/,
  );

  r = repeat([alternatingScenario(), "--runs", "2"]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /passed 1\/2 \(min 2\)/);
});

test("runs default to EVAL_RUNS; an empty EVAL_RUNS reads as unset", () => {
  let r = repeat([alternatingScenario(), "--min-pass", "1"], {
    EVAL_RUNS: "3",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /passed 2\/3 \(min 1\)/);
  r = repeat([alternatingScenario(), "--min-pass", "1"], { EVAL_RUNS: "" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /passed 3\/5 \(min 1\)/);
});

// task.185 QA cycles 1–2 (QA-2, C2-CR-2): live.minPass is a count out of 5, scaled to the run count
// in BOTH directions — capping it below 5 runs but leaving it absolute above let 4/10 pass.
test("live.minPass is scaled to the run count, up and down, and the output says so", () => {
  let r = repeat([
    alternatingScenario({ live: { minPass: 5 } }),
    "--runs",
    "1",
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    r.stdout,
    /passed 1\/1 \(min 1, live\.minPass 5\/5 scaled to 1\/1\)/,
  );

  // 4 of 5 is 8 of 10: the alternating scenario passes 5/10 and must now fail.
  r = repeat([alternatingScenario({ live: { minPass: 4 } }), "--runs", "10"]);
  assert.equal(r.status, 1, r.stdout);
  assert.match(
    r.stdout,
    /passed 5\/10 \(min 8, live\.minPass 4\/5 scaled to 8\/10\)/,
  );

  // At the calibrated count the bar is the stated one, with no note.
  r = repeat([alternatingScenario({ live: { minPass: 3 } }), "--runs", "5"]);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /passed 3\/5 \(min 3\)\n$/);
});

// task.185 QA cycle 1, CR-1: a skipped run is not a pass.
function skippingScenario(extra = {}) {
  const sc = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-skip-"));
  fs.writeFileSync(
    path.join(sc, "scenario.json"),
    JSON.stringify({
      name: "skip",
      requiresLiveDriver: true,
      assertions: [],
      ...extra,
    }),
  );
  return sc;
}

test("a run the runner skips (live scenario under replay) stops repeat with exit 3, never a pass", () => {
  const r = repeat([skippingScenario(), "--runs", "2", "--min-pass", "1"]);
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stdout, /run 1\/2: skipped\n/);
  assert.doesNotMatch(r.stdout, /passed /);
  assert.match(
    r.stderr,
    /could not run repeat-skip-\S+ — the runner skipped the run/,
  );
});

test("a run with no claude binary (driver unavailable) stops repeat with exit 3, never a pass", () => {
  const sc = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-nocli-"));
  fs.writeFileSync(
    path.join(sc, "scenario.json"),
    JSON.stringify({ name: "nocli", assertions: [] }),
  );
  // A PATH that is one empty directory: neither `which` nor `claude` resolves, so the absence of
  // `claude` is set up here rather than assumed of /usr/bin (task.185 QA cycle 2, CR-6).
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-empty-path-"));
  const r = repeat([sc, "--runs", "2", "--min-pass", "2"], {
    DRIVER: "claude-cli",
    PATH: empty,
  });
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stderr, /skipped: `claude` binary not found on PATH/);
  assert.doesNotMatch(r.stdout, /passed 2\/2/);
});

test("usage errors exit 2", () => {
  const sc = alternatingScenario();
  for (const args of [
    [],
    [sc, "--runs", "x"],
    [sc, "--runs", "2", "--min-pass", "3"],
    [sc, "--min-pass", "0"],
    [sc, "--runs"],
    [sc, "--min-pass"],
    [sc, "--runs", "--min-pass", "1"],
    [sc, "--bogus"],
    ["/no/such"],
  ]) {
    const r = repeat(args);
    assert.equal(r.status, 2, `${args.join(" ")}: ${r.stderr}`);
    assert.match(r.stderr, /^repeat: /);
  }
});

test("a live.minPass outside 1..5 is a usage error", () => {
  for (const k of [0, -1, 6, "4"]) {
    const r = repeat([
      alternatingScenario({ live: { minPass: k } }),
      "--runs",
      "2",
    ]);
    assert.equal(r.status, 2, `${JSON.stringify(k)}: ${r.stderr}`);
    assert.match(r.stderr, /live\.minPass must be an integer from 1 to 5/);
  }
});

// task.185 QA cycle 2, C2-CR-4: a malformed scenario.json is a usage error, not a below-min exit 1.
test("a malformed scenario.json exits 2, before any run", () => {
  const sc = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-bad-json-"));
  fs.writeFileSync(path.join(sc, "scenario.json"), "{not json");
  const r = repeat([sc, "--runs", "1"]);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /is not valid JSON/);
  assert.doesNotMatch(r.stdout, /run 1/);
});

// task.185 QA cycle 2, C2-CR-1: several scenarios in one call, one exit status for all — the npm
// script passes every scenario here instead of re-mapping each exit in a shell loop.
test("several scenarios: every summary is printed and one failing scenario makes the exit 1", () => {
  const ok = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-ok-"));
  fs.writeFileSync(
    path.join(ok, "scenario.json"),
    JSON.stringify({ name: "ok", assertions: [] }),
  );
  const r = repeat([ok, alternatingScenario(), "--runs", "2"]);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /repeat-ok-\S+: passed 2\/2 \(min 2\)/);
  assert.match(r.stdout, /repeat-\S+: passed 1\/2 \(min 2\)/);
});

test("a scenario that cannot run stops the whole call with exit 3, whatever ran before it", () => {
  const ok = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-ok-"));
  fs.writeFileSync(
    path.join(ok, "scenario.json"),
    JSON.stringify({ name: "ok", assertions: [] }),
  );
  const r = repeat([ok, skippingScenario(), "--runs", "1"]);
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stdout, /repeat-ok-\S+: passed 1\/1/);
  assert.match(r.stdout, /run 1\/1: skipped\n$/);
});

// task.185 QA cycle 2, QA-3: a driver error (claude -p exits non-zero — no credit, a crash) is not a
// run that executed and failed. It stops the call with exit 3, like a skip.
test("a driver error stops repeat with exit 3, never a failed run", () => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-bad-claude-"));
  fs.writeFileSync(
    path.join(bin, "claude"),
    "#!/bin/sh\necho 'Credit balance is too low'\nexit 1\n",
    { mode: 0o755 },
  );
  const sc = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-drv-"));
  fs.writeFileSync(
    path.join(sc, "scenario.json"),
    JSON.stringify({ name: "drv", assertions: [] }),
  );
  const r = repeat([sc, "--runs", "3", "--min-pass", "1"], {
    DRIVER: "claude-cli",
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
  });
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stdout, /run 1\/3: driver error\n$/);
  assert.doesNotMatch(r.stdout, /passed /);
  assert.match(r.stderr, /Credit balance is too low/);
});

// C2-CR-1, end to end: the package.json script itself, run by sh with a PATH that holds only `node`
// (no `claude`, no `which`). It must surface could-not-run as 3, not collapse it to 1.
test("npm run eval:review-pr:cli's command exits 3 when claude is absent", () => {
  const pkg = JSON.parse(
    fs.readFileSync(
      fileURLToPath(new URL("../../../package.json", import.meta.url)),
      "utf8",
    ),
  );
  const cmd = pkg.scripts["eval:review-pr:cli"];
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-node-only-"));
  fs.symlinkSync(process.execPath, path.join(bin, "node"));
  const r = spawnSync("/bin/sh", ["-c", cmd], {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)),
    encoding: "utf8",
    env: { ...process.env, PATH: bin, EVAL_RUNS: "1" },
  });
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stderr, /skipped: `claude` binary not found on PATH/);
});

// task.185 QA cycle 3, C3-CR-1: the verdict is positive. Anything the runner does instead of judging
// — an unknown DRIVER, a setup that throws — is could-not-run (exit 3), never a failed run.
test("an unknown DRIVER is could-not-run, never a failed run", () => {
  const r = repeat([alternatingScenario(), "--runs", "2", "--min-pass", "1"], {
    DRIVER: "claude-cl",
  });
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stdout, /run 1\/2: not judged\n$/);
  assert.doesNotMatch(r.stdout, /passed /);
  assert.match(r.stderr, /exited 1 without judging the run/);
});

test("a setup that throws is could-not-run, never a failed run", () => {
  const sc = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-bad-setup-"));
  fs.writeFileSync(
    path.join(sc, "setup.mjs"),
    'export function setup() { throw new Error("git is missing"); }\n',
  );
  fs.writeFileSync(
    path.join(sc, "scenario.json"),
    JSON.stringify({ name: "bad-setup", setup: "setup.mjs", assertions: [] }),
  );
  const r = repeat([sc, "--runs", "2", "--min-pass", "1"]);
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stderr, /git is missing/);
  assert.doesNotMatch(r.stdout, /passed /);
});

test("a malformed EVAL_RUNS is named as $EVAL_RUNS, not --runs (C3-CR-5)", () => {
  const r = repeat([alternatingScenario()], { EVAL_RUNS: "x" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^repeat: \$EVAL_RUNS must be a non-negative integer/);
});
