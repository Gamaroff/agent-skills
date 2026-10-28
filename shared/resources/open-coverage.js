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
 * The first version of this reader still accepted most of YAML's block shapes — wrapped values,
 * block scalars, nested values, flow entries — and refused the ones known to break. Each of seven
 * QA cycles found one more shape it counted and YAML rejected (task.240 bugs 1–10). So the grammar
 * is now one line per key: the shape review-pr's template emits, and the only one the tracked
 * reports use. Accepted (each pinned by a case in tests/open-coverage.test.mjs or
 * evals/shared/tests/pr-review-loop-parity.test.mjs):
 *   - top-level keys `reviewed_gate`, `findings`, `truncated_count`, each at most once;
 *   - `findings:` followed by a block list (indented, or at column 0), or `findings: []`;
 *   - an entry `- key: value`, its other keys one per line at its first key's column;
 *   - a value on the key's own line: empty, plain, 'single'- or "double"-quoted. A plain value
 *     starts with a letter, a digit or a non-ASCII character, and holds no `: ` and no trailing
 *     `:`. A double-quoted one may escape only `\\` and `\"`;
 *   - a trailing ` # comment`, blank lines, and indented comment lines inside the list.
 * Anything else is a refusal, including a line deeper than its entry's keys, a flow entry, a block
 * scalar, an anchor and a tag. The block may hold only printable ASCII, newlines and, beyond ASCII,
 * letters, marks, numbers, punctuation and symbols: no tab, carriage return, control or format
 * character, and no space but U+0020. The report must also be valid UTF-8: the CLI hands the reader
 * the file's bytes, and an invalid sequence is a refusal, never the U+FFFD a lenient decode would
 * put in its place (task.240 bug.11). Each rule is one YAML states for a one-line value, so a block
 * the reader counts is one YAML reads the same way; the differential suite
 * (tests/open-coverage-differential.test.mjs) compares the two with PyYAML.
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
  "bad-encoding",
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
// `key:`, then a space and the value or the end of the line.
const KEY_LINE = /^([A-Za-z_][A-Za-z0-9_-]{0,63}):(?: +(.*)| *)$/;
// Every character the block may hold. A tab, a carriage return, a control or format character and
// a space other than U+0020 are each something YAML rejects or reads as a break (task.240 bug.9).
const BLOCK_CHARS = /^[\n\x20-\x7e\p{L}\p{M}\p{N}\p{P}\p{S}]*$/u;
// Fatal, so an invalid byte throws instead of becoming U+FFFD, which BLOCK_CHARS admits as a symbol.
// ignoreBOM keeps a leading BOM in the text, as the `utf8` read this replaced did.
const UTF8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

class Refusal extends Error {
  constructor(reason, detail) {
    super(detail);
    this.reason = reason;
  }
}

const refuse = (reason, detail) => {
  throw new Refusal(reason, detail);
};

/** Refuses a block holding any character outside BLOCK_CHARS, naming the first one. */
function checkChars(block) {
  if (BLOCK_CHARS.test(block)) return;
  const lines = block.split("\n");
  const n = lines.findIndex((l) => !BLOCK_CHARS.test(l));
  const c = [...lines[n]].find((ch) => !BLOCK_CHARS.test(ch));
  const code = c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
  refuse(
    "bad-line",
    `a character the block may not hold, U+${code} (line ${n + 1})`,
  );
}

/**
 * The value after `key: `, all of it on the key's line: a string, or null when it is empty. A
 * comment after it is dropped. Anything else a one-line YAML value cannot be is a refusal.
 */
