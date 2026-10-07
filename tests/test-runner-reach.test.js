"use strict";

/**
 * Every tracked test file is reached by `npm test` (task.187, obs #255).
 *
 * `package.json` `scripts.test` names its suites by hand: one `bash <file>.test.sh` per shell suite and
 * a quoted glob per `node --test` directory. A new suite outside every glob runs nowhere, and a
 * success criterion it holds passes by not running. task.176 planned
 * `skills/review-pr/tests/parse-target.test.sh` into exactly that gap; project memory records 232
 * tests that once ran nowhere after a new `skills/*\/tests/` directory.
 *
 * Population: tracked files matching `.test.(js|mjs|sh)`, minus bundled copies under
 * `skills/<skill>/references/` (their sources in `shared/resources/tests/` are the suites that run).
 * Reach: a quoted `node --test` glob (`*` matches within one path segment), or a `bash <path>` entry.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SCRIPT = require(path.join(ROOT, "package.json")).scripts.test;

function globToRegExp(glob) {
  const body = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*");
  return new RegExp(`^${body}$`);
}

/** The suites a test-script string reaches, and which of `files` it does not. */
function reach(scriptText, files) {
  const globs = [...scriptText.matchAll(/'([^']+\.test\.m?js)'/g)].map(
    (m) => m[1],
  );
  const bashes = new Set(
    [...scriptText.matchAll(/\bbash ([^\s&;'"]+\.test\.sh)/g)].map((m) => m[1]),
  );
  const res = globs.map(globToRegExp);
  const unreached = files.filter((f) =>
    f.endsWith(".sh") ? !bashes.has(f) : !res.some((r) => r.test(f)),
  );
  return { globs, bashes, unreached };
}

const BUNDLED_COPY = /^skills\/[^/]+\/references\//;
const TRACKED = execFileSync("git", ["ls-files"], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter((f) => /\.test\.(m?js|sh)$/.test(f));
const POPULATION = TRACKED.filter((f) => !BUNDLED_COPY.test(f));

test("control: the scanner admits what is reached and refuses what is not", () => {
  const script =
    "bash a/x.test.sh && node --test 'tests/*.test.js' 'shared/resources/tests/*.test.mjs'";
  const r = reach(script, [
    "a/x.test.sh",
    "tests/one.test.js",
    "shared/resources/tests/two.test.mjs",
    "b/y.test.sh", // a shell suite with no bash entry
    "tests/deeper/three.test.js", // one glob segment does not reach a subdirectory
    "skills/new/tests/four.test.js", // a directory with no glob
  ]);
  assert.deepEqual(r.unreached, [
    "b/y.test.sh",
    "tests/deeper/three.test.js",
    "skills/new/tests/four.test.js",
  ]);
});

test("mutation: dropping one glob from the real script reports its suite unreached", () => {
  const glob = "'skills/wireframe/tests/*.test.js'";
  assert.ok(
    SCRIPT.includes(glob),
    `the test script no longer carries ${glob} — re-pick a glob`,
  );
  const r = reach(SCRIPT.replace(glob, ""), POPULATION);
  assert.ok(
    r.unreached.includes("skills/wireframe/tests/wireframe.test.js"),
    "removing the wireframe glob must leave its suite unreached",
  );
});

test("floors: the population and the script are non-trivial", () => {
  const r = reach(SCRIPT, POPULATION);
  console.log(
    `  population ${POPULATION.length} tracked test files (${TRACKED.length - POPULATION.length} bundled copies excluded), ` +
      `${r.globs.length} globs, ${r.bashes.size} bash entries`,
  );
  assert.ok(
    POPULATION.length >= 200,
    `population ${POPULATION.length} < 200 — the scan is broken`,
  );
  assert.ok(
    r.globs.length >= 25,
    `globs ${r.globs.length} < 25 — the script parse is broken`,
  );
  assert.ok(
    r.bashes.size >= 10,
    `bash entries ${r.bashes.size} < 10 — the script parse is broken`,
  );
});

test("every tracked test file is reached by npm test", () => {
  const { unreached } = reach(SCRIPT, POPULATION);
  assert.deepEqual(
    unreached,
    [],
    "these suites run nowhere — add a glob or a `bash <file>` entry to package.json scripts.test, " +
      "or move the cases into a reached suite:\n  " +
      unreached.join("\n  "),
  );
});
