/**
 * Unit tests for classify-changes.sh beside this file (agent-skills task.174).
 *
 * Lifted from tinker-city task.127's `scripts/ci/classify-changes.spec.js` as merged (PR #984,
 * `88f98a27`). Every lifted case is kept except the `engine` ones (tinker-city task.128, not part
 * of the template). Added: the two template inputs, `CI_WORKFLOW_PATH` and `DOCS_PATTERNS`.
 *
 * The script is a CI `changes` job's classifier. Every case here runs the REAL script with `bash`
 * against a REAL temporary git repository, so what is asserted is what the job executes. No
 * network: the CI evidence lookup (workflow runs of `before`) is replaced by `CI_OK_LOOKUP_FILE`,
 * or — for the cases that pin the real request — by a fake `curl` on PATH that records its argv
 * and stdin.
 *
 * Every `classify()` call also asserts that `code` was written exactly once, and that no `engine`
 * key survived the lift.
 *
 * Host dependency: `bash`, `git`, and `jq` for the lookup cases. Where `jq` is missing the cases
 * that need it skip with a named reason — except on GitHub Actions, where a missing `jq` FAILS
 * (a skip would read green). The `jq`-absent case builds a PATH without `jq` and runs everywhere.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "classify-changes.sh");
const ZERO = "0000000000000000000000000000000000000000";
const HAS_JQ =
  spawnSync("jq", ["--version"], { encoding: "utf8" }).status === 0;
const NEEDS_JQ = HAS_JQ
  ? false
  : "jq not installed on this host — runs on GitHub Actions, where it is required";
const CI_WORKFLOW = ".github/workflows/ci.yml";

const tmpDirs = [];
test.after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

function tmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(d);
  return d;
}

function git(dir, ...args) {
  const r = spawnSync("git", args, {
    cwd: dir,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@example.com",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@example.com",
    },
  });
  assert.equal(r.status, 0, `git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.trim();
}

/**
 * A repository with `develop` holding one code commit (`app.ts`), and a `feature` branch that adds
 * each entry of `commits` as one commit — `{ path: body }` writes files, `$mv: [[from, to]]` runs
 * `git mv`. `origin` is the repository itself, so the script's
 * `git fetch origin develop` succeeds offline. Returns the base SHA and each feature commit's SHA.
 */
function repo(commits) {
  const dir = tmp("classify-");
  git(dir, "init", "-q", "-b", "develop");
  fs.writeFileSync(path.join(dir, "app.ts"), "export {};\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  const base = git(dir, "rev-parse", "HEAD");
  git(dir, "remote", "add", "origin", dir);
  git(dir, "checkout", "-q", "-b", "feature");
  const shas = [];
  for (const files of commits) {
    for (const [from, to] of files.$mv || []) {
      fs.mkdirSync(path.dirname(path.join(dir, to)), { recursive: true });
      git(dir, "mv", from, to);
    }
    for (const [f, body] of Object.entries(files)) {
      if (f === "$mv") continue;
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), body);
    }
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "--allow-empty", "-m", "c");
    shas.push(git(dir, "rev-parse", "HEAD"));
  }
  return { dir, base, shas };
}

/** Every `key=value` line for `key` in `stdout` (the decision lines, not the `==>` summary). */
const decisions = (stdout, key) =>
  [...stdout.matchAll(new RegExp(`^${key}=(true|false)$`, "gm"))].map(
    (m) => m[1],
  );

/** The env a run sees: CI_WORKFLOW_PATH defaults to ci.yml; a key given as `undefined` is unset. */
function runEnv(PATH, env) {
  const merged = { PATH, CI_WORKFLOW_PATH: CI_WORKFLOW, ...env };
  for (const k of Object.keys(merged)) {
    if (merged[k] === undefined) delete merged[k];
  }
  return merged;
}

