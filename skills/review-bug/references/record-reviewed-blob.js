#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/record-reviewed-blob.js. Regenerate via `npm run bundle`.
"use strict";

/**
 * record-reviewed-blob — stamp a review report with the revision it reviewed.
 *
 * task.201. `review-task`, `review-story` and `review-bug` call this as the last
 * edit of a review — after their own fixes and status edit, so the review's own
 * changes are inside the hash. It writes one line into the report:
 *
 *     **reviewed_blob:** <git hash-object of the document>
 *
 * directly under the report's `**Reviewed:**` (or `**Review Date:**`) line, or at
 * the end when there is none, replacing any earlier `**reviewed_blob:**` line.
 * The develop pipelines' Step 2 then reuses the review exactly when the
 * document's hash still matches (review-report-freshness.js, property 5).
 *
 * One writer for three skills: the line's spelling is the reader's contract, so
 * it is written in one place. The write is read back through the reader itself,
 * so a line the reader cannot see is reported, not assumed.
 *
 * Usage:
 *   record-reviewed-blob.js --doc <document> --report <review report> [--json]
 *
 * Exit codes: 0 for every outcome below (a review never halts over this line —
 * the cost of a missing stamp is one re-review); 2 for a usage error.
 *   reason: written | no-doc | no-report | git-failed | unreadable-after-write
 */

const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { reportReviewedBlob } = require("./review-report-freshness.js");

const LINE_RE = /^ {0,3}\*\*reviewed_blob:\*\*.*$/;
const ANCHOR_RE =
  /^ {0,3}(?:[-*][ \t]+)?\*\*(?:Reviewed|Review Date)(?:\*\*:|:\*\*|\*\*)/;

/**
 * Pure: the report text with exactly one `**reviewed_blob:**` line for `blob`.
 */
function stampReport(reportText, blob) {
  const eol = reportText.includes("\r\n") ? "\r\n" : "\n";
  const lines = reportText.split(/\r?\n/).filter((l) => !LINE_RE.test(l));
  const stamp = `**reviewed_blob:** ${blob}`;
  const at = lines.findIndex((l) => ANCHOR_RE.test(l));
  if (at >= 0) lines.splice(at + 1, 0, stamp);
  else {
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push("", stamp, "");
  }
  return lines.join(eol);
}

function record(doc, report) {
  if (!doc || !fs.existsSync(doc)) return { reason: "no-doc", blob: null };
  if (!report || !fs.existsSync(report))
    return { reason: "no-report", blob: null };
  let blob;
  try {
    blob = execFileSync("git", ["hash-object", doc], {
      encoding: "utf8",
    }).trim();
  } catch {
    return { reason: "git-failed", blob: null };
  }
  fs.writeFileSync(report, stampReport(fs.readFileSync(report, "utf8"), blob));
  const back = reportReviewedBlob(fs.readFileSync(report, "utf8"));
  if (back.blob !== blob) return { reason: "unreadable-after-write", blob };
  return { reason: "written", blob };
}

function main(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") o.json = true;
    else if (
      (argv[i] === "--doc" || argv[i] === "--report") &&
      i + 1 < argv.length
    )
      o[argv[i].slice(2)] = argv[++i];
    else {
      process.stderr.write(
        "usage: record-reviewed-blob.js --doc <document> --report <review report> [--json]\n",
      );
      process.exitCode = 2;
      return;
    }
  }
  if (!o.doc || !o.report) {
    process.stderr.write(
      "usage: record-reviewed-blob.js --doc <document> --report <review report> [--json]\n",
    );
    process.exitCode = 2;
    return;
  }
  const r = { ...record(o.doc, o.report), exitCode: 0 };
  process.stdout.write(
    o.json
      ? `${JSON.stringify(r)}\n`
      : `reviewed_blob: ${r.reason}${r.blob ? ` ${r.blob}` : ""}\n`,
  );
  process.exitCode = 0;
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { stampReport, record };
