import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as A from "../assertions.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "dt-asrt-"));
}

function writeFile(dir, rel, content) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf-8");
  return full;
}

// ---------------------------------------------------------------------------
// branchExists
// ---------------------------------------------------------------------------

test("branchExists: returns ok when branch matches .eval/branches.json", () => {
  const dir = makeTmpDir();
  writeFile(dir, ".eval/branches.json", JSON.stringify(["develop", "feature/task.42.example"]));
  const r = A.branchExists(dir, "^feature/task\\.42");
  assert.ok(r.ok, r.reason);
});

test("branchExists: returns !ok when branch absent from .eval/branches.json", () => {
  const dir = makeTmpDir();
  writeFile(dir, ".eval/branches.json", JSON.stringify(["develop"]));
  const r = A.branchExists(dir, "^feature/task\\.99");
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("no branch matching"));
});

test("branchExists: returns !ok when file missing and no git repo", () => {
  const dir = makeTmpDir();
  // No .eval/branches.json, not a git repo → git fails → !ok
  const r = A.branchExists(dir, "feature/anything");
  assert.ok(!r.ok);
});

test("branchExists: returns !ok on malformed branches.json", () => {
  const dir = makeTmpDir();
  writeFile(dir, ".eval/branches.json", "{not: valid json");
  const r = A.branchExists(dir, "feature/anything");
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("could not parse"));
});

// ---------------------------------------------------------------------------
// pipelineStepsRan
// ---------------------------------------------------------------------------

const STEP_EVENTS = [
  { skill: "create-branch", status: "started", timestamp: 1 },
  { skill: "review-task",   status: "started", timestamp: 2 },
  { skill: "develop",       status: "started", timestamp: 3 },
  { skill: "create-pr",     status: "started", timestamp: 4 },
  { skill: "qa-task",       status: "started", timestamp: 5 },
  { skill: "finalise",      status: "started", timestamp: 6 },
];

test("pipelineStepsRan: ok when all steps present in order", () => {
  const dir = makeTmpDir();
  const p = writeFile(dir, ".eval/pipeline-events.json", JSON.stringify(STEP_EVENTS));
  const r = A.pipelineStepsRan(p, ["create-branch", "review-task", "develop", "create-pr"]);
  assert.ok(r.ok, r.reason);
});

test("pipelineStepsRan: fails when step missing", () => {
  const dir = makeTmpDir();
  const p = writeFile(dir, ".eval/pipeline-events.json", JSON.stringify(STEP_EVENTS));
  const r = A.pipelineStepsRan(p, ["create-branch", "qa-fix"]);
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("qa-fix"));
});

test("pipelineStepsRan: fails when step out of order", () => {
  const dir = makeTmpDir();
  const p = writeFile(dir, ".eval/pipeline-events.json", JSON.stringify(STEP_EVENTS));
  // create-pr comes before develop in expected — should fail
  const r = A.pipelineStepsRan(p, ["create-pr", "develop"]);
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("develop") || r.reason.includes("out of order"));
});

test("pipelineStepsRan: fails when file missing", () => {
  const r = A.pipelineStepsRan("/nonexistent/events.json", ["create-branch"]);
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("not found"));
});

// ---------------------------------------------------------------------------
// loopBoundedAt
// ---------------------------------------------------------------------------

test("loopBoundedAt: ok when count <= maxIter", () => {
  const dir = makeTmpDir();
  const events = [
    { skill: "qa-fix", status: "started", timestamp: 1 },
    { skill: "qa-fix", status: "started", timestamp: 2 },
    { skill: "qa-fix", status: "started", timestamp: 3 },
  ];
  const p = writeFile(dir, ".eval/events.json", JSON.stringify(events));
  const r = A.loopBoundedAt(p, "qa-fix", 5);
  assert.ok(r.ok, r.reason);
});

test("loopBoundedAt: fails when count > maxIter", () => {
  const dir = makeTmpDir();
  const events = Array.from({ length: 6 }, (_, i) => ({ skill: "qa-fix", status: "started", timestamp: i }));
  const p = writeFile(dir, ".eval/events.json", JSON.stringify(events));
  const r = A.loopBoundedAt(p, "qa-fix", 5);
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("6") && r.reason.includes("max 5"));
});

test("loopBoundedAt: ok when skill never ran", () => {
  const dir = makeTmpDir();
  const p = writeFile(dir, ".eval/events.json", JSON.stringify([]));
  const r = A.loopBoundedAt(p, "qa-fix", 5);
  assert.ok(r.ok);
});

// ---------------------------------------------------------------------------
// prCreated
// ---------------------------------------------------------------------------

test("prCreated: ok for skipped receipt (no GH_TOKEN)", () => {
  const dir = makeTmpDir();
  const p = writeFile(dir, ".eval/gh-receipt.json", JSON.stringify({ skipped: true, reason: "GH_TOKEN not set" }));
  assert.ok(A.prCreated(p).ok);
});

test("prCreated: ok when base branch matches", () => {
  const dir = makeTmpDir();
  const p = writeFile(dir, ".eval/gh-receipt.json",
    JSON.stringify({ skipped: false, pr: { number: 1, url: "u", baseRefName: "main", title: "feat: task.42" } }));
  assert.ok(A.prCreated(p, { base: "main" }).ok);
});

test("prCreated: fails when base branch differs", () => {
  const dir = makeTmpDir();
  const p = writeFile(dir, ".eval/gh-receipt.json",
    JSON.stringify({ skipped: false, pr: { number: 1, url: "u", baseRefName: "develop", title: "feat" } }));
  const r = A.prCreated(p, { base: "main" });
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("main"));
});

test("prCreated: fails when file missing", () => {
  const r = A.prCreated("/nonexistent/receipt.json");
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("not found"));
});

// ---------------------------------------------------------------------------
// noLockFilesLeft
// ---------------------------------------------------------------------------

test("noLockFilesLeft: ok when no lock files", () => {
  const dir = makeTmpDir();
  writeFile(dir, "some-file.txt", "content");
  assert.ok(A.noLockFilesLeft(dir).ok);
});

test("noLockFilesLeft: fails when lock file present", () => {
  const dir = makeTmpDir();
  writeFile(dir, ".claude/state/develop-pipeline.lock", "{}");
  const r = A.noLockFilesLeft(dir);
  assert.ok(!r.ok);
  assert.ok(r.reason.includes(".lock"));
});

test("noLockFilesLeft: fails for missing directory", () => {
  const r = A.noLockFilesLeft("/nonexistent/dir");
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("not found"));
});
