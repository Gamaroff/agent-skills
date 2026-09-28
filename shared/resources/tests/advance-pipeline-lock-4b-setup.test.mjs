// Scenario 4b of advance-pipeline-lock.test.sh links the external commands the no-jq arms need into
// a PATH with no jq. Its `command -v` loop has three arms — missing, absolute, builtin — and the
// literal command list reaches only the absolute one, so the other two were proven by development
// mutations alone (task.163 M5, M6; SC5). This drives the file through its test-only seam,
// ADVANCE_LOCK_TEST_4B_CMDS, so each arm has a committed test (task 164).
//
// Each case runs the whole lock test file, zsh passes included: 13-16s each on a dev machine
// (task 164, measured with `time node --test` on this file), so the timeout is named and generous.
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
const TIMEOUT = 120_000;

function runLockTests(cmds) {
  const env = { ...process.env };
  delete env[SEAM];
  if (cmds !== undefined) env[SEAM] = cmds;
  const r = spawnSync("bash", [SCRIPT], {
    cwd: path.dirname(SCRIPT),
    env,
    encoding: "utf8",
    timeout: TIMEOUT - 5_000,
  });
  return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

test(
  "4b: a command missing from PATH fails setup by name and skips the no-jq assertions",
  { timeout: TIMEOUT },
  () => {
    const { status, out } = runLockTests("rm dirname no-such-cmd-t164");
    assert.equal(status, 1, out.slice(-600));
    assert.match(out, /4b setup: 'no-such-cmd-t164' not found on PATH/);
    assert.doesNotMatch(
      out,
      /without jq/,
      "the no-jq assertions ran after setup failed",
    );
  },
);

test(
  "4b: a builtin is skipped, visibly, and setup does not fail",
  { timeout: TIMEOUT },
  () => {
    const { status, out } = runLockTests("rm dirname printf");
    assert.equal(status, 0, out.slice(-600));
    assert.match(out, /SKIP {2}4b: 'printf' is a builtin, not linked/);
    assert.doesNotMatch(out, /4b setup:/);
  },
);

// Risk 3: the seam must not leak. The variable is deleted from the child's environment, so a value
// exported in the developer's shell cannot reach this case, and an unset seam must give `rm dirname`.
test(
  "4b: with the seam unset, the default list runs both no-jq assertions",
  { timeout: TIMEOUT },
  () => {
    const { status, out } = runLockTests(undefined);
    assert.equal(status, 0, out.slice(-600));
    assert.match(
      out,
      /PASS {2}without jq, commit-changes at step 8 leaves the lock/,
    );
    assert.match(out, /PASS {2}without jq, --complete removes the lock/);
    assert.doesNotMatch(out, /4b setup:|SKIP {2}4b:/);
  },
);
