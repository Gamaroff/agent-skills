// qa-loop-fast-gate-outcomes.test.mjs — a fast gate has three outcomes, and a red log survives the
// command that reads it (task.238; obs #14, obs #41).
//
// Two claims, each red on the pre-task documents:
//   1. Gated cleanup. Every fenced block in the loop documents that captures a gate or test log
//      removes it only in a statement keyed on a zero exit. Run on a gate that exits 1, the log
//      survives; on exit 0 it is gone. The old blocks had no removal at all — a prose line after
//      them said "`GATE_EXIT == 0` → `rm -f`", and task.202 batched that `rm -f` with the read of a
//      red log.
//   2. Three outcomes. fast-gate-outcome.sh (the one definition both 5b step 0a and develop-bug's
//      step 3a call) answers not-measured / green / pre-existing / attributable, against a real
//      bare-origin fixture whose base branch carries a real node --test file. Pre-existing is the
//      outcome that lets a red tree through, so its differential oracle — every shape that must
//      still land on attributable — is tested shape by shape.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { extractBlocks } from "../../../shared/resources/qa-execute-snippets.mjs";
import {
  ROOT,
  SHELLS,
  readDoc,
  blockBy,
  bind,
  fixtureRepo,
  write,
  git,
  run,
  cleanup,
} from "../../../shared/resources/tests/lib/executed-prose.mjs";
import { spawnBudget } from "../../../shared/resources/spawn-budget.mjs";

const { timeoutMs: SPAWN_TIMEOUT_MS } = spawnBudget(
  "qa-loop-fast-gate-outcomes",
);

const SCRIPT = path.join(ROOT, "shared/resources/fast-gate-outcome.sh");
const QA_LOOP = "shared/resources/develop-pipeline-step-5-6-qa-loop.md";
const DEV_LOOP = "shared/resources/develop-pipeline-step-3-develop-loop.md";
const BUG_LOOP =
  "skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md";
const DEVELOP = "skills/develop/SKILL.md";

// ── 1. Gated cleanup ────────────────────────────────────────────────────────────────────────────

// Every block that writes a *_LOG under .claude/state and records a *_EXIT, or reads a *_EXIT back
// out of a log — the run blocks and the background read blocks.
function gateBlocks(rel) {
  return extractBlocks(readDoc(rel))
    .map((b) => b.code)
    .filter(
      (c) =>
        /\b(FIX|TEST)_LOG=/.test(c) &&
        (/\b(GATE|TEST)_EXIT=\$\?/.test(c) || /\^(GATE|TEST)_EXIT=/.test(c)),
    );
}

const PLACEHOLDERS = {
  "<fastGateCommand>": "sh ./fake-gate.sh",
  "<current develop loop iteration, or 1 if not in an orchestrated loop>": "1",
  "<current develop loop iteration>": "1",
  "{N}": "1",
  "{the log the background gate wrote}": ".claude/state/bg-gate.log",
};

function runBlock(sh, code, { gateExit, bgLog }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fast-gate-cleanup-"));
  try {
    fs.mkdirSync(path.join(dir, ".claude/state"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "fake-gate.sh"),
      `echo gate output\nexit ${gateExit}\n`,
    );
    if (bgLog !== undefined)
      fs.writeFileSync(path.join(dir, ".claude/state/bg-gate.log"), bgLog);
    const r = run(sh, bind(code, PLACEHOLDERS), {
      cwd: dir,
      env: { QA_CYCLE: "1" },
    });
    const logs = fs.readdirSync(path.join(dir, ".claude/state"));
    return { r, logs };
  } finally {
    cleanup(dir);
  }
}

const SITES = [QA_LOOP, DEV_LOOP, BUG_LOOP, DEVELOP];

test("every gate-log block carries exactly one removal, joined by && to a zero-exit test", () => {
  let seen = 0;
  for (const rel of SITES) {
    const blocks = gateBlocks(rel);
    assert.ok(
      blocks.length >= 1,
      `${rel}: no gate-log block found — the anchor moved`,
    );
    for (const code of blocks) {
      seen++;
      const rms = code
        .split("\n")
        .filter((l) => /rm -f "\$(FIX|TEST)_LOG"/.test(l));
      assert.equal(
        rms.length,
        1,
        `${rel}: expected one log removal in\n${code}`,
      );
      assert.match(
        rms[0],
        /^\s*(\[ "\$(GATE|TEST)_EXIT" -eq 0 \]|grep -q '\^(GATE|TEST)_EXIT=0\$' "\$(FIX|TEST)_LOG") && rm -f "\$(FIX|TEST)_LOG"/,
        `${rel}: the removal is not keyed on a zero exit in the same statement`,
      );
    }
  }
  // Non-vacuity floor: the run block and the background read block in three documents, and the
  // develop skill's run block.
  assert.ok(seen >= 7, `only ${seen} gate-log blocks found`);
});

