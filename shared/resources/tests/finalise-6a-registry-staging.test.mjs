/**
 * Executed test of `/finalise` 6a's registry handling (task 245).
 *
 * 6a used to `git add docs/tasks/task-registry.md`, which stages the WHOLE file:
 * a parallel session's uncommitted row in the same checkout rode into the
 * acceptance commit (obs #127). The row is now staged by Step 7.4's
 * `registry-tick.js --stage`, and 6a adds no registry at all.
 *
 * This test slices the real 6a block out of `skills/finalise/SKILL.md` — from the
 * `STEM=` binding up to the push — and RUNS it in a scratch git repository whose
 * registry holds a parallel row. It asserts on what the commit contains, never on
 * the prose. `finalise-bug-mode.test.mjs` slices the same block only up to its
 * `--- acceptance artefacts resolved ---` marker, before any registry handling,
 * so this case is new.
 *
 * Run via: node --test shared/resources/tests/finalise-6a-registry-staging.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SKILL = readFileSync(
  path.join(REPO_ROOT, "skills", "finalise", "SKILL.md"),
  "utf8",
);
const TICK = path.join(REPO_ROOT, "shared", "resources", "registry-tick.js");
const SELECTOR_REL = path.join(
  "skills",
  "develop-next",
  "scripts",
  "select-next.mjs",
);
const NEWEST_REL = path.join(
  "skills",
  "finalise",
  "references",
  "newest-numbered.sh",
);

const SHELLS = [
  "bash",
  ...(spawnSync("zsh", ["-c", "true"], { stdio: "ignore" }).status === 0
    ? ["zsh"]
    : []),
];

const HEADER = [
  "# Task Registry",
  "",
  "**Next Available Task Number:** **99**",
  "",
  "| #  | Title | Status | Category | Priority | Created | Issue | Depends on |",
  "|----|-------|--------|----------|----------|---------|-------|------------|",
];
const row = (n, status) =>
  `| ${n} | [T${n}](task.${n}.demo/task.${n}.demo.md) | ${status} | infrastructure | Medium | 2026-01-01 | — | — |`;

/** The 6a block, from the STEM binding to just before the push, inputs substituted. */
function sixABlock() {
  const end = SKILL.indexOf(
    'git push origin "$BRANCH"',
    SKILL.indexOf("6a. **Acceptance commit"),
  );
  assert.ok(end > -1, "6a push line present");
  const start = SKILL.lastIndexOf('STEM="{', end);
  assert.ok(start > -1, "6a STEM binding present");
  return SKILL.slice(start, end)
    .replace(/^ {3}/gm, "")
    .replace(/\{document-directory\}/g, '"$DIR"')
    .replace(/\{document-path\}/g, '"$DOC"')
    .replace(/STEM="\{[^\n]*\}"/, 'STEM="task.9"')
    .replace(/DOC_KIND="\{[^\n]*\}"/, 'DOC_KIND="task"');
}

