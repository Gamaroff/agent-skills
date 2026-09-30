// qa-scope-from-head.test.mjs — the QA loop's cycle-3+ scope and qa-task's re-review trigger are
// derived from the commit a gate judged (`head:`), not from its typed `updated:` (task.135).
//
// The defect this closes: the scope was `git log --since="<gate updated:>"`, and `updated:` was
// typed by the agent writing the gate. On task.130 four gates carried local time labelled `Z`, up
// to three hours in the future, so `--since` matched nothing and the scope had to be rebuilt by
// hand. The trigger in qa-task Phase 0 read the same field, so a future-dated PASS gate hid every
// later commit from it.
//
// Both blocks are EXECUTED, cut from the shipped prose with the repository's own fence reader —
// never a copy held here — in a scratch repository, under bash and zsh:
//
//   A — premise: in the fixture, `git log --since=<the gate's future updated:>` lists nothing.
//       This is the failure the head replaces; if it ever lists files, the fixture no longer
//       reproduces task.130 and the tests below prove nothing.
//   B — a schema-2 gate whose updated: is 3h in the future and whose head: is fix 1 scopes to
//       exactly what landed after fix 1 (revert the FILES source to --since → empty → HALT, red)
//   C — a schema-1 gate (no head:) runs unscoped and says so — never --since
//   D — a head that is not an ancestor of HEAD is a HALT naming the rewrite, nothing dispatched
//   E — the three copies of the scope block (shared rule, qa-task, qa-story) are one block
//   F — qa-task's Phase 0 trigger: a source commit after a future-dated gate's head re-reviews;
//       a clean PASS whose document edits landed with the gate skips; no head re-reviews; a
//       commit outside the old five-directory list counts (CR-3); an uncommitted document edit
//       counts (CR-4)
//   G — two gates exist but $LATEST_GATE is unbound in this shell → HALT, never "schema 1"; and
//       each skill's Step 3b preamble binds it with qa-cycle.sh (CR-2)

import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../qa-execute-snippets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const RULE = path.join(ROOT, "shared", "resources", "qa-re-review-scope.md");
const QA_TASK = path.join(ROOT, "skills", "qa-task", "SKILL.md");
const QA_STORY = path.join(ROOT, "skills", "qa-story", "SKILL.md");
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];

// ── Extraction ────────────────────────────────────────────────────────────────

/**
 * Strip the common leading indentation. The skills nest these fences inside a numbered list (three
 * extra spaces); the shared rule has them at column 0. extractBlocks returns the code as written.
 */
function dedent(code) {
  const lines = code.split("\n");
  const indents = lines
    .filter((l) => l.trim())
    .map((l) => /^ */.exec(l)[0].length);
  const n = Math.min(...indents);
  return lines.map((l) => l.slice(n)).join("\n");
}

/** The one fence in `file` whose (dedented) code matches `anchor`, a regex. */
function block(file, anchor) {
  const found = extractBlocks(fs.readFileSync(file, "utf8"))
    .map((b) => ({ ...b, code: dedent(b.code) }))
    .filter((b) => anchor.test(b.code));
  assert.equal(
    found.length,
    1,
    `${path.relative(ROOT, file)}: expected exactly one fence matching ${anchor}, found ${found.length}`,
  );
  return found[0].code;
}

/** From the `LAST_GATE_HEAD=` line to the end of the fence — the scope block proper. */
function scopeBlock(file) {
  const code = block(file, /^LAST_GATE_HEAD=\$\(grep -E '\^head:'/m);
  const lines = code.split("\n");
  // Start at the comment block that introduces LAST_GATE_HEAD, so the three copies compare whole.
  let start = lines.findIndex((l) => l.startsWith("LAST_GATE_HEAD="));
  while (start > 0 && lines[start - 1].startsWith("#")) start--;
  return lines.slice(start).join("\n").trimEnd();
}

/** qa-task Phase 0 step 3's freshness block. */
function triggerBlock() {
  // Anchored at line start: `LAST_GATE_HEAD=$(grep …` in Step 3b contains the same substring.
  return block(QA_TASK, /^GATE_HEAD=\$\(grep -E '\^head:'/m);
}

// ── Scratch repository ────────────────────────────────────────────────────────

// Removed after every test in the file, pass or fail (CR-7): a per-test rmSync after the
// assertions leaked the directory whenever a git call or an assertion threw.
const TMP = [];
after(() => {
  for (const d of TMP) fs.rmSync(d, { recursive: true, force: true });
});

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@t",
    },
  }).trim();
}

