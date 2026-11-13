// Run: command node --test shared/resources/tests/context-pressure-statusline.test.mjs
//
// task.157 — the status-line wrapper must be invisible: the original's stdout and exit code are
// the wrapper's own, byte for byte, whether or not the recorder can run.

import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createTmpTracker } from "./lib/tmp-state-cleanup.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WRAPPER = path.join(HERE, "..", "context-pressure-statusline.sh");
// The wrapper starts its recorder in the background and does not wait for it, and the recorder
// recreates a missing state directory (task.291). So every state directory comes from stateDir(),
// and the `after` hook waits for each recorder's file before it removes anything.
const tracker = createTmpTracker({ prefix: "ctx-wrap-" });
after(() => tracker.cleanup());
function stateDir() {
  const state = path.join(tracker.tmpdir(), "s");
  tracker.expectRecord(path.join(state, "wrap-1.json"));
  return state;
}

// Trailing newlines and a quote on purpose: $(cat) would strip the first, a careless echo the second.
const INPUT =
  JSON.stringify({
    session_id: "wrap-1",
    context_window: { used_percentage: 71, context_window_size: 200000 },
  }) + "\n\n";

function wrap(args, env = {}) {
  return spawnSync("sh", [WRAPPER, ...args], {
    input: INPUT,
    env: { ...process.env, ...env },
  });
}

function waitFor(file, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fs.existsSync(file)) return true;
    spawnSync("sleep", ["0.05"]);
  }
  return false;
}

test("stdout is byte-identical to the original's, its exit code is the wrapper's, and the reading is recorded", () => {
  const state = stateDir();
  const r = wrap(["--", "sh", "-c", "cat; exit 3"], {
    CONTEXT_PRESSURE_STATE_DIR: state,
  });
  assert.equal(r.status, 3);
  assert.equal(r.stdout.toString("utf8"), INPUT);
  const file = path.join(state, "wrap-1.json");
  assert.ok(waitFor(file), "state file written by the background recorder");
  assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).pct, 71);
});

test("a broken engine path still runs the original unchanged", () => {
  const r = wrap(["--", "sh", "-c", "cat; exit 0"], {
    CONTEXT_PRESSURE_ENGINE: "/nonexistent/context-pressure.mjs",
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.toString("utf8"), INPUT);
  assert.equal(r.stderr.toString("utf8"), "");
});

test("no node on PATH still runs the original unchanged", (t) => {
  // A PATH with the system tools and without node. Skip where the system ships node in /usr/bin.
  const PATH = "/usr/bin:/bin";
  if (
    spawnSync("/bin/sh", ["-c", "command -v node"], { env: { PATH } })
      .status === 0
  )
    return t.skip("node is in /usr/bin");
  const r = spawnSync(
    "/bin/sh",
    [WRAPPER, "--", "/bin/sh", "-c", "cat; exit 4"],
    { input: INPUT, env: { PATH, HOME: os.homedir() } },
  );
  assert.equal(r.status, 4);
  assert.equal(r.stdout.toString("utf8"), INPUT);
});

test("an original holding shell metacharacters runs as one command", () => {
  const r = wrap(
    [
      "--",
      "sh",
      "-c",
      "cat >/dev/null; echo 'a;b' && printf '%s' \"$((2+3))\"",
    ],
    { CONTEXT_PRESSURE_STATE_DIR: stateDir() },
  );
  assert.equal(r.status, 0);
  assert.equal(r.stdout.toString("utf8"), "a;b\n5");
});

test("with no original command it records and prints nothing", () => {
  const state = stateDir();
  const r = wrap([], { CONTEXT_PRESSURE_STATE_DIR: state });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.toString("utf8"), "");
  assert.ok(waitFor(path.join(state, "wrap-1.json")));
});

// task.291 — the regression: a recorder that is still running when the cleanup runs must not leave
// a directory behind. The stand-in sleeps (the real one is fast, which is why the leak was 1 run in
// 100), then does what the real one does: mkdir -p the state directory, write the file. It marks its
// own end in `base`, outside the tracked directories, so the test can wait for the recorder rather
// than for a fixed grace period. With the wait removed from `cleanup`, the directory is removed
// first and the recorder recreates it: this test is red.
test("no ctx-wrap- directory survives a slow recorder", async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-wrap-regress-"));
  try {
    const engine = path.join(base, "slow-engine.mjs");
    const done = path.join(base, "engine.done");
    fs.writeFileSync(
      engine,
      [
        'import fs from "node:fs";',
        'import path from "node:path";',
        "await new Promise((r) => setTimeout(r, 150));",
        "const dir = process.env.CONTEXT_PRESSURE_STATE_DIR;",
        "fs.mkdirSync(dir, { recursive: true });",
        'fs.writeFileSync(path.join(dir, "wrap-1.json"), "{}");',
        `fs.writeFileSync(${JSON.stringify(done)}, "");`,
        "",
      ].join("\n"),
    );
    const own = createTmpTracker({ prefix: "ctx-wrap-", base });
    const state = path.join(own.tmpdir(), "s");
    own.expectRecord(path.join(state, "wrap-1.json"));
    const r = wrap(["--", "sh", "-c", "cat >/dev/null"], {
      CONTEXT_PRESSURE_ENGINE: engine,
      CONTEXT_PRESSURE_STATE_DIR: state,
    });
    assert.equal(r.status, 0);
    await own.cleanup();
    assert.ok(waitFor(done), "the stand-in recorder ran to its end");
    assert.deepEqual(
      fs.readdirSync(base).filter((n) => n.startsWith("ctx-wrap-")),
      [],
      "the recorder recreated a directory the cleanup had removed",
    );
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
