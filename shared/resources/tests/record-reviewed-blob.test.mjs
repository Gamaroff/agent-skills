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

test("4a: a stamp in any spelling the reader accepts is replaced, not doubled (gate 1, CR-4)", () => {
  for (const old of [
    `reviewed_blob: ${"a".repeat(40)}`,
    `- **reviewed_blob:** ${"a".repeat(40)}`,
    `**reviewed_blob**: \`${"a".repeat(40)}\``,
  ]) {
    const out = stampReport(`# R\n\n**Reviewed:** 2026-10-10\n${old}\n`, BLOB);
    assert.deepEqual(
      reportReviewedBlob(out),
      { blob: BLOB, ambiguous: false },
      old,
    );
  }
  const fm = stampReport(
    `---\nreviewed_blob: ${"a".repeat(40)}\n---\n**Reviewed:** 2026-10-10\n`,
    BLOB,
  );
  assert.deepEqual(reportReviewedBlob(fm), { blob: BLOB, ambiguous: false });
  assert.ok(
    fm.startsWith("---\n---\n"),
    "the frontmatter key is removed, the block kept",
  );
});

test("4b: a Reviewed line or a stamp inside a fence is neither moved nor chosen (CR-5)", () => {
  const fenced =
    "# R\n\n```\n**Reviewed:** example\nreviewed_blob: " +
    "a".repeat(40) +
    "\n```\n\n**Reviewed:** 2026-10-10\n";
  const out = stampReport(fenced, BLOB);
  assert.ok(
    out.includes("reviewed_blob: " + "a".repeat(40)),
    "the fenced example is untouched",
  );
  assert.ok(
    out.includes(`**Reviewed:** 2026-10-10\n**reviewed_blob:** ${BLOB}`),
    "the stamp follows the prose line",
  );
  assert.deepEqual(reportReviewedBlob(out), { blob: BLOB, ambiguous: false });
});

test("4c: re-stamping is idempotent — write N and write N+1 are byte-identical", () => {
  const once = stampReport("# R\n\n**Reviewed:** 2026-10-10\nbody\n", BLOB);
  assert.equal(stampReport(once, BLOB), once);
});

test("5a: frontmatter is what the reader calls frontmatter — quoted and spaced keys go (gate 2, CR-4)", () => {
  const old = "a".repeat(40);
  for (const key of [
    `reviewed_blob: ${old}`,
    `"reviewed_blob": ${old}`,
    `reviewed_blob : ${old}`,
  ]) {
    const out = stampReport(
      `---\ntype: review\n${key}\n---\n**Reviewed:** 2026-10-10\n`,
      BLOB,
    );
    assert.deepEqual(
      reportReviewedBlob(out),
      { blob: BLOB, ambiguous: false },
      key,
    );
  }
  // A --- block the reader does not accept as YAML is body, for the writer too.
  const notYaml = stampReport(
    `---\nsome prose, not yaml\nreviewed_blob: ${old}\n---\n**Reviewed:** 2026-10-10\n`,
    BLOB,
  );
  assert.deepEqual(reportReviewedBlob(notYaml), {
    blob: BLOB,
    ambiguous: false,
  });
});

test("5b: a stamp line that opens a comment keeps the comment; nothing below changes view (CR-5)", () => {
  const old = "a".repeat(40);
  const text = `# R\n\n**Reviewed:** 2026-10-10\n**reviewed_blob:** ${old} <!-- note\nreviewed_blob: ${"b".repeat(40)}\n-->\nbody\n`;
  const out = stampReport(text, BLOB);
  assert.ok(out.includes("<!-- note"), "the comment opener survives");
  assert.deepEqual(reportReviewedBlob(out), { blob: BLOB, ambiguous: false });
});
