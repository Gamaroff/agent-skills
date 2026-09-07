// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/review-report-freshness.js. Regenerate via `npm run bundle`.
"use strict";

// ---------------------------------------------------------------------------
// review-report-freshness.js — is this review report still about this document?
// ---------------------------------------------------------------------------
// Canonical spec: develop-pipeline-step-2-review.md, the develop-task halves.
// This module is the only implementation of the freshness rule; the Step 2 gate
// asks it rather than comparing dates itself.
//
// The question it answers is narrow: a `/develop-task` run has found a review
// report beside a task whose status is still `planned`. Is that report evidence
// about what the card says *now*, or about what it said before a rewrite?
//
// Four properties, each of which exists because the obvious alternative fails:
//
//   1. NO FILESYSTEM ACCESS.     Not `stat`, not mtime, not even a path read —
//                                the caller passes file *contents*. mtime is the
//                                checkout time in a fresh clone, which is exactly
//                                what CI and `/develop-batch` worktrees are, so an
//                                mtime rule silently reports every report as
//                                same-age there and as ordered on a developer's
//                                machine. A gate that decides differently in the
//                                pipeline than on the desk is worse than no gate,
//                                because it is believed.
//
//                                This diverges deliberately from the plan-freshness
//                                rule in develop-pipeline-resume-contract.md, which
//                                compares mtimes for the same shape of question.
//                                That rule is not changed here — see the note in
//                                the step-2 resource. Two conventions, one of them
//                                argued for; silence about the other one was the
//                                thing worth avoiding.
//
//   2. THE REPORT'S DATE COMES FROM ITS BODY. Review reports have no reliable
//                                frontmatter: of the 49 task review reports tracked
//                                when this was written, 7 carried a frontmatter
//                                block at all and 6 an `updated:` field — but all 49
//                                carried a body `**Reviewed:**` line and all 49 a
//                                `Review Date:` line. Frontmatter is deliberately
//                                NOT consulted even when present: two sources for
//                                one value is two code paths, and the body form
//                                already covers every document.
//
//   3. EVERY AMBIGUITY RESOLVES TO `stale`. Unparseable date, missing date,
//                                missing report — all run the review. The failure
//                                this gate removes is a needless halt; the failure
//                                a wrong skip introduces is developing against an
//                                unreviewed card. Those are not equally bad, so the
//                                tie is not broken in the middle.
//
//   4. IT NEVER THROWS.          A throw here surfaces as a crashed pipeline step
//                                rather than a decision, so malformed input returns
//                                a verdict with a reason instead. Same discipline as
//                                tracker-workflow.js.
//
// Dates are compared as ISO `YYYY-MM-DD` strings, never as Date objects. String
// order is date order for that format, and it has no timezone — a Date would
// reintroduce the machine-dependence property 1 exists to remove.

// ── parsing ────────────────────────────────────────────────────────────────

// A frontmatter reader local to this module. Same shape and the same two guards
// as the readers in bug-doc.js and jira-sync.js: no opening `---`, or no closing
// one, means there is no frontmatter and the whole file is body. Duplicated
// rather than required, because requiring either would pull a whole CLI module
// in behind one scalar lookup.
function splitFrontmatter(content) {
  if (!content.startsWith("---")) return { frontmatter: {}, body: content };
  const closeIdx = content.indexOf("\n---", 3);
  if (closeIdx === -1) return { frontmatter: {}, body: content };
  const fmText = content.slice(4, closeIdx);
  const body = content.slice(closeIdx + 4).replace(/^\n/, "");
  const frontmatter = {};
  for (const line of fmText.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v === "" || v === "null" || v === "~") {
      frontmatter[m[1]] = null;
      continue;
    }
    v = v.replace(/\s+#.*$/, "").trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1).replace(/''/g, "'");
    frontmatter[m[1]] = v;
  }
  return { frontmatter, body };
}

