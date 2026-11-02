/**
 * Unit tests for the Bitbucket Pipelines classifier beside this file (task.174 Phase 3).
 *
 * Every case runs the REAL script with `bash` against a REAL temporary git repository. No network:
 * the pipelines API is a fake `curl` on PATH that records argv and stdin, prints a body, and
 * appends an HTTP status the way `curl -w '\n%{http_code}'` does.
 *
 * The rule under test: a pull-request pipeline whose pushed commit changes only docs over its
 * first parent, where that parent has a COMPLETED, SUCCESSFUL pull-request pipeline, emits
 * code=false. Everything else — a 403 above all — emits code=true.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "classify-changes.sh");
const GITHUB_SCRIPT = path.join(
  __dirname,
  "..",
  "github-actions",
  "classify-changes.sh",
);
const HAS_JQ =
  spawnSync("jq", ["--version"], { encoding: "utf8" }).status === 0;
const NEEDS_JQ = HAS_JQ ? false : "jq not installed on this host";

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

/** `develop` holds app.ts; `feature` adds each entry of `commits` as one commit. */
function repo(commits) {
  const dir = tmp("bb-classify-");
  git(dir, "init", "-q", "-b", "develop");
  fs.writeFileSync(path.join(dir, "app.ts"), "export {};\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  git(dir, "remote", "add", "origin", dir);
  git(dir, "checkout", "-q", "-b", "feature");
  const shas = [];
  for (const files of commits) {
    for (const [f, body] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), body);
    }
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "--allow-empty", "-m", "c");
    shas.push(git(dir, "rev-parse", "HEAD"));
  }
  return { dir, shas };
}

/** A fake `curl`: records argv + stdin, prints $FAKE_BODY, then "\n$FAKE_STATUS"; exits $FAKE_RC. */
const FAKE_CURL = `#!/usr/bin/env bash
printf '%s\\n' "$@" > "$FAKE_LOG.argv"
cat > "$FAKE_LOG.stdin"
[ -n "\${FAKE_BODY:-}" ] && cat "$FAKE_BODY"
printf '\\n%s' "\${FAKE_STATUS:-200}"
exit "\${FAKE_RC:-0}"
`;

/** A PATH holding only the named tools (symlinked), plus whatever `extra` maps name → script. */
function pathWith(tools, extra = {}) {
  const bin = tmp("bb-bin-");
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
const TOOLS = ["git", "cat", "sed", "jq", "bash", "base64", "tr", "printf"];

/** One pipeline, as GET /2.0/repositories/{ws}/{repo}/pipelines/ returns it (the fields read). */
const pipeline = (
  hash,
  {
    result = "SUCCESSFUL",
    state = "COMPLETED",
    type = "pipeline_pullrequest_target",
  } = {},
) => ({
  target: { type, commit: { hash } },
  state: { name: state, result: result ? { name: result } : undefined },
});
const list = (...values) => ({ values });

/**
 * Runs the script for a PR whose first commit is code and whose second is `push`. `api` is the
 * fake API: `{ body, status, rc }`; `env` overrides the pipeline variables.
 */
function classify(push, { api = {}, env = {}, tools = TOOLS } = {}) {
  const { dir, shas } = repo([{ "src/a.ts": "x\n" }, push]);
  const [before, after] = shas;
  const bin = pathWith(tools, { curl: FAKE_CURL });
  const log = path.join(tmp("bb-curl-"), "call");
  let body = api.body;
  if (typeof body === "function") body = body(before);
  const fakeBody =
    body === undefined
      ? {}
      : (() => {
          const f = path.join(tmp("bb-body-"), "body");
          fs.writeFileSync(
            f,
            typeof body === "string" ? body : JSON.stringify(body),
          );
          return { FAKE_BODY: f };
        })();
  const full = {
    PATH: bin,
    FAKE_LOG: log,
    FAKE_STATUS: String(api.status ?? 200),
    FAKE_RC: String(api.rc ?? 0),
    ...fakeBody,
    BITBUCKET_PR_ID: "7",
    BITBUCKET_PR_DESTINATION_BRANCH: "develop",
    BITBUCKET_COMMIT: after,
    BITBUCKET_WORKSPACE: "ws",
    BITBUCKET_REPO_SLUG: "repo",
    BITBUCKET_API_URL: "https://bb.example.test/2.0",
    BITBUCKET_ACCESS_TOKEN: "bb_SECRETTOKEN123",
    ...env,
  };
  for (const k of Object.keys(full)) if (full[k] === undefined) delete full[k];
  const r = spawnSync(BASH, [SCRIPT], {
    cwd: dir,
    env: full,
    encoding: "utf8",
  });
  const codes = [...r.stdout.matchAll(/^code=(true|false)$/gm)].map(
    (m) => m[1],
  );
  assert.equal(codes.length, 1, `expected one code= line:\n${r.stdout}`);
  const read = (ext) =>
    fs.existsSync(`${log}.${ext}`)
      ? fs.readFileSync(`${log}.${ext}`, "utf8")
      : null;
  return {
    code: codes[0],
    stdout: r.stdout,
    argv: read("argv"),
    stdin: read("stdin"),
    before,
    after,
    dir,
  };
}

const DOCS_PUSH = { "docs/notes.md": "n\n" };
const GREEN = (before) => list(pipeline(before));

test("not a pull-request pipeline → true, no lookup", () => {
  const r = classify(DOCS_PUSH, { env: { BITBUCKET_PR_ID: undefined } });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /not a pull-request pipeline/);
  assert.equal(r.argv, null);
});