/** Runs the real script in `dir` with only `env` (plus PATH) set; GITHUB_OUTPUT unset → stdout. */
function classify(dir, env, PATH = process.env.PATH) {
  const r = spawnSync("bash", [SCRIPT], {
    cwd: dir,
    env: runEnv(PATH, env),
    encoding: "utf8",
  });
  // With GITHUB_OUTPUT set the decision lines go to that file, not stdout.
  const decided = env.GITHUB_OUTPUT
    ? fs.readFileSync(env.GITHUB_OUTPUT, "utf8")
    : r.stdout;
  const code = decisions(decided, "code");
  assert.equal(
    code.length,
    1,
    `expected exactly one code= line, got ${code.length}:\n${r.stdout}`,
  );
  assert.doesNotMatch(
    decided,
    /^engine=/m,
    "the template writes no engine output",
  );
  return {
    code: code[0],
    stdout: r.stdout,
    stderr: r.stderr,
    status: r.status,
  };
}

/** A workflow-runs response written to a temp file, for CI_OK_LOOKUP_FILE. */
function lookup(body) {
  const f = path.join(tmp("lookup-"), "runs.json");
  fs.writeFileSync(f, typeof body === "string" ? body : JSON.stringify(body));
  return f;
}

/** One workflow run, as GET /repos/{repo}/actions/runs returns it (the fields the script reads). */
const run = (
  conclusion,
  {
    event = "pull_request",
    path: wfPath = CI_WORKFLOW,
    status = "completed",
  } = {},
) => ({
  event,
  path: wfPath,
  status,
  conclusion,
});
const runs = (...list) => ({ total_count: list.length, workflow_runs: list });
const GREEN = runs(run("success"));

/** A PR whose first commit is code and whose second commit is the push under test. */
function prPush(secondCommit) {
  const r = repo([{ "src/a.ts": "x\n" }, secondCommit]);
  const [before, after] = r.shas;
  const env = (extra = {}) => ({
    EVENT_NAME: "pull_request",
    EVENT_ACTION: "synchronize",
    BASE_REF: "develop",
    BEFORE_SHA: before,
    AFTER_SHA: after,
    ...extra,
  });
  return { ...r, before, after, env };
}

const DOCS_PUSH = { "docs/notes.md": "n\n" };
const CODE_PUSH = { "src/b.ts": "y\n" };

// ── Existing behaviour (tinker-city task.58), unchanged by the lift ───────────────────

test("workflow_dispatch → true", () => {
  const { dir } = repo([DOCS_PUSH]);
  const r = classify(dir, { EVENT_NAME: "workflow_dispatch" });
  assert.equal(r.code, "true");
  // Decided on the event alone — before any fetch or diff, which would also fail safe to true.
  assert.match(r.stdout, /event 'workflow_dispatch' — running the full suite/);
  assert.doesNotMatch(r.stdout, /could not fetch|changed files/);
});

test("push, docs only → false", () => {
  // One file per default docs pattern, so dropping either pattern turns this case red.
  const { dir, base, shas } = repo([
    { "README.md": "r\n", "docs/x.yml": "x\n" },
  ]);
  const r = classify(dir, {
    EVENT_NAME: "push",
    BEFORE_SHA: base,
    AFTER_SHA: shas[0],
  });
  assert.equal(r.code, "false");
});

test("push, a code file → true, and the file is named", () => {
  const { dir, base, shas } = repo([{ "docs/x.md": "x\n", "src/c.ts": "c\n" }]);
  const r = classify(dir, {
    EVENT_NAME: "push",
    BEFORE_SHA: base,
    AFTER_SHA: shas[0],
  });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /first code file: src\/c\.ts/);
});

test("push, zero or empty before → true", () => {
  const { dir, shas } = repo([DOCS_PUSH]);
  for (const before of [ZERO, ""]) {
    const r = classify(dir, {
      EVENT_NAME: "push",
      BEFORE_SHA: before,
      AFTER_SHA: shas[0],
    });
    assert.equal(r.code, "true");
    assert.match(r.stdout, /no usable 'before' SHA/);
  }
});

test("push, unreachable before → true", () => {
  const { dir, shas } = repo([DOCS_PUSH]);
  const r = classify(dir, {
    EVENT_NAME: "push",
    BEFORE_SHA: "deadbeef".repeat(5),
    AFTER_SHA: shas[0],
  });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /unreachable/);
});

