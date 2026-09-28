"use strict";
/**
 * Clean-checkout runner — `scripts/test-clean-checkout.sh` runs a command in a
 * clone of HEAD that has none of the working tree's gitignored paths, and keeps
 * what CI's `fetch-depth: 0` checkout keeps.
 *
 * WHY THIS EXISTS
 * ---------------
 * An in-place `npm test` passes on anything the developer's checkout supplies
 * and CI's does not. The one that bit: a snippet test reached
 * `.agents/skills/…` from the repo root, which resolves only through the
 * gitignored `.agents/skills -> ../skills` symlink — 71/71 locally, 19 rows red
 * on every CI push (obs #149). `npm run test:clean-checkout` is the local run
 * without that symlink, and `scripts/release.sh` gates on it. This test proves
 * the runner actually excludes ignored paths: a runner that copied the working
 * tree (`cp -R`) would pass the fixture's check and certify the symlink again.
 *
 * The fixture is a throwaway git repo whose committed `check.sh` passes only
 * through a gitignored symlink. It lives under a repo-local, gitignored base
 * (`.clean-checkout-test-tmp/`), never a temporary directory: the runner refuses
 * one, for the reason in observation-log.test.mjs's scratch-base comment.
 *
 * Run: node --test tests/test-clean-checkout.test.js
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const RUNNER = path.join(REPO_ROOT, "scripts", "test-clean-checkout.sh");
const BASE = path.join(REPO_ROOT, ".clean-checkout-test-tmp");

const GIT_ID = [
  "-c",
  "user.name=fixture",
  "-c",
  "user.email=fixture@example.invalid",
  "-c",
  "commit.gpgsign=false",
  "-c",
  "tag.gpgsign=false",
];

function git(cwd, ...args) {
  const r = spawnSync("git", [...GIT_ID, ...args], { cwd, encoding: "utf-8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} failed:\n${r.stderr}`);
  return r.stdout.trim();
}

/**
 * A repo whose committed check passes only through a gitignored symlink, with a
 * tag and a tracked-but-ignored file — the three things a clone must get right.
 */
function makeFixture() {
  fs.mkdirSync(BASE, { recursive: true });
  // The repo sits one level inside its own wrapper, so a refusal case can name
  // the repo's PARENT without that parent being the shared BASE.
  const wrapper = fs.mkdtempSync(path.join(BASE, "wrap-"));
  const repo = path.join(wrapper, "repo");
  fs.mkdirSync(repo);
  const w = (rel, content) => {
    fs.mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true });
    fs.writeFileSync(path.join(repo, rel), content);
  };
  w(".gitignore", ".agents/skills\nnode_modules/\nIGNORED-BUT-TRACKED.md\n");
  w("check.sh", "test -f .agents/skills/x/marker\n");
  w("skills/x/marker", "marker\n");
  w("IGNORED-BUT-TRACKED.md", "tracked despite .gitignore\n");
  git(repo, "init", "--quiet");
  git(repo, "add", ".gitignore", "check.sh", "skills/x/marker");
  git(repo, "add", "--force", "IGNORED-BUT-TRACKED.md");
  git(repo, "commit", "--quiet", "-m", "fixture");
  git(repo, "tag", "v0.0.1");
  // Untracked and ignored: present in the working tree, absent from any clone.
  fs.mkdirSync(path.join(repo, ".agents"));
  fs.symlinkSync("../skills", path.join(repo, ".agents", "skills"));
  fs.mkdirSync(path.join(repo, "node_modules"));
  return {
    repo,
    wrapper,
    cloneDir: path.join(wrapper, "clone"),
    cleanup: () => fs.rmSync(wrapper, { recursive: true, force: true }),
  };
}

function runRunner(fx, cmd, extraEnv = {}) {
  return spawnSync("bash", [RUNNER], {
    cwd: fx.repo,
    encoding: "utf-8",
    env: {
      ...process.env,
      CLEAN_CHECKOUT_DIR: fx.cloneDir,
      CLEAN_CHECKOUT_CMD: cmd,
      ...extraEnv,
    },
  });
}

test("in place, the fixture's check passes — through the gitignored symlink", () => {
  const fx = makeFixture();
  try {
    const r = spawnSync("bash", ["check.sh"], { cwd: fx.repo });
    assert.equal(
      r.status,
      0,
      "premise: the check must pass in place, or the runner case proves nothing",
    );
  } finally {
    fx.cleanup();
  }
});

test("through the runner, the same check fails — the clone has no gitignored symlink", () => {
  const fx = makeFixture();
  try {
    const r = runRunner(fx, "bash check.sh");
    assert.notEqual(
      r.status,
      0,
      `the check passed in the clone, so the runner carried an ignored path in:\n${r.stderr}`,
    );
    assert.ok(!fs.existsSync(fx.cloneDir), "the clone must be removed on exit");
  } finally {
    fx.cleanup();
  }
});

