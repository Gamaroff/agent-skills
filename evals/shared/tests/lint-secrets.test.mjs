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
 *   9. One missed self-check plant is retried; a scanner that misses all
 *      three plants fails (QA cycle 1, QA-1).
 *  10. A scanner error (exit 1, as gitleaks exits on a fatal error) is never
 *      read as a caught plant or a found secret (QA cycle 1, CR-1).
 *  11. A range base missing from the checkout skips the message scan loudly
 *      on a push (a force-push), and is an error on any other event (QA
 *      cycle 1 CR-2, cycle 2 CR-2).
 *  12. A SECRET_SCAN_RANGE not shaped <base>..<head> is an error (cycle 2 CR-3).
 *  13. Every scan passes --config with the default rules from outside the
 *      scanned repository (cycle 2 CR-1: a committed .gitleaks.toml switched
 *      the real scan off; with gitleaks 8.30.1, --config outranks it).
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
 * case 7 fails; delete the empty-list guard → case 6 fails; set LEAK_RC=1 →
 * the scanner-error cases fail; drop the retry loop → the second-plant case
 * fails; delete the cat-file guard → the force-push case fails; drop the
 * SECRET_SCAN_EVENT check → the outside-a-push cases fail; drop --config from
 * GL_FLAGS → the pinned-rules case fails; drop the range-shape check → the
 * malformed-range cases fail.
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
  "grep",
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
 * a tree scan to $STUB_TREE, copies stdin to $STUB_STDIN, and exits per mode.
 * A "leak" exits with the value the script passed as --exit-code, as the real
 * binary does; a scanner ERROR exits 1, as the real binary does on a fatal
 * error — so a script that used 1 for leaks could not tell the two apart. The
 * content of each --config file is appended to $STUB_CONFIG.
 *   STUB_CATCH_SELFCHECK=1     leak for every self-check dir (a working scanner)
 *   STUB_CATCH_SELFCHECK=second clean for the first self-check, leak after (one unlucky plant)
 *   STUB_FAIL_TREE=1            leak for the tree scan
 *   STUB_FAIL_STDIN=1           leak for every stdin scan
 *   STUB_ERROR=selfcheck|tree   exit 1 (a scanner error) for that scan
 */
const STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_LOG"
leak=1; prev=""; config=""
for a in "$@"; do
  [ "$prev" = --exit-code ] && leak=$a
  [ "$prev" = --config ] && config=$a
  prev=$a
done
if [ -n "$config" ]; then { cat "$config" 2>/dev/null || echo "<unreadable>"; echo "--"; } >> "$STUB_CONFIG"; fi
case "$1" in
  version) echo "0.0.0-stub"; exit 0 ;;
  dir)
    case "$2" in
      */selfcheck)
        [ "\${STUB_ERROR:-}" = selfcheck ] && { echo "stub: fatal" >&2; exit 1; }
        case "\${STUB_CATCH_SELFCHECK:-}" in
          1) exit "$leak" ;;
          second) [ "$(grep -c '^dir .*/selfcheck' "$STUB_LOG")" -ge 2 ] && exit "$leak"; exit 0 ;;
        esac
        exit 0 ;;
      *) (cd "$2" && find . -type f) > "$STUB_TREE"
         [ "\${STUB_ERROR:-}" = tree ] && { echo "stub: fatal" >&2; exit 1; }
         [ "\${STUB_FAIL_TREE:-}" = 1 ] && exit "$leak"; exit 0 ;;
    esac ;;
  stdin)
    cat >> "$STUB_STDIN"; printf '\\n--\\n' >> "$STUB_STDIN"
    [ "\${STUB_FAIL_STDIN:-}" = 1 ] && exit "$leak"; exit 0 ;;
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
    config: path.join(dir, "stub.config"),
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
      STUB_CONFIG: sb.config,
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

