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
//   L — task.168: the trigger re-reviews on a head it cannot vouch for (CR4-1); a `:`-named file
//       stays in the scoped patch (CR4-2); Step 3b recomputes clause 1 and runs whole-branch after
//       a security FAIL even with SAFETY_REPROBE=false bound (CR3-4); an uncommitted fix outside
//       the work item HALTs, .claude/state does not (CR3-7); Phase 0 steps 2 and 5 HALT on a
//       qa-cycle.sh refusal instead of reading "no gate" (5c CR-1)

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
  // The work item's own document, on the base: the trigger requires it to exist (CR3-1).
  commitFile(dir, "docs/task.9.x.md", "status: ready-for-review\n", "the task");
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

/**
 * The scratch repo's bundled helpers, at the path the blocks address them by from the repository
 * root — excluded, so they are not an untracked change.
 */
function installHelpers(dir, skill) {
  const refs = path.join(dir, ".agents", "skills", skill, "references");
  fs.mkdirSync(refs, { recursive: true });
  for (const f of ["qa-cycle.sh", "qa-safety-clause1.sh"]) {
    fs.copyFileSync(
      path.join(ROOT, "shared", "resources", f),
      path.join(refs, f),
    );
  }
  fs.appendFileSync(path.join(dir, ".git", "info", "exclude"), ".agents/\n");
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

function runScope(shell, fx, env = {}) {
  // Outside the repository: inside it, the patch file is itself an untracked change and the
  // uncommitted-fix HALT (task.168 CR3-7) fires on it. The skills write it under $TMPDIR too.
  const diff = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "qa-scope-diff-")),
    "scope.diff",
  );
  TMP.push(path.dirname(diff));
  const r = run(shell, fx.dir, scopeBlock(RULE), {
    PRIOR_GATES: "2",
    SAFETY_REPROBE: "false",
    LATEST_GATE: fx.gate,
    BASE: "develop",
    DIFF_FILE: diff,
    WORK_ITEM_DIR: "docs",
    ...env,
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
  assert.ok(
    canon.includes(
      'git -c core.quotePath=false diff --name-only -z "$LAST_GATE_HEAD"..HEAD',
    ),
  );
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

function passFixture({ head: headOverride } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-trigger-"));
  TMP.push(dir);
  git(dir, "init", "-q", "-b", "develop");
  const reviewed = commitFile(
    dir,
    "skills/a.sh",
    "echo a\n",
    "the reviewed tree",
  );
  const head = headOverride ?? reviewed;
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
      installHelpers(dir, skill);
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

// ── Cycle 3 (CR3-1, -2, -3, -6): inputs are validated, paths survive quoting ──

for (const sh of SHELLS) {
  test(`J1 [${sh}] — the trigger HALTs when TASK_FILE is not bound (CR3-1)`, () => {
    const fx = passFixture();
    const r = run(sh, fx.dir, triggerBlock(), {
      LATEST_GATE: fx.gate,
      TASK_FILE: undefined,
    });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /HALT: TASK_FILE \(''\) is not a file/);
  });

  test(`J2 [${sh}] — the trigger HALTs when the task file sits at the repository root (CR3-2)`, () => {
    const fx = passFixture();
    fs.writeFileSync(
      path.join(fx.dir, "task.9.x.md"),
      "status: ready-for-review\n",
    );
    const r = run(sh, fx.dir, triggerBlock(), {
      LATEST_GATE: fx.gate,
      TASK_FILE: "task.9.x.md",
    });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /is the repository root/);
  });

  for (const [skillFile, skill, docVar] of [
    [QA_TASK, "qa-task", "TASK_FILE"],
    [QA_STORY, "qa-story", "STORY_FILE"],
  ]) {
    test(`J3 [${sh}] ${skill} — the step-5 probe HALTs instead of saying false when ${docVar} is not bound (CR3-1)`, () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-scope-head-"));
      TMP.push(dir);
      git(dir, "init", "-q", "-b", "develop");
      const r = run(
        sh,
        dir,
        block(skillFile, /^SAFETY_REPROBE=false$/m) +
          '\necho "SAFETY_REPROBE=$SAFETY_REPROBE"\n',
        {
          LATEST_GATE: undefined,
          [docVar]: undefined,
        },
      );
      assert.equal(r.status, 1, r.stdout);
      assert.match(
        r.stdout,
        new RegExp(`HALT: ${docVar} \\(''\\) is not a file`),
      );
      assert.doesNotMatch(r.stdout, /SAFETY_REPROBE=false/);
    });

    test(`J4 [${sh}] ${skill} — the Step 3b fence HALTs when its work-item directory is not bound (CR3-3)`, () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-scope-head-"));
      TMP.push(dir);
      git(dir, "init", "-q", "-b", "develop");
      const bin = path.join(dir, ".bin");
      fs.mkdirSync(bin);
      fs.writeFileSync(path.join(bin, "gh"), "#!/bin/sh\nexit 1\n", {
        mode: 0o755,
      });
      const fence = block(skillFile, /^LAST_GATE_HEAD=\$\(grep -E '\^head:'/m);
      const r = run(sh, dir, fence, {
        PATH: `${bin}:${process.env.PATH}`,
        TASK_DIR: undefined,
        STORY_DIR: undefined,
        LATEST_GATE: undefined,
      });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(
        r.stdout,
        /HALT: (TASK|STORY)_DIR \(''\) is not a directory/,
      );
    });
  }

  test(`K [${sh}] — a non-ASCII path changed after the head stays in the scope (CR3-6)`, () => {
    const fx = scratch();
    commitFile(fx.dir, "skills/é.sh", "echo accented\n", "a non-ASCII path");
    const r = runScope(sh, fx);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.patch,
      /echo accented/,
      "the file's change is in the patch, not dropped as a quoted name",
    );
  });
}

