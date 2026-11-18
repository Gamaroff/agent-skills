// resolve-bare-task.sh — an all-digits argument is a TASK ID first (task.282, obs #128).
// Fixture repositories prove each answer the script gives; the controls pin what it must
// leave alone (a number that is a prefix of another, a non-digit argument).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "..", "resolve-bare-task.sh");

function git(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout;
}

function writeTask(root, n, slug, extraFiles = {}) {
  const dir = path.join(root, "docs", "tasks", `task.${n}.${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `task.${n}.${slug}.md`), `# task ${n}\n`);
  for (const [name, body] of Object.entries(extraFiles)) {
    fs.writeFileSync(path.join(dir, name), body);
  }
}

/** A repo with task 5 on `develop`, plus the registry. Returns {dir, cleanup}. */
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-bare-task-"));
  git(dir, "init", "-q", "-b", "develop");
  git(dir, "config", "user.email", "t@example.test");
  git(dir, "config", "user.name", "t");
  writeTask(dir, 5, "on-develop", {
    "task.5.plan.on-develop.md": "plan\n",
    "task.5.review.1.on-develop.md": "review\n",
  });
  writeTask(dir, 50, "fifty");
  fs.writeFileSync(
    path.join(dir, "docs", "tasks", "task-registry.md"),
    "| 5 | t | planned |\n| 50 | t | planned |\n| 99 | gone | planned |\n",
  );
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  return dir;
}

function run(dir, ...args) {
  const r = spawnSync("bash", [SCRIPT, ...args], {
    cwd: dir,
    encoding: "utf8",
  });
  return { status: r.status, out: r.stdout.trim(), err: r.stderr.trim() };
}

function withFixture(fn) {
  const dir = fixture();
  const holders = [dir];
  try {
    return fn(dir, (d) => holders.push(d));
  } finally {
    for (const d of holders) fs.rmSync(d, { recursive: true, force: true });
  }
}

test("a bare number resolves to the task document in this working tree", () => {
  withFixture((dir) => {
    const r = run(dir, "5");
    assert.equal(r.status, 0);
    assert.equal(
      r.out,
      "found\tdocs/tasks/task.5.on-develop/task.5.on-develop.md",
    );
  });
});

test("control: task 5 does not match task 50, and artefacts beside the document are never the answer", () => {
  withFixture((dir) => {
    assert.equal(
      run(dir, "50").out,
      "found\tdocs/tasks/task.50.fifty/task.50.fifty.md",
    );
    // Leading zeros are the same task.
    assert.equal(run(dir, "005").out, run(dir, "5").out);
    // The plan and review beside task 5 are not what resolves.
    assert.doesNotMatch(run(dir, "5").out, /\.plan\.|\.review\./);
  });
});

test("a task present only in a linked worktree is named with that worktree (obs #128)", () => {
  withFixture((dir, track) => {
    const wt = `${dir}-wt`;
    track(wt);
    git(dir, "worktree", "add", "-q", "-b", "feature/task.243.side", wt);
    writeTask(wt, 243, "wireframe");
    git(wt, "add", "-A");
    git(wt, "commit", "-q", "-m", "task 243");
    const r = run(dir, "243");
    assert.equal(r.status, 0);
    const [kind, where, how] = r.out.split("\t");
    assert.equal(kind, "elsewhere");
    assert.equal(how, "worktree");
    // The worktree path may be reported through a symlink-resolved prefix.
    assert.ok(
      fs.realpathSync(where) ===
        fs.realpathSync(
          path.join(wt, "docs/tasks/task.243.wireframe/task.243.wireframe.md"),
        ),
      `got ${where}`,
    );
  });
});

test("a task only on a branch no worktree holds is named with that branch", () => {
  withFixture((dir) => {
    git(dir, "checkout", "-q", "-b", "feature/task.243.side");
    writeTask(dir, 243, "wireframe");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "task 243");
    git(dir, "checkout", "-q", "develop");
    fs.rmSync(path.join(dir, "docs/tasks/task.243.wireframe"), {
      recursive: true,
      force: true,
    });
    const r = run(dir, "243");
    assert.equal(r.status, 0);
    assert.equal(r.out, "elsewhere\tfeature/task.243.side\tbranch");
  });
});

test("a number no task carries is `none`; the registry row tells a vanished task from no task", () => {
  withFixture((dir) => {
    assert.equal(run(dir, "404").out, "none");
    // 99 has a registry row and no document or branch anywhere.
    assert.equal(run(dir, "99").out, "none\tregistry");
  });
});

test("usage: a non-digit argument exits 2 and `#5` is not a bare number", () => {
  withFixture((dir) => {
    for (const bad of ["", "#5", "5a", "task.5", "-1"]) {
      const r = run(dir, bad);
      assert.equal(r.status, 2, `'${bad}' must be a usage error`);
      assert.equal(r.out, "");
    }
  });
});

test("two documents claiming one number is an error, never a guess", () => {
  withFixture((dir) => {
    writeTask(dir, 5, "duplicate");
    const r = run(dir, "5");
    assert.equal(r.status, 1);
    assert.equal(r.out, "");
    assert.match(r.err, /2 documents claim task 5/);
  });
});