test("pull_request, docs-only PR → false (no lookup needed)", () => {
  const { dir } = repo([DOCS_PUSH, { "docs/more.md": "m\n" }]);
  const r = classify(dir, {
    EVENT_NAME: "pull_request",
    EVENT_ACTION: "opened",
    BASE_REF: "develop",
  });
  assert.equal(r.code, "false");
});

test("pull_request, a code file in the PR → true", () => {
  const { dir } = repo([CODE_PUSH]);
  assert.equal(
    classify(dir, {
      EVENT_NAME: "pull_request",
      EVENT_ACTION: "opened",
      BASE_REF: "develop",
    }).code,
    "true",
  );
});

test("pull_request, empty diff → true", () => {
  const { dir } = repo([{}]);
  const r = classify(dir, {
    EVENT_NAME: "pull_request",
    EVENT_ACTION: "opened",
    BASE_REF: "develop",
  });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /diff returned no files/);
});

test("pull_request, base fetch fails → true", () => {
  const { dir } = repo([DOCS_PUSH]);
  const r = classify(dir, {
    EVENT_NAME: "pull_request",
    EVENT_ACTION: "opened",
    BASE_REF: "no-such-branch",
  });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /could not fetch base ref/);
});

test("GITHUB_OUTPUT unset → the decision goes to stdout directly, never via /dev/stdout or /dev/stderr", () => {
  // Re-opening /dev/stdout fails on Linux when Node spawns the script (stdout is a socket), so
  // every case read code=null in Linux CI while passing on macOS. Not reproducible on macOS,
  // hence a text pin on the executed lines (comments stripped) — Linux CI is the execution evidence.
  const executed = fs
    .readFileSync(SCRIPT, "utf8")
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  assert.doesNotMatch(executed, /\/dev\/std(out|err)/);
});

test("sourced, the script defines its predicates and runs nothing", () => {
  // A top level that ran on source would fetch, emit and exit before the call.
  const cwd = tmp("sourced-"); // not a git repo: an unguarded top level would emit code=true and exit
  const r = spawnSync(
    "bash",
    [
      "-c",
      'source "$1"; is_docs docs/a.md && echo docs; is_docs apps/a.ts || echo code',
      "x",
      SCRIPT,
    ],
    { cwd, encoding: "utf8" },
  );
  assert.equal(r.stdout, "docs\ncode\n");
  assert.equal(r.status, 0);
});

test("GITHUB_OUTPUT set → the decision is appended to that file", () => {
  const { dir, base, shas } = repo([DOCS_PUSH]);
  const out = path.join(tmp("out-"), "output");
  const r = classify(dir, {
    EVENT_NAME: "push",
    BEFORE_SHA: base,
    AFTER_SHA: shas[0],
    GITHUB_OUTPUT: out,
  });
  assert.equal(fs.readFileSync(out, "utf8"), "code=false\n");
  assert.equal(r.status, 0);
});

// ── Renames (tinker-city task.127 BUG-1) ──────────────────────────────────────────────
// `git diff --name-only` prints only a rename's destination unless `--no-renames` is passed, so
// moving code into a docs path would read as docs-only. Each diff the script runs is pinned here.

const MOVE_CODE_INTO_DOCS = { $mv: [["app.ts", "docs/app.ts"]] };

test("push that moves a code file into docs/ → true, naming the removed code path", () => {
  const { dir, base, shas } = repo([MOVE_CODE_INTO_DOCS]);
  const r = classify(dir, {
    EVENT_NAME: "push",
    BEFORE_SHA: base,
    AFTER_SHA: shas[0],
  });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /first code file: app\.ts/);
});

test("PR whose only change moves a code file into docs/ → true (whole-PR diff)", () => {
  const { dir } = repo([MOVE_CODE_INTO_DOCS]);
  const r = classify(dir, {
    EVENT_NAME: "pull_request",
    EVENT_ACTION: "opened",
    BASE_REF: "develop",
  });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /first code file: app\.ts/);
});

