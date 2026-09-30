"use strict";

// ---------------------------------------------------------------------------
// qa-results.js — the work item's `## QA Testing Results` section, found and written
// ---------------------------------------------------------------------------
// qa-task Step 12 and qa-story Step 12 item 3 require this section to be REPLACED
// WHOLE on every QA cycle. Until this module, nothing performed the replacement:
// every run hand-wrote the edit, and a hand-written "replace" whose two boundaries
// are found by two independent searches duplicates text instead of replacing it.
// On task.145 (obs #178) cycle 1 inserted the section inside the change-log
// markers; cycles 2–4 replaced
//     slice(indexOf("## QA Testing Results"), indexOf("## Change Log"))
// where the second index was already smaller than the first, so each "replace"
// stacked another copy. task.65 carried three copies into the accepted tree.
//
// The invariant: a document carries AT MOST ONE section, and never inside the
// change-log block. Every write returns a named `reason`:
//
//   replaced   one section, outside the change-log block → replaced in place, whole
//   relocated  one section, inside the change-log block  → moved to the canonical position
//   created    none                                       → inserted at the canonical position
//   multiple   more than one                              → NOTHING written
//   bad-section the new section is not one section        → NOTHING written
//   unbounded  the existing section opens a fence that never closes → NOTHING written
//   unplaceable the write would not read back as exactly one section → NOTHING written
//
// The last two exist because an unclosed fence protects everything after it: every
// later heading and marker becomes "example text", the span runs to EOF, and a
// replace deleted the Change Log and every later section while reporting
// `replaced` (task.155 PR review 2, CR-1). A write is therefore checked twice —
// the section it would replace must be bounded, and the result must read back as
// one section — and refused rather than committed when either fails.
//
// `multiple` REFUSES rather than guesses. Which copy is current is a judgement
// the engine cannot make (task.65's rule — keep the copy linking the highest gate —
// is a human repair, stated in the halt message the callers print).
//
// Why this sits BESIDE change-log.js instead of inside it: the Change Log is
// append-only history and this section is a snapshot replaced every cycle. One
// function with two write rules is how one of them gets broken. What is shared is
// the part that is hard — fence and inline-code protection, the frontmatter scope,
// locating the change-log block — and that is imported, not re-derived: bug.13
// took three cycles to get the fence handling right once.
//
// Two span rules the first design got wrong (task.155 review, C1/C2):
//
//   1. A heading counts when its text BEGINS "QA Testing Results". task.65's
//      stacked copies are titled "## QA Testing Results — Cycle 2 (re-review)";
//      an exact-line match counted that document as one section.
//   2. A section ends at the EARLIEST of the next heading of level ≤ 2 and the
//      change-log block start. The canonical position is directly before the
//      block, so "next ≤ 2 heading" alone runs to `## Change Log` — inside the
//      block — and a replace deletes `<!-- change-log-start -->`.
//
// Separators are not span: trailing blank lines and one thematic break (`---`)
// directly before the terminator stay where they are on every write.

const {
  CL_START,
  CL_END,
  LEGACY_MARKER_PAIRS,
  fencedRanges,
  protectedRanges,
  insideProtected,
  bodyStart,
  findChangeLog,
  ANCHORS,
} = require("./change-log.js");

const HEADING = "## QA Testing Results";
const RE_QA = /^## QA Testing Results\b[^\n]*$/gm;
const RE_H1_H2 = /^#{1,2}[ \t]/;
// A change-log table's header row: first cell `Date`, whatever follows. The current
// spec's `| Date | Version | … |` and the legacy sync logs' `| Date | Change |` both
// match; only the header's first cell is fixed across every shape (task.155 QA
// cycle 2, REL-005).
const RE_LOG_HEADER = /^\|[ \t]*Date[ \t]*\|/i;
// A thematic break line. Only counted as a separator when a blank line precedes it:
// directly under a paragraph line, `---` is a setext H2 underline, not a break.
const RE_BREAK =
  /^[ \t]{0,3}(?:-[ \t]*){3,}$|^[ \t]{0,3}(?:\*[ \t]*){3,}$|^[ \t]{0,3}(?:_[ \t]*){3,}$/;

const isBlank = (line) => /^[ \t]*\r?$/.test(line);

// Pull a raw span end back over trailing blank lines and one separator break.
// `rawEnd` is at a line start (a heading, a marker, or EOF). Returns the offset just
// past the section's last content line (its newline included when it has one).
function trimSeparator(content, start, rawEnd) {
  const lines = content.slice(start, rawEnd).split("\n");
  // A span that ends at a line start splits with a trailing "" — drop it.
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  const popBlanks = () => {
    while (lines.length > 1 && isBlank(lines[lines.length - 1])) lines.pop();
  };
  popBlanks();
  const last = lines[lines.length - 1].replace(/\r$/, "");
  if (
    lines.length > 2 &&
    RE_BREAK.test(last) &&
    isBlank(lines[lines.length - 2])
  ) {
    lines.pop();
    popBlanks();
  }
  const kept = lines.join("\n").length;
  // Keep the last content line's newline inside the span when the text has one.
  return content[start + kept] === "\n" ? start + kept + 1 : start + kept;
}

