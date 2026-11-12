"use strict";
/**
 * Offline guard for scripts/remote-test/run.sh (task.295).
 *
 * `ssh` and `rsync` are stubs first on PATH, so nothing touches the network. Behaviour is asserted
 * from the stubs' call log and the runner's exit status, never from the runner's source text.
 *
 *   1. A --run name that is not a plain script name exits 2 before any ssh.
 *   2. An unreachable server exits non-zero, names TEST_LOCAL=1, and never runs locally.
 *   3. TEST_LOCAL=1 never calls ssh, and exits with the local script's status.
 *   4. The runner's exit status equals the remote run's, for 0, 1 and 124.
 *   5. A stale file in a synced tree is not skipped by the sync (the rsync call carries --delete
 *      and an exclude list, never --files-from).
 *
 * Run: node --test tests/test-remote-runner.test.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("node:assert/strict");
const test = require("node:test");
const { spawnSync } = require("child_process");
const { pathToFileURL } = require("node:url");

// The spawn timeout is the shared budget, never a literal chosen against an idle machine
// (tests/test-harness-concurrency.test.js fails on a hardcoded `timeout:` figure).
let budget;
test.before(async () => {
  const { spawnBudget } = await import(
    pathToFileURL(
      path.join(__dirname, "..", "shared", "resources", "spawn-budget.mjs"),
    ).href
  );
  budget = spawnBudget("TEST_REMOTE_RUNNER");
});

const REPO_ROOT = path.resolve(__dirname, "..");
const RUNNER = path.join(REPO_ROOT, "scripts", "remote-test", "run.sh");

/** A stub dir on PATH: ssh and rsync log their argv; ssh's status is steered by environment. */
function makeStubs(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "remote-runner-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const log = path.join(dir, "calls.log");
  fs.writeFileSync(log, "");
  // ssh: probe fails when STUB_PROBE_FAIL=1; the container run returns STUB_RUN_STATUS.
  fs.writeFileSync(
    path.join(dir, "ssh"),
    `#!/usr/bin/env bash
printf 'ssh %s\\n' "$*" >>"${log}"
case "$*" in
  *"bash -s -- take "*) cat >/dev/null; printf '%s' "\${STUB_LOCK_OUT:-}"; exit "\${STUB_LOCK_STATUS:-0}" ;;
  *"bash -s -- release "*) cat >/dev/null; exit "\${STUB_RELEASE_STATUS:-0}" ;;
  *"bash -s -- unlock "*) cat >/dev/null; printf '%s' "\${STUB_UNLOCK_OUT:-}"; exit "\${STUB_UNLOCK_STATUS:-0}" ;;
  *"bash -s -- prune "*) cat >/dev/null; exit "\${STUB_PRUNE_STATUS:-0}" ;;
  *"bash -s"*) cat >"${dir}/reap.sh"; exit 0 ;;
  *"docker ps -a"*) [ "\${STUB_CHECK_FAIL:-}" = "1" ] && exit 255; [ -n "\${STUB_CONTAINER:-}" ] && echo "\${STUB_CONTAINER}"; exit 0 ;;
  *"touch "*"docker image inspect"*) [ "\${STUB_TOUCH_FAIL:-}" = "1" ] && exit 1; exit 0 ;;
  *"docker version"*) [ "\${STUB_PROBE_FAIL:-}" = "1" ] && exit 255; exit 0 ;;
  *container.sh*)
    # STUB_SIGINT=1 sends Ctrl-C to the runner (this stub's grandparent: runner -> timeout -> ssh).
    if [ "\${STUB_SIGINT:-}" = "1" ]; then kill -INT "$(ps -o ppid= -p "$PPID" | tr -d ' ')"; sleep 1; fi
    exit "\${STUB_RUN_STATUS:-0}" ;;
esac
exit 0
`,
  );
  fs.writeFileSync(
    path.join(dir, "rsync"),
    `#!/usr/bin/env bash\nprintf 'rsync %s\\n' "$*" >>"${log}"\nexit 0\n`,
  );
  // npm stub for TEST_LOCAL=1: logs the call, exits with STUB_NPM_STATUS.
  fs.writeFileSync(
    path.join(dir, "npm"),
    `#!/usr/bin/env bash\nprintf 'npm %s\\n' "$*" >>"${log}"\nexit "\${STUB_NPM_STATUS:-0}"\n`,
  );
  for (const f of ["ssh", "rsync", "npm"])
    fs.chmodSync(path.join(dir, f), 0o755);
  return { dir, log };
}

/**
 * The environment a runner spawn starts from: this process's, without TEST_LOCAL. The runner reads
 * TEST_LOCAL to skip ssh, so a TEST_LOCAL=1 npm run test:remote leaked it into every spawn below
 * and failed the tests that expect the ssh path (14 of 19). A test that wants it passes it in `env`.
 */
function baseEnv() {
  const { TEST_LOCAL: _dropped, ...rest } = process.env;
  return rest;
}

function run(t, args, env = {}) {
  const stubs = makeStubs(t);
  const res = spawnSync("bash", [RUNNER, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...baseEnv(), PATH: `${stubs.dir}:${process.env.PATH}`, ...env },
  });
  const calls = fs.readFileSync(stubs.log, "utf8").split("\n").filter(Boolean);
  return { ...res, calls, stubDir: stubs.dir };
}

/** A throwaway git repo holding a copy of the runner, so branch names can be varied. */
function makeRepo(t) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "remote-runner-repo-"));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  fs.cpSync(
    path.join(REPO_ROOT, "scripts", "remote-test"),
    path.join(repo, "scripts", "remote-test"),
    { recursive: true },
  );
  const git = (...a) =>
    spawnSync(
      "git",
      [
        "-c",
        "user.email=t@t",
        "-c",
        "user.name=t",
        "-c",
        "commit.gpgsign=false",
        ...a,
      ],
      { cwd: repo, encoding: "utf8" },
    );
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  return { repo, git };
}

/** The container name (= run directory) the run call used, from the stubbed ssh log. */
function runName(t, repo, env = {}) {
  const stubs = makeStubs(t);
  const res = spawnSync(
    "bash",
    [path.join(repo, "scripts/remote-test/run.sh")],
    {
      cwd: repo,
      encoding: "utf8",
      env: { ...baseEnv(), PATH: `${stubs.dir}:${process.env.PATH}`, ...env },
    },
  );
  const calls = fs.readFileSync(stubs.log, "utf8").split("\n").filter(Boolean);
  const runCall = calls.find((c) => c.includes("container.sh"));
  const m = runCall && runCall.match(/--name (\S+)/);
  assert.ok(m, `no named run call; status ${res.status}: ${res.stderr}`);
  return m[1];
}

