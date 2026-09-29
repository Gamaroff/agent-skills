// status-history-cli.test.mjs — the status-history.js CLI's `reason` contract and
// its Title Case status normalisation (task.152, obs #148 E2E-3/E2E-4).
//
// The module API (upsertStatusHistory, fmtEntry) is sync-jira-bug's and is not
// changed; these tests drive the CLI the way finalise 7.3 / 8.3 and
// ensure-bug-github-issue call it — as a spawned process, by path.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const CLI = path.join(REPO_ROOT, "shared", "resources", "status-history.js");
const TEMPLATE = fs.readFileSync(
  path.join(
    REPO_ROOT,
    "skills/create-bug-report/assets/bug-report-template.md",
  ),
  "utf8",
);
const require = createRequire(import.meta.url);
const SH = require(CLI);

const run = (args) =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });

function withBug(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "status-history-cli-"));
  const file = path.join(dir, "bug.14.x.md");
  fs.writeFileSync(file, TEMPLATE);
  try {
    fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const row = (file, status, notes = "DoD verified") => [
  "--file",
  file,
  "--date",
  "2026-09-26",
  "--status",
  status,
  "--changed-by",
  "finalise",
  "--notes",
  notes,
];

// `upsertStatusHistory` APPENDS — it has no dedupe — so writing the same row twice
// writes it twice and reports `updated` both times. `unchanged` is the CLI's
// answer only when the writer returns the content untouched, which the current
// writer never does. Asserted as it is, not as the task first described it
// (task.152 plan § Phase 3: "assert what it actually does, and state that").
test("--json prints reason `updated` with exit 0; a repeated identical row is appended again, not deduplicated", () => {
  withBug((file) => {
    const r = run([...row(file, "in-progress"), "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), {
      reason: "updated",
      exitCode: 0,
      file,
      status: "In Progress",
    });
    const r2 = run([...row(file, "in-progress"), "--json"]);
    assert.equal(r2.status, 0, r2.stderr);
    assert.equal(JSON.parse(r2.stdout).reason, "updated");
    const rows = fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => l.startsWith("| 2026-09-26 | In Progress |"));
    assert.equal(rows.length, 2, "the engine appends; it does not dedupe");
  });
});

test("without --json the CLI still prints the bare word (the existing call sites read nothing else)", () => {
  withBug((file) => {
    const r = run(row(file, "new", "first"));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "updated\n");
  });
});

test("an unknown flag is a usage error: exit 2, reason `usage`, nothing written", () => {
  withBug((file) => {
    const before = fs.readFileSync(file, "utf8");
    const r = run([...row(file, "new"), "--bogus", "--json"]);
    assert.equal(r.status, 2);
    const j = JSON.parse(r.stdout);
    assert.equal(j.reason, "usage");
    assert.equal(j.exitCode, 2);
    assert.match(j.error, /Unknown option: --bogus/);
    assert.match(r.stderr, /Unknown option: --bogus/);
    assert.equal(fs.readFileSync(file, "utf8"), before);
  });
});

test("a missing --file, a flag with no operand and an unreadable file are all exit 2", () => {
  const noFile = run(["--status", "new", "--json"]);
  assert.equal(noFile.status, 2);
  assert.match(JSON.parse(noFile.stdout).error, /--file is required/);

  withBug((file) => {
    const noOperand = run(["--file", file, "--status", "--json"]);
    assert.equal(noOperand.status, 2);
    assert.match(
      JSON.parse(noOperand.stdout).error,
      /--status needs an operand/,
    );
  });

  const missing = run([
    "--file",
    "/nonexistent/bug.md",
    "--status",
    "new",
    "--json",
  ]);
  assert.equal(missing.status, 2);
  assert.match(JSON.parse(missing.stdout).error, /cannot read/);

  // Without --json a usage error prints nothing to stdout — the JSON line is
  // only for a caller that asked for it.
  const plain = run(["--bogus"]);
  assert.equal(plain.status, 2);
  assert.equal(plain.stdout, "");
});

test("each of the five lifecycle tokens is written in Title Case", () => {
  const cases = {
    new: "New",
    "in-progress": "In Progress",
    "ready-for-qa": "Ready for QA",
    closed: "Closed",
    reopened: "Reopened",
  };
  for (const [token, title] of Object.entries(cases)) {
    withBug((file) => {
      const r = run([...row(file, token, `row for ${token}`), "--json"]);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(JSON.parse(r.stdout).status, title);
      assert.match(
        fs.readFileSync(file, "utf8"),
        new RegExp(
          `\\| 2026-09-26 \\| ${title} \\| finalise \\| row for ${token} \\|`,
        ),
        `${token} → ${title} in the written row`,
      );
    });
  }
});

test("a status outside the lifecycle passes through unchanged", () => {
  withBug((file) => {
    const r = run([...row(file, "Blocked", "odd one"), "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).status, "Blocked");
    assert.match(
      fs.readFileSync(file, "utf8"),
      /\| 2026-09-26 \| Blocked \| finalise \| odd one \|/,
    );
  });
});

test("normaliseStatus is exported, maps case-insensitively, and the module writer does not normalise", () => {
  assert.equal(SH.normaliseStatus("READY-FOR-QA"), "Ready for QA");
  assert.equal(SH.normaliseStatus(" closed "), "Closed");
  assert.equal(SH.normaliseStatus("Won't Fix"), "Won't Fix");
  const out = SH.upsertStatusHistory(TEMPLATE, {
    date: "2026-09-26",
    status: "in-progress",
    changedBy: "x",
    notes: "module path",
  });
  assert.match(
    out,
    /\| in-progress \| x \| module path \|/,
    "module API writes what it is given",
  );
});

test("the CLI sets process.exitCode and never calls process.exit()", () => {
  // Comment lines name the rule; only code is held to it.
  const code = fs
    .readFileSync(CLI, "utf8")
    .split("\n")
    .filter((l) => !/^\s*\/\//.test(l))
    .join("\n");
  assert.doesNotMatch(code, /process\.exit\(/);
  assert.match(code, /process\.exitCode = main\(process\.argv\)/);
});