test("docs-only PR → false, no lookup", () => {
  const { dir, shas } = repo([DOCS_PUSH, { "README.md": "r\n" }]);
  const r = spawnSync(BASH, [SCRIPT], {
    cwd: dir,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      BITBUCKET_PR_ID: "7",
      BITBUCKET_PR_DESTINATION_BRANCH: "develop",
      BITBUCKET_COMMIT: shas[1],
    },
  });
  assert.match(r.stdout, /^code=false$/m);
});

test("code push on a green parent → true, and the lookup is never made", () => {
  const r = classify({ "src/b.ts": "y\n" }, { api: { body: GREEN } });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /first code file: src\/b\.ts/);
  assert.equal(r.argv, null);
});

test(
  "docs push over a SUCCESSFUL pull-request pipeline of the first parent → false",
  { skip: NEEDS_JQ },
  () => {
    const r = classify(DOCS_PUSH, { api: { body: GREEN } });
    assert.equal(r.code, "false");
    assert.match(
      r.stdout,
      new RegExp(`docs-only increment on top of ${r.before}`),
    );
  },
);

test(
  "the real request: pipelines of the first parent, bounded, credential on stdin not argv",
  { skip: NEEDS_JQ },
  () => {
    const r = classify(DOCS_PUSH, { api: { body: GREEN } });
    const argv = r.argv.split("\n");
    assert.ok(
      argv.includes(
        `https://bb.example.test/2.0/repositories/ws/repo/pipelines/?target.commit.hash=${r.before}&sort=-created_on&pagelen=50`,
      ),
      `request URL not found in argv: ${r.argv}`,
    );
    assert.ok(
      argv.includes("--connect-timeout") && argv.includes("--max-time"),
    );
    assert.equal(argv[argv.indexOf("@-") - 1], "-H");
    assert.ok(!r.argv.includes("bb_SECRETTOKEN123"), "the token reached argv");
    assert.match(r.stdin, /^Authorization: Bearer bb_SECRETTOKEN123$/m);
  },
);

test(
  "username + API token → Basic auth on stdin, in bitbucket-auth.sh's order",
  { skip: NEEDS_JQ },
  () => {
    const r = classify(DOCS_PUSH, {
      api: { body: GREEN },
      env: {
        BITBUCKET_ACCESS_TOKEN: undefined,
        BITBUCKET_USERNAME: "me",
        BITBUCKET_API_TOKEN: "ATBB_secret",
      },
    });
    assert.equal(r.code, "false");
    const b64 = Buffer.from("me:ATBB_secret").toString("base64");
    assert.match(r.stdin, new RegExp(`^Authorization: Basic ${b64}$`, "m"));
    assert.ok(!r.argv.includes("ATBB_secret"));
  },
);

test("no credential → true, and no request is made", () => {
  const r = classify(DOCS_PUSH, {
    api: { body: GREEN },
    env: { BITBUCKET_ACCESS_TOKEN: undefined },
  });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /no Bitbucket credential/);
  assert.equal(r.argv, null);
});

