/**
 * Protocol checks: assert each develop-pipeline step file satisfies its contract
 * from the develop-story perspective.
 *
 * Verifies step files exist, have required keywords, and SKILL.md references
 * step banners 1–8 plus autonomous-defaults.
 *
 * Run via: node --test evals/develop-story/protocol/step-contract.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const SKILL_PATH = path.join(REPO_ROOT, "skills", "develop-story", "SKILL.md");
const STEP_DIR = path.join(REPO_ROOT, "shared", "resources");

const STEP_FILES = {
  1: "develop-pipeline-step-1-create-branch.md",
  2: "develop-pipeline-step-2-review.md",
  3: "develop-pipeline-step-3-develop-loop.md",
  4: "develop-pipeline-step-4-create-pr.md",
  "5-6": "develop-pipeline-step-5-6-qa-loop.md",
  7: "develop-pipeline-step-7-finalise.md",
  8: "develop-pipeline-step-8-commit.md",
};

// Keywords each step file must contain (evidence the contract is documented)
const STEP_KEYWORDS = {
  1: ["branch", "lock", "story"],
  2: ["review", "skip"],
  3: ["develop", "loop", "MAX_ITER"],
  4: ["create-pr", "Q2_answer"],
  "5-6": ["qa-story", "qa-fix", "gate"],
  7: ["finalise", "DoD"],
  8: ["commit", "push"],
};

test("every step file exists on disk", async () => {
  for (const [, file] of Object.entries(STEP_FILES)) {
    const full = path.join(STEP_DIR, file);
    let s;
    try {
      s = await stat(full);
    } catch {
      assert.fail(`step file missing: shared/resources/${file}`);
    }
    assert.ok(s.size > 0, `step file empty: ${file}`);
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
  for (let n = 1; n <= 8; n++) {
    assert.ok(
      content.includes(`Step ${n}`) ||
        content.includes(`STEP ${n}`) ||
        content.includes(`Step ${n}/8`),
      `SKILL.md does not reference Step ${n}`,
    );
  }
});

test("SKILL.md has autonomous-defaults reference", async () => {
  const content = await readFile(SKILL_PATH, "utf-8");
  assert.ok(
    content.includes("develop-pipeline-autonomous-defaults") ||
      content.includes("Autonomous Decision Defaults"),
    "SKILL.md missing autonomous-defaults reference",
  );
});

test("step-4 documents that story PR base is the resolved Q2 answer (default develop)", async () => {
  const content = await readFile(path.join(STEP_DIR, STEP_FILES[4]), "utf-8");
  assert.match(
    content,
    /--base \{Q2_answer\}/,
    "step-4 must pass the resolved Q2 answer as the PR base",
  );
  assert.doesNotMatch(
    content,
    /EPIC_BRANCH|feature\/epic/,
    "step-4 must NOT target an epic branch",
  );
});
