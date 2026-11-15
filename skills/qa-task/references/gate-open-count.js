#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/gate-open-count.js. Regenerate via `npm run bundle`.
"use strict";

/**
 * gate-open-count.js <gate.yml> — print how many entries of a QA gate's
 * `top_issues:` block are still open (task 275, obs #84).
 *
 * WHY THIS IS NOT `grep -c '^  - id:'`. That counts every entry the block
 * holds, closed ones included. Task 213's gate 2 is the case the count was
 * written for, and both of its entries read `status: closed`: the grep returns
 * 2 where the number of open points is 0. The count also has to stop at the
 * block's end, so a `recommendations:` list below it is never counted.
 *
 * OPEN means the entry's own `status:` is absent, or is anything other than
 * `resolved`, `fixed`, `closed`, `waived` or `deferred` — the definition the
 * develop-next merge gate already uses for the same list. An unfamiliar status
 * word therefore counts as open: the lead this feeds must never claim "no
 * problems" because a word was not recognised.
 *
 * It refuses rather than guesses. A gate with no `top_issues:` key, or a
 * non-empty flow-style list this scanner does not read, exits 1 with nothing on
 * stdout — a caller that read "no output" as a zero would render the bare
 * "no problems" sentence on a gate it could not read. A count of 0 is printed
 * as `0`, and only for a block it actually read.
 *
 * Exit codes: 0 = a count was printed, 1 = the gate could not be read,
 * 2 = a usage error. PURE in `countOpenTopIssues`: no I/O, no process.exit.
 */

const CLOSED_STATUSES = Object.freeze([
  "resolved",
  "fixed",
  "closed",
  "waived",
  "deferred",
]);

/** Value of a `key: value` tail, without a trailing comment or surrounding quotes. */
function scalar(tail) {
  let v = tail.trim();
  const quoted = /^(['"])(.*)\1/.exec(v);
  if (quoted) return quoted[2].trim();
  v = v.replace(/\s+#.*$/, "").trim();
  return v;
}

/**
 * Count the open entries of the `top_issues:` block in a gate's text.
 * Returns an integer, or throws an Error whose message names what was not read.
 */
function countOpenTopIssues(text) {
  if (typeof text !== "string") throw new Error("gate text is not a string");
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => /^top_issues:/.test(l));
  if (at === -1) throw new Error("no top_issues: key in the gate");

  const tail = scalar(lines[at].slice("top_issues:".length));
  if (tail === "[]") return 0;
  if (tail !== "") {
    throw new Error(
      `top_issues: is a non-empty inline value (${tail}); only a block list or [] is read`,
    );
  }

  let open = 0;
  let dashIndent = -1;
  let entryStatus = null; // null = no entry yet
  const close = () => {
    if (entryStatus === null) return;
    if (!CLOSED_STATUSES.includes(entryStatus.toLowerCase())) open += 1;
  };

  for (let i = at + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;
    // A non-indented line that is not a list dash ends the block.
    if (/^\S/.test(line) && !line.startsWith("-")) break;

    const indent = line.length - line.trimStart().length;
    const dash = /^(\s*)-(\s+|$)/.exec(line);
    if (dash && (dashIndent === -1 || indent === dashIndent)) {
      if (dashIndent === -1) dashIndent = indent;
      close();
      entryStatus = "open";
      const first = /^\s*-\s+status:\s*(.*)$/.exec(line);
      if (first) entryStatus = scalar(first[1]) || "open";
      continue;
    }
    if (entryStatus === null) continue;
    // An entry's own keys sit one level inside its dash; deeper keys belong to
    // a nested map and are not the entry's status.
    if (indent === dashIndent + 2) {
      const own = /^\s*status:\s*(.*)$/.exec(line);
      if (own) entryStatus = scalar(own[1]) || "open";
    }
  }
  close();
  return open;
}

function main(argv) {
  const fs = require("fs");
  const args = argv.slice(2);
  if (args.length !== 1 || args[0].startsWith("-")) {
    process.stderr.write("usage: gate-open-count.js <gate.yml>\n");
    return 2;
  }
  let text;
  try {
    text = fs.readFileSync(args[0], "utf8");
  } catch (err) {
    process.stderr.write(
      `gate-open-count: cannot read ${args[0]}: ${err.message}\n`,
    );
    return 1;
  }
  try {
    process.stdout.write(`${countOpenTopIssues(text)}\n`);
  } catch (err) {
    process.stderr.write(`gate-open-count: ${args[0]}: ${err.message}\n`);
    return 1;
  }
  return 0;
}

module.exports = { countOpenTopIssues, CLOSED_STATUSES };

if (require.main === module) {
  process.exitCode = main(process.argv);
}