for (const sh of SHELLS) {
  for (const rel of SITES) {
    test(`[${sh}] ${path.basename(rel)}: a red gate's log survives its block; a green one's does not`, () => {
      for (const code of gateBlocks(rel)) {
        const background = /\^(GATE|TEST)_EXIT=/.test(code);
        const key = /GATE_EXIT/.test(code) ? "GATE_EXIT" : "TEST_EXIT";
        if (background) {
          const red = runBlock(sh, code, {
            gateExit: 0,
            bgLog: `out\n${key}=1\n`,
          });
          assert.deepEqual(
            red.logs,
            ["bg-gate.log"],
            `red background log removed:\n${red.r.stdout}`,
          );
          const unfinished = runBlock(sh, code, {
            gateExit: 0,
            bgLog: "out, killed mid-run\n",
          });
          assert.deepEqual(
            unfinished.logs,
            ["bg-gate.log"],
            "a log with no exit line was removed",
          );
          const green = runBlock(sh, code, {
            gateExit: 0,
            bgLog: `out\n${key}=0\n`,
          });
          assert.deepEqual(green.logs, [], "green background log kept");
        } else {
          const red = runBlock(sh, code, { gateExit: 1 });
          assert.equal(
            red.logs.length,
            1,
            `red log removed:\n${red.r.stdout}${red.r.stderr}`,
          );
          const green = runBlock(sh, code, { gateExit: 0 });
          assert.deepEqual(green.logs, [], "green log kept");
        }
      }
    });
  }
}

