// ---------------------------------------------------------------------------
// qa-narrowing-residue.test.mjs
// ---------------------------------------------------------------------------
// The fixture table for the narrowing-residue signal (task.148, obs #172).
//
// `classifyNarrowingResidue` is a predicate over (cycle, HIGH sequence, cycle
// N's gate, cycle N-1's gate) → {signal, reason}. It is an OFFER to qa-fix
// Step 2.6, never a route; `qa-loop-route.test.mjs` pins that the route
// classifier is unchanged on the same shape. The table below IS the spec: the
// loop document's "Narrowing-residue offer" is written from these rows.
//
// Rules the rows pin, and which mutation each guards:
//
//   1. It fires on task.143 at cycles 2, 3 and 6 and at no other cycle
//      (rows 1–7). Widen the window to 3 gates and row 5 goes red.
//   2. HIGH is an input and HIGH present declines (row 8). Drop the HIGH
//      condition and row 8 goes red.
//   3. One file, not "mostly one file" (rows 10, 14). Allow two files and
//      rows 10 and 14 go red.
//   4. Positive evidence only: a MEDIUM with no `file:` declines (row 11).
//   5. RAISED counts, not open (row 12). Count open entries only and row 12
//      goes red — every mature gate is updated in place, so open-only reads
//      the real run as empty.
//   6. The documented false positive fires (row 9, task.117 gates 1→2). That
//      is why the signal is an offer whose menu includes `patch`.
//   7. Never throws; the describer names the file and both cycles.
//
// Run: node --test shared/resources/tests/qa-narrowing-residue.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = join(__dirname, "..", "qa-diminishing-returns.js");
const FIXTURES = join(__dirname, "fixtures", "qa-narrowing-residue");

const {
  classifyNarrowingResidue,
  describeNarrowingResidue,
  classifyLoopRoute,
} = require(MODULE_PATH);

const fx = (name) => readFileSync(join(FIXTURES, name), "utf8");
const t143 = (n) => fx(`task143-gate-${n}.yml`);
const t117 = (n) => fx(`task117-gate-${n}.yml`);
const zeros = (n) => Array.from({ length: n }, () => 0);

const UAT = "skills/qa-next/scripts/uat-status.mjs";
const QA_NEXT_SKILL = "skills/qa-next/SKILL.md";

// ── the fixture table ───────────────────────────────────────────────────────

const ROWS = [
  // ── task.143, the run the rule was derived from ──
  {
    label: "row 1 — task.143 gates 1→2, cycle 2: fires on uat-status.mjs",
    input: {
      cycle: 2,
      highCounts: zeros(2),
      previousGateContent: t143(1),
      latestGateContent: t143(2),
    },
    signal: true,
    reason: "narrowing-residue",
    file: UAT,
  },
  {
    label: "row 2 — task.143 gates 2→3, cycle 3: fires",
    input: {
      cycle: 3,
      highCounts: zeros(3),
      previousGateContent: t143(2),
      latestGateContent: t143(3),
    },
    signal: true,
    reason: "narrowing-residue",
    file: UAT,
  },
  {
    label: "row 3 — task.143 gates 3→4, cycle 4: gate 4 raised no MEDIUM",
    input: {
      cycle: 4,
      highCounts: zeros(4),
      previousGateContent: t143(3),
      latestGateContent: t143(4),
    },
    signal: false,
    reason: "no-medium",
  },
  {
    label: "row 4 — task.143 gates 4→5, cycle 5: gate 4 raised no MEDIUM",
    input: {
      cycle: 5,
      highCounts: zeros(5),
      previousGateContent: t143(4),
      latestGateContent: t143(5),
    },
    signal: false,
    reason: "no-medium",
  },
  {
    label:
      "row 5 — task.143 gates 5→6, cycle 6: fires on qa-next SKILL.md (a 3-gate window misses it)",
    input: {
      cycle: 6,
      highCounts: zeros(6),
      previousGateContent: t143(5),
      latestGateContent: t143(6),
    },
    signal: true,
    reason: "narrowing-residue",
    file: QA_NEXT_SKILL,
  },
  {
    label: "row 6 — task.143 gates 6→7, cycle 7: gate 7 raised no MEDIUM",
    input: {
      cycle: 7,
      highCounts: zeros(7),
      previousGateContent: t143(6),
      latestGateContent: t143(7),
    },
    signal: false,
    reason: "no-medium",
  },
  {
    label: "row 7 — task.143 gate 1 only, cycle 1: below the cycle floor",
    input: {
      cycle: 1,
      highCounts: zeros(1),
      previousGateContent: null,
      latestGateContent: t143(1),
    },
    signal: false,
    reason: "below-cycle-floor",
  },
  {
    label:
      "row 8 — task.143 gates 1→2 with HIGH [1, 0]: HIGH is an input and HIGH present declines",
    input: {
      cycle: 2,
      highCounts: [1, 0],
      previousGateContent: t143(1),
      latestGateContent: t143(2),
    },
    signal: false,
    reason: "high-findings-remain",
  },
  // ── task.117, the documented false positive ──
  {
    label:
      "row 9 — task.117 gates 1→2, cycle 2: fires on the deliverable (the answer there is patch)",
    input: {
      cycle: 2,
      highCounts: zeros(2),
      previousGateContent: t117(1),
      latestGateContent: t117(2),
    },
    signal: true,
    reason: "narrowing-residue",
    file: "shared/resources/jira-sync.js",
  },
  {
    label: "row 10 — task.117 gates 2→3, cycle 3: gate 3 adds a second file",
    input: {
      cycle: 3,
      highCounts: zeros(3),
      previousGateContent: t117(2),
      latestGateContent: t117(3),
    },
    signal: false,
    reason: "medium-files-differ",
  },
  // ── synthetic, one condition each ──
  {
    label: "row 11 — a MEDIUM with no file: declines on missing evidence",
    input: {
      cycle: 2,
      highCounts: zeros(2),
      previousGateContent: fx("medium-no-file.yml"),
      latestGateContent: fx("medium-no-file.yml"),
    },
    signal: false,
    reason: "medium-file-missing",
  },
  {
    label:
      "row 12 — MEDIUMs all status: closed still fire (raised, not open, is what counts)",
    input: {
      cycle: 2,
      highCounts: zeros(2),
      previousGateContent: fx("medium-closed.yml"),
      latestGateContent: fx("medium-closed.yml"),
    },
    signal: true,
    reason: "narrowing-residue",
    file: "skills/example/scripts/derive.mjs",
  },
  {
    label: "row 13 — latest gate null: gate-unreadable",
    input: {
      cycle: 2,
      highCounts: zeros(2),
      previousGateContent: t143(1),
      latestGateContent: null,
    },
    signal: false,
    reason: "gate-unreadable",
  },
  {
    label: "row 14 — two files within one gate: medium-files-differ",
    input: {
      cycle: 2,
      highCounts: zeros(2),
      previousGateContent: fx("medium-two-files.yml"),
      latestGateContent: fx("medium-two-files.yml"),
    },
    signal: false,
    reason: "medium-files-differ",
  },
  {
    label: "row 15 — highCounts shorter than the cycle: high-counts-missing",
    input: {
      cycle: 3,
      highCounts: [0, 0],
      previousGateContent: t143(2),
      latestGateContent: t143(3),
    },
    signal: false,
    reason: "high-counts-missing",
  },
];

