#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/criteria-section.js. Regenerate via `npm run bundle`.
"use strict";

// The one reader of a work item's criteria section (task.248).
//
// Three engines read the same section and must agree on where it is and what
// a criterion is: finalise-rerun-scope.js (which criteria were reworded since
// the prior acceptance), criteria-drift.js (which criteria changed since the
// PR base, and how) and the boundary CLI in probe-boundary-signals.mjs (does
// the section carry boundary vocabulary). Before this file each would have
// carried its own heading rule; two definitions of "the criteria section"
// drift silently and in the worst direction (docs/reference/anti-patterns.md).
//
// The heading rule is jira-sync.js's extractSection, applied to the pair
// "Success Criteria" (tasks) then "Acceptance Criteria" (stories). It is
// restated here rather than required because jira-sync.js reaches four more
// modules, and the bundler vendors every one of them into each skill that
// bundles this file — review-security among them, which needs none (task.119,
// obs #39). tests/criteria-section.test.mjs holds the two readers equal over
// every work item in docs/, so the restatement cannot drift unseen.
//
// Pure: no I/O, no process.exit.

// A criterion is a top-level checkbox line (tasks) or a top-level numbered
// item (stories). Indented lines are its continuation: sub-points, evidence
// notes, amendments. They are not criteria of their own.
const RE_CHECKBOX = /^[-*]\s+\[[ xX]\]\s+(.*)$/;
const RE_NUMBERED = /^\d+[.)]\s+(.*)$/;
const RE_INDENTED = /^[ \t]+\S/;

const CRITERIA_HEADINGS = Object.freeze([
  "Success Criteria",
  "Acceptance Criteria",
]);

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A line that opens, closes or sits inside a fenced block. Same rule as
// jira-sync.js makeFenceTracker: a '#' inside a fence is code, not a heading.
function makeFenceTracker() {
  let open = null;
  return function isFenceLine(line) {
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!m) return open !== null;
    const char = m[1][0];
    const len = m[1].length;
    const info = m[2];
    if (open === null) {
      if (char === "`" && info.includes("`")) return false;
      open = { char, len };
      return true;
    }
    if (char === open.char && len >= open.len && info.trim() === "") {
      open = null;
      return true;
    }
    return true;
  };
}

function extractSection(body, name) {
  const lines = String(body ?? "").split("\n");
  const heading = new RegExp(`^## (?:\\d+[.)]\\s*)?${escapeRe(name)}[ \\t]*$`);
  const isFenceLine = makeFenceTracker();
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isFenceLine(line)) continue;
    if (start === -1) {
      if (heading.test(line)) start = i + 1;
    } else if (line.startsWith("## ") || line.startsWith("# ")) {
      return lines.slice(start, i).join("\n");
    }
  }
  return start === -1 ? null : lines.slice(start).join("\n");
}

/** The criteria section's text, or null when the document has neither heading. */
function criteriaSection(body) {
  for (const name of CRITERIA_HEADINGS) {
    const s = extractSection(body, name);
    if (s !== null) return s;
  }
  return null;
}

/**
 * The criteria, each with its continuation lines, in document order:
 * `[{ line, continuation: [string] }]`, or `null` when there is no section.
 * `line` is the criterion's own text after the checkbox or number; the
 * checkbox state is not part of it. `continuation` holds the indented lines
 * under it, verbatim and trimmed, up to the next criterion, heading or
 * unindented line. A blank line inside a run of indented lines is kept as
 * part of it; one that ends the run is not.
 */
function readCriteriaEntries(body) {
  const section = criteriaSection(body);
  if (section === null) return null;
  const out = [];
  let cur = null;
  let pendingBlank = 0;
  for (const raw of section.split("\n")) {
    const m = RE_CHECKBOX.exec(raw) || RE_NUMBERED.exec(raw);
    if (m) {
      cur = { line: m[1], continuation: [] };
      out.push(cur);
      pendingBlank = 0;
      continue;
    }
    if (cur && RE_INDENTED.test(raw)) {
      for (; pendingBlank > 0; pendingBlank--) cur.continuation.push("");
      cur.continuation.push(raw.trim());
      continue;
    }
    if (cur && raw.trim() === "") {
      pendingBlank++;
      continue;
    }
    cur = null;
    pendingBlank = 0;
  }
  return out;
}

module.exports = {
  CRITERIA_HEADINGS,
  RE_CHECKBOX,
  RE_NUMBERED,
  extractSection,
  criteriaSection,
  readCriteriaEntries,
};
