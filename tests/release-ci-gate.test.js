"use strict";
/**
 * `scripts/release.sh` reads CI's verdict before its local test, and refuses on anything but green
 * (task 153, obs #150). The real script runs in a scratch clone of a scratch bare origin, with `gh`
 * and `npm` stubbed on PATH:
 *
 *   - `gh` prints a canned `gh run list` array, or exits non-zero like an unauthenticated CLI;
 *   - `npm` records that it was called (a marker file) and exits with a chosen code.
 *
 * The marker file is what makes "refused BEFORE the local test" observable: a CI check moved after
 * `npm run test:clean-checkout`, or deleted, leaves the marker behind (mutations M3 and M4).
 *
 * No case reaches the commit/tag/push step: the refusals exit before it, the npm-red case exits at
 * the local test, and the rest are --dry-run. Assertions are on exit status and output, never on
 * elapsed time — this suite spawns bash and git per case, the load-sensitive shape the task names.
 *
 * Run: node --test tests/release-ci-gate.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const REPO = path.join(__dirname, "..");

let budget;
test.before(async () => {
  const { spawnBudget } = await import(
    pathToFileURL(path.join(REPO, "shared", "resources", "spawn-budget.mjs"))
      .href
  );
  budget = spawnBudget("RELEASE_GATE");
});

const TEMP_DIRS = [];
test.after(() => {
  for (const d of TEMP_DIRS) fs.rmSync(d, { recursive: true, force: true });
});

// Isolate git from the developer's own config (signing, hooks, default branch).
const GIT_ENV = {
  GIT_CONFIG_GLOBAL: os.devNull,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};

function sh(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...GIT_ENV },
    timeout: budget.timeoutMs,
  });
  if (r.status !== 0)
    throw new Error(`${cmd} ${args.join(" ")}: ${r.stderr || r.error}`);
  return r.stdout.trim();
}

const run = (workflowName, conclusion, id) => ({
  workflowName,
  status: "completed",
  conclusion,
  event: "push",
  databaseId: id,
  url: `https://github.com/o/r/actions/runs/${id}`,
});
const GREEN = [run("Test", "success", 1), run("ShellCheck", "success", 2)];
const RED = [run("Test", "failure", 3), run("ShellCheck", "success", 4)];

/** A scratch origin + clone on `main`, with `develop` present and both pushed. */
function sandbox({ verdictStub = "" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-ci-gate-"));
  TEMP_DIRS.push(root);
  const origin = path.join(root, "origin.git");
  const work = path.join(root, "work");
  const bin = path.join(root, "bin");
  sh("git", ["init", "--bare", "-q", "-b", "main", origin], root);
  sh("git", ["clone", "-q", origin, work], root);
  fs.mkdirSync(path.join(work, "scripts"));
  for (const f of ["release.sh", "release-ci-verdict.mjs"]) {
    fs.copyFileSync(
      path.join(REPO, "scripts", f),
      path.join(work, "scripts", f),
    );
  }
  // Replaces the verdict module BEFORE the initial commit, so the tree stays clean for pre-flight.
  if (verdictStub)
    fs.writeFileSync(
      path.join(work, "scripts", "release-ci-verdict.mjs"),
      verdictStub,
    );
  fs.writeFileSync(
    path.join(work, "CHANGELOG.md"),
    "# Changelog\n\n## [Unreleased]\n\n### Fixed\n\n- something (task 153)\n",
  );
  sh("git", ["checkout", "-q", "-b", "main"], work);
  sh("git", ["add", "."], work);
  sh("git", ["commit", "-q", "-m", "init"], work);
  sh("git", ["push", "-q", "origin", "main"], work);
  sh("git", ["branch", "develop"], work);
  sh("git", ["push", "-q", "origin", "develop"], work);

  fs.mkdirSync(bin);
  // gh: GH_EXIT non-zero → an auth-style failure; otherwise print the fixture file.
  fs.writeFileSync(
    path.join(bin, "gh"),
    '#!/bin/sh\necho "$*" >> "$GH_ARGS_LOG"\nif [ "${GH_EXIT:-0}" != 0 ]; then\n  echo "To get started with GitHub CLI, please run:  gh auth login" >&2\n  exit "$GH_EXIT"\nfi\ncat "$GH_FIXTURE"\n',
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(bin, "npm"),
    '#!/bin/sh\necho "$*" >> "$NPM_MARKER"\nexit "${NPM_EXIT:-0}"\n',
    { mode: 0o755 },
  );
  // curl: only --retry's published-Release guard calls it; answer "not published".
  fs.writeFileSync(path.join(bin, "curl"), "#!/bin/sh\nprintf 404\n", {
    mode: 0o755,
  });
  return { root, work, bin };
}

function release(
  args,
  { runs = GREEN, ghExit = 0, npmExit = 0, tag = "", verdictStub = "" } = {},
) {
  const box = sandbox({ verdictStub });
  if (tag) {
    sh("git", ["tag", "-a", tag, "-m", tag], box.work);
    sh("git", ["push", "-q", "origin", tag], box.work);
  }
  const fixture = path.join(box.root, "runs.json");
  fs.writeFileSync(fixture, JSON.stringify(runs));
  const marker = path.join(box.root, "npm-called");
  const ghArgs = path.join(box.root, "gh-args");
  const r = spawnSync("bash", [path.join("scripts", "release.sh"), ...args], {
    cwd: box.work,
    encoding: "utf8",
    env: {
      ...process.env,
      ...GIT_ENV,
      PATH: `${box.bin}${path.delimiter}${process.env.PATH}`,
      GH_FIXTURE: fixture,
      GH_EXIT: String(ghExit),
      NPM_MARKER: marker,
      GH_ARGS_LOG: ghArgs,
      NPM_EXIT: String(npmExit),
      NO_COLOR: "1",
    },
    timeout: budget.timeoutMs,
  });
  const out = `${r.stdout}\n${r.stderr}`;
  const tags = sh("git", ["tag"], box.work);
  const ghCalls = fs.existsSync(ghArgs) ? fs.readFileSync(ghArgs, "utf8") : "";
  return {
    status: r.status,
    out,
    npmCalled: fs.existsSync(marker),
    tags,
    ghCalls,
  };
}

test("red CI refuses before the local test runs, naming the workflow and the escape hatch", () => {
  const r = release(["--patch"], { runs: RED });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /CI is red for [0-9a-f]{8} — refusing to release/);
  assert.match(
    r.out,
    /Test: red \(https:\/\/github.com\/o\/r\/actions\/runs\/3\)/,
  );
  assert.match(r.out, /--skip-ci-check/);
  assert.equal(
    r.npmCalled,
    false,
    "npm ran — the CI check did not come BEFORE the local test",
  );
  assert.equal(r.tags, "", "nothing tagged");
  assert.match(
    r.ghCalls,
    /^-R Gamaroff\/agent-skills run list --commit [0-9a-f]{40} /,
    "gh is pinned to REPO_SLUG (CR-2)",
  );
});

