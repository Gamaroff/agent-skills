/**
 * Guards the `concurrency` block of the changes-job.yml snippet beside this file (agent-skills
 * task.174, TASK-174-QA-1).
 *
 * The classifier's push path skips a docs-only `before..after` diff without asking whether `before`
 * went green. That is only safe while a run on the base branch always finishes. A snippet that set
 * `cancel-in-progress: true` for every event let a docs-only merge cancel a code merge's run and
 * then skip its own, so the code never got a full run on the base.
 *
 * GitHub Actions expressions cannot be executed here, so the block is read as text. What is held is
 * the shape, stated as the rule: cancellation is conditional on `pull_request`, PR runs share a
 * group per PR, and a push run's group is unique to the run.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SNIPPET = path.join(__dirname, "changes-job.yml");

/** The top-level `concurrency:` block's `key: value` lines, comments dropped. */
function concurrencyBlock(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^concurrency:\s*$/.test(l));
  assert.notEqual(
    start,
    -1,
    "changes-job.yml has no top-level concurrency: block",
  );
  const out = {};
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break; // next top-level key
    const m = line.match(/^\s+([a-z-]+):\s*(.+?)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

test("cancel-in-progress is conditional on pull_request, never a literal true", () => {
  const c = concurrencyBlock(fs.readFileSync(SNIPPET, "utf8"));
  assert.ok(
    "cancel-in-progress" in c,
    "concurrency: has no cancel-in-progress key",
  );
  assert.equal(
    c["cancel-in-progress"].replace(/\s+/g, " "),
    "${{ github.event_name == 'pull_request' }}",
  );
});

test("PR runs share a group per PR; a push run's group is its own", () => {
  const c = concurrencyBlock(fs.readFileSync(SNIPPET, "utf8"));
  assert.ok(c.group, "concurrency: has no group key");
  assert.match(c.group, /github\.event\.pull_request\.number/);
  assert.match(c.group, /github\.run_id/);
  // A ref-keyed group puts every push to the base branch in one group: with cancellation that
  // cancels base runs, and without it a newer queued run still drops the pending one.
  assert.doesNotMatch(c.group, /github\.ref\b/);
});
