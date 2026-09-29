"use strict";
/**
 * `scripts/release-ci-verdict.mjs` — the reduction rule, the CLI's fail-closed paths, and the
 * workflow table's parity with `.github/workflows/` (task 153, obs #150).
 *
 * The rule is the one thing that decides whether a release may be tagged, so every row of it is a
 * case here, and every way of NOT reading CI (no `gh`, a failing `gh`, output that is not a JSON
 * array) is held to `unverifiable` — never `green`. `gh` is always a stub: these tests make no
 * network call.
 *
 * Run: node --test tests/release-ci-verdict.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const REPO = path.join(__dirname, "..");
const SCRIPT = path.join(REPO, "scripts", "release-ci-verdict.mjs");
const WORKFLOW_DIR = path.join(REPO, ".github", "workflows");
const SHA = "0123456789abcdef0123456789abcdef01234567";

let mod;
let budget;
test.before(async () => {
  mod = await import(pathToFileURL(SCRIPT).href);
  const { spawnBudget } = await import(
    pathToFileURL(path.join(REPO, "shared", "resources", "spawn-budget.mjs"))
      .href
  );
  budget = spawnBudget("RELEASE_VERDICT");
});

const run = (workflowName, conclusion, status = "completed", id = 1) => ({
  workflowName,
  status,
  conclusion,
  event: "push",
  databaseId: id,
  url: `https://github.com/o/r/actions/runs/${id}`,
});
const GREEN_REQUIRED = [
  run("Test", "success", "completed", 1),
  run("ShellCheck", "success", "completed", 2),
];

// ── the reduction rule ──────────────────────────────────────────────────────

test("verdict: every required workflow green → green", () => {
  assert.equal(mod.ciVerdict(GREEN_REQUIRED).reason, "green");
});

for (const conclusion of [
  "failure",
  "timed_out",
  "startup_failure",
  "action_required",
]) {
  test(`verdict: a ${conclusion} run is red`, () => {
    const v = mod.ciVerdict([
      run("Test", conclusion, "completed", 9),
      run("ShellCheck", "success"),
    ]);
    assert.equal(v.reason, "red");
    assert.match(v.detail, /Test: red/);
    assert.match(v.detail, /runs\/9/, "the refusal names the run");
  });
}

test("verdict: two runs of one workflow, one failure → red (one red among them is red)", () => {
  const v = mod.ciVerdict([
    run("Test", "success", "completed", 1),
    run("Test", "failure", "completed", 2),
    run("ShellCheck", "success", "completed", 3),
  ]);
  assert.equal(v.reason, "red");
});

test("verdict: an in_progress run is pending", () => {
  const v = mod.ciVerdict([
    run("Test", "", "in_progress"),
    run("ShellCheck", "success"),
  ]);
  assert.equal(v.reason, "pending");
});

test("verdict: red outranks pending", () => {
  const v = mod.ciVerdict([
    run("Test", "", "queued"),
    run("ShellCheck", "failure"),
  ]);
  assert.equal(v.reason, "red");
});

test("verdict: no runs for a required workflow → unverifiable, not green", () => {
  const v = mod.ciVerdict([run("Test", "success")]);
  assert.equal(v.reason, "unverifiable");
  assert.match(v.detail, /ShellCheck: no run for this commit/);
});

test("verdict: no runs at all → unverifiable", () => {
  assert.equal(mod.ciVerdict([]).reason, "unverifiable");
});

test("verdict: cancelled alone → unverifiable", () => {
  const v = mod.ciVerdict([
    run("Test", "cancelled"),
    run("ShellCheck", "success"),
  ]);
  assert.equal(v.reason, "unverifiable");
});

test("verdict: skipped / neutral alone → unverifiable", () => {
  for (const c of ["skipped", "neutral"]) {
    assert.equal(
      mod.ciVerdict([run("Test", c), run("ShellCheck", "success")]).reason,
      "unverifiable",
    );
  }
});

test("verdict: a cancelled run superseded by a success → green", () => {
  const v = mod.ciVerdict([
    run("Test", "cancelled", "completed", 1),
    run("Test", "success", "completed", 2),
    run("ShellCheck", "success"),
  ]);
  assert.equal(v.reason, "green");
});

test("verdict: a whenPresent workflow that is absent → still green", () => {
  const v = mod.ciVerdict(GREEN_REQUIRED);
  assert.equal(v.reason, "green");
  assert.ok(!v.workflows.some((w) => w.name === "Validate Skills"));
});

test("verdict: a whenPresent workflow present and red → red", () => {
  const v = mod.ciVerdict([
    ...GREEN_REQUIRED,
    run("Validate Skills", "failure"),
  ]);
  assert.equal(v.reason, "red");
});

test("verdict: a whenPresent workflow present and cancelled only → ignored", () => {
  assert.equal(
    mod.ciVerdict([...GREEN_REQUIRED, run("Docs link check", "cancelled")])
      .reason,
    "green",
  );
});

test("verdict: workflows outside the table (Release, Branch Policy) are ignored", () => {
  const v = mod.ciVerdict([
    ...GREEN_REQUIRED,
    run("Release", "failure"),
    run("Branch Policy", "failure"),
  ]);
  assert.equal(v.reason, "green");
});

test("verdict: a non-array input is unverifiable", () => {
  assert.equal(mod.ciVerdict(null).reason, "unverifiable");
  assert.equal(mod.ciVerdict({}).reason, "unverifiable");
});

test("verdict: the refusal names the run that produced the verdict, not the first run (CR2-2)", () => {
  const red = mod.ciVerdict([
    run("Test", "success", "completed", 11),
    run("Test", "failure", "completed", 12),
    run("ShellCheck", "success", "completed", 13),
  ]);
  assert.match(
    red.detail,
    /Test: red \(https:\/\/github\.com\/o\/r\/actions\/runs\/12\)/,
  );
  const pending = mod.ciVerdict([
    run("Test", "success", "completed", 21),
    { ...run("Test", "", "in_progress", 22) },
    run("ShellCheck", "success", "completed", 23),
  ]);
  assert.match(
    pending.detail,
    /Test: pending \(https:\/\/github\.com\/o\/r\/actions\/runs\/22\)/,
  );
});

test("isRepoSlug: GitHub's owner/name shape — no traversal segment, no leading or trailing hyphen (PRB2-1)", () => {
  for (const ok of ["Gamaroff/agent-skills", "o/r", "a-b/c.d_e", "a/.github"])
    assert.equal(mod.isRepoSlug(ok), true, ok);
  for (const bad of [
    "../x",
    "o/..",
    "o/.",
    "-o/r",
    "o-/r",
    "o--p/r",
    "o",
    "o/r/x",
    "",
    "o/r\n",
  ])
    assert.equal(mod.isRepoSlug(bad), false, JSON.stringify(bad));
});

// ── fetchRuns: every way of not reading CI is an error, never runs ────────

test("fetchRuns: gh not installed (ENOENT) → error", () => {
  const spawn = () => ({
    error: Object.assign(new Error("spawn gh ENOENT"), { code: "ENOENT" }),
  });
  const r = mod.fetchRuns(SHA, { spawn });
  assert.match(r.error, /ENOENT/);
  assert.equal(r.runs, undefined);
});

test("fetchRuns: asks gh for this commit's runs with the fields the rule reads", () => {
  let seen;
  const spawn = (cmd, args) => {
    seen = [cmd, ...args];
    return { status: 0, stdout: "[]" };
  };
  mod.fetchRuns(SHA, { spawn });
  assert.equal(seen[0], "gh");
  assert.deepEqual(seen.slice(1, 5), ["run", "list", "--commit", SHA]);
  const fields = seen[seen.indexOf("--json") + 1].split(",");
  for (const f of ["workflowName", "status", "conclusion", "databaseId", "url"])
    assert.ok(fields.includes(f), f);
  assert.ok(!seen.includes("-R"), "no -R when no repo is given");
});

test("fetchRuns: a repo is passed to gh as -R, so a multi-remote clone cannot pick the wrong one (CR-2)", () => {
  let seen;
  const spawn = (cmd, args) => {
    seen = args;
    return { status: 0, stdout: "[]" };
  };
  mod.fetchRuns(SHA, { spawn, repo: "Gamaroff/agent-skills" });
  assert.deepEqual(seen.slice(0, 2), ["-R", "Gamaroff/agent-skills"]);
});

// ── the CLI, with a PATH-stubbed gh ────────────────────────────────────────

function stubDir(script) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-ci-verdict-"));
  fs.writeFileSync(path.join(dir, "gh"), `#!/bin/sh\n${script}\n`, {
    mode: 0o755,
  });
  return dir;
}
function cli(args, stub) {
  const dir = stubDir(stub);
  try {
    return spawnSync(process.execPath, [SCRIPT, ...args], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${dir}${path.delimiter}${process.env.PATH}`,
      },
      timeout: budget.timeoutMs,
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const json = (runs) => `cat <<'EOF'\n${JSON.stringify(runs)}\nEOF`;

test("cli: green runs → exit 0, reason green", () => {
  const r = cli(["--sha", SHA, "--json"], json(GREEN_REQUIRED));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).reason, "green");
});

test("cli: red runs → exit 1, reason red", () => {
  const r = cli(
    ["--sha", SHA, "--json"],
    json([run("Test", "failure"), run("ShellCheck", "success")]),
  );
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).reason, "red");
});

test("cli: gh exits non-zero (unauthenticated) → exit 1, unverifiable", () => {
  const r = cli(
    ["--sha", SHA, "--json"],
    'echo "To get started with GitHub CLI, please run:  gh auth login" >&2; exit 4',
  );
  assert.equal(r.status, 1);
  const out = JSON.parse(r.stdout);
  assert.equal(out.reason, "unverifiable");
  assert.match(out.detail, /gh auth login/);
});

test("cli: gh prints non-JSON → exit 1, unverifiable", () => {
  const r = cli(["--sha", SHA, "--json"], "echo 'not json'");
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).reason, "unverifiable");
});

test("cli: gh prints a JSON object, not an array → exit 1, unverifiable", () => {
  const r = cli(["--sha", SHA, "--json"], `echo '{"runs":[]}'`);
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).reason, "unverifiable");
});

test("cli: a missing or short --sha is a usage error (exit 2), and gh is never asked", () => {
  for (const args of [[], ["--sha", "abc123"], ["--sha"]]) {
    const r = cli(args, "echo called >&2; exit 0");
    assert.equal(r.status, 2, JSON.stringify(args));
    assert.doesNotMatch(r.stderr, /called/);
  }
  assert.equal(cli(["--bogus"], "exit 0").status, 2);
});

test("cli: --repo reaches gh as -R; a malformed --repo is a usage error and gh is never asked", () => {
  const ok = cli(
    ["--sha", SHA, "--repo", "o/r", "--json"],
    `[ "$1" = "-R" ] && [ "$2" = "o/r" ] || { echo "no -R o/r: $*" >&2; exit 9; }\n` +
      json(GREEN_REQUIRED),
  );
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  for (const bad of ["o", "o/r/x", "o r/x", "--json", "../x", "o/..", "-o/r"]) {
    const r = cli(["--sha", SHA, "--repo", bad], "echo called >&2; exit 0");
    assert.equal(r.status, 2, bad);
    assert.doesNotMatch(r.stderr, /called/);
  }
});

test("cli: without --json prints one human line", () => {
  const r = cli(
    ["--sha", SHA],
    json([
      run("Test", "failure", "completed", 7),
      run("ShellCheck", "success"),
    ]),
  );
  assert.match(
    r.stdout,
    /^CI red for 01234567 — Test: red \(https:\/\/github.com\/o\/r\/actions\/runs\/7\)\n$/,
  );
});

// ── parity: the table equals .github/workflows ─────────────────────────────

/** name: and whether on.push exists and carries paths:, read line by line (no YAML dependency). */
function readWorkflow(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const name = (lines.find((l) => /^name:/.test(l)) || "")
    .replace(/^name:\s*/, "")
    .replace(/^['"]|['"]$/g, "")
    .trim();
  const onAt = lines.findIndex((l) => /^on:\s*$/.test(l));
  let push = false;
  let pushPaths = false;
  if (onAt >= 0) {
    let inPush = false;
    for (const l of lines.slice(onAt + 1)) {
      if (/^\S/.test(l)) break; // next top-level key
      if (/^ {2}\S/.test(l)) inPush = /^ {2}push:/.test(l);
      if (/^ {2}push:/.test(l)) push = true;
      if (inPush && /^ {4}paths(-ignore)?:/.test(l)) pushPaths = true;
    }
  }
  // Only the block form is read. An inline trigger (`on: push`, `on: [push, pull_request]`) is
  // reported unreadable rather than read as "not push-triggered" — the parity cases below would
  // otherwise pass over exactly the workflow they cannot see (QA cycle 1, CR-3).
  return { name, push, pushPaths, readable: onAt >= 0 };
}

test("readWorkflow: an inline on: is unreadable, never 'not push-triggered' (CR-3)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-ci-verdict-wf-"));
  try {
    for (const on of ["on: push", "on: [push, pull_request]"]) {
      const file = path.join(dir, "w.yml");
      fs.writeFileSync(file, `name: W\n${on}\njobs: {}\n`);
      assert.equal(readWorkflow(file).readable, false, on);
    }
    const block = path.join(dir, "b.yml");
    fs.writeFileSync(block, "name: B\non:\n  push:\n    branches: [main]\n");
    assert.deepEqual(readWorkflow(block), {
      name: "B",
      push: true,
      pushPaths: false,
      readable: true,
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("parity: every workflow's trigger is in the block form this reader can see", () => {
  const files = fs.readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f));
  assert.ok(files.length >= 4, `non-vacuity: ${files.length} workflow file(s)`);
  const unreadable = files.filter(
    (f) => !readWorkflow(path.join(WORKFLOW_DIR, f)).readable,
  );
  assert.deepEqual(
    unreadable,
    [],
    "inline on: — rewrite it as a block, or teach readWorkflow the form",
  );
});

test("parity: every WORKFLOWS name is a workflow's name:, with the push shape its list claims", () => {
  const files = fs.readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f));
  const byName = new Map(
    files.map((f) => [
      readWorkflow(path.join(WORKFLOW_DIR, f)).name,
      readWorkflow(path.join(WORKFLOW_DIR, f)),
    ]),
  );
  assert.ok(
    byName.size >= 4,
    `non-vacuity: read ${byName.size} workflow names`,
  );
  for (const n of mod.WORKFLOWS.required) {
    const w = byName.get(n);
    assert.ok(
      w,
      `required workflow "${n}" is not the name: of any file in .github/workflows`,
    );
    assert.ok(
      w.push && !w.pushPaths,
      `required workflow "${n}" must run on every push (no push.paths) — else move it to whenPresent`,
    );
  }
  for (const n of mod.WORKFLOWS.whenPresent) {
    const w = byName.get(n);
    assert.ok(
      w,
      `whenPresent workflow "${n}" is not the name: of any file in .github/workflows`,
    );
    assert.ok(
      w.push && w.pushPaths,
      `whenPresent workflow "${n}" must be push.paths-filtered — else move it to required`,
    );
  }
});

test("parity: every push-triggered branch workflow is in the table (a new one is a decision, not a default)", () => {
  const files = fs.readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f));
  const listed = new Set([
    ...mod.WORKFLOWS.required,
    ...mod.WORKFLOWS.whenPresent,
  ]);
  for (const f of files) {
    const text = fs.readFileSync(path.join(WORKFLOW_DIR, f), "utf8");
    const w = readWorkflow(path.join(WORKFLOW_DIR, f));
    // Release runs on tag pushes, not branch pushes — it gates the tag, after this check.
    const branchPush = w.push && !/^ {2}push:\s*\n {4}tags:/m.test(text);
    if (branchPush)
      assert.ok(
        listed.has(w.name),
        `${f} ("${w.name}") runs on push but is not in WORKFLOWS`,
      );
  }
});
