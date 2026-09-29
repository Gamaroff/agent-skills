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
// Each block runs as an agent runs it: ITS OWN SHELL, one `run()` per block, binding only the
// documented placeholders. QA cycle 1 found the first version of this test prepending
// `SCOPE_PATHS=(…)` to the leak block. The shipped block read an array that only the derivation
// block, a separate shell, had bound, so as shipped it judged every file a LEAK, and the test could
// not see it (task.147 CR-4). The scope now travels in `.claude/state/step4-scope-paths.txt`; the
// held-file directory travels the same way, from the Pre-flight Guard to the Restore block.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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

const STEP4 = "shared/resources/develop-pipeline-step-4-create-pr.md";
const WORK_ITEM = "docs/tasks/task.9.fx";
const TAIL = `done | grep -q 'LEAK' && echo "LEAK DETECTED" || echo "OK"`;
const PLACEHOLDERS = { "{work-item-dir}": WORK_ITEM, "{Q2_answer}": "develop" };

const md = readDoc(STEP4);
const derivation = () => bind(blockBy(md, "Scope-derivation"), PLACEHOLDERS);
const guard = () => bind(blockBy(md, "HOLD_DIR=$(mktemp -d"), PLACEHOLDERS);
const restore = () => bind(blockBy(md, 'cp -r "$HOLD_DIR"/. .'), PLACEHOLDERS);

function leakBlock() {
  const code = bind(blockBy(md, "LEAK DETECTED"), PLACEHOLDERS);
  assert.ok(
    code.includes(TAIL),
    "the leak check's verdict line moved or changed",
  );
  return code;
}
// The shipped block prints one verdict; the per-line form (verdict stripped) prints each LEAK, so
// a test can see WHICH paths the loop judged out of scope.
const verdict = () => leakBlock();
const perLine = () => leakBlock().replace(TAIL, "done");

// A branch whose work sits in the work item and in src/, left UNCOMMITTED — the normal state at
// Step 4 — so the derivation block sees it and writes the scope file.
function stepFourFixture() {
  const fx = fixtureRepo();
  write(fx.work, `${WORK_ITEM}/task.md`, "v1\n");
  write(fx.work, "src/b.js", "v1\n");
  git(fx.work, "add", "-A");
  git(fx.work, "commit", "-q", "-m", "base files");
  git(fx.work, "update-ref", "refs/heads/develop", "HEAD");
  write(fx.work, `${WORK_ITEM}/task.md`, "v2\n");
  write(fx.work, "src/b.js", "v2\n");
  return fx;
}