function value(raw) {
  const s = raw.replace(/ +$/, "");
  if (s === "" || s.startsWith("#")) return null;
  if (s[0] === "'" || s[0] === '"') {
    const { text, rest } = quoted(s);
    // After the closing quote: nothing, or a comment set off by a space.
    if (!/^(?: +#.*)?$/.test(rest))
      refuse("bad-value", `text after a quoted value: ${rest}`);
    return text;
  }
  // Every YAML indicator is ASCII punctuation, so a plain value starting with none of it starts
  // with no indicator (task.240 bug.7). Harmless marks such as `(` are refused with the rest.
  if (!/^[A-Za-z0-9\u0080-\u{10FFFF}]/u.test(s))
    refuse("bad-value", `a plain value that starts with ${s[0]}: ${s}`);
  // ` #` starts a comment; a `#` with no space before it is text.
  const v = s.replace(/ +#.*$/, "");
  // `: ` or a trailing `:` reads as a mapping, which YAML rejects in a value. task.238 bug.15's
  // leniency is gone: free text holding one is quoted, or the block is refused.
  if (/:(?: |$)/.test(v))
    refuse("bad-value", `a plain value that reads as a key: ${v}`);
  return v;
}

/**
 * A quoted value that closes on its own line: { text, rest }, where `rest` follows the closing
 * quote. A double-quoted escape other than `\\` or `\"` is refused rather than decoded (task.240
 * bug.4: `provenance: "pr\e-existing"` read as pre-existing).
 */
function quoted(s) {
  const q = s[0];
  let text = "";
  for (let i = 1; i < s.length; i++) {
    const c = s[i];
    if (c === q) {
      if (q === "'" && s[i + 1] === "'") {
        text += "'";
        i++;
        continue;
      }
      return { text, rest: s.slice(i + 1) };
    }
    if (q === '"' && c === "\\") {
      if (s[i + 1] !== "\\" && s[i + 1] !== '"')
        refuse(
          "bad-value",
          `an escape the reader does not decode: \\${s[i + 1] ?? ""}`,
        );
      text += s[++i];
      continue;
    }
    text += c;
  }
  refuse("bad-value", `a quoted value not closed on its line: ${s}`);
}

/** Parse the block's lines into its findings entries (Maps of key → value; keys case-sensitive). */
function parseBlock(block) {
  checkChars(block);
  const top = new Set();
  const entries = [];
  let inFindings = false;
  let listIndent = null;
  let cur = null; // { keys, keyIndent }

  const close = () => {
    if (cur) entries.push(cur.keys);
    cur = null;
  };

  const lines = block.split("\n");
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    if (/^ *$/.test(line)) continue;
    const indent = line.match(/^ */)[0].length;
    const text = line.slice(indent);
    const at = `(line ${n + 1})`;
    const dash = /^-(?: |$)/.test(text);

    // Column 0 holds the top-level keys, and the entries of a list that starts there.
    if (indent === 0 && !(inFindings && dash && (listIndent ?? 0) === 0)) {
      if (text.startsWith("#"))
        refuse("bad-line", `a column-0 \`#\` line ${at}`);
      const k = text.match(KEY_LINE);
      if (!k || !TOP_KEYS.has(k[1]))
        refuse(
          "bad-line",
          `a column-0 line that is not a top-level key ${at}: ${text}`,
        );
      close();
      inFindings = false;
      if (top.has(k[1])) refuse("duplicate-key", `${k[1]} given twice`);
      top.add(k[1]);
      const raw = (k[2] ?? "").replace(/ +$/, "");
      if (k[1] !== "findings") value(raw);
      else if (raw === "" || raw.startsWith("#")) {
        inFindings = true;
        listIndent = null;
      } else if (!/^\[\](?: +#.*)?$/.test(raw))
        refuse("bad-value", `findings: written inline ${at}`);
      continue;
    }

    if (!inFindings)
      refuse("bad-line", `an indented line outside findings: ${at}`);
    // An indented comment line. No value here runs past its own line, so there is none for the
    // comment to end, and YAML skips it wherever it sits.
    if (text.startsWith("#")) continue;

    if (dash) {
      if (listIndent === null) listIndent = indent;
      if (indent !== listIndent)
        refuse("bad-line", `an entry at an indent no list owns ${at}`);
      close();
      const rest = text.slice(1).replace(/^ +/, "");
      if (rest === "") refuse("bad-line", `a bare dash ${at}`);
      if (rest.startsWith("{"))
        refuse(
          "bad-line",
          `a flow entry: the reader reads one key per line ${at}`,
        );
      const k = rest.match(KEY_LINE);
      if (!k) refuse("not-a-map", `an entry that is not a map ${at}: ${rest}`);
      // The entry's keys sit at its first key's column, wherever the dash's spacing puts it
      // (task.240 bug.5).
      cur = { keys: new Map(), keyIndent: indent + text.length - rest.length };
      setKey(cur, k, at);
      continue;
    }

    // Every other line is the open entry's next key, at its keys' column. A deeper line would
    // continue the last value onto a second line, which a value here never does.
    const k = text.match(KEY_LINE);
    if (!cur || indent !== cur.keyIndent || !k)
      refuse("bad-line", `a line the reader cannot place ${at}: ${text}`);
    setKey(cur, k, at);
  }
  close();
  if (!top.has("findings"))
    refuse("no-findings-key", "the block has no findings: key");
  return entries;
}

function setKey(cur, k, at) {
  // Keys are case-sensitive, as in YAML: `Category:` is not `category:` (task.240 CR-3).
  if (cur.keys.has(k[1]))
    refuse("duplicate-key", `${k[1]} given twice in one entry ${at}`);
  cur.keys.set(k[1], value(k[2] ?? ""));
}

/** A report's bytes as text, or a refusal when they are not valid UTF-8. */
function decode(bytes) {
  try {
    return UTF8.decode(bytes);
  } catch {
    return refuse("bad-encoding", "the report is not valid UTF-8");
  }
}

/**
 * The open coverage findings in a review report — its text, or its bytes, which must be valid
 * UTF-8: { count } or { unreadable: reason, detail }. Never throws on input.
 */
function countOpenCoverage(input) {
  try {
    const text = input instanceof Uint8Array ? decode(input) : input;
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
  let bytes;
  try {
    // Bytes, not a `utf8` read: countOpenCoverage decodes them strictly (task.240 bug.11).
    bytes = fs.readFileSync(file);
  } catch (e) {
    process.stderr.write(
      `open-coverage: unreadable — no-section: cannot read ${file} (${e.code || e.message})\n`,
    );
    process.stdout.write("OPEN_COVERAGE=unreadable\n");
    return 0;
  }
  const r = countOpenCoverage(bytes);
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