for (const row of ROWS) {
  test(row.label, () => {
    const r = classifyNarrowingResidue(row.input);
    assert.equal(r.signal, row.signal, `signal: ${JSON.stringify(r)}`);
    assert.equal(r.reason, row.reason, `reason: ${JSON.stringify(r)}`);
    if (row.file !== undefined)
      assert.equal(r.file, row.file, `file: ${JSON.stringify(r)}`);
  });
}

// ── the whole task.143 run, as the loop would see it ────────────────────────

test("over task.143's seven gates the signal fires at cycles 2, 3 and 6 and nowhere else", () => {
  const fired = [];
  for (let c = 1; c <= 7; c++) {
    const r = classifyNarrowingResidue({
      cycle: c,
      highCounts: zeros(c),
      latestGateContent: t143(c),
      previousGateContent: c > 1 ? t143(c - 1) : null,
    });
    if (r.signal) fired.push(c);
  }
  assert.deepEqual(fired, [2, 3, 6]);
});

test("a firing result carries the MEDIUM ids in gate order, previous gate first, and both cycles", () => {
  const r = classifyNarrowingResidue({
    cycle: 2,
    highCounts: [0, 0],
    previousGateContent: fx("medium-closed.yml"),
    latestGateContent: fx("medium-closed.yml"),
  });
  assert.deepEqual(r.ids, ["MC-001", "MC-002", "MC-001", "MC-002"]);
  assert.deepEqual(r.cycles, [1, 2]);
});

// ── an offer, not a route ───────────────────────────────────────────────────

test("classifyLoopRoute's result is the same whether or not the signal fires (it is not a route)", () => {
  const input = {
    cycle: 3,
    highCounts: [0, 0, 0],
    latestGateContent: t143(3),
    testArtifactGlobs: [],
  };
  const signal = classifyNarrowingResidue({
    ...input,
    previousGateContent: t143(2),
  });
  assert.equal(signal.signal, true);
  assert.equal(classifyLoopRoute(input).route, "continue");
});

// ── never throws; the describer is assertable ───────────────────────────────

test("never throws on the shapes a pipeline produces on a bad day", () => {
  const inputs = [
    undefined,
    null,
    {},
    { cycle: 2 },
    { cycle: 2, highCounts: "0,0" },
    { cycle: 2, highCounts: { 0: 0, 1: 0 } },
    {
      cycle: "2",
      highCounts: [0, 0],
      latestGateContent: "",
      previousGateContent: "",
    },
    {
      cycle: 2,
      highCounts: [0, 0],
      latestGateContent: 42,
      previousGateContent: [],
    },
  ];
  for (const input of inputs) {
    const r = classifyNarrowingResidue(input);
    assert.equal(r.signal, false, JSON.stringify(input));
    assert.equal(typeof r.reason, "string");
    assert.equal(typeof describeNarrowingResidue(r), "string");
  }
});

test("describeNarrowingResidue names the file and the two cycles, and says it is an offer", () => {
  const r = classifyNarrowingResidue({
    cycle: 3,
    highCounts: [0, 0, 0],
    previousGateContent: t143(2),
    latestGateContent: t143(3),
  });
  const msg = describeNarrowingResidue(r);
  assert.match(msg, /skills\/qa-next\/scripts\/uat-status\.mjs/);
  assert.match(msg, /gates 2 and 3/);
  assert.match(
    msg,
    /OFFER to qa-fix Step 2\.6, not a route and not an escalation/,
  );

  const no = classifyNarrowingResidue({
    cycle: 1,
    highCounts: [0],
    latestGateContent: t143(1),
  });
  assert.match(
    describeNarrowingResidue(no),
    /^Narrowing residue: not signalled \(below-cycle-floor\)/,
  );
  assert.match(describeNarrowingResidue(undefined), /no verdict/);
});
