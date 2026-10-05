// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-results.js. Regenerate via `npm run bundle`.
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
//   unbounded  the existing section cannot be bounded safely — it opens a fence that
//              never closes, or the text a write would remove carries a change-log
//              marker, an H1/H2 or a change-log heading      → NOTHING written
//   unplaceable the write would not read back as exactly one section → NOTHING written
//
// Every refusal also carries a `detail` naming the rule that fired, so a halt can say
// what to repair (task 171, task.155 PR review 5 CR-1):
//
//   not-a-section            the render does not start with the heading, or is not one section
//   unclosed-fence           a fence opens and never closes
//   structural-line:<line>   the line (trimmed, at most 60 chars) the structural guard caught
//   carried-block:<name>     the render brings its own Bug Reports / Deferred Work block
//   trailing-comment         the render ends in an HTML comment, which a read peels as a separator
//   multiple:<n>             n sections found
//   read-back:<n>            the write would read back as n sections, or an unbounded one
//
// The last two reasons exist because an unclosed fence protects everything after it: every
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
  RE_HEADING,
  fencedRanges,
  protectedRanges,
  insideProtected,
  bodyStart,
  findChangeLog,
  isEntryRow,
  ANCHORS,
} = require("./change-log.js");

const HEADING = "## QA Testing Results";
const RE_QA = /^## QA Testing Results\b[^\n]*$/gm;
const RE_H1_H2 = /^#{1,2}[ \t]/;
// A thematic break line. Only counted as a separator when a blank line precedes it:
// directly under a paragraph line, `---` is a setext H2 underline, not a break.
const RE_BREAK =
  /^[ \t]{0,3}(?:-[ \t]*){3,}$|^[ \t]{0,3}(?:\*[ \t]*){3,}$|^[ \t]{0,3}(?:_[ \t]*){3,}$/;

// Any heading that names a change log, at any level (the marker-less H3 form is how
// the story and epic templates emit it). This is the broad net; change-log.js's own
// RE_HEADING — the grammar findChangeLog recognises, numbering such as `1.5` and
// `12)` included — is checked beside it everywhere, never restated here (task.155
// QA cycle 6, REL-015: a restated `\d+\.?` missed `### 1.5 Change Log`).
const RE_LOG_HEADING = /^ {0,3}#{1,6}[ \t]+(?:\d+\.?[ \t]+)?Change Log\b/i;
// What a replace or relocate may never remove, scanned in the removed text IGNORING
// fences: a change-log marker, an ATX H1/H2 (column 0 or indented 1–3 spaces), or a
// change-log heading at any level. Fence-blind on purpose — every earlier bound was
// protection-aware, so one stray fence in the section re-paired every fence after it
// and the span widened over real headings and markers as "example text"
// (task.155 PR review 2 CR-1; QA cycle 5 REL-012, REL-014). A setext H1/H2 is
// structural too (task 171): its underline is checked against the line above it in
// `removesStructure`. The one corpus instance task.155 found — task.118's `---` directly
// under a paragraph inside its QA section — was an accidental heading, repaired in the
// document when this rule landed.
const RE_STRUCTURAL = [
  // Every marker change-log.js knows, from its own constants (gate 6 CR-7).
  new RegExp(
    `^ {0,3}(?:${[
      CL_START,
      CL_END,
      ...LEGACY_MARKER_PAIRS.flatMap((p) => [p.start, p.end]),
    ]
      .map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})`,
  ),
  /^ {0,3}#{1,2}(?:[ \t]|$)/,
  RE_LOG_HEADING,
  RE_HEADING,
];

// Subsections another skill writes INTO this section, which a whole-section replace
// must carry rather than drop. create-bug-report Step 5 (task mode) appends a
// `### Bug Reports` list here; 11 tracked task documents carry one, and a replace
// that dropped it lost every bug link on the next QA cycle (task.155 PR review 3,
// CR-1). The list is closed on purpose: every other `###` in the section is QA's
// own and is replaced whole — carrying all of them would preserve stale cycle
// history, which is exactly what "replace whole" exists to remove.
// Two writers own subsections here: create-bug-report Step 5 (`### Bug Reports`)
// and the develop pipelines' route-2/2b loop exit, which records carried finding ids
// "on the work item under Deferred Work" — task.141 carries that block inside its QA
// section, and a replace deleted 52 lines of it (task.155 PR review 4, PC-1).
const CARRIED_SUBSECTIONS = ["Bug Reports", "Deferred Work"];

