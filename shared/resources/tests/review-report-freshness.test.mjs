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

// ── 8. shapes the cycle-1 frontmatter guard initially rejected ─────────────
//
// The "looks like YAML" discriminator that closed the thematic-break hole was at
// first too strict: it rejected two legal top-level YAML constructs, so a
// document using either lost its date. Safe direction, latent (no tracked doc
// uses them) — but rejecting valid frontmatter is a defect regardless.

test("a YAML comment line in frontmatter does not void the block", () => {
  assert.equal(
    taskUpdatedDate("---\n# a yaml comment\nid: t\nupdated: 2026-06-01\n---\n"),
    "2026-06-01",
  );
});

test("a column-0 block sequence in frontmatter does not void the block", () => {
  assert.equal(
    taskUpdatedDate("---\ntags:\n- a\n- b\nupdated: 2026-06-01\n---\n"),
    "2026-06-01",
  );
});

test("bare column-0 prose still voids the block (the thematic-break case)", () => {
  assert.equal(
    taskUpdatedDate(
      "---\n\nProse, not frontmatter.\n\nupdated: 1999-01-01\n\n---\n",
    ),
    null,
  );
});

test("a year below 1000 is not a date", () => {
  assert.equal(reportReviewedDate("**Reviewed:** 0000-01-01\n"), null);
  assert.equal(reportReviewedDate("**Reviewed:** 0999-12-31\n"), null);
  assert.equal(reportReviewedDate("**Reviewed:** 1000-01-01\n"), "1000-01-01");
});

test("a tab-indented date line is not read (a tab is 4 spaces in CommonMark)", () => {
  assert.equal(reportReviewedDate("# R\n\n\t**Reviewed:** 2030-01-01\n"), null);
});

test("a fence opener carrying an info string still opens a block", () => {
  assert.equal(
    reportReviewedDate("# R\n\n```markdown\n**Reviewed:** 2030-01-01\n```\n"),
    null,
  );
});

test("a `~~~` block is not closed by a ``` line", () => {
  assert.equal(
    reportReviewedDate("# R\n\n~~~\n**Reviewed:** 2030-01-01\n```\n"),
    null,
  );
});

test("a CRLF report with a fenced block still yields its real date", () => {
  assert.equal(
    reportReviewedDate(
      "# R\r\n\r\n```\r\nx\r\n```\r\n\r\n**Reviewed:** 2026-05-11\r\n",
    ),
    "2026-05-11",
    "no stray \\r may leak into the captured date",
  );
});

// ── 9. documented boundaries — accepted on purpose, pinned so they stay visible

test("frontmatter keys may be quoted or dotted", () => {
  assert.equal(
    taskUpdatedDate('---\n"updated": 2026-09-01\n---\n'),
    "2026-09-01",
  );
  assert.equal(
    taskUpdatedDate("---\njira.key: PROJ-1\nupdated: 2026-09-01\n---\n"),
    "2026-09-01",
  );
});

test("`Word: prose` inside `---` delimiters IS frontmatter — a documented limit", () => {
  // Not a hole: YAML itself parses `Status: planned` as the key `Status`, and
  // there is no syntactic difference between that and `description: prose`. A
  // document opening with `---` whose every line is `Word: value` genuinely is
  // frontmatter. The guard catches the case that is not YAML at all — a bare
  // sentence at column 0 — and this test pins where it stops so the boundary is
  // documented rather than merely implied by the one case that fails.
  assert.equal(
    taskUpdatedDate(
      "---\nStatus: planned\nOwner: someone\nupdated: 1999-01-01\n---\n",
    ),
    "1999-01-01",
  );
});

test("a comment inside a fence cannot close it (fix 1 must not undo fix 3)", () => {
  // The refute pass's defeating input, reduced. Stripping comments before
  // resolving fences turned `<!-- template -->` + a backtick run into a bare
  // closer, releasing the fenced example as live prose and reading its date as
  // the report's own — fresh, from a template.
  assert.equal(
    reportReviewedDate("```\n<!-- c -->```\n**Reviewed:** 2030-12-31\n"),
    null,
  );
  assert.equal(
    reportReviewedDate("````\n```\n<!-- c -->````\n**Reviewed:** 2030-12-31\n"),
    null,
  );
});

test("an unterminated comment inside a fence does not blank the rest of the file", () => {
  // Comment state must not survive a fence. It used to, so one stray `<!--` in
  // an example blanked everything after it — including the report's real date.
  assert.equal(
    reportReviewedDate("```\n<!-- TODO\n```\n\n**Reviewed:** 2026-09-05\n"),
    "2026-09-05",
  );
});

test("the full refute-pass input classifies stale, on the report's real date", () => {
  const r = classifyReviewReport({
    taskContent: "---\nupdated: 2026-09-01\n---\n# task\n",
    reportContent:
      "# Task Review Report\n\n## Review Metadata\n\n- **Reviewer:** QA\n" +
      "- **Review Date:** 2020-01-01\n\n## Appendix — report header template\n\n" +
      "```markdown\n<!-- template -->```\n**Reviewed:** 2030-12-31\n```\n",
  });
  assert.equal(r.verdict, VERDICTS.STALE);
  assert.equal(r.reportDate, "2020-01-01");
});

// ── 10. the load-bearing halves of two otherwise-vacuous guards ────────────
//
// Both tests below exist because their siblings pass with the fix reverted:
// the CRLF *report* test passes because the matcher carries `m` and stops at the
// captured date, and the `__proto__` test passes because assigning a STRING
// through the prototype setter is a silent no-op. Neither sibling holds the
// behaviour it names. These do.

test("CRLF is stripped by the splitter, not merely tolerated by the matcher", () => {
  // Revert `splitLines` to split("\n") and every fence delimiter keeps a
  // trailing \r, so FENCE_RE stops matching and the fenced example leaks out.
  assert.equal(
    reportReviewedDate("# R\r\n\r\n```\r\n**Reviewed:** 2030-01-01\r\n```\r\n"),
    null,
    "a CRLF fenced example must not leak its date",
  );
});

test("a task with no `updated:` cannot inherit one from the prototype", () => {
  const before = Object.prototype.updated;
  try {
    // eslint-disable-next-line no-extend-native
    Object.prototype.updated = "1999-01-01";
    assert.equal(
      taskUpdatedDate("---\nid: t\n---\n"),
      null,
      "a missing `updated:` must read as absent, never inherited",
    );
  } finally {
    if (before === undefined) delete Object.prototype.updated;
    else Object.prototype.updated = before;
  }
});
