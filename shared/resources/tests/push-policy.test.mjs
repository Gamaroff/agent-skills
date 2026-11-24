/**
 * push-policy.sh (task.319) — the one decision behind every pipeline push.
 *
 * Each behaviour test runs the real script in a temporary repository with a bare remote, so what is
 * asserted is which commits reach the remote, not what the script's text says. The scan test at the
 * end is the backstop for the other half: a push site that does not ask the script at all.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neverRan, spawnBudget } from "../spawn-budget.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RES = resolve(HERE, "..");
const ROOT = resolve(RES, "../..");
const SCRIPT = join(RES, "push-policy.sh");
const ENGINE = join(RES, "ci-tree-equivalence.js");
const VERIFY = join(RES, "verify-push-state.sh");
const eng = createRequire(import.meta.url)("../ci-tree-equivalence.js");
const BUDGET = spawnBudget("PUSH_POLICY");

const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};
delete ENV.VCS;

function run(cmd, args, { cwd, env = ENV, input } = {}) {
  let r;
  for (let i = 0; i <= BUDGET.retries; i += 1) {
    r = spawnSync(cmd, args, {
      cwd,
      env,
      input,
      encoding: "utf8",
      timeout: BUDGET.timeoutMs,
    });
    if (!neverRan(r)) return r;
  }
  return r;
}

const git = (cwd, ...args) =>
  execFileSync(
    "git",
    ["-c", "maintenance.auto=false", "-c", "gc.auto=0", ...args],
    { cwd, env: ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();

const DOCS_CONFIG =
  'ci:\n  docsOnly:\n    patterns:\n      - "docs/**"\n      - "**/*.md"\n';

/** A repository on `feature/x`, pushed once, with a bare remote. */
function fixture(t, { config = DOCS_CONFIG, push = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "push-policy-"));
  t.after(() =>
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    }),
  );
  const up = join(dir, "up.git");
  const wt = join(dir, "wt");
  git(dir, "init", "-q", "--bare", up);
  git(dir, "init", "-q", "-b", "develop", wt);
  git(wt, "remote", "add", "origin", up);
  writeFileSync(join(wt, "src.js"), "0\n");
  if (config !== null) writeFileSync(join(wt, "skills-config.yaml"), config);
  git(wt, "add", "-A");
  git(wt, "commit", "-q", "-m", "base");
  git(wt, "push", "-q", "origin", "develop");
  git(wt, "checkout", "-q", "-b", "feature/x");
  if (push) git(wt, "push", "-q", "origin", "HEAD");
  return { dir, up, wt };
}

let seq = 0;
function commit(wt, file, msg = "c") {
  seq += 1;
  mkdirSync(dirname(join(wt, file)), { recursive: true });
  writeFileSync(join(wt, file), `${seq}\n`);
  git(wt, "add", "-A");
  git(wt, "commit", "-q", "-m", msg);
  return git(wt, "rev-parse", "HEAD");
}

function policy(wt, args, { script = SCRIPT, env = ENV } = {}) {
  const r = run("bash", [script, ...args], { cwd: wt, env });
  return { code: r.status, out: r.stdout.trim(), err: r.stderr.trim() };
}

const remoteHead = (up) => git(up, "rev-parse", "refs/heads/feature/x");

/** What a call site does: ask, and hold the push on `defer` alone. Returns 1 when the remote moved. */
function site(wt, up, id, opts) {
  const before = remoteHead(up);
  if (policy(wt, ["--site", id], opts).out !== "defer")
    git(wt, "push", "-q", "origin", "HEAD");
  return remoteHead(up) === before ? 0 : 1;
}

// ── the engine mode ─────────────────────────────────────────────────────────

function engineMode(wt, args = []) {
  const r = run(process.execPath, [ENGINE, "--push-policy", ...args], {
    cwd: wt,
  });
  return {
    code: r.status,
    err: r.stderr,
    rec: r.status === 0 ? JSON.parse(r.stdout) : null,
  };
}

test("engine mode: a docs delta is docs-only, and one code path makes it not", (t) => {
  const { wt } = fixture(t);
  commit(wt, "docs/a.md");
  let r = engineMode(wt, ["--base", "origin/feature/x"]);
  assert.equal(r.rec.docsOnly, true);
  assert.equal(r.rec.headDocsOnly, true);
  commit(wt, "src.js");
  r = engineMode(wt, ["--base", "origin/feature/x"]);
  assert.equal(r.rec.docsOnly, false);
  assert.deepEqual(r.rec.code, ["src.js"]);
});

test("engine mode: without --base the delta is unknown, never docs-only", (t) => {
  const { wt } = fixture(t);
  commit(wt, "docs/a.md");
  assert.equal(engineMode(wt).rec.docsOnly, null);
});

test("engine mode: the configuration file is code, whatever the patterns say", (t) => {
  const { wt } = fixture(t, {
    config: 'ci:\n  docsOnly:\n    patterns:\n      - "**"\n',
  });
  writeFileSync(
    join(wt, "skills-config.yaml"),
    'ci:\n  docsOnly:\n    patterns:\n      - "**"\n  skipMarker: "[skip ci]"\n',
  );
  git(wt, "commit", "-q", "-am", "config");
  const r = engineMode(wt, ["--base", "origin/feature/x"]);
  assert.equal(r.rec.docsOnly, false);
  assert.equal(r.rec.skipMarker, "[skip ci]");
});

test("engine mode: ci.docsOnly.enabled false makes every delta code", (t) => {
  const { wt } = fixture(t, {
    config: "ci:\n  docsOnly:\n    enabled: false\n",
  });
  commit(wt, "docs/a.md");
  const { rec } = engineMode(wt, ["--base", "origin/feature/x"]);
  assert.equal(rec.docsOnly, false);
  assert.equal(rec.headDocsOnly, false);
});

test("engine mode: a root commit and a merge that brings code are not docs-only heads", (t) => {
  const { wt } = fixture(t);
  assert.equal(
    engineMode(wt, ["--head", git(wt, "rev-list", "--max-parents=0", "HEAD")])
      .rec.headDocsOnly,
    false,
  );
  git(wt, "checkout", "-q", "-b", "other");
  commit(wt, "src.js");
  git(wt, "checkout", "-q", "feature/x");
  commit(wt, "docs/a.md");
  git(wt, "merge", "-q", "--no-ff", "-m", "merge", "other");
  assert.equal(engineMode(wt).rec.headDocsOnly, false);
});

test("config: ci.skipMarker is known, an unknown ci key is still refused, and its value is checked", () => {
  assert.equal(
    eng.parseConfig('ci:\n  skipMarker: "[skip ci]"\n').skipMarker,
    "[skip ci]",
  );
  assert.equal(eng.parseConfig("ci:\n  skipMarker: \n").skipMarker, "");
  assert.equal(eng.parseConfig("").skipMarker, "");
  for (const text of [
    "ci:\n  skipMarkers: x\n",
    "ci:\n  enabled: false\n",
    "ci:\n  skipMarker: 3\n",
    "ci:\n  skipMarker: >-\n",
    `ci:\n  skipMarker: ${"x".repeat(200)}\n`,
  ])
    assert.throws(() => eng.parseConfig(text), /ci/, text);
});

test("config: a ci block holding skipMarker does not exit 2 at the docs-only rule; an unknown key does", (t) => {
  const { wt } = fixture(t, {
    config: `${DOCS_CONFIG}  skipMarker: "[skip ci]"\n`,
  });
  const ok = run(process.execPath, [ENGINE, "--head-rollup", "SUCCESS"], {
    cwd: wt,
  });
  assert.equal(ok.status, 1, ok.stderr);
  const { wt: bad } = fixture(t, {
    config: `${DOCS_CONFIG}  skipMark: "[skip ci]"\n`,
  });
  const no = run(process.execPath, [ENGINE, "--head-rollup", "SUCCESS"], {
    cwd: bad,
  });
  assert.equal(no.status, 2);
});

