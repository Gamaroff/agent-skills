"use strict";
/**
 * QA Testing Results corpus guard — no tracked work-item document carries more
 * than one `## QA Testing Results` section, or one inside the change-log block.
 *
 * Motivation (task.155, obs #178): qa-task / qa-story Step 12 "replace the section
 * whole" was performed by hand, and a hand-written replace whose two boundaries come
 * from two independent searches stacks copies instead of replacing one. task.145
 * reached four stacked copies across QA cycles; task.65 carried three into the
 * accepted tree (its later copies titled `## QA Testing Results — Cycle 2 (re-review)`,
 * which is why "a section" is the engine's prefix match and not an exact line).
 *
 * WHAT THIS ASSERTS:
 *   1. Per document: `findQaResults` finds at most one section, and none with
 *      `insideChangeLog`. "A section" is the engine's own definition — this test
 *      imports it rather than restating it, so the guard and the writer cannot
 *      disagree about what they are counting.
 *   2. A non-vacuity floor on documents that carry a section. A scan that found
 *      nothing has proved nothing: a broken pathspec reads as a clean corpus.
 *   3. An independent count agrees with the engine's, per document. The raw count
 *      is a line scan with its own fence toggle — deliberately NOT the engine's
 *      protected ranges — so an engine that silently under-counts (a heading regex
 *      that stopped matching, a protection bug that hides real headings) cannot
 *      certify its own blindness (task.155 QA cycle 1, CR-3).
 *   4. The write survey (task 171): one probe write per document is never refused
 *      (0 false refusals), never removes a change-log marker, a dated row outside
 *      the section or an H1/H2 (0 deletions), and a second identical write changes
 *      nothing (0 non-idempotent). The figures are the test's, not a document's.
 *
 * A failure names every offending file. The repair rule the engine's callers print
 * (and task.65 used): keep the copy whose Gate File link names the highest gate,
 * delete the others by hand. The engine refuses (`multiple`) rather than guess.
 *
 * Run: node --test tests/qa-results-corpus.test.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const test = require("node:test");
const { execFileSync } = require("child_process");
const {
  findQaResults,
  upsertQaResults,
} = require("../shared/resources/qa-results.js");

const REPO_ROOT = path.resolve(__dirname, "..");
// 154 documents carried a section when this guard landed (2026-09-30). The floor is
// well under that so ordinary churn never trips it, and well over zero so a broken
// walk cannot pass.
const FLOOR_DOCS = 50;

function trackedDocs() {
  const out = execFileSync("git", ["ls-files", "-z", "--", "docs/**/*.md"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return out.split("\0").filter(Boolean);
}

