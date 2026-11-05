// ---------------------------------------------------------------------------
// accept-qa-residual.test.mjs
// ---------------------------------------------------------------------------
// The acceptance writer (task.251, obs #115, #150): an owner's acceptance of a QA
// loop-limit residual is recorded in the highest gate (WAIVED, findings `waived`)
// and in the implementation report (the cycle entry on the accepting route).
//
// Every fixture lives in a temp root under os.tmpdir(), never in the repository
// (task.250). Groups:
//
//   1. Happy path, modelled on task.250's gate before its hand edit.
//   2. Control (obs #176): a gate unlike task.250 in every dimension the rule
//      reads — a resolved entry, a status-less one, a flow-style `status: open`,
//      a flow-style waiver. Only the open entries are stamped.
//   3. Refusals, each byte-identical afterwards.
//   4. Idempotence and the Stop between the two writes.
//   5. Reconstruction states 3 and 6 (the task's Phase 1 list).
//   6. CLI exit codes.
//
// Mutations this suite must catch (task Success Criteria, Code quality):
//   M1 delete the FAIL refusal             → "refuses a FAIL gate" goes red
//   M2 skip stamping `status: waived`      → "task.250 shape" and "control" go red
//   M3 skip the report rewrite             → "task.250 shape" goes red
// ---------------------------------------------------------------------------

import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { spawnBudget } from "../spawn-budget.mjs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(__dirname, "..", "accept-qa-residual.js");
const { acceptResidual, planGateEdit, planReportEdit } = require(ENGINE);
const { readTopIssues, readGateToken, isOpen } = require(
  join(__dirname, "..", "qa-diminishing-returns.js"),
);

const NOW = new Date("2026-11-03T06:00:00Z");
const OPTS = {
  approvedBy: "Owner Name",
  reason: "residual accepted at the loop-limit escalation",
};

// task.250's gate.5 as it stood before the hand edit (commit 2b696725), trimmed to the
// keys the writer reads and must leave alone.
const GATE_250 = `schema: 1
story: '250'
story_title: 'Security probe scratch out of tree'
gate: CONCERNS
status_reason: 'Two findings remain.'
reviewer: 'Quinn (Test Architect)'
head: '51ca2fdb02822a341bd3bb21a0de8e2a9153bfd6'
updated: '2026-11-02T19:43:02Z'

top_issues:
  - id: 'TASK-250-CR5-1'
    severity: medium
    finding: 'a nested template literal re-splits a write call'
    suggested_action: 'tighten the guard'
    status: open
  - id: 'TASK-250-CR5-2'
    severity: low
    finding: 'the regex tripwire ignores a phantom regex'
    suggested_action: 'widen the tripwire'
    status: open

waiver:
  active: false

nfr_validation:
  security:
    status: PASS
`;

const REPORT = (action, extra = "") => `# Implementation Report: example

**Status**: In Progress

---

## Decisions Log

### Pipeline Startup — 2026-11-02

- startup line

---

## Issues Log

_none_

---

## QA Iteration History

### QA Cycle 4 — 2026-11-02
**Gate Result**: CONCERNS
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)

### QA Cycle 5 — 2026-11-02
**Gate Result**: CONCERNS (90/100)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: ${action}
${extra}
---

### QA Loop Limit Reached — 2026-11-02

Escalation text the writer must not touch.

---

## Completion
`;

function fixture(gate, report, gateName = "task.42.gate.5.example.yml") {
  const root = mkdtempSync(join(tmpdir(), "t251-"));
  const doc = join(root, "doc");
  mkdirSync(doc);
  if (gate !== null) writeFileSync(join(doc, gateName), gate);
  const rep = join(doc, "task.42.implementation.1.example.md");
  writeFileSync(rep, report);
  return { root, doc, gate: join(doc, gateName), report: rep };
}

function run(fx, extra = {}) {
  return acceptResidual({
    docDir: fx.doc,
    report: fx.report,
    now: NOW,
    ...OPTS,
    ...extra,
  });
}

const read = (p) => readFileSync(p, "utf8");

// ─── 1. happy path ──────────────────────────────────────────────────────────