test(
  "403 → true, named as a missing scope — even when the body would read green",
  { skip: NEEDS_JQ },
  () => {
    // The status decides, never the body: a reader that trusted the body would skip here.
    const r = classify(DOCS_PUSH, { api: { body: GREEN, status: 403 } });
    assert.equal(r.code, "true");
    assert.match(r.stdout, /403 .*lacks read:pipeline:bitbucket .*NOT 'no CI'/);
  },
);

for (const [label, api] of [
  ["401", { body: { type: "error" }, status: 401 }],
  ["404", { body: { type: "error" }, status: 404 }],
  ["a non-JSON body", { body: "<html>oops</html>" }],
  ["an empty list", { body: list() }],
  [
    "a FAILED pipeline",
    { body: (b) => list(pipeline(b, { result: "FAILED" })) },
  ],
  [
    "a pipeline still in progress",
    { body: (b) => list(pipeline(b, { state: "IN_PROGRESS", result: null })) },
  ],
  [
    "a successful BRANCH pipeline only",
    { body: (b) => list(pipeline(b, { type: "pipeline_ref_target" })) },
  ],
  [
    "a successful pipeline of ANOTHER commit (an ignored filter)",
    { body: list(pipeline("f".repeat(40))) },
  ],
  ["curl failing", { body: GREEN, rc: 28 }],
]) {
  test(`${label} → true`, { skip: NEEDS_JQ }, () => {
    assert.equal(classify(DOCS_PUSH, { api }).code, "true");
  });
}

test("jq absent from PATH → true", () => {
  const r = classify(DOCS_PUSH, {
    api: { body: GREEN },
    tools: TOOLS.filter((t) => t !== "jq"),
  });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /jq not found/);
});

test("destination branch fetch fails → true", () => {
  const r = classify(DOCS_PUSH, {
    api: { body: GREEN },
    env: { BITBUCKET_PR_DESTINATION_BRANCH: "no-such-branch" },
  });
  assert.equal(r.code, "true");
  assert.match(r.stdout, /could not fetch destination branch/);
});

test("an unknown pushed commit → true", () => {
  const r = classify(DOCS_PUSH, {
    api: { body: GREEN },
    env: { BITBUCKET_COMMIT: "deadbeef".repeat(5) },
  });
  assert.equal(r.code, "true");
});

test(
  "CLASSIFY_OUTPUT receives the decision line (the artifact later steps read)",
  { skip: NEEDS_JQ },
  () => {
    const out = path.join(tmp("bb-out-"), "ci-changes.env");
    const r = classify(DOCS_PUSH, {
      api: { body: GREEN },
      env: { CLASSIFY_OUTPUT: out },
    });
    assert.equal(r.code, "false");
    assert.equal(fs.readFileSync(out, "utf8"), "code=false\n");
  },
);

test("is_docs is identical to the GitHub Actions template's, default and overridden", () => {
  const paths = [
    "skills/x/SKILL.md",
    "docs/a/b.yml",
    "README.md",
    ".github/workflows/ci.yml",
    "src/a.ts",
    ".agents/notes.txt",
    "docs/café.md",
  ];
  const verdicts = (script, env) =>
    spawnSync(
      "bash",
      [
        "-c",
        'source "$1"; shift; for p in "$@"; do if is_docs "$p"; then echo docs; else echo code; fi; done',
        "x",
        script,
        ...paths,
      ],
      // `env` is already the whole, cleaned environment: re-spreading process.env here would put
      // back a DOCS_PATTERNS the runner's own environment sets, into the default case.
      { encoding: "utf8", env },
    ).stdout;
  // Each case's verdicts are pinned, not only compared: a DOCS_PATTERNS leaking in from the
  // runner's environment reaches both variants equally, so equality alone cannot see it.
  const cases = [
    [{}, "docs docs docs code code code docs"],
    [{ DOCS_PATTERNS: "*.md .agents/*" }, "docs code docs code code docs docs"],
  ];
  for (const [env, expected] of cases) {
    const e = { ...env };
    if (!("DOCS_PATTERNS" in e)) e.DOCS_PATTERNS = undefined;
    const clean = Object.fromEntries(
      Object.entries({ ...process.env, ...e }).filter(
        ([, v]) => v !== undefined,
      ),
    );
    const bb = verdicts(SCRIPT, clean);
    assert.equal(bb.trim().split("\n").join(" "), expected);
    assert.equal(bb, verdicts(GITHUB_SCRIPT, clean));
  }
});
