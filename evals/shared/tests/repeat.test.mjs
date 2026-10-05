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
  assert.match(r.stdout, /passed 1\/2 \(min 1\)/);

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

// task.185 QA cycle 1, QA-2: live.minPass is calibrated for 5 runs; fewer runs cap it, and say so.
test("a live.minPass above --runs is capped at --runs, and the output says so", () => {
  const r = repeat([
    alternatingScenario({ live: { minPass: 5 } }),
    "--runs",
    "1",
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    r.stdout,
    /passed 1\/1 \(min 1, live\.minPass 5 capped at --runs 1\)/,
  );
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
  assert.match(r.stderr, /could not run repeat-skip-\S+ — the runner skipped/);
});

test("a run with no claude binary (driver unavailable) stops repeat with exit 3, never a pass", () => {
  const sc = fs.mkdtempSync(path.join(os.tmpdir(), "repeat-nocli-"));
  fs.writeFileSync(
    path.join(sc, "scenario.json"),
    JSON.stringify({ name: "nocli", assertions: [] }),
  );
  const r = repeat([sc, "--runs", "2", "--min-pass", "2"], {
    DRIVER: "claude-cli",
    PATH: "/usr/bin:/bin", // `which` resolves; no `claude` on it
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
    [sc, "--bogus"],
    ["/no/such"],
  ]) {
    const r = repeat(args);
    assert.equal(r.status, 2, `${args.join(" ")}: ${r.stderr}`);
    assert.match(r.stderr, /^repeat: /);
  }
});

test("a live.minPass below 1 is a usage error (it could never fail)", () => {
  for (const k of [0, -1, "4"]) {
    const r = repeat([
      alternatingScenario({ live: { minPass: k } }),
      "--runs",
      "2",
    ]);
    assert.equal(r.status, 2, `${JSON.stringify(k)}: ${r.stderr}`);
    assert.match(r.stderr, /live\.minPass must be an integer of at least 1/);
  }
});
