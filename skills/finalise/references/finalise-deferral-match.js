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
 *   4. it carries an approval date (YYYY-MM-DD, a real date, not in the future).
 * Anything less is not a deferral and the case stays a FAIL. With no `--approver`, nothing matches.
 *
 * ONE record shape is read: the QA gate's `recommendations.future[]` entry that carries
 * `case: <id>` (matched by equality), `deferred_to: task.N`, `approved_by: <name>` and
 * `approved_on: YYYY-MM-DD`. The gate is structured data, so there is no spelling of "the record"
 * to guess at. A work item's prose is NOT read (task 271, QA gates 4-12): the set of Markdown
 * spellings that render as one section is open-ended, and every gate found another.
 *
 * To WITHDRAW a deferral, remove or edit its gate entry: the entry is the only record that is read.
 * Anything else in the gate that names the case id and is not that entry blocks, so a stray
 * mention can never be mistaken for an approval:
 *   - every `future[]` entry that names the id in ANY key or value is a candidate, and only the
 *     entry whose `case:` equals the id carries facts; every candidate must approve and agree on
 *     the follow-up task, so a second entry with another task or a missing fact blocks;
 *   - the approving entry may name the id only in its `case:` and `action:` (a note blocks);
 *   - an `immediate[]` entry, any other key under `recommendations`, and a root key that is not a
 *     prose field of the gate schema (GATE_PROSE_KEYS) that names the id block. The prose fields
 *     (top_issues, status_reason...) may cite the id: a finding legitimately does;
 *   - the subset YAML parser drops text it cannot read, so the WHOLE gate is reconciled: every
 *     occurrence of the id in the raw text must also occur in a key or value the parser took.
 *     An occurrence it did not take (a block-scalar body, a comment) blocks.
 *   The approver name is compared to the owner list exactly (no case or Unicode folding).
 *
 * FAILS CLOSED. Exit 0 means exactly one thing: `matched`. Every other answer exits 1 (a usage error
 * exits 2), so a shell `if` cannot round a "no" up to a deferral. `--work-item` is refused (exit 2):
 * a caller still passing it learns the contract changed instead of being silently ignored.
 *
 * Usage:
 *   finalise-deferral-match.js --case <id> --gate <gate.yml>
 *                              --approver <name> [--approver <name> ...] [--json]
 *
 * `--json` prints { reason, case, owner, date, task, source, rendered, candidates, detail } and
 * nothing else on stdout. `rendered` is the DoD line, `deferred (owner <name>, <date>, <task>)`.
 *
 * Reasons: matched | no-match (no record names the case) | unapproved (a record names the case but
 * lacks a task, a valid date, or an approver on the list) | no-approver-configured | unverifiable
 * (the gate could not be read or parsed).
 *
 * Depends on yaml-subset.js and nothing else.
 */

"use strict";

const fs = require("fs");

const { parseYamlSubset } = require("./yaml-subset.js");

