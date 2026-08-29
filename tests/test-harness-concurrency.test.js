"use strict";
/**
 * Test-harness concurrency guard — bug.2.
 *
 * WHY THIS EXISTS
 * ---------------
 * `node --test` defaults its file-level concurrency to the machine's CPU count. Most of this
 * repo's suites are not CPU-bound — they `spawnSync` a child per assertion — so on a 16-core box
 * the runner starts 16 test FILES at once and each of those forks its own children. The effective
 * process count lands far above core count, every spawn's latency inflates, and any test whose
 * timeout was chosen against an idle-machine measurement becomes a coin flip.
 *
 * Measured on the bug (16 cores, Node 24): `shared/resources/tests/jira-interception.test.mjs`
 * runs in 3.2s alone and 48.5s under spawn contention — 15x. Its slowest single test goes from
 * 461ms to 6741ms against a bare 20s timeout, i.e. the margin falls from ~43x to ~3x. Nothing in
 * the code under test changed; only the process pressure did.
 *
 * This had already cost two merges over a red local suite (task.62, task.63), which is the
 * expensive part: a gate that goes red for environmental reasons teaches everyone to merge over
 * red, which is precisely the habit that lets a real red through.
 *
 * WHAT IS PINNED, AND WHY IT IS EVERY INVOCATION
 * ---------------------------------------------
 * The bound lives in `package.json`, so the guard reads `package.json` — editing the scripts is
 * what these assertions measure. It is asserted on EVERY `node --test` invocation rather than on
 * the `test` script alone, because the defect is reintroduced by ADDING a script, not by editing
 * the one that was fixed. A guard pinned to a single string would pass while the next unbounded
 * runner is added beside it.
 *
 * The bound is deliberately NOT asserted to be a specific number — only that it is present, is a
 * positive integer, and is genuinely below the core counts these suites run on (a "bound" of 16
 * on a 16-core box bounds nothing). Pick the number by measurement; at the time of the fix, 4 was
 * measured at no wall-clock cost against the unbounded default (135.0s vs 137.0s).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PKG_PATH = path.join(__dirname, "..", "package.json");
const SCRIPTS = JSON.parse(fs.readFileSync(PKG_PATH, "utf8")).scripts;

/** Every script whose body starts a `node --test` runner. */
function runnerScripts() {
  return Object.entries(SCRIPTS).filter(([, body]) => /\bnode --test\b/.test(body));
}

/**
 * The concurrency bound each `node --test` in `body` carries.
 *
 * Returns one entry per invocation so an unbounded runner appended to an already-bounded script
 * is still caught. `undefined` marks an invocation with no `--test-concurrency` at all.
 */
function boundsIn(body) {
  return body
    .split(/\bnode --test\b/)
    .slice(1)
    .map((tail) => {
      // Stop at the next shell command so a LATER script's flag is never read as this one's.
      const invocation = tail.split(/&&|\|\||;|\n/)[0];
      const m = invocation.match(/--test-concurrency[= ]"?\$\{(\w+):-(\d+)\}"?|--test-concurrency[= ]"?(\d+)"?/);
      if (!m) return undefined;
      return { envVar: m[1], value: Number(m[2] ?? m[3]) };
    });
}

test("the repo actually has node --test runners to guard", () => {
  assert.ok(
    runnerScripts().length > 0,
    "no `node --test` script found in package.json — this guard is measuring nothing",
  );
});

test("every `node --test` invocation bounds its concurrency", () => {
  const unbounded = [];
  for (const [name, body] of runnerScripts()) {
    boundsIn(body).forEach((bound, i) => {
      if (bound === undefined) unbounded.push(`${name} (invocation ${i + 1})`);
    });
  }
  assert.deepEqual(
    unbounded,
    [],
    `unbounded \`node --test\` runner(s): ${unbounded.join(", ")}. ` +
      "`node --test` defaults to CPU-count file concurrency; these suites spawn a child per " +
      "assertion, so the default oversubscribes the box and inflates spawn latency until " +
      "timeouts trip for environmental reasons. Add --test-concurrency (see bug.2).",
  );
});