test("config: the pipeline block refuses what it cannot account for, and never the ci rule", () => {
  const p = (text) => eng.parsePipelineConfig(text).pushRecordCommits;
  assert.equal(p(""), "batched");
  assert.equal(p("pipeline:\n  pushRecordCommits: eager\n"), "eager");
  assert.equal(p("pipeline:\n"), "batched");
  for (const bad of [
    "pipeline:\n  pushRecordCommits: sometimes\n",
    "pipeline:\n  pushRecordCommit: eager\n",
    "pipeline: { pushRecordCommits: eager }\n",
    "pipeline:\n  pushRecordCommits: eager\n  pushRecordCommits: batched\n",
    "Pipeline:\n  pushRecordCommits: eager\n",
    "pipeline:\n    pushRecordCommits: eager\n  extra: 1\n",
  ]) {
    assert.throws(() => p(bad), /pipeline/i, bad);
    // A push key written wrong must not turn a CI wait into a usage error.
    assert.doesNotThrow(() => eng.parseConfig(bad), bad);
  }
});

// ── the decision ────────────────────────────────────────────────────────────

/** A QA loop: the cycles' commits, each through the site its route reaches. */
const FIVE_CYCLES = [
  ["qa-cycle", "src.js"], // cycle 1: code fix
  ["qa-cycle", "src.js"], // cycle 2: code fix
  ["qa-cycle", "docs/t/gate.3.md"], // cycle 3: record-only fix
  ["qa-cycle", "docs/t/gate.4.md"], // cycle 4: record-only fix
  ["qa-pre-5c", "docs/t/gate.5.md"], // cycle 5: clean gate, reaches 5c
];

function simulate(wt, up, steps) {
  let pushes = 0;
  for (const [id, file] of steps) {
    commit(wt, file);
    pushes += site(wt, up, id);
  }
  return pushes;
}

test("batched: a five-cycle loop with two code cycles pushes three times, and the remote ends complete", (t) => {
  const { wt, up } = fixture(t);
  assert.equal(simulate(wt, up, FIVE_CYCLES), 3);
  assert.equal(remoteHead(up), git(wt, "rev-parse", "HEAD"));
});

test("eager: the same loop pushes after every commit", (t) => {
  const { wt, up } = fixture(t, {
    config: `${DOCS_CONFIG}pipeline:\n  pushRecordCommits: eager\n`,
  });
  assert.equal(simulate(wt, up, FIVE_CYCLES), FIVE_CYCLES.length);
});

test("performance: the measured task's push sequence, before and after", (t) => {
  // The consumer task of the card's Motivation: develop's PR push, two code cycles, three pauses at
  // step 5, a gate before 5c, a finalise gaps halt, the acceptance and the report.
  const run319 = [
    ["qa-cycle", "src.js"],
    ["pause", "docs/t/pause.1.md"],
    ["qa-cycle", "src.js"],
    ["pause", "docs/t/pause.2.md"],
    ["pause", "docs/t/pause.3.md"],
    ["qa-pre-5c", "docs/t/gate.3.md"],
    ["halt", "docs/t/gaps.md"],
    ["finalise-accept", "docs/t/dod.md"],
    ["step8", "docs/t/report.md"],
  ];
  const before = fixture(t, {
    config: `${DOCS_CONFIG}pipeline:\n  pushRecordCommits: eager\n`,
  });
  const after = fixture(t);
  const b = simulate(before.wt, before.up, run319);
  const a = simulate(after.wt, after.up, run319);
  t.diagnostic(`pushes before (eager): ${b}; after (batched): ${a}`);
  assert.equal(b, run319.length);
  assert.equal(a, run319.length - 3); // the three pauses; every other site is code, a reader or an end
});

test("pause: batched never pushes, even over unpushed code; eager does", (t) => {
  const { wt, up } = fixture(t);
  commit(wt, "src.js");
  assert.equal(site(wt, up, "pause"), 0);
  const e = fixture(t, {
    config: `${DOCS_CONFIG}pipeline:\n  pushRecordCommits: eager\n`,
  });
  commit(e.wt, "docs/p.md");
  assert.equal(site(e.wt, e.up, "pause"), 1);
});

test("a missing script pushes: every call site holds on `defer` and on nothing else (T319-CR-113)", (t) => {
  const { wt, up, dir } = fixture(t);
  commit(wt, "docs/a.md");
  assert.equal(
    site(wt, up, "qa-cycle", { script: join(dir, "gone.sh") }),
    1,
    "a record commit is pushed when nothing can answer",
  );
  // the authored blocks, not only this file's helper
  const held = authoredFiles().flatMap((f) =>
    readFileSync(join(ROOT, f), "utf8")
      .split("\n")
      .filter((l) => /\$\([^)]*push-policy\.sh"? --site/.test(l))
      .map((l) => [f, l.trim()]),
  );
  assert.ok(held.length >= 10, "the call sites were found");
  assert.deepEqual(
    held.filter(
      ([f, l]) => !/= ?defer/.test(l) && !f.endsWith("on-precompact.sh"), // its pause waits on any other answer
    ),
    [],
  );
});

test("a remote reader and an end push a record-only commit; a spent push holds code in both modes", (t) => {
  for (const config of [
    DOCS_CONFIG,
    `${DOCS_CONFIG}pipeline:\n  pushRecordCommits: eager\n`,
  ]) {
    const { wt } = fixture(t, { config });
    commit(wt, "docs/a.md");
    for (const id of [
      "qa-pre-5c",
      "halt",
      "finalise-entry",
      "finalise-accept",
      "finalise-fix",
      "step8",
      "tick",
    ])
      assert.equal(policy(wt, ["--site", id]).out, "push", id);
    commit(wt, "src.js");
    assert.equal(policy(wt, ["--site", "qa-review-fix"]).out, "defer");
  }
});

test("a branch not on the remote yet pushes, and one with nothing to send defers", (t) => {
  const { wt } = fixture(t, { push: false });
  commit(wt, "docs/a.md");
  assert.equal(policy(wt, ["--site", "qa-cycle"]).out, "push");
  const done = fixture(t);
  assert.equal(policy(done.wt, ["--site", "qa-cycle"]).out, "defer");
});

test("the delta is measured against the branch's own remote ref, not its upstream", (t) => {
  const { wt } = fixture(t, { push: false });
  // A branch cut from develop with tracking: @{upstream} is origin/develop, the push target is not.
  git(wt, "branch", "-q", "--set-upstream-to=origin/develop");
  commit(wt, "src.js");
  git(wt, "push", "-q", "origin", "HEAD");
  commit(wt, "docs/a.md");
  assert.equal(policy(wt, ["--site", "qa-cycle"]).out, "defer");
});

test("what cannot be decided pushes, except a pause, which waits", (t) => {
  const bad = fixture(t, { config: "ci:\n  docsOnly:\n    patern: x\n" });
  commit(bad.wt, "docs/a.md");
  const r = policy(bad.wt, ["--site", "qa-cycle"]);
  assert.equal(r.out, "push");
  assert.match(r.err, /could not be read/);
  assert.equal(policy(bad.wt, ["--site", "pause"]).out, "defer");
  // The engine missing beside the script (a partial bundle) is the same state.
  const { wt, dir } = fixture(t);
  commit(wt, "docs/a.md");
  const lone = join(dir, "push-policy.sh");
  cpSync(SCRIPT, lone);
  assert.equal(
    policy(wt, ["--site", "qa-cycle"], { script: lone }).out,
    "push",
  );
  assert.equal(policy(wt, ["--site", "pause"], { script: lone }).out, "defer");
});

test("usage: an unknown site, a missing site and an unknown flag exit 2 with nothing on stdout", (t) => {
  const { wt } = fixture(t);
  for (const args of [
    ["--site", "nope"],
    [],
    ["--site"],
    ["--bogus"],
    // T319-QA-1: an escape awk would decode into a listed id, and a string it would compare as a number
    ["--site", "\\160ause"],
    ["--site", "qa\\055cycle"],
    ["--site", "pause\n"],
  ]) {
    const r = policy(wt, args);
    assert.equal(r.code, 2, args.join(" "));
    assert.equal(r.out, "");
  }
  assert.equal(policy(wt, ["--self-test"]).out, "ok");
});

test("the end-of-run flush goes out before verify-push-state: with it the check passes, without it it fails", (t) => {
  const { wt, up } = fixture(t);
  commit(wt, "src.js");
  assert.equal(site(wt, up, "qa-cycle"), 1);
  commit(wt, "docs/t/qa.md");
  assert.equal(site(wt, up, "qa-cycle"), 0, "the record commit is deferred");
  const verify = () =>
    run("bash", [VERIFY, "--base", "develop"], { cwd: wt }).status;
  assert.notEqual(
    verify(),
    0,
    "a deferred commit must not read as pushed work",
  );
  assert.equal(site(wt, up, "step8"), 1);
  assert.equal(verify(), 0);
});

// ── the skip marker ─────────────────────────────────────────────────────────

/** A fake `gh` whose check-runs say `green` passed long ago; every other commit has none. */
function withGreen(dir, green) {
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, "gh"),
    `#!/bin/sh\ncase "$*" in\n  *"commits/${green}/check-runs"*) echo '{"status":"completed","conclusion":"success","completed_at":"2020-01-01T00:00:00Z"}' ;;\nesac\n`,
  );
  chmodSync(join(bin, "gh"), 0o755);
  return { ...ENV, VCS: "github", PATH: `${bin}:${ENV.PATH}` };
}
const MARKER_ONLY = `${DOCS_CONFIG}  skipMarker: "[skip ci]"\n`;
const MARKED_CONFIG = `${MARKER_ONLY}developNext:\n  mergeStrategy: merge\n`;
const subject = (wt) => git(wt, "log", "-1", "--format=%s");
const mark = (wt, env) =>
  policy(wt, ["--mark", "--site", "step8"], { env }).out;

