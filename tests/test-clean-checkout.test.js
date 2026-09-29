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
 * Each run clones into its own `mktemp -d` directory inside the base
 * (CLEAN_CHECKOUT_DIR) and deletes only that — ownership by construction. The
 * cases below hold that property: the runner never deletes the base or anything
 * in it that it did not create, and two concurrent runs never touch each other's
 * clone (task 154 QA cycles 1–3, which found the named-location design deleting
 * the repository, then clobbering a concurrent run, then racing its own lock).
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
const { spawn, spawnSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

// Task 154 AC6: this file runs in under 10 s. Timed from module load, so every
// test and fixture counts; a failing root after-hook fails the run.
const FILE_BUDGET_MS = 10_000;
const FILE_STARTED = process.hrtime.bigint();
test.after(() => {
  const ms = Number(process.hrtime.bigint() - FILE_STARTED) / 1e6;
  assert.ok(
    ms < FILE_BUDGET_MS,
    `this file took ${Math.round(ms)} ms, over its ${FILE_BUDGET_MS} ms budget (task 154 AC6)`,
  );
});

const REPO_ROOT = path.resolve(__dirname, "..");
const RUNNER = path.join(REPO_ROOT, "scripts", "test-clean-checkout.sh");
const BASE = path.join(REPO_ROOT, ".clean-checkout-test-tmp");

// The runner refuses an ephemeral clone location, and every fixture's clone sits
// under BASE — so in a checkout that is itself ephemeral (under /tmp, or a
// .claude/worktrees/ worktree) every positive case would fail with exit 2 and no
// message naming the cause. Say it once, up front (task 154 QA cycle 2; the
// same guard observation-log.test.mjs applies to its scratch base).
{
  const { ephemeralReason } = require("../shared/resources/observation-log.js");
  fs.mkdirSync(BASE, { recursive: true });
  // Both spellings, as the runner checks them: macOS resolves /var/tmp to
  // /private/var/tmp, which the engine does not list (task 154 QA cycle 4).
  const real = fs.realpathSync(BASE);
  const why =
    ephemeralReason(real) ||
    (real.startsWith("/private/var/") &&
      ephemeralReason(real.slice("/private".length)));
  if (why) {
    throw new Error(
      `scratch base ${BASE} is ${why}: this checkout's location makes every ` +
        "clean-checkout fixture ephemeral. Run this test from a checkout outside it.",
    );
  }
}

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
    // The runner's BASE: each run makes its own directory inside it.
    baseDir: path.join(wrapper, "base"),
    cleanup: () => fs.rmSync(wrapper, { recursive: true, force: true }),
  };
}

/**
 * Entries in a base — the runner's own directories are `run.XXXXXX`. A missing
 * base THROWS rather than reading as empty: an empty listing and a deleted base
 * must not look the same, or every "left nothing behind" check passes on a
 * runner that deleted the base (task 154 QA cycle 4).
 */
function entries(dir) {
  assert.ok(fs.statSync(dir).isDirectory(), `${dir} is not a directory`);
  return fs.readdirSync(dir).sort();
}

