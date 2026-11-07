/**
 * Behavioural tests for `finalise-delta.js` (task 271, Arms 1 and 2 of the /finalise acceptance
 * arms). Every test runs the CLI against a throwaway git repository and asserts its exit code and
 * `reason`. None greps the source: a grep proves a string exists, not that the arm refuses.
 *
 * Each accepting case has an unmatched control beside it (a code change, a change inside the PR's
 * diff, a spent re-run), because a test that only shows the arm accepting cannot tell a working
 * arm from one that accepts everything.
 *
 * Run via: CI=true node --test shared/resources/tests/finalise-delta.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "finalise-delta.js");

const GIT = [
  "-c",
  "user.name=t",
  "-c",
  "user.email=t@t",
  "-c",
  "commit.gpgsign=false",
  // No background maintenance: a detached repack can race the teardown (obs #282).
  "-c",
  "maintenance.auto=false",
  "-c",
  "gc.auto=0",
];
const git = (cwd, ...args) =>
  execFileSync("git", [...GIT, ...args], { cwd, encoding: "utf8" }).trim();
const cleanup = (dir) =>
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

function mkRepo() {
  const dir = mkdtempSync(join(tmpdir(), "fin-delta-"));
  git(dir, "init", "-q", "-b", "main");
  return dir;
}

function commit(dir, files, msg = "c") {
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--allow-empty", "-m", msg);
  return git(dir, "rev-parse", "HEAD");
}

function run(dir, args) {
  const r = spawnSync("node", [CLI, ...args, "--json"], {
    cwd: dir,
    encoding: "utf8",
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* exit 2 prints usage on stderr, not JSON */
  }
  return { status: r.status, json, stderr: r.stderr };
}

/** A repo with `main`, a PR branch that changed src/a.js (G), and head commits on top of G. */
function prRepo() {
  const dir = mkRepo();
  commit(dir, {
    "src/a.js": "a\n",
    "src/other.test.js": "t\n",
    "README.md": "r\n",
  });
  git(dir, "checkout", "-q", "-b", "feature/x");
  const green = commit(dir, { "src/a.js": "a2\n" }, "pr change");
  return { dir, green };
}

// ── Arm 1: docs-only ──────────────────────────────────────────────────────

test("docs-only: a delta of documentation files only is tree-equivalent (exit 0)", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "README.md": "r2\n", "docs/n.md": "n\n" });
    const r = run(dir, ["docs-only", "--base", green, "--head", head]);
    assert.equal(r.status, 0);
    assert.equal(r.json.reason, "tree-equivalent");
    assert.equal(r.json.changedCount, 2);
  } finally {
    cleanup(dir);
  }
});

test("docs-only control: one code file in the delta is code-changed (exit 1)", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "README.md": "r2\n", "src/a.js": "a3\n" });
    const r = run(dir, ["docs-only", "--base", green, "--head", head]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "code-changed");
    assert.match(r.json.detail, /src\/a\.js/);
  } finally {
    cleanup(dir);
  }
});

test("docs-only: the same commit is tree-equivalent (nothing changed)", () => {
  const { dir, green } = prRepo();
  try {
    const r = run(dir, ["docs-only", "--base", green, "--head", green]);
    assert.equal(r.status, 0);
    assert.equal(r.json.changedCount, 0);
  } finally {
    cleanup(dir);
  }
});

test("docs-only control: the configured docs definition decides, not the file extension", () => {
  // The suite the measured figure came from reads docs/spec.md, so the owner narrows the docs
  // patterns to a directory it does not read. A markdown file outside it is then not documentation.
  const { dir, green } = prRepo();
  try {
    commit(
      dir,
      {
        "skills-config.yaml":
          'ci:\n  docsOnly:\n    patterns:\n      - "docs/notes/**"\n',
      },
      "narrow the docs definition",
    );
    const base = git(dir, "rev-parse", "HEAD");
    const inside = commit(dir, { "docs/notes/x.md": "x\n" });
    const ok = run(dir, ["docs-only", "--base", base, "--head", inside]);
    assert.equal(ok.json.reason, "tree-equivalent");
    const outside = commit(dir, { "docs/spec.md": "s\n" });
    const no = run(dir, ["docs-only", "--base", inside, "--head", outside]);
    assert.equal(no.status, 1);
    assert.equal(no.json.reason, "code-changed");
    void green;
  } finally {
    cleanup(dir);
  }
});

test("docs-only control: a change to skills-config.yaml is never documentation", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, {
      "skills-config.yaml": "ci:\n  docsOnly:\n    enabled: true\n",
    });
    const r = run(dir, ["docs-only", "--base", green, "--head", head]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "code-changed");
  } finally {
    cleanup(dir);
  }
});

