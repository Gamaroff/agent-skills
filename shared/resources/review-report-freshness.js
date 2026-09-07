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
//                                frontmatter: of the 68 task review reports tracked
//                                when this was written, 7 carried a frontmatter
//                                block at all and 6 an `updated:` field — while
//                                every one carries a body `Reviewed` or
//                                `Review Date` line. Frontmatter is deliberately
//                                NOT consulted even when present: two sources for
//                                one value is two code paths, and the body form
//                                already covers every document.
//
//                                The corpus spells the colon three ways
//                                (`**Reviewed:**`, `**Reviewed**:`, `**Reviewed**`)
//                                and all three are accepted. The first count of
//                                this corpus looked only at the numbered
//                                `review.{N}.` files and reported "49/49 carry
//                                `**Reviewed:**`" — true of that subset, and wrong
//                                about the corpus. Three reports using the second
//                                spelling read as undated until the matcher was
//                                widened.
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

// Split on either line ending. CRLF is not exotic: a Windows checkout, or a repo
// with `core.autocrlf=true`, produces it for every file. The first version of
// this module matched frontmatter lines with a `$`-anchored regex and no `m`
// flag, so on CRLF **every** key failed to parse, `updated:` came back null, and
// the whole `Planned` + current-report escape hatch was silently dead — the very
// "permanently unstartable card" this module exists to remove, reintroduced in a
// different guise and with nothing reporting why.
function splitLines(text) {
  return text.split(/\r?\n/);
}

// A frontmatter reader local to this module. Duplicated rather than required,
// because requiring bug-doc.js or jira-sync.js would pull a whole CLI module in
// behind one scalar lookup.
//
// Stricter about its delimiters than those two, deliberately: a document that
// OPENS with a thematic break (`---`) is ordinary markdown, and the loose
// `indexOf("\n---")` form parses its body prose as frontmatter. That fails in the
// unsafe direction — a body line reading `updated: 1999-01-01` becomes the task's
// date, and an artificially old task date makes every report look current. So the
// opener must be a line that is exactly `---`, and so must the closer (or `...`,
// which YAML also accepts).
function splitFrontmatter(content) {
  const lines = splitLines(content);
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return { frontmatter: Object.create(null), body: content };
  }
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "---" || t === "...") {
      close = i;
      break;
    }
  }
  if (close === -1) {
    return { frontmatter: Object.create(null), body: content };
  }

  // A block delimited by `---` is not yet frontmatter: a document that OPENS with
  // a thematic break and carries another `---` further down has exactly the same
  // delimiters. Delimiters cannot tell those apart — only the content can. So
  // require every line in the block to look like YAML: blank, a `key:` at column
  // 0, or an indented continuation (list items, folded scalars). One line of
  // column-0 prose means this is a thematic break and the "frontmatter" is body
  // text.
  //
  // Without this, prose containing `updated: 1999-01-01` is read as the task's
  // own date — and an artificially OLD task date makes every report look current,
  // which is the unsafe direction.
  for (let i = 1; i < close; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (/^\s/.test(line)) continue; // continuation
    if (/^[A-Za-z0-9_-]+:/.test(line)) continue; // key
    return { frontmatter: Object.create(null), body: content };
  }

  // Null-prototype: the key pattern below matches `__proto__` and `constructor`,
  // so a plain object would resolve `frontmatter.updated` through
  // Object.prototype and would send `frontmatter["__proto__"] = v` to the
  // prototype setter instead of creating an own key.
  const frontmatter = Object.create(null);
  for (let i = 1; i < close; i++) {
    const m = lines[i].match(/^([A-Za-z0-9_-]+):[ \t]*(.*)$/);
    if (!m) continue;
    // FIRST wins. Last-wins lets a stray later occurrence override the real key,
    // and "later" is the half an author is least likely to be looking at.
    if (Object.prototype.hasOwnProperty.call(frontmatter, m[1])) continue;
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
  return { frontmatter, body: lines.slice(close + 1).join("\n") };
}

