/**
 * Behavioural check for `scripts/lint-secrets.sh`, the local twin of the
 * `Secret scan` lane (task 229).
 *
 * WHY THIS EXISTS
 * ---------------
 * The lane's success criteria are exit paths — skip when the binary is absent,
 * fail when the self-check catches nothing, fail on a tree hit, fail on a PR
 * text hit, fail on an empty file list, never print a value. A manual probe of
 * each is a claim, not a per-PR check: task 111 shipped the ShellCheck twin's
 * skip branch with a manual probe only and `/finalise` refused it, which is why
 * `lint-shell-absent-binary.test.mjs` exists. This file is the same answer for
 * this script. `test.yml` does not install gitleaks, so every case runs against
 * a STUB `gitleaks` whose exit code is chosen per case; the real binary's
 * ability to catch a planted token is proved by the script's own self-check,
 * every time the real lane runs.
 *
 * WHAT IS ASSERTED
 * ----------------
 *   1. No `gitleaks` on PATH → exit 0, the skip message, nothing scanned.
 *   2. A scanner that catches nothing (stub exits 0 everywhere) → exit 1 with
 *      the self-check message, and the tree is never scanned.
 *   3. The happy path → exit 0; the tree handed to the scanner holds the
 *      tracked files, including an uncommitted edit's file, and not an
 *      untracked one; a tracked file deleted in the working tree is dropped.
 *   4. A tree hit → exit 1 with the tree message.
 *   5. A PR text hit (commit messages of SECRET_SCAN_RANGE, then the body) →
 *      exit 1 with the matching message; the body reaches the scanner verbatim.
 *   6. A git repository with no tracked files → exit 1, empty-list message.
 *   7. Every scanner invocation carries `--redact`.
 *   8. A range whose base is all zeros (a new-branch push) skips the
 *      commit-message scan and still passes.
 *
 * PATH is replaced, not amended: a temp bin directory holding symlinks to the
 * externals the script calls and, where a case needs it, the stub. `command -v`
 * is a builtin, so it sees exactly that directory. Each case runs in a fresh
 * temporary git repository, never this checkout.
 *
 * Hermetic: bash and git only, no network, no model calls, the real gitleaks is
 * never run.
 *
 * Run: node --test evals/shared/tests/lint-secrets.test.mjs
 * Mutations that must go red: delete the self-check block in
 * scripts/lint-secrets.sh → case 2 fails; drop `--redact` from GL_FLAGS →
 * case 7 fails; delete the empty-list guard → case 6 fails.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const SCRIPT = path.join(REPO_ROOT, "scripts", "lint-secrets.sh");
const SKIP_MESSAGE = "gitleaks not installed — lane skipped";

/** Externals the script calls, plus the stub's own (cat, find). */
const TOOLS = [
  "bash",
  "git",
  "mktemp",
  "rm",
  "head",
  "base64",
  "tr",
  "mkdir",
  "tar",
  "sed",
  "cat",
  "find",
];

function which(name) {
  const r = spawnSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" });
  assert.equal(
    r.status,
    0,
    `${name} must be resolvable to build the sandbox PATH`,
  );
  return r.stdout.trim();
}

/**
 * The stub: logs every invocation's arguments to $STUB_LOG, lists the files of
 * a tree scan to $STUB_TREE, copies stdin to $STUB_STDIN, and exits per mode:
 *   STUB_CATCH_SELFCHECK=1  exit 1 for the self-check dir (a working scanner)
 *   STUB_FAIL_TREE=1        exit 1 for the tree scan
 *   STUB_FAIL_STDIN=1       exit 1 for every stdin scan
 */
const STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_LOG"
case "$1" in
  version) echo "0.0.0-stub"; exit 0 ;;
  dir)
    case "$2" in
      */selfcheck) [ "\${STUB_CATCH_SELFCHECK:-}" = 1 ] && exit 1; exit 0 ;;
      *) (cd "$2" && find . -type f) > "$STUB_TREE"
         [ "\${STUB_FAIL_TREE:-}" = 1 ] && exit 1; exit 0 ;;
    esac ;;
  stdin)
    cat >> "$STUB_STDIN"; printf '\\n--\\n' >> "$STUB_STDIN"
    [ "\${STUB_FAIL_STDIN:-}" = 1 ] && exit 1; exit 0 ;;
