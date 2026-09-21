"use strict";
/**
 * ensure-bug-github-issue Step B5 — a label the repository lacks never fails
 * the create, and the frontmatter's case never reaches gh (task.125, obs #65).
 *
 * The block under test is PROSE: the fenced bash in
 * `skills/ensure-bug-github-issue/SKILL.md` that builds LABEL_ARGS and runs the
 * create. It is extracted from the file and executed under bash with a fake
 * `gh` (lowercase `priority:*` labels only, no `severity:*`) and a fake `node`
 * that records the argv `tracker-issue.js` received and prints an issue
 * number. Asserting on the SKILL.md text would prove the string exists, not
 * that the block works; task.84 caught 0 of 27 defects that way.
 *
 * Mutation proofs: revert the `tr '[:upper:]' '[:lower:]'` → the argv carries
 * `priority:High` (red); drop the existence check → `severity:major` reaches
 * the create (red); drop the empty-REPO_LABELS pass-through → a failed
 * `gh label list` strips every label (red).
 */
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const SKILL = path.join(
  REPO_ROOT,
  "skills",
  "ensure-bug-github-issue",
  "SKILL.md",
);

const DIRS = [];
after(() => {
  for (const d of DIRS) fs.rmSync(d, { recursive: true, force: true });
});

// The one fenced bash block that builds LABEL_ARGS — from the `REPO_LABELS=`
// line to the end of the create call, so the heredoc above it (which needs the
// document's own values) is not executed.
function labelBlock() {
  const text = fs.readFileSync(SKILL, "utf8");
  const blocks = [];
  let open = null;
  for (const l of text.split("\n")) {
    if (open === null) {
      if (/^\s*```bash\b/.test(l)) open = [];
    } else if (/^\s*```\s*$/.test(l)) {
      blocks.push(open.join("\n"));
      open = null;
    } else open.push(l);
  }
  const b = blocks.find(
    (t) => t.includes("REPO_LABELS=") && t.includes("BUG_ISSUE_NUM=$("),
  );
  assert.ok(
    b,
    "SKILL.md carries the fenced block that builds LABEL_ARGS and runs the create",
  );
  const start = b.indexOf("REPO_LABELS=");
  return b.slice(start);
}

function runBlock({ labels, ghLabelListExit = 0, env = {} }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bug-labels-"));
  DIRS.push(dir);
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(dir, "references"));
  fs.writeFileSync(path.join(dir, "references", "tracker-issue.js"), "");
  fs.mkdirSync(path.join(dir, ".claude", "state"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude", "state", "issue-body.md"),
    "body\n",
  );
  fs.writeFileSync(
    path.join(bin, "gh"),
    [
      "#!/bin/sh",
      `if [ "$1 $2" = "label list" ]; then`,
      `  [ ${ghLabelListExit} -eq 0 ] || exit ${ghLabelListExit}`,
      ...labels.map((l) => `  echo ${JSON.stringify(l)}`),
      "  exit 0",
      "fi",
      "exit 1",
    ].join("\n"),
    { mode: 0o755 },
  );
  // A `node` shim: records the argv tracker-issue.js was given, prints a number.
  fs.writeFileSync(
    path.join(bin, "node"),
    ["#!/bin/sh", `printf '%s\\n' "$@" > "${dir}/argv.log"`, "echo 207"].join(
      "\n",
    ),
    { mode: 0o755 },
  );
  const script = `${labelBlock()}\necho "BUG_ISSUE_NUM=$BUG_ISSUE_NUM"`;
  const r = spawnSync("bash", ["-c", script], {
    cwd: dir,
    encoding: "utf8",
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      PRIORITY: "High",
      SEVERITY: "Major",
      BUG_ID: "bug.99",
      BUG_TITLE: "t",
      ...env,
    },
  });
  const argv = fs.existsSync(path.join(dir, "argv.log"))
    ? fs
        .readFileSync(path.join(dir, "argv.log"), "utf8")
        .split("\n")
        .filter(Boolean)
    : null;
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, argv };
}

function labelsIn(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i++)
    if (argv[i] === "--label") out.push(argv[i + 1]);
  return out;
}

test("lowercase priority reaches the create; the absent severity label is skipped with a warning; the create runs", () => {
  const r = runBlock({
    labels: ["bug", "priority:high", "priority:medium", "task"],
  });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.argv, "tracker-issue.js was invoked");
  assert.deepEqual(labelsIn(r.argv), ["bug", "priority:high"]);
  assert.match(
    r.stderr,
    /label 'severity:major' is not defined in this repository — skipped/,
  );
  assert.match(r.stdout, /BUG_ISSUE_NUM=207/);
});

test("the frontmatter's case never reaches gh — High → high, Major → major", () => {
  const r = runBlock({ labels: ["bug", "priority:high", "severity:major"] });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(labelsIn(r.argv), [
    "bug",
    "priority:high",
    "severity:major",
  ]);
  assert.doesNotMatch(r.stderr, /skipped/);
});

test("a label the repo lacks never fails the create — even `bug` itself", () => {
  const r = runBlock({ labels: ["enhancement"] });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(
    labelsIn(r.argv),
    [],
    "no label survives, the create still runs",
  );
  assert.match(r.stdout, /BUG_ISSUE_NUM=207/);
  assert.equal((r.stderr.match(/skipped/g) || []).length, 3);
});

test("when `gh label list` fails, every normalised label is passed through unchecked rather than stripped", () => {
  const r = runBlock({ labels: [], ghLabelListExit: 4 });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(labelsIn(r.argv), [
    "bug",
    "priority:high",
    "severity:major",
  ]);
});

test("an empty severity or priority field produces no label, not `severity:`", () => {
  const r = runBlock({
    labels: ["bug", "priority:high"],
    env: { SEVERITY: "" },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(labelsIn(r.argv), ["bug", "priority:high"]);
  assert.doesNotMatch(r.stderr, /severity:/);
});