// A carried subsection starts at one of two lines naming it (any case):
//   - a `###`/`####` heading, with any trailing text such as ` (2)` (REL-023), the
//     singular `Bug Report` included (REL-027). It runs to the next unprotected heading
//     of its OWN level or shallower — a `####` block stops at the next `####`, so it
//     cannot carry QA's later `####` subsections (REL-025);
//   - a bold label alone on its line, `**Bug Reports**` / `**Deferred Work**` (REL-027,
//     and the legacy REL-030 record). It runs to the next heading of level 3 or
//     shallower (task 183 — its `####` groups stay inside it), or the next bold label
//     alone on its line that does NOT introduce a list or table — a sub-label such as `**From cycle 2:**` over its items belongs to the
//     block; QA's own `**Recommendations**` over a paragraph does not (task 171 QA
//     cycle 1, CR-2: stopping at every sub-label deleted the items under it).
// Either form also stops at the first of QA's OWN template field lines
// (`**QA Status**:` …). Real lists are richer than bullets — `####` groups, tables,
// bold labels (task.116, task.42, task.76, task.94) — so the block is carried whole;
// QA's own fields are never carried, so a list written above them cannot drag a stale
// verdict along (task.155 QA cycle 8, REL-021).
const RE_QA_FIELD =
  /^\*\*(?:QA Status|QA Engineer|Testing Date|Quality Score|Gate Decision)\*\*:/;
// There is deliberately no list of QA-owned bold labels that ends a carried block over a
// list. A stale QA list after a carried block and a bug list grouped under a sub-label
// are the same shape, and stopping at the label deleted the grouped list (task 183 QA
// cycles 4–5, CR4-3, CR5-1). A stale list is carried instead — a duplicate, never a
// deletion — and that residue (CR2-4) is recorded in task.183's Deferred Work.
const RE_BOLD_LABEL = /^\*\*[^*\n]+\*\*:?[ \t]*$/;
// `Bug Reports?` reads the singular too; each pattern maps back to its carried name.
const CARRIED_PATTERN = {
  "Bug Reports": "Bug Reports?",
  "Deferred Work": "Deferred Work",
};

function collectBlocks(text, name) {
  const ranges = protectedRanges(text);
  const pat = CARRIED_PATTERN[name];
  const re = new RegExp(
    `^(?:(#{3,4})[ \\t]+(${pat}\\b[^\\n]*?)|\\*\\*(${pat})\\*\\*:?[ \\t]*)\\r?$`,
    "gim",
  );
  const blocks = [];
  for (const m of text.matchAll(re)) {
    if (insideProtected(ranges, m.index)) continue;
    const level = m[1] ? m[1].length : 0; // 0 = a bold-label block
    const bodyAt = m.index + m[0].length + 1;
    const lines = text.slice(bodyAt).split("\n");
    const bare = (i) => (lines[i] ?? "").replace(/\r$/, "");
    // Does the next non-blank line after line i open a list or a table?
    const introducesList = (i) => {
      let j = i + 1;
      while (j < lines.length && /^[ \t]*$/.test(bare(j))) j++;
      return (
        j < lines.length &&
        /^[ \t]*(?:[-*+][ \t]|\d+[.)][ \t]|\|)/.test(bare(j))
      );
    };
    const stops = (i) => {
      const l = bare(i);
      if (RE_QA_FIELD.test(l)) return true;
      if (level) return new RegExp(`^#{1,${level}}[ \\t]`).test(l);
      // A bold label sits at the level of a `###` subsection, so like a `###` block it
      // stops at a heading of level 3 or shallower and keeps its `####` groups (task
      // 183, 5c CR-2: stopping at any heading carried the label and dropped the group).
      return (
        /^#{1,3}[ \t]/.test(l) || (RE_BOLD_LABEL.test(l) && !introducesList(i))
      );
    };
    let end = text.length;
    let offset = bodyAt;
    for (let i = 0; i < lines.length; i++) {
      if (!insideProtected(ranges, offset) && stops(i)) {
        end = offset;
        break;
      }
      offset += lines[i].length + 1;
    }
    const whole = text.slice(m.index, Math.min(end, text.length)).trimEnd();
    blocks.push({
      name,
      start: m.index,
      whole,
      // A folded block keeps its heading's text as a bold line (CR-4); a bold-label
      // block's first line already is one.
      label: level
        ? `**${m[2].replace(/\r$/, "").trim()}**`
        : m[0].replace(/\r$/, ""),
      body: whole.slice(m[0].length).replace(/^(?:\r?\n)+/, ""),
    });
  }
  return blocks;
}

