/**
 * Asserts the Remaining Work Status block is a wired-in default of every
 * `develop-*` pipeline, not a habit one orchestrator happens to have.
 *
 * The block used to be specified in exactly one place — the Step 3 loop doc —
 * while claiming to be "required after Steps 1, 2, 4, 5–6 and 7". Nothing in
 * those steps, in the Step Transition Protocol, or in the Stop hook's continue
 * prompt mentioned it, so whether a run emitted it at a step boundary came down
 * to whether the model still had the Step 3 doc in context. That is exactly the
 * class of drift these parity tests exist to catch.
 *
 * Run: node --test evals/shared/tests/remaining-work-banner-parity.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const sharedDir = join(repoRoot, "shared", "resources");
const CANON = "develop-pipeline-remaining-work-banner.md";

const PIPELINES = ["develop-story", "develop-task", "develop-bug"];

test("the canonical banner spec exists and names every firing point", () => {
  const p = join(sharedDir, CANON);
  assert.ok(existsSync(p), `missing shared/resources/${CANON}`);
  const text = readFileSync(p, "utf-8");
  for (const marker of [
    "═══ REMAINING WORK STATUS ═══",
    "Pipeline steps still ahead",
    "Every step transition",
    "develop-loop iteration",
    "QA/verify cycle",
    "HALT",
  ]) {
    assert.ok(text.includes(marker), `${CANON} does not cover: ${marker}`);
  }
  for (const p of PIPELINES) {
    assert.ok(
      text.includes(`#### ${p}`),
      `${CANON} has no variant section for ${p}`,
    );
  }
});

for (const skill of PIPELINES) {
  test(`${skill} SKILL.md makes the status block part of the Step Transition Protocol`, () => {
    const text = readFileSync(
      join(repoRoot, "skills", skill, "SKILL.md"),
      "utf-8",
    );
    assert.match(
      text,
      /3\.\s+\*\*Emit the Remaining Work Status block, then the Step \{N\+1\} banner\*\*/,
      `${skill}: action 3 of the Step Transition Protocol must emit the status block before the step banner`,
    );
    assert.ok(
      text.includes("═══ REMAINING WORK STATUS ═══"),
      `${skill}: SKILL.md must show the literal status block header`,
    );
    assert.ok(
      text.includes(CANON),
      `${skill}: SKILL.md must point at the canonical spec (${CANON})`,
    );
    assert.ok(
      text.includes("[Status + Banner]"),
      `${skill}: the transition mnemonic must include the status block`,
    );
  });

  test(`${skill} bundles the canonical banner spec under references/`, () => {
    assert.ok(
      existsSync(join(repoRoot, "skills", skill, "references", CANON)),
      `${skill}: run \`npm run bundle\` — references/${CANON} is missing`,
    );
  });
}

test("the Stop hook's continue prompt asks for the status block, not just the banner", () => {
  const text = readFileSync(
    join(sharedDir, "develop-pipeline-on-stop.sh"),
    "utf-8",
  );
  assert.ok(
    text.includes("Remaining Work Status block"),
    "on-stop.sh reason must name the status block — it is the prompt the orchestrator " +
      "follows verbatim when it stalls mid-pipeline",
  );
});
