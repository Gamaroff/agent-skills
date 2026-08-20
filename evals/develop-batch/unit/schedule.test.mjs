/**
 * Layer-1 unit tests for the develop-batch deterministic scheduler.
 *
 * Each test pins one rule from skills/develop-batch/references/execution-resources.md.
 * The rules that matter most are the safety ones — a probe can only ever
 * subtract capacity, a flaky probe never stalls a batch, and an ambiguous stop
 * fails safe to `halt` — so those are tested on both sides of their boundary.
 *
 * Run via: node --test evals/develop-batch/unit/schedule.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, execFileSync as _e } from "node:child_process";
import { writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SCRIPT = path.join(
  REPO_ROOT,
  "skills",
  "develop-batch",
  "scripts",
  "schedule.mjs",
);

const {
  parseYamlSubset,
  normalizeResources,
  computeInflight,
  interpretProbe,
  effectiveCapacity,
  placeItem,
  planAdmissions,
  classifyStop,
  shouldRebatch,
} = await import(pathToFileURL(SCRIPT).href);

// ── helpers ──────────────────────────────────────────────────────────────────

const TWO_RESOURCES = {
  developBatch: {
    resources: [
      { name: "local", capacity: 1, testCommand: "npm run test:local" },
      { name: "box", capacity: 3, testCommand: "npm run test:remote" },
    ],
  },
};

function item(id, over = {}) {
  return {
    id,
    command: "/develop-story",
    commandArg: `path/${id}.md`,
    dir: `../wt-${id}`,
    branch: `story/${id}`,
    worktreeCreated: false,
    dispatched: false,
    prNumber: null,
    pipelineDone: false,
    merged: false,
    ticked: false,
    halted: false,
    interrupted: false,
    attempts: 0,
    ...over,
  };
}

// ── parseYamlSubset ──────────────────────────────────────────────────────────

test("parseYamlSubset: nested maps, lists of maps, scalars and comments", () => {
  const cfg = parseYamlSubset(`
# leading comment
developBatch:
  maxParallel: 4          # trailing comment
  requireTouches: false
  worktreeSeedPaths: []
  resources:
    - name: local
      capacity: 1
      testCommand: "npm run test:local"
    - name: box
      capacity: 3
      probe:
        command: "bash probe.sh"
        intervalSec: 30
`);
  assert.equal(cfg.developBatch.maxParallel, 4);
  assert.equal(cfg.developBatch.requireTouches, false);
  assert.deepEqual(cfg.developBatch.worktreeSeedPaths, []);
  assert.equal(cfg.developBatch.resources.length, 2);
  assert.equal(cfg.developBatch.resources[0].testCommand, "npm run test:local");
  assert.equal(cfg.developBatch.resources[1].probe.intervalSec, 30);
});

test("parseYamlSubset: a `#` inside quotes is not a comment", () => {
  const cfg = parseYamlSubset(`developBatch:\n  note: "count #1"\n`);
  assert.equal(cfg.developBatch.note, "count #1");
});

// ── normalizeResources: the four back-compat rows ────────────────────────────

test("normalizeResources: no resources + maxParallel → one implicit resource at that cap", () => {
  const t = normalizeResources({ developBatch: { maxParallel: 3 } });
  assert.equal(t.implicit, true);
  assert.equal(t.resources.length, 1);
  assert.equal(t.resources[0].capacity, 3);
  assert.equal(t.globalCap, 3);
});

test("normalizeResources: no config at all → historical default of 4", () => {
  const t = normalizeResources({});
  assert.equal(t.globalCap, 4);
  assert.equal(t.resources[0].capacity, 4);
});

test("normalizeResources: resources without maxParallel → cap is the sum", () => {
  const t = normalizeResources(TWO_RESOURCES);
  assert.equal(t.globalCap, 4);
  assert.equal(t.implicit, false);
});

test("normalizeResources: maxParallel below the sum binds, and says so", () => {
  const t = normalizeResources({
    developBatch: { ...TWO_RESOURCES.developBatch, maxParallel: 2 },
  });
  assert.equal(t.globalCap, 2);
  assert.match(t.notes.join(" "), /binding constraint/);
});

test("normalizeResources: empty resources list falls back rather than yielding zero capacity", () => {
  const t = normalizeResources({
    developBatch: { resources: [], maxParallel: 2 },
  });
  assert.equal(t.resources.length, 1);
  assert.equal(t.globalCap, 2);
});

test("normalizeResources: a resource with no name is skipped, not fatal", () => {
  const t = normalizeResources({
    developBatch: {
      resources: [{ capacity: 2 }, { name: "box", capacity: 3 }],
    },
  });
  assert.equal(t.resources.length, 1);
  assert.equal(t.resources[0].name, "box");
  assert.match(t.notes.join(" "), /no `name`/);
});

test("normalizeResources: a probe without a command is ignored", () => {
  const t = normalizeResources({
    developBatch: {
      resources: [{ name: "box", capacity: 1, probe: { intervalSec: 5 } }],
    },
  });
  assert.equal(t.resources[0].probe, null);
  assert.match(t.notes.join(" "), /probe with no command/);
});

// ── computeInflight ──────────────────────────────────────────────────────────

test("computeInflight: only dispatched-and-still-running items hold a slot", () => {
  const { resources } = normalizeResources(TWO_RESOURCES);
  const state = {
    items: [
      item("a", { dispatched: true, resource: "box" }), // holds
      item("b", { dispatched: true, resource: "box", pipelineDone: true }), // frees
      item("c", { dispatched: true, resource: "box", halted: true }), // frees
      item("d", { dispatched: true, resource: "local", interrupted: true }), // frees
      item("e"), // never dispatched
    ],
  };
  assert.deepEqual(computeInflight(state, resources), { local: 0, box: 1 });
});

test("computeInflight: a v1 state file with no `resource` attributes to the first resource", () => {
  const { resources } = normalizeResources(TWO_RESOURCES);
  const state = {
    items: [item("a", { dispatched: true }), item("b", { dispatched: true })],
  };
  assert.deepEqual(computeInflight(state, resources), { local: 2, box: 0 });
});

// ── interpretProbe ───────────────────────────────────────────────────────────

test("interpretProbe: exit 0 with no stdout → available, static capacity governs", () => {
  const r = interpretProbe({ code: 0, stdout: "" });
  assert.equal(r.saturated, false);
  assert.equal(r.freeSlots, null);
});

test("interpretProbe: exit 0 with {freeSlots} → that many slots", () => {
  const r = interpretProbe({ code: 0, stdout: '{"freeSlots": 2}' });
  assert.equal(r.saturated, false);
  assert.equal(r.freeSlots, 2);
});

test("interpretProbe: non-zero exit → saturated, first stdout line is the reason", () => {
  const r = interpretProbe({ code: 1, stdout: "load 25.67 on 6 cores\nmore" });
  assert.equal(r.saturated, true);
  assert.equal(r.reason, "load 25.67 on 6 cores");
});

test("interpretProbe: garbage stdout on exit 0 is not an error", () => {
  const r = interpretProbe({ code: 0, stdout: "not json at all" });
  assert.equal(r.saturated, false);
  assert.equal(r.freeSlots, null);
});

test("interpretProbe: timeout reports AVAILABLE and degraded — a flaky probe must never stall a batch", () => {
  const r = interpretProbe({ code: 0, stdout: "", timedOut: true });
  assert.equal(r.saturated, false);
  assert.equal(r.degraded, true);
});

test("interpretProbe: spawn error also reports available", () => {
  const r = interpretProbe({ spawnError: true });
  assert.equal(r.saturated, false);
  assert.equal(r.degraded, true);
});

// ── effectiveCapacity / placeItem ────────────────────────────────────────────

test("effectiveCapacity: a probe can only SUBTRACT, never grant beyond static capacity", () => {
  const r = { name: "box", capacity: 3 };
  // freeSlots is wildly optimistic; static capacity still wins.
  assert.equal(effectiveCapacity(r, 0, { freeSlots: 99 }), 3);
  assert.equal(effectiveCapacity(r, 1, { freeSlots: 1 }), 2);
});

test("placeItem: spreads by utilisation ratio", () => {
  const { resources } = normalizeResources(TWO_RESOURCES);
  // local 0/1 (0.0) vs box 1/3 (0.33) → local wins.
  assert.equal(placeItem(resources, { local: 0, box: 1 }), "local");
  // local 1/1 (full) → box.
  assert.equal(placeItem(resources, { local: 1, box: 1 }), "box");
});

test("placeItem: ties break on declaration order", () => {
  const { resources } = normalizeResources({
    developBatch: {
      resources: [
        { name: "first", capacity: 2 },
        { name: "second", capacity: 2 },
      ],
    },
  });
  assert.equal(placeItem(resources, { first: 0, second: 0 }), "first");
});

test("placeItem: a capacity-1 resource never takes a second item", () => {
  const { resources } = normalizeResources({
    developBatch: { resources: [{ name: "local", capacity: 1 }] },
  });
  assert.equal(placeItem(resources, { local: 1 }), null);
});

test("placeItem: a saturated probe withholds the resource entirely", () => {
  const { resources } = normalizeResources(TWO_RESOURCES);
  const probes = { box: { saturated: true, freeSlots: null } };
  // local is full, box is saturated → nothing to admit.
  assert.equal(placeItem(resources, { local: 1, box: 0 }, probes), null);
});

test("placeItem: freeSlots:0 withholds even with static headroom", () => {
  const { resources } = normalizeResources(TWO_RESOURCES);
  const probes = { box: { saturated: false, freeSlots: 0 } };
  assert.equal(placeItem(resources, { local: 1, box: 0 }, probes), null);
});

// ── planAdmissions ───────────────────────────────────────────────────────────

test("planAdmissions: fills both lanes and stops at the global cap", () => {
  const table = normalizeResources({
    developBatch: { ...TWO_RESOURCES.developBatch, maxParallel: 2 },
  });
  const state = { items: [item("a"), item("b"), item("c")] };
  const { admit, hold } = planAdmissions(state, table);
  assert.equal(admit.length, 2);
  assert.equal(hold.length, 1);
  assert.match(hold[0].reason, /global cap/);
});

test("planAdmissions: carries the resource's testCommand onto each admission", () => {
  const table = normalizeResources(TWO_RESOURCES);
  const { admit } = planAdmissions({ items: [item("a")] }, table);
  assert.equal(admit[0].resource, "local");
  assert.equal(admit[0].testCommand, "npm run test:local");
});

test("planAdmissions: an interrupted item is re-admitted and RE-PLACED, not pinned", () => {
  const table = normalizeResources(TWO_RESOURCES);
  // It was on `box`; box is now full, local is free → it must move.
  const state = {
    items: [
      item("a", {
        dispatched: true,
        resource: "box",
        interrupted: true,
        attempts: 1,
      }),
      item("b", { dispatched: true, resource: "box" }),
      item("c", { dispatched: true, resource: "box" }),
      item("d", { dispatched: true, resource: "box" }),
    ],
  };
  const { admit } = planAdmissions(state, table);
  assert.equal(admit.length, 1);
  assert.equal(admit[0].id, "a");
  assert.equal(admit[0].resource, "local");
  assert.equal(admit[0].resuming, true);
  assert.equal(admit[0].attempt, 2);
});

test("planAdmissions: an item past the resume budget is held, not re-dispatched forever", () => {
  const table = normalizeResources(TWO_RESOURCES);
  const state = {
    items: [item("a", { dispatched: true, interrupted: true, attempts: 3 })],
  };
  const { admit, hold } = planAdmissions(
    state,
    table,
    {},
    { maxResumeAttempts: 2 },
  );
  assert.equal(admit.length, 0);
  assert.match(hold[0].reason, /resume budget exhausted/);
});

test("planAdmissions: terminal items are never re-admitted", () => {
  const table = normalizeResources(TWO_RESOURCES);
  const state = {
    items: [
      item("a", { ticked: true }),
      item("b", { halted: true }),
      item("c", { pipelineDone: true }),
    ],
  };
  const { admit, hold } = planAdmissions(state, table);
  assert.equal(admit.length, 0);
  assert.equal(hold.length, 0);
});

// ── classifyStop ─────────────────────────────────────────────────────────────

test("classifyStop: plan mode is an interruption, not a HALT", () => {
  const r = classifyStop(
    "Plan mode is active. You MUST NOT make any edits.",
    null,
  );
  assert.equal(r.kind, "interrupted");
});

test("classifyStop: pipeline-gate failures are HALTs", () => {
  assert.equal(
    classifyStop("review NO-GO — rework required", null).kind,
    "halt",
  );
  assert.equal(classifyStop("5 QA cycles without PASS", null).kind, "halt");
  assert.equal(classifyStop("DoD gaps remain", null).kind, "halt");
  assert.equal(classifyStop("non-trivial rebase conflict", null).kind, "halt");
});

test("classifyStop: a gate signature wins over an external one in the same text", () => {
  // A pipeline that HALTed and then also mentions being interrupted must not
  // be resumed — the gate decision is the load-bearing one.
  const r = classifyStop("review NO-GO; also the run was interrupted", null);
  assert.equal(r.kind, "halt");
});

test("classifyStop: ambiguous text + a live non-terminal lock → interrupted", () => {
  const r = classifyStop("stopped", { step: "qa-story", terminal: false });
  assert.equal(r.kind, "interrupted");
});

test("classifyStop: ambiguous text + NO lock fails safe to halt", () => {
  const r = classifyStop("stopped", null);
  assert.equal(r.kind, "halt");
  assert.match(r.reason, /failing safe/);
});

// ── shouldRebatch ────────────────────────────────────────────────────────────

test("shouldRebatch: no ticks → stop (the real anti-spin guard)", () => {
  const r = shouldRebatch({
    prevSignature: "a",
    newIds: ["b"],
    tickedCount: 0,
    rebatchCount: 0,
  });
  assert.equal(r.go, false);
  assert.match(r.reason, /no progress/);
});

test("shouldRebatch: identical signature → stop", () => {
  const r = shouldRebatch({
    prevSignature: "a,b",
    newIds: ["b", "a"],
    tickedCount: 2,
    rebatchCount: 0,
  });
  assert.equal(r.go, false);
  assert.match(r.reason, /same batch/);
});

test("shouldRebatch: cap reached → stop", () => {
  const r = shouldRebatch({
    prevSignature: "a",
    newIds: ["b"],
    tickedCount: 1,
    rebatchCount: 3,
    maxRebatches: 3,
  });
  assert.equal(r.go, false);
  assert.match(r.reason, /cap reached/);
});

test("shouldRebatch: empty frontier → stop", () => {
  const r = shouldRebatch({
    prevSignature: "a",
    newIds: [],
    tickedCount: 1,
    rebatchCount: 0,
  });
  assert.equal(r.go, false);
});

test("shouldRebatch: progress + new frontier + under cap → go", () => {
  const r = shouldRebatch({
    prevSignature: "a",
    newIds: ["b", "c"],
    tickedCount: 1,
    rebatchCount: 0,
  });
  assert.equal(r.go, true);
  assert.equal(r.signature, "b,c");
});

// ── CLI integration ──────────────────────────────────────────────────────────

test("CLI: `plan` emits well-formed JSON with placement", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sched-"));
  const cfg = path.join(dir, "skills-config.yaml");
  const st = path.join(dir, "state.json");
  writeFileSync(
    cfg,
    [
      "developBatch:",
      "  resources:",
      "    - name: local",
      "      capacity: 1",
      '      testCommand: "npm run test:local"',
      "    - name: box",
      "      capacity: 2",
      '      testCommand: "npm run test:remote"',
      "",
    ].join("\n"),
  );
  writeFileSync(
    st,
    JSON.stringify({ items: [item("a"), item("b"), item("c"), item("d")] }),
  );
  const out = execFileSync(
    process.execPath,
    [SCRIPT, "plan", "--state", st, "--config", cfg],
    {
      encoding: "utf-8",
    },
  );
  const plan = JSON.parse(out);
  assert.equal(plan.globalCap, 3);
  assert.equal(plan.admit.length, 3);
  assert.equal(plan.hold.length, 1);
  // First admission goes to the least-utilised resource.
  assert.equal(plan.admit[0].resource, "local");
  assert.equal(plan.admit[0].testCommand, "npm run test:local");
});

test("CLI: `resources` works with no config file at all (zero-config project)", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sched-"));
  const out = execFileSync(
    process.execPath,
    [SCRIPT, "resources", "--config", path.join(dir, "nope.yaml")],
    { encoding: "utf-8" },
  );
  const t = JSON.parse(out);
  assert.equal(t.globalCap, 4);
  assert.equal(t.implicit, true);
});

test("CLI: a saturated probe withholds its resource end to end", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sched-"));
  const cfg = path.join(dir, "skills-config.yaml");
  const st = path.join(dir, "state.json");
  writeFileSync(
    cfg,
    [
      "developBatch:",
      "  resources:",
      "    - name: box",
      "      capacity: 3",
      '      testCommand: "npm run test:remote"',
      "      probe:",
      '        command: "exit 1"',
      "        intervalSec: 0",
      "",
    ].join("\n"),
  );
  writeFileSync(st, JSON.stringify({ items: [item("a")] }));
  const out = execFileSync(
    process.execPath,
    [SCRIPT, "plan", "--state", st, "--config", cfg],
    {
      encoding: "utf-8",
    },
  );
  const plan = JSON.parse(out);
  assert.equal(plan.admit.length, 0);
  assert.match(plan.hold[0].reason, /capacity or saturated/);
  assert.match(plan.notes.join(" "), /reported saturated/);
});
