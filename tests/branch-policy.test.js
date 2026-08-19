"use strict";
/**
 * Branch Policy guard — the `main`-only rule, and the retarget path that made it unclearable.
 *
 * WHY THIS EXISTS
 * ---------------
 * The workflow used to carry `on: pull_request: branches: [main]`. That filter is evaluated
 * against the PR's CURRENT base, so a PR opened at `main` failed the check, and when the author
 * did the right thing and retargeted to `develop`, the `edited` event no longer matched the
 * filter — nothing re-ran, and the failure was never superseded. A correctly-routed PR wore a
 * permanent red X (hit live on #256). The decision moved into the job; this pins both halves.
 *
 * The step's `run:` body is EXTRACTED FROM THE WORKFLOW and executed, so editing the workflow
 * is what these assertions measure — not a copy of its logic living here.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const WF = path.join(__dirname, "..", ".github/workflows/branch-policy.yml");
const SRC = fs.readFileSync(WF, "utf8");

/** Pull the step's `run:` block out of the YAML without a YAML dependency. */
function policyBody() {
  const m = SRC.match(/\n {8}run: \|\n([\s\S]*?)(?=\n {0,6}\S|\n*$)/);
  assert.ok(m, "could not locate the step's `run:` block in branch-policy.yml");
  return m[1].replace(/^ {10}/gm, "");
}

function decide(baseRef, headRef) {
  return spawnSync("bash", ["-c", policyBody()], {
    encoding: "utf8",
    env: { PATH: "/usr/bin:/bin", BASE_REF: baseRef, HEAD_REF: headRef },
  });
}

test("a release-promotion PR into main is allowed", () => {
  assert.equal(decide("main", "develop").status, 0);
});

test("hotfix/* and release/* may target main", () => {
  assert.equal(decide("main", "hotfix/urgent").status, 0);
  assert.equal(decide("main", "release/1.4.0").status, 0);
});

test("a feature branch targeting main is REFUSED — the rule this guard exists for", () => {
  const r = decide("main", "feature/task.99");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /not an allowed source branch/);
  assert.match(
    r.stdout + r.stderr,
    /gh pr edit/,
    "the refusal must name the fix",
  );
});

test("THE REGRESSION: a non-main base PASSES, so a retarget clears the earlier failure", () => {
  // With `branches: [main]` in the trigger this case never ran at all, so a failure
  // recorded while the PR pointed at `main` could never be superseded.
  for (const head of [
    "fix/whatever",
    "feature/task.99",
    "chore/x",
    "develop",
  ]) {
    const r = decide("develop", head);
    assert.equal(
      r.status,
      0,
      `base=develop head=${head} must pass — it is not this policy's business`,
    );
    assert.match(r.stdout, /does not apply/);
  }
});

test("the base check is LOAD-BEARING — without it a develop-targeted PR is condemned", () => {
  // Mutation: drop the base guard and confirm the same input flips to a failure.
  const mutated = policyBody().replace(
    /if \[ "\$BASE_REF" != "main" \][\s\S]*?fi\n/,
    "",
  );
  assert.notEqual(
    mutated,
    policyBody(),
    "mutation did not apply — the base guard moved?",
  );
  const r = spawnSync("bash", ["-c", mutated], {
    encoding: "utf8",
    env: {
      PATH: "/usr/bin:/bin",
      BASE_REF: "develop",
      HEAD_REF: "fix/whatever",
    },
  });
  assert.notEqual(
    r.status,
    0,
    "without the base guard this input must fail — proving the guard does the work",
  );
});

test("the trigger carries NO `branches:` filter — reinstating it reinstates the bug", () => {
  const onBlock = SRC.slice(
    SRC.indexOf("\non:"),
    SRC.indexOf("\npermissions:"),
  );
  assert.ok(
    !/^\s{4}branches(-ignore)?:/m.test(onBlock),
    "a `branches:` filter on the trigger makes this guard unclearable after a retarget — see the header comment",
  );
});

test("`edited` is still a trigger type — a develop→main retarget must be caught", () => {
  assert.match(SRC, /types:\s*\[[^\]]*\bedited\b/);
});

test("not-applicable is an explicit pass, never a job-level skip", () => {
  // A skipped job reports `skipped`; as a REQUIRED check that can hang a PR forever.
  assert.ok(
    !/^\s{4}if:/m.test(SRC.slice(SRC.indexOf("jobs:"))),
    "the job must not be conditionally skipped",
  );
  assert.match(policyBody(), /exit 0/);
});

test("branch names reach the shell via env, never `${{ }}` interpolation", () => {
  // A branch name is attacker-controlled on a fork PR.
  assert.match(SRC, /BASE_REF: \$\{\{ github\.base_ref \}\}/);
  assert.match(SRC, /HEAD_REF: \$\{\{ github\.head_ref \}\}/);
  assert.ok(
    !/run:[\s\S]*\$\{\{ github\.(head|base)_ref \}\}/.test(SRC),
    "no ref interpolated into the run block",
  );
});
