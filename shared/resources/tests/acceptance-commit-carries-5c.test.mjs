/**
 * acceptance-commit-carries-5c — the 5c review rides /finalise 6a's acceptance commit (task.173).
 *
 * On APPROVE or CONCERNS, 5c stages the PR review report and any doc-only fixes and commits
 * nothing; 6a commits the whole index and says so in its message; and the two other commits that
 * can run before 6a (8a's fix commit, the PreCompact pause commit) are path-limited so the staged
 * set cannot land in them. The pause commit is pinned in develop-pipeline-on-precompact.test.sh
 * (scenario 17). This file pins the rest.
 *
 * Every block run here is EXTRACTED from the shipped Markdown, never restated, so the test runs
 * what the skill says. Each runs in its own scratch git repo shaped like a consumer
 * (`.agents/skills -> <repo>/skills`), under bash and, where installed, zsh.
 *
 * Run: node --test shared/resources/tests/acceptance-commit-carries-5c.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { makeConsumerRoot } from "../../../evals/shared/lib/consumer-root.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..", "..");
const QA_LOOP = readFileSync(
  join(REPO_ROOT, "shared/resources/develop-pipeline-step-5-6-qa-loop.md"),
  "utf8",
);
const FINALISE = readFileSync(
  join(REPO_ROOT, "skills/finalise/SKILL.md"),
  "utf8",
);
const RECHECK_CLI = join(
  REPO_ROOT,
  "shared/resources/finalise-fix-and-recheck.mjs",
);

const SHELLS = [
  "bash",
  ...(spawnSync("zsh", ["-c", "true"], { stdio: "ignore" }).status === 0
    ? ["zsh"]
    : []),
];

/** The `nth` ```bash fence after `needle`, dedented. */
function fenceAfter(text, needle, nth = 0) {
  let at = text.indexOf(needle);
  assert.ok(at > -1, `needle not found: ${needle}`);
  let start;
  for (let i = 0; i <= nth; i++) {
    start = text.indexOf("```bash\n", at);
    assert.ok(start > -1, `no bash fence #${i} after ${needle}`);
    at = start + 1;
  }
  const bodyStart = text.indexOf("\n", start) + 1;
  // The closing fence is a line of its own (CommonMark), not any "```" in the body.
  const close = /\n[ \t]*```[ \t]*(\n|$)/g;
  close.lastIndex = bodyStart - 1;
  const m = close.exec(text);
  assert.ok(m, `unterminated fence after ${needle}`);
  const body = text.slice(bodyStart, m.index + 1);
  const indent = Math.min(
    ...body
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => l.match(/^ */)[0].length),
  );
  return body
    .split("\n")
    .map((l) => l.slice(indent))
    .join("\n");
}

function scratchRepo() {
  const root = makeConsumerRoot(REPO_ROOT, "carry-5c-");
  const g = (...args) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };
  g("init", "-q", "-b", "feature/x");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "t");
  g("config", "commit.gpgsign", "false");
  writeFileSync(join(root, ".git", "info", "exclude"), ".agents\n.claude\n");
  const write = (rel, body) => {
    mkdirSync(join(root, dirname(rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  // This repository's own override, so the classification below is the one CI sees.
  write(
    "skills-config.yaml",
    'ci:\n  docsOnly:\n    patterns:\n      - "docs/**"\n',
  );
  return { root, g, write };
}

function run(shell, root, script) {
  return spawnSync(shell, ["-s", "--"], {
    input: script,
    encoding: "utf8",
    cwd: root,
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
  });
}

const REVIEW_PATH = "docs/tasks/task.9.x/task.9.pr-review.1.x.md";
const REVIEW_BODY = `# PR Review

## Machine-Readable Findings

\`\`\`yaml
reviewed_gate: task.9.gate.1.x.yml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.9.x/task.9.x.md:12"
    anchor_check: ok
    finding: "x"
    suggested_action: "y"
  - id: CR-1
    category: cleanup
    severity: low
    confidence: high
    ref: "skills/x/SKILL.md:40"
    anchor_check: ok
    finding: "x"
    suggested_action: "y"
  - id: PC-2
    category: coverage
    severity: low
    confidence: high
    ref: "AC-2"
    anchor_check: no-line
    finding: "x"
    suggested_action: "y"
truncated_count: 0
\`\`\`
`;

const subst = (block) =>
  block
    .replaceAll("{develop-story|develop-task}", "develop-task")
    .replace(/^PR_REVIEW="\{[^\n]*"$/m, `PR_REVIEW="${REVIEW_PATH}"`);

for (const shell of SHELLS) {
  test(`[${shell}] 5c classify: a finding is doc-only exactly when its ref path matches ci.docsOnly.patterns`, () => {
    const { root, write } = scratchRepo();
    write(REVIEW_PATH, REVIEW_BODY);
    const block = subst(
      fenceAfter(
        QA_LOOP,
        "#### Carry the review into the acceptance commit",
        0,
      ),
    );
    const r = run(shell, root, block);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.deepEqual(r.stdout.trim().split("\n"), [
      "doc-only PC-1 docs/tasks/task.9.x/task.9.x.md",
      'record CR-1 "skills/x/SKILL.md:40"',
      'record PC-2 "AC-2"',
    ]);
  });

  test(`[${shell}] 5c carry: stages the report and the doc fix, restores a non-doc fix, and moves no HEAD`, () => {
    const { root, g, write } = scratchRepo();
    write("docs/tasks/task.9.x/task.9.x.md", "# Task 9\n\nOld text.\n");
    write("docs/tasks/task.9.x/task.9.notes.md", "# Notes\n");
    write("skills/x/SKILL.md", "# Skill\n\noriginal\n");
    g("add", "-A");
    g("commit", "-q", "-m", "last QA push");
    const qaHead = g("rev-parse", "HEAD");
    // /review-pr wrote and staged its report; the orchestrator applied three fixes.
    write(REVIEW_PATH, REVIEW_BODY);
    g("add", "--", REVIEW_PATH);
    write("docs/tasks/task.9.x/task.9.x.md", "# Task 9\n\nFixed text.\n");
    write(
      "docs/tasks/task.9.x/task.9.notes.md",
      "# Notes\n\n[dead](missing-file.md)\n",
    );
    write("skills/x/SKILL.md", "# Skill\n\nedited at 5c\n");
    const block = subst(
      fenceAfter(
        QA_LOOP,
        "#### Carry the review into the acceptance commit",
        1,
      ),
    ).replace(
      /^CARRY_FIXED=\(\{[^\n]*\}\)$/m,
      'CARRY_FIXED=("docs/tasks/task.9.x/task.9.x.md" "docs/tasks/task.9.x/task.9.notes.md" "skills/x/SKILL.md")',
    );
    assert.doesNotMatch(
      block,
      /git (commit|push)/,
      "the carry block must not commit or push",
    );
    const r = run(shell, root, block);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(
      g("rev-parse", "HEAD"),
      qaHead,
      "zero commits between the QA head and 6a",
    );
    assert.equal(
      g("diff", "--cached", "--name-only"),
      [
        "docs/tasks/task.9.x/task.9.pr-review.1.x.md",
        "docs/tasks/task.9.x/task.9.x.md",
      ].join("\n"),
    );
    assert.equal(
      g(
        "status",
        "--porcelain",
        "--",
        "skills/x/SKILL.md",
        "docs/tasks/task.9.x/task.9.notes.md",
      ),
      "",
      "the non-doc fix and the dead-link fix are restored, not left dirty",
    );
    assert.match(r.stdout, /NOT CARRIED: skills\/x\/SKILL\.md/);
    assert.match(
      r.stdout,
      /NOT CARRIED: docs\/tasks\/task\.9\.x\/task\.9\.notes\.md/,
    );
    assert.match(
      r.stdout,
      /^Carried to 6a: docs\/tasks\/task\.9\.x\/task\.9\.pr-review\.1\.x\.md docs\/tasks\/task\.9\.x\/task\.9\.x\.md$/m,
    );
  });

  // ── /finalise 6a ────────────────────────────────────────────────────────────
  const sixA = () =>
    fenceAfter(FINALISE, "6a. **Acceptance commit + push.**", 0)
      .replace(/^STEM="\{[^\n]*$/m, 'STEM="task.9"')
      .replace(/^DOC_KIND="\{[^\n]*$/m, 'DOC_KIND="task"')
      .replaceAll("{document-directory}", "docs/tasks/task.9.x")
      .replaceAll("{document-path}", "docs/tasks/task.9.x/task.9.x.md");

  function sixAFixture() {
    const { root, g, write } = scratchRepo();
    const remote = mkdtempSync(join(tmpdir(), "carry-5c-remote-"));
    spawnSync("git", ["init", "-q", "--bare", remote]);
    g("remote", "add", "origin", remote);
    write("docs/tasks/task.9.x/task.9.x.md", "status: in-progress\n");
    g("add", "-A");
    g("commit", "-q", "-m", "base");
    // What /finalise actions 1–6 wrote.
    write("docs/tasks/task.9.x/task.9.x.md", "status: accepted\n");
    write("docs/tasks/task.9.x/task.9.dod.1.x.md", "# DoD\n");
    write("docs/tasks/task.9.x/sprint-review-summary.md", "# Sprint review\n");
    return { root, g, write };
  }

  test(`[${shell}] 6a carries the 5c set in the acceptance commit and says so; the tree is clean after`, () => {
    const { root, g, write } = sixAFixture();
    write(REVIEW_PATH, REVIEW_BODY);
    write("docs/tasks/task.9.x/task.9.notes.md", "# Notes, fixed at 5c\n");
    g("add", "--", REVIEW_PATH, "docs/tasks/task.9.x/task.9.notes.md");
    const r = run(shell, root, sixA());
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(
      g("rev-list", "--count", "HEAD"),
      "2",
      "one acceptance commit on the base",
    );
    assert.equal(
      g("log", "-1", "--format=%s"),
      "docs(task.9): accept — DoD, sprint review; 5c review carried",
    );
    assert.deepEqual(
      g("show", "--name-only", "--format=", "HEAD").split("\n").sort(),
      [
        "docs/tasks/task.9.x/sprint-review-summary.md",
        "docs/tasks/task.9.x/task.9.dod.1.x.md",
        "docs/tasks/task.9.x/task.9.notes.md",
        "docs/tasks/task.9.x/task.9.pr-review.1.x.md",
        "docs/tasks/task.9.x/task.9.x.md",
      ],
    );
    assert.equal(
      g("status", "--porcelain", "--untracked-files=no"),
      "",
      "nothing left dirty for the step-7 boundary check",
    );
  });

  test(`[${shell}] 6a with nothing carried: no suffix, and only the acceptance artefacts`, () => {
    const { root, g } = sixAFixture();
    const r = run(shell, root, sixA());
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(
      g("log", "-1", "--format=%s"),
      "docs(task.9): accept — DoD, sprint review",
    );
    assert.deepEqual(
      g("show", "--name-only", "--format=", "HEAD").split("\n").sort(),
      [
        "docs/tasks/task.9.x/sprint-review-summary.md",
        "docs/tasks/task.9.x/task.9.dod.1.x.md",
        "docs/tasks/task.9.x/task.9.x.md",
      ],
    );
  });

  // ── /finalise 8a ────────────────────────────────────────────────────────────
  test(`[${shell}] 8a commits only \`touched\`, leaves the 5c set staged, and --git-base licenses the push`, () => {
    const { root, g, write } = scratchRepo();
    write("a.sh", "one\n");
    write("b.js", "one\n");
    g("add", "-A");
    g("commit", "-q", "-m", "base");
    const base = g("rev-parse", "HEAD");
    // 5c's carried set, staged before /finalise ran.
    write(REVIEW_PATH, REVIEW_BODY);
    g("add", "--", REVIEW_PATH);
    // The fix, and the finding record that names it.
    write("a.sh", "two\n");
    write(
      ".claude/state/mutation-proof.log",
      "test at b.js:1\n✖ reverted fix goes red\nℹ fail 1\n",
    );
    write(
      ".claude/state/finalise-fix-finding.json",
      JSON.stringify({
        severity: "low",
        commits: 1,
        touched: ["a.sh"],
        filesSummary: ["a.sh", "b.js"],
        mutationProof: {
          test: "b.js",
          redOnRevert: true,
          run: ".claude/state/mutation-proof.log",
        },
        otherFindingsOpen: [],
      }),
    );
    const block = fenceAfter(FINALISE, "path-limited to `touched`", 0)
      .replace(/^STEM="\{[^\n]*$/m, 'STEM="task.9"')
      .replace(/^MSG_TAIL="\{[^\n]*$/m, 'MSG_TAIL="Tests — a.sh off by one"');
    const r = run(shell, root, block);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(
      g("show", "--name-only", "--format=", "HEAD"),
      "a.sh",
      "the fix commit carries only touched",
    );
    assert.equal(
      g("log", "-1", "--format=%s"),
      "fix(task.9): finalise DoD Tests — a.sh off by one",
    );
    assert.equal(
      g("status", "--porcelain", "--", REVIEW_PATH),
      `A  ${REVIEW_PATH}`,
      "the 5c set is still staged for 6a",
    );
    const recheck = spawnSync(
      process.execPath,
      [
        RECHECK_CLI,
        "--finding",
        ".claude/state/finalise-fix-finding.json",
        "--git-base",
        base,
        "--json",
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(recheck.status, 0, recheck.stdout + recheck.stderr);
  });
}