test("no loop document keeps the old prose cleanup rule", () => {
  for (const rel of SITES) {
    const doc = readDoc(rel);
    assert.doesNotMatch(doc, /Cleanup mirrors step 3/, rel);
    assert.doesNotMatch(doc, /`(GATE|TEST)_EXIT == 0` → `rm -f/, rel);
  }
});

// ── 2. Three outcomes ───────────────────────────────────────────────────────────────────────────

// The script's environment: the runner's NODE_TEST_CONTEXT would make the base `node --test`
// report to this process in V8 serialisation rather than print a log the script can read.
function env() {
  const e = { ...process.env };
  delete e.NODE_TEST_CONTEXT;
  return e;
}

function classify(work, args) {
  const r = spawnSync("bash", [SCRIPT, ...args], {
    cwd: work,
    env: env(),
    encoding: "utf8",
  });
  assert.equal(
    r.status,
    0,
    `script exited ${r.status}:\n${r.stdout}${r.stderr}`,
  );
  const outcome = r.stdout.match(/^GATE_OUTCOME=(\S+)/m);
  assert.equal(
    (r.stdout.match(/^GATE_OUTCOME=/gm) || []).length,
    1,
    `expected exactly one GATE_OUTCOME line:\n${r.stdout}`,
  );
  return { outcome: outcome[1], out: r.stdout };
}

// A fixture whose origin/develop carries `t.test.mjs` with the given body, and a head gate log.
function repoWithBase(baseTest, extra = {}) {
  const fx = fixtureRepo();
  git(fx.work, "checkout", "-q", "develop");
  write(fx.work, "t.test.mjs", baseTest);
  for (const [rel, body] of Object.entries(extra)) write(fx.work, rel, body);
  git(fx.work, "add", "-A");
  git(fx.work, "commit", "-q", "-m", "base test");
  git(fx.work, "push", "-q", "origin", "develop");
  git(fx.work, "checkout", "-q", "feature/x");
  // A PR head has commits of its own; without one, origin/develop would contain HEAD and the
  // classifier rightly refuses the comparison (CR4-6).
  write(fx.work, "head.txt", "the change\n");
  git(fx.work, "add", "head.txt");
  git(fx.work, "commit", "-q", "-m", "the change");
  return fx;
}

const SPEC_HEAD_LOG = [
  "✖ a (1.2ms)",
  "ℹ tests 2",
  "ℹ fail 1",
  "",
  "✖ failing tests:",
  "",
  "test at t.test.mjs:3:1",
  "✖ a (1.2ms)",
  "  AssertionError [ERR_ASSERTION]: head broke a",
  "GATE_EXIT=1",
  "",
].join("\n");

function headLog(work, body = SPEC_HEAD_LOG) {
  write(work, ".claude/state/gate.log", body);
  return ".claude/state/gate.log";
}

const HEADER =
  'import test from "node:test";\nimport assert from "node:assert/strict";\n';
const A_FAILS = `${HEADER}test("a", () => assert.fail("a is red on base too"));\ntest("b", () => {});\n`;
const A_PASSES = `${HEADER}test("a", () => {});\ntest("b", () => {});\n`;
const B_FAILS = `${HEADER}test("a", () => {});\ntest("b", () => assert.fail("b"));\n`;

function assertNoWorktreeLeft(work) {
  const list = git(work, "worktree", "list").trim().split("\n");
  assert.equal(
    list.length,
    1,
    `a base worktree was left behind:\n${list.join("\n")}`,
  );
  const wtDir = path.join(work, ".worktrees");
  if (fs.existsSync(wtDir) && fs.statSync(wtDir).isDirectory()) {
    assert.deepEqual(
      fs.readdirSync(wtDir),
      [],
      "a base-check directory was left behind",
    );
  }
}

test("not measured: no exit code, 124, 137 and 143 — never green, never red, no worktree", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const log = headLog(fx.work);
    for (const code of ["", "124", "137", "143"]) {
      const { outcome, out } = classify(fx.work, [
        "--log",
        log,
        "--exit",
        code,
        "--base",
        "develop",
      ]);
      assert.equal(outcome, "not-measured", `exit "${code}":\n${out}`);
    }
    assert.equal(fs.existsSync(path.join(fx.work, ".worktrees")), false);
  } finally {
    cleanup(fx.dir);
  }
});

test("SC-6: a green gate creates no base worktree and runs nothing a second time", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const { outcome } = classify(fx.work, [
      "--log",
      "no-such.log",
      "--exit",
      "0",
      "--base",
      "develop",
    ]);
    assert.equal(outcome, "green");
    assert.equal(
      fs.existsSync(path.join(fx.work, ".worktrees")),
      false,
      "a green gate made a worktree",
    );
    assert.equal(
      fs.existsSync(path.join(fx.work, "no-such.log.base")),
      false,
      "a green gate ran the base",
    );
  } finally {
    cleanup(fx.dir);
  }
});

test("pre-existing: the same test is red at the PR base", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const { outcome, out } = classify(fx.work, [
      "--log",
      headLog(fx.work),
      "--exit",
      "1",
      "--base",
      "develop",
    ]);
    assert.equal(outcome, "pre-existing", out);
    assert.match(
      out,
      /^BASE_EXIT=[1-9]/m,
      "the base measurement is not recorded",
    );
    assertNoWorktreeLeft(fx.work);
  } finally {
    cleanup(fx.dir);
  }
});

test("pre-existing from a TAP log with absolute locations under the checkout", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const tap = [
      "TAP version 13",
      "not ok 1 - a",
      "  ---",
      `  location: '${fx.work}/t.test.mjs:3:1'`,
      "  ...",
      "ok 2 - b",
      "",
    ].join("\n");
    // The script strips $PWD; resolve the fixture path the way the shell will see it.
    const real = fs.realpathSync(fx.work);
    const log = headLog(fx.work, tap.split(fx.work).join(real));
    const { outcome, out } = classify(fx.work, [
      "--log",
      log,
      "--exit",
      "1",
      "--base",
      "develop",
    ]);
    assert.equal(outcome, "pre-existing", out);
  } finally {
    cleanup(fx.dir);
  }
});

// The differential oracle: every shape below must land on attributable, never pre-existing.
const ORACLE = [
  ["green at the base (the control)", A_PASSES, {}, /green at the base/],
  ["a different test fails at the base", B_FAILS, {}, /fails only on the head/],
  [
    "the base run fails with Cannot find module",
    `${HEADER}import "./missing.mjs";\ntest("a", () => assert.fail("x"));\n`,
    {},
    /environment/,
  ],
  [
    "the base run fails for want of .agents/skills — on the same test name",
    `${HEADER}import fs from "node:fs";\ntest("a", () => fs.readFileSync(".agents/skills/develop-task/SKILL.md"));\n`,
    {},
    /environment/,
  ],
];

for (const [name, baseTest, extra, why] of ORACLE) {
  test(`attributable, never pre-existing: ${name}`, () => {
    const fx = repoWithBase(baseTest, extra);
    try {
      const { outcome, out } = classify(fx.work, [
        "--log",
        headLog(fx.work),
        "--exit",
        "1",
        "--base",
        "develop",
      ]);
      assert.equal(outcome, "attributable", out);
      assert.match(out, why);
      assertNoWorktreeLeft(fx.work);
    } finally {
      cleanup(fx.dir);
    }
  });
}

test("attributable, never pre-existing: the base worktree cannot be created", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    write(
      fx.work,
      ".worktrees",
      "a file where the worktree directory should go\n",
    );
    const { outcome, out } = classify(fx.work, [
      "--log",
      headLog(fx.work),
      "--exit",
      "1",
      "--base",
      "develop",
    ]);
    assert.equal(outcome, "attributable", out);
    assert.match(out, /cannot create a base worktree/);
  } finally {
    cleanup(fx.dir);
  }
});

test("attributable, never pre-existing: the base branch cannot be fetched", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const { outcome, out } = classify(fx.work, [
      "--log",
      headLog(fx.work),
      "--exit",
      "1",
      "--base",
      "no-such-branch",
    ]);
    assert.equal(outcome, "attributable", out);
    assert.match(out, /cannot fetch/);
  } finally {
    cleanup(fx.dir);
  }
});

test("attributable: a red that names no node --test failure (a formatting check) cannot be compared", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const log = headLog(
      fx.work,
      "[warn] src/x.js\nCode style issues found in 1 file.\nGATE_EXIT=1\n",
    );
    const { outcome, out } = classify(fx.work, [
      "--log",
      log,
      "--exit",
      "1",
      "--base",
      "develop",
    ]);
    assert.equal(outcome, "attributable", out);
    assert.equal(fs.existsSync(path.join(fx.work, ".worktrees")), false);
  } finally {
    cleanup(fx.dir);
  }
});

test("attributable: a failing file outside the checkout is never run from the base", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const log = headLog(
      fx.work,
      SPEC_HEAD_LOG.replace(
        "test at t.test.mjs",
        "test at /elsewhere/t.test.mjs",
      ),
    );
    const { outcome, out } = classify(fx.work, [
      "--log",
      log,
      "--exit",
      "1",
      "--base",
      "develop",
    ]);
    assert.equal(outcome, "attributable", out);
    assert.match(out, /outside the checkout/);
  } finally {
    cleanup(fx.dir);
  }
});

// A `..` segment climbs out of `.worktrees/base-check-*` into the head checkout, so the base run
// would execute the head's copy and a head-only red would read as pre-existing (task.238 DoD 1).
const HEAD_COPY = `${HEADER}import { writeFileSync } from "node:fs";\ntest("a", () => { writeFileSync(new URL("./RAN-OUTSIDE-BASE", import.meta.url), ""); assert.fail("a"); });\n`;
for (const [form, line] of [
  ["test at", "test at ../../h.test.mjs:4:1"],
  ["location:", "  location: '../../h.test.mjs:4:1'"],
]) {
  test(`attributable: a \`..\` failing-test path (${form} form) never runs the head's copy from the base`, () => {
    const fx = repoWithBase(A_FAILS);
    try {
      write(fx.work, "h.test.mjs", HEAD_COPY);
      const log = headLog(
        fx.work,
        ["✖ failing tests:", "", line, "✖ a (1.2ms)", ""].join("\n"),
      );
      const { outcome, out } = classify(fx.work, [
        "--log",
        log,
        "--exit",
        "1",
        "--base",
        "develop",
      ]);
      assert.equal(outcome, "attributable", out);
      assert.match(out, /outside the checkout/);
      assert.equal(
        fs.existsSync(path.join(fx.work, "RAN-OUTSIDE-BASE")),
        false,
        "the head checkout's copy ran",
      );
    } finally {
      cleanup(fx.dir);
    }
  });
}

test("a file name that merely contains `..` is not refused", () => {
  const fx = repoWithBase(A_FAILS, { "a..b.test.mjs": A_FAILS });
  try {
    const log = headLog(
      fx.work,
      SPEC_HEAD_LOG.replace("test at t.test.mjs", "test at a..b.test.mjs"),
    );
    const { outcome, out } = classify(fx.work, [
      "--log",
      log,
      "--exit",
      "1",
      "--base",
      "develop",
    ]);
    assert.equal(outcome, "pre-existing", out);
  } finally {
    cleanup(fx.dir);
  }
});

// The comparison is per test, not per name: a head-only failure that shares a name with a test
// already red at the base is not pre-existing (task.238 bug.5).
function classifyLog(work, body, base = "develop") {
  return classify(work, [
    "--log",
    headLog(work, body),
    "--exit",
    "1",
    "--base",
    base,
  ]);
}

const specLog = (...pairs) =>
  [
    "✖ failing tests:",
    "",
    ...pairs.flatMap(([file, name]) => [
      `test at ${file}:3:1`,
      `✖ ${name} (1.2ms)`,
      "  AssertionError [ERR_ASSERTION]: x",
      "",
    ]),
    "GATE_EXIT=1",
    "",
  ].join("\n");

test("attributable: a head-only failure that shares its name with a base failure in another file (bug.5)", () => {
  const fx = repoWithBase(A_FAILS, { "o.test.mjs": A_PASSES });
  try {
    const { outcome, out } = classifyLog(
      fx.work,
      specLog(["t.test.mjs", "a"], ["o.test.mjs", "a"]),
    );
    assert.equal(outcome, "attributable", out);
    assert.match(out, /fails only on the head: o\.test\.mjs/);
  } finally {
    cleanup(fx.dir);
  }
});

test("attributable: a failing head file that does not exist at the base (bug.5)", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    write(fx.work, "n.test.mjs", A_FAILS);
    const { outcome, out } = classifyLog(
      fx.work,
      specLog(["t.test.mjs", "a"], ["n.test.mjs", "a"]),
    );
    assert.equal(outcome, "attributable", out);
    assert.match(out, /does not exist at the base: n\.test\.mjs/);
  } finally {
    cleanup(fx.dir);
  }
});

