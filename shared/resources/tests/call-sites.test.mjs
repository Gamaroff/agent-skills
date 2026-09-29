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
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { loadSensitive } from "../spawn-budget.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const CLI = path.join(REPO_ROOT, "shared", "resources", "call-sites.js");
const { ENGINES, collect } = require(CLI);

const CALL =
  "node .agents/skills/x/references/tracker-comment.js --issue 1 --stage review --json";

// The source-tree marker: shared/resources/ beside a skills/*/SKILL.md. A tree
// without it is `no-roots` (QA cycle 2, C2-CR-1).
const MARKER = { "skills/marker/SKILL.md": "# marker\n" };

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
  const root = buildTree({
    "shared/resources/none.md": "nothing here\n",
    ...MARKER,
  });
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

test("live tree: the CLI serialises exactly what collect() returns, from the repo top", () => {
  // What this proves is narrow, and says so (QA cycle 1, CR-7): the guard
  // (comment-slot-coverage.test.mjs) imports collect(), so the two cannot
  // disagree about the SHAPES — that is structural, not tested here. This
  // catches the other half: the CLI's root resolution and JSON serialisation
  // reporting a different population from the function it wraps. Floors are the
  // guard's own.
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

// ── QA cycle 1 fixes ────────────────────────────────────────────────────────

test("CR-1: an explicit --root inside a git work tree is measured as given, not widened", () => {
  // A tree exported for an earlier commit can sit anywhere — including inside
  // this checkout. Resolving --root to the enclosing top level reported the
  // CURRENT tree as `ok`.
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "call-sites-repo-"));
  try {
    assert.equal(spawnSync("git", ["init", "-q"], { cwd: repo }).status, 0);
    // The enclosing repo carries two sites; the export inside it carries one.
    fs.mkdirSync(path.join(repo, "shared", "resources"), { recursive: true });
    fs.writeFileSync(
      path.join(repo, "shared", "resources", "a.md"),
      "```bash\n" + CALL + "\n" + CALL + "\n```\n",
    );
    const exported = path.join(repo, "export", "shared", "resources");
    fs.mkdirSync(exported, { recursive: true });
    fs.writeFileSync(
      path.join(exported, "b.md"),
      "```bash\n" + CALL + "\n```\n",
    );
    // Both trees carry the source-tree marker (a skills/*/SKILL.md).
    for (const base of [repo, path.join(repo, "export")]) {
      fs.mkdirSync(path.join(base, "skills", "m"), { recursive: true });
      fs.writeFileSync(path.join(base, "skills", "m", "SKILL.md"), "# m\n");
    }
    const j = JSON.parse(
      runCli([
        "--engine",
        "tracker-comment",
        "--root",
        path.join(repo, "export"),
        "--json",
      ]).stdout,
    );
    assert.equal(j.root, path.join(repo, "export"));
    assert.equal(
      j.count,
      1,
      "the export's one site, not the enclosing repo's two",
    );
    // With no --root, from inside the repo, the top level is still found.
    const top = JSON.parse(
      runCli(["--engine", "tracker-comment", "--json"], {
        cwd: path.join(repo, "shared"),
      }).stdout,
    );
    assert.equal(fs.realpathSync(top.root), fs.realpathSync(repo));
    assert.equal(
      top.count,
      2,
      "the enclosing repo's own two — export/ is not one of its roots",
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('CR-2: `node "$VAR"` is a site when VAR may hold the engine\'s path in that function', () => {
  // The setup-consumer.sh shape: one variable, set per branch, run once — and a
  // later function that reuses the name for a different CLI.
  const script = [
    "init_workflow() {",
    '  if [[ "$TRACKER" == jira ]]; then',
    '    _cli=".agents/skills/develop-task/references/jira-stage.js"',
    "  else",
    '    _cli=".agents/skills/develop-task/references/gh-stage.js"',
    "  fi",
    '  _out=$(node "$_cli" --init-workflow --json 2>/dev/null) || true',
    "}",
    "",
    "resolve_set() {",
    '  local _cli="${_tmpdir}/shared/resources/resolve-skill-set-cli.mjs"',
    '  _out=$(node "$_cli" "${_args[@]}"); _rc=$?',
    "}",
    'node "${UNRELATED}" --stage done',
    "",
  ].join("\n");
  const root = buildTree({ "scripts/setup.sh": script });
  try {
    for (const engine of ["gh-stage", "jira-stage"]) {
      const sites = collect({ engine, root }).map((s) => `${s.file}:${s.line}`);
      assert.deepEqual(
        sites,
        ["scripts/setup.sh:7"],
        `${engine}: both branches reach line 7, and only line 7`,
      );
    }
    assert.deepEqual(collect({ engine: "tracker-comment", root }), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("CR-2: the live tree counts setup-consumer.sh's engine call under both engines", () => {
  for (const engine of ["gh-stage", "jira-stage"]) {
    const lines = collect({ engine, root: REPO_ROOT })
      .filter((s) => s.file === "scripts/setup-consumer.sh")
      .map((s) => s.text);
    assert.equal(
      lines.length,
      1,
      `${engine}: expected the one --init-workflow call, got ${lines.length}`,
    );
    assert.match(lines[0], /--init-workflow/);
  }
});

test("CR-4: a tree with none of the roots is `no-roots`, exit 1 — never a zero", () => {
  const root = buildTree({
    ".agents/skills/x/references/tracker-comment.js": "x\n",
  });
  try {
    const r = runCli(["--engine", "tracker-comment", "--root", root, "--json"]);
    assert.equal(r.code, 1);
    const j = JSON.parse(r.stdout);
    assert.equal(j.reason, "no-roots");
    assert.equal(j.count, undefined, "no-roots reports no number");
    assert.match(
      runCli(["--engine", "tracker-comment", "--root", root]).stdout,
      /^no-roots call-sites:/m,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("CR-5: `--engine gh-stage.js` is accepted as `gh-stage`", () => {
  const a = JSON.parse(
    runCli(["--engine", "gh-stage.js", "--root", FIXTURE, "--json"]).stdout,
  );
  const b = JSON.parse(
    runCli(["--engine", "gh-stage", "--root", FIXTURE, "--json"]).stdout,
  );
  assert.equal(a.engine, "gh-stage");
  assert.deepEqual(a.sites, b.sites);
});

test("CR-6: a directory named like a source, or a dangling symlink, is skipped — not thrown", () => {
  const root = buildTree({
    "shared/resources/real.md": "```bash\n" + CALL + "\n```\n",
    ...MARKER,
  });
  try {
    fs.mkdirSync(path.join(root, "shared", "resources", "dir.md"));
    fs.mkdirSync(path.join(root, "skills", "alpha", "references", "sub.md"), {
      recursive: true,
    });
    fs.symlinkSync(
      path.join(root, "nowhere.sh"),
      path.join(root, "shared", "resources", "dangling.sh"),
    );
    const r = runCli(["--engine", "tracker-comment", "--root", root, "--json"]);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(
      JSON.parse(r.stdout).sites.map((s) => s.file),
      ["shared/resources/real.md"],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ── QA cycle 2 — the contract, defined once in REASONS ──────────────────────

const { REASONS } = require(CLI);

test("REASONS: every non-zero exit code belongs to exactly one reason", () => {
  const nonZero = Object.entries(REASONS).filter(([, r]) => r.exitCode !== 0);
  const codes = nonZero.map(([, r]) => r.exitCode);
  assert.equal(
    new Set(codes).size,
    codes.length,
    `shared codes: ${JSON.stringify(nonZero)}`,
  );
  assert.equal(
    REASONS["no-roots"].exitCode,
    1,
    "exit 1 is no-roots — the create-task and review prose act on it",
  );
});

test("REASONS: every row is driven, and the exit code is the table's", async () => {
  // One driver per row, and the driver set IS the table's key set: a row with
  // no driver is a promise the table makes and nothing checks, which is what
  // this test's first version left for internal-error and unreadable (QA cycle
  // 3, C3-CR-2). The CLI-level rows run a child; the two that need a fault run
  // main() in-process with one fs/path method stubbed, so neither depends on
  // file permissions (a root-run CI would skip a chmod-based driver).
  const consumer = buildTree({
    "scripts/build.sh": "echo hi\n",
    ".agents/skills/x/SKILL.md": "# x\n",
  });
  const emptyTree = buildTree({ "shared/resources/none.md": "x\n", ...MARKER });
  const { main } = require(CLI);
  const nodeFs = require("node:fs");
  const nodePath = require("node:path");

  // In-process: stub, capture stdout, restore — always.
  const inProcess = (args, stub) => {
    const writes = [];
    const realWrite = process.stdout.write;
    const realErr = process.stderr.write;
    const undo = stub();
    process.stdout.write = (c) => (writes.push(String(c)), true);
    process.stderr.write = () => true;
    try {
      const code = main(args);
      return { code, json: JSON.parse(writes.join("")) };
    } finally {
      process.stdout.write = realWrite;
      process.stderr.write = realErr;
      undo();
    }
  };
  const stubOnce = (obj, key, fn) => () => {
    const real = obj[key];
    obj[key] = fn(real);
    return () => (obj[key] = real);
  };

  // A child whose stdout the parent closes before the child can write.
  const closedEarly = () =>
    new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        [CLI, "--engine", "tracker-comment", "--root", FIXTURE, "--json"],
        {
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
      child.stdout.destroy();
      child.on("exit", (code) => resolve(code));
    });

  const drivers = {
    ok: () =>
      runCli(["--engine", "tracker-comment", "--root", FIXTURE, "--json"]),
    empty: () =>
      runCli(["--engine", "gh-stage", "--root", emptyTree, "--json"]),
    "no-roots": () =>
      runCli(["--engine", "gh-stage", "--root", consumer, "--json"]),
    usage: () => runCli(["--engine", "toString", "--json"]),
    unreadable: () =>
      inProcess(
        ["--engine", "tracker-comment", "--root", FIXTURE, "--json"],
        stubOnce(nodeFs, "readdirSync", (real) => (dir, ...rest) => {
          if (
            String(dir).endsWith(`${nodePath.sep}skills`) &&
            !String(dir).endsWith(`references${nodePath.sep}skills`)
          ) {
            const e = new Error("EACCES: permission denied");
            e.code = "EACCES";
            throw e;
          }
          return real(dir, ...rest);
        }),
      ),
    "internal-error": () =>
      inProcess(
        ["--engine", "tracker-comment", "--root", FIXTURE, "--json"],
        stubOnce(nodePath, "relative", () => () => {
          throw new Error("unclassified");
        }),
      ),
    "output-closed": closedEarly,
  };
  try {
    assert.deepEqual(
      Object.keys(drivers).sort(),
      Object.keys(REASONS).sort(),
      "every REASONS row needs a driver",
    );
    for (const [reason, drive] of Object.entries(drivers)) {
      const r = await drive();
      if (reason === "output-closed") {
        assert.equal(r, REASONS[reason].exitCode, `${reason}: exit ${r}`);
        continue;
      }
      const j = r.json ?? JSON.parse(r.stdout);
      assert.equal(j.reason, reason, `${reason}: got ${j.reason}`);
      assert.equal(
        r.code,
        REASONS[reason].exitCode,
        `${reason}: exit ${r.code}`,
      );
      assert.equal(j.exitCode, REASONS[reason].exitCode);
    }
  } finally {
    fs.rmSync(consumer, { recursive: true, force: true });
    fs.rmSync(emptyTree, { recursive: true, force: true });
  }
});

test("C3-CR-3: a --root that exists but cannot be stat'd is unreadable, not usage", () => {
  const { main } = require(CLI);
  const nodeFs = require("node:fs");
  const real = nodeFs.statSync;
  const writes = [];
  const realWrite = process.stdout.write;
  const realErr = process.stderr.write;
  nodeFs.statSync = (p, ...rest) => {
    if (p === FIXTURE) {
      const e = new Error("EACCES");
      e.code = "EACCES";
      throw e;
    }
    return real(p, ...rest);
  };
  process.stdout.write = (c) => (writes.push(String(c)), true);
  process.stderr.write = () => true;
  try {
    const code = main(["--engine", "gh-stage", "--root", FIXTURE, "--json"]);
    assert.equal(JSON.parse(writes.join("")).reason, "unreadable");
    assert.equal(code, REASONS.unreadable.exitCode);
  } finally {
    nodeFs.statSync = real;
    process.stdout.write = realWrite;
    process.stderr.write = realErr;
  }
});

test("C2-CR-1: a consumer install with its own scripts/ is no-roots, not empty", () => {
  const consumer = buildTree({
    "scripts/build.sh": "echo hi\n",
    "skills/README.md": "a consumer folder that happens to be called skills\n",
  });
  try {
    const r = runCli(["--engine", "gh-stage", "--root", consumer, "--json"]);
    assert.equal(JSON.parse(r.stdout).reason, "no-roots");
    assert.equal(r.code, 1);
  } finally {
    fs.rmSync(consumer, { recursive: true, force: true });
  }
});

test("C2-CR-2: a prototype name is an unknown engine (usage, exit 2), never a crash", () => {
  for (const name of [
    "toString",
    "constructor",
    "__proto__",
    "hasOwnProperty",
  ]) {
    const r = runCli(["--engine", name, "--json"]);
    assert.equal(r.code, 2, `${name}: exit ${r.code}\n${r.stderr}`);
    assert.equal(JSON.parse(r.stdout).reason, "usage");
  }
  assert.throws(
    () => collect({ engine: "toString", root: FIXTURE }),
    /unknown engine/,
  );
});

test("C2-CR-5: an unreadable directory is `unreadable` (exit 3), not an empty one", (t) => {
  if (process.getuid && process.getuid() === 0)
    return t.skip("root reads everything");
  const root = buildTree({
    "shared/resources/a.md": "```bash\n" + CALL + "\n```\n",
    ...MARKER,
  });
  const locked = path.join(root, "skills", "locked");
  fs.mkdirSync(path.join(locked, "references"), { recursive: true });
  fs.chmodSync(path.join(locked, "references"), 0o000);
  try {
    const r = runCli(["--engine", "tracker-comment", "--root", root, "--json"]);
    assert.equal(JSON.parse(r.stdout).reason, "unreadable", r.stdout);
    assert.equal(r.code, REASONS.unreadable.exitCode);
  } finally {
    fs.chmodSync(path.join(locked, "references"), 0o755);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ── DoD run 1 gaps (task.129 finalise) ──────────────────────────────────────
// Three success criteria had evidence that was real but not a committed test.
// Each test below is that evidence, run on every PR.

test("AC2: at c69f5115^ the collector returns the two sites task.121's document did not name", (t) => {
  // The worked example the whole check exists for (obs #120). task.121 as
  // reviewed named qa-task, qa-story, qa-fix and the orchestrator's qa-cycle
  // block; the guard's collector found two more in scope. The tree is exported
  // with `git archive` — CI checks out full history (test.yml fetch-depth: 0).
  // A shallow clone cannot answer, and says so rather than passing.
  const shallow = spawnSync("git", ["rev-parse", "--is-shallow-repository"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).stdout.trim();
  if (shallow === "true")
    return t.skip("shallow clone — c69f5115^ is not in history");
  const rev = "c69f5115^";
  assert.equal(
    spawnSync("git", ["rev-parse", "--verify", "-q", `${rev}^{commit}`], {
      cwd: REPO_ROOT,
    }).status,
    0,
    `${rev} is not in this clone's history — the fixture cannot be measured`,
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "call-sites-c69-"));
  try {
    // Only the collector's roots, and the task.121 document the check reads.
    const doc =
      "docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.cycle-scoped-qa-tracker-comments.md";
    const archive = spawnSync(
      "sh",
      [
        "-c",
        `git archive "${rev}" shared/resources skills scripts "${doc}" | tar -x -C "${root}"`,
      ],
      { cwd: REPO_ROOT, encoding: "utf8" },
    );
    assert.equal(archive.status, 0, archive.stderr);

    const r = runCli(["--engine", "tracker-comment", "--root", root, "--json"]);
    assert.equal(r.code, 0, r.stderr);
    const sites = JSON.parse(r.stdout).sites.map(
      (s) => `${s.file}:${s.line} ${s.stage}`,
    );
    const unnamed = [
      "shared/resources/develop-pipeline-step-5-6-qa-loop.md:905 qa-fix-",
      "skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:89 qa-cycle-",
    ];
    for (const site of unnamed) {
      assert.ok(
        sites.includes(site),
        `collector at ${rev} did not return ${site}; got:\n${sites.join("\n")}`,
      );
    }
    // And the document the review read does not name the develop-bug consumer —
    // which is what makes it a finding rather than a confirmation.
    const text = fs.readFileSync(path.join(root, doc), "utf8");
    assert.ok(
      !text.includes("develop-bug-step-5-6-verify-loop"),
      "task.121 at c69f5115^ already names the verify-loop site",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("AC4: the CLI measures the live tree in under 2 s", () => {
  // The success criterion's bound, asserted. Measured at ~0.2 s; the bound is
  // the criterion's, not a tuned one, so load headroom is ~10x.
  const start = process.hrtime.bigint();
  const r = runCli(["--engine", "tracker-comment", "--json"], {
    cwd: REPO_ROOT,
  });
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  assert.equal(r.code, 0, r.stderr);
  assert.ok(
    ms < 2000,
    loadSensitive(
      `call-sites.js took ${ms.toFixed(0)} ms on the live tree (criterion: < 2000 ms)`,
    ),
  );
});

test("AC5: the guard test restates no call-site shape — it imports the collector", () => {
  // One collector, no second enumeration. The guard used to carry its own
  // collectCallSites()/shippedDocs() and two engine regexes; any of them coming
  // back is a second definition of "what a call site is" that can drift from
  // the one the review runs.
  const guard = fs.readFileSync(
    path.join(HERE, "comment-slot-coverage.test.mjs"),
    "utf8",
  );
  assert.match(
    guard,
    /require\([\s\S]{0,80}call-sites\.js/,
    "the guard no longer imports call-sites.js",
  );
  for (const def of ["function collectCallSites", "function shippedDocs"]) {
    assert.ok(
      !guard.includes(def),
      `the guard defines ${def} again — import it from call-sites.js`,
    );
  }
  // A call-site shape is an INVOCATION pattern: every one the collector defines
  // anchors on `node\s+` before the engine's file. The key is that anchor, not
  // the filename — the guard legitimately keeps a regex naming tracker-issue.js
  // for its comment-before-close ordering rule, which is not a call-site shape
  // (a filename key was red at the wrong site on its first run).
  for (const { re } of Object.values(ENGINES)) {
    assert.match(
      re.source,
      /node\\s\+/,
      "every collector shape anchors on node\\s+ — the key below relies on it",
    );
  }
  assert.ok(
    !guard.includes("node\\s+"),
    "the guard carries a `node\\s+` invocation regex — a restated call-site shape",
  );
});