// Blank out fenced code blocks, preserving line count so nothing else shifts.
// A `**Reviewed:**` line inside a fence is a PICTURE of one — the spec beside
// this file and the task that specified it both contain such examples, and a
// scanner that cannot tell them apart reads its own documentation as data.
function blankFences(body) {
  const lines = body.split("\n");
  let fence = null;
  return lines
    .map((line) => {
      const m = line.match(/^\s*(`{3,}|~{3,})/);
      if (m) {
        if (fence === null) {
          fence = m[1][0];
          return "";
        }
        if (m[1][0] === fence) {
          fence = null;
          return "";
        }
        return "";
      }
      return fence === null ? line : "";
    })
    .join("\n");
}

const ISO = "([0-9]{4}-[0-9]{2}-[0-9]{2})";

// `**Reviewed:** 2026-05-11` — the primary form, with or without a leading
// list marker, with or without the colon inside the bold span.
const REVIEWED_RE = new RegExp(
  String.raw`^\s*(?:[-*]\s*)?\*\*Reviewed:?\*\*\s*` + ISO,
  "m",
);

// `- **Review Date:** 2026-05-11` — the fallback, emitted in the Review
// Metadata block. Same two spellings.
const REVIEW_DATE_RE = new RegExp(
  String.raw`^\s*(?:[-*]\s*)?\*\*Review Date:?\*\*\s*` + ISO,
  "m",
);

const ISO_ONLY_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/**
 * The date a review report states it was written, read from its body.
 * Returns an ISO `YYYY-MM-DD` string, or null when neither form is present.
 */
function reportReviewedDate(reportContent) {
  if (typeof reportContent !== "string" || reportContent === "") return null;
  const { body } = splitFrontmatter(reportContent);
  const scannable = blankFences(body);
  const m = scannable.match(REVIEWED_RE) || scannable.match(REVIEW_DATE_RE);
  return m ? m[1] : null;
}

/**
 * The date a task document last changed, read from frontmatter `updated:`.
 * Returns an ISO `YYYY-MM-DD` string, or null when absent or malformed.
 */
function taskUpdatedDate(taskContent) {
  if (typeof taskContent !== "string" || taskContent === "") return null;
  const { frontmatter } = splitFrontmatter(taskContent);
  const raw = frontmatter.updated;
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  return ISO_ONLY_RE.test(v) ? v : null;
}

// ── the verdict ────────────────────────────────────────────────────────────

const VERDICTS = Object.freeze({
  FRESH: "fresh",
  STALE: "stale",
  ABSENT: "absent",
});

/**
 * Classify a review report against the task it reviews.
 *
 * @param {object} input
 * @param {string} input.taskContent    full text of the task document
 * @param {string|null} input.reportContent  full text of the newest review
 *   report, or null/"" when no report exists. The CALLER resolves which report
 *   that is — see the note on globbing in the step-2 resource; report filenames
 *   come in at least three shapes and `sort | tail -1` does not order them.
 * @returns {{verdict: string, reason: string, taskDate: string|null,
 *            reportDate: string|null}}
 */
function classifyReviewReport(input) {
  const taskContent = input && input.taskContent;
  const reportContent = input && input.reportContent;

  const taskDate = taskUpdatedDate(taskContent);

  if (typeof reportContent !== "string" || reportContent.trim() === "") {
    return {
      verdict: VERDICTS.ABSENT,
      reason: "no-report",
      taskDate,
      reportDate: null,
    };
  }

  const reportDate = reportReviewedDate(reportContent);

  if (reportDate === null) {
    return {
      verdict: VERDICTS.STALE,
      reason: "report-date-unparseable",
      taskDate,
      reportDate: null,
    };
  }
  if (taskDate === null) {
    return {
      verdict: VERDICTS.STALE,
      reason: "task-date-unparseable",
      taskDate: null,
      reportDate,
    };
  }

  // ISO strings: lexical order is chronological order. A report written the
  // same day the task last changed counts as current — the review is the last
  // thing to touch a card on its own review day, and demanding strictly-newer
  // would make every in-pipeline review stale against its own edits.
  if (reportDate >= taskDate) {
    return { verdict: VERDICTS.FRESH, reason: "current", taskDate, reportDate };
  }
  return {
    verdict: VERDICTS.STALE,
    reason: "report-older-than-task",
    taskDate,
    reportDate,
  };
}

// ── the message ────────────────────────────────────────────────────────────

/**
 * One line naming which precondition failed, for the Step 2 HALT message and
 * the skip log. The reason codes above are for branching; this is for a human
 * who has just been stopped and needs to know what to do about it.
 *
 * This exists as a function so the message is assertable. A halt message
 * assembled inline at the call site can only be tested by grepping the prose
 * that describes it, which proves the sentence exists rather than that it is
 * ever produced.
 */
function describeVerdict(result, opts) {
  const reportPath = (opts && opts.reportPath) || "the review report";
  switch (result && result.reason) {
    case "no-report":
      return "no review report exists beside this task, and the review produced none";
    case "report-date-unparseable":
      return `${reportPath} states no review date (no \`**Reviewed:**\` or \`**Review Date:**\` line), so its age cannot be established`;
    case "task-date-unparseable":
      return `the task document has no parseable frontmatter \`updated:\` date, so ${reportPath} cannot be dated against it`;
    case "report-older-than-task":
      return `${reportPath} is dated ${result.reportDate}, older than the task's \`updated: ${result.taskDate}\` — it reviewed an earlier version of this card`;
    case "current":
      return `${reportPath} is dated ${result.reportDate}, not older than the task's \`updated: ${result.taskDate}\``;
    default:
      return "review report freshness could not be determined";
  }
}

module.exports = {
  // read
  reportReviewedDate,
  taskUpdatedDate,
  // classify
  classifyReviewReport,
  VERDICTS,
  // report
  describeVerdict,
};
