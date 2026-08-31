"use strict";
/**
 * review-pr contract tests.
 * Prose-driven skill — assert the structural invariants of the SKILL.md + the
 * conformance prompt: dual-platform coverage, the six-rung resolution cascade,
 * the two lenses, the deterministic verdict, and the guarantees that make this
 * skill advisory (it never approves a PR and never writes a gate file).
 *
 * Run: node --test skills/review-pr/tests/
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const SKILL = read("SKILL.md");
const CONFORMANCE = read("references/pr-conformance-prompt.md");

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------
test("SKILL.md declares name: review-pr", () => {
  assert.match(SKILL, /^---[\s\S]*?\nname:\s*review-pr\s*\n/);
});

test("description stays within the ~150-word validator ceiling", () => {
  const m = SKILL.match(/\ndescription:\s*'([\s\S]*?)'\s*\n/);
  assert.ok(m, "description present and single-quoted");
  const words = m[1].trim().split(/\s+/).length;
  assert.ok(words <= 150, `description is ${words} words (must be <= 150)`);
});

test("frontmatter carries only the two authored fields", () => {
  const fm = SKILL.match(/^---\n([\s\S]*?)\n---/)[1];
  assert.doesNotMatch(
    fm,
    /^managed-by:/m,
    "managed-by is injected at package time",
  );
  assert.doesNotMatch(fm, /^source:/m, "source is injected at package time");
});

// ---------------------------------------------------------------------------
// Arguments — every documented flag appears in the Arguments table
// ---------------------------------------------------------------------------
test("every argument is declared in the Arguments table", () => {
  const table = SKILL.match(/## Arguments[\s\S]*?\n## Workflow/)[0];
  for (const arg of [
    "`target`",
    "`--effort`",
    "`--comment`",
    "`--no-code`",
    "`--no-docs`",
  ]) {
    assert.ok(table.includes(arg), `${arg} present in the Arguments table`);
  }
});

test("--effort is not merely declared — its behaviour is defined", () => {
  // Regression guard: the reviewed task document declared --effort in the
  // arguments list and defined it nowhere. An argument with no behaviour is a
  // promise the implementer cannot keep.
  assert.match(SKILL, /\*\*Effort\*\* scales coverage/);
  assert.match(SKILL, /low` \/ `medium`/);
  assert.match(SKILL, /high` \/ `max`/);
  assert.match(SKILL, /Fold the resolved `--effort` into both dispatches/);
});

// ---------------------------------------------------------------------------
// Platform: both VCS platforms, and the VCS-vs-TRACKER axis
// ---------------------------------------------------------------------------
test("both sourced helpers are guarded with || exit 1", () => {
  assert.match(SKILL, /source references\/resolve-platform\.sh \|\| exit 1/);
  assert.match(SKILL, /source references\/bitbucket-auth\.sh \|\| exit 1/);
});

test("PR-shaped work branches on VCS, not TRACKER", () => {
  // /review-code Step 4 branches on TRACKER for PR comments, which misroutes in
  // a Bitbucket-VCS + GitHub-tracker repo. This skill must not repeat that.
  assert.match(
    SKILL,
    /Branch on `\$VCS` for everything PR-shaped, on `\$TRACKER` for everything issue-shaped/,
  );
  assert.match(SKILL, /PLATFORM="\$VCS"/);
});

test("Bitbucket auth is verified by status code, not by list length", () => {
  assert.match(SKILL, /404, not 401/);
  assert.match(SKILL, /-w "%\{http_code\}"/);
});

test("both platforms have a PR-resolution path and a comment path", () => {
  const resolve = SKILL.match(
    /### Step 1 — Resolve the PR[\s\S]*?### Step 2/,
  )[0];
  assert.match(resolve, /gh pr view/);
  assert.match(resolve, /\$\{BB_API\}/);

  const comment = SKILL.match(/### Step 8 — `--comment`[\s\S]*?### Step 9/)[0];
  assert.match(comment, /gh pr comment/);
  assert.match(comment, /pullrequests\/\$\{PR_NUMBER\}\/comments/);
});

// ---------------------------------------------------------------------------
// The resolution cascade — the new primitive
// ---------------------------------------------------------------------------
test("all six resolution rungs are documented in order", () => {
  const step2 = SKILL.match(
    /### Step 2 — Resolve the work item[\s\S]*?### Step 3 —/,
  )[0];
  for (const rung of [
    "branch stem",
    "pr_number",
    "gate `pr:`",
    "tracker issue",
    "Explore",
    "none",
  ]) {
    assert.ok(step2.includes(rung), `rung "${rung}" documented`);
  }
});

test("rung 4 matches a Jira key as well as a GitHub issue ref", () => {
  // A Bitbucket PR description carries PROJ-123, never #N. Matching only the
  // GitHub shape makes rung 4 dead on the Bitbucket + Jira combination.
  assert.match(SKILL, /\[A-Z\]\+-\[0-9\]\+/);
  assert.match(SKILL, /never `#\{N\}`/);
});

test("the exclusion filter names all nine artifact segments", () => {
  const filter = SKILL.match(/\.qa\.[\s\S]{0,200}?\.pr-review\./)[0];
  for (const seg of [
    ".qa.",
    ".gate.",
    ".bug.",
    ".implementation.",
    ".review.",
    ".dod.",
    ".plan.",
    ".handover.",
    ".pr-review.",
  ]) {
    assert.ok(filter.includes(seg), `exclusion segment ${seg} present`);
  }
});

test("story documents are globbed, not assumed to live in docs/stories/", () => {
  assert.match(SKILL, /not\*\* in `docs\/stories\/`/);
  assert.match(SKILL, /never assume one root/);
});

// ---------------------------------------------------------------------------
// Artifact collection
// ---------------------------------------------------------------------------
test("all eight artifact kinds are collected", () => {
  const step3 = SKILL.match(
    /### Step 3 — Collect the paper trail[\s\S]*?### Step 3b/,
  )[0];
  for (const kind of [
    "implementation",
    "review",
    "qa",
    "gate",
    "dod",
    "sprint-review-summary",
    "bug",
    "handover",
  ]) {
    assert.ok(step3.includes(kind), `artifact kind ${kind} collected`);
  }
});

test("artifacts are globbed on the segment, never reconstructed by name", () => {
  assert.match(
    SKILL,
    /Glob on the artifact segment; never reconstruct an exact filename/,
  );
});

test("the review-report glob excludes this skill's own .pr-review. output", () => {
  // `*.review.*.md` also matches `*.pr-review.*.md`. Without the filter a
  // re-review collects its own previous report as the pre-implementation
  // review report. Found by the Phase 10 glob-collision grep.
  assert.match(SKILL, /grep -v '\\\.pr-review\\\.'/);
});

// ---------------------------------------------------------------------------
// Tracker context — both trackers, with a concrete Jira path
// ---------------------------------------------------------------------------
test("the Jira read path is concrete, not 'the existing Jira read path'", () => {
  assert.match(SKILL, /rest\/api\/2\/issue\/\{jira_key\}/);
  assert.doesNotMatch(SKILL, /the existing Jira read path/);
});

test("tracker context is non-blocking", () => {
  assert.match(
    SKILL,
    /non-blocking; the review continues without tracker context/i,
  );
});

// ---------------------------------------------------------------------------
// Diff construction
// ---------------------------------------------------------------------------
test("the diff is built from git so one path serves both platforms", () => {
  assert.match(SKILL, /one path serves both platforms/);
  assert.match(
    SKILL,
    /git diff "origin\/\$BASE_BRANCH\.\.\.origin\/\$HEAD_BRANCH"/,
  );
});

test("the cross-fork PR case is handled up front", () => {
  // Scope the assertion to Step 4. `headRepositoryOwner` also appears in Step 1's
  // --json field list, so an unscoped match passed even with the whole cross-fork
  // paragraph deleted (caught by mutation M5).
  const step4 = SKILL.match(/### Step 4 — Build the diff[\s\S]*?### Step 5/)[0];
  assert.match(step4, /Cross-fork PRs/);
  assert.match(step4, /headRepositoryOwner/);
  assert.match(step4, /take the API fallback directly/);
  assert.match(step4, /gh pr diff/);
});

test("the diff file is written to scratch, never the repo", () => {
  assert.match(SKILL, /mktemp -t review-pr\./);
  assert.match(SKILL, /scratch, never the repo/);
  assert.match(SKILL, /rm -f "\$DIFF_FILE"/);
});

// ---------------------------------------------------------------------------
// The two lenses
// ---------------------------------------------------------------------------
test("both lens prompts are referenced, not paraphrased inline", () => {
  assert.match(SKILL, /code-review-prompt\.md/);
  assert.match(SKILL, /pr-conformance-prompt\.md/);
  assert.match(SKILL, /passed verbatim|Prompt Template.*verbatim/s);
  // The shared prompt's own body must not be copied into this skill.
  assert.doesNotMatch(SKILL, /You are a focused, read-only code reviewer/);
});

test("each lens can be disabled independently", () => {
  assert.match(SKILL, /skip under `--no-code`/);
  assert.match(SKILL, /skip under `--no-docs`/);
});

test("the caller resolves the anchor, not the conformance subagent", () => {
  assert.match(SKILL, /Lens B never runs the cascade itself/);
  // whitespace-tolerant: the source hard-wraps between "The" and "subagent"
  assert.match(
    CONFORMANCE,
    /The\s+subagent does not run the resolution cascade itself/,
  );
});

// ---------------------------------------------------------------------------
// Conformance prompt contract
// ---------------------------------------------------------------------------
test("the conformance prompt declares all four categories", () => {
  for (const cat of ["coverage", "scope", "trail", "consistency"]) {
    assert.ok(CONFORMANCE.includes(cat), `category ${cat} declared`);
  }
});

test("the pr_conformance output contract carries the full key set", () => {
  for (const key of [
    "work_item:",
    "resolved_via:",
    "artifacts:",
    "findings:",
    "truncated_count:",
    "category:",
    "severity:",
    "confidence:",
    "ref:",
    "suggested_action:",
  ]) {
    assert.ok(CONFORMANCE.includes(key), `output key ${key} present`);
  }
});

test("the conformance schema mirrors code_review so one renderer serves both", () => {
  assert.match(CONFORMANCE, /mirror the `code_review\[?\]?` schema|parallel/i);
  assert.match(SKILL, /deliberately parallel/);
});

test("the conformance reviewer is read-only and never gates", () => {
  assert.match(CONFORMANCE, /read-only and returns findings only/);
  assert.match(CONFORMANCE, /NEVER edit files/);
});

// ---------------------------------------------------------------------------
// Verdict — deterministic, and advisory
// ---------------------------------------------------------------------------
test("all three verdict outcomes are defined with their conditions", () => {
  const verdict = SKILL.match(/\*\*Deterministic verdict[\s\S]*?### Step 7/)[0];
  assert.match(verdict, /REQUEST CHANGES/);
  assert.match(verdict, /CONCERNS/);
  assert.match(verdict, /APPROVE/);
  assert.match(verdict, /confidence: high/);
});

test("the skill never submits a formal review and never writes a gate", () => {
  assert.match(SKILL, /Never call `gh pr review --approve`/);
  assert.match(SKILL, /Never write a gate `\.yml`/);
  assert.match(SKILL, /only `qa-\*` skills do that/);
});

test("the skill never edits code", () => {
  assert.match(SKILL, /never edits code/);
});

// ---------------------------------------------------------------------------
// Report location — co-location is the only sanctioned location
// ---------------------------------------------------------------------------
test("the report uses the .pr-review.{n}. artifact kind, co-located", () => {
  assert.match(SKILL, /\.pr-review\.\{n\}\./);
  assert.match(SKILL, /task\.65\.pr-review\.1\./);
});

test("an unanchored review writes no file and invents no directory", () => {
  assert.match(SKILL, /No work item resolved → write no file/);
  assert.doesNotMatch(SKILL, /\.agents\/reviews/);
});

test("the report template is given literally", () => {
  assert.match(SKILL, /ALWAYS use this exact template structure/);
  for (const heading of [
    "## Artifact Trail",
    "## Acceptance Criteria Traceability",
    "## Conformance Findings",
    "## Code Review Findings",
    "## Recommended Actions",
  ]) {
    assert.ok(SKILL.includes(heading), `report section ${heading} present`);
  }
});

// ---------------------------------------------------------------------------
// Comment idempotency
// ---------------------------------------------------------------------------
test("the PR comment is idempotent via a marker on both platforms", () => {
  const marker = "<!-- agent-skills-pr-review -->";
  const occurrences = SKILL.split(marker).length - 1;
  assert.ok(
    occurrences >= 3,
    `marker appears in prose and both platform paths (found ${occurrences})`,
  );
});

test("the GitHub comment path goes through tracker_call_with_retry", () => {
  assert.match(SKILL, /tracker_call_with_retry gh pr comment/);
  assert.match(SKILL, /ACCESS_TRACKER` deferral gate/);
});

test("comment bodies are always file-sourced, never inline", () => {
  assert.match(SKILL, /Always `--body-file`.*never an inline body/s);
  assert.doesNotMatch(SKILL, /gh pr comment "\$PR_URL" --body "/);
});

test("commenting is confirmed before posting and never gates", () => {
  assert.match(SKILL, /ask before posting/i);
  assert.match(SKILL, /Commenting never gates/);
  assert.match(SKILL, /Never post over an `unverifiable` reason/);
});

// ---------------------------------------------------------------------------
// Repo-wide prohibitions
// ---------------------------------------------------------------------------
test("addCommentToJiraIssue never appears in shipped prose", () => {
  assert.doesNotMatch(SKILL, /addCommentToJiraIssue/);
  assert.doesNotMatch(CONFORMANCE, /addCommentToJiraIssue/);
});

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------
test("the skill situates itself against its siblings", () => {
  for (const sib of ["/review-code", "/review-task", "/qa-task", "/finalise"]) {
    assert.ok(SKILL.includes(sib), `sibling ${sib} named`);
  }
  assert.match(SKILL, /do \*\*not\*\* call `\/review-pr`/);
});
