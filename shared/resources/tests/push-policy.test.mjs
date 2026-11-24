/**
 * push-policy.sh (task.319) — the one decision behind every pipeline push.
 *
 * Each behaviour test runs the real script in a temporary repository with a bare remote, so what is
 * asserted is which commits reach the remote, not what the script's text says. The scan test at the
 * end is the backstop for the other half: a push site that does not ask the script at all.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
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

/** What a call site does: ask, and push only on `push`. Returns 1 when the remote moved. */
function site(wt, up, id, extra = []) {
  const before = remoteHead(up);
  if (policy(wt, ["--site", id, ...extra]).out === "push")
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
    ["finalise-gaps", "docs/t/gaps.md"],
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

test("a remote reader, an end and --end push a record-only commit; a spent push holds code in both modes", (t) => {
  for (const config of [
    DOCS_CONFIG,
    `${DOCS_CONFIG}pipeline:\n  pushRecordCommits: eager\n`,
  ]) {
    const { wt } = fixture(t, { config });
    commit(wt, "docs/a.md");
    for (const id of [
      "qa-pre-5c",
      "qa-halt",
      "qa-escalation",
      "finalise-gaps",
      "finalise-accept",
      "finalise-fix",
      "step8",
      "tick",
    ])
      assert.equal(policy(wt, ["--site", id]).out, "push", id);
    assert.equal(policy(wt, ["--site", "qa-cycle", "--end"]).out, "push");
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
  for (const args of [["--site", "nope"], [], ["--site"], ["--bogus"]]) {
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
const MARKED_CONFIG = `${DOCS_CONFIG}  skipMarker: "[skip ci]"\n`;
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
  const used = new Set();
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
    for (const m of text.matchAll(
      /push-policy\.sh"?\s+--site\s+([a-z0-9-]+)/g,
    )) {
      used.add(m[1]);
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
