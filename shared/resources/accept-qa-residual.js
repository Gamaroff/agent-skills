#!/usr/bin/env node
/**
 * accept-qa-residual.js — record the owner's acceptance of a QA loop-limit residual
 * (task.251, obs #115, #150).
 *
 * After a loop-limit escalation the HALT offers option 2, "Accept the residual". Before this
 * engine nothing recorded that decision, so two later readers refused it by construction: the
 * conformance lens read the last QA Cycle entry's `Escalating — loop limit reached` (obs #115),
 * and develop-next Step 3 read the gate's findings as still `open` (obs #150). This is the ONE
 * writer of the acceptance. It records it where those readers already look:
 *
 *   1. the highest gate: `gate: WAIVED`, an active `waiver:` block naming the approver, each open
 *      `top_issues` entry stamped `status: waived`, `updated:` from the clock. `head:` and every
 *      other line stay byte-identical — a line-preserving edit, never a YAML round trip (the
 *      repository has no YAML dependency, and a round trip would reformat the gate);
 *   2. the implementation report: the highest gate's `### QA Cycle {N}` entry moves onto the
 *      existing accepting route (`**Action**: Proceeding to 5c (PR conformance review)`), its
 *      `**Loop exit**` row names the decision, and one Decisions Log line records it.
 *
 * The lock half (restore + `qa_phase: 5c`) is accept-qa-residual.sh, beside grant-qa-cycles.sh.
 *
 * It is an exception to "dev-side steps never modify a gate file", and it is stated once, in the
 * QA loop: the waiver is an owner's decision, not a dev-side verdict. It sits BESIDE the only
 * other gate-waiver writer — the QA skill under `--skip`, checked by pipeline-answers.js `gate` —
 * and writes the same `waiver:` shape. `gateFor`'s rule holds here too: a `FAIL` is never waived.
 * `gateFor` itself cannot be called for it, because with no step skip it returns the earned token.
 *
 * READING reuses qa-diminishing-returns.js (`readGateToken`, `readTopIssues`, `isOpen`): a
 * classifier and a writer that parse one input two ways disagree exactly where it matters
 * (obs #134). The writer finds each entry's LINES with the same walk `readTopIssues` makes, checks
 * the two agree on the entry count, and reads the edited gate BACK through the same reader: zero
 * open entries and a `WAIVED` token, or nothing is written.
 *
 * The highest gate is asked of qa-cycle.sh `--path gate`, the one definition of "the QA cycle".
 *
 * Exit codes (the tracker-comment.js / observation-log.js contract):
 *   0  accepted | already
 *   1  no-gate | unreadable-gate | fail-gate | nothing-to-accept | no-report | no-report-entry |
 *      report-malformed | no-loop-limit | engine-unavailable | write-failed
 *   2  usage
 *
 * Every refusal is decided before the first write, so a refusal changes no byte.
 *
 * Idempotent per artefact: a gate already WAIVED with an active waiver and no open entry is left
 * alone, and so is a report entry already moved by this writer (its Loop exit carries the
 * `(accept-qa-residual)` marker). The gate is written first, then the report, so a Stop between
 * them leaves a state the re-run finishes (`accepted`); a run with nothing left to do is
 * `already`.
 *
 * bundle-dependency: shared/resources/qa-cycle.sh
 * bundle-dependency: shared/resources/qa-diminishing-returns.js
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  readGateToken,
  readTopIssues,
  isOpen,
} = require("./qa-diminishing-returns.js");

const MARKER = "(accept-qa-residual)";
const ACTION_ACCEPTED = "Proceeding to 5c (PR conformance review)";
const ACTION_LOOP_LIMIT = "Escalating — loop limit reached";
const ACTION_NOT_CONVERGING = "Escalating — loop not converging";
const ORIGIN_BACKFILL = "run outside the loop (operator)";

const EXIT = Object.freeze({
  accepted: 0,
  already: 0,
  "no-gate": 1,
  "unreadable-gate": 1,
  "fail-gate": 1,
  "nothing-to-accept": 1,
  "no-report": 1,
  "no-report-entry": 1,
  "report-malformed": 1,
  "no-loop-limit": 1,
  "engine-unavailable": 1,
  "write-failed": 1,
  usage: 2,
});

function result(reason, extra) {
  return Object.assign({ reason, exitCode: EXIT[reason] }, extra || {});
}

// ─── YAML scalar helpers ───────────────────────────────────────────────────

/** A single-quoted YAML scalar: `'` doubled, newlines folded to spaces. */
function sq(text) {
  return `'${String(text).replace(/\r?\n/g, " ").replace(/'/g, "''")}'`;
}

