// ---------------------------------------------------------------------------
// qa-loop-route.test.mjs
// ---------------------------------------------------------------------------
// The fixture table for the QA loop's route classifier (task.123).
//
// `classifyLoopRoute` is a predicate over (cycle, HIGH sequence, MEDIUM
// sequence, the latest gate's token and queue, the budget state, the last
// cycle's Action row) → route. The table below IS the spec: the step-5-6 doc's
// prose for routes 2b and 2c is written from these rows, and a change to a row
// is a change to the rule. Every route has its positive row and the negatives
// that distinguish it from its neighbours, because each route was carved out of
// a shape the loop used to improvise on:
//
//   route 2b (cosmetic residue, obs #100)  — task.110 ran cycles 12–13 for two
//     LOW nits on a PASS gate.
//   route 2c (gate the last fix, obs #112) — task.117 spent five CONCERNS gates
//     with HIGH 0 throughout and MEDIUM falling, then escalated an ungated fix.
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
//   5. 2c fires only at the budget, only after a 5b cycle, only with HIGH 0
//                             on the LAST gate, only with MEDIUM strictly
//                             falling. Each negative row removes exactly one of
//                             those. HIGH keys on the last gate, not on the
//                             whole history (obs #139): a blocker raised and
//                             fixed at cycle 2 is not the stall this route
//                             refuses, and the HIGH-0-throughout clause declined
//                             task.130 (0,1,0,1,0) and task.125 (1,1,0,1,0).
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
const TO_5C = "Proceeding to 5c (PR conformance review)";

