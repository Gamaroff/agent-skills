/**
 * Layer-1 unit tests for the loop-supervisor outcome classifier.
 *
 * Every row of the outcome table in `.agents/plans/loop-supervisor.md` gets a
 * test, and the two traps that shape the table get tested on BOTH sides of
 * their boundary — a stale halt file and a fresh one, a leftover lock and a
 * clean tree. Those two are the reason this module exists as a separately
 * tested unit rather than as branches inside the loop.
 *
 * Run via: node --test evals/loop-supervisor/unit/classify.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classify,
  shouldStop,
  isHaltFresh,
  isChildError,
  OUTCOMES,
} from "../../../skills/loop-supervisor/references/classify.js";

const START = Date.parse("2026-08-28T12:00:00Z");
const BEFORE = "2026-08-28T11:00:00Z"; // older than START — stale
const AFTER = "2026-08-28T12:30:00Z"; // newer than START — fresh

/** A clean, spawned iteration that did everything right. Tests override fields. */
const base = (over) =>
  Object.assign(
    {
      probeStatus: "selected",
      spawned: true,
      stateFilePresent: false,
      lockPresent: false,
      lockCurrentStep: null,
      halt: null,
      iterationStartMs: START,
      exitCode: 0,
      subtype: "success",
      isError: false,
      progressed: true,
    },
    over || {},
  );

// ── outcome table, one test per row ──────────────────────────────────────────

test("progress: nothing left behind and the oracle fired", () => {
  const r = classify(base());
  assert.equal(r.outcome, "progress");
});

test("done: the probe returned stop, so nothing was spawned", () => {
  const r = classify(
    base({
      spawned: false,
      probeStatus: "stop",
      probeReason: "roadmap-complete",
    }),
  );
  assert.equal(r.outcome, "done");
  assert.match(r.reason, /roadmap-complete/);
});

test("halt: probe could not parse the roadmap", () => {
  const r = classify(
    base({
      spawned: false,
      probeStatus: "halt",
      probeReason: "unparseable row 12",
    }),
  );
  assert.equal(r.outcome, "halt");
});

test("halt: a halt file newer than iteration start", () => {
  const r = classify(
    base({
      halt: { halted_at: AFTER, halt_reason: "review NO-GO", halt_step: 2 },
    }),
  );
  assert.equal(r.outcome, "halt");
  assert.match(r.reason, /step 2/);
  assert.match(r.reason, /review NO-GO/);
});

test("incomplete: the run-state file is still on disk", () => {
  const r = classify(base({ stateFilePresent: true, progressed: false }));
  assert.equal(r.outcome, "incomplete");
});

test("error: non-zero child exit", () => {
  const r = classify(base({ exitCode: 1, progressed: false }));
  assert.equal(r.outcome, "error");
  assert.match(r.reason, /exit 1/);
});

test("error: is_error in the result envelope, despite exit 0", () => {
  const r = classify(base({ exitCode: 0, isError: true, progressed: false }));
  assert.equal(r.outcome, "error");
});

test("error: error_max_turns subtype, despite exit 0", () => {
  const r = classify(base({ subtype: "error_max_turns", progressed: false }));
  assert.equal(r.outcome, "error");
  assert.match(r.reason, /error_max_turns/);
});

test("error: error_during_execution subtype", () => {
  const r = classify(
    base({ subtype: "error_during_execution", progressed: false }),
  );
  assert.equal(r.outcome, "error");
});

test("idle: clean exit, nothing left behind, oracle silent", () => {
  const r = classify(base({ progressed: false }));
  assert.equal(r.outcome, "idle");
});

// ── TRAP 1: the halt file is never deleted, so its existence proves nothing ───

test("TRAP 1: a STALE halt file classifies progress, not halt", () => {
  const r = classify(
    base({
      halt: { halted_at: BEFORE, halt_reason: "DoD gaps", halt_step: 7 },
      progressed: true,
    }),
  );
  assert.equal(
    r.outcome,
    "progress",
    "a halt file older than iteration start is leftover state, not this run's verdict",
  );
});

