/**
 * finalise-fix-and-recheck — the bounded exit /finalise Step 8a takes on a low,
 * one-commit, provable finding, and the five preconditions that bound it.
 *
 * The table is pinned in both directions: a sixth precondition cannot be added
 * to the JSON without a check, and a check cannot exist without a row. Each
 * precondition is proved individually — all-true proceeds; any one false halts
 * naming that id — and the fail-closed case (no `severity`) is its own test.
 *
 * Run: node --test shared/resources/tests/finalise-fix-and-recheck.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  CHECK_IDS,
  PRECONDITIONS,
  evaluateFixAndRecheck,
} from "../finalise-fix-and-recheck.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..", "..");
const CLI = join(REPO_ROOT, "shared/resources/finalise-fix-and-recheck.mjs");
const TABLE = "shared/resources/finalise-fix-and-recheck-preconditions.json";
const read = (rel) => readFileSync(join(REPO_ROOT, rel), "utf8");

/** The pinned ids — a sixth cannot be added silently, and none can be dropped. */
const PINNED = Object.freeze([
  "severity-low",
  "single-commit",
  "inside-files-summary",
  "mutation-proved",
  "no-other-finding-open",
]);

const GOOD = Object.freeze({
  severity: "low",
  commits: 1,
  touched: ["shared/resources/qa-cycle.sh", "tests/qa-cycle.test.js"],
  filesSummary: [
    "shared/resources/qa-cycle.sh",
    "tests/qa-cycle.test.js",
    "skills/qa-task/SKILL.md",
  ],
  mutationProof: { test: "tests/qa-cycle.test.js", redOnRevert: true },
  otherFindingsOpen: [],
});

test("the table's ids are exactly the pinned five, in order", () => {
  assert.deepEqual(
    PRECONDITIONS.map((p) => p.id),
    [...PINNED],
    "a precondition was added, dropped or reordered — this list is the contract the prose cites",
  );
  for (const p of PRECONDITIONS) {
    assert.ok(
      p.statement && p.input && p.why,
      `${p.id}: statement, input and why are required`,
    );
  }
});

test("the evaluator's checks are exactly the table's ids — neither side can drift", () => {
  assert.deepEqual([...CHECK_IDS].sort(), [...PINNED].sort());
  const fromDisk = JSON.parse(read(TABLE)).preconditions.map((p) => p.id);
  assert.deepEqual(
    fromDisk,
    [...PINNED],
    "the JSON on disk is the same table the module loaded",
  );
});

test("all five hold → proceed, every id checked, nothing failed", () => {
  const r = evaluateFixAndRecheck(GOOD);
  assert.equal(r.proceed, true, JSON.stringify(r.failed));
  assert.deepEqual(r.checked, [...PINNED]);
  assert.deepEqual(r.failed, []);
});

// One row per precondition: the mutation that makes exactly that one false.
const FALSIFY = Object.freeze({
  "severity-low": { severity: "medium" },
  "single-commit": { commits: 2 },
  "inside-files-summary": {
    touched: ["shared/resources/qa-cycle.sh", "docs/README.md"],
  },
  "mutation-proved": {
    mutationProof: { test: "tests/qa-cycle.test.js", redOnRevert: false },
  },
  "no-other-finding-open": {
    otherFindingsOpen: ["docs: FAIL — CHANGELOG entry missing"],
  },
});

for (const id of PINNED) {
  test(`${id} false → halt, and it is the only id named`, () => {
    const finding = { ...GOOD, ...FALSIFY[id] };
    const r = evaluateFixAndRecheck(finding);
    assert.equal(r.proceed, false, `${id}: should have halted`);
    assert.deepEqual(
      r.failed.map((f) => f.id),
      [id],
      `${id}: failed[] should name exactly this precondition — got ${JSON.stringify(r.failed)}`,
    );
    assert.ok(r.failed[0].detail.length > 0, `${id}: detail must say why`);
  });
}

test("FALSIFY covers every pinned id — a precondition without a falsifying test is unproved", () => {
  assert.deepEqual(Object.keys(FALSIFY).sort(), [...PINNED].sort());
});

test("fail closed: a finding with no `severity` is not low", () => {
  const { severity: _s, ...noSeverity } = GOOD;
  const r = evaluateFixAndRecheck(noSeverity);
  assert.equal(r.proceed, false);
  assert.deepEqual(
    r.failed.map((f) => f.id),
    ["severity-low"],
  );
  assert.match(r.failed[0].detail, /no `severity`/);
  for (const v of [null, "", "LOW ", "Low", "high"]) {
    assert.equal(
      evaluateFixAndRecheck({ ...GOOD, severity: v }).proceed,
      false,
      `severity ${JSON.stringify(v)}`,
    );
  }
});

