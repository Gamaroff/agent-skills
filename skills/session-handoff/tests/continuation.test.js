"use strict";
/**
 * session-handoff — continuation.mjs behavioural tests (task.156).
 *
 * Two halves. The resolver is pure, so its path rules, index rule, verifier
 * order and prompt are exercised over an INJECTED filesystem. The template is
 * then proven verifiable as written: filled with real figures in a throwaway
 * git repository and run through the UNCHANGED handoff-verify.mjs — a test of
 * behaviour, not of source text. Mutating one figure must turn its row `stale`,
 * which is what shows the file is measured rather than merely parsed.
 *
 * Mutation-proved by hand at task.156 Step 3 (see the implementation report):
 * a lexical `nextIndex` turns the index-10 case red, and dropping the
 * task-directory existence check turns the absent-dir case red.
 *
 * Run: node --test 'skills/session-handoff/tests/*.test.js'
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { pathToFileURL } = require("url");
const test = require("node:test");
const assert = require("node:assert/strict");

const SKILL_DIR = path.join(__dirname, "..");
const SCRIPT = path.join(SKILL_DIR, "scripts", "continuation.mjs");
const VERIFY = path.join(SKILL_DIR, "scripts", "handoff-verify.mjs");
const TEMPLATE = path.join(SKILL_DIR, "assets", "continuation.template.md");

const load = () => import(pathToFileURL(SCRIPT).href);

const ROOT = "/repo";
const HOME = "/home/u";
const SELF = "/install/session-handoff/scripts";

/** An injected filesystem: a set of existing paths and a dir → names map. */
function fakeFs({ paths = [], dirs = {}, stories = {} } = {}) {
  const existing = new Set(paths.map((p) => path.normalize(p)));
  for (const d of Object.keys(dirs)) existing.add(path.normalize(d));
  return {
    exists: (p) => existing.has(path.normalize(p)),
    list: (d) => dirs[path.normalize(d)] ?? [],
    findStory: (e, s) => stories[`${e}.${s}`] ?? null,
  };
}

function resolveWith(mod, { branch, slug, fsSpec, selfDir = SELF } = {}) {
  return mod.resolveContinuation({
    repoRoot: ROOT,
    branch,
    home: HOME,
    selfDir,
    today: "2026-10-01",
    slug,
    ...fakeFs(fsSpec),
  });
}

const TASK_DIR = "/repo/docs/tasks/task.147.develop-pipeline-step-mechanics";
const TASK_BRANCH = "feature/task.147.develop-pipeline-step-mechanics";

// ---------------------------------------------------------------------------
// Path rules
// ---------------------------------------------------------------------------

test("task branch with its directory present → co-located handoff.1", async () => {
  const mod = await load();
  const r = resolveWith(mod, {
    branch: TASK_BRANCH,
    fsSpec: {
      dirs: { [TASK_DIR]: ["task.147.develop-pipeline-step-mechanics.md"] },
    },
  });
  assert.equal(
    r.path,
    "docs/tasks/task.147.develop-pipeline-step-mechanics/task.147.handoff.1.develop-pipeline-step-mechanics.md",
  );
  assert.deepEqual(r.workItem, {
    kind: "task",
    id: "task.147",
    dir: "docs/tasks/task.147.develop-pipeline-step-mechanics",
  });
});

test("handoff.1 and handoff.9 present → handoff.10 (base-10, not lexical)", async () => {
  const mod = await load();
  const r = resolveWith(mod, {
    branch: TASK_BRANCH,
    fsSpec: {
      dirs: {
        [TASK_DIR]: [
          "task.147.handoff.1.develop-pipeline-step-mechanics.md",
          "task.147.handoff.9.develop-pipeline-step-mechanics.md",
          "task.147.develop-pipeline-step-mechanics.md",
        ],
      },
    },
  });
  assert.match(
    r.path,
    /task\.147\.handoff\.10\.develop-pipeline-step-mechanics\.md$/,
  );
  assert.equal(
    mod.nextIndex(["x.handoff.2.a.md", "x.handoff.10.a.md"], "x"),
    11,
  );
  assert.equal(mod.nextIndex([], "x"), 1);
});

