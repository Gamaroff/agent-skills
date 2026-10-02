"use strict";
/**
 * review-pr contract tests.
 * Prose-driven skill — assert the structural invariants of the SKILL.md + the
 * conformance prompt: dual-platform coverage, the six-rung resolution cascade,
 * the two lenses, the deterministic verdict, and the guarantees that make this
 * skill advisory (it never approves a PR and never writes a gate file).
 *
 * Run: node --test 'skills/review-pr/tests/*.test.js'
 *      (the directory form `node --test skills/review-pr/tests/` fails MODULE_NOT_FOUND here)
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const SKILL = read("SKILL.md");
const { spawnSync } = require("child_process");
const os = require("os");

// ---------------------------------------------------------------------------
// Shell helpers (task.176). zsh is the macOS default, so every snippet and the parser run under
// both shells where zsh exists. No rc files: zsh reads ~/.zshenv even under `-c`.
// ---------------------------------------------------------------------------
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];
const PARSER = path.join(ROOT, "scripts", "parse-target.sh");
const shArgv = (shell, rest) =>
  shell === "zsh" ? ["-f", ...rest] : ["--noprofile", "--norc", ...rest];

function parseTarget(shell, target) {
  const args = target === undefined ? [PARSER] : [PARSER, target];
  const r = spawnSync(shell, shArgv(shell, args), { encoding: "utf8" });
  const fields = {};
  for (const line of r.stdout.split("\n").filter(Boolean)) {
    const i = line.indexOf("=");
    fields[line.slice(0, i)] = line.slice(i + 1);
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, fields };
}

function runScript(shell, script, opts = {}) {
  return spawnSync(shell, shArgv(shell, ["-c", script]), {
    encoding: "utf8",
    ...opts,
  });
}

const section = (from, to) => {
  const a = SKILL.indexOf(from);
  const b = SKILL.indexOf(to, a + 1);
  assert.ok(a > -1 && b > a, `section ${from} … ${to} found`);
  return SKILL.slice(a, b);
};
const bashBlocks = (text) =>
  [...text.matchAll(/```bash\n([\s\S]*?)```/g)].map((m) => m[1]);
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

test("the exclusion filter names all ten artifact segments", () => {
  // task.176: `.request.` carries the work item's own jira_key, so without it a key lookup
  // returns two files and the work item is ambiguous.
  const filter = SKILL.match(/\.qa\.[\s\S]{0,200}?\.request\./)[0];
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
    ".request.",
  ]) {
    assert.ok(filter.includes(seg), `exclusion segment ${seg} present`);
  }
});

test("resolution greps are anchored and recursive (no ** globs, no prefix matches)", () => {
  const step2 = SKILL.match(
    /### Step 2 — Resolve the work item[\s\S]*?### Step 3 —/,
  )[0];
  // Scope to the cascade TABLE ROWS. The explanatory note under the table deliberately quotes
  // `docs/**/` to explain why it is avoided, so an unscoped doesNotMatch flags the documentation
  // rather than the mechanism.
  const rows = step2
    .split("\n")
    .filter((l) => /^\| \d+ \|/.test(l))
    .join("\n");
  assert.ok(rows.length > 0, "cascade table rows found");
  // CR-2: `docs/**/` needs globstar, which is off by default — it matched 0 of 110 gate files.
  assert.doesNotMatch(rows, /docs\/\*\*\//, "no ** glob may survive in a rung");
  assert.match(rows, /grep -rl --include='\*\.gate\.\*\.yml'/);
  assert.match(rows, /find docs -type f/);
  // CR-1: an unanchored pr_number grep makes PR 28 resolve to pr_number: 281.
  assert.match(rows, /\^pr_number:/);
  assert.match(rows, /\[\[:space:\]\]\*\$/);
});

test("no shell snippet depends on bash-only glob behaviour", () => {
  // CR-1: a multi-glob `ls` aborts entirely under zsh (macOS default) when any one glob has no
  // match, so one absent artifact kind silently suppresses every kind that IS present. Verified
  // live: 0 files under zsh vs 7 under bash on a directory with no *.bug.*.md.
  const step3 = SKILL.match(
    /### Step 3 — Collect the paper trail[\s\S]*?### Step 3b/,
  )[0];
  const bash = step3.match(/```bash\n([\s\S]*?)```/)[1];
  assert.doesNotMatch(
    bash,
    /^\s*ls\s+"\$D"/m,
    "no multi-glob ls in the collection block",
  );
  assert.match(bash, /find "\$D" -maxdepth 1 -name/);
  assert.match(SKILL, /must behave identically under bash and zsh/);
});

test("the Bitbucket web PR URL form is recognised", () => {
  // CR-2: the arm matched only the API path `pullrequests`, so a pasted Bitbucket web URL
  // (`/pull-requests/N`) fell through to the branch arm. Since task.176 the parser owns the
  // arm, so the guard runs it instead of grepping for a case pattern.
  const out = parseTarget(
    "bash",
    "https://bitbucket.org/ws/repo/pull-requests/7",
  );
  assert.equal(out.status, 0, out.stderr);
  assert.deepEqual(out.fields, {
    kind: "pr",
    pr: "7",
    host: "bitbucket.org",
    repo: "ws/repo",
  });
});

test("a branch target reaches the PR resolver instead of resolving the current branch", () => {
  // CR-3: `gh pr view "${PR:-}"` with an empty argument resolves the CURRENT branch's PR, so
  // `/review-pr some-other-branch` silently reviewed the wrong PR. Verified: `gh pr view ""`
  // returns the current branch's number.
  assert.match(SKILL, /gh pr view "\$\{PR:-\$BRANCH\}"/);
  assert.doesNotMatch(SKILL, /gh pr view "\$\{PR:-\}"/);
});

test("the Bitbucket diff fallback follows redirects and rejects an empty patch", () => {
  // CR-5: the /diff endpoint redirects; `curl -sf` without -L exits 0 having written nothing.
  assert.match(SKILL, /curl -sfL/);
  const step4 = SKILL.match(/### Step 4 — Build the diff[\s\S]*?### Step 5/)[0];
  assert.match(step4, /Diff fallback produced an empty patch/);
});

test("auto-generated files are excluded from the reviewed diff", () => {
  // RV-2: 30 of 55 files on this skill's own PR were byte-identical bundle copies, ~23k of
  // 24,253 lines. Step 4 previously gave no guidance, so the scoping had to be done by hand.
  const step4 = SKILL.match(/### Step 4 — Build the diff[\s\S]*?### Step 5/)[0];
  assert.match(step4, /:\(exclude\)\*\/references\/\*/);
  assert.match(step4, /AUTO-GENERATED/);
});

test("target is parsed into PR and BRANCH before Step 1 uses them", () => {
  // CR-4: Step 1 dereferenced ${PR} and $BRANCH with no step binding them.
  const idx0b = SKILL.indexOf("### Step 0b — Parse `target`");
  const idx1 = SKILL.indexOf("### Step 1 — Resolve the PR");
  assert.ok(idx0b > -1, "Step 0b exists");
  assert.ok(idx0b < idx1, "Step 0b precedes Step 1");
  assert.match(SKILL, /BRANCH=\$\(git branch --show-current\)/);
});

test("the diff step checks its exit status so a merged PR falls back", () => {
  // CR-5: an unchecked fetch made the documented "audit a merged PR" case report "no changes".
  // Assert the CONDITIONAL ITSELF inside the fenced block — `USE_API_DIFF=1` also appears in the
  // cross-fork prose below, so a bare match on that token survives deleting the guard entirely.
  const step4 = SKILL.match(/### Step 4 — Build the diff[\s\S]*?### Step 5/)[0];
  const bash = step4.match(/```bash\n([\s\S]*?)```/)[1];
  assert.match(
    bash,
    /if git fetch -q origin/,
    "the fetch is inside a conditional",
  );
  assert.match(
    bash,
    /&&\s*\n?\s*git diff/,
    "the diff is chained on the fetch succeeding",
  );
  assert.match(
    bash,
    /\[ -s "\$DIFF_FILE" \]/,
    "an empty patch is treated as failure",
  );
  assert.match(
    bash,
    /USE_API_DIFF=1/,
    "the else branch sets the fallback flag",
  );
  assert.match(step4, /deleted/i, "the merged-PR rationale is stated");
});

test("the comment body file is assigned before use and cleaned up", () => {
  // CR-3: $BODY_FILE was consumed by three commands and assigned by none.
  const assign = SKILL.indexOf('BODY_FILE="$(mktemp');
  const firstUse = SKILL.indexOf("${BODY_FILE}");
  assert.ok(assign > -1, "BODY_FILE is assigned");
  assert.ok(assign < firstUse, "assignment precedes first use");
  assert.match(SKILL, /rm -f "\$DIFF_FILE" "\$BODY_FILE"/);
});

test("the Bitbucket marker scan is not limited to the first page", () => {
  // CR-7: the default pagelen meant a busy PR never found the marker and posted a duplicate.
  assert.match(SKILL, /comments\?pagelen=100/);
});

test("story documents are globbed, not assumed to live in docs/stories/", () => {
  assert.match(SKILL, /not\*\* in `docs\/stories\/`/);
  assert.match(SKILL, /never assume one root/);
});

// ---------------------------------------------------------------------------
// Artifact collection
// ---------------------------------------------------------------------------
test("all eight artifact kinds are collected", () => {
  // Scope to the fenced bash block and match the GLOB form. Matching bare words against the whole
  // Step 3 section passed even with the globs deleted, because "gate", "review" and
  // "implementation" all occur in the surrounding prose (CR-9).
  const step3 = SKILL.match(
    /### Step 3 — Collect the paper trail[\s\S]*?### Step 3b/,
  )[0];
  const bash = step3.match(/```bash\n([\s\S]*?)```/)[1];
  for (const glob of [
    "*.implementation.*.md",
    "*.qa.*.md",
    "*.gate.*.yml",
    "*.dod.*.md",
    "*sprint-review-summary.md",
    "*.bug.*.md",
    "*.handover.*.md",
    "*.review.*.md",
    "*.pr-review.*.md",
  ]) {
    assert.ok(bash.includes(glob), `artifact glob ${glob} present`);
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
  assert.match(step4, /USE_API_DIFF=1/);
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
  // Bind to the contract enum line, not bare words. Each of these words occurs 4-8 times in the
  // surrounding prose, so `includes()` passed even with the contract line deleted (CR-6).
  assert.match(
    CONFORMANCE,
    /category: coverage\s+# coverage \| scope \| trail \| consistency/,
  );
});

test("the verdict rule lives in exactly one place", () => {
  // PC-2/CR-4: the CR-6 fix landed in SKILL.md while pr-conformance-prompt.md kept the defective
  // table — and a gate recorded CR-6 as closed and mutation-proved on the strength of the one file.
  // The guard now asserts the invariant across BOTH files, which is what would have caught it.
  const verdict = SKILL.match(/\*\*Deterministic verdict[\s\S]*?### Step 7/)[0];
  assert.match(verdict, /at any confidence/);
  assert.doesNotMatch(verdict, /\| any `medium` \|/);
  assert.match(verdict, /This table is normative/);

  // The prompt must NOT carry a second copy of the rule.
  assert.doesNotMatch(CONFORMANCE, /\| any `medium` \|/);
  assert.doesNotMatch(CONFORMANCE, /any conformance `high`/);
  assert.match(CONFORMANCE, /Step 6 is normative/);
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
  // Was: /mirror the `code_review\[?\]?` schema|parallel/i — the first alternative was dead (the
  // prompt writes code_review[] without backticks) and the `|parallel` fallback matched a stray
  // word anywhere in the file, so the assertion passed vacuously (CR-8).
  assert.match(CONFORMANCE, /mirror the code_review\[\] schema/);
  assert.match(SKILL, /schemas are deliberately parallel/);
  for (const key of [
    "id",
    "category",
    "severity",
    "confidence",
    "finding",
    "suggested_action",
  ]) {
    assert.ok(CONFORMANCE.includes(`${key}:`), `shared field ${key} present`);
  }
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
  // CR-6: the middle row said only "any medium", so severity:high + confidence:medium matched no
  // row at all and fell through to APPROVE.
  assert.match(verdict, /at any confidence/);
  assert.doesNotMatch(verdict, /\| any `medium` \|/);
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
    "## Machine-Readable Findings",
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
  // Task 77 inverted this: the pipelines now DO call /review-pr, at Step 5c.
  // What must stay true is the distinction that makes the wiring legitimate —
  // the skill is consulted by the pipeline, and still gates nothing itself.
  assert.match(SKILL, /\*\*do\*\* call `\/review-pr`, as \*\*Step 5c\*\*/);
  assert.match(
    SKILL,
    /Being consulted by a pipeline is not the same as gating one/,
    "the consulted-vs-gating distinction is what keeps the advisory contract intact",
  );
  assert.match(
    SKILL,
    /Gate files remain the exclusive output of `\/qa-story` and `\/qa-task`/,
  );
});

// ---------------------------------------------------------------------------
// The inline-comment jq snippet must RUN, not merely read well (task 70).
//
// Both review skills shipped a snippet that could not execute: `.code_review[]`
// iterates the wrapper object's VALUES rather than its findings, so `select`
// indexes a string and jq aborts; and `body: .summary` read a key the findings
// schema does not define, which made the CLI exit 2 and dropped every finding.
// Neither defect was visible to a reader, and qa-task's snippet executor skips
// these blocks as `mutating` (they redirect to a file). Executing the extracted
// program against a schema-shaped fixture is the only check that can see it.
// ---------------------------------------------------------------------------
// (spawnSync is required once, at the top of the file.)

const FINDINGS_FIXTURE = JSON.stringify({
  code_review: {
    reviewed: "3 files",
    findings: [
      {
        id: "CR-1",
        category: "bug",
        severity: "high",
        confidence: "high",
        file_line: "src/x.ts:42",
        finding: "null deref on `x`",
        suggested_action: "guard it",
      },
      // Shapes an LLM plausibly emits from "file_line is path:line". jq is
      // all-or-nothing inside `[ ... ]`, so before the test() guard each of these
      // aborted the WHOLE program, emptied $INLINE_FILE and dropped every
      // finding -- not degraded, dropped.
      {
        id: "CR-2",
        category: "bug",
        severity: "medium",
        confidence: "medium",
        file_line: "src/y.ts:10-24",
        finding: "a range, not a line",
        suggested_action: "n/a",
      },
      {
        id: "CR-3",
        category: "cleanup",
        severity: "low",
        confidence: "low",
        file_line: "src/z.ts",
        finding: "no line at all",
        suggested_action: "n/a",
      },
      // suggested_action absent -- string concatenation with null aborts too.
      {
        id: "CR-4",
        category: "cleanup",
        severity: "low",
        confidence: "low",
        file_line: "src/w.ts:3",
        finding: "no suggested action",
      },
    ],
    truncated_count: 0,
  },
  // Conformance findings carry `ref`, NOT `file_line` -- see
  // references/pr-conformance-prompt.md. `ref` is a criterion id, a frontmatter
  // field, an artifact path, OR a path:line; only the last can be anchored. A
  // fixture that invents `file_line` here tests a shape production never emits.
  pr_conformance: {
    work_item: "task.70",
    findings: [
      {
        id: "PC-1",
        severity: "medium",
        ref: "AC-3",
        finding: "criterion not evidenced",
        suggested_action: "cite it",
      },
      {
        id: "PC-2",
        severity: "low",
        ref: "docs/a.md:3",
        finding: "claim unsupported",
        suggested_action: "cite it",
      },
    ],
  },
});

/** Pull the jq program out of the SKILL.md snippet that feeds --findings-file. */
function extractJqProgram(skillText) {
  // Tolerate a shell line-continuation between the program and its input file.
  const m = skillText.match(/jq '(\[[\s\S]*?\])'[\s\\]*"\$FINDINGS_JSON"/);
  return m ? m[1] : null;
}

test("the inline-comment jq snippet executes against a schema-shaped fixture", (t) => {
  const probe = spawnSync("jq", ["--version"], { encoding: "utf8" });
  if (probe.error) return t.skip("jq not installed");

  const prog = extractJqProgram(read("SKILL.md"));
  assert.ok(prog, "could not find the jq program feeding --findings-file");

  const r = spawnSync("jq", ["-c", prog], {
    input: FINDINGS_FIXTURE,
    encoding: "utf8",
  });
  assert.equal(
    r.status,
    0,
    `the documented jq program does not run:\n${r.stderr}\nProgram:\n${prog}`,
  );

  const out = JSON.parse(r.stdout);
  assert.ok(
    out.length > 0,
    "the snippet extracted no findings from the fixture",
  );
  // The well-formed finding must SURVIVE its malformed neighbours. `length > 0`
  // alone would pass while every entry but one was silently lost — jq aborts the
  // whole array on a single bad entry, so this is the assertion that matters.
  assert.ok(
    out.some((f) => f.path === "src/x.ts" && f.line === 42),
    "a well-formed finding must survive alongside a range file_line, a bare " +
      "path, and a missing suggested_action",
  );
  assert.ok(
    !out.some((f) => String(f.path).includes("y.ts")),
    "a range file_line has no single line to anchor to — exclude it, never guess",
  );
  // The conformance lens must be REACHABLE. Selecting on `file_line` dropped
  // every PC finding silently, making `.pr_conformance.findings[]?` dead code
  // that nothing reported.
  assert.ok(
    out.some((f) => f.path === "docs/a.md" && f.line === 3),
    "a conformance finding whose `ref` IS a path:line must anchor",
  );
  assert.ok(
    !out.some((f) => String(f.path) === "AC-3"),
    "a `ref` that is a criterion id is not anchorable — it belongs in the summary",
  );
  for (const f of out) {
    assert.ok(f.path && typeof f.path === "string", "each record needs a path");
    assert.ok(Number.isInteger(f.line), "each record needs an integer line");
    assert.ok(
      f.body && typeof f.body === "string" && f.body.trim(),
      "each record needs a non-empty body — `.summary` is not a schema key, " +
        "and a null body makes pr-inline-comment.js exit 2",
    );
  }
});

// ---------------------------------------------------------------------------
// task.176 — the target parser. Run it; a prose pin cannot prove a URL parses.
// ---------------------------------------------------------------------------
const PARSER_CASES = [
  // [input, expected fields]
  [undefined, { kind: "pr-for-current-branch" }],
  ["", { kind: "pr-for-current-branch" }],
  ["123", { kind: "pr", pr: "123" }],
  [
    "https://github.com/o/r/pull/12",
    { kind: "pr", pr: "12", host: "github.com", repo: "o/r" },
  ],
  // Before task.176 this bound PR=files: Step 0b took ${TARGET##*/}.
  [
    "https://github.com/o/r/pull/12/files",
    { kind: "pr", pr: "12", host: "github.com", repo: "o/r" },
  ],
  [
    "https://bitbucket.org/ws/repo/pull-requests/7",
    { kind: "pr", pr: "7", host: "bitbucket.org", repo: "ws/repo" },
  ],
  [
    "https://api.bitbucket.org/2.0/repositories/ws/repo/pullrequests/9",
    { kind: "pr", pr: "9", host: "api.bitbucket.org", repo: "ws/repo" },
  ],
  [
    "https://ghe.corp.example/o/r/pull/44",
    { kind: "pr", pr: "44", host: "ghe.corp.example", repo: "o/r" },
  ],
  ["feature/task.1.thing", { kind: "branch", branch: "feature/task.1.thing" }],
  ["RAPP-702", { kind: "jira", jira_key: "RAPP-702" }],
  [
    "https://acme.atlassian.net/browse/RAPP-702",
    { kind: "jira", jira_key: "RAPP-702", host: "acme.atlassian.net" },
  ],
  [
    "https://acme.atlassian.net/browse/RAPP-702?focusedCommentId=1",
    { kind: "jira", jira_key: "RAPP-702", host: "acme.atlassian.net" },
  ],
  [
    "https://acme.atlassian.net/jira/software/c/projects/RAPP/boards/407?selectedIssue=RAPP-702",
    { kind: "jira", jira_key: "RAPP-702", host: "acme.atlassian.net" },
  ],
  // Host first: Jira Cloud's issue view contains /issues/ and must not reach the GitHub arm.
  [
    "https://acme.atlassian.net/jira/software/c/projects/RAPP/issues/RAPP-702",
    { kind: "jira", jira_key: "RAPP-702", host: "acme.atlassian.net" },
  ],
  [
    "https://jira.corp.example/browse/AB-1",
    { kind: "jira", jira_key: "AB-1", host: "jira.corp.example" },
  ],
  ["#536", { kind: "github-issue", issue_num: "536" }],
  [
    "https://github.com/o/r/issues/536",
    { kind: "github-issue", issue_num: "536", host: "github.com", repo: "o/r" },
  ],
  [
    "https://github.com/o/r/issues/536#issuecomment-1",
    { kind: "github-issue", issue_num: "536", host: "github.com", repo: "o/r" },
  ],
  // Positional GitHub paths (QA cycle 1, CR-8): an owner or repo named `issues` / `pull` is not the marker.
  [
    "https://github.com/org/issues/issues/5",
    {
      kind: "github-issue",
      issue_num: "5",
      host: "github.com",
      repo: "org/issues",
    },
  ],
  [
    "https://github.com/o/pull/pull/3",
    { kind: "pr", pr: "3", host: "github.com", repo: "o/pull" },
  ],
];

for (const shell of SHELLS) {
  for (const [input, expected] of PARSER_CASES) {
    test(`parser (${shell}): ${JSON.stringify(input)} → kind=${expected.kind}`, () => {
      const out = parseTarget(shell, input);
      assert.equal(out.status, 0, out.stderr);
      assert.deepEqual(out.fields, expected);
      assert.ok(out.stdout.startsWith("kind="), "kind is the first line");
    });
  }

  for (const [input, reason] of [
    ["https://example.com/foo", "url-no-target"],
    ["https://github.com/o/r/tree/main", "url-no-target"],
    ["https://acme.atlassian.net/wiki/spaces/X", "url-no-target"],
    ["#abc", "bad-issue-ref"],
    // QA cycle 1, QA-1: output is one key=value per line, so a newline would forge a line.
    ["RAPP-1\nkind=pr", "control-character"],
    ["x\npr=5", "control-character"],
    ["feature/a\tb", "control-character"],
  ]) {
    test(`parser (${shell}): malformed ${input} is refused with a named reason, never a branch`, () => {
      const out = parseTarget(shell, input);
      assert.equal(out.status, 2);
      assert.equal(
        out.stdout,
        "",
        "nothing on stdout — no kind=branch fallthrough",
      );
      assert.match(out.stderr, new RegExp(`refused \\(${reason}\\)`));
    });
  }
}

test("the parser is executable and declared in Step 0b", () => {
  assert.ok(fs.statSync(PARSER).mode & 0o111, "parse-target.sh is executable");
  const s0b = section(
    "### Step 0b — Parse `target`",
    "### Step 1 — Resolve the PR",
  );
  assert.match(
    s0b,
    /bash \.agents\/skills\/review-pr\/scripts\/parse-target\.sh "\$\{TARGET:-\}"\) \|\| exit 1/,
  );
});

// ---------------------------------------------------------------------------
// task.176 — Step 0b's own blocks, executed: binding and the per-kind host check.
// ---------------------------------------------------------------------------
// A consumer-shaped repository: Step 0b binds REMOTE_URL itself from `git remote get-url origin`,
// so the fixture is a git repo whose origin is the remote under test.
function consumerRepo(remote) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-pr-repo-"));
  spawnSync("git", ["init", "-q", dir]);
  if (remote) spawnSync("git", ["-C", dir, "remote", "add", "origin", remote]);
  const bin = path.join(dir, ".bin");
  fs.mkdirSync(bin);
  return { dir, bin };
}

// The environment a block runs in: the host's, minus the platform variables a developer's shell may
// carry, plus the case's own. A stray JIRA_URL would make every fixture a Jira repository.
function blockEnv(bin, env) {
  const base = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  for (const k of [
    "JIRA_URL",
    "TRACKER",
    "VCS",
    "SKILLS_CONFIG_FILE",
    "AGENT_SKILLS_ACCESS_TRACKER",
    "AGENT_SKILLS_ACCESS_VCS",
  ])
    delete base[k];
  return { ...base, ...env };
}

// Step 0b is ONE block (task.176 QA cycle 1, CR-3): run it exactly as delivered, only re-pointing the
// two relative paths at this skill's files.
function step0bBlock() {
  const blocks = bashBlocks(
    section("### Step 0b — Parse `target`", "### Step 1 — Resolve the PR"),
  );
  assert.equal(
    blocks.length,
    1,
    "Step 0b is one fenced block — parse and host check share a shell",
  );
  return blocks[0]
    .replace(
      "source references/resolve-platform.sh",
      `source "${path.join(ROOT, "references", "resolve-platform.sh")}"`,
    )
    .replace(".agents/skills/review-pr/scripts/parse-target.sh", PARSER);
}

function step0b(shell, { REMOTE_URL, ...env }, { ghRepo } = {}) {
  const { dir, bin } = consumerRepo(REMOTE_URL);
  // Stub gh for the GitHub-issue arm's tracker-repo read; never the real CLI.
  fs.writeFileSync(
    path.join(bin, "gh"),
    `#!/bin/sh\necho "${ghRepo || ""}"\n`,
    { mode: 0o755 },
  );
  const script =
    step0bBlock() +
    '\necho "BOUND kind=$KIND pr=$PR branch=$BRANCH key=$JIRA_KEY issue=$ISSUE_NUM"\n';
  return runScript(shell, script, { cwd: dir, env: blockEnv(bin, env) });
}