// Every carried block in `text`, across all names, outermost only: a block whose start
// lies inside an earlier kept block is part of that block and is not carried again
// (task 171, REL-028 — a `#### Deferred Work` nested in a Bug Reports block was carried
// under both names and doubled on every write).
function carriedBlocks(text) {
  const all = CARRIED_SUBSECTIONS.flatMap((n) => collectBlocks(text, n)).sort(
    (a, b) => a.start - b.start,
  );
  const kept = [];
  for (const b of all) {
    const outer = kept[kept.length - 1];
    if (outer && b.start < outer.start + outer.whole.length) continue;
    kept.push(b);
  }
  return kept;
}

// Merge every carried subsection found in `removed` into `body` (task.155 QA cycle 8,
// REL-020/023): the first old block whole, later ones folded beneath it — but only when
// the fold reads back as that one block. A later block whose own `####` heading or bold
// label would end the first block on the next read is emitted whole under its own
// heading instead: folded, it survived one write and was cut on the next (task 171 QA
// cycle 1, CR-1). So a second
// `### Bug Reports` (create-bug-report checks for an H2 but writes an H3, so it can
// open one) is kept rather than dropped. A render never brings its own carried block —
// `normaliseSection` refuses one — so the engine alone owns carrying and nothing has to
// be reconciled line by line (PR review 4, REL-026: that reconciliation dropped every
// line without a link).
function mergeCarried(body, removed, eol = "\n") {
  const gap = eol + eol;
  const blocks = carriedBlocks(removed);
  let out = body;
  for (const name of CARRIED_SUBSECTIONS) {
    const old = blocks.filter((b) => b.name === name);
    if (!old.length) continue;
    // The first block is kept whole; later ones fold in beneath it, each body once,
    // under their own heading text as a bold line (CR-4) — when the fold reads back.
    const parts = [old[0].whole];
    const seen = new Set([old[0].body.trim()]);
    for (const b of old.slice(1)) {
      // A body already carried is skipped by EQUALITY: a substring test dropped `- REL-1`
      // because an earlier block held `- REL-12` (task 171 QA cycle 2, CR2-3).
      if (!b.body || seen.has(b.body.trim())) continue;
      seen.add(b.body.trim());
      const folded = `${parts[0]}${gap}${b.label}${gap}${b.body}`;
      const [back] = collectBlocks(folded, name);
      if (back && back.start === 0 && back.whole === folded.trimEnd())
        parts[0] = folded;
      else parts.push(b.whole);
    }
    out = `${out}${gap}${parts.join(gap)}`;
  }
  return out;
}

// A setext H1/H2 underline, judged with the line above it. After a blank line a `---` is
// a thematic break, not a heading.
const RE_SETEXT = /^ {0,3}(?:=+|-+)[ \t]*$/;