test("task branch whose directory is absent → .agents/handoffs fallback", async () => {
  const mod = await load();
  const r = resolveWith(mod, { branch: TASK_BRANCH });
  assert.equal(
    r.path,
    ".agents/handoffs/2026-10-01-feature-task-147-develop-pipeline-step-mechanics.md",
  );
  assert.equal(r.workItem, null);
});

test("story branch: found under the PRD root → story dir; not found → fallback", async () => {
  const mod = await load();
  const dir = "/repo/docs/prd/x/epics/epic.2.e/stories/story.2.3.add-footer";
  const found = resolveWith(mod, {
    branch: "feature/story.2.3.add-footer",
    fsSpec: {
      stories: { 2.3: dir },
      dirs: { [dir]: ["story.2.3.add-footer.md"] },
    },
  });
  assert.equal(
    found.path,
    "docs/prd/x/epics/epic.2.e/stories/story.2.3.add-footer/story.2.3.handoff.1.add-footer.md",
  );
  assert.equal(found.workItem.id, "story.2.3");

  const missing = resolveWith(mod, { branch: "feature/story.2.3.add-footer" });
  assert.match(
    missing.path,
    /^\.agents\/handoffs\/2026-10-01-feature-story-2-3-add-footer\.md$/,
  );

  // A story directory outside the repository is never written into.
  const outside = resolveWith(mod, {
    branch: "feature/story.2.3.add-footer",
    fsSpec: { stories: { 2.3: "/elsewhere/story.2.3.add-footer" } },
  });
  assert.match(outside.path, /^\.agents\/handoffs\//);
});

test("detached HEAD and develop → fallback; slug from --slug, else the branch", async () => {
  const mod = await load();
  assert.equal(
    resolveWith(mod, { branch: "HEAD" }).path,
    ".agents/handoffs/2026-10-01-session.md",
  );
  assert.equal(
    resolveWith(mod, { branch: "HEAD", slug: "Fix the Flake" }).path,
    ".agents/handoffs/2026-10-01-fix-the-flake.md",
  );
  assert.equal(
    resolveWith(mod, { branch: "develop" }).path,
    ".agents/handoffs/2026-10-01-develop.md",
  );
});

test("a taken fallback path gets -2, -3", async () => {
  const mod = await load();
  const r = resolveWith(mod, {
    branch: "develop",
    fsSpec: {
      paths: [
        "/repo/.agents/handoffs/2026-10-01-develop.md",
        "/repo/.agents/handoffs/2026-10-01-develop-2.md",
      ],
    },
  });
  assert.equal(r.path, ".agents/handoffs/2026-10-01-develop-3.md");
});

test("a slug or branch carrying /, .. or spaces cannot escape the target dir", async () => {
  const mod = await load();
  assert.equal(mod.kebab("../x y"), "x-y");
  assert.equal(mod.kebab("../../.."), "session");
  const r = resolveWith(mod, { branch: "HEAD", slug: "../../etc/passwd x" });
  assert.equal(r.path, ".agents/handoffs/2026-10-01-etc-passwd-x.md");
  // A branch that only looks like a task branch never reaches the task path.
  const sneaky = resolveWith(mod, {
    branch: "feature/task.1.a/../../../x",
    fsSpec: { dirs: { "/repo/docs/tasks/task.1.a": [] } },
  });
  assert.match(sneaky.path, /^\.agents\/handoffs\/2026-10-01-[a-z0-9-]+\.md$/);
});

// ---------------------------------------------------------------------------
// Verifier resolution and the prompt
// ---------------------------------------------------------------------------

test("verifier order: sibling → repo .agents → ~/.agents → ~/.claude", async () => {
  const mod = await load();
  const tail = "skills/session-handoff/scripts/handoff-verify.mjs";
  const sibling = `${SELF}/handoff-verify.mjs`;
  const repo = `/repo/.agents/${tail}`;
  const userAgents = `${HOME}/.agents/${tail}`;
  const userClaude = `${HOME}/.claude/${tail}`;
  const cases = [
    [[sibling, repo, userAgents, userClaude], sibling],
    [[repo, userAgents, userClaude], `.agents/${tail}`], // inside the repo → relative
    [[userAgents, userClaude], userAgents], // outside → absolute
    [[userClaude], userClaude],
  ];
  for (const [present, want] of cases) {
    const r = resolveWith(mod, {
      branch: "develop",
      fsSpec: { paths: present },
    });
    assert.equal(r.reason, "ok");
    assert.equal(r.verifier, want, `present: ${present.join(", ")}`);
    assert.ok(
      r.resumePrompt.includes(`command node ${want} ${r.path}`),
      "the prompt names the resolved verifier and the file",
    );
  }
});

test("no verifier → reason no-verifier, and the prompt says verify by hand", async () => {
  const mod = await load();
  const r = resolveWith(mod, { branch: "develop" });
  assert.equal(r.reason, "no-verifier");
  assert.equal(r.verifier, null);
  assert.match(
    r.resumePrompt,
    /No verifier is installed — re-run each command in the file's state table by hand/,
  );
  assert.doesNotMatch(r.resumePrompt, /command node/);
  // The other two steps are never dropped.
  assert.match(r.resumePrompt, /§4 "Ruled out"/);
  assert.match(r.resumePrompt, /Start at §1 "Next step"/);
});

test("PRD root from skills-config.yaml: block key, quotes, comments, absent", async () => {
  const mod = await load();
  assert.equal(
    mod.prdRootFromConfig(
      "prd:\n  prdShardedLocation: 'docs/product' # here\narch:\n  x: 1\n",
    ),
    "docs/product",
  );
  assert.equal(
    mod.prdRootFromConfig("other:\n  prdShardedLocation: nope\n"),
    "",
  );
  assert.equal(mod.prdRootFromConfig(""), "");
});

// ---------------------------------------------------------------------------
// A real repository: CLI, PRD-root precedence, and the template through the
// unchanged verifier
// ---------------------------------------------------------------------------

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};
const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8" }).trim();