test("TRAP 1: a stale halt file classifies idle when the oracle is silent", () => {
  const r = classify(
    base({
      halt: { paused_at: BEFORE, pause_reason: "precompact" },
      progressed: false,
    }),
  );
  assert.equal(r.outcome, "idle");
});

test("TRAP 1: a halt file with NO timestamp is treated as stale", () => {
  const r = classify(
    base({ halt: { halt_reason: "merge failed", halt_step: 4 } }),
  );
  assert.equal(r.outcome, "progress");
});

test("TRAP 1: a halt file with an UNPARSEABLE timestamp is treated as stale", () => {
  const r = classify(base({ halt: { halted_at: "not-a-date", halt_step: 3 } }));
  assert.equal(r.outcome, "progress");
});

test("TRAP 1: paused_at is honoured as well as halted_at when fresh", () => {
  const r = classify(
    base({ halt: { paused_at: AFTER, pause_reason: "precompact" } }),
  );
  assert.equal(r.outcome, "halt");
  assert.match(r.reason, /precompact/);
});

test("TRAP 1 boundary: a timestamp EQUAL to iteration start is stale, not fresh", () => {
  const r = classify(
    base({ halt: { halted_at: new Date(START).toISOString(), halt_step: 5 } }),
  );
  assert.equal(
    r.outcome,
    "progress",
    "strictly-newer is the rule; equality is the pre-existing file",
  );
});

// ── TRAP 2: the Stop hook leaves a lock behind on a stalled iteration ────────

test("TRAP 2: a leftover lock classifies incomplete, not error", () => {
  const r = classify(
    base({ lockPresent: true, lockCurrentStep: 5, progressed: false }),
  );
  assert.equal(
    r.outcome,
    "incomplete",
    "on-stop.sh leaving a lock behind is designed behaviour, not a failure",
  );
  assert.match(r.reason, /step 5/);
});

test("TRAP 2: a leftover lock does not become an error even on a clean exit", () => {
  const r = classify(
    base({ lockPresent: true, exitCode: 0, progressed: true }),
  );
  assert.equal(r.outcome, "incomplete");
});

test("TRAP 2: no lock and no state file is NOT incomplete", () => {
  const r = classify(base({ lockPresent: false, stateFilePresent: false }));
  assert.equal(r.outcome, "progress");
});

// ── precedence ───────────────────────────────────────────────────────────────

test("precedence: a crashed child outranks a fresh halt file", () => {
  const r = classify(
    base({
      exitCode: 137,
      halt: { halted_at: AFTER, halt_reason: "gate failed" },
    }),
  );
  assert.equal(
    r.outcome,
    "error",
    "a dead process is what the operator must fix first; a pipeline halt exits 0",
  );
});

test("precedence: a fresh halt outranks a leftover lock", () => {
  const r = classify(
    base({
      halt: { halted_at: AFTER, halt_reason: "5 QA cycles", halt_step: 6 },
      lockPresent: true,
      lockCurrentStep: 6,
    }),
  );
  assert.equal(r.outcome, "halt");
});

test("precedence: the state file outranks the lock in the incomplete reason", () => {
  const r = classify(
    base({ stateFilePresent: true, lockPresent: true, progressed: false }),
  );
  assert.equal(r.outcome, "incomplete");
  assert.match(r.reason, /run-state file/);
});

test("not spawned with a `selected` probe is an error, never a silent success", () => {
  const r = classify(base({ spawned: false, probeStatus: "selected" }));
  assert.equal(r.outcome, "error");
});

test("not spawned with a null probe status is an error", () => {
  const r = classify(base({ spawned: false, probeStatus: null }));
  assert.equal(r.outcome, "error");
});

test("classify tolerates a missing snapshot without throwing", () => {
  const r = classify(undefined);
  assert.equal(r.outcome, "error");
});

