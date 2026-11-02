// ---------------------------------------------------------------------------
// qa-loop-route.test.mjs
// ---------------------------------------------------------------------------
// The fixture table for the QA loop's route classifier (task.123).
//
// `classifyLoopRoute` is a predicate over (cycle, HIGH sequence, the latest
// gate's token and queue) → route. The table below IS the spec: the step-5-6
// doc's prose for route 2b is written from these rows, and a change to a row
// is a change to the rule. Every route has its positive row and the negatives
// that distinguish it from its neighbours, because each route was carved out of
// a shape the loop used to improvise on:
//
//   route 2b (cosmetic residue, obs #100)  — task.110 ran cycles 12–13 for two
//     LOW nits on a PASS gate.
//
// Route 2c (gate the last fix, obs #112) lived here until task.244: the budget
// now counts gates, so no budget ends on an ungated fix and the route has
// nothing to do. Its rows were removed with it; one test below pins that the
// legacy inputs (`budgetSpent`, `lastCycleAction`) are ignored.
//
// Rules the rows pin, and which mutation each guards:
//
//   1. 2b is PASS-ONLY.       Drop the token guard and `concerns-low-only` goes
//                             green on a route it must never take — a CONCERNS
//                             token is a reservation 5c must see raised.
//   2. 2b needs two HIGH-0.   HIGH `1, 0` must not exit on one quiet cycle.
//   3. 2b reads OPEN entries. All-closed LOWs are route 1's; an open MEDIUM is
//                             not cosmetic.
//   4. Route 2 still wins.    The `7,7,7,7,4` and `0,0,0` rows behave as the
//                             Diminishing-returns suite already pins them.
//   5. Route 2c is gone (task.244): the legacy inputs are ignored, not obeyed.
//   6. The MEDIUM count is the engine's, the HIGH count is not (property 2 of
//                             the engine — group 7 of its own suite reads the
//                             source for that; here it is asserted from the API).
//   7. Never throws; the route text is assertable.
//
// Run: node --test shared/resources/tests/qa-loop-route.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = join(__dirname, "..", "qa-diminishing-returns.js");
const FIXTURES = join(__dirname, "fixtures", "qa-diminishing-returns");

const {
  classifyLoopRoute,
  describeLoopRoute,
  countRaised,
  readGateToken,
  readTopIssues,
  ROUTES,
  VERDICTS,
} = require(MODULE_PATH);

const fixture = (name) => readFileSync(join(FIXTURES, name), "utf8");
// task.148's copies of task.143's real gates — the narrowing-residue shape.
const NR = join(__dirname, "fixtures", "qa-narrowing-residue");
const nr = (name) => readFileSync(join(NR, name), "utf8");
const GLOBS = ["**/*.spec.ts", "**/*.test.*", "tests/**", "**/fixtures/**"];

const FIX = "Running qa-fix (cycle 5 of 5)";

// ── the fixture table ───────────────────────────────────────────────────────
//
// One row per (label, input, expected route, expected reason): the classifier is called after 5a
// read the gate (routes 2 → 2b → continue). The budget is not an input (task.244).