function tempRepo(t, branch) {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "continuation-")),
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  git(dir, "init", "-q", "-b", branch);
  git(dir, "commit", "-q", "--allow-empty", "-m", "init");
  return dir;
}

test("CLI --json on a task branch: piped output parses; unknown flag exits 2", (t) => {
  const repo = tempRepo(t, "feature/task.7.demo-work");
  fs.mkdirSync(path.join(repo, "docs/tasks/task.7.demo-work"), {
    recursive: true,
  });
  const r = spawnSync(process.execPath, [SCRIPT, "--json"], {
    cwd: repo,
    stdio: "pipe",
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.reason, "ok");
  assert.equal(
    out.path,
    "docs/tasks/task.7.demo-work/task.7.handoff.1.demo-work.md",
  );
  // The sibling verifier is outside the temp repo, so it is emitted absolute.
  assert.equal(out.verifier, VERIFY);

  const bad = spawnSync(process.execPath, [SCRIPT, "--nope"], {
    cwd: repo,
    encoding: "utf8",
  });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /unknown argument: --nope/);
});

test("PRD root precedence: --prd-root > skills-config.yaml > docs/prd", async (t) => {
  const mod = await load();
  const repo = tempRepo(t, "feature/story.2.3.add-footer");
  const mk = (rel) => {
    const d = path.join(repo, rel, "stories/story.2.3.add-footer");
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "story.2.3.add-footer.md"), "x\n");
  };
  mk("docs/prd");
  const io = {
    home: "/nonexistent-home",
    selfDir: path.dirname(SCRIPT),
    today: "2026-10-01",
  };
  assert.match(mod.run(["--repo", repo], io).path, /^docs\/prd\/stories\//);

  mk("alt/prd");
  fs.writeFileSync(
    path.join(repo, "skills-config.yaml"),
    "prd:\n  prdShardedLocation: alt/prd\n",
  );
  assert.match(mod.run(["--repo", repo], io).path, /^alt\/prd\/stories\//);

  mk("flag/prd");
  assert.match(
    mod.run(["--repo", repo, "--prd-root", "flag/prd"], io).path,
    /^flag\/prd\/stories\/story\.2\.3\.add-footer\/story\.2\.3\.handoff\.1\.add-footer\.md$/,
  );
});

