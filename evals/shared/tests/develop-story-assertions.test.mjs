import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as A from "../assertions.mjs";

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ds-asrt-"));
}

function writeFile(dir, rel, content) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf-8");
  return full;
}

// ---------------------------------------------------------------------------
// prTargetsEpicBranch
// ---------------------------------------------------------------------------

test("prTargetsEpicBranch: ok when base matches epic pattern", () => {
  const dir = makeTmpDir();
  const receipt = { skipped: false, pr: { baseRefName: "feature/epic.5.example", number: 1 } };
  const p = writeFile(dir, ".eval/gh-receipt.json", JSON.stringify(receipt));
  const r = A.prTargetsEpicBranch(p, 5);
  assert.ok(r.ok, r.reason);
});

test("prTargetsEpicBranch: fails when base is develop", () => {
  const dir = makeTmpDir();
  const receipt = { skipped: false, pr: { baseRefName: "develop", number: 1 } };
  const p = writeFile(dir, ".eval/gh-receipt.json", JSON.stringify(receipt));
  const r = A.prTargetsEpicBranch(p, 5);
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("develop"));
});

test("prTargetsEpicBranch: fails when base is main (wrong epic)", () => {
  const dir = makeTmpDir();
  const receipt = { skipped: false, pr: { baseRefName: "feature/epic.7.other", number: 1 } };
  const p = writeFile(dir, ".eval/gh-receipt.json", JSON.stringify(receipt));
  const r = A.prTargetsEpicBranch(p, 5);
  assert.ok(!r.ok);
});

test("prTargetsEpicBranch: skipped receipt passes", () => {
  const dir = makeTmpDir();
  const receipt = { skipped: true };
  const p = writeFile(dir, ".eval/gh-receipt.json", JSON.stringify(receipt));
  const r = A.prTargetsEpicBranch(p, 5);
  assert.ok(r.ok, r.reason);
});

test("prTargetsEpicBranch: missing receipt file returns !ok", () => {
  const r = A.prTargetsEpicBranch("/nonexistent/path/receipt.json", 5);
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("not found"));
});

// ---------------------------------------------------------------------------
// epicBranchExists
// ---------------------------------------------------------------------------

test("epicBranchExists: ok when epic branch present in .eval/branches.json", () => {
  const dir = makeTmpDir();
  writeFile(dir, ".eval/branches.json", JSON.stringify(["develop", "feature/epic.5.example"]));
  const r = A.epicBranchExists(dir, 5);
  assert.ok(r.ok, r.reason);
});

test("epicBranchExists: fails when epic branch absent", () => {
  const dir = makeTmpDir();
  writeFile(dir, ".eval/branches.json", JSON.stringify(["develop", "feature/task.10.foo"]));
  const r = A.epicBranchExists(dir, 5);
  assert.ok(!r.ok);
});

test("epicBranchExists: does not match wrong epic number", () => {
  const dir = makeTmpDir();
  writeFile(dir, ".eval/branches.json", JSON.stringify(["develop", "feature/epic.7.example"]));
  const r = A.epicBranchExists(dir, 5);
  assert.ok(!r.ok);
});

// ---------------------------------------------------------------------------
// resumeRehydrated
// ---------------------------------------------------------------------------

const RESUME_EVENTS = [
  { skill: "resume-detector", status: "completed", timestamp: 1 },
  { skill: "qa-fix", status: "started", timestamp: 2 },
  { skill: "qa-fix", status: "completed", timestamp: 3 },
  { skill: "qa-fix", status: "started", timestamp: 4 },
  { skill: "qa-fix", status: "completed", timestamp: 5 },
  { skill: "qa-fix", status: "started", timestamp: 6 },
];

test("resumeRehydrated: ok when resume event present and step reached iter", () => {
  const dir = makeTmpDir();
  const p = writeFile(dir, ".eval/pipeline-events.json", JSON.stringify(RESUME_EVENTS));
  const r = A.resumeRehydrated(p, { expectedStep: "qa-fix", expectedIter: 3 });
  assert.ok(r.ok, r.reason);
});

test("resumeRehydrated: fails when no resume event", () => {
  const dir = makeTmpDir();
  const events = RESUME_EVENTS.filter(e => e.skill !== "resume-detector");
  const p = writeFile(dir, ".eval/pipeline-events.json", JSON.stringify(events));
  const r = A.resumeRehydrated(p, { expectedStep: "qa-fix", expectedIter: 3 });
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("no resume detection"));
});

test("resumeRehydrated: fails when step iteration count too low", () => {
  const dir = makeTmpDir();
  // Only 1 qa-fix start — need 3
  const events = [
    { skill: "resume-detector", status: "completed", timestamp: 1 },
    { skill: "qa-fix", status: "started", timestamp: 2 },
  ];
  const p = writeFile(dir, ".eval/pipeline-events.json", JSON.stringify(events));
  const r = A.resumeRehydrated(p, { expectedStep: "qa-fix", expectedIter: 3 });
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("iter"));
});

test("resumeRehydrated: ok when no step/iter opts (just checks resume event)", () => {
  const dir = makeTmpDir();
  const p = writeFile(dir, ".eval/pipeline-events.json", JSON.stringify(RESUME_EVENTS));
  const r = A.resumeRehydrated(p, {});
  assert.ok(r.ok, r.reason);
});

test("resumeRehydrated: missing events file returns !ok", () => {
  const r = A.resumeRehydrated("/nonexistent/events.json", {});
  assert.ok(!r.ok);
  assert.ok(r.reason.includes("not found"));
});