function indentOf(line) {
  const m = line.match(/[^ ]/);
  return m ? m.index : line.length;
}

/**
 * The line span of each `top_issues` entry: the same walk readTopIssues makes (block opens at a
 * column-0 `top_issues:`, entries are `- ` lines at the first entry's indent, the block ends at a
 * non-blank column-0 line that is not a `- ` line). `null` when there is no block.
 */
function topIssueSpans(lines) {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^top_issues[ \t]*:/.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  const spans = [];
  let base = null;
  let current = null;
  let i = start + 1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const ind = indentOf(line);
    if (ind === 0 && !/^-[ \t]/.test(line)) break;
    const isEntry = /^[ \t]*-[ \t]/.test(line);
    if (isEntry && base === null) base = ind;
    if (isEntry && ind === base) {
      if (current) spans.push(current);
      current = { first: i, last: i, base };
      continue;
    }
    if (current) current.last = i;
  }
  if (current) spans.push(current);
  return spans;
}

/** Rewrite one entry's lines so that it reads `status: waived`. Returns the new lines. */
function waiveEntry(entryLines, base) {
  const out = entryLines.slice();
  const dash = out[0];
  // Flow style only when the value after the dash IS a mapping: a `{` inside a quoted block-style
  // value (`- id: "X {y}"`) is text, not a mapping (T251-QA-1).
  const flow = /^[ \t]*-[ \t]*\{/.exec(dash);
  const brace = flow ? flow[0].length - 1 : -1;
  if (brace !== -1 && dash.lastIndexOf("}") > brace) {
    // Flow style: `- { id: X, status: open }`.
    const close = dash.lastIndexOf("}");
    const inner = dash.slice(brace + 1, close);
    const statusRe = /((?:^|[,\s])status[ \t]*:[ \t]*)([^,}]*)/;
    let next;
    if (statusRe.test(inner)) {
      next = inner.replace(statusRe, (m, key, val) => {
        const trail = val.match(/[ \t]*$/)[0];
        return `${key}waived${trail}`;
      });
    } else {
      const trimmed = inner.replace(/[ \t]*$/, "");
      const pad = inner.slice(trimmed.length);
      next = `${trimmed}, status: waived${pad || " "}`;
    }
    out[0] = dash.slice(0, brace + 1) + next + dash.slice(close);
    return out;
  }
  // Block style: a `status:` key on the dash line, or on a line at the key indent.
  const dashStatus = /^([ \t]*-[ \t]+status[ \t]*:[ \t]*)(.*)$/;
  if (dashStatus.test(dash)) {
    out[0] = dash.replace(dashStatus, (m, key) => `${key}waived`);
    return out;
  }
  const keyIndent = base + 2;
  for (let j = 1; j < out.length; j++) {
    const line = out[j];
    if (indentOf(line) === keyIndent && /^[ \t]*status[ \t]*:/.test(line)) {
      out[j] = line.replace(/^([ \t]*status[ \t]*:[ \t]*).*$/, "$1waived");
      return out;
    }
  }
  // No `status:` key: insert one after the entry's last non-blank line, at the key indent.
  let lastNonBlank = 0;
  for (let j = 0; j < out.length; j++)
    if (out[j].trim() !== "") lastNonBlank = j;
  out.splice(lastNonBlank + 1, 0, `${" ".repeat(keyIndent)}status: waived`);
  return out;
}

/** The `waiver:` block this writer writes. */
function waiverBlock(opts) {
  return [
    "waiver:",
    "  active: true",
    `  reason: ${sq(opts.reason)}`,
    `  approved_by: ${sq(opts.approvedBy)}`,
    `  approved_at: ${sq(opts.date)}`,
  ];
}

