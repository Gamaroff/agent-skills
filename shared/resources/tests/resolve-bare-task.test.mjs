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

test("a digit string too long to be a task id is refused, never wrapped to another task (T282-QA-1)", () => {
  withFixture((dir) => {
    // 2^64 + 1 wrapped to 1 under `$((10#$n))`; 2^63 wrapped negative. Task 1 exists here too, so a
    // wrap would resolve to a real document and read as a correct answer.
    writeTask(dir, 1, "one");
    for (const long of [
      "18446744073709551617",
      "9223372036854775808",
      "1000000000",
    ]) {
      const r = run(dir, long);
      assert.equal(r.status, 2, `${long} must be refused`);
      assert.equal(r.out, "");
    }
    // Controls: the longest accepted value, and leading zeros that do not count toward the cap.
    assert.equal(run(dir, "999999999").out, "none");
    assert.equal(run(dir, "000000000000005").out, run(dir, "5").out);
    assert.equal(
      run(dir, "000").out,
      "none",
      "all zeros is task 0, which has no document",
    );
  });
});

// The block the step-0 document tells an agent to run, taken from the document itself and run
// from the repository root of a consumer-shaped checkout: the script is installed under
// `.agents/skills/<skill>/references/`, not beside the cwd (T282-QA-4). Every other test here
// calls the script by an absolute path, which cannot see a path that does not resolve.
const STEP0 = path.join(
  HERE,
  "..",
  "develop-pipeline-step-0-resolve-and-prepare.md",
);

function deliveredBlock() {
  const lines = fs.readFileSync(STEP0, "utf8").split("\n");
  const at = lines.findIndex((l) => l === "### Bare number — a task id first");
  assert.ok(at >= 0, "the Bare number section exists");
  const open = lines.findIndex((l, i) => i > at && l === "```bash");
  const close = lines.findIndex((l, i) => i > open && l === "```");
  assert.ok(open > at && close > open, "the section holds a bash block");
  const block = lines.slice(open + 1, close).join("\n");
  assert.match(block, /resolve-bare-task\.sh/, "the block runs the script");
  return block;
}

/** Run the delivered block for `digits` as `skill`, from `dir`, with the script installed or not. */
function runBlock(dir, { digits, skill = "develop-task", install = true }) {
  if (install) {
    const refs = path.join(dir, ".agents", "skills", skill, "references");
    fs.mkdirSync(refs, { recursive: true });
    fs.copyFileSync(SCRIPT, path.join(refs, "resolve-bare-task.sh"));
  }
  const block = deliveredBlock()
    .replaceAll("{develop-task|review-task}", skill)
    .replaceAll("<digits>", digits);
  const r = spawnSync("bash", ["-c", block], { cwd: dir, encoding: "utf8" });
  return { status: r.status, out: r.stdout.trim(), err: r.stderr.trim() };
}

test("the delivered block resolves a bare number from the repository root of a consumer checkout (T282-QA-4)", () => {
  withFixture((dir) => {
    for (const skill of ["develop-task", "review-task"]) {
      const r = runBlock(dir, { digits: "5", skill });
      assert.equal(r.status, 0, `${skill}: ${r.out} ${r.err}`);
      assert.equal(
        r.out,
        "found\tdocs/tasks/task.5.on-develop/task.5.on-develop.md",
      );
    }
  });
});

test("controls: a script that did not run is its own HALT, and a resolver refusal is not mistaken for it", () => {
  withFixture((dir) => {
    // The script is not installed where the block points: exit 126/127, never a resolver answer.
    const missing = runBlock(dir, { digits: "5", install: false });
    assert.equal(missing.status, 1);
    assert.match(
      missing.out,
      /HALT: resolve-bare-task\.sh did not run \(rc=127\)/,
    );
    assert.doesNotMatch(missing.out, /could not resolve/);
    // Installed, and the resolver itself refuses an over-long number (exit 2): the other HALT.
    const refused = runBlock(dir, { digits: "18446744073709551617" });
    assert.equal(refused.status, 1);
    assert.match(
      refused.out,
      /HALT: could not resolve '18446744073709551617' as a task id \(rc=2/,
    );
    assert.doesNotMatch(refused.out, /did not run/);
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
