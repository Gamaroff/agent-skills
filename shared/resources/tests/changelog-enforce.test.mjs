// changelog-enforce.test.mjs — the one answer to "do /finalise's changelog checks apply here?"
//
// changelog-enforce.sh is read by two /finalise sites (the Step 3 docs-subagent dispatch and Step 7
// action 6d), so it is the condition's single definition (task.241, obs #118). These tests hold its
// three properties:
//
//   1. Off by default — no config, no `changelog:` block, or no `enforce:` key is `off`.
//   2. The same answer under BOTH read-config.sh tiers. The tiers disagree on the raw text of a
//      YAML 1.1 boolean (`yes` is `true` under python, `yes` under awk), and the resolver takes the
//      union so the tier that ran cannot change the answer. Each tier is forced explicitly and a
//      tier the host cannot run is SKIPPED loudly, never passed, per read-config.sh's own rule.
//   3. An unrecognised value is `off` WITH a stderr line naming it, so a typo is visible.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const RESOLVER = path.join(REPO_ROOT, "shared/resources/changelog-enforce.sh");
const READ_CONFIG = path.join(REPO_ROOT, "shared/resources/read-config.sh");

// The child sees only what a /finalise shell would: no ambient SKILLS_CONFIG_FILE or tier override
// leaks in from the test runner's environment.
function childEnv(extra = {}) {
  return { PATH: process.env.PATH, HOME: process.env.HOME, ...extra };
}

/** Run the resolver in a temp dir holding `config` (null = no skills-config.yaml). */
function resolve(config, { tier } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "changelog-enforce-"));
  try {
    if (config !== null)
      writeFileSync(path.join(dir, "skills-config.yaml"), config);
    const r = spawnSync("bash", [RESOLVER], {
      cwd: dir,
      encoding: "utf8",
      env: childEnv(tier ? { AGENT_SKILLS_CONFIG_TIER: tier } : {}),
    });
    return { status: r.status, stdout: r.stdout.trim(), stderr: r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const enforce = (v) => `changelog:\n  enforce: ${v}\n`;

// Tier 1 needs python + pyyaml. read-config.sh's own probe answers whether this host has it.
const PYTHON_TIER =
  spawnSync(
    "bash",
    ["-c", `source "${READ_CONFIG}" && config_python >/dev/null`],
    {
      env: childEnv(),
    },
  ).status === 0;
const TIERS = ["awk", ...(PYTHON_TIER ? ["python"] : [])];

describe("changelog-enforce.sh is off unless the project opts in", () => {
  for (const [label, config] of [
    ["no skills-config.yaml", null],
    ["no changelog: block", "ci:\n  docsOnly:\n    enabled: true\n"],
    ["a changelog: block with no enforce key", "changelog:\n  other: 1\n"],
  ]) {
    test(`${label} → off`, () => {
      const r = resolve(config);
      assert.equal(r.status, 0);
      assert.equal(r.stdout, "off");
      assert.equal(r.stderr, "", "the default is not a typo and must not warn");
    });
  }
});

test("the python tier is available, or its cases are skipped loudly", (t) => {
  if (!PYTHON_TIER)
    t.skip("tier python unavailable on this host (no python with pyyaml)");
});

describe("changelog-enforce.sh gives the same answer under every tier", () => {
  const cases = [
    // [value, expected, warns]
    ["true", "on", false],
    ["True", "on", false],
    ["yes", "on", false], // python resolves it to true, awk returns `yes`: the union keeps them equal
    ["On", "on", false],
    ['"true"', "on", false],
    ["false", "off", false],
    ["no", "off", false],
    ["OFF", "off", false],
    ["enabled", "off", true],
    ["1", "off", true],
  ];
  for (const tier of TIERS) {
    for (const [value, expected, warns] of cases) {
      test(`[${tier}] enforce: ${value} → ${expected}${warns ? " with a warning" : ""}`, () => {
        const r = resolve(enforce(value), { tier });
        assert.equal(r.status, 0, "the resolver always exits 0");
        assert.equal(r.stdout, expected);
        if (warns) {
          assert.match(r.stderr, /changelog\.enforce is '.+' — write `true`/);
        } else {
          assert.equal(r.stderr, "");
        }
      });
    }
  }
});

test("this repository opts in: its own skills-config.yaml resolves to on", () => {
  const r = spawnSync("bash", [RESOLVER], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: childEnv(),
  });
  assert.equal(r.status, 0);
  assert.equal(
    r.stdout.trim(),
    "on",
    "skills-config.yaml must set changelog.enforce: true, or this repository's own 6d HALT silently turns off",
  );
});