/** True when the gate already carries `waiver:` with `active: true` (block or flow style). */
function waiverActive(lines) {
  for (let i = 0; i < lines.length; i++) {
    const m = /^waiver[ \t]*:(.*)$/.exec(lines[i]);
    if (!m) continue;
    if (/\bactive[ \t]*:[ \t]*true\b/.test(m[1])) return true;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === "") continue;
      if (indentOf(lines[j]) === 0) break;
      if (/^[ \t]+active[ \t]*:[ \t]*true\b/.test(lines[j])) return true;
    }
    return false;
  }
  return false;
}

/**
 * Plan the gate edit. Pure: content in, `{ state, content?, waived[] }` out, where state is
 * `edit` (content is the new gate), `already`, or a refusal reason.
 */
function planGateEdit(gateContent, opts) {
  return withOk(planGateEditRaw(gateContent, opts));
}

/** Every plan result carries `ok`: true for `edit` and `already`, false for each refusal (T251-QA-2). */
function withOk(plan) {
  return { ok: plan.state === "edit" || plan.state === "already", ...plan };
}

function planGateEditRaw(gateContent, opts) {
  const token = readGateToken(gateContent);
  if (token === null)
    return {
      state: "unreadable-gate",
      detail: "the gate's `gate:` verdict cannot be read",
    };
  // gateFor's rule (pipeline-answers.js): a waiver never masks a failure.
  if (token === "FAIL")
    return {
      state: "fail-gate",
      detail: "the highest gate reads FAIL — a waiver never masks a failure",
    };
  if (!["PASS", "CONCERNS", "WAIVED"].includes(token))
    return {
      state: "unreadable-gate",
      detail: `unknown gate verdict "${token}"`,
    };
  const entries = readTopIssues(gateContent);
  if (entries === null)
    return { state: "unreadable-gate", detail: "the gate cannot be read" };
  const eol = gateContent.includes("\r\n") ? "\r\n" : "\n";
  const lines = gateContent.split(/\r?\n/);
  const spans = topIssueSpans(lines) || [];
  if (spans.length !== entries.length)
    return {
      state: "unreadable-gate",
      detail: `top_issues: the reader sees ${entries.length} entries, the writer's walk ${spans.length} — refusing to guess`,
    };
  const openIdx = [];
  entries.forEach((e, i) => {
    if (isOpen(e)) openIdx.push(i);
  });
  const active = waiverActive(lines);
  if (token === "WAIVED" && active && openIdx.length === 0)
    return { state: "already", waived: [] };
  if (token !== "WAIVED" && openIdx.length === 0)
    return {
      state: "nothing-to-accept",
      detail: `the gate reads ${token} with no open entry — it already exits the loop`,
    };

  // A flow mapping that opens on the dash line and closes on a later line cannot be edited
  // line-by-line: the block branch would leave its `status:` alone and add a stray key after it.
  // Refuse rather than write invalid YAML (T251-CR2-1).
  for (const i of openIdx) {
    const dash = lines[spans[i].first];
    const m = /^[ \t]*-[ \t]*\{/.exec(dash);
    if (m && dash.lastIndexOf("}") <= m[0].length - 1)
      return {
        state: "unreadable-gate",
        detail: `top_issues entry ${i + 1} opens a flow mapping that does not close on its first line — refusing to edit it line by line`,
      };
  }

  // Edit bottom-up so earlier line numbers stay valid.
  const edits = [];
  for (const i of openIdx) edits.push({ kind: "entry", span: spans[i] });
  let out = lines.slice();
  for (const e of edits.sort((a, b) => b.span.first - a.span.first)) {
    const { first, last, base } = e.span;
    const replaced = waiveEntry(out.slice(first, last + 1), base);
    out.splice(first, last - first + 1, ...replaced);
  }
  // waiver: replace the block (or the flow line) unless one is already active.
  if (!active) {
    let w = -1;
    for (let i = 0; i < out.length; i++)
      if (/^waiver[ \t]*:/.test(out[i])) {
        w = i;
        break;
      }
    const block = waiverBlock(opts);
    if (w === -1) {
      while (out.length && out[out.length - 1] === "") out.pop();
      out.push(...block, "");
    } else {
      let end = w;
      for (let j = w + 1; j < out.length; j++) {
        if (out[j].trim() === "") continue;
        if (indentOf(out[j]) === 0) break;
        end = j;
      }
      out.splice(w, end - w + 1, ...block);
    }
  }
  // gate: and updated:
  let g = -1;
  for (let i = 0; i < out.length; i++)
    if (/^gate[ \t]*:/.test(out[i])) {
      g = i;
      break;
    }
  out[g] = out[g].replace(/^(gate[ \t]*:[ \t]*).*$/, "$1WAIVED");
  let u = -1;
  for (let i = 0; i < out.length; i++)
    if (/^updated[ \t]*:/.test(out[i])) {
      u = i;
      break;
    }
  if (u === -1) out.splice(g + 1, 0, `updated: ${sq(opts.timestamp)}`);
  else {
    const raw = out[u].replace(/^updated[ \t]*:[ \t]*/, "");
    const q = raw.startsWith('"') ? '"' : raw.startsWith("'") ? "'" : "";
    out[u] = out[u].replace(
      /^(updated[ \t]*:[ \t]*).*$/,
      `$1${q}${opts.timestamp}${q}`,
    );
  }
  const content = out.join(eol);

  // Read the edit BACK through the reader the merge gates use.
  const after = readTopIssues(content);
  const stillOpen = after ? after.filter(isOpen).length : -1;
  if (
    readGateToken(content) !== "WAIVED" ||
    after === null ||
    after.length !== entries.length ||
    after.some((e, i) => e.id !== entries[i].id) ||
    stillOpen !== 0
  )
    return {
      state: "unreadable-gate",
      detail: `the edited gate does not read back as WAIVED with zero open entries (open after edit: ${stillOpen}) — nothing written`,
    };
  const waived = openIdx.map((i) => entries[i].id || `entry ${i + 1}`);
  return { state: "edit", content, waived };
}

// ─── report ─────────────────────────────────────────────────────────────────

/** `### QA Cycle {n}` entries: `[{ n, first, last }]`, in file order. */
function cycleEntries(lines) {
  const out = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const m = /^### QA Cycle (\d+)(?!\d)/.exec(lines[i]);
    const ends = /^#{1,3} /.test(lines[i]) || /^---[ \t]*$/.test(lines[i]);
    if (cur && ends) {
      out.push(cur);
      cur = null;
    }
    if (m) cur = { n: Number(m[1]), first: i, last: i };
    else if (cur) cur.last = i;
  }
  if (cur) out.push(cur);
  return out;
}

