/**
 * gate-open-count.test.mjs — task 275 (obs #84).
 *
 * The helper counts the OPEN entries of a QA gate's `top_issues:` block. Each
 * case below is a shape the count must get right for the lead it feeds to be
 * true; the control cases (closed entries, a `recommendations:` list below the
 * block) are the ones a `grep -c '^  - id:'` gets wrong.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const HELPER = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "gate-open-count.js",
);
const { countOpenTopIssues } = require(HELPER);

const entry = (id, ...extra) =>
  [
    `  - id: '${id}'`,
    "    severity: low",
    ...extra.map((l) => `    ${l}`),
  ].join("\n");

const gate = (...entries) =>
  [
    "gate: PASS",
    "top_issues:",
    ...entries,
    "nfr_validation:",
    "  security:",
    "    status: PASS",
    "recommendations:",
    "  future:",
    "    - action: 'something later'",
    "      refs: ['a.js']",
    "",
  ].join("\n");

test("an entry with no status, or status open, is open", () => {
  assert.equal(
    countOpenTopIssues(gate(entry("A"), entry("B", "status: open"))),
    2,
  );
});

test("a closed, resolved, fixed, waived or deferred entry is not open", () => {
  for (const status of ["closed", "resolved", "fixed", "waived", "deferred"]) {
    assert.equal(
      countOpenTopIssues(gate(entry("A", `status: ${status}`), entry("B"))),
      1,
      `status ${status} must not count`,
    );
  }
});

test("a quoted or commented status reads as its value", () => {
  assert.equal(
    countOpenTopIssues(
      gate(
        entry("A", "status: 'closed'"),
        entry("B", 'status: "closed" # fixed in qa-fix 2'),
      ),
    ),
    0,
  );
});

test("an unfamiliar status word counts as open, so a PASS lead never claims it was resolved", () => {
  assert.equal(
    countOpenTopIssues(gate(entry("A", "status: wontfix-maybe"))),
    1,
  );
});

test("an empty block is a measured zero", () => {
  assert.equal(
    countOpenTopIssues("gate: PASS\ntop_issues: []\nscore: 100\n"),
    0,
  );
  assert.equal(countOpenTopIssues(gate()), 0);
});

test("only the top_issues block is counted: a recommendations list and a nested status are not entries", () => {
  // The grep this replaces reads every `- ` line and every `status:` key in the file.
  const text = gate(
    entry("A", "status: closed"),
    entry("B", "evidence:", "  status: open"),
  );
  assert.equal(
    countOpenTopIssues(text),
    1,
    "B is open (no status of its own); A is closed; the nested status is not B's",
  );
});

test("task 213's gate 2 shape: two closed entries beside a PASS is zero open, where the grep says two", () => {
  const text = gate(
    entry("CR4", "status: closed"),
    entry("CR5", "status: closed"),
  );
  assert.equal(countOpenTopIssues(text), 0);
  assert.equal(
    text.split("\n").filter((l) => /^ {2}- id:/.test(l)).length,
    2,
    "the control: counting entries instead of open entries gives 2",
  );
});

test("a gate it cannot read is refused, never read as zero", () => {
  assert.throws(
    () => countOpenTopIssues("gate: PASS\nscore: 100\n"),
    /no top_issues/,
  );
  assert.throws(() => countOpenTopIssues("top_issues: [{id: a}]\n"), /inline/);
  assert.throws(() => countOpenTopIssues(null), /not a string/);
});

test("an unindented list is read the same as an indented one", () => {
  const text =
    "top_issues:\n- id: A\n  severity: low\n- id: B\n  status: closed\nnext: 1\n";
  assert.equal(countOpenTopIssues(text), 1);
});

function runCli(args) {
  return spawnSync(process.execPath, [HELPER, ...args], { encoding: "utf8" });
}

test("the CLI prints the count, and refuses an unreadable gate with nothing on stdout", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-open-count-"));
  try {
    const file = path.join(dir, "task.1.gate.1.example.yml");
    fs.writeFileSync(file, gate(entry("A"), entry("B", "status: closed")));
    const ok = runCli([file]);
    assert.equal(ok.status, 0);
    assert.equal(ok.stdout, "1\n");

    const missing = runCli([path.join(dir, "absent.yml")]);
    assert.equal(missing.status, 1);
    assert.equal(missing.stdout, "", "an unreadable gate must print no count");

    const noKey = path.join(dir, "no-key.yml");
    fs.writeFileSync(noKey, "gate: PASS\n");
    const refused = runCli([noKey]);
    assert.equal(refused.status, 1);
    assert.equal(refused.stdout, "");

    assert.equal(runCli([]).status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
