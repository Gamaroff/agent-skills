#!/usr/bin/env node
// repeat-subject.mjs — trigger (b) of qa-fix's structural-move offer, as a rule (task.297, obs #162).
//
// The offer used to fire on "a repeat subject" that was the author's judgement, so on task.295 the
// same mechanism drew a finding at gates 3, 4 and 5 and the structural move came only at the third.
// A rule a person applies is not a rule a test can hold. This script is the rule.
//
// A subject is a finding's `file:` field. A repeat subject is a file that
//   1. an open finding in the CURRENT gate names,
//   2. a finding in the PREVIOUS gate also named, and
//   3. the fix between the two gates changed.
// Condition 3 is what keeps the offer from firing on a file the fix never touched: two gates that
// both name a file nobody edited are one unfixed finding, not a fix that opened the next edge.
//
// Library: `repeatSubjects({ current, previous, changed })` and `gateFiles(text, { openOnly })`.
// CLI (runs only when this file is executed directly):
//   repeat-subject.mjs --current <gate.yml> --previous <gate.yml> (--changed <path>... | --fix-commit <sha>)
// Prints one JSON line {"reason":"ok","subjects":[...]} and exits 0 whether or not there are any
// subjects — an empty list is the answer "do not offer", not a failure. Exit 2 is a usage error and
// 1 is an unreadable input; neither prints a subject list, so a broken reader cannot pass for a quiet
// one (an empty result is a claim about the instrument).

import { readFileSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLOSED = new Set(["resolved", "fixed", "closed", "waived", "deferred"]);

function unquote(value) {
  let v = value.trim();
  if (
    v.length >= 2 &&
    ((v[0] === "'" && v.at(-1) === "'") || (v[0] === '"' && v.at(-1) === '"'))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

function normalise(p) {
  return p.replace(/^\.\//, "");
}

/**
 * The `file:` values of a gate's `top_issues[]` entries. With `openOnly`, an entry whose `status:` is
 * resolved, fixed, closed, waived or deferred is skipped (an absent status is open). Reads the block
 * from `top_issues:` to the next top-level key; entries start at a `- ` item.
 */
export function gateFiles(text, { openOnly = false } = {}) {
  const lines = String(text).split("\n");
  const start = lines.findIndex((l) => /^top_issues:\s*$/.test(l));
  if (start === -1) return [];
  const entries = [];
  let cur = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // next top-level key ends the block
    if (/^\s*-\s/.test(line)) {
      cur = { file: null, status: null };
      entries.push(cur);
    }
    if (!cur) continue;
    const f = line.match(/^\s*(?:-\s+)?file:\s*(.+?)\s*$/);
    if (f && cur.file === null) cur.file = normalise(unquote(f[1]));
    const s = line.match(/^\s*(?:-\s+)?status:\s*(.+?)\s*$/);
    if (s && cur.status === null) cur.status = unquote(s[1]).toLowerCase();
  }
  return [
    ...new Set(
      entries
        .filter((e) => e.file)
        .filter((e) => !openOnly || !CLOSED.has(e.status ?? "open"))
        .map((e) => e.file),
    ),
  ];
}

/** The repeat subjects, in the current gate's order. */
export function repeatSubjects({ current, previous, changed }) {
  const prev = new Set(gateFiles(previous));
  const edited = new Set((changed ?? []).map(normalise));
  return gateFiles(current, { openOnly: true }).filter(
    (f) => prev.has(f) && edited.has(f),
  );
}

// A refusal is thrown and turned into an exit code at the one place that runs the CLI: the script
// sets process.exitCode and returns, never process.exit() after a write, which truncates a piped
// write at ~64KB (bug.3.stdout-truncation-on-exit; held by stdout-drain-on-exit.test.mjs).
class CliError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) {
  throw new CliError(code, message);
}

function cli(argv) {
  let currentPath = "";
  let previousPath = "";
  let commit = "";
  const changed = [];
  let haveChanged = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) fail(2, `${a} needs a value`);
      return argv[++i];
    };
    if (a === "--current") currentPath = next();
    else if (a === "--previous") previousPath = next();
    else if (a === "--fix-commit") commit = next();
    else if (a === "--changed") {
      haveChanged = true;
      changed.push(next());
    } else fail(2, `unknown argument: ${a}`);
  }
  if (!currentPath || !previousPath)
    fail(2, "--current and --previous are required");
  if (haveChanged === Boolean(commit)) {
    fail(2, "give exactly one of --changed <path>... or --fix-commit <sha>");
  }
  let files = changed;
  if (commit) {
    const r = spawnSync(
      "git",
      ["diff-tree", "--no-commit-id", "--name-only", "-r", commit],
      { encoding: "utf8" },
    );
    if (r.status !== 0)
      fail(1, `could not list the files of ${commit}: ${r.stderr.trim()}`);
    files = r.stdout.split("\n").filter(Boolean);
  }
  let current;
  let previous;
  try {
    current = readFileSync(currentPath, "utf8");
    previous = readFileSync(previousPath, "utf8");
  } catch (e) {
    fail(1, `unreadable gate: ${e.message}`);
  }
  // A gate with no parsable top_issues is not "no findings": say so rather than answer an empty list.
  if (!/^top_issues:/m.test(current) || !/^top_issues:/m.test(previous)) {
    fail(1, "a gate has no top_issues block — cannot decide a repeat subject");
  }
  const subjects = repeatSubjects({ current, previous, changed: files });
  process.stdout.write(`${JSON.stringify({ reason: "ok", subjects })}\n`);
}

const isMain = (() => {
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
})();
if (isMain) {
  try {
    cli(process.argv.slice(2));
  } catch (e) {
    if (!(e instanceof CliError)) throw e;
    process.stderr.write(`repeat-subject: ${e.message}\n`);
    process.exitCode = e.code;
  }
}
