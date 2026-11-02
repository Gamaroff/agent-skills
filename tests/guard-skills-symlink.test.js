// guard-skills-symlink.test.js — the PreToolUse hook that refuses moving or removing the skill
// links. Run as Claude Code runs it: JSON on stdin, the verdict in the exit code.
// Run: node --test tests/guard-skills-symlink.test.js
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const HOOK = path.join(REPO_ROOT, "scripts/hooks/guard-skills-symlink.mjs");
const ROOT = "/work/repo";

function run(command, { cwd = ROOT, tool = "Bash", raw } = {}) {
  const input =
    raw ?? JSON.stringify({ tool_name: tool, tool_input: { command }, cwd });
  return spawnSync(process.execPath, [HOOK], {
    input,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
  });
}

// The exact shapes that unloaded the project skills during task.248 (2026-11-01), then the
// variants a guard keyed on one spelling would miss.
const BLOCKED = [
  'mv .agents/skills .agents/skills.aside && { npm run ci > /tmp/ci.log 2>&1; echo "ci_rc=$?"; }; mv .agents/skills.aside .agents/skills',
  "mv .agents/skills .agents/skills.t248-aside && { npm run ci > .claude/state/t248-ci.log 2>&1; }",
  "mv .agents/skills /tmp/x && npm test; mv /tmp/x .agents/skills",
  "mv ./.agents/skills/ /tmp/x",
  "mv '.claude/skills' /tmp/x",
  "mv /work/repo/.agents/skills /tmp/x",
  "mv -f .agents/skills /tmp/x",
  "mv -t /tmp/aside .agents/skills",
  "command mv .agents/skills /tmp/x",
  "rm .claude/skills",
  "rm -rf .agents",
  "unlink .agents/skills",
  "cd .agents && mv skills ../skills-aside",
  "git status; mv .claude /tmp/claude-aside",
];

const ALLOWED = [
  "mv .agents/skills.aside .agents/skills",
  "mv /tmp/x .claude/skills",
  "ls -la .agents/skills",
  "rm -f .agents/skills/qa-task/references/tmp.log",
  "mv skills/foo/a.md skills/foo/b.md",
  "rm -rf .claude/state/old",
  "echo 'mv .agents/skills /tmp/x'",
  "cd /elsewhere && mv .agents/skills /tmp/x",
  "npm run test:clean-checkout",
];

for (const command of BLOCKED) {
  test(`refuses: ${command}`, () => {
    const r = run(command);
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /test:clean-checkout/);
  });
}

for (const command of ALLOWED) {
  test(`allows: ${command}`, () => {
    const r = run(command);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stderr, "");
  });
}

test("a tool other than Bash is allowed", () => {
  assert.equal(run("mv .agents/skills /tmp/x", { tool: "Edit" }).status, 0);
});

test("input it cannot read is allowed, never a block on every Bash call", () => {
  assert.equal(run("", { raw: "not json" }).status, 0);
});

test("run through a symlinked path, the hook still decides (realpath entry guard)", () => {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, ".guard-hook-test-"));
  try {
    const link = path.join(dir, "hook.mjs");
    fs.symlinkSync(HOOK, link);
    const r = spawnSync(process.execPath, [link], {
      input: JSON.stringify({
        tool_name: "Bash",
        tool_input: { command: "mv .agents/skills /tmp/x" },
        cwd: ROOT,
      }),
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
    });
    assert.equal(r.status, 2, r.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the shared project settings install the hook on Bash", () => {
  const settings = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, ".claude/settings.json"), "utf8"),
  );
  const entries = settings.hooks?.PreToolUse ?? [];
  const installed = entries.some(
    (e) =>
      e.matcher === "Bash" &&
      (e.hooks ?? []).some((h) =>
        /scripts\/hooks\/guard-skills-symlink\.mjs/.test(h.command ?? ""),
      ),
  );
  assert.ok(installed, JSON.stringify(settings));
});