const ROWS = [
  // ── the pre-existing sequences behave as before ──
  {
    label:
      "7,7,7,7,4 at cycle 3 — the Convergence check's run, never a route here",
    input: {
      cycle: 3,
      highCounts: [7, 7, 7, 7, 4],
      latestGateContent: fixture("flat-high-cycle3.yml"),
      testArtifactGlobs: GLOBS,
    },
    route: ROUTES.CONTINUE,
  },
  {
    label:
      "0,0,0 with a machinery residue at cycle 3 — route 2 (Diminishing-returns) still fires first",
    input: {
      cycle: 3,
      highCounts: [2, 0, 0],
      latestGateContent: fixture("residue-cycle3.yml"),
      testArtifactGlobs: GLOBS,
    },
    route: ROUTES.DIMINISHING_RETURNS,
    reason: "diminishing-returns",
  },
  {
    label:
      "0,0,0 with a production MEDIUM at cycle 3 — CONCERNS token, continue to 5b",
    input: {
      cycle: 3,
      highCounts: [0, 0, 0],
      latestGateContent: fixture("production-medium.yml"),
      testArtifactGlobs: GLOBS,
    },
    route: ROUTES.CONTINUE,
    reason: "not-a-pass-gate",
  },

  // ── route 2b — cosmetic residue ──
  {
    label: "2b fires: PASS, open LOWs only, HIGH 0,0 (task.110 cycle 12)",
    input: {
      cycle: 2,
      highCounts: [0, 0],
      latestGateContent: fixture("pass-low-only.yml"),
      testArtifactGlobs: [],
    },
    route: ROUTES.COSMETIC_RESIDUE,
    reason: "cosmetic-residue",
  },
  {
    label:
      "2b fires at cycle 12 too — the route is not cycle-bound once two HIGH-0 gates exist",
    input: {
      cycle: 12,
      highCounts: [3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      latestGateContent: fixture("pass-low-only.yml"),
    },
    route: ROUTES.COSMETIC_RESIDUE,
  },
  {
    label: "2b is PASS-only: the same LOW-only queue under CONCERNS goes to 5b",
    input: {
      cycle: 2,
      highCounts: [0, 0],
      latestGateContent: fixture("concerns-low-only.yml"),
      testArtifactGlobs: [],
    },
    route: ROUTES.CONTINUE,
    reason: "not-a-pass-gate",
  },
  {
    label:
      "2b needs two HIGH-0 gates: HIGH 1,0 does not exit on one quiet cycle",
    input: {
      cycle: 2,
      highCounts: [1, 0],
      latestGateContent: fixture("pass-low-only.yml"),
    },
    route: ROUTES.CONTINUE,
    reason: "high-findings-remain",
  },
  {
    label: "2b at cycle 1 has no previous reading — continue",
    input: {
      cycle: 1,
      highCounts: [0],
      latestGateContent: fixture("pass-low-only.yml"),
    },
    route: ROUTES.CONTINUE,
    reason: "high-counts-missing",
  },
  {
    label:
      "2b reads open entries: a PASS with an open MEDIUM beside the LOW is not cosmetic",
    input: {
      cycle: 3,
      highCounts: [0, 0, 0],
      latestGateContent: fixture("pass-mixed-open.yml"),
    },
    route: ROUTES.CONTINUE,
    reason: "residue-not-all-low",
  },
  {
    label:
      "2b does not fire on absence: a PASS whose LOWs are all closed is route 1's",
    input: {
      cycle: 3,
      highCounts: [0, 0, 0],
      latestGateContent: fixture("pass-low-closed.yml"),
    },
    route: ROUTES.CONTINUE,
    reason: "no-open-residue",
  },
  {
    label: "2b does not fire on an empty queue either",
    input: {
      cycle: 3,
      highCounts: [0, 0, 0],
      latestGateContent: fixture("empty-residue.yml"),
    },
    route: ROUTES.CONTINUE,
  },

  // ── task.148: task.143's real route decisions, pinned ──
  // These pin what the route classifier returns on the narrowing shape; they
  // do not by themselves prove the signal is not a route (a route folded in
  // after the PASS-token check would leave the CONCERNS row green). That
  // property is held in qa-narrowing-residue.test.mjs: a source read of
  // classifyLoopRoute, and deep-equal pairs on a PASS gate where the signal fires.
  {
    label:
      "task.143 cycle 3 — narrowing residue on a CONCERNS gate still routes continue (obs #172: an offer, not a route)",
    input: {
      cycle: 3,
      highCounts: [0, 0, 0],
      latestGateContent: nr("task143-gate-3.yml"),
      testArtifactGlobs: GLOBS,
    },
    route: ROUTES.CONTINUE,
    reason: "not-a-pass-gate",
  },
  {
    label:
      "task.143 cycle 5 — a CONCERNS gate with a MEDIUM that is not cosmetic routes continue",
    input: {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 0],
      mediumCounts: [2, 1, 2, 0],
      latestGateContent: nr("task143-gate-5.yml"),
    },
    route: ROUTES.CONTINUE,
    reason: "not-a-pass-gate",
  },
];