test("attributable: a failing test the log names with no file (bug.5)", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const { outcome, out } = classifyLog(
      fx.work,
      "✖ failing tests:\n\ntest at t.test.mjs:3:1\n✖ a (1.2ms)\n✖ b (1.0ms)\nGATE_EXIT=1\n",
    );
    assert.equal(outcome, "attributable", out);
    assert.match(out, /names no file/);
  } finally {
    cleanup(fx.dir);
  }
});

// A red is pre-existing only when node --test's results end the log: output after them may be
// another step's red, which the base comparison cannot see (task.238 bug.6).
const CLEAN_RATCHET = [
  "tmp-leak: 3 top-level entries under 1 prefixes left by the suite (directory removed)",
  "tmp-leak: ratchet ok",
];
for (const [label, trailer] of [
  ["another step's output after node's results", ["lint: 3 errors"]],
  [
    "a tripped tmp-leak ratchet",
    [
      "tmp-leak: 9 top-level entries under 2 prefixes left by the suite (directory removed)",
      'tmp-leak: new prefix "x-" (4 entries) — git grep -n \'"x-\'',
    ],
  ],
  [
    "a wrapper's own failure report",
    ["test-tmpdir: could not remove /tmp/test-tmpdir-x"],
  ],
]) {
  test(`attributable: ${label} (bug.6)`, () => {
    const fx = repoWithBase(A_FAILS);
    try {
      const body = specLog(["t.test.mjs", "a"]).replace(
        "GATE_EXIT=1",
        [...trailer, "GATE_EXIT=1"].join("\n"),
      );
      const { outcome, out } = classifyLog(fx.work, body);
      assert.equal(outcome, "attributable", out);
      assert.match(out, /after the node --test results/);
    } finally {
      cleanup(fx.dir);
    }
  });
}