test("marker: a record-only head over a green code commit carries it, body and staged files intact", (t) => {
  const { wt, dir } = fixture(t, { config: MARKED_CONFIG });
  const green = commit(wt, "src.js", "code");
  git(wt, "push", "-q", "origin", "HEAD");
  commit(wt, "docs/a.md", "docs: report\n\nbody line");
  writeFileSync(join(wt, "staged.js"), "x\n");
  git(wt, "add", "staged.js");
  const env = withGreen(dir, green);
  // the working tree holds uncommitted code: no checkCommand is configured, so it is not judged
  assert.equal(mark(wt, env), "marked");
  assert.equal(subject(wt), "docs: report [skip ci]");
  assert.equal(git(wt, "log", "-1", "--format=%b"), "body line");
  assert.equal(git(wt, "diff", "--cached", "--name-only"), "staged.js");
  assert.equal(
    mark(wt, env),
    "unmarked",
    "a marked subject is not marked twice",
  );
});

test("marker: never on a commit with code, off when the key is unset, and never without a green ancestor", (t) => {
  const { wt, dir } = fixture(t, { config: MARKED_CONFIG });
  const green = commit(wt, "src.js", "code");
  git(wt, "push", "-q", "origin", "HEAD");
  const env = withGreen(dir, green);
  commit(wt, "src.js", "more code");
  assert.equal(mark(wt, env), "unmarked");
  commit(wt, "docs/a.md", "docs");
  assert.equal(
    mark(wt, env),
    "unmarked",
    "code is still among the unpushed commits",
  );
  assert.equal(subject(wt), "docs");

  // unpushed code that some other run called green: the head is documentation over a green ancestor,
  // and the push still carries code to the remote for the first time
  const u = fixture(t, { config: MARKED_CONFIG });
  const gu = commit(u.wt, "src.js", "code");
  commit(u.wt, "docs/a.md", "docs");
  const un = policy(u.wt, ["--mark", "--site", "step8"], {
    env: withGreen(u.dir, gu),
  });
  assert.equal(un.out, "unmarked");
  assert.match(un.err, /the unpushed commits change code/);

  // code whose net effect is nil: the delta to the green ancestor is documentation, the head is code
  const r = fixture(t, { config: MARKED_CONFIG });
  const g2 = commit(r.wt, "src.js", "code");
  git(r.wt, "push", "-q", "origin", "HEAD");
  commit(r.wt, "docs/a.md", "docs");
  commit(r.wt, "src.js", "code again");
  git(r.wt, "checkout", "-q", g2, "--", "src.js");
  git(r.wt, "commit", "-q", "-m", "put it back");
  const nil = policy(r.wt, ["--mark", "--site", "step8"], {
    env: withGreen(r.dir, g2),
  });
  assert.equal(nil.out, "unmarked");
  assert.match(nil.err, /the head commit changes code/);

  const off = fixture(t);
  const g3 = commit(off.wt, "src.js", "code");
  git(off.wt, "push", "-q", "origin", "HEAD");
  commit(off.wt, "docs/a.md", "docs");
  assert.equal(mark(off.wt, withGreen(off.dir, g3)), "unmarked");

  const none = fixture(t, { config: MARKED_CONFIG });
  commit(none.wt, "src.js", "code");
  git(none.wt, "push", "-q", "origin", "HEAD");
  commit(none.wt, "docs/a.md", "docs");
  assert.equal(mark(none.wt, withGreen(none.dir, "0".repeat(40))), "unmarked");
});

test("marker: only under a stated merge-commit strategy, so it never reaches the base branch's head (T319-CR-101, bug 2)", (t) => {
  const strategy = (s) => `${MARKER_ONLY}developNext:\n  ${s}\n`;
  for (const [config, why] of [
    [MARKER_ONLY, "not stated"],
    [`${MARKER_ONLY}developNext:\n  baseBranch: develop\n`, "not stated"],
    [strategy("mergeStrategy: squash"), "squash"],
    [strategy("mergeStrategy: rebase"), "rebase"],
    [strategy("mergeStrategy: Merge"), "not the exact word"],
    [
      `${MARKER_ONLY}developNext: { mergeStrategy: merge }\n`,
      "a flow mapping the subset cannot read",
    ],
    [
      strategy("mergeStrategy: merge\n  mergeStrategy: rebase"),
      "stated twice: the reader would keep one",
    ],
  ]) {
    const f = fixture(t, { config });
    const green = commit(f.wt, "src.js", "code");
    git(f.wt, "push", "-q", "origin", "HEAD");
    commit(f.wt, "docs/a.md", "docs");
    const r = policy(f.wt, ["--mark", "--site", "step8"], {
      env: withGreen(f.dir, green),
    });
    assert.equal(r.out, "unmarked", why);
    assert.match(r.err, /mergeStrategy/, why);
    assert.equal(subject(f.wt), "docs");
  }
});

test("marker: never when a checkCommand is configured, and the command is not run (T319-CR-108)", (t) => {
  const f = fixture(t, {
    config: MARKED_CONFIG.replace(
      "  skipMarker",
      '    checkCommand: "touch ran.txt"\n  skipMarker',
    ),
  });
  const green = commit(f.wt, "src.js", "code");
  git(f.wt, "push", "-q", "origin", "HEAD");
  commit(f.wt, "docs/a.md", "docs");
  const r = policy(f.wt, ["--mark", "--site", "step8"], {
    env: withGreen(f.dir, green),
  });
  assert.equal(r.out, "unmarked");
  assert.match(r.err, /checkCommand/);
  assert.equal(existsSync(join(f.wt, "ran.txt")), false);
});

test("marker: the engine is told the run's own PR, whose destination decides a Bitbucket green (T319-CR-407)", (t) => {
  const lib = mkdtempSync(join(tmpdir(), "push-policy-lib-"));
  t.after(() => rmSync(lib, { recursive: true, force: true }));
  const script = join(lib, "push-policy.sh");
  copyFileSync(SCRIPT, script);
  const seen = join(lib, "seen");
  writeFileSync(
    join(lib, "ci-tree-equivalence.js"),
    `const a = process.argv.slice(2);
if (a[0] !== "--push-policy") { require("fs").writeFileSync(${JSON.stringify(seen)}, a.join(" ")); process.exit(0); }
console.log(JSON.stringify({ skipMarker: "[skip ci]", mergeStrategy: "merge", checkCommand: false, docsOnly: true, headDocsOnly: true }));
`,
  );
  const ask = (lock) => {
    const { wt } = fixture(t);
    installed(wt, "develop-task");
    if (lock) writeLock(wt, lock);
    commit(wt, "docs/gate.md");
    assert.equal(
      policy(wt, ["--mark", "--site", "step8"], { script }).out,
      "marked",
    );
    return readFileSync(seen, "utf8");
  };
  const bare = "--head-rollup NONE --head HEAD";
  assert.equal(
    ask({ pr_url: "https://bitbucket.org/a/b/pull-requests/12" }),
    `${bare} --pr 12`,
  );
  for (const lock of [
    null,
    { pr_url: "" },
    { pr_url: "https://x/pull/12", branch: "feature/y" },
    { pr_url: "https://x/pull/12abc" },
  ])
    assert.equal(ask(lock), bare, JSON.stringify(lock));
});

