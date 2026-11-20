#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/finalise-record-preflight.js. Regenerate via `npm run bundle`.
/**
 * finalise-record-preflight — find every success criterion that demands a record, and say
 * whether a committed place exists for it, before `/finalise` dispatches the DoD agents
 * (task 259, from task 257 criterion 14).
 *
 * The AC agent grades a record criterion against COMMITTED artifacts. The implementation
 * report is committed only after `/finalise` finishes, so a record that lives only there
 * fails the criterion, and the run pays for a whole DoD pass to learn what a file listing
 * would have shown.
 *
 * One command:
 *
 *   check --doc <work item file> [--cwd <dir>] [--json]
 *
 * It reads the document's criteria section and two listings of the work item's directory
 * (`git ls-files`, `git status`), and prints for each record criterion
 * `{ criterion, location, state, artifacts }`.
 *
 * States:
 *   ok                          a committed artifact of the named kind exists
 *   no-location                 the criterion names no place for its record
 *   implementation-report-only  the only place named is the implementation report
 *   location-uncommitted        a named artifact exists but is modified or untracked
 *   location-absent             a named artifact does not exist yet
 *
 * `ok` means a committed place EXISTS. It does not mean the record is IN it: whether the
 * named file holds the evidence stays with a reader (Step 3a's confirm step, then the AC
 * agent). Task 257's criterion 14 named the QA report, a committed QA report existed, and
 * the record was missing from it; the engine reads that as `ok` by design.
 *
 * Peer of `finalise-rerun-scope.js`: `--json` prints a `reason`. `findings` is advisory and
 * exits 0 (a gate at authoring pushes an author toward filler); `scan-broken` exits 1; a
 * usage error exits 2. Read `reason`, never the exit code alone.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { readCriteriaEntries } = require("./criteria-section.js");

// The words that make a criterion demand a record. `review-task` Step 3 check 22 states the
// same set in prose; `tests/finalise-record-preflight.test.mjs` holds the two together.
const RECORD_WORDS = Object.freeze([
  "recorded",
  "logged",
  "listed in",
  "documented",
]);

// Check 22's second trigger: "a numeric bound graded by a measurement".
const NUMERIC_BOUND =
  /(?:\b(?:under|within|below|above|over|at most|at least|no more than|no fewer than|fewer than|less than|more than)\s+\d|[<>]=?\s*\d|≤\s*\d|≥\s*\d)/i;

const STATES = Object.freeze([
  "ok",
  "no-location",
  "implementation-report-only",
  "location-uncommitted",
  "location-absent",
]);

const REASONS = Object.freeze([
  "ok",
  "findings",
  "empty",
  "scan-broken",
  "usage",
]);

// Where a criterion may say its record lives, and which files in the work item's directory
// are that place. Order is the order a state is reported in when several are named.
const LOCATIONS = Object.freeze([
  {
    key: "qa-report",
    mention: /\bQA reports?\b/i,
    file: /\.qa\.\d+\..*\.md$/,
  },
  {
    key: "gate",
    mention: /\bgate (?:file|record)s?\b|\bthe (?:QA )?gate\b/i,
    file: /\.gate\.\d+\..*\.ya?ml$/,
  },
  {
    // finalise writes the DoD itself and commits it with the acceptance, so a criterion
    // naming it has a place by construction.
    key: "dod",
    mention: /\bDoD\b|\bdefinition of done\b/i,
    file: null,
  },
]);
const IMPLEMENTATION_REPORT = /\bimplementation reports?\b/i;

/** True when a criterion's text demands a record or a measurement. */
function isRecordCriterion(text) {
  const t = String(text ?? "");
  const lower = t.toLowerCase();
  return (
    RECORD_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(lower)) ||
    NUMERIC_BOUND.test(t)
  );
}

function basename(p) {
  return p.slice(p.lastIndexOf("/") + 1);
}

/**
 * Classify the criteria. `tracked` is the work item's directory as git tracks it, `changed`
 * is every path there that is modified, staged or untracked. Both are repository-relative.
 */
function classify(criteria, { tracked = [], changed = [] } = {}) {
  const changedSet = new Set(changed);
  const present = [...new Set([...tracked, ...changed])];
  const listed = [];
  (criteria || []).forEach((text, i) => {
    if (!isRecordCriterion(text)) return;
    const named = LOCATIONS.filter((l) => l.mention.test(text));
    const entry = {
      index: i + 1,
      criterion: text,
      locations: named.map((l) => l.key),
    };
    if (named.length === 0) {
      const impl = IMPLEMENTATION_REPORT.test(text);
      listed.push({
        ...entry,
        location: impl ? "implementation-report" : "none",
        state: impl ? "implementation-report-only" : "no-location",
        artifacts: [],
      });
      return;
    }
    let state = "ok";
    const artifacts = [];
    for (const loc of named) {
      if (loc.file === null) continue;
      const files = present.filter((p) => loc.file.test(basename(p)));
      const committed = files.filter(
        (p) => tracked.includes(p) && !changedSet.has(p),
      );
      const dirty = files.filter((p) => changedSet.has(p));
      artifacts.push(...committed);
      if (files.length === 0) {
        if (state === "ok") state = "location-absent";
      } else if (dirty.length > 0) {
        state = "location-uncommitted";
      } else if (committed.length === 0 && state === "ok") {
        state = "location-absent";
      }
    }
    listed.push({
      ...entry,
      location: named[0].key,
      state,
      artifacts: [...new Set(artifacts)],
    });
  });
  return listed;
}

