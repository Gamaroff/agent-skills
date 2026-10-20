// doc-link-branch.js — a card links to the current branch only when that branch is the
// document's own work item; otherwise to the default (task.200, obs #287).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "doc-link-branch.js");
const {
  workItemOf,
  branchNamesWorkItem,
  resolveDocLinkBranch,
  integrationBranchOf,
  runCli,
} = require(SCRIPT);

test("workItemOf reads the id, and a bug's parent, through doc-id", () => {
  assert.deepEqual(
    [
      "task.200.slug.md",
      "story.1.8.2.slug.md",
      "epic.1.4.slug.md",
      "bug.18.slug.md",
      "task.67.bug.3.slug.md",
      "story.1.8.2.bug.1.slug.md",
      "docs/tasks/task.5.x/task.5.review.2.x.md",
    ].map((f) => {
      const w = workItemOf(f);
      return [w.id, w.parent, w.isBug];
    }),
    [
      ["task.200", null, false],
      ["story.1.8.2", null, false],
      ["epic.1.4", null, false],
      ["bug.18", null, true],
      ["task.67.bug.3", "task.67", true],
      ["story.1.8.2.bug.1", "story.1.8.2", true],
      ["task.5", null, false],
    ],
  );
  assert.equal(workItemOf("README.md"), null);
  assert.equal(workItemOf(""), null);
});

// [branch, document, names the work item?]
const TABLE = [
  // each kind on its own branch
  [
    "feature/task.200.tracker-side-effects",
    "task.200.tracker-side-effects.md",
    true,
  ],
  ["feature/story.1.8.2.configure-pipe", "story.1.8.2.configure-pipe.md", true],
  ["feature/epic.1.4.feature-ui", "epic.1.4.feature-ui.md", true],
  ["bugfix/bug.17.control-escapes", "bug.17.control-escapes.md", true],
  ["bugfix/task.110.bug.1.whitelist", "task.110.bug.1.whitelist.md", true],
  ["bugfix/story.1.8.2.bug.1.x", "story.1.8.2.bug.1.x.md", true],
  // a QA bug on its parent's branch, and the real hyphenated shape
  ["feature/task.67.some-task", "task.67.bug.3.x.md", true],
  ["feature/story.1.8.2.configure-pipe", "story.1.8.2.bug.1.x.md", true],
  ["bugfix/task.144-cli-decline", "task.144.bug.2.x.md", true],
  ["feature/task.144", "task.144.x.md", true],
  // hotfix carries no id: a bug only
  ["hotfix/v1.2.1", "bug.3.x.md", true],
  ["hotfix/v1.2.1", "task.67.bug.3.x.md", true],
  ["hotfix/v1.2.1", "task.3.x.md", false],
  ["hotfix/v1.2.1", "story.1.8.2.x.md", false],
  // a story on its epic's integration branch (default pattern)
  ["epic/1.4.feature-ui", "story.1.4.2.x.md", true],
  ["epic/1.4.feature-ui", "story.1.4.2.bug.1.x.md", true],
  // unrelated branches
  ["feature/task.99.other", "task.200.x.md", false],
  ["feature/task.99.other", "story.1.4.2.x.md", false],
  ["epic/1.40.other", "story.1.4.2.x.md", false],
  ["epic/2.4.other", "story.1.4.2.x.md", false],
  ["epic/1.4.feature-ui", "task.14.x.md", false],
  ["1.4.feature-ui", "story.1.4.2.x.md", false],
  ["feature/epic.1.4.feature-ui", "story.1.4.2.x.md", false],
  ["develop", "task.200.x.md", false],
  // control case (obs #176): an id that is a prefix of another id
  ["feature/task.200.x", "task.20.x.md", false],
  ["feature/task.20.x", "task.200.x.md", false],
  ["bugfix/bug.170.x", "bug.17.x.md", false],
  // a bug branch names that bug alone: not its parent's own document, not a sibling bug
  // (task.200 QA cycle 2, TASK-200-007) — and a sibling whose number extends this one's
  ["bugfix/task.67.bug.4.x", "task.67.bug.3.x.md", false],
  ["bugfix/task.67.bug.4.x", "task.67.some-task.md", false],
  ["bugfix/story.1.8.2.bug.1.x", "story.1.8.2.bug.2.x.md", false],
  ["bugfix/story.1.8.2.bug.1.x", "story.1.8.2.configure-pipe.md", false],
  ["bugfix/task.67.bug.30.x", "task.67.bug.3.x.md", false],
  ["bugfix/task.67.bug.3", "task.67.bug.3.x.md", true],
  ["feature/story.1.8.20.x", "story.1.8.2.x.md", false],
  // nothing to compare
  ["", "task.200.x.md", false],
  ["feature/task.200.x", "notes.md", false],
];

