#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/open-coverage.js. Regenerate via `npm run bundle`.
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
 *   - an entry `- key: value` with its other keys at its first key's column, or a one-line flow
 *     entry `- {k: v, k: v}`;
 *   - plain, 'single'- or "double"-quoted values (a block-style double-quoted value may carry
 *     escapes, except under `category` or `provenance`; a flow one may not), a trailing
 *     ` # comment`, and `>`/`|` block scalars;
 *   - under any key but `category` and `provenance`, deeper lines after a block scalar indicator,
 *     read as text, and after an empty value, read as a nested value of plain text: a line that
 *     holds a quote or a flow collection is refused (task.240 bug.2, bug.3) — never for a key;
 *   - under the same keys, a value wrapped onto deeper lines: a plain one whose wrapped lines do
 *     not read as `key: `, or a quoted one whose closing quote is on a deeper line (task.240
 *     bug.1). A quote still open at the entry's key indent is refused.
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
function scalar(s, flow, strict = flow) {
  if (s.startsWith('"') || s.startsWith("'")) {
    const r = quoted(s[0], s.slice(1), strict);
    if (r.closed) return { value: r.value, rest: r.rest };
    refuse(
      "bad-value",
      `an unterminated ${s[0] === '"' ? "double" : "single"}-quoted value`,
    );
  }
  if (/^[!&*]/.test(s)) refuse("bad-value", `a tag, anchor or alias: ${s}`);
  if (/^[[{]/.test(s)) refuse("bad-value", `a nested flow collection: ${s}`);
  // A plain scalar holding `: `, or ending in `:`, is one YAML rejects. A flow value or a value the
  // count compares (`strict`) is refused. Block free text keeps the old leniency — read to the end
  // of the line, colons included (task.238 bug.15 pins it: review-pr writes plain sentences) — and
  // blockValue lets it no deeper line.
  const plain = (value) => {
    if (strict && /:(?:[ \t]|$)/.test(value))
      refuse("bad-value", `a plain value that reads as a key: ${value}`);
    return value;
  };
  if (flow) {
    const m = s.match(/^[^,}]*/);
    const value = m[0].replace(/[ \t]+$/, "");
    if (/[ \t]#/.test(value) || value.startsWith("#"))
      refuse("bad-value", "a comment inside a flow entry");
    return { value: plain(value), rest: s.slice(m[0].length) };
  }
  return {
    value: plain(s.replace(/[ \t]+#.*$/, "").replace(/[ \t]+$/, "")),
    rest: "",
  };
}

/**
 * Quoted text from just after its opening quote `q`, up to the closing one:
 * { value, rest, closed }. `closed` is false when the line ends first. An escape is skipped over,
 * not decoded: that finds the closing quote, but the value is not YAML's. So `strict` — a flow
 * entry, or a key in DECIDING, whose value the count compares — refuses an escape outright
 * (task.240 bug.4: `provenance: "pr\e-existing"` read as pre-existing).
 */
function quoted(q, s, strict) {
  let value = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === q) {
      if (q === "'" && s[i + 1] === "'") {
        value += "'";
        i++;
        continue;
      }
      return { value, rest: s.slice(i + 1), closed: true };
    }
    if (q === '"' && c === "\\") {
      if (strict)
        refuse(
          "bad-value",
          "an escape in a quoted value the count reads (a flow entry, category: or provenance:)",
        );
      if (i + 1 >= s.length) break;
      value += s[++i];
      continue;
    }
    value += c;
  }
  return { value, rest: "", closed: false };
}

/** What may follow a closed quoted scalar, or a flow entry's `}`: nothing but a comment. */
function mustEnd(rest, what) {
  if (!/^[ \t]*(?:#.*)?$/.test(rest))
    refuse("bad-value", `text after ${what}: ${rest}`);
}

/**
 * A block-style value: { value, deeper }, where `deeper` says what a deeper line after it means:
 *   "text"   — anything (a block scalar's content);
 *   "nested" — a nested value under an empty key: plain text, with no quote or flow collection;
 *   "plain"  — the wrapped tail of a plain value, which may not read as a key;
 *   `"`/`'`  — the rest of a quoted value, up to its closing quote;
 *   "refuse" — nothing may follow.
 * A key in DECIDING never wraps: its value is refused rather than read across lines.
 */
function blockValue(key, raw) {
  const s = (raw || "").trim();
  const deciding = DECIDING.has(key);
  if (s === "" || s.startsWith("#"))
    return { value: "", deeper: deciding ? "refuse" : "nested" };
  if (BLOCK_SCALAR.test(s)) {
    if (deciding) refuse("bad-value", `a block scalar under ${key}:`);
    return { value: null, deeper: "text" };
  }
  const q = s[0];
  if ((q === '"' || q === "'") && !deciding) {
    const r = quoted(q, s.slice(1), false);
    if (!r.closed) return { value: r.value, deeper: q };
    mustEnd(r.rest, "a quoted value");
    return { value: r.value, deeper: "refuse" };
  }
  const { value, rest } = scalar(s, false, deciding);
  if (q === '"' || q === "'") {
    mustEnd(rest, "a quoted value");
    return { value, deeper: "refuse" };
  }
  // A comment ends a plain value: YAML has nothing a deeper line could continue. Nor may free text
  // read leniently past a `: ` wrap — it is one line or nothing.
  return {
    value,
    deeper:
      deciding || /[ \t]#/.test(s) || /:(?:[ \t]|$)/.test(value)
        ? "refuse"
        : "plain",
  };
}

/**
 * One line of a nested value under an empty key. In YAML only a quoted scalar or a flow collection
 * can run on over the lines below it, key-indent lines included, and the reader would read those
 * lines as keys (task.240 bug.2, bug.3); a plain or block scalar ends at a shallower line. So the
 * line may hold no double quote, no `[` or `{`, and no single quote but an apostrophe between two
 * word characters — wherever it sits. A rule over characters cannot be bypassed by a prefix (a
 * nested dash, an anchor, a key with a space), as a scan for openers was. A closed quote or flow
 * collection is refused with the rest: no report carries one here, and refusing costs a HALT
 * where a misread costs a false 0.
 */
const NESTED_OPENER = /["[{]|(?<![\p{L}\p{N}])'|'(?![\p{L}\p{N}])/u;
// A YAML indicator at the start of a scalar: an anchor, alias, tag, block scalar, reserved
// character, or a dash, `?` or `:` that opens a structure.
const NESTED_INDICATOR = /^(?:[&*!|>%@`]|[-?:](?:[ \t]|$))/;
function nestedLine(text, key, n) {
  if (NESTED_OPENER.test(text))
    refuse(
      "bad-value",
      `a quote or flow collection in a value nested under ${key}: (line ${n + 1})`,
    );
  // One optional item dash, then a plain scalar or one `key: plain` pair — nothing else.
  const parts = text
    .replace(/^-(?:[ \t]+|$)/, "")
    .split(/:(?:[ \t]+|$)/)
    .map((p) => p.trim());
  if (parts.length > 2 || parts.some((p) => NESTED_INDICATOR.test(p)))
    refuse(
      "bad-value",
      `a nested line under ${key}: that is not one plain item (line ${n + 1})`,
    );
}

/** A one-line flow entry, `{k: v, k: v}`, from just after its `- `. Returns its keys. */
function flowEntry(s) {
  const keys = new Map();
  let rest = s.slice(1);
  for (;;) {
    rest = rest.replace(/^[ \t]+/, "");
    // A flow key's colon is followed by a space, `,` or `}`: `{category:coverage}` is one plain
    // scalar in YAML, not a category (task.240 CR-2).
    const k = rest.match(/^([A-Za-z0-9_-]+):(?:[ \t]+|(?=[,}]))/);
    if (!k) refuse("bad-line", `a flow entry the reader cannot tokenise: ${s}`);
    const key = k[1];
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

/** Parse the block's lines into its findings entries (Maps of key → value; keys case-sensitive). */
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

    // An open quoted value continues on deeper lines, and only there: a line at the entry's key
    // indent ends the entry's keys, so a quote still open by then is never closed (task.240 bug.1).
    // Checked before the comment skip: a `#` inside quotes is text.
    if (cur && (cur.deeper === '"' || cur.deeper === "'")) {
      if (indent <= cur.keyIndent)
        refuse(
          "bad-value",
          `an unterminated quoted value under ${cur.lastKey}: (line ${n + 1})`,
        );
      const r = quoted(cur.deeper, text, false);
      if (r.closed) {
        mustEnd(r.rest, "a quoted value");
        cur.deeper = "refuse";
      }
      continue;
    }

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
    // An indented comment line — except inside a block scalar, where `#` is content and the line
    // sets the scalar's indent like any other.
    const inScalar =
      cur && !cur.flow && cur.deeper === "text" && indent > cur.keyIndent;
    if (text.startsWith("#") && !inScalar) {
      // A comment shallower than a block scalar's content ends it: YAML has no scalar for a
      // deeper line after it to belong to.
      if (cur && !cur.flow && cur.deeper === "text") cur.deeper = "refuse";
      continue;
    }

    // A line deeper than the open entry's keys belongs to the last key's value.
    if (cur && !cur.flow && indent > cur.keyIndent) {
      // A wrapped plain value may not hold `key: ` — YAML refuses that, and reading it as text
      // would hide a key the author meant.
      if (cur.deeper === "plain" && /:(?:[ \t]|$)/.test(text))
        refuse(
          "bad-value",
          `a deeper line under ${cur.lastKey}: that reads as a key (line ${n + 1})`,
        );
      if (cur.deeper === "nested") nestedLine(text, cur.lastKey, n);
      else if (cur.deeper !== "text" && cur.deeper !== "plain")
        refuse(
          "bad-value",
          `a deeper line under ${cur.lastKey}: (line ${n + 1})`,
        );
      // A nested value or a block scalar takes its indent from its first line; a later line
      // shallower than that but deeper than the keys belongs to nothing, and YAML rejects it.
      if (cur.deeper === "nested" || cur.deeper === "text") {
        if (cur.deeperIndent === null) cur.deeperIndent = indent;
        else if (indent < cur.deeperIndent)
          refuse(
            "bad-line",
            `a line under ${cur.lastKey}: shallower than the value's first line (line ${n + 1})`,
          );
        // A nested value is flat: one list, map or plain scalar at one indent. Anything deeper —
        // an item's child, a continuation — is a structure the reader does not model, and no
        // writer emits it.
        else if (cur.deeper === "nested" && indent > cur.deeperIndent)
          refuse(
            "bad-line",
            `a line under ${cur.lastKey}: deeper than the nested value's first line (line ${n + 1})`,
          );
      }
      // A nested value is one node: a list, a map or a plain scalar. Lines at its own indent that
      // switch kind (`- a` then `plain`) are a block YAML rejects.
      if (cur.deeper === "nested" && indent === cur.deeperIndent) {
        const kind = /^-(?:[ \t]|$)/.test(text)
          ? "list"
          : /:(?:[ \t]|$)/.test(text)
            ? "map"
            : "plain";
        if (cur.deeperKind == null) cur.deeperKind = kind;
        else if (kind !== cur.deeperKind)
          refuse(
            "bad-line",
            `a ${kind} line in a nested ${cur.deeperKind} under ${cur.lastKey}: (line ${n + 1})`,
          );
      }
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
      // The entry's keys sit at its first key's column, wherever the dash's spacing puts it:
      // assuming `dash + 2` read `-  category: x` / `    provenance: y` — which YAML rejects —
      // as one entry and printed 0 (task.240 bug.5).
      const keyIndent = indent + text.length - rest.length;
      cur = { keys: new Map(), indent, keyIndent, flow: false };
      setKey(cur, k[1], k[2], n);
      continue;
    }

    const k = text.match(KEY_LINE);
    if (!cur || cur.flow || indent !== cur.keyIndent || !k)
      refuse(
        "bad-line",
        `a line the reader cannot place (line ${n + 1}): ${text}`,
      );
    setKey(cur, k[1], k[2], n);
  }
  if (cur && (cur.deeper === '"' || cur.deeper === "'"))
    refuse("bad-value", `an unterminated quoted value under ${cur.lastKey}:`);
  close();
  if (!top.has("findings"))
    refuse("no-findings-key", "the block has no findings: key");
  return entries;
}

function setKey(cur, rawKey, raw, n) {
  // Keys are case-sensitive, as in YAML: `Category:` is not `category:` (task.240 CR-3).
  const key = rawKey;
  if (cur.keys.has(key))
    refuse("duplicate-key", `${key} given twice in one entry (line ${n + 1})`);
  const { value, deeper } = blockValue(key, raw);
  cur.keys.set(key, value);
  cur.lastKey = key;
  cur.deeper = deeper;
  cur.deeperIndent = null;
  cur.deeperKind = null;
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