// ── L — task.168: the six task.135 follow-ups ─────────────────────────────────

/** The Step 3b fence of `skillFile`, whole — preamble and the shared scope block. */
function step3bFence(skillFile) {
  return block(skillFile, /^LAST_GATE_HEAD=\$\(grep -E '\^head:'/m);
}

/** The Phase 0 step 2 fence of `skillFile` — the one that reports the existing review. */
function step2Fence(skillFile) {
  return block(skillFile, /Found existing QA review/);
}

const SECURITY_FAIL =
  "nfr_validation:\n  security:\n    status: FAIL\n    evidence: measured\n";

for (const sh of SHELLS) {
  test(`L1 [${sh}] — a gate whose head is \`HEAD\` re-reviews, never "nothing moved" (CR4-1)`, () => {
    // rev-list HEAD..HEAD counts 0: without the format check a PASS gate skipped review forever.
    const fx = passFixture({ head: "HEAD" });
    const r = runTrigger(sh, fx, fx.doc);
    assert.equal(r.status, 0, r.stderr);
    assert.match(
      r.stdout,
      /gate head 'HEAD' is not a 40-hex commit on this branch/,
    );
    assert.match(r.stdout, /CODE_MOVED=1 DOC_MOVED=1/);
  });

  test(`L2 [${sh}] — a head that is not an ancestor of HEAD re-reviews (CR4-1)`, () => {
    // A commit AHEAD of the checkout — a gate written on a branch that was later rewritten or
    // reset. Every commit reachable from HEAD is reachable from it, so rev-list counted 0.
    const fx = passFixture();
    git(fx.dir, "checkout", "-q", "-b", "ahead");
    const ahead = commitFile(
      fx.dir,
      "skills/z.sh",
      "echo z\n",
      "not on this branch",
    );
    git(fx.dir, "checkout", "-q", "develop");
    fs.writeFileSync(
      fx.gate,
      fs
        .readFileSync(fx.gate, "utf8")
        .replace(/^head: .*$/m, `head: '${ahead}'`),
    );
    git(fx.dir, "add", "-A");
    git(fx.dir, "commit", "-q", "--amend", "--no-edit");
    const r = runTrigger(sh, fx, fx.doc);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /is not a 40-hex commit on this branch/);
    assert.match(r.stdout, /CODE_MOVED=1 DOC_MOVED=1/);
  });

  test(`L3 [${sh}] — a file whose name begins with \`:\` stays in the scoped patch (CR4-2)`, () => {
    // At the repository ROOT: only a pathspec that BEGINS with `:` is magic, and the file list is
    // root-relative, so `skills/:colon.sh` was never at risk. `:colon.sh` as a pathspec is the short
    // magic form with no signature — it matches `colon.sh`, and this file left the scope.
    const fx = scratch();
    // `git add -A`, not commitFile's `git add <name>`: the fixture's own add would read it as magic.
    fs.writeFileSync(path.join(fx.dir, ":colon.sh"), "echo colon\n");
    git(fx.dir, "add", "-A");
    git(fx.dir, "commit", "-q", "-m", "a magic-looking name");
    const r = runScope(sh, fx);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.patch,
      /echo colon/,
      "the file is a name, not pathspec magic — its change is in the patch",
    );
  });

  test(`L4 [${sh}] — an uncommitted change outside the work item HALTs the scoped arm (CR3-7)`, () => {
    const fx = scratch();
    fs.appendFileSync(
      path.join(fx.dir, "skills", "b.sh"),
      "echo uncommitted fix\n",
    );
    const r = runScope(sh, fx);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /HALT: uncommitted changes outside the work item/);
    assert.match(r.stdout, /skills\/b\.sh/, "the HALT names the path");
    assert.equal(r.patch, "", "nothing is dispatched");
  });

  test(`L5 [${sh}] — the work item's own files and .claude/state do not HALT (CR3-7)`, () => {
    // The QA cycle writes its report beside the gate; the develop pipeline writes its lock under
    // .claude/state, untracked wherever a consumer's .gitignore does not cover it.
    const fx = scratch();
    fs.writeFileSync(path.join(fx.dir, "docs", "task.9.qa.3.x.md"), "report\n");
    fs.mkdirSync(path.join(fx.dir, ".claude", "state"), { recursive: true });
    fs.writeFileSync(
      path.join(fx.dir, ".claude", "state", "develop-pipeline.lock"),
      "{}\n",
    );
    const r = runScope(sh, fx);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /Re-review scope: files changed since gate 2/);
  });

  test(`L6 [${sh}] — the scoped arm refuses an unbound or root work-item directory (CR3-7)`, () => {
    for (const bad of [undefined, "."]) {
      const fx = scratch();
      const r = runScope(sh, fx, { WORK_ITEM_DIR: bad });
      assert.equal(r.status, 1, `${bad}: ${r.stdout}${r.stderr}`);
      assert.match(
        r.stdout,
        /HALT: WORK_ITEM_DIR \(.*\) is not a work-item directory/,
      );
    }
  });
}