test("marker: a head already on the remote is never amended", (t) => {
  const { wt, dir } = fixture(t, { config: MARKED_CONFIG });
  const green = commit(wt, "src.js", "code");
  commit(wt, "docs/a.md", "docs");
  git(wt, "push", "-q", "origin", "HEAD");
  const head = git(wt, "rev-parse", "HEAD");
  assert.equal(mark(wt, withGreen(dir, green)), "unmarked");
  assert.equal(git(wt, "rev-parse", "HEAD"), head);
});

// ── the scan: no push site decides on its own ───────────────────────────────

/**
 * The population is found, not listed: every authored file under shared/resources and skills/, so a new
 * push site in a new file is read too. Generated copies, tests and fixtures are not authored sources.
 */
function authoredFiles() {
  const out = [];
  const isText = (f) => /\.(md|sh|js|mjs|json|py)$/.test(f);
  const walk = (rel) => {
    for (const e of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) {
        if (["tests", "node_modules", "references"].includes(e.name)) continue;
        walk(p);
      } else if (isText(e.name) && !/\.test\./.test(e.name)) out.push(p);
    }
  };
  walk("shared/resources");
  walk("skills");
  // The one skill whose own step documents live in references/ (they carry no shared source).
  const bugRefs = "skills/develop-bug/references";
  for (const f of readdirSync(join(ROOT, bugRefs)))
    if (/^develop-bug-/.test(f)) out.push(`${bugRefs}/${f}`);
  return out.sort();
}

const DELETE = {
  match: /git push (--quiet )?origin --delete/,
  reason: "a remote-branch delete starts no CI run on a PR head",
};
const FIRST = "creates the branch on the remote; it has no PR and no CI yet";
const PRINTED = "an instruction printed for a person to run";
const NAMES = "text or a matcher that names the command and never runs it";

/** A push that asks nobody, by file and by what it is. Every row needs its reason. */
const EXEMPT = [
  {
    file: "skills/develop-bug/SKILL.md",
    match: /`git push -u origin HEAD`\. Step 1 deferred it/,
    reason: FIRST,
  },
  { file: "skills/develop-next/SKILL.md", ...DELETE },
  { file: "skills/develop-batch/SKILL.md", ...DELETE },
  { file: "shared/resources/tick-pr.sh", ...DELETE },
  {
    file: "shared/resources/develop-pipeline-on-precompact.sh",
    match: /echo "- \*\*Pushed:\*\* no/,
    reason: PRINTED,
  },
  {
    file: "shared/resources/review-pipeline-step-0a-branch-setup.md",
    match: /git push -u origin "\$\{EPIC_BRANCH\}"/,
    reason: FIRST,
  },
  { file: "skills/create-branch/SKILL.md", match: /-u origin/, reason: FIRST },
  {
    file: "skills/create-parallel-stories/SKILL.md",
    match: /-u origin/,
    reason: FIRST,
  },
  {
    file: "skills/create-pr/SKILL.md",
    match: /git push -u origin|Verify `git push` exited/,
    reason: "the push that opens the PR",
  },
  ...["skills/develop-task/README.md", "skills/develop-story/README.md"].map(
    (file) => ({
      file,
      match: /`git push origin HEAD` when `push-policy\.sh` answers `push`/,
      reason: "the summary row; it states the policy",
    }),
  ),
  { file: "skills/qa-fix/SKILL.md", match: /echo "\d\./, reason: PRINTED },
  { file: "skills/qa-story/SKILL.md", match: /echo "\d\./, reason: PRINTED },
  ...[
    "shared/resources/defer-mutation.js",
    "shared/resources/handover-verify.js",
    "shared/resources/push-policy.sh",
    "shared/resources/qa-execute-snippets.mjs",
    "shared/resources/qa-runnable-prose-detection.md",
    "shared/resources/tracker-access-record.md",
    "shared/resources/tracker-issue-cli.md",
    "skills/loop-supervisor/assets/supervisor-settings.json",
    "skills/session-handoff/SKILL.md",
  ].map((file) => ({ file, match: /git push/, reason: NAMES })),
];

/** Lines with a `git push` that no push-policy call just above (or on, or under) the line guards. */
function unguardedPushes(text, siteIds) {
  const lines = text.split("\n");
  const bad = [];
  lines.forEach((line, i) => {
    if (!/git push\b/.test(line)) return;
    const window = lines.slice(Math.max(0, i - 3), i + 2).join("\n");
    const ids = [
      ...window.matchAll(/push-policy\.sh"?\s+--site\s+([a-z0-9-]+)/g),
    ].map((m) => m[1]);
    if (!ids.some((id) => siteIds.has(id))) bad.push([i + 1, line.trim()]);
  });
  return bad;
}

/**
 * An instruction to push written as prose: "commit the report, push, then HALT", "Then push.". The words
 * `git push` are not in it, so the scan above cannot see it, and a HALT that pushes nothing strands what
 * a `defer` held (T319-CR-107). A site named within the window below guards it.
 */
const PROSE_PUSH =
  /(?:^|[.,;:—→)]\s+|\b(?:and|then)\s+)(?:\*\*)?(?:then\s+)?push(?:\*\*)?(?:[.,:;]| (?:it|once|what|the (?:branch|commit|report))\b|\s*$)/i;
function unguardedProse(text, siteIds) {
  const lines = text.split("\n");
  const bad = [];
  let fence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) fence = !fence;
    if (fence || !PROSE_PUSH.test(line)) return;
    const window = lines.slice(i, i + 8).join("\n");
    const ids = [
      ...window.matchAll(/push-policy\.sh"?\s+--site\s+([a-z0-9-]+)/g),
    ].map((m) => m[1]);
    if (!ids.some((id) => siteIds.has(id))) bad.push([i + 1, line.trim()]);
  });
  return bad;
}
const PROSE_EXEMPT = [
  {
    file: "shared/resources/develop-pipeline-step-4-create-pr.md",
    match: /implementation report — create-pr failure`\), push, then HALT/,
    reason: "no PR exists yet, so the push starts no PR run and holds nothing",
  },
  {
    file: "skills/develop-bug/references/develop-bug-step-2-review.md",
    match: /Step 2b: Open the Tracker Issue": push,/,
    reason: FIRST,
  },
  ...[
    "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
    "skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md",
  ].map((file) => ({
    file,
    match:
      /> not in `npm test`, so a cycle could close green, push, and fail CI/,
    reason: "what a red cycle would do; not an instruction",
  })),
  {
    file: "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
    match: /task\.110 ran cycles 12 and 13/,
    reason: "a past run's cost; not an instruction",
  },
];

const siteIds = () =>
  new Set(
    run("bash", [SCRIPT, "--list"], { cwd: ROOT })
      .stdout.trim()
      .split("\n")
      .map((l) => l.split("\t")[0]),
  );

test("scan: every git push in a pipeline document or pipeline skill asks push-policy, or is exempt by name", () => {
  const ids = siteIds();
  assert.ok(ids.size >= 10, "the site table was read");
  const used = new Set(); // a call, and not a comment or a sentence that names one (T319-CR-903)
  const calls = (text) =>
    text
      .split("\n")
      .filter((l) => !/^\s*#/.test(l))
      .flatMap((l) => [
        ...l.matchAll(
          /\bbash\s+"?[^\s"`]*push-policy\.sh"?\s+--site\s+([a-z0-9-]+)/g,
        ),
      ])
      .map((m) => m[1]);
  const found = [];
  let guarded = 0;
  const files = authoredFiles();
  for (const must of [
    "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
    "skills/finalise/SKILL.md",
    "skills/develop-next/SKILL.md",
    "skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md",
  ])
    assert.ok(files.includes(must), `${must} is in the scanned population`);
  for (const file of files) {
    if (file === "shared/resources/push-policy.sh") continue; // the table itself
    const text = readFileSync(join(ROOT, file), "utf8");
    for (const id of calls(text)) used.add(id);
    for (const m of text.matchAll(
      /push-policy\.sh"?\s+--site\s+([a-z0-9-]+)/g,
    )) {
      guarded += 1;
      assert.ok(ids.has(m[1]), `${file}: --site ${m[1]} is not in the table`);
    }
    for (const [n, line] of unguardedPushes(text, ids)) {
      if (EXEMPT.some((e) => e.file === file && e.match.test(line))) continue;
      found.push(`${file}:${n}: ${line}`);
    }
  }
  assert.deepEqual(found, [], "an unguarded push site");
  assert.ok(guarded >= ids.size, "the scan read real call sites");
  assert.deepEqual(
    [...ids].filter((i) => !used.has(i)),
    [],
    "a site in the table that no document calls",
  );
  for (const s of [
    "# the same with push-policy.sh --site qa-review-fix",
    "   # bash x/push-policy.sh --site qa-review-fix",
    "The block (`push-policy.sh --site qa-pre-5c`) is under 5b.",
  ])
    assert.deepEqual(calls(s), [], s);
  assert.deepEqual(
    calls('if [ "$(bash a/push-policy.sh --site qa-cycle)" != defer ]'),
    ["qa-cycle"],
  );
});

