// repeat-subject.test.mjs — trigger (b) of qa-fix's structural-move offer is a rule, not a judgement
// (task.297, obs #162).
//
// On task.295 the container-name guard drew a finding at gates 3, 4 and 5 and the structural move
// came only at the third. The rule: a file is a repeat subject when an OPEN finding in the current
// gate names it, a finding in the previous gate also named it, and the fix between them changed it.
// Each clause has a control below that must stay silent; dropping the clause makes its control red.
//
// Fixtures: inline gate text for the library, and task.295's own committed gates for the CLI, so no
// temporary directory is created (and none can leak).

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  gateFiles,
  repeatSubjects,
} from "../../../shared/resources/repeat-subject.mjs";

const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const SCRIPT = path.join(ROOT, "shared/resources/repeat-subject.mjs");
const T295 = "docs/tasks/task.295.test-remote-lan-server-route";
const GATE3 = `${T295}/task.295.gate.3.test-remote-lan-server-route.yml`;
const GATE4 = `${T295}/task.295.gate.4.test-remote-lan-server-route.yml`;

const gate = (...issues) =>
  [
    "schema: 2",
    "gate: FAIL",
    "top_issues:",
    ...issues.flatMap(({ file, status }) => [
      "  - id: 'X-1'",
      "    severity: medium",
      `    file: ${file}`,
      "    finding: 'a finding'",
      ...(status ? [`    status: ${status}`] : []),
    ]),
    "waiver:",
    "  active: false",
    "",
  ].join("\n");

test("fires: the current gate names a file the previous gate named and the fix changed", () => {
  const out = repeatSubjects({
    current: gate({ file: "'scripts/run.sh'" }),
    previous: gate({ file: "'scripts/run.sh'" }),
    changed: ["scripts/run.sh", "README.md"],
  });
  assert.deepEqual(out, ["scripts/run.sh"]);
});

test("control: a different file in the current gate is a new subject, not a repeat", () => {
  assert.deepEqual(
    repeatSubjects({
      current: gate({ file: "b.sh" }),
      previous: gate({ file: "a.sh" }),
      changed: ["a.sh", "b.sh"],
    }),
    [],
  );
});

test("control: a shared file the previous fix did not edit is one unfixed finding, not a repeat", () => {
  assert.deepEqual(
    repeatSubjects({
      current: gate({ file: "a.sh" }),
      previous: gate({ file: "a.sh" }),
      changed: ["somewhere-else.md"],
    }),
    [],
  );
});

test("control: a closed finding in the current gate is not a subject (an absent status is open)", () => {
  for (const status of ["resolved", "fixed", "closed", "waived", "deferred"]) {
    assert.deepEqual(
      repeatSubjects({
        current: gate({ file: "a.sh", status }),
        previous: gate({ file: "a.sh" }),
        changed: ["a.sh"],
      }),
      [],
      status,
    );
  }
  assert.deepEqual(
    repeatSubjects({
      current: gate({ file: "a.sh", status: "open" }),
      previous: gate({ file: "a.sh", status: "resolved" }),
      changed: ["a.sh"],
    }),
    ["a.sh"],
    "the PREVIOUS gate's status does not matter: it named the file",
  );
});

test("paths compare after quoting and a leading ./ are removed; duplicates collapse", () => {
  assert.deepEqual(
    repeatSubjects({
      current: gate({ file: '"./a.sh"' }, { file: "'a.sh'" }),
      previous: gate({ file: "a.sh" }),
      changed: ["./a.sh"],
    }),
    ["a.sh"],
  );
});

test("gateFiles reads only the top_issues block", () => {
  const text = `${gate({ file: "a.sh" })}evidence:\n  file: not-an-issue.sh\n`;
  assert.deepEqual(gateFiles(text), ["a.sh"]);
});

// ── the CLI, on task.295's real gates ───────────────────────────────────────────────────────────

function cli(args) {
  return spawnSync("node", [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8" });
}

test("CLI on task.295 gates 3 and 4: the container-name guard's file is a repeat subject", () => {
  const r = cli([
    "--current",
    GATE4,
    "--previous",
    GATE3,
    "--changed",
    "scripts/remote-test/run.sh",
  ]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.reason, "ok");
  assert.deepEqual(out.subjects, ["scripts/remote-test/run.sh"]);
});

test("CLI control: the same gates with a fix that touched another file print an empty list, exit 0", () => {
  const r = cli([
    "--current",
    GATE4,
    "--previous",
    GATE3,
    "--changed",
    "docs/unrelated.md",
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { reason: "ok", subjects: [] });
});

test("CLI --fix-commit takes the changed files from git; a bad commit is an error, not an empty list", () => {
  const good = cli([
    "--current",
    GATE4,
    "--previous",
    GATE3,
    "--fix-commit",
    "HEAD",
  ]);
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).reason, "ok");
  const bad = cli([
    "--current",
    GATE4,
    "--previous",
    GATE3,
    "--fix-commit",
    "0000000000000000000000000000000000000000",
  ]);
  assert.equal(bad.status, 1);
  assert.equal(
    bad.stdout,
    "",
    "an unreadable input must not print a subject list",
  );
});

test("CLI refusals: usage is exit 2, an unreadable or block-less gate is exit 1, and neither prints a list", () => {
  for (const [args, status, message] of [
    [[], 2, /--current and --previous are required/],
    [["--current", GATE4, "--previous", GATE3], 2, /exactly one of/],
    [
      [
        "--current",
        GATE4,
        "--previous",
        GATE3,
        "--changed",
        "a",
        "--fix-commit",
        "HEAD",
      ],
      2,
      /exactly one of/,
    ],
    [["--bogus"], 2, /unknown argument: --bogus/],
    [
      ["--current", "no-such.yml", "--previous", GATE3, "--changed", "a"],
      1,
      /unreadable gate/,
    ],
    [
      // A markdown file has no top_issues block: that is not "no findings".
      ["--current", "README.md", "--previous", GATE3, "--changed", "a"],
      1,
      /no top_issues block/,
    ],
  ]) {
    const r = cli(args);
    assert.equal(r.status, status, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
    assert.equal(r.stdout, "", args.join(" "));
    assert.match(r.stderr, message, args.join(" "));
  }
});
