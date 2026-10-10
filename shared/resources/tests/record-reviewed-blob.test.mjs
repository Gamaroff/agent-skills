// ---------------------------------------------------------------------------
// record-reviewed-blob.test.mjs — the one writer of `**reviewed_blob:**`.
// ---------------------------------------------------------------------------
// The line is the freshness reader's contract (review-report-freshness.js,
// property 5), so these tests read the written report back through the reader:
// a stamp the reader cannot see would make every Step 2 re-review silently.
//
//   1. Placement — under `**Reviewed:**`, else at the end; one line, replaced.
//   2. The round trip — a stamped report is `fresh` for the stamped document and
//      `stale` once the document changes.
//   3. Non-blocking — missing inputs report a reason and exit 0.
//
// Run: node --test shared/resources/tests/record-reviewed-blob.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import {
  writeFileSync,
  readFileSync,
  mkdtempSync,
  appendFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "record-reviewed-blob.js");
const { stampReport } = require(CLI);
const { classifyReviewReport, reportReviewedBlob } = require(
  join(__dirname, "..", "review-report-freshness.js"),
);

const BLOB = "c".repeat(40);

test("1a: the stamp goes directly under the Reviewed line", () => {
  const out = stampReport(
    "# R\n\n**Reviewed:** 2026-10-10\n**Review Depth:** Standard\n",
    BLOB,
  );
  assert.equal(
    out,
    `# R\n\n**Reviewed:** 2026-10-10\n**reviewed_blob:** ${BLOB}\n**Review Depth:** Standard\n`,
  );
});

test("1b: a second stamp replaces the first", () => {
  const once = stampReport("**Reviewed:** 2026-10-10\n", "a".repeat(40));
  const twice = stampReport(once, BLOB);
  assert.equal(twice.match(/reviewed_blob/g).length, 1);
  assert.equal(reportReviewedBlob(twice).blob, BLOB);
});

test("1c: a report with no date line gets the stamp at the end", () => {
  const out = stampReport("# R\n\nbody\n", BLOB);
  assert.equal(reportReviewedBlob(out).blob, BLOB);
  assert.ok(out.endsWith(`**reviewed_blob:** ${BLOB}\n`));
});

test("1d: the Review Date spelling anchors the stamp too", () => {
  const out = stampReport("**Review Date:** 2026-10-10\nx\n", BLOB);
  assert.equal(out.split("\n")[1], `**reviewed_blob:** ${BLOB}`);
});

test("2: a stamped report is fresh for its document and stale once the document changes", () => {
  const dir = mkdtempSync(join(tmpdir(), "rrb-"));
  const doc = join(dir, "task.1.x.md");
  const report = join(dir, "task.1.review.1.x.md");
  writeFileSync(doc, "---\nupdated: 2026-10-10\n---\n# T\n");
  writeFileSync(report, "# Review\n\n**Reviewed:** 2026-10-10\n");
  const out = JSON.parse(
    execFileSync(
      process.execPath,
      [CLI, "--doc", doc, "--report", report, "--json"],
      { encoding: "utf8" },
    ),
  );
  assert.equal(out.reason, "written");
  const blobNow = () =>
    execFileSync("git", ["hash-object", doc], { encoding: "utf8" }).trim();
  const verdict = () =>
    classifyReviewReport({
      taskContent: readFileSync(doc, "utf8"),
      reportContent: readFileSync(report, "utf8"),
      taskBlob: blobNow(),
    });
  assert.equal(verdict().reason, "blob-match");
  appendFileSync(doc, "\nedited the same day\n");
  assert.equal(verdict().reason, "blob-mismatch");
});

test("3: a missing input reports its reason and exits 0; bad usage exits 2", () => {
  const out = JSON.parse(
    execFileSync(
      process.execPath,
      [CLI, "--doc", "/nope.md", "--report", "/nope2.md", "--json"],
      { encoding: "utf8" },
    ),
  );
  assert.equal(out.reason, "no-doc");
  let code = 0;
  try {
    execFileSync(process.execPath, [CLI, "--doc"], { stdio: "pipe" });
  } catch (e) {
    code = e.status;
  }
  assert.equal(code, 2);
});