// EVERY change-log marker block, current and legacy, as { start, endMarker, end }.
// `findChangeLog` answers "which block is the log" (the earliest); containment needs
// all of them — a dual-synced document carries a legacy pair and the current pair,
// and a section inside the later block must still be bounded by ITS end marker
// (task.155 QA cycle 1, REL-003). Markers are matched the way findChangeLog's
// findMarkerBlock matches them: unprotected start, first unprotected end after it.
function markerBlocks(content, ranges) {
  const blocks = [];
  const pairs = [{ start: CL_START, end: CL_END }, ...LEGACY_MARKER_PAIRS];
  for (const { start: open, end: close } of pairs) {
    let from = 0;
    for (;;) {
      const s = content.indexOf(open, from);
      if (s === -1) break;
      from = s + open.length;
      if (insideProtected(ranges, s)) continue;
      let e = content.indexOf(close, from);
      while (e !== -1 && insideProtected(ranges, e)) {
        e = content.indexOf(close, e + close.length);
      }
      if (e === -1) break;
      blocks.push({ start: s, endMarker: e, end: e + close.length });
      from = e + close.length;
    }
  }
  return blocks.sort((a, b) => a.start - b.start);
}

// Offset of the LAST unprotected change-log table header in [from, to): a line
// matching RE_LOG_HEADER whose previous line is not itself a table row.
function lastTableStart(content, from, to, ranges) {
  let found = -1;
  let offset = from;
  let prevRow = false;
  for (const line of content.slice(from, to).split("\n")) {
    const isRow = /^\|/.test(line);
    if (
      isRow &&
      !prevRow &&
      RE_LOG_HEADER.test(line) &&
      !insideProtected(ranges, offset)
    ) {
      found = offset;
    }
    prevRow = isRow;
    offset += line.length + 1;
  }
  return found;
}

// Does a fence that opens in [from, to) never close? A sentinel appended past the
// end sits inside a fenced range only when that range is unclosed (fencedRanges
// runs an unclosed fence to EOF); a closed fence at EOF ends before it.
function unclosedFence(content, from, to) {
  const probe = `${content}\n\n\u0000`;
  const sentinel = probe.length - 1;
  return fencedRanges(probe).some(
    ([s, e]) => s >= from && s < to && sentinel >= s && sentinel < e,
  );
}

// The first unprotected match of `re` (non-global) at or after `from`.
function firstUnprotected(content, re, from, ranges) {
  const g = new RegExp(re.source, "gm");
  g.lastIndex = from;
  for (let m = g.exec(content); m; m = g.exec(content)) {
    if (!insideProtected(ranges, m.index)) return m.index;
  }
  return -1;
}

/**
 * Find every `## QA Testing Results` section in a document.
 *
 * @param {string} content
 * @returns {{ sections: Array<{start:number,end:number,insideChangeLog:boolean,heading:string}>, changeLog: object|null }}
 */
function findQaResults(content) {
  const ranges = protectedRanges(content);
  const from = bodyStart(content);
  const changeLog = findChangeLog(content);
  const sections = [];

  const blocks = markerBlocks(content, ranges);

  for (const m of content.matchAll(RE_QA)) {
    if (m.index < from || insideProtected(ranges, m.index)) continue;
    const start = m.index;
    const bodyOffset = start + m[0].length;
    const block = blocks.find((b) => start > b.start && start < b.end);
    let insideChangeLog = !!block;

    const candidates = [content.length];
    const nextHeading = firstUnprotected(content, RE_H1_H2, bodyOffset, ranges);
    if (nextHeading !== -1) candidates.push(nextHeading);
    if (block) {
      candidates.push(block.endMarker);
    } else {
      // A section before a marker block ends at that block, never inside it: the
      // canonical position is directly before the block, so "next ≤ 2 heading" alone
      // runs to `## Change Log` and a replace deletes the start marker (review C2).
      const next = blocks.find((b) => b.start > start);
      if (next) candidates.push(next.start);
      // The same holds for a marker-less log: an H3 `### Change Log` does not end a
      // `##` span, so a section created directly above one swallowed the whole log on
      // its next replace. The cycle-1 rewrite narrowed this bound to marker blocks
      // and lost the case (task.155 PR review 1, CR-1).
      if (changeLog && !changeLog.hasMarkers && changeLog.start > start) {
        candidates.push(changeLog.start);
      }
    }
    // A section written between a change-log heading and that log's table must not
    // carry the table away. Two shapes, and only these two (task.155 QA cycles 1–2,
    // REL-002/004): inside a marker block; or directly under a marker-less
    // `## Change Log` whose own body holds no Date-headed table yet — its table is
    // then below this section. A
    // section merely somewhere after a finished log is placed correctly and is
    // replaced like any other, even when it quotes a Date-headed table (REL-004).
    // The log's table is the LAST Date-headed table in the span: a table the stale
    // section quotes comes before the log's own (REL-006).
    const underTablelessLog =
      !block &&
      changeLog &&
      !changeLog.hasMarkers &&
      changeLog.end === start &&
      lastTableStart(content, changeLog.start, start, ranges) === -1;
    if (block || underTablelessLog) {
      const tbl = lastTableStart(
        content,
        bodyOffset,
        Math.min(...candidates),
        ranges,
      );
      if (tbl !== -1) {
        candidates.push(tbl);
        insideChangeLog = true;
      }
    }
    const rawEnd = Math.min(...candidates);

    sections.push({
      start,
      end: trimSeparator(content, start, rawEnd),
      insideChangeLog,
      unbounded: unclosedFence(content, start, rawEnd),
      heading: m[0].replace(/\r$/, ""),
    });
  }
  return { sections, changeLog };
}

