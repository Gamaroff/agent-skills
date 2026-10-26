// Scenario 4b of advance-pipeline-lock.test.sh links the external commands the no-jq arms need into
// a PATH with no jq. Its `command -v` loop has three arms — missing, absolute, builtin — and the
// literal command list reaches only the absolute one, so the other two were proven by development
// mutations alone (task.163 M5, M6; SC5). This drives the file through its test-only seam,
// ADVANCE_LOCK_TEST_4B_CMDS, so each arm has a committed test (task 164).
//
// Each case sets a second seam, ADVANCE_LOCK_TEST_4B_ONLY, which stops the file after scenario 4b:
// running the whole file, zsh passes included, three times per `npm test` reached a ten-line setup
// loop (task 165). Every case requires the file's `4b-only` NOTE, so an early exit that stopped
// firing shows here rather than as a slower suite. The limit is spawnSync's own timeout:
// spawnSync blocks the event loop, so a node:test `{ timeout }` could never fire while it runs.
// When the limit kills the child, status is null, so the child's signal and any spawn error are
// carried into every assertion message — a timeout must not read as a bare "null !== 0" (QA-164-4).
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT } from "./lib/executed-prose.mjs";

const SCRIPT = path.join(
  ROOT,
  "shared/resources/advance-pipeline-lock.test.sh",
);
const SEAM = "ADVANCE_LOCK_TEST_4B_CMDS";
const ONLY = "ADVANCE_LOCK_TEST_4B_ONLY";
const ONLY_NOTE = /NOTE {2}4b-only: ADVANCE_LOCK_TEST_4B_ONLY is set/;
const SPAWN_TIMEOUT = 115_000;

function runLockTests(cmds) {
  const env = { ...process.env };
  delete env[SEAM];
  if (cmds !== undefined) env[SEAM] = cmds;
  env[ONLY] = "1";
  const r = spawnSync("bash", [SCRIPT], {
    cwd: path.dirname(SCRIPT),
    env,
    encoding: "utf8",
    timeout: SPAWN_TIMEOUT,
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const why = `status=${r.status} signal=${r.signal}${r.error ? ` error=${r.error.message}` : ""}`;
  return { status: r.status, out, why };
}

test("4b: a command missing from PATH fails setup by name and skips the no-jq assertions", () => {
  const { status, out, why } = runLockTests("rm dirname no-such-cmd-t164");
  assert.equal(status, 1, `${why}\n${out.slice(-600)}`);
  assert.match(out, /4b setup: 'no-such-cmd-t164' not found on PATH/, why);
  assert.doesNotMatch(
    out,
    /without jq/,
    `the no-jq assertions ran after setup failed (${why})`,
  );
  assert.match(out, /NOTE {2}4b: ADVANCE_LOCK_TEST_4B_CMDS is set/, why);
  assert.match(out, ONLY_NOTE, why);
});

test("4b: a builtin is skipped, visibly, and setup does not fail", () => {
  const { status, out, why } = runLockTests("rm dirname printf");
  assert.equal(status, 0, `${why}\n${out.slice(-600)}`);
  assert.match(out, /SKIP {2}4b: 'printf' is a builtin, not linked/, why);
  assert.doesNotMatch(out, /4b setup:/, why);
  assert.match(out, /NOTE {2}4b: ADVANCE_LOCK_TEST_4B_CMDS is set/, why);
  assert.match(out, ONLY_NOTE, why);
});

// Risk 3: the seam must not leak. The variable is deleted from the child's environment, so a value
// exported in the developer's shell cannot reach this case, and an unset seam must give `rm dirname`
// with no 4b NOTE line. The two cases above set it and require the NOTE, which is what makes a leaked
// value visible in the direct `npm test` run of the lock test file (QA-164-9). Only the command-list
// seam is unset here: the early exit is still set, and its NOTE proves it fired (task 165).
test("4b: with the seam unset, the default list runs both no-jq assertions", () => {
  const { status, out, why } = runLockTests(undefined);
  assert.equal(status, 0, `${why}\n${out.slice(-600)}`);
  assert.match(
    out,
    /PASS {2}without jq, commit-changes at step 8 leaves the lock/,
    why,
  );
  assert.match(out, /PASS {2}without jq, --complete removes the lock/, why);
  assert.doesNotMatch(out, /4b setup:|SKIP {2}4b:|NOTE {2}4b:/, why);
  assert.match(out, ONLY_NOTE, why);
});