test("task.250 shape: CONCERNS + two open → WAIVED, both waived, head unchanged, report on the accepting route", () => {
  const fx = fixture(GATE_250, REPORT("Escalating — loop limit reached"));
  try {
    const r = run(fx);
    assert.equal(r.reason, "accepted");
    assert.equal(r.exitCode, 0);
    assert.deepEqual(r.waived, ["TASK-250-CR5-1", "TASK-250-CR5-2"]);
    const g = read(fx.gate);
    assert.equal(readGateToken(g), "WAIVED");
    const issues = readTopIssues(g);
    assert.equal(issues.length, 2);
    assert.equal(
      issues.filter(isOpen).length,
      0,
      "no open entry after the write",
    );
    assert.deepEqual(
      issues.map((e) => e.status),
      ["waived", "waived"],
    );
    assert.match(g, /^head: '51ca2fdb02822a341bd3bb21a0de8e2a9153bfd6'$/m);
    assert.match(g, /^updated: '2026-11-03T06:00:00Z'$/m);
    assert.match(
      g,
      /^waiver:\n {2}active: true\n {2}reason: 'residual accepted at the loop-limit escalation'\n {2}approved_by: 'Owner Name'\n {2}approved_at: '2026-11-03'$/m,
    );
    // Every line the writer does not own is byte-identical.
    for (const keep of [
      "status_reason: 'Two findings remain.'",
      "nfr_validation:",
      "    status: PASS",
      "    suggested_action: 'tighten the guard'",
    ])
      assert.ok(g.includes(keep), `kept: ${keep}`);
    const rep = read(fx.report);
    const cycle5 = rep.slice(
      rep.indexOf("### QA Cycle 5"),
      rep.indexOf("### QA Loop Limit Reached"),
    );
    assert.match(
      cycle5,
      /^\*\*Action\*\*: Proceeding to 5c \(PR conformance review\)$/m,
    );
    assert.match(
      cycle5,
      /^\*\*Loop exit\*\*: residual accepted by Owner Name on 2026-11-03 \(accept-qa-residual\)$/m,
    );
    assert.match(
      cycle5,
      /^\*\*PR Review\*\*: not reached — gate did not exit the loop$/m,
      "PR Review row untouched",
    );
    assert.match(
      rep,
      /### QA Loop Limit Reached — 2026-11-02\n\nEscalation text the writer must not touch\./,
    );
    assert.match(
      rep,
      /^\*\*Action\*\*: Running qa-fix \(cycle 4 of 5\)$/m,
      "cycle 4 untouched",
    );
    const dl = rep.slice(
      rep.indexOf("## Decisions Log"),
      rep.indexOf("## Issues Log"),
    );
    assert.match(
      dl,
      /^- QA residual accepted at the loop-limit escalation \(cycle 5\): gate\.5 recorded as WAIVED \(TASK-250-CR5-1, TASK-250-CR5-2\); approved by Owner Name on 2026-11-03/m,
    );
    assert.equal((rep.match(/QA residual accepted/g) || []).length, 1);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

// ─── 2. control (obs #176) ──────────────────────────────────────────────────

const GATE_CONTROL = `gate: CONCERNS
head: "deadbeef"
updated: "2026-11-01T00:00:00Z"
top_issues:
  - id: R-1
    severity: high
    finding: "already fixed"
    status: resolved
  - id: N-2
    severity: medium
    finding: |
      a block scalar
      over two lines
  - { id: F-3, severity: low, status: open }
  - { id: F-4, severity: low }
waiver: { active: false }
`;

test("control: only open entries are stamped; a resolved entry is byte-identical; flow styles handled", () => {
  const fx = fixture(GATE_CONTROL, REPORT("Escalating — loop limit reached"));
  try {
    const r = run(fx);
    assert.equal(r.reason, "accepted");
    assert.deepEqual(r.waived, ["N-2", "F-3", "F-4"]);
    const g = read(fx.gate);
    const issues = readTopIssues(g);
    assert.deepEqual(
      issues.map((e) => [e.id, e.status]),
      [
        ["R-1", "resolved"],
        ["N-2", "waived"],
        ["F-3", "waived"],
        ["F-4", "waived"],
      ],
    );
    assert.ok(
      g.includes(
        '  - id: R-1\n    severity: high\n    finding: "already fixed"\n    status: resolved\n',
      ),
      "resolved entry byte-identical",
    );
    assert.ok(
      g.includes(
        "      a block scalar\n      over two lines\n    status: waived\n",
      ),
      "status inserted after the block scalar, at the key indent",
    );
    assert.ok(g.includes("  - { id: F-3, severity: low, status: waived }"));
    assert.ok(g.includes("  - { id: F-4, severity: low, status: waived }"));
    assert.match(
      g,
      /^updated: "2026-11-03T06:00:00Z"$/m,
      "double-quote style kept",
    );
    assert.match(g, /^head: "deadbeef"$/m);
    assert.ok(!g.includes("{ active: false }"), "flow waiver replaced");
    assert.match(g, /^waiver:\n {2}active: true$/m);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

// ─── 3. refusals: byte-identical afterwards ─────────────────────────────────

function refuses(name, gate, action, want, opts = {}) {
  test(`refuses: ${name} → ${want}, nothing written`, () => {
    const fx = fixture(gate, REPORT(action), opts.gateName);
    try {
      const before = gate === null ? null : read(fx.gate);
      const repBefore = read(fx.report);
      const r = run(fx);
      assert.equal(r.reason, want);
      assert.equal(r.exitCode, 1);
      if (before !== null) assert.equal(read(fx.gate), before);
      assert.equal(read(fx.report), repBefore);
      assert.deepEqual(
        readdirSync(fx.doc).filter((f) => f.includes(".tmp.")),
        [],
      );
    } finally {
      rmSync(fx.root, { recursive: true, force: true });
    }
  });
}

refuses(
  "a FAIL gate",
  GATE_250.replace("gate: CONCERNS", "gate: FAIL"),
  "Escalating — loop limit reached",
  "fail-gate",
);
refuses(
  "an unreadable verdict",
  GATE_250.replace("gate: CONCERNS\n", ""),
  "Escalating — loop limit reached",
  "unreadable-gate",
);
refuses(
  "a not-converging escalation",
  GATE_250,
  "Escalating — loop not converging",
  "no-loop-limit",
);
refuses(
  "a run that never escalated",
  GATE_250,
  "Running qa-fix (cycle 5 of 5)",
  "no-loop-limit",
);
refuses("no gate on disk", null, "Escalating — loop limit reached", "no-gate");
refuses(
  "a PASS gate with no open entry",
  GATE_250.replace("gate: CONCERNS", "gate: PASS").replace(
    /status: open/g,
    "status: resolved",
  ),
  "Escalating — loop limit reached",
  "nothing-to-accept",
);
refuses(
  "a report with no entry for the highest gate",
  GATE_250,
  "Escalating — loop limit reached",
  "no-report-entry",
  {
    gateName: "task.42.gate.6.example.yml",
  },
);

test("refuses: the earlier escalation was not-converging, under a back-filled entry → no-loop-limit", () => {
  const backfilled = REPORT("Escalating — loop not converging").replace(
    "\n### QA Loop Limit Reached",
    "### QA Cycle 6 — 2026-11-03\n**Origin**: run outside the loop (operator)\n**Gate Result**: CONCERNS\n**Loop exit**: n/a — this exit not taken\n**Action**: Running qa-fix (cycle 6 of 5)\n\n---\n\n### QA Loop Limit Reached",
  );
  const fx = fixture(GATE_250, backfilled, "task.42.gate.6.example.yml");
  try {
    const before = read(fx.gate);
    const r = run(fx);
    assert.equal(r.reason, "no-loop-limit");
    assert.equal(read(fx.gate), before);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

// ─── 4. idempotence ─────────────────────────────────────────────────────────

test("a second run returns already and changes no byte", () => {
  const fx = fixture(GATE_250, REPORT("Escalating — loop limit reached"));
  try {
    assert.equal(run(fx).reason, "accepted");
    const g = read(fx.gate);
    const rep = read(fx.report);
    const r = run(fx, { now: new Date("2026-11-04T00:00:00Z") });
    assert.equal(r.reason, "already");
    assert.equal(r.exitCode, 0);
    assert.equal(read(fx.gate), g);
    assert.equal(read(fx.report), rep);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

test("a Stop between the gate write and the report write: the re-run finishes the report (accepted)", () => {
  const fx = fixture(GATE_250, REPORT("Escalating — loop limit reached"));
  try {
    // Simulate the gate half having landed: write the planned gate, leave the report.
    const plan = planGateEdit(GATE_250, {
      ...OPTS,
      timestamp: "2026-11-03T06:00:00Z",
      date: "2026-11-03",
    });
    assert.equal(plan.state, "edit");
    writeFileSync(fx.gate, plan.content);
    const g = read(fx.gate);
    const r = run(fx);
    assert.equal(r.reason, "accepted");
    assert.equal(r.gateWritten, false);
    assert.equal(r.reportWritten, true);
    assert.equal(read(fx.gate), g, "the finished gate is not rewritten");
    assert.match(
      read(fx.report),
      /^\*\*Action\*\*: Proceeding to 5c \(PR conformance review\)$/m,
    );
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

// ─── 5. reconstruction states ───────────────────────────────────────────────

test("state 3: a back-filled operator entry on the highest gate after a loop-limit escalation is accepted; gate N is untouched", () => {
  const backfilled = REPORT("Escalating — loop limit reached").replace(
    "\n### QA Loop Limit Reached",
    "### QA Cycle 6 — 2026-11-03\n**Origin**: run outside the loop (operator)\n**Gate Result**: CONCERNS\n**Loop exit**: n/a — this exit not taken\n**Action**: Running qa-fix (cycle 6 of 5)\n\n---\n\n### QA Loop Limit Reached",
  );
  const fx = fixture(GATE_250, backfilled, "task.42.gate.6.example.yml");
  try {
    const gate5 = join(fx.doc, "task.42.gate.5.example.yml");
    writeFileSync(gate5, GATE_250);
    const r = run(fx);
    assert.equal(r.reason, "accepted");
    assert.equal(r.cycle, 6);
    assert.equal(read(gate5), GATE_250, "gate 5 byte-identical");
    assert.equal(readGateToken(read(fx.gate)), "WAIVED");
    const rep = read(fx.report);
    const c5 = rep.slice(
      rep.indexOf("### QA Cycle 5"),
      rep.indexOf("### QA Cycle 6"),
    );
    const c6 = rep.slice(
      rep.indexOf("### QA Cycle 6"),
      rep.indexOf("### QA Loop Limit Reached"),
    );
    assert.match(
      c5,
      /^\*\*Action\*\*: Escalating — loop limit reached$/m,
      "cycle 5 untouched",
    );
    assert.match(
      c6,
      /^\*\*Action\*\*: Proceeding to 5c \(PR conformance review\)$/m,
    );
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

test("state 6: a re-escalation after an acceptance rewrites the report only and adds a second Decisions Log line", () => {
  const fx = fixture(GATE_250, REPORT("Escalating — loop limit reached"));
  try {
    assert.equal(run(fx).reason, "accepted");
    const g = read(fx.gate);
    // 5c returned REQUEST CHANGES on a spent budget: the Loop limit trigger re-escalates cycle 5.
    writeFileSync(
      fx.report,
      read(fx.report).replace(
        "**Action**: Proceeding to 5c (PR conformance review)",
        "**Action**: Escalating — loop limit reached",
      ),
    );
    const r = run(fx, {
      reason: "5c findings in task.42.pr-review.1.example.md accepted",
    });
    assert.equal(r.reason, "accepted");
    assert.equal(r.gateWritten, false);
    assert.equal(r.reportWritten, true);
    assert.equal(read(fx.gate), g, "the WAIVED gate is left alone");
    const rep = read(fx.report);
    assert.equal((rep.match(/^- QA residual accepted/gm) || []).length, 2);
    assert.match(
      rep,
      /5c findings in task\.42\.pr-review\.1\.example\.md accepted/,
    );
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

test("planReportEdit: an entry already moved by hand (task.250's improvised text) is not mistaken for this writer's", () => {
  const hand = REPORT(
    "Escalating — loop limit reached → residual accepted by the user; Proceeding to 5c",
  );
  const p = planReportEdit(hand, 5, {
    ...OPTS,
    date: "2026-11-03",
    waived: [],
  });
  assert.equal(
    p.state,
    "edit",
    "the hand-written suffix still starts with the loop-limit Action",
  );
});

// ─── 6. CLI ─────────────────────────────────────────────────────────────────

test("CLI: empty --approved-by exits 2 (usage); accepted exits 0 with JSON", () => {
  const fx = fixture(GATE_250, REPORT("Escalating — loop limit reached"));
  try {
    const bad = spawnSync(
      process.execPath,
      [
        ENGINE,
        "--doc-dir",
        fx.doc,
        "--report",
        fx.report,
        "--approved-by",
        " ",
        "--reason",
        "r",
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(bad.status, 2);
    assert.equal(JSON.parse(bad.stdout).reason, "usage");
    const ok = spawnSync(
      process.execPath,
      [
        ENGINE,
        "--doc-dir",
        fx.doc,
        "--report",
        fx.report,
        "--approved-by",
        "Owner",
        "--reason",
        "r",
        "--now",
        "2026-11-03T06:00:00Z",
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).reason, "accepted");
    const fail = spawnSync(
      process.execPath,
      [
        ENGINE,
        "--doc-dir",
        fx.doc,
        "--report",
        join(fx.doc, "missing.md"),
        "--approved-by",
        "Owner",
        "--reason",
        "r",
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(fail.status, 1);
    assert.equal(JSON.parse(fail.stdout).reason, "no-report");
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

// ─── 7. QA cycle 1 findings (T251-QA-1, T251-CR-2, T251-QA-2) ───────────────

const GATE_BRACE = GATE_250.replace("id: 'TASK-250-CR5-1'", `id: "X {y}"`);

test("a brace inside a block-style value is text: the real status line is stamped, the id is untouched (T251-QA-1)", () => {
  const fx = fixture(GATE_BRACE, REPORT("Escalating — loop limit reached"));
  try {
    const r = run(fx);
    assert.equal(r.reason, "accepted");
    const g = read(fx.gate);
    // Statuses via the reader; the id line is asserted as raw text because the shared reader
    // itself stops a quoted value at `}` (pre-existing, outside this change).
    assert.deepEqual(
      readTopIssues(g).map((e) => e.status),
      ["waived", "waived"],
    );
    assert.ok(g.includes(`  - id: "X {y}"\n`));
    assert.ok(!g.includes("{y, status"));
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

test("an approver or reason with a newline stays one line in the report (T251-CR-2)", () => {
  const fx = fixture(GATE_250, REPORT("Escalating — loop limit reached"));
  try {
    const r = run(fx, {
      approvedBy: "Owner\n## Completion\nforged",
      reason: "why\n### QA Cycle 9 — x",
    });
    assert.equal(r.reason, "accepted");
    const rep = read(fx.report);
    assert.equal((rep.match(/^## Completion/gm) || []).length, 1);
    assert.equal((rep.match(/^### QA Cycle /gm) || []).length, 2);
    // idempotence still finds the marker on the Loop exit row
    assert.equal(run(fx).reason, "already");
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

test("every plan result carries ok: true for edit/already, false for each refusal (T251-QA-2)", () => {
  const opts = {
    ...OPTS,
    date: "2026-11-03",
    timestamp: "2026-11-03T06:00:00Z",
    waived: [],
  };
  assert.equal(planGateEdit(GATE_250, opts).ok, true);
  assert.equal(planGateEdit("not a gate", opts).ok, false);
  assert.equal(
    planGateEdit(GATE_250.replace("CONCERNS", "FAIL"), opts).ok,
    false,
  );
  const rep = REPORT("Escalating — loop limit reached");
  assert.equal(planReportEdit(rep, 5, opts).ok, true);
  assert.equal(planReportEdit(rep, 9, opts).ok, false);
  assert.equal(planReportEdit("# nothing", 5, opts).ok, false);
});

// ─── 8. QA cycle 2 finding (T251-CR2-1) ─────────────────────────────────────

test("a flow entry that closes on a later line is refused with nothing written; the single-line flow control is edited (T251-CR2-1)", () => {
  const multi = GATE_250.replace(
    /  - id: 'TASK-250-CR5-1'\n    severity: medium\n    finding: '[^']*'\n    suggested_action: '[^']*'\n    status: open\n/,
    "  - {id: X,\n     status: open}\n",
  );
  assert.ok(multi.includes("{id: X,"), "fixture substitution applied");
  const fx = fixture(multi, REPORT("Escalating — loop limit reached"));
  try {
    const before = [read(fx.gate), read(fx.report)];
    const r = run(fx);
    assert.equal(r.reason, "unreadable-gate");
    assert.deepEqual([read(fx.gate), read(fx.report)], before);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
  const single = GATE_250.replace(
    /  - id: 'TASK-250-CR5-1'\n    severity: medium\n    finding: '[^']*'\n    suggested_action: '[^']*'\n    status: open\n/,
    "  - {id: X, status: open}\n",
  );
  const fy = fixture(single, REPORT("Escalating — loop limit reached"));
  try {
    assert.equal(run(fy).reason, "accepted");
    assert.ok(read(fy.gate).includes("  - {id: X, status: waived}\n"));
  } finally {
    rmSync(fy.root, { recursive: true, force: true });
  }
});

// ─── 9. QA cycle 3 finding (T251-CR3-1): one flow extent, used by refusal and edit ──

const FLOW_ENTRY =
  /  - id: 'TASK-250-CR5-1'\n    severity: medium\n    finding: '[^']*'\n    suggested_action: '[^']*'\n    status: open\n/;
const withFlow = (entry) => {
  const g = GATE_250.replace(FLOW_ENTRY, entry + "\n");
  assert.ok(g.includes(entry.split("\n")[0]), "fixture substitution applied");
  return g;
};

test("flowSpan: one definition of the extent (balanced, nested, quoted, comment, junk, block style)", () => {
  const { flowSpan } = require(ENGINE);
  assert.equal(flowSpan("  - id: 'X {y}'"), null);
  assert.equal(flowSpan("  - id: X"), null);
  const one = flowSpan("  - {id: X, status: open}");
  assert.deepEqual([one.open, one.close, one.commas.length], [4, 24, 1]);
  assert.equal(
    flowSpan("  - {id: X, a: {b: 1}, status: open}").commas.length,
    2,
  );
  assert.equal(flowSpan('  - {id: "a, }b", status: open}').commas.length, 1);
  assert.equal(flowSpan("  - {id: X, status: open} # done }").close, 24);
  for (const bad of [
    "  - {id: X,",
    "  - {id: X, a: {b: 1},",
    "  - {id: X, # note }",
    "  - {id: X} trailing",
    '  - {id: "unclosed',
  ])
    assert.equal(flowSpan(bad).unbalanced, true, bad);
});

for (const [name, entry] of [
  [
    "nested map, outer closes later",
    "  - {id: X, a: {b: 1},\n     status: open}",
  ],
  [
    "closing brace in a trailing comment",
    "  - {id: X, # note }\n     status: open}",
  ],
  ["junk after the close", "  - {id: X, status: open} trailing"],
  // The edit itself is right (a top-level status is appended), but the shared reader would still
  // read the nested `status: open` as the entry's status, so the writer's own read-back refuses
  // and nothing is written. Safe direction.
  [
    "a status only inside a nested map (the shared reader would still read it as open)",
    "  - {id: X, a: {status: open}}",
  ],
]) {
  test(`refuses a flow entry the extent scanner cannot read: ${name}`, () => {
    const fx = fixture(
      withFlow(entry),
      REPORT("Escalating — loop limit reached"),
    );
    try {
      const before = [read(fx.gate), read(fx.report)];
      assert.equal(run(fx).reason, "unreadable-gate");
      assert.deepEqual([read(fx.gate), read(fx.report)], before);
    } finally {
      rmSync(fx.root, { recursive: true, force: true });
    }
  });
}

for (const [name, entry, want] of [
  [
    "nested map on one line: only the top-level status is edited",
    "  - {id: X, a: {b: 1}, status: open}",
    "  - {id: X, a: {b: 1}, status: waived}\n",
  ],
  [
    "a status inside a quoted string is left alone",
    `  - {id: "status: open, x", status: open}`,
    `  - {id: "status: open, x", status: waived}\n`,
  ],
  [
    "a trailing comment is kept",
    "  - {id: X, status: open} # keep",
    "  - {id: X, status: waived} # keep\n",
  ],
]) {
  test(`edits a flow entry the scanner reads: ${name}`, () => {
    const fx = fixture(
      withFlow(entry),
      REPORT("Escalating — loop limit reached"),
    );
    try {
      assert.equal(run(fx).reason, "accepted");
      assert.ok(read(fx.gate).includes(want), read(fx.gate));
    } finally {
      rmSync(fx.root, { recursive: true, force: true });
    }
  });
}

// ─── 10. QA cycle 4 findings (T251-CR4-1, T251-CR4-2): the status key may be quoted or repeated ──

test("every copy of a repeated top-level status key is waived (T251-CR4-2)", () => {
  const fx = fixture(
    withFlow("  - {id: X, status: open, status: open}"),
    REPORT("Escalating — loop limit reached"),
  );
  try {
    assert.equal(run(fx).reason, "accepted");
    const gate = read(fx.gate);
    assert.ok(
      gate.includes("  - {id: X, status: waived, status: waived}\n"),
      gate,
    );
    assert.ok(
      !/open/.test(gate.split("top_issues:")[1].split("waiver:")[0]),
      "no open status remains",
    );
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

// A quoted key is the entry's status, but the shared reader (readKeysInto) does not read it as
// one, so the writer's own read-back cannot confirm the edit and refuses. Refusing with nothing
// written is the safe outcome; what must never happen is `accepted` over an entry that still
// reads open, or a second `status` key appended beside the quoted one (T251-CR4-1).
for (const [name, entry] of [
  ["double-quoted", `  - {id: X, "status": open}`],
  ["single-quoted", `  - {id: X, 'status': open}`],
]) {
  test(`a ${name} status key in a flow entry is refused with nothing written (T251-CR4-1)`, () => {
    const fx = fixture(
      withFlow(entry),
      REPORT("Escalating — loop limit reached"),
    );
    try {
      const before = [read(fx.gate), read(fx.report)];
      assert.notEqual(run(fx).reason, "accepted");
      assert.deepEqual([read(fx.gate), read(fx.report)], before);
    } finally {
      rmSync(fx.root, { recursive: true, force: true });
    }
  });
}

// ─── 7. advisories closed after task.251 ────────────────────────────────────

test("a re-run that finds the gate already WAIVED says so in the audit line, not 'none newly waived'", () => {
  const fx = fixture(GATE_250, REPORT("Escalating — loop limit reached"));
  try {
    const plan = planGateEdit(GATE_250, {
      ...OPTS,
      timestamp: "2026-11-03T06:00:00Z",
      date: "2026-11-03",
    });
    writeFileSync(fx.gate, plan.content);
    assert.equal(run(fx).reason, "accepted");
    const rep = read(fx.report);
    assert.match(rep, /the gate was already WAIVED by an earlier run/);
    assert.doesNotMatch(rep, /none newly waived/);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

test("a hung qa-cycle.sh is cut off by the timeout and the writer refuses with nothing written", () => {
  const fx = fixture(GATE_250, REPORT("Escalating — loop limit reached"));
  const bin = mkdtempSync(join(tmpdir(), "t251-bin-"));
  try {
    // A copy of the engine beside a qa-cycle.sh that never returns.
    const src = join(__dirname, "..");
    for (const f of [
      "accept-qa-residual.js",
      "qa-diminishing-returns.js",
      "glob-match.js",
    ])
      writeFileSync(join(bin, f), read(join(src, f)));
    writeFileSync(join(bin, "qa-cycle.sh"), "#!/bin/bash\nsleep 30\n");
    const gate = read(fx.gate);
    const rep = read(fx.report);
    const r = spawnSync(
      process.execPath,
      [
        join(bin, "accept-qa-residual.js"),
        "--doc-dir",
        fx.doc,
        "--report",
        fx.report,
        "--approved-by",
        "Test Owner",
        "--reason",
        "timeout probe",
        "--json",
      ],
      {
        encoding: "utf8",
        env: { ...process.env, ACCEPT_QA_CYCLE_TIMEOUT_MS: "400" },
        // If the engine's own timeout did not fire, this outer one kills the run and stdout is
        // empty, so the match below fails — no wall-clock assertion is needed.
        timeout: spawnBudget("ACCEPT_RESIDUAL").timeoutMs,
      },
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /engine-unavailable/);
    assert.equal(read(fx.gate), gate);
    assert.equal(read(fx.report), rep);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
    rmSync(bin, { recursive: true, force: true });
  }
});