test("scan: an instruction to push in a pipeline step document's prose names its site (T319-CR-107)", () => {
  const ids = siteIds();
  const files = authoredFiles().filter((f) =>
    /(develop-pipeline-step-|develop-bug-step-)[^/]*\.md$/.test(f),
  );
  assert.ok(files.length >= 8, files.join(", "));
  const found = [];
  let seen = 0;
  for (const file of files) {
    const text = readFileSync(join(ROOT, file), "utf8");
    seen += text.split("\n").filter((l) => PROSE_PUSH.test(l)).length;
    for (const [n, line] of unguardedProse(text, ids))
      if (!PROSE_EXEMPT.some((e) => e.file === file && e.match.test(line)))
        found.push(`${file}:${n}: ${line}`);
  }
  assert.ok(seen >= 8, `the scan read real prose (${seen})`);
  assert.deepEqual(found, []);
  for (const e of PROSE_EXEMPT)
    assert.match(readFileSync(join(ROOT, e.file), "utf8"), e.match, e.reason);
  // non-vacuity: the sentences the two develop-bug HALTs carried
  for (const s of [
    "commit the report via `/commit-changes` (`docs(x): y`), push, and **HALT**:",
    "commit the report via `/commit-changes` (`docs(x): y`), push, then HALT:",
    "Then push. A HALT is an end of the run",
    "Commit the gate, then push once — per path 2 above.",
  ]) {
    assert.equal(unguardedProse(`${s}\n`, ids).length, 1, s);
    assert.equal(
      unguardedProse(`${s}\n\npush-policy.sh --site qa-cycle\n`, ids).length,
      0,
      s,
    );
  }
  for (const s of [
    "Each cycle pushes as above.",
    "A second push here is the one this section exists to prevent:",
    "the next push carries the commit",
  ])
    assert.equal(unguardedProse(`${s}\n`, ids).length, 0, s);
});

/** The bash fences of a Markdown document, dedented, in order. */
function bashFences(file) {
  const out = [];
  let open = null;
  for (const line of readFileSync(join(ROOT, file), "utf8").split("\n")) {
    if (open === null && /^\s*```bash\s*$/.test(line))
      open = { indent: line.indexOf("`"), body: [] };
    else if (open !== null && /^\s*```\s*$/.test(line)) {
      out.push(open.body.join("\n"));
      open = null;
    } else if (open !== null) open.body.push(line.slice(open.indent));
  }
  return out;
}

/** `wt` with this checkout's scripts where the block of `skill` looks for them. */
function installed(wt, skill) {
  const refs = join(wt, ".agents/skills", skill, "references");
  mkdirSync(dirname(refs), { recursive: true });
  symlinkSync(RES, refs);
  writeFileSync(join(wt, ".git/info/exclude"), ".agents/\n.claude/\n");
  mkdirSync(join(wt, ".claude/state"), { recursive: true });
}

const LOCK_FILE = ".claude/state/develop-pipeline.lock";
function writeLock(wt, over = {}) {
  mkdirSync(join(wt, "docs/tasks/task.9.x"), { recursive: true });
  writeFileSync(
    join(wt, LOCK_FILE),
    JSON.stringify({
      skill: "develop-task",
      current_step: 5,
      task_or_story_id: "task.9",
      task_or_story_directory: "docs/tasks/task.9.x",
      report_path: "docs/tasks/task.9.x/r.md",
      branch: "feature/x",
      pr_url: "https://x/pull/1",
      ...over,
    }),
  );
}
const runHalt = (wt, text, env = ENV) =>
  run(
    "bash",
    [
      "-c",
      text
        .replace("{halt_reason}", "qa-waiver")
        .replace("{halt_step}", "5")
        .replace(/\{[a-z]+-directory\}/, "docs/tasks/task.9.x"),
    ],
    { cwd: wt, env },
  );
/** A shell that answers nothing for a while, at `file`. */
function hang(file) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, "#!/bin/sh\nexec sleep 25\n");
  chmodSync(file, 0o755);
  return file;
}

test("every terminal HALT pushes what the run held: each --halt call sits behind the flush, run as written (T319-CR-307)", (t) => {
  const calls = [];
  for (const file of authoredFiles().filter((f) => f.endsWith(".md")))
    for (const block of bashFences(file))
      if (/advance-pipeline-lock\.sh --halt\b/.test(block))
        calls.push([file, block]);
  assert.deepEqual(
    calls.map(([f]) => f),
    ["develop-bug", "develop-story", "develop-task"].map(
      (s) => `skills/${s}/SKILL.md`,
    ),
    "the one HALT protocol of each pipeline",
  );
  for (const [file, text] of calls) {
    const skill = file.split("/")[1];
    const halt = (held, lock) => {
      const { up, wt } = fixture(t);
      installed(wt, skill);
      writeLock(wt, { skill, ...lock });
      if (held) commit(wt, "docs/gate.md");
      const r = runHalt(wt, text);
      assert.equal(r.status, 0, `${file}: ${r.stdout}${r.stderr}`);
      assert.ok(!existsSync(join(wt, LOCK_FILE)), "halted");
      return { remote: remoteHead(up), head: git(wt, "rev-parse", "HEAD") };
    };
    const held = halt(true, {});
    assert.equal(held.remote, held.head, `${file}: the held commit is out`);
    // no PR yet, or another branch: nothing is pushed, and the HALT still happens
    for (const lock of [{ pr_url: "" }, { branch: "feature/y" }]) {
      const kept = halt(true, lock);
      assert.notEqual(kept.remote, kept.head, JSON.stringify(lock));
    }
    halt(false, {});
  }
});

test("a HALT whose push is refused is still a HALT, and says so (T319-CR-307)", (t) => {
  const text = bashFences("skills/develop-task/SKILL.md").find((b) =>
    b.includes("--halt"),
  );
  const { up, wt } = fixture(t);
  installed(wt, "develop-task");
  writeLock(wt);
  commit(wt, "docs/gate.md");
  mkdirSync(join(up, "hooks"), { recursive: true });
  writeFileSync(join(up, "hooks/pre-receive"), "#!/bin/sh\nexit 1\n");
  chmodSync(join(up, "hooks/pre-receive"), 0o755);
  const r = runHalt(wt, text);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^halt: not pushed — the push failed \(exit 1: /m);
  assert.ok(!existsSync(join(wt, LOCK_FILE)));
  writeLock(wt);
  const held = join(RES, "push-held.sh");
  assert.equal(run("bash", [held, "--site", "halt"], { cwd: wt }).status, 0);
  // the script not being there does not stop it either
  writeLock(wt);
  runHalt(wt, text.replace("push-held.sh", "not-here.sh"));
  assert.ok(!existsSync(join(wt, LOCK_FILE)));
});

test("a HALT whose push, or whose look at the remote, answers nothing still halts, in bounded time (T319-CR-505)", (t) => {
  const text = bashFences("skills/develop-task/SKILL.md").find((b) =>
    b.includes("--halt"),
  );
  for (const [what, stall, want] of [
    [
      "the push",
      ({ up }) => hang(join(up, "hooks/pre-receive")),
      /^halt: not pushed — the push failed \(no answer in 2 s; origin did not have it when asked again, and may still take it\)$/m,
    ],
    [
      "the pre-push hook",
      ({ wt }) => hang(join(wt, ".git/hooks/pre-push")),
      /^halt: not pushed — the push failed \(no answer in 2 s; origin did not have it/m,
    ],
    // the server took it and went on: what was asked again is what is said (T319-CR-906)
    [
      "the push, after the ref moved",
      ({ up }) => hang(join(up, "hooks/post-receive")),
      /^halt: pushed$/m,
    ],
    [
      "the push, and then the remote",
      ({ wt }) => {
        const slow = hang(join(wt, ".git/slow"));
        writeFileSync(
          join(wt, ".git/hooks/pre-push"),
          `#!/bin/sh\ngit config remote.origin.uploadpack "${slow}"\nexec sleep 25\n`,
        );
        chmodSync(join(wt, ".git/hooks/pre-push"), 0o755);
      },
      /^halt: not pushed — the push may have failed \(no answer in 2 s; origin could not be asked again\)$/m,
    ],
    [
      "the look",
      ({ wt }) =>
        git(
          wt,
          "config",
          "remote.origin.uploadpack",
          hang(join(wt, ".git/slow")),
        ),
      /^halt: not pushed — origin could not be asked for feature\/x \(no answer in 2 s\)$/m,
    ],
  ]) {
    const f = fixture(t);
    installed(f.wt, "develop-task");
    writeLock(f.wt);
    commit(f.wt, "docs/gate.md");
    stall(f);
    const r = runHalt(f.wt, text, { ...ENV, PUSH_HELD_SECONDS: "2" });
    assert.equal(r.status, 0, `${what}: ${r.stderr}`);
    assert.match(r.stdout, want, what);
    assert.ok(!existsSync(join(f.wt, LOCK_FILE)), `${what}: halted`);
  }
});

