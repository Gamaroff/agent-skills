/**
 * Docs-set parity (task.174): the template classifier's default `DOCS_PATTERNS` and task.172's
 * pipeline rule (`ci.docsOnly.patterns`, default `DEFAULT_PATTERNS`) must call the same paths
 * docs. The two are written in different syntaxes — a shell `case` pattern, where `*` matches
 * `/`, and a glob, where `**` crosses directories — so this compares BEHAVIOUR on a fixed path
 * list, never the strings.
 *
 * The fixed list is task.172 § 8's. A deliberate divergence would be spelled out here, path by
 * path; there is none.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..", "..", "..", "..");
const { DEFAULT_PATTERNS } = require(
  path.join(ROOT, "shared", "resources", "ci-tree-equivalence.js"),
);
const { matchesAnyGlob } = require(
  path.join(ROOT, "shared", "resources", "glob-match.js"),
);
const SCRIPT = path.join(__dirname, "classify-changes.sh");

const FIXED_PATHS = [
  "skills/x/SKILL.md",
  "docs/a/b.yml",
  "README.md",
  ".github/workflows/ci.yml",
  "src/a.ts",
];

/** The template's verdict per path: the script is SOURCED, so only is_docs runs. */
function templateVerdicts(paths, env = {}) {
  const env2 = { ...process.env, ...env };
  delete env2.DOCS_PATTERNS; // the default is what is compared
  const r = spawnSync(
    "bash",
    [
      "-c",
      'source "$1"; shift; for p in "$@"; do if is_docs "$p"; then echo docs; else echo code; fi; done',
      "x",
      SCRIPT,
      ...paths,
    ],
    { encoding: "utf8", env: env2 },
  );
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim().split("\n");
}

test("the pipeline rule's default is the one compared (non-vacuity)", () => {
  assert.deepEqual([...DEFAULT_PATTERNS], ["**/*.md", "docs/**"]);
});

test("template DOCS_PATTERNS default and task.172 DEFAULT_PATTERNS agree on the fixed path list", () => {
  const template = templateVerdicts(FIXED_PATHS);
  const pipeline = FIXED_PATHS.map((p) =>
    matchesAnyGlob(p, DEFAULT_PATTERNS) ? "docs" : "code",
  );
  assert.deepEqual(
    Object.fromEntries(FIXED_PATHS.map((p, i) => [p, template[i]])),
    Object.fromEntries(FIXED_PATHS.map((p, i) => [p, pipeline[i]])),
  );
  // And the list exercises both answers, so agreement is not two rules that say one thing.
  assert.deepEqual(
    [...new Set(pipeline)].sort(),
    ["code", "docs"],
    "the fixed list must hold both docs and code paths",
  );
});
