// ---------------------------------------------------------------------------
// review-report-freshness.test.mjs
// ---------------------------------------------------------------------------
// The regression net for the Step 2 review-gate freshness rule. There was none
// before this file: the only test touching develop-pipeline-step-2-review.md
// asserted that the substrings "review" and "skip" appear somewhere in it, and
// would have passed with both decision tables deleted. So these are not extra
// cases around an existing net — they are the net.
//
// Defect classes guarded, one group each:
//
//   1. Filesystem dependence.  The rule must not consult mtime, directly or by
//      accident. Group 1 asserts the module reads no filesystem API at all, so a
//      later `stat` cannot be added without a test going red — the fresh-clone
//      case cannot be caught by feeding it dates, only by forbidding the input.
//   2. Missing report-side date. The task document has `updated:`; review reports
//      have no reliable frontmatter. Group 2 pins both body forms and the
//      precedence between them.
//   3. Wrong tie-break.  Every ambiguity must resolve to `stale` (run the
//      review), never to `fresh`. Group 3 walks each ambiguous input.
//   4. Crash instead of verdict. The module must never throw; group 4 feeds it
//      the shapes a pipeline actually produces on a bad day.
//   5. Unassertable halt text. Group 5 pins the message per precondition, which
//      is the point of having a message function at all.
//   6. Reading its own documentation. Group 6 covers fenced examples.
//
// Run: node --test shared/resources/tests/review-report-freshness.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = join(__dirname, "..", "review-report-freshness.js");

const {
  reportReviewedDate,
  taskUpdatedDate,
  classifyReviewReport,
  VERDICTS,
  describeVerdict,
} = require(MODULE_PATH);

// ── fixtures ───────────────────────────────────────────────────────────────

const task = (updated) =>
  `---
id: task.97
type: task
status: planned
${updated === null ? "" : `updated: ${updated}\n`}---

# Technical Task: something

**Status:** Planned
`;

const report = (line) =>
  `# Task Review Report: Task 97 — something

${line}
**Review Depth:** Thorough

## Executive Summary

Findings.
`;

// ── 1. filesystem dependence ───────────────────────────────────────────────