/**
 * Run the unchanged verifier on `file` inside `repo`; return lines by check.
 * `NODE_TEST_CONTEXT` is dropped from the env: this file runs under `node
 * --test`, which sets it, and a nested `node --test` that inherits it reports
 * to the (absent) parent runner instead of printing its `pass N` summary — the
 * targeted-test row would read `stale` here and `confirmed` at a terminal.
 */
function verifyRows(repo, file) {
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const r = spawnSync(
    process.execPath,
    [VERIFY, file, "--json", "--timeout", "120"],
    {
      cwd: repo,
      env,
      encoding: "utf8",
    },
  );
  const out = JSON.parse(r.stdout);
  return Object.fromEntries(out.lines.map((l) => [l.check, l]));
}

test("the template, filled with real figures, verifies all-confirmed; a mutated figure reads stale", (t) => {
  const repo = tempRepo(t, "feature/task.7.demo-work");
  fs.mkdirSync(path.join(repo, "t"));
  fs.writeFileSync(
    path.join(repo, "t", "demo.test.js"),
    "const test = require('node:test');\ntest('alpha one', () => {});\ntest('alpha two', () => {});\ntest('beta', () => {});\n",
  );
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "tests");
  fs.writeFileSync(path.join(repo, "work.js"), "// in flight\n"); // the dirty file

  const branch = git(repo, "rev-parse", "--abbrev-ref", "HEAD");
  const sha = git(repo, "rev-parse", "--short", "HEAD");
  const fill = (tpl, over = {}) =>
    tpl
      .replace("**{branch}**", `**${over.branch ?? branch}**`)
      .replace("**{short-sha}**", `**${over.sha ?? sha}**`)
      .replace("**{file-a}** **{file-b}**", "**work.js**")
      .replace(
        "--test-name-pattern={pattern}",
        `--test-name-pattern=${over.pattern ?? "alpha"}`,
      )
      .replace("**pass {N}**", "**pass 2**");
  const tpl = fs.readFileSync(TEMPLATE, "utf8");
  const file = "handoff.md";

  fs.writeFileSync(path.join(repo, file), fill(tpl));
  const rows = verifyRows(repo, file);
  assert.deepEqual(
    Object.keys(rows).sort(),
    ["Branch", "Branch tip", "Targeted test", "Uncommitted files"],
    "the template carries exactly the four state rows — comments and fences add none",
  );
  for (const [check, l] of Object.entries(rows)) {
    assert.equal(
      l.verdict,
      "confirmed",
      `${check}: ${l.verdict} ${l.detail ?? ""}`,
    );
  }

  // Mutation: the file is measured, not merely parsed.
  fs.writeFileSync(path.join(repo, file), fill(tpl, { sha: "0000000" }));
  assert.equal(verifyRows(repo, file)["Branch tip"].verdict, "stale");

  // A pattern that matches no test reads stale under `pass N` — `exit 0` would confirm it.
  fs.writeFileSync(
    path.join(repo, file),
    fill(tpl, { pattern: "zzz-no-such-test" }),
  );
  assert.equal(verifyRows(repo, file)["Targeted test"].verdict, "stale");
});