function deriveThenCommit(sh, fx, extraFiles, message) {
  const d = run(sh, derivation(), { cwd: fx.work });
  assert.equal(d.status, 0, `derivation block failed: ${d.stderr}`);
  for (const f of extraFiles) write(fx.work, f, `${f}\n`);
  git(fx.work, "add", "-A");
  git(fx.work, "commit", "-q", "-m", message);
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

test("the leak check and the guard read the scope from the file the derivation block writes", () => {
  assert.match(derivation(), /step4-scope-paths\.txt/);
  assert.match(leakBlock(), /step4-scope-paths\.txt/);
  assert.match(guard(), /step4-scope-paths\.txt/);
  assert.doesNotMatch(
    leakBlock(),
    /SCOPE_PATHS=\("/,
    "the leak block binds its own literal scope",
  );
});

for (const sh of SHELLS) {
  test(`[${sh}] an in-scope commit with a multi-line message → OK, in a fresh shell`, () => {
    const fx = stepFourFixture();
    try {
      deriveThenCommit(sh, fx, [], MULTILINE);
      const r = run(sh, verdict(), { cwd: fx.work });
      assert.equal(r.stdout.trim(), "OK", `stderr: ${r.stderr}`);
      assert.equal(run(sh, perLine(), { cwd: fx.work }).stdout.trim(), "");
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] an in-scope commit with a one-line subject → OK, in a fresh shell`, () => {
    const fx = stepFourFixture();
    try {
      deriveThenCommit(sh, fx, [], "fix: one line");
      assert.equal(run(sh, verdict(), { cwd: fx.work }).stdout.trim(), "OK");
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] an out-of-scope file → LEAK DETECTED, naming exactly that file`, () => {
    const fx = stepFourFixture();
    try {
      deriveThenCommit(sh, fx, ["other/c.txt"], MULTILINE);
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

  test(`[${sh}] with no scope file the leak check refuses, rather than judging every file a LEAK`, () => {
    const fx = stepFourFixture();
    try {
      git(fx.work, "commit", "-q", "-am", "work");
      const r = run(sh, verdict(), { cwd: fx.work });
      assert.equal(r.status, 1);
      assert.match(r.stdout, /step4-scope-paths\.txt is missing/);
      assert.doesNotMatch(r.stdout, /LEAK DETECTED/);
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] a file the guard holds in one shell is restored by the Restore block in another`, () => {
    const fx = stepFourFixture();
    try {
      assert.equal(run(sh, derivation(), { cwd: fx.work }).status, 0);
      write(fx.work, "stray/notes.txt", "another session\n");
      const g = run(sh, guard(), { cwd: fx.work });
      assert.equal(g.status, 0, g.stderr);
      assert.equal(
        fs.existsSync(path.join(fx.work, "stray/notes.txt")),
        false,
        "the guard did not hold it",
      );
      const r = run(sh, restore(), { cwd: fx.work });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(
        fs.readFileSync(path.join(fx.work, "stray/notes.txt"), "utf8"),
        "another session\n",
        "the held file was stranded, not restored",
      );
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] a guard run twice (a Step 4 retry), then Restore, brings every held file back`, () => {
    const fx = stepFourFixture();
    try {
      assert.equal(run(sh, derivation(), { cwd: fx.work }).status, 0);
      write(fx.work, "stray/first.txt", "first\n");
      assert.equal(run(sh, guard(), { cwd: fx.work }).status, 0);
      // The retry: the first file is already held; a second arrives.
      write(fx.work, "stray2/second.txt", "second\n");
      assert.equal(run(sh, guard(), { cwd: fx.work }).status, 0);
      assert.equal(run(sh, restore(), { cwd: fx.work }).status, 0);
      for (const [p, v] of [
        ["stray/first.txt", "first\n"],
        ["stray2/second.txt", "second\n"],
      ]) {
        assert.ok(
          fs.existsSync(path.join(fx.work, p)),
          `${p} was stranded by the second guard run`,
        );
        assert.equal(fs.readFileSync(path.join(fx.work, p), "utf8"), v);
      }
      for (const junk of ["Issues", "Log"]) {
        assert.equal(
          fs.existsSync(path.join(fx.work, junk)),
          false,
          `the guard wrote a "${junk}" file into the repo root`,
        );
      }
      const held = fs.readFileSync(
        path.join(fx.work, ".claude/state/step4-held-paths.txt"),
        "utf8",
      );
      assert.deepEqual(
        held.trim().split("\n").slice(1).sort(),
        ["stray/", "stray2/"],
        "the held record lists more than the fixture's strays",
      );
      assert.match(held, /stray\//);
      assert.match(held, /stray2\//);
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] where .claude/ is not gitignored, the guard leaves the pipeline's own state in place`, () => {
    const fx = stepFourFixture();
    try {
      write(fx.work, ".gitignore", "");
      git(fx.work, "add", ".gitignore");
      git(fx.work, "commit", "-q", "-m", "no .claude ignore");
      git(fx.work, "update-ref", "refs/heads/develop", "HEAD");
      assert.equal(run(sh, derivation(), { cwd: fx.work }).status, 0);
      assert.equal(run(sh, guard(), { cwd: fx.work }).status, 0);
      assert.ok(
        fs.existsSync(
          path.join(fx.work, ".claude/state/step4-scope-paths.txt"),
        ),
        "the guard moved .claude/ — the scope record is gone",
      );
      const leak = run(sh, verdict(), { cwd: fx.work });
      assert.doesNotMatch(leak.stdout, /is missing/);
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] a scope record for another work item is refused by the guard and the leak check`, () => {
    const fx = stepFourFixture();
    try {
      write(
        fx.work,
        ".claude/state/step4-scope-paths.txt",
        "docs/tasks/task.1.other\nsrc\n",
      );
      const g = run(sh, guard(), { cwd: fx.work });
      assert.equal(g.status, 1);
      assert.match(g.stdout, /stale record/);
      git(fx.work, "commit", "-q", "-am", "work");
      const l = run(sh, verdict(), { cwd: fx.work });
      assert.equal(l.status, 1);
      assert.match(l.stdout, /stale record/);
    } finally {
      cleanup(fx.dir);
    }
  });
}
