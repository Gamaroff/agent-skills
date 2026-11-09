#!/usr/bin/env node
/**
 * pipeline-completeness — read a pipeline implementation report's `## Pipeline Progress`
 * table and refuse a run whose steps are not all recorded as done.
 *
 * Why (2026-11-09, bug.128): a `/develop-bug` run was done by hand in a shortened shape — no
 * lock, `review-bug` skipped, the finalise DoD agents not dispatched — and `develop-next`
 * merged it, because its Step 3 "Verify green" checks the document status, the QA gate, the
 * head SHA, CI and the quality gate, and nothing reads the report's own record of which
 * steps ran. This is that reader. It runs at merge time, in `develop-next` and
 * `develop-batch`, on the item's newest implementation report.
 *
 * Deterministic: no model call, no network. Pure engine + thin CLI, the shape of
 * `report-lint.js`:
 *
 *   checkCompleteness(text) → { ok, variant, problems: [{ code, line, detail }] }
 *                             or throws a TableError (the table cannot be read)
 *
 * Problem codes:
 *
 *   step-not-done      a row's Status does not start with `✅` (`⏭️ Skipped`, `⏳ Pending`,
 *                      `❌`, `🔄` …), unless the one documented waiver below applies
 *   step-time-missing  a `✅` row has an empty `Completed (UTC)` cell
 *   row-missing        a step the pipeline always runs has no row: 1, 2, 3, 4, 5–6, 7, 8
 *                      (extra rows such as `1a`/`1b` are allowed and checked like the rest)
 *   row-malformed      a row's cell count differs from the header's, so no column can be trusted
 *   table-missing      (exit 2) no `## Pipeline Progress` heading, or no table under it
 *   table-unparseable  (exit 2) the table has no `Step` or `Status` column
 *
 * What is NOT a waiver, and why (read from the pipeline references, not assumed):
 *   - Lite mode. `develop-pipeline-lite-mode.md` trades QA *depth* for speed and lists `qa`,
 *     `create-pr`, `finalise`, `commit` on the floor that no mode can skip; `develop-bug`
 *     says "Lite mode applies to Step 5 only" and degrades the verify loop, never skips it.
 *     So the `**Lite mode:**` header is deliberately not read: a skipped row stays a problem
 *     in lite mode.
 *   - `--skip`. `develop-bug` refuses `--mode` and `--skip`, and `develop-next`/`develop-batch`
 *     take neither.
 *
 * The one waiver: a story or task whose Step 2 row reads `⏭️ Skipped — \`--skip review\`
 * (waived)` — what `develop-pipeline-step-2-review.md` § "When `--skip review` Is in Force"
 * writes — AND whose Decisions Log records the skip. A bug report never qualifies. A `✅`
 * row that says "skipped — already reviewed" is a `✅` row and passes: a current review exists.
 *
 * Deliberately not checked: `Subagent summary ref`. `subagent-summary-artifact.md` requires an
 * artifact only for a subagent a step actually dispatched (the step-3 iteration audit, the
 * step-5–6 triage, the resume prepass), and no step's document makes a review or finalise
 * dispatch unconditional on one. A hard rule here would halt reports the pipeline itself
 * writes as valid.
 *
 * CLI:
 *   node pipeline-completeness.js --report <implementation-report.md> [--json]
 *
 *   exit 0 complete | 1 incomplete | 2 usage or unreadable table
 *   reason: ok | incomplete | usage
 *
 * An unreadable report is never complete: every path that cannot reach a verdict exits 2.
 */
"use strict";
// Fences are found with `change-log.js`'s exported `fencedRanges` — the one fence parser this
// repository has — so a pipe-table quoted inside a fenced Decisions Log entry is not read as
// the table (the same reason `report-lint.js` uses it).
const fs = require("fs");
const { fencedRanges } = require("./change-log.js");

const REQUIRED_STEPS = Object.freeze(["1", "2", "3", "4", "5-6", "7", "8"]);

class TableError extends Error {
  constructor(code, detail) {
    super(detail);
    this.code = code;
  }
}

function splitRow(line) {
  // Cells are separated by an unescaped `|`; the leading and trailing pipe frame the row.
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return body.split(/(?<!\\)\|/).map((c) => c.trim());
}

function stepId(cell) {
  const m = /^(\d+)([a-z])?(?:\s*[–-]\s*(\d+))?/.exec(cell.replace(/^\*+/, ""));
  if (!m) return null;
  return m[3] ? `${m[1]}-${m[3]}` : `${m[1]}${m[2] || ""}`;
}

const isEmptyCell = (c) => c === "" || /^[—–-]+$/.test(c);