test("lint-secrets.sh — one missed plant is retried: a scanner that catches the second plant passes", () => {
  const sb = sandbox();
  try {
    const r = run(sb, { STUB_CATCH_SELFCHECK: "second" });
    assert.equal(r.status, 0, show(r));
    assert.match(r.stdout, /self-check: planted token caught/, show(r));
    const selfchecks = scans(sb).filter((l) => /^dir .*\/selfcheck /.test(l));
    assert.equal(
      selfchecks.length,
      2,
      `expected 2 plants:\n${selfchecks.join("\n")}`,
    );
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — a scanner that misses every plant is scanned three times, then fails", () => {
  const sb = sandbox();
  try {
    const r = run(sb);
    assert.equal(r.status, 1, show(r));
    const selfchecks = scans(sb).filter((l) => /^dir .*\/selfcheck /.test(l));
    assert.equal(
      selfchecks.length,
      3,
      `expected 3 plants:\n${selfchecks.join("\n")}`,
    );
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — a scanner error in the self-check is an error, never a caught plant", () => {
  const sb = sandbox();
  try {
    const r = run(sb, { STUB_ERROR: "selfcheck" });
    assert.equal(r.status, 1, show(r));
    assert.match(
      r.stderr,
      /gitleaks failed \(exit 1\) during the self-check/,
      show(r),
    );
    assert.doesNotMatch(r.stdout, /planted token caught/, show(r));
    assert.equal(
      read(sb.tree),
      "",
      "the tree must not be scanned after a scanner error",
    );
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — a scanner error in the tree scan is reported as an error, not a found secret", () => {
  const sb = sandbox();
  try {
    const r = run(sb, { STUB_CATCH_SELFCHECK: "1", STUB_ERROR: "tree" });
    assert.equal(r.status, 1, show(r));
    assert.match(
      r.stderr,
      /gitleaks failed \(exit 1\) during the tracked-file scan/,
      show(r),
    );
    assert.doesNotMatch(r.stderr, /secret-shaped string/, show(r));
  } finally {
    sb.cleanup();
  }
});

test("lint-secrets.sh — a range base missing from the checkout on a push (force-push) skips the message scan loudly", () => {
  const sb = sandbox();
  try {
    const r = run(sb, {
      STUB_CATCH_SELFCHECK: "1",
      STUB_FAIL_STDIN: "1", // would fail if the message scan ran
      SECRET_SCAN_RANGE: `${"ab".repeat(20)}..HEAD`,
      SECRET_SCAN_EVENT: "push",
    });
    assert.equal(r.status, 0, show(r));
    assert.match(r.stdout, /base of .* is not in this checkout/, show(r));
  } finally {
    sb.cleanup();
  }
});

for (const event of ["pull_request", ""]) {
  test(`lint-secrets.sh — a range base missing from the checkout outside a push (${event || "no event"}) is an error`, () => {
    const sb = sandbox();
    try {
      const r = run(sb, {
        STUB_CATCH_SELFCHECK: "1",
        SECRET_SCAN_RANGE: `${"ab".repeat(20)}..HEAD`,
        SECRET_SCAN_EVENT: event,
      });
      assert.equal(r.status, 1, show(r));
      assert.match(
        r.stderr,
        /error: the base of .* is not in this checkout/,
        show(r),
      );
    } finally {
      sb.cleanup();
    }
  });
}

for (const range of ["HEAD", "..HEAD", "HEAD.."]) {
  test(`lint-secrets.sh — SECRET_SCAN_RANGE '${range}' is not a <base>..<head> range: error, history never read`, () => {
    const sb = sandbox();
    try {
      const r = run(sb, {
        STUB_CATCH_SELFCHECK: "1",
        SECRET_SCAN_RANGE: range,
      });
      assert.equal(r.status, 1, show(r));
      assert.match(r.stderr, /is not a <base>\.\.<head> range/, show(r));
      assert.equal(read(sb.stdin), "", "no commit messages were scanned");
    } finally {
      sb.cleanup();
    }
  });
}

test("lint-secrets.sh — every scan pins the default rules with --config, so the tree's .gitleaks.toml cannot change them", () => {
  const sb = sandbox({
    files: {
      "a.txt": "a\n",
      // What a PR could commit to switch the scan off; --config must outrank it.
      ".gitleaks.toml": "[allowlist]\npaths = ['''.*''']\n",
    },
  });
  try {
    sb.git("commit", "-q", "--allow-empty", "-m", "second");
    const r = run(sb, {
      STUB_CATCH_SELFCHECK: "1",
      SECRET_SCAN_RANGE: `${sb.git("rev-parse", "HEAD~1")}..HEAD`,
      SECRET_SCAN_PR_BODY: "a body",
    });
    assert.equal(r.status, 0, show(r));
    const calls = scans(sb);
    assert.equal(
      calls.length,
      4,
      `non-vacuity: expected 4 scans, saw:\n${calls.join("\n")}`,
    );
    for (const c of calls) {
      const m = c.match(/(?:^| )--config (\S+)/);
      assert.ok(m, `missing --config: ${c}`);
      assert.ok(
        !m[1].startsWith(sb.repo),
        `--config must not come from the scanned repository: ${m[1]}`,
      );
    }
    const configs = read(sb.config).split("--\n").filter(Boolean);
    assert.equal(configs.length, 4, `one config per scan:\n${read(sb.config)}`);
    for (const c of configs)
      assert.equal(c, "[extend]\nuseDefault = true\n", `config content: ${c}`);
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