test("gh failing (unauthenticated) refuses as unverifiable", () => {
  const r = release(["--patch"], { ghExit: 4 });
  assert.equal(r.status, 1, r.out);
  assert.match(
    r.out,
    /CI is unverifiable for [0-9a-f]{8} — refusing to release/,
  );
  assert.match(r.out, /gh auth login/);
  assert.equal(r.npmCalled, false);
});

test("a required workflow with no run refuses as unverifiable", () => {
  const r = release(["--patch"], { runs: [run("Test", "success", 5)] });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /CI is unverifiable/);
  assert.match(r.out, /ShellCheck: no run for this commit/);
  assert.equal(r.npmCalled, false);
});

test("pending CI refuses with the re-run-when-it-finishes instruction", () => {
  const r = release(["--patch"], {
    runs: [
      { ...run("Test", "", 6), status: "in_progress" },
      run("ShellCheck", "success", 7),
    ],
  });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /CI is pending/);
  assert.match(r.out, /still running .* re-run when it finishes/);
  assert.equal(r.npmCalled, false);
});

test("green CI reaches the local test; a red local test prints the LOAD-SENSITIVE re-run rule", () => {
  const r = release(["--patch"], { runs: GREEN, npmExit: 1 });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /CI green for [0-9a-f]{8}/);
  assert.equal(r.npmCalled, true, "green CI must reach the local test");
  assert.match(r.out, /npm run test:clean-checkout failed/);
  assert.match(r.out, /LOAD-SENSITIVE, re-run that file alone/);
  assert.match(r.out, /traps\.md § Load-sensitive tests/);
  assert.equal(r.tags, "");
});

test("--dry-run with red CI prints the verdict and 'Would have REFUSED'", () => {
  const r = release(["--dry-run", "--patch"], { runs: RED });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /CI is red for [0-9a-f]{8}/);
  assert.match(r.out, /A real run would refuse here/);
  assert.match(r.out, /Would have REFUSED: CI red for [0-9a-f]{8}/);
});

test("--dry-run with green CI does not print 'Would have REFUSED'", () => {
  const r = release(["--dry-run", "--patch"], { runs: GREEN });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /Next version: v0\.0\.1/);
  assert.doesNotMatch(r.out, /REFUSED/);
});

test("--skip-ci-check --dry-run with red CI proceeds, warning that it is unverified", () => {
  const r = release(["--skip-ci-check", "--dry-run", "--patch"], { runs: RED });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /Proceeding UNVERIFIED against CI \(--skip-ci-check\)/);
  assert.match(r.out, /Next version: v0\.0\.1/);
  assert.doesNotMatch(r.out, /REFUSED/);
});

test("--skip-ci-check with red CI proceeds to the local test", () => {
  const r = release(["--skip-ci-check", "--patch"], { runs: RED, npmExit: 1 });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /UNVERIFIED against CI/);
  assert.equal(r.npmCalled, true);
});

test("--retry skips the CI check (it re-tags an existing release and keeps its own guard)", () => {
  const r = release(["--dry-run", "--retry"], { runs: RED, tag: "v0.0.1" });
  assert.equal(r.status, 0, r.out);
  assert.doesNotMatch(r.out, /CI verdict/);
  assert.doesNotMatch(r.out, /REFUSED/);
  assert.match(r.out, /Would have retried: v0\.0\.1/);
});

test("a verdict module that prints something unrecognisable refuses as unverifiable — never green", () => {
  for (const out of [
    "",
    "greenish\tlooks fine",
    "no tab at all",
    "GREEN\tshouting",
  ]) {
    const r = release(["--patch"], {
      verdictStub: `process.stdout.write(${JSON.stringify(out)}); process.exitCode = 0;\n`,
    });
    assert.equal(r.status, 1, JSON.stringify(out) + "\n" + r.out);
    assert.match(r.out, /CI is unverifiable/);
    assert.equal(r.npmCalled, false);
  }
});