test("pre-existing: npm's failure report and a clean tmp-leak report after node's results (bug.6 control)", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const body = specLog(["t.test.mjs", "a"]).replace(
      "GATE_EXIT=1",
      [
        ...CLEAN_RATCHET,
        "npm error Lifecycle script `test:suite` failed with error:",
        "npm error code 1",
        "GATE_EXIT=1",
      ].join("\n"),
    );
    const { outcome, out } = classifyLog(fx.work, body);
    assert.equal(outcome, "pre-existing", out);
  } finally {
    cleanup(fx.dir);
  }
});

test("attributable: a failing-test path that starts with - never reaches node as an option (bug.9)", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const { outcome, out } = classifyLog(
      fx.work,
      specLog(["--test-reporter=tap", "a"], ["t.test.mjs", "a"]),
    );
    assert.equal(outcome, "attributable", out);
    assert.match(out, /outside the checkout/);
    assert.doesNotMatch(out, /^BASE_EXIT=/m, "the base ran");
  } finally {
    cleanup(fx.dir);
  }
});

// Real node --test logs, not typed ones: the key is where node itself says a test is, and the
// classifier must agree with node's own output in both reporters (task.238 bug.10, bug.11).
function realLog(work, args) {
  const r = spawnSync(process.execPath, ["--test", ...args, "t.test.mjs"], {
    cwd: work,
    env: env(),
    encoding: "utf8",
  });
  assert.notEqual(
    r.status,
    0,
    `the head run must be red:\n${r.stdout}${r.stderr}`,
  );
  return `${r.stdout}${r.stderr}GATE_EXIT=${r.status}\n`;
}

const LIB =
  "export function used() {\n  return 1;\n}\nexport function unused() {\n  return 2;\n}\n";
// GET is red on both sides; POST, which shares its leaf name, is red only when `postFails`. Lines
// 1-4 are identical either way, so GET is at the same line:column at the base and the head. GET's
// test prints a line that starts `Error:` — a test's own output, which is not node's diagnostic.
const describes = (postFails) =>
  [
    'import { describe, it } from "node:test";',
    'import assert from "node:assert/strict";',
    'import { used } from "./lib.mjs";',
    'describe("GET", () => { it("returns 200", () => { console.log("Error: logged by the test"); assert.fail("x" + used()); }); });',
    `describe("POST", () => { it("returns 200", () => ${postFails ? 'assert.fail("y")' : "{}"}); });`,
    "",
  ].join("\n");
const TAP = ["--test-reporter=tap"];
// repoWithBase adds the base's files after feature/x branched, so the head checkout writes its own.
function describesRepo(postFails) {
  const fx = repoWithBase(describes(false), { "lib.mjs": LIB });
  write(fx.work, "lib.mjs", LIB);
  write(fx.work, "t.test.mjs", describes(postFails));
  return fx;
}

