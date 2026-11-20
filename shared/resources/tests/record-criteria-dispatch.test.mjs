// record-criteria-dispatch — task 311. The QA step lists the success criteria that name a record
// location (finalise-record-preflight.js) and hands the listing to qa-task as `record_criteria=`.
//
// Behaviour, not grep: the fenced block in the step document is extracted and RUN against a real
// task fixture in a real git repository, and its output is compared with the engine's own. The
// dispatch lines are checked structurally: both task-variant forms carry the token, no story form
// does, and qa-task's own args list documents it.

import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnBudget } from "../spawn-budget.mjs";

const BUDGET = spawnBudget("RECORD_CRITERIA_DISPATCH");
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const STEP_DOC = join(
  REPO_ROOT,
  "shared",
  "resources",
  "develop-pipeline-step-5-6-qa-loop.md",
);
const QA_TASK = join(REPO_ROOT, "skills", "qa-task", "SKILL.md");
const ENGINE = join(
  REPO_ROOT,
  "shared",
  "resources",
  "finalise-record-preflight.js",
);

const made = [];
after(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

const doc = readFileSync(STEP_DOC, "utf8");

// The fenced bash block that runs the preflight: the one that mentions record-criteria.json.
function extractPreflightBlock() {
  const blocks = [...doc.matchAll(/```bash\n([\s\S]*?)```/g)].map((m) => m[1]);
  const hits = blocks.filter((b) => b.includes("finalise-record-preflight.js"));
  assert.equal(
    hits.length,
    1,
    "exactly one fenced block runs the record preflight",
  );
  return hits[0];
}

// A work item whose criterion names the QA report, in a git repository, with the engine copied to
// the path the step document's command uses.
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "record-dispatch-"));
  made.push(root);
  const git = (...a) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], {
      cwd: root,
      stdio: "pipe",
    });
  git("init", "-q");
  const dir = join(root, "docs", "tasks", "task.1.fixture");
  mkdirSync(dir, { recursive: true });
  const taskFile = join(dir, "task.1.fixture.md");
  writeFileSync(
    taskFile,
    [
      "---",
      "id: task.1",
      "type: task",
      "---",
      "",
      "# Task 1",
      "",
      "## 9. Success Criteria",
      "",
      "### Functional",
      "",
      "- [ ] Every mutation turns a test red, recorded in the QA report.",
      "",
    ].join("\n"),
  );
  const refs = join(root, ".agents", "skills", "develop-task", "references");
  mkdirSync(refs, { recursive: true });
  for (const f of ["finalise-record-preflight.js", "criteria-section.js"]) {
    copyFileSync(join(REPO_ROOT, "shared", "resources", f), join(refs, f));
  }
  git("add", "-A");
  git("commit", "-q", "-m", "fixture");
  return { root, dir, taskFile };
}

test("the dispatch block writes the listing the engine itself produces", () => {
  const { root, dir, taskFile } = makeFixture();
  const block = extractPreflightBlock()
    .replace("{task-file}", taskFile)
    .replace("{task-directory}", dir);
  const run = spawnSync("bash", ["-c", block], {
    cwd: root,
    encoding: "utf8",
    timeout: BUDGET.timeoutMs,
  });
  assert.equal(run.status, 0, run.stderr);
  const written = JSON.parse(
    readFileSync(join(dir, ".summaries", "record-criteria.json"), "utf8"),
  );
  const direct = JSON.parse(
    spawnSync(
      process.execPath,
      [ENGINE, "check", "--doc", taskFile, "--json"],
      {
        cwd: root,
        encoding: "utf8",
        timeout: BUDGET.timeoutMs,
      },
    ).stdout,
  );
  assert.deepEqual(written, direct);
  assert.equal(written.listed.length, 1);
  assert.equal(written.listed[0].location, "qa-report");
});

test("a failing preflight leaves no half-written listing behind", () => {
  const { root, dir } = makeFixture();
  const block = extractPreflightBlock()
    .replace("{task-file}", join(dir, "no-such-task.md"))
    .replace("{task-directory}", dir);
  const run = spawnSync("bash", ["-c", block], {
    cwd: root,
    encoding: "utf8",
    timeout: BUDGET.timeoutMs,
  });
  assert.equal(
    run.status,
    0,
    "the block degrades, it does not abort the pipeline",
  );
  assert.match(run.stdout, /omit the record_criteria token/);
  const gone = spawnSync("test", [
    "-e",
    join(dir, ".summaries", "record-criteria.json"),
  ]);
  assert.notEqual(
    gone.status,
    0,
    "a stale or partial listing must not be left for the dispatch to point at",
  );
});

test("both task-variant dispatches carry record_criteria and no story dispatch does", () => {
  const taskForms = doc
    .split("\n")
    .filter((l) => l.startsWith("Skill(qa-task,"));
  const storyForms = doc
    .split("\n")
    .filter((l) => l.startsWith("Skill(qa-story,"));
  assert.equal(
    taskForms.length,
    2,
    "task-variant dispatch forms: with and without the matrix",
  );
  assert.equal(
    storyForms.length,
    2,
    "story-variant dispatch forms are untouched",
  );
  for (const l of taskForms)
    assert.match(
      l,
      /record_criteria=\{task-directory\}\/\.summaries\/record-criteria\.json/,
    );
  for (const l of storyForms) assert.doesNotMatch(l, /record_criteria/);
});

test("qa-task documents record_criteria among its pipeline args", () => {
  const skill = readFileSync(QA_TASK, "utf8");
  const section = skill.slice(
    skill.indexOf("## Pipeline Skill args"),
    skill.indexOf("## When to Use This Skill"),
  );
  assert.match(section, /Skill\(qa-task, args="[^"]*record_criteria=<path>"\)/);
  assert.match(section, /`record_criteria=<path>`/);
  assert.match(section, /Never edit a criterion's wording/);
  assert.match(section, /names the \*\*test that went red\*\*/);
});
