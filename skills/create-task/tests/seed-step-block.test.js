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
 * The scratch tree lives under the MAIN checkout. The resolver refuses `/tmp`,
 * and any path inside a linked git worktree, as ephemeral, so a base under the
 * tree the test runs from failed every run from a worktree (QA cycle 1, QA-1).
 * The tree carries its own `.agents/skills/create-task` link to this skill, so the
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
const RESOLVER = path.join(
  REPO,
  "skills",
  "create-task",
  "references",
  "resolve-observation-workspace.sh",
);
const {
  buildSeedProbe,
  scratchBase,
  mainCheckout,
} = require("./seed-block-probe.js");

const SCRATCH_ROOT = scratchBase(REPO);
fs.mkdirSync(SCRATCH_ROOT, { recursive: true });
const SCRATCH_REFUSAL = engine.ephemeralReason(fs.realpathSync(SCRATCH_ROOT));
if (SCRATCH_REFUSAL) {
  throw new Error(
    `scratch base ${SCRATCH_ROOT} is classified ephemeral (${SCRATCH_REFUSAL}) — the block would be refused for a reason unrelated to what it asserts`,
  );
}

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
function runBlock(code, files, ids, taskId = TASK_ID) {
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
    const script = code.split(TASK_SLOT).join(taskId).split(IDS_SLOT).join(ids);
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

test("a task number that is not digits is refused before the seed is built", async () => {
  const code = await seedBlock();
  const files = {
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
  };
  // `task.236` printed `task.task.236 merged to develop`, and an unsubstituted
  // placeholder printed `task.{next-task-number} merged to develop` (QA-2).
  for (const taskId of ["task.236", TASK_SLOT]) {
    const r = runBlock(code, files, "1,2", taskId);
    assert.notEqual(r.status, 0, `task number ${taskId} was accepted`);
    assert.equal(r.stderr, `not a task number: ${taskId}\n`);
    assert.equal(r.stdout, "", `no seed is printed for task number ${taskId}`);
  }
});

test("shell syntax substituted into the placeholders reaches the guard unexpanded and runs nothing", async () => {
  const code = await seedBlock();
  const marker = path.join(
    SCRATCH_ROOT,
    `seed-step-block-marker-${process.pid}`,
  );
  const files = {
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
  };
  // Under double quotes `1,$(echo 2)` seeded [1,2] at exit 0, and a quote in
  // the ids ran a command (QA cycle 2, QA2-1). Each value is substituted the
  // way an agent substitutes it: into the block's own assignment lines.
  const cases = [
    ["9001", "1,$(echo 2)", "not an observation id: $(echo 2)\n"],
    ["9001", "1,`echo 2`", "not an observation id: `echo 2`\n"],
    ["9001", "$HOME", "not an observation id: $HOME\n"],
    ["9001", `1"; touch "${marker}"; "`, null],
    [
      `$(touch "${marker}")`,
      "1,2",
      `not a task number: $(touch "${marker}")\n`,
    ],
  ];
  try {
    for (const [taskId, ids, stderr] of cases) {
      fs.rmSync(marker, { force: true });
      const r = runBlock(code, files, ids, taskId);
      const what = `task ${JSON.stringify(taskId)}, ids ${JSON.stringify(ids)}`;
      assert.notEqual(r.status, 0, `${what} was accepted: ${r.stdout}`);
      assert.equal(r.stdout, "", `no seed is printed for ${what}`);
      if (stderr !== null) assert.equal(r.stderr, stderr, what);
      else assert.match(r.stderr, /^not an observation id: /, what);
      assert.ok(!fs.existsSync(marker), `${what} ran a command`);
    }
  } finally {
    fs.rmSync(marker, { force: true });
  }
});

test("from a linked worktree the scratch base is the main checkout's, which the resolver accepts", () => {
  const main = mainCheckout(REPO);
  // mkdtemp, and a prune first: a run killed before its `finally` leaves a
  // worktree registered, and a fixed name would block every retry (QA cycle 2, CR-4).
  spawnSync("git", ["worktree", "prune"], { cwd: main });
  fs.mkdirSync(path.join(main, ".worktrees"), { recursive: true });
  const wt = fs.mkdtempSync(path.join(main, ".worktrees", "seed-step-block-"));
  const added = spawnSync("git", ["worktree", "add", "--detach", wt, "HEAD"], {
    cwd: main,
    encoding: "utf8",
  });
  // A sandbox that cannot create worktrees must not silently pass this test.
  assert.equal(added.status, 0, `git worktree add failed: ${added.stderr}`);
  const dirs = [];
  try {
    const resolve = (dir) => {
      const env = { ...process.env, OBS_WORKSPACE: dir };
      delete env.SKILLS_CONFIG_FILE;
      return spawnSync("bash", ["-c", 'source "$0" || exit 1', RESOLVER], {
        cwd: dir,
        env,
        encoding: "utf8",
      });
    };
    assert.equal(scratchBase(wt), SCRATCH_ROOT);
    // Control: the base the test used to build, under the worktree, is refused.
    const inTree = path.join(wt, ".observation-log-test-tmp");
    fs.mkdirSync(inTree, { recursive: true });
    const refused = resolve(
      fs.mkdtempSync(path.join(inTree, "seed-step-block-")),
    );
    assert.notEqual(
      refused.status,
      0,
      "the resolver accepted a workspace inside a linked worktree",
    );
    assert.match(refused.stderr, /inside a linked git worktree/);
    const accepted = fs.mkdtempSync(
      path.join(scratchBase(wt), "seed-step-block-"),
    );
    dirs.push(accepted);
    const ok = resolve(accepted);
    assert.equal(
      ok.status,
      0,
      `the resolver refused the main-checkout base: ${ok.stderr}`,
    );
  } finally {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
    spawnSync("git", ["worktree", "remove", "--force", wt], { cwd: main });
    spawnSync("git", ["worktree", "prune"], { cwd: main });
  }
});

test("the probe engine scores every seed-block case as its direction requires", () => {
  const probe = buildSeedProbe();
  try {
    const r = spawnSync(process.execPath, [...probe.argv, "--json"], {
      cwd: REPO,
      encoding: "utf8",
    });
    const out = JSON.parse(r.stdout);
    const wrong = out.cases
      .filter(
        (c) =>
          !(
            (c.direction === "hostile" && c.outcome === "rejected") ||
            (c.direction === "legitimate" && c.outcome === "accepted")
          ),
      )
      .map((c) => `${c.id}: ${c.outcome} — ${c.detail}`);
    assert.deepEqual(wrong, [], "every case scores as its direction requires");
    assert.deepEqual(out.declined, [], "no case was declined");
    // A shell-form case runs once per shell: bash always, zsh when the host has it (CI does).
    assert.ok(out.shells.includes("bash"), "the cases ran under bash");
    assert.equal(
      out.executed,
      probe.caseCount * out.shells.length,
      "every case executed under every shell",
    );
    assert.deepEqual(out.escapes, [], "no case wrote outside its sandbox");
    assert.equal(r.status, 0, `probe exited ${r.status}: ${r.stderr}`);
  } finally {
    for (const p of probe.cleanup)
      fs.rmSync(p, { recursive: true, force: true });
  }
});
