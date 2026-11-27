/**
 * Task 328 (obs #186): qa-task and qa-story grade a measured figure by finalise's
 * tree-equivalence rule, and cite that rule rather than restate it.
 *
 * The rule lives once, in `finalise-dod-ac-prompt.md` Step 3. Each QA skill holds one
 * paragraph that applies that rule whole to a measured figure — new or carried — runs
 * `finalise-delta.js docs-only` where the rule calls for it, and marks a figure the rule
 * rejects **unverified**. The note each failure carries is Step 3's, so the paragraph names
 * none (task 328 QA-3, CR3-1: "re-measure" for every rejection was wrong).
 *
 * The paragraph is located by its OWN marker (`finalise-delta.js docs-only` and
 * `**unverified**` in one paragraph), never by the citation: each skill already cites
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
// The paragraph's bold lead. Locating by it keeps every content check below live: a check on
// a string the locator also requires can never fail on its own (QA-4, CR4-4).
export const LEAD =
  "**A measured figure counts for this head only as finalise grades it**";

/** The measured-figure paragraph of a skill file, or null when not exactly one exists. */
export function measuredFigureParagraph(text) {
  const hits = text.split(/\n\s*\n/).filter((p) => p.includes(LEAD));
  return hits.length === 1 ? hits[0] : null;
}

export function measuredFigureProblems(text) {
  const hits = text.split(/\n\s*\n/).filter((p) => p.includes(LEAD));
  if (hits.length !== 1) {
    return [
      `expected exactly one measured-figure paragraph, found ${hits.length}`,
    ];
  }
  const [p] = hits;
  const problems = [];
  if (!p.includes("finalise-delta.js docs-only"))
    problems.push("the paragraph does not run finalise-delta.js docs-only");
  // A figure that misses its bound is a FAIL in Step 3, not an unverified one (QA-4, CR4-1).
  if (!/misses\s+the\s+criterion's\s+bound\s+fails\s+the\s+criterion/.test(p))
    problems.push("the paragraph does not fail a figure that misses its bound");
  if (!/\*\*MEDIUM\*\* entry in `top_issues\[\]`/.test(p))
    problems.push("the paragraph does not raise a MEDIUM top_issues entry");
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
  // Step 3 scopes its head-or-earlier-commit rule and its recording conditions itself; a
  // paraphrase that says which figures must be on the head narrows it (task 328 QA-2, CR2-3).
  // Step 3's own sentence counts too (QA-3, CR3-4).
  if (
    /taken on the (?:PR's )?head commit|earlier commit M whose delta/i.test(p)
  )
    problems.push(
      "the paragraph paraphrases which figures Step 3 holds to the head",
    );
  // "re-measure" is the note Step 3 gives some failures, not all of them (QA-3, CR3-1).
  if (/re-measure/.test(p))
    problems.push("the paragraph restates the note a failure carries");
  if (!/from the repository root/.test(p))
    problems.push(
      "the paragraph does not say to run the check from the repository root",
    );
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

test("qa-task and qa-story hold the same measured-figure paragraph (QA-4, CR4-5)", () => {
  const [a, b] = SKILLS.map((s) =>
    measuredFigureParagraph(read(s))?.replaceAll(
      `.agents/skills/${s}/`,
      "<skill>/",
    ),
  );
  assert.ok(a && b, "both skills hold the paragraph");
  assert.equal(a, b);
});

test("calibration: the identity check sees a one-word drift", () => {
  const p = measuredFigureParagraph(read("qa-task"));
  assert.notEqual(p, p.replace("applied", "used"));
});

test("qa-task's record_criteria token sends a measured entry through the rule", () => {
  const line = read("qa-task")
    .split("\n")
    .find((l) => l.startsWith("- `record_criteria=<path>`"));
  assert.ok(line, "the record_criteria token line is present");
  assert.match(line, /`measured: true`/);
  assert.match(line, /measured-figure rule/);
  // measured: true is a regex hit, not Step 3's classification (QA-3, CR3-2).
  assert.match(line, /candidate, not a classification/);
  assert.match(
    line,
    /Classify every listed entry by `finalise-dod-ac-prompt\.md` Step 3 first/,
  );
  // The flag is listed, and false rules nothing out (QA-4, CR4-3).
  assert.match(line, /`state` and `measured`/);
  assert.match(line, /`measured: false` rules nothing out/);
  // The sentence ends the bullet: the next args token keeps its own list item (task 328 QA-1, CR-1).
  assert.doesNotMatch(line, /`code_review_blocking=true`/);
  assert.ok(
    read("qa-task")
      .split("\n")
      .some((l) => l.startsWith("- `code_review_blocking=true`")),
    "the code_review_blocking token starts its own bullet",
  );
});

// ── Calibration: the checker reproduces each failure it exists to catch ──

const GOOD = [
  "Intro.",
  "",
  `**A measured figure counts for this head only as finalise grades it**. A figure carried or new`,
  `counts only as ${CITATION} grades it, via`,
  "`finalise-delta.js docs-only` run from the repository root. A figure that misses the criterion's",
  "bound fails the criterion; otherwise **unverified** with Step 3's note, and a **MEDIUM** entry in `top_issues[]`.",
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

test("calibration: a paraphrase of which figures Step 3 holds to the head fails", () => {
  const text = GOOD.replace(
    "grades it, via",
    "grades it: taken on the head commit, or on an earlier commit M, via",
  );
  assert.match(measuredFigureProblems(text).join("\n"), /paraphrases/);
});

test("calibration: Step 3's own head-or-M sentence, copied in, fails", () => {
  const text = GOOD.replace(
    "grades it, via",
    "grades it: be taken on the PR's head commit, or on an earlier commit M whose delta to the head is documentation only, via",
  );
  assert.match(measuredFigureProblems(text).join("\n"), /paraphrases/);
});

test('calibration: "re-measure" as the note for every rejection fails', () => {
  const text = GOOD.replace("with Step 3's note", 'with "re-measure"');
  assert.match(
    measuredFigureProblems(text).join("\n"),
    /restates the note a failure carries/,
  );
});

test("calibration: a missed bound called unverified fails (QA-4, CR4-1)", () => {
  const text = GOOD.replace(
    "A figure that misses the criterion's\nbound fails the criterion; otherwise",
    "Otherwise",
  );
  assert.notEqual(text, GOOD);
  assert.match(measuredFigureProblems(text).join("\n"), /misses its bound/);
});

test("calibration: a dropped **unverified** is caught by its own check (QA-4, CR4-4)", () => {
  const text = GOOD.replace("**unverified**", "unverified");
  assert.match(measuredFigureProblems(text).join("\n"), /\*\*unverified\*\*/);
});

test("calibration: a check with no repository-root cwd fails", () => {
  const text = GOOD.replace(" run from the repository root", "");
  assert.match(measuredFigureProblems(text).join("\n"), /repository root/);
});