test("fail closed: a missing input never reads as held", () => {
  for (const key of [
    "commits",
    "touched",
    "filesSummary",
    "mutationProof",
    "otherFindingsOpen",
  ]) {
    const { [key]: _drop, ...finding } = GOOD;
    const r = evaluateFixAndRecheck(finding);
    assert.equal(r.proceed, false, `without ${key}: should have halted`);
    assert.equal(
      r.failed.length,
      1,
      `without ${key}: exactly one precondition fails`,
    );
  }
  assert.equal(
    evaluateFixAndRecheck({ ...GOOD, touched: [] }).proceed,
    false,
    "an empty touched list is not inside anything",
  );
});

test("the first evaluation of a real run halts on mutation-proved alone — the documented shape", () => {
  // Step 8a writes redOnRevert: false before the proof runs; the doc says the
  // first evaluation must name mutation-proved and nothing else.
  const r = evaluateFixAndRecheck({
    ...GOOD,
    mutationProof: { test: "tests/qa-cycle.test.js", redOnRevert: false },
  });
  assert.deepEqual(
    r.failed.map((f) => f.id),
    ["mutation-proved"],
  );
});

test("a non-object finding is a TypeError, not a halt", () => {
  for (const bad of [undefined, null, "low", [], 42]) {
    assert.throws(() => evaluateFixAndRecheck(bad), TypeError);
  }
});

// ── CLI ──────────────────────────────────────────────────────────────────────

function cli(args, { finding } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "fix-recheck-"));
  try {
    const argv = [CLI, ...args];
    if (finding !== undefined) {
      const p = join(dir, "finding.json");
      writeFileSync(
        p,
        typeof finding === "string" ? finding : JSON.stringify(finding),
      );
      argv.push("--finding", p);
    }
    const r = spawnSync(process.execPath, argv, { encoding: "utf8" });
    return { status: r.status, stdout: r.stdout, stderr: r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("CLI: exit 0 / 1 / 2 follow the repository convention", () => {
  const ok = cli(["--json"], { finding: GOOD });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).reason, "proceed");

  const halt = cli(["--json"], { finding: { ...GOOD, commits: 3 } });
  assert.equal(halt.status, 1);
  const parsed = JSON.parse(halt.stdout);
  assert.equal(parsed.reason, "halt");
  assert.deepEqual(
    parsed.failed.map((f) => f.id),
    ["single-commit"],
  );

  assert.equal(cli([]).status, 2, "no --finding is a usage error");
  assert.equal(
    cli(["--json"], { finding: "{not json" }).status,
    2,
    "malformed JSON is a usage error",
  );
  assert.equal(
    cli(["--finding"]).status,
    2,
    "a trailing --finding is a usage error",
  );
});

test("CLI: the human form names every failed precondition", () => {
  const r = cli([], { finding: { ...GOOD, severity: "high", commits: 2 } });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /severity-low/);
  assert.match(r.stdout, /single-commit/);
});

// ── Prose parity: both Decision Matrix definitions and Step 8a name the table ─

test("both Decision Matrix definitions carry the FIX-AND-RECHECK row naming every precondition id", () => {
  for (const rel of [
    "skills/finalise/SKILL.md",
    "skills/finalise/references/definition-of-done-checklist.md",
  ]) {
    const text = read(rel);
    assert.ok(
      text.includes("FIX-AND-RECHECK"),
      `${rel}: no FIX-AND-RECHECK row`,
    );
    for (const id of PINNED) {
      assert.ok(
        text.includes(`\`${id}\``),
        `${rel}: does not name precondition \`${id}\``,
      );
    }
    assert.ok(
      text.includes("finalise-fix-and-recheck-preconditions.json"),
      `${rel}: does not cite the one definition`,
    );
  }
});

test("Step 8a runs the evaluator and is bounded to once per run", () => {
  const skill = read("skills/finalise/SKILL.md");
  const start = skill.indexOf("### Step 8a");
  assert.ok(start > 0, "Step 8a heading is missing");
  const step8a = skill.slice(
    start,
    skill.indexOf("**Step 8 Completion Checklist"),
  );
  assert.match(step8a, /finalise-fix-and-recheck\.mjs --finding/);
  assert.match(step8a, /\*\*Bounded\.\*\* This step runs \*\*once\*\*/);
  assert.match(step8a, /Deviations recorded, not hidden/);
  assert.match(step8a, /CI reading 1 \(fix head\)/);
  assert.match(step8a, /ONLY the failed section/);
});

test("the security agent's schema carries `severity` on probes and FAIL checks", () => {
  const prompt = read("shared/resources/finalise-dod-security-prompt.md");
  const output = prompt.slice(prompt.indexOf("## Output"));
  assert.match(output, /probes:[\s\S]*severity: low \| medium \| high/);
  assert.match(output, /checks:[\s\S]*severity: low \| medium \| high/);
  assert.ok(
    output.includes("**Severity rule**"),
    "the severity rule paragraph is gone",
  );
});
