/**
 * bug.18 guard — an autonomous orchestrator's directive must not name a branch.
 *
 * `develop-next` and `develop-batch` prepend an AUTONOMOUS RUN directive that tells
 * the dispatched pipeline to take Phase 0d's recommended option for every question.
 * Both used to go on and name the answer (`develop`, `<baseBranch>`), which overrode
 * the recommendation Phase 0d derives for a story whose epic declares
 * `branch_model: epic-integration` — the epic's integration branch. A directive that
 * names a branch restates a per-item derivation as a constant, and the constant wins.
 *
 * The rule: the directive defers to Phase 0d and names no branch at all. This test
 * reads each directive out of its SKILL.md (the contiguous blockquote that opens with
 * `**AUTONOMOUS RUN (<skill>)`) and fails on any branch literal in it.
 *
 * Run: node --test evals/shared/tests/orchestrator-directive-branch-literal.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

const ORCHESTRATORS = ["develop-next", "develop-batch"];

// A branch named in a directive, in any of the spellings the two used: a
// backticked branch name, the config placeholder, or an integration-branch path.
const BRANCH_LITERAL_RE =
  /`(?:develop|main|master)`|<baseBranch>|`epic\/[^`]*`|\bQ\d\s*=\s*(?:base\s+branch|PR\s+target)\s*,/g;

/**
 * The directive is the blockquote that opens with `**AUTONOMOUS RUN (<skill>)`,
 * through every following `>` line (blank `>` lines included). Returned with the
 * `>` markers and list indentation stripped.
 */
function extractDirective(text, skill) {
  const lines = text.split("\n");
  const opener = `**AUTONOMOUS RUN (${skill})`;
  const start = lines.findIndex((l) => /^\s*>/.test(l) && l.includes(opener));
  if (start === -1) return null;
  const out = [];
  for (let i = start; i < lines.length && /^\s*>/.test(lines[i]); i++)
    out.push(lines[i].replace(/^\s*>\s?/, ""));
  return out.join("\n");
}

for (const skill of ORCHESTRATORS) {
  const file = path.join(REPO_ROOT, "skills", skill, "SKILL.md");
  const directive = extractDirective(readFileSync(file, "utf-8"), skill);

  test(`${skill}: the AUTONOMOUS RUN directive is found (non-vacuity)`, () => {
    assert.ok(directive, `no AUTONOMOUS RUN (${skill}) blockquote in ${file}`);
    assert.ok(
      directive.length > 200,
      `directive is suspiciously short (${directive.length} chars) — the extractor lost it`,
    );
    assert.match(
      directive,
      /Phase 0d/,
      "directive no longer mentions Phase 0d",
    );
  });

  test(`${skill}: the directive names no branch for any Phase 0d question (bug.18)`, () => {
    const hits = directive.match(BRANCH_LITERAL_RE) || [];
    assert.deepEqual(
      hits,
      [],
      `${skill}'s directive names a branch (${hits.join(", ")}). Take Phase 0d's ` +
        `Recommended option instead: for an epic-integration story that is the ` +
        `epic's integration branch, and a literal here overrides it.`,
    );
  });
}

test("the literal detector catches each spelling the orchestrators used (mutation proof)", () => {
  for (const bad of [
    "that is Q1 = base branch, `develop` and Q2 = PR target, `develop`.",
    "(Q1 = base branch, `<baseBranch>`; Q2 = base branch, `<baseBranch>`)",
    "base the story on `main`",
    "target `epic/178.feature-ui`",
  ])
    assert.ok(bad.match(BRANCH_LITERAL_RE), `not caught: ${bad}`);
  for (const ok of [
    "take the option Phase 0d marks **(Recommended)** for every question",
    "for a story whose epic declares `branch_model: epic-integration`, that is the epic's integration branch",
    "Q1 = branch model (**bugfix** unless the bug is explicitly a production regression)",
  ])
    assert.equal(ok.match(BRANCH_LITERAL_RE), null, `false positive: ${ok}`);
});

test("extractDirective stops at the end of the blockquote", () => {
  const text = [
    "intro",
    "   > **AUTONOMOUS RUN (x):** line one",
    "   >",
    "   > line two",
    "",
    "after `develop`",
  ].join("\n");
  assert.equal(
    extractDirective(text, "x"),
    "**AUTONOMOUS RUN (x):** line one\n\nline two",
  );
});
