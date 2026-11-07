#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/finalise-deferral-match.js. Regenerate via `npm run bundle`.
/**
 * finalise-deferral-match — Arm 3 of the /finalise acceptance arms (task 271, obs #117).
 *
 * A security-probe case that REPRODUCES is a FAIL — unless the repository owner already deferred
 * exactly that case to a named follow-up task. On task.238 the probe reproduced
 * `oc10-second-findings-cut-short`, which QA gate 10 had reproduced and the owner had deferred to
 * task.240; the skill offered only a halt, or a fix that contradicted the decision, and the run
 * accepted by judgement. This engine replaces that judgement with a MECHANICAL match, so an agent
 * never decides whether a deferral is real: it runs this and reads `reason`.
 *
 * A case is deferred ("matched") only when ALL of these hold for one record:
 *   1. the record names the case id as a whole token (exact, never a substring of a longer id),
 *   2. it names a follow-up task (`task.N`),
 *   3. it names an approver, and that approver is one the caller passed with `--approver`
 *      (the repository owner, read by the caller from `finalise.deferralApprover` in
 *      skills-config.yaml — this engine reads no configuration itself),
 *   4. it carries an approval date (YYYY-MM-DD).
 * Anything less is not a deferral and the case stays a FAIL. With no `--approver`, nothing matches.
 *
 * Two record shapes are read, and only these:
 *   - the QA gate's `recommendations.future[]`: an entry whose `action` names the case id and which
 *     carries `deferred_to: task.N`, `approved_by: <name>`, `approved_on: YYYY-MM-DD`;
 *   - the work item's `## Deferred Work` section (an H2): a list item that names the case id and
 *     contains `deferred to task.N` and `approved by <name> on YYYY-MM-DD`.
 *
 * FAILS CLOSED. Exit 0 means exactly one thing: `matched`. Every other answer exits 1 (a usage error
 * exits 2), so a shell `if` cannot round a "no" up to a deferral.
 *
 * Usage:
 *   finalise-deferral-match.js --case <id> [--gate <gate.yml>] [--work-item <doc.md>]
 *                              --approver <name> [--approver <name> ...] [--json]
 *   At least one of --gate and --work-item is required.
 *
 * `--json` prints { reason, case, owner, date, task, source, rendered, candidates, detail } and
 * nothing else on stdout. `rendered` is the DoD line, `deferred (owner <name>, <date>, <task>)`.
 *
 * Reasons: matched | no-match (no record names the case) | unapproved (a record names the case but
 * lacks a task, a valid date, or an approver on the list) | no-approver-configured | unverifiable
 * (a named source could not be read or parsed).
 *
 * Depends on yaml-subset.js and nothing else.
 */

"use strict";

const fs = require("fs");

const { parseYamlSubset } = require("./yaml-subset.js");

const USAGE =
  "usage: finalise-deferral-match.js --case <id> [--gate <gate.yml>] [--work-item <doc.md>] --approver <name> [--approver <name> ...] [--json]";

class UsageError extends Error {}

const REASONS = Object.freeze({
  MATCHED: "matched",
  NO_MATCH: "no-match",
  UNAPPROVED: "unapproved",
  NO_APPROVER: "no-approver-configured",
  UNVERIFIABLE: "unverifiable",
});

const CASE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// A positive integer with no leading zero, so task.0 and task.007 are not follow-up tasks.
const TASK_RE = /^task\.[1-9]\d{0,8}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A real calendar date that is not in the future (T271-QA-3). The shape alone let 2026-13-45 and
 * 0000-00-00 through into the DoD line. The date round-trips through Date.UTC, so a month or day
 * that rolled over (2026-02-31) is refused.
 */
function isRealPastDate(s, now = Date.now()) {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y < 1970) return false;
  const t = Date.UTC(y, m - 1, d);
  const back = new Date(t);
  if (
    back.getUTCFullYear() !== y ||
    back.getUTCMonth() !== m - 1 ||
    back.getUTCDate() !== d
  ) {
    return false;
  }
  return t <= now;
}