test("each bound is a positive integer that is actually below core count", () => {
  // 8 is the ceiling, not the target: a bound at or above a typical CI/dev core count (8-16)
  // would satisfy "a flag is present" while leaving the oversubscription entirely in place.
  const MAX_SANE = 8;
  for (const [name, body] of runnerScripts()) {
    for (const bound of boundsIn(body)) {
      if (bound === undefined) continue; // reported by the test above
      assert.ok(
        Number.isInteger(bound.value) && bound.value > 0,
        `${name}: --test-concurrency must be a positive integer, got ${bound.value}`,
      );
      assert.ok(
        bound.value <= MAX_SANE,
        `${name}: --test-concurrency=${bound.value} does not bound anything on an ${MAX_SANE}+ core box`,
      );
    }
  }
});

test("the bound is overridable from the environment without editing package.json", () => {
  // Same rationale as PARITY_SPAWN_TIMEOUT_MS in access-config-parity.test.mjs: a slow or
  // differently-sized CI box must be tunable without a commit.
  for (const [name, body] of runnerScripts()) {
    for (const bound of boundsIn(body)) {
      if (bound === undefined) continue;
      assert.ok(
        bound.envVar,
        `${name}: --test-concurrency is hardcoded; use \${TEST_CONCURRENCY:-N} so a box can be tuned`,
      );
    }
  }
});

/* ------------------------------------------------------------------------ *
 * Spawn budget — the other half of bug.2.
 *
 * Bounding the runner removes the suite's SELF-inflicted contention, and that turned out to be
 * the smaller half. Measured on a 16-core box: the full suite's slowest test is ~2.8s idle at
 * ANY concurrency (bounded or not), but 16.2s when sixteen unrelated spawn loops compete — and a
 * dev box running `npm test` is usually also running the agent pipelines that asked for it. The
 * exposure that actually trips is therefore per-spawn timeout headroom, not file concurrency.
 *
 * A bare `timeout: 20000` is ~1.2x the loaded worst case. The shared budget defaults to 60s, and
 * `access-config-parity.test.mjs` — the one file that already had it — is precisely the file that
 * absorbed that 16.2s spike without failing. These tests keep the literals from growing back.
 * ------------------------------------------------------------------------ */

const BUDGET_MODULE = path.join(__dirname, "..", "shared/resources/tests/spawn-budget.mjs");

/** Source with comments removed, so prose about a historical value is not read as code. */
function code(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every test file the runners actually execute. */
function testFiles() {
  const roots = ["shared/resources/tests", "tests", "evals", "skills"];
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.test\.(mjs|js)$/.test(e.name)) out.push(full);
    }
  };
  for (const r of roots) walk(path.join(__dirname, "..", r));
  return out;
}

test("the shared spawn budget exists and is generous by default", () => {
  assert.ok(fs.existsSync(BUDGET_MODULE), `missing shared spawn budget at ${BUDGET_MODULE}`);
  const src = code(BUDGET_MODULE);
  const m = src.match(/DEFAULT_TIMEOUT_MS\s*=\s*([0-9_]+)/);
  assert.ok(m, "spawn-budget.mjs must declare DEFAULT_TIMEOUT_MS");
  const def = Number(m[1].replace(/_/g, ""));
  // The loaded worst case measured for bug.2 was 16.2s. 20s was ~1.2x that and was being hit;
  // anything under 30s is back inside the range that produced the original mystery failures.
  assert.ok(
    def >= 30000,
    `DEFAULT_TIMEOUT_MS=${def} is too tight — the measured loaded worst case was 16.2s`,
  );
});

test("the spawn budget is tunable per-suite and globally", () => {
  const src = code(BUDGET_MODULE);
  assert.match(src, /SPAWN_TIMEOUT_MS/, "budget must expose a timeout env knob");
  assert.match(src, /TEST_SPAWN_TIMEOUT_MS/, "budget must expose a global TEST_SPAWN_TIMEOUT_MS");
  assert.match(src, /TEST_SPAWN_RETRIES/, "budget must expose a global TEST_SPAWN_RETRIES");
});

test("no test file hardcodes a spawn timeout — the budget is the single source", () => {
  const offenders = [];
  for (const file of testFiles()) {
    const hits = code(file).match(/\btimeout:\s*[0-9]+/g);
    if (hits) offenders.push(`${path.relative(path.join(__dirname, ".."), file)}: ${hits.join(", ")}`);
  }
  assert.deepEqual(
    offenders,
    [],
    "hardcoded spawn timeout(s) found: " +
      offenders.join(" | ") +
      ". Import { spawnBudget } from the shared spawn-budget module instead — a literal chosen " +
      "against an idle machine is ~1.2x the loaded worst case, which is what bug.2 was about.",
  );
});
