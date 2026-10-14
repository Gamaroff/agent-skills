/**
 * release.yml runs the same `npm test` as test.yml, so it must install the same
 * apt packages. tests/ci-tool-skips.test.js fails under CI when a tool a suite
 * probes for is missing, and v0.56.0's first release run failed exactly there:
 * test.yml had gained zsh and release.yml had not. A comment asking for the two
 * lists to stay equal is how they drifted apart, so this asserts it.
 *
 * Run via: node --test tests/release-workflow-tools.test.js
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const WF = path.join(__dirname, "..", ".github", "workflows");

/** Every package named on an `apt-get install` line in a workflow file. */
function aptPackages(file) {
  const text = fs.readFileSync(path.join(WF, file), "utf8");
  const pkgs = new Set();
  for (const m of text.matchAll(/apt-get install\b([^\n]*)/g)) {
    for (const word of m[1].trim().split(/\s+/)) {
      if (word && !word.startsWith("-")) pkgs.add(word);
    }
  }
  return pkgs;
}

test("release.yml installs every apt package test.yml installs", () => {
  const wanted = aptPackages("test.yml");
  // Non-vacuity: an empty test.yml list would make this pass on anything.
  assert.ok(wanted.has("zsh"), "test.yml's install list was not read");
  const have = aptPackages("release.yml");
  const missing = [...wanted].filter((p) => !have.has(p)).sort();
  assert.deepEqual(
    missing,
    [],
    `release.yml runs npm test without: ${missing.join(", ")}`,
  );
});