/** Is this process still doing anything? (One that ended and nobody collected is not.) */
function alive(pid) {
  try {
    process.kill(pid, 0);
    if (!existsSync("/proc/self/stat")) return true;
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    return stat[stat.lastIndexOf(")") + 2] !== "Z";
  } catch {
    return false;
  }
}
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
async function until(what, yes) {
  for (let i = 0; i < 200; i += 1) {
    if (yes()) return;
    await pause(50);
  }
  assert.fail(`never: ${what}`);
}

test("what push-held stops is the push and its hook, when its time is up and when it is told to end (T319-CR-901)", async (t) => {
  for (const how of ["its time", "a signal"]) {
    const { wt, dir } = fixture(t);
    installed(wt, "develop-task");
    writeLock(wt);
    commit(wt, "docs/gate.md");
    const pidFile = join(dir, "hook.pid");
    mkdirSync(join(wt, ".git/hooks"), { recursive: true });
    writeFileSync(
      join(wt, ".git/hooks/pre-push"),
      `#!/bin/sh\necho $$ > "${pidFile}.new" && mv "${pidFile}.new" "${pidFile}"\nsleep 25\necho went on\n`,
    );
    chmodSync(join(wt, ".git/hooks/pre-push"), 0o755);
    const child = spawn("bash", [join(RES, "push-held.sh"), "--site", "halt"], {
      cwd: wt,
      env: { ...ENV, PUSH_HELD_SECONDS: how === "its time" ? "8" : "20" },
      stdio: "ignore",
    });
    const ended = new Promise((done) => child.on("exit", done));
    await until("the hook started", () => existsSync(pidFile));
    const hook = Number(readFileSync(pidFile, "utf8"));
    t.after(() => {
      try {
        process.kill(hook, "SIGKILL");
      } catch {
        /* it is gone, as it should be */
      }
    });
    assert.ok(alive(hook), "the hook is running");
    if (how === "a signal") child.kill("SIGTERM");
    await ended;
    await until(`${how}: the hook ended`, () => !alive(hook));
  }
});