for (const [skillFile, skill, dirVar, docVar, prefix] of [
  [QA_TASK, "qa-task", "TASK_DIR", "TASK_FILE", "task.9"],
  [QA_STORY, "qa-story", "STORY_DIR", "STORY_FILE", "story.9.1"],
]) {
  /** A work item whose directory holds two files claiming cycle 2 — qa-cycle.sh refuses them. */
  function twoGatesOneCycle() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-scope-head-"));
    TMP.push(dir);
    git(dir, "init", "-q", "-b", "develop");
    const work = path.join(dir, "docs", "w");
    fs.mkdirSync(work, { recursive: true });
    fs.writeFileSync(
      path.join(work, `${prefix}.x.md`),
      "status: ready-for-review\n",
    );
    for (const n of ["2.a", "2.b"]) {
      fs.writeFileSync(
        path.join(work, `${prefix}.gate.${n}.yml`),
        `gate: FAIL\n${SECURITY_FAIL}`,
      );
    }
    installHelpers(dir, skill);
    return { dir, doc: `docs/w/${prefix}.x.md` };
  }

  for (const sh of SHELLS) {
    test(`L7 [${sh}] ${skill} — step 5 HALTs on a qa-cycle.sh refusal instead of saying false (5c CR-1)`, () => {
      const fx = twoGatesOneCycle();
      const r = run(
        sh,
        fx.dir,
        block(skillFile, /^SAFETY_REPROBE=false$/m) +
          '\necho "SAFETY_REPROBE=$SAFETY_REPROBE"\n',
        { LATEST_GATE: undefined, [docVar]: fx.doc },
      );
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /HALT: qa-cycle\.sh refused cycle 2/);
      assert.match(
        r.stderr,
        /2 gate files claim cycle 2/,
        "the helper's own reason is kept",
      );
      assert.doesNotMatch(r.stdout, /SAFETY_REPROBE=false/);
    });

    test(`L8 [${sh}] ${skill} — step 2 HALTs on a qa-cycle.sh refusal instead of reading "no gate" (5c CR-1)`, () => {
      const fx = twoGatesOneCycle();
      const r = run(sh, fx.dir, step2Fence(skillFile), {
        LATEST_GATE: undefined,
        [docVar]: fx.doc,
      });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /HALT: qa-cycle\.sh refused cycle 2/);
    });

    test(`L9 [${sh}] ${skill} — Step 3b runs whole-branch after a security FAIL with SAFETY_REPROBE=false bound (CR3-4)`, () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-scope-head-"));
      TMP.push(dir);
      git(dir, "init", "-q", "-b", "develop");
      commitFile(dir, "base.txt", "base\n", "base");
      git(dir, "update-ref", "refs/remotes/origin/develop", "develop");
      git(dir, "checkout", "-q", "-b", "feature");
      const fix1 = commitFile(dir, "skills/a.sh", "echo early\n", "fix 1");
      const work = path.join(dir, "docs", "w");
      fs.mkdirSync(work, { recursive: true });
      fs.writeFileSync(
        path.join(work, `${prefix}.gate.1.x.yml`),
        `schema: 2\ngate: CONCERNS\nhead: '${fix1}'\n`,
      );
      const fix2 = commitFile(dir, "skills/b.sh", "echo b\n", "fix 2 + gate 1");
      // Gate 2 judged fix 2 and failed security. Cycle 3's scoped arm would read only c.sh.
      fs.writeFileSync(
        path.join(work, `${prefix}.gate.2.x.yml`),
        `schema: 2\ngate: FAIL\nhead: '${fix2}'\n${SECURITY_FAIL}`,
      );
      commitFile(dir, "skills/c.sh", "echo c\n", "fix 3 + gate 2");
      installHelpers(dir, skill);
      const bin = path.join(dir, ".bin");
      fs.mkdirSync(bin);
      fs.writeFileSync(path.join(bin, "gh"), "#!/bin/sh\nexit 1\n", {
        mode: 0o755,
      });
      fs.appendFileSync(path.join(dir, ".git", "info", "exclude"), ".bin/\n");
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qa-scope-3b-"));
      TMP.push(tmp);
      const r = run(sh, dir, step3bFence(skillFile), {
        PATH: `${bin}:${process.env.PATH}`,
        TMPDIR: tmp,
        [dirVar]: "docs/w",
        LATEST_GATE: undefined,
        SAFETY_REPROBE: "false",
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      const [diffName] = fs
        .readdirSync(tmp)
        .filter((f) => f.startsWith("qa-code-review."));
      assert.ok(diffName, "the fence wrote its patch under $TMPDIR");
      const patch = fs.readFileSync(path.join(tmp, diffName), "utf8");
      assert.match(
        patch,
        /echo early/,
        "whole-branch: clause 1 recomputed from gate 2 overrides the bound false",
      );
      assert.doesNotMatch(r.stdout, /Re-review scope: files changed since/);
    });
  }
}