/** A scratch consumer repo: tasks 8 and 9 committed, task 9 accepted, a parallel row 10 uncommitted. */
function scratch() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "finalise-6a-"));
  const g = (...a) =>
    execFileSync("git", ["-C", dir, ...a], { encoding: "utf8" });
  mkdirSync(path.join(dir, "skills", "develop-next", "scripts"), {
    recursive: true,
  });
  symlinkSync(path.join(REPO_ROOT, SELECTOR_REL), path.join(dir, SELECTOR_REL));
  mkdirSync(path.join(dir, "skills", "finalise", "references"), {
    recursive: true,
  });
  copyFileSync(path.join(REPO_ROOT, NEWEST_REL), path.join(dir, NEWEST_REL));
  mkdirSync(path.join(dir, ".agents"), { recursive: true });
  symlinkSync(path.join(dir, "skills"), path.join(dir, ".agents", "skills"));
  const taskDir = path.join(dir, "docs", "tasks", "task.9.demo");
  mkdirSync(taskDir, { recursive: true });
  const doc = path.join(taskDir, "task.9.demo.md");
  writeFileSync(
    doc,
    "---\nid: task.9\ntype: task\nstatus: ready-for-review\n---\n\n# Demo\n",
  );
  writeFileSync(path.join(taskDir, "task.9.dod.1.demo.md"), "# DoD\n");
  writeFileSync(
    path.join(taskDir, "sprint-review-summary.md"),
    "# Sprint review\n",
  );
  const registry = path.join(dir, "docs", "tasks", "task-registry.md");
  writeFileSync(
    registry,
    [...HEADER, row(8, "accepted"), row(9, "ready-for-review"), ""].join("\n"),
  );
  g("init", "-q");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "t");
  g("add", "-A");
  g("commit", "-q", "-m", "base");
  // Finalise 7.2 sets the document accepted; a PARALLEL session adds row 10 and bumps the counter.
  writeFileSync(
    doc,
    readFileSync(doc, "utf8").replace("ready-for-review", "accepted"),
  );
  writeFileSync(
    registry,
    readFileSync(registry, "utf8").replace("**99**", "**100**") +
      row(10, "draft") +
      "\n",
  );
  return { dir, g, doc, taskDir, registry };
}

function tick(s) {
  const out = execFileSync(
    process.execPath,
    [TICK, "--file", s.doc, "--stage", "--json"],
    {
      cwd: s.dir,
      encoding: "utf8",
    },
  );
  return JSON.parse(out);
}

function runBlock(shell, s, block) {
  return spawnSync(shell, ["-s", "--"], {
    input: block,
    encoding: "utf8",
    cwd: s.dir,
    env: { PATH: process.env.PATH, DIR: s.taskDir, DOC: s.doc, HOME: s.dir },
  });
}

for (const shell of SHELLS) {
  test(`[${shell}] 6a commits the ticked row and leaves a parallel registry row out of the commit (obs #127)`, () => {
    const s = scratch();
    try {
      const t = tick(s);
      assert.equal(t.reason, "ticked");
      assert.equal(t.stageReason, "staged");
      const r = runBlock(shell, s, sixABlock());
      assert.equal(r.status, 0, r.stdout + r.stderr);
      const committed = s.g("show", "HEAD:docs/tasks/task-registry.md");
      assert.match(
        committed,
        /^\| 9 \|.*accepted/m,
        "the ticked row is in the commit",
      );
      assert.doesNotMatch(
        committed,
        /^\| 10 \|/m,
        "the parallel row is NOT in the commit",
      );
      assert.doesNotMatch(
        committed,
        /\*\*100\*\*/,
        "the parallel counter bump is NOT in the commit",
      );
      const working = readFileSync(s.registry, "utf8");
      assert.match(
        working,
        /^\| 10 \|/m,
        "the parallel row is still in the working file",
      );
      assert.match(working, /\*\*100\*\*/);
      assert.match(
        s.g("log", "-1", "--format=%s"),
        /accept — DoD, sprint review; registry ticked/,
      );
    } finally {
      rmSync(s.dir, { recursive: true, force: true });
    }
  });

  // The control: put the old whole-file add back in front of the block. The same
  // assertion must now FAIL, which is what proves the test above can see the defect.
  test(`[${shell}] control — with a whole-file registry add restored, the parallel row rides into the commit`, () => {
    const s = scratch();
    try {
      tick(s);
      const r = runBlock(
        shell,
        s,
        "git add docs/tasks/task-registry.md\n" + sixABlock(),
      );
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(
        s.g("show", "HEAD:docs/tasks/task-registry.md"),
        /^\| 10 \|/m,
        "the old behaviour sweeps the parallel row in",
      );
    } finally {
      rmSync(s.dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] the 6a block carries no whole-file add of the task registry`, () => {
    assert.doesNotMatch(
      sixABlock().replace(/^\s*#.*$/gm, ""),
      /git add[^\n]*task-registry\.md/,
    );
  });
}
