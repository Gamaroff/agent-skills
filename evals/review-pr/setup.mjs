"use strict";
/**
 * Shared setup hook for the review-pr scenarios (runner.mjs `setup`).
 *
 * Builds, inside the runner's sandbox, everything /review-pr reaches for:
 *   - a local bare origin at .eval/origin.git and a working clone at the sandbox root, with
 *     `develop` and the scenario's PR branch pushed — so `git fetch origin` and
 *     `git diff origin/develop...origin/<branch>` work with no network;
 *   - the work item task.901 (a number no real task can collide with) and its complete trail;
 *   - the skill at .agents/skills/review-pr — the path its snippets address. The claude-cli
 *     driver installs the .claude/skills copy it needs for discovery (scenario.skill);
 *   - a fake `gh` (evals/shared/lib/fake-gh.mjs) serving the PR from fixtures derived from the
 *     same git diff, so the fake and the git path agree byte for byte.
 *
 * Variations come from scenario.json `fixture`:
 *   variant          "happy" (default) | "planted-bug" | "unanchored"
 *   existingReports  { "<n>": "<content>" } — prior .pr-review.{n}. reports in the task dir
 *
 * Returned env: the fake gh's bin dir (prefixed onto PATH by the runner), an EMPTY GH_CONFIG_DIR
 * so a real `gh` reached by absolute path is unauthenticated, blank GH/GitHub tokens, and blank
 * platform variables so a developer's JIRA_URL cannot turn this into a Jira repository.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createSandbox } from "../shared/lib/git-sandbox.mjs";
import { installFakeGh } from "../shared/lib/fake-gh.mjs";

const OWNER = "eval";
const REPO = "widgets";
const TASK = "task.901.widget-age-gate";
const TASK_DIR = `docs/tasks/${TASK}`;

const CORRECT_IMPL = `"use strict";
// Age gate for the widget sign-up form. The caller passes a whole number of years;
// anything else is a programming error, not a minor.
function isAdult(age) {
  if (!Number.isInteger(age) || age < 0) {
    throw new TypeError("age must be a non-negative integer, got " + String(age));
  }
  return age >= 18;
}
module.exports = { isAdult };
`;
const CORRECT_TEST = `"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { isAdult } = require("./age.js");

test("17 is not an adult", () => assert.equal(isAdult(17), false));
test("18 is an adult", () => assert.equal(isAdult(18), true));
test("30 is an adult", () => assert.equal(isAdult(30), true));
test("a non-integer age throws", () => {
  for (const bad of [undefined, null, NaN, "18", 17.5, -1]) {
    assert.throws(() => isAdult(bad), TypeError);
  }
});
`;
// The planted bug: "18 and over" implemented as > 18, and no test at the boundary.
const BUGGY_IMPL = CORRECT_IMPL.replace("age >= 18", "age > 18");
const BUGGY_TEST = `"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { isAdult } = require("./age.js");

test("17 is not an adult", () => assert.equal(isAdult(17), false));
test("30 is an adult", () => assert.equal(isAdult(30), true));
test("a non-integer age throws", () => {
  for (const bad of [undefined, null, NaN, "18", 17.5, -1]) {
    assert.throws(() => isAdult(bad), TypeError);
  }
});
`;

const BASE_FILES = {
  "README.md": "# widgets\n\nSign-up widgets.\n",
  "package.json":
    JSON.stringify(
      {
        name: "widgets",
        version: "1.0.0",
        scripts: { test: "node --test src/*.test.js" },
      },
      null,
      2,
    ) + "\n",
  "skills-config.yaml": "tracker: github\nvcs: github\n",
  "src/index.js": '"use strict";\nmodule.exports = {};\n',
};

function taskDoc() {
  return `---
id: task.901
title: "[Task 901] Widget age gate"
type: task
description: "Add an isAdult(age) helper that the sign-up widget uses to gate adult-only features."
tags: [widgets, validation]
status: accepted
priority: Medium
created: 2026-10-01
updated: 2026-10-03
github_issue: 9010
pr_number: 901
---

# Technical Task: Widget age gate

**Status:** Accepted

**GitHub Issue**: [#9010](https://github.com/${OWNER}/${REPO}/issues/9010)

## 1. Overview

The sign-up widget needs one rule for who counts as an adult. Add \`isAdult(age)\` to \`src/age.js\`.

## 2. Motivation

Adult-only features are gated ad hoc today. One helper gives one rule.

## 3. Technical Background

New module \`src/age.js\`, CommonJS, tested with \`node --test\` (\`npm test\` runs \`src/*.test.js\`).
Callers pass a whole number of years; anything else throws a \`TypeError\` rather than reading as a minor.

## 4. Scope

In scope: the helper and its unit tests. Out of scope: wiring it into the widget.

## 5. Breaking Changes

None — a new module.

## 6. Implementation Plan

### Phase 1: helper and tests

- [x] Add \`src/age.js\` exporting \`isAdult(age)\`.
- [x] Add \`src/age.test.js\`.

## 7. Files Summary

1. \`src/age.js\` — new
2. \`src/age.test.js\` — new

## 8. Testing Strategy

Unit tests in \`src/age.test.js\`, run by \`npm test\`.

## 9. Success Criteria

- [x] AC-1: \`isAdult(age)\` returns true for 18 and over, and false under 18.
- [x] AC-2: \`isAdult\` is exported from \`src/age.js\`.
- [x] AC-3: A unit test covers the boundary (17 and 18) and a typical adult age.
- [x] AC-4: A non-integer or negative age throws a \`TypeError\`, with a test.

## 10. Risk Assessment

Low — a pure function with no callers yet.

## 11. Rollback Plan

Revert the merge commit.

## Change Log

<!-- change-log-start -->
| Date       | Version | Description                              | Author      |
| ---------- | ------- | ---------------------------------------- | ----------- |
| 2026-10-01 | 1.0     | Initial draft                            | create-task |
| 2026-10-01 | 1.1     | Review passed (9/10) — ready to build    | review-task |
| 2026-10-02 |         | Implemented — 2 files, 4 tests           | develop     |
| 2026-10-03 | 1.2     | DoD complete — accepted                  | finalise    |
<!-- change-log-end -->
`;
}

function trail(branch) {
  const prUrl = `https://github.com/${OWNER}/${REPO}/pull/901`;
  return {
    [`${TASK_DIR}/task.901.review.1.widget-age-gate.md`]: `# Task Review Report: Task 901 - Widget age gate

**Reviewed:** 2026-10-01
**Recommendation:** READY TO IMPLEMENT
**Implementation Readiness:** 9/10

No critical or important issues. The four success criteria are testable as written.
`,
    [`${TASK_DIR}/task.901.implementation.1.widget-age-gate-initial-run.md`]: `# Implementation Report: Widget age gate

**Task**: \`${TASK}.md\`
**Run Number**: 1
**Status**: Completed

## Pipeline Progress

| Step | Status | Notes |
| --- | --- | --- |
| 1. create-branch | ✅ Done | \`${branch}\` |
| 2. review-task | ✅ Done | READY TO IMPLEMENT 9/10 |
| 3. develop | ✅ Done | 2 files, 4 tests |
| 4. create-pr | ✅ Done | ${prUrl} |
| 5–6. qa-task / qa-fix loop | ✅ Done | gate PASS, cycle 1; PR Review APPROVE |
| 7. finalise | ✅ Done | DoD complete |
| 8. commit-changes | ✅ Done | pushed |

## Completion

**Final Status**: Completed
**PR**: ${prUrl}
**QA Iterations**: 1
`,
    [`${TASK_DIR}/task.901.qa.1.widget-age-gate.md`]: `# QA Report: Task 901 - Widget age gate

**QA Date:** 2026-10-02
**Gate:** PASS

All four success criteria verified. \`npm test\` passes: 4 tests (17, 18, 30, and the non-integer cases).
`,
    [`${TASK_DIR}/task.901.gate.1.widget-age-gate.yml`]: `schema: 1
task: task.901
gate: PASS
quality_score: 95
pr: ${prUrl}
top_issues: []
waiver:
  active: false
`,
    [`${TASK_DIR}/task.901.dod.1.widget-age-gate.md`]: `# Definition of Done: Task 901 - Widget age gate

**Result:** ✅ COMPLETE
**Date:** 2026-10-03

- Success criteria: 4/4 met, each held by a test in \`src/age.test.js\`.
- Tests: \`npm test\` — 4 pass.
- Documentation: none required.
`,
    [`${TASK_DIR}/sprint-review-summary.md`]: `# Sprint Review Summary — Task 901

Widget age gate: \`isAdult(age)\` added with boundary tests. Accepted 2026-10-03.
`,
  };
}

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}

function copySkill(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === "tests") continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copySkill(s, d);
    else fs.copyFileSync(s, d);
  }
}

export async function setup({ sandbox, repoRoot, scenario }) {
  const fx = scenario.fixture || {};
  const variant = fx.variant || "happy";
  const unanchored = variant === "unanchored";
  const branch = unanchored ? "chore/tidy" : `feature/${TASK}`;
  const prNumber = unanchored ? 902 : 901;

  // 1. Working repo first (its `git add .` must not see .eval/), then the origin beside it.
  //    Local config pins what a developer's global config could change: signing, hooks.
  const sb = await createSandbox({ dir: sandbox, branch: "develop" });
  git(sandbox, "config", "commit.gpgsign", "false");
  git(sandbox, "config", "core.hooksPath", "/dev/null");
  fs.appendFileSync(
    path.join(sandbox, ".git", "info", "exclude"),
    "\n.eval/\n.agents/\n.claude/\n",
  );
  writeFiles(sandbox, BASE_FILES);
  await sb.commit("chore: initial widgets repo");
  const origin = path.join(sandbox, ".eval", "origin.git");
  fs.mkdirSync(origin, { recursive: true });
  git(origin, "init", "-q", "--bare", "-b", "develop");
  git(sandbox, "remote", "add", "origin", origin);

  // 2. The base. An unanchored scenario still has a merged work item on develop, so docs/
  //    exists and the resolver's "no document" answer is a real answer, not an empty tree.
  if (unanchored) {
    writeFiles(sandbox, {
      "src/age.js": CORRECT_IMPL,
      "src/age.test.js": CORRECT_TEST,
      [`${TASK_DIR}/${TASK}.md`]: taskDoc(),
      ...trail(`feature/${TASK}`),
    });
    await sb.commit("feat(task.901): widget age gate (#901)");
  }
  git(sandbox, "push", "-q", "origin", "develop");

  // 3. The PR branch.
  git(sandbox, "checkout", "-q", "-b", branch);
  if (unanchored) {
    writeFiles(sandbox, {
      "README.md": "# widgets\n\nSign-up widgets for the onboarding flow.\n",
    });
    await sb.commit("chore: tidy the README");
  } else {
    const buggy = variant === "planted-bug";
    writeFiles(sandbox, {
      "src/age.js": buggy ? BUGGY_IMPL : CORRECT_IMPL,
      "src/age.test.js": buggy ? BUGGY_TEST : CORRECT_TEST,
    });
    await sb.commit("feat(task.901): add isAdult with tests");
    writeFiles(sandbox, {
      [`${TASK_DIR}/${TASK}.md`]: taskDoc(),
      ...trail(branch),
    });
    await sb.commit("docs(task.901): task, trail and DoD");
  }
  for (const [n, content] of Object.entries(fx.existingReports || {})) {
    writeFiles(sandbox, {
      [`${TASK_DIR}/task.901.pr-review.${n}.widget-age-gate.md`]: content,
    });
  }
  if (fx.existingReports) await sb.commit("docs(task.901): earlier PR reviews");
  git(sandbox, "push", "-q", "-u", "origin", branch);

  // 4. Fixtures from the same diff git produces.
  const diff = git(sandbox, "diff", `origin/develop...origin/${branch}`) + "\n";
  fs.writeFileSync(path.join(sandbox, ".eval", `pr-${prNumber}.diff`), diff);
  const files = git(
    sandbox,
    "diff",
    "--numstat",
    `origin/develop...origin/${branch}`,
  )
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [additions, deletions, p] = l.split("\t");
      return {
        path: p,
        additions: Number(additions),
        deletions: Number(deletions),
      };
    });
  const pr = {
    number: prNumber,
    url: `https://github.com/${OWNER}/${REPO}/pull/${prNumber}`,
    title: unanchored ? "chore: tidy the README" : "[Task 901] Widget age gate",
    body: unanchored
      ? "Tidies the README wording."
      : `Adds \`isAdult(age)\` with unit tests.\n\nCloses #9010\n\nTask: \`${TASK_DIR}/${TASK}.md\``,
    state: "OPEN",
    isDraft: false,
    headRefName: branch,
    baseRefName: "develop",
    author: { login: "dev" },
    additions: files.reduce((a, f) => a + f.additions, 0),
    deletions: files.reduce((a, f) => a + f.deletions, 0),
    changedFiles: files.length,
    files,
    reviewDecision: "",
    statusCheckRollup: [],
    headRepositoryOwner: { login: OWNER },
    comments: [],
  };
  const fixtures = {
    "pr view": { [prNumber]: pr, [branch]: `@same:${prNumber}` },
    "pr diff": { [prNumber]: `@file:pr-${prNumber}.diff` },
    "pr list": [
      {
        number: prNumber,
        title: pr.title,
        headRefName: branch,
        state: "OPEN",
        url: pr.url,
      },
    ],
    "repo view": {
      owner: { login: OWNER },
      name: REPO,
      nameWithOwner: `${OWNER}/${REPO}`,
      url: `https://github.com/${OWNER}/${REPO}`,
    },
    "issue view": unanchored
      ? {}
      : {
          9010: {
            number: 9010,
            title: "[Task 901] Widget age gate",
            state: "OPEN",
            labels: [{ name: "task" }],
            milestone: null,
            closedByPullRequestsReferences: [{ number: 901, url: pr.url }],
          },
        },
  };

  // 5. The skill, where its snippets address it, and the fake gh.
  copySkill(
    path.join(repoRoot, "skills", "review-pr"),
    path.join(sandbox, ".agents", "skills", "review-pr"),
  );
  const { PATH } = installFakeGh(sandbox, fixtures);

  return {
    env: {
      PATH,
      GH_CONFIG_DIR: path.join(sandbox, ".eval", "gh-config"),
      GH_TOKEN: "",
      GITHUB_TOKEN: "",
      GH_ENTERPRISE_TOKEN: "",
      JIRA_URL: "",
      TRACKER: "",
      VCS: "",
    },
  };
}