for (const row of ROWS) {
  test(row.label, () => {
    const r = classifyLoopRoute(row.input);
    assert.equal(r.route, row.route, `route: ${JSON.stringify(r)}`);
    if (row.reason)
      assert.equal(r.reason, row.reason, `reason: ${JSON.stringify(r)}`);
  });
}

// ── the classifier is a superset of the Diminishing-returns predicate ───────

test("route 2's result carries the Diminishing-returns verdict and findings unchanged", () => {
  const r = classifyLoopRoute({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: fixture("residue-cycle3.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.verdict, VERDICTS.EXIT);
  assert.equal(r.findings.length, 2);
  assert.ok(r.findings.every((f) => f.matched));
});

test("a continue after route 2 declined still reports route 2's reason in its detail", () => {
  const r = classifyLoopRoute({
    cycle: 3,
    highCounts: [0, 0, 0],
    latestGateContent: fixture("production-medium.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.route, ROUTES.CONTINUE);
  assert.match(r.detail, /route 2 declined: non-test-finding/);
});

// ── route 2 carries its residue by id, so the exiting gate has no open entry (obs #215) ──

test("route 2 returns the OPEN residue ids, in gate order", () => {
  const r = classifyLoopRoute({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: fixture("residue-cycle3.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.route, ROUTES.DIMINISHING_RETURNS);
  assert.deepEqual(r.residueIds, ["RECON-005", "RECON-006"]);
});

test("route 2's residueIds leave out an entry already closed — it is not residue to carry", () => {
  const gate = fixture("residue-cycle3.yml").replace(
    /(id: "RECON-005"[\s\S]*?)status: open/,
    "$1status: closed",
  );
  assert.notEqual(
    gate,
    fixture("residue-cycle3.yml"),
    "the fixture edit applied",
  );
  const r = classifyLoopRoute({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: gate,
    testArtifactGlobs: GLOBS,
  });
  assert.equal(r.route, ROUTES.DIMINISHING_RETURNS);
  assert.deepEqual(r.residueIds, ["RECON-006"]);
});

// ── 2b carries the LOW ids the orchestrator moves to recommendations.future ──

test("route 2b returns the open LOW ids, in gate order", () => {
  const r = classifyLoopRoute({
    cycle: 2,
    highCounts: [0, 0],
    latestGateContent: fixture("pass-low-only.yml"),
  });
  assert.deepEqual(r.lowIds, ["COSM-001", "COSM-002"]);
});

test("the entry id is read from the key position only — prose that says ' id:' before the real key is not the id (CR-7)", () => {
  // First-wins would otherwise carry "42 is lost" into recommendations.future.
  const issues = readTopIssues(
    'top_issues:\n  - finding: "the user id: 42 is lost"\n    id: "X-1"\n    severity: low\n    status: open\n',
  );
  assert.deepEqual(
    issues.map((e) => e.id),
    ["X-1"],
  );
  // The inline-map form still reads id after "{" and after ",".
  const inline = readTopIssues(
    "top_issues:\n  - {severity: high, id: I-1, file: a.ts}\n  - { id: I-2 , severity: low }\n",
  );
  assert.deepEqual(
    inline.map((e) => e.id),
    ["I-1", "I-2"],
  );
  // And an id in a following key line is read as before.
  const r = classifyLoopRoute({
    cycle: 2,
    highCounts: [0, 0],
    latestGateContent:
      'gate: PASS\ntop_issues:\n  - finding: "id: not this one"\n    id: "REAL-1"\n    severity: low\n    file: "x.md"\n',
  });
  assert.equal(r.route, ROUTES.COSMETIC_RESIDUE);
  assert.deepEqual(r.lowIds, ["REAL-1"]);
});

test("readTopIssues now carries the entry id, case-preserved", () => {
  const issues = readTopIssues(fixture("pass-low-only.yml"));
  assert.deepEqual(
    issues.map((e) => e.id),
    ["COSM-001", "COSM-002"],
  );
});

// ── the MEDIUM count is the engine's; HIGH is not ───────────────────────────

test("countRaised counts MEDIUM and LOW as raised — closed entries included — and never HIGH", () => {
  assert.deepEqual(countRaised(fixture("medium-falling-cycle5.yml")), {
    medium: 1,
    low: 0,
  });
  assert.deepEqual(countRaised(fixture("pass-low-closed.yml")), {
    medium: 0,
    low: 1,
  });
  assert.deepEqual(countRaised(fixture("pass-mixed-open.yml")), {
    medium: 1,
    low: 1,
  });
  // A gate with HIGH entries: the HIGH is simply not a key of the result.
  const one = countRaised(fixture("one-high.yml"));
  assert.equal(Object.prototype.hasOwnProperty.call(one, "high"), false);
  assert.equal(countRaised(null), null);
});

// ── route 2c is removed (task.244): the budget counts gates, so no budget ends on a fix ──

test("route 2c is gone: no GATE_THE_LAST_FIX route, and the legacy inputs are ignored, not obeyed", () => {
  assert.equal(
    Object.prototype.hasOwnProperty.call(ROUTES, "GATE_THE_LAST_FIX"),
    false,
  );
  // task.242's shape — HIGH 2,3,1,0,0,0,0, MEDIUM 3,0,0,1,1,1 at gate 7 — would have taken route 2c
  // at the spent budget. A stale caller that still passes budgetSpent must get exactly what it
  // gets without it: the mid-loop routes 2/2b, then continue.
  const base = {
    cycle: 7,
    highCounts: [2, 3, 1, 0, 0, 0, 0],
    mediumCounts: [3, 0, 0, 1, 1, 1],
    latestGateContent: fixture("medium-falling-cycle5.yml"),
  };
  const without = classifyLoopRoute(base);
  const withLegacy = classifyLoopRoute({
    ...base,
    budgetSpent: true,
    lastCycleAction: FIX,
  });
  assert.deepEqual(withLegacy, without);
  assert.notEqual(withLegacy.route, "gate-the-last-fix");
  assert.equal(withLegacy.mediumSequence, undefined);
});

test("readGateToken reads the top-level gate: key, upper-cased, and null when absent", () => {
  assert.equal(readGateToken(fixture("pass-low-only.yml")), "PASS");
  assert.equal(readGateToken(fixture("medium-flat-cycle5.yml")), "CONCERNS");
  assert.equal(readGateToken("gate: pass\n"), "PASS");
  assert.equal(readGateToken('gate: "Waived" # quoted\n'), "WAIVED");
  assert.equal(readGateToken("schema: 1\n"), null);
  assert.equal(readGateToken(null), null);
});

// ── never throws; the route text is assertable ──────────────────────────────

test("never throws on the shapes a pipeline produces on a bad day", () => {
  const inputs = [
    undefined,
    null,
    {},
    { cycle: "5", budgetSpent: true, lastCycleAction: FIX },
    { cycle: 5, highCounts: null, budgetSpent: true, lastCycleAction: FIX },
    {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 0],
      mediumCounts: "4,3,2",
      latestGateContent: "",
    },
    { cycle: 2, highCounts: [0, 0], latestGateContent: 42 },
    {
      cycle: 2,
      highCounts: [0, 0],
      latestGateContent: "gate: PASS\ntop_issues:\n  - severity: low\n",
    },
    {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 0],
      mediumCounts: [1, 2, 3, 4],
      latestGateContent: fixture("medium-falling-cycle5.yml"),
      lastCycleAction: 7,
    },
  ];
  for (const input of inputs) {
    let r;
    assert.doesNotThrow(
      () => {
        r = classifyLoopRoute(input);
      },
      `input ${JSON.stringify(input)}`,
    );
    assert.ok(Object.values(ROUTES).includes(r.route));
    assert.equal(typeof describeLoopRoute(r), "string");
  }
});

test("describeLoopRoute names each route in words a six-months-later reader can tell apart", () => {
  const dr = classifyLoopRoute({
    cycle: 3,
    highCounts: [2, 0, 0],
    latestGateContent: fixture("residue-cycle3.yml"),
    testArtifactGlobs: GLOBS,
  });
  assert.match(describeLoopRoute(dr), /^Diminishing-returns exit taken — /);
  assert.match(describeLoopRoute(dr), /CLEAN exit, not a stall/);

  const cr = classifyLoopRoute({
    cycle: 2,
    highCounts: [0, 0],
    latestGateContent: fixture("pass-low-only.yml"),
  });
  const crMsg = describeLoopRoute(cr);
  assert.match(crMsg, /^Cosmetic-residue exit taken — /);
  assert.match(crMsg, /COSM-001, COSM-002/);
  assert.match(crMsg, /CLEAN exit, not a stall/);

  // task.244: route 2c is gone, but an old report's `**Loop exit**` row may still carry its token.
  const glMsg = describeLoopRoute({
    route: "gate-the-last-fix",
    reason: "gate-the-last-fix",
    detail: "the 5-cycle budget is spent",
  });
  assert.match(
    glMsg,
    /^Loop route: gate-the-last-fix \(route 2c, removed in task\.244\) — /,
  );
  assert.match(glMsg, /the 5-cycle budget is spent/);

  const cont = classifyLoopRoute({
    cycle: 2,
    highCounts: [0, 0],
    latestGateContent: fixture("concerns-low-only.yml"),
  });
  assert.match(
    describeLoopRoute(cont),
    /^Loop route: continue \(not-a-pass-gate\)/,
  );
  assert.match(describeLoopRoute(undefined), /no verdict/);
});

test("the module still touches no filesystem API", () => {
  const src = readFileSync(MODULE_PATH, "utf8");
  assert.doesNotMatch(
    src,
    /require\(["']fs["']\)|require\(["']node:fs["']\)|from ["']fs["']/,
  );
});

// ── both carrying exits close what they carry (obs #215) ─────────────────────
//
// Route 2b always stamped its carried LOWs `status: closed`; route 2 left its residue open, and
// develop-next's merge gate — which refuses any open entry — then halted an accepted task. The two
// exits' On-exit lists must carry the SAME stamp, and route 2's must read the ids from residueIds.
// Read from the step doc by section, not by grepping the whole file: a stamp in one exit's list must
// not satisfy the other's.
test("route 2's and route 2b's On-exit lists both stamp carried entries status: closed (obs #215)", () => {
  const doc = readFileSync(
    join(__dirname, "..", "develop-pipeline-step-5-6-qa-loop.md"),
    "utf8",
  );
  const onExit = doc
    .split(/^#### On exit$/m)
    .slice(1)
    .map((s) => s.split(/^#{2,4} /m)[0]);
  assert.equal(
    onExit.length,
    2,
    "non-vacuity: two On-exit sections (route 2, route 2b)",
  );
  const [route2, route2b] = onExit;
  for (const [name, body, route] of [
    ["route 2", route2, "route 2"],
    ["route 2b", route2b, "route 2b"],
  ]) {
    assert.match(
      body,
      /status: closed/,
      `${name}'s On-exit list does not close what it carries`,
    );
    assert.ok(
      body.includes(`resolution: carried to recommendations.future (${route})`),
      `${name}'s On-exit list does not write the carried-to resolution`,
    );
  }
  assert.match(
    route2,
    /residueIds/,
    "route 2's list does not read the ids from ROUTE_JSON.residueIds",
  );
});