// The first unprotected match of a doc-type anchor, past the frontmatter.
function anchorOffset(content, docType) {
  const anchor = ANCHORS[docType];
  if (!anchor) return -1;
  const ranges = protectedRanges(content);
  const from = bodyStart(content);
  for (const m of content.matchAll(new RegExp(anchor.source, "gm"))) {
    if (m.index >= from && !insideProtected(ranges, m.index)) return m.index;
  }
  return -1;
}

// Where a section goes when it is written fresh: before the change-log block, else
// before the doc-type anchor, else at the end. Never "before the first ##".
function canonicalOffset(content, docType) {
  const changeLog = findChangeLog(content);
  if (changeLog) return changeLog.start;
  const anchor = anchorOffset(content, docType);
  return anchor === -1 ? content.length : anchor;
}

// Splice `body` in at `pos` with exactly one blank line on each side.
function insertAt(content, pos, body) {
  const before = content.slice(0, pos).trimEnd();
  const after = content.slice(pos).trimStart();
  const head = before ? `${before}\n\n` : "";
  return after ? `${head}${body}\n\n${after}` : `${head}${body}\n`;
}

// Normalise the caller's section: leading blank lines and trailing whitespace go;
// it must then be exactly one section AND nothing else. A second H1/H2 inside it —
// qa-story's `## QA Completion Summary` rendered into the same file, say — would sit
// past the section's own span once written, so every later write left that copy and
// added another (task.155 QA cycle 1, REL-001).
function normaliseSection(section) {
  if (typeof section !== "string") return null;
  // A trailing thematic break is a separator, never section content: the span
  // excludes it on read, so keeping it here stacked one `---` per replace
  // (task.155 PR review 1, CR-2).
  const body = section
    .replace(/^(?:[ \t]*\r?\n)+/, "")
    .replace(
      /(?:\r?\n[ \t]{0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}))?\s*$/,
      "",
    );
  if (!body.startsWith(HEADING)) return null;
  // An unbalanced fence would make the section unbounded the moment it is written.
  if (unclosedFence(body, 0, body.length)) return null;
  if (findQaResults(body).sections.length !== 1) return null;
  const firstLineEnd = body.indexOf("\n");
  if (
    firstLineEnd !== -1 &&
    firstUnprotected(
      body,
      RE_H1_H2,
      firstLineEnd + 1,
      protectedRanges(body),
    ) !== -1
  ) {
    return null;
  }
  return body;
}

/**
 * Write the `## QA Testing Results` section: replace, relocate or create it.
 *
 * @param {string} content            full document text
 * @param {string} section            the rendered section, starting `## QA Testing Results`
 * @param {object} [opts]
 * @param {string} [opts.docType]     story | task | epic — picks the fallback anchor
 * @returns {{ content: string, reason: string, count?: number }}  reason is one of
 *   replaced | relocated | created (written) or multiple | bad-section | unbounded |
 *   unplaceable (content returned unchanged). Callers write only on the first three.
 */
function upsertQaResults(content, section, { docType = "" } = {}) {
  const body = normaliseSection(section);
  if (body === null) return { content, reason: "bad-section" };

  const { sections } = findQaResults(content);
  if (sections.length > 1) {
    return { content, reason: "multiple", count: sections.length };
  }
  if (sections.some((s) => s.unbounded))
    return { content, reason: "unbounded" };
  const checked = (out, reason) => {
    const post = findQaResults(out).sections;
    return post.length === 1 && !post[0].unbounded
      ? { content: out, reason }
      : { content, reason: "unplaceable" };
  };

  if (sections.length === 1 && !sections[0].insideChangeLog) {
    const { start, end } = sections[0];
    const rest = content.slice(end);
    const sep = rest === "" ? "\n" : rest.startsWith("\n") ? "\n" : "\n\n";
    return checked(content.slice(0, start) + body + sep + rest, "replaced");
  }

  let base = content;
  let reason = "created";
  if (sections.length === 1) {
    // Inside the block: cut it out, then insert at the canonical position computed
    // on the post-removal text (the block start, which the removal did not move).
    const { start, end } = sections[0];
    const before = content.slice(0, start).replace(/\n+$/, "\n");
    const after = content.slice(end).replace(/^\n+/, "");
    base =
      before.endsWith("\n\n") || !after
        ? before + after
        : `${before}\n${after}`;
    reason = "relocated";
  }
  return checked(insertAt(base, canonicalOffset(base, docType), body), reason);
}

module.exports = { HEADING, RE_QA, findQaResults, upsertQaResults };
