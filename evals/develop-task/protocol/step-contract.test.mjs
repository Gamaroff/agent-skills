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
  "5-6": ["qa-task", "qa-fix", "gate", "review-pr"],
  7: ["finalise", "DoD"],
  8: ["commit", "push"],
};

test("every step file exists on disk", async () => {
  for (const [, file] of Object.entries(STEP_FILES)) {
    const full = path.join(STEP_DIR, file);
    let stat;
    try {
      stat = await import("node:fs/promises").then((m) => m.stat(full));
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
      content.includes(`Step ${n}`) ||
        content.includes(`STEP ${n}`) ||
        content.includes(`Step ${n}/8`),
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
    content.includes("Step") &&
      (content.includes("artifact") || content.includes("branch")),
    "resume-contract.md missing step/artifact table",
  );
});

/**
 * task.113 — the review may create the tracker issue, so Step 2 re-reads the key.
 *
 * Step 1 signals `work-started` only when `TRACKER_ISSUE` is set, and for a fresh
 * item it is empty until `/review-task` creates the issue one step later. The
 * step-2 document must (a) re-read the key from the document after the review
 * returns, (b) update the lock's `tracker_issue` — the hooks read it — and
 * (c) run 0c-reg once when the key went from empty to set. Each clause is
 * asserted by name; the section is bounded so a paragraph elsewhere that merely
 * mentions 0c-reg cannot satisfy it.
 */
test("Step 2 re-reads the tracker key after the review and re-fires work-started when it was empty at Step 1", async () => {
  const content = await readFile(path.join(STEP_DIR, STEP_FILES[2]), "utf-8");
  const a = content.indexOf("## Re-read the Tracker Key");
  const b = content.indexOf("## Detecting Outcomes", a + 1);
  assert.ok(a >= 0, "the re-read section exists");
  assert.ok(b > a, "the re-read section sits before outcome detection");
  const sec = content.slice(a, b);
  assert.match(
    sec,
    /TRACKER_ISSUE_AT_STEP_1="\$TRACKER_ISSUE"/,
    "the Step 1 value is captured before the re-read",
  );
  assert.match(
    sec,
    /grep '\^github_issue:'/,
    "GitHub key re-read from the document",
  );
  assert.match(sec, /grep '\^jira_key:'/, "Jira key re-read from the document");
  assert.match(
    sec,
    /\[ -z "\$TRACKER_ISSUE_AT_STEP_1" \] && \[ -n "\$TRACKER_ISSUE" \]/,
    "the empty→set conditional",
  );
  assert.match(
    sec,
    /\.tracker_issue = \$i/,
    "the lock's tracker_issue is updated",
  );
  assert.match(sec, /0c-reg/, "the signal procedure is invoked, not restated");
  assert.match(sec, /`already`/, "idempotence on re-run is stated");
  // The re-read must not be gated on the review having RUN — a skip path with a
  // pre-existing key still needs the same read to reach the same answer.
  assert.match(sec, /on both the run and the skip\s+path/);
});
