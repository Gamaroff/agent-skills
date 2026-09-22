/**
 * qa-task and qa-story write a document status after the gate, and the words they may write are
 * the lifecycle's — not their own. qa-task's Step 12 read `Status: "Completed"` for months while
 * qa-story carried the correct rule (obs #153, task.136); a per-skill status table is a second
 * enumeration and it drifts. This pins both skills to the lifecycle vocabulary, and pins the one
 * warning that NAMES the forbidden words so the test cannot be satisfied by deleting it.
 *
 * Run: node --test skills/qa-task/tests/status-vocabulary.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..", "..", "..");
const read = (rel) => readFileSync(join(REPO_ROOT, rel), "utf8");
const SKILLS = ["skills/qa-task/SKILL.md", "skills/qa-story/SKILL.md"];

// A DOCUMENT-status WRITE of a non-canonical word: `→ Status: "Completed"` / `Status: Completed`
// / `Status: "Ready for Done"`. Mentions inside a "never write" warning are not writes, and
// `Reopened` / `Closed` are NOT in this list on purpose: they are BUG-REPORT statuses (a separate
// lifecycle) and both QA skills legitimately write them into a bug report's own status field.
const NON_CANONICAL_WRITE =
  /(?:→|->)\s*Status:\s*"?(Completed|Ready for Done|Done)"?/;

for (const rel of SKILLS) {
  test(`${rel} never instructs a non-canonical status write`, () => {
    const text = read(rel);
    const lines = text.split("\n");
    const offenders = lines
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => NON_CANONICAL_WRITE.test(l));
    assert.deepEqual(
      offenders,
      [],
      `these lines write a status the lifecycle does not admit: ${JSON.stringify(offenders)}`,
    );
  });

  test(`${rel} states the rule that names the forbidden words (non-vacuity)`, () => {
    const text = read(rel);
    // The warning must exist AND name at least two of the words it forbids: deleting the whole
    // table would otherwise pass the first test with nothing said.
    assert.match(
      text,
      /Never write `(Completed|Ready for Done)`|Do not write `Ready for Done`/,
    );
    assert.match(text, /ready-for-review/);
    assert.match(text, /`accepted`.*finalise|finalise.*`accepted`/);
  });
}

test("a return of the old qa-task wording is caught (mutation of the source, not the test)", () => {
  // Same regex the first test uses, applied to the exact line qa-task carried until 2026-09-22.
  assert.ok(
    NON_CANONICAL_WRITE.test(
      '- PASS or CONCERNS → Status: "Completed" (with notes about concerns if applicable)',
    ),
  );
  assert.ok(
    NON_CANONICAL_WRITE.test(
      '- WAIVED → Status: "Completed" (with waiver notes)',
    ),
  );
  assert.ok(
    !NON_CANONICAL_WRITE.test(
      "- FAIL → Status: `in-progress` (requires fixes before re-review)",
    ),
  );
});