// A line that certainly is not paragraph text, so an underline below it is not a setext
// heading. Everything else is a heading candidate: the check leans toward refusing
// (task 183, CR5-1). The exemption it replaced matched any line opening with `#`, `<`,
// "```" or a digit-dot, so six shapes CommonMark reads as paragraph text —
// `#538 Notes`, an autolink, inline `<b>`, an HTML type-7 line, a code span, an ordered
// item not starting at 1 — were exempted and their sections deleted on replace. Per CommonMark: an ATX
// heading needs a space or end of line after its hashes; only a bullet or an ordered
// item starting at 1 can interrupt a paragraph; a backtick fence opener's info string
// holds no backtick.
function notParagraph(line) {
  return (
    /^[ \t]*$/.test(line) ||
    /^ {0,3}#{1,6}(?:[ \t]|$)/.test(line) || // ATX heading
    /^ {0,3}(?:~{3,}|`{3,}(?!.*`))/.test(line) || // fence opener
    /^ {0,3}(?:[-*+]|1[.)])[ \t]/.test(line) || // list item that can interrupt
    /^ {0,3}>/.test(line) || // block quote
    /^[ \t]*\|/.test(line) || // table row
    /^ {0,3}<!--/.test(line) // HTML comment line
  );
}

// A change-log table's header row. The current spec's `| Date | Version | … |`, the
// legacy sync logs' `| Date | Change |` (task.155 QA cycle 2, REL-005) and a Version-first
// `| Version | Date | … |` log (task 183) all carry a `Date` cell; its position is not fixed.
// Two questions use it with different reach (task 183 QA cycle 1, CR-1): whether a log
// table EXISTS — any `Date` column, so a Version-first log is seen and the write refused
// rather than cut — and where a section may be CUT, which only a Date-first header earns
// (RE_LOG_HEADER). A cut is the risky direction: cutting at a table the section quotes
// leaves its rows in the log (REL-006/007), and QA sections quote `| Cycle | Date | … |`.
const RE_LOG_HEADER = /^\|[ \t]*Date[ \t]*\|/i;
// Does a table row have a cell reading `Date`, in any position? The leading pipe opens the
// row; a trailing pipe is optional, so only an empty last cell is dropped, never the last
// real one (task 183 review, O2).
function hasDateColumn(row) {
  const cells = row.trim().split("|").slice(1);
  if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
  return cells.some((c) => /^\s*Date\s*$/i.test(c));
}