function commitFile(cwd, rel, body, msg) {
  fs.mkdirSync(path.dirname(path.join(cwd, rel)), { recursive: true });
  fs.writeFileSync(path.join(cwd, rel), body);
  git(cwd, "add", rel);
  git(cwd, "commit", "-q", "-m", msg);
  return git(cwd, "rev-parse", "HEAD");
}

const FUTURE = new Date(Date.now() + 3 * 3600 * 1000)
  .toISOString()
  .replace(/\.\d{3}Z$/, "Z");

/**
 * develop: base.txt
 * feature: fix1 (skills/a.sh) ← gate 2 judged this; fix2 (skills/b.sh) + the gate file, committed
 * together, as the QA loop commits a gate beside the fix that follows it.
 */
function scratch({ head = "fix1", schema = 2 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-scope-head-"));
  TMP.push(dir);
  git(dir, "init", "-q", "-b", "develop");
  commitFile(dir, "base.txt", "base\n", "base");
  git(dir, "checkout", "-q", "-b", "feature");
  const fix1 = commitFile(dir, "skills/a.sh", "echo a\n", "fix 1");
  const headLine =
    schema === 2
      ? `head: '${head === "fix1" ? fix1 : head}'        # git rev-parse HEAD when the review was performed\n`
      : "";
  const gate =
    `schema: ${schema}\ntask: 'task.9.x'\ngate: CONCERNS\nreviewer: 'QA Engineer'\n` +
    headLine +
    `updated: '${FUTURE}'\ntop_issues: []\n`;
  fs.mkdirSync(path.join(dir, "docs"), { recursive: true });
  fs.writeFileSync(path.join(dir, "docs", "task.9.gate.2.x.yml"), gate);
  fs.writeFileSync(path.join(dir, "skills", "b.sh"), "echo b\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "fix 2 + gate 2");
  return { dir, fix1, gate: path.join(dir, "docs", "task.9.gate.2.x.yml") };
}

/** A key passed as `undefined` is REMOVED from the child's environment — "unset", not "empty". */
function withoutUnset(env) {
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  return env;
}

function run(shell, dir, script, env) {
  const argv =
    shell === "zsh"
      ? ["-f", "-c", script]
      : ["--noprofile", "--norc", "-c", script];
  const r = spawnSync(shell, argv, {
    cwd: dir,
    encoding: "utf8",
    env: withoutUnset({ ...process.env, ...env }),
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function runScope(shell, fx) {
  const diff = path.join(fx.dir, "scope.diff");
  const r = run(shell, fx.dir, scopeBlock(RULE), {
    PRIOR_GATES: "2",
    SAFETY_REPROBE: "false",
    LATEST_GATE: fx.gate,
    BASE: "develop",
    DIFF_FILE: diff,
  });
  const patch = fs.existsSync(diff) ? fs.readFileSync(diff, "utf8") : "";
  fs.rmSync(fx.dir, { recursive: true, force: true });
  return { ...r, patch };
}

// ── A — premise ───────────────────────────────────────────────────────────────

test("A — the fixture reproduces task.130: --since on a future-dated gate lists nothing", () => {
  const fx = scratch();
  const listed = git(
    fx.dir,
    "log",
    `--since=${FUTURE}`,
    "--name-only",
    "--format=",
  );
  fs.rmSync(fx.dir, { recursive: true, force: true });
  assert.equal(
    listed,
    "",
    "the old scope source must be empty on this fixture",
  );
});

for (const sh of SHELLS) {
  // ── B — schema 2, future-dated: scoped to what landed after the head ─────────
  test(`B [${sh}] — a future-dated schema-2 gate scopes to the files after its head`, () => {
    const r = runScope(sh, scratch());
    assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
    assert.match(
      r.stdout,
      /Re-review scope: files changed since gate 2 \(head [0-9a-f]{12}; 2 files\) — default/,
    );
    assert.match(
      r.patch,
      /skills\/b\.sh/,
      "the fix after the head is in scope",
    );
    assert.doesNotMatch(
      r.patch,
      /skills\/a\.sh/,
      "the commit the gate judged is out of scope",
    );
  });

  // ── C — schema 1: unscoped, stated ──────────────────────────────────────────
  test(`C [${sh}] — a gate with no head: runs unscoped and says so`, () => {
    const r = runScope(sh, scratch({ schema: 1 }));
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(
      r.stdout,
      /Re-review scope: unscoped — prior gate carries no head: \(schema 1\)/,
    );
    assert.match(r.patch, /skills\/a\.sh/);
    assert.match(r.patch, /skills\/b\.sh/);
  });

  // ── D — a head outside the branch's history ─────────────────────────────────
  test(`D [${sh}] — a head that is not an ancestor of HEAD HALTs and dispatches nothing`, () => {
    const fx = scratch();
    // A commit that exists but sits on another line of history.
    git(fx.dir, "checkout", "-q", "develop");
    const stray = commitFile(fx.dir, "stray.txt", "x\n", "stray");
    git(fx.dir, "checkout", "-q", "feature");
    fs.writeFileSync(
      fx.gate,
      fs
        .readFileSync(fx.gate, "utf8")
        .replace(/^head: '[0-9a-f]+'/m, `head: '${stray}'`),
    );
    const r = runScope(sh, fx);
    assert.equal(r.status, 1, `stdout: ${r.stdout}`);
    assert.match(
      r.stdout,
      /HALT: the head of gate 2 \([0-9a-f]{40}\) is not an ancestor of HEAD/,
    );
    assert.equal(r.patch, "", "no patch is written on a HALT");
  });
}

// ── E — one block, three places ───────────────────────────────────────────────

test("E — the scope block is the same in the shared rule, qa-task and qa-story", () => {
  const canon = scopeBlock(RULE);
  assert.ok(canon.includes('git diff --name-only "$LAST_GATE_HEAD"..HEAD'));
  assert.ok(
    !/git log --since=/.test(canon.replace(/^#.*$/gm, "")),
    "no --since in executable lines",
  );
  for (const f of [QA_TASK, QA_STORY]) {
    assert.equal(
      scopeBlock(f),
      canon,
      `${path.relative(ROOT, f)}'s Step 3b scope block drifted from qa-re-review-scope.md`,
    );
  }
});

// ── F — qa-task Phase 0 trigger ───────────────────────────────────────────────

function runTrigger(shell, fx, taskFile) {
  const script =
    triggerBlock() + '\necho "CODE_MOVED=$CODE_MOVED DOC_MOVED=$DOC_MOVED"\n';
  // TASK_FILE is repo-relative, as the skill's own argument is; the block derives TASK_DIR from it.
  const r = run(shell, fx.dir, script, {
    LATEST_GATE: fx.gate,
    TASK_FILE: path.isAbsolute(taskFile)
      ? path.relative(fx.dir, taskFile)
      : taskFile,
  });
  fs.rmSync(fx.dir, { recursive: true, force: true });
  return r;
}

for (const sh of SHELLS) {
  test(`F1 [${sh}] — a source commit after a future-dated gate's head re-reviews`, () => {
    const fx = scratch(); // skills/b.sh landed after the head
    const r = runTrigger(sh, fx, path.join(fx.dir, "docs", "task.9.x.md"));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /CODE_MOVED=1 DOC_MOVED=/);
  });

  test(`F2 [${sh}] — a clean PASS whose document edits landed with the gate skips`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-trigger-"));
    TMP.push(dir);
    git(dir, "init", "-q", "-b", "develop");
    const head = commitFile(
      dir,
      "skills/a.sh",
      "echo a\n",
      "the reviewed tree",
    );
    // The QA cycle writes the gate AND edits the task document (QA Results, Change Log) after the
    // head it records — one commit.
    fs.mkdirSync(path.join(dir, "docs"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "docs", "task.9.x.md"),
      "status: ready-for-review\n## QA Results\n",
    );
    const gate = path.join(dir, "docs", "task.9.gate.1.x.yml");
    fs.writeFileSync(
      gate,
      `schema: 2\ngate: PASS\nhead: '${head}'\nupdated: '${FUTURE}'\ntop_issues: []\n`,
    );
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "qa: gate 1 + report");
    const r = runTrigger(
      sh,
      { dir, gate },
      path.join(dir, "docs", "task.9.x.md"),
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /CODE_MOVED=0 DOC_MOVED=0/);
  });

  test(`F3 [${sh}] — a gate with no head: re-reviews`, () => {
    const fx = scratch({ schema: 1 });
    const r = runTrigger(sh, fx, path.join(fx.dir, "docs", "task.9.x.md"));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /CODE_MOVED=1 DOC_MOVED=1/);
  });
}

// ── F4/F5 — the trigger's coverage (CR-3, CR-4) ───────────────────────────────

function passFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-trigger-"));
  TMP.push(dir);
  git(dir, "init", "-q", "-b", "develop");
  const head = commitFile(dir, "skills/a.sh", "echo a\n", "the reviewed tree");
  // The task's own directory — the one path the trigger excludes (CR2-4).
  const taskDir = path.join(dir, "docs", "tasks", "t9");
  fs.mkdirSync(taskDir, { recursive: true });
  const doc = path.join(taskDir, "task.9.x.md");
  fs.writeFileSync(doc, "status: ready-for-review\n## QA Results\n");
  const gate = path.join(taskDir, "task.9.gate.1.x.yml");
  fs.writeFileSync(
    gate,
    `schema: 2\ngate: PASS\nhead: '${head}'\nupdated: '${FUTURE}'\ntop_issues: []\n`,
  );
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "qa: gate 1 + report");
  return { dir, gate, doc };
}

for (const sh of SHELLS) {
  test(`F4 [${sh}] — a commit outside the old apps/packages/shared/skills/evals list re-reviews`, () => {
    const fx = passFixture();
    commitFile(fx.dir, "scripts/tool.sh", "echo t\n", "a script change");
    const r = runTrigger(sh, fx, fx.doc);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /CODE_MOVED=1 DOC_MOVED=0/);
  });

  test(`F5 [${sh}] — an uncommitted edit to the task document re-reviews`, () => {
    const fx = passFixture();
    fs.appendFileSync(fx.doc, "- [ ] a new success criterion\n");
    const r = runTrigger(sh, fx, fx.doc);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /CODE_MOVED=0 DOC_MOVED=1/);
  });

  test(`F6 [${sh}] — an uncommitted source edit re-reviews`, () => {
    const fx = passFixture();
    fs.appendFileSync(path.join(fx.dir, "skills", "a.sh"), "echo edited\n");
    const r = runTrigger(sh, fx, fx.doc);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /CODE_MOVED=1 DOC_MOVED=0/);
  });

  // ── G — the block cannot see the gate ─────────────────────────────────────
  test(`G [${sh}] — two gates but no LATEST_GATE bound in this shell HALTs, never "schema 1"`, () => {
    const fx = scratch();
    fx.gate = "";
    const r = runScope(sh, fx);
    assert.equal(r.status, 1, r.stdout);
    assert.match(
      r.stdout,
      /HALT: 2 gates exist but LATEST_GATE \(''\) is not a readable file/,
    );
    assert.doesNotMatch(r.stdout, /schema 1/);
  });
}

