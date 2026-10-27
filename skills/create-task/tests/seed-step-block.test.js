"use strict";
/**
 * create-task § 1.1 step 3: the seed block in SKILL.md, executed (task.236, obs #104).
 *
 * The step used to describe the `seedFromObservations` call in prose, and the
 * prose left out the required `taskId`, so following it exactly threw. Every
 * test in from-observation.test.js calls the function directly and none reads
 * SKILL.md, so the prose and the function could disagree with the suite green.
 * This test runs the block itself: it extracts the one fenced `bash` block in
 * SKILL.md that calls `seedFromObservations`, runs it under bash in a
 * consumer-shaped scratch tree, and asserts the seed it prints.
 *
 * The scratch tree is REPO-LOCAL (the engine refuses `/tmp` as ephemeral) and
 * carries its own `.agents/skills/create-task` link to this skill, so the
 * block's paths resolve without the gitignored local symlink CI does not have.
 * The fixtures are written as files, not through the engine's `write`: two
 * entries on one skill would answer `possible-duplicate`, and the control pair
 * needs a file prefix that disagrees with its id, which `write` never makes.
 *
 * The snippet extractor is required by repository path built with path.join: a
 * `shared/resources/` literal in a skill's .js file is a bundling instruction.
 *
 * Run: node --test skills/create-task/tests/seed-step-block.test.js
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { pathToFileURL } = require("url");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO = path.join(__dirname, "..", "..", "..");
const SKILL_MD = path.join(REPO, "skills", "create-task", "SKILL.md");
const SNIPPETS = path.join(
  REPO,
  "shared",
  "resources",
  "qa-execute-snippets.mjs",
);
const engine = require(
  path.join(REPO, "shared", "resources", "observation-log.js"),
);

const SCRATCH_ROOT = path.join(REPO, ".observation-log-test-tmp");
fs.mkdirSync(SCRATCH_ROOT, { recursive: true });

// The block's two placeholders, substituted by split/join: a replacement
// string passed to String.replace treats `$'` and `$&` as patterns.
const TASK_SLOT = "{next-task-number}";
const IDS_SLOT = "{observation-ids}";
const TASK_ID = "9001";

async function seedBlock() {
  const { extractBlocks } = await import(pathToFileURL(SNIPPETS));
  const hits = extractBlocks(fs.readFileSync(SKILL_MD, "utf8")).filter((b) =>
    /seedFromObservations/.test(b.code),
  );
  assert.equal(
    hits.length,
    1,
    "exactly one bash block in create-task SKILL.md calls seedFromObservations",
  );
  return hits[0].code;
}

function fixture(id, slug, title) {
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

// files: { "0001-name.md": "<text>" }. Returns the bash result.
function runBlock(code, files, ids) {
  const ws = fs.mkdtempSync(path.join(SCRATCH_ROOT, "seed-step-block-"));
  try {
    assert.equal(engine.run(["init", "--workspace", ws, "--json"]).exitCode, 0);
    const logDir = path.join(ws, "skill-observations", "observation-log");
    for (const [name, text] of Object.entries(files))
      fs.writeFileSync(path.join(logDir, name), text);
    fs.mkdirSync(path.join(ws, ".agents", "skills"), { recursive: true });
    fs.symlinkSync(
      path.join(REPO, "skills", "create-task"),
      path.join(ws, ".agents", "skills", "create-task"),
    );
    assert.ok(
      code.includes(TASK_SLOT) && code.includes(IDS_SLOT),
      "the block carries both placeholders",
    );
    const script = code
      .split(TASK_SLOT)
      .join(TASK_ID)
      .split(IDS_SLOT)
      .join(ids);
    const env = { ...process.env, OBS_WORKSPACE: ws };
    delete env.SKILLS_CONFIG_FILE;
    return spawnSync("bash", ["-c", script], {
      cwd: ws,
      env,
      encoding: "utf8",
    });
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
}

test("the step 3 block seeds two entries in ONE call, with the task id in every park vector", async () => {
  const code = await seedBlock();
  const r = runBlock(
    code,
    {
      "0001-alpha-step.md": fixture(
        1,
        "alpha",
        "create-task: alpha step is prose",
      ),
      "0002-beta-step.md": fixture(
        2,
        "beta",
        "create-task: beta step drops an argument",
      ),
    },
    "1,2",
  );
  assert.equal(r.status, 0, `block exited ${r.status}\nstderr: ${r.stderr}`);
  const seed = JSON.parse(r.stdout);
  assert.deepEqual(seed.ids, [1, 2]);
  assert.equal(seed.title, null);
  assert.equal(
    seed.titleReason,
    "multiple-entries",
    "one call over both entries — a per-entry loop never yields multiple-entries",
  );
  assert.equal(seed.park.length, 2);
  for (const vector of seed.park) {
    const i = vector.indexOf("--parked-until");
    assert.ok(
      i >= 0,
      `park vector has --parked-until: ${JSON.stringify(vector)}`,
    );
    assert.equal(vector[i + 1], `task.${TASK_ID} merged to develop`);
  }
});

test("control: an entry whose frontmatter id disagrees with its file prefix makes the block exit non-zero", async () => {
  const code = await seedBlock();
  const r = runBlock(
    code,
    {
      "0001-alpha-step.md": fixture(
        1,
        "alpha",
        "create-task: alpha step is prose",
      ),
      "0003-gamma-step.md": fixture(
        2,
        "gamma",
        "create-task: gamma step names the wrong id",
      ),
    },
    "1,3",
  );
  assert.notEqual(
    r.status,
    0,
    `block exited 0 on a mismatched id\nstdout: ${r.stdout}`,
  );
  assert.match(
    r.stderr,
    /0003-gamma-step\.md has frontmatter id 2, which does not match its file id 3/,
  );
  assert.equal(r.stdout.trim(), "", "no seed is printed for a refused pair");
});