test("synchronize push that moves a code file into docs/, on a green before → true (increment diff)", () => {
  // The moved file must exist on the BASE: moving a file the PR itself added leaves a whole-PR
  // diff of docs only, which is correctly code=false and never reaches the increment rule.
  const p = prPush(MOVE_CODE_INTO_DOCS);
  const r = classify(p.dir, p.env({ CI_OK_LOOKUP_FILE: lookup(GREEN) }));
  assert.equal(r.code, "true");
  assert.match(r.stdout, /this push changed:\n {2}app\.ts\n {2}docs\/app\.ts/);
  assert.doesNotMatch(r.stdout, /::notice::/);
});

// ── The docs-only increment rule (tinker-city task.127) ───────────────────────────────

/**
 * Where a missing jq must FAIL rather than skip: GitHub Actions only (a skip would read green).
 * NOT `CI`: a test container may set `CI=true` and lack jq, and keying on `CI` turned such a lane
 * red in tinker-city (task.127 BUG-4).
 */
const jqRequired = (env) => env.GITHUB_ACTIONS === "true";

test("jq is installed wherever GitHub Actions runs this spec (a skip would read green)", () => {
  if (jqRequired(process.env)) {
    assert.ok(
      HAS_JQ,
      "GitHub Actions without jq: the cases that prove the rule can grant a skip would be skipped",
    );
  }
});

test("the jq requirement applies on GitHub Actions only — never on CI=true alone", () => {
  assert.equal(jqRequired({ GITHUB_ACTIONS: "true", CI: "true" }), true);
  assert.equal(jqRequired({ CI: "true" }), false);
  assert.equal(jqRequired({}), false);
});

test(
  "docs increment on a successful PR run of the workflow → false, with a notice naming the SHA",
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    const r = classify(p.dir, p.env({ CI_OK_LOOKUP_FILE: lookup(GREEN) }));
    assert.equal(r.code, "false");
    assert.match(
      r.stdout,
      new RegExp(
        `::notice::docs-only increment on top of ${p.before} \\(a successful pull_request CI run\\)`,
      ),
    );
  },
);

test(
  "docs increment, a successful run with a ref suffix on its path → false",
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    const r = classify(
      p.dir,
      p.env({
        CI_OK_LOOKUP_FILE: lookup(
          runs(run("success", { path: `${CI_WORKFLOW}@refs/pull/9/merge` })),
        ),
      }),
    );
    assert.equal(r.code, "false");
  },
);

test(
  "docs increment, the only success is a PUSH-event run → true (tinker-city task.127 BUG-2)",
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    const r = classify(
      p.dir,
      p.env({
        CI_OK_LOOKUP_FILE: lookup(runs(run("success", { event: "push" }))),
      }),
    );
    assert.equal(r.code, "true");
    assert.match(r.stdout, /has no successful pull_request CI run/);
  },
);

test(
  "docs increment, the only success is ANOTHER workflow → true",
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    const r = classify(
      p.dir,
      p.env({
        CI_OK_LOOKUP_FILE: lookup(
          runs(run("success", { path: ".github/workflows/other.yml" })),
        ),
      }),
    );
    assert.equal(r.code, "true");
    assert.match(r.stdout, /has no successful pull_request CI run/);
  },
);

test("docs increment on a failed PR run → true", { skip: NEEDS_JQ }, () => {
  const p = prPush(DOCS_PUSH);
  const r = classify(
    p.dir,
    p.env({ CI_OK_LOOKUP_FILE: lookup(runs(run("failure"))) }),
  );
  assert.equal(r.code, "true");
  assert.match(r.stdout, /has no successful pull_request CI run/);
});

test(
  "docs increment, a cancelled and a successful PR run on the same SHA → false",
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    assert.equal(
      classify(
        p.dir,
        p.env({
          CI_OK_LOOKUP_FILE: lookup(runs(run("cancelled"), run("success"))),
        }),
      ).code,
      "false",
    );
  },
);

test(
  "docs increment, a PR run still in progress → true",
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    const r = classify(
      p.dir,
      p.env({
        CI_OK_LOOKUP_FILE: lookup(runs(run(null, { status: "in_progress" }))),
      }),
    );
    assert.equal(r.code, "true");
    assert.match(r.stdout, /has no successful pull_request CI run/);
  },
);

