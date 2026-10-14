"use strict";

/**
 * Under CI, every tool a suite skips without is present (obs #301).
 *
 * Suites probe for an optional tool and skip the cases that need it: `zshAvailable()` drops the zsh
 * variant of every documented shell block, and a `command -v <tool>` guard in a shell suite prints
 * SKIP and moves on. Wherever the tool is missing, that skip is a silent hole in coverage. The Linux
 * runner had no zsh until PR #614, so 224 zsh variants never ran in CI, and a macOS-only exit-code
 * assumption sat in the suite from task.67 until zsh was installed.
 *
 * Locally a missing tool stays a skip, as the suites intend. Under `CI=true` it is a failure: CI is
 * the one place whose green claims full coverage, so a hole there must be loud. Fix by installing the
 * tool in `.github/workflows/test.yml`.
 *
 * Population: tracked test sources (bundled copies under `skills/<skill>/references/` excluded,
 * because their sources are the suites that run), every `command -v <tool>` they contain, plus `zsh`
 * wherever a source calls `zshAvailable()`. Derived, never listed, so a new guard is covered the day
 * it is written.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.join(__dirname, "..");
const SOURCE_RE = /\.test\.(js|mjs|sh)$/;
const BUNDLED_RE = /^skills\/[^/]+\/references\//;

function testSources() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: REPO,
    encoding: "utf8",
  })
    .split("\0")
    .filter((f) => SOURCE_RE.test(f) && !BUNDLED_RE.test(f));
}

function probedTools(files) {
  const tools = new Set();
  for (const f of files) {
    const text = fs.readFileSync(path.join(REPO, f), "utf8");
    for (const m of text.matchAll(/command -v ([A-Za-z0-9_][A-Za-z0-9_.-]*)/g))
      tools.add(m[1]);
    if (/\bzshAvailable\(\)/.test(text)) tools.add("zsh");
  }
  return [...tools].sort();
}

function onPath(tool) {
  return (
    spawnSync("/bin/sh", ["-c", 'command -v "$1" >/dev/null 2>&1', "sh", tool])
      .status === 0
  );
}

const TOOLS = probedTools(testSources());

test("the population is derived and non-empty: zsh is probed by the dual-shell suites", () => {
  // Non-vacuity: a scan that found nothing would pass the CI assertion below by checking nothing.
  assert.ok(
    TOOLS.includes("zsh"),
    `zsh not found in the probed population: ${TOOLS.join(", ")}`,
  );
});

test(
  "under CI, every tool a suite skips without is on PATH",
  {
    skip: process.env.CI
      ? false
      : "CI is not set — locally a missing tool is a skip, as the suites intend",
  },
  () => {
    const missing = TOOLS.filter((t) => !onPath(t));
    assert.deepEqual(
      missing,
      [],
      `CI is missing ${missing.join(", ")} — the suites that probe for them skip silently. Install them in .github/workflows/test.yml.`,
    );
  },
);