function checkCompleteness(text) {
  const lines = text.split("\n");
  const fences = fencedRanges(text);
  const starts = [];
  let off = 0;
  for (const l of lines) {
    starts.push(off);
    off += l.length + 1;
  }
  const fenced = (i) =>
    fences.some(([a, b]) => starts[i] >= a && starts[i] < b);

  const h = lines.findIndex(
    (l, i) => /^## Pipeline Progress\s*$/.test(l) && !fenced(i),
  );
  if (h < 0)
    throw new TableError("table-missing", "no `## Pipeline Progress` heading");

  const tableLines = [];
  for (let i = h + 1; i < lines.length; i++) {
    if (fenced(i)) continue;
    if (/^## /.test(lines[i])) break;
    if (/^\s*\|/.test(lines[i])) tableLines.push([i + 1, lines[i]]);
  }
  if (tableLines.length === 0)
    throw new TableError(
      "table-missing",
      "the `## Pipeline Progress` heading has no table under it",
    );

  const header = splitRow(tableLines[0][1]).map((c) => c.toLowerCase());
  const col = (re) => header.findIndex((c) => re.test(c));
  const iStep = col(/^step$/);
  const iStatus = col(/^status$/);
  const iDone = col(/^completed\b/);
  const iNotes = col(/^notes$/);
  if (iStep < 0 || iStatus < 0 || iDone < 0)
    throw new TableError(
      "table-unparseable",
      `the table header (line ${tableLines[0][0]}) lacks a Step, Status or Completed (UTC) column`,
    );

  const variant =
    col(/^skill$/) >= 0 || /^bug:\s*\S/m.test(text.slice(0, starts[h]))
      ? "bug"
      : "story-or-task";
  const skipRecorded = lines.some(
    (l, i) =>
      !fenced(i) &&
      !/^\s*\|/.test(l) &&
      /skipped\b.*`?--skip review`?/i.test(l),
  );

  const problems = [];
  const seen = new Set();
  for (const [lineNo, raw] of tableLines.slice(1)) {
    const cells = splitRow(raw);
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // the |---| rule
    if (cells.length !== header.length) {
      problems.push({
        code: "row-malformed",
        line: lineNo,
        detail: `row has ${cells.length} cells, the header has ${header.length}`,
      });
      continue;
    }
    const id = stepId(cells[iStep]);
    if (id === null) continue; // not a step row
    seen.add(id);
    const status = cells[iStatus];
    const label = `Step ${id}`;
    if (!status.startsWith("✅")) {
      const waived =
        variant !== "bug" &&
        id === "2" &&
        /^⏭/.test(status) &&
        /--skip review/.test(`${status} ${iNotes >= 0 ? cells[iNotes] : ""}`) &&
        skipRecorded;
      if (!waived)
        problems.push({
          code: "step-not-done",
          line: lineNo,
          detail: `${label} (${cells[iStep]}) reads "${status || "(empty)"}", not ✅`,
        });
    } else if (isEmptyCell(cells[iDone])) {
      problems.push({
        code: "step-time-missing",
        line: lineNo,
        detail: `${label} is ✅ but its Completed (UTC) cell is empty`,
      });
    }
  }
  for (const id of REQUIRED_STEPS)
    if (!seen.has(id))
      problems.push({
        code: "row-missing",
        line: tableLines[0][0],
        detail: `no row for Step ${id}`,
      });

  return { ok: problems.length === 0, variant, problems };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function emit(payload, json) {
  if (json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else {
    process.stdout.write(`${payload.reason}: ${payload.message}\n`);
    for (const p of payload.problems || [])
      process.stdout.write(`  ${p.code} (line ${p.line}): ${p.detail}\n`);
  }
  process.exitCode = payload.exitCode;
}

function usage(msg, json) {
  if (json) {
    emit({ reason: "usage", exitCode: 2, problems: [], message: msg }, true);
    return;
  }
  process.stderr.write(
    `pipeline-completeness: ${msg}\n\nUsage:\n  node pipeline-completeness.js --report <implementation-report.md> [--json]\n`,
  );
  process.exitCode = 2;
}

function main(argv) {
  const json = argv.includes("--json");
  let report = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") continue;
    if (a === "--report") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--"))
        return usage("--report needs a value", json);
      report = v;
      i += 1;
    } else return usage(`unknown argument '${a}'`, json);
  }
  if (!report) return usage("--report is required", json);
  let text;
  try {
    text = fs.readFileSync(report, "utf8");
  } catch (e) {
    return usage(`cannot read ${report}: ${e.message}`, json);
  }
  let r;
  try {
    r = checkCompleteness(text);
  } catch (e) {
    // Anything that is not a verdict is exit 2 — an uncaught throw would exit 1 and read as a finding.
    emit(
      {
        reason: "usage",
        exitCode: 2,
        file: report,
        problems: [
          {
            code: e instanceof TableError ? e.code : "unreadable",
            line: 0,
            detail: e.message,
          },
        ],
        message: `${report} has no readable Pipeline Progress table — never read as complete`,
      },
      json,
    );
    return;
  }
  if (r.ok)
    emit(
      {
        reason: "ok",
        exitCode: 0,
        file: report,
        variant: r.variant,
        problems: [],
        message: `${report} records every pipeline step as done`,
      },
      json,
    );
  else
    emit(
      {
        reason: "incomplete",
        exitCode: 1,
        file: report,
        variant: r.variant,
        problems: r.problems,
        message: `${report} has ${r.problems.length} incomplete-pipeline problem(s)`,
      },
      json,
    );
}

module.exports = { checkCompleteness, TableError, REQUIRED_STEPS };

if (require.main === module) main(process.argv.slice(2));
