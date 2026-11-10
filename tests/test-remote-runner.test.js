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

function run(t, args, env = {}) {
  const stubs = makeStubs(t);
  const res = spawnSync("bash", [RUNNER, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, PATH: `${stubs.dir}:${process.env.PATH}`, ...env },
  });
  const calls = fs.readFileSync(stubs.log, "utf8").split("\n").filter(Boolean);
  return { ...res, calls };
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