/** The `check` answer for a list of criteria and the two listings. */
function check(criteria, listings) {
  if (!Array.isArray(criteria) || criteria.length === 0) {
    return {
      reason: "empty",
      listed: [],
      message: "the criteria section holds no criteria",
    };
  }
  const listed = classify(criteria, listings);
  const open = listed.filter((e) => e.state !== "ok");
  return {
    reason: open.length > 0 ? "findings" : "ok",
    listed,
    message:
      listed.length === 0
        ? "no criterion demands a record"
        : `${listed.length} record criteri${listed.length === 1 ? "on" : "a"}, ${open.length} need${open.length === 1 ? "s" : ""} action`,
  };
}

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** The work item's directory as git sees it: `{ tracked, changed }`. Throws when git fails. */
function readListings(cwd, dir) {
  const tracked = git(cwd, ["ls-files", "--", dir]).split("\n").filter(Boolean);
  const changed = git(cwd, ["status", "--porcelain", "-uall", "--", dir])
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(3))
    .map((p) => (p.includes(" -> ") ? p.split(" -> ")[1] : p))
    .map((p) => p.replace(/^"|"$/g, ""));
  return { tracked, changed };
}

function criteriaTexts(body) {
  const entries = readCriteriaEntries(body);
  if (entries === null) return null;
  return entries.map((e) =>
    [e.line, ...e.continuation].filter(Boolean).join(" "),
  );
}

const USAGE =
  "usage: finalise-record-preflight.js check --doc <file> [--cwd <dir>] [--json]";

function emit(json, payload) {
  if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  else {
    const lines = [`${payload.reason}: ${payload.message || ""}`];
    for (const e of payload.listed || []) {
      if (e.state !== "ok")
        lines.push(`  #${e.index} [${e.state}] ${e.criterion}`);
      else
        lines.push(
          `  #${e.index} [ok] ${e.criterion}  -> ${e.artifacts.join(", ") || e.location}`,
        );
    }
    process.stdout.write(lines.join("\n") + "\n");
  }
  process.exitCode = payload.exitCode;
}

function main(argv) {
  const opts = { cmd: argv[0], json: false };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--doc" || a === "--cwd") opts[a.slice(2)] = argv[++i];
    else opts.error = `unknown argument: ${a}`;
  }
  const fail = (message) =>
    emit(opts.json, {
      reason: "usage",
      exitCode: 2,
      message: `${message}\n${USAGE}`,
    });
  if (opts.cmd !== "check") return fail(`unknown command: ${opts.cmd}`);
  if (opts.error) return fail(opts.error);
  if (!opts.doc) return fail("check needs --doc");
  const cwd = path.resolve(opts.cwd || process.cwd());
  const docAbs = path.resolve(cwd, opts.doc);
  let body;
  try {
    body = fs.readFileSync(docAbs, "utf8");
  } catch {
    return emit(opts.json, {
      reason: "scan-broken",
      exitCode: 1,
      listed: [],
      message: `cannot read ${opts.doc}`,
    });
  }
  const docRel = path.relative(cwd, docAbs).split(path.sep).join("/");
  const dir = path.posix.dirname(docRel);
  let listings;
  try {
    listings = readListings(cwd, dir);
  } catch (err) {
    return emit(opts.json, {
      reason: "scan-broken",
      exitCode: 1,
      listed: [],
      message: `git could not list ${dir}: ${String(err.message).split("\n")[0]}`,
    });
  }
  // The instrument sees the document it was handed, or it is not seeing the directory.
  if (
    !listings.tracked.includes(docRel) &&
    !listings.changed.includes(docRel)
  ) {
    return emit(opts.json, {
      reason: "scan-broken",
      exitCode: 1,
      listed: [],
      message: `neither git listing of ${dir} contains ${docRel}; the directory scan is not reading the work item`,
    });
  }
  const criteria = criteriaTexts(body);
  if (criteria === null) {
    return emit(opts.json, {
      reason: "scan-broken",
      exitCode: 1,
      listed: [],
      message: "the document has no criteria section the reader can find",
    });
  }
  const result = check(criteria, listings);
  return emit(opts.json, { ...result, exitCode: 0 });
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(
      `finalise-record-preflight: ${err && err.stack ? err.stack : err}\n`,
    );
    process.exitCode = 2;
  }
}

module.exports = {
  RECORD_WORDS,
  NUMERIC_BOUND,
  STATES,
  REASONS,
  LOCATIONS,
  isRecordCriterion,
  classify,
  check,
  readListings,
  criteriaTexts,
  main,
};
