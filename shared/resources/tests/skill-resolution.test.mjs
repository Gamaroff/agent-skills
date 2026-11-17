// skill-resolution — task 311. The Skill tool can load a user-level copy of a sub-skill in place of
// this repository's; `check` compares the base directory the tool reported against the repository's
// own homes for that name. Each case builds REAL directories and symlinks: the engine resolves
// symlinks, and a fake path would only test the fake.

import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnBudget } from "../spawn-budget.mjs";

const BUDGET = spawnBudget("SKILL_RESOLUTION");
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_PATH = join(__dirname, "..", "skill-resolution.js");
const eng = require(ENGINE_PATH);

const made = [];
after(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

function tmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix));
  made.push(d);
  return d;
}

// A repository shape: <root>/skills/<name>/SKILL.md, with the harness directory a symlink to it,
// as it is on a development checkout (`.claude/skills` -> `skills`).
function makeRepo(name) {
  const root = tmp("skill-resolution-repo-");
  mkdirSync(join(root, "skills", name), { recursive: true });
  writeFileSync(join(root, "skills", name, "SKILL.md"), "# repo copy\n");
  mkdirSync(join(root, ".claude"), { recursive: true });
  symlinkSync(join(root, "skills"), join(root, ".claude", "skills"));
  return root;
}

// The shadow: a same-named copy under a user-level directory, outside the repository.
function makeSynced(name) {
  const home = tmp("skill-resolution-home-");
  const dir = join(home, ".claude", "skills", "synced", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), "# user-level copy\n");
  return dir;
}

test("a repository path classifies as repo", () => {
  const root = makeRepo("finalise");
  const r = eng.classify({
    name: "finalise",
    baseDir: join(root, "skills", "finalise"),
    root,
  });
  assert.equal(r.reason, "repo");
  assert.equal(eng.exitCodeFor(r.reason), 0);
});

test("the harness path, a symlink into the repository, classifies as repo", () => {
  const root = makeRepo("qa-task");
  const r = eng.classify({
    name: "qa-task",
    baseDir: join(root, ".claude", "skills", "qa-task"),
    root,
  });
  assert.equal(r.reason, "repo");
});

test("a synced user-level path classifies as shadowed", () => {
  const root = makeRepo("finalise");
  const r = eng.classify({
    name: "finalise",
    baseDir: makeSynced("finalise"),
    root,
  });
  assert.equal(r.reason, "shadowed");
  assert.equal(eng.exitCodeFor(r.reason), 1);
});

test("a user-level symlink that points into the repository is the repository's copy", () => {
  const root = makeRepo("create-pr");
  const home = tmp("skill-resolution-link-");
  const link = join(home, "create-pr");
  symlinkSync(join(root, "skills", "create-pr"), link);
  assert.equal(
    eng.classify({ name: "create-pr", baseDir: link, root }).reason,
    "repo",
  );
});

test("a missing path classifies as unreadable, never as repo", () => {
  const root = makeRepo("review-pr");
  const r = eng.classify({
    name: "review-pr",
    baseDir: join(root, "no-such-dir"),
    root,
  });
  assert.equal(r.reason, "unreadable");
  assert.equal(eng.exitCodeFor(r.reason), 1);
});

test("the repository's copy of another skill does not vouch for this name", () => {
  const root = makeRepo("finalise");
  mkdirSync(join(root, "skills", "qa-task"), { recursive: true });
  const r = eng.classify({
    name: "finalise",
    baseDir: join(root, "skills", "qa-task"),
    root,
  });
  assert.equal(r.reason, "shadowed");
});

test("a bad name, an empty base directory or a non-directory root is a usage error", () => {
  const root = makeRepo("finalise");
  const base = join(root, "skills", "finalise");
  assert.equal(
    eng.classify({ name: "../x", baseDir: base, root }).reason,
    "usage",
  );
  assert.equal(
    eng.classify({ name: "finalise", baseDir: "", root }).reason,
    "usage",
  );
  assert.equal(
    eng.classify({ name: "finalise", baseDir: base, root: join(root, "nope") })
      .reason,
    "usage",
  );
  assert.equal(eng.exitCodeFor("usage"), 2);
});

function cli(args) {
  const r = spawnSync(process.execPath, [ENGINE_PATH, ...args], {
    encoding: "utf8",
    timeout: BUDGET.timeoutMs,
  });
  assert.notEqual(
    r.status,
    null,
    `engine did not finish: ${r.error ?? r.signal}`,
  );
  return r;
}

test("CLI: the exit code and the JSON reason agree for repo, shadowed and unreadable", () => {
  const root = makeRepo("finalise");
  const repo = cli([
    "check",
    "--name",
    "finalise",
    "--base-dir",
    join(root, "skills", "finalise"),
    "--root",
    root,
    "--json",
  ]);
  assert.equal(repo.status, 0);
  assert.equal(JSON.parse(repo.stdout).reason, "repo");

  const shadow = cli([
    "check",
    "--name",
    "finalise",
    "--base-dir",
    makeSynced("finalise"),
    "--root",
    root,
    "--json",
  ]);
  assert.equal(shadow.status, 1);
  assert.equal(JSON.parse(shadow.stdout).reason, "shadowed");

  const gone = cli([
    "check",
    "--name",
    "finalise",
    "--base-dir",
    join(root, "gone"),
    "--root",
    root,
    "--json",
  ]);
  assert.equal(gone.status, 1);
  assert.equal(JSON.parse(gone.stdout).reason, "unreadable");
});

test("CLI: a missing flag or an unknown command exits 2 with reason usage", () => {
  const noFlag = cli([
    "check",
    "--name",
    "finalise",
    "--root",
    tmp("skill-resolution-usage-"),
    "--json",
  ]);
  assert.equal(noFlag.status, 2);
  assert.equal(JSON.parse(noFlag.stdout).reason, "usage");
  const unknown = cli(["frobnicate", "--json"]);
  assert.equal(unknown.status, 2);
  assert.equal(JSON.parse(unknown.stdout).reason, "usage");
});

test("the three homes are the source tree, the consumer install and the harness directory", () => {
  assert.deepEqual(
    [...eng.HOMES],
    ["skills", ".agents/skills", ".claude/skills"],
  );
});
