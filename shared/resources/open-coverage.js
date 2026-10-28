#!/usr/bin/env node
/**
 * open-coverage — how many open coverage findings a `/review-pr` report holds, or that it cannot
 * be read.
 *
 * The QA loop's Step 5c routes a `CONCERNS` verdict back to 5b when the review's
 * `## Machine-Readable Findings` block holds an open `category: coverage` finding: one without
 * `provenance: pre-existing` (task.238). Reading that block wrong is expensive in both directions.
 * A false 0 exits to Step 7, where `/finalise` fails the gap after a full DoD pass; a false
 * `unreadable` halts a clean run.
 *
 * This reader replaced an awk program that listed the line shapes it refused. A shape it did not
 * list was skipped and read as "no coverage", and each QA cycle on task.238 found one more
 * (bug.1, bug.8, bug.15 to bug.19). Here the direction is reversed: the block is parsed against the
 * shape review-pr emits, and **anything the parser cannot place is a refusal**. There is no branch
 * that skips a line it did not understand; the only lines skipped are blank ones and indented
 * comments.
 *
 * Accepted (each pinned by a case in evals/shared/tests/pr-review-loop-parity.test.mjs):
 *   - top-level keys `reviewed_gate`, `findings`, `truncated_count`, each at most once;
 *   - `findings:` followed by a block list (indented, or at column 0), or `findings: []`;
 *   - an entry `- key: value` with its other keys two columns deeper than its dash, or a one-line
 *     flow entry `- {k: v, k: v}`;
 *   - plain, 'single'- or "double"-quoted values (a block-style double-quoted value may carry
 *     escapes; a flow one may not), a trailing ` # comment`, and `>`/`|` block scalars;
 *   - under any key but `category` and `provenance`, deeper lines after an empty value or a block
 *     scalar indicator, read as text and never for a key.
 * `category` and `provenance` values compare case-blind. `category` must be one of review-pr's six
 * tokens (review-pr SKILL.md Step 7).
 *
 * Usage:
 *   node open-coverage.js --file <pr-review-report>
 *
 * Prints exactly one line, `OPEN_COVERAGE=<n>` or `OPEN_COVERAGE=unreadable`, and exits 0 — a
 * refusal included. The reason for a refusal goes to stderr only. Exit 2: usage.
 */

"use strict";

const fs = require("fs");
const { extractFindingsBlock } = require("./pr-review-current.js");

/** Every reason a report is refused. Fixed: the tests assert each one is reachable. */
const REASONS = Object.freeze([
  "no-section",
  "no-fence",
  "no-findings-key",
  "bad-line",
  "bad-value",
  "duplicate-key",
  "bad-category",
  "no-category",
  "unterminated",
  "not-a-map",
]);

/** The category tokens review-pr writes: coverage|scope|trail|consistency for PC-*, bug|cleanup for CR-*. */
const CATEGORIES = Object.freeze([
  "coverage",
  "scope",
  "trail",
  "consistency",
  "bug",
  "cleanup",
]);

