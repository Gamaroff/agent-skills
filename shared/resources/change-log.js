"use strict";

// ---------------------------------------------------------------------------
// change-log.js — the document Change Log, read and written
// ---------------------------------------------------------------------------
// Canonical spec: document-change-log.md. This module is the only implementation
// of it; every skill that records a moment on a PRD, epic, story, or task goes
// through here rather than building a table itself.
//
// Extracted from jira-sync.js, where it lived as ~105 tracker-specific lines and
// had three defects that a shared module makes structurally hard to reintroduce:
//
//   1. H2-only heading match.   `/^## Change Log/m` cannot see the `### Change Log`
//                               that the epic and story templates actually emit, so
//                               the "update in place" branch never fired and the
//                               fallback inserted a SECOND block at the top of the
//                               body — above the Epic Goal. Now H2/H3 with optional
//                               section numbering, and the level found is preserved.
//   2. End-of-block overrun.    The old end-scan looked only for `/^## /m`, so an H3
//                               log ran to the next H2 and swallowed its sibling
//                               subsections. Now the scan ends at the next heading of
//                               the SAME OR SHALLOWER level.
//   3. Top-of-body fallback.    "Insert before the first `##`" is how a Change Log
//                               ended up above the Epic Goal. Now a doc-type anchor,
//                               falling back to EOF — never to the top.
//
// And one guard that is new here rather than inherited:
//
//   4. Examples, not sections.  A marker pair or heading inside a ``` / ~~~ fence, or
//                               inside an inline code span, is a PICTURE of a Change
//                               Log rather than one. Documentation about this module
//                               is necessarily full of both — the spec beside this
//                               file, and the task documents that specified the
//                               engine (eleven fenced headings, two complete fenced
//                               marker pairs, and a checklist bullet naming both
//                               markers in backticks). Unguarded, running the engine
//                               over its own specification appends live rows into a
//                               code fence, "migrates" an illustrative row into real
//                               history, and overwrites the checklist bullet.
//
// Pure and tracker-agnostic: string in, string out. No I/O, no network, no dates
// invented — every caller passes the date it wants recorded.

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------
const CL_START = "<!-- change-log-start -->";
const CL_END = "<!-- change-log-end -->";

