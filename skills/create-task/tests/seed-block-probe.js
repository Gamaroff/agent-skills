"use strict";
/**
 * Probe harness for create-task § 1.1's seed block (task.236 QA cycle 1, QA-3).
 *
 * The seed block refuses on repository state, so the probe engine has to run it
 * (probe-boundary-rule.md). It does that with the `fence:` form, which reads the
 * block from SKILL.md on every run. This module builds what that run needs and
 * no committed file can hold:
 *
 * - The block's require closure, written under `.agents/skills/create-task/` in
 *   each case directory. The block names those paths relative to its cwd. The
 *   closure is about 450 KB, and it is embedded once per case, so the cases file
 *   is generated at run time, not committed.
 * - A workspace under the MAIN checkout. The resolver refuses `/tmp` and any
 *   linked worktree, and a case directory is in `/tmp`.
 * - A `gh` stub inside the repository. The engine refuses to run a fixture whose
 *   text mentions `gh` unless one is given, and the block never calls it.
 *
 * The slot is the block's two assignment lines, so each case sets the task
 * number and the observation ids together. A guard on either one is reached only
 * when the other holds a valid value, and the fence form fills one slot.
 *
 * The snippet engines are found by repository path built with path.join: a
 * `shared/resources/` literal in a skill's .js file is a bundling instruction.
 *
 * CLI (for a QA cycle that wants the run record):
 *   node skills/create-task/tests/seed-block-probe.js
 * prints `{ argv, cleanup }`. Append `--record <path> --json` to `argv` and run it
 * with node from the repository root. Then delete every `cleanup` path.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SKILL = path.join(__dirname, "..");
const REPO = path.join(SKILL, "..", "..");
const SKILL_MD = path.join(SKILL, "SKILL.md");
const PROBE = path.join(REPO, "shared", "resources", "security-probe.mjs");
const engine = require(
  path.join(REPO, "shared", "resources", "observation-log.js"),
);

const HEADING = "Steps 3 to 6: seed, ask, cite and park";
// As the engine reads it: the block keeps the list item's three-space indent.
const SLOT = "TASK_ID='{next-task-number}'\n   OBS_IDS='{observation-ids}'";

// The main checkout's root. From a linked worktree that is NOT the tree the
// code runs from, which is the point: the resolver refuses a workspace inside a
// linked worktree, so scratch state lives under the main checkout.
function mainCheckout(here) {
  const r = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: here, encoding: "utf8" },
  );
  const common = r.status === 0 ? r.stdout.trim() : "";
  return common ? path.dirname(common) : here;
}
function scratchBase(here) {
  return path.join(mainCheckout(here), ".observation-log-test-tmp");
}

function observation(id, slug, title) {
  return [
    "---",
    `id: ${id}`,
    `title: "${title}"`,
    "status: open",
    "skill:",
    "  - create-task",
    "---",
    "",
    "## Issue",
    "",
    `The ${slug} fixture describes a defect in the step document.`,
    "",
    "## Improvement",
    "",
    `Make the ${slug} step a runnable block that the suite executes.`,
    "",
    "## Principle",
    "",
    "A step a reader runs is held by running it.",
    "",
  ].join("\n");
}

// The files the block reads through `.agents/skills/create-task/`: the require
// closure of the two scripts it runs, the resolver, and what the resolver sources.
function closure() {
  const files = {};
  const add = (abs) => {
    const key = path.join(
      ".agents",
      "skills",
      "create-task",
      path.relative(SKILL, abs),
    );
    if (files[key] !== undefined) return;
    const text = fs.readFileSync(abs, "utf8");
    // fixture.files refuses a NUL. defer-mutation.js has one inside a string
    // literal, where the escape is the same value.
    files[key] = abs.endsWith(".js") ? text.replace(/\0/g, "\\u0000") : text;
    if (!abs.endsWith(".js")) return;
    for (const m of text.matchAll(
      /require\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g,
    )) {
      let dep = path.resolve(path.dirname(abs), m[1]);
      if (!fs.existsSync(dep) && fs.existsSync(dep + ".js")) dep += ".js";
      add(dep);
    }
  };
  add(path.join(SKILL, "scripts", "lib.js"));
  add(path.join(SKILL, "references", "observation-log.js"));
  add(path.join(SKILL, "references", "resolve-observation-workspace.sh"));
  add(path.join(SKILL, "references", "read-config.sh"));
  return files;
}

// One input fills both assignment lines, substituted into the block's own
// lines the way an agent substitutes the placeholders, so a case sees the
// block's quoting (QA cycle 2, CR-2). split/join: a String.replace
// replacement string treats `$'` and `$&` as patterns.
const args = (task, ids) =>
  SLOT.split("{next-task-number}")
    .join(task)
    .split("{observation-ids}")
    .join(ids);

function cases(fixture) {
  const legit = (id, task, ids, why) => ({
    id,
    sink: "filename",
    input: args(task, ids),
    why,
    correct: "the block prints a seed",
    direction: "legitimate",
    fixture,
  });
  const refuse = (id, task, ids, why, stderr) => ({
    id,
    sink: "filename",
    input: args(task, ids),
    why,
    correct: "the block refuses, naming the input",
    direction: "hostile",
    fixture,
    expected: { exit: 1, stderr },
  });
  return [
    legit("two-ids", "9001", "1,2", "two open entries"),
    legit("spaced-ids", "9001", " 1 , 2 ", "whitespace around ids is trimmed"),
    refuse(
      "task-prefixed",
      "task.236",
      "1,2",
      "a task id, not its number",
      "not a task number: task.236\n",
    ),
    refuse(
      "task-placeholder",
      "{next-task-number}",
      "1,2",
      "the placeholder left in place",
      "not a task number: {next-task-number}\n",
    ),
    refuse("task-empty", "", "1,2", "no task number", "not a task number: \n"),
    refuse(
      "task-signed",
      "-9001",
      "1,2",
      "a sign",
      "not a task number: -9001\n",
    ),
    refuse(
      "ids-semicolon",
      "9001",
      "1;2",
      "a separator that is not a comma",
      "not an observation id: 1;2\n",
    ),
    refuse(
      "ids-traversal",
      "9001",
      "../1",
      "a path, not an id",
      "not an observation id: ../1\n",
    ),
    refuse(
      "ids-empty",
      "9001",
      "",
      "no id at all",
      "not an observation id: \n",
    ),
    refuse(
      "ids-negative",
      "9001",
      "-1",
      "a sign",
      "not an observation id: -1\n",
    ),
    refuse(
      "ids-exponent",
      "9001",
      "1e2",
      "a number that is not digits",
      "not an observation id: 1e2\n",
    ),
    refuse(
      "ids-hex",
      "9001",
      "0x1",
      "a hex literal",
      "not an observation id: 0x1\n",
    ),
    // Shell syntax an agent could paste into the quotes: each must reach the
    // node guard unexpanded and be named as typed (QA cycle 2, QA2-1).
    refuse(
      "ids-command-substitution",
      "9001",
      "1,$(echo 2)",
      "a command substitution",
      "not an observation id: $(echo 2)\n",
    ),
    refuse(
      "ids-backtick",
      "9001",
      "1,`echo 2`",
      "a backtick substitution",
      "not an observation id: `echo 2`\n",
    ),
    refuse(
      "ids-double-quote",
      "9001",
      '1"2',
      "a double quote",
      'not an observation id: 1"2\n',
    ),
    refuse(
      "ids-variable",
      "9001",
      "$HOME",
      "a variable reference",
      "not an observation id: $HOME\n",
    ),
    refuse(
      "task-command-substitution",
      "$(echo 9001)",
      "1,2",
      "a command substitution",
      "not a task number: $(echo 9001)\n",
    ),
    refuse(
      "ids-missing",
      "9001",
      "1,9",
      "an id with no file",
      "id 9 matches 0 files\n",
    ),
  ];
}

// Builds the workspace, the gh stub and the cases file, and returns the engine
// argv plus every path to delete afterwards.
function buildSeedProbe() {
  const block = fs.readFileSync(SKILL_MD, "utf8");
  if (!block.includes(`#### ${HEADING}`)) {
    throw new Error(
      `SKILL.md has no "#### ${HEADING}" heading for the probe to name`,
    );
  }
  if (!block.includes(SLOT)) {
    throw new Error(
      "SKILL.md's seed block no longer carries the two assignment lines the probe fills",
    );
  }
  const base = scratchBase(REPO);
  fs.mkdirSync(base, { recursive: true });
  const ws = fs.mkdtempSync(path.join(base, "seed-block-probe-"));
  if (engine.run(["init", "--workspace", ws, "--json"]).exitCode !== 0) {
    throw new Error(`observation-log init failed for ${ws}`);
  }
  const logDir = path.join(ws, "skill-observations", "observation-log");
  fs.writeFileSync(
    path.join(logDir, "0001-alpha-step.md"),
    observation(1, "alpha", "create-task: alpha step is prose"),
  );
  fs.writeFileSync(
    path.join(logDir, "0002-beta-step.md"),
    observation(2, "beta", "create-task: beta step drops an argument"),
  );
  // The stub must sit inside --repo-root, which is the tree the probe runs from.
  const local = path.join(REPO, ".observation-log-test-tmp");
  fs.mkdirSync(local, { recursive: true });
  const work = fs.mkdtempSync(path.join(local, "seed-block-probe-work-"));
  const fakeGh = path.join(work, "gh-stub");
  fs.mkdirSync(fakeGh);
  fs.writeFileSync(
    path.join(fakeGh, "gh"),
    '#!/bin/sh\necho "gh stub: the seed block does not call gh" >&2\nexit 97\n',
    { mode: 0o755 },
  );
  const casesFile = path.join(work, "cases.json");
  fs.writeFileSync(
    casesFile,
    JSON.stringify(cases({ env: { OBS_WORKSPACE: ws }, files: closure() })),
  );
  const argv = [
    PROBE,
    "--sink",
    "filename",
    "--entry",
    `fence:${path.relative(REPO, SKILL_MD)}#${HEADING}`,
    "--slot",
    SLOT,
    "--name",
    "seed-args",
    "--cases-file",
    casesFile,
    "--repo-root",
    REPO,
    "--fake-gh",
    fakeGh,
  ];
  return { argv, cleanup: [ws, work], caseCount: cases({}).length };
}

module.exports = { buildSeedProbe, scratchBase, mainCheckout, HEADING, SLOT };

if (require.main === module) {
  const { argv, cleanup } = buildSeedProbe();
  console.log(JSON.stringify({ argv, cleanup }, null, 2));
}