// Blank out everything that is a PICTURE of markdown rather than markdown:
// fenced code and HTML comments. Line count is preserved so nothing shifts.
//
// This matters more than it looks. The spec beside this file, the task that
// specified it, and this repository's review reports are all full of examples of
// the very header being scanned for — a scanner that cannot tell an example from
// a value reads its own documentation as data, and typically reads it as *newer*,
// which is the unsafe direction.
//
// Indented code blocks are deliberately NOT handled here. They are handled by the
// `^ {0,3}` bound on the matchers below — CommonMark's own rule, 4+ spaces starts
// an indented code block — which is simpler and stricter than tracking block
// state. List continuations make that state ambiguous, and an ambiguity here
// resolves the wrong way.
function blankNonProse(body) {
  const lines = splitLines(body);
  let fence = null; // { char, len }
  let inComment = false;

  return lines
    .map((raw) => {
      let line = raw;

      // --- HTML comments ---------------------------------------------------
      if (inComment) {
        const end = line.indexOf("-->");
        if (end === -1) return "";
        line = line.slice(end + 3);
        inComment = false;
      }
      line = line.replace(/<!--[\s\S]*?-->/g, "");
      const open = line.indexOf("<!--");
      if (open !== -1) {
        line = line.slice(0, open);
        inComment = true;
      }

      // --- fenced code -----------------------------------------------------
      // A fence may be indented up to 3 spaces; 4+ is an indented code block,
      // which the matchers reject anyway.
      const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (m) {
        const char = m[1][0];
        const len = m[1].length;
        if (fence === null) {
          fence = { char, len };
        } else if (
          char === fence.char &&
          len >= fence.len &&
          m[2].trim() === ""
        ) {
          // CommonMark: a closing fence uses the same character, is AT LEAST as
          // long as the opener, and carries no info string. Tracking only the
          // character let a ``` inside a ```` block close it, so the rest of the
          // example leaked out as live text — which is exactly how this repo
          // writes markdown-about-markdown.
          fence = null;
        }
        return "";
      }

      return fence === null ? line : "";
    })
    .join("\n");
}

const ISO = "([0-9]{4}-[0-9]{2}-[0-9]{2})";

// Two bounds, each closing a route to a wrong `fresh`:
//
//   `^ {0,3}`  rather than `^\s*` — CommonMark treats 4+ leading spaces as an
//              indented code block, so a deeper indent is an example, not a
//              value. Verified against every tracked task review report that this
//              bound loses no real date line.
//   `[ \t]*`   rather than `\s*` — JS `\s` includes the newline, so with `\s*`
//              the date was not required to be on the label's line at all, and a
//              bare `**Reviewed:**` silently adopted the next date-shaped token
//              anywhere below it. The `m` flag only confines a match if the
//              separators cannot themselves span lines.
const LABEL = String.raw`^ {0,3}(?:[-*][ \t]+)?\*\*`;

// `**Reviewed:** 2026-05-11` — the primary form, with or without a leading list
// marker. THREE spellings of the colon exist in the corpus and all are accepted:
// inside the bold span (`**Reviewed:**`), outside it (`**Reviewed**:`), and
// absent (`**Reviewed**`). The second was missed by the first measurement of this
// corpus — it counted only the numbered `review.{N}.` files — and three reports
// using it read as undated. That failed safe (undated -> stale -> run the
// review), but it defeated the feature for those documents for no reason.
const REVIEWED_RE = new RegExp(
  LABEL + String.raw`Reviewed:?\*\*:?[ \t]*` + ISO,
  "m",
);

// `- **Review Date:** 2026-05-11` — the fallback, emitted in the Review Metadata
// block. Same two spellings.
const REVIEW_DATE_RE = new RegExp(
  LABEL + String.raw`Review Date:?\*\*:?[ \t]*` + ISO,
  "m",
);

const ISO_ONLY_RE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;

// Shape is not validity. `2026-99-99` matches the ISO pattern and, compared as a
// string, outranks every real date — so a typo'd or fabricated value would make a
// report `fresh` against any task, permanently. Range-checking the fields is what
// makes the "string order is date order" property claimed in the header actually
// safe rather than merely usually true.
function isRealDate(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= dim[mo - 1];
}

function validIso(s) {
  const m = typeof s === "string" ? s.match(ISO_ONLY_RE) : null;
  if (!m) return null;
  return isRealDate(Number(m[1]), Number(m[2]), Number(m[3])) ? s : null;
}

/**
 * The date a review report states it was written, read from its body.
 * Returns an ISO `YYYY-MM-DD` string, or null when neither form is present.
 */
function reportReviewedDate(reportContent) {
  if (typeof reportContent !== "string" || reportContent === "") return null;
  const { body } = splitFrontmatter(reportContent);
  const scannable = blankNonProse(body);
  const m = scannable.match(REVIEWED_RE) || scannable.match(REVIEW_DATE_RE);
  return m ? validIso(m[1]) : null;
}

/**
 * The date a task document last changed, read from frontmatter `updated:`.
 * Returns an ISO `YYYY-MM-DD` string, or null when absent or malformed.
 */
function taskUpdatedDate(taskContent) {
  if (typeof taskContent !== "string" || taskContent === "") return null;
  const { frontmatter } = splitFrontmatter(taskContent);
  if (!Object.prototype.hasOwnProperty.call(frontmatter, "updated"))
    return null;
  const raw = frontmatter.updated;
  if (typeof raw !== "string") return null;
  return validIso(raw.trim());
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
  // Read the two properties defensively. The header promises this never throws,
  // and an exotic input (a getter that throws) would otherwise surface as a
  // crashed pipeline step rather than a decision.
  let taskContent;
  let reportContent;
  try {
    taskContent = input && input.taskContent;
    reportContent = input && input.reportContent;
  } catch {
    return {
      verdict: VERDICTS.STALE,
      reason: "input-unreadable",
      taskDate: null,
      reportDate: null,
    };
  }

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
    case "input-unreadable":
      return "the task or report content could not be read, so freshness could not be established";
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
