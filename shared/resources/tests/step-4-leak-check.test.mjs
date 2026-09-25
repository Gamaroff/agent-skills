// step-4-leak-check.test.mjs — the Step 4 leak check names out-of-scope files and nothing else
// (task.147; obs #141).
//
// The check walked `git log -1 --name-only HEAD | tail -n +3`, which skips the `commit` and
// `Author:` lines and then treats every remaining line as a path — the `Date:` header and the
// whole commit message included. Every commit therefore reported a LEAK, the doc said a LEAK
// "does not warrant a halt — investigate", and every run paid for an investigation of nothing
// (task.128: "printed a false LEAK; re-checked with `git show --name-only --pretty=format:` → no
// leak").
//
// The block is cut from the shipped step document by its `LEAK DETECTED` anchor and run in a
// fixture repo, under bash and zsh, against commits with a one-line and a multi-line message.

import test from "node:test";
import assert from "node:assert/strict";
import {
  SHELLS,
  readDoc,
  blockBy,
  fixtureRepo,
  write,
  git,
  run,
  cleanup,
} from "./lib/executed-prose.mjs";

const STEP4 = "shared/resources/develop-pipeline-step-4-create-pr.md";
const TAIL = `done | grep -q 'LEAK' && echo "LEAK DETECTED" || echo "OK"`;

function leakBlock() {
  const code = blockBy(readDoc(STEP4), "LEAK DETECTED");
  assert.ok(
    code.includes(TAIL),
    "the leak check's verdict line moved or changed",
  );
  return code;
}

// SCOPE_PATHS is built earlier in Step 4; the leak check only reads it.
const SCOPE = 'SCOPE_PATHS=("docs/tasks/task.9.fx" "src")\n';

// The block as shipped prints one verdict; the per-line form (verdict stripped) prints each LEAK
// so a test can see WHICH paths the loop judged out of scope.
const verdict = () => SCOPE + leakBlock();
const perLine = () => SCOPE + leakBlock().replace(TAIL, "done");

function commitWith(files, message) {
  const fx = fixtureRepo();
  for (const f of files) write(fx.work, f, `${f}\n`);
  git(fx.work, "add", "-A");
  git(fx.work, "commit", "-q", "-m", message);
  return fx;
}

const MULTILINE = [
  "feat(task.9): the change",
  "",
  "A body paragraph that runs",
  "over several lines, the way",
  "a real commit message does.",
  "",
  "Refs #9",
].join("\n");

for (const sh of SHELLS) {
  test(`[${sh}] an in-scope commit with a multi-line message → OK`, () => {
    const fx = commitWith(["docs/tasks/task.9.fx/a.md", "src/b.js"], MULTILINE);
    try {
      const r = run(sh, verdict(), { cwd: fx.work });
      assert.equal(r.stdout.trim(), "OK", `stderr: ${r.stderr}`);
      assert.equal(run(sh, perLine(), { cwd: fx.work }).stdout.trim(), "");
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] an in-scope commit with a one-line subject → OK`, () => {
    const fx = commitWith(["src/b.js"], "fix: one line");
    try {
      assert.equal(run(sh, verdict(), { cwd: fx.work }).stdout.trim(), "OK");
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] an out-of-scope file → LEAK DETECTED, naming exactly that file`, () => {
    const fx = commitWith(["src/b.js", "other/c.txt"], MULTILINE);
    try {
      assert.equal(
        run(sh, verdict(), { cwd: fx.work }).stdout.trim(),
        "LEAK DETECTED",
      );
      assert.equal(
        run(sh, perLine(), { cwd: fx.work }).stdout.trim(),
        "LEAK: other/c.txt",
      );
    } finally {
      cleanup(fx.dir);
    }
  });
}