test("push-held says what is the remote's, whether or not somebody fetched, and never guesses (T319-CR-904, CR-905, CR-907)", (t) => {
  const held = (site, prepare) => {
    const f = fixture(t);
    installed(f.wt, "develop-task");
    writeLock(f.wt);
    const env = prepare(f) ?? {};
    const r = run("bash", [join(RES, "push-held.sh"), "--site", site], {
      cwd: f.wt,
      env: { ...ENV, ...env },
    });
    return { out: r.stdout.trim(), code: r.status };
  };
  const ahead = ({ up, dir }) => {
    git(dir, "clone", "-q", "-b", "feature/x", up, join(dir, "other"));
    commit(join(dir, "other"), "docs/theirs.md");
    git(join(dir, "other"), "push", "-q", "origin", "HEAD");
  };
  const fetched = (prepare) => (f) => {
    prepare(f);
    git(f.wt, "fetch", "-q", "origin");
  };
  const apart = (f) => {
    commit(f.wt, "docs/mine.md");
    ahead(f);
  };
  for (const [prepare, halt, entry] of [
    [() => {}, "halt: nothing held", "finalise-entry: nothing held"],
    [
      ahead,
      "halt: nothing held — origin's feature/x is ahead of this checkout",
      "finalise-entry: not pushed — origin's feature/x is ahead of this checkout: the PR head is not HEAD",
    ],
    [
      apart,
      "halt: not pushed — origin's feature/x has commits this checkout does not, and the held commits would be rejected",
      "finalise-entry: not pushed — origin's feature/x has commits this checkout does not, and the held commits would be rejected",
    ],
  ])
    for (const p of [prepare, fetched(prepare)]) {
      assert.deepEqual(held("halt", p), { out: halt, code: 0 });
      assert.deepEqual(held("finalise-entry", p), {
        out: entry,
        code: entry.includes("not pushed") ? 1 : 0,
      });
    }

  const noScratch = ({ dir }) => {
    mkdirSync(join(dir, "bin"));
    writeFileSync(join(dir, "bin/mktemp"), "#!/bin/sh\nexit 1\n");
    chmodSync(join(dir, "bin/mktemp"), 0o755);
    return { PATH: `${join(dir, "bin")}:${process.env.PATH}` };
  };
  assert.deepEqual(held("halt", noScratch), {
    out: "halt: not pushed — no scratch file could be made",
    code: 0,
  });
  assert.equal(held("finalise-entry", noScratch).code, 1);

  // in a partial clone a question about this repository does not become one for the remote
  let asked;
  held("halt", (f) => {
    ahead(f);
    git(f.wt, "config", "remote.origin.promisor", "true");
    git(f.wt, "config", "remote.origin.partialclonefilter", "blob:none");
    git(f.wt, "config", "extensions.partialClone", "origin");
    asked = join(f.dir, "asked");
    const server = join(f.dir, "upload-pack");
    writeFileSync(
      server,
      `#!/bin/sh\necho x >> "${asked}"\n[ $(wc -l < "${asked}") -gt 1 ] && exit 1\nexec git-upload-pack "$@"\n`,
    );
    chmodSync(server, 0o755);
    git(f.wt, "config", "remote.origin.uploadpack", server);
  });
  assert.equal(
    readFileSync(asked, "utf8"),
    "x\nx\n",
    "ls-remote, and the one fetch that is bounded by name",
  );

  // and one that git does not answer is not taken for an answer
  const real = run("sh", ["-c", "command -v git"]).stdout.trim();
  for (const [cmd, why] of [
    ["merge-base", "the history could not be read (no answer in 5 s)"],
    ["diff", "what is staged could not be read"],
  ])
    assert.equal(
      held("halt", (f) => {
        commit(f.wt, "docs/mine.md");
        mkdirSync(join(f.dir, "bin"));
        writeFileSync(
          join(f.dir, "bin/git"),
          `#!/bin/sh\n[ "$1" = ${cmd} ] && exec sleep 25\nexec "${real}" "$@"\n`,
        );
        chmodSync(join(f.dir, "bin/git"), 0o755);
        return { PATH: `${join(f.dir, "bin")}:${process.env.PATH}` };
      }).out,
      `halt: not pushed — ${why}`,
    );

  // the remote moves after it was asked: git's last words are a hint, and the reason is not
  const raced = held("halt", ({ up, wt, dir }) => {
    const theirs = commit(wt, "docs/theirs.md");
    git(wt, "push", "-q", "origin", `${theirs}:refs/heads/theirs`);
    git(wt, "reset", "-q", "--hard", "HEAD~1");
    commit(wt, "docs/mine.md");
    const server = join(dir, "receive-pack");
    writeFileSync(
      server,
      `#!/bin/sh\ngit --git-dir="${up}" update-ref refs/heads/feature/x ${theirs}\nexec git-receive-pack "$@"\n`,
    );
    chmodSync(server, 0o755);
    git(wt, "config", "remote.origin.receivepack", server);
  });
  assert.match(
    raced.out,
    /^halt: not pushed — the push failed \(exit 1: error: failed to push/,
  );
});

test("a HALT never re-creates a deleted branch, never parts a commit from a staged file, and never moves a head CI is being read on (T319-CR-507, CR-508)", (t) => {
  const text = bashFences("skills/develop-task/SKILL.md").find((b) =>
    b.includes("--halt"),
  );
  const halt = (prepare) => {
    const f = fixture(t);
    installed(f.wt, "develop-task");
    writeLock(f.wt);
    commit(f.wt, "docs/gate.md");
    prepare(f);
    const r = runHalt(f.wt, text);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!existsSync(join(f.wt, LOCK_FILE)), "halted");
    return { ...f, out: r.stdout, head: git(f.wt, "rev-parse", "HEAD") };
  };
  // merged and deleted on the remote; this clone's tracking ref still says otherwise
  const gone = halt(({ up }) =>
    git(up, "update-ref", "-d", "refs/heads/feature/x"),
  );
  assert.match(gone.out, /^halt: kept local — origin has no feature\/x/m);
  assert.equal(git(gone.up, "for-each-ref", "refs/heads/feature"), "");

  const staged = halt(({ wt }) => {
    writeFileSync(join(wt, "docs/review.md"), "review\n");
    git(wt, "add", "docs/review.md");
  });
  assert.match(staged.out, /^halt: kept local — something is staged/m);
  assert.notEqual(remoteHead(staged.up), staged.head);
  assert.equal(
    git(staged.wt, "diff", "--cached", "--name-only"),
    "docs/review.md",
  );

  const reading =
    (pid) =>
    ({ up, wt }) => {
      const at = join(wt, ".claude/state");
      writeFileSync(join(at, "finalise-ci-head-2.txt"), `${remoteHead(up)}\n`);
      writeFileSync(join(at, "finalise-ci-poll.pid"), `${pid}\n`);
    };
  const live = halt(reading(process.pid));
  assert.match(live.out, /^halt: kept local — CI is being read/m);
  assert.notEqual(remoteHead(live.up), live.head);
  // the same record with no poll behind it protects nothing
  const done = spawnSync("true").pid;
  const dead = halt(reading(done));
  assert.match(dead.out, /^halt: pushed$/m);
  assert.equal(remoteHead(dead.up), dead.head);
  // a live poll of another head protects nothing either
  const other = halt((f) => {
    reading(process.pid)(f);
    commit(f.wt, "docs/more.md");
    git(f.wt, "push", "-q", "origin", "HEAD");
    commit(f.wt, "docs/held.md");
  });
  assert.equal(remoteHead(other.up), other.head);
});

test("the entry to /finalise: nothing held leaves 5c's set staged; a held commit goes out with it; the 6c wait is never disturbed (T319-CR-301, CR-308)", (t) => {
  for (const [file, skill] of [
    ["shared/resources/develop-pipeline-step-7-finalise.md", "develop-task"],
    [
      "skills/develop-bug/references/develop-bug-step-7-close-bug.md",
      "develop-bug",
    ],
  ]) {
    const script = bashFences(file)
      .find((b) => b.includes("finalise-entry"))
      .replaceAll("{develop-story|develop-task}", skill);
    const state = () => {
      const { up, wt } = fixture(t);
      installed(wt, skill);
      mkdirSync(join(wt, "docs"), { recursive: true });
      return {
        wt,
        entry: () => run("bash", ["-c", script], { cwd: wt }),
        remote: () => remoteHead(up),
        head: () => git(wt, "rev-parse", "HEAD"),
        stage: () => {
          writeFileSync(join(wt, "docs/review.md"), "review\n");
          git(wt, "add", "docs/review.md");
        },
        // the pause commit: path-limited, and it links to the staged report
        pause: () => {
          writeFileSync(join(wt, "docs/report.md"), "[r](review.md)\n");
          git(wt, "add", "docs/report.md");
          git(wt, "commit", "-q", "-m", "docs: paused", "--", "docs/report.md");
        },
      };
    };
    const a = state();
    a.stage();
    const before = a.remote();
    assert.match(a.entry().stdout, /nothing held/, file);
    assert.equal(a.remote(), before);
    assert.equal(
      git(a.wt, "diff", "--cached", "--name-only"),
      "docs/review.md",
    );

    const b = state();
    b.stage();
    b.pause();
    const pushed = b.remote();
    assert.match(b.entry().stdout, /commit-staged/, file);
    assert.equal(b.remote(), pushed, "the dangling link is not pushed");
    git(b.wt, "commit", "-q", "-m", "docs: review evidence");
    b.entry();
    assert.equal(b.remote(), b.head());

    const c = state();
    c.pause();
    c.entry();
    assert.equal(c.remote(), c.head(), `${file}: held, nothing staged`);

    // /finalise runs whole again from here, so a head an earlier reading recorded holds nothing (CR-502)
    const d = state();
    writeFileSync(
      join(d.wt, ".claude/state/finalise-ci-head-2.txt"),
      `${d.head()}\n`,
    );
    d.pause();
    assert.match(d.entry().stdout, /^finalise-entry: pushed$/m, file);
    assert.equal(d.remote(), d.head());

    // no tracking ref is not "nothing held" (CR-501)
    const e = state();
    e.pause();
    git(e.wt, "update-ref", "-d", "refs/remotes/origin/feature/x");
    e.entry();
    assert.equal(e.remote(), e.head(), `${file}: no tracking ref`);

    // what cannot be asked or pushed stops the step, and creates nothing
    for (const [why, stop, want] of [
      ["detached", (s) => git(s.wt, "checkout", "-q", "--detach"), /detached/],
      [
        "no branch on the remote",
        (s) => git(s.wt, "push", "-q", "origin", "--delete", "feature/x"),
        /origin has no feature\/x/,
      ],
      [
        "no remote",
        (s) => git(s.wt, "remote", "set-url", "origin", join(s.wt, "none.git")),
        /origin could not be asked/,
      ],
    ]) {
      const s = state();
      s.pause();
      stop(s);
      const r = s.entry();
      assert.equal(r.status, 1, `${why}: ${r.stdout}`);
      assert.match(r.stdout, /^finalise-entry: not pushed — /m);
      assert.match(r.stdout, want);
    }
  }
});

test("push-held: a usage error is exit 2, and an argument is never read as a site", (t) => {
  const { wt } = fixture(t);
  for (const args of [
    [],
    ["--site"],
    ["--site", "qa-cycle"],
    ["--site", "halt", "x"],
    ["halt", "--site"],
  ])
    assert.equal(
      run("bash", [join(RES, "push-held.sh"), ...args], { cwd: wt }).status,
      2,
      args.join(" "),
    );
});