test("docs increment, no runs → true", { skip: NEEDS_JQ }, () => {
  const p = prPush(DOCS_PUSH);
  const r = classify(p.dir, p.env({ CI_OK_LOOKUP_FILE: lookup(runs()) }));
  assert.equal(r.code, "true");
  assert.match(r.stdout, /has no successful pull_request CI run/);
});

test(
  'docs increment, an API error body → true, reported as "could not look"',
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    const r = classify(
      p.dir,
      p.env({
        CI_OK_LOOKUP_FILE: lookup({
          message: "Resource not accessible by integration",
        }),
      }),
    );
    assert.equal(r.code, "true");
    assert.match(
      r.stdout,
      /::warning::the CI runs response for .* is not a workflow-runs list/,
    );
  },
);

test(
  'docs increment, unparseable lookup → true, reported as "could not look"',
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    const r = classify(p.dir, p.env({ CI_OK_LOOKUP_FILE: lookup("not json") }));
    assert.equal(r.code, "true");
    assert.match(
      r.stdout,
      /::warning::the CI runs response for .* is not a workflow-runs list/,
    );
  },
);

test(
  'docs increment, lookup file missing → true, reported as "could not look"',
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    const r = classify(
      p.dir,
      p.env({ CI_OK_LOOKUP_FILE: "/nonexistent/runs.json" }),
    );
    assert.equal(r.code, "true");
    assert.match(r.stdout, /::warning::could not read the CI runs for/);
  },
);

/** A PATH holding only the named tools (symlinked), plus whatever `extra` maps name → script. */
function pathWith(tools, extra = {}) {
  const bin = tmp("bin-");
  for (const tool of tools) {
    const found = spawnSync("bash", ["-c", `command -v ${tool}`], {
      encoding: "utf8",
    }).stdout.trim();
    if (found) fs.symlinkSync(found, path.join(bin, tool));
  }
  for (const [name, body] of Object.entries(extra)) {
    fs.writeFileSync(path.join(bin, name), body, { mode: 0o755 });
  }
  return bin;
}

const BASH = spawnSync("bash", ["-c", "command -v bash"], {
  encoding: "utf8",
}).stdout.trim();

test('docs increment, green before, but jq absent from PATH → true, reported as "could not look"', () => {
  const p = prPush(DOCS_PUSH);
  const bin = pathWith(["git", "cat", "sed", "curl"]);
  const r = spawnSync(BASH, [SCRIPT], {
    cwd: p.dir,
    env: runEnv(bin, p.env({ CI_OK_LOOKUP_FILE: lookup(GREEN) })),
    encoding: "utf8",
  });
  assert.match(r.stdout, /^code=true$/m);
  // It must reach the lookup and fail THERE: a PATH too thin for git would also print code=true.
  assert.match(r.stdout, /this push changed:\n {2}docs\/notes\.md/);
  assert.match(r.stdout, /::warning::jq not found/);
});

// ── The real request (no CI_OK_LOOKUP_FILE): a fake curl records what the script sends ──

/** A fake `curl` that records argv + stdin, then prints $FAKE_BODY and exits $FAKE_RC. */
const FAKE_CURL = `#!/usr/bin/env bash
printf '%s\\n' "$@" > "$FAKE_LOG.argv"
cat > "$FAKE_LOG.stdin"
[ -n "\${FAKE_BODY:-}" ] && cat "$FAKE_BODY"
exit "\${FAKE_RC:-0}"
`;

function viaFakeCurl(p, { body, rc = 0 }) {
  // `bash` is on the PATH because the fake curl's shebang resolves it through `env`.
  const bin = pathWith(["git", "cat", "sed", "jq", "bash"], {
    curl: FAKE_CURL,
  });
  const log = path.join(tmp("curl-"), "call");
  const env = runEnv(bin, {
    FAKE_LOG: log,
    FAKE_RC: String(rc),
    ...(body ? { FAKE_BODY: lookup(body) } : {}),
    GITHUB_TOKEN: "ghs_SECRETTOKEN123",
    GITHUB_REPOSITORY: "owner/repo",
    GITHUB_API_URL: "https://api.example.test",
    ...p.env(),
  });
  const r = spawnSync(BASH, [SCRIPT], { cwd: p.dir, env, encoding: "utf8" });
  const read = (ext) =>
    fs.existsSync(`${log}.${ext}`)
      ? fs.readFileSync(`${log}.${ext}`, "utf8")
      : null;
  return { stdout: r.stdout, argv: read("argv"), stdin: read("stdin") };
}