test("G — each skill's Step 3b fence binds LATEST_GATE with qa-cycle.sh before the scope block", () => {
  for (const [f, skill, dirVar] of [
    [QA_TASK, "qa-task", "TASK_DIR"],
    [QA_STORY, "qa-story", "STORY_DIR"],
  ]) {
    const code = block(f, /^LAST_GATE_HEAD=\$\(grep -E '\^head:'/m);
    const bind = `[ -n "\${LATEST_GATE:-}" ] || LATEST_GATE=$(bash .agents/skills/${skill}/references/qa-cycle.sh "$${dirVar}" --path gate)`;
    const at = code.indexOf(bind);
    assert.ok(
      at >= 0,
      `${path.relative(ROOT, f)}: Step 3b does not bind LATEST_GATE in its own shell`,
    );
    assert.ok(
      at < code.indexOf("LAST_GATE_HEAD="),
      "the binding must precede its first reader",
    );
  }
});

// ── CR2 — cycle 2's findings ──────────────────────────────────────────────────

for (const sh of SHELLS) {
  test(`H1 [${sh}] — cycle 3+ with SAFETY_REPROBE unset HALTs instead of narrowing (CR2-1)`, () => {
    const fx = scratch();
    const diff = path.join(fx.dir, "scope.diff");
    const r = run(sh, fx.dir, scopeBlock(RULE), {
      PRIOR_GATES: "2",
      SAFETY_REPROBE: undefined,
      LATEST_GATE: fx.gate,
      BASE: "develop",
      DIFF_FILE: diff,
    });
    assert.equal(r.status, 1, r.stdout);
    assert.match(
      r.stdout,
      /HALT: SAFETY_REPROBE is '' — bind it in this shell/,
    );
    assert.ok(
      !fs.existsSync(diff) || fs.readFileSync(diff, "utf8") === "",
      "nothing scoped",
    );
  });

  test(`H2 [${sh}] — cycle 3+ after a security FAIL (SAFETY_REPROBE=true) reviews the whole branch`, () => {
    const fx = scratch();
    const diff = path.join(fx.dir, "scope.diff");
    const r = run(sh, fx.dir, scopeBlock(RULE), {
      PRIOR_GATES: "2",
      SAFETY_REPROBE: "true",
      LATEST_GATE: fx.gate,
      BASE: "develop",
      DIFF_FILE: diff,
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const patch = fs.readFileSync(diff, "utf8");
    assert.match(
      patch,
      /skills\/a\.sh/,
      "the commit the gate judged is back in scope",
    );
    assert.match(patch, /skills\/b\.sh/);
  });

  test(`F7 [${sh}] — a documentation deliverable outside the task directory re-reviews (CR2-4)`, () => {
    const fx = passFixture();
    commitFile(
      fx.dir,
      "docs/reference/guide.md",
      "# guide\n",
      "a docs deliverable",
    );
    const r = runTrigger(sh, fx, fx.doc);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /CODE_MOVED=1 DOC_MOVED=0/);
  });

  test(`F8 [${sh}] — an untracked file outside the task directory re-reviews (CR2-5)`, () => {
    const fx = passFixture();
    fs.mkdirSync(path.join(fx.dir, "tools"));
    fs.writeFileSync(path.join(fx.dir, "tools", "new.sh"), "echo new\n");
    const r = runTrigger(sh, fx, fx.doc);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /CODE_MOVED=1 DOC_MOVED=0/);
  });

  test(`F9 [${sh}] — with LATEST_GATE unset the trigger binds the gate itself, and a clean PASS skips (CR2-3)`, () => {
    const fx = passFixture();
    // The block addresses the helper as .agents/skills/qa-task/references/qa-cycle.sh from the
    // repository root; give the scratch repo one, excluded so it is not an untracked change.
    const helper = path.join(
      fx.dir,
      ".agents",
      "skills",
      "qa-task",
      "references",
    );
    fs.mkdirSync(helper, { recursive: true });
    fs.copyFileSync(
      path.join(ROOT, "shared", "resources", "qa-cycle.sh"),
      path.join(helper, "qa-cycle.sh"),
    );
    fs.appendFileSync(
      path.join(fx.dir, ".git", "info", "exclude"),
      ".agents/\n",
    );
    fx.gate = undefined;
    const r = runTrigger(sh, fx, fx.doc);
    assert.equal(r.status, 0, r.stderr);
    assert.match(
      r.stdout,
      /CODE_MOVED=0 DOC_MOVED=0/,
      "bound: the gate's head was read in this shell",
    );
  });
}

// ── I — Phase 0 step 5's probe binds its own gate (cycle-2 probe) ─────────────
// Unbound in its own shell, the probe read "no gate" and left SAFETY_REPROBE=false, so the
// safety carve-out that Step 3b now refuses to run without could never be true.

for (const [skillFile, skill, docVar] of [
  [QA_TASK, "qa-task", "TASK_FILE"],
  [QA_STORY, "qa-story", "STORY_FILE"],
]) {
  for (const sh of SHELLS) {
    test(`I [${sh}] ${skill} — the step-5 probe fires on a security FAIL with LATEST_GATE unset`, () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-scope-head-"));
      TMP.push(dir);
      git(dir, "init", "-q", "-b", "develop");
      const workDir = path.join(dir, "docs", "tasks", "t9");
      fs.mkdirSync(workDir, { recursive: true });
      fs.writeFileSync(
        path.join(workDir, "task.9.x.md"),
        "status: ready-for-review\n",
      );
      fs.writeFileSync(
        path.join(workDir, "task.9.gate.1.x.yml"),
        "schema: 2\ngate: FAIL\nnfr_validation:\n  security:\n    status: FAIL\n    evidence: measured\n  performance:\n    status: PASS\n",
      );
      const helper = path.join(dir, ".agents", "skills", skill, "references");
      fs.mkdirSync(helper, { recursive: true });
      fs.copyFileSync(
        path.join(ROOT, "shared", "resources", "qa-cycle.sh"),
        path.join(helper, "qa-cycle.sh"),
      );
      const probe = block(skillFile, /^SAFETY_REPROBE=false$/m);
      const r = run(
        sh,
        dir,
        probe + '\necho "SAFETY_REPROBE=$SAFETY_REPROBE"\n',
        {
          LATEST_GATE: undefined,
          [docVar]: "docs/tasks/t9/task.9.x.md",
        },
      );
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /SAFETY_REPROBE=true/);
    });
  }
}
