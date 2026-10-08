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

import { extractBlocks } from "../qa-execute-snippets.mjs";
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
const CONTRACT = readFileSync(
  join(REPO_ROOT, "shared/resources/develop-pipeline-resume-contract.md"),
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
const IMPL_PATH = "docs/tasks/task.9.x/task.9.implementation.1.x.md";
const entry = (id, ref) =>
  `  - id: ${id}\n    category: trail\n    severity: low\n    confidence: high\n    ref: ${ref}\n    anchor_check: ok\n    finding: "x"\n    suggested_action: "y"\n`;
const reviewBody = (entries) =>
  "# PR Review\n\n## Machine-Readable Findings\n\n```yaml\nreviewed_gate: task.9.gate.1.x.yml\nfindings:\n" +
  entries +
  "truncated_count: 0\n```\n";
const REVIEW_BODY = reviewBody(
  [
    entry("PC-1", '"docs/tasks/task.9.x/task.9.x.md:12"'),
    entry("CR-1", '"skills/x/SKILL.md:40"'),
    entry("PC-2", '"AC-2"'),
    entry("PC-3", `"${IMPL_PATH}:3"`),
    entry("PC-4", '"docs/tasks/task.9.x/task.9.dirty.md:1"'),
    entry("PC-5", '"docs/tasks/task.9.x/task.9.untracked.md"'),
    entry("PC-6", '"docs/tasks/task.9.x/task.9.notes.md:1"'),
  ].join(""),
);

const subst = (block) =>
  block
    .replaceAll("{develop-story|develop-task}", "develop-task")
    .replace(/^PR_REVIEW="\{[^\n]*"$/m, `PR_REVIEW="${REVIEW_PATH}"`);
const CARRY = "#### Carry the review into the acceptance commit";
const classifyBlock = () => subst(fenceAfter(QA_LOOP, CARRY, 0));
const stageBlock = (paths) =>
  subst(fenceAfter(QA_LOOP, CARRY, 1)).replace(
    /^CARRY_FIXED=\("\{[^\n]*\}"\)$/m,
    `CARRY_FIXED=(${paths.map((p) => `"${p}"`).join(" ")})`,
  );

/** The repo state at 5c: the last QA push, plus the run's uncommitted bookkeeping. */
function fiveCRepo() {
  const repo = scratchRepo();
  const { g, write } = repo;
  write("docs/tasks/task.9.x/task.9.x.md", "# Task 9\n\nOld text.\n");
  write("docs/tasks/task.9.x/task.9.notes.md", "# Notes\n");
  write("docs/tasks/task.9.x/task.9.dirty.md", "# Dirty\n");
  write(IMPL_PATH, "# Report\n");
  write("skills/x/SKILL.md", "# Skill\n\noriginal\n");
  g("add", "-A");
  g("commit", "-q", "-m", "last QA push");
  // Uncommitted by design at 5c: the implementation report's QA Cycle entries, and other work.
  write(IMPL_PATH, "# Report\n\n### QA Cycle 1\nentries Step 8 will commit\n");
  write(
    "docs/tasks/task.9.x/task.9.dirty.md",
    "# Dirty\n\nsomeone's unsaved work\n",
  );
  write("docs/tasks/task.9.x/task.9.untracked.md", "# New\n");
  // /review-pr wrote and staged its report.
  write(REVIEW_PATH, REVIEW_BODY);
  g("add", "--", REVIEW_PATH);
  return { ...repo, qaHead: g("rev-parse", "HEAD") };
}

for (const shell of SHELLS) {
  test(`[${shell}] 5c classify: doc-only needs the patterns AND a tracked, clean file that is neither Step 8's report nor the review`, () => {
    const { root } = fiveCRepo();
    const r = run(shell, root, classifyBlock());
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.deepEqual(r.stdout.trim().split("\n"), [
      "doc-only PC-1 docs/tasks/task.9.x/task.9.x.md",
      'record CR-1 "skills/x/SKILL.md:40"',
      'record PC-2 "AC-2"',
      `record PC-3 ${IMPL_PATH} (the implementation report is Step 8's)`,
      "record PC-4 docs/tasks/task.9.x/task.9.dirty.md (untracked, or holds uncommitted work — not fixed at 5c)",
      "record PC-5 docs/tasks/task.9.x/task.9.untracked.md (untracked, or holds uncommitted work — not fixed at 5c)",
      "doc-only PC-6 docs/tasks/task.9.x/task.9.notes.md",
    ]);
    assert.equal(
      readFileSync(join(root, ".claude/state/5c-carry-eligible.txt"), "utf8"),
      `# review: ${REVIEW_PATH}\ndocs/tasks/task.9.x/task.9.x.md\ndocs/tasks/task.9.x/task.9.notes.md\n`,
    );
  });

  test(`[${shell}] 5c classify: an unreadable findings block HALTs; an empty one is a clean zero`, () => {
    for (const [body, ok] of [
      ["# PR Review\n\nno machine-readable section\n", false],
      [reviewBody("  - id: PC-1\n    category: trail\n"), false], // an entry with no ref:
      [reviewBody('  - category: trail\n    ref: "docs/a.md"\n'), false], // first key is not id:
      [reviewBody(""), true], // findings: [] in effect — nothing to classify
    ]) {
      const { root, write } = scratchRepo();
      write(REVIEW_PATH, body);
      const r = run(shell, root, classifyBlock());
      if (ok) {
        assert.equal(r.status, 0, r.stderr + r.stdout);
        assert.equal(r.stdout.trim(), "");
      } else {
        assert.equal(r.status, 1, `expected a HALT for: ${body}\n${r.stdout}`);
        assert.match(r.stdout, /HALT: cannot classify/);
      }
    }
  });

  test(`[${shell}] 5c carry: stages the report and a cleared doc fix, undoes a dead-link fix, and moves no HEAD`, () => {
    const { root, g, write, qaHead } = fiveCRepo();
    assert.equal(run(shell, root, classifyBlock()).status, 0);
    write("docs/tasks/task.9.x/task.9.x.md", "# Task 9\n\nFixed text.\n");
    write(
      "docs/tasks/task.9.x/task.9.notes.md",
      "# Notes\n\n[dead](missing-file.md)\n",
    );
    const block = stageBlock([
      "docs/tasks/task.9.x/task.9.x.md",
      "docs/tasks/task.9.x/task.9.notes.md",
    ]);
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
      [REVIEW_PATH, "docs/tasks/task.9.x/task.9.x.md"].sort().join("\n"),
    );
    assert.equal(
      g("status", "--porcelain", "--", "docs/tasks/task.9.x/task.9.notes.md"),
      "",
      "the dead-link fix is undone, not left dirty",
    );
    assert.match(
      r.stdout,
      /NOT CARRIED: docs\/tasks\/task\.9\.x\/task\.9\.notes\.md/,
    );
    assert.match(
      r.stdout,
      /^Carried to 6a: docs\/tasks\/task\.9\.x\/task\.9\.pr-review\.1\.x\.md docs\/tasks\/task\.9\.x\/task\.9\.x\.md$/m,
    );
    // Step 8's report was never touched: its uncommitted entries survive, unstaged.
    assert.match(
      readFileSync(join(root, IMPL_PATH), "utf8"),
      /entries Step 8 will commit/,
    );
    assert.equal(g("diff", "--cached", "--name-only", "--", IMPL_PATH), "");
  });

  test(`[${shell}] 5c carry: a path the classifier did not clear HALTs and is left exactly as it was (CR-1)`, () => {
    const { root, g, write, qaHead } = fiveCRepo();
    assert.equal(run(shell, root, classifyBlock()).status, 0);
    for (const p of [
      IMPL_PATH,
      "docs/tasks/task.9.x/task.9.dirty.md",
      "skills/x/SKILL.md",
    ]) {
      write(
        p,
        readFileSync(join(root, p), "utf8") +
          "\n[dead](nope.md) edited at 5c\n",
      );
      const before = readFileSync(join(root, p), "utf8");
      const r = run(shell, root, stageBlock([p]));
      assert.equal(r.status, 1, `${p}: ${r.stdout}`);
      assert.match(r.stdout, /was not cleared by the classify block/);
      assert.equal(
        readFileSync(join(root, p), "utf8"),
        before,
        `${p} must be untouched`,
      );
      assert.equal(
        g("diff", "--cached", "--name-only", "--", p),
        "",
        `${p} must not be staged`,
      );
    }
    assert.equal(g("rev-parse", "HEAD"), qaHead);
  });

  test(`[${shell}] 5c carry: an unsubstituted CARRY_FIXED HALTs before touching anything (CR-3)`, () => {
    const { root, g, qaHead } = fiveCRepo();
    const block = subst(fenceAfter(QA_LOOP, CARRY, 1));
    assert.match(
      block,
      /^CARRY_FIXED=\("\{/m,
      "the placeholder is still in the shipped block",
    );
    const r = run(shell, root, block);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /HALT: substitute PR_REVIEW and CARRY_FIXED/);
    assert.equal(g("rev-parse", "HEAD"), qaHead);
  });

  test(`[${shell}] 5c carry: a path listed twice gets one outcome (QA-2 CR-4)`, () => {
    const { root, g } = fiveCRepo();
    assert.equal(run(shell, root, classifyBlock()).status, 0);
    writeFileSync(
      join(root, "docs/tasks/task.9.x/task.9.notes.md"),
      "# Notes\n\n[dead](missing-file.md)\n",
    );
    const p = "docs/tasks/task.9.x/task.9.notes.md";
    const r = run(shell, root, stageBlock([p, p]));
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal((r.stdout.match(/NOT CARRIED: /g) || []).length, 1);
    assert.doesNotMatch(
      r.stdout.split("\n").find((l) => l.startsWith("Carried to 6a:")),
      /task\.9\.notes\.md/,
    );
    assert.equal(g("diff", "--cached", "--name-only", "--", p), "");
  });

  test(`[${shell}] 5c carry: an unsubstituted skill name HALTs before anything is undone (QA-2 CR-2)`, () => {
    const { root, g, qaHead } = fiveCRepo();
    assert.equal(run(shell, root, classifyBlock()).status, 0);
    const p = "docs/tasks/task.9.x/task.9.x.md";
    writeFileSync(join(root, p), "# Task 9\n\nFixed text.\n");
    const block = fenceAfter(QA_LOOP, CARRY, 1)
      .replace(/^PR_REVIEW="\{[^\n]*"$/m, `PR_REVIEW="${REVIEW_PATH}"`)
      .replace(/^CARRY_FIXED=\("\{[^\n]*\}"\)$/m, `CARRY_FIXED=("${p}")`);
    const r = run(shell, root, block);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /HALT: substitute the skill name in DOC_LINKS/);
    assert.equal(
      r.stderr,
      "",
      "no parse error: the guard HALTs on purpose (QA-3 CR-6)",
    );
    assert.match(
      readFileSync(join(root, p), "utf8"),
      /Fixed text/,
      "the fix survives",
    );
    assert.equal(g("rev-parse", "HEAD"), qaHead);
  });

  test(`[${shell}] 5c classify: re-running after the edits HALTs instead of dropping them (QA-2 CR-5)`, () => {
    const { root } = fiveCRepo();
    assert.equal(run(shell, root, classifyBlock()).status, 0);
    writeFileSync(
      join(root, "docs/tasks/task.9.x/task.9.x.md"),
      "# Task 9\n\nFixed text.\n",
    );
    const r = run(shell, root, classifyBlock());
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /already carries a 5c edit — run the stage block/);
    assert.match(
      readFileSync(join(root, ".claude/state/5c-carry-eligible.txt"), "utf8"),
      /task\.9\.x\.md/,
      "the eligible list survives",
    );
  });

  test(`[${shell}] 5c classify: a triple backtick inside a finding does not cut the block (QA-2 CR-6)`, () => {
    const { root, write } = scratchRepo();
    const tricky =
      '  - id: CR-1\n    ref: "skills/x/SKILL.md:4"\n    finding: "see ```bash fence"\n' +
      entry("CR-2", '"skills/y/SKILL.md:9"');
    write(REVIEW_PATH, reviewBody(tricky));
    const r = run(shell, root, classifyBlock());
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.deepEqual(r.stdout.trim().split("\n"), [
      'record CR-1 "skills/x/SKILL.md:4"',
      'record CR-2 "skills/y/SKILL.md:9"',
    ]);
  });

  /** The state a path-limited pause leaves between the stage block and 6a, ready for the probe. */
  function probeRepo() {
    const stub = mkdtempSync(join(tmpdir(), "carry-5c-gh-"));
    writeFileSync(
      join(stub, "gh"),
      "#!/bin/sh\necho 'no pull requests found for branch' >&2\nexit 1\n",
      { mode: 0o755 },
    );
    const repo = fiveCRepo();
    const { root, g, write } = repo;
    write(IMPL_PATH, "| Feature branch base | develop |\n");
    g("add", "--", IMPL_PATH);
    g("commit", "-q", "-m", "report", "--", IMPL_PATH);
    const remote = mkdtempSync(join(tmpdir(), "carry-5c-remote-"));
    spawnSync("git", ["init", "-q", "--bare", remote]);
    g("remote", "add", "origin", remote);
    g("push", "-q", "origin", "HEAD:develop");
    g("fetch", "-q", "origin");
    g(
      "restore",
      "--staged",
      "--worktree",
      "--source=HEAD",
      "--",
      "docs/tasks/task.9.x/task.9.dirty.md",
    );
    spawnSync("rm", [
      "-f",
      join(root, "docs/tasks/task.9.x/task.9.untracked.md"),
    ]);
    assert.equal(run(shell, root, classifyBlock()).status, 0);
    write("docs/tasks/task.9.x/task.9.x.md", "# Task 9\n\nFixed text.\n");
    assert.equal(
      run(shell, root, stageBlock(["docs/tasks/task.9.x/task.9.x.md"])).status,
      0,
    );
    const probe = extractBlocks(CONTRACT).find((b) =>
      /The base is RECORDED STATE/.test(b.code),
    ).code;
    const runProbe = () =>
      spawnSync(shell, ["-s", "--"], {
        input: probe.replaceAll("{implementation-report-path}", IMPL_PATH),
        encoding: "utf8",
        cwd: root,
        env: { PATH: `${stub}:${process.env.PATH}`, HOME: process.env.HOME },
      });
    return { ...repo, runProbe };
  }
  const SET = [REVIEW_PATH, "docs/tasks/task.9.x/task.9.x.md"]
    .sort()
    .join("\n");

  test(`[${shell}] resume probe: the staged 5c set is set aside, not HALTed on (QA-2 CR-1)`, () => {
    const { g, runProbe } = probeRepo();
    const r = runProbe();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /5c carried set kept staged for 6a/);
    assert.equal(
      g("diff", "--cached", "--name-only"),
      SET,
      "the carried set is still staged",
    );
  });

  test(`[${shell}] resume probe: other dirt, a carried path with an unstaged change, or a stale list still HALTs (QA-2 CR-1, QA-3 CR-1/CR-7)`, () => {
    for (const shape of [
      "other-dirt",
      "MM",
      "stale-header",
      "review-unstaged",
      "review-committed",
    ]) {
      const { root, g, write, runProbe } = probeRepo();
      if (shape === "other-dirt") {
        write("src/other.js", "x\n");
        g("add", "--", "src/other.js");
      }
      if (shape === "MM")
        write(
          "docs/tasks/task.9.x/task.9.x.md",
          "# Task 9\n\nFixed, then edited again.\n",
        );
      if (shape === "stale-header") {
        const eligible = join(root, ".claude/state/5c-carry-eligible.txt");
        writeFileSync(
          eligible,
          readFileSync(eligible, "utf8").replace(
            /^# review: .*$/m,
            "# review: docs/tasks/task.8.y/task.8.pr-review.1.y.md",
          ),
        );
      }
      if (shape === "review-unstaged")
        g("restore", "--staged", "--", REVIEW_PATH);
      // A list from an earlier pass whose review is already committed: stale, never current.
      if (shape === "review-committed")
        g("commit", "-q", "-m", "review", "--", REVIEW_PATH);
      const r = runProbe();
      assert.equal(r.status, 1, `${shape}: ${r.stdout}`);
      assert.match(r.stdout, /HALT: dirty tree on resume/, shape);
      // The HALT must list the path that is NOT carried — not only some other dirt (QA-4 CR-4).
      const halted = r.stdout.split("HALT:")[1];
      assert.match(
        halted,
        shape === "other-dirt"
          ? /src\/other\.js/
          : /docs\/tasks\/task\.9\.x\/task\.9\.x\.md/,
        `${shape}: the HALT names the uncarried path`,
      );
    }
  });

  test(`[${shell}] resume probe: an overlay beside the carried set is discarded and the set kept (QA-3 CR-7)`, () => {
    const { root, g, write, runProbe } = probeRepo();
    // HEAD moves past the base on one file; the working tree then holds the base's bytes for it.
    write("skills/x/SKILL.md", "# Skill\n\nchanged on the branch\n");
    g("commit", "-q", "-m", "branch change", "--", "skills/x/SKILL.md");
    write("skills/x/SKILL.md", "# Skill\n\noriginal\n");
    const r = runProbe();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /overlay discarded: 1 tracked/);
    assert.equal(
      g("diff", "--cached", "--name-only"),
      SET,
      "the carried set survives the discard",
    );
    assert.equal(g("status", "--porcelain", "--", "skills/x/SKILL.md"), "");
    assert.ok(root);
  });

  test(`[${shell}] 5c carry: a link check that cannot run HALTs with the edit kept and unstaged (QA-3 CR-2)`, () => {
    const { root, g, qaHead } = fiveCRepo();
    assert.equal(run(shell, root, classifyBlock()).status, 0);
    const p = "docs/tasks/task.9.x/task.9.x.md";
    writeFileSync(join(root, p), "# Task 9\n\nFixed text.\n");
    const r = spawnSync(shell, ["-s", "--"], {
      input: stageBlock([p]),
      encoding: "utf8",
      cwd: root,
      // An invalid NODE_OPTIONS makes node exit 9: the checker did not run.
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_OPTIONS: "--no-such-node-flag",
      },
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /the check did not run; the edit is kept, unstaged/);
    assert.match(readFileSync(join(root, p), "utf8"), /Fixed text/);
    assert.equal(
      g("diff", "--cached", "--name-only", "--", p),
      "",
      "not staged — a resume must not carry it",
    );
    assert.equal(g("rev-parse", "HEAD"), qaHead);
  });

  test(`[${shell}] 5c classify: a CRLF report and a four-backtick close both parse (QA-3 CR-5)`, () => {
    for (const body of [
      reviewBody(entry("CR-1", '"skills/x/SKILL.md:4"')).replace(/\n/g, "\r\n"),
      reviewBody(entry("CR-1", '"skills/x/SKILL.md:4"')).replace(
        /\n```\n$/,
        "\n````\n",
      ),
    ]) {
      const { root, write } = scratchRepo();
      write(REVIEW_PATH, body);
      const r = run(shell, root, classifyBlock());
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.equal(r.stdout.trim(), 'record CR-1 "skills/x/SKILL.md:4"');
    }
  });

  test(`[${shell}] 5c classify: a stale list from another pass is replaced, not obeyed (QA-4 CR-2)`, () => {
    const { root, write } = fiveCRepo();
    // Another pass's list: its review is not this one, and its listed path is dirty.
    write(
      ".claude/state/5c-carry-eligible.txt",
      "# review: docs/tasks/task.9.x/task.9.pr-review.0.old.md\ndocs/tasks/task.9.x/task.9.dirty.md\n",
    );
    const r = run(shell, root, classifyBlock());
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /replacing a stale eligible list/);
    assert.match(
      readFileSync(join(root, ".claude/state/5c-carry-eligible.txt"), "utf8"),
      new RegExp("^# review: " + REVIEW_PATH.replace(/\./g, "\\.")),
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

  test(`[${shell}] 6a with an absolute or ./-prefixed document path: still no false suffix (CR-4)`, () => {
    for (const prefix of ["ABS", "./"]) {
      const { root, g } = sixAFixture();
      const dir =
        (prefix === "ABS" ? root + "/" : prefix) + "docs/tasks/task.9.x";
      const block = fenceAfter(FINALISE, "6a. **Acceptance commit + push.**", 0)
        .replace(/^STEM="\{[^\n]*$/m, 'STEM="task.9"')
        .replace(/^DOC_KIND="\{[^\n]*$/m, 'DOC_KIND="task"')
        .replaceAll("{document-directory}", dir)
        .replaceAll("{document-path}", dir + "/task.9.x.md");
      const r = run(shell, root, block);
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.equal(
        g("log", "-1", "--format=%s"),
        "docs(task.9): accept — DoD, sprint review",
        `${prefix}: nothing was carried, so no suffix`,
      );
    }
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