const USAGE =
  "usage: finalise-deferral-match.js --case <id> --gate <gate.yml> --approver <name> [--approver <name> ...] [--json]";

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
  const out = { caseId: "", gate: "", approvers: [], json: false };
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
    else if (a === "--approver") out.approvers.push(need(i++, a));
    else throw new UsageError(`unknown argument "${a}"`);
  }
  if (!CASE_ID_RE.test(out.caseId)) {
    throw new UsageError(
      "--case is required and must be an id of letters, digits, '.', '_' or '-'",
    );
  }
  if (!out.gate) {
    throw new UsageError("--gate is required");
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

/**
 * Trim, and remove ONE matching wrapper pair (backticks or quotes), so `Name` and "Name" compare
 * equal. Nothing else is stripped: `sam_` and `sam*` are not `sam` (T271-QA-14).
 */
function cleanName(s) {
  const t = String(s == null ? "" : s).trim();
  const m = /^([`'"])(.*)\1$/s.exec(t);
  return m ? m[2].trim() : t;
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

/** Root keys of a gate whose prose may cite a case id without being a record about it. */
const GATE_PROSE_KEYS = new Set([
  "top_issues",
  "status_reason",
  "nfr_validation",
  "deployment_readiness",
  "evidence",
  "criteria_drift",
  "waiver",
]);

/** Candidates from the gate's recommendations.future[]; throws on an unreadable gate. */
function gateCandidates(text, id) {
  // A repeated key is ambiguous (readers disagree on which value wins), so it makes the gate
  // unverifiable rather than guessing (T271-QA-28).
  // Everything under `recommendations` (where the facts live) must be read completely: a row the
  // parser would drop there (a `? key`, an odd indent) could carry a second, overriding key
  // (T271-QA-30). Prose elsewhere in a real gate legitimately continues over lines it cannot read.
  const doc = parseYamlSubset(text, {
    rejectDuplicateKeys: true,
    strictUnder: ["recommendations"],
  });
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error("the gate did not parse as a mapping");
  }
  const rec = doc.recommendations;
  const future = rec && typeof rec === "object" ? rec.future : undefined;
  if (future !== undefined && future !== null && !Array.isArray(future))
    throw new Error("recommendations.future is not a list");
  const out = [];
  const blocker = (source) =>
    out.push({ source, task: "", owner: "", date: "" });
  (future || []).forEach((e, i) => {
    const f = e && typeof e === "object" && !Array.isArray(e) ? e : {};
    // A record carries the case in its own `case:` field, matched by equality. An entry that merely
    // MENTIONS the id anywhere - in `action`, in a note, in any key or value - is still a record about
    // the case (it can block) but it has no facts, so it can never approve one (T271-QA-12, QA-22).
    const own = typeof f.case === "string" && f.case.trim() === id;
    const mentions = countParsedMentions(e, id) > 0;
    if (!own && !mentions) return;
    out.push({
      source: `gate recommendations.future[${i}]`,
      task: own ? f.deferred_to : "",
      owner: own && typeof f.approved_by === "string" ? f.approved_by : "",
      date: own ? f.approved_on : "",
    });
    // The approving entry may name the id only in `case:` and `action:`; a note blocks.
    if (own) {
      const stray = Object.entries(f)
        .filter(([k]) => k !== "case" && k !== "action")
        .reduce(
          (n, [k, v]) => n + countMentions(k, id) + countParsedMentions(v, id),
          0,
        );
      if (stray > 0)
        blocker(`gate recommendations.future[${i}] (a note names the case)`);
    }
  });
  // Records are not only future[] entries (T271-QA-25): a mention in an `immediate[]` entry, in any
  // other key under `recommendations`, or in a root key that is not a prose field of the gate schema.
  const recObj = rec && typeof rec === "object" ? rec : {};
  (Array.isArray(recObj.immediate) ? recObj.immediate : []).forEach((e, i) => {
    if (countParsedMentions(e, id) > 0)
      blocker(`gate recommendations.immediate[${i}]`);
  });
  for (const [k, v] of Object.entries(recObj)) {
    if (k !== "future" && k !== "immediate" && countParsedMentions(v, id) > 0)
      blocker(`gate recommendations.${k}`);
  }
  for (const [k, v] of Object.entries(doc)) {
    if (
      !GATE_PROSE_KEYS.has(k) &&
      k !== "recommendations" &&
      countMentions(k, id) + countParsedMentions(v, id) > 0
    )
      blocker(`gate ${k}`);
  }
  // The subset parser silently drops text it cannot read (a block scalar `action: >-`, a row deeper
  // than its map), and any line shape used to find that text can be defeated (T271-QA-13, 15, 16).
  // So no shape is used. The WHOLE gate is the reference: every occurrence of the case id in its
  // text must also occur in a value or key the parser actually read. Nothing is stripped, comments
  // included: a `#` line inside a block scalar is TEXT to YAML (T271-QA-17).
  const raw = countMentions(String(text), id);
  if (raw > countParsedMentions(doc, id)) {
    blocker("gate (text the reader could not parse names the case)");
  }
  return out;
}

/** Occurrences of `id` as a whole token (not inside a longer id). */
function countMentions(s, id) {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    String(s).match(
      new RegExp(
        `(?<![A-Za-z0-9._-])${esc}(?![A-Za-z0-9_-]|\\.[A-Za-z0-9_-])`,
        "g",
      ),
    ) || []
  ).length;
}

/** Occurrences of `id` in every key and string value of a parsed document. */
function countParsedMentions(node, id) {
  if (typeof node === "string") return countMentions(node, id);
  if (Array.isArray(node))
    return node.reduce((n, v) => n + countParsedMentions(v, id), 0);
  if (node && typeof node === "object")
    return Object.entries(node).reduce(
      (n, [k, v]) => n + countMentions(k, id) + countParsedMentions(v, id),
      0,
    );
  return 0;
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

  let text;
  try {
    text = readText(args.gate);
  } catch (e) {
    return done(REASONS.UNVERIFIABLE, {
      detail: `the gate could not be read: ${e.code || e.message}`,
    });
  }
  let candidates;
  try {
    candidates = gateCandidates(text, args.caseId);
  } catch (e) {
    return done(REASONS.UNVERIFIABLE, {
      detail: `the gate could not be parsed: ${e.message}`,
    });
  }

  if (candidates.length === 0) {
    return done(REASONS.NO_MATCH, {
      detail: `no record names ${args.caseId}`,
    });
  }
  // EVERY record that names the case must be a valid owner approval, and they must agree on the
  // follow-up task. One that is not (a prose mention, a different task) blocks (T271-QA-12).
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
  decide,
  main,
};
