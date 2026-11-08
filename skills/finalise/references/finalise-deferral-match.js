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
 *   1. the record's `case` equals the case id exactly,
 *   2. it names a follow-up task (`task.N`),
 *   3. it names an approver, and that approver equals, exactly, one the caller passed with
 *      `--approver` (the repository owner, read by the caller from `finalise.deferralApprover` in
 *      skills-config.yaml — this engine reads no configuration itself),
 *   4. it carries an approval date (YYYY-MM-DD, a real date, not in the future).
 * Anything less is not a deferral and the case stays a FAIL. With no `--approver`, nothing matches.
 *
 * THE RECORD IS A JSON FILE, read with JSON.parse (task 271, QA gates 4-16). The earlier readers —
 * a Deferred Work section of Markdown, then a QA gate's YAML read by a hand-rolled subset parser —
 * each had a long list of spellings the reader and a real reader disagreed on, and every gate found
 * another. JSON has one grammar and one parser, so there is no spelling to miss:
 *
 *   { "deferrals": [ { "case": "oc10-x", "deferred_to": "task.240",
 *                      "approved_by": "Pat Owner", "approved_on": "2026-10-28" } ] }
 *
 * and nothing else. The file is refused (`unverifiable`) when it is not valid JSON, when a key
 * repeats in any object (JSON.parse keeps the last, other readers the first), when the root holds
 * anything but `deferrals`, when an entry holds a key other than those four or a value that is not a
 * string, or when it does not parse to that shape at all. Within a valid file:
 *   - every entry whose `case` equals the id is a record, and all must approve and agree on the task;
 *   - an entry for another case that names this id in any value blocks (a reference to it is a
 *     record about it with no facts), so a longer id is another case but a stray mention is not
 *     silently ignored;
 *   - to WITHDRAW a deferral, remove or edit its entry: the file is the only record that is read.
 * A work item's prose and the QA gate are not read.
 *
 * FAILS CLOSED. Exit 0 means exactly one thing: `matched`. Every other answer exits 1 (a usage error
 * exits 2), so a shell `if` cannot round a "no" up to a deferral. `--gate` and `--work-item`, the
 * retired sources, are refused (exit 2): a caller still passing one learns the contract changed.
 *
 * Usage:
 *   finalise-deferral-match.js --case <id> --record <deferrals.json>
 *                              --approver <name> [--approver <name> ...] [--json]
 *
 * `--json` prints { reason, case, owner, date, task, source, rendered, candidates, detail } and
 * nothing else on stdout. `rendered` is the DoD line, `deferred (owner <name>, <date>, <task>)`.
 *
 * Reasons: matched | no-match (no record names the case) | unapproved (a record names the case but
 * lacks a task, a valid date, or an approver on the list) | no-approver-configured | unverifiable
 * (the record could not be read or is not the accepted shape).
 *
 * Depends on nothing but node's fs.
 */

"use strict";

const fs = require("fs");

