#!/usr/bin/env node
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
 *     carries `case: <id>` (matched by equality, never by a mention in its prose),
 *     `deferred_to: task.N`, `approved_by: <name>`, `approved_on: YYYY-MM-DD`;
 *   - the work item's `## Deferred Work` section (an H2): a list item that is EXACTLY
 *     `` `case-id`: deferred to task.N, approved by <name> on YYYY-MM-DD. ``
 *     with no optional piece and no other word. A bullet inside an HTML comment is not read, and
 *     anything else that names the case is a candidate with no facts: `unapproved`.
 *   Every record that names the case must approve it, and agree on the follow-up task; one that does
 *   not (a revocation, a prose mention) blocks, so a later record can withdraw an earlier approval.
 *   The approver name is compared to the owner list exactly (no case or Unicode folding).
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

// Exact: no case folding and no Unicode folding, so "PAT OWNER" and a Kelvin-sign lookalike are not
// the owner (T271-QA-10). The owner list is configuration; a name that must match is typed as listed.
function approverListed(name, approvers) {
  const n = cleanName(name);
  return n !== "" && approvers.some((a) => cleanName(a) === n);
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
    const f = e && typeof e === "object" && !Array.isArray(e) ? e : {};
    const action = typeof e === "string" ? e : f.action;
    // A record carries the case in its own `case:` field, matched by equality. An entry that merely
    // MENTIONS the id in its prose is still a record about the case (it can block) but it has no
    // facts, so it can never approve one (T271-QA-12).
    const own = typeof f.case === "string" && f.case.trim() === id;
    if (!own && !namesCase(action, id)) return;
    out.push({
      source: `gate recommendations.future[${i}]`,
      task: own ? f.deferred_to : "",
      owner: own && typeof f.approved_by === "string" ? f.approved_by : "",
      date: own ? f.approved_on : "",
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

// ONE exact line (T271-QA-5, QA-9, QA-10, replacing three rounds of patching a prose matcher):
//   `case-id`: deferred to task.N, approved by NAME on DATE.
// There is no optional lead, no bold slot and no word list: the whole item is that sentence or it is a
// bullet with no facts, which judge() answers `unapproved`. NAME is then compared to the configured
// owners EXACTLY, so any prose that slipped into it ("Pat Owner, if Sam agrees") names nobody.
const BULLET_RE =
  /^`([^`]+)`:\s+deferred to (task\.\d+),\s+approved by (.+?) on (\d{4}-\d{2}-\d{2})\.$/;

/** The facts of a bullet in the one accepted form, or null. */
function parseBullet(item, id) {
  const m = BULLET_RE.exec(item.trim());
  if (!m || m[1] !== id) return null;
  return { task: m[2], owner: m[3], date: m[4] };
}

function workItemCandidates(text, id) {
  const out = [];
  // An HTML comment is not rendered, so a bullet inside one is not on the record (T271-QA-6).
  const visible = String(text)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!--[\s\S]*$/, "");
  deferredWorkItems(visible).forEach((item, i) => {
    if (!namesCase(item, id)) return;
    const f = parseBullet(item, id);
    out.push({
      source: `work item Deferred Work item ${i + 1}`,
      task: f ? f.task : "",
      owner: f ? f.owner : "",
      date: f ? f.date : "",
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
  // EVERY record that names the case must be a valid owner approval, and they must agree on the
  // follow-up task. One that is not (a revocation, a prose mention, a different task) blocks, so a
  // later record can withdraw an earlier approval instead of being ignored (T271-QA-12).
  const refusals = [];
  const oks = [];
  for (const c of candidates) {
    const j = judge(c, args.approvers);
    if (j.ok) oks.push({ c, j });
    else refusals.push(`${c.source}: ${j.why}`);
  }
  if (refusals.length === 0 && new Set(oks.map((x) => x.j.task)).size > 1) {
    refusals.push(
      `records disagree on the follow-up task (${[...new Set(oks.map((x) => x.j.task))].join(", ")})`,
    );
  }
  if (refusals.length === 0) {
    const { c, j } = oks[0];
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
