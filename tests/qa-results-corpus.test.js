"use strict";
/**
 * QA Testing Results corpus guard — no tracked work-item document carries more
 * than one `## QA Testing Results` section, or one inside the change-log block.
 *
 * Motivation (task.155, obs #178): qa-task / qa-story Step 12 "replace the section
 * whole" was performed by hand, and a hand-written replace whose two boundaries come
 * from two independent searches stacks copies instead of replacing one. task.145
 * reached four stacked copies across QA cycles; task.65 carried three into the
 * accepted tree (its later copies titled `## QA Testing Results — Cycle 2 (re-review)`,
 * which is why "a section" is the engine's prefix match and not an exact line).
 *
 * WHAT THIS ASSERTS:
 *   1. Per document: `findQaResults` finds at most one section, and none with
 *      `insideChangeLog`. "A section" is the engine's own definition — this test
 *      imports it rather than restating it, so the guard and the writer cannot
 *      disagree about what they are counting.
 *   2. A non-vacuity floor on documents that carry a section. A scan that found
 *      nothing has proved nothing: a broken pathspec reads as a clean corpus.
 *
 * A failure names every offending file. The repair rule the engine's callers print
 * (and task.65 used): keep the copy whose Gate File link names the highest gate,
 * delete the others by hand. The engine refuses (`multiple`) rather than guess.
 *
 * Run: node --test tests/qa-results-corpus.test.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const test = require("node:test");
const { execFileSync } = require("child_process");
const { findQaResults } = require("../shared/resources/qa-results.js");

const REPO_ROOT = path.resolve(__dirname, "..");
// 154 documents carried a section when this guard landed (2026-09-30). The floor is
// well under that so ordinary churn never trips it, and well over zero so a broken
// walk cannot pass.
const FLOOR_DOCS = 50;

function trackedDocs() {
  const out = execFileSync("git", ["ls-files", "-z", "--", "docs/**/*.md"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return out.split("\0").filter(Boolean);
}

function survey() {
  const offenders = [];
  let scanned = 0;
  for (const rel of trackedDocs()) {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    if (!text.includes("QA Testing Results")) continue;
    const { sections } = findQaResults(text);
    if (sections.length === 0) continue;
    scanned++;
    const inside = sections.filter((s) => s.insideChangeLog).length;
    if (sections.length > 1 || inside > 0) {
      offenders.push(
        `${rel}: ${sections.length} section(s)${inside ? `, ${inside} inside the change-log block` : ""}`,
      );
    }
  }
  return { scanned, offenders };
}

test("no tracked document stacks QA Testing Results sections or hides one in the change log", () => {
  const { scanned, offenders } = survey();
  assert.ok(
    scanned >= FLOOR_DOCS,
    `scan-broken: only ${scanned} documents carry a QA Testing Results section (floor ${FLOOR_DOCS})`,
  );
  assert.deepEqual(
    offenders,
    [],
    `QA Testing Results corruption — keep the copy linking the highest gate, delete the rest:\n  ${offenders.join("\n  ")}`,
  );
});
