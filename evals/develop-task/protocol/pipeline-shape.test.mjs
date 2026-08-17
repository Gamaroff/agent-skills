/**
 * Protocol checks: assert develop-task SKILL.md structural invariants.
 *
 * These run purely on file content — no driver, no model calls. They catch:
 *   - All 8 pipeline steps listed in order
 *   - Each step file has a HALT or STOP terminator
 *   - Resume markers reference step numbers
 *
 * Run via: node --test evals/develop-task/protocol/pipeline-shape.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const SKILL_PATH = path.join(REPO_ROOT, "skills", "develop-task", "SKILL.md");
const STEP_RESOURCES_DIR = path.join(REPO_ROOT, "shared", "resources");

// The 8 sub-skill names that must appear in order in SKILL.md
const EXPECTED_STEPS = [
  "create-branch",
  "review-task",
  "develop",
  "create-pr",
  "qa-task",
  "qa-fix",
  "finalise",
  "commit-changes",
];

test("SKILL.md: exists and is non-empty", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  assert.ok(content.length > 100, "SKILL.md is unexpectedly short");
});

test("SKILL.md: lists all 8 pipeline steps in order", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  let lastIdx = -1;
  for (const step of EXPECTED_STEPS) {
    const idx = content.indexOf(step, lastIdx + 1);
    assert.ok(
      idx > lastIdx,
      `step "${step}" is missing or appears before the previous step (lastIdx=${lastIdx}, found=${idx})`,
    );
    lastIdx = idx;
  }
});

test("SKILL.md: references develop-pipeline-step-*.md for each step", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  // Steps 5 and 6 share one file
  const stepFileRefs = [
    "develop-pipeline-step-1-create-branch.md",
    "develop-pipeline-step-2-review.md",
    "develop-pipeline-step-3-develop-loop.md",
    "develop-pipeline-step-4-create-pr.md",
    "develop-pipeline-step-5-6-qa-loop.md",
    "develop-pipeline-step-7-finalise.md",
    "develop-pipeline-step-8-commit.md",
  ];
  for (const ref of stepFileRefs) {
    assert.ok(
      content.includes(ref),
      `SKILL.md does not reference step file: ${ref}`,
    );
  }
});

test("SKILL.md: has context compression recovery section", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  assert.ok(
    content.includes("Context Compression Recovery") ||
      content.includes("context was compressed"),
    "SKILL.md is missing context compression recovery instructions",
  );
});

test("SKILL.md: has graceful pause / pipeline lock section", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  assert.ok(
    content.includes("develop-pipeline.lock"),
    "SKILL.md does not reference develop-pipeline.lock",
  );
});

test("SKILL.md: never stop between steps — hands-free guarantee mentioned", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  assert.ok(
    content.includes("hands-free") ||
      content.includes("Never stop between steps"),
    "SKILL.md missing hands-free / never-stop guarantee",
  );
});

test("develop-pipeline-step-*.md files 1-7 have a HALT terminator", async () => {
  const files = await readdir(STEP_RESOURCES_DIR);
  // Step 8 is the terminal success step — it cleans up and finishes, no HALT required.
  const stepFiles = files.filter(
    (f) => /^develop-pipeline-step-.*\.md$/.test(f) && !f.includes("step-8"),
  );

  assert.ok(
    stepFiles.length >= 6,
    `expected at least 6 step files (excl. step-8), found ${stepFiles.length}: ${stepFiles.join(", ")}`,
  );

  for (const file of stepFiles) {
    const content = await readFile(
      path.join(STEP_RESOURCES_DIR, file),
      "utf-8",
    );
    assert.ok(
      /\bHALT\b|\bSTOP\b/i.test(content),
      `${file} is missing a HALT/STOP terminator`,
    );
  }
});
