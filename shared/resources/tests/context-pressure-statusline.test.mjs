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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WRAPPER = path.join(HERE, "..", "context-pressure-statusline.sh");
const TMP = [];
after(() => TMP.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
function tmpdir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-wrap-"));
  TMP.push(d);
  return d;
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
  const state = path.join(tmpdir(), "s");
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
    { CONTEXT_PRESSURE_STATE_DIR: path.join(tmpdir(), "s") },
  );
  assert.equal(r.status, 0);
  assert.equal(r.stdout.toString("utf8"), "a;b\n5");
});

test("with no original command it records and prints nothing", () => {
  const state = path.join(tmpdir(), "s");
  const r = wrap([], { CONTEXT_PRESSURE_STATE_DIR: state });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.toString("utf8"), "");
  assert.ok(waitFor(path.join(state, "wrap-1.json")));
});