test("attributable: a head-only failure that shares its leaf name with a base failure in another describe (bug.10)", () => {
  const fx = describesRepo(true);
  try {
    for (const reporter of [[], TAP]) {
      const { outcome, out } = classifyLog(fx.work, realLog(fx.work, reporter));
      assert.equal(
        outcome,
        "attributable",
        `${reporter.join(" ") || "spec"}:\n${out}`,
      );
      assert.match(out, /fails only on the head: t\.test\.mjs 5:/);
    }
  } finally {
    cleanup(fx.dir);
  }
});

test("pre-existing: the same nested test, red at the same place on both sides, in both reporters (bug.10 control)", () => {
  const fx = describesRepo(false);
  try {
    for (const reporter of [[], TAP]) {
      const { outcome, out } = classifyLog(fx.work, realLog(fx.work, reporter));
      assert.equal(
        outcome,
        "pre-existing",
        `${reporter.join(" ") || "spec"}:\n${out}`,
      );
    }
  } finally {
    cleanup(fx.dir);
  }
});

test("attributable: node's own coverage-threshold error, which the base run never reproduces (bug.11)", () => {
  const fx = describesRepo(false);
  try {
    const cov = ["--experimental-test-coverage", "--test-coverage-lines=100"];
    for (const reporter of [[], TAP]) {
      const { outcome, out } = classifyLog(
        fx.work,
        realLog(fx.work, [...reporter, ...cov]),
      );
      assert.equal(
        outcome,
        "attributable",
        `${reporter.join(" ") || "spec"}:\n${out}`,
      );
      assert.match(out, /not a test result: (ℹ|#) Error: .*coverage/);
      assert.doesNotMatch(out, /^BASE_EXIT=/m, "the base ran");
    }
  } finally {
    cleanup(fx.dir);
  }
});

test("pre-existing: a coverage report and a test's own `Error:` output are not node diagnostics (bug.11 control)", () => {
  const fx = describesRepo(false);
  try {
    for (const reporter of [[], TAP]) {
      const log = realLog(fx.work, [
        ...reporter,
        "--experimental-test-coverage",
      ]);
      assert.match(
        log,
        /start of coverage report/,
        "the control must carry a coverage report",
      );
      assert.match(
        log,
        /Error: logged by the test/,
        "the control must carry the test's own output",
      );
      const { outcome, out } = classifyLog(fx.work, log);
      assert.equal(
        outcome,
        "pre-existing",
        `${reporter.join(" ") || "spec"}:\n${out}`,
      );
    }
  } finally {
    cleanup(fx.dir);
  }
});

// A later node run's results do not excuse a red printed before them (task.238 bug.12).
test("attributable: another step's red between two node runs (bug.12)", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const run = specLog(["t.test.mjs", "a"]).replace("GATE_EXIT=1\n", "");
    const tapRun = [
      "TAP version 13",
      "not ok 1 - a",
      "  ---",
      "  location: 't.test.mjs:3:1'",
      "  ...",
      "1..1",
      "# fail 1",
      "",
    ].join("\n");
    for (const [label, first, second] of [
      ["spec", run, run],
      ["tap", tapRun, tapRun],
    ]) {
      const { outcome, out } = classifyLog(
        fx.work,
        `${first}lint: 3 errors\n${second}GATE_EXIT=1\n`,
      );
      assert.equal(outcome, "attributable", `${label}:\n${out}`);
      assert.match(out, /after the node --test results: lint: 3 errors/);
    }
  } finally {
    cleanup(fx.dir);
  }
});

test("attributable: a base that already contains HEAD proves nothing (CR4-6)", () => {
  const fx = repoWithBase(A_PASSES);
  try {
    write(fx.work, "t.test.mjs", A_FAILS);
    git(fx.work, "add", "-A");
    git(fx.work, "commit", "-q", "-m", "head breaks a");
    git(fx.work, "push", "-q", "origin", "feature/x");
    const { outcome, out } = classifyLog(
      fx.work,
      specLog(["t.test.mjs", "a"]),
      "feature/x",
    );
    assert.equal(outcome, "attributable", out);
    assert.match(out, /already contains HEAD/);
  } finally {
    cleanup(fx.dir);
  }
});

for (const line of [
  "test-tmpdir: interrupted by SIGINT — per-run directory removed",
  "test-tmpdir: the suite was killed by SIGTERM",
]) {
  test(`not measured: a run the wrapper reports as signalled (${line.slice(12, 30)}…) (CR4-9)`, () => {
    const fx = repoWithBase(A_FAILS);
    try {
      const body = specLog(["t.test.mjs", "a"]).replace(
        "GATE_EXIT=1",
        `${line}\nGATE_EXIT=1`,
      );
      const { outcome, out } = classifyLog(fx.work, body);
      assert.equal(outcome, "not-measured", out);
    } finally {
      cleanup(fx.dir);
    }
  });
}

