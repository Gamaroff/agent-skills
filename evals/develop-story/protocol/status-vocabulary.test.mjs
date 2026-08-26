/**
 * Protocol checks: no skill writes a document status outside the canonical set.
 *
 * The regression these pin. `document-status-lifecycle.md` is the single source of
 * truth for status values, and it has listed `Ready for Done` as DEPRECATED since it
 * was written. `qa-story` and `qa-fix` were never updated to match it, so a QA PASS
 * wrote `ready-for-done` into the document — a value the canonical set does not admit.
 *
 * Why it survived so long, and why it is worth a test rather than a re-read:
 *
 *   - `finalise` overwrites the value with `accepted` a few minutes later, so the bad
 *     status is present for a short window only. Nothing is wrong at rest.
 *   - The cost lands in the CONSUMER repo, not here. A project that lints its status
 *     vocabulary goes red, and only if a commit happens to land inside that window.
 *     Observed live in `tinker-city`, whose `docs-lint` runs ungated on every PR: it
 *     failed on `ready-for-done` during a Definition-of-Done verification, and the
 *     defect was found by the DoD pass rather than by any test in this repository.
 *
 * That is the shape worth pinning — a fault that is invisible here and expensive
 * downstream. Prose in the lifecycle doc did not prevent it, because the two skills
 * that write the status never referenced that prose.
 *
 * These tests also pin a DISTINCTION an editor could easily collapse: story/task
 * statuses and BUG-REPORT statuses are different lifecycles. `Reopened` is invalid as
 * a story status and entirely correct as a bug status, so a blanket ban on the word
 * would be wrong. The assertions below are scoped to the status rules only.
 *
 * Run via: node --test evals/develop-story/protocol/status-vocabulary.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const read = (...p) => readFile(path.join(REPO_ROOT, ...p), "utf8");

/** Collapse whitespace — these documents are hand-wrapped, so a sentence may span lines. */
const flat = (s) => s.replace(/\s+/g, " ");

/**
 * The canonical frontmatter values, taken from the lifecycle doc's own reference table.
 * Kept as a literal rather than parsed out of the doc on purpose: a test that derives its
 * expectation from the file under test passes whatever that file says.
 */
const CANONICAL = [
  "draft",
  "planned",
  "ready-for-development",
  "in-progress",
  "ready-for-review",
  "accepted",
  "cancelled",
];

test("the lifecycle doc still declares exactly the canonical frontmatter values", async () => {
  const doc = await read("shared", "resources", "document-status-lifecycle.md");
  for (const value of CANONICAL) {
    assert.ok(
      doc.includes(`\`${value}\``),
      `document-status-lifecycle.md must document the canonical value \`${value}\``,
    );
  }
});

test("`Ready for Done` is deprecated, and maps to Ready for Review — NOT to Accepted", async () => {
  const doc = flat(
    await read("shared", "resources", "document-status-lifecycle.md"),
  );

  assert.match(
    doc,
    /\| `Ready for Done` \| `Ready for Review`/,
    [
      "The deprecation table must map `Ready for Done` to `Ready for Review`.",
      "Mapping it to `Accepted` trades a lint failure for a worse defect: qa-story runs",
      "BEFORE finalise, so writing the terminal state there announces acceptance before",
      "the Definition-of-Done check that is allowed to refuse it.",
    ].join(" "),
  );
});

for (const skill of ["qa-story", "qa-fix"]) {
  test(`${skill} does not instruct writing a non-canonical story status`, async () => {
    const src = flat(await read("skills", skill, "SKILL.md"));

    // Scoped to the STATUS RULE, not the whole file: both skills legitimately discuss
    // bug-report statuses, where `Reopened` and `Ready for QA` are correct.
    assert.doesNotMatch(
      src,
      /Status: "?`?Ready for Done`?"?/,
      `${skill}/SKILL.md still tells the agent to write \`Ready for Done\`, which is outside ` +
        `the canonical set. Consumer repos that lint status vocabulary go red on it.`,
    );

    assert.doesNotMatch(
      src,
      /(?:PASS|CONCERNS|WAIVED) → Status: "Ready for Done"/,
      `${skill}/SKILL.md maps a gate result to \`Ready for Done\`.`,
    );

    // Widened after the first version of this guard MISSED a live instance. Key Principle 11
    // restated the same rule in a parenthesised prose form — "(PASS/CONCERNS → Ready for Done,
    // FAIL → Reopened)" — with no `Status:` prefix and no quotes, so the assertion above sailed
    // past it. It was caught by hand while porting the fix into a consumer repo, which is exactly
    // the place a guard is supposed to make unnecessary.
    //
    // So match the VALUE next to an arrow, in any phrasing, rather than one sentence shape.
    for (const forbidden of ["Ready for Done", "Reopened"]) {
      assert.doesNotMatch(
        src,
        new RegExp(`→\\s*\`?${forbidden}\`?`),
        `${skill}/SKILL.md still routes a gate result to \`${forbidden}\`, which is outside the ` +
          `canonical set. Check prose restatements (Key Principles, summaries), not just the ` +
          `Status Rule — the first version of this test only matched the rule and missed one.`,
      );
    }
  });
}

test("qa-story leaves acceptance to finalise", async () => {
  const src = flat(await read("skills", "qa-story", "SKILL.md"));

  assert.match(
    src,
    /PASS → \*\*leave at `ready-for-review`\*\*/,
    "qa-story must leave a PASS at `ready-for-review`. A gate PASS says the implementation is " +
      "good; it does not say the DoD is met, and on a repo where CI is a DoD gate it does not " +
      "even say the build is green.",
  );

  assert.match(
    src,
    /FAIL → `in-progress`/,
    "qa-story must send a FAIL to `in-progress` — the QA loop's backward edge in the canonical " +
      "state machine — rather than to the non-canonical `Reopened`.",
  );
});

test("the story-status ban does not leak into bug-report statuses", async () => {
  // A blanket ban on `Reopened` would be wrong. Bug reports are a separate lifecycle
  // (New | In Progress | Ready for QA | Reopened | Closed) and both skills still use it.
  // This asserts the distinction survives, so a future editor does not "fix" it away.
  const qaFix = flat(await read("skills", "qa-fix", "SKILL.md"));
  assert.match(
    qaFix,
    /New \| In Progress \| Ready for QA \| Reopened \| Closed/,
    "qa-fix must keep the bug-report status lifecycle, in which `Reopened` is correct.",
  );
});