test("docs-only control: ci.docsOnly.enabled false at the head commit disables the arm", () => {
  const { dir, green } = prRepo();
  try {
    commit(dir, {
      "skills-config.yaml": "ci:\n  docsOnly:\n    enabled: false\n",
    });
    const head = commit(dir, { "README.md": "r2\n" });
    const r = run(dir, ["docs-only", "--base", green, "--head", head]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "disabled");
  } finally {
    cleanup(dir);
  }
});

test("docs-only: the configuration is read from the head commit, never the working tree", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "src/a.js": "a3\n" });
    // An uncommitted edit that would widen the patterns to everything must not decide a committed delta.
    writeFileSync(
      join(dir, "skills-config.yaml"),
      'ci:\n  docsOnly:\n    patterns:\n      - "**"\n',
    );
    const r = run(dir, ["docs-only", "--base", green, "--head", head]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "code-changed");
  } finally {
    cleanup(dir);
  }
});

test("docs-only: a revision that does not resolve is unverifiable (exit 1), never a pass", () => {
  const { dir } = prRepo();
  try {
    const r = run(dir, [
      "docs-only",
      "--base",
      "deadbeefdeadbeef",
      "--head",
      "HEAD",
    ]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "unverifiable");
  } finally {
    cleanup(dir);
  }
});

test("usage: a missing flag, an unknown command and a bad value exit 2", () => {
  const { dir, green } = prRepo();
  try {
    assert.equal(run(dir, ["docs-only", "--head", green]).status, 2);
    assert.equal(
      run(dir, ["nope", "--base", green, "--head", green]).status,
      2,
    );
    assert.equal(
      run(dir, [
        "rerun-eligible",
        "--base",
        green,
        "--head",
        green,
        "--pr-base",
        "main",
      ]).status,
      2,
      "--attempts is required",
    );
    assert.equal(
      run(dir, [
        "rerun-eligible",
        "--base",
        green,
        "--head",
        green,
        "--pr-base",
        "main",
        "--attempts",
        "abc",
        "--failed-file",
        "x",
      ]).status,
      2,
    );
  } finally {
    cleanup(dir);
  }
});

// ── Arm 2: rerun-eligible ─────────────────────────────────────────────────

const rerun = (dir, green, head, extra) =>
  run(dir, [
    "rerun-eligible",
    "--base",
    green,
    "--head",
    head,
    "--pr-base",
    "main",
    ...extra,
  ]);

test("rerun-eligible: a red outside the PR diff over a docs-only delta, no re-run yet, is eligible", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "docs/n.md": "n\n" });
    const r = rerun(dir, green, head, [
      "--attempts",
      "0",
      "--failed-file",
      "src/other.test.js",
    ]);
    assert.equal(r.status, 0);
    assert.equal(r.json.reason, "eligible");
  } finally {
    cleanup(dir);
  }
});

test("rerun-eligible control: a red inside the PR's own diff is in-diff, not re-run", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "docs/n.md": "n\n" });
    const r = rerun(dir, green, head, [
      "--attempts",
      "0",
      "--failed-file",
      "src/a.js",
    ]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "in-diff");
    // A different spelling of the same path must not dodge the comparison.
    const dotted = rerun(dir, green, head, [
      "--attempts",
      "0",
      "--failed-file",
      "./src/a.js",
    ]);
    assert.equal(dotted.json.reason, "in-diff");
  } finally {
    cleanup(dir);
  }
});

test("rerun-eligible control: every spelling of an in-diff file is in-diff (T271-QA-1)", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "docs/n.md": "n\n" });
    const spellings = [
      "src/a.js",
      "./src/a.js",
      "src/./a.js",
      "src//a.js",
      join(dir, "src", "a.js"), // the absolute form a CI log prints
      "docs/../src/a.js", // a `..` that stays inside the root
    ];
    for (const f of spellings) {
      const r = rerun(dir, green, head, [
        "--attempts",
        "0",
        "--failed-file",
        f,
      ]);
      assert.equal(r.json.reason, "in-diff", `spelling ${f}`);
      assert.equal(r.status, 1, `spelling ${f}`);
    }
    // The unmatched control: a file the PR did not change stays eligible under the same spellings.
    const ok = rerun(dir, green, head, [
      "--attempts",
      "0",
      "--failed-file",
      join(dir, "src", "other.test.js"),
    ]);
    assert.equal(ok.json.reason, "eligible");
  } finally {
    cleanup(dir);
  }
});

