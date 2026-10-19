"use strict";

/**
 * Every shell test suite fails on a call to an undefined command, and every one runs in `npm test`.
 *
 * A call to an undefined command (a helper used above its definition, a typo) prints "command not
 * found", returns 127, and no assertion reads it: the case is skipped and the suite stays green.
 * `shared/resources/undefined-command-guard.sh` turns that into a failure, but only in a suite that
 * sources it and calls `undefined_commands_check` before its summary. Six cases in
 * reenter-qa-after-finalise.test.sh never ran this way (observation #44 work, PR #668), and wiring
 * the guard everywhere found a seventh in tracker-access.test.sh, unasserted since task.56.
 *
 * The second check is the hand-maintained `npm test` list (docs/contributing/traps.md): a suite that
 * is not named there runs nowhere.
 *
 * Population: `git ls-files '*.test.sh'`. Derived, never listed, so a new suite is covered the day
 * it is tracked.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.join(__dirname, "..");
const SOURCE_RE = /^\s*(?:\.|source)\s+".*\/undefined-command-guard\.sh"\s*$/;
const CHECK_RE =
  /^\s*undefined_commands_check \|\| (?:FAIL|fail)=\$\(\((?:FAIL|fail) \+ 1\)\)\s*$/;

const suites = execFileSync("git", ["ls-files", "*.test.sh"], {
  cwd: REPO,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);
const npmTest = require(path.join(REPO, "package.json")).scripts.test;

test("the population is not vacuous", () => {
  assert.ok(
    suites.length >= 16,
    `expected at least 16 tracked *.test.sh suites, found ${suites.length}`,
  );
});

for (const suite of suites) {
  test(`${suite} sources the guard before any case and checks it before its summary`, () => {
    const lines = fs.readFileSync(path.join(REPO, suite), "utf8").split("\n");
    const src = lines.findIndex((l) => SOURCE_RE.test(l));
    const chk = lines.findIndex((l) => CHECK_RE.test(l));
    assert.ok(src >= 0, 'no `. "…/undefined-command-guard.sh"` line');
    assert.ok(
      chk >= 0,
      "no `undefined_commands_check || FAIL=$((FAIL + 1))` line",
    );
    // Before any case: the source sits above the first line that calls a function the suite defines.
    const defined = lines
      .map((l) => (l.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{/) || [])[1])
      .filter(Boolean);
    const firstDefUse = lines.findIndex((l) => {
      const word = (l.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\b/) || [])[1];
      return word && defined.includes(word) && !/\(\)\s*\{/.test(l);
    });
    assert.ok(
      firstDefUse === -1 || src < firstDefUse,
      `the guard is sourced at line ${src + 1}, after the first case at line ${firstDefUse + 1}`,
    );
    const summary = lines.reduce(
      (last, l, i) => (/passed/.test(l) && /echo/.test(l) ? i : last),
      -1,
    );
    assert.ok(
      summary === -1 || chk < summary,
      `the check at line ${chk + 1} is after the summary at line ${summary + 1}`,
    );
  });

  test(`${suite} runs in npm test`, () => {
    assert.ok(
      npmTest.includes(`bash ${suite}`),
      `package.json "test" does not run \`bash ${suite}\``,
    );
  });
}
