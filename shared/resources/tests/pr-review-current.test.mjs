/**
 * Behavioural tests for `pr-review-current.js` — which PR review report /qa-fix may still ingest.
 *
 * The defect: the findings ingester took the highest-numbered `*.pr-review.*.md` on every qa-fix
 * call, so a REQUEST CHANGES report whose findings a 5b pass had already fixed was re-read as open
 * HIGH work on every later cycle. Every test RUNS the CLI against a throwaway work-item directory.
 *
 * Run via: node --test shared/resources/tests/pr-review-current.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, "..", "pr-review-current.js");

function workItem(files) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "pr-review-current-"));
  for (const [name, body] of Object.entries(files))
    writeFileSync(path.join(dir, name), body);
  return dir;
}

function run(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf-8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function select(dir) {
  const r = run(["--dir", dir, "--json"]);
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

const report = (reviewedGate) =>
  [
    "# PR Review Report: PR #1 — x",
    "",
    "## Machine-Readable Findings",
    "",
    "```yaml",
    ...(reviewedGate === undefined ? [] : [`reviewed_gate: ${reviewedGate}`]),
    "findings:",
    "  - id: CR-1",
    "    severity: high",
    "truncated_count: 0",
    "```",
    "",
  ].join("\n");

const GATE = "gate: PASS\n";

test("a report that read the newest gate is current", (t) => {
  const dir = workItem({
    "task.9.gate.2.second.yml": GATE,
    "task.9.pr-review.1.x.md": report('"task.9.gate.2.second.yml"'),
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const out = select(dir);
  assert.equal(out.reason, "current");
  assert.equal(out.report, path.join(dir, "task.9.pr-review.1.x.md"));
});

test("a newer gate supersedes the report — its fixed findings are not re-ingested", (t) => {
  // The REQUEST CHANGES → 5b → 5a path: the report read gate 2, the next cycle wrote gate 3.
  const dir = workItem({
    "task.9.gate.2.second.yml": GATE,
    "task.9.gate.3.third.yml": GATE,
    "task.9.pr-review.1.x.md": report("task.9.gate.2.second.yml"),
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const out = select(dir);
  assert.equal(out.reason, "superseded");
  assert.equal(out.report, null);
  assert.equal(
    out.superseded_report,
    path.join(dir, "task.9.pr-review.1.x.md"),
  );
  assert.equal(out.latest_gate, "task.9.gate.3.third.yml");
  // Text mode prints nothing, so a `$(…)` caller binds an empty path.
  assert.equal(run(["--dir", dir]).stdout, "");
});

test("gates compare by number, not by path sort (gate.10 is newer than gate.9)", (t) => {
  const dir = workItem({
    "task.9.gate.9.a.yml": GATE,
    "task.9.gate.10.b.yml": GATE,
    "task.9.pr-review.1.x.md": report("task.9.gate.10.b.yml"),
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.equal(select(dir).reason, "current");
});

test("only the newest report is considered", (t) => {
  const dir = workItem({
    "task.9.gate.3.c.yml": GATE,
    "task.9.pr-review.1.x.md": report("task.9.gate.1.a.yml"),
    "task.9.pr-review.2.x.md": report("task.9.gate.3.c.yml"),
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const out = select(dir);
  assert.equal(out.reason, "current");
  assert.equal(out.report, path.join(dir, "task.9.pr-review.2.x.md"));
});

test("reviewed_gate: none is current until a gate appears", (t) => {
  const dir = workItem({ "task.9.pr-review.1.x.md": report("none") });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.equal(select(dir).reason, "current");
  writeFileSync(path.join(dir, "task.9.gate.1.a.yml"), GATE);
  assert.equal(select(dir).reason, "superseded");
});

test("a report without reviewed_gate is legacy and still ingested", (t) => {
  // Dropping findings on a guess is the worse error: a legacy report keeps the old behaviour.
  const noKey = workItem({
    "task.9.gate.5.a.yml": GATE,
    "task.9.pr-review.1.x.md": report(undefined),
  });
  const noBlock = workItem({
    "task.9.gate.5.a.yml": GATE,
    "task.9.pr-review.1.x.md": "# old\n\n[CR-1] bug · high\n",
  });
  t.after(() =>
    [noKey, noBlock].forEach((d) =>
      rmSync(d, { recursive: true, force: true }),
    ),
  );
  for (const dir of [noKey, noBlock]) {
    const out = select(dir);
    assert.equal(out.reason, "legacy");
    assert.ok(out.report, "a legacy report is still returned");
  }
});

test("no report → none", (t) => {
  const dir = workItem({ "task.9.gate.1.a.yml": GATE });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.equal(select(dir).reason, "none");
});

test("a missing directory is a usage error, exit 2", () => {
  const r = run([
    "--dir",
    path.join(os.tmpdir(), "does-not-exist-pr-review-current"),
    "--json",
  ]);
  assert.equal(r.status, 2);
  assert.equal(JSON.parse(r.stdout).reason, "usage");
  assert.equal(run([]).status, 2);
});