function rowIndex(lines, entry, label) {
  const re = new RegExp(`^\\*\\*${label}\\*\\*:`);
  for (let i = entry.first + 1; i <= entry.last; i++)
    if (re.test(lines[i])) return i;
  return -1;
}

function rowValue(lines, entry, label) {
  const i = rowIndex(lines, entry, label);
  return i === -1
    ? null
    : lines[i].replace(new RegExp(`^\\*\\*${label}\\*\\*:[ \\t]*`), "");
}

/**
 * Plan the report edit for gate cycle `n`. Pure: `{ state, content? }`, state `edit`, `already`
 * or a refusal reason.
 */
function planReportEdit(reportContent, n, opts) {
  return withOk(planReportEditRaw(reportContent, n, opts));
}

function planReportEditRaw(reportContent, n, opts) {
  const eol = reportContent.includes("\r\n") ? "\r\n" : "\n";
  const lines = reportContent.split(/\r?\n/);
  const entries = cycleEntries(lines);
  const entry = entries.filter((e) => e.n === n).pop();
  if (!entry)
    return {
      state: "no-report-entry",
      detail: `the report has no "### QA Cycle ${n}" entry for gate.${n} — run Phase 0b's back-fill (resume contract) first`,
    };
  const action = rowValue(lines, entry, "Action");
  const loopExit = rowValue(lines, entry, "Loop exit");
  if (action === null)
    return {
      state: "report-malformed",
      detail: `QA Cycle ${n} has no **Action** row`,
    };

  if (
    action.startsWith("Proceeding to 5c") &&
    loopExit !== null &&
    loopExit.includes(MARKER)
  )
    return { state: "already" };

  let eligible = action.startsWith(ACTION_LOOP_LIMIT);
  if (
    !eligible &&
    (rowValue(lines, entry, "Origin") || "").startsWith(ORIGIN_BACKFILL)
  ) {
    // State 3: the operator ran a cycle by hand after the HALT. The escalation that halted the
    // loop is the latest earlier entry whose Action escalates; it must be the loop limit.
    const earlier = entries.filter((e) => e.first < entry.first).reverse();
    for (const e of earlier) {
      const a = rowValue(lines, e, "Action") || "";
      if (a.startsWith("Escalating")) {
        eligible = a.startsWith(ACTION_LOOP_LIMIT);
        break;
      }
    }
  }
  if (!eligible)
    return {
      state: "no-loop-limit",
      detail: `QA Cycle ${n} reads "**Action**: ${action}" — only a loop-limit escalation can be accepted (a not-converging escalation's findings are NOT accepted)`,
    };

  // Decisions Log: its section runs from `## Decisions Log` to the next `---` or `## `.
  let dl = -1;
  for (let i = 0; i < lines.length; i++)
    if (/^## Decisions Log[ \t]*$/.test(lines[i])) {
      dl = i;
      break;
    }
  if (dl === -1)
    return {
      state: "report-malformed",
      detail: "the report has no ## Decisions Log section",
    };
  let dlEnd = lines.length;
  for (let i = dl + 1; i < lines.length; i++)
    if (/^---[ \t]*$/.test(lines[i]) || /^## /.test(lines[i])) {
      dlEnd = i;
      break;
    }
  let insertAt = dlEnd;
  while (insertAt - 1 > dl && lines[insertAt - 1].trim() === "") insertAt--;

  const out = lines.slice();
  out[rowIndex(out, entry, "Action")] = `**Action**: ${ACTION_ACCEPTED}`;
  const loopExitLine = `**Loop exit**: residual accepted by ${opts.approvedBy} on ${opts.date} ${MARKER}`;
  const le = rowIndex(out, entry, "Loop exit");
  if (le !== -1) out[le] = loopExitLine;
  else out.splice(rowIndex(out, entry, "Action"), 0, loopExitLine);

  const waived =
    opts.waived && opts.waived.length
      ? opts.waived.join(", ")
      : "none newly waived";
  const logLine =
    `- QA residual accepted at the loop-limit escalation (cycle ${n}): gate.${n} recorded as WAIVED ` +
    `(${waived}); approved by ${opts.approvedBy} on ${opts.date} — ${opts.reason.replace(/\r?\n/g, " ")}. ` +
    `Recorded by accept-qa-residual; the run resumes at Step 5c.`;
  // The entry edit above does not move lines before the Decisions Log unless the Loop exit row
  // was inserted — and the log always precedes QA Iteration History, so `insertAt` is stable.
  out.splice(insertAt, 0, logLine);
  return { state: "edit", content: out.join(eol) };
}

