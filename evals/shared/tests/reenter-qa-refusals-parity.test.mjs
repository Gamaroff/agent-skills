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