test("scan: a mark is asked only where the commit was just made, and these are all of them (T319-CR-503)", () => {
  const found = authoredFiles()
    .filter((f) => f.endsWith(".md"))
    .flatMap((f) =>
      bashFences(f)
        .flatMap((b) => [
          ...b.matchAll(/push-policy\.sh --mark --site ([a-z0-9-]+)/g),
        ])
        .map((m) => `${f.split("/").pop()} ${m[1]}`),
    )
    .sort();
  assert.deepEqual(found, [
    "SKILL.md finalise-accept",
    "develop-pipeline-step-5-6-qa-loop.md qa-pre-5c",
    "develop-pipeline-step-8-commit.md step8",
  ]);
  // /finalise 6a can meet a commit an earlier run made: the mark is in the arm that has just committed
  const accept = bashFences("skills/finalise/SKILL.md").find((b) =>
    b.includes("--mark --site finalise-accept"),
  );
  const arm = accept.slice(accept.indexOf('COMMIT_EXIT" -eq 0'));
  assert.ok(arm.indexOf("--mark") < arm.indexOf("\nfi\n"), "inside the else");
  assert.ok(accept.indexOf("git commit -m") < accept.indexOf("--mark"));
});

test("scan: a HALT has one push, push-held.sh in the HALT block, and the entry to /finalise names its site (T319-CR-102, CR-106, CR-703)", () => {
  const read = (f) => readFileSync(join(ROOT, f), "utf8");
  const bug = "skills/develop-bug/references/develop-bug-step-";
  const pipe = "shared/resources/develop-pipeline-step-";
  // the six HALTs that had a push of their own say what sends their commit out, and run nothing
  for (const [file, from, to] of [
    [`${bug}5-6-verify-loop.md`, "3. **Check for actual changes**", "3a."],
    [`${bug}5-6-verify-loop.md`, "Final Status to `Escalated`", "⚠️ Bug Fix"],
    [`${bug}7-close-bug.md`, "- DoD gaps found →", "⚠️ Finalise"],
    [`${pipe}5-6-qa-loop.md`, "2. **The no-code-change HALT**", "Those two"],
    [`${pipe}5-6-qa-loop.md`, '- `"MERGED"` or `"CLOSED"` →', "- `null`"],
    [`${pipe}5-6-qa-loop.md`, "#### develop-task escalation commit", "####"],
    [`${pipe}7-finalise.md`, "## If DoD Gaps Are Found", "⚠️ Finalise"],
  ]) {
    const text = read(file);
    const a = text.indexOf(from);
    const b = text.indexOf(to, a + from.length);
    assert.ok(a >= 0 && b > a, `${file}: ${from}`);
    const part = text.slice(a, b);
    assert.match(part, /`push-held\.sh --site halt`/, `${file}: ${from}`);
    assert.doesNotMatch(part, /git push|push-policy\.sh/, `${file}: ${from}`);
  }
  for (const [file, from, to, id] of [
    [`${bug}7-close-bug.md`, "## Part A", "Skill(finalise", "finalise-entry"],
    [
      `${pipe}7-finalise.md`,
      "## Invoke /finalise",
      "Invoke the `/finalise`",
      "finalise-entry",
    ],
  ]) {
    const text = read(file);
    const a = text.indexOf(from);
    const b = text.indexOf(to, a);
    assert.ok(a >= 0 && b > a, `${file}: ${from}`);
    const entry = text.slice(a, b);
    assert.match(entry, new RegExp(`--site ${id}\\b`), file);
    // the call outlives the tool's default timeout, and an answer that never came is not an answer
    // (T319-CR-704)
    const ms = Number(/tool\s+timeout of (\d+) ms/.exec(entry)?.[1]);
    const bound = (name) =>
      Number(new RegExp(`${name}[^\\n]*?(\\d+)`).exec(held)[1]);
    const held = read("shared/resources/push-held.sh");
    // the remote is asked before the push, and again after one that was stopped; three local questions
    const needs =
      bound("finalise-entry\\) PUSH_SECONDS=") +
      2 * bound(":-") +
      3 * bound("LOCAL_SECONDS=");
    assert.ok(needs <= ms / 1000 - 40, "a margin for a loaded machine");
    // a HALT fits in the tool's default timeout, which its block does not raise
    assert.ok(
      needs -
        bound("finalise-entry\\) PUSH_SECONDS=") +
        bound("halt\\) PUSH_SECONDS=") <=
        110,
    );
    assert.ok(needs > 120 && ms >= needs * 1000, `${file}: ${ms}, ${needs} s`);
    assert.match(entry, /no line at all/i, file);
  }
});

test("a HALT says when it could not read the run's lock, and does not call it a run with no PR (T319-CR-705)", (t) => {
  const held = join(RES, "push-held.sh");
  const halt = (prepare, env = ENV) => {
    const { wt, up, dir } = fixture(t);
    installed(wt, "develop-task");
    writeLock(wt);
    commit(wt, "docs/gate.md");
    const r = run("bash", [held, "--site", "halt"], {
      cwd: wt,
      env: prepare(wt, dir) ?? env,
    });
    assert.equal(r.status, 0, r.stderr);
    return {
      out: r.stdout.trim(),
      pushed: remoteHead(up) === git(wt, "rev-parse", "HEAD"),
    };
  };
  const unread = /^halt: not pushed — the pipeline lock could not be read/;
  for (const [what, prepare] of [
    [
      "no jq",
      (wt, dir) => {
        mkdirSync(join(dir, "nojq"));
        writeFileSync(join(dir, "nojq/jq"), "#!/bin/sh\nexit 127\n");
        chmodSync(join(dir, "nojq/jq"), 0o755);
        return { ...ENV, PATH: `${join(dir, "nojq")}:${process.env.PATH}` };
      },
    ],
    ["not JSON", (wt) => void writeFileSync(join(wt, LOCK_FILE), "{")],
    ["empty", (wt) => void writeFileSync(join(wt, LOCK_FILE), "")],
    ["a list", (wt) => void writeFileSync(join(wt, LOCK_FILE), "[1]")],
    ["null", (wt) => void writeFileSync(join(wt, LOCK_FILE), "null")],
    ["two objects", (wt) => void writeFileSync(join(wt, LOCK_FILE), "{}{}")],
  ]) {
    const r = halt(prepare);
    assert.match(r.out, unread, what);
    assert.equal(r.pushed, false, what);
  }
  for (const [want, prepare] of [
    [
      "halt: kept local — there is no pipeline lock",
      (wt) => rmSync(join(wt, LOCK_FILE)),
    ],
    [
      "halt: kept local — no PR is recorded",
      (wt) => writeLock(wt, { pr_url: "" }),
    ],
    [
      "halt: kept local — no PR is recorded",
      (wt) => writeLock(wt, { pr_url: null }),
    ],
    [
      "halt: kept local — the checkout is not on the run's branch",
      (wt) => writeLock(wt, { branch: undefined }),
    ],
    ["halt: pushed", () => {}],
  ])
    assert.equal(halt((wt) => void prepare(wt)).out, want);
});

test("scan: the detector flags an unlisted push and an unknown site (non-vacuity)", () => {
  const ids = siteIds();
  assert.equal(
    unguardedPushes("text\n```bash\ngit push origin HEAD\n```\n", ids).length,
    1,
  );
  assert.equal(
    unguardedPushes(
      'if [ "$(bash push-policy.sh --site nowhere)" = push ]; then\n  git push origin HEAD\nfi\n',
      ids,
    ).length,
    1,
  );
  // a guard further up the document is not this push's guard
  assert.equal(
    unguardedPushes(
      "bash push-policy.sh --site qa-cycle\n\n\n\n\ngit push origin HEAD\n",
      ids,
    ).length,
    1,
  );
  assert.equal(
    unguardedPushes(
      'if [ "$(bash push-policy.sh --site qa-cycle)" = push ]; then\n  git push origin HEAD\nfi\n',
      ids,
    ).length,
    0,
  );
});

test("scan: every exemption still matches a line in its file", () => {
  for (const e of EXEMPT) {
    assert.ok(existsSync(join(ROOT, e.file)), e.file);
    assert.match(
      readFileSync(join(ROOT, e.file), "utf8"),
      e.match,
      `${e.file}: ${e.reason}`,
    );
  }
});
