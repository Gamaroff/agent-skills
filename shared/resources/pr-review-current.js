#!/usr/bin/env node
/**
 * pr-review-current — which `*.pr-review.{n}.*.md` report, if any, still describes the work.
 *
 * `/qa-fix` feeds the findings ingester at most one PR review report. Before this helper the
 * ingester took the highest-numbered one, always — so a REQUEST CHANGES report whose findings a
 * 5b pass had already fixed was read again on every later cycle, with its HIGH findings counted as
 * open. Nothing ever retired it: only a fresh 5c writes a newer report, and 5c runs only once a
 * gate is clean.
 *
 * The rule: **a report is current while no newer gate exists.** `/review-pr` records the gate it
 * read as `reviewed_gate:` in its machine-readable block (Step 3 reads the highest-numbered gate).
 * When a later QA cycle writes a higher-numbered gate, that gate has re-reviewed the code since the
 * report was written, and the report is `superseded`. Dropping it loses nothing: nothing leaves the
 * QA loop except through a fresh 5c, which reviews the PR again.
 *
 * Gates are compared by NUMBER, never by name or by `ls | sort` (`gate.9` sorts after `gate.19`;
 * the slug may differ). The same `.<kind>.<n>.` reading as `newest-numbered.sh`.
 *
 * Usage:
 *   node pr-review-current.js --dir <work-item-dir> [--json]
 *
 * Without `--json`, prints the current report's path, or nothing.
 *
 * Reasons (all exit 0):
 *   current     the newest report's reviewed_gate is the highest gate (or newer) → use `report`
 *   legacy      the newest report predates `reviewed_gate:` (no block, or no key) → use `report`;
 *               supersession cannot be decided, and dropping findings on a guess is the worse error
 *   superseded  a gate newer than the one the report read exists → `report` is null
 *   none        the directory holds no PR review report → `report` is null
 * Exit 2: usage (`--dir` missing or not a directory).
 */

"use strict";

const fs = require("fs");
const path = require("path");

/** The highest-numbered member of a `.<kind>.<n>.` series in `dir`: { n, file } or null. */
function newestNumbered(dir, kind, ext) {
  const re = new RegExp(`\\.${kind}\\.(\\d+)\\..*\\.${ext}$`);
  let best = null;
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(re);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (!best || n > best.n) best = { n, file: path.join(dir, name) };
  }
  return best;
}

/**
 * The `reviewed_gate:` value from a report's machine-readable block.
 * Returns undefined when the block or the key is absent (a legacy report); otherwise the gate's
 * number, with 0 for `none` — the report was written when no gate existed.
 */
function reviewedGateNumber(text) {
  const block = text.match(
    /^## Machine-Readable Findings\s*\n+```yaml\n([\s\S]*?)^```/m,
  );
  if (!block) return undefined;
  const line = block[1].match(/^reviewed_gate:[ \t]*(.*?)[ \t]*$/m);
  if (!line) return undefined;
  const value = line[1].replace(/^["']|["']$/g, "");
  if (value === "" || value === "none" || value === "null" || value === "~")
    return 0;
  const m = value.match(/\.gate\.(\d+)\./);
  return m ? parseInt(m[1], 10) : undefined;
}

function select(dir) {
  const report = newestNumbered(dir, "pr-review", "md");
  const gate = newestNumbered(dir, "gate", "yml");
  const latestGate = gate ? path.basename(gate.file) : null;
  if (!report)
    return {
      reason: "none",
      report: null,
      reviewed_gate: null,
      latest_gate: latestGate,
    };

  const reviewed = reviewedGateNumber(fs.readFileSync(report.file, "utf-8"));
  const base = { report: report.file, latest_gate: latestGate };
  if (reviewed === undefined)
    return { reason: "legacy", ...base, reviewed_gate: null };
  if (reviewed >= (gate ? gate.n : 0))
    return { reason: "current", ...base, reviewed_gate: reviewed };
  return {
    reason: "superseded",
    ...base,
    report: null,
    superseded_report: report.file,
    reviewed_gate: reviewed,
  };
}

function main(argv) {
  const json = argv.includes("--json");
  const i = argv.indexOf("--dir");
  const dir = i > -1 ? argv[i + 1] : undefined;
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    const error = `--dir must name a work-item directory (got ${dir === undefined ? "nothing" : JSON.stringify(dir)})`;
    if (json)
      process.stdout.write(
        JSON.stringify({ reason: "usage", error, exitCode: 2 }) + "\n",
      );
    else process.stderr.write(`pr-review-current: ${error}\n`);
    return 2;
  }
  const result = select(dir);
  if (json)
    process.stdout.write(JSON.stringify({ ...result, exitCode: 0 }) + "\n");
  else if (result.report) process.stdout.write(result.report + "\n");
  return 0;
}

module.exports = { select, reviewedGateNumber };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