const USAGE =
  "usage: finalise-deferral-match.js --case <id> --record <deferrals.json> --approver <name> [--approver <name> ...] [--json]";

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
const ENTRY_KEYS = ["case", "deferred_to", "approved_by", "approved_on"];

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
  const out = { caseId: "", record: "", approvers: [], json: false };
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
    else if (a === "--record") out.record = need(i++, a);
    else if (a === "--approver") out.approvers.push(need(i++, a));
    else throw new UsageError(`unknown argument "${a}"`);
  }
  if (!CASE_ID_RE.test(out.caseId)) {
    throw new UsageError(
      "--case is required and must be an id of letters, digits, '.', '_' or '-'",
    );
  }
  if (!out.record) {
    throw new UsageError("--record is required");
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
 * The owner list is configuration, so a name there is trimmed and one matching wrapper pair of
 * backticks or quotes is removed (`Name` and "Name" compare equal). The RECORD's name is never
 * cleaned: it is compared exactly, so the file cannot approve itself with a decorated name.
 */
function cleanName(s) {
  const t = String(s == null ? "" : s).trim();
  const m = /^([`'"])(.*)\1$/s.exec(t);
  return m ? m[2].trim() : t;
}

// Exact: no case folding and no Unicode folding, so "PAT OWNER" and a Kelvin-sign lookalike are not
// the owner (T271-QA-10).
function approverListed(name, approvers) {
  const n = String(name == null ? "" : name);
  return n !== "" && approvers.some((a) => cleanName(a) === n);
}

/**
 * Judge one candidate record. Returns { ok, owner, date, task } or { ok: false, why }.
 * `task` / `owner` / `date` may be absent on a candidate; absence is `unapproved`, never a match.
 */
function judge({ task, owner, date }, approvers) {
  if (!TASK_RE.test(String(task || ""))) {
    return { ok: false, why: "no follow-up task named (task.N)" };
  }
  if (!isRealPastDate(String(date || ""))) {
    return {
      ok: false,
      why: "no approval date (a real YYYY-MM-DD, not in the future)",
    };
  }
  if (String(owner || "") === "")
    return { ok: false, why: "no approver named" };
  if (!approverListed(owner, approvers)) {
    return {
      ok: false,
      why: `approver "${String(owner)}" is not on the owner list`,
    };
  }
  return {
    ok: true,
    owner: String(owner),
    date: String(date),
    task: String(task),
  };
}

/**
 * The first key that repeats within one object of a JSON text, or null. JSON.parse keeps the last of
 * a repeated key and other readers keep the first, so a file that repeats one is ambiguous. The text
 * is already known to be valid JSON, so this is a tokenizer, not a validator.
 */
function findDuplicateKey(text) {
  const stack = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      let k = j + 1;
      while (/\s/.test(text[k] || "")) k += 1;
      const top = stack[stack.length - 1];
      if (top && top.keys && text[k] === ":") {
        const key = JSON.parse(text.slice(i, j + 1));
        if (top.keys.has(key)) return key;
        top.keys.add(key);
      }
      i = j + 1;
      continue;
    }
    if (c === "{") stack.push({ keys: new Set() });
    else if (c === "[") stack.push({ keys: null });
    else if (c === "}" || c === "]") stack.pop();
    i += 1;
  }
  return null;
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

/** Candidates from the deferral record; throws on a file that is not the accepted shape. */
function recordCandidates(text, id) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    throw new Error(`not valid JSON (${e.message})`);
  }
  const dup = findDuplicateKey(text);
  if (dup !== null) throw new Error(`the key "${dup}" repeats in one object`);
  const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isObj(doc)) throw new Error("the root is not an object");
  const rootKeys = Object.keys(doc);
  if (rootKeys.length !== 1 || rootKeys[0] !== "deferrals") {
    throw new Error('the root must hold exactly one key, "deferrals"');
  }
  if (!Array.isArray(doc.deferrals)) {
    throw new Error('"deferrals" is not a list');
  }
  const out = [];
  doc.deferrals.forEach((e, i) => {
    if (!isObj(e)) throw new Error(`deferrals[${i}] is not an object`);
    for (const [k, v] of Object.entries(e)) {
      if (!ENTRY_KEYS.includes(k)) {
        throw new Error(`deferrals[${i}] holds the unknown field "${k}"`);
      }
      if (typeof v !== "string") {
        throw new Error(`deferrals[${i}].${k} is not a string`);
      }
    }
    const source = `record deferrals[${i}]`;
    if (e.case === id) {
      out.push({
        source,
        task: e.deferred_to,
        owner: e.approved_by,
        date: e.approved_on,
      });
    } else if (Object.values(e).some((v) => countMentions(v, id) > 0)) {
      // Another case's entry that names this id: a record about it with no facts, so it blocks.
      out.push({ source, task: "", owner: "", date: "" });
    }
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

  let text;
  try {
    text = readText(args.record);
  } catch (e) {
    return done(REASONS.UNVERIFIABLE, {
      detail: `the record could not be read: ${e.code || e.message}`,
    });
  }
  let candidates;
  try {
    candidates = recordCandidates(text, args.caseId);
  } catch (e) {
    return done(REASONS.UNVERIFIABLE, {
      detail: `the record is not the accepted shape: ${e.message}`,
    });
  }

  if (candidates.length === 0) {
    return done(REASONS.NO_MATCH, {
      detail: `no record names ${args.caseId}`,
    });
  }
  // EVERY record that names the case must be a valid owner approval, and they must agree on the
  // follow-up task. One that is not (a stray mention, a different task) blocks (T271-QA-12).
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
  recordCandidates,
  findDuplicateKey,
  decide,
  main,
};
