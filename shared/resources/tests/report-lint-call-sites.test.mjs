// report-lint-call-sites.test.mjs — the inline report-lint call sites read the linter's exit
// into `rc` and split it 0 / 1 / 2 / other, with a distinct message per non-zero arm
// (task.130 Phase 5; task.124 cycle-1 CR-7).
//
// A single `|| { echo "HALT: report failed lint"; exit 1; }` reported three different repairs
// as one: exit 1 is the REPORT (repair it by hand), exit 2 is the CALL SITE (the flag or path is
// wrong, the report is fine), and 127 / anything else is the INSTALL (the bundled linter is not
// runnable). Each site now captures `rc=$?` BEFORE the `case` — inside a `*)` arm `$?` no longer
// names the linter's status — and the HALT-rule site (2) stays a one-line, warn-only form because
// the snapshot and lock removal that follow it must still run.
//
//   A — sites (1) [Step Transition action 2] in the three SKILL.md and (4) [step-8] are fenced,
//       capture `rc=$?`, and HALT (`exit 1`) on every non-zero arm with three distinct messages
//   B — site (2) [the HALT rule] in the three SKILL.md is one line, captures `rc=$?`, carries the
//       same three arms, and contains NO `exit` (warn and continue)
//   C — no canonical source still carries the old `|| { echo "HALT: report failed lint` form

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../qa-execute-snippets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const SKILLS = ["develop-task", "develop-story", "develop-bug"].map(
  (s) => `skills/${s}/SKILL.md`,
);
const STEP8 = "shared/resources/develop-pipeline-step-8-commit.md";
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const ARMS = [
  /\b1\)\s*echo "[^"]*report failed lint/,
  /\b2\)\s*echo "[^"]*usage error/,
  /\*\)\s*echo "[^"]*not runnable \(rc \$rc\)/,
];

function fencedLintBlocks(rel) {
  return extractBlocks(read(rel)).filter((b) =>
    /report-lint\.js --file/.test(b.code),
  );
}

test("A — fenced sites (1) and (4) capture rc=$? and HALT with three distinct messages", () => {
  for (const rel of [...SKILLS, STEP8]) {
    const blocks = fencedLintBlocks(rel);
    assert.equal(
      blocks.length,
      1,
      `${rel}: expected one fenced report-lint block, found ${blocks.length}`,
    );
    const code = blocks[0].code;
    assert.match(
      code,
      /report-lint\.js --file "[^"]+" --json; rc=\$\?/,
      `${rel}: exit not captured into rc before the case`,
    );
    assert.match(code, /case \$rc in/, `${rel}: no case on rc`);
    for (const arm of ARMS)
      assert.match(code, arm, `${rel}: missing arm ${arm}`);
    // Every non-zero arm HALTs.
    const exits = (code.match(/exit 1 ;;/g) || []).length;
    assert.equal(
      exits,
      3,
      `${rel}: expected exit 1 on each of the three non-zero arms, found ${exits}`,
    );
    assert.doesNotMatch(
      code,
      /\|\| \{ echo "HALT: report failed lint/,
      `${rel}: old single-arm form still present`,
    );
  }
});

test("B — the HALT-rule site (2) is one line, captures rc=$?, has the three arms and NO exit", () => {
  for (const rel of SKILLS) {
    const lines = read(rel)
      .split(/\r?\n/)
      .filter((l) => /Commit the report before any halt/.test(l));
    assert.equal(lines.length, 1, `${rel}: expected one HALT-rule bullet`);
    const l = lines[0];
    const m = /`(command node [^`]*report-lint\.js[^`]*)`/.exec(l);
    assert.ok(m, `${rel}: HALT-rule bullet carries no inline report-lint call`);
    const call = m[1];
    assert.match(
      call,
      /--json; rc=\$\?; case \$rc in/,
      `${rel}: site (2) does not capture rc before the case`,
    );
    for (const arm of ARMS)
      assert.match(call, arm, `${rel}: site (2) missing arm ${arm}`);
    assert.doesNotMatch(
      call,
      /\bexit\b/,
      `${rel}: site (2) exits — it must warn and continue to the snapshot and lock removal`,
    );
    assert.match(
      call,
      /HALT commit skipped/,
      `${rel}: site (2) no longer says the HALT commit is skipped`,
    );
  }
});

// Population: the four call sites the report-lint contract names are (1) the Step Transition
// action 2 in each orchestrator SKILL.md, (2) the HALT rule in the same files, (3) the PreCompact
// hook, and (4) step-8. Site (3) — `develop-pipeline-on-precompact.sh` — is shell with its own
// suite (`develop-pipeline-on-precompact.test.sh`) and is EXEMPT from this scan by task.130's
// scope (§ Phase 5: "site (3) … is out of scope here"); the exemption is stated so a reader does
// not take its absence from the population for an oversight (QA cycle 1, CR-5).
const EXEMPT_SITES = {
  "shared/resources/develop-pipeline-on-precompact.sh":
    "site (3) — shell hook with its own suite; out of task.130 scope",
};

test("C0 — the exempt site still exists and still calls report-lint.js (an exemption for a vanished site is stale)", () => {
  for (const [rel, why] of Object.entries(EXEMPT_SITES)) {
    assert.ok(
      fs.existsSync(path.join(ROOT, rel)),
      `${rel} exempt (${why}) but no longer exists — drop the exemption`,
    );
    assert.match(
      read(rel),
      /report-lint\.js/,
      `${rel} exempt (${why}) but no longer calls report-lint.js — drop the exemption`,
    );
  }
});

test('C — no canonical source carries the old `|| { echo "HALT: report failed lint` or `|| echo "⚠️ report failed lint` form', () => {
  for (const rel of [...SKILLS, STEP8]) {
    const md = read(rel);
    assert.doesNotMatch(
      md,
      /report-lint\.js[^\n]*\|\| \{ echo "HALT: report failed lint/,
      `${rel}: old fenced form`,
    );
    assert.doesNotMatch(
      md,
      /report-lint\.js[^\n]*\|\| echo "⚠️ report failed lint/,
      `${rel}: old one-line form`,
    );
  }
});
