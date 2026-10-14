"use strict";
/**
 * Worktrees live inside the repository — the parts of task 208 that are prose.
 *
 * WHY THIS EXISTS
 * ---------------
 * Task 208 moved every worktree the skills create to `<repo>/.worktrees/` and made the
 * repository's own searches skip that folder. The selector and develop-batch are held by their
 * own tests. The rest is prose in skills and runbooks, and finalise run 1 (2026-10-14) found it
 * held only by a hand-run grep in QA: nothing failed if a runbook went back to `../worktrees/`
 * or a skill's `find` lost its `.worktrees` exclusion. This file holds both per PR.
 *
 * The exclusion commands are EXTRACTED FROM THE SKILL FILES and executed against a fixture, so
 * editing a skill is what these assertions measure — not a copy of its commands living here.
 *
 * Scope (owner decision, task 208 AC1): persistent worktrees. Scratch worktrees the QA skills
 * create under the system temp dir and remove in the same step are out of scope, and the
 * sibling-path pattern below does not match them.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(REPO, rel), "utf-8");

// ── AC1: no shipped skill or runbook puts a worktree beside the repository ────

// `../worktrees/x`, `../tc-wt-x`, `../wt-x`, or `git worktree add ../x`.
const SIBLING = /\.\.\/(?:worktrees\/|tc-wt-|wt-)|worktree add\s+\.\.\//;

function walk(dir, keep, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, keep, out);
    else if (keep(p)) out.push(p);
  }
  return out;
}

function shippedProse() {
  const files = [];
  for (const s of fs.readdirSync(path.join(REPO, "skills"))) {
    const f = path.join(REPO, "skills", s, "SKILL.md");
    if (fs.existsSync(f)) files.push(f);
  }
  for (const f of fs.readdirSync(path.join(REPO, "shared", "resources"))) {
    if (f.endsWith(".md"))
      files.push(path.join(REPO, "shared", "resources", f));
  }
  walk(path.join(REPO, "docs", "runbooks"), (p) => p.endsWith(".md"), files);
  files.push(
    path.join(REPO, "skills", "develop-next", "scripts", "select-next.mjs"),
  );
  return files;
}

test("the sibling-path pattern matches what it must and nothing it must not", () => {
  for (const hit of [
    "../worktrees/story-1",
    "../tc-wt-t40",
    "../wt-t40",
    "git worktree add ../x -b y",
  ]) {
    assert.match(hit, SIBLING, hit);
  }
  for (const miss of [
    ".worktrees/batch-t40",
    "cd ../..",
    "git worktree add .worktrees/x",
    "/tmp/qa-mut-123",
  ]) {
    assert.doesNotMatch(miss, SIBLING, miss);
  }
});

test("no shipped skill, shared resource or runbook names a sibling worktree path", () => {
  const files = shippedProse();
  // Non-vacuity: a scan that found no files would pass on anything.
  assert.ok(files.length > 100, `only ${files.length} files scanned`);
  const offenders = [];
  for (const f of files) {
    fs.readFileSync(f, "utf-8")
      .split("\n")
      .forEach((line, i) => {
        if (SIBLING.test(line))
          offenders.push(`${path.relative(REPO, f)}:${i + 1}: ${line.trim()}`);
      });
  }
  assert.deepEqual(
    offenders,
    [],
    "worktrees must live inside the repository (.worktrees/)",
  );
});

// ── AC6: the repository-wide searches in shipped skills skip .worktrees/ ──────

// One of each thing the commands look for, in the tree and again inside a
// nested worktree that the commands must not descend into.
const FIXTURE_FILES = {
  "src/a.js": "widgetAlpha\n",
  "src/a.test.js": "widgetAlpha\n",
  "src/c.spec.ts": "x\n",
  "src/__tests__/b.test.ts": "x\n",
  "prisma/schema.prisma": "x\n",
  "prisma/seed.ts": "x\n",
};

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "worktree-exclusions-"));
  for (const base of ["", ".worktrees/batch-x/"]) {
    for (const [rel, body] of Object.entries(FIXTURE_FILES)) {
      const p = path.join(dir, base, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, body);
    }
  }
  return dir;
}

function fencedBash(text) {
  return [...text.matchAll(/```bash\n([\s\S]*?)\n```/g)].map((m) => m[1]);
}

// Every command that carries a .worktrees exclusion, read from where it ships.
function exclusionCommands() {
  const cmds = [];
  const trace = read("shared/resources/qa-traceability-mapper-prompt.md");
  for (const block of fencedBash(trace)) {
    if (block.includes("--exclude-dir=.worktrees")) {
      cmds.push({
        from: "qa-traceability-mapper-prompt.md",
        cmd: block
          .replaceAll("{keyword1}", "widgetAlpha")
          .replaceAll("{keyword2}", "zzzNone"),
      });
    }
  }
  for (const rel of [
    "skills/test-co-location-enforcer/SKILL.md",
    "skills/railway-postgres-crud/SKILL.md",
  ]) {
    for (const line of read(rel).split("\n")) {
      const t = line.trim();
      if (t.startsWith("find .") && t.includes(".worktrees"))
        cmds.push({ from: rel, cmd: t });
    }
  }
  return cmds;
}

test("every .worktrees exclusion in a shipped skill keeps a nested worktree out of its results", () => {
  const cmds = exclusionCommands();
  // Two grep blocks, two co-location finds, two railway finds. Fewer means a command lost its
  // exclusion (or was reworded past this extraction): either way, look before lowering this.
  assert.equal(cmds.length, 6, cmds.map((c) => c.from).join(", "));
  const dir = fixture();
  try {
    for (const { from, cmd } of cmds) {
      const r = spawnSync("bash", ["-c", cmd], { cwd: dir, encoding: "utf-8" });
      const hits = r.stdout.split("\n").filter(Boolean);
      assert.ok(
        hits.length > 0,
        `${from}: \`${cmd}\` found nothing in the fixture`,
      );
      assert.deepEqual(
        hits.filter((h) => h.includes(".worktrees")),
        [],
        `${from}: \`${cmd}\` descended into .worktrees/`,
      );
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the repository's .gitignore ignores .worktrees/, so ripgrep and prettier skip it too", () => {
  const r = spawnSync(
    "git",
    ["check-ignore", "--no-index", "-q", ".worktrees/batch-x/a.js"],
    { cwd: REPO },
  );
  assert.equal(
    r.status,
    0,
    ".worktrees/ must be ignored by the repository's own .gitignore",
  );
  // And by the committed file, not a local exclude: read the file itself.
  assert.match(read(".gitignore"), /^\/\.worktrees\/$/m);
});
