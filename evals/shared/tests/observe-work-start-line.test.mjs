// task.279 / obs #157 — the long orchestrators run the observe-work Session Start Protocol from their own
// Step 0 / Phase 0, so a session opened by a skill invocation does not depend on the first message.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel) => fs.readFileSync(root + rel, "utf8");

// Orchestrator → the heading that opens its Step 0 / Phase 0 section, and the heading that ends it.
const ORCHESTRATORS = [
  ["skills/develop-next/SKILL.md", "## Step 0 — Preflight", "## Step 1"],
  [
    "skills/develop-task/SKILL.md",
    "## Phase 0: Resolve & Prepare",
    "## Phase 1",
  ],
  [
    "skills/develop-story/SKILL.md",
    "## Phase 0: Resolve & Prepare",
    "## Phase 1",
  ],
  [
    "skills/develop-bug/SKILL.md",
    "## Phase 0: Resolve & Prepare",
    "## Phase 1",
  ],
];

function section(text, from, to) {
  const a = text.indexOf(from);
  assert.ok(a >= 0, `missing heading ${from}`);
  const b = text.indexOf(to, a + from.length);
  assert.ok(b > a, `missing heading ${to} after ${from}`);
  return text.slice(a, b);
}

for (const [file, from, to] of ORCHESTRATORS) {
  test(`${file}: Step 0 / Phase 0 runs the observe-work Session Start Protocol once, if installed`, () => {
    const s = section(read(file), from, to);
    assert.match(s, /\*\*Session Start \(obs #157\)\.\*\*/);
    assert.match(s, /`observe-work` skill is installed/);
    assert.match(s, /Session Start Protocol has not run this session/);
    assert.match(s, /run it now, once/);
    assert.match(s, /Skip silently when the skill is not installed/);
  });
}

// Non-vacuity: the matcher rejects a section without the line (a fixture it must flag).
test("the check fails on a Phase 0 without the line", () => {
  const bare =
    "## Phase 0: Resolve & Prepare\n\nSee the reference.\n\n## Phase 1\n";
  const s = section(bare, "## Phase 0: Resolve & Prepare", "## Phase 1");
  assert.doesNotMatch(s, /\*\*Session Start \(obs #157\)\.\*\*/);
});

// develop-batch is excluded on purpose: its per-item pipelines carry the line in their own Phase 0.
test("develop-batch is not asked to carry the line", () => {
  assert.doesNotMatch(
    read("skills/develop-batch/SKILL.md"),
    /Session Start \(obs #157\)/,
  );
});