test("module requires nothing — no fs, no path, no child_process", () => {
  const src = readFileSync(MODULE_PATH, "utf8");
  const requires = [...src.matchAll(/\brequire\s*\(\s*["']([^"']+)["']/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(
    requires,
    [],
    `expected zero requires, found: ${requires.join(", ")}`,
  );
});

test("module never reads mtime, stat, or any filesystem API", () => {
  const src = readFileSync(MODULE_PATH, "utf8");
  // Comments legitimately discuss mtime; code must not call it. Strip line and
  // block comments before scanning, or this asserts the opposite of its name.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
  for (const forbidden of [
    "statSync",
    "stat(",
    "mtime",
    "readFileSync",
    "readFile",
    "existsSync",
    "openSync",
  ]) {
    assert.ok(
      !code.includes(forbidden),
      `freshness module must not touch the filesystem, found: ${forbidden}`,
    );
  }
});

test("verdict is identical for two calls, and echoes its inputs — no clock", () => {
  const input = {
    taskContent: task("2026-05-10"),
    reportContent: report("**Reviewed:** 2026-05-11"),
  };
  const a = classifyReviewReport(input);
  assert.deepEqual(a, classifyReviewReport(input));
  // Echoing the inputs is what distinguishes determinism from a hardcoded
  // constant, which the previous version of this test would also have accepted.
  assert.equal(a.taskDate, "2026-05-10");
  assert.equal(a.reportDate, "2026-05-11");
});

// ── 2. the report-side date ────────────────────────────────────────────────

test("reads the primary body form `**Reviewed:**`", () => {
  assert.equal(
    reportReviewedDate(report("**Reviewed:** 2026-05-11")),
    "2026-05-11",
  );
});

test("reads the bulleted Review Metadata fallback `- **Review Date:**`", () => {
  assert.equal(
    reportReviewedDate(report("- **Review Date:** 2026-08-03")),
    "2026-08-03",
  );
});

test("reads the non-bulleted `**Review Date:**` form", () => {
  assert.equal(
    reportReviewedDate(report("**Review Date:** 2026-08-03")),
    "2026-08-03",
  );
});

test("tolerates the colon inside or outside the bold span", () => {
  assert.equal(
    reportReviewedDate(report("**Reviewed** 2026-05-11")),
    "2026-05-11",
  );
});

test("`**Reviewed:**` wins over `**Review Date:**` when both are present", () => {
  const both = `# Report

**Reviewed:** 2026-05-11

## Review Metadata

- **Review Date:** 1999-01-01
`;
  assert.equal(reportReviewedDate(both), "2026-05-11");
});

test("a report with frontmatter still reads its date from the body", () => {
  const withFm = `---
type: review-report
reviewed: '1999-01-01'
---

**Reviewed:** 2026-05-11
`;
  assert.equal(reportReviewedDate(withFm), "2026-05-11");
});

test("task date comes from frontmatter `updated:`, quoted or bare", () => {
  assert.equal(taskUpdatedDate(task("2026-05-10")), "2026-05-10");
  assert.equal(taskUpdatedDate(task("'2026-05-10'")), "2026-05-10");
});

// ── 3. the tie-break: every ambiguity resolves to stale ────────────────────

test("report newer than the task is fresh", () => {
  const r = classifyReviewReport({
    taskContent: task("2026-05-10"),
    reportContent: report("**Reviewed:** 2026-05-11"),
  });
  assert.equal(r.verdict, VERDICTS.FRESH);
  assert.equal(r.reason, "current");
});

test("report dated the same day as the task is fresh, not stale", () => {
  const r = classifyReviewReport({
    taskContent: task("2026-05-11"),
    reportContent: report("**Reviewed:** 2026-05-11"),
  });
  assert.equal(r.verdict, VERDICTS.FRESH);
});

test("report older than the task is stale", () => {
  const r = classifyReviewReport({
    taskContent: task("2026-05-12"),
    reportContent: report("**Reviewed:** 2026-05-11"),
  });
  assert.equal(r.verdict, VERDICTS.STALE);
  assert.equal(r.reason, "report-older-than-task");
});

test("no report at all is absent, and absent is not fresh", () => {
  for (const missing of [null, undefined, "", "   "]) {
    const r = classifyReviewReport({
      taskContent: task("2026-05-10"),
      reportContent: missing,
    });
    assert.equal(r.verdict, VERDICTS.ABSENT);
    assert.equal(r.reason, "no-report");
  }
});

test("report with no date line is stale, never fresh", () => {
  const r = classifyReviewReport({
    taskContent: task("2026-05-10"),
    reportContent: "# Report\n\nNo date anywhere.\n",
  });
  assert.equal(r.verdict, VERDICTS.STALE);
  assert.equal(r.reason, "report-date-unparseable");
});

test("task with no `updated:` is stale, never fresh", () => {
  const r = classifyReviewReport({
    taskContent: task(null),
    reportContent: report("**Reviewed:** 2026-05-11"),
  });
  assert.equal(r.verdict, VERDICTS.STALE);
  assert.equal(r.reason, "task-date-unparseable");
});

test("task with a malformed `updated:` is stale, never fresh", () => {
  for (const bad of ["not-a-date", "11/05/2026", "2026-5-1"]) {
    const r = classifyReviewReport({
      taskContent: task(bad),
      reportContent: report("**Reviewed:** 2026-05-11"),
    });
    assert.equal(r.verdict, VERDICTS.STALE, `expected stale for ${bad}`);
  }
});

test("no input shape ever yields fresh without both dates", () => {
  const shapes = [
    { taskContent: task(null), reportContent: null },
    { taskContent: task(null), reportContent: report("no date") },
    { taskContent: "", reportContent: report("**Reviewed:** 2026-05-11") },
    { taskContent: task("2026-05-10"), reportContent: "" },
  ];
  for (const s of shapes) {
    const r = classifyReviewReport(s);
    assert.notEqual(
      r.verdict,
      VERDICTS.FRESH,
      `must not be fresh: ${JSON.stringify(s).slice(0, 60)}`,
    );
  }
});

// ── 4. never throws ────────────────────────────────────────────────────────

test("malformed and hostile inputs return a verdict rather than throwing", () => {
  const inputs = [
    undefined,
    null,
    {},
    { taskContent: null, reportContent: null },
    { taskContent: 42, reportContent: [] },
    { taskContent: "---\n", reportContent: "---\n" },
    { taskContent: "---\nupdated:\n---\n", reportContent: "**Reviewed:**\n" },
  ];
  for (const i of inputs) {
    const r = classifyReviewReport(i);
    assert.ok(r && typeof r.verdict === "string", "verdict must be a string");
    assert.ok(
      Object.values(VERDICTS).includes(r.verdict),
      `unknown verdict: ${r.verdict}`,
    );
  }
});

test("readers tolerate non-string input", () => {
  for (const bad of [undefined, null, 0, {}, []]) {
    assert.equal(reportReviewedDate(bad), null);
    assert.equal(taskUpdatedDate(bad), null);
  }
});

// ── 5. the halt message names the failed precondition ──────────────────────

test("message distinguishes an absent report from an undated one", () => {
  const absent = describeVerdict(
    classifyReviewReport({ taskContent: task("2026-05-10") }),
    { reportPath: "task.97.review.1.x.md" },
  );
  const undated = describeVerdict(
    classifyReviewReport({
      taskContent: task("2026-05-10"),
      reportContent: "# Report\n",
    }),
    { reportPath: "task.97.review.1.x.md" },
  );
  assert.match(absent, /no review report exists/);
  assert.match(undated, /states no review date/);
  assert.notEqual(absent, undated);
});

test("stale message carries both dates, so the reader can act on it", () => {
  const msg = describeVerdict(
    classifyReviewReport({
      taskContent: task("2026-05-12"),
      reportContent: report("**Reviewed:** 2026-05-11"),
    }),
    { reportPath: "task.97.review.1.x.md" },
  );
  assert.match(msg, /2026-05-11/);
  assert.match(msg, /2026-05-12/);
  assert.match(msg, /task\.97\.review\.1\.x\.md/);
});

test("every reason code produces a distinct message", () => {
  const cases = [
    { taskContent: task("2026-05-10") }, // no-report
    { taskContent: task("2026-05-10"), reportContent: "# R\n" }, // report-date-unparseable
    {
      taskContent: task(null),
      reportContent: report("**Reviewed:** 2026-05-11"),
    }, // task-date-unparseable
    {
      taskContent: task("2026-05-12"),
      reportContent: report("**Reviewed:** 2026-05-11"),
    }, // report-older-than-task
    {
      taskContent: task("2026-05-10"),
      reportContent: report("**Reviewed:** 2026-05-11"),
    }, // current
  ];
  const msgs = cases.map((c) => describeVerdict(classifyReviewReport(c)));
  assert.equal(
    new Set(msgs).size,
    msgs.length,
    `messages must be distinct, got: ${JSON.stringify(msgs, null, 2)}`,
  );
  for (const m of msgs) assert.ok(m.length > 0);
});

test("an unknown reason still returns a string rather than undefined", () => {
  assert.equal(typeof describeVerdict({ reason: "invented" }), "string");
  assert.equal(typeof describeVerdict(null), "string");
});

// ── 6. a fenced example is a picture, not data ─────────────────────────────

test("a `**Reviewed:**` line inside a code fence is not read as the date", () => {
  const doc = `# Report

Documentation of the format:

\`\`\`markdown
**Reviewed:** 1999-01-01
\`\`\`

**Reviewed:** 2026-05-11
`;
  assert.equal(reportReviewedDate(doc), "2026-05-11");
});

test("a report whose only date is inside a fence is undated", () => {
  const doc = `# Report

\`\`\`
**Reviewed:** 1999-01-01
\`\`\`
`;
  assert.equal(reportReviewedDate(doc), null);
  assert.equal(
    classifyReviewReport({
      taskContent: task("2026-05-10"),
      reportContent: doc,
    }).verdict,
    VERDICTS.STALE,
  );
});

test("tilde fences are handled like backtick fences", () => {
  const doc = `# Report

~~~
**Reviewed:** 1999-01-01
~~~

- **Review Date:** 2026-05-11
`;
  assert.equal(reportReviewedDate(doc), "2026-05-11");
});

// ── 7. the six classes QA found — each was a route to a WRONG `fresh` ──────
//
// Every case below returned `fresh` for a genuinely stale report before the fix.
// They are grouped together deliberately: they share one failure mode (a picture
// of the header read as a value) and one direction (unsafe), and a future edit
// that reopens any of them should fail as a set.

const STALE_TASK = task("2026-06-01"); // newer than every report date below

test("a `**Reviewed:**` line inside an HTML comment is not the report's date", () => {
  const r = classifyReviewReport({
    taskContent: STALE_TASK,
    reportContent:
      "# R\n<!--\n**Reviewed:** 2030-01-01\n-->\n\n**Reviewed:** 2026-01-01\n",
  });
  assert.equal(r.verdict, VERDICTS.STALE);
  assert.equal(
    r.reportDate,
    "2026-01-01",
    "must read the real line, not the commented one",
  );
});

test("a single-line HTML comment is stripped too", () => {
  assert.equal(
    reportReviewedDate(
      "# R\n\n<!-- **Reviewed:** 2030-01-01 -->\n\n**Reviewed:** 2026-01-01\n",
    ),
    "2026-01-01",
  );
});

test("a 4-space indented code block is not the report's date (CommonMark)", () => {
  const r = classifyReviewReport({
    taskContent: STALE_TASK,
    reportContent: "# R\n\nFormat example:\n\n    **Reviewed:** 2030-01-01\n",
  });
  assert.equal(r.verdict, VERDICTS.STALE);
  assert.equal(r.reason, "report-date-unparseable");
});

test("up to 3 spaces of indent is still a paragraph, and still counts", () => {
  assert.equal(
    reportReviewedDate("# R\n\n   **Reviewed:** 2026-05-11\n"),
    "2026-05-11",
  );
});

test("the date must be on the label's line — `\\s*` must not span newlines", () => {
  const r = classifyReviewReport({
    taskContent: STALE_TASK,
    reportContent:
      "# R\n\n**Reviewed:**\n2030-01-01 was the previous revision\n",
  });
  assert.equal(r.verdict, VERDICTS.STALE);
  assert.equal(r.reason, "report-date-unparseable");
});

test("a shorter fence does not close a longer one (nested ``` inside ````)", () => {
  const r = classifyReviewReport({
    taskContent: STALE_TASK,
    reportContent: "# R\n\n````\n```\n**Reviewed:** 2030-01-01\n````\n",
  });
  assert.equal(r.verdict, VERDICTS.STALE);
  assert.equal(r.reason, "report-date-unparseable");
});

test("an equal-length fence still closes normally", () => {
  assert.equal(
    reportReviewedDate(
      "# R\n\n```\nnot a date\n```\n\n**Reviewed:** 2026-05-11\n",
    ),
    "2026-05-11",
  );
});

test("a document opening with a thematic break is not frontmatter", () => {
  assert.equal(
    taskUpdatedDate(
      "---\n\nProse, not frontmatter.\n\nupdated: 1999-01-01\n\n---\n\nbody\n",
    ),
    null,
    "column-0 prose inside the delimiters means this is a horizontal rule",
  );
});

test("frontmatter with indented continuations still parses", () => {
  const withList =
    "---\nid: t\ntags:\n  - a\n  - b\nupdated: 2026-06-01\n---\n\n# T\n";
  assert.equal(taskUpdatedDate(withList), "2026-06-01");
});

test("duplicate `updated:` is first-wins, not last-wins", () => {
  assert.equal(
    taskUpdatedDate(
      "---\nupdated: 2026-06-01\nfoo: bar\nupdated: 1999-01-01\n---\n",
    ),
    "2026-06-01",
  );
});

test("an impossible calendar date is rejected, not ranked", () => {
  for (const bad of [
    "2026-99-99",
    "2026-13-01",
    "2026-02-30",
    "2026-00-10",
    "2026-04-31",
  ]) {
    const r = classifyReviewReport({
      taskContent: STALE_TASK,
      reportContent: report(`**Reviewed:** ${bad}`),
    });
    assert.equal(r.verdict, VERDICTS.STALE, `${bad} must not be usable`);
  }
});

test("a real leap day is accepted", () => {
  assert.equal(
    reportReviewedDate(report("**Reviewed:** 2024-02-29")),
    "2024-02-29",
  );
  assert.equal(reportReviewedDate(report("**Reviewed:** 2026-02-29")), null);
});

test("a CRLF task document still yields its `updated:` date", () => {
  assert.equal(
    taskUpdatedDate(
      "---\r\nid: t\r\nupdated: 2026-06-01\r\n---\r\n\r\n# T\r\n",
    ),
    "2026-06-01",
    "CRLF must not silently disable the whole escape hatch",
  );
});

test("a CRLF review report still yields its reviewed date", () => {
  assert.equal(
    reportReviewedDate("# R\r\n\r\n**Reviewed:** 2026-05-11\r\n"),
    "2026-05-11",
  );
});

test("all three corpus spellings of the colon are accepted", () => {
  assert.equal(reportReviewedDate("**Reviewed:** 2026-05-11\n"), "2026-05-11");
  assert.equal(reportReviewedDate("**Reviewed**: 2026-05-11\n"), "2026-05-11");
  assert.equal(reportReviewedDate("**Reviewed** 2026-05-11\n"), "2026-05-11");
});

test("a throwing getter yields a verdict rather than crashing the caller", () => {
  const r = classifyReviewReport({
    get taskContent() {
      throw new Error("boom");
    },
  });
  assert.equal(r.verdict, VERDICTS.STALE);
  assert.equal(r.reason, "input-unreadable");
  assert.match(describeVerdict(r), /could not be read/);
});

test("`__proto__` in frontmatter does not reach the prototype", () => {
  const r = taskUpdatedDate(
    "---\n__proto__: polluted\nupdated: 2026-06-01\n---\n",
  );
  assert.equal(r, "2026-06-01");
  assert.equal({}.polluted, undefined, "prototype must not be polluted");
});
