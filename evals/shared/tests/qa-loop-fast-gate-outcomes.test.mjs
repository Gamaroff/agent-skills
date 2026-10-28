// qa-loop-fast-gate-outcomes.test.mjs — a red fast gate is classified before it is triaged, and a
// red log survives the command that reads it (task.238; obs #14, obs #41).
//
// Two claims, each red on the pre-task documents:
//   1. Gated cleanup. Every fenced block in the loop documents that captures a gate or test log
//      removes it only in a statement keyed on a zero exit. Run on a gate that exits 1, the log
//      survives; on exit 0 it is gone. The old blocks had no removal at all — a prose line after
//      them said "`GATE_EXIT == 0` → `rm -f`", and task.202 batched that `rm -f` with the read of a
//      red log.
//   2. Two outcomes for a red. fast-gate-outcome.sh (the one definition both 5b step 0a and
//      develop-bug's step 3a call) answers not-measured / green / attributable. It never compares a
//      red with the PR base: the `pre-existing` outcome that did was deleted at QA cycle 6's third
//      strike (bug.5 to bug.14), so a red that is also red on the base must read attributable and
//      must create no base worktree and run nothing a second time.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
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

// ── 2. Two outcomes for a red ───────────────────────────────────────────────────────────────────

function classify(work, args) {
  const r = spawnSync("bash", [SCRIPT, ...args], {
    cwd: work,
    encoding: "utf8",
  });
  assert.equal(
    r.status,
    0,
    `script exited ${r.status}:\n${r.stdout}${r.stderr}`,
  );
  assert.equal(
    (r.stdout.match(/^GATE_OUTCOME=/gm) || []).length,
    1,
    `expected exactly one GATE_OUTCOME line:\n${r.stdout}`,
  );
  return { outcome: r.stdout.match(/^GATE_OUTCOME=(\S+)/m)[1], out: r.stdout };
}

// A fixture whose origin/develop carries `t.test.mjs` with the given body, and a PR head with a
// commit of its own. The base is real so that a test can show it is never read.
function repoWithBase(baseTest) {
  const fx = fixtureRepo();
  git(fx.work, "checkout", "-q", "develop");
  write(fx.work, "t.test.mjs", baseTest);
  git(fx.work, "add", "-A");
  git(fx.work, "commit", "-q", "-m", "base test");
  git(fx.work, "push", "-q", "origin", "develop");
  git(fx.work, "checkout", "-q", "feature/x");
  write(fx.work, "head.txt", "the change\n");
  git(fx.work, "add", "head.txt");
  git(fx.work, "commit", "-q", "-m", "the change");
  return fx;
}

const HEADER =
  'import test from "node:test";\nimport assert from "node:assert/strict";\n';
const A_FAILS = `${HEADER}test("a", () => assert.fail("a is red on base too"));\ntest("b", () => {});\n`;

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

const LOG = ".claude/state/gate.log";

function headLog(work, body = SPEC_HEAD_LOG) {
  write(work, LOG, body);
  return LOG;
}

// Nothing the script does may touch the base: no worktree, no fetch into the checkout's refs, no
// `.base` log beside the head log.
function assertBaseUntouched(work) {
  assert.equal(
    git(work, "worktree", "list").trim().split("\n").length,
    1,
    "a worktree was created",
  );
  assert.equal(
    fs.existsSync(path.join(work, ".worktrees")),
    false,
    "a .worktrees directory was created",
  );
  assert.equal(
    fs.existsSync(path.join(work, `${LOG}.base`)),
    false,
    "a base run was made",
  );
}

test("not measured: no exit code, 124, 137 and 143 — never green, never red, base untouched", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const log = headLog(fx.work);
    for (const code of ["", "124", "137", "143"]) {
      const { outcome, out } = classify(fx.work, [
        "--log",
        log,
        "--exit",
        code,
      ]);
      assert.equal(outcome, "not-measured", `exit "${code}":\n${out}`);
    }
    assertBaseUntouched(fx.work);
  } finally {
    cleanup(fx.dir);
  }
});

test("SC-6: a green gate runs nothing a second time", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const { outcome } = classify(fx.work, [
      "--log",
      "no-such.log",
      "--exit",
      "0",
    ]);
    assert.equal(outcome, "green");
    assertBaseUntouched(fx.work);
  } finally {
    cleanup(fx.dir);
  }
});

// The deletion's guard: the base fails the very test the head names, which is the case the old
// comparison let through as pre-existing. It must read attributable, and the base must not be run.
test("attributable: a red that is also red at the PR base is never compared with it (task.238 cycle 6)", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const { outcome, out } = classify(fx.work, [
      "--log",
      headLog(fx.work),
      "--exit",
      "1",
    ]);
    assert.equal(outcome, "attributable", out);
    assert.equal(out, "GATE_OUTCOME=attributable\n");
    assertBaseUntouched(fx.work);
  } finally {
    cleanup(fx.dir);
  }
});

// A base file that fails to load, for a different cause than the head's (bug.14).
const LOAD_FAILS = `${HEADER}throw new Error("ENOENT: no such file, open fixture.json");\n`;