// ── the fixture table ───────────────────────────────────────────────────────
//
// One row per (label, input, expected route, expected reason). `budgetSpent`
// selects the moment: false = after 5a read the gate (routes 2 → 2b → continue),
// true = at the loop-limit trigger (route 2c → continue).

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

  // ── route 2c — gate the last fix ──
  {
    label:
      "2c fires: budget spent, last cycle routed to 5b, HIGH 0 throughout, MEDIUM 3,2 → 1 (task.117)",
    input: {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 0],
      mediumCounts: [5, 4, 3, 2],
      latestGateContent: fixture("medium-falling-cycle5.yml"),
      budgetSpent: true,
      lastCycleAction: FIX,
    },
    route: ROUTES.GATE_THE_LAST_FIX,
    reason: "gate-the-last-fix",
  },
  {
    label:
      "2c negative: the last cycle reached 5c and REQUEST CHANGES sent it back — no half-cycle",
    input: {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 0],
      mediumCounts: [5, 4, 3, 2],
      latestGateContent: fixture("medium-falling-cycle5.yml"),
      budgetSpent: true,
      lastCycleAction: TO_5C,
    },
    route: ROUTES.CONTINUE,
    reason: "last-cycle-not-a-fix",
  },
  {
    label:
      "2c fires: a HIGH raised at cycle 1 and fixed — HIGH keys on the last gate, not the history (obs #139)",
    input: {
      cycle: 5,
      highCounts: [1, 0, 0, 0, 0],
      mediumCounts: [5, 4, 3, 2],
      latestGateContent: fixture("medium-falling-cycle5.yml"),
      budgetSpent: true,
      lastCycleAction: FIX,
    },
    route: ROUTES.GATE_THE_LAST_FIX,
    reason: "gate-the-last-fix",
  },
  {
    label:
      "2c fires: HIGH alternating 0,1,0,1,0 with MEDIUM falling — task.130's shape, declined by the old clause (obs #139)",
    input: {
      cycle: 5,
      highCounts: [0, 1, 0, 1, 0],
      mediumCounts: [5, 4, 3, 2],
      latestGateContent: fixture("medium-falling-cycle5.yml"),
      budgetSpent: true,
      lastCycleAction: FIX,
    },
    route: ROUTES.GATE_THE_LAST_FIX,
    reason: "gate-the-last-fix",
  },
  {
    label:
      "2c negative: HIGH on the LAST gate — the fix answers a blocker, which is escalated, not gated",
    input: {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 1],
      mediumCounts: [5, 4, 3, 2],
      latestGateContent: fixture("medium-falling-cycle5.yml"),
      budgetSpent: true,
      lastCycleAction: FIX,
    },
    route: ROUTES.CONTINUE,
    reason: "high-on-last-gate",
  },
  {
    label:
      "2c negative: MEDIUM flat 2,2 → 2 — no evidence one more gate would clear",
    input: {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 0],
      mediumCounts: [3, 2, 2, 2],
      latestGateContent: fixture("medium-flat-cycle5.yml"),
      budgetSpent: true,
      lastCycleAction: FIX,
    },
    route: ROUTES.CONTINUE,
    reason: "medium-not-falling",
  },
  {
    label:
      "2c negative: MEDIUM fell then plateaued 3,2 → 2 — strictly falling means all three steps",
    input: {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 0],
      mediumCounts: [5, 4, 3, 2],
      latestGateContent: fixture("medium-flat-cycle5.yml"),
      budgetSpent: true,
      lastCycleAction: FIX,
    },
    route: ROUTES.CONTINUE,
    reason: "medium-not-falling",
  },
  {
    label:
      "2c negative: the MEDIUM sequence for earlier cycles is missing — cannot establish falling",
    input: {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 0],
      mediumCounts: [5, 4],
      latestGateContent: fixture("medium-falling-cycle5.yml"),
      budgetSpent: true,
      lastCycleAction: FIX,
    },
    route: ROUTES.CONTINUE,
    reason: "medium-counts-missing",
  },
  {
    label:
      "2c is not evaluated mid-loop: the same inputs with budgetSpent false go through routes 2/2b",
    input: {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 0],
      mediumCounts: [5, 4, 3, 2],
      latestGateContent: fixture("medium-falling-cycle5.yml"),
      budgetSpent: false,
      lastCycleAction: FIX,
    },
    route: ROUTES.CONTINUE,
    reason: "not-a-pass-gate",
  },
  {
    label:
      "2c negative: budget spent with HIGH on the last gate — a granted budget of 7 with HIGH at cycle 7",
    input: {
      cycle: 7,
      highCounts: [0, 0, 0, 0, 0, 0, 2],
      mediumCounts: [6, 5, 4, 3, 3, 2],
      latestGateContent: fixture("medium-falling-cycle5.yml"),
      budgetSpent: true,
      lastCycleAction: FIX,
    },
    route: ROUTES.CONTINUE,
    reason: "high-on-last-gate",
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
    label: "task.143 cycle 5 at the budget — the real run's route 2c decline",
    input: {
      cycle: 5,
      highCounts: [0, 0, 0, 0, 0],
      mediumCounts: [2, 1, 2, 0],
      latestGateContent: nr("task143-gate-5.yml"),
      budgetSpent: true,
      lastCycleAction: FIX,
    },
    route: ROUTES.CONTINUE,
    reason: "medium-not-falling",
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

test("route 2c reads MEDIUM_N from the gate, not from the sequence's last element", () => {
  // The sequence claims cycle 5 raised 0 MEDIUM; the gate raises 1. If the engine
  // read the sequence, 2,1,0 would be falling and the route would fire.
  const r = classifyLoopRoute({
    cycle: 5,
    highCounts: [0, 0, 0, 0, 0],
    mediumCounts: [5, 4, 2, 1, 0],
    latestGateContent: fixture("medium-flat-cycle5.yml"), // raises 2
    budgetSpent: true,
    lastCycleAction: FIX,
  });
  assert.equal(r.route, ROUTES.CONTINUE);
  assert.equal(r.reason, "medium-not-falling");
  assert.deepEqual(r.mediumSequence, [2, 1, 2]);
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
      budgetSpent: true,
      lastCycleAction: FIX,
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
      budgetSpent: true,
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

  const gl = classifyLoopRoute({
    cycle: 5,
    highCounts: [0, 0, 0, 0, 0],
    mediumCounts: [5, 4, 3, 2],
    latestGateContent: fixture("medium-falling-cycle5.yml"),
    budgetSpent: true,
    lastCycleAction: FIX,
  });
  const glMsg = describeLoopRoute(gl);
  assert.match(glMsg, /^Gate-the-last-fix half-cycle granted — /);
  assert.match(glMsg, /MEDIUM falling 3 → 2 → 1/);
  assert.match(glMsg, /NOT an exit and NOT an escalation/);

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