// Headings counted without the engine: `## QA Testing Results…` lines outside a
// ``` / ~~~ fence, past a leading frontmatter block. Inline code cannot put a
// heading at column 0, so fences are the only protection a line scan needs.
function rawCount(text) {
  const lines = text.split("\n");
  let i = 0;
  if (lines[0] === "---") {
    i = lines.indexOf("---", 1) + 1 || lines.length;
  }
  let fence = null;
  let n = 0;
  for (; i < lines.length; i++) {
    const f = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    // A backtick opener whose rest holds a backtick is inline code, not a fence
    // (CommonMark; task.42 line 315 opens with four backticks inside a code span).
    const opener = f && !(f[1][0] === "`" && f[2].includes("`"));
    if (f && (fence || opener)) {
      if (!fence) fence = f[1];
      else if (
        f[1][0] === fence[0] &&
        f[1].length >= fence.length &&
        f[2].trim() === ""
      )
        fence = null;
      continue;
    }
    if (!fence && /^## QA Testing Results\b/.test(lines[i])) n++;
  }
  return n;
}

function survey() {
  const offenders = [];
  const disagreements = [];
  let scanned = 0;
  for (const rel of trackedDocs()) {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    if (!text.includes("QA Testing Results")) continue;
    const { sections } = findQaResults(text);
    const raw = rawCount(text);
    if (raw !== sections.length) {
      disagreements.push(`${rel}: engine ${sections.length}, line scan ${raw}`);
    }
    if (sections.length === 0) continue;
    scanned++;
    const inside = sections.filter((s) => s.insideChangeLog).length;
    if (sections.length > 1 || inside > 0) {
      offenders.push(
        `${rel}: ${sections.length} section(s)${inside ? `, ${inside} inside the change-log block` : ""}`,
      );
    }
  }
  return { scanned, offenders, disagreements };
}

test("no tracked document stacks QA Testing Results sections or hides one in the change log", () => {
  const { scanned, offenders, disagreements } = survey();
  assert.deepEqual(
    disagreements,
    [],
    `findQaResults and an independent line scan disagree — one of them is broken:\n  ${disagreements.join("\n  ")}`,
  );
  assert.ok(
    scanned >= FLOOR_DOCS,
    `scan-broken: only ${scanned} documents carry a QA Testing Results section (floor ${FLOOR_DOCS})`,
  );
  assert.deepEqual(
    offenders,
    [],
    `QA Testing Results corruption — keep the copy linking the highest gate, delete the rest:\n  ${offenders.join("\n  ")}`,
  );
});

// What a write may remove, measured WITHOUT the engine (task 171 QA cycle 1, CR-5).
// The first survey counted losses outside `findQaResults` spans — the engine under
// test — so a span that wrongly grew over real content counted that content as
// "inside" both before and after, and passed on the very defect it existed to catch.
// This allowance is an independent line scan, with its own fence toggle:
//   - the region runs from the `## QA Testing Results` line to the first H1/H2, change-log
//     marker, Change Log heading (any level) or Date-headed table header;
//   - trailing blank lines, thematic breaks and HTML comment blocks are peeled off it —
//     they are separators, and a write must keep them;
//   - lines of a carried block (a `###`/`####` Bug Reports / Deferred Work heading or
//     bold label, to the next non-carried heading of level <= 3 or QA field line) are
//     protected — a write must carry them.
// A write may remove only what is left: the region's own QA content.
const RE_CARRIED_START =
  /^(?:#{3,4}[ \t]+(?:Bug Reports?|Deferred Work)\b|\*\*(?:Bug Reports?|Deferred Work)\*\*:?[ \t]*$)/i;
const RE_QA_FIELD_LINE =
  /^\*\*(?:QA Status|QA Engineer|Testing Date|Quality Score|Gate Decision)\*\*:/;

function allowance(text) {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  // The same CommonMark fence rule rawCount() uses: a backtick opener whose rest holds a
  // backtick is inline code, and only a bare run as long as the opener closes it.
  let fence = null;
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const f = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(l);
    const opener = f && !(f[1][0] === "`" && f[2].includes("`"));
    if (f && (fence || opener)) {
      if (!fence) fence = f[1];
      else if (
        f[1][0] === fence[0] &&
        f[1].length >= fence.length &&
        f[2].trim() === ""
      )
        fence = null;
      continue;
    }
    if (fence) continue;
    if (start === -1) {
      if (/^## QA Testing Results\b/.test(l)) start = i;
      continue;
    }
    if (
      /^#{1,2}[ \t]/.test(l) ||
      /change-?log-(?:start|end)|sync-changelog-(?:start|end)/i.test(l) ||
      /^ {0,3}#{1,6}[ \t]+.*Change Log\b/i.test(l) ||
      /^\|[ \t]*Date[ \t]*\|/i.test(l)
    ) {
      end = i;
      break;
    }
  }
  if (start === -1) return new Map();
  // Peel separators off the region's tail.
  for (;;) {
    const l = (lines[end - 1] ?? "").trim();
    if (end - 1 <= start) break;
    if (l === "" || /^(?:[-*_][ \t]*){3,}$/.test(l)) {
      end--;
      continue;
    }
    if (/-->$/.test(l)) {
      let k = end - 1;
      while (k > start && !/^<!--/.test(lines[k].trim())) k--;
      if (k > start) {
        end = k;
        continue;
      }
    }
    break;
  }
  const allowed = new Map();
  let carried = false;
  for (let i = start; i < end; i++) {
    const l = lines[i];
    if (RE_CARRIED_START.test(l)) carried = true;
    else if (/^#{1,3}[ \t]/.test(l) || RE_QA_FIELD_LINE.test(l))
      carried = false;
    if (carried || !l.trim()) continue;
    allowed.set(l, (allowed.get(l) || 0) + 1);
  }
  return allowed;
}

// Non-blank lines `before` holds more often than `after`, as a multiset.
function removedLines(before, after) {
  const count = (text) => {
    const m = new Map();
    for (const l of text.split("\n").map((x) => x.replace(/\r$/, ""))) {
      if (l.trim()) m.set(l, (m.get(l) || 0) + 1);
    }
    return m;
  };
  const a = count(before);
  const b = count(after);
  const out = [];
  for (const [l, n] of a) {
    for (let k = b.get(l) || 0; k < n; k++) out.push(l);
  }
  return out;
}

test("the write survey: 0 false refusals, 0 deletions, 0 non-idempotent writes (task 171)", () => {
  const probe = "## QA Testing Results\n\n**QA Status**: PASS\n\nprobe";
  const refused = [];
  const lost = [];
  const unstable = [];
  let surveyed = 0;
  for (const rel of trackedDocs()) {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    // Pre-filter as the stacking survey does: a document that never names the section
    // cannot hold one, and parsing every tracked document made the bound load-sensitive
    // (task 183, obs #268).
    if (!text.includes("QA Testing Results")) continue;
    if (!findQaResults(text).sections.length) continue;
    surveyed++;
    const docType = rel.includes("/tasks/") ? "task" : "story";
    const r = upsertQaResults(text, probe, { docType });
    if (!["replaced", "relocated"].includes(r.reason)) {
      refused.push(`${rel}: ${r.reason} (${r.detail})`);
      continue;
    }
    const allowed = allowance(text);
    for (const l of removedLines(text, r.content)) {
      const n = allowed.get(l) || 0;
      if (n > 0) allowed.set(l, n - 1);
      else lost.push(`${rel}: ${l.slice(0, 80)}`);
    }
    if (upsertQaResults(r.content, probe, { docType }).content !== r.content) {
      unstable.push(rel);
    }
  }
  assert.ok(
    surveyed >= FLOOR_DOCS,
    `scan-broken: only ${surveyed} documents surveyed (floor ${FLOOR_DOCS})`,
  );
  assert.deepEqual(refused, [], `false refusals:\n  ${refused.join("\n  ")}`);
  assert.deepEqual(lost, [], `deletions:\n  ${lost.join("\n  ")}`);
  assert.deepEqual(unstable, [], `non-idempotent:\n  ${unstable.join("\n  ")}`);
});

test("the survey's allowance is the engine-independent one: it protects separators and carried lines", () => {
  const doc =
    "# T\n\n## QA Testing Results\n\n**QA Status**: PASS\n\n### Bug Reports\n\n- [b](./b.md)\n\n### Key Findings\n\nold\n\n---\n\n<!-- lead -->\n\n## Next\n";
  const allowed = allowance(doc);
  assert.equal(allowed.get("old"), 1, "QA's own content may go");
  assert.equal(allowed.get("**QA Status**: PASS"), 1);
  for (const kept of [
    "- [b](./b.md)",
    "### Bug Reports",
    "---",
    "<!-- lead -->",
    "## Next",
  ]) {
    assert.equal(allowed.has(kept), false, `${kept} must survive a write`);
  }
});