test("a timed-out test (cancelled, fail 0) with no signal report stays measured (CR4-9 control)", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const body = [
      "ℹ fail 0",
      "ℹ cancelled 1",
      "",
      specLog(["t.test.mjs", "a"]),
    ].join("\n");
    const { outcome, out } = classifyLog(fx.work, body);
    assert.notEqual(outcome, "not-measured", out);
  } finally {
    cleanup(fx.dir);
  }
});

test("pre-existing from a TAP log with a failing subtest: the base runs the head log's reporter", () => {
  const nested = `${HEADER}test("s", async (t) => { await t.test("inner", () => assert.equal(1, 2)); });\n`;
  const fx = repoWithBase(nested);
  try {
    const real = fs.realpathSync(fx.work);
    const tap = [
      "TAP version 13",
      "# Subtest: s",
      "    not ok 1 - inner",
      "      ---",
      `      location: '${real}/t.test.mjs:3:34'`, // node 26.8.2's own column for this subtest
      "      ...",
      "not ok 1 - s",
      "  ---",
      `  location: '${real}/t.test.mjs:3:1'`,
      "  ...",
      "1..1",
      "# fail 2",
      "GATE_EXIT=1",
      "",
    ].join("\n");
    const { outcome, out } = classifyLog(fx.work, tap);
    assert.equal(outcome, "pre-existing", out);
  } finally {
    cleanup(fx.dir);
  }
});

