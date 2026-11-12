// step-1-paused-lock.test.mjs — the Step 1 lock-collision block holds the PreCompact "paused
// lock" rules (task.301, obs #258).
//
// Since 2026-11 the PreCompact hook keeps the pipeline lock and marks it `paused` instead of
// removing it, so a paused run of ANOTHER item now blocks a new run, and "Start fresh" on the
// SAME item must remove the lock and its pause snapshot. Before task.301 the "another document"
// HALT was a sentence no test could run. The block is now executable (it exits 1 on a
// collision); this test extracts it with the repository's own fence reader and runs it.
//
// Each case is the smallest claim whose reverse turns it red:
//   A — another document's PAUSED lock: exit 1, both the resume and the abandon command printed,
//       and the lock left in place;
//   B — the same document, "Start fresh": exit 0, the lock removed, and the snapshot removed only
//       when its pause_reason is `precompact` (a halt snapshot with another reason is kept);
//   C — an UNPAUSED lock for another document still exits 1 and names no resume command;
//   D — the same document's paused lock WITHOUT "Start fresh" still collides (the operator's
//       choice is what lets it go, not the document match alone);
//   E — a stale lock (its branch is gone) is removed and the run proceeds.
// The non-vacuity guard asserts the block was found and carries the three behaviours.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../qa-execute-snippets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const STEP1 = path.join(
  ROOT,
  "shared",
  "resources",
  "develop-pipeline-step-1-create-branch.md",
);

const MD = fs.readFileSync(STEP1, "utf8");
const BLOCKS = extractBlocks(MD).filter((b) =>
  /Pipeline lock collision/.test(b.code),
);
const BLOCK = BLOCKS[0]?.code ?? "";

const MINE = "docs/tasks/task.301.x";
const OTHER = "docs/tasks/task.42.other";

/** A temp git repo with branch `feature/x`, a lock and optionally a snapshot; runs the block. */
function run({ lock, snapshot, startFresh = "no", docDir = MINE }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "step1-paused-"));
  try {
    const git = (...a) =>
      spawnSync("git", ["-C", dir, ...a], { encoding: "utf8" });
    git("init", "-q", "-b", "develop");
    git(
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@t",
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      "i",
    );
    git("branch", "feature/x");
    fs.mkdirSync(path.join(dir, ".claude", "state"), { recursive: true });
    const lockPath = path.join(
      dir,
      ".claude",
      "state",
      "develop-pipeline.lock",
    );
    const snapPath = path.join(
      dir,
      ".claude",
      "state",
      "develop-pipeline.last-halt.json",
    );
    if (lock) fs.writeFileSync(lockPath, JSON.stringify(lock));
    if (snapshot) fs.writeFileSync(snapPath, JSON.stringify(snapshot));
    // replaceAll: the placeholders also appear in the block's own INPUTS comment, and a first-match
    // replace would substitute the comment and leave the assignment unbound.
    const script = BLOCK.replaceAll("{doc-directory}", docDir).replaceAll(
      "{start-fresh}",
      startFresh,
    );
    const r = spawnSync("bash", ["-c", script], { cwd: dir, encoding: "utf8" });
    return {
      status: r.status,
      out: `${r.stdout}${r.stderr}`,
      lockKept: fs.existsSync(lockPath),
      snapKept: fs.existsSync(snapPath),
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const paused = (dir, extra = {}) => ({
  skill: "develop-story",
  task_or_story_directory: dir,
  branch: "feature/x",
  current_step: 5,
  paused: { at: "2026-11-12T00:00:00Z", step: 5, reason: "precompact" },
  ...extra,
});

test("non-vacuity: the collision block was found and carries the three behaviours", () => {
  assert.equal(
    BLOCKS.length,
    1,
    `expected one collision block, found ${BLOCKS.length}`,
  );
  assert.match(BLOCK, /exit 1/, "the block is the HALT: it must exit 1");
  assert.match(BLOCK, /Resume it:/, "the block must print the resume command");
  assert.match(
    BLOCK,
    /Abandon it:/,
    "the block must print the abandon command",
  );
  assert.match(
    BLOCK,
    /pause_reason == "precompact"/,
    "the snapshot removal is keyed on its reason",
  );
});

test("A: another document's paused lock exits 1 and prints both commands; the lock stays", () => {
  const r = run({ lock: paused(OTHER) });
  assert.equal(r.status, 1, r.out);
  assert.match(
    r.out,
    new RegExp(`Resume it:\\s+/develop-story ${OTHER}`),
    r.out,
  );
  assert.match(
    r.out,
    /Abandon it:\s+rm -f \.claude\/state\/develop-pipeline\.lock/,
    r.out,
  );
  assert.equal(r.lockKept, true);
});

test("A2: Start fresh on THIS document never releases another document's paused lock", () => {
  const r = run({
    lock: paused(OTHER),
    snapshot: { pause_reason: "precompact" },
    startFresh: "yes",
  });
  assert.equal(r.status, 1, r.out);
  assert.equal(r.lockKept, true, "the other run's lock must survive");
  assert.equal(r.snapKept, true, "the other run's snapshot must survive");
});

test("B: the same document with Start fresh removes the lock and a precompact snapshot", () => {
  const r = run({
    lock: paused(MINE),
    snapshot: { pause_reason: "precompact", halt_step: 5 },
    startFresh: "yes",
  });
  assert.equal(r.status, 0, r.out);
  assert.equal(r.lockKept, false, "lock should be removed");
  assert.equal(r.snapKept, false, "a precompact snapshot should be removed");
});

test("B2: Start fresh keeps a halt snapshot whose pause_reason is not precompact", () => {
  const r = run({
    lock: paused(MINE),
    snapshot: { halt_reason: "loop-limit", halt_step: "5" },
    startFresh: "yes",
  });
  assert.equal(r.status, 0, r.out);
  assert.equal(r.lockKept, false);
  assert.equal(
    r.snapKept,
    true,
    "only a precompact pause snapshot is consumed",
  );
});

test("C: an unpaused lock for another document still exits 1 and names no resume command", () => {
  const lock = paused(OTHER);
  delete lock.paused;
  const r = run({ lock });
  assert.equal(r.status, 1, r.out);
  assert.doesNotMatch(r.out, /Resume it:/, r.out);
  assert.equal(r.lockKept, true);
});

test("D: the same document's paused lock without Start fresh still collides", () => {
  const r = run({ lock: paused(MINE), startFresh: "no" });
  assert.equal(r.status, 1, r.out);
  assert.equal(r.lockKept, true);
});

test("E: a stale lock (its branch is gone) is removed and the run proceeds", () => {
  const r = run({ lock: paused(OTHER, { branch: "feature/gone" }) });
  assert.equal(r.status, 0, r.out);
  assert.equal(r.lockKept, false);
});