test("a --run name with shell metacharacters exits 2 before any ssh", (t) => {
  for (const bad of ["x;y", "", "a b", "$(id)", "-x", "a`b`"]) {
    const r = run(t, ["--run", bad]);
    assert.equal(
      r.status,
      2,
      `--run '${bad}' must exit 2, got ${r.status}: ${r.stderr}`,
    );
    assert.deepEqual(r.calls, [], `--run '${bad}' must not reach ssh or rsync`);
  }
});

test("an unknown argument and a bad host exit 2 before any ssh", (t) => {
  for (const args of [
    ["--nope"],
    ["--host", "-oProxyCommand=x"],
    ["--host", "a;b"],
    ["--timeout-min", "x"],
  ]) {
    const r = run(t, args);
    assert.equal(r.status, 2, `${args.join(" ")} must exit 2, got ${r.status}`);
    assert.deepEqual(r.calls, []);
  }
});

test("--host and --timeout-min with no value exit 2 instead of hanging", (t) => {
  for (const args of [
    ["--host"],
    ["--timeout-min"],
    ["--run", "x", "--host"],
  ]) {
    const stubs = makeStubs(t);
    // A hang ends in SIGTERM at the budget: status null, signal set, so it cannot pass as a refusal.
    const r = spawnSync("bash", [RUNNER, ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: budget.timeoutMs,
      env: { ...baseEnv(), PATH: `${stubs.dir}:${process.env.PATH}` },
    });
    assert.equal(
      r.status,
      2,
      `${args.join(" ")} must exit 2, got ${r.status} (signal ${r.signal})`,
    );
    assert.deepEqual(
      fs.readFileSync(stubs.log, "utf8").split("\n").filter(Boolean),
      [],
    );
  }
});