test("rerun-eligible control: a symlink the PR changed is in-diff, not its target (T271-QA-7)", () => {
  const { dir, green } = prRepo();
  try {
    // src/other.test.js exists on the base and the PR never touched it; the link to it is what the PR added.
    symlinkSync("other.test.js", join(dir, "src", "link.test.js"));
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "pr adds a link");
    const prHead = git(dir, "rev-parse", "HEAD").trim();
    const head = commit(dir, { "docs/n.md": "n\n" });
    const r = rerun(dir, prHead, head, [
      "--attempts",
      "0",
      "--failed-file",
      "src/link.test.js",
    ]);
    // A symlink is refused whatever it points at (T271-QA-11): its red is the target's red.
    assert.equal(r.json.reason, "bad-failed-file");
    assert.equal(r.status, 1);
    // Control: the target itself, which the PR did not change, stays eligible.
    const t = rerun(dir, prHead, head, [
      "--attempts",
      "0",
      "--failed-file",
      "src/other.test.js",
    ]);
    assert.equal(t.json.reason, "eligible");
    assert.ok(green, "the PR's first commit exists");
  } finally {
    cleanup(dir);
  }
});

test("rerun-eligible control: a directory or a missing path is not a failed file; a subdirectory workspace root still compares toplevel names (T271-QA-8)", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "docs/n.md": "n\n" });
    for (const f of ["src", "src/", "docs", "src/missing.test.js"]) {
      const r = rerun(dir, green, head, [
        "--attempts",
        "0",
        "--failed-file",
        f,
      ]);
      assert.equal(r.json.reason, "bad-failed-file", `value ${f}`);
      assert.equal(r.status, 1, `value ${f}`);
    }
    // The workspace root is a subdirectory: git prints toplevel-relative names, so a file the PR
    // changed (src/a.js) named relative to that subdirectory is still in-diff, not eligible.
    const sub = rerun(dir, green, head, [
      "--attempts",
      "0",
      "--workspace-root",
      join(dir, "src"),
      "--failed-file",
      "a.js",
    ]);
    assert.equal(sub.json.reason, "in-diff");
    const subOk = rerun(dir, green, head, [
      "--attempts",
      "0",
      "--workspace-root",
      join(dir, "src"),
      "--failed-file",
      "other.test.js",
    ]);
    assert.equal(subOk.json.reason, "eligible");
  } finally {
    cleanup(dir);
  }
});

test("rerun-eligible control: a failed file that is not a path inside the repository is bad-failed-file (T271-QA-2)", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "docs/n.md": "n\n" });
    for (const f of [
      "{failed-files}", // an unsubstituted placeholder
      "src/*.test.js", // a glob
      "../outside.test.js", // leaves the root
      "/etc/passwd", // absolute, outside the root
      "  ", // blank
    ]) {
      const r = rerun(dir, green, head, [
        "--attempts",
        "0",
        "--failed-file",
        f,
      ]);
      assert.equal(
        r.json.reason,
        "bad-failed-file",
        `value ${JSON.stringify(f)}`,
      );
      assert.equal(r.status, 1, `value ${JSON.stringify(f)}`);
    }
    // One bad file among good ones refuses the whole call.
    const mixed = rerun(dir, green, head, [
      "--attempts",
      "0",
      "--failed-file",
      "src/other.test.js",
      "--failed-file",
      "{failed-files}",
    ]);
    assert.equal(mixed.json.reason, "bad-failed-file");
  } finally {
    cleanup(dir);
  }
});

test("rerun-eligible control: a delta that changes code is code-changed, not re-run", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "src/a.js": "a3\n" });
    const r = rerun(dir, green, head, [
      "--attempts",
      "0",
      "--failed-file",
      "src/other.test.js",
    ]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "code-changed");
  } finally {
    cleanup(dir);
  }
});

test("rerun-eligible control: exactly once — a recorded re-run makes the next red already-rerun", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "docs/n.md": "n\n" });
    const r = rerun(dir, green, head, [
      "--attempts",
      "1",
      "--failed-file",
      "src/other.test.js",
    ]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "already-rerun");
  } finally {
    cleanup(dir);
  }
});

test("rerun-eligible control: a red whose file is unknown is no-failed-file (fail closed)", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "docs/n.md": "n\n" });
    const r = rerun(dir, green, head, ["--attempts", "0"]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "no-failed-file");
  } finally {
    cleanup(dir);
  }
});

test("rerun-eligible: a PR base that does not resolve is unverifiable, never eligible", () => {
  const { dir, green } = prRepo();
  try {
    const head = commit(dir, { "docs/n.md": "n\n" });
    const r = run(dir, [
      "rerun-eligible",
      "--base",
      green,
      "--head",
      head,
      "--pr-base",
      "no-such-branch",
      "--attempts",
      "0",
      "--failed-file",
      "src/other.test.js",
    ]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "unverifiable");
  } finally {
    cleanup(dir);
  }
});
