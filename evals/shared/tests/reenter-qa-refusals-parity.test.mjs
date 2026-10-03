// reenter-qa-refusals-parity.test.mjs — the resume contract and reenter-qa-after-finalise.sh name
// the same refusal reasons (task.170).
//
// The script is the only writer that may lower the pipeline lock's current_step, and its refusals
// are what keep that move to the one case it exists for. The contract lists them for the operator
// who reads a `reenter-qa: refused (<reason>)` line; a reason added to the script and not the
// contract is a refusal nobody can look up, and one listed in the contract and dropped from the
// script is a guard the reader believes in that no longer runs.
//
// Both sides are DERIVED, never restated here: the script's set is every `refuse <reason>` call,
// the contract's is the list between its `reenter-qa-refusals` markers. A non-vacuity floor stops
// an extraction that broke from passing as two equal empty sets.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const SCRIPT = "shared/resources/reenter-qa-after-finalise.sh";
const CONTRACT = "shared/resources/develop-pipeline-resume-contract.md";
const FLOOR = 7; // the task.170 set; raise it when a reason is added on both sides

function scriptReasons() {
  const code = read(SCRIPT)
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l)) // the header lists them too; read the calls, not the prose
    .join("\n");
  return new Set(
    [...code.matchAll(/\brefuse ([a-z][a-z-]+)\b/g)].map((m) => m[1]),
  );
}

function contractReasons() {
  const text = read(CONTRACT);
  const m = text.match(
    /<!-- reenter-qa-refusals: start -->([\s\S]*?)<!-- reenter-qa-refusals: end -->/,
  );
  assert.ok(
    m,
    `${CONTRACT} must carry the reenter-qa-refusals start/end markers exactly as written`,
  );
  return new Set([...m[1].matchAll(/^- `([a-z][a-z-]+)`/gm)].map((x) => x[1]));
}

test("the contract lists exactly the refusal reasons the script refuses with", () => {
  const s = scriptReasons();
  const c = contractReasons();
  assert.ok(
    s.size >= FLOOR,
    `script yielded ${s.size} reasons (${[...s]}) — extraction broken?`,
  );
  assert.ok(
    c.size >= FLOOR,
    `contract yielded ${c.size} reasons (${[...c]}) — extraction broken?`,
  );
  assert.deepEqual(
    [...s].sort(),
    [...c].sort(),
    "reenter-qa-after-finalise.sh and the resume contract disagree on the refusal reasons",
  );
});

test("the script's own header lists every reason it refuses with", () => {
  const header = read(SCRIPT)
    .split(/\r?\n/)
    .filter((l) => /^\s*#/.test(l))
    .join("\n");
  for (const r of scriptReasons()) {
    assert.match(
      header,
      new RegExp(`#\\s+${r}\\s`),
      `the script header does not document '${r}'`,
    );
  }
});

test("both orchestrators and the contract invoke the script by its bundled path", () => {
  assert.match(
    read(CONTRACT),
    /bash \.agents\/skills\/\{develop-story\|develop-task\}\/references\/reenter-qa-after-finalise\.sh \{doc-directory\} \{implementation-report-path\}/,
  );
  for (const skill of ["develop-task", "develop-story"]) {
    assert.match(
      read(`skills/${skill}/SKILL.md`),
      new RegExp(
        `bash \\.agents/skills/${skill}/references/reenter-qa-after-finalise\\.sh \\{(task|story)-directory\\} \\{implementation-report-path\\}`,
      ),
      `${skill}/SKILL.md must invoke the re-entry through its own bundled copy`,
    );
  }
});

// task.170 QA cycle 2, CR-1: after a re-entry the implementation report's last QA Cycle entry still
// carries the APPROVE of the run that halted at Step 7, and the resume contract treats that row as the
// source of truth. Every place the contract reads it must carry the qa_reentry precedence, or a pause
// before the re-entered cycle writes its entry resumes at Step 7 over an ungated head.
test("the resume contract's 5c readings ignore a terminal verdict that predates a QA re-entry", () => {
  const text = read(CONTRACT);
  const precedence = text.match(
    /\*\*Second precedence — a QA re-entry[\s\S]*?Exactly one row matches any\s*>?\s*entry\./,
  );
  assert.ok(
    precedence,
    "the 5c sub-state paragraph must carry the QA re-entry precedence",
  );
  for (const needle of [
    "`qa_reentry`",
    "`gate_head`",
    "**5a**",
    "cycle `N+1`",
  ]) {
    assert.ok(
      precedence[0].includes(needle),
      `the precedence must name ${needle}`,
    );
  }
  const rows = text.split("\n").filter((l) => /^\| 5–6\. qa loop \|/.test(l));
  assert.equal(
    rows.length,
    2,
    "one 5–6 artifact row per pipeline (story, task)",
  );
  for (const row of rows) {
    assert.match(
      row,
      /`qa_reentry`[\s\S]*`gate_head`[\s\S]*\*\*not\*\* complete/,
      "each 5–6 row must refuse a pre-re-entry verdict",
    );
  }
  assert.doesNotMatch(
    read("shared/resources/develop-pipeline-pause.md"),
    /No reader branches on it/,
    "the lock schema must not say qa_reentry has no reader",
  );
});