test("an option-shaped --base never reaches git fetch (task.238 bug.3)", () => {
  // `git fetch origin --upload-pack=<cmd>` runs <cmd> over a local or ssh transport. The fixture's
  // origin is a local path, so the injection would fire here; the marker proves it did not.
  const fx = repoWithBase(A_FAILS);
  try {
    const mark = path.join(fx.dir, "INJECTED");
    for (const base of [
      `--upload-pack=touch ${mark}; git-upload-pack`,
      "-develop",
      "develop..x",
    ]) {
      const { outcome, out } = classify(fx.work, [
        "--log",
        headLog(fx.work),
        "--exit",
        "1",
        "--base",
        base,
      ]);
      assert.equal(outcome, "attributable", `${base}: ${out}`);
      assert.match(out, /BASE_CHECK=unavailable \(--base is not a branch name/);
      assert.equal(fs.existsSync(mark), false, `${base} ran a command`);
    }
  } finally {
    cleanup(fx.dir);
  }
});

// A base test that never settles, and writes the pid of the process running it first: the bound has
// to reach that process, which node --test spawns, not only node itself (task.238 bug.4).
const HANGS = `${HEADER}import fs from "node:fs";\ntest("a", async () => {\n  fs.writeFileSync(process.env.HANG_PID_FILE, String(process.pid));\n  await new Promise(() => setInterval(() => {}, 1000));\n});\n`;

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function assertGone(pid) {
  // An orphan's zombie is reaped by init a moment after its group is killed.
  for (let i = 0; i < 40 && alive(pid); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (alive(pid)) process.kill(pid, "SIGKILL");
  assert.equal(
    alive(pid),
    false,
    `the hanging base test (pid ${pid}) outlived the classifier`,
  );
}

test("a base run that hangs is bounded: attributable, its process killed, no worktree left (task.238 bug.4)", async () => {
  const fx = repoWithBase(HANGS);
  const pidFile = path.join(fx.dir, "hang.pid");
  try {
    // The spawn budget only stops a regression from hanging the suite; the bound itself is proven
    // by the line below, which only the watchdog's timeout marker produces.
    const r = spawnSync(
      "bash",
      [SCRIPT, "--log", headLog(fx.work), "--exit", "1", "--base", "develop"],
      {
        cwd: fx.work,
        env: { ...env(), FAST_GATE_BASE_TIMEOUT: "2", HANG_PID_FILE: pidFile },
        encoding: "utf8",
        timeout: SPAWN_TIMEOUT_MS,
      },
    );
    assert.equal(
      r.status,
      0,
      `the classifier did not return:\n${r.stdout}${r.stderr}`,
    );
    assert.match(
      r.stdout,
      /^BASE_CHECK=unavailable \(the base run did not finish within 2s\)$/m,
    );
    assert.match(r.stdout, /^GATE_OUTCOME=attributable$/m);
    assert.equal(r.stderr, "", "the watchdog's kill reached stderr");
    assertNoWorktreeLeft(fx.work);
    await assertGone(Number(fs.readFileSync(pidFile, "utf8")));
  } finally {
    cleanup(fx.dir);
  }
});

test("a classifier killed mid-run leaves no worktree and no base process behind (task.238 bug.4)", async () => {
  const fx = repoWithBase(HANGS);
  const pidFile = path.join(fx.dir, "hang.pid");
  try {
    const child = spawn(
      "bash",
      [SCRIPT, "--log", headLog(fx.work), "--exit", "1", "--base", "develop"],
      {
        cwd: fx.work,
        env: { ...env(), FAST_GATE_BASE_TIMEOUT: "60", HANG_PID_FILE: pidFile },
        stdio: "ignore",
      },
    );
    const exited = new Promise((r) => child.on("exit", (code) => r(code)));
    for (let i = 0; i < 300 && !fs.existsSync(pidFile); i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.ok(fs.existsSync(pidFile), "the base test never started");
    child.kill("SIGTERM");
    assert.equal(await exited, 143);
    assertNoWorktreeLeft(fx.work);
    await assertGone(Number(fs.readFileSync(pidFile, "utf8")));
  } finally {
    cleanup(fx.dir);
  }
});

test("a worktree left by a SIGKILLed run is swept by the next one", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const dead = spawnSync("true").pid; // exited: its pid names no live process
    git(fx.work, "fetch", "-q", "origin", "develop");
    git(
      fx.work,
      "worktree",
      "add",
      "-q",
      "--detach",
      `.worktrees/base-check-${dead}`,
      "origin/develop",
    );
    const { outcome, out } = classify(fx.work, [
      "--log",
      headLog(fx.work),
      "--exit",
      "1",
      "--base",
      "develop",
    ]);
    assert.equal(outcome, "pre-existing", out);
    assertNoWorktreeLeft(fx.work);
  } finally {
    cleanup(fx.dir);
  }
});

test("usage errors exit 2 rather than guessing an outcome", () => {
  // Each case asserts its own message: `--exit abc` against a missing log still exits 2 at
  // "no such log" with the number check removed — exit 2 alone held nothing (task.238 DoD 1).
  for (const [args, message] of [
    [[], /--log is required/],
    [["--log", "x"], /--exit is required/],
    [
      ["--log", "x", "--exit", "abc", "--base", "develop"],
      /--exit must be a number or empty, got: abc/,
    ],
    [["--bogus"], /unknown argument: --bogus/],
  ]) {
    const r = spawnSync("bash", [SCRIPT, ...args], {
      encoding: "utf8",
      env: env(),
    });
    assert.equal(r.status, 2, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
    assert.doesNotMatch(r.stdout, /GATE_OUTCOME=/);
    assert.match(r.stderr, message, args.join(" "));
  }
  for (const bound of ["0", "abc", "-5"]) {
    const r = spawnSync(
      "bash",
      [SCRIPT, "--log", SCRIPT, "--exit", "1", "--base", "develop"],
      { encoding: "utf8", env: { ...env(), FAST_GATE_BASE_TIMEOUT: bound } },
    );
    assert.equal(
      r.status,
      2,
      `FAST_GATE_BASE_TIMEOUT=${bound}: ${r.stdout}${r.stderr}`,
    );
    assert.doesNotMatch(r.stdout, /GATE_OUTCOME=/);
  }
});

// ── 3. The documents call the one definition ────────────────────────────────────────────────────

for (const [rel, skill] of [
  [QA_LOOP, "{develop-story|develop-task}"],
  [BUG_LOOP, "develop-bug"],
]) {
  test(`${path.basename(rel)} classifies with fast-gate-outcome.sh, and the block runs`, () => {
    const code = blockBy(
      readDoc(rel),
      "fast-gate-outcome.sh",
      "the fast-gate outcome call",
    );
    const fx = repoWithBase(A_FAILS);
    try {
      const bound = bind(code, {
        [`.agents/skills/${skill}/references/fast-gate-outcome.sh`]: SCRIPT,
        "{the gate log}": headLog(fx.work),
        "{the GATE_EXIT the run printed — empty when it printed none}": "1",
        "{the PR target branch — Q2's answer}": "develop",
        "{the bug's PR target branch}": "develop",
      });
      const r = spawnSync("bash", ["-c", bound], {
        cwd: fx.work,
        env: env(),
        encoding: "utf8",
      });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /^GATE_OUTCOME=pre-existing/m);
    } finally {
      cleanup(fx.dir);
    }
  });
}

test("5b step 0a names the three outcomes, each with its action and its history line", () => {
  const doc = readDoc(QA_LOOP);
  for (const row of [
    "**not measured**",
    "**pre-existing red**",
    "**attributable red**",
  ]) {
    const line = doc.split("\n").find((l) => l.includes(`| ${row} |`));
    assert.ok(line, `no table row for ${row}`);
    assert.equal(line.split("|").length - 2, 4, `${row}: expected four cells`);
  }
  assert.match(doc, /Fast gate: not measured/);
  assert.match(doc, /Fast gate: red, pre-existing on/);
});