test(
  "the real request: workflow runs of before, pull_request only, bounded, token on stdin not argv",
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    const r = viaFakeCurl(p, { body: GREEN });
    assert.match(r.stdout, /^code=false$/m);
    assert.ok(r.argv, "curl was not called");
    const argv = r.argv.split("\n");
    assert.ok(
      argv.includes(
        `https://api.example.test/repos/owner/repo/actions/runs?head_sha=${p.before}&event=pull_request&exclude_pull_requests=true&per_page=100`,
      ),
      `request URL not found in argv: ${r.argv}`,
    );
    assert.ok(
      argv.includes("--connect-timeout") && argv.includes("--max-time"),
      "curl call has no timeouts",
    );
    // The fake records stdin whatever argv says, so pin that curl is TOLD to read headers from it:
    // without `-H @-` real curl sends no Authorization header and every lookup 401s.
    assert.equal(
      argv[argv.indexOf("@-") - 1],
      "-H",
      "curl is not told to read headers from stdin (-H @-)",
    );
    assert.ok(
      !r.argv.includes("ghs_SECRETTOKEN123"),
      "the token reached curl argv",
    );
    assert.match(r.stdin, /^Authorization: Bearer ghs_SECRETTOKEN123$/m);
  },
);

test(
  'the real request failing (curl non-zero) → true, reported as "could not look"',
  { skip: NEEDS_JQ },
  () => {
    const p = prPush(DOCS_PUSH);
    const r = viaFakeCurl(p, { rc: 28 });
    assert.match(r.stdout, /^code=true$/m);
    assert.match(
      r.stdout,
      /::warning::could not read the CI runs for .* \(exit 28\)/,
    );
  },
);

// ── Inputs that never reach the lookup ────────────────────────────────────────────────

test("code increment on a green before → true (the lookup never grants a code push)", () => {
  const p = prPush(CODE_PUSH);
  const r = classify(p.dir, p.env({ CI_OK_LOOKUP_FILE: lookup(GREEN) }));
  assert.equal(r.code, "true");
  assert.match(r.stdout, /first code file: src\/b\.ts/);
});

test("opened (no before) on a code PR → the whole-PR result, true", () => {
  const p = prPush(DOCS_PUSH);
  const r = classify(
    p.dir,
    p.env({
      EVENT_ACTION: "opened",
      BEFORE_SHA: "",
      CI_OK_LOOKUP_FILE: lookup(GREEN),
    }),
  );
  assert.equal(r.code, "true");
});

test("a non-synchronize action with a before SHA → the whole-PR result, true", () => {
  const p = prPush(DOCS_PUSH);
  const r = classify(
    p.dir,
    p.env({ EVENT_ACTION: "reopened", CI_OK_LOOKUP_FILE: lookup(GREEN) }),
  );
  assert.equal(r.code, "true");
  assert.doesNotMatch(r.stdout, /this push changed:/);
});

test("synchronize with an unreachable before → true", () => {
  const p = prPush(DOCS_PUSH);
  const r = classify(
    p.dir,
    p.env({
      BEFORE_SHA: "deadbeef".repeat(5),
      CI_OK_LOOKUP_FILE: lookup(GREEN),
    }),
  );
  assert.equal(r.code, "true");
});

test("synchronize with an empty increment (identical trees) → true", () => {
  const p = prPush({});
  assert.equal(
    classify(p.dir, p.env({ CI_OK_LOOKUP_FILE: lookup(GREEN) })).code,
    "true",
  );
});

