/**
 * Task 328 (obs #186): qa-task and qa-story grade a measured figure by finalise's
 * tree-equivalence rule, and cite that rule rather than restate it.
 *
 * The rule lives once, in `finalise-dod-ac-prompt.md` Step 3. Each QA skill holds one
 * paragraph that sends a measured figure — new or carried — through
 * `finalise-delta.js docs-only` and marks it unverified with "re-measure" otherwise.
 *
 * The paragraph is located by its OWN marker (`finalise-delta.js docs-only` and
 * "re-measure" in one paragraph), never by the citation: each skill already cites
 * "`finalise-dod-ac-prompt.md` Step 3" twice elsewhere, so a test keyed on the citation
 * stays green when this paragraph loses it (review-task check 13).
 *
 * Run: node --test evals/shared/tests/qa-measured-figure-parity.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

const SKILLS = ["qa-task", "qa-story"];
const CITATION = "`finalise-dod-ac-prompt.md` Step 3";
// The engine's reason vocabulary other than the one answer that counts. Step 3 owns it;
// a second copy here would be the enumeration drift docs/reference/anti-patterns.md names.
const REASONS = ["code-changed", "disabled", "unverifiable"];

/** The problems with one skill's measured-figure paragraph; an empty list means it holds. */
export function measuredFigureProblems(text) {
  const paragraphs = text.split(/\n\s*\n/);
  const hits = paragraphs.filter(
    (p) =>
      p.includes("finalise-delta.js docs-only") && p.includes("re-measure"),
  );
  if (hits.length !== 1) {
    return [
      `expected exactly one measured-figure paragraph, found ${hits.length}`,
    ];
  }
  const [p] = hits;
  const problems = [];
  if (!p.includes(CITATION))
    problems.push(`the paragraph does not cite ${CITATION}`);
  if (!/carried/.test(p))
    problems.push("the paragraph does not cover a carried figure");
  if (!p.includes("**unverified**"))
    problems.push("the paragraph does not mark the figure **unverified**");
  for (const r of REASONS) {
    if (p.includes(r))
      problems.push(`the paragraph restates the reason \`${r}\``);
  }
  return problems;
}

const read = (skill) =>
  readFileSync(join(REPO_ROOT, "skills", skill, "SKILL.md"), "utf8");

for (const skill of SKILLS) {
  test(`${skill} grades a measured figure by finalise's rule, cited not restated`, () => {
    assert.deepEqual(measuredFigureProblems(read(skill)), []);
  });

  test(`${skill}'s paragraph runs its own bundled finalise-delta.js`, () => {
    assert.ok(
      read(skill).includes(
        `.agents/skills/${skill}/references/finalise-delta.js docs-only`,
      ),
      `${skill} must run its own bundled copy, not another skill's`,
    );
  });
}

test("qa-task's record_criteria token sends a measured entry through the rule", () => {
  const line = read("qa-task")
    .split("\n")
    .find((l) => l.startsWith("- `record_criteria=<path>`"));
  assert.ok(line, "the record_criteria token line is present");
  assert.match(line, /`measured: true`/);
  assert.match(line, /measured-figure rule/);
});

// ── Calibration: the checker reproduces each failure it exists to catch ──

const GOOD = [
  "Intro.",
  "",
  `**A measured figure** carried or new counts only as ${CITATION} grades it, via`,
  '`finalise-delta.js docs-only`; otherwise **unverified** with "re-measure".',
  "",
  `Elsewhere ${CITATION} is cited again.`,
].join("\n");

test("calibration: a correct paragraph passes", () => {
  assert.deepEqual(measuredFigureProblems(GOOD), []);
});

test("calibration: a file with no such paragraph fails, never passes vacuously", () => {
  const text = `Intro.\n\nOnly ${CITATION} is cited here.\n`;
  assert.notDeepEqual(measuredFigureProblems(text), []);
});

test("calibration: the paragraph losing its citation fails, though the file cites it elsewhere", () => {
  const text = GOOD.replace(
    `counts only as ${CITATION} grades it`,
    "counts only as finalise grades it",
  );
  assert.ok(
    text.includes(CITATION),
    "the citation still appears elsewhere in the file",
  );
  assert.match(measuredFigureProblems(text).join("\n"), /does not cite/);
});

test("calibration: a restated reason list fails", () => {
  const text = GOOD.replace(
    "otherwise",
    "on code-changed, disabled or unverifiable",
  );
  assert.match(measuredFigureProblems(text).join("\n"), /restates the reason/);
});