// ─── orchestration ──────────────────────────────────────────────────────────

function highestGate(docDir) {
  const r = spawnSync(
    "bash",
    [path.join(__dirname, "qa-cycle.sh"), docDir, "--path", "gate"],
    {
      encoding: "utf8",
    },
  );
  if (r.error || (r.status !== 0 && r.status !== 1))
    return {
      error: "engine-unavailable",
      detail: `qa-cycle.sh not runnable (rc ${r.status})`,
    };
  if (r.status === 1)
    return {
      error: "no-gate",
      detail:
        (r.stderr || "").replace(/^⚠️ *qa-cycle: */, "").trim() ||
        "no gate on disk",
    };
  const p = r.stdout.trim();
  const m = /\.gate\.0*(\d+)\./.exec(path.basename(p));
  if (!p || !m)
    return { error: "no-gate", detail: "qa-cycle.sh named no numbered gate" };
  return { path: p, n: Number(m[1]) };
}

function writeAtomic(file, content) {
  const tmp = `${file}.tmp.${process.pid}`;
  try {
    fs.writeFileSync(tmp, content);
    fs.renameSync(tmp, file);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* already gone */
    }
    throw err;
  }
}

/**
 * Record the acceptance. `opts`: { docDir, report, approvedBy, reason, now (Date) }.
 */