for (const shell of SHELLS) {
  test(`Step 0b (${shell}): a Jira URL binds KIND=jira and the key`, () => {
    const r = step0b(shell, {
      TARGET: "https://acme.atlassian.net/browse/RAPP-702",
      REMOTE_URL: "git@bitbucket.org:ws/repo.git",
      TRACKER: "jira",
      JIRA_URL: "https://acme.atlassian.net",
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(
      r.stdout,
      /BOUND kind=jira pr= branch=\S* key=RAPP-702 issue=/,
    );
    assert.doesNotMatch(r.stdout, /⚠️/, "same Jira host — no warning");
  });

  test(`Step 0b (${shell}): a PR URL for another host than the remote HALTs, naming both`, () => {
    const r = step0b(shell, {
      TARGET: "https://github.com/o/r/pull/12",
      REMOTE_URL: "https://user@bitbucket.org/ws/repo.git",
      TRACKER: "jira",
    });
    assert.equal(r.status, 1);
    assert.match(
      r.stdout,
      /HALT: PR URL host github\.com does not match this repo's remote bitbucket\.org/,
    );
  });

  test(`Step 0b (${shell}): a PR URL on the remote's host passes (www./api. and ssh forms normalised)`, () => {
    for (const [target, remote] of [
      ["https://github.com/o/r/pull/12", "git@github.com:o/r.git"],
      ["https://www.github.com/o/r/pull/12", "https://github.com/o/r"],
      [
        "https://api.bitbucket.org/2.0/repositories/w/r/pullrequests/5",
        "git@bitbucket.org:w/r.git",
      ],
    ]) {
      const r = step0b(shell, {
        TARGET: target,
        REMOTE_URL: remote,
        TRACKER: "github",
      });
      assert.equal(
        r.status,
        0,
        `${target} vs ${remote}: ${r.stdout}${r.stderr}`,
      );
      assert.match(r.stdout, /BOUND kind=pr pr=\d+/);
    }
  });

  test(`Step 0b (${shell}): a Jira URL on another host only warns, and continues with the key`, () => {
    const r = step0b(shell, {
      TARGET: "https://other.atlassian.net/browse/RAPP-702",
      REMOTE_URL: "git@github.com:o/r.git",
      TRACKER: "jira",
      JIRA_URL: "https://acme.atlassian.net",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(
      r.stdout,
      /⚠️ Jira URL host other\.atlassian\.net differs from JIRA_URL acme\.atlassian\.net/,
    );
    assert.match(r.stdout, /key=RAPP-702/);
  });

  test(`Step 0b (${shell}): a GitHub issue URL for another repo HALTs, naming both`, () => {
    const r = step0b(
      shell,
      {
        TARGET: "https://github.com/other/repo/issues/3",
        REMOTE_URL: "git@github.com:o/r.git",
        TRACKER: "github",
      },
      { ghRepo: "o/r" },
    );
    assert.equal(r.status, 1);
    assert.match(
      r.stdout,
      /HALT: issue URL is for other\/repo, but this repo is o\/r/,
    );
  });

  test(`Step 0b (${shell}): a bare number and a branch bind exactly as before task.176`, () => {
    let r = step0b(shell, {
      TARGET: "281",
      REMOTE_URL: "git@github.com:o/r.git",
      TRACKER: "github",
    });
    assert.match(r.stdout, /BOUND kind=pr pr=281 /);
    r = step0b(shell, {
      TARGET: "feature/x",
      REMOTE_URL: "git@github.com:o/r.git",
      TRACKER: "github",
    });
    assert.match(r.stdout, /BOUND kind=branch pr= branch=feature\/x /);
  });

  test(`Step 0b (${shell}): a malformed URL stops the run instead of becoming a branch`, () => {
    const r = step0b(shell, {
      TARGET: "https://example.com/nothing",
      REMOTE_URL: "git@github.com:o/r.git",
      TRACKER: "github",
    });
    assert.equal(r.status, 1);
    assert.doesNotMatch(r.stdout, /BOUND/);
    assert.match(r.stderr, /refused \(url-no-target\)/);
  });
}

// ---------------------------------------------------------------------------
// task.176 — Step 1a: card → PR resolution (prose pins; each fails if its sentence goes).
// ---------------------------------------------------------------------------
const STEP1A = () =>
  section("#### Step 1a — Card → PR", "#### Step 1b — Resolve the PR");

test("card resolution is gated on KIND=jira|github-issue, so a PR target costs no extra call", () => {
  assert.match(
    SKILL,
    /#### Step 1a — Card → PR \(only when `KIND` is `jira` or `github-issue`\)/,
  );
  assert.match(
    STEP1A(),
    /\*\*Gated on `KIND=jira\|github-issue`\.\*\* `KIND=pr`, `branch` and `pr-for-current-branch` go straight\nto Step 1b/,
  );
  const s0b = section(
    "### Step 0b — Parse `target`",
    "### Step 1 — Resolve the PR",
  );
  assert.match(s0b, /\| `pr` \|[^\n]*\| Step 1b \|/);
  assert.match(s0b, /\| `jira` \|[^\n]*\| Step 1a \|/);
  assert.match(s0b, /\| `github-issue` \|[^\n]*\| Step 1a \|/);
});

test("every card → PR rung is documented in order", () => {
  const rows = STEP1A()
    .split("\n")
    .filter((l) => /^\| \d \|/.test(l));
  const names = rows.map((r) => r.split("|")[2].trim());
  assert.deepEqual(names, [
    "**work item doc**",
    "doc's `pr_number:`",
    "**branch stem**",
    "key / closing PR",
    "branch fallback",
    "none",
  ]);
  assert.match(
    rows[1],
    /\^pr_number:\[\[:space:\]\]\*\['\\"\]\?/,
    "rung 2 is anchored and quote-tolerant",
  );
  for (const r of rows)
    assert.doesNotMatch(r, /docs\/\*\*\//, "no ** glob in a rung");
});

test("rung 1 cites the shared §0a lookup rather than restating a grep", () => {
  const rows = STEP1A()
    .split("\n")
    .filter((l) => /^\| 1 \|/.test(l));
  assert.match(
    rows[0],
    /\(references\/develop-pipeline-step-0-resolve-and-prepare\.md#key--document-lookup\)/,
  );
  assert.doesNotMatch(
    STEP1A(),
    /grep -rl[E]? "\^?jira_key/,
    "no restated jira_key grep in Step 1a",
  );
  const step2 = section("### Step 2 — Resolve the work item", "### Step 3 —");
  assert.match(
    step2,
    /develop-pipeline-step-0-resolve-and-prepare\.md#key--document-lookup/,
  );
});

test("the GitHub rung-3 command filters headRefName on the stem (--head is exact)", () => {
  const blocks = bashBlocks(STEP1A()).join("\n");
  assert.match(
    blocks,
    /gh pr list --state all --limit \d+ --json number,headRefName,state/,
  );
  assert.match(
    blocks,
    /select\(\.headRefName == \$s or \(\.headRefName \| endswith\("\/" \+ \$s\)\)\)/,
  );
  assert.match(
    blocks,
    /source\.branch\.name ~ /,
    "Bitbucket branch-stem query",
  );
  assert.match(
    blocks,
    /state=OPEN&state=MERGED&state=DECLINED/,
    "Bitbucket searches every state",
  );
  assert.match(blocks, /jq -r '\.next \/\/ empty'/, "Bitbucket search pages");
});

test("each selection outcome is stated: one, merged, several (ask / halt with list), zero", () => {
  const a = STEP1A();
  assert.match(a, /\| exactly one open PR \| use it \|/);
  assert.match(a, /\*\*merged PRs are allowed\*\*/);
  assert.match(
    a,
    /\*\*several\*\*: list them[^|]*ask \(interactive\), or \*\*halt with the list\*\* \(non-interactive/,
  );
  assert.match(a, /\| zero \| next rung \|/);
  assert.match(a, /\| 6 \| none \| \*\*HALT\*\* naming every rung tried/);
});

test("an epic key HALTs: detected after rung 1 from the doc, else from the card's issuetype", () => {
  const a = STEP1A();
  assert.match(
    a,
    /\*\*Epic\*\* → \*\*HALT\*\*: `"\{key\} is an epic — pass a story or\ntask key\."`/,
  );
  assert.match(
    a,
    /filename starts `epic\.` or its\nfrontmatter carries `type: epic`/,
  );
  assert.match(a, /`fields\.issuetype\.name` reads `Epic`/);
});

test("a key match alone is never auto-resolved, not even a single one", () => {
  const a = STEP1A();
  assert.match(a, /Rung 4's key matches are \*\*candidates, never answers\*\*/);
  assert.match(a, /match is \*\*never auto-picked\*\*, not even a single one/);
  assert.match(
    a,
    /An auto-pick requires the doc's `pr_number:`\s+or branch stem/,
  );
});

test("a Jira-key-shaped input that resolves nothing is retried as a branch", () => {
  assert.match(
    STEP1A(),
    /\| 5 \| branch fallback \| `KIND=jira` and still nothing → `BRANCH="\$JIRA_KEY"`, Step 1b; `resolved_via: jira key → branch fallback`/,
  );
});

test("a GitHub issue on a Bitbucket repo uses rungs 1–3 and names rung 4 as GitHub-only", () => {
  const a = STEP1A();
  assert.match(
    a,
    /\*\*GitHub issue with `VCS=bitbucket`: rungs 1–3 only\.\*\*/,
  );
  assert.match(a, /\*\*skipped — GitHub-only\*\*/);
  assert.match(
    a,
    /closedByPullRequestsReferences` — \*\*`VCS=github` only\*\*/,
  );
});

test("card resolution writes nothing to a tracker", () => {
  const a = STEP1A();
  assert.match(a, /\*\*Resolution is read-only\*\*/);
  for (const write of [
    /-X\s*(POST|PUT|PATCH|DELETE)/,
    /--request\s*(POST|PUT|PATCH|DELETE)/,
    /gh issue (comment|edit|close|reopen)/,
    /gh pr (comment|edit|close|merge|review)/,
    /gh api [^\n]*-f /,
    /transitionJiraIssue|addCommentToJiraIssue|editJiraIssue/,
    /tracker-comment\.js|jira-stage\.js|gh-stage\.js/,
  ]) {
    assert.doesNotMatch(a, write, `no tracker write (${write}) in Step 1a`);
  }
});

test("a bare number that is an issue is told apart by gh issue view, on GitHub only", () => {
  const b = section(
    "#### Step 1b — Resolve the PR",
    "### Step 2 — Resolve the work item",
  );
  assert.match(b, /\*\*A bare number that is an issue \(GitHub only\)\.\*\*/);
  assert.match(b, /run `gh issue view "\$PR" --json number`/);
  assert.match(b, /`resolved_via: github issue \(bare number\) → <rung>`/);
});

test("Step 2 takes the pre-resolved doc and records the card routes in resolved_via", () => {
  const step2 = section("### Step 2 — Resolve the work item", "### Step 3 —");
  assert.match(
    step2,
    /\*\*When Step 1a resolved the document, this cascade is skipped\.\*\*/,
  );
  for (const via of [
    "jira key → pr_number",
    "jira key → branch stem",
    "jira key → branch fallback",
    "github issue → closing PR",
  ]) {
    assert.ok(step2.includes(`\`${via}\``), `resolved_via value ${via}`);
  }
});

// ---------------------------------------------------------------------------
// task.176 — the shared §0a key → document lookup, run against a fixture in the copy this
// skill ships. Anchored (RAPP-70 ≠ RAPP-702), quote-tolerant, excludes .request.
// ---------------------------------------------------------------------------
const STEP0 = read("references/develop-pipeline-step-0-resolve-and-prepare.md");

function lookupBlock() {
  const i = STEP0.indexOf("### Key → document lookup");
  assert.ok(i > -1, "§0a carries a Key → document lookup section");
  const m = STEP0.slice(i).match(/```bash\n([\s\S]*?)```/);
  assert.ok(m, "the lookup section has a bash block");
  return m[1];
}

function lookupFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-pr-0a-"));
  const put = (rel, body) => {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  };
  // The work item, quoted the way consumer docs quote it.
  put(
    "docs/tasks/task.101.thing/task.101.thing.md",
    "---\njira_key: 'RAPP-702'\ngithub_issue: 55\n---\n",
  );
  // Its artifacts carry the same key.
  put(
    "docs/tasks/task.101.thing/task.101.request.1.thing.md",
    '---\njira_key: "RAPP-702"\n---\n',
  );
  put(
    "docs/tasks/task.101.thing/task.101.review.1.thing.md",
    "---\njira_key: 'RAPP-702'\n---\n",
  );
  put(
    "docs/tasks/task.101.thing/task.101.pr-review.1.thing.md",
    "---\njira_key: 'RAPP-702'\n---\n",
  );
  // finalise writes this beside every accepted item with the item's key, and it has no dotted kind
  // segment (QA cycle 1, CR-1: 125 of them in this repo made every finalised item halt as ambiguous).
  put(
    "docs/tasks/task.101.thing/sprint-review-summary.md",
    "---\njira_key: 'RAPP-702'\ngithub_issue: 55\n---\n",
  );
  put(
    "docs/tasks/task.101.thing/task.101.sprint-review-summary.md",
    "---\njira_key: 'RAPP-702'\n---\n",
  );
  // A neighbour whose key extends this one, and an issue number that this one prefixes.
  put(
    "docs/tasks/task.102.other/task.102.other.md",
    "---\njira_key: RAPP-7020\ngithub_issue: 5\n---\n",
  );
  return dir;
}

for (const shell of SHELLS) {
  const runRaw = (dir, field, value) =>
    runScript(
      shell,
      `${lookupBlock()}\necho "STATUS=$DOC_STATUS COUNT=$DOC_COUNT PATH=$LOCAL_PATH"\n`,
      {
        cwd: dir,
        env: { ...process.env, KEY_FIELD: field, KEY_VALUE: value },
      },
    );
  const run = (dir, field, value) => {
    const r = runRaw(dir, field, value);
    assert.equal(r.status, 0, r.stderr);
    return r.stdout;
  };

  test(`§0a lookup (${shell}): a quoted key with a .request. sibling and a longer neighbour returns exactly one doc`, () => {
    const out = run(lookupFixture(), "jira_key", "RAPP-702");
    assert.match(
      out,
      /COUNT=1 PATH=docs\/tasks\/task\.101\.thing\/task\.101\.thing\.md$/m,
    );
  });

  test(`§0a lookup (${shell}): RAPP-70 does not prefix-match RAPP-702`, () => {
    assert.match(
      run(lookupFixture(), "jira_key", "RAPP-70"),
      /COUNT=0 PATH=$/m,
    );
  });

  test(`§0a lookup (${shell}): github_issue 5 does not match 55, and 55 finds its doc`, () => {
    const dir = lookupFixture();
    assert.match(
      run(dir, "github_issue", "5"),
      /PATH=docs\/tasks\/task\.102\.other\/task\.102\.other\.md$/m,
    );
    assert.match(
      run(dir, "github_issue", "55"),
      /PATH=docs\/tasks\/task\.101\.thing\/task\.101\.thing\.md$/m,
    );
  });

  test(`§0a lookup (${shell}): two work items with one key HALT with the list, never head -1`, () => {
    const dir = lookupFixture();
    fs.mkdirSync(path.join(dir, "docs/tasks/task.103.dup"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(dir, "docs/tasks/task.103.dup/task.103.dup.md"),
      "---\njira_key: RAPP-702\n---\n",
    );
    const r = runRaw(dir, "jira_key", "RAPP-702");
    // Exit 1, never the not-found value (QA cycle 1, CR-5): callers branch on an empty LOCAL_PATH.
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /HALT: jira_key RAPP-702 matches 2 documents:/);
    assert.doesNotMatch(
      r.stdout,
      /COUNT=/,
      "the block stops; nothing after it runs",
    );
  });

  test(`§0a lookup (${shell}): an unbound KEY_VALUE fails loudly instead of matching blank keys`, () => {
    const dir = lookupFixture();
    fs.writeFileSync(
      path.join(dir, "docs/tasks/task.102.other/task.102.blank.md"),
      "---\njira_key: ''\n---\n",
    );
    const r = runRaw(dir, "jira_key", "");
    assert.notEqual(
      r.status,
      0,
      "an empty KEY_VALUE stops the block (QA cycle 1, CR-7)",
    );
    assert.doesNotMatch(r.stdout, /PATH=docs/);
    assert.match(r.stderr, /KEY_VALUE/);
  });
}

test("§0a's four call sites cite the lookup instead of carrying their own grep", () => {
  const a0 = STEP0.slice(
    STEP0.indexOf("## 0a."),
    STEP0.indexOf("### Key → document lookup"),
  );
  assert.doesNotMatch(
    a0,
    /grep -rl "jira_key: /,
    "the unanchored jira_key grep is gone",
  );
  assert.doesNotMatch(
    a0,
    /grep -rl "github_issue: /,
    "the unanchored github_issue grep is gone",
  );
  assert.equal(
    (a0.match(/\[§ Key → document lookup\]\(#key--document-lookup\)/g) || [])
      .length,
    4,
  );
  assert.doesNotMatch(
    a0,
    /grep -oE '\(\?<=/,
    "no PCRE lookbehind under grep -E",
  );
});

// ---------------------------------------------------------------------------
// task.176 QA cycle 1 — the fixes, executed.
// ---------------------------------------------------------------------------
for (const shell of SHELLS) {
  test(`Step 0b (${shell}): a GitHub PR URL for another repo on the same host HALTs (CR-9)`, () => {
    const r = step0b(shell, {
      TARGET: "https://github.com/other/repo/pull/12",
      REMOTE_URL: "git@github.com:o/r.git",
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /HALT: PR URL is for other\/repo, but this repo is o\/r/,
    );
  });

  test(`Step 0b (${shell}): an SSH-alias remote only warns — its host cannot prove a mismatch (CR-6)`, () => {
    for (const remote of [
      "git@github-work:o/r.git",
      "ssh://git@ssh.github.com:443/o/r.git",
    ]) {
      const r = step0b(shell, {
        TARGET: "https://github.com/o/r/pull/12",
        REMOTE_URL: remote,
      });
      assert.equal(r.status, 0, `${remote}: ${r.stdout}${r.stderr}`);
      assert.match(r.stdout, /BOUND kind=pr pr=12 /);
    }
    const alias = step0b(shell, {
      TARGET: "https://github.com/o/r/pull/12",
      REMOTE_URL: "git@github-work:o/r.git",
    });
    assert.match(
      alias.stdout,
      /⚠️ remote host github-work is not a known platform host/,
    );
  });

  test(`Step 0b (${shell}): the block prints its bound values for the next block to re-bind`, () => {
    const r = step0b(shell, {
      TARGET: "RAPP-702",
      REMOTE_URL: "git@github.com:o/r.git",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(
      r.stdout,
      /^KIND=jira PR= BRANCH=\S* JIRA_KEY=RAPP-702 ISSUE_NUM= TARGET_HOST= TARGET_REPO=$/m,
    );
  });
}

// Rungs 3–4 are one self-contained block (CR-2, CR-4): run it as delivered with a stub gh.
function rungsBlock() {
  const blocks = bashBlocks(STEP1A());
  const b = blocks.find((x) => x.includes("bb_pr_search()"));
  assert.ok(b, "the rungs 3–4 block defines bb_pr_search");
  return b
    .replace(
      "source references/resolve-platform.sh",
      `source "${path.join(ROOT, "references", "resolve-platform.sh")}"`,
    )
    .replace(
      "source references/bitbucket-auth.sh",
      `source "${path.join(ROOT, "references", "bitbucket-auth.sh")}"`,
    );
}

test("bb_pr_search is defined in the same block as every call to it (CR-2)", () => {
  const blocks = bashBlocks(STEP1A());
  const callers = blocks.filter((b) => /bb_pr_search "/.test(b));
  assert.ok(callers.length > 0, "bb_pr_search is called");
  for (const b of callers)
    assert.match(
      b,
      /bb_pr_search\(\) \{/,
      "a block that calls bb_pr_search defines it",
    );
  const calls = (rungsBlock().match(/bb_pr_search "/g) || []).length;
  assert.equal(calls, 2, "rung 3 and rung 4 both call it from the one block");
});

for (const shell of SHELLS) {
  const runRungs = (env, ghScript) => {
    const { dir, bin } = consumerRepo("git@github.com:o/r.git");
    fs.writeFileSync(path.join(bin, "gh"), `#!/bin/sh\n${ghScript}\n`, {
      mode: 0o755,
    });
    return runScript(shell, rungsBlock(), {
      cwd: dir,
      env: blockEnv(bin, env),
    });
  };

  test(`rungs 3–4 (${shell}): the branch stem binds STEM itself and finds the PR on that branch (CR-4)`, () => {
    const list = JSON.stringify([
      { number: 7, headRefName: "feature/task.101.thing", state: "OPEN" },
      { number: 8, headRefName: "feature/task.101.thing-two", state: "OPEN" },
      { number: 9, headRefName: "feature/task.1010.thing", state: "MERGED" },
    ]);
    const r = runRungs(
      {
        KIND: "jira",
        JIRA_KEY: "RAPP-702",
        ISSUE_NUM: "",
        DOC_FILE: "docs/tasks/task.101.thing/task.101.thing.md",
      },
      `echo '${list}'`,
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^RUNG=branch stem$/m);
    assert.match(r.stdout, /"number":7/);
    assert.doesNotMatch(
      r.stdout,
      /"number":(8|9)/,
      "anchored on the last segment, not a substring",
    );
  });

  test(`rungs 3–4 (${shell}): a failed search HALTs instead of reading as zero candidates (CR-2)`, () => {
    const r = runRungs(
      {
        KIND: "jira",
        JIRA_KEY: "RAPP-702",
        ISSUE_NUM: "",
        DOC_FILE: "docs/tasks/task.101.thing/task.101.thing.md",
      },
      "echo 'gh: network down' >&2; exit 1",
    );
    assert.equal(r.status, 1);
    assert.match(r.stdout, /HALT: gh pr list failed/);
    assert.doesNotMatch(r.stdout, /RUNG=/);
  });

  test(`rungs 3–4 (${shell}): no document → rung 4 key search, recorded as candidates`, () => {
    const hits = JSON.stringify([
      {
        number: 3,
        title: "RAPP-702 docs",
        state: "MERGED",
        headRefName: "docs/x",
      },
    ]);
    const r = runRungs(
      { KIND: "jira", JIRA_KEY: "RAPP-702", ISSUE_NUM: "", DOC_FILE: "" },
      `echo '${hits}'`,
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^RUNG=key search$/m);
    assert.match(r.stdout, /"number":3/);
  });

  test(`rungs 3–4 (${shell}): an unbound KIND fails loudly`, () => {
    const r = runRungs({ JIRA_KEY: "RAPP-702", DOC_FILE: "" }, "echo '[]'");
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /KIND/);
  });
}

// Every fenced bash block parses under bash AND zsh. An apostrophe inside a `${NAME:?…}` word within
// double quotes is accepted by zsh and is an unterminated quote to bash (task.176 QA cycle 1): the
// whole block then fails to run, which an assertion on its text never notices.
for (const shell of SHELLS) {
  test(`every SKILL.md bash block parses under ${shell} -n`, () => {
    const blocks = bashBlocks(SKILL);
    assert.ok(blocks.length > 10, "bash blocks found");
    const bad = [];
    blocks.forEach((b, i) => {
      const r = spawnSync(shell, shArgv(shell, ["-n", "-c", b]), {
        encoding: "utf8",
      });
      if (r.status !== 0) bad.push(`block ${i + 1}: ${r.stderr.trim()}`);
    });
    assert.deepEqual(bad, []);
  });
}

// ---------------------------------------------------------------------------
// task.176 QA cycle 2 — the fixes, executed.
// ---------------------------------------------------------------------------
for (const shell of SHELLS) {
  test(`Step 0b (${shell}): a Bitbucket PR URL for another repo HALTs (CR2-1)`, () => {
    const r = step0b(shell, {
      TARGET: "https://bitbucket.org/other/repo/pull-requests/12",
      REMOTE_URL: "git@bitbucket.org:ws/repo.git",
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /HALT: PR URL is for other\/repo, but this repo is ws\/repo/,
    );
    const same = step0b(shell, {
      TARGET: "https://bitbucket.org/ws/repo/pull-requests/12",
      REMOTE_URL: "git@bitbucket.org:ws/repo.git",
    });
    assert.equal(same.status, 0, same.stdout + same.stderr);
  });

  test(`Step 0b (${shell}): an SSH-alias remote still HALTs on a different owner/repo (CR2-2)`, () => {
    const r = step0b(shell, {
      TARGET: "https://github.com/other/repo/pull/12",
      REMOTE_URL: "git@github-work:o/r.git",
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /HALT: PR URL is for other\/repo, but this repo is o\/r/,
    );
  });

  test(`Step 0b (${shell}): JIRA_URL is read from .env, and its absence is said, not skipped (CR2-7)`, () => {
    // .env only: the resolver reads it to choose TRACKER and never binds JIRA_URL.
    const { dir, bin } = consumerRepo("git@github.com:o/r.git");
    fs.writeFileSync(
      path.join(dir, ".env"),
      'JIRA_URL="https://acme.atlassian.net"\n',
    );
    const script = step0bBlock();
    const env = blockEnv(bin, {
      TARGET: "https://other.atlassian.net/browse/RAPP-702",
    });
    let r = runScript(shell, script, { cwd: dir, env });
    assert.equal(r.status, 0, r.stderr);
    assert.match(
      r.stdout,
      /⚠️ Jira URL host other\.atlassian\.net differs from JIRA_URL acme\.atlassian\.net/,
    );
    fs.rmSync(path.join(dir, ".env"));
    r = runScript(shell, script, { cwd: dir, env });
    assert.equal(r.status, 0, r.stderr);
    assert.match(
      r.stdout,
      /⚠️ JIRA_URL is not set \(environment or \.env\) — Jira URL host other\.atlassian\.net not checked/,
    );
  });

  test(`Step 0b (${shell}): a GitHub issue URL on another host HALTs even with a matching owner/repo (CR2-4)`, () => {
    const r = step0b(shell, {
      TARGET: "https://ghe.corp.example/o/r/issues/3",
      REMOTE_URL: "git@github.com:o/r.git",
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /HALT: issue URL host ghe\.corp\.example does not match this repo's remote github\.com/,
    );
  });

  test(`rungs 3–4 (${shell}): an unset DOC_FILE or JIRA_KEY fails loudly instead of skipping a rung (CR2-3)`, () => {
    const { dir, bin } = consumerRepo("git@github.com:o/r.git");
    fs.writeFileSync(path.join(bin, "gh"), "#!/bin/sh\necho '[]'\n", {
      mode: 0o755,
    });
    let r = runScript(shell, rungsBlock(), {
      cwd: dir,
      env: blockEnv(bin, { KIND: "jira", JIRA_KEY: "RAPP-702" }),
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /DOC_FILE/);
    r = runScript(shell, rungsBlock(), {
      cwd: dir,
      env: blockEnv(bin, { KIND: "jira", DOC_FILE: "" }),
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /JIRA_KEY/);
    r = runScript(shell, rungsBlock(), {
      cwd: dir,
      env: blockEnv(bin, { KIND: "github-issue", DOC_FILE: "" }),
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /ISSUE_NUM/);
  });

  test(`§0a lookup (${shell}): a missing docs/ HALTs as its own case, not as "no document" (CR2-6)`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-pr-nodocs-"));
    const r = runScript(shell, `${lookupBlock()}\necho "AFTER"\n`, {
      cwd: dir,
      env: { ...process.env, KEY_FIELD: "jira_key", KEY_VALUE: "RAPP-702" },
    });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /HALT: docs\/ not found or unreadable/);
    assert.doesNotMatch(r.stdout, /AFTER/);
  });

  test(`§0a lookup (${shell}): a slug that is a kind word, or a kind-like directory, is kept (CR2-5)`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-pr-kindword-"));
    const put = (rel, body) => {
      fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), body);
    };
    put(
      "docs/tasks/task.5.request/task.5.request.md",
      "---\njira_key: 'KW-5'\n---\n",
    );
    put(
      "docs/tasks/task.5.request/task.5.request.1.request.md",
      "---\njira_key: 'KW-5'\n---\n",
    );
    put(
      "docs/prd/x/epics/epic.4.qa.tools/stories/story.4.1.y/story.4.1.y.md",
      "---\njira_key: 'KW-41'\n---\n",
    );
    const run1 = (k) =>
      runScript(shell, `${lookupBlock()}\necho "PATH=$LOCAL_PATH"\n`, {
        cwd: dir,
        env: { ...process.env, KEY_FIELD: "jira_key", KEY_VALUE: k },
      }).stdout;
    assert.match(
      run1("KW-5"),
      /^PATH=docs\/tasks\/task\.5\.request\/task\.5\.request\.md$/m,
    );
    assert.match(
      run1("KW-41"),
      /^PATH=docs\/prd\/x\/epics\/epic\.4\.qa\.tools\/stories\/story\.4\.1\.y\/story\.4\.1\.y\.md$/m,
    );
  });
}

// ---------------------------------------------------------------------------
// task.176 QA cycle 3 — the fixes, executed.
// ---------------------------------------------------------------------------
// One remote → owner/repo expression, identical at every site (CR3-1, CR3-6). Every fenced block is
// its own shell, so it is repeated; this test is what keeps the copies one rule.
test("every remote → owner/repo parse in SKILL.md uses one expression", () => {
  const sites = [
    ...SKILL.matchAll(
      /(?:BB_PATH=\$\(printf '%s\\n' "\$REMOTE_URL"|repo_of\(\)\s+\{ printf '%s\\n' "\$\{1\}") \| (sed -E '[^']*')/g,
    ),
  ].map((m) => m[1]);
  assert.equal(
    sites.length,
    3,
    "Step 0, Step 0b repo_of and the rungs 3–4 block",
  );
  assert.equal(
    new Set(sites).size,
    1,
    `one expression, not ${new Set(sites).size}: ${[...new Set(sites)].join(" | ")}`,
  );
  assert.doesNotMatch(
    SKILL,
    /bitbucket\\\.org\[:\/\]\|\|/,
    "the old host-anchored parse is gone",
  );
});

for (const shell of SHELLS) {
  test(`remote → owner/repo (${shell}): every remote shape reads as owner/repo (CR3-1, CR3-4)`, () => {
    const expr = SKILL.match(
      /repo_of\(\)\s+\{ printf '%s\\n' "\$\{1\}" \| (sed -E '[^']*')/,
    )[1];
    for (const [remote, want] of [
      ["ssh://git@altssh.bitbucket.org:443/ws/repo.git", "ws/repo"],
      ["git@bitbucket.org:ws/repo.git", "ws/repo"],
      ["https://user@bitbucket.org/ws/repo.git", "ws/repo"],
      ["https://github.com/O/R.git/", "O/R"],
      ["https://github.com/o/r", "o/r"],
      ["git@github-work:o/r.git", "o/r"],
      ["ssh://git@ssh.github.com:443/o/r.git", "o/r"],
    ]) {
      const r = runScript(shell, `printf '%s\\n' "$R" | ${expr}`, {
        env: { ...process.env, R: remote },
      });
      assert.equal(r.stdout.trim(), want, `${remote} → ${r.stdout.trim()}`);
    }
  });

  test(`Step 0b (${shell}): a PR URL with .git or a trailing slash in its repo matches its own remote (CR3-4)`, () => {
    const r = step0b(shell, {
      TARGET: "https://github.com/O/R.git/pull/1",
      REMOTE_URL: "https://github.com/o/r.git/",
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /BOUND kind=pr pr=1 /);
  });

  test(`Step 0b (${shell}): an export-form or CRLF .env is read like the resolver reads it (CR3-3)`, () => {
    for (const body of [
      "export JIRA_URL=https://acme.atlassian.net\n",
      "JIRA_URL=old\r\nJIRA_URL='https://acme.atlassian.net'\r\n",
    ]) {
      const { dir, bin } = consumerRepo("git@github.com:o/r.git");
      fs.writeFileSync(path.join(dir, ".env"), body);
      const r = runScript(shell, step0bBlock(), {
        cwd: dir,
        env: blockEnv(bin, {
          TARGET: "https://acme.atlassian.net/browse/RAPP-702",
        }),
      });
      assert.equal(r.status, 0, r.stderr);
      assert.doesNotMatch(
        r.stdout,
        /⚠️/,
        `${JSON.stringify(body)}: the matching host neither "differs" nor "not set"`,
      );
    }
  });

  test(`Step 0b (${shell}): the issue arm says when it could not compare (CR3-5)`, () => {
    let r = step0b(shell, {
      TARGET: "https://github.com/o/r/issues/3",
      REMOTE_URL: "git@github-work:o/r.git",
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /⚠️ remote host github-work is not github\.com .* issue URL host github\.com not compared/,
    );
    r = step0b(shell, { TARGET: "https://github.com/o/r/issues/3" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /⚠️ no origin remote — issue URL host and repo not checked/,
    );
  });

  test(`§0a lookup (${shell}): an unnumbered legacy artifact carrying the key is still excluded (CR3-2)`, () => {
    const dir = lookupFixture();
    for (const name of [
      "task.101.review.2026-05-06.md",
      "task.101.thing.review.2026-05-06.md",
      "task.101.review.thing.md",
      "task.101.dod.security.by-hand-probe.md",
    ]) {
      fs.writeFileSync(
        path.join(dir, "docs/tasks/task.101.thing", name),
        "---\njira_key: 'RAPP-702'\n---\n",
      );
    }
    const r = runScript(
      shell,
      `${lookupBlock()}\necho "STATUS=$DOC_STATUS PATH=$LOCAL_PATH"\n`,
      {
        cwd: dir,
        env: { ...process.env, KEY_FIELD: "jira_key", KEY_VALUE: "RAPP-702" },
      },
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /^STATUS=found PATH=docs\/tasks\/task\.101\.thing\/task\.101\.thing\.md$/m,
    );
  });
}

test("Step 2's exclusion filter cites the §0a rule instead of restating it (CR3-7)", () => {
  const step2 = section("### Step 2 — Resolve the work item", "### Step 3 —");
  const filter = step2.slice(step2.indexOf("**Exclusion filter**"));
  assert.match(
    filter,
    /The rule is stated once, in\s+\[§0a Key → document lookup\]\(references\/develop-pipeline-step-0-resolve-and-prepare\.md#key--document-lookup\)/,
  );
  assert.match(
    filter,
    /named after its own directory \(`\{stem\}\/\{stem\}\.md`\)/,
  );
});

// ---------------------------------------------------------------------------
// task.176 finalise — the parser is a boundary (it refuses malformed input), so the security
// probe engine must be able to EXECUTE it. A script whose one argument is a string fits no
// engine entry form (`shell:` passes a fixture directory), and the DoD security agent recorded
// probes_executed: 0. Sourced, the script defines `parse_target`; the engine's `shell-fn:` form
// calls it with each case as argv, under bash and zsh. These cases are the parser's own contract.
// ---------------------------------------------------------------------------
const PROBE_ENGINE = path.join(
  ROOT,
  "..",
  "..",
  "shared",
  "resources",
  "security-probe.mjs",
);
const kv = (o) =>
  Object.entries(o)
    .map(([k, v]) => `${k}=${v}\n`)
    .join("");
const PARSER_PROBE_CASES = [
  // hostile — refused, or carried as inert text that never runs
  [
    "pt.cmd-subst",
    "$(touch PWNED)",
    "hostile",
    {
      stdout: kv({ kind: "branch", branch: "$(touch PWNED)" }),
      exit: 0,
      absent: ["PWNED"],
    },
  ],
  [
    "pt.backtick",
    "`touch PWNED2`",
    "hostile",
    {
      stdout: kv({ kind: "branch", branch: "`touch PWNED2`" }),
      exit: 0,
      absent: ["PWNED2"],
    },
  ],
  [
    "pt.semicolon",
    "a;touch PWNED3",
    "hostile",
    {
      stdout: kv({ kind: "branch", branch: "a;touch PWNED3" }),
      exit: 0,
      absent: ["PWNED3"],
    },
  ],
  ["pt.newline-forge", "RAPP-1\nkind=pr", "hostile", { stdout: "", exit: 2 }],
  ["pt.cr-forge", "x\rpr=5", "hostile", { stdout: "", exit: 2 }],
  ["pt.tab", "feature/a\tb", "hostile", { stdout: "", exit: 2 }],
  ["pt.issue-ref-tail", "#12;rm", "hostile", { stdout: "", exit: 2 }],
  [
    "pt.url-no-target",
    "https://example.com/foo",
    "hostile",
    { stdout: "", exit: 2 },
  ],
  [
    "pt.pr-url-subst",
    "https://github.com/o/r/pull/12$(id)",
    "hostile",
    { stdout: "", exit: 2 },
  ],
  // The parser REPORTS a foreign or lookalike host rather than judging it; Step 0b halts on it.
  [
    "pt.lookalike-host",
    "https://github.com.evil.com/o/r/pull/3",
    "hostile",
    {
      stdout: kv({
        kind: "pr",
        pr: "3",
        host: "github.com.evil.com",
        repo: "o/r",
      }),
      exit: 0,
    },
  ],
  // legitimate — every accepted form still parses
  [
    "pt.legit-github-pr",
    "https://github.com/o/r/pull/12",
    "legitimate",
    {
      stdout: kv({ kind: "pr", pr: "12", host: "github.com", repo: "o/r" }),
      exit: 0,
    },
  ],
  [
    "pt.legit-bitbucket-pr",
    "https://bitbucket.org/ws/repo/pull-requests/7",
    "legitimate",
    {
      stdout: kv({
        kind: "pr",
        pr: "7",
        host: "bitbucket.org",
        repo: "ws/repo",
      }),
      exit: 0,
    },
  ],
  [
    "pt.legit-jira-browse",
    "https://acme.atlassian.net/browse/RAPP-702",
    "legitimate",
    {
      stdout: kv({
        kind: "jira",
        jira_key: "RAPP-702",
        host: "acme.atlassian.net",
      }),
      exit: 0,
    },
  ],
  [
    "pt.legit-issue-ref",
    "#536",
    "legitimate",
    { stdout: kv({ kind: "github-issue", issue_num: "536" }), exit: 0 },
  ],
  [
    "pt.legit-number",
    "281",
    "legitimate",
    { stdout: kv({ kind: "pr", pr: "281" }), exit: 0 },
  ],
  [
    "pt.legit-branch",
    "feature/task.1.thing",
    "legitimate",
    { stdout: kv({ kind: "branch", branch: "feature/task.1.thing" }), exit: 0 },
  ],
].map(([id, input, direction, expected]) => ({
  id,
  input,
  direction,
  why: "parse-target.sh contract",
  expected,
}));

test("the parser is reachable by the security probe engine and its boundary holds (shell-fn:)", () => {
  assert.ok(fs.existsSync(PROBE_ENGINE), "security-probe.mjs present");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-pr-probe-"));
  const casesFile = path.join(dir, "parse-target.cases.json");
  fs.writeFileSync(casesFile, JSON.stringify(PARSER_PROBE_CASES, null, 2));
  const repoRoot = path.join(ROOT, "..", "..");
  const r = spawnSync(
    process.execPath,
    [
      PROBE_ENGINE,
      "--sink",
      "filename",
      "--entry",
      "shell-fn:skills/review-pr/scripts/parse-target.sh#parse_target",
      "--cases-file",
      casesFile,
      "--repo-root",
      repoRoot,
      "--record",
      path.join(dir, "run.json"),
      "--json",
    ],
    { encoding: "utf8", cwd: repoRoot },
  );
  const out = JSON.parse(r.stdout);
  assert.equal(
    out.verdict,
    "engages",
    `verdict ${out.verdict}: ${out.reason} ${JSON.stringify(out.declined)}`,
  );
  assert.equal(
    out.executed,
    PARSER_PROBE_CASES.length * out.shells.length,
    "every case ran in every shell",
  );
  assert.deepEqual(out.reproduced, [], "no hostile case accepted");
  assert.deepEqual(out.overblocked, [], "no legitimate form refused");
});