test("an unreachable server fails loudly, names TEST_LOCAL=1 and does not run locally", (t) => {
  const r = run(t, [], { STUB_PROBE_FAIL: "1" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /TEST_LOCAL=1/);
  assert.match(r.stderr, /unreachable/);
  assert.equal(
    r.calls.filter((c) => c.startsWith("npm ")).length,
    0,
    "an unreachable server must never fall back to a local npm run",
  );
  assert.equal(
    r.calls.filter((c) => c.startsWith("rsync")).length,
    0,
    "no sync after a failed probe",
  );
});

test("a TEST_LOCAL set in the caller's environment does not reach the runner", (t) => {
  // npm run test:remote with TEST_LOCAL=1 put it in this process's env; a spawn that copied
  // process.env then ran the local path and skipped ssh. Set it here so a plain run proves it.
  const had = Object.prototype.hasOwnProperty.call(process.env, "TEST_LOCAL");
  const prior = process.env.TEST_LOCAL;
  process.env.TEST_LOCAL = "1";
  t.after(() => {
    if (had) process.env.TEST_LOCAL = prior;
    else delete process.env.TEST_LOCAL;
  });
  const r = run(t, ["--run", "a"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(
    r.calls.filter((c) => c.startsWith("npm ")).length,
    0,
    "TEST_LOCAL leaked from the caller: the runner took the local path",
  );
  assert.ok(
    r.calls.some((c) => c.startsWith("ssh")),
    "the runner must take the ssh path",
  );
});

test("TEST_LOCAL=1 never calls ssh, runs each script, and stops at the first failure", (t) => {
  const ok = run(t, ["--run", "a", "--run", "b"], { TEST_LOCAL: "1" });
  assert.equal(ok.status, 0);
  assert.deepEqual(
    ok.calls.filter((c) => c.startsWith("npm ")),
    ["npm run a", "npm run b"],
  );
  assert.equal(ok.calls.filter((c) => c.startsWith("ssh")).length, 0);

  const red = run(t, ["--run", "a", "--run", "b"], {
    TEST_LOCAL: "1",
    STUB_NPM_STATUS: "3",
  });
  assert.equal(
    red.status,
    3,
    "local run exits with the failing script's status",
  );
  assert.deepEqual(
    red.calls.filter((c) => c.startsWith("npm ")),
    ["npm run a"],
    "the second script must not run after the first fails",
  );
});

test("the runner's exit status equals the remote run's status", (t) => {
  for (const status of [0, 1, 124]) {
    const r = run(t, ["--run", "ci:fast"], { STUB_RUN_STATUS: String(status) });
    assert.equal(
      r.status,
      status,
      `remote status ${status} must be the runner's status, got ${r.status}`,
    );
    assert.ok(
      r.calls.some((c) => c.includes("container.sh") && c.includes("ci:fast")),
      "the container run must have been attempted with the requested script",
    );
  }
});

test("the default target is ci:fast", (t) => {
  const r = run(t, []);
  assert.equal(r.status, 0);
  const runCall = r.calls.find((c) => c.includes("container.sh"));
  assert.ok(runCall, "a container run call is expected");
  assert.match(runCall, /container\.sh ci:fast$/);
  assert.match(runCall, /--cpu-shares 128/);
});

test("the run is named, bounded inside the container, and reaped by --init", (t) => {
  const r = run(t, ["--timeout-min", "20"]);
  const runCall = r.calls.find((c) => c.includes("container.sh"));
  assert.match(runCall, /docker run --rm --init --name agent-skills-test-\S+/);
  assert.match(
    runCall,
    /timeout -k 30s 20m bash scripts\/remote-test\/container\.sh ci:fast$/,
  );
});

test("a run that hits the limit kills the named container; an ordinary failure does not", (t) => {
  const timedOut = run(t, [], { STUB_RUN_STATUS: "124" });
  assert.equal(timedOut.status, 124);
  const name = timedOut.calls
    .find((c) => c.includes("container.sh"))
    .match(/--name (\S+)/)[1];
  assert.ok(
    timedOut.calls.some((c) => c.includes(`docker kill ${name}`)),
    `a timed-out run must docker kill ${name}; calls: ${timedOut.calls.join(" | ")}`,
  );
  const failed = run(t, [], { STUB_RUN_STATUS: "1" });
  assert.equal(failed.status, 1);
  assert.ok(
    !failed.calls.some((c) => c.includes("docker kill")),
    "an ordinary failure must not kill anything",
  );
});

test("branch names that differ get different run directories, and detached HEADs key on the commit", (t) => {
  const { repo, git } = makeRepo(t);
  const names = new Map();
  for (const b of ["feature/foo", "feature-foo", "Feature/Foo"]) {
    git("checkout", "-q", "-B", b);
    names.set(b, runName(t, repo));
  }
  assert.equal(new Set(names.values()).size, 3, `collision: ${[...names]}`);
  // The same branch twice must keep one directory, or nothing is ever reused.
  git("checkout", "-q", "-B", "feature/foo");
  assert.equal(runName(t, repo), names.get("feature/foo"));
  git("checkout", "-q", "--detach");
  const first = runName(t, repo);
  assert.match(first, /^agent-skills-test-detached-/);
  git("commit", "-q", "--allow-empty", "-m", "second");
  assert.notEqual(
    runName(t, repo),
    first,
    "two detached commits must not share a directory",
  );
});

test("--timeout-min accepts a leading zero and refuses an absurd length", (t) => {
  const ok = run(t, ["--timeout-min", "08"]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(
    ok.calls.find((c) => c.includes("container.sh")),
    /timeout -k 30s 8m /,
  );
  const long = run(t, ["--timeout-min", "99999999999999999999"]);
  assert.equal(long.status, 2);
  assert.deepEqual(long.calls, []);
});

test("--reap removes a stale directory but skips one with a running container", (t) => {
  const r = run(t, ["--reap", "3"]);
  assert.equal(r.status, 0, r.stderr);
  const script = path.join(r.stubDir, "reap.sh");
  assert.ok(fs.existsSync(script), "the reap script is sent to ssh on stdin");
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "remote-runner-home-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const old = new Date(Date.now() - 40 * 86400 * 1000);
  for (const d of ["agent-skills-test-stale", "agent-skills-test-busy"]) {
    fs.mkdirSync(path.join(home, d));
    fs.utimesSync(path.join(home, d), old, old);
  }
  fs.mkdirSync(path.join(home, "agent-skills-test-fresh"));
  fs.mkdirSync(path.join(home, "unrelated-old"));
  fs.utimesSync(path.join(home, "unrelated-old"), old, old);
  fs.writeFileSync(
    path.join(r.stubDir, "docker"),
    "#!/usr/bin/env bash\necho agent-skills-test-busy\n",
    { mode: 0o755 },
  );
  const res = spawnSync("bash", [script, "3"], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      PATH: `${r.stubDir}:${process.env.PATH}`,
    },
  });
  assert.equal(res.status, 0, res.stderr);
  const left = fs.readdirSync(home).sort();
  assert.deepEqual(left, [
    "agent-skills-test-busy",
    "agent-skills-test-fresh",
    "unrelated-old",
  ]);
});

test("the exclude list drops a root-level ignored directory and keeps a tracked fixture of the same name deeper down", (t) => {
  // An unanchored `.claude/state/` in rsync's exclude list matches at ANY depth, so it also dropped
  // the git-tracked eval fixture evals/**/replay/.claude/state/ from the synced tree, and the
  // 01-create-branch replay went red on the server only. Behaviour is asserted with the real rsync
  // (a list-only dry run) against the exclude file the runner wrote, not from the file's text.
  const { repo, git } = makeRepo(t);
  const write = (rel, body) => {
    const p = path.join(repo, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  };
  write(".gitignore", ".claude/state/\n");
  write("evals/x/replay/.claude/state/lock", "fixture\n");
  git("add", "-A");
  git("add", "-f", "evals/x/replay/.claude/state/lock");
  git("commit", "-q", "-m", "fixture");
  write(".claude/state/scratch", "ignored\n");

  const stubs = makeStubs(t);
  const kept = path.join(stubs.dir, "exclude-copy");
  // The runner deletes its exclude file on exit; the stub keeps a copy of it.
  fs.writeFileSync(
    path.join(stubs.dir, "rsync"),
    `#!/usr/bin/env bash
printf 'rsync %s\\n' "$*" >>"${stubs.log}"
for a in "$@"; do case "$a" in --exclude-from=*) cp "\${a#--exclude-from=}" "${kept}" ;; esac; done
exit 0
`,
    { mode: 0o755 },
  );
  spawnSync("bash", [path.join(repo, "scripts/remote-test/run.sh")], {
    cwd: repo,
    encoding: "utf8",
    env: { ...baseEnv(), PATH: `${stubs.dir}:${process.env.PATH}` },
  });
  assert.ok(fs.existsSync(kept), "the runner must hand rsync an exclude file");

  const real = spawnSync(
    "rsync",
    [
      "-an",
      "--list-only",
      `--exclude-from=${kept}`,
      `${repo}/`,
      "/nonexistent/",
    ],
    { encoding: "utf8" },
  );
  assert.equal(real.status, 0, real.stderr);
  assert.match(
    real.stdout,
    /evals\/x\/replay\/\.claude\/state\/lock/,
    "the tracked fixture must travel",
  );
  assert.doesNotMatch(
    real.stdout,
    / \.claude\/state\/scratch/,
    "the root-level ignored directory must not travel",
  );
});

test("a container already holding the run's name stops the run before any sync", (t) => {
  const r = run(t, [], { STUB_CONTAINER: "abc123" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already exists/);
  assert.match(r.stderr, /docker rm -f agent-skills-test-/);
  assert.ok(
    !r.calls.some((c) => c.startsWith("rsync")),
    `no rsync may run while the name is taken; calls: ${r.calls.join(" | ")}`,
  );
  assert.ok(
    !r.calls.some((c) => c.includes("container.sh")),
    "no container may be started",
  );
});

test("the container-name guard filters on the exact run name, and a failed check stops the run before any sync", (t) => {
  const ok = run(t, []);
  const check = ok.calls.find((c) => c.includes("docker ps -a"));
  const name = ok.calls
    .find((c) => c.includes("container.sh"))
    .match(/--name (\S+)/)[1];
  assert.ok(
    check.includes(`--filter name=^/${name}$`),
    `the filter must be anchored on the run name; got: ${check}`,
  );
  const failed = run(t, [], { STUB_CHECK_FAIL: "1" });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /could not check/);
  assert.ok(!failed.calls.some((c) => c.startsWith("rsync")));
});

// The stub fails the whole ssh call, so this holds that a failing image step stops the run; it cannot
// tell `touch && { inspect || build; }` from `touch && inspect || build` (a shell parse detail).
test("a failing touch or image step stops the run before the container starts", (t) => {
  const r = run(t, [], { STUB_TOUCH_FAIL: "1" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /could not build the test image/);
  assert.ok(!r.calls.some((c) => c.includes("container.sh")));
});

test("a dropped ssh session (255) kills the named container; docker's own failure (125) does not", (t) => {
  const dropped = run(t, [], { STUB_RUN_STATUS: "255" });
  assert.equal(dropped.status, 255);
  assert.ok(
    dropped.calls.some((c) => c.includes("docker kill agent-skills-test-")),
  );
  const nameTaken = run(t, [], { STUB_RUN_STATUS: "125" });
  assert.equal(nameTaken.status, 125);
  assert.ok(
    !nameTaken.calls.some((c) => c.includes("docker kill")),
    "status 125 means another run owns the name; killing it would stop that run",
  );
});

test("the run directory is touched after the sync and before the image build", (t) => {
  const r = run(t, []);
  const rsyncAt = r.calls.findIndex((c) => c.startsWith("rsync"));
  const touchAt = r.calls.findIndex(
    (c) => c.includes("touch ") && c.includes("docker image inspect"),
  );
  assert.ok(rsyncAt >= 0 && touchAt > rsyncAt, `calls: ${r.calls.join(" | ")}`);
});

test("--reap deletes nothing when docker ps fails", (t) => {
  const r = run(t, ["--reap", "3"]);
  const script = path.join(r.stubDir, "reap.sh");
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "remote-runner-home-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const old = new Date(Date.now() - 40 * 86400 * 1000);
  fs.mkdirSync(path.join(home, "agent-skills-test-live"));
  fs.utimesSync(path.join(home, "agent-skills-test-live"), old, old);
  fs.writeFileSync(
    path.join(r.stubDir, "docker"),
    "#!/usr/bin/env bash\nexit 1\n",
    { mode: 0o755 },
  );
  const res = spawnSync("bash", [script, "3"], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      PATH: `${r.stubDir}:${process.env.PATH}`,
    },
  });
  assert.notEqual(res.status, 0, "a failing docker ps must fail the reap");
  assert.deepEqual(fs.readdirSync(home), ["agent-skills-test-live"]);
});

test("the sync deletes stale files and never uses --files-from", (t) => {
  const r = run(t, []);
  const sync = r.calls.find(
    (c) => c.startsWith("rsync") && c.includes("--exclude-from"),
  );
  assert.ok(sync, "the tree sync call is expected");
  assert.match(sync, /--delete/);
  assert.doesNotMatch(sync, /--files-from/);
  assert.doesNotMatch(
    sync,
    /--delete-excluded/,
    "--delete-excluded would wipe the remote node_modules",
  );
  assert.match(sync, /--exclude=node_modules\//);
});

/**
 * A linked worktree beside its main checkout, the main checkout one commit ahead, so the common
 * git directory's HEAD and the worktree's HEAD name different commits. Both are removed with the
 * test, and the worktree's administrative entry goes with the repository that owns it.
 */
function makeLinkedWorktree(t) {
  const { repo, git } = makeRepo(t);
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "remote-runner-wt-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const wt = path.join(parent, "wt");
  const first = git("rev-parse", "HEAD").stdout.trim();
  git("commit", "-q", "--allow-empty", "-m", "main moves on");
  const added = git("worktree", "add", "-q", "--detach", wt, first);
  assert.equal(added.status, 0, added.stderr);
  assert.ok(
    fs.statSync(path.join(wt, ".git")).isFile(),
    "fixture: .git is a file",
  );
  return { repo, wt, first, second: git("rev-parse", "HEAD").stdout.trim() };
}

/**
 * ssh stays a stub; rsync is the real one with a "remote" directory standing in for the server's
 * home, so what the runner syncs can be read back from disk instead of inferred from argv.
 */
function makeRealRsyncStubs(t) {
  const stubs = makeStubs(t);
  const remote = path.join(stubs.dir, "remote-home");
  fs.mkdirSync(remote);
  const realRsync = spawnSync("sh", ["-c", "command -v rsync"], {
    encoding: "utf8",
  }).stdout.trim();
  assert.ok(realRsync, "the real rsync is needed to read the sync back");
  fs.writeFileSync(
    path.join(stubs.dir, "rsync"),
    `#!/usr/bin/env bash
printf 'rsync %s\\n' "$*" >>"${stubs.log}"
args=("$@")
last=$((\${#args[@]} - 1))
dest="\${args[$last]}"
local="${remote}/\${dest#*:}"
mkdir -p "$local"
args[$last]="$local"
exec "${realRsync}" "\${args[@]}"
`,
    { mode: 0o755 },
  );
  return { ...stubs, remote };
}

test("from a linked worktree the server gets the common git dir with this worktree's HEAD and index", (t) => {
  const { wt, first, second } = makeLinkedWorktree(t);
  assert.notEqual(first, second, "fixture: the two HEADs must differ");
  const stubs = makeRealRsyncStubs(t);
  const res = spawnSync("bash", [path.join(wt, "scripts/remote-test/run.sh")], {
    cwd: wt,
    encoding: "utf8",
    timeout: budget.timeoutMs,
    env: { ...baseEnv(), PATH: `${stubs.dir}:${process.env.PATH}` },
  });
  assert.equal(
    res.status,
    0,
    `status ${res.status}: ${res.stderr}${res.stdout}`,
  );
  assert.doesNotMatch(
    res.stdout,
    /is not a directory/,
    "the old warning-then-fail path must not run",
  );
  const runDirs = fs
    .readdirSync(stubs.remote)
    .filter((d) => d.startsWith("agent-skills-test-"));
  assert.equal(runDirs.length, 1, `one run directory expected: ${runDirs}`);
  const gitDir = path.join(stubs.remote, runDirs[0], ".git");
  assert.ok(
    fs.statSync(gitDir).isDirectory(),
    ".git on the server is a directory",
  );
  assert.ok(
    fs.existsSync(path.join(gitDir, "objects")),
    "the common directory's objects travel",
  );
  assert.equal(
    fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim(),
    first,
    "the server's HEAD is the worktree's, not the main checkout's",
  );
  assert.ok(
    fs.existsSync(path.join(gitDir, "index")),
    "the worktree's index travels",
  );
  assert.ok(
    !fs.existsSync(path.join(gitDir, "worktrees")),
    "other worktrees' administrative state must not travel",
  );
  // The synced directory is a working repository at the worktree's commit, as the container sees it.
  const head = spawnSync(
    "git",
    ["-C", path.join(stubs.remote, runDirs[0]), "rev-parse", "HEAD"],
    {
      encoding: "utf8",
    },
  );
  assert.equal(head.stdout.trim(), first, head.stderr);
});

test("a normal checkout still syncs its own .git directory, exactly as before", (t) => {
  const { repo } = makeRepo(t);
  const stubs = makeStubs(t);
  const res = spawnSync(
    "bash",
    [path.join(repo, "scripts/remote-test/run.sh")],
    {
      cwd: repo,
      encoding: "utf8",
      timeout: budget.timeoutMs,
      env: { ...baseEnv(), PATH: `${stubs.dir}:${process.env.PATH}` },
    },
  );
  assert.equal(res.status, 0, res.stderr);
  const calls = fs.readFileSync(stubs.log, "utf8").split("\n").filter(Boolean);
  const gitSyncs = calls.filter((c) => /\/\.git\/ \S+:\S+\/\.git\/$/.test(c));
  assert.equal(
    gitSyncs.length,
    1,
    `one .git sync expected: ${calls.join(" | ")}`,
  );
  assert.match(gitSyncs[0], /^rsync -a --delete \S+\/\.git\/ /);
  assert.doesNotMatch(res.stdout, /linked worktree/);
});

// --- task.296: the per-run lock, --unlock and --prune-images ------------------------------------

const LOCKCTL = path.join(REPO_ROOT, "scripts", "remote-test", "lockctl.sh");
const sshCalls = (r, op) =>
  r.calls.filter((c) => c.startsWith("ssh") && c.includes(`bash -s -- ${op} `));
const HELD_OUT = (state) =>
  `start=1\ntimeout_min=30\ntoken=other\nowner=otherhost pid 99\nage_s=600\nstate=${state}\n`;

test("a held lock stops the run before any sync, names the owner, and never releases the holder's lock", (t) => {
  // No container is present (STUB_CONTAINER unset), so the container-name layer cannot be what stops
  // this run: the lock alone does.
  const r = run(t, [], {
    STUB_LOCK_STATUS: "10",
    STUB_LOCK_OUT: HELD_OUT("live"),
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /another run holds the lock ~\/agent-skills-test-/);
  assert.match(r.stderr, /otherhost pid 99/);
  assert.match(r.stderr, /10m/);
  // A live lock says wait; only a stale one says "Clear it with". (The pattern this replaced matched
  // neither message, so it could not fail: T296-QA-1.)
  assert.match(r.stderr, /Wait for it to finish/);
  assert.doesNotMatch(r.stderr, /Clear it with/);
  assert.ok(!r.calls.some((c) => c.startsWith("rsync")), "no sync may run");
  assert.ok(!r.calls.some((c) => c.includes("container.sh")), "no container");
  assert.equal(
    sshCalls(r, "release").length,
    0,
    "a refused run must not release the lock it does not own",
  );
});

test("a stale lock is refused by a run, which names --unlock and does not clear it itself", (t) => {
  const r = run(t, [], {
    STUB_LOCK_STATUS: "10",
    STUB_LOCK_OUT: HELD_OUT("stale"),
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Clear it with: npm run test:remote -- --unlock/);
  assert.equal(sshCalls(r, "unlock").length, 0);
  assert.equal(sshCalls(r, "release").length, 0);
  assert.ok(!r.calls.some((c) => c.startsWith("rsync")));
});

test("a failed take is not read as held, and an owner-write or create failure says so", (t) => {
  const dropped = run(t, [], { STUB_LOCK_STATUS: "255" });
  assert.equal(dropped.status, 1);
  assert.match(dropped.stderr, /could not take the lock/);
  assert.doesNotMatch(dropped.stderr, /another run holds/);
  const noOwner = run(t, [], { STUB_LOCK_STATUS: "11" });
  assert.equal(noOwner.status, 1);
  assert.match(noOwner.stderr, /could not write its owner file/);
  const noDir = run(t, [], { STUB_LOCK_STATUS: "12" });
  assert.equal(noDir.status, 1);
  assert.match(noDir.stderr, /could not create ~\/agent-skills-test-/);
  for (const r of [dropped, noOwner, noDir]) {
    assert.ok(!r.calls.some((c) => c.startsWith("rsync")));
    assert.equal(sshCalls(r, "release").length, 0, "no lock was taken");
  }
});

test("a free lock is taken before the sync and released after the run, adding one ssh call to a run", (t) => {
  const r = run(t, []);
  assert.equal(r.status, 0, r.stderr);
  const takeAt = r.calls.findIndex((c) => c.includes("bash -s -- take "));
  const rsyncAt = r.calls.findIndex((c) => c.startsWith("rsync"));
  const runAt = r.calls.findIndex((c) => c.includes("container.sh"));
  const releaseAt = r.calls.findIndex((c) => c.includes("bash -s -- release "));
  assert.ok(
    takeAt >= 0 && takeAt < rsyncAt && rsyncAt < runAt && runAt < releaseAt,
    `take, sync, run, release in order; calls: ${r.calls.join(" | ")}`,
  );
  const tokenOf = (c) => c.match(/-- (?:take|release) \S+ (\S+)/)[1];
  assert.equal(
    tokenOf(r.calls[releaseAt]),
    tokenOf(r.calls[takeAt]),
    "the release carries the token the take wrote",
  );
  // task.295's route made 6 ssh calls (probe, container check, load, mkdir, image, run). The take
  // replaces the mkdir, so the lock adds exactly one call: the release.
  assert.equal(
    r.calls.filter((c) => c.startsWith("ssh")).length,
    7,
    r.calls.join(" | "),
  );
  assert.ok(
    !r.calls.some((c) => c.startsWith("ssh") && /mkdir -p/.test(c)),
    "the take creates the run directory; there is no separate mkdir call",
  );
});

test("the take carries the run's own timeout, and every argument is one word", (t) => {
  const r = run(t, ["--timeout-min", "8"]);
  // ssh joins its arguments with spaces and the server's shell splits them again, so an argument
  // with a space in it (the owner description) arrives as several and shifts the ones after it.
  // The anchored pattern is exactly: take RUN_DIR TOKEN TIMEOUT OWNER, five words and nothing else.
  assert.match(
    r.calls.find((c) => c.includes("bash -s -- take ")),
    /-- take agent-skills-test-\S+ \S+ 8 \S+$/,
  );
});

test("the lock is released on a failing run, on a timeout and on Ctrl-C, and the exit status is the run's", (t) => {
  for (const status of ["1", "124"]) {
    const r = run(t, [], { STUB_RUN_STATUS: status });
    assert.equal(r.status, Number(status));
    assert.equal(sshCalls(r, "release").length, 1, `status ${status}`);
  }
  const sig = run(t, [], { STUB_SIGINT: "1" });
  assert.equal(sig.status, 130, sig.stderr);
  assert.equal(sshCalls(sig, "release").length, 1, "released on Ctrl-C");
  assert.ok(
    sig.calls.some((c) => c.includes("docker kill agent-skills-test-")),
    "the merged trap still kills the named container",
  );
});

test("the exclude file is still removed on the Ctrl-C path (the traps were merged, not replaced)", (t) => {
  const stubs = makeStubs(t);
  const kept = path.join(stubs.dir, "exclude-path");
  fs.writeFileSync(
    path.join(stubs.dir, "rsync"),
    `#!/usr/bin/env bash
printf 'rsync %s\\n' "$*" >>"${stubs.log}"
for a in "$@"; do case "$a" in --exclude-from=*) printf '%s' "\${a#--exclude-from=}" >"${kept}" ;; esac; done
exit 0
`,
    { mode: 0o755 },
  );
  const res = spawnSync("bash", [RUNNER], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: budget.timeoutMs,
    env: {
      ...baseEnv(),
      PATH: `${stubs.dir}:${process.env.PATH}`,
      STUB_SIGINT: "1",
    },
  });
  assert.equal(res.status, 130, res.stderr);
  const excludes = fs.readFileSync(kept, "utf8");
  assert.ok(excludes.length > 0);
  assert.ok(!fs.existsSync(excludes), "the exclude file must be gone");
});

test("a failed release warns, names the lock and --unlock, and leaves the run's exit status alone", (t) => {
  const green = run(t, [], { STUB_RELEASE_STATUS: "1" });
  assert.equal(green.status, 0, "a leaked lock must not turn a green run red");
  assert.match(
    green.stderr,
    /could not release the lock ~\/agent-skills-test-/,
  );
  assert.match(green.stderr, /--unlock/);
  const red = run(t, [], { STUB_RELEASE_STATUS: "1", STUB_RUN_STATUS: "3" });
  assert.equal(red.status, 3);
  assert.match(red.stderr, /could not release the lock/);
});

test("a container left behind stops the run before it takes any lock", (t) => {
  const r = run(t, [], { STUB_CONTAINER: "abc123" });
  assert.equal(r.status, 1);
  assert.equal(sshCalls(r, "take").length, 0);
  assert.equal(sshCalls(r, "release").length, 0);
});

test("--help prints the whole header, including the new options", (t) => {
  const r = run(t, ["--help"]);
  assert.equal(r.status, 0);
  assert.deepEqual(r.calls, []);
  for (const needle of [
    "--unlock",
    "--prune-images",
    "--reap DAYS",
    "TEST_REMOTE_LOCK_MARGIN_MIN",
  ]) {
    assert.ok(r.stdout.includes(needle), `--help must name ${needle}`);
  }
  assert.match(r.stdout, /STATUS is captured on the line after the ssh call/);
  assert.doesNotMatch(r.stdout, /set -uo pipefail/);
});

test("--unlock and --prune-images stand alone, and --reap with --run is as it was", (t) => {
  for (const args of [
    ["--unlock", "--prune-images"],
    ["--unlock", "--reap", "3"],
    ["--prune-images", "--reap", "3"],
    ["--unlock", "--run", "ci:fast"],
    ["--prune-images", "--run", "ci:fast"],
  ]) {
    const r = run(t, args);
    assert.equal(r.status, 2, args.join(" "));
    assert.deepEqual(r.calls, [], `no ssh for ${args.join(" ")}`);
  }
  const reap = run(t, ["--reap", "3", "--run", "ci:fast"]);
  assert.equal(reap.status, 0, reap.stderr);
  assert.ok(reap.calls.some((c) => c.includes("bash -s")));
  const bad = run(t, [], { TEST_REMOTE_LOCK_MARGIN_MIN: "abc" });
  assert.equal(bad.status, 2);
  assert.deepEqual(bad.calls, []);
});

test("--unlock sends one unlock with the margin, passes lockctl's status through, and never syncs", (t) => {
  const r = run(t, ["--unlock"], { TEST_REMOTE_LOCK_MARGIN_MIN: "3" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    sshCalls(r, "unlock")[0],
    /unlock agent-skills-test-\S+ 3$/,
    "the margin reaches the server",
  );
  assert.ok(!r.calls.some((c) => c.startsWith("rsync")));
  assert.equal(sshCalls(r, "take").length, 0);
  const live = run(t, ["--unlock"], { STUB_UNLOCK_STATUS: "32" });
  assert.equal(live.status, 32);
  assert.match(live.stderr, /not removed/);
  const none = run(t, ["--unlock"], { STUB_UNLOCK_STATUS: "30" });
  assert.equal(none.status, 30);
});

test("--prune-images sends the current Dockerfile's tag, passes the status through, and never syncs or locks", (t) => {
  const r = run(t, ["--prune-images"]);
  assert.equal(r.status, 0, r.stderr);
  const dockerfile = fs.readFileSync(
    path.join(REPO_ROOT, "scripts", "remote-test", "Dockerfile"),
  );
  const tag = require("crypto")
    .createHash("sha256")
    .update(dockerfile)
    .digest("hex")
    .slice(0, 12);
  assert.ok(
    sshCalls(r, "prune")[0].endsWith(`prune agent-skills-test:${tag}`),
    sshCalls(r, "prune")[0],
  );
  assert.ok(!r.calls.some((c) => c.startsWith("rsync")));
  assert.equal(sshCalls(r, "take").length, 0);
  const refused = run(t, ["--prune-images"], { STUB_PRUNE_STATUS: "40" });
  assert.equal(refused.status, 40);
});

test("--reap never removes a *.lock directory", (t) => {
  const r = run(t, ["--reap", "3"]);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "remote-runner-home-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const old = new Date(Date.now() - 40 * 86400 * 1000);
  for (const d of ["agent-skills-test-stale", "agent-skills-test-stale.lock"]) {
    fs.mkdirSync(path.join(home, d));
    fs.utimesSync(path.join(home, d), old, old);
  }
  fs.writeFileSync(
    path.join(r.stubDir, "docker"),
    "#!/usr/bin/env bash\nexit 0\n",
    { mode: 0o755 },
  );
  const res = spawnSync("bash", [path.join(r.stubDir, "reap.sh"), "3"], {
    encoding: "utf8",
    timeout: budget.timeoutMs,
    env: {
      ...process.env,
      HOME: home,
      PATH: `${r.stubDir}:${process.env.PATH}`,
    },
  });
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(fs.readdirSync(home), ["agent-skills-test-stale.lock"]);
});

// --- lockctl.sh itself, run for real against a temp HOME and a fake docker ----------------------

const RD = "agent-skills-test-feature-x-abcd1234";

function makeCtl(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "remote-lockctl-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const home = path.join(dir, "home");
  const bin = path.join(dir, "bin");
  fs.mkdirSync(home);
  fs.mkdirSync(bin);
  const dlog = path.join(dir, "docker.log");
  fs.writeFileSync(dlog, "");
  fs.writeFileSync(
    path.join(bin, "docker"),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >>"$FAKE_DOCKER_LOG"
case "$1" in
  ps)
    [ "\${FAKE_PS_FAIL:-}" = "1" ] && exit 1
    if [ "$2" = "-a" ]; then printf '%s' "\${FAKE_CONTAINER:-}"; else printf '%s\\n' "\${FAKE_RUNNING_IMAGES:-}"; fi
    exit 0 ;;
  images) [ "\${FAKE_IMAGES_FAIL:-}" = "1" ] && exit 1; printf '%s\\n' "\${FAKE_IMAGES:-}"; exit 0 ;;
  rmi) [ "\${FAKE_RMI_FAIL:-}" = "$2" ] && exit 1; exit 0 ;;
esac
exit 0
`,
    { mode: 0o755 },
  );
  const ctl = (args, env = {}) =>
    spawnSync("bash", [LOCKCTL, ...args], {
      encoding: "utf8",
      timeout: budget.timeoutMs,
      env: {
        ...baseEnv(),
        HOME: home,
        PATH: `${bin}:${process.env.PATH}`,
        FAKE_DOCKER_LOG: dlog,
        ...env,
      },
    });
  const lockDir = path.join(home, `${RD}.lock`);
  const dockerCalls = () =>
    fs.readFileSync(dlog, "utf8").split("\n").filter(Boolean);
  const writeOwner = (fields) => {
    fs.mkdirSync(lockDir, { recursive: true });
    fs.writeFileSync(
      path.join(lockDir, "owner"),
      Object.entries(fields)
        .map(([k, v]) => `${k}=${v}\n`)
        .join(""),
    );
  };
  return { home, ctl, lockDir, dockerCalls, writeOwner };
}

const nowS = () => Math.floor(Date.now() / 1000);

test("lockctl take writes the owner (server clock, own timeout, token) and a second take is held", (t) => {
  const c = makeCtl(t);
  const before = nowS();
  const first = c.ctl(["take", RD, "tok-1", "30", "laptop pid 7"]);
  assert.equal(first.status, 0, first.stderr);
  assert.ok(fs.existsSync(path.join(c.home, RD)), "the run directory exists");
  const owner = fs.readFileSync(path.join(c.lockDir, "owner"), "utf8");
  assert.match(owner, /^timeout_min=30$/m);
  assert.match(owner, /^token=tok-1$/m);
  assert.match(owner, /^owner=laptop pid 7$/m);
  const start = Number(owner.match(/^start=(\d+)$/m)[1]);
  assert.ok(
    start >= before && start <= nowS() + 1,
    "start is the server's now",
  );
  const second = c.ctl(["take", RD, "tok-2", "30", "other pid 8"]);
  assert.equal(second.status, 10);
  assert.match(second.stdout, /^owner=laptop pid 7$/m);
  assert.match(second.stdout, /^age_s=\d+$/m);
  assert.match(second.stdout, /^state=live$/m);
  assert.match(
    fs.readFileSync(path.join(c.lockDir, "owner"), "utf8"),
    /token=tok-1/,
    "the holder's owner file is untouched",
  );
});

test("lockctl take is atomic: of eight simultaneous takes exactly one wins", (t) => {
  const c = makeCtl(t);
  const out = path.join(c.home, "..", "statuses");
  const script = `for i in 1 2 3 4 5 6 7 8; do (bash "${LOCKCTL}" take ${RD} tok$i 30 d$i >/dev/null 2>&1; echo $? >>"${out}") & done; wait`;
  const res = spawnSync("bash", ["-c", script], {
    encoding: "utf8",
    timeout: budget.timeoutMs,
    env: { ...baseEnv(), HOME: c.home, PATH: process.env.PATH },
  });
  assert.equal(res.status, 0, res.stderr);
  const statuses = fs.readFileSync(out, "utf8").trim().split("\n").sort();
  assert.deepEqual(statuses, ["0", "10", "10", "10", "10", "10", "10", "10"]);
});

test("lockctl refuses a run directory name it did not make, and writes nothing", (t) => {
  const c = makeCtl(t);
  for (const bad of [
    "../evil",
    "agent-skills-test-",
    "agent-skills-test-x/../y",
    "x",
  ]) {
    const r = c.ctl(["take", bad, "tok", "30", "d"]);
    assert.equal(r.status, 2, bad);
  }
  assert.deepEqual(fs.readdirSync(c.home), []);
});

test("lockctl release removes the lock only for the owner's token", (t) => {
  const c = makeCtl(t);
  assert.equal(c.ctl(["take", RD, "tok-1", "30", "d"]).status, 0);
  const wrong = c.ctl(["release", RD, "someone-else"]);
  assert.equal(wrong.status, 20);
  assert.ok(
    fs.existsSync(c.lockDir),
    "another owner's release leaves the lock",
  );
  assert.equal(c.ctl(["release", RD, "tok-1"]).status, 0);
  assert.ok(!fs.existsSync(c.lockDir));
  assert.equal(
    c.ctl(["release", RD, "tok-1"]).status,
    0,
    "already gone is fine",
  );
});

test("lockctl unlock removes only a stale lock: it judges by the owner's own timeout, the server clock and the container", (t) => {
  const c = makeCtl(t);
  const minutesAgo = (m) => nowS() - m * 60;
  // Owner's timeout 60m, started 50m ago, margin 5: 55m window not yet passed -> live.
  c.writeOwner({
    start: minutesAgo(50),
    timeout_min: 60,
    token: "t",
    owner: "o",
  });
  const live = c.ctl(["unlock", RD, "5"]);
  assert.equal(live.status, 32, live.stdout);
  assert.match(live.stdout, /state=live/);
  assert.ok(fs.existsSync(c.lockDir), "a live lock is not removed");
  // Same start, owner's timeout 30m: 35m window passed -> stale, removed, owner printed.
  c.writeOwner({
    start: minutesAgo(50),
    timeout_min: 30,
    token: "t",
    owner: "crashed pid 4",
  });
  const stale = c.ctl(["unlock", RD, "5"]);
  assert.equal(stale.status, 0, stale.stdout + stale.stderr);
  assert.match(stale.stdout, /owner=crashed pid 4/);
  assert.match(stale.stdout, /removed the stale lock/);
  assert.ok(!fs.existsSync(c.lockDir));
  assert.equal(c.ctl(["unlock", RD, "5"]).status, 30, "nothing to unlock");
});

test("lockctl unlock counts the margin: a lock inside timeout plus margin is live, one past it is stale (T296-QA-2)", (t) => {
  const c = makeCtl(t);
  const minutesAgo = (m) => nowS() - m * 60;
  const owner = (m) =>
    c.writeOwner({
      start: minutesAgo(m),
      timeout_min: 30,
      token: "t",
      owner: "o",
    });
  // Window is 30 + 5 = 35 minutes. Without the margin 34 minutes would already be stale.
  owner(34);
  const inside = c.ctl(["unlock", RD, "5"]);
  assert.equal(inside.status, 32, inside.stdout);
  assert.match(inside.stdout, /state=live/);
  assert.ok(fs.existsSync(c.lockDir));
  // The same age with a smaller margin is stale: the margin is what moved the answer.
  const noMargin = c.ctl(["unlock", RD, "0"]);
  assert.equal(noMargin.status, 0, noMargin.stdout);
  assert.ok(!fs.existsSync(c.lockDir));
  // One minute past the window is stale.
  owner(36);
  const past = c.ctl(["unlock", RD, "5"]);
  assert.equal(past.status, 0, past.stdout);
  assert.match(past.stdout, /state=stale/);
});

test("lockctl never calls a lock stale while a container of the run's name exists, or when the owner or docker is unreadable", (t) => {
  const c = makeCtl(t);
  const old = {
    start: nowS() - 600 * 60,
    timeout_min: 1,
    token: "t",
    owner: "o",
  };
  c.writeOwner(old);
  const running = c.ctl(["unlock", RD, "0"], { FAKE_CONTAINER: "abc123" });
  assert.equal(running.status, 32);
  assert.ok(fs.existsSync(c.lockDir), "a container means a run is using it");
  const blind = c.ctl(["unlock", RD, "0"], { FAKE_PS_FAIL: "1" });
  assert.equal(blind.status, 32, "a failed docker call is not 'no container'");
  assert.ok(fs.existsSync(c.lockDir));
  fs.rmSync(path.join(c.lockDir, "owner"));
  const noOwner = c.ctl(["unlock", RD, "0"]);
  assert.equal(noOwner.status, 32, "a lock with no owner file is never stale");
  assert.match(noOwner.stdout, /state=unknown/);
  fs.writeFileSync(path.join(c.lockDir, "owner"), "start=abc\ntimeout_min=\n");
  assert.equal(
    c.ctl(["unlock", RD, "0"]).status,
    32,
    "garbled fields are never stale",
  );
  assert.ok(fs.existsSync(c.lockDir));
});

const IMAGES = [
  "agent-skills-test:aaaaaaaaaaaa",
  "agent-skills-test:bbbbbbbbbbbb",
  "agent-skills-test:cccccccccccc",
  "agent-skills-test:<none>",
].join("\n");

test("lockctl prune removes only old agent-skills-test tags, by explicit name, never forcing or pruning globally", (t) => {
  const c = makeCtl(t);
  const r = c.ctl(["prune", "agent-skills-test:cccccccccccc"], {
    FAKE_IMAGES: IMAGES,
    FAKE_RUNNING_IMAGES: "agent-skills-test:bbbbbbbbbbbb",
  });
  assert.equal(r.status, 0, r.stderr);
  const calls = c.dockerCalls();
  assert.deepEqual(
    calls.filter((x) => x.startsWith("rmi")),
    ["rmi agent-skills-test:aaaaaaaaaaaa"],
    "only the old, unused tag is removed",
  );
  assert.ok(
    calls.every((x) => !/prune|\s-f\b|--force/.test(x)),
    calls.join(" | "),
  );
  assert.match(r.stdout, /kept \(current\): agent-skills-test:cccccccccccc/);
  assert.match(r.stdout, /kept \(in use\): agent-skills-test:bbbbbbbbbbbb/);
  assert.match(r.stdout, /skipped \(untagged\)/);
});

test("lockctl prune removes nothing while any run holds a lock, or when docker cannot be read", (t) => {
  const c = makeCtl(t);
  const env = { FAKE_IMAGES: IMAGES };
  fs.mkdirSync(path.join(c.home, "agent-skills-test-other-1234abcd.lock"));
  const locked = c.ctl(["prune", "agent-skills-test:cccccccccccc"], env);
  assert.equal(locked.status, 40);
  assert.match(locked.stdout, /agent-skills-test-other-1234abcd\.lock/);
  fs.rmSync(path.join(c.home, "agent-skills-test-other-1234abcd.lock"), {
    recursive: true,
  });
  const noPs = c.ctl(["prune", "agent-skills-test:cccccccccccc"], {
    ...env,
    FAKE_PS_FAIL: "1",
  });
  assert.equal(noPs.status, 41);
  const noImages = c.ctl(["prune", "agent-skills-test:cccccccccccc"], {
    ...env,
    FAKE_IMAGES_FAIL: "1",
  });
  assert.equal(noImages.status, 41);
  assert.deepEqual(
    c.dockerCalls().filter((x) => x.startsWith("rmi")),
    [],
    "a refused prune removes nothing",
  );
  const fail = c.ctl(["prune", "agent-skills-test:cccccccccccc"], {
    ...env,
    FAKE_RMI_FAIL: "agent-skills-test:aaaaaaaaaaaa",
  });
  assert.equal(
    fail.status,
    42,
    "a tag that could not be removed is reported, not swallowed",
  );
  assert.match(fail.stderr, /could not remove: agent-skills-test:aaaaaaaaaaaa/);
});