function runRunner(fx, cmd, extraEnv = {}, cwd = fx.repo) {
  return spawnSync("bash", [RUNNER], {
    cwd,
    encoding: "utf-8",
    env: {
      ...process.env,
      CLEAN_CHECKOUT_DIR: fx.baseDir,
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
    assert.deepEqual(
      entries(fx.baseDir),
      [],
      "the run directory must be removed on exit",
    );
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
test("the runner never deletes its base, or anything in it that it did not create", () => {
  const fx = makeFixture();
  try {
    const foreign = path.join(fx.wrapper, "foreign");
    fs.mkdirSync(foreign);
    fs.writeFileSync(path.join(foreign, "precious"), "keep\n");
    // Someone else's directory named the way this runner names its own.
    fs.mkdirSync(path.join(foreign, "run.keep"));
    fs.writeFileSync(path.join(foreign, "run.keep", "k"), "keep\n");
    for (const base of [fx.repo, ".", fx.wrapper, foreign]) {
      const before = entries(path.resolve(fx.repo, base));
      const r = runRunner(fx, "test -f skills/x/marker", {
        CLEAN_CHECKOUT_DIR: base,
      });
      assert.equal(r.status, 0, `base ${base}: ${r.stderr}`);
      assert.deepEqual(
        entries(path.resolve(fx.repo, base)),
        before,
        `base ${base} was changed`,
      );
    }
    assert.ok(
      fs.existsSync(path.join(fx.repo, ".git")),
      "the repository was deleted",
    );
    assert.ok(
      fs.existsSync(path.join(foreign, "precious")),
      "a foreign file was deleted",
    );
    assert.ok(
      fs.existsSync(path.join(foreign, "run.keep", "k")),
      "a foreign run.* directory was deleted",
    );
    // A base the runner CREATED is kept too, not only one that already existed.
    assert.ok(
      !fs.existsSync(fx.baseDir),
      "premise: the fixture base starts absent",
    );
    const r = runRunner(fx, "true");
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(
      entries(fx.baseDir),
      [],
      "a created base must survive, empty",
    );
  } finally {
    fx.cleanup();
  }
});

test("two concurrent runs on one base each keep their own clone, and leave nothing behind", async () => {
  const fx = makeFixture();
  try {
    // Each run holds its clone for a second and checks it is still there. With a
    // shared location, the second run's start-up deletion removed the first's
    // clone mid-command (TASK-154-BUG-4, BUG-5).
    // Each prints the directory it ran in, so the test can assert the two runs
    // used different ones rather than infer it from timing.
    const cmd =
      'test -f skills/x/marker && sleep 1 && test -f skills/x/marker && echo "RAN-IN $PWD"';
    const once = () =>
      new Promise((resolve) => {
        const c = spawn("bash", [RUNNER], {
          cwd: fx.repo,
          env: {
            ...process.env,
            CLEAN_CHECKOUT_DIR: fx.baseDir,
            CLEAN_CHECKOUT_CMD: cmd,
          },
        });
        let err = "";
        let out = "";
        c.stderr.on("data", (d) => (err += d));
        c.stdout.on("data", (d) => (out += d));
        c.on("close", (code) => resolve({ code, err, out }));
      });
    const [a, b] = await Promise.all([once(), once()]);
    assert.equal(a.code, 0, a.err);
    assert.equal(b.code, 0, b.err);
    const ranIn = (o) => (o.match(/^RAN-IN (.+)$/m) || [])[1];
    const [dirA, dirB] = [ranIn(a.out), ranIn(b.out)];
    const base = fs.realpathSync(fx.baseDir);
    assert.ok(
      dirA && dirB,
      `a run did not report its directory:\n${a.out}\n${b.out}`,
    );
    assert.notEqual(dirA, dirB, "the two runs shared one directory");
    for (const d of [dirA, dirB]) {
      assert.equal(
        path.dirname(d),
        base,
        `${d} is not a run directory of the base`,
      );
    }
    assert.deepEqual(
      entries(fx.baseDir),
      [],
      "a run directory was left behind",
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

test("the runner creates a missing base one level deep, and resolves a relative base against the invoking directory", () => {
  const fx = makeFixture();
  try {
    let r = runRunner(fx, "true");
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(
      entries(fx.baseDir),
      [],
      "the created base should be left empty",
    );

    // From a SUBDIRECTORY, so "the invoking directory" and "the repository" are
    // different places and the case can tell which one the runner used.
    const sub = path.join(fx.repo, "sub");
    fs.mkdirSync(sub);
    r = runRunner(fx, "true", { CLEAN_CHECKOUT_DIR: "rel-base" }, sub);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(
      entries(path.join(sub, "rel-base")),
      [],
      "relative base not created in the invoking directory",
    );
    assert.ok(
      !fs.existsSync(path.join(fx.repo, "rel-base")),
      "relative base was resolved against the repository",
    );
  } finally {
    fx.cleanup();
  }
});

test("the runner refuses an unusable base, and deletes nothing when it does", () => {
  const fx = makeFixture();
  try {
    const aFile = path.join(fx.wrapper, "a-file");
    fs.writeFileSync(aFile, "keep\n");
    const cases = [
      { dir: path.join(fx.wrapper, "a\tb"), why: /control character/ },
      {
        dir: path.join(fx.wrapper, "missing", "base"),
        why: /parent directory does not exist/,
      },
      { dir: aFile, why: /is not a directory/ },
      // macOS resolves /var/tmp to /private/var/tmp, which the engine does not list.
      { dir: "/private/var/tmp/clean-checkout-x", why: /temporary directory/ },
    ];
    for (const { dir, why } of cases) {
      const r = runRunner(fx, "true", { CLEAN_CHECKOUT_DIR: dir });
      assert.equal(
        r.status,
        2,
        `expected exit 2 for ${JSON.stringify(dir)}, got ${r.status}:\n${r.stderr}`,
      );
      assert.match(r.stderr, why, `wrong refusal for ${JSON.stringify(dir)}`);
    }
    assert.ok(
      !fs.existsSync(path.join(fx.wrapper, "missing")),
      "a missing parent was created",
    );
    assert.equal(fs.readFileSync(aFile, "utf-8"), "keep\n");
    // Root writes anywhere, so the permission cases only mean something unprivileged.
    if (typeof process.getuid !== "function" || process.getuid() !== 0) {
      const sealed = path.join(fx.wrapper, "sealed");
      fs.mkdirSync(sealed);
      fs.writeFileSync(path.join(sealed, "keep"), "x\n");
      fs.chmodSync(sealed, 0o555);
      try {
        const r = runRunner(fx, "true", { CLEAN_CHECKOUT_DIR: sealed });
        assert.equal(r.status, 2, r.stderr);
        assert.match(r.stderr, /not writable/);
      } finally {
        fs.chmodSync(sealed, 0o755);
      }
      assert.ok(fs.existsSync(path.join(sealed, "keep")));
      const r = runRunner(fx, "true", { CLEAN_CHECKOUT_DIR: "/" });
      assert.equal(r.status, 2, `/ as a base: ${r.stderr}`);
    }
  } finally {
    fx.cleanup();
  }
});

test("release.sh gates on the clean-checkout runner first, stops when it fails, and clears the test hook", () => {
  // Behaviour, not source text: release.sh runs against a fixture on `main`
  // whose origin is in sync, with a fake `npm` on PATH that logs each call and
  // the CLEAN_CHECKOUT_CMD it inherited (task 154 DoD, AC5; review-pr CR-2).
  const fx = makeFixture();
  try {
    const origin = path.join(fx.wrapper, "origin.git");
    git(fx.repo, "checkout", "--quiet", "-B", "main");
    git(fx.wrapper, "init", "--quiet", "--bare", origin);
    git(fx.repo, "remote", "add", "origin", origin);
    git(fx.repo, "push", "--quiet", "origin", "main");
    const bin = path.join(fx.wrapper, "bin");
    fs.mkdirSync(bin);
    const log = path.join(fx.wrapper, "npm.log");
    // Passes the gate when NPM_GATE_OK is set, and fails every other call so the
    // release stops at the step after the gate.
    fs.writeFileSync(
      path.join(bin, "npm"),
      '#!/bin/sh\nprintf \'%s|%s\\n\' "$*" "${CLEAN_CHECKOUT_CMD-<unset>}" >> "$NPM_LOG"\n' +
        '[ -n "$NPM_GATE_OK" ] && [ "$*" = "run test:clean-checkout" ] && exit 0\nexit 1\n',
      { mode: 0o755 },
    );
    // CI is green for this fixture: release.sh reads CI's verdict before the gate
    // (task 153), and this test is about the gate, not the CI check — which
    // tests/release-ci-gate.test.js holds. A stub, so the run makes no network call.
    fs.writeFileSync(
      path.join(bin, "gh"),
      "#!/bin/sh\necho '" +
        JSON.stringify(
          ["Test", "ShellCheck"].map((workflowName, i) => ({
            workflowName,
            status: "completed",
            conclusion: "success",
            event: "push",
            databaseId: i + 1,
          })),
        ) +
        "'\n",
      { mode: 0o755 },
    );
    const release = (extra) => {
      fs.rmSync(log, { force: true });
      const r = spawnSync(
        "bash",
        [path.join(REPO_ROOT, "scripts", "release.sh"), "--patch"],
        {
          cwd: fx.repo,
          encoding: "utf-8",
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            NPM_LOG: log,
            CLEAN_CHECKOUT_CMD: "echo hijacked",
            ...extra,
          },
        },
      );
      const calls = fs.existsSync(log)
        ? fs.readFileSync(log, "utf-8").trim().split("\n")
        : [];
      return { r, calls };
    };

    const failing = release({});
    assert.notEqual(
      failing.r.status,
      0,
      "a failing gate must stop the release",
    );
    assert.deepEqual(
      failing.calls,
      ["run test:clean-checkout|<unset>"],
      `the gate is the first npm call, runs without the test hook, and nothing runs after it fails:\n${failing.r.stdout}${failing.r.stderr}`,
    );
    assert.ok(
      !failing.r.stdout.includes("Tests passed"),
      "a failed gate must not report a pass",
    );

    // Positive control: a passing gate reports it and the release moves on.
    const passing = release({ NPM_GATE_OK: "1" });
    assert.deepEqual(
      passing.calls.map((c) => c.split("|")[0]),
      ["run test:clean-checkout", "run validate:all"],
      `${passing.r.stdout}${passing.r.stderr}`,
    );
    assert.ok(passing.r.stdout.includes("Tests passed"), passing.r.stdout);
  } finally {
    fx.cleanup();
  }
});

test("the base decision is one export: it returns the resolved base, or throws the reason", async () => {
  // security-probe.mjs reaches the decision through this export (task 154 DoD);
  // the runner calls the same module as a CLI, so the two cannot disagree.
  const { pathToFileURL } = require("url");
  const lib = path.join(REPO_ROOT, "scripts", "lib", "clean-checkout-base.mjs");
  const { resolveBase } = await import(pathToFileURL(lib).href);
  const fx = makeFixture();
  try {
    assert.equal(
      resolveBase(fx.baseDir),
      path.join(fs.realpathSync(fx.wrapper), "base"),
    );
    assert.throws(() => resolveBase(""), /empty/);
    assert.throws(
      () => resolveBase("/tmp/clean-checkout"),
      /refuses as a scratch base/,
    );
    assert.throws(
      () => resolveBase(path.join(fx.wrapper, "a", "b")),
      /parent directory does not exist/,
    );
    const usage = spawnSync(process.execPath, [lib], { encoding: "utf-8" });
    assert.equal(usage.status, 2, "the CLI takes exactly one base");
  } finally {
    fx.cleanup();
  }
});