function parseArgs(argv) {
  const out = {
    caseId: "",
    gate: "",
    workItem: "",
    approvers: [],
    json: false,
  };
  const need = (i, flag) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) {
      throw new UsageError(`${flag} needs a value`);
    }
    return v;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--case") out.caseId = need(i++, a);
    else if (a === "--gate") out.gate = need(i++, a);
    else if (a === "--work-item") out.workItem = need(i++, a);
    else if (a === "--approver") out.approvers.push(need(i++, a));
    else throw new UsageError(`unknown argument "${a}"`);
  }
  if (!CASE_ID_RE.test(out.caseId)) {
    throw new UsageError(
      "--case is required and must be an id of letters, digits, '.', '_' or '-'",
    );
  }
  if (!out.gate && !out.workItem) {
    throw new UsageError("at least one of --gate and --work-item is required");
  }
  return out;
}

/** True when `id` occurs in `text` as a whole token: not inside a longer id. */
function namesCase(text, id) {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^A-Za-z0-9._-])${esc}($|[^A-Za-z0-9._-]|\\.(?![A-Za-z0-9_-]))`,
  ).test(String(text));
}

/** Strip surrounding backticks/quotes/brackets and trim, so `Name` and "Name" compare equal. */
function cleanName(s) {
  return String(s == null ? "" : s)
    .trim()
    .replace(/^[`'"*_]+|[`'"*_]+$/g, "")
    .trim();
}

function approverListed(name, approvers) {
  const n = cleanName(name).toLowerCase();
  return n !== "" && approvers.some((a) => cleanName(a).toLowerCase() === n);
}

/**
 * Judge one candidate record. Returns { ok, owner, date, task } or { ok: false, why }.
 * `task` / `owner` / `date` may be absent on a candidate; absence is `unapproved`, never a match.
 */
function judge({ task, owner, date }, approvers) {
  if (!TASK_RE.test(String(task || "").trim())) {
    return { ok: false, why: "no follow-up task named (task.N)" };
  }
  if (!isRealPastDate(String(date || "").trim())) {
    return {
      ok: false,
      why: "no approval date (a real YYYY-MM-DD, not in the future)",
    };
  }
  if (cleanName(owner) === "") return { ok: false, why: "no approver named" };
  if (!approverListed(owner, approvers)) {
    return {
      ok: false,
      why: `approver "${cleanName(owner)}" is not on the owner list`,
    };
  }
  return {
    ok: true,
    owner: cleanName(owner),
    date: String(date).trim(),
    task: String(task).trim(),
  };
}

/** Candidates from the gate's recommendations.future[]; throws on an unreadable gate. */
function gateCandidates(text, id) {
  const doc = parseYamlSubset(text);
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error("the gate did not parse as a mapping");
  }
  const rec = doc.recommendations;
  const future = rec && typeof rec === "object" ? rec.future : undefined;
  if (future === undefined || future === null) return [];
  if (!Array.isArray(future))
    throw new Error("recommendations.future is not a list");
  const out = [];
  future.forEach((e, i) => {
    const action =
      typeof e === "string" ? e : e && typeof e === "object" ? e.action : "";
    if (!namesCase(action, id)) return;
    const f = e && typeof e === "object" ? e : {};
    out.push({
      source: `gate recommendations.future[${i}]`,
      task: f.deferred_to,
      owner: f.approved_by,
      date: f.approved_on,
    });
  });
  return out;
}

/** The list items of the work item's `## Deferred Work` H2 (continuation lines joined). */
function deferredWorkItems(text) {
  const lines = String(text).split("\n");
  const items = [];
  let inSection = false;
  let inFence = false;
  let cur = null;
  const flush = () => {
    if (cur !== null) items.push(cur.join(" "));
    cur = null;
  };
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^## /.test(line)) {
      flush();
      inSection = /^## Deferred Work\s*$/.test(line);
      continue;
    }
    if (!inSection) continue;
    if (/^\s*[-*] /.test(line)) {
      flush();
      cur = [line.replace(/^\s*[-*] /, "")];
    } else if (cur !== null && /^\s+\S/.test(line)) {
      cur.push(line.trim());
    } else if (line.trim() === "") {
      flush();
    }
  }
  flush();
  return items;
}