esac
exit 0
`;

/** A sandbox: a bin dir (with or without the stub), log paths, and a git repo. */
function sandbox({ stub = true, files = { "a.txt": "hello\n" } } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "lint-secrets-"));
  const bin = path.join(dir, "bin");
  const repo = path.join(dir, "repo");
  spawnSync("mkdir", ["-p", bin, repo]);
  for (const tool of TOOLS) symlinkSync(which(tool), path.join(bin, tool));
  if (stub) {
    writeFileSync(path.join(bin, "gitleaks"), STUB);
    chmodSync(path.join(bin, "gitleaks"), 0o755);
  }
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };
  git("init", "-q");
  git("config", "user.email", "t@example.invalid");
  git("config", "user.name", "t");
  git("config", "commit.gpgsign", "false");
  for (const [name, body] of Object.entries(files))
    writeFileSync(path.join(repo, name), body);
  if (Object.keys(files).length) {
    git("add", "-A");
    git("commit", "-qm", "base");
  }
  return {
    dir,
    bin,
    repo,
    git,
    log: path.join(dir, "stub.log"),
    tree: path.join(dir, "stub.tree"),
    stdin: path.join(dir, "stub.stdin"),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function run(sb, env = {}) {
  return spawnSync(path.join(sb.bin, "bash"), [SCRIPT], {
    cwd: sb.repo,
    encoding: "utf8",
    env: {
      PATH: sb.bin,
      HOME: process.env.HOME ?? "/",
      GIT_CONFIG_NOSYSTEM: "1",
      STUB_LOG: sb.log,
      STUB_TREE: sb.tree,
      STUB_STDIN: sb.stdin,
      ...env,
    },
  });
}

const read = (f) => (existsSync(f) ? readFileSync(f, "utf8") : "");
const show = (r) =>
  `exit ${r.status}\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`;
/** Scanner invocations other than `version`. */
const scans = (sb) =>
  read(sb.log)
    .split("\n")
    .filter((l) => /^(dir|stdin)\b/.test(l));

test("lint-secrets.sh — gitleaks absent: skip message, exit 0, nothing scanned", () => {
  const sb = sandbox({ stub: false });
  try {
    const r = run(sb);
    assert.equal(r.status, 0, show(r));
    assert.match(r.stdout, new RegExp(SKIP_MESSAGE), show(r));
    assert.doesNotMatch(r.stdout, /gitleaks: clean/, show(r));
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — a scanner that catches nothing fails the self-check before the tree scan", () => {
  const sb = sandbox();
  try {
    const r = run(sb); // STUB_CATCH_SELFCHECK unset: the planted token "passes"
    assert.equal(r.status, 1, show(r));
    assert.match(r.stderr, /self-check failed/, show(r));
    assert.equal(
      read(sb.tree),
      "",
      "the tree must not be scanned after a failed self-check",
    );
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — happy path: exit 0, tracked files only, uncommitted edits in, deletions out", () => {
  const sb = sandbox({ files: { "a.txt": "a\n", "gone.txt": "g\n" } });
  try {
    writeFileSync(path.join(sb.repo, "a.txt"), "a, edited\n"); // uncommitted edit
    writeFileSync(path.join(sb.repo, "untracked.txt"), "u\n");
    rmSync(path.join(sb.repo, "gone.txt")); // tracked, deleted in the tree
    const r = run(sb, { STUB_CATCH_SELFCHECK: "1" });
    assert.equal(r.status, 0, show(r));
    assert.match(r.stdout, /self-check: planted token caught/, show(r));
    assert.match(r.stdout, /gitleaks: clean/, show(r));
    const tree = read(sb.tree).split("\n").filter(Boolean).sort();
    assert.deepEqual(
      tree,
      ["./a.txt"],
      "the scanned tree holds exactly the present tracked files",
    );
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — a tree hit fails the lane", () => {
  const sb = sandbox();
  try {
    const r = run(sb, { STUB_CATCH_SELFCHECK: "1", STUB_FAIL_TREE: "1" });
    assert.equal(r.status, 1, show(r));
    assert.match(r.stderr, /secret-shaped string in a tracked file/, show(r));
    assert.doesNotMatch(r.stdout, /gitleaks: clean/, show(r));
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — a PR text hit fails the lane: commit messages of the range, then the body", () => {
  const sb = sandbox();
  try {
    sb.git("commit", "-q", "--allow-empty", "-m", "second commit message");
    const range = `${sb.git("rev-parse", "HEAD~1")}..HEAD`;
    const body = "PR body with `backticks` and $(not-run) and 'quotes'";
    const r = run(sb, {
      STUB_CATCH_SELFCHECK: "1",
      STUB_FAIL_STDIN: "1",
      SECRET_SCAN_RANGE: range,
      SECRET_SCAN_PR_BODY: body,
    });
    assert.equal(r.status, 1, show(r));
    assert.match(r.stderr, /in the PR's commit messages/, show(r));
    assert.match(r.stderr, /in the PR body/, show(r));
    const fed = read(sb.stdin);
    assert.match(
      fed,
      /second commit message/,
      "the range's commit messages reach the scanner",
    );
    assert.doesNotMatch(
      fed,
      /^base$/m,
      "a commit outside the range is not scanned",
    );
    assert.ok(
      fed.includes(body),
      `the body reaches the scanner verbatim:\n${fed}`,
    );
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — no tracked files: exit 1, empty-list message", () => {
  const sb = sandbox({ files: {} });
  try {
    const r = run(sb, { STUB_CATCH_SELFCHECK: "1" });
    assert.equal(r.status, 1, show(r));
    assert.match(r.stderr, /no tracked files/, show(r));
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — every scanner invocation carries --redact", () => {
  const sb = sandbox();
  try {
    sb.git("commit", "-q", "--allow-empty", "-m", "second");
    const r = run(sb, {
      STUB_CATCH_SELFCHECK: "1",
      SECRET_SCAN_RANGE: `${sb.git("rev-parse", "HEAD~1")}..HEAD`,
      SECRET_SCAN_PR_BODY: "a body",
    });
    assert.equal(r.status, 0, show(r));
    const calls = scans(sb);
    // self-check dir, tree dir, commit-message stdin, body stdin
    assert.equal(
      calls.length,
      4,
      `non-vacuity: expected 4 scans, saw:\n${calls.join("\n")}`,
    );
    for (const c of calls)
      assert.match(c, /(^| )--redact( |$)/, `missing --redact: ${c}`);
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — an all-zeros base (new-branch push) skips the commit-message scan", () => {
  const sb = sandbox();
  try {
    const r = run(sb, {
      STUB_CATCH_SELFCHECK: "1",
      STUB_FAIL_STDIN: "1", // would fail if the message scan ran
      SECRET_SCAN_RANGE: `${"0".repeat(40)}..HEAD`,
    });
    assert.equal(r.status, 0, show(r));
    assert.match(r.stdout, /commit-message scan skipped/, show(r));
  } finally {
    sb.cleanup();
  }
});
