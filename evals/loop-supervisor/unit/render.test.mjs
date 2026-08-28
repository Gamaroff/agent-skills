/**
 * Unit tests for the loop-supervisor status renderer.
 *
 * Assertions are on CONTENT, never on layout. A test that fails when a column
 * gains a space is a test that gets deleted the first time someone widens a
 * column, and a deleted test covers nothing — so these check that a value is
 * present somewhere in the frame, not where it sits in it.
 *
 * Fixtures are inline objects. The three suites beside this one touch no files
 * on disk, and the renderer is a pure function precisely so it never needs to.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatDuration,
  formatAge,
  runState,
  normaliseRow,
  statusView,
  render,
  notificationText,
} from "../../../skills/loop-supervisor/references/render.js";

const NOW = Date.parse("2026-08-28T12:00:30Z");
const ALIVE = () => true;
const DEAD = () => false;

/** A heartbeat with every field `writeCurrent` actually writes. */
const current = () => ({
  schemaVersion: 1,
  runId: "2026-08-28T11-00-00",
  pid: 4242,
  adapter: "develop-next",
  pipelineStep: 5,
  branch: "feature/task.63.loop-supervisor-status-views",
  prUrl: "https://github.com/o/r/pull/277",
  totals: { iterations: 3, costUsd: 1.2345, turns: 87 },
  updatedAt: "2026-08-28T12:00:18Z",
  iteration: 4,
  phase: "running",
  itemId: "T63",
  sessionId: "s-1",
  logPath: ".claude/state/loop-supervisor/logs/latest/iter-004.txt",
});

/** The `spawned: true` ledger row — note the field is `turns`, not `numTurns`. */
const fullRow = (over = {}) => ({
  schemaVersion: 1,
  runId: "r",
  iteration: 1,
  at: "2026-08-28T11:10:00Z",
  outcome: "progress",
  reason: "merged + ticked",
  itemId: "T60",
  spawned: true,
  exitCode: 0,
  subtype: "success",
  durationMs: 252000,
  costUsd: 0.421,
  turns: 23,
  sessionId: "s-1",
  logPath: "logs/latest/iter-001.txt",
  ...over,
});

/**
 * The `spawned: false` PROBE-STOP row, written by the other appendLedger call
 * site when the probe returns anything but `selected`. It carries seven fewer
 * fields — and it is the normal last line of a healthy run.
 */
const probeRow = (over = {}) => ({
  schemaVersion: 1,
  runId: "r",
  iteration: 2,
  sessionId: "s-1",
  outcome: "done",
  reason: "roadmap-complete",
  probe: { status: "stop", reason: "roadmap-complete" },
  spawned: false,
  at: "2026-08-28T11:59:00Z",
  ...over,
});

const frame = (args) => render(args).join("\n");

// ── the three states ────────────────────────────────────────────────────────

test("state: run in flight — live pid renders as running with its live values", () => {
  const text = frame({
    current: current(),
    runs: [],
    nowMs: NOW,
    isAlive: ALIVE,
  });
  assert.equal(runState(current(), ALIVE), "running");
  assert.match(text, /running/);
  assert.doesNotMatch(text, /CRASHED/);
  for (const v of [
    "2026-08-28T11-00-00",
    "develop-next",
    "T63",
    "feature/task.63.loop-supervisor-status-views",
    "https://github.com/o/r/pull/277",
    "iter-004.txt",
  ]) {
    assert.ok(text.includes(v), `expected the frame to carry ${v}`);
  }
});

test("state: no run in flight — exits the normal way, not as an error", () => {
  const text = frame({ current: null, runs: [], nowMs: NOW, isAlive: ALIVE });
  assert.equal(runState(null, ALIVE), "no-run");
  assert.match(text, /no run in flight/);
  // The point of the state: it must not read as a failure.
  assert.doesNotMatch(text, /error|CRASHED|fail/i);
  assert.equal(
    statusView({ current: null, runs: [], nowMs: NOW, isAlive: ALIVE }).run,
    null,
  );
});