function workItemCandidates(text, id) {
  const out = [];
  deferredWorkItems(text).forEach((item, i) => {
    if (!namesCase(item, id)) return;
    const task = /deferred to (task\.\d+)(?![\w.-]*\w)/i.exec(item);
    const appr = /approved by (.+?) on (\d{4}-\d{2}-\d{2})/i.exec(item);
    out.push({
      source: `work item Deferred Work item ${i + 1}`,
      task: task ? task[1] : "",
      owner: appr ? appr[1] : "",
      date: appr ? appr[2] : "",
    });
  });
  return out;
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function decide(args) {
  const base = {
    case: args.caseId,
    owner: "",
    date: "",
    task: "",
    source: "",
    rendered: "",
    candidates: 0,
    detail: "",
  };
  const done = (reason, extra) => ({ reason, ...base, ...extra });

  if (args.approvers.map(cleanName).filter(Boolean).length === 0) {
    return done(REASONS.NO_APPROVER, {
      detail:
        "no owner is configured (finalise.deferralApprover); with no approver on the list no deferral is accepted",
    });
  }

  const candidates = [];
  for (const [kind, p] of [
    ["gate", args.gate],
    ["work item", args.workItem],
  ]) {
    if (!p) continue;
    let text;
    try {
      text = readText(p);
    } catch (e) {
      return done(REASONS.UNVERIFIABLE, {
        detail: `the ${kind} could not be read: ${e.code || e.message}`,
      });
    }
    try {
      candidates.push(
        ...(kind === "gate"
          ? gateCandidates(text, args.caseId)
          : workItemCandidates(text, args.caseId)),
      );
    } catch (e) {
      return done(REASONS.UNVERIFIABLE, {
        detail: `the ${kind} could not be parsed: ${e.message}`,
      });
    }
  }

  if (candidates.length === 0) {
    return done(REASONS.NO_MATCH, {
      detail: `no record names ${args.caseId}`,
    });
  }
  const refusals = [];
  for (const c of candidates) {
    const j = judge(c, args.approvers);
    if (j.ok) {
      return done(REASONS.MATCHED, {
        owner: j.owner,
        date: j.date,
        task: j.task,
        source: c.source,
        rendered: `deferred (owner ${j.owner}, ${j.date}, ${j.task})`,
        candidates: candidates.length,
        detail: `${args.caseId} is deferred to ${j.task} (${c.source})`,
      });
    }
    refusals.push(`${c.source}: ${j.why}`);
  }
  return done(REASONS.UNAPPROVED, {
    candidates: candidates.length,
    detail: refusals.join("; "),
  });
}

function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    return { exitCode: 2, stdout: "", stderr: `${e.message}\n${USAGE}\n` };
  }
  let res;
  try {
    res = decide(args);
  } catch (e) {
    res = {
      reason: REASONS.UNVERIFIABLE,
      case: args.caseId,
      owner: "",
      date: "",
      task: "",
      source: "",
      rendered: "",
      candidates: 0,
      detail: `unexpected failure: ${e.message}`,
    };
  }
  const exitCode = res.reason === REASONS.MATCHED ? 0 : 1;
  const stdout = args.json
    ? `${JSON.stringify(res)}\n`
    : `${res.case}: ${res.reason} — ${res.detail}\n`;
  return { exitCode, stdout, stderr: "" };
}

if (require.main === module) {
  const { exitCode, stdout, stderr } = main(process.argv.slice(2));
  if (stderr) process.stderr.write(stderr);
  process.exitCode = exitCode;
  process.stdout.write(stdout);
}

module.exports = {
  REASONS,
  USAGE,
  parseArgs,
  namesCase,
  judge,
  gateCandidates,
  workItemCandidates,
  deferredWorkItems,
  decide,
  main,
};
