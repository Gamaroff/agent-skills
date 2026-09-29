/**
 * call-sites.js — the one collector the review skills and the guard tests share
 * (task.129, obs #120).
 *
 * The fixture tree is built per run in a temp directory, one site per root
 * class plus decoys, so each assertion names the root class it is about: a
 * collector that silently stops walking a root reads as "that class is gone"
 * rather than as a count that is merely lower.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const CLI = path.join(REPO_ROOT, "shared", "resources", "call-sites.js");
const { ENGINES, collect } = require(CLI);

const CALL =
  "node .agents/skills/x/references/tracker-comment.js --issue 1 --stage review --json";

// Root class → [relative path, content]. Every entry holds exactly one site.
const ROOT_CLASSES = {
  "shared/resources/*.md": [
    "shared/resources/step.md",
    "```bash\n" + CALL + "\n```\n",
  ],
  "shared/resources/*.sh": [
    "shared/resources/hook.sh",
    `OUT=$(command ${CALL})\n`,
  ],
  "skills/*/SKILL.md": [
    "skills/alpha/SKILL.md",
    "```bash\n  " + CALL + "\n```\n",
  ],
  "un-bannered skills/*/references/*.md": [
    "skills/alpha/references/source-step.md",
    "---\nname: x\n---\n\n```bash\n" + CALL + "\n```\n",
  ],
  "skills/*/scripts/*.sh": ["skills/alpha/scripts/run.sh", CALL + "\n"],
  "scripts/*.sh": ["scripts/tool.sh", CALL + "\n"],
};

// Decoys — none of these is a call site.
const DECOYS = {
  // Bundle output: the banner sits after the frontmatter, past a long description.
  "skills/alpha/references/generated.md":
    `---\nname: g\ndescription: ${"x".repeat(500)}\n---\n<!-- AUTO-GENERATED — DO NOT EDIT. -->\n\n` +
    "```bash\n" +
    CALL +
    "\n```\n",
  // A task document quoting a call is the BEFORE side of a diff.
  "docs/tasks/task.1.x/task.1.x.md": "```bash\n" + CALL + "\n```\n",
  // A sentence mentioning the engine is not an invocation.
  "shared/resources/prose.md":
    "Run `tracker-comment.js` with `--stage review` to post.\n",
  // A shell comment is not an invocation.
  "scripts/commented.sh": `#   ${CALL}\n`,
  // A root-level file outside every root.
  "README.md": CALL + "\n",
};

function buildTree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "call-sites-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return root;
}

