// commit-changes-scope-mode.test.mjs — `/commit-changes --scope` stages the scope and nothing
// else, and Step 4's scope reaches every edit a correct run made (task.147; obs #142).
//
// Scope mode ran a bare `git add -u` before its allowlist, which staged tracked modifications
// across the WHOLE tree. In a checkout another session was editing, that would have swept the
// other session's package.json, CHANGELOG.md and README.md into task.128's commit.
//
// Bounding the staging moves the risk onto Step 4's scope derivation, which read the COMMITTED diff
// only and skipped root-level files. On a normal run nothing is committed before Step 4, so the
// derivation yielded the work-item dir alone, and a bounded stage would have left every code edit
// out of the PR (task.147 review 1, C1). The second half of this file holds that derivation.
//
// Both blocks are cut from the shipped documents and run in a fixture repo under bash and zsh.

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

const COMMIT_CHANGES = "skills/commit-changes/SKILL.md";
const STEP4 = "shared/resources/develop-pipeline-step-4-create-pr.md";
const WORK_ITEM = "docs/tasks/task.9.fx";

function scopeStage(scopeArgs) {
  const code = blockBy(
    readDoc(COMMIT_CHANGES),
    "git add -A is NEVER called in scope mode",
  );
  return bind(code, { '"scope/one" "scope/two" ...': scopeArgs });
}

function derivation() {
  const code = blockBy(readDoc(STEP4), "Scope-derivation");
  return bind(code, { "{work-item-dir}": WORK_ITEM, "{Q2_answer}": "develop" });
}

const staged = (work) =>
  git(work, "diff", "--cached", "--name-only")
    .split("\n")
    .filter(Boolean)
    .sort();

// A feature branch whose tracked files are all on the base, so `develop...HEAD` starts empty.
function baseWith(files) {
  const fx = fixtureRepo();
  for (const f of files) write(fx.work, f, "v1\n");
  git(fx.work, "add", "-A");
  git(fx.work, "commit", "-q", "-m", "more base");
  git(fx.work, "update-ref", "refs/heads/develop", "HEAD");
  return fx;
}

for (const sh of SHELLS) {
  // ── /commit-changes --scope ───────────────────────────────────────────────

  test(`[${sh}] scope mode stages inside the scope only — tracked, new and deleted`, () => {
    const fx = baseWith([
      `${WORK_ITEM}/report.md`,
      `${WORK_ITEM}/old.md`,
      "CHANGELOG.md",
    ]);
    try {
      write(fx.work, `${WORK_ITEM}/report.md`, "v2\n"); // tracked edit inside
      write(fx.work, `${WORK_ITEM}/sub/new.md`, "new\n"); // new file, new dir, inside
      fs.rmSync(path.join(fx.work, WORK_ITEM, "old.md")); // deletion inside
      write(fx.work, "package.json", '{"other":"session"}\n'); // tracked edit outside
      write(fx.work, "CHANGELOG.md", "other session\n"); // tracked edit outside
      write(fx.work, "stray.txt", "stray\n"); // new file outside

      const r = run(sh, scopeStage(`"${WORK_ITEM}"`), { cwd: fx.work });
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(staged(fx.work), [
        `${WORK_ITEM}/old.md`,
        `${WORK_ITEM}/report.md`,
        `${WORK_ITEM}/sub/new.md`,
      ]);
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] a scope directory holding only new files stages without error`, () => {
    const fx = baseWith([`${WORK_ITEM}/report.md`]);
    try {
      write(fx.work, "brand/new/a.js", "a\n");
      const r = run(sh, scopeStage(`"${WORK_ITEM}" "brand/new"`), {
        cwd: fx.work,
      });
      assert.equal(
        r.status,
        0,
        `a scope of only-untracked files must not abort: ${r.stderr}`,
      );
      assert.deepEqual(staged(fx.work), ["brand/new/a.js"]);
    } finally {
      cleanup(fx.dir);
    }
  });

  // ── Step 4's scope derivation ─────────────────────────────────────────────

  test(`[${sh}] nothing committed since base: the scope still reaches every uncommitted edit`, () => {
    const fx = baseWith([
      `${WORK_ITEM}/task.md`,
      "skills/x/SKILL.md",
      "CHANGELOG.md",
    ]);
    try {
      write(fx.work, "skills/x/SKILL.md", "edited\n");
      write(fx.work, "CHANGELOG.md", "edited\n");
      write(fx.work, `${WORK_ITEM}/task.md`, "edited\n");
      assert.equal(
        git(fx.work, "diff", "--name-only", "develop...HEAD"),
        "",
        "fixture: not empty",
      );

      const r = run(
        sh,
        derivation() + '\nprintf "%s\\n" "${SCOPE_PATHS[@]}"\n',
        { cwd: fx.work },
      );
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(r.stdout.split("\n").filter(Boolean).sort(), [
        "CHANGELOG.md",
        WORK_ITEM,
        "skills/x",
      ]);
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] committed and uncommitted edits both reach the scope, once each`, () => {
    const fx = baseWith([`${WORK_ITEM}/task.md`, "src/a.js", "src/b.js"]);
    try {
      write(fx.work, "src/a.js", "committed\n");
      git(fx.work, "commit", "-q", "-am", "work");
      write(fx.work, "src/b.js", "uncommitted\n");

      const r = run(
        sh,
        derivation() + '\nprintf "%s\\n" "${SCOPE_PATHS[@]}"\n',
        { cwd: fx.work },
      );
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(r.stdout.split("\n").filter(Boolean).sort(), [
        WORK_ITEM,
        "src",
      ]);
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] a path deleted in an earlier commit is left out, and staging still succeeds`, () => {
    const fx = baseWith([`${WORK_ITEM}/task.md`, "old/gone.js", "src/a.js"]);
    try {
      // Committed before Step 4: a root file and a whole directory removed.
      git(fx.work, "rm", "-q", "package.json", "old/gone.js");
      git(fx.work, "commit", "-q", "-m", "drop package.json and old/");
      write(fx.work, "src/a.js", "edited\n");
      // An UNCOMMITTED deletion is still in the index: it must stay in scope so its removal stages.
      fs.rmSync(path.join(fx.work, WORK_ITEM, "task.md"));

      const script = derivation() + "\n" + scopeStage('"${SCOPE_PATHS[@]}"');
      const r = run(sh, script, { cwd: fx.work });
      assert.equal(
        r.status,
        0,
        `a committed deletion must not abort staging: ${r.stderr}`,
      );
      assert.deepEqual(staged(fx.work), [`${WORK_ITEM}/task.md`, "src/a.js"]);
    } finally {
      cleanup(fx.dir);
    }
  });

  test(`[${sh}] derived scope + scope mode: the Step 4 commit carries the run's code`, () => {
    const fx = baseWith([
      `${WORK_ITEM}/task.md`,
      "skills/x/SKILL.md",
      "CHANGELOG.md",
    ]);
    try {
      write(fx.work, "skills/x/SKILL.md", "edited\n");
      write(fx.work, "CHANGELOG.md", "edited\n");
      write(fx.work, `${WORK_ITEM}/report.md`, "new report\n");

      const script = derivation() + "\n" + scopeStage('"${SCOPE_PATHS[@]}"');
      const r = run(sh, script, { cwd: fx.work });
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(staged(fx.work), [
        "CHANGELOG.md",
        `${WORK_ITEM}/report.md`,
        "skills/x/SKILL.md",
      ]);
    } finally {
      cleanup(fx.dir);
    }
  });
}