test("state: stale current.json with a dead pid is a crashed supervisor, never live data", () => {
  const text = frame({
    current: current(),
    runs: [],
    nowMs: NOW,
    isAlive: DEAD,
  });
  assert.equal(runState(current(), DEAD), "crashed");
  assert.match(text, /CRASHED/);
  assert.match(text, /not live data/);
  assert.match(text, /4242/); // names the dead pid
});

test("state: identical data renders running or crashed purely on liveness", () => {
  const args = { current: current(), runs: [], nowMs: NOW };
  assert.notEqual(
    frame({ ...args, isAlive: ALIVE }),
    frame({ ...args, isAlive: DEAD }),
  );
});

test("state: a heartbeat with no usable pid is crashed, not running", () => {
  assert.equal(runState({ runId: "x" }, ALIVE), "crashed");
});

test("state: an unreadable heartbeat is its own state, never 'no run in flight'", () => {
  const torn = { __unreadable: true };
  assert.equal(runState(torn, ALIVE), "unreadable");
  const text = frame({ current: torn, runs: [], nowMs: NOW, isAlive: ALIVE });
  assert.match(text, /UNREADABLE/);
  // The regression this guards: the reassuring answer at the moment it is least
  // deserved. A supervisor may well be running.
  //
  // Assert on the CLAIM, not the substring — the body deliberately contains the
  // phrase "no run in flight" while denying it, and a naive doesNotMatch would
  // fail on the very sentence that fixes the bug.
  assert.doesNotMatch(text.split("\n")[0], /no run in flight/);
  assert.doesNotMatch(text, /No supervisor is running/);
  assert.match(text, /NOT the same as no run in flight/);
});

test("state: unreadable exposes no run fields — there are none to trust", () => {
  const view = statusView({
    current: { __unreadable: true },
    runs: [],
    nowMs: NOW,
    isAlive: ALIVE,
  });
  assert.equal(view.state, "unreadable");
  assert.equal(view.run, null);
});

test("state: unreadable still shows the ledger, which is a separate file", () => {
  const text = frame({
    current: { __unreadable: true },
    runs: [fullRow()],
    nowMs: NOW,
    isAlive: ALIVE,
  });
  assert.match(text, /merged \+ ticked/);
});

test("state: all four states are distinct", () => {
  const seen = new Set([
    runState(null, ALIVE),
    runState({ __unreadable: true }, ALIVE),
    runState(current(), ALIVE),
    runState(current(), DEAD),
  ]);
  assert.deepEqual([...seen].sort(), [
    "crashed",
    "no-run",
    "running",
    "unreadable",
  ]);
});

// ── the two ledger row shapes ───────────────────────────────────────────────

test("ledger: the full row reads `turns`, not `numTurns`", () => {
  const row = normaliseRow(fullRow());
  assert.equal(row.turns, "23");
  // Guard the exact regression the task document carried: a renderer written
  // against `numTurns` produces this instead.
  assert.notEqual(row.turns, "undefined");
  assert.equal(
    normaliseRow(fullRow({ turns: undefined, numTurns: 23 })).turns,
    "—",
  );
});

test("ledger: a probe-stop row renders its outcome and reason, and — for the rest", () => {
  const row = normaliseRow(probeRow());
  assert.equal(row.outcome, "done");
  assert.equal(row.reason, "roadmap-complete");
  assert.equal(row.spawned, false);
  for (const absent of [row.duration, row.cost, row.turns, row.itemId]) {
    assert.equal(absent, "—");
  }
});

test("ledger: a mixed ledger renders both shapes with no undefined or NaN", () => {
  const text = frame({
    current: current(),
    runs: [fullRow(), probeRow()],
    nowMs: NOW,
    isAlive: ALIVE,
  });
  assert.match(text, /merged \+ ticked/);
  assert.match(text, /roadmap-complete/);
  assert.doesNotMatch(text, /undefined/);
  assert.doesNotMatch(text, /NaN/);
});

test("ledger: outcomes are tallied across every row shape", () => {
  const view = statusView({
    current: current(),
    runs: [
      fullRow(),
      fullRow({ iteration: 2, outcome: "idle" }),
      probeRow({ iteration: 3 }),
    ],
    nowMs: NOW,
    isAlive: ALIVE,
  });
  assert.equal(view.ledger.total, 3);
  assert.deepEqual(view.ledger.counts, { progress: 1, idle: 1, done: 1 });
});