function runCli(args, opts = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    ...opts,
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

const FIXTURE = buildTree({
  ...Object.fromEntries(Object.values(ROOT_CLASSES)),
  ...DECOYS,
});
test.after(() => fs.rmSync(FIXTURE, { recursive: true, force: true }));

for (const [cls, [rel]] of Object.entries(ROOT_CLASSES)) {
  test(`root class collected: ${cls}`, () => {
    const files = collect({ engine: "tracker-comment", root: FIXTURE }).map(
      (s) => s.file,
    );
    assert.ok(
      files.includes(rel),
      `the collector did not walk ${cls} — expected a site in ${rel}, found in: ${files.join(", ")}`,
    );
  });
}

test("decoys are not call sites: bannered copy, docs/, prose, shell comment, out-of-root file", () => {
  const files = collect({ engine: "tracker-comment", root: FIXTURE }).map(
    (s) => s.file,
  );
  for (const rel of Object.keys(DECOYS)) {
    assert.ok(
      !files.includes(rel),
      `${rel} was collected but is not a call site`,
    );
  }
  assert.equal(files.length, Object.keys(ROOT_CLASSES).length);
});

test("a multi-line invocation is reassembled before its flags are read", () => {
  const root = buildTree({
    "shared/resources/multi.md":
      "```bash\nnode .agents/skills/x/references/tracker-comment.js \\\n" +
      "  --issue 1 --body-file b.md \\\n" +
      '  --stage "qa-gate-${QA_CYCLE}" \\\n' +
      '  --slot verdict=PASS --slot score="9" \\\n' +
      "  --json\n```\n",
  });
  try {
    const [site] = collect({ engine: "tracker-comment", root });
    assert.equal(site.line, 2);
    assert.equal(
      site.stage,
      "qa-gate-",
      "stage stops at the $ of a shell expansion",
    );
    assert.deepEqual(site.slots, ["verdict", "score"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("stage stops at shell punctuation: `$(node … --stage done)` captures `done`", () => {
  const root = buildTree({
    "shared/resources/p.md":
      "```bash\nLEAD=$(node .agents/skills/x/references/stakeholder-summary-cli.js --stage done)\n```\n",
  });
  try {
    const [site] = collect({ engine: "stakeholder-summary-cli", root });
    assert.equal(site.stage, "done");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("each engine shape matches its own invocations and not another engine's", () => {
  const lines = {
    "tracker-comment":
      "node .agents/skills/a/references/tracker-comment.js --stage review --json",
    "stakeholder-summary-cli":
      "LEAD=$(command node .agents/skills/a/references/stakeholder-summary-cli.js --stage done)",
    "gh-stage":
      "command node .agents/skills/{develop-story|develop-task}/references/gh-stage.js --issue 1 --stage work-started --json",
    "jira-stage":
      "RESULT=$(node .agents/skills/a/references/jira-stage.js --issue K-1 --stage done --json)",
    "tracker-issue":
      "N=$(node references/tracker-issue.js --kind create --title t --json)",
  };
  const root = buildTree({
    "shared/resources/all.md":
      "```bash\n" + Object.values(lines).join("\n") + "\n```\n",
  });
  try {
    assert.deepEqual(Object.keys(ENGINES).sort(), Object.keys(lines).sort());
    for (const engine of Object.keys(lines)) {
      const sites = collect({ engine, root });
      assert.equal(
        sites.length,
        1,
        `${engine}: expected exactly its own line, got ${sites.length}`,
      );
      assert.equal(sites[0].text, lines[engine]);
    }
    assert.equal(collect({ engine: "tracker-issue", root })[0].kind, "create");
    assert.equal(
      collect({ engine: "gh-stage", root })[0].stage,
      "work-started",
    );
    assert.equal(collect({ engine: "tracker-issue", root })[0].stage, null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the general shape admits the wrappers shipped prose puts before `node`", () => {
  // Both shapes are real: develop-pipeline-step-7-finalise.md wraps its close in
  // a retry helper, and sync-github-bug guards its sub-issue link with a test.
  const root = buildTree({
    "shared/resources/w.md":
      "```bash\n" +
      "tracker_call_with_retry node .agents/skills/a/references/tracker-issue.js \\\n" +
      "  --kind close --issue 1\n" +
      '[ -n "${PARENT}" ] && node references/tracker-issue.js --kind sub-issue-link --json\n' +
      "```\n",
  });
  try {
    const kinds = collect({ engine: "tracker-issue", root }).map((s) => s.kind);
    assert.deepEqual(kinds, ["close", "sub-issue-link"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("collect() throws on an unknown engine", () => {
  assert.throws(
    () => collect({ engine: "nope", root: FIXTURE }),
    /unknown engine: nope/,
  );
});

test("CLI: unknown engine, missing operand and a non-directory root are usage errors (exit 2)", () => {
  for (const args of [
    ["--engine", "nope", "--json"],
    ["--engine", "--json"],
    ["--json"],
    [
      "--engine",
      "gh-stage",
      "--root",
      path.join(FIXTURE, "README.md"),
      "--json",
    ],
    ["--engine", "gh-stage", "--bogus"],
  ]) {
    const r = runCli(args);
    assert.equal(r.code, 2, `${args.join(" ")} → exit ${r.code}`);
    if (args.includes("--json"))
      assert.equal(JSON.parse(r.stdout).reason, "usage");
  }
});

test("CLI: a root with no site reports `empty`, exit 0 — never folded into `ok`", () => {
  const root = buildTree({ "shared/resources/none.md": "nothing here\n" });
  try {
    const r = runCli(["--engine", "gh-stage", "--root", root, "--json"]);
    assert.equal(r.code, 0);
    const j = JSON.parse(r.stdout);
    assert.equal(j.reason, "empty");
    assert.equal(j.count, 0);
    const human = runCli(["--engine", "gh-stage", "--root", root]);
    assert.match(human.stdout, /^empty call-sites:/m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("CLI: a non-repository --root is measured as given (an exported tree)", () => {
  const r = runCli([
    "--engine",
    "tracker-comment",
    "--root",
    FIXTURE,
    "--json",
  ]);
  assert.equal(r.code, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(j.reason, "ok");
  assert.equal(
    j.root,
    path.resolve(FIXTURE),
    "outside a repository the root is used as given",
  );
  assert.equal(j.count, Object.keys(ROOT_CLASSES).length);
  for (const s of j.sites) {
    assert.deepEqual(Object.keys(s).sort(), [
      "engine",
      "file",
      "kind",
      "line",
      "slots",
      "stage",
    ]);
  }
});

test("CLI: run from a subdirectory, the root resolves to the repository top level, not the cwd", () => {
  const fromSub = JSON.parse(
    runCli(["--engine", "tracker-comment", "--json"], {
      cwd: path.join(REPO_ROOT, "skills"),
    }).stdout,
  );
  const fromTop = JSON.parse(
    runCli(["--engine", "tracker-comment", "--json"], { cwd: REPO_ROOT })
      .stdout,
  );
  assert.equal(fromSub.count, fromTop.count);
  assert.equal(path.resolve(fromSub.root), path.resolve(fromTop.root));
});

test("live tree: the CLI returns exactly the sites the guard test collects", () => {
  // The guard (comment-slot-coverage.test.mjs) imports collect(); this proves
  // the CLI a reviewer runs reports the same population, so the review and the
  // guard cannot disagree. Floors are the guard's own.
  for (const [engine, floor] of [
    ["tracker-comment", 20],
    ["stakeholder-summary-cli", 9],
  ]) {
    const j = JSON.parse(
      runCli(["--engine", engine, "--json"], { cwd: REPO_ROOT }).stdout,
    );
    const direct = collect({ engine, root: REPO_ROOT }).map(
      ({ text: _t, ...s }) => s,
    );
    assert.deepEqual(j.sites, direct, `${engine}: CLI and collect() disagree`);
    assert.ok(
      j.count >= floor,
      `${engine}: only ${j.count} sites — the walk is probably broken`,
    );
  }
});