const TOP_KEYS = new Set(["reviewed_gate", "findings", "truncated_count"]);
// The two keys whose values decide the count: neither may take a block scalar or a deeper line.
const DECIDING = new Set(["category", "provenance"]);
const KEY_LINE = /^([A-Za-z0-9_-]+):(?:[ \t]+(.*)|[ \t]*)$/;
const BLOCK_SCALAR = /^[>|][-+]?[ \t]*(?:#.*)?$/;

class Refusal extends Error {
  constructor(reason, detail) {
    super(detail);
    this.reason = reason;
  }
}

const refuse = (reason, detail) => {
  throw new Refusal(reason, detail);
};

/**
 * One scalar from the start of `s`. Returns { value, rest }, where `rest` is what follows the
 * scalar. In a flow entry a plain scalar ends at `,` or `}`; in block style it runs to the end of
 * the line. Tags, anchors, aliases and nested flow collections are refusals.
 */
function scalar(s, flow) {
  if (s.startsWith('"')) {
    let value = "";
    for (let i = 1; i < s.length; i++) {
      const c = s[i];
      if (c === '"') return { value, rest: s.slice(i + 1) };
      if (c === "\\") {
        // An escape inside a flow entry is refused: the parity suite pins it unreadable.
        if (flow) refuse("bad-value", "an escaped quote inside a flow entry");
        if (i + 1 >= s.length) break;
        value += s[++i];
        continue;
      }
      value += c;
    }
    refuse("bad-value", "an unterminated double-quoted value");
  }
  if (s.startsWith("'")) {
    let value = "";
    for (let i = 1; i < s.length; i++) {
      if (s[i] === "'") {
        if (s[i + 1] === "'") {
          value += "'";
          i++;
          continue;
        }
        return { value, rest: s.slice(i + 1) };
      }
      value += s[i];
    }
    refuse("bad-value", "an unterminated single-quoted value");
  }
  if (/^[!&*]/.test(s)) refuse("bad-value", `a tag, anchor or alias: ${s}`);
  if (/^[[{]/.test(s)) refuse("bad-value", `a nested flow collection: ${s}`);
  if (flow) {
    const m = s.match(/^[^,}]*/);
    const value = m[0].replace(/[ \t]+$/, "");
    if (/[ \t]#/.test(value) || value.startsWith("#"))
      refuse("bad-value", "a comment inside a flow entry");
    return { value, rest: s.slice(m[0].length) };
  }
  return {
    value: s.replace(/[ \t]+#.*$/, "").replace(/[ \t]+$/, ""),
    rest: "",
  };
}

/** What may follow a closed quoted scalar, or a flow entry's `}`: nothing but a comment. */
function mustEnd(rest, what) {
  if (!/^[ \t]*(?:#.*)?$/.test(rest))
    refuse("bad-value", `text after ${what}: ${rest}`);
}

/** A block-style value: { value, deeper }, where `deeper` says what a deeper line after it means. */
function blockValue(key, raw) {
  const s = (raw || "").trim();
  if (s === "" || s.startsWith("#"))
    return { value: "", deeper: DECIDING.has(key) ? "refuse" : "text" };
  if (BLOCK_SCALAR.test(s)) {
    if (DECIDING.has(key)) refuse("bad-value", `a block scalar under ${key}:`);
    return { value: null, deeper: "text" };
  }
  const { value, rest } = scalar(s, false);
  if (s.startsWith('"') || s.startsWith("'")) mustEnd(rest, "a quoted value");
  return { value, deeper: "refuse" };
}

/** A one-line flow entry, `{k: v, k: v}`, from just after its `- `. Returns its keys. */
function flowEntry(s) {
  const keys = new Map();
  let rest = s.slice(1);
  for (;;) {
    rest = rest.replace(/^[ \t]+/, "");
    const k = rest.match(/^([A-Za-z0-9_-]+):[ \t]*/);
    if (!k) refuse("bad-line", `a flow entry the reader cannot tokenise: ${s}`);
    const key = k[1].toLowerCase();
    if (keys.has(key))
      refuse("duplicate-key", `${key} given twice in one entry`);
    const { value, rest: after } = scalar(rest.slice(k[0].length), true);
    keys.set(key, value);
    rest = after.replace(/^[ \t]+/, "");
    if (rest.startsWith("}")) {
      mustEnd(rest.slice(1), "a flow entry");
      return keys;
    }
    if (!rest.startsWith(","))
      refuse("bad-line", `a flow entry the reader cannot tokenise: ${s}`);
    rest = rest.slice(1);
  }
}

/** Parse the block's lines into its findings entries (Maps of lower-cased key → value). */
function parseBlock(block) {
  const top = new Set();
  const entries = [];
  let inFindings = false;
  let listIndent = null;
  let cur = null; // { keys, indent, flow, deeper }

  const close = () => {
    if (cur) entries.push(cur.keys);
    cur = null;
  };

  const lines = block.split("\n");
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    if (/^[ \t]*$/.test(line)) continue;
    const lead = line.match(/^[ \t]*/)[0];
    if (lead.includes("\t"))
      refuse("bad-line", `a tab in the indentation (line ${n + 1})`);
    const indent = lead.length;
    const text = line.slice(indent);

    if (indent === 0) {
      if (text.startsWith("#"))
        refuse("bad-line", `a column-0 \`#\` line (line ${n + 1})`);
      if (
        inFindings &&
        (text === "-" || text.startsWith("- ")) &&
        (listIndent ?? 0) === 0
      ) {
        // A list entry at column 0 — handled with the indented ones below.
      } else {
        const k = text.match(KEY_LINE);
        if (!k || !TOP_KEYS.has(k[1]))
          refuse(
            "bad-line",
            `a column-0 line that is not a top-level key (line ${n + 1}): ${text}`,
          );
        close();
        inFindings = false;
        if (top.has(k[1])) refuse("duplicate-key", `${k[1]} given twice`);
        top.add(k[1]);
        const raw = (k[2] || "").replace(/[ \t]+#.*$/, "").trim();
        if (k[1] === "findings") {
          if (raw === "") {
            inFindings = true;
            listIndent = null;
          } else if (raw !== "[]") {
            refuse("bad-value", `findings: written inline (line ${n + 1})`);
          }
        } else if (raw !== "") {
          const { rest } = scalar(raw, false);
          if (/^["']/.test(raw)) mustEnd(rest, "a quoted value");
        }
        continue;
      }
    }

    if (!inFindings)
      refuse("bad-line", `an indented line outside findings: (line ${n + 1})`);
    if (text.startsWith("#")) continue; // an indented comment line

    // A line deeper than the open entry's keys belongs to the last key's value.
    if (cur && !cur.flow && indent > cur.indent + 2) {
      if (cur.deeper !== "text")
        refuse(
          "bad-value",
          `a deeper line under ${cur.lastKey}: (line ${n + 1})`,
        );
      continue;
    }
    if (cur && cur.flow && indent > cur.indent)
      refuse("bad-line", `a line after a one-line flow entry (line ${n + 1})`);

    if (text === "-" || text.startsWith("- ")) {
      if (listIndent === null) listIndent = indent;
      if (indent !== listIndent)
        refuse(
          "bad-line",
          `an entry at an indent no list owns (line ${n + 1})`,
        );
      close();
      const rest = text.slice(1).replace(/^[ \t]+/, "");
      if (rest === "") refuse("bad-line", `a bare dash (line ${n + 1})`);
      if (rest.startsWith("{")) {
        cur = { keys: flowEntry(rest), indent, flow: true };
        continue;
      }
      const k = rest.match(KEY_LINE);
      if (!k)
        refuse(
          "not-a-map",
          `an entry that is not a map (line ${n + 1}): ${rest}`,
        );
      cur = { keys: new Map(), indent, flow: false };
      setKey(cur, k[1], k[2], n);
      continue;
    }

    const k = text.match(KEY_LINE);
    if (!cur || cur.flow || indent !== cur.indent + 2 || !k)
      refuse(
        "bad-line",
        `a line the reader cannot place (line ${n + 1}): ${text}`,
      );
    setKey(cur, k[1], k[2], n);
  }
  close();
  if (!top.has("findings"))
    refuse("no-findings-key", "the block has no findings: key");
  return entries;
}

function setKey(cur, rawKey, raw, n) {
  const key = rawKey.toLowerCase();
  if (cur.keys.has(key))
    refuse("duplicate-key", `${key} given twice in one entry (line ${n + 1})`);
  const { value, deeper } = blockValue(key, raw);
  cur.keys.set(key, value);
  cur.lastKey = key;
  cur.deeper = deeper;
}

/**
 * The open coverage findings in a review report's text: { count } or { unreadable: reason, detail }.
 * Never throws on input.
 */
function countOpenCoverage(text) {
  try {
    if (
      typeof text !== "string" ||
      !/^## Machine-Readable Findings[ \t]*$/m.test(text)
    )
      refuse("no-section", "no `## Machine-Readable Findings` heading");
    const block = extractFindingsBlock(text);
    if (block === null) {
      if (/^## Machine-Readable Findings\s*\n+```yaml\n/m.test(text))
        refuse("unterminated", "the yaml fence is never closed");
      refuse("no-fence", "no ```yaml fence under the heading");
    }
    let count = 0;
    for (const keys of parseBlock(block)) {
      if (!keys.has("category"))
        refuse(
          "no-category",
          `an entry with no category: ${[...keys.keys()].join(", ")}`,
        );
      const category = String(keys.get("category")).toLowerCase();
      if (!CATEGORIES.includes(category))
        refuse("bad-category", `category: ${keys.get("category")}`);
      const provenance = String(keys.get("provenance") ?? "").toLowerCase();
      if (category === "coverage" && provenance !== "pre-existing") count++;
    }
    return { count };
  } catch (e) {
    if (e instanceof Refusal)
      return { unreadable: e.reason, detail: e.message };
    return { unreadable: "bad-line", detail: `internal error: ${e.message}` };
  }
}

function main(argv) {
  const i = argv.indexOf("--file");
  const file = i > -1 ? argv[i + 1] : undefined;
  if (!file) {
    process.stderr.write(
      "open-coverage: usage: open-coverage.js --file <pr-review-report>\n",
    );
    return 2;
  }
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    process.stderr.write(
      `open-coverage: unreadable — no-section: cannot read ${file} (${e.code || e.message})\n`,
    );
    process.stdout.write("OPEN_COVERAGE=unreadable\n");
    return 0;
  }
  const r = countOpenCoverage(text);
  if ("count" in r) {
    process.stdout.write(`OPEN_COVERAGE=${r.count}\n`);
  } else {
    process.stderr.write(
      `open-coverage: unreadable — ${r.unreadable}: ${r.detail}\n`,
    );
    process.stdout.write("OPEN_COVERAGE=unreadable\n");
  }
  return 0;
}

module.exports = { countOpenCoverage, REASONS, CATEGORIES };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
