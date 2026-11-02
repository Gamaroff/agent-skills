/**
 * Guards the `concurrency` block of the changes-job.yml snippet beside this file (agent-skills
 * task.174, TASK-174-QA-1, QA-3, QA-5).
 *
 * The classifier's push path skips a docs-only `before..after` diff without asking whether `before`
 * went green. A snippet that set `cancel-in-progress: true` for every event let a docs-only merge
 * cancel a code merge's base-branch run and then skip its own.
 *
 * GitHub Actions expressions cannot be executed here, so the block is read as text, and it is
 * PINNED, not pattern-matched. A substring check passed `github.ref_name` (QA cycle 2, CR-1); the
 * only reliable statement of "the intended group" is the intended group, byte for byte. The pinned
 * values below are the one definition; changing the snippet means changing them here, on purpose.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SNIPPET = path.join(__dirname, "changes-job.yml");

const EXPECTED = {
  // Per workflow (groups are repository-wide); per PR for pull_request; per run otherwise.
  group:
    "${{ github.workflow }}-${{ github.event.pull_request.number && format('pr-{0}', github.event.pull_request.number) || github.run_id }}",
  "cancel-in-progress": "${{ github.event_name == 'pull_request' }}",
};

/** Every `concurrency:` key in the file, at any indent, with its 1-based line number. */
function concurrencyKeys(lines) {
  return lines
    .map((l, i) => ({ l, n: i + 1 }))
    .filter(({ l }) => /^\s*concurrency\s*:/.test(l));
}

/** The top-level block's lines: every line after `concurrency:` until the next top-level line. */
function blockLines(lines, start) {
  const out = [];
  for (const line of lines.slice(start)) {
    if (/^\S/.test(line)) break;
    if (line.trim() === "") continue;
    out.push(line);
  }
  return out;
}

test("exactly one concurrency block, at the top level", () => {
  const keys = concurrencyKeys(fs.readFileSync(SNIPPET, "utf8").split("\n"));
  assert.equal(
    keys.length,
    1,
    `expected one concurrency key, found ${keys.map((k) => k.n).join(", ")}`,
  );
  assert.match(keys[0].l, /^concurrency:\s*$/, "concurrency must be top-level");
});

test("the block is exactly the pinned group and cancel-in-progress", () => {
  const lines = fs.readFileSync(SNIPPET, "utf8").split("\n");
  const [{ n }] = concurrencyKeys(lines);
  const got = blockLines(lines, n).map((l) => l.trim());
  // Whole lines, compared exactly: a trailing comment, an extra key or a variant expression fails.
  assert.deepEqual(got, [
    `group: ${EXPECTED.group}`,
    `cancel-in-progress: ${EXPECTED["cancel-in-progress"]}`,
  ]);
});
