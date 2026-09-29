"use strict";

/**
 * Section-scoped Markdown reading for the population tests — a heading's
 * section, fence-aware, so a SKILL.md rule is asserted where it lives rather
 * than anywhere in a 2,000-line file.
 *
 * Moved here from tests/outcome-reachability-check.test.js (task.145) when
 * tests/qa-evidence-integrity.test.js (task.149) needed the same reader: two
 * copies of "where does a section end" would drift, and a population test whose
 * reader disagrees with its sibling's passes or fails for the wrong reason.
 */

// A fence opens on three or more backticks or tildes and closes only on the
// same character, at least as long, with nothing after it (CommonMark). A bare
// "starts with ```" toggle is inverted by a four-backtick or tilde fence and
// then reads the rest of the file as the wrong side of it (task.145 QA cycle 1,
// CR-3).
const FENCE_OPEN = /^(\s*)(`{3,}|~{3,})/;
// A backtick fence's info string may not contain a backtick — "```js` x" is
// a paragraph, not a fence (CommonMark; task.145 QA cycle 2, CR2-5). Indentation
// is deliberately NOT capped: these SKILL.md files nest fences inside list items
// at four or more spaces, and a top-level cap would drop real fences.

/**
 * Advance the fence state over one line. `open` is the opening marker while
 * inside a fence, else null. Returns the new state and whether this line is a
 * fence line (opening or closing) — a fence line is never prose.
 */
function fenceStep(open, line) {
  const m = line.match(FENCE_OPEN);
  if (!m) return { open, isFence: false };
  const marker = m[2];
  if (open === null) {
    // Only the text AFTER the whole opening run is the info string. A regex that
    // tested "run, non-backticks, backtick" backtracked a four-backtick run into
    // "three plus an info-string backtick" and stopped every ```` fence opening
    // (task.145 QA cycle 3, CR3-1).
    if (marker[0] === "`" && line.slice(m[0].length).includes("`"))
      return { open, isFence: false };
    return { open: marker, isFence: true, lead: m[1].length };
  }
  const closes =
    marker[0] === open[0] &&
    marker.length >= open.length &&
    line.slice(m[0].length).trim() === "";
  return closes ? { open: null, isFence: true } : { open, isFence: false };
}

/**
 * Lines from `heading` to the next heading of the same or higher level. A
 * heading-shaped line inside a fence is example text, not structure, so fenced
 * lines are carried but never end the section. Returns null when the heading is
 * absent — the floor's signal.
 */
function sectionOf(text, heading) {
  const lines = text.split(/\r?\n/);
  // The start heading is found OUTSIDE fences too: a quoted copy of the heading
  // inside an earlier example must not become the section's start.
  let open = null;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const step = fenceStep(open, lines[i]);
    const wasFenced = open !== null || step.isFence;
    open = step.open;
    if (!wasFenced && lines[i].trimEnd() === heading) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  const level = heading.match(/^#+/)[0].length;
  const out = [];
  open = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    const step = fenceStep(open, line);
    const fenced = open !== null || step.isFence;
    open = step.open;
    if (!fenced) {
      const h = line.match(/^(#+)\s/);
      if (h && h[1].length <= level) break;
    }
    out.push(line);
  }
  return out;
}

// The per-item reader and prose normaliser, moved here from
// tests/outcome-reachability-check.test.js (task.145) when
// tests/review-property-checks.test.js (task 151) needed the same item scope.
const LIST_ITEM = /^(\s*)(?:\d+\.|[-*])\s/;

/**
 * The list item whose first line matches `citation` (a RegExp), through to the next
 * line at the item's own indentation or shallower (a sibling item, or the prose
 * after the list). Blank lines inside the item do not end it; fenced lines are
 * dropped, since a command in a fence is an example, not the check's wording.
 */
function citingItemOf(sectionLines, citation) {
  let open = null;
  let start = -1;
  let indent = 0;
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const step = fenceStep(open, line);
    const fenced = open !== null || step.isFence;
    open = step.open;
    if (fenced) continue;
    const m = line.match(LIST_ITEM);
    if (m && citation.test(line)) {
      start = i;
      indent = m[1].length;
      break;
    }
  }
  if (start === -1) return null;

  const item = [sectionLines[start]];
  open = null;
  for (let i = start + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const step = fenceStep(open, line);
    // A fence that OPENS at the item's indentation or shallower is not inside
    // the item — it ends it, like any other line at that depth. Toggling on it
    // first glued the lines after it onto the item (task.145 QA cycle 1, CR-4).
    // Opening or CLOSING: a fence line at the item's depth or shallower is at
    // the item's own level, so the item ended before it (CR2-4 — the closing
    // side was still reachable after cycle 1's opening-only fix).
    if (step.isFence && line.match(/^\s*/)[0].length <= indent) break;
    const fenced = open !== null || step.isFence;
    open = step.open;
    if (fenced) continue;
    if (line.trim() === "") continue;
    const lead = line.match(/^\s*/)[0].length;
    if (lead <= indent) break;
    item.push(line);
  }
  return item.join("\n");
}

/**
 * Prose as a reader sees it: a phrase wrapped across lines or split by emphasis
 * ("**named\n  function**") is still the phrase. Matching the raw text would
 * make an element's presence depend on where prettier chose to wrap.
 */
function asProse(item) {
  return item.replace(/\*\*|`/g, "").replace(/\s+/g, " ");
}

module.exports = { FENCE_OPEN, fenceStep, sectionOf, citingItemOf, asProse };
