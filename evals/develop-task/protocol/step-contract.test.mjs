/**
 * Protocol checks: assert each develop-pipeline step file satisfies its contract.
 *
 * For each step N, verify:
 *   - The step file exists in shared/resources/
 *   - SKILL.md references a banner for Step N
 *   - The step file documents its required output artifact (what to assert in CI)
 *
 * Run via: node --test evals/develop-task/protocol/step-contract.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const SKILL_PATH = path.join(REPO_ROOT, "skills", "develop-task", "SKILL.md");
const STEP_DIR = path.join(REPO_ROOT, "shared", "resources");

// Map of step number → step file basename (steps 5+6 share one file)
const STEP_FILES = {
  1: "develop-pipeline-step-1-create-branch.md",
  2: "develop-pipeline-step-2-review.md",
  3: "develop-pipeline-step-3-develop-loop.md",
  4: "develop-pipeline-step-4-create-pr.md",
  "5-6": "develop-pipeline-step-5-6-qa-loop.md",
  7: "develop-pipeline-step-7-finalise.md",
  8: "develop-pipeline-step-8-commit.md",
};

// Keywords each step file must contain (as evidence the contract is documented)
const STEP_KEYWORDS = {
  1: ["branch", "lock"],
  2: ["review", "skip"],
  3: ["develop", "loop", "MAX_ITER"],
  4: ["create-pr", "PR"],
  "5-6": ["qa-task", "qa-fix", "gate"],
  7: ["finalise", "DoD"],
  8: ["commit", "push"],
};

test("every step file exists on disk", async () => {
  for (const [, file] of Object.entries(STEP_FILES)) {
    const full = path.join(STEP_DIR, file);
    let stat;
    try {
      stat = await import("node:fs/promises").then(m => m.stat(full));
    } catch {
      assert.fail(`step file missing: shared/resources/${file}`);
    }
    assert.ok(stat.size > 0, `step file empty: ${file}`);
  }
});

test("every step file contains its expected keywords", async () => {
  for (const [step, file] of Object.entries(STEP_FILES)) {
    const content = await readFile(path.join(STEP_DIR, file), "utf-8");
    for (const kw of STEP_KEYWORDS[step]) {
      assert.ok(
        content.toLowerCase().includes(kw.toLowerCase()),
        `Step ${step} file (${file}) missing keyword: "${kw}"`,
      );
    }
  }
});

test("SKILL.md references step banners for steps 1-8", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  // Banners look like: === DEVELOP-TASK PIPELINE: STEP {N}/8 ===
  for (let n = 1; n <= 8; n++) {
    assert.ok(
      content.includes(`Step ${n}`) || content.includes(`STEP ${n}`) || content.includes(`Step ${n}/8`),
      `SKILL.md does not reference Step ${n}`,
    );
  }
});

test("SKILL.md has autonomous-defaults reference or table", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  assert.ok(
    content.includes("develop-pipeline-autonomous-defaults") ||
    content.includes("Autonomous Decision Defaults"),
    "SKILL.md missing autonomous-defaults reference",
  );
});

test("develop-pipeline-resume-contract.md exists and has per-step table", async () => {
  const full = path.join(STEP_DIR, "develop-pipeline-resume-contract.md");
  const content = await readFile(full, "utf-8");
  assert.ok(content.length > 200, "resume-contract.md is unexpectedly short");
  assert.ok(
    content.includes("Step") && (content.includes("artifact") || content.includes("branch")),
    "resume-contract.md missing step/artifact table",
  );
});