for (const [branch, doc, want] of TABLE) {
  test(`branchNamesWorkItem(${JSON.stringify(branch)}, ${doc}) → ${want}`, () => {
    assert.equal(branchNamesWorkItem(branch, doc), want);
  });
}

test("a declared integration branch counts for a story, and only for a story", () => {
  const opts = { integrationBranch: "epic/feature-ui" };
  assert.equal(
    branchNamesWorkItem("epic/feature-ui", "story.1.4.2.x.md", opts),
    true,
  );
  assert.equal(
    branchNamesWorkItem("epic/feature-ui", "story.1.4.2.x.md"),
    false,
  );
  assert.equal(
    branchNamesWorkItem("epic/feature-ui", "task.4.x.md", opts),
    false,
  );
});

test("resolveDocLinkBranch: explicit → configured → upstream if it names the item → default", () => {
  const base = {
    upstream: "feature/task.200.x",
    defaultBranch: "develop",
    docPath: "task.200.x.md",
  };
  assert.equal(
    resolveDocLinkBranch({
      ...base,
      explicit: "release/v2",
      configured: "main",
    }),
    "release/v2",
  );
  assert.equal(
    resolveDocLinkBranch({ ...base, explicit: "   ", configured: "main" }),
    "main",
  );
  assert.equal(resolveDocLinkBranch(base), "feature/task.200.x");
  assert.equal(
    resolveDocLinkBranch({ ...base, upstream: "feature/task.99.other" }),
    "develop",
  );
  // detached HEAD / no upstream
  assert.equal(resolveDocLinkBranch({ ...base, upstream: null }), "develop");
  // no document: nothing can be named, so the default
  assert.equal(
    resolveDocLinkBranch({ ...base, docPath: undefined }),
    "develop",
  );
});

