/**
 * bug.18 guard — an autonomous orchestrator's directive must not override Phase 0d's
 * branch recommendation.
 *
 * `develop-next` and `develop-batch` prepend an AUTONOMOUS RUN directive that tells
 * the dispatched pipeline to take Phase 0d's recommended option for every question.
 * Both used to go on and name the answer (`develop`, `<baseBranch>`), which overrode
 * the recommendation Phase 0d derives for a story whose epic declares
 * `branch_model: epic-integration` — the epic's integration branch. A directive that
 * names a branch restates a per-item derivation as a constant, and the constant wins.
 *
 * The rule differs by orchestrator, because their checkouts differ:
 *
 * - `develop-next` dispatches into the main checkout, so Phase 0d's recommendation is
 *   always the right answer and the directive names **no branch at all**.
 * - `develop-batch` dispatches into a worktree already cut from `<baseBranch>`, and the
 *   pipeline needs to know that branch (Phase 0d's own option reads `develop`, which is
 *   not every consumer's base). It may name `<baseBranch>`, but only together with a
 *   HALT for the case where Phase 0d finds an integration branch — so the constant can
 *   never silently win over an epic-integration recommendation. The batch selector
 *   keeps such stories out (select-next.test.mjs, `bug.18` cases); this HALT is the
 *   second line.
 *
 * Neither may answer in the `Q1 = base branch, <x>` form: the question numbers differ
 * between pipelines (`develop-bug`'s Q1 is the branch model), and the batch directive
 * mislabelled Q2 that way.
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

// A branch named in a directive: a backticked branch name, the config placeholder,
// or an integration-branch path.
const BRANCH_LITERAL_RE =
  /`(?:develop|main|master)`|<baseBranch>|`epic\/[^`]*`/g;

// An answer given by question number, as both directives did before bug.18.
const Q_ANSWER_RE = /\bQ\d\s*=\s*(?:base\s+branch|PR\s+target)\s*,/g;

// The batch directive's escape: an integration branch found by Phase 0d HALTs the
// item. Matched on the flattened directive, within one sentence.
const INTEGRATION_HALT_RE =
  /integration branch[^.]*\bHALT\b|\bHALT\b[^.]*integration branch/;

const ORCHESTRATORS = [
  { skill: "develop-next", branchAllowed: false },
  { skill: "develop-batch", branchAllowed: true },
];

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

/** Problems with one directive under one orchestrator's rule; [] when it conforms. */
function violations(directive, branchAllowed) {
  const flat = directive.replace(/\s+/g, " ");
  const problems = (flat.match(Q_ANSWER_RE) || []).map(
    (h) => `answers by question number: "${h}"`,
  );
  const branches = flat.match(BRANCH_LITERAL_RE) || [];
  if (branches.length && !branchAllowed)
    problems.push(`names a branch (${branches.join(", ")})`);
  if (branches.length && branchAllowed && !INTEGRATION_HALT_RE.test(flat))
    problems.push(
      `names a branch (${branches.join(", ")}) with no HALT for an integration branch`,
    );
  return problems;
}

for (const { skill, branchAllowed } of ORCHESTRATORS) {
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

  test(`${skill}: the directive cannot override Phase 0d's branch recommendation (bug.18)`, () => {
    assert.deepEqual(
      violations(directive, branchAllowed),
      [],
      `${skill}'s directive overrides Phase 0d. Take its Recommended option: for an ` +
        `epic-integration story that is the epic's integration branch.`,
    );
  });
}

test("the rules reject each pre-fix directive and accept the fixed shapes (mutation proof)", () => {
  // Verbatim pre-fix clauses.
  const oldNext =
    "take the auto-derived recommended option for **every** question without prompting. For `/develop-story` and `/develop-task` that is Q1 = base branch, `develop` and Q2 = PR target, `develop`.";
  const oldBatch =
    "take the auto-derived recommended option for every question without prompting (Q1 = base branch, `<baseBranch>`; Q2 = base branch, `<baseBranch>`).";
  assert.notDeepEqual(violations(oldNext, false), []);
  assert.notDeepEqual(violations(oldBatch, true), []);

  // A literal without the HALT is rejected even where branches are allowed.
  assert.notDeepEqual(
    violations("the base and the PR target are both `<baseBranch>`.", true),
    [],
  );
  // develop-next may not name a branch even with a HALT.
  assert.notDeepEqual(
    violations(
      "the base is `develop`. If Phase 0d finds an integration branch, HALT.",
      false,
    ),
    [],
  );

  // Accepted shapes.
  assert.deepEqual(
    violations(
      "take the option Phase 0d marks **(Recommended)** for every question; for a story whose epic declares `branch_model: epic-integration` it is that epic's integration branch. For `/develop-bug`, Q1 is the branch model (**bugfix** unless …).",
      false,
    ),
    [],
  );
  assert.deepEqual(
    violations(
      "the base and the PR target are both `<baseBranch>`. If Phase 0d's epic pre-check finds an integration branch for this item anyway, HALT and report it.",
      true,
    ),
    [],
  );
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