test("every outcome the classifier returns is in OUTCOMES", () => {
  const seen = [
    classify(base()),
    classify(base({ spawned: false, probeStatus: "stop" })),
    classify(base({ halt: { halted_at: AFTER } })),
    classify(base({ stateFilePresent: true })),
    classify(base({ exitCode: 2 })),
    classify(base({ progressed: false })),
  ].map((r) => r.outcome);
  for (const o of seen) assert.ok(OUTCOMES.includes(o), o + " not in OUTCOMES");
});

// ── helpers, tested directly ─────────────────────────────────────────────────

test("isHaltFresh: null halt is never fresh", () => {
  assert.equal(isHaltFresh(null, START), false);
});

test("isHaltFresh: fresh and stale both resolve correctly", () => {
  assert.equal(isHaltFresh({ halted_at: AFTER }, START), true);
  assert.equal(isHaltFresh({ halted_at: BEFORE }, START), false);
});

test("isChildError: exit 0 with success subtype is not an error", () => {
  assert.equal(
    isChildError({ exitCode: 0, subtype: "success", isError: false }),
    false,
  );
});

test("isChildError: an unknown subtype alone is not an error", () => {
  assert.equal(isChildError({ exitCode: 0, subtype: "something_new" }), false);
});

// ── stop policy ──────────────────────────────────────────────────────────────

test("shouldStop: done always stops", () => {
  assert.equal(shouldStop("done").stop, true);
});

test("shouldStop: halt and error stop under the default policy", () => {
  assert.equal(shouldStop("halt").stop, true);
  assert.equal(shouldStop("error").stop, true);
});

test("shouldStop: --on-error continue keeps going through halt and error", () => {
  assert.equal(shouldStop("halt", { onError: "continue" }).stop, false);
  assert.equal(shouldStop("error", { onError: "continue" }).stop, false);
});

test("shouldStop: progress and idle never stop", () => {
  assert.equal(shouldStop("progress").stop, false);
  assert.equal(shouldStop("idle").stop, false);
});

test("shouldStop: incomplete resumes inside the budget and stops at it", () => {
  assert.equal(
    shouldStop("incomplete", { resumeAttempts: 1, maxResumeAttempts: 2 }).stop,
    false,
  );
  const spent = shouldStop("incomplete", {
    resumeAttempts: 2,
    maxResumeAttempts: 2,
  });
  assert.equal(spent.stop, true);
  assert.match(spent.reason, /resume budget exhausted/);
});

test("shouldStop: an unknown outcome fails safe by stopping", () => {
  assert.equal(shouldStop("weird").stop, true);
});

test("a failed probe carries its own diagnostic into the outcome reason", () => {
  const r = classify({
    spawned: false,
    probeStatus: "error",
    probeReason:
      "probe produced no output (exit 0). select-next.mjs exits 0 silently when argv[1] does not realpath to the module",
  });
  assert.equal(r.outcome, "error");
  assert.match(
    r.reason,
    /realpath/,
    "the realpath diagnostic is the only actionable part of this failure — it must survive",
  );
});

test("REAL ENVELOPE: is_error true alongside subtype 'success' still classifies error", () => {
  // Captured from a live `claude -p` run whose credit balance was exhausted.
  // The result envelope reported BOTH `subtype: "success"` and `is_error: true`
  // in the same object. A classifier that trusted `subtype` alone would have
  // called this a clean iteration and looped all night reporting progress while
  // every child failed — the exact silent-success failure this design exists to
  // rule out. isChildError checks all three signals for this reason.
  const r = classify({
    probeStatus: "selected",
    spawned: true,
    exitCode: 1,
    subtype: "success",
    isError: true,
    iterationStartMs: Date.parse("2026-08-28T12:00:00Z"),
    progressed: false,
  });
  assert.equal(r.outcome, "error");
});

test("is_error alone is enough, even on exit 0 with subtype success", () => {
  const r = classify({
    probeStatus: "selected",
    spawned: true,
    exitCode: 0,
    subtype: "success",
    isError: true,
    iterationStartMs: 0,
    progressed: true,
  });
  assert.equal(
    r.outcome,
    "error",
    "a truthful is_error must outrank an optimistic subtype",
  );
});