test("a C-quoted docs name (non-ASCII) reads as code — an unreadable name runs the suite", () => {
  const { dir } = repo([{ "docs/café.md": "x\n" }]);
  const r = classify(dir, {
    EVENT_NAME: "pull_request",
    EVENT_ACTION: "opened",
    BASE_REF: "develop",
  });
  assert.match(
    r.stdout,
    /^ {2}"docs\//m,
    "git did not quote the name — the case tests nothing",
  );
  assert.equal(r.code, "true");
});

// ── Template input: CI_WORKFLOW_PATH (task.174) ───────────────────────────────────────

for (const [label, value] of [
  ["unset", undefined],
  ["empty", ""],
]) {
  test(`CI_WORKFLOW_PATH ${label} → true with a warning, even on a docs-only PR`, () => {
    // A docs-only PR needs no lookup, so it is the case a missing guard would let skip.
    const { dir } = repo([DOCS_PUSH]);
    const r = classify(dir, {
      EVENT_NAME: "pull_request",
      EVENT_ACTION: "opened",
      BASE_REF: "develop",
      CI_WORKFLOW_PATH: value,
    });
    assert.equal(r.code, "true");
    assert.match(r.stdout, /::warning::CI_WORKFLOW_PATH is not set/);
  });
}

test(
  "CI_WORKFLOW_PATH non-default → a success of THAT workflow is the evidence",
  { skip: NEEDS_JQ },
  () => {
    const BUILD = ".github/workflows/build.yml";
    const p = prPush(DOCS_PUSH);
    const own = classify(
      p.dir,
      p.env({
        CI_WORKFLOW_PATH: BUILD,
        CI_OK_LOOKUP_FILE: lookup(runs(run("success", { path: BUILD }))),
      }),
    );
    assert.equal(own.code, "false");
    // ci.yml's success no longer counts once another workflow is named.
    const other = classify(
      p.dir,
      p.env({ CI_WORKFLOW_PATH: BUILD, CI_OK_LOOKUP_FILE: lookup(GREEN) }),
    );
    assert.equal(other.code, "true");
    assert.match(other.stdout, /has no successful pull_request CI run/);
  },
);

// ── Template input: DOCS_PATTERNS (task.174) ──────────────────────────────────────────

/** A one-commit push of `files`, classified with `extra` env. */
function pushOf(files, extra = {}) {
  const { dir, base, shas } = repo([files]);
  return classify(dir, {
    EVENT_NAME: "push",
    BEFORE_SHA: base,
    AFTER_SHA: shas[0],
    ...extra,
  });
}

test("DOCS_PATTERNS widens the docs set: .agents/* counts only when listed", () => {
  const files = { ".agents/notes.txt": "n\n" };
  assert.equal(pushOf(files).code, "true", "not docs under the default");
  assert.equal(
    pushOf(files, { DOCS_PATTERNS: "*.md docs/* .agents/*" }).code,
    "false",
  );
});

test("DOCS_PATTERNS narrows the docs set: docs/* removed makes docs/x.yml code", () => {
  const r = pushOf({ "docs/x.yml": "x\n" }, { DOCS_PATTERNS: "*.md" });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /first code file: docs\/x\.yml/);
});

test("DOCS_PATTERNS set but empty → nothing is docs, so everything runs", () => {
  assert.equal(
    pushOf({ "README.md": "r\n" }, { DOCS_PATTERNS: "" }).code,
    "true",
  );
});

test("a pattern is matched, never glob-expanded against the runner's tree", () => {
  // `README.md` in the checkout: an expanded `*.md` would become `README.md` and `docs/*` would
  // become `docs/sub`, and neither matches `docs/sub/a.md` — a docs-only push read as code.
  const r = pushOf({ "README.md": "r\n", "docs/sub/a.md": "a\n" });
  assert.equal(r.code, "false");
});

test("sourced, is_docs honours DOCS_PATTERNS from the environment", () => {
  const cwd = tmp("sourced-patterns-");
  const r = spawnSync(
    "bash",
    [
      "-c",
      'source "$1"; is_docs notes.txt && echo docs; is_docs README.md || echo code',
      "x",
      SCRIPT,
    ],
    { cwd, encoding: "utf8", env: { ...process.env, DOCS_PATTERNS: "*.txt" } },
  );
  assert.equal(r.stdout, "docs\ncode\n");
});