test("the runner runs committed content, keeps tags and tracked-but-ignored files", () => {
  // The positive control for the case above: without it, a runner that failed
  // for ANY reason would satisfy "the check fails".
  const fx = makeFixture();
  try {
    const r = runRunner(
      fx,
      "test -f skills/x/marker && test -f IGNORED-BUT-TRACKED.md && " +
        "test ! -e .agents/skills && test -d node_modules && " +
        'test "$(git describe --tags --abbrev=0)" = v0.0.1',
    );
    assert.equal(r.status, 0, `clone is missing committed state:\n${r.stderr}`);
  } finally {
    fx.cleanup();
  }
});

test("the runner warns that uncommitted changes are not tested", () => {
  const fx = makeFixture();
  try {
    fs.writeFileSync(path.join(fx.repo, "check.sh"), "exit 0\n");
    const r = runRunner(fx, "bash check.sh");
    assert.match(r.stderr, /uncommitted changes are NOT tested/);
    assert.notEqual(r.status, 0, "the clone must run HEAD, not the edit");
  } finally {
    fx.cleanup();
  }
});

test("the runner refuses a temporary-directory clone location", () => {
  const fx = makeFixture();
  try {
    for (const dir of ["/tmp/clean-checkout-x", "/var/tmp/clean-checkout-x"]) {
      const r = runRunner(fx, "true", { CLEAN_CHECKOUT_DIR: dir });
      assert.equal(r.status, 2, `expected exit 2 for ${dir}, got ${r.status}`);
      assert.match(r.stderr, /refusing .* temporary directory/);
    }
  } finally {
    fx.cleanup();
  }
});

test("the runner refuses when node_modules is missing", () => {
  const fx = makeFixture();
  try {
    fs.rmSync(path.join(fx.repo, "node_modules"), { recursive: true });
    const r = runRunner(fx, "true");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /node_modules is missing/);
  } finally {
    fx.cleanup();
  }
});

// Task 154 QA cycle 1 (TASK-154-BUG-1): the runner deletes its clone directory,
// and the first version deleted whatever CLEAN_CHECKOUT_DIR named. Each case
// below names a location the runner must NOT delete, and asserts both the
// refusal and that the location survived — a refusal that still deleted would
// pass an exit-code check alone.
test("the runner refuses to delete the repository, an ancestor, root, or a directory it did not create", () => {
  const fx = makeFixture();
  try {
    const foreign = path.join(fx.wrapper, "foreign");
    fs.mkdirSync(foreign);
    fs.writeFileSync(path.join(foreign, "precious"), "keep\n");
    const cases = [
      { dir: fx.repo, why: /is the repository or contains it/ },
      { dir: ".", why: /is the repository or contains it/ },
      { dir: fx.wrapper, why: /is the repository or contains it/ },
      { dir: "/", why: /contains the repository/ },
      { dir: foreign, why: /was not created by this script/ },
    ];
    for (const { dir, why } of cases) {
      const r = runRunner(fx, "true", { CLEAN_CHECKOUT_DIR: dir });
      assert.equal(
        r.status,
        2,
        `expected exit 2 for ${dir}, got ${r.status}:\n${r.stderr}`,
      );
      assert.match(r.stderr, why, `wrong refusal for ${dir}`);
    }
    assert.ok(
      fs.existsSync(path.join(fx.repo, ".git")),
      "the repository was deleted",
    );
    assert.ok(
      fs.existsSync(path.join(foreign, "precious")),
      "the foreign directory was emptied",
    );
  } finally {
    fx.cleanup();
  }
});

test("the runner refuses a path that resolves into a temporary directory through a symlink", () => {
  const fx = makeFixture();
  try {
    const link = path.join(fx.wrapper, "to-tmp");
    fs.symlinkSync("/tmp", link);
    const r = runRunner(fx, "true", {
      CLEAN_CHECKOUT_DIR: path.join(link, "x"),
    });
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /temporary directory/);
  } finally {
    fx.cleanup();
  }
});

test("the runner re-uses its own marked clone, an empty directory, and a relative path — and leaves none behind", () => {
  const fx = makeFixture();
  try {
    // A leftover from an interrupted run: the runner's own marker in .git/.
    fs.mkdirSync(path.join(fx.cloneDir, ".git"), { recursive: true });
    fs.writeFileSync(
      path.join(fx.cloneDir, ".git", "test-clean-checkout.marker"),
      "",
    );
    fs.writeFileSync(path.join(fx.cloneDir, "stale"), "x\n");
    let r = runRunner(fx, "test -f skills/x/marker && test ! -e stale");
    assert.equal(
      r.status,
      0,
      `leftover marked clone was not replaced:\n${r.stderr}`,
    );
    assert.ok(!fs.existsSync(fx.cloneDir), "clone left behind");

    const empty = path.join(fx.wrapper, "empty");
    fs.mkdirSync(empty);
    r = runRunner(fx, "true", { CLEAN_CHECKOUT_DIR: empty });
    assert.equal(r.status, 0, `empty directory refused:\n${r.stderr}`);

    // Relative to the invoking directory (the fixture repo). The first version
    // ran its EXIT-trap `rm -rf` on the relative path after `cd` into the
    // clone, so the clone was never removed.
    r = runRunner(fx, "true", { CLEAN_CHECKOUT_DIR: "rel-clone" });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(
      !fs.existsSync(path.join(fx.repo, "rel-clone")),
      "relative clone left behind",
    );
  } finally {
    fx.cleanup();
  }
});
