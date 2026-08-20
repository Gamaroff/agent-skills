"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as A from "../assertions.mjs";

function tmpFile(content, name = "t.md") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "asrt-"));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

test("fileExists — true/false", () => {
  const p = tmpFile("hello");
  assert.equal(A.fileExists(p).ok, true);
  assert.equal(A.fileExists(p + ".missing").ok, false);
});

test("fileAbsent — inverse of fileExists", () => {
  const p = tmpFile("x");
  assert.equal(A.fileAbsent(p).ok, false);
  assert.equal(A.fileAbsent(p + ".missing").ok, true);
});

test("fileMatches — regex hit", () => {
  const p = tmpFile("foo\n## Overview\nbar");
  assert.equal(A.fileMatches(p, /## Overview/).ok, true);
  assert.equal(A.fileMatches(p, /## Nope/).ok, false);
});

test("fileDoesNotMatch — passes on absence, fails on presence and on a missing file", () => {
  const p = tmpFile("foo\n## Overview\nbar");
  assert.equal(A.fileDoesNotMatch(p, /## Stakeholder Sign-off/).ok, true);
  assert.equal(A.fileDoesNotMatch(p, /## Overview/).ok, false);
  // A missing file is a failure, not a pass — otherwise a typo'd path would
  // silently "prove" the pattern is absent.
  assert.equal(A.fileDoesNotMatch(p + ".missing", /anything/).ok, false);
});

test("frontmatterHas / frontmatterEquals", () => {
  const p = tmpFile("---\nid: t.1\nstatus: draft\n---\nbody\n");
  assert.equal(A.frontmatterHas(p, ["id", "status"]).ok, true);
  assert.equal(A.frontmatterHas(p, ["id", "missing"]).ok, false);
  assert.equal(A.frontmatterEquals(p, { status: "draft" }).ok, true);
  assert.equal(A.frontmatterEquals(p, { status: "done" }).ok, false);
});

test("hasAtLeastNSourceCitations", () => {
  const p = tmpFile("see [Source: a/b.md#c] and [Source: x/y.md#z]");
  assert.equal(A.hasAtLeastNSourceCitations(p, 2).ok, true);
  assert.equal(A.hasAtLeastNSourceCitations(p, 3).ok, false);
});

test("trackerPayloadMatches — literal + regex", () => {
  const p = tmpFile(
    JSON.stringify({ dryRun: true, summary: "Cache lib stuff" }),
    "p.json",
  );
  assert.equal(
    A.trackerPayloadMatches(p, { dryRun: true, summary: "/cache lib/i" }).ok,
    true,
  );
  assert.equal(A.trackerPayloadMatches(p, { dryRun: false }).ok, false);
  assert.equal(A.trackerPayloadMatches(p, { summary: "/nope/" }).ok, false);
});

test("answerQueueDrained", () => {
  assert.equal(A.answerQueueDrained([]).ok, true);
  assert.equal(A.answerQueueDrained([{ matches: "x" }]).ok, false);
});

test("aggregate — counts failures", () => {
  const r = A.aggregate([
    { ok: true, reason: "" },
    { ok: false, reason: "x" },
  ]);
  assert.equal(r.total, 2);
  assert.equal(r.passed, 1);
  assert.equal(r.failed, 1);
  assert.equal(r.ok, false);
});