// The first line, past the section's own heading, that a write may not remove — or
// null. `underLog` adds dated change-log rows (`isEntryRow`, header-agnostic): a section
// sitting inside or directly under a change log must not span one, because which rows
// belong to the log and which the section quotes cannot be told apart (task 171,
// REL-007/008). A section placed elsewhere may quote dated rows and replace them.
function removesStructure(removed, { underLog = false } = {}) {
  // Fence-blind, like the ATX and marker checks (RE_STRUCTURAL): a setext underline is
  // structure wherever it stands, so fenced YAML — `key: value` over `---` — is refused
  // with a detail, the same accepted trade as a fenced `# comment` (task.155 REL-016).
  // Three cycles tried to exempt "well-paired" fences and each was beaten by a fence
  // mis-pairing that let a replace delete a real setext section (task 171 QA cycles
  // 2–4: CR2-2, CR3-1, CR4-1). Refusing is the direction that cannot lose content.
  const lines = removed.split("\n").map((l) => l.replace(/\r$/, ""));
  let logTable = false; // inside a table whose header has a `Date` column
  // A log table with a header and no data rows is still a log: under a log, its header
  // is reported when the table ends, so a header-only log is refused rather than its
  // header removed (QA cycle 2, CR2-2).
  let logHeader = null;
  let logData = false;
  const headerOnly = () =>
    underLog && logTable && logHeader !== null && !logData
      ? logHeader.trim().slice(0, 60)
      : null;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    const isRow = /^[ \t]*\|/.test(l);
    // A table's header is its first `|` line. Every data row of a table with a `Date`
    // column counts, not only an ISO-dated one: the log's writer keeps non-ISO rows
    // (`| 03/01/2026 |`), and an ISO-only test let them be deleted on relocate (task 171
    // QA cycle 1, CR-3). `Date` in any position, so a `| Version | Date | … |` log keeps
    // its rows too (task 183, 5c CR-1); the header itself is excluded by the same test.
    const header = isRow && !/^[ \t]*\|/.test(lines[i - 1]) && hasDateColumn(l);
    if (header) {
      logTable = true;
      logHeader = l;
      logData = false;
    } else if (!isRow) {
      const bare = headerOnly();
      if (bare !== null) return bare;
      logTable = false;
      logHeader = null;
    }
    const logRow =
      isEntryRow(l) ||
      (logTable && !header && !/^[ \t]*\|[\s\-:|]+\|[ \t]*$/.test(l));
    if (logTable && logRow) logData = true;
    if (
      RE_STRUCTURAL.some((re) => re.test(l)) ||
      (RE_SETEXT.test(l) && i > 1 && !notParagraph(lines[i - 1])) ||
      (underLog && logRow)
    ) {
      // A setext underline is reported with the text it makes a heading of.
      const shown =
        RE_SETEXT.test(l) && !RE_STRUCTURAL.some((re) => re.test(l))
          ? `${lines[i - 1].trim()} / ${l.trim()}`
          : l.trim();
      return shown.slice(0, 60);
    }
  }
  return headerOnly();
}

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
  // Peel separators off the tail until none is left: blank lines, one thematic break
  // with a blank line above it, and an HTML comment block standing on its own lines
  // (a template's lead-in comment for the block below — task.155 QA cycle 8, REL-022).
  // A render that would END in a comment is refused (`trailing-comment`), which is what
  // closes REL-024; narrowing this peel instead deleted a legacy lead-in above a non-log
  // heading (task 171 QA cycle 1, CR-6). Every per-line test strips a trailing \r, so a
  // CRLF document peels exactly what its LF twin does (CR-4).
  const bare = (i) => lines[i].replace(/\r$/, "");
  for (;;) {
    popBlanks();
    const last = lines[lines.length - 1].replace(/\r$/, "");
    if (
      lines.length > 2 &&
      RE_BREAK.test(last) &&
      isBlank(lines[lines.length - 2])
    ) {
      lines.pop();
      continue;
    }
    if (/-->[ \t]*$/.test(last)) {
      let k = lines.length - 1;
      while (k > 0 && !/^[ \t]{0,3}<!--/.test(bare(k))) k--;
      if (k > 1 && (isBlank(lines[k - 1]) || RE_BREAK.test(bare(k - 1)))) {
        lines.length = k;
        continue;
      }
    }
    break;
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

// Offset of the LAST unprotected change-log table header in [from, to): a table row
// `isHeader` accepts (default: a `Date` column, `hasDateColumn`) whose previous line is
// not itself a table row. Whether a section may be CUT at the table it finds is asked of
// that same table (`dateFirstAt`, see RE_LOG_HEADER) — QA cycle 2, CR2-2.
function lastTableStart(content, from, to, ranges, isHeader = hasDateColumn) {
  let found = -1;
  let offset = from;
  let prevRow = false;
  for (const line of content.slice(from, to).split("\n")) {
    const isRow = /^\|/.test(line);
    if (
      isRow &&
      !prevRow &&
      isHeader(line) &&
      !insideProtected(ranges, offset)
    ) {
      found = offset;
    }
    prevRow = isRow;
    offset += line.length + 1;
  }
  return found;
}

// Is the table header starting at `offset` Date-first — a shape the log writers emit?
function dateFirstAt(content, offset) {
  const end = content.indexOf("\n", offset);
  return RE_LOG_HEADER.test(
    content.slice(offset, end === -1 ? undefined : end),
  );
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
      // Date-first only: here there is no marker block to guard the span, so a table
      // above the section counts as the log's own only in the shape the log writers emit.
      // Any Date column made a quoted `| Reviewer | Date |` read as the log, cleared
      // underLog, and the replace deleted the real log row below (QA cycle 3, CR3-2).
      lastTableStart(content, changeLog.start, start, ranges, (l) =>
        RE_LOG_HEADER.test(l),
      ) === -1;
    // When the block's own log table already sits ABOVE the section, a Date table below
    // it is not the log's — the section quotes it. Cutting there left the quoted rows in
    // the log (REL-007); without the cut they are in the span, and the dated-row guard
    // refuses the write instead.
    const logAbove =
      block && lastTableStart(content, block.start, start, ranges) !== -1;
    if ((block && !logAbove) || underTablelessLog) {
      // The last Date-column table is the log's own; cut there only when it is
      // Date-first. Otherwise there is no cut: the span runs on and the guard refuses.
      const tbl = lastTableStart(
        content,
        bodyOffset,
        Math.min(...candidates),
        ranges,
      );
      if (tbl !== -1 && dateFirstAt(content, tbl)) {
        candidates.push(tbl);
        insideChangeLog = true;
      }
    }
    const rawEnd = Math.min(...candidates);
    // CR-5: a section stranded between a Change Log heading and its marker block — the
    // shape canonicalOffset wrote before REL-013 was fixed — belongs above the heading.
    // Its span ends at the block, and the line above it is the log's heading.
    const nextBlock = blocks.find((b) => b.start > start);
    const above = content.slice(0, start).replace(/\s+$/, "");
    const lineAbove = above.slice(above.lastIndexOf("\n") + 1);
    if (
      !block &&
      nextBlock &&
      nextBlock.start === rawEnd &&
      (RE_LOG_HEADING.test(lineAbove) || RE_HEADING.test(lineAbove))
    ) {
      insideChangeLog = true;
    }

    sections.push({
      start,
      end: trimSeparator(content, start, rawEnd),
      insideChangeLog,
      // Inside a marker block, or directly under a change-log heading: dated rows in
      // this span may be the log's own (REL-007/008).
      underLog: !!block || !!underTablelessLog || insideChangeLog,
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
  if (changeLog) {
    // A `## Change Log` heading written directly ABOVE the marker block (outside it)
    // belongs to the log: land before the heading, not between it and the marker,
    // or the next Change Log write strands it empty (task.155 QA cycle 5, REL-013).
    if (changeLog.hasMarkers) {
      const above = content.slice(0, changeLog.start).replace(/\s+$/, "");
      const lineStart = above.lastIndexOf("\n") + 1;
      const line = above.slice(lineStart);
      if (RE_LOG_HEADING.test(line) || RE_HEADING.test(line)) return lineStart;
    }
    return changeLog.start;
  }
  const anchor = anchorOffset(content, docType);
  return anchor === -1 ? content.length : anchor;
}

// Splice `body` in at `pos` with exactly one blank line on each side, in the
// document's own line ending.
function insertAt(content, pos, body, eol = "\n") {
  const before = content.slice(0, pos).trimEnd();
  const after = content.slice(pos).trimStart();
  const head = before ? `${before}${eol}${eol}` : "";
  return after ? `${head}${body}${eol}${eol}${after}` : `${head}${body}${eol}`;
}

// Normalise the caller's section: leading blank lines and trailing whitespace go;
// it must then be exactly one section AND nothing else. A second H1/H2 inside it —
// qa-story's `## QA Completion Summary` rendered into the same file, say — would sit
// past the section's own span once written, so every later write left that copy and
// added another (task.155 QA cycle 1, REL-001).
// Returns { body } or { refuse: detail }.
function normaliseSection(section) {
  const refuse = (detail) => ({ refuse: detail });
  if (typeof section !== "string") return refuse("not-a-section");
  // A trailing thematic break is a separator, never section content: the span
  // excludes it on read, so keeping it here stacked one `---` per replace
  // (task.155 PR review 1, CR-2).
  const body = section
    .replace(/^(?:[ \t]*\r?\n)+/, "")
    .replace(
      /(?:\r?\n[ \t]{0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}))?\s*$/,
      "",
    );
  if (!body.startsWith(HEADING)) return refuse("not-a-section");
  // An unbalanced fence would make the section unbounded the moment it is written.
  if (unclosedFence(body, 0, body.length)) return refuse("unclosed-fence");
  // Never write a section the next write would have to refuse: the structural guard
  // below is fence-blind, so a fenced `## Example` in the section is refused here too.
  const line = removesStructure(body);
  if (line !== null) return refuse(`structural-line:${line}`);
  // A carried block belongs to another writer; the engine carries the document's own
  // copy through, so a render that brings one is refused rather than reconciled.
  const own = carriedBlocks(body);
  if (own.length) return refuse(`carried-block:${own[0].name}`);
  // A trailing HTML comment would be read back as the lead-in of a change-log block
  // written below it, outside the span, and gain a copy per write (REL-024).
  if (/-->[ \t]*$/.test(body)) return refuse("trailing-comment");
  // The heading must itself be a section heading (`## QA Testing Resultsx` is not).
  // A second H1/H2 in the body is already refused by removesStructure above.
  if (findQaResults(body).sections.length !== 1) return refuse("not-a-section");
  return { body };
}

/**
 * Write the `## QA Testing Results` section: replace, relocate or create it.
 *
 * @param {string} content            full document text
 * @param {string} section            the rendered section, starting `## QA Testing Results`
 * @param {object} [opts]
 * @param {string} [opts.docType]     story | task | epic — picks the fallback anchor
 * @returns {{ content: string, reason: string, detail?: string, count?: number }}
 *   reason is one of replaced | relocated | created (written) or multiple |
 *   bad-section | unbounded | unplaceable (content returned unchanged, with a
 *   `detail` naming the rule that fired). Callers write only on the first three.
 */
function upsertQaResults(content, section, { docType = "" } = {}) {
  const norm = normaliseSection(section);
  if (norm.refuse) {
    return { content, reason: "bad-section", detail: norm.refuse };
  }
  // Every seam this write makes uses the document's own line ending (task 171).
  // By majority, so one stray CRLF line does not turn the whole section CRLF (CR2-5).
  const crlf = (content.match(/\r\n/g) || []).length;
  const eol = crlf * 2 > (content.match(/\n/g) || []).length ? "\r\n" : "\n";
  const body = norm.body.replace(/\r?\n/g, eol);

  const { sections } = findQaResults(content);
  if (sections.length > 1) {
    return {
      content,
      reason: "multiple",
      count: sections.length,
      detail: `multiple:${sections.length}`,
    };
  }
  for (const s of sections) {
    if (s.unbounded) {
      return { content, reason: "unbounded", detail: "unclosed-fence" };
    }
    const line = removesStructure(content.slice(s.start, s.end), {
      underLog: s.underLog,
    });
    if (line !== null) {
      return {
        content,
        reason: "unbounded",
        detail: `structural-line:${line}`,
      };
    }
  }
  const checked = (out, reason) => {
    const post = findQaResults(out).sections;
    return post.length === 1 && !post[0].unbounded
      ? { content: out, reason }
      : {
          content,
          reason: "unplaceable",
          detail: `read-back:${post.length}${post.some((p) => p.unbounded) ? " unbounded" : ""}`,
        };
  };

  if (sections.length === 1 && !sections[0].insideChangeLog) {
    const { start, end } = sections[0];
    const written = mergeCarried(body, content.slice(start, end), eol);
    const rest = content.slice(end);
    const sep = rest === "" ? eol : /^\r?\n/.test(rest) ? eol : eol + eol;
    return checked(content.slice(0, start) + written + sep + rest, "replaced");
  }

  let base = content;
  let reason = "created";
  let written = body;
  if (sections.length === 1) {
    // Inside the block: cut it out, then insert at the canonical position computed
    // on the post-removal text (the block start, which the removal did not move).
    const { start, end } = sections[0];
    written = mergeCarried(body, content.slice(start, end), eol);
    const before = content.slice(0, start).replace(/(?:\r?\n)+$/, eol);
    const after = content.slice(end).replace(/^(?:\r?\n)+/, "");
    base =
      before.endsWith(eol + eol) || !after
        ? before + after
        : `${before}${eol}${after}`;
    reason = "relocated";
  }
  return checked(
    insertAt(base, canonicalOffset(base, docType), written, eol),
    reason,
  );
}

module.exports = { HEADING, RE_QA, findQaResults, upsertQaResults };
