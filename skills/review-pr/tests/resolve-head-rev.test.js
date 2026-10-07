/**
 * Behavioural tests for scripts/resolve-head-rev.sh — the commit Step 6 checks anchors against.
 *
 * The defect: Step 6's only route to the head of a PR whose branch is gone was GitHub's
 * `pull/<n>/head`. Bitbucket keeps no such ref, so auditing a merged Bitbucket PR stopped at
 * Step 6 with `bad-rev`. Every test builds real repositories — a bare "origin" served over
 * file:// so a clone receives only reachable objects, exactly as from a remote host.
 *
 * Run via: node --test skills/review-pr/tests/resolve-head-rev.test.js
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("child_process");

const SCRIPT = path.join(__dirname, "..", "scripts", "resolve-head-rev.sh");
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};

function git(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

/** A bare origin with `main` and a pushed `feature` branch; returns the seed clone too. */
function origin(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-head-rev-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bare = path.join(root, "origin.git");
  git(root, "init", "-q", "--bare", "-b", "main", bare);
  const seed = path.join(root, "seed");
  git(root, "init", "-q", "-b", "main", seed);
  git(seed, "remote", "add", "origin", `file://${bare}`);
  fs.writeFileSync(path.join(seed, "a.txt"), "base\n");
  git(seed, "add", ".");
  git(seed, "commit", "-q", "-m", "base");
  git(seed, "push", "-q", "origin", "main");
  git(seed, "checkout", "-q", "-b", "feature");
  fs.writeFileSync(path.join(seed, "b.txt"), "feature\n");
  git(seed, "add", ".");
  git(seed, "commit", "-q", "-m", "feature");
  git(seed, "push", "-q", "origin", "feature");
  const head = git(seed, "rev-parse", "HEAD");
  return { root, bare, seed, head };
}

/** A fresh clone over file:// — only objects reachable from origin's refs arrive. */
function clone(o, name) {
  const dir = path.join(o.root, name);
  git(o.root, "clone", "-q", `file://${o.bare}`, dir);
  return dir;
}

function run(shell, cwd, args) {
  const argv =
    shell === "zsh"
      ? ["-f", SCRIPT, ...args]
      : ["--noprofile", "--norc", SCRIPT, ...args];
  const r = spawnSync(shell, argv, { cwd, env: GIT_ENV, encoding: "utf8" });
  const out = {};
  for (const line of r.stdout.split("\n").filter(Boolean)) {
    const i = line.indexOf("=");
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return { status: r.status, stderr: r.stderr, ...out };
}

for (const shell of SHELLS) {
  test(`${shell}: a live source branch resolves by head-branch`, (t) => {
    const o = origin(t);
    const r = run(shell, clone(o, "c"), [
      "--vcs",
      "bitbucket",
      "--head-branch",
      "feature",
      "--base-branch",
      "main",
    ]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.via, "head-branch");
    assert.equal(r.rev, o.head);
  });

  test(`${shell}: Bitbucket, merged with a merge commit, branch deleted → source-commit`, (t) => {
    const o = origin(t);
    git(o.seed, "checkout", "-q", "main");
    git(o.seed, "merge", "-q", "--no-ff", "-m", "merge", "feature");
    git(o.seed, "push", "-q", "origin", "main");
    git(o.seed, "push", "-q", "origin", "--delete", "feature");
    const r = run(shell, clone(o, "c"), [
      "--vcs",
      "bitbucket",
      "--head-branch",
      "feature",
      "--base-branch",
      "main",
      "--source-hash",
      o.head.slice(0, 12),
    ]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.via, "source-commit");
    assert.equal(
      r.rev,
      o.head,
      "an abbreviated Bitbucket hash resolves to the full sha",
    );
  });

  test(`${shell}: Bitbucket, squash-merged, branch deleted → merge-commit`, (t) => {
    const o = origin(t);
    git(o.seed, "checkout", "-q", "main");
    git(o.seed, "merge", "-q", "--squash", "feature");
    git(o.seed, "commit", "-q", "-m", "squash");
    const squash = git(o.seed, "rev-parse", "HEAD");
    git(o.seed, "push", "-q", "origin", "main");
    git(o.seed, "push", "-q", "origin", "--delete", "feature");
    const c = clone(o, "c");
    // The premise: the source commit did not travel with the clone.
    assert.notEqual(
      spawnSync("git", ["cat-file", "-e", `${o.head}^{commit}`], { cwd: c })
        .status,
      0,
    );
    const r = run(shell, c, [
      "--vcs",
      "bitbucket",
      "--head-branch",
      "feature",
      "--base-branch",
      "main",
      "--source-hash",
      o.head.slice(0, 12),
      "--merge-hash",
      squash.slice(0, 12),
    ]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.via, "merge-commit");
    assert.equal(r.rev, squash);
  });

  test(`${shell}: Bitbucket cross-fork → fork-branch, never origin's same-named branch`, (t) => {
    const o = origin(t);
    // origin's `feature` is a different commit from the fork's.
    const fork = path.join(o.root, "fork.git");
    git(o.root, "clone", "-q", "--bare", `file://${o.bare}`, fork);
    git(o.seed, "commit", "-q", "--allow-empty", "-m", "fork-only");
    const forkHead = git(o.seed, "rev-parse", "HEAD");
    git(o.seed, "push", "-q", `file://${fork}`, "feature");
    const r = run(shell, clone(o, "c"), [
      "--vcs",
      "bitbucket",
      "--head-branch",
      "feature",
      "--base-branch",
      "main",
      "--fork-url",
      `file://${fork}`,
    ]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.via, "fork-branch");
    assert.equal(r.rev, forkHead);
  });

  test(`${shell}: GitHub, branch deleted → pull-ref`, (t) => {
    const o = origin(t);
    git(o.bare, "update-ref", "refs/pull/7/head", o.head);
    git(o.seed, "push", "-q", "origin", "--delete", "feature");
    const r = run(shell, clone(o, "c"), [
      "--vcs",
      "github",
      "--head-branch",
      "feature",
      "--base-branch",
      "main",
      "--pr",
      "7",
    ]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.via, "pull-ref");
    assert.equal(r.rev, o.head);
  });

  test(`${shell}: nothing resolves → exit 1 naming the routes tried`, (t) => {
    const o = origin(t);
    git(o.seed, "push", "-q", "origin", "--delete", "feature");
    const r = run(shell, clone(o, "c"), [
      "--vcs",
      "bitbucket",
      "--head-branch",
      "feature",
      "--base-branch",
      "main",
      "--source-hash",
      "0123456789ab",
    ]);
    assert.equal(r.status, 1);
    assert.equal(r.rev, undefined, "nothing on stdout");
    assert.match(r.stderr, /tried: head-branch source-commit/);
  });

  test(`${shell}: usage errors exit 2`, (t) => {
    const o = origin(t);
    assert.equal(run(shell, o.seed, ["--vcs", "gitlab"]).status, 2);
    assert.equal(
      run(shell, o.seed, ["--vcs", "github", "--bogus", "x"]).status,
      2,
    );
  });
}

test("Step 6 resolves HEAD_REV through the script, for both platforms", () => {
  const skill = fs.readFileSync(path.join(__dirname, "..", "SKILL.md"), "utf8");
  const step6 = skill.slice(
    skill.indexOf("### Step 6"),
    skill.indexOf("### Step 7"),
  );
  assert.match(
    step6,
    /bash \.agents\/skills\/review-pr\/scripts\/resolve-head-rev\.sh/,
  );
  assert.match(step6, /--source-hash/);
  assert.match(step6, /--merge-hash/);
});