test("integrationBranchOf reads the declaring epic above the story, and nothing else", () => {
  const root = mkdtempSync(join(tmpdir(), "dlb-epic-"));
  try {
    const epicDir = join(root, "prd.1.x", "epics", "epic.1.4.feature-ui");
    const storyDir = join(epicDir, "stories", "story.1.4.2.thing");
    mkdirSync(storyDir, { recursive: true });
    const story = join(storyDir, "story.1.4.2.thing.md");
    writeFileSync(story, "---\ntype: story\n---\n");
    writeFileSync(
      join(epicDir, "epic.1.4.feature-ui.md"),
      "---\ntype: epic\nbranch_model: epic-integration\nintegration_branch: epic/ui-whole\n---\n",
    );
    assert.equal(integrationBranchOf(story), "epic/ui-whole");
    assert.equal(
      integrationBranchOf(join(storyDir, "story.1.4.2.bug.1.x.md")),
      "epic/ui-whole",
    );
    // another epic's story under the same directory reads nothing
    assert.equal(integrationBranchOf(join(storyDir, "story.1.5.1.x.md")), "");
    assert.equal(integrationBranchOf(join(root, "task.3.x.md")), "");
    writeFileSync(
      join(epicDir, "epic.1.4.feature-ui.md"),
      "---\ntype: epic\n---\n",
    );
    assert.equal(integrationBranchOf(story), "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCli: the default branch is asked for only when it is the answer", () => {
  let asked = 0;
  const deps = (up) => ({
    upstream: () => up,
    defaultBranch: () => {
      asked++;
      return "main";
    },
    integrationBranch: () => "",
  });
  assert.equal(
    runCli(["--doc", "task.200.x.md"], deps("feature/task.200.x")).payload
      .branch,
    "feature/task.200.x",
  );
  assert.equal(asked, 0, "a matching upstream needs no default");
  assert.equal(
    runCli(["--doc", "task.200.x.md"], deps("feature/task.9.y")).payload.branch,
    "main",
  );
  assert.equal(asked, 1);
  assert.equal(
    runCli(
      ["--doc", "task.200.x.md", "--default", "develop"],
      deps("feature/task.9.y"),
    ).payload.branch,
    "develop",
  );
  assert.equal(asked, 1, "a given --default needs no lookup");
  assert.equal(
    runCli(
      ["--doc", "task.200.x.md", "--explicit", "develop"],
      deps("feature/task.9.y"),
    ).payload.branch,
    "develop",
  );
  assert.equal(
    runCli(
      ["--doc", "task.200.x.md", "--explicit", ""],
      deps("feature/task.200.x"),
    ).payload.branch,
    "feature/task.200.x",
  );
  assert.equal(asked, 1);
});

test("runCli: usage errors exit 2", () => {
  assert.equal(runCli([]).exitCode, 2);
  assert.equal(runCli(["--doc"]).exitCode, 2);
  assert.equal(runCli(["--doc", "x.md", "--bogus"]).exitCode, 2);
});

function sh(cmd, args, opts) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: ${r.stderr}`);
  return r.stdout;
}

test("CLI in a repo with an upstream, gh stubbed: one gh call without --default, none with", () => {
  const root = mkdtempSync(join(tmpdir(), "dlb-cli-"));
  try {
    const remote = join(root, "remote.git");
    const repo = join(root, "repo");
    const bin = join(root, "bin");
    const ghLog = join(root, "gh.log");
    mkdirSync(bin);
    writeFileSync(
      join(bin, "gh"),
      `#!/bin/sh\necho call >> "${ghLog}"\necho main\n`,
    );
    chmodSync(join(bin, "gh"), 0o755);
    writeFileSync(ghLog, "");
    sh("git", ["init", "-q", "--bare", remote]);
    sh("git", ["init", "-q", "-b", "develop", repo]);
    const git = (...a) => sh("git", ["-C", repo, ...a]);
    git(
      "-c",
      "user.email=t@t",
      "-c",
      "user.name=t",
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      "init",
    );
    git("remote", "add", "origin", remote);
    git("checkout", "-q", "-b", "feature/task.99.unrelated");
    git("push", "-q", "-u", "origin", "feature/task.99.unrelated");
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
    const run = (...a) =>
      spawnSync(process.execPath, [SCRIPT, ...a], {
        cwd: repo,
        env,
        encoding: "utf8",
      });

    let r = run("--doc", "docs/tasks/task.200.x/task.200.x.md");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      r.stdout,
      "main\n",
      "an unrelated upstream falls back to gh's default",
    );
    assert.equal(
      readFileSync(ghLog, "utf8").split("\n").filter(Boolean).length,
      1,
    );

    r = run(
      "--doc",
      "docs/tasks/task.200.x/task.200.x.md",
      "--default",
      "develop",
    );
    assert.equal(r.stdout, "develop\n");
    assert.equal(
      readFileSync(ghLog, "utf8").split("\n").filter(Boolean).length,
      1,
      "--default makes no gh call",
    );

    r = run("--doc", "docs/tasks/task.99.unrelated/task.99.unrelated.md");
    assert.equal(
      r.stdout,
      "feature/task.99.unrelated\n",
      "the document's own branch is kept, remote name stripped",
    );

    r = run();
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--doc is required/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
