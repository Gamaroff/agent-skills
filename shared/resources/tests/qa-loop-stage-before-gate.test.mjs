// qa-loop-stage-before-gate.test.mjs — a QA cycle's fast gate measures the tree its commit will
// carry (task.147; obs #171).
//
// §5b ran `<fastGateCommand>` at step 0a, before anything was staged. By then `/qa-task` had
// linked the work item to this cycle's untracked gate and QA report, and the doc-links check
// resolves links against `git ls-files` — the index — so both links read as dead. The first
// fast-gate attempt of every cycle went red for a reason unrelated to the fix and spent one of the
// two bounded attempts (task.143, cycles 1 and 6).
//
// Two claims, each red on the pre-fix document:
//   1. the staging block exists and, run in a fixture, puts exactly the gate and QA report in the
//      index — never the implementation report, which Step 8 owns;
//   2. within §5b it sits AFTER step 0's `git diff --stat HEAD` (a staged new file shows there, so
//      staging first would make the no-change HALT unreachable) and BEFORE the fast gate.

import test from "node:test";
import assert from "node:assert/strict";
import {
  SHELLS,
  readDoc,
  blockBy,
  bind,
  fixtureRepo,
  write,
  git,
  run,
  cleanup,
} from "./lib/executed-prose.mjs";

const QA_LOOP = "shared/resources/develop-pipeline-step-5-6-qa-loop.md";
const ANCHOR = 'git add -- "$GATE_FILE" "$QA_FILE"';
const DIR = "docs/tasks/task.9.fx";
const GATE = `${DIR}/task.9.gate.1.fx.yml`;
const QA = `${DIR}/task.9.qa.1.fx.md`;
const IMPL = `${DIR}/task.9.implementation.1.fx.md`;

function section5b() {
  const md = readDoc(QA_LOOP);
  const start = md.indexOf("### 5b. Run QA Fix (shared)");
  assert.ok(start >= 0, "§5b heading not found");
  const next = md.indexOf("\n### ", start + 1);
  return md.slice(start, next < 0 ? undefined : next);
}

function stagingBlock() {
  const code = blockBy(readDoc(QA_LOOP), ANCHOR, "the stage-before-gate block");
  return bind(code, {
    "{the latest gate file — resolved per §Finding the Latest Gate File}": GATE,
    "{this cycle's QA report — the .qa. file carrying the gate's cycle number}":
      QA,
  });
}

test("§5b stages the evidence after step 0's change check and before the fast gate", () => {
  const sec = section5b();
  const stage = sec.indexOf(ANCHOR);
  const change = sec.indexOf("git diff --stat HEAD");
  const gate = sec.indexOf('<fastGateCommand> > "$FIX_LOG"');
  assert.ok(stage >= 0, "no stage-before-gate block inside §5b");
  assert.ok(change >= 0, "step 0's `git diff --stat HEAD` not found in §5b");
  assert.ok(gate >= 0, "step 0a's fast-gate run not found in §5b");
  assert.ok(
    change < stage,
    "staging precedes step 0 — its no-change HALT would be unreachable",
  );
  assert.ok(stage < gate, "the fast gate runs before the evidence is staged");
});

for (const sh of SHELLS) {
  test(`[${sh}] the block stages the gate and QA report, and not the implementation report`, () => {
    const fx = fixtureRepo();
    try {
      write(fx.work, IMPL, "report v1\n");
      git(fx.work, "add", "-A");
      git(fx.work, "commit", "-q", "-m", "report committed at Step 4");
      // The cycle's state when 5b reaches the gate: qa-fix edited code, QA wrote two new files,
      // the orchestrator updated its report.
      write(fx.work, "src/fix.js", "fixed\n");
      write(fx.work, GATE, "gate: PASS\n");
      write(fx.work, QA, "# QA 1\n");
      write(fx.work, IMPL, "report v2\n");

      const r = run(sh, stagingBlock(), { cwd: fx.work });
      assert.equal(r.status, 0, r.stderr);

      const tracked = git(fx.work, "ls-files").split("\n");
      assert.ok(tracked.includes(GATE), "gate not in the index");
      assert.ok(tracked.includes(QA), "QA report not in the index");
      const staged = git(fx.work, "diff", "--cached", "--name-only")
        .split("\n")
        .filter(Boolean);
      assert.deepEqual(
        staged.sort(),
        [GATE, QA].sort(),
        "the block staged more than the evidence",
      );
    } finally {
      cleanup(fx.dir);
    }
  });
}
