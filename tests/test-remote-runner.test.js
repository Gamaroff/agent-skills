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
  *"bash -s"*) cat >"${dir}/reap.sh"; exit 0 ;;
  *"docker ps -a"*) [ "\${STUB_CHECK_FAIL:-}" = "1" ] && exit 255; [ -n "\${STUB_CONTAINER:-}" ] && echo "\${STUB_CONTAINER}"; exit 0 ;;
  *"touch "*"docker image inspect"*) [ "\${STUB_TOUCH_FAIL:-}" = "1" ] && exit 1; exit 0 ;;
  *"docker version"*) [ "\${STUB_PROBE_FAIL:-}" = "1" ] && exit 255; exit 0 ;;
  *container.sh*) exit "\${STUB_RUN_STATUS:-0}" ;;
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