test("ledger: empty ledger says so instead of drawing an empty table", () => {
  const text = frame({
    current: current(),
    runs: [],
    nowMs: NOW,
    isAlive: ALIVE,
  });
  assert.match(text, /empty/);
  assert.doesNotMatch(text, /undefined/);
});

test("ledger: only the last five iterations are shown, and they are the last five", () => {
  const runs = Array.from({ length: 9 }, (_, i) =>
    fullRow({ iteration: i + 1, reason: `iteration-${i + 1}` }),
  );
  const view = statusView({
    current: current(),
    runs,
    nowMs: NOW,
    isAlive: ALIVE,
  });
  assert.equal(view.ledger.total, 9);
  assert.equal(view.ledger.recent.length, 5);
  assert.deepEqual(
    view.ledger.recent.map((r) => r.iteration),
    [5, 6, 7, 8, 9],
  );
});

test("ledger: a malformed row degrades to dashes rather than throwing", () => {
  assert.doesNotThrow(() => normaliseRow(null));
  assert.equal(normaliseRow(null).outcome, "—");
  assert.doesNotThrow(() =>
    frame({
      current: current(),
      runs: [null, "nonsense", fullRow()],
      nowMs: NOW,
      isAlive: ALIVE,
    }),
  );
});

// ── --json emits the same data ──────────────────────────────────────────────

test("json: the model carries every field the text frame shows", () => {
  const view = statusView({
    current: current(),
    runs: [fullRow(), probeRow()],
    nowMs: NOW,
    isAlive: ALIVE,
  });
  assert.equal(view.state, "running");
  assert.equal(view.run.itemId, "T63");
  assert.equal(view.run.pipelineStep, 5);
  assert.equal(view.run.totals.turns, 87);
  assert.equal(view.ledger.recent.length, 2);
  // Machine-readable means round-trippable.
  assert.deepEqual(JSON.parse(JSON.stringify(view)), view);
});

test("json: the same model backs both modes, so they cannot disagree on state", () => {
  for (const [isAlive, state] of [
    [ALIVE, "running"],
    [DEAD, "crashed"],
  ]) {
    const args = { current: current(), runs: [fullRow()], nowMs: NOW, isAlive };
    assert.equal(statusView(args).state, state);
    assert.equal(render(args).length > 0, true);
  }
});

// ── formatting helpers ──────────────────────────────────────────────────────

test("formatDuration covers sub-second through hours, and refuses nonsense", () => {
  assert.equal(formatDuration(890), "890ms");
  assert.equal(formatDuration(45000), "45s");
  assert.equal(formatDuration(252000), "4m12s");
  assert.equal(formatDuration(7620000), "2h07m");
  for (const bad of [undefined, null, NaN, -1, "12"]) {
    assert.equal(formatDuration(bad), "—");
  }
});

test("formatAge is relative to the injected clock, never to the real one", () => {
  assert.equal(formatAge("2026-08-28T12:00:18Z", NOW), "12s ago");
  assert.equal(formatAge("2026-08-28T12:00:30Z", NOW), "just now");
  assert.equal(formatAge(null, NOW), "—");
  assert.equal(formatAge("not-a-date", NOW), "—");
});

// ── notification text ───────────────────────────────────────────────────────

test("notification names the outcome and the reason, and distinguishes ok from stopped", () => {
  const good = notificationText({
    ok: true,
    outcome: "done",
    reason: "roadmap-complete",
    iterations: 7,
    costUsd: 3.5,
  });
  assert.match(good.title, /done/);
  assert.match(good.message, /roadmap-complete/);
  assert.match(good.message, /7 iterations/);
  assert.match(good.message, /\$3\.5000/);

  const bad = notificationText({
    ok: false,
    outcome: "halt",
    reason: "pipeline HALT at step 5",
    iterations: 1,
  });
  assert.match(bad.title, /STOPPED/);
  assert.match(bad.message, /1 iteration\b/); // singular, not "1 iterations"
});
