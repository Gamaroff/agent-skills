/**
 * The extensionless-fixture selection is byte-identical in both ShellCheck lanes.
 *
 * WHY THIS EXISTS
 * ---------------
 * `scripts/lint-shell.sh` (the local lane, part of `npm run ci`) and
 * `.github/workflows/shellcheck.yml` (the CI lane) each build their file list,
 * and each header says "change the other in the same commit". task.140 added a
 * second selection to both — tracked, extensionless files under
 * `tests/fixtures/` whose whole first line is a bash shebang, which is how the
 * fake `gh` the security probe puts on PATH gets linted at all. Nothing held
 * the two copies together before: a lane that drifts lints a different set in
 * CI than locally, and the difference is invisible until a finding lands in
 * one and not the other.
 *
 * WHAT IS ASSERTED
 * ----------------
 *   1. Each lane carries exactly one `BEGIN/END extensionless-fixtures` block.
 *   2. The two blocks are identical once the workflow's YAML indentation is
 *      removed.
 *   3. The block, run by bash against this checkout, selects
 *      `tests/fixtures/fake-gh/gh` — so a block that parses and selects
 *      nothing is red here, not only in review.
 *
 * Hermetic: bash and git only; shellcheck is never run.
 *
 * Run: node --test evals/shared/tests/lint-lane-fixture-parity.test.mjs
 * Mutation that must go red: change `read -r first` to `read -r frist` in ONE
 * of the two files → check 2 fails; change the shebang literal in both → 3.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LANES = ["scripts/lint-shell.sh", ".github/workflows/shellcheck.yml"];
const BEGIN = /^[ \t]*# BEGIN extensionless-fixtures\b.*$/gm;
const END = /^[ \t]*# END extensionless-fixtures\s*$/gm;

function block(rel) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const begins = [...text.matchAll(BEGIN)];
  const ends = [...text.matchAll(END)];
  assert.equal(begins.length, 1, `${rel}: expected one BEGIN marker`);
  assert.equal(ends.length, 1, `${rel}: expected one END marker`);
  const body = text.slice(begins[0].index, ends[0].index + ends[0][0].length);
  const indent = begins[0][0].match(/^[ \t]*/)[0];
  return body
    .split("\n")
    .map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l))
    .join("\n");
}

test("the extensionless-fixture selection is identical in both ShellCheck lanes", () => {
  const [local, ci] = LANES.map(block);
  assert.equal(ci, local);
});

test("the selection, run against this checkout, lints the fake gh", () => {
  const script = `set -euo pipefail\nFILES=()\n${block(LANES[0])}\nprintf '%s\\n' "\${FILES[@]}"\n`;
  const r = spawnSync("bash", ["-c", script], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const files = r.stdout.split("\n").filter(Boolean);
  assert.ok(
    files.includes("tests/fixtures/fake-gh/gh"),
    `selected: ${JSON.stringify(files)}`,
  );
  assert.ok(
    files.every((f) => !/\.[A-Za-z0-9]+$/.test(f)),
    `only extensionless files: ${JSON.stringify(files)}`,
  );
});