// Superseded pairs. Read and migrated in place; never written. A document synced
// to both trackers grew one of each, independently maintained — on first write
// through this engine they collapse into a single block.
const LEGACY_MARKER_PAIRS = [
  {
    start: "<!-- jira-sync-changelog-start -->",
    end: "<!-- jira-sync-changelog-end -->",
    author: "sync-jira",
  },
  {
    start: "<!-- github-sync-changelog-start -->",
    end: "<!-- github-sync-changelog-end -->",
    author: "sync-github",
  },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const blockRe = (start, end) =>
  new RegExp(`${escapeRe(start)}[\\s\\S]*?${escapeRe(end)}`);

// H2 or H3, optional section numbering ("### 1.5 Change Log", "## 12. Change Log").
// The numbering tolerance mirrors `sectionRe` in jira-sync.js, which learned it
// after a task card published an empty body because "## 1. Overview" did not match
// "## Overview". `Change Log` must be the ENTIRE heading text after the numbering —
// otherwise "## Change Log Format" would match.
const RE_HEADING =
  /^(#{2,3})[ \t]+(?:\d+(?:\.\d+)*[.)]?[ \t]+)?Change Log[ \t]*$/m;

// Anchored on a leading YYYY-MM-DD date cell, with the legacy HH:MM suffix accepted
// so migration can read old rows. Deliberately strict: an unrelated four-column body
// table must not be absorbed into the log, and a dropped row loses history — which is
// the one thing this whole module exists to preserve.
const RE_ENTRY_ROW = /^\|\s*\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?\s*\|/;

const isEntryRow = (line) => RE_ENTRY_ROW.test(line);

// ---------------------------------------------------------------------------
// Scope guards — frontmatter and fenced code
// ---------------------------------------------------------------------------

// Index of the first character AFTER the YAML frontmatter block, or 0 when there
// is none. Every heading search below starts here.
//
// Without it, `/^## /m` matches inside frontmatter: a value that quotes a heading
// name — a `description:` block scalar mentioning `## Change Log`, say — becomes
// the insertion point, and the changelog is written INTO the YAML. The document
// still parses, so nothing errors and nothing warns; the changelog silently
// becomes part of a field's value and is published to the tracker as such.
function bodyStart(content) {
  if (!content.startsWith("---")) return 0;
  const close = content.indexOf("\n---", 3);
  if (close === -1) return 0;
  const nl = content.indexOf("\n", close + 1);
  return nl === -1 ? content.length : nl + 1;
}

// Character ranges covered by fenced code blocks, as [start, end) pairs.
//
// Fence rules that matter here (CommonMark): a fence opens with 3+ backticks or
// 3+ tildes and closes only with a fence of the SAME character that is AT LEAST
// as long. That is why the opening length is recorded — a ``` inside a ~~~~ block,
// or inside a longer ```` block, does not close it. An unclosed fence runs to EOF,
// which is the safe reading: text after a stray fence is treated as example, not
// as a section to write into.
function fencedRanges(content) {
  const ranges = [];
  const lines = content.split("\n");
  let offset = 0;
  let open = null; // { char, len, start }

  for (const line of lines) {
    const lineLen = line.length + 1; // +1 for the newline consumed by split
    // Up to 3 leading spaces are allowed before a fence; 4+ makes it an indented
    // code block, which has no fence to match.
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);

    if (m) {
      const char = m[1][0];
      const len = m[1].length;
      if (!open) {
        // An opening fence's info string may not contain a backtick.
        if (!(char === "`" && m[2].includes("`"))) {
          open = { char, len, start: offset };
        }
      } else if (char === open.char && len >= open.len && m[2].trim() === "") {
        ranges.push([open.start, offset + lineLen]);
        open = null;
      }
    }
    offset += lineLen;
  }

  if (open) ranges.push([open.start, content.length]); // unclosed → runs to EOF
  return ranges;
}

// Character ranges covered by inline code spans (`like this`), scanned per line.
//
// Fenced blocks are not the only way a document shows a marker without meaning it.
// Prose that NAMES the markers puts them in backticks — the spec beside this file
// does it, and so does the task document that specified this engine:
//
//     - [ ] Create `change-log.js` with `CL_START`/`CL_END` = `<!-- change-log-start -->` /
//           `<!-- change-log-end -->` plus a `LEGACY_MARKER_PAIRS` table
//
// Unguarded, that pair of mentions reads as a complete marker block and the whole
// checklist bullet gets replaced by a generated table. Per-line is the right scope:
// a real marker always sits alone on its own line, unbackticked.
function inlineCodeRanges(content) {
  const ranges = [];
  let offset = 0;

  for (const line of content.split("\n")) {
    const runs = [];
    for (const m of line.matchAll(/`+/g)) {
      runs.push({ index: m.index, len: m[0].length });
    }
    // Pair each opener with the next run of EXACTLY the same length (CommonMark).
    const used = new Set();
    for (let i = 0; i < runs.length; i++) {
      if (used.has(i)) continue;
      for (let j = i + 1; j < runs.length; j++) {
        if (used.has(j) || runs[j].len !== runs[i].len) continue;
        ranges.push([offset + runs[i].index, offset + runs[j].index + runs[j].len]);
        used.add(i);
        used.add(j);
        break;
      }
    }
    offset += line.length + 1;
  }
  return ranges;
}

/** Every range a match must not fall inside: fenced blocks and inline code spans. */
function protectedRanges(content) {
  return [...fencedRanges(content), ...inlineCodeRanges(content)];
}

const insideFence = (ranges, index) =>
  ranges.some(([start, end]) => index >= start && index < end);

// ---------------------------------------------------------------------------
// Rows and blocks
// ---------------------------------------------------------------------------

function fmtEntry({ date, version = "", description = "", author = "" }) {
  return `| ${date} | ${version} | ${description} | ${author} |`;
}

function buildChangeLogBlock(entries, { level = 2 } = {}) {
  return (
    `${CL_START}\n${"#".repeat(level)} Change Log\n\n` +
    `| Date | Version | Description | Author |\n` +
    `|------|---------|-------------|--------|\n` +
    entries.join("\n") +
    `\n${CL_END}`
  );
}

// Split a table row into trimmed cells, dropping the empty strings that a leading
// and trailing pipe produce.
function rowCells(row) {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

// Widen a legacy 2-column row to the canonical 4 columns, preserving its content
// exactly. `| 2026-04-28 09:40 | Initial Jira story created |`
//       → `| 2026-04-28 |  | Initial Jira story created | sync-jira-story |`
//
// A row that already has 4+ cells is returned untouched — migration must never
// rewrite a row that is already canonical.
function migrateLegacyRow(row, { legacyAuthor = "", docType = "" } = {}) {
  const cells = rowCells(row);
  if (cells.length >= 4) return row;

  const date = (cells[0] || "").slice(0, 10); // drop the legacy HH:MM
  const description = cells[1] || "";
  const author = legacyAuthor && docType ? `${legacyAuthor}-${docType}` : legacyAuthor;
  return fmtEntry({ date, version: "", description, author });
}

function migrateLegacyEntries(rows, opts = {}) {
  return rows.map((row) => migrateLegacyRow(row, opts));
}

// ---------------------------------------------------------------------------
// Finding an existing block
// ---------------------------------------------------------------------------

// Every candidate is rejected when it falls inside a fenced block — see guard 4
// in the header. The marker path is checked first and is the one that actually
// fires on documentation about this module, so filtering only the heading path
// would leave the real exposure open.
function findMarkerBlock(content, ranges, start, end) {
  const re = blockRe(start, end);
  let from = 0;
  for (;;) {
    const slice = content.slice(from);
    const m = slice.match(re);
    if (!m) return null;
    const idx = from + m.index;
    if (!insideFence(ranges, idx)) {
      return { start: idx, end: idx + m[0].length };
    }
    from = idx + m[0].length;
  }
}

/**
 * Locate the document's Change Log.
 *
 * Order: current marker pair → either legacy pair → heading. Returns
 * `{ start, end, level, legacyAuthor, hasMarkers }` or `null`.
 */
function findChangeLog(content) {
  const ranges = protectedRanges(content);

  const current = findMarkerBlock(content, ranges, CL_START, CL_END);
  if (current) {
    return { ...current, level: headingLevelWithin(content, current), legacyAuthor: "", hasMarkers: true };
  }

  for (const pair of LEGACY_MARKER_PAIRS) {
    const found = findMarkerBlock(content, ranges, pair.start, pair.end);
    if (found) {
      return {
        ...found,
        level: headingLevelWithin(content, found),
        legacyAuthor: pair.author,
        hasMarkers: true,
      };
    }
  }

  // Hand-written heading, scoped past frontmatter.
  const from = bodyStart(content);
  let searchFrom = from;
  for (;;) {
    const scope = content.slice(searchFrom);
    const m = scope.match(RE_HEADING);
    if (!m) return null;

    const start = searchFrom + m.index;
    if (insideFence(ranges, start)) {
      searchFrom = start + m[0].length;
      continue;
    }

    const level = m[1].length;
    // End at the next heading of the SAME OR SHALLOWER level. An H3 log under
    // `## Notes & Updates` ends at the next `###` or `##`, whichever comes first —
    // the old code scanned only for `## ` and swallowed sibling subsections.
    const after = content.slice(start + m[0].length);
    const nextRe = new RegExp(`^#{1,${level}}[ \\t]`, "m");
    const next = after.match(nextRe);
    const end = next
      ? start + m[0].length + next.index
      : content.length;

    return { start, end, level, legacyAuthor: "", hasMarkers: false };
  }
}

// The heading level used inside an already-located marker block, so a rewrite
// preserves it. Defaults to 2 when the block carries no heading.
function headingLevelWithin(content, { start, end }) {
  const m = content.slice(start, end).match(RE_HEADING);
  return m ? m[1].length : 2;
}

/** Entry rows currently recorded in the document, in document order. */
function extractEntries(content) {
  const found = findChangeLog(content);
  if (!found) return [];
  return content.slice(found.start, found.end).split("\n").filter(isEntryRow);
}

// ---------------------------------------------------------------------------
// Insertion anchors
// ---------------------------------------------------------------------------

// Where a brand-new block goes, per doc type. NEVER "before the first `##`" —
// that is how a Change Log ended up above the Epic Goal. An anchor that does not
// match falls through to EOF, which is harmless; guessing the top is not.
const ANCHORS = {
  story: /^## Dev Agent Record\b/m,
  task: /^## Progress Tracking\b/m,
  epic: /^## Notes & Updates\b/m,
};

// ---------------------------------------------------------------------------
// The write path
// ---------------------------------------------------------------------------

/**
 * Append an entry to the document's Change Log, creating the section if absent.
 *
 * @param {string} content            full document text
 * @param {object} entry              { date, version?, description, author }
 * @param {object} [opts]
 * @param {string} [opts.docType]     story | task | epic | prd — picks the anchor
 * @returns {string}                  the updated document
 */
function upsertChangeLog(content, entry, { docType = "" } = {}) {
  const newRow = fmtEntry(entry);
  const found = findChangeLog(content);

  if (found) {
    const existing = content
      .slice(found.start, found.end)
      .split("\n")
      .filter(isEntryRow);
    const migrated = found.legacyAuthor
      ? migrateLegacyEntries(existing, { legacyAuthor: found.legacyAuthor, docType })
      : existing;

    // A document synced to both trackers carries a second legacy block. Collapse
    // it into this one rather than leaving two logs behind.
    const rest = collapseOtherLegacyBlocks(
      content.slice(found.end),
      docType,
      found.legacyAuthor,
    );

    // Only when rows from a second block are being merged in do the historical
    // rows get sorted — otherwise the two blocks' histories would interleave
    // wrongly. In the ordinary single-block case the existing order is preserved
    // untouched, because the log is append-only and its order is its history.
    const history = rest.entries.length
      ? [...migrated, ...rest.entries].sort(byDate)
      : migrated;

    const block = buildChangeLogBlock([...history, newRow], {
      level: found.level,
    });
    const trailing = found.end < content.length ? "\n\n" : "\n";
    return content.slice(0, found.start) + block + trailing + rest.content;
  }

  const anchor = ANCHORS[docType];
  if (anchor) {
    const from = bodyStart(content);
    const ranges = protectedRanges(content);
    const scope = content.slice(from);
    const m = scope.match(anchor);
    if (m && !insideFence(ranges, from + m.index)) {
      const idx = from + m.index;
      return (
        content.slice(0, idx) +
        buildChangeLogBlock([newRow]) +
        "\n\n" +
        content.slice(idx)
      );
    }
  }

  return content.trimEnd() + "\n\n" + buildChangeLogBlock([newRow]) + "\n";
}

// Sort comparator on the leading date cell. `Array.prototype.sort` is stable, so
// rows sharing a date keep their original relative order.
const byDate = (a, b) => rowCells(a)[0].localeCompare(rowCells(b)[0]);

// Remove any *other* legacy block from the remainder of the document and return
// its rows, so a dual-synced document ends with exactly one Change Log.
function collapseOtherLegacyBlocks(rest, docType, alreadyMigrated) {
  const entries = [];
  let out = rest;

  for (const pair of LEGACY_MARKER_PAIRS) {
    if (pair.author === alreadyMigrated) continue;
    const found = findMarkerBlock(out, protectedRanges(out), pair.start, pair.end);
    if (!found) continue;
    const rows = out.slice(found.start, found.end).split("\n").filter(isEntryRow);
    entries.push(
      ...migrateLegacyEntries(rows, { legacyAuthor: pair.author, docType }),
    );
    out = (out.slice(0, found.start) + out.slice(found.end)).replace(/\n{3,}/g, "\n\n");
  }

  return { entries, content: out };
}

// ---------------------------------------------------------------------------
// Frontmatter timestamp
// ---------------------------------------------------------------------------

/**
 * Set frontmatter `updated:` to `date`. Leaves `created` alone. A document with no
 * frontmatter is returned unchanged.
 *
 * Every Change Log entry should bump `updated` in the same edit — `updated` is this
 * repo's OKF `timestamp`, and a log entry that does not move it leaves the document
 * claiming it was last touched before its own most recent recorded change.
 */
function bumpUpdated(content, date) {
  const end = bodyStart(content);
  if (end === 0) return content;

  const fm = content.slice(0, end);
  const re = /^updated:[ \t]*.*$/m;
  if (re.test(fm)) {
    return fm.replace(re, `updated: ${date}`) + content.slice(end);
  }
  // No `updated:` key — add one after `created:` when present, else leave the
  // document alone rather than guessing where a new key belongs.
  const createdRe = /^(created:[ \t]*.*)$/m;
  if (createdRe.test(fm)) {
    return fm.replace(createdRe, `$1\nupdated: ${date}`) + content.slice(end);
  }
  return content;
}

// ---------------------------------------------------------------------------
// Legacy row parsing — for the jira-sync.js back-compat shim
// ---------------------------------------------------------------------------

/**
 * Parse a preformatted legacy row back into an entry object.
 *
 * The three `sync-jira-*` scripts pass `upsertChangelog(content, row)` where `row`
 * is already a formatted 2-column string. Rather than change those call sites in
 * this task, the shim parses the row back out and delegates. Task.45 rewires them
 * to call `upsertChangeLog` directly with a real entry object.
 */
function parseLegacyRow(row, author = "") {
  const cells = rowCells(String(row));

  // Already canonical (Date | Version | Description | Author) — read it as-is
  // rather than treating cell 1 as the description, which would silently emit a
  // row with an empty description and drop the caller's text.
  if (cells.length >= 4) {
    return {
      date: (cells[0] || "").slice(0, 10),
      version: cells[1] || "",
      description: cells[2] || "",
      author: cells[3] || author,
    };
  }

  return {
    date: (cells[0] || "").slice(0, 10),
    version: "",
    description: cells[1] || "",
    author,
  };
}

module.exports = {
  // markers
  CL_START,
  CL_END,
  LEGACY_MARKER_PAIRS,
  // regexes / predicates
  RE_HEADING,
  RE_ENTRY_ROW,
  isEntryRow,
  // scope guards
  bodyStart,
  fencedRanges,
  inlineCodeRanges,
  protectedRanges,
  insideFence,
  // rows and blocks
  fmtEntry,
  buildChangeLogBlock,
  migrateLegacyEntries,
  parseLegacyRow,
  // read
  findChangeLog,
  extractEntries,
  // write
  ANCHORS,
  upsertChangeLog,
  bumpUpdated,
};