// The shapes QA cycles 4–6 found the comparison misreading, kept as regression cases: each is a
// head-only red against a base the deleted comparison read as the same red, and each reads
// attributable. The bug.13 and bug.14 cases read `pre-existing` under the script at 8c43db0c.
for (const [name, body, base = A_FAILS] of [
  [
    "two failures at one position, as a loop-generated describe prints them (bug.13)",
    [
      "✖ failing tests:",
      "",
      "test at t.test.mjs:3:1",
      "✖ a (1.2ms)",
      "",
      "test at t.test.mjs:3:1",
      "✖ a (0.3ms)",
      "",
    ].join("\n"),
  ],
  [
    "a test file that failed to load (bug.14)",
    [
      "✖ failing tests:",
      "",
      "test at t.test.mjs:1:1",
      "✖ t.test.mjs (33.2ms)",
      "  'test failed'",
      "",
    ].join("\n"),
    LOAD_FAILS,
  ],
  [
    "another step's red after node's results (bug.6)",
    `${SPEC_HEAD_LOG}lint: 3 errors\n`,
  ],
  [
    "node's own coverage-threshold error (bug.11)",
    `${SPEC_HEAD_LOG}ℹ Error: 40.00% line coverage does not meet threshold of 100%.\n`,
  ],
]) {
  test(`attributable: ${name}`, () => {
    const fx = repoWithBase(base);
    try {
      const { outcome, out } = classify(fx.work, [
        "--log",
        headLog(fx.work, body),
        "--exit",
        "1",
      ]);
      assert.equal(outcome, "attributable", out);
      assertBaseUntouched(fx.work);
    } finally {
      cleanup(fx.dir);
    }
  });
}

for (const line of [
  "test-tmpdir: interrupted by SIGINT — per-run directory removed",
  "test-tmpdir: the suite was killed by SIGTERM",
]) {
  test(`not measured: a run the wrapper reports as signalled (${line.slice(12, 30)}…) (CR4-9)`, () => {
    const fx = repoWithBase(A_FAILS);
    try {
      const body = SPEC_HEAD_LOG.replace("GATE_EXIT=1", `${line}\nGATE_EXIT=1`);
      const { outcome, out } = classify(fx.work, [
        "--log",
        headLog(fx.work, body),
        "--exit",
        "1",
      ]);
      assert.equal(outcome, "not-measured", out);
    } finally {
      cleanup(fx.dir);
    }
  });
}

// A test that prints the wrapper's sentence does so before node's summary; the wrapper prints it
// after the suite has ended (task.238 PRB7-1).
for (const reporter of [
  ["spec", "ℹ fail 1"],
  ["tap", "# fail 1"],
]) {
  test(`attributable: the signal sentence printed by a test, before node's ${reporter[0]} summary (PRB7-1)`, () => {
    const fx = repoWithBase(A_FAILS);
    try {
      const body = [
        "✖ a (1.2ms)",
        "test-tmpdir: interrupted by SIGINT — per-run directory removed",
        reporter[1],
        "GATE_EXIT=1",
        "",
      ].join("\n");
      const { outcome, out } = classify(fx.work, [
        "--log",
        headLog(fx.work, body),
        "--exit",
        "1",
      ]);
      assert.equal(outcome, "attributable", out);
    } finally {
      cleanup(fx.dir);
    }
  });
}

test("a timed-out test (cancelled, fail 0) with no signal report stays measured (CR4-9 control)", () => {
  const fx = repoWithBase(A_FAILS);
  try {
    const body = ["ℹ fail 0", "ℹ cancelled 1", "", SPEC_HEAD_LOG].join("\n");
    const { outcome, out } = classify(fx.work, [
      "--log",
      headLog(fx.work, body),
      "--exit",
      "1",
    ]);
    assert.equal(outcome, "attributable", out);
  } finally {
    cleanup(fx.dir);
  }
});

test("usage errors exit 2 rather than guessing an outcome", () => {
  // Each case asserts its own message: exit 2 alone held nothing (task.238 DoD 1). `--base` is an
  // unknown argument now, so a caller still passing it fails loudly instead of being half-obeyed.
  for (const [args, message] of [
    [[], /--log is required/],
    [["--log", "x"], /--exit is required/],
    [
      ["--log", "x", "--exit", "abc"],
      /--exit must be a number or empty, got: abc/,
    ],
    [
      ["--log", SCRIPT, "--exit", "1", "--base", "develop"],
      /unknown argument: --base/,
    ],
    [["--log", "no-such.log", "--exit", "1"], /no such log: no-such\.log/],
    [["--bogus"], /unknown argument: --bogus/],
  ]) {
    const r = spawnSync("bash", [SCRIPT, ...args], { encoding: "utf8" });
    assert.equal(r.status, 2, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
    assert.doesNotMatch(r.stdout, /GATE_OUTCOME=/);
    assert.match(r.stderr, message, args.join(" "));
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
      });
      const r = spawnSync("bash", ["-c", bound], {
        cwd: fx.work,
        encoding: "utf8",
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout, "GATE_OUTCOME=attributable\n");
    } finally {
      cleanup(fx.dir);
    }
  });
}

test("5b step 0a names two outcomes for a red, each with its action and its history line", () => {
  const doc = readDoc(QA_LOOP);
  for (const row of ["**not measured**", "**attributable red**"]) {
    const line = doc.split("\n").find((l) => l.includes(`| ${row} |`));
    assert.ok(line, `no table row for ${row}`);
    assert.equal(line.split("|").length - 2, 4, `${row}: expected four cells`);
  }
  assert.match(doc, /Fast gate: not measured/);
  for (const rel of [QA_LOOP, BUG_LOOP]) {
    const text = readDoc(rel);
    assert.doesNotMatch(text, /\| \*\*pre-existing red\*\* \|/, rel);
    assert.doesNotMatch(text, /Fast gate: red, pre-existing on/, rel);
    assert.doesNotMatch(text, /GATE_OUTCOME=[a-z|-]*pre-existing/, rel);
  }
});