function acceptResidual(opts) {
  const now = opts.now || new Date();
  const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const date = timestamp.slice(0, 10);
  // One line wherever it lands: a CR/LF in either would forge report lines (T251-CR-2).
  const oneLine = (s) =>
    typeof s === "string" ? s.replace(/[\r\n]+/g, " ").trim() : s;
  const o = {
    approvedBy: oneLine(opts.approvedBy),
    reason: oneLine(opts.reason),
    timestamp,
    date,
  };

  const g = highestGate(opts.docDir);
  if (g.error) return result(g.error, { detail: g.detail });
  let gateContent;
  try {
    gateContent = fs.readFileSync(g.path, "utf8");
  } catch {
    return result("unreadable-gate", {
      gate: g.path,
      detail: "the gate file cannot be read",
    });
  }
  if (!fs.existsSync(opts.report))
    return result("no-report", {
      detail: `implementation report '${opts.report}' not found`,
    });
  const reportContent = fs.readFileSync(opts.report, "utf8");

  const gatePlan = planGateEdit(gateContent, o);
  if (gatePlan.state !== "edit" && gatePlan.state !== "already")
    return result(gatePlan.state, {
      gate: g.path,
      cycle: g.n,
      detail: gatePlan.detail,
    });
  const reportPlan = planReportEdit(
    reportContent,
    g.n,
    Object.assign({ waived: gatePlan.waived }, o),
  );
  if (reportPlan.state !== "edit" && reportPlan.state !== "already")
    return result(reportPlan.state, {
      gate: g.path,
      cycle: g.n,
      detail: reportPlan.detail,
    });

  if (gatePlan.state === "already" && reportPlan.state === "already")
    return result("already", {
      gate: g.path,
      cycle: g.n,
      gateWritten: false,
      reportWritten: false,
    });

  try {
    if (gatePlan.state === "edit") writeAtomic(g.path, gatePlan.content);
    if (reportPlan.state === "edit")
      writeAtomic(opts.report, reportPlan.content);
  } catch (err) {
    return result("write-failed", {
      gate: g.path,
      cycle: g.n,
      detail: String(err && err.message),
    });
  }
  return result("accepted", {
    gate: g.path,
    cycle: g.n,
    gateWritten: gatePlan.state === "edit",
    reportWritten: reportPlan.state === "edit",
    waived: gatePlan.waived || [],
  });
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const USAGE =
  "Usage: accept-qa-residual.js --doc-dir <dir> --report <implementation-report> " +
  '--approved-by "<name>" --reason "<text>" [--now <iso>] [--json]';

function parseArgs(argv) {
  const a = { json: false };
  const takes = {
    "--doc-dir": "docDir",
    "--report": "report",
    "--approved-by": "approvedBy",
    "--reason": "reason",
    "--now": "now",
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--json") a.json = true;
    else if (takes[k]) {
      if (i + 1 >= argv.length) return { error: `${k} needs a value` };
      a[takes[k]] = argv[++i];
    } else return { error: `unknown argument "${k}"` };
  }
  for (const k of ["--doc-dir", "--report", "--approved-by", "--reason"]) {
    const v = a[takes[k]];
    if (typeof v !== "string" || v.trim() === "")
      return { error: `${k} is required and must not be empty` };
  }
  if (!fs.existsSync(a.docDir) || !fs.statSync(a.docDir).isDirectory())
    return { error: `--doc-dir '${a.docDir}' is not a directory` };
  if (a.now !== undefined) {
    const d = new Date(a.now);
    if (Number.isNaN(d.getTime()))
      return { error: `--now '${a.now}' is not a date` };
    a.now = d;
  }
  return a;
}

function main(argv) {
  const a = parseArgs(argv);
  // --json is read off argv, not off the parse: a usage error must still answer in JSON.
  const json = argv.includes("--json");
  let r;
  if (a.error) r = result("usage", { detail: `${a.error}. ${USAGE}` });
  else r = acceptResidual(a);
  if (json) process.stdout.write(JSON.stringify(r) + "\n");
  else {
    const line = `accept-qa-residual: ${r.reason}${r.detail ? ` — ${r.detail}` : ""}`;
    (r.exitCode === 0 ? process.stdout : process.stderr).write(line + "\n");
  }
  return r.exitCode;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = {
  acceptResidual,
  planGateEdit,
  planReportEdit,
  topIssueSpans,
  waiveEntry,
  parseArgs,
  main,
  MARKER,
  EXIT,
};
