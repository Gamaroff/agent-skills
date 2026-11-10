#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-execute-snippets.mjs. Regenerate via `npm run bundle`.
/**
 * qa-execute-snippets — extract, classify and dual-shell execute the fenced
 * ```bash blocks in a markdown file.
 *
 * Usage:
 *   node <this-file> --file <path.md> [options]
 *
 * Options:
 *   --file <path>        markdown file to analyse (required)
 *   --bind NAME=VALUE    bind a caller-supplied variable; repeatable
 *   --slot NAME=VALUE    fill the template slot {NAME} / <NAME> with VALUE before
 *                        the block is classified; repeatable (obs #186)
 *   --diff-base <rev>    mark the blocks whose lines `git diff <rev> -- <file>`
 *                        touches, count them apart, and report
 *                        `changed-blocks-not-executed` when none of them ran.
 *                        An untracked file has no diff, so no block is changed
 *   --copy <dir>         seed the temp working directory from this directory
 *                        (its CONTENTS land at the temp root; linked git
 *                        worktrees nested inside it are not copied)
 *   --copy-as SRC:DEST   copy SRC to DEST inside the temp working directory;
 *                        repeatable. DEST must be relative, stay inside it, not
 *                        pass through a symlink, and not exist yet (it seeds a
 *                        fresh path; it never merges) —
 *                        seed `docs` at `docs/` for a block that runs
 *                        `find docs/tasks …` (obs #143)
 *   --timeout <ms>       per-block, per-shell timeout (default 10000)
 *   --no-zsh             force the bash arm only (testing / mutation proving)
 *
 * Helper calls (obs #219, #278): `bash <path>.sh`, `sh`, `source` and `.` run
 * only when the helper is a literal file inside the temp copy whose own text
 * classifies runnable — see `resolveHelperCall`.
 *   --json               emit one JSON object on stdout
 *
 * Exit codes (repository convention):
 *   0  clean — no findings
 *   1  findings present
 *   2  hard error (missing file, bad argument)
 *
 * The rule this implements — what counts as runnable prose, why the safety
 * boundary is an allow-list rather than a deny-list, and why stdout rather than
 * exit status is the load-bearing comparison — is stated once in
 * `qa-runnable-prose-detection.md`, which sits beside this file in both the
 * source tree and every bundled copy. Read that first; this file is the
 * mechanism, not the argument.
 */

import { spawnSync } from "node:child_process";
import {
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// ── Extraction ────────────────────────────────────────────────────────────────

/**
 * Every fenced ```bash block, with the 1-based line number of its opening fence.
 * Only the `bash` info string is in scope — see the detection rule §1.
 */
export function extractBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let open = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // CR-10 — take the language as the FIRST WORD of the info string and ignore
    // the rest. Rejecting an attributed fence (```bash showLineNumbers) did not
    // merely skip that block: its body was dropped and its CLOSING fence was then
    // read as an opening one, inverting fence state for the rest of the file.
    // Verified: a doc with one attributed block extracted zero blocks, so the gate
    // reported a clean run on a document it had never read.
    const fence = /^(\s*)(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)([^`]*)$/.exec(line);
    if (!fence) {
      // Ordinary content. Only meaningful while a fence is open — that is the
      // block body, and dropping it here is how an earlier draft extracted every
      // block as empty.
      if (open !== null) open.body.push(line);
      continue;
    }
    const [, indent, marker, info] = fence;

    if (open === null) {
      open = {
        indent,
        marker: marker[0],
        len: marker.length,
        info,
        start: i,
        body: [],
      };
      continue;
    }

    // A closing fence uses the same marker character and is at least as long.
    if (marker[0] === open.marker && marker.length >= open.len && info === "") {
      if (open.info === "bash") {
        blocks.push({
          line: open.start + 1,
          code: open.body.join("\n"),
          origin: "fence",
        });
      }
      open = null;
      continue;
    }

    // A differently-marked fence inside an open block is content, not a fence.
    open.body.push(line);
  }

  // An unterminated fence is not a block — we never execute what we cannot delimit.
  return blocks;
}

// ── Table-cell extraction ─────────────────────────────────────────────────────

/**
 * A header cell naming a column whose cells hold commands. The corpus spells it
 * "Verification command", "Command" and "Commands"; the word itself is the signal.
 *
 * The restriction to command columns is a NOISE bound, not a safety one.
 * Backticked spans in table cells are overwhelmingly not commands — they are
 * field names, statuses, file globs and verdict tokens (`PASS`, `accepted`,
 * `task.*.gate.*.yml`). Feeding all of them to the classifier would push most
 * documents into `no-executable-blocks` on a flood of `unrecognised-command`
 * refusals, which is the "noise trains reviewers to ignore it" failure the rule
 * doc argues against. SAFE_COMMANDS remains the safety boundary, untouched.
 */
const COMMAND_COLUMN = /\bcommands?\b/i;

/** Every backtick-delimited span in a string, honouring multi-backtick delimiters. */
const CODE_SPAN = /(`+)(.+?)\1/g;

/**
 * A markdown table row, for our purposes, starts with a pipe. Requiring the
 * leading pipe is what stops an ordinary prose line containing a `|` from being
 * read as a table header; every table in this repository writes it.
 */
function isTableRow(line) {
  return line.trimStart().startsWith("|");
}

/**
 * The delimiter row (`| --- | :---: |`) is what makes the line above it a header
 * rather than a body row, so it is required rather than inferred.
 */
function isDelimiterRow(line) {
  const t = line.trim();
  return t.includes("|") && t.includes("-") && /^[\s:|-]+$/.test(t);
}

/**
 * One pass of the row splitter.
 *
 * `codeSpanAware` decides whether a `|` inside an open backtick span is content
 * or a delimiter — the whole of TASK87-001. Returns `open: true` when a span was
 * still open at end of line, which is the caller's signal that this reading of
 * the row cannot be trusted.
 */
function splitOnDelimiters(line, codeSpanAware) {
  const cells = [];
  let cur = "";
  let spanLen = 0; // length of the open backtick run; 0 = no span open

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === "\\" && line[i + 1] === "|") {
      // Keep the escape; `unescapeCell` removes it once the span is carved out.
      cur += "\\|";
      i++;
      continue;
    }

    // An ESCAPED backtick outside a span is a literal backtick and must not open
    // one — TASK87-002, found by QA cycle 2's refute pass as a regression from
    // cycle 1's own fix. Two escaped backticks in a row (`| a \` b | c \` d |`)
    // read as a span opening and closing, so the real delimiter between them
    // became content and the whole row collapsed to ONE cell. The command column
    // then did not exist and its command was dropped in silence — the same class
    // of defect as TASK87-001, reintroduced by the fix for it.
    //
    // The asymmetry is markdown's, not ours: inside a code span a backslash is
    // literal, so a backtick there still counts toward the closing run. Hence
    // `spanLen === 0` rather than an unconditional skip.
    if (codeSpanAware && ch === "\\" && line[i + 1] === "`" && spanLen === 0) {
      cur += "\\`";
      i++;
      continue;
    }

    if (codeSpanAware && ch === "`") {
      let run = 0;
      while (line[i + run] === "`") run++;
      // A span closes on a run of EXACTLY its own length — that is what makes
      // `` `a` `` inside a two-backtick span content rather than a terminator.
      if (spanLen === 0) spanLen = run;
      else if (run === spanLen) spanLen = 0;
      cur += "`".repeat(run);
      i += run - 1;
      continue;
    }

    if (ch === "|" && spanLen === 0) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return { cells, open: spanLen !== 0 };
}

/**
 * Split a table row on its UNESCAPED pipes.
 *
 * Splitting on a bare `|` is the first thing that breaks on the real cells. The
 * resume contract's verification column contains
 * `gh pr view {PR} --comments --json comments \| grep -i "QA"` — one cell holding
 * a pipeline whose pipe is escaped for the table. Split naively and the row gains
 * a phantom column, every later column shifts, and the command column read is the
 * wrong text.
 *
 * The escape is preserved here and removed by `unescapeCell` after the span has
 * been carved out, so the two concerns stay separable.
 *
 * A pipe inside an OPEN backtick span is content, not a delimiter — TASK87-001.
 * GFM does split an unescaped pipe even inside a code span, so this deliberately
 * diverges from the rendering spec, and the divergence is the point: rendering
 * cares where the cell boundaries are, this engine cares whether a command was
 * seen at all. Before the fix, one unescaped pipe in ANY cell of a row shifted
 * every later column, so a perfectly well-formed command in the command column
 * was dropped and the file reported zero blocks, zero findings and no note —
 * byte-identical to a document with no commands in it. That is the silent skip
 * this engine exists to eliminate, reached through a different door.
 *
 * The divergence can only ever extract MORE, never mis-target: a code span's
 * text is exactly what the author wrote, and header and body rows go through
 * this same function so column indices stay consistent.
 */
export function splitTableRow(line) {
  const split = splitOnDelimiters(line, true);
  // TASK87-001 — a span left OPEN at end of line means the code-span tracking
  // was wrong about this row, and treating everything after the stray backtick
  // as one cell is worse than the naive split: the whole row collapses into a
  // single cell and the command column disappears. Fall back rather than trust
  // a reading the input has already contradicted.
  const cells = split.open ? splitOnDelimiters(line, false).cells : split.cells;
  // `| a | b |` splits to ["", " a ", " b ", ""] — the outer pipes are delimiters,
  // not content. Drop those two, and only when they are actually empty, so a
  // pipe-less or half-fenced row keeps its cells in the right positions.
  if (cells.length > 1 && cells[0].trim() === "") cells.shift();
  if (cells.length > 1 && cells[cells.length - 1].trim() === "") cells.pop();
  return cells.map((c) => c.trim());
}

/**
 * Undo the table-cell pipe escape — and only that one.
 *
 * GFM processes `\|` inside a table cell before any other inline parsing, code
 * spans included, so a command that reaches us via a cell has pipes that markdown
 * put there. Nothing else is unescaped: a command legitimately containing `\\`
 * (`printf 'a\\nb'`) must survive verbatim, and markdown does not process
 * backslash escapes inside a code span for any other character. Unescaping more
 * than the pipe would corrupt the command in the name of reading it.
 */
export function unescapeCell(text) {
  return text.replace(/\\\|/g, "|");
}

/**
 * Is this span plausibly an invocation at all?
 *
 * A span with no whitespace is a filename, a glob, a frontmatter key or a verdict
 * token — not a command. This bound fails toward running LESS, never toward
 * running something unsafe: everything that gets past it still goes through
 * `classifyBlock`, and the allow-list is still what decides.
 *
 * It also cannot hide the defect class this extractor exists to catch. A
 * shell-portability disagreement needs a glob inside a command substitution, a
 * `[` test, or a pipeline — none of which fit in a single unspaced word.
 */
function looksLikeCommand(code) {
  return /\s/.test(code);
}

/**
 * Which lines sit inside a fenced code block (the fences themselves included).
 *
 * Tables appear inside fenced blocks all over this repository — every document
 * that shows an example table does it. Those are illustrations, not instructions,
 * and extracting from them would execute a document's own examples. The state
 * machine deliberately mirrors `extractBlocks`, including its treatment of an
 * unterminated fence as open to end-of-file: two extractors reading one file must
 * agree about where the fences are, and a malformed document is better read
 * conservatively by both than differently by each.
 */
function fenceMask(lines) {
  const mask = new Array(lines.length).fill(false);
  let open = null;

  for (let i = 0; i < lines.length; i++) {
    const fence = /^(\s*)(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)([^`]*)$/.exec(
      lines[i],
    );
    if (!fence) {
      if (open !== null) mask[i] = true;
      continue;
    }
    const [, , marker, info] = fence;
    mask[i] = true;
    if (open === null) {
      open = { ch: marker[0], len: marker.length };
      continue;
    }
    if (marker[0] === open.ch && marker.length >= open.len && info === "") {
      open = null;
    }
  }
  return mask;
}

/**
 * Every command written inside a markdown table cell, in the same shape
 * `extractBlocks` returns plus an `origin` discriminator.
 *
 * This exists because the gate's whole value is executing what prose claims, and
 * the places table-cell commands appear are disproportionately *verification*
 * commands — where a false pass is the worst available failure. Task 77 shipped
 * one: a predicate in the resume contract's Steps 5–6 verification cell that
 * returned a false PASS under zsh whenever its glob matched nothing. Three QA
 * cycles and a full CI run did not catch it, because the extractor could not see
 * the cell it was written in.
 */
export function extractTableCellCommands(markdown) {
  const lines = markdown.split("\n");
  const inFence = fenceMask(lines);
  const blocks = [];

  for (let i = 0; i < lines.length; i++) {
    if (inFence[i] || !isTableRow(lines[i])) continue;
    if (
      i + 1 >= lines.length ||
      inFence[i + 1] ||
      !isDelimiterRow(lines[i + 1])
    ) {
      continue;
    }

    const header = splitTableRow(lines[i]);
    const columns = [];
    for (let c = 0; c < header.length; c++) {
      if (COMMAND_COLUMN.test(header[c])) columns.push(c);
    }

    // Consume the whole table either way. A body row skipped rather than consumed
    // would be re-examined as a candidate header on the next iteration, and a body
    // row followed by another body row full of dashes would read as one.
    let r = i + 2;
    for (; r < lines.length && !inFence[r] && isTableRow(lines[r]); r++) {
      if (columns.length === 0) continue;
      const cells = splitTableRow(lines[r]);
      for (const c of columns) {
        const cell = cells[c];
        if (!cell) continue;
        for (const match of cell.matchAll(CODE_SPAN)) {
          const code = unescapeCell(match[2]).trim();
          if (!looksLikeCommand(code)) continue;
          blocks.push({
            line: r + 1,
            code,
            origin: "table-cell",
            column: header[c],
          });
        }
      }
    }
    i = r - 1;
  }

  return blocks;
}

// ── Classification ────────────────────────────────────────────────────────────

/**
 * Commands known to be read-only. This is the safety boundary and it is an
 * ALLOW-list: anything absent here classifies as `mutating` and is skipped.
 * A deny-list alone fails open — every command nobody thought to forbid runs.
 *
 * `gh` and `curl` are deliberately absent in every form, including read-only
 * ones: a QA gate should not make network calls, and the execution environment
 * carries no credentials.
 */
export const SAFE_COMMANDS = new Set([
  "basename",
  "cat",
  "comm",
  "cut",
  "date",
  "diff",
  "dirname",
  "echo",
  "egrep",
  "false",
  "fgrep",
  "file",
  "grep",
  "head",
  "jq",
  "ls",
  "printf",
  "pwd",
  "readlink",
  "realpath",
  "seq",
  "sort",
  "stat",
  "tail",
  "test",
  "tr",
  "true",
  "uniq",
  "wc",
  // `sed` is read-only unless asked to edit in place; `find` unless given a
  // write action; both are constrained by DENY_PATTERNS below.
  "sed",
  "find",
]);

/**
 * Commands that RUN another command. Their blast radius is whatever follows, and
 * only the prefix was ever scanned — `env touch /tmp/x`, `command mv a b` and
 * `time mv a b` all classified runnable. They are refused outright rather than
 * recursed into: the recursion would have to re-implement each one's option
 * grammar to find where the real command starts, and getting that wrong fails
 * open again.
 *
 * `awk` is here for the same reason by a different route — its program text is a
 * quoted argument, so `awk 'BEGIN{system("touch /tmp/x")}'` is arbitrary shell
 * that the quote-blanking hides from the scan entirely.
 */
export const COMMAND_RUNNERS = new Set([
  "awk",
  "command",
  "env",
  "eval",
  "exec",
  "nice",
  "nohup",
  "sudo",
  "time",
  "timeout",
  "watch",
  "xargs",
]);

/**
 * Shell keywords, and builtins that cannot mutate anything outside the block's
 * own shell. `source` and `.` are deliberately absent: they execute an arbitrary
 * file, which is exactly what the allow-list exists to refuse.
 */
const SHELL_KEYWORDS = new Set([
  "!",
  "[",
  "[[",
  "]]",
  "]",
  "{",
  "}",
  "(",
  ")",
  "case",
  "do",
  "done",
  "elif",
  "else",
  "esac",
  "fi",
  "for",
  "function",
  "if",
  "in",
  "select",
  "then",
  "until",
  "while",
  // Builtins whose blast radius is the block's own shell process.
  ":",
  "break",
  "cd",
  "continue",
  "exit",
  "export",
  "local",
  "read",
  "readonly",
  "return",
  "set",
  "shift",
  "type",
  "unset",
  "which",
]);

/**
 * What a command name can look like. A token that cannot name a command — a
 * `case` arm glob pattern, a blanked quoted string, a stray backslash — is not
 * an invocation, so the segment holding it is not scanned.
 *
 * This does NOT weaken the fail-closed rule. Anything that *could* be a command
 * name and is not on the allow-list still classifies as mutating. What this
 * removes is the noise that made a real skill file report ten "unrecognised
 * commands" that were glob patterns, and skip all twelve of its blocks.
 */
const COMMAND_NAME = /^[A-Za-z_.\/][\w.\/+-]*$/;

/** `git` subcommands that only read. Any other subcommand is mutating. */
const SAFE_GIT_SUBCOMMANDS = new Set([
  "cat-file",
  "describe",
  "diff",
  "log",
  "ls-files",
  "ls-remote",
  "ls-tree",
  "rev-list",
  "rev-parse",
  "show",
  "status",
]);

/**
 * Named dangers. These do not define the boundary — SAFE_COMMANDS does — but
 * they produce a precise reason for the cases worth naming.
 */
/**
 * Commands for which `-o` is NOT an output file: `grep` reads it as
 * `--only-matching` and `find` as the OR operator. Both are read-only.
 */
const O_FLAG_NOT_OUTPUT = new Set(["grep", "egrep", "fgrep", "rg", "find"]);

/** Prefixes that precede the real command without being it. */
const COMMAND_PREFIXES = new Set(["sudo", "env", "command", "nohup", "nice"]);

/**
 * Does any `sed` invocation in this block write a file?
 *
 * BUG-10 — bug.6 closed sed's `w` flag with `/\bsed\b[^\n|;&]*\bw\s+\S/`, which fires
 * only when a SPACE separates `w` from its filename. GNU sed does not require
 * one, so `sed 's/a/b/wpwned.txt' f` and six sibling spellings stayed runnable.
 *
 * A regex cannot close this, and that is the whole point. `w` means "write" in
 * FLAG position (after the closing delimiter of `s<D>…<D>…<D>`) and means the
 * letter w in PATTERN text, and `s/warning/x/` contains `/w` exactly as
 * `s/a/b/wfile` does. Anchoring on `/w` matches both — every pattern tried during
 * bug.6 false-positived on ordinary substitutions, which is why that rule was
 * left demanding a space. Position is the distinction, so the script has to be
 * walked rather than matched. Same shape as bug.6 root cause D.
 */
function sedWritesFile(segment) {
  const toks = segment.trim().split(/\s+/).filter(Boolean);
  const isSed = (t) =>
    t
      .replace(/['"\\]/g, "")
      .split("/")
      .pop() === "sed";
  // EVERY sed in the segment, not just the first: `sed 's/a/b/' | sed 'w /tmp/x'`
  // writes, and checking only the leading invocation would miss it.
  for (let sedAt = 0; sedAt < toks.length; sedAt += 1) {
    if (!isSed(toks[sedAt])) continue;
    if (sedInvocationWrites(toks, sedAt)) return true;
  }
  return false;
}

/** Collect the script(s) of ONE sed invocation starting at `sedAt` and test them. */
function sedInvocationWrites(toks, sedAt) {
  const scripts = [];
  for (let i = sedAt + 1; i < toks.length; i += 1) {
    const tok = toks[i];
    // `-f script.sed` — the script is a file we cannot read. The classifier
    // cannot say what it does, and "cannot say" is never "safe".
    if (tok === "-f" || tok === "--file" || /^--file=/.test(tok)) return true;
    if (tok === "-e" || tok === "--expression") {
      if (toks[i + 1] !== undefined) scripts.push(toks[i + 1]);
      i += 1;
      continue;
    }
    if (/^--expression=/.test(tok)) {
      scripts.push(tok.slice("--expression=".length));
      continue;
    }
    if (tok.startsWith("-")) continue; // -n, -i handled elsewhere, other flags
    // First non-flag operand is the script, unless -e already supplied one.
    if (scripts.length === 0) scripts.push(tok);
    break;
  }

  return scripts.some((raw) => scriptWrites(raw.replace(/^['"]|['"]$/g, "")));
}

/** Walk one sed script; true when it contains a `w`/`W` write in command or flag position. */
function scriptWrites(script) {
  let i = 0;
  const isWrite = (ch) => ch === "w" || ch === "W";
  while (i < script.length) {
    const ch = script[i];
    if (
      ch === ";" ||
      ch === "\n" ||
      ch === " " ||
      ch === "\t" ||
      ch === "{" ||
      ch === "}"
    ) {
      i += 1;
      continue;
    }
    // An address may precede the command: /re/, \cREc, $, a line number, or a range.
    if (ch === "/") {
      i += 1;
      while (i < script.length && script[i] !== "/") {
        if (script[i] === "\\") i += 1;
        i += 1;
      }
      i += 1; // closing delimiter
      while (i < script.length && /[0-9,$~+\s]/.test(script[i])) i += 1;
      continue;
    }
    if (/[0-9$,~+]/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === "s" && i + 1 < script.length) {
      const delim = script[i + 1];
      i += 2;
      let seen = 0;
      while (i < script.length && seen < 2) {
        if (script[i] === "\\") i += 1;
        else if (script[i] === delim) seen += 1;
        i += 1;
      }
      // Flags run to the end of this command.
      while (i < script.length && !";\n}".includes(script[i])) {
        if (isWrite(script[i])) return true;
        i += 1;
      }
      continue;
    }
    if (isWrite(ch)) return true; // `w file` / `wfile` in command position
    // Any other command: skip to the end of it.
    while (i < script.length && !";\n}".includes(script[i])) i += 1;
  }
  return false;
}

/**
 * Does any command in this block write a file via `-o`?
 *
 * BUG-6 root cause D — `-o` used to be matched as a bare string with no reference
 * to the command it belongs to, so `grep -o` and `find … -o` were refused. The
 * first attempt at scoping it was a regex with a negative lookahead, and it was
 * wrong twice over, which is why this is a function instead:
 *
 *  - `\s*` before a lookahead BACKTRACKS. At `| grep -o …` the engine tried the
 *    lookahead after the space, failed it, then retried with `\s*` empty — where
 *    `grep` no longer sits at the cursor, so the negative lookahead trivially
 *    succeeded and the exemption evaporated. It held only at zero-whitespace
 *    positions, which meant this repository's OWN documented `| grep -o …`
 *    snippet stayed refused.
 *  - A command substitution inherited its enclosing segment's exemption, so
 *    `find . -newer $(sort -o /tmp/pwned f)` was let through — a FAIL-OPEN newly
 *    created by the fix for an over-refusal. `$(`, backticks and grouping
 *    parentheses are therefore segment boundaries here.
 */
function hasOutputFlagWrite(text) {
  const segments = text.split(/\n|;|\|\||&&|\||&|\$\(|`|\(|\)|\{|\}/);
  for (const seg of segments) {
    if (!/\s-o(?:\s+|=)\S/.test(seg)) continue;
    const words = seg.trim().split(/\s+/).filter(Boolean);
    let i = 0;
    // Step over assignments and prefix commands to reach the real command name.
    while (
      i < words.length &&
      (COMMAND_PREFIXES.has(words[i]) || /^[A-Za-z_]\w*=/.test(words[i]))
    ) {
      i += 1;
    }
    const name = (words[i] || "")
      .replace(/['"\\]/g, "")
      .split("/")
      .pop();
    if (O_FLAG_NOT_OUTPUT.has(name)) continue;
    return true; // an unrecognised command with `-o` still fails closed
  }
  return false;
}

export const DENY_PATTERNS = [
  [/\bgh\s+pr\s+comment\b/, "gh pr comment"],
  [/\bgh\s+issue\b/, "gh issue"],
  [/\bgh\s+api\b[^\n]*\s(-X|--method)\b/, "gh api with method"],
  [
    /\bcurl\b[^\n]*\s(-X|--request)\s*(POST|PUT|PATCH|DELETE)\b/,
    "curl write method",
  ],
  [/\bgit\s+push\b/, "git push"],
  [/\bgit\s+commit\b/, "git commit"],
  [/\brm\s+-[A-Za-z]*[rf]/, "rm -rf"],
  // `-i` anywhere in a sed invocation, not only immediately after `sed`.
  // `sed 's/a/b/' -i file` and `sed -e 's/a/b/' -i file` both edit in place and
  // both slipped past a pattern anchored to the first argument.
  [/\bsed\b[^\n|;&]*\s-[A-Za-z]*i\b/, "sed -i"],
  [/\bsed\b[^\n|;&]*\s--in-place(=\S*)?\b/, "sed --in-place"],
  // Long-form output flags on otherwise read-only commands write files just as a
  // redirection does, and carry no `>` for WRITE_REDIRECT to catch.
  [/\s--output(=|\s)/, "--output flag"],
  // BUG-6 root cause D — sed writes a file through its `w` flag with neither `-i`
  // nor a redirection: `s/a/b/w FILE` as a substitute flag and `w FILE` as a
  // command. DENY_PATTERNS named only the `-i` spellings, so both slipped past.
  // CR-7: `find` is read-only until it is given an action that is not.
  [
    /\bfind\b[^\n]*\s-(delete|exec|execdir|ok|okdir|fls|fprint|fprintf)\b/,
    "find write action",
  ],
  // Other allow-listed commands with a write mode.
  [/\btee\b/, "tee"],
];

/**
 * The commands DENY_PATTERNS names for a flag or sub-command that writes. A
 * variable can carry that flag, so an argument whose literal prefix is empty or
 * starts with a dash (`$X`, `${X}`, `"$X"`, `-$X`, `"-${X}"`, `-$(…)`, a bare
 * `$(…)`) is refused on these (task.274, obs #67; T274-QA-2). A prefix that does
 * not start with a dash cannot make the argument a flag, so `docs/$X` and
 * `"task.${N}.*"` stay runnable.
 */
const VARIABLE_ARGUMENT_COMMANDS = new Set([
  "find",
  "sed",
  "rm",
  "curl",
  "gh",
  "git",
  "tee",
]);

/**
 * Whether an argument whose literal text before an expansion is `lead` could
 * become a flag: nothing before it, or a dash-led name the expansion can still
 * complete (`-`, `-$X`). `--since=$D` has its name fixed by the `=`, so the
 * expansion is only a value.
 */
function couldBeFlag(lead) {
  return lead === "" || (lead.startsWith("-") && !lead.includes("="));
}

/**
 * True when `word` holds an unquoted `$'…'` (ANSI-C) or `$"…"` (locale) opener.
 * Inside single or double quotes a `$` followed by a quote is plain text, and a
 * `$` that merely precedes a CLOSING quote (`'cost$'`, `"a$"`) is not an opener.
 */
function hasDecodedQuote(word) {
  let quote = null;
  for (let k = 0; k < word.length; k += 1) {
    const ch = word[k];
    if (quote === "'") {
      if (ch === "'") quote = null;
    } else if (quote === '"') {
      if (ch === "\\") k += 1;
      else if (ch === '"') quote = null;
    } else if (ch === "\\") {
      k += 1;
    } else if (ch === "$" && (word[k + 1] === "'" || word[k + 1] === '"')) {
      return true;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    }
  }
  return false;
}

/**
 * The first deny-listed command in `prose` that is given an argument that could
 * become a flag through a variable expansion, or null. Single quotes make `'$X'`
 * text, so it is not one. Walks each simple command of the prose-stripped text.
 */
function variableArgumentToDenyListed(prose) {
  const WORD = /(?:[^\s"'\\]|\\[\s\S]|"(?:[^"\\]|\\[\s\S])*"|'[^']*')+/g;
  // Command separators; a `$(` or backtick starts an inner command of its own.
  // The capture keeps each delimiter, so a segment knows whether a substitution
  // follows it (`find docs -$(echo delete)`: the flag is cut off by the split).
  const parts = prose.split(/(\n|;|&&|\|\||\||&|\$\(|`|\()/);
  for (let p = 0; p < parts.length; p += 2) {
    const segment = parts[p];
    const next = parts[p + 1];
    const words = segment.match(WORD) ?? [];
    let i = 0;
    // Leading assignments, keywords and `command` are not the command.
    while (
      i < words.length &&
      (/^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(words[i]) ||
        /^(if|elif|while|until|then|else|do|!|\{|command)$/.test(words[i]))
    )
      i += 1;
    const name = (words[i] ?? "")
      .replace(/['"\\]/g, "")
      .split("/")
      .pop();
    if (!VARIABLE_ARGUMENT_COMMANDS.has(name)) continue;
    for (const arg of words.slice(i + 1)) {
      // `$'-delete'` and `$"-delete"` are decoded by the shell, and the scan does
      // not decode them: refuse the argument rather than guess (T274-QA-4).
      if (hasDecodedQuote(arg)) return name;
      if (!/\$(?:\{|[A-Za-z_@*#?0-9])/.test(arg)) continue;
      // Refuse unless a literal prefix is known not to be a flag: `docs/$X` is
      // a path, `-$X` and `"-${X}"` are flags once the shell expands them.
      const lead = arg.slice(0, arg.search(/\$/)).replace(/['"\\]/g, "");
      if (couldBeFlag(lead)) return name;
    }
    // A substitution that follows this segment is part of its last argument
    // (`-$(…)`), or a whole argument of its own (`find docs $(…)`).
    if (next === "$(" || next === "`") {
      const tail =
        segment.endsWith(" ") || segment.endsWith("\t")
          ? ""
          : (segment.split(/\s+/).pop() ?? "");
      const lead = tail.replace(/['"\\]/g, "");
      if (words.length > i + 1 || tail === "") {
        if (couldBeFlag(lead)) return name;
      }
    }
  }
  return null;
}

// ── task.289: the flag allow-list ─────────────────────────────────────────────
//
// `SAFE_COMMANDS` decides which COMMANDS may run; this decides which FLAGS and how
// many OPERANDS each may carry. DENY_PATTERNS can only name what somebody thought
// to forbid, and every gap task 274 left open was a flag nobody had: a program
// run by `sort --compress-program`, a file written by `find -fprint0`, a shell
// command run by sed's `e`, a file written through `uniq in out`. A flag outside
// its command's entry is refused, so a new spelling cannot run.
//
// DENY_PATTERNS and the shape-4 scan stay BESIDE this table (task.289 Phase 2):
// they are the second line for the commands the table covers and the only line
// for the ones it does not (`git`, `gh`, `rm`, `curl`, `tee`), and their reasons
// are pinned by tests. The table is consulted after them.

/** An entry whose every flag has been read and none writes or runs a program. */
const ANY_FLAG = (why) => ({ any: true, why });

/**
 * One entry per `SAFE_COMMANDS` member (a member with no entry is refused).
 *
 * `short`/`shortValue`: single-letter flags without/with a value. `long`/
 * `longValue`: long names without/with a value (`--name=value` or `--name value`).
 * `numeric`: `-5` is allowed (`head -5`). `maxOperands`: positional operands.
 * `why` records the audit. An exact long name only: GNU getopt accepts an
 * abbreviation (`--comp=x`), and an abbreviation is not on the list, so it is
 * refused rather than guessed at.
 */
export const SAFE_FLAGS = {
  basename: ANY_FLAG("prints a path component; no write or exec flag"),
  cat: ANY_FLAG("copies to stdout; no write or exec flag"),
  comm: ANY_FLAG(
    "compares two sorted files to stdout; --output-delimiter is a string",
  ),
  cut: ANY_FLAG("selects fields to stdout; no write or exec flag"),
  date: {
    short: "uIR",
    shortValue: "dr",
    // `date 01011200` sets the clock as `-s` does; only a `+FORMAT` is read-only.
    operandRe: /^\+/,
    long: ["utc", "universal", "rfc-email", "iso-8601", "rfc-3339"],
    longValue: ["date", "reference"],
    why: "-s/--set changes the clock and -f reads a file of dates: both left out",
  },
  diff: {
    short: "abBdEiNnpqrsTtuwyZ",
    shortValue: "UCFILxW",
    long: [
      "brief",
      "report-identical-files",
      "context",
      "unified",
      "recursive",
      "new-file",
      "text",
      "ignore-case",
      "ignore-space-change",
      "ignore-all-space",
      "ignore-blank-lines",
      "ignore-tab-expansion",
      "strip-trailing-cr",
      "side-by-side",
      "minimal",
      "speed-large-files",
      "expand-tabs",
      "initial-tab",
      "show-c-function",
      "color",
      "suppress-common-lines",
      "left-column",
      "normal",
      "no-dereference",
    ],
    longValue: [
      "label",
      "ignore-matching-lines",
      "exclude",
      "width",
      "tabsize",
      "show-function-line",
      "unified-context",
    ],
    // No `diff` flag writes a file or runs a program of the caller's choosing
    // (`-l` runs `pr`, a fixed formatter found on PATH), so a variable that
    // becomes one is harmless; it is why `diff "$A" "$B"` stays readable.
    expansionOk: true,
    why: "-l/--paginate runs `pr`; --to-file and -X read files: left out",
  },
  dirname: ANY_FLAG("prints a path component; no write or exec flag"),
  echo: ANY_FLAG("prints its arguments; no write or exec flag"),
  egrep: ANY_FLAG("searches files to stdout; no write or exec flag"),
  false: ANY_FLAG("exits 1 and takes no flag that writes or runs a program"),
  fgrep: ANY_FLAG("searches files to stdout; no write or exec flag"),
  file: {
    short: "bhiIkLNnpsz",
    shortValue: "F",
    long: [
      "brief",
      "mime",
      "mime-type",
      "mime-encoding",
      "dereference",
      "no-dereference",
      "keep-going",
      "raw",
      "no-buffer",
      "special-files",
      "uncompress",
      "preserve-date",
    ],
    longValue: ["separator"],
    why: "-C compiles a magic file to disk, -m names one, -f reads a list: left out",
  },
  find: {
    why: "-delete/-exec/-execdir/-ok/-okdir run or remove, -fls/-fprint/-fprint0/-fprintf write: left out; see FIND_BARE and FIND_VALUE",
  },
  grep: ANY_FLAG("searches files to stdout; no write or exec flag"),
  head: ANY_FLAG("prints the start of a file; no write or exec flag"),
  jq: ANY_FLAG(
    "filters JSON to stdout; a program cannot write a file or run one",
  ),
  ls: ANY_FLAG("lists to stdout; no write or exec flag"),
  printf: ANY_FLAG(
    "formats to stdout; `-v` (assigns a variable) is caught by assignmentHazard",
  ),
  pwd: ANY_FLAG("prints the directory; -L and -P change only the spelling"),
  readlink: ANY_FLAG("prints a link target; -m and -f create nothing"),
  realpath: ANY_FLAG("prints a resolved path; creates nothing"),
  sed: {
    short: "nErsuz",
    long: [
      "quiet",
      "silent",
      "regexp-extended",
      "separate",
      "null-data",
      "unbuffered",
      "posix",
    ],
    why: "-i/--in-place edit files, -f/--file read a script that is not read here, -l and --follow-symlinks are unused; the script (first operand, -e, --expression) is parsed by sedScriptSafe",
  },
  seq: ANY_FLAG("prints numbers; -f/-s/-w only shape the output"),
  sort: {
    short: "bcCdfghiMmnRrsuVz",
    shortValue: "kt",
    long: [
      "ignore-leading-blanks",
      "dictionary-order",
      "ignore-case",
      "general-numeric-sort",
      "ignore-nonprinting",
      "month-sort",
      "human-numeric-sort",
      "numeric-sort",
      "reverse",
      "version-sort",
      "check",
      "merge",
      "stable",
      "unique",
      "zero-terminated",
      "debug",
    ],
    longValue: ["key", "field-separator", "sort"],
    why: "-o/--output write a file, --compress-program runs a program, -T names a directory: left out",
  },
  stat: ANY_FLAG("prints file status; no write or exec flag"),
  tail: {
    short: "qvz",
    shortValue: "cn",
    numeric: true,
    long: ["quiet", "silent", "verbose", "zero-terminated"],
    longValue: ["bytes", "lines"],
    // `tail` has no flag that writes or runs a program, so a variable that
    // becomes one is a hang at worst, which the block timeout ends.
    expansionOk: true,
    why: "-f/-F/--follow never return and --pid waits: left out",
  },
  test: ANY_FLAG("evaluates a condition; its `-x` tokens are operators"),
  tr: ANY_FLAG("translates stdin to stdout"),
  true: ANY_FLAG("exits 0 and takes no flag that writes or runs a program"),
  uniq: {
    short: "cdDiuz",
    shortValue: "fsw",
    long: [
      "count",
      "repeated",
      "all-repeated",
      "ignore-case",
      "unique",
      "zero-terminated",
      "group",
    ],
    longValue: ["skip-fields", "skip-chars", "check-chars"],
    maxOperands: 1,
    why: "a second operand is the OUTPUT file (`uniq in out` writes it)",
  },
  wc: ANY_FLAG("counts; --files0-from reads a list of names"),
};

/** `find`'s expressions that take no value, and those that take one. */
const FIND_BARE = new Set([
  "-print",
  "-print0",
  "-ls",
  "-prune",
  "-quit",
  "-true",
  "-false",
  "-empty",
  "-readable",
  "-writable",
  "-executable",
  "-nouser",
  "-nogroup",
  "-depth",
  "-xdev",
  "-mount",
  "-noleaf",
  "-daystart",
  "-follow",
  "-not",
  "-and",
  "-or",
  "-a",
  "-o",
  "-ignore_readdir_race",
  "-noignore_readdir_race",
  "-H",
  "-L",
  "-P",
]);
const FIND_VALUE = new Set([
  "-name",
  "-iname",
  "-path",
  "-ipath",
  "-wholename",
  "-iwholename",
  "-regex",
  "-iregex",
  "-lname",
  "-ilname",
  "-type",
  "-xtype",
  "-maxdepth",
  "-mindepth",
  "-mtime",
  "-mmin",
  "-atime",
  "-amin",
  "-ctime",
  "-cmin",
  "-newer",
  "-anewer",
  "-cnewer",
  "-size",
  "-perm",
  "-user",
  "-group",
  "-uid",
  "-gid",
  "-links",
  "-inum",
  "-samefile",
  "-printf",
  "-regextype",
  "-used",
  "-fstype",
]);

/**
 * `tok` as the shell passes it to the command, with each expansion standing in as
 * `X`: single quotes are literal, double quotes keep `$` and a few escapes, and an
 * unquoted backslash escapes the next character. `firstExp` is where the first
 * expansion sits in `text` (-1: none), `names` are the variables read, and
 * `dynamic` is set for a command substitution, a backtick or arithmetic, whose
 * output the scan cannot know.
 */
function shellWord(tok, resolve = null) {
  let text = "";
  let q = null;
  let firstExp = -1;
  let dynamic = false;
  const names = new Set();
  for (let k = 0; k < tok.length; k += 1) {
    const ch = tok[k];
    if (q === "'") {
      if (ch === "'") q = null;
      else text += ch;
      continue;
    }
    if (ch === "\\") {
      if (q === '"' && !'$`"\\\n'.includes(tok[k + 1] ?? "")) text += ch;
      else if (k + 1 < tok.length) {
        k += 1;
        if (tok[k] !== "\n") text += tok[k];
      }
      continue;
    }
    if (ch === "'" && q === null) {
      q = "'";
      continue;
    }
    if (ch === '"') {
      q = q === '"' ? null : '"';
      continue;
    }
    if (ch === "`") {
      dynamic = true;
      if (firstExp < 0) firstExp = text.length;
      text += "X";
      continue;
    }
    if (ch === "$") {
      const rest = tok.slice(k + 1);
      let m;
      // An unquoted `$'…'` (ANSI-C) or `$"…"` (locale) word is decoded by the shell
      // before the command sees it (`$'-o'` is `-o`, `$'-\157'` too), and this reader
      // does not decode it: it is an expansion whose value is unknown, so a flag
      // spelled that way is refused where a flag may stand, as `$X` is.
      if (q === null && (rest.startsWith("'") || rest.startsWith('"'))) {
        dynamic = true;
        if (firstExp < 0) firstExp = text.length;
        text += "X";
        const close = rest[0];
        let j = 1;
        while (j < rest.length && rest[j] !== close)
          j += rest[j] === "\\" ? 2 : 1;
        k += 1 + j;
        continue;
      }
      if (rest.startsWith("(")) {
        dynamic = true;
        if (firstExp < 0) firstExp = text.length;
        text += "X";
        // Skip to the matching paren so the inner text is not read as the word.
        let depth = 0;
        for (; k < tok.length; k += 1) {
          if (tok[k] === "(") depth += 1;
          if (tok[k] === ")" && (depth -= 1) === 0) break;
        }
        continue;
      }
      let value = null;
      if (rest.startsWith("{")) {
        // EVERY `${…}` is an expansion, whatever it holds: `${1}`, `${!X}`,
        // `${#A}`, `${@:1}` as much as `${NAME}`. Listing the spellings that name a
        // variable left the others as literal text, so a flag they carried was
        // never seen (QA 3). Only `${NAME}` alone has a value this reader can say.
        const end = rest.indexOf("}");
        const inner = end < 0 ? rest.slice(1) : rest.slice(1, end);
        const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(inner);
        if (id) names.add(id[0]);
        if (id && id[0] === inner && resolve) value = resolve(id[0]);
        k += end < 0 ? rest.length : end + 1;
      } else if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) {
        names.add(m[0]);
        if (resolve) value = resolve(m[0]);
        k += m[0].length;
      } else if ((m = /^[0-9@*#?$!-]/.exec(rest))) {
        k += 1;
      } else {
        text += ch;
        continue;
      }
      if (firstExp < 0) firstExp = text.length;
      text += value ?? "X";
      continue;
    }
    text += ch;
  }
  return { text, firstExp, names, dynamic };
}

/** `tok` with every quoted or escaped span removed: what the shell still expands. */
function bareOf(tok) {
  let out = "";
  let q = null;
  for (let k = 0; k < tok.length; k += 1) {
    const ch = tok[k];
    if (q === "'") {
      if (ch === "'") q = null;
    } else if (q === '"') {
      if (ch === "\\") k += 1;
      else if (ch === '"') q = null;
    } else if (ch === "\\") k += 1;
    else if (ch === "'" || ch === '"') q = ch;
    else out += ch;
  }
  return out;
}

/** The variables the block assigns (`NAME=value`) and the values it gives them. */
function assignedVariables(prose) {
  const out = new Map();
  const re =
    /(?:^|[\s;&|(])(?:(?:export|local|readonly|declare|typeset)\s+)?([A-Za-z_][A-Za-z0-9_]*)\+?=("(?:[^"\\]|\\[\s\S])*"|'[^']*'|[^\s;&|)]*)/g;
  for (const m of prose.matchAll(re)) {
    const list = out.get(m[1]) ?? [];
    list.push(m[2]);
    out.set(m[1], list);
  }
  // `for NAME in a b c; do`: each word is a value, when every word is a plain
  // literal. A glob, a brace or an expansion in the list gives names the scan
  // cannot read (`$` marks the value as unreadable).
  for (const m of prose.matchAll(
    /\bfor\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([^;\n]*?)\s*(?:;|\n)\s*do\b/g,
  )) {
    const list = out.get(m[1]) ?? [];
    for (const word of m[2].split(/\s+/).filter(Boolean))
      list.push(/[$`*?[{]/.test(word) ? "$" : word.replace(/^['"]|['"]$/g, ""));
    out.set(m[1], list);
  }
  return out;
}

/**
 * Whether a variable the block assigns could hold more than one word, or a flag
 * the scan cannot read. A value the CALLER binds is the caller's; a value this
 * block assigns is read here, and an unquoted `$NAME` whose value holds
 * whitespace, or comes from a substitution, word-splits into extra arguments.
 */
function unsafeAssignment(values) {
  return values.some((v) => /\s|\$|`/.test(v));
}

/**
 * A sed script made only of commands that read, print, branch or substitute.
 * Everything else is refused, and so is a script that cannot be parsed to the
 * end: `e` runs a shell command (`1e cmd`, `s/a/b/e`), `w`/`W` write a file, and
 * `r`/`R`/`f`/`F`/`v` are not needed. A bracket expression protects the
 * delimiter inside it, as POSIX sed reads it.
 *
 * `sedScriptVerdict` tells a script that is READ AND FORBIDDEN (`forbidden`: an
 * `e`, `w`, `r`... command or `s` flag, which a valid script would act on) from
 * one the scan cannot read (`unreadable`). An invalid script makes sed exit before
 * it runs anything, so only a forwarded argument, which may be a path and not a
 * script at all, is allowed the second.
 */
export function sedScriptVerdict(s) {
  let forbidden = false;
  const ok = sedScan(s, () => {
    forbidden = true;
  });
  return ok ? "safe" : forbidden ? "forbidden" : "unreadable";
}

export const sedScriptSafe = (s) => sedScriptVerdict(s) === "safe";

function sedScan(s, markForbidden) {
  let i = 0;
  const n = s.length;
  const skipBlank = () => {
    while (i < n && (s[i] === " " || s[i] === "\t")) i += 1;
  };
  // Index after the closing `d` of a delimited part, or -1.
  const readPart = (d, isRegex) => {
    while (i < n) {
      const ch = s[i];
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "\n" && isRegex) return -1;
      if (isRegex && ch === "[") {
        i += 1;
        if (s[i] === "^") i += 1;
        if (s[i] === "]") i += 1;
        while (i < n && s[i] !== "]") {
          if (s[i] === "[" && /[:.=]/.test(s[i + 1] ?? "")) {
            const close = s.indexOf(`${s[i + 1]}]`, i + 2);
            if (close < 0) return -1;
            i = close + 2;
          } else i += 1;
        }
        if (i >= n) return -1;
        i += 1;
        continue;
      }
      i += 1;
      if (ch === d) return i;
    }
    return -1;
  };
  const address = () => {
    if (/[0-9]/.test(s[i] ?? "")) {
      while (/[0-9]/.test(s[i] ?? "")) i += 1;
      if (s[i] === "~") {
        i += 1;
        while (/[0-9]/.test(s[i] ?? "")) i += 1;
      }
      return true;
    }
    if (s[i] === "$") {
      i += 1;
      return true;
    }
    if (s[i] === "/" || s[i] === "\\") {
      let d = "/";
      if (s[i] === "\\") {
        d = s[i + 1];
        if (!d || d === "\n" || d === "\\") return null;
        i += 2;
      } else i += 1;
      if (readPart(d, true) < 0) return null;
      while (s[i] === "I" || s[i] === "M") i += 1;
      return true;
    }
    return false;
  };
  const cmdEnd = () => {
    skipBlank();
    const c = s[i];
    return c === undefined || /[\n;}#]/.test(c);
  };
  const toLineEnd = () => {
    while (i < n && s[i] !== "\n") {
      if (s[i] === "\\") i += 1;
      i += 1;
    }
  };
  for (;;) {
    while (i < n && /[\s;]/.test(s[i])) i += 1;
    if (i >= n) return true;
    let a = address();
    if (a === null) return false;
    skipBlank();
    if (a && s[i] === ",") {
      i += 1;
      skipBlank();
      if (s[i] === "+" || s[i] === "~") i += 1;
      a = address();
      if (a === null || a === false) return false;
      skipBlank();
    }
    while (s[i] === "!") {
      i += 1;
      skipBlank();
    }
    const cmd = s[i];
    i += 1;
    if (cmd === undefined) return false;
    if (cmd === "{" || cmd === "}") continue;
    // A command takes nothing after it but a separator: GNU sed rejects `pe x` as
    // "extra characters after command" and runs nothing, so `hello` is not an `h`
    // followed by an `e` command, it is unreadable (and harmless).
    if ("pdDgGhHnNxP=z".includes(cmd)) {
      if (!cmdEnd()) return false;
      continue;
    }
    if ("qQlL".includes(cmd)) {
      while (/[0-9 ]/.test(s[i] ?? "")) i += 1;
      if (!cmdEnd()) return false;
      continue;
    }
    if (cmd === "#") {
      // A comment ends at the FIRST newline. GNU sed does not read a backslash
      // before it as a continuation (that is a/i/c text), so `#c\<newline>e x`
      // is a comment and then an `e` command, which toLineEnd() would swallow.
      while (i < n && s[i] !== "\n") i += 1;
      continue;
    }
    if (cmd === ":" || "btT".includes(cmd)) {
      // GNU sed ends a label at whitespace or `;`, and reads what follows as the
      // next command (`:a e echo x` runs `e`). So the label is one word, and only a
      // separator or the end of the script may follow it: anything else is a script
      // this scan does not read, which is refused, never skipped over.
      while (i < n && (s[i] === " " || s[i] === "\t")) i += 1;
      while (i < n && !/[\s;]/.test(s[i])) i += 1;
      while (i < n && (s[i] === " " || s[i] === "\t")) i += 1;
      if (i < n && s[i] !== "\n" && s[i] !== ";") return false;
      continue;
    }
    if ("aic".includes(cmd)) {
      toLineEnd();
      continue;
    }
    if (cmd === "s") {
      const d = s[i];
      if (!d || d === "\n" || d === "\\") return false;
      i += 1;
      if (readPart(d, true) < 0) return false;
      if (readPart(d, false) < 0) return false;
      for (;;) {
        const f = s[i];
        if (f === undefined || /[\s;}#]/.test(f)) break;
        if (/[gpiImM0-9]/.test(f)) {
          i += 1;
          continue;
        }
        if (/[ewW]/.test(f)) markForbidden();
        return false; // `e`, `w`, and any flag not read
      }
      continue;
    }
    if (cmd === "y") {
      const d = s[i];
      if (!d || d === "\n" || d === "\\") return false;
      i += 1;
      if (readPart(d, false) < 0) return false;
      if (readPart(d, false) < 0) return false;
      if (!cmdEnd()) return false;
      continue;
    }
    if ("efFrRwWv".includes(cmd)) markForbidden();
    return false;
  }
}

// ── The lexical layer: one tokenizer (task.292) ───────────────────────────────

/**
 * How bash reads a block into words, quotes, escapes, comments, substitutions and heredocs —
 * once. Every scan that needs a lexical fact reads it from here instead of re-deriving it.
 *
 * Bash's rules, as encoded:
 * - Blanks are space, tab and newline. Nothing else separates words: CR, FF, VT, NBSP and every
 *   Unicode space are word characters (T290-QA-3 was a scan that thought they were blanks).
 * - Outside quotes a backslash quotes the next character, and backslash-newline is a line join.
 *   Reading left to right is what makes an even run of backslashes (escaped backslashes) differ
 *   from an odd one: no parity is counted anywhere.
 * - Inside double quotes a backslash escapes the next character (only `$`, backtick, `"`, `\` and
 *   newline are special there, and every other escaped character is inert either way). Inside
 *   single quotes nothing is special.
 * - A `#` starts a comment only at the start of a word: at the start of the text, or after a
 *   blank, newline, `;`, `&`, `|` or `(`. After any other operator the scan reads the `#` as a
 *   word character, which leaves the rest of the line to be scanned as code (the safe side).
 * - `$(`, `<(`, `>(` and backtick open a substitution whose body is code again; they nest on an
 *   explicit stack, so a deep nest is bounded by the heap and not the call stack.
 * - `<<WORD` and `<<-WORD` start a heredoc whose body is data, from the next line to the line
 *   that is the terminator.
 *
 * A shape this does not model throws `Error("tokenize: …")`, and `classifyFailClosed` reads a
 * throw as `mutating`: an unterminated quote, substitution or `${…}`, a single quote inside a
 * double-quoted `${…}`, a heredoc form other than a plain word, a heredoc inside a substitution,
 * and a nest deeper than `MAX_TOKEN_DEPTH`.
 *
 * `${…}` has a frame of its own (its body is read for quotes, escapes and nested expansions, so
 * `${n#"${n%%[!0]*}"}` is one piece). An unquoted heredoc body is read as a double-quoted string
 * (bash expands it), so a `$(…)` in it is a `subst` token, whose commands the scans judge.
 *
 * Tokens (all spans are `[start, end)` into the text; sorted by `start`):
 * - `comment`: the `#` to the end of the line, newline excluded.
 * - `join`: a backslash-newline that bash removes before it reads a word.
 * - `quote`: a single- or double-quoted span, quotes included; `quote` is the quote character.
 * - `subst`: a substitution, `form` one of `"$("`, `"<("`, `">("` or "`"; `depth` is the number of
 *   substitutions around it (0: outermost) and `inDouble` whether a double quote directly
 *   encloses it.
 * - `heredoc-op`: the `<<` or `<<-`.
 * - `heredoc-body`: the body lines and the terminator line, with the newline that ends it.
 */
export const MAX_TOKEN_DEPTH = 100000;

const TOKEN_CACHE = new Map();
const TOKEN_CACHE_MAX = 64;

/** The tokens of `code`, or a thrown refusal. Memoised: the scans ask about the same text repeatedly. */
export function tokenize(code) {
  const cached = TOKEN_CACHE.get(code);
  if (cached) return cached;
  const result = lexBash(code);
  if (TOKEN_CACHE.size >= TOKEN_CACHE_MAX)
    TOKEN_CACHE.delete(TOKEN_CACHE.keys().next().value);
  TOKEN_CACHE.set(code, result);
  return result;
}

// Frame kinds: the top level, a `$(`/`<(`/`>(` body, a backtick body, a double-quoted span, a `${…}` body.
const F_CODE = 0;
const F_PAREN = 1;
const F_TICK = 2;
const F_DQ = 3;
const F_PARAM = 4;

function lexBash(code) {
  const n = code.length;
  const tokens = [];
  const stack = [{ t: F_CODE, tok: null, d: 0 }];
  const refuse = (why) => {
    throw new Error(`tokenize: ${why}`);
  };
  // An escaped quote outside quotes is a literal in bash and the tokenizer reads it as one, but
  // reading it makes the block `task.83.bug.1…md:102` runnable where the scan refused it before
  // (task.290 docs scan), and a lexical refactor may not widen what QA executes. So it is refused
  // here, on purpose; widening it is a separate, reviewed decision.
  const refuseEscapedQuote = (next) => {
    if (next === "'" || next === '"') refuse("escaped quote outside quotes");
  };
  const push = (t, tok, d = 0) => {
    if (stack.length >= MAX_TOKEN_DEPTH) refuse("nesting too deep");
    stack.push({ t, tok, d });
  };
  // Substitutions around the current position: the depth a new `subst` token carries.
  let substDepth = 0;
  // Heredocs opened on the current line, whose bodies start at its newline.
  let pending = [];
  // True when the next character would begin a word.
  let wordStart = true;
  // Inside an arithmetic command `(( … ))` (code frame only): `<<` is a left shift there.
  // `arithInner` counts the single parentheses opened inside it.
  let arith = 0;
  let arithInner = 0;
  let i = 0;

  // `$((` opens arithmetic expansion, where a `$(` or a backtick still runs a command. The command
  // scan removes an arithmetic expansion with a pattern that ends at the first `)`, which erased a
  // nested substitution with it: `echo $((1+$(touch W)))` read as runnable while bash wrote
  // (task 292, QA cycle 2). Arithmetic is not modelled, so a body that holds either is refused here,
  // where every caller sees it. The scan stops at the first hit, so a run of `$((` is not quadratic.
  const refuseArithSubst = (at) => {
    let depth = 0;
    for (let j = at + 2; j < n; j += 1) {
      const ch = code[j];
      if (ch === "(") depth += 1;
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) return;
      } else if (ch === "`" || (ch === "$" && code[j + 1] === "(")) {
        refuse("command substitution inside $(( ))");
      }
    }
  };

  const openSubst = (form, at, width) => {
    if (form === "$(" && code[at + 2] === "(") refuseArithSubst(at);
    const f = stack[stack.length - 1];
    const tok = {
      kind: "subst",
      form,
      start: at,
      end: -1,
      depth: substDepth,
      inDouble: f.t === F_DQ || (f.t === F_PARAM && f.inDq === true),
    };
    tokens.push(tok);
    push(form === "`" ? F_TICK : F_PAREN, tok, 1);
    substDepth += 1;
    i = at + width;
    wordStart = true; // the body is a fresh command list
  };

  const closeFrame = (end) => {
    const f = stack.pop();
    if (f.tok) f.tok.end = end;
    if (f.t === F_PAREN || f.t === F_TICK) substDepth -= 1;
  };

  // `${…}` opens a frame of its own: its body is read for quotes, escapes and nested expansions,
  // and ends at the `}` that is not hidden by them. It makes no token (no scan asks about it).
  const openParam = (at) => {
    const f = stack[stack.length - 1];
    if (stack.length >= MAX_TOKEN_DEPTH) refuse("nesting too deep");
    stack.push({
      t: F_PARAM,
      tok: null,
      d: 0,
      inDq: f.t === F_DQ || (f.t === F_PARAM && f.inDq === true),
    });
    i = at + 2;
  };

  const readHeredocOpener = (at) => {
    let p = at + 2;
    const strip = code[p] === "-";
    if (strip) p += 1;
    while (code[p] === " " || code[p] === "\t") p += 1;
    const escaped = code[p] === "\\";
    if (escaped) p += 1;
    const q = code[p] === "'" || code[p] === '"' ? code[p++] : "";
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(code.slice(p, p + 256));
    if (!m) refuse("heredoc delimiter is not a plain word");
    p += m[0].length;
    if (q !== "") {
      if (code[p] !== q) refuse("heredoc delimiter quote does not close");
      p += 1;
    }
    tokens.push({
      kind: "heredoc-op",
      start: at,
      end: at + 2 + (strip ? 1 : 0),
    });
    // Escaping or quoting any part of the delimiter makes the body literal.
    pending.push({ delim: m[0], quoted: q !== "" || escaped });
    return p;
  };

  const readHeredocBodies = (from) => {
    let p = from;
    for (const h of pending) {
      const bodyStart = p;
      let textEnd = p; // the end of the body proper, terminator line excluded
      // No terminator before the end of the text: the body runs to the end, as bash reads it.
      while (p < n) {
        const eol = code.indexOf("\n", p);
        const line = code.slice(p, eol < 0 ? n : eol);
        const lineStart = p;
        p = eol < 0 ? n : eol + 1;
        if (line.trim() === h.delim) {
          textEnd = lineStart;
          break;
        }
        textEnd = p;
      }
      tokens.push({ kind: "heredoc-body", start: bodyStart, end: p });
      if (!h.quoted && textEnd > bodyStart) {
        // An unquoted body is expanded like a double-quoted string: `$(…)`, backticks and `${…}`
        // in it run. Read it as one, with its `"` neutralised (a quote is a literal there), and
        // keep only the substitutions it holds.
        const body = code.slice(bodyStart, textEnd).replace(/"/g, "x");
        for (const t of lexBash(`"${body}"`).tokens)
          if (t.kind === "subst" || t.kind === "join")
            tokens.push({
              ...t,
              start: t.start + bodyStart - 1,
              end: t.end + bodyStart - 1,
            });
      }
    }
    pending = [];
    return p;
  };

  while (i < n) {
    const f = stack[stack.length - 1];
    const c = code[i];

    if (f.t === F_DQ) {
      if (c === "\\") {
        if (i + 1 >= n) refuse("unterminated double quote");
        if (code[i + 1] === "\n")
          tokens.push({ kind: "join", start: i, end: i + 2 });
        i += 2;
      } else if (c === '"') {
        closeFrame(i + 1);
        i += 1;
        wordStart = false;
      } else if (c === "$" && code[i + 1] === "(") {
        openSubst("$(", i, 2);
      } else if (c === "$" && code[i + 1] === "{") {
        openParam(i);
      } else if (c === "`") {
        openSubst("`", i, 1);
      } else i += 1;
      continue;
    }

    if (f.t === F_PARAM) {
      if (c === "\\") {
        if (i + 1 >= n) refuse("unterminated ${");
        if (!f.inDq) refuseEscapedQuote(code[i + 1]);
        i += 2;
      } else if (c === "}") {
        closeFrame(i + 1);
        i += 1;
        wordStart = false;
      } else if (c === "$" && code[i + 1] === "(") {
        openSubst("$(", i, 2);
      } else if (c === "$" && code[i + 1] === "{") {
        openParam(i);
      } else if (c === "`") {
        openSubst("`", i, 1);
      } else if (c === '"') {
        const tok = { kind: "quote", quote: '"', start: i, end: -1 };
        tokens.push(tok);
        push(F_DQ, tok);
        i += 1;
      } else if (c === "'") {
        // Inside a double-quoted `${…}` a single quote is a literal in some operators and a quote
        // in others; the scan does not guess.
        if (f.inDq)
          refuse("single quote inside a double-quoted parameter expansion");
        const j = code.indexOf("'", i + 1);
        if (j < 0) refuse("unterminated single quote");
        tokens.push({ kind: "quote", quote: "'", start: i, end: j + 1 });
        i = j + 1;
      } else i += 1;
      continue;
    }

    // Code: the top level, or the body of a substitution.
    switch (c) {
      case "\\": {
        if (code[i + 1] === "\n") {
          // The join leaves `wordStart` as it was: `a\<LF>#` is one word, `a \<LF>#` a comment.
          tokens.push({ kind: "join", start: i, end: i + 2 });
          i += 2;
        } else {
          refuseEscapedQuote(code[i + 1]);
          i += i + 1 < n ? 2 : 1;
          wordStart = false;
        }
        break;
      }
      case "'": {
        const j = code.indexOf("'", i + 1);
        if (j < 0) refuse("unterminated single quote");
        tokens.push({ kind: "quote", quote: "'", start: i, end: j + 1 });
        i = j + 1;
        wordStart = false;
        break;
      }
      case '"': {
        const tok = { kind: "quote", quote: '"', start: i, end: -1 };
        tokens.push(tok);
        push(F_DQ, tok);
        i += 1;
        wordStart = false;
        break;
      }
      case "`": {
        if (f.t === F_TICK) {
          closeFrame(i + 1);
          i += 1;
          wordStart = false;
        } else openSubst("`", i, 1);
        break;
      }
      case "$": {
        const next = code[i + 1];
        if (next === "(") openSubst("$(", i, 2);
        else if (next === "[") {
          // The legacy arithmetic form `$[ … ]`. Arithmetic is not modelled, and inside it `<<` is
          // a left shift, not a heredoc opener: reading it as one hid the lines up to the delimiter
          // from every scan while bash ran them (task 292, QA cycle 1). Refuse, never guess.
          refuse("legacy arithmetic $[");
        } else if (next === "{") {
          openParam(i);
          wordStart = false;
        } else if (next === "'") {
          // $'…': a single-quoted span in which a backslash escapes the next character.
          let j = i + 2;
          while (j < n && code[j] !== "'") j += code[j] === "\\" ? 2 : 1;
          if (j >= n) refuse("unterminated $'");
          tokens.push({ kind: "quote", quote: "$'", start: i, end: j + 1 });
          i = j + 1;
          wordStart = false;
        } else {
          i += 1;
          wordStart = false;
        }
        break;
      }
      case "(": {
        // `((` is bash's arithmetic command, where `<<` is a left shift, not a heredoc opener.
        // A subshell inside a subshell is written `( (`, so two adjacent parentheses in code are
        // arithmetic and are not modelled (task 292, QA cycle 1: the differential found
        // `((` + `$()$()<<z` + `))` hiding a writer behind a mis-read heredoc).
        if (f.t === F_CODE && arith > 0) {
          arithInner += 1;
        } else if (f.t === F_CODE && code[i + 1] === "(") {
          arith = 1;
          arithInner = 0;
          i += 2;
          wordStart = true;
          break;
        }
        if (f.t === F_PAREN) f.d += 1;
        i += 1;
        wordStart = true;
        break;
      }
      case ")": {
        if (f.t === F_CODE && arith > 0) {
          if (arithInner > 0) arithInner -= 1;
          else if (code[i + 1] === ")") {
            arith = 0;
            i += 1; // the second `)` is consumed below
          }
        }
        if (f.t === F_PAREN && (f.d -= 1) === 0) {
          closeFrame(i + 1);
          wordStart = false;
        } else wordStart = false;
        i += 1;
        break;
      }
      case "<": {
        if (code[i + 1] === "<") {
          if (code[i + 2] === "<") {
            i += 3; // here-string
            wordStart = false;
          } else {
            if (f.t !== F_CODE) refuse("heredoc inside a substitution");
            if (arith > 0) refuse("<< inside an arithmetic command");
            // `name[1<<z]=…`: inside an assignment subscript `<<` is a left shift too. A `[` that
            // opens the current word and is not yet closed means the word may be a subscript.
            let w = i;
            while (w > 0 && !/[ \t\n;&|()<>`]/.test(code[w - 1])) w -= 1;
            const word = code.slice(w, i);
            if (word.lastIndexOf("[") > word.lastIndexOf("]"))
              refuse("<< inside a subscript");
            i = readHeredocOpener(i);
            wordStart = false;
          }
        } else if (code[i + 1] === "(") openSubst("<(", i, 2);
        else {
          i += 1;
          wordStart = false;
        }
        break;
      }
      case ">": {
        if (code[i + 1] === "(") openSubst(">(", i, 2);
        else {
          i += 1;
          wordStart = false;
        }
        break;
      }
      case ";":
      case "&":
      case "|":
      case " ":
      case "\t": {
        i += 1;
        wordStart = true;
        break;
      }
      case "\n": {
        i += 1;
        wordStart = true;
        if (pending.length > 0) {
          if (f.t !== F_CODE) refuse("heredoc inside a substitution");
          i = readHeredocBodies(i);
        }
        break;
      }
      case "#": {
        if (wordStart) {
          const eol = code.indexOf("\n", i);
          const end = eol < 0 ? n : eol;
          tokens.push({ kind: "comment", start: i, end });
          i = end;
        } else i += 1;
        break;
      }
      default: {
        i += 1;
        wordStart = false;
      }
    }
  }

  if (stack.length > 1) {
    const open = stack[stack.length - 1];
    refuse(
      open.t === F_DQ
        ? "unterminated double quote"
        : "unterminated command substitution",
    );
  }
  // A heredoc opened on the last line (no newline after it) has an empty body.
  tokens.sort((a, b) => a.start - b.start);
  return { tokens };
}

/** `text` with every line join (a backslash-newline bash removes) replaced by `filler`. */
function cutJoins(text, filler) {
  let out = "";
  let at = 0;
  for (const t of tokenize(text).tokens) {
    if (t.kind !== "join") continue;
    out += text.slice(at, t.start) + filler;
    at = t.end;
  }
  return out + text.slice(at);
}

/**
 * `text` with every command substitution, process substitution and backtick
 * replaced by one word, or null when one is unterminated. `commandInvocations`
 * turns each of them into a segment break, so the arguments it hands the flag
 * table stop at the first (`sort <(echo a) -oout` reaches the table as `sort`),
 * whether the substitution follows the command word or precedes it as a prefix
 * assignment (`X=$(echo a) uniq in out`). Guessing where a substitution may stand
 * was patched three times; masking removes the cut. A command substitution
 * becomes `$__SUBST__`, a variable nothing defines, so it is an expansion of
 * unknown value that the table refuses where a flag may stand (and that has no
 * `$(` for `commandInvocations` to cut again); a process substitution becomes `/dev/fd/0`, the operand
 * it stands for. The commands INSIDE a substitution are judged on their own, in
 * the unmasked reading.
 *
 * Read off the tokenizer (task.292): the substitutions are its outermost `subst` tokens, so a
 * paren or backtick hidden by a quote, an escape or a comment is not one, and nesting costs one
 * linear pass instead of one re-mask per level. A text it cannot read is null.
 */
function maskSubstitutions(text) {
  let tokens;
  try {
    ({ tokens } = tokenize(text));
  } catch {
    return null;
  }
  let out = "";
  let at = 0;
  for (const t of tokens) {
    if (t.kind !== "subst" || t.start < at) continue; // nested in one already masked
    out +=
      text.slice(at, t.start) +
      (t.form === "<(" || t.form === ">(" ? "/dev/fd/0" : "$__SUBST__");
    at = t.end;
  }
  return out + text.slice(at);
}

/** Why `name`'s arguments are outside its entry, or null. `rawArgs` keep their quotes. */
function flagViolation(name, rawArgs, ctx) {
  const entry = SAFE_FLAGS[name];
  if (!entry) return `flag-not-allowed: ${name} no-table-entry (fail-closed)`;
  if (entry.any) return null;
  // What a variable stands for, where the scan can say: the caller's binding, or
  // the one literal this block assigns it. Anything else is not read.
  const bound = ctx.bindings ?? {};
  const resolver = (n) => {
    if (Object.hasOwn(bound, n)) return String(bound[n]);
    const vals = ctx.assigned.get(n);
    if (vals && vals.length === 1 && !/[$`]/.test(vals[0]))
      return shellWord(vals[0]).text;
    return null;
  };
  // A name whose value is the caller's to judge: bound by the caller, or unbound
  // (the block is then a placeholder and does not run).
  const trusted = (n) =>
    Object.hasOwn(bound, n) ||
    (ctx.unbound?.has(n) ?? false) ||
    IMPLICIT_VARS.has(n);
  // `operands` drops a trailing `}`, which is the end of a brace expansion here
  // (`{-dele,-delete}`). Only a `}` with no `{` to close is the end of a group.
  const toks = [];
  for (let i = 0; i < rawArgs.length; i += 1) {
    const a = rawArgs[i];
    if (REDIRECTION.test(a)) {
      if (/^\d*[<>]+[&|]?$/.test(a)) i += 1;
      continue;
    }
    let t = a.replace(/\)+$/, "");
    while (t.endsWith("}") && t.split("}").length > t.split("{").length)
      t = t.slice(0, -1);
    if (t !== "") toks.push(t);
  }
  const words = toks.map((t) => ({ tok: t, ...shellWord(t, resolver) }));
  // With no raw reading the scan has only its collapsed one, where a quoted
  // span is `""`: that stands for text the table cannot judge (`"-delete"`).
  const hidden = (w) => ctx.collapsed && /^(""|'')$/.test(w.tok);
  const unreadable = (w) =>
    `${w.tok} (a quoted argument the classifier cannot read here)`;
  // An expansion where a flag may stand: its value could be the flag.
  const flagCapable = (w) =>
    !ctx.lenient &&
    !entry.expansionOk &&
    w.firstExp >= 0 &&
    couldBeFlag(w.text.slice(0, w.firstExp));
  // The things the shell does to an unquoted word BEFORE the command sees it. A
  // shipped helper's variables are its call's arguments, judged at the call site.
  const BRACE = /\{([^{}\s]*,[^{}\s]*)\}|\{([^{}\s]*\.\.[^{}\s]*)\}/g;
  for (const w of ctx.lenient || entry.expansionOk ? [] : words) {
    const bare = bareOf(w.tok);
    if (/\$\{?IFS\b/.test(bare))
      return `flag-not-allowed: ${name} word-splitting on \${IFS} can build a flag`;
    for (const v of bare.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/g)) {
      const n = v[1];
      if (trusted(n)) continue;
      // Defined here by something other than one plain assignment (`for`, `read`,
      // a substitution, two assignments), or assigned more than one word.
      if (!ctx.assigned.has(n) || unsafeAssignment(ctx.assigned.get(n)))
        return `flag-not-allowed: ${name} word-splitting on $${n}, which this block defines in a way the scan cannot read, or gives more than one word`;
    }
    if (ctx.assigned.has("IFS") && /\$/.test(bare))
      return `flag-not-allowed: ${name} unquoted expansion with IFS reassigned`;
    if (new RegExp(BRACE.source).test(bare)) {
      // The word's text with its quotes off: a quoted prefix still leads the word
      // (`"-de"{lete,lete}`). A brace builds a flag when a flag is already being
      // spelled, or when an alternative starts one.
      for (const g of w.text.matchAll(BRACE)) {
        const lead = w.text.slice(0, g.index);
        const alts = (g[1] ?? g[2]).split(/,|\.\./);
        if (
          (lead.startsWith("-") && !lead.includes("=")) ||
          (lead === "" && alts.some((a) => a === "" || a.startsWith("-")))
        )
          return `flag-not-allowed: ${name} brace expansion can build a flag`;
      }
    }
  }
  const out = (flag) => `flag-not-allowed: ${name} ${flag}`;
  if (name === "find") {
    for (let i = 0; i < words.length; i += 1) {
      const w = words[i];
      const u = w.text;
      if (hidden(w)) return out(unreadable(w));
      if (u.startsWith("-")) {
        if (FIND_BARE.has(u) || /^-O[0-3]$/.test(u)) continue;
        if (FIND_VALUE.has(u) || /^-newer[acBmt][acBmt]$/.test(u)) {
          i += 1;
          continue;
        }
        return out(u);
      }
      if (flagCapable(w))
        return out(`${w.tok} (an expansion that could be a flag)`);
    }
    return null;
  }
  if (name === "sed") {
    const scripts = [];
    const files = [];
    let haveScript = false;
    let afterDD = false;
    const blind = words.find(hidden);
    if (blind) return out(unreadable(blind));
    for (let i = 0; i < words.length; i += 1) {
      const w = words[i];
      const u = w.text;
      if (afterDD || !u.startsWith("-") || u === "-") {
        files.push(w);
        continue;
      }
      if (u === "--") {
        afterDD = true;
        continue;
      }
      if (u.startsWith("--")) {
        const nm = u.slice(2).split("=")[0];
        if (SAFE_FLAGS.sed.long.includes(nm)) continue;
        if (nm === "expression") {
          haveScript = true;
          if (u.includes("="))
            scripts.push({ text: u.slice(u.indexOf("=") + 1), w });
          else if (words[i + 1])
            scripts.push({ text: words[(i += 1)].text, w: words[i] });
          else return out("--expression (no script)");
          continue;
        }
        return out(`--${nm}`);
      }
      for (let k = 1; k < u.length; k += 1) {
        const c = u[k];
        if (SAFE_FLAGS.sed.short.includes(c)) continue;
        if (c === "e") {
          haveScript = true;
          if (k < u.length - 1) scripts.push({ text: u.slice(k + 1), w });
          else if (words[i + 1])
            scripts.push({ text: words[(i += 1)].text, w: words[i] });
          else return out("-e (no script)");
          break;
        }
        return out(`-${c}`);
      }
    }
    if (!haveScript && files.length > 0) {
      const first = files.shift();
      scripts.push({ text: first.text, w: first });
    }
    for (const f of files)
      if (flagCapable(f) && !afterDD)
        return out(`${f.tok} (an expansion that could be a flag)`);
    for (const sc of scripts) {
      const w = sc.w ?? null;
      if (w && w.dynamic) return out("a script built by a substitution");
      // A value this block gives the script is read as written (the resolver put
      // it into the text); a name it defines any other way could carry a
      // delimiter and an `e` (`A='.*/touch x/e;s/z'; sed "s/$A/b/"`).
      if (w && !ctx.lenient)
        for (const n of w.names)
          if (!trusted(n) && resolver(n) === null)
            return out(
              `script built from $${n}, whose value this block defines in a way the scan cannot read`,
            );
      // A shipped helper's script is its caller's argument, judged as written at
      // the call site (`forwardedHazard`), where it holds no expansion.
      if (ctx.lenient && w && w.firstExp >= 0) continue;
      const v = sedScriptVerdict(sc.text);
      // A forwarded argument is as likely a path as a script, and a script sed
      // cannot parse runs nothing: only a script read and found forbidden stands.
      if (v === "safe" || (ctx.lenient && v === "unreadable")) continue;
      return out(
        `script ${JSON.stringify(sc.text)} (a command outside the read-only set: e, w, r and others run or write)`,
      );
    }
    return null;
  }
  // The generic entries.
  let operandCount = 0;
  let afterDD = false;
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    const u = w.text;
    if (afterDD || !u.startsWith("-") || u === "-") {
      if (hidden(w)) return out(unreadable(w));
      if (!afterDD && flagCapable(w))
        return out(`${w.tok} (an expansion that could be a flag)`);
      // A command whose operands count (uniq: the second is an output file) cannot
      // be judged on an unquoted word that may become several: a brace, a glob, or
      // an expansion this reader cannot name (`uniq {in,out}`, `uniq *.txt`).
      if (entry.maxOperands != null && !ctx.lenient) {
        const bare = bareOf(w.tok).replace(/\$\{[A-Za-z_][A-Za-z0-9_]*\}/g, "");
        if (/[*?[{`]/.test(bare) || (/\$/.test(bare) && w.names.size === 0))
          return out(
            `${w.tok} (an unquoted brace, glob or expansion can name more than one operand)`,
          );
      }
      operandCount += 1;
      if (entry.operandRe && !entry.operandRe.test(u))
        return out(
          `operand ${JSON.stringify(u)} (only ${entry.operandRe} is read-only)`,
        );
      if (entry.maxOperands != null && operandCount > entry.maxOperands)
        return out(
          `operand ${JSON.stringify(u)} (at most ${entry.maxOperands}; a further operand may be an output file)`,
        );
      continue;
    }
    if (u === "--") {
      afterDD = true;
      continue;
    }
    if (u.startsWith("--")) {
      const nm = u.slice(2).split("=")[0];
      if ((entry.long ?? []).includes(nm)) continue;
      if ((entry.longValue ?? []).includes(nm)) {
        if (!u.includes("=")) i += 1;
        continue;
      }
      return out(`--${nm}`);
    }
    if (entry.numeric && /^-\d+$/.test(u)) continue;
    for (let k = 1; k < u.length; k += 1) {
      const c = u[k];
      if ((entry.short ?? "").includes(c)) continue;
      if ((entry.shortValue ?? "").includes(c)) {
        if (k === u.length - 1) i += 1;
        break;
      }
      return out(`-${c}`);
    }
  }
  return null;
}

/**
 * `cat <> out` opens `out` for reading AND writing, creating it: a redirection
 * that carries no `>` for WRITE_REDIRECT to see (task.289, gap 4).
 */
const READ_WRITE_REDIRECT = /(?:^|[^<>&])\d*<>/;

/**
 * Functions the text defines under the name of a command it may run. A
 * definition changes what the name means, so `function cat { touch x; }; cat f`
 * runs the body while the scan sees an allow-listed `cat` (task.289, gap 7). A
 * helper's definitions are judged by `shadowsCommand` instead.
 */
function shadowingFunctions(code) {
  const out = [];
  // Both spellings need one of these two tokens, and most blocks hold neither.
  if (!code.includes("function") && !code.includes("(")) return out;
  const defs = [
    /(?:^|[\s;&|({])function\s+([^\s(){};&|]+)/g,
    /(?:^|[\s;&|({])([^\s(){};&|=]+)\s*\(\s*\)/g,
  ];
  for (const re of defs)
    for (const m of code.matchAll(re)) {
      const name = m[1]
        .replace(/['"\\]/g, "")
        .split("/")
        .pop();
      if (SAFE_COMMANDS.has(name) || COMMAND_RUNNERS.has(name)) out.push(name);
    }
  return out;
}

/**
 * CR-1 — a write redirection makes ANY command mutating, including an
 * allow-listed one. `echo pwned > /tmp/x` classified runnable and wrote the file;
 * the temp working directory is no defence, because an absolute or `~`-relative
 * target simply ignores it.
 *
 * Matches `>`, `>>`, `&>`, `>|` and `n>` / `n>>` when they target a real path.
 *
 * Two things are NOT writes and must be exempt, or the rule refuses most of the
 * documented prose it exists to run: redirection to `/dev/null` / `/dev/stdout` /
 * `/dev/stderr`, which persists nothing, and file-descriptor duplication `>&1`,
 * `2>&1`, which redirects a stream onto another rather than onto a file. An
 * earlier draft matched `2>&1` and made `command -v zsh >/dev/null 2>&1` —
 * this repository's own documented zsh guard — unrunnable.
 *
 * BUG-6 root cause B — the pre-operator class used to exclude `\d` and `\w` as
 * well, which meant a redirection glued to the preceding word (`echo pwned>/tmp/x`,
 * `cat README.md>/tmp/x`, `echo pwned>>/tmp/x`) was never seen. Only `<`, `>` and
 * `&` need excluding: descriptor duplication is already handled by the `(?!&\d)`
 * lookahead, which is what keeps `2>&1` and `>&2` runnable.
 */
const WRITE_REDIRECT =
  /(?:^|[^<>&])(?:\d*>>?|&>|>\|)\s*(?!&\d|\s*\/dev\/(?:null|stderr|stdout)\b)\S/;

/**
 * Blank the CONTENTS of `(( … ))` and `[[ … ]]`, preserving length and newlines.
 *
 * Inside an arithmetic evaluation or a conditional expression, `>` is a COMPARISON
 * operator, never a redirection. Widening WRITE_REDIRECT's pre-context to catch
 * `echo pwned>/tmp/x` (BUG-6 root cause B) also made `if ((a>b)); then …` match,
 * turning a read-only arithmetic test into a refusal — an over-refusal introduced
 * by the fix for a fail-open. `[[ 1 > 2 ]]` was already refused for the same
 * reason before that change; one guard covers both.
 *
 * This is applied ONLY on the write-redirection path. `commandWords` still sees
 * the original text, so a command substitution inside a conditional — `[[ $(touch
 * /tmp/x) ]]` — is still scanned and still fails closed.
 */
function blankConditionalSpans(text) {
  const blank = (inner) => inner.replace(/[^\n]/g, " ");
  return text
    .replace(/\(\(([^)]*)\)\)/g, (_m, inner) => `((${blank(inner)}))`)
    .replace(/\[\[([^\]]*)\]\]/g, (_m, inner) => `[[${blank(inner)}]]`);
}

/** Template slots: `{n}`, `{task-id}`, `<path>`, `<PLACEHOLDER>`. */
const PLACEHOLDER_PATTERNS = [
  // `{name}` but never `${name}` — the negative lookbehind is what keeps shell
  // parameter expansion out of the placeholder bucket.
  /(?<!\$)\{[A-Za-z][\w .:|/-]*\}/,
  // `<name>` in argument position. `2>&1`, `<<EOF` and `a < b` do not match.
  /(?<![<>&\w])<[A-Za-z][\w -]*>/,
];

/** The grammar a slot name must have — the brace pattern's, which the angle one's is a subset of. */
const SLOT_NAME = /^[A-Za-z][\w .:|/-]*$/;
const ANGLE_SLOT_NAME = /^[A-Za-z][\w -]*$/;

const escapeRegExp = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Fill template slots with literal text (obs #186). `--bind` binds a SHELL
 * variable, which can never satisfy `{task-directory}`; this replaces the text.
 *
 * The patterns are PLACEHOLDER_PATTERNS' own, with the name fixed, so what counts
 * as a slot here and what classifies as one there cannot disagree. The value is
 * inserted by a replacer function, never a replacement string, so a `$&` or
 * `$'` in it is text. Slots are filled BEFORE classification: a value that adds a
 * write (`; rm -rf x`) is then caught by the same rules as written code.
 */
export function applySlots(code, slots) {
  if (!slots || slots.size === 0) return code;
  let out = code;
  for (const [name, value] of slots) {
    out = out.replace(
      new RegExp(`(?<!\\$)\\{${escapeRegExp(name)}\\}`, "g"),
      () => value,
    );
    if (ANGLE_SLOT_NAME.test(name))
      out = out.replace(
        new RegExp(`(?<![<>&\\w])<${escapeRegExp(name)}>`, "g"),
        () => value,
      );
  }
  return out;
}

/** Every unfilled slot in `text`: the `{…}` slots, then the `<…>` ones. */
function unfilledSlots(text) {
  const found = new Set();
  for (const re of PLACEHOLDER_PATTERNS)
    for (const m of text.matchAll(new RegExp(re.source, "g"))) found.add(m[0]);
  return [...found];
}

/** Shell variables that are always available and never need binding. */
const IMPLICIT_VARS = new Set([
  "?",
  "!",
  "$",
  "#",
  "@",
  "*",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "HOME",
  "IFS",
  "PATH",
  "PWD",
  "OLDPWD",
  "SHELL",
  "USER",
  "TMPDIR",
  "RANDOM",
  "LINENO",
  "SECONDS",
  "HOSTNAME",
  "UID",
  "EUID",
  "PPID",
  "BASH_SOURCE",
]);

/**
 * Drop comments and heredoc bodies. Quoted spans are KEPT — a placeholder is
 * very often written inside quotes (`--issue "{TRACKER_ISSUE}"`), so blanking
 * quotes before placeholder detection would classify a templated block as
 * runnable and then execute it.
 */
/**
 * Like `blankQuotedSpans`, but COLLAPSES each quoted span to its bare quote pair
 * instead of preserving its length.
 *
 * Both exist because they serve different consumers. The heredoc detector needs
 * offsets that line up with the raw line, so it uses the length-preserving form.
 * Command detection needs the OLD tokenisation: the two regexes this replaced
 * turned `"a b"` into `""`, one token. Blanking to spaces instead splits a
 * multi-line assignment `MSG="first\nsecond"` into a final segment whose only
 * surviving token is the closing quote — reported as an unreadable command
 * position and refused. Collapsing keeps the token count while still fixing the
 * mutual-awareness defect the regex pair had.
 */
function collapseQuotedSpans(text) {
  // Read off the tokenizer (task.292): a quote token is replaced by its bare quote pair, and the
  // text between them is untouched. A text the tokenizer cannot read throws (fail closed).
  const { tokens } = tokenize(text);
  // Inside DOUBLE quotes `$(…)` and backticks still RUN (single quotes are the only quoting that
  // makes them text). Dropping them with the rest of the span hid the command from the scan:
  // `echo "$(touch /tmp/x)"` created the file and classified runnable (task.274, obs #67). Each
  // outermost substitution in a double-quoted span is kept, its own quotes collapsed like any
  // others (kept as written, a `|` inside `grep 'a\|b'` would split the command and read `b'` as
  // one); the surrounding text is dropped.
  //
  // One pass with an explicit stack, not recursion: a nest 6000 deep overflowed the call stack.
  // Each entry is a span we are inside: a quote (its text is dropped) or a kept substitution
  // (its text flows through). `cursor` is the text accounted for so far.
  let out = "";
  let cursor = 0;
  const stack = [];
  const top = () => stack[stack.length - 1];
  const emitting = () => stack.length === 0 || top().quote === false;
  const advance = (pos) => {
    if (emitting() && pos > cursor) out += text.slice(cursor, pos);
    if (pos > cursor) cursor = pos;
  };
  const closeUntil = (pos) => {
    while (stack.length > 0 && top().end <= pos) {
      const e = top();
      advance(e.end);
      stack.pop();
      if (e.quote) out += e.closer;
    }
  };
  for (const t of tokens) {
    if (t.kind !== "quote" && t.kind !== "subst") continue;
    closeUntil(t.start);
    if (t.kind === "quote") {
      if (!emitting()) continue; // inside a span being dropped
      advance(t.start);
      out += t.quote === "$'" ? "$'" : t.quote;
      stack.push({
        end: t.end,
        quote: true,
        q: t.quote,
        closer: t.quote === '"' ? '"' : "'",
      });
    } else if (!emitting() && top().q === '"') {
      cursor = Math.max(cursor, t.start); // jump over the dropped text to the substitution
      stack.push({ end: t.end, quote: false });
    }
  }
  closeUntil(Infinity);
  advance(text.length);
  return out;
}

/**
 * `code` without its comments and heredoc bodies, read off the tokenizer (task.292): a comment
 * token is cut, a heredoc body is cut, and the heredoc OPERATOR is neutralised to ` HEREDOC: `.
 * Nothing here re-derives where a quote, escape or heredoc starts, so a `<<` inside a quote is
 * not a heredoc and a `#` after a CR is not a comment — the tokenizer already said so. A text it
 * cannot read throws, which `classifyFailClosed` reads as mutating.
 *
 * - The opener LINE is kept whole: `cat <<EOF > /tmp/pwned` must still show its `>` redirection.
 * - The operator is neutralised (task.274, obs #67) so that stripping the output again changes
 *   nothing: `commandInvocations` re-strips text `stripNonCode` already stripped, and a surviving
 *   `<<EOF` made that second pass read the next line as a body that never closed.
 * - An UNQUOTED heredoc body is expanded by bash, so a `$(…)` or backtick in it runs. The body is
 *   cut, but each outermost substitution in it is kept on a line of its own for the invocation
 *   scan to judge.
 */
function stripProse(code) {
  const { tokens } = tokenize(code);
  let out = "";
  let at = 0;
  for (const t of tokens) {
    if (t.start < at) continue; // inside a span already cut
    if (t.kind === "comment") {
      out += code.slice(at, t.start);
      at = t.end;
    } else if (t.kind === "heredoc-op") {
      out += code.slice(at, t.start) + " HEREDOC: ";
      at = t.end;
    } else if (t.kind === "heredoc-body") {
      out += code.slice(at, t.start);
      at = t.end;
      const kept = tokens.filter(
        (s) =>
          s.kind === "subst" &&
          s.depth === 0 &&
          s.start >= t.start &&
          s.end <= t.end,
      );
      for (const s of kept) out += code.slice(s.start, s.end) + "\n";
      // The terminator was the last line: no newline follows the cut.
      if (kept.length === 0 && t.end === code.length && out.endsWith("\n"))
        out = out.slice(0, -1);
    }
  }
  return out + code.slice(at);
}

/**
 * Everything `stripProse` removes, plus the contents of quoted spans. Used only
 * for command detection, where a quoted string is an argument and never an
 * invocation.
 */
function stripNonCode(code) {
  return collapseQuotedSpans(stripProse(code));
}

/**
 * Keywords after which the NEXT word is in command position.
 *
 * BUG-6 root cause A — `commandWords` used to emit the first token of a segment
 * and stop. When that token was a keyword the whole segment was thrown away, so
 * `if touch /tmp/x; then echo hi; fi` reported no command at all and classified
 * runnable. The segment splitter split on `do`/`then`/`else`, which is why those
 * three keywords were never the problem and `if`/`while`/`until` always were.
 *
 * The set below is what makes the distinction explicit rather than accidental.
 * `if`, `elif`, `while` and `until` are followed by a command list, so scanning
 * must continue past them. `for`, `select`, `case`, `function` and `in` are
 * followed by a NAME or a word list — continuing past those would report the loop
 * variable of `for f in a b` as a command and refuse a legitimate loop. `fi`,
 * `done` and `esac` terminate a construct and are followed by nothing on the same
 * segment.
 *
 * The original bug report listed only `if`, `while` and `until`, and stated that
 * `elif` had been probed and was correctly refused. It is not: `elif` swallowed
 * its segment exactly as `if` did, and so did `for`, `case`, `esac`, `done`, `fi`
 * and `function`. Extending the splitter with three names would have left the
 * rest open, which is why this scans the segment instead.
 */
const COMMAND_INTRODUCING_KEYWORDS = new Set([
  // `! cmd` negates cmd's exit status — cmd is still run. Leaving `!` out would
  // turn `! touch /tmp/x` from mutating into runnable now that keywords are
  // resolved before the command-name test that used to catch it.
  "!",
  "if",
  "elif",
  "while",
  "until",
  "then",
  "else",
  "do",
]);

/**
 * `git` flags that take a SEPARATE operand. The operand is not the subcommand,
 * and reading it as one is what let `git -C log push origin main` resolve to
 * `git:log` — an allow-listed read — and execute a push (BUG-6 #7).
 */
const GIT_FLAGS_WITH_OPERAND = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
  "--config-env",
  "--super-prefix",
]);

/**
 * The subcommand of one `git` invocation, skipping global flags and the operands
 * they consume. Returns null when the invocation names no subcommand at all.
 */
function gitSubcommand(tokensAfterGit) {
  for (let i = 0; i < tokensAfterGit.length; i += 1) {
    const tok = tokensAfterGit[i];
    if (tok === "") continue;
    if (GIT_FLAGS_WITH_OPERAND.has(tok)) {
      i += 1; // the operand belongs to the flag, never to command position
      continue;
    }
    if (tok.startsWith("-")) continue; // valueless flag, or --key=value
    // Return whatever sits in subcommand position, even if it is not a plain
    // lowercase word. An unreadable subcommand must reach the allow-list check as
    // itself and be refused, not be silently skipped in favour of a later token.
    return tok;
  }
  return null;
}

/** The leading word of every simple command in the block. */
export function commandWords(code) {
  return commandInvocations(code)
    .filter((inv) => !inv.keyword)
    .map((inv) => inv.word);
}

/**
 * Every simple command in the block: its leading word and the tokens after it,
 * as the scan saw them (quoted spans collapsed to `""`). `commandWords` is this
 * with the arguments and the `keyword: true` entries (`cd`) dropped; the
 * helper rule needs both.
 */
function commandInvocations(code) {
  // `commandWords` is exported and reads raw text: state the blank class here too (see
  // classifyInternal), so a CR, FF, VT, NBSP or U+2028 never separates two words.
  code = code.replace(NOT_A_BASH_BLANK, "\u0001");
  // Backslash line-continuations join one command across several lines. Splitting on the raw
  // newline first makes the continuation's tail look like a fresh command: `git log ... -- \` +
  // `apps packages` reported `apps` as a command. Which backslash-newlines join is the
  // tokenizer's to say (an even run is an escaped backslash then a real newline, task.290 QA 2).
  const stripped = cutJoins(stripNonCode(code), " ")
    // Arithmetic expansion is arithmetic, not an invocation. It must go before the
    // `$(` rule below, or `$((N + 1))` becomes a segment whose first token is `N`.
    .replace(/\$\(\([^)]*\)\)/g, " ")
    // Command substitutions and subshells: turn the delimiters into segment
    // breaks so the INNER command is scanned as a command rather than being
    // swallowed by the enclosing assignment. Without this,
    // `P=$(git remote get-url origin)` skips `P=$(git` as an assignment and then
    // reads `remote` as the command.
    .replace(/\$\(/g, "\n")
    // CR-8: process substitution `<(…)` / `>(…)` keeps the inner command glued to
    // the outer segment's tail, and only the first token of a segment is examined
    // — so `cat <(touch /tmp/x)` saw only `cat`.
    .replace(/[<>]\(/g, "\n")
    .replace(/`/g, "\n");
  // NOTE: a bare `)` is deliberately NOT turned into a segment break. It used to
  // be, and that erased the one signal distinguishing a `case` arm pattern
  // (`*://*/pull/*)`) from an obfuscated command name (`/usr/bin/[t]ouch`) — both
  // are globs, and without the trailing `)` there is nothing to tell them apart.
  // The `$(`/`<(` rules above already put every substituted command at the START
  // of its own segment, so the closing paren only ever lands on a trailing
  // argument, where it is harmless.
  const words = [];
  // Split on anything that can begin a new simple command.
  // Deliberately NOT split on `{` or `(`: `echo {task-id}` would then yield
  // `task-id}` as a command word, and the fail-closed rule would report a
  // templated block as an unrecognised command. Grouping characters are stripped
  // as prefixes below instead.
  const segments = stripped.split(
    // `&` splits a background or AND-list, but `>&` / `<&` is descriptor
    // duplication — splitting there left the file descriptor (the `1` in `2>&1`)
    // sitting in command position, where the fail-closed rule then refused it.
    /(?:\n|;|\|\||&&|\||(?<![<>])&|\bdo\b|\bthen\b|\belse\b)/,
  );

  let inCase = false;
  for (const seg of segments) {
    const trimmed = seg.trim().replace(/^[({\s]+/, "");
    if (!trimmed) continue;
    if (/^case\b/.test(trimmed)) inCase = true;
    if (/^esac\b/.test(trimmed)) inCase = false;
    // Whether the NEXT token examined sits in command position. A segment starts
    // in command position; a keyword either keeps it there or ends the scan.
    let inCommandPosition = true;
    const toks = trimmed.split(/\s+/);
    for (let ti = 0; ti < toks.length; ti += 1) {
      let tok = toks[ti];
      // Leading `VAR=value` assignments and redirections precede the command.
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) continue;
      if (/^[<>]/.test(tok) || /^\d+[<>]/.test(tok)) continue;
      if (tok === "") continue;
      // A `case` arm pattern is the ONE token in command position that is not an
      // invocation. It is recognisable only by its trailing `)`, which is why the
      // stripper above no longer erases it. The arm's BODY follows on the same
      // segment, so command position resumes after it rather than ending — that
      // is what stops `case x in a) touch /tmp/x;; esac` from hiding the `touch`
      // (BUG-6, the `case` member of root cause A's keyword family).
      if (inCase && /\)$/.test(tok)) {
        inCommandPosition = true;
        continue;
      }
      if (!inCommandPosition) continue;

      // Unquote the way a shell does before deciding what the command IS.
      // `who'am'i`, `to"u"ch` and `t\ouch` are all spellings of one binary, and a
      // scanner that reads them as unparseable-therefore-absent is a scanner an
      // attacker only has to add one quote to defeat. Verified: all three
      // executed under the previous version.
      // A quoted span `rawInvocations` stands in for unquotes to nothing, as the
      // collapsed `""` it replaces does.
      let word = tok
        .replace(/\u0001\d+\u0001/g, "")
        .replace(/\\(.)/g, "$1")
        .replace(/['"]/g, "");

      // `((expr))` and `[[expr]]` written without spaces arrive as ONE token that
      // cannot be a command name. Spaced, they tokenise as the `((`/`[[` keywords
      // and are handled below; glued, fail-closed would refuse a read-only
      // arithmetic test. A token carrying `$(` or a backtick is NOT exempted —
      // `((a+$(touch /tmp/x)))` must still reach the fail-closed path.
      if (/^(?:\(\(|\[\[)/.test(tok) && !/[$`]/.test(tok)) {
        inCommandPosition = false;
        continue;
      }

      // Keywords are resolved BEFORE the command-name test, because several of
      // them (`[`, `[[`, `!`, `{`) cannot look like a command name and would
      // otherwise be reported as an unreadable command position. That was
      // harmless only while the scan stopped at a segment's first token; now that
      // it continues past `if`, the `[` of `if [ -n "$N" ]; then …` reaches this
      // point and must be read as the test builtin it is.
      if (SHELL_KEYWORDS.has(word)) {
        // A keyword is never an invocation, so `commandWords` never reports it.
        // `cd` is recorded all the same, marked: the helper rule must know the
        // block moves its working directory (task.191 review 1, I1). What
        // matters for the scan is whether a command can follow it in the SAME
        // segment — see COMMAND_INTRODUCING_KEYWORDS.
        if (DIRECTORY_CHANGERS.has(word) || RECORDED_KEYWORDS.has(word))
          words.push({ word, args: toks.slice(ti + 1), keyword: true });
        inCommandPosition = COMMAND_INTRODUCING_KEYWORDS.has(word);
        continue;
      }

      if (!COMMAND_NAME.test(word)) {
        // Everything still unreadable in command position is UNSAFE, not absent.
        // A tilde path, a glob that expands to a binary (`/usr/bin/[t]ouch`), a
        // variable command name — the scanner cannot say what any of them runs,
        // and "cannot say" must never resolve to "safe".
        // Its arguments are kept: the raw reading of a respelled name
        // (`next_number''ed`) lands here, and the helper rule reads them.
        words.push({ word: "<unparseable>", args: toks.slice(ti + 1) });
        break;
      }
      tok = word;
      if (tok === "git") {
        // Carry THIS invocation's subcommand. Resolving `git` against the first
        // `git …` in the whole block instead fails OPEN: a block opening with
        // `git rev-parse` would license a later `git checkout` in the same block.
        // Slice from AFTER THIS `git` token. Slicing from the segment's second
        // token was correct only while the scan always stopped at the segment's
        // first token; now that it continues past keywords and `case` arms, `git`
        // is frequently not token 0. `if git status` then resolved to `git:git`
        // and was refused, and `case log in log) git checkout -- . ;; esac`
        // resolved to the allow-listed `git:log` and RAN — a fail-open.
        const rest = gitSubcommand(toks.slice(ti + 1));
        words.push({
          word: rest ? `git:${rest}` : "git",
          args: toks.slice(ti + 1),
        });
      } else {
        words.push({ word: tok, args: toks.slice(ti + 1) });
      }
      break; // the command word of this segment is found
    }
  }
  return words;
}

/** Variables the block reads but never assigns. */
export function unboundVariables(code, bindings) {
  const stripped = code
    .replace(NOT_A_BASH_BLANK, "\u0001")
    .split("\n")
    .filter((l) => !/^[ \t]*#/.test(l))
    .join("\n");

  const assigned = new Set();
  for (const m of stripped.matchAll(/(?:^|\s|;)([A-Za-z_][A-Za-z0-9_]*)=/g))
    assigned.add(m[1]);
  for (const m of stripped.matchAll(/\bfor\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\b/g))
    assigned.add(m[1]);
  for (const m of stripped.matchAll(
    /\bread\s+(?:-\S+\s+)*([A-Za-z_][A-Za-z0-9_]*)/g,
  ))
    assigned.add(m[1]);

  const read = new Set();
  for (const m of stripped.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/g))
    read.add(m[1]);

  return [...read].filter(
    (v) => !assigned.has(v) && !IMPLICIT_VARS.has(v) && !(v in bindings),
  );
}

// ── Helper calls (obs #219, #278) ─────────────────────────────────────────────

/** The words that run a FILE. They are known only through `resolveHelperCall`. */
const HELPER_RUNNERS = new Set(["bash", "sh", "source", "."]);

/** A block is depth 0; the helper it calls is 1; a helper that helper calls is 2. */
export const MAX_HELPER_DEPTH = 2;

/**
 * Builtins that move the shell's working directory. A helper path is resolved
 * against the temp copy's root, but the shell resolves it against its working
 * directory, so after one of these the file the classifier read and the file the
 * shell runs can differ (task.191 review 1, I1).
 */
const DIRECTORY_CHANGERS = new Set(["cd", "pushd", "popd"]);

/** A helper path the classifier can resolve without a shell: no expansion of any kind. */
const LITERAL_PATH = /^[\w.\/@+-]+$/;

/**
 * Variables a shell reads when it STARTS, before the script it was given:
 * non-interactive bash sources `$BASH_ENV`, `sh` reads `$ENV`, and an exported
 * `SHELLOPTS`/`BASHOPTS` turns on xtrace, whose `PS4` is expanded — command
 * substitutions included — on every traced line. A helper call in a text that
 * names one of them runs code the helper rule never read (task.191 QA-1). Matched
 * as a bare name anywhere in the code: refusing a block that only READS `$ENV`
 * is the right direction to be wrong in.
 */
const STARTUP_VARIABLES = ["BASH_ENV", "ENV", "SHELLOPTS", "BASHOPTS", "PS4"];
const STARTUP_VARIABLE = new RegExp(`\\b(?:${STARTUP_VARIABLES.join("|")})\\b`);

/**
 * PATH named as a word that is not an expansion: `PATH=`, `export PATH`, `read
 * PATH`, `for PATH in`. After any of them a helper's `find` may be a file in the
 * copy, and a defined name that shadows nothing may resolve to one (CR2-6). A read
 * of `$PATH` is not a match; a mention in a string is, which only refuses.
 */
const PATH_WORD = /(?<![$\w{])PATH(?!\w)/;

/**
 * Keyword builtins the scan records (as `keyword: true`) besides the directory
 * changers: each can set a variable, and `set` the positional parameters, so the
 * helper rule reads their arguments.
 */
const RECORDED_KEYWORDS = new Set([
  "export",
  "local",
  "readonly",
  "read",
  "set",
]);

const PLAIN_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const REDIRECTION = /^\d*[<>]/;

/** An invocation's arguments with redirections, their operands and closing `)`/`}` removed. */
function operands(args) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (REDIRECTION.test(a)) {
      if (/^\d*[<>]+[&|]?$/.test(a)) i += 1; // a bare operator: its operand is next
      continue;
    }
    const t = a.replace(/[)}]+$/, "");
    if (t !== "") out.push(t);
  }
  return out;
}

/**
 * Why this invocation could set a variable the helper rule cannot read by name,
 * or null. An ALLOW-LIST over what the scan sees, not a list of bad spellings
 * (task.191 QA cycle 2, CR2-3): the scan has already unquoted nothing in an
 * argument and collapsed every quoted span to `""`, so `BASH\\_ENV`,
 * `"BASH""_ENV"` and `"$(…)"` all arrive as a name that is not a plain
 * identifier, and are refused for that. `-n` (a nameref) and `-f` (export a
 * function into a child shell) are refused outright, as is `printf -v`.
 */
function assignmentHazard({ word, args }) {
  if (word === "printf")
    return args.some((a) => /^-[A-Za-z]*v/.test(a)) ? "printf -v" : null;
  if (!["export", "local", "readonly", "read"].includes(word)) return null;
  const ops = operands(args);
  for (let i = 0; i < ops.length; i += 1) {
    const a = ops[i];
    if (a === "--") continue;
    if (/^-[A-Za-z]+$/.test(a)) {
      if (word !== "read" && /[nf]/.test(a)) return `${word} ${a}`;
      if (word === "read") {
        if (/[dinNptu]/.test(a)) i += 1; // the option's operand, not a name
        // `-a NAME` names an array: the next operand is checked as a name below.
      }
      continue;
    }
    const name = a.replace(/\+?=[\s\S]*$/, "");
    if (!PLAIN_NAME.test(name)) return `${word} of a non-literal name`;
  }
  return null;
}

/**
 * The positional parameters a `set` invocation assigns, or []. Options come
 * first (`-o`/`+o` take a name); `--` or `-` ends them, and so does the first
 * word that is not one: `set -e -- -delete` assigns `-delete`.
 */
function positionalArgs({ word, args }) {
  if (word !== "set") return [];
  const ops = operands(args);
  for (let i = 0; i < ops.length; i += 1) {
    const a = ops[i];
    if (a === "--" || a === "-") return ops.slice(i + 1);
    if (a === "-o" || a === "+o") i += 1;
    else if (!/^[-+]/.test(a)) return ops.slice(i);
  }
  return [];
}

/**
 * `commandInvocations` over the same text with each quoted span kept as written,
 * so an argument reads as the shell would be given it (`"-delete"`, not `""`).
 * Each span stands in as an opaque token while the text is split, then is put
 * back. Returns null when the two readings do not line up one-to-one, or a quote
 * never closes: a caller then cannot say what an argument is.
 */
function rawInvocations(scanText, expected) {
  const spans = [];
  let out = "";
  let quote = null;
  let start = -1;
  for (let i = 0; i < scanText.length; i += 1) {
    const ch = scanText[i];
    if (quote === null) {
      if (ch === "'" || ch === '"') {
        quote = ch;
        start = i;
      } else if (ch === "\\" && i + 1 < scanText.length) {
        out += ch + scanText[i + 1];
        i += 1;
      } else out += ch;
    } else if (quote === '"' && ch === "\\" && i + 1 < scanText.length) {
      i += 1;
    } else if (ch === quote) {
      spans.push(scanText.slice(start, i + 1));
      out += `\u0001${spans.length - 1}\u0001`;
      quote = null;
    }
  }
  if (quote !== null) return null;
  const restore = (t) =>
    t.replace(/\u0001(\d+)\u0001/g, (_, n) => spans[Number(n)]);
  const invs = commandInvocations(out).map((inv) => ({
    ...inv,
    args: inv.args.map(restore),
  }));
  if (
    invs.length !== expected.length ||
    invs.some((inv, i) => Boolean(inv.keyword) !== Boolean(expected[i].keyword))
  )
    return null;
  return invs;
}

/** An argument as the shell passes it: quotes and backslashes removed. */
const unquote = (a) => a.replace(/\\(.)/g, "$1").replace(/['"]/g, "");

const SHADOW_CACHE = new Map();

/**
 * True when `name` already means something to a shell — a builtin, a keyword or
 * an executable on PATH. A helper function with such a name is never trusted as a
 * known word: if the definition did not run (it sat in a branch, or the call came
 * before the `source`), the shell runs the real command instead (task.191 CR-3).
 * A name that shadows nothing fails as command-not-found in both cases, which
 * writes nothing. Asked of a fresh shell with only PATH, so no inherited function
 * or alias answers for it.
 */
function shadowsCommand(name) {
  if (SHADOW_CACHE.has(name)) return SHADOW_CACHE.get(name);
  const env = { PATH: process.env.PATH ?? "" };
  const bash = spawnSync(
    "bash",
    ["--norc", "--noprofile", "-c", 'type -t -- "$1"', "_", name],
    { env, encoding: "utf8" },
  );
  let shadows =
    bash.status !== 0 ? bash.status !== 1 : bash.stdout.trim() !== "";
  if (!shadows && zshAvailable()) {
    // zsh runs every block too, and has builtins bash does not.
    const zsh = spawnSync("zsh", ["-f", "-c", 'whence -w -- "$1"', "_", name], {
      env,
      encoding: "utf8",
    });
    shadows = !/: none\s*$/.test(zsh.stdout ?? "");
  }
  SHADOW_CACHE.set(name, shadows);
  return shadows;
}

/**
 * A helper's text has syntax a documented block does not, and none of it is a
 * write. Rewrite exactly that syntax into shapes the scan already reads:
 *
 * - `name() {` and `function name {` define a function; the definition is not an
 *   invocation, and `name` becomes a word this text may call.
 * - A multi-line `case` arm pattern (`''|*[!0-9]*)`) is a glob, not a command.
 * - `name+=(…)` is an assignment.
 * - `shopt -s|-u <option>` sets a shell option.
 *
 * Nothing else is learned. Writers stay refused by the same rules as any block.
 */
function prepareHelperText(code) {
  const names = new Set();
  const codeOnly = stripProse(code);
  for (const m of codeOnly.matchAll(
    /^[ \t]*(?:function[ \t]+)?([A-Za-z_][\w-]*)[ \t]*\(\)/gm,
  ))
    names.add(m[1]);
  for (const m of codeOnly.matchAll(
    /^[ \t]*function[ \t]+([A-Za-z_][\w-]*)(?=[ \t]*\{)/gm,
  ))
    names.add(m[1]);

  let inCase = false;
  let prev = "";
  const lines = code.split("\n").map((raw) => {
    let line = raw
      .replace(/^([ \t]*)(?:function[ \t]+)?[A-Za-z_][\w-]*[ \t]*\(\)/, "$1")
      .replace(/^([ \t]*)function[ \t]+[A-Za-z_][\w-]*(?=[ \t]*\{)/, "$1")
      .replace(/(^|[\s;&|])([A-Za-z_][A-Za-z0-9_]*)\+=/g, "$1$2=")
      .replace(/\bshopt(?:[ \t]+-[su])+\b/g, "true");
    // Only a line that OPENS a case (`case … in` and nothing after) starts arm
    // patterns; a `case` mentioned anywhere else starts nothing.
    // An arm pattern sits right after `case … in` or an arm terminator. Any other
    // line that looks like one may be the tail of a multi-line `$(` or subshell,
    // and rewriting it would hide the command on it (task.191 QA cycle 2, CR2-4).
    const armPosition =
      /^[ \t]*case\b[^;]*\bin[ \t]*$/.test(prev) ||
      /(?:;;&?|;&)[ \t]*$/.test(prev);
    if (/^[ \t]*case\b[^;]*\bin[ \t]*$/.test(line)) inCase = true;
    else if (/\besac\b/.test(line)) inCase = false;
    else if (inCase && armPosition)
      line = line.replace(/^([ \t]*)(?:[^\s|()]*\|)+[^\s|()]*\)/, "$1_)");
    if (line.trim() !== "" && !/^[ \t]*#/.test(line)) prev = line;
    return line;
  });
  return { code: lines.join("\n"), names };
}

/**
 * Decide one `bash`/`sh`/`source`/`.` invocation. A helper runs only when ALL of:
 *
 *   1. its path is a literal (no `$`, glob, quote or substitution) holding a `/`
 *      — without one, `source` and `bash` search PATH, and the file the shell
 *      finds is not the file this function read;
 *   2. it resolves, through realpath, to a regular `.sh` file inside the temp copy
 *      — a link out of the copy is refused, not followed;
 *   3. its own text, classified by this classifier in helper mode with the same
 *      root, is `runnable`, to MAX_HELPER_DEPTH.
 *
 * The fourth condition — the block does not change directory — is the caller's,
 * because it is a property of the whole block (`classifyInternal`).
 *
 * Returns `{ ok: true, sub }` or `{ ok: false, reason }`.
 */
function resolveHelperCall(inv, { helperRoot, depth, bindings, inherited }) {
  const path = inv.args.find((a) => a !== "");
  if (!path) return { ok: false, reason: `${inv.word} names no helper file` };
  const refuse = (why) => ({ ok: false, reason: `helper ${path}: ${why}` });
  if (path.startsWith("-") || !LITERAL_PATH.test(path))
    return refuse("not a literal path");
  if (!path.includes("/"))
    return refuse("no slash in the path, so the shell would search PATH");
  if (depth + 1 > MAX_HELPER_DEPTH)
    return refuse(`helper nesting deeper than ${MAX_HELPER_DEPTH}`);
  let real;
  let rootReal;
  try {
    rootReal = realpathSync(helperRoot);
    real = realpathSync(resolve(helperRoot, path));
  } catch {
    return refuse("not found in the working copy");
  }
  if (!isWithin(rootReal, real))
    return refuse("resolves outside the working copy");
  if (!real.endsWith(".sh") || !statSync(real).isFile())
    return refuse("not a regular .sh file");
  const sub = classifyInternal(readFileSync(real, "utf8"), bindings, {
    helperRoot,
    depth: depth + 1,
    helperMode: true,
    inherited,
  });
  if (sub.klass !== "runnable") return refuse(`${sub.klass}: ${sub.reason}`);
  return { ok: true, sub };
}

/**
 * Exactly one of: runnable | placeholder | mutating.
 * Order matters — `mutating` is decided before `placeholder`, so a block that is
 * both templated and dangerous is reported by its dangerous property.
 *
 * `helperRoot` (the temp copy) turns on the helper rule; without it `bash`,
 * `sh`, `source` and `.` stay unrecognised, as they always were. `depth` and
 * `helperMode` are this function's own recursion state.
 */
export function classifyBlock(code, bindings = {}, opts = {}) {
  const { klass, reason } = classifyFailClosed(code, bindings, opts);
  return { klass, reason };
}

/**
 * `classifyInternal` that never throws: an input the classifier cannot read is
 * refused, not an exception (task.290). A thrown error would reach the caller as
 * a crash, and a caller that treated "no verdict" as "no objection" would run it.
 */
function classifyFailClosed(code, bindings, opts) {
  try {
    return classifyInternal(code, bindings, opts);
  } catch {
    return {
      klass: "mutating",
      reason: "unrecognised-command: <unparseable> (fail-closed)",
    };
  }
}

/**
 * `classifyBlock` as a predicate: `true` only for `runnable`. The shape the
 * security probe engine scores (a falsy return is a refusal), so the classifier's
 * hostile corpus can be run against it (task.191 QA-2).
 */
export function isRunnableBlock(code, bindings = {}, opts = {}) {
  return classifyFailClosed(code, bindings, opts).klass === "runnable";
}

/**
 * `classifyBlock` plus what a caller sourcing this text needs: the functions it
 * defines (its own and those of the helpers it sources) and whether it changes
 * the working directory.
 */
/**
 * Record one more body a function name may run. A table entry is the list of
 * every definition of that name the block may see, from the text itself (`null`:
 * the text's own commands) and from each helper it sources, and a call reaches
 * the union. Bodies are only ever added, never replaced: which definition the
 * shell runs turns on order and on branches the classifier does not model, so
 * it assumes any of them may run. A table where the last write decided was
 * patched three cycles running (CR-1/CR-3, CR2-1/CR2-5, CR3-1).
 */
function addBody(table, name, body) {
  const bodies = table.get(name) ?? [];
  if (!bodies.includes(body)) bodies.push(body);
  table.set(name, bodies);
}

/** Every character `\s` matches that bash does not treat as a blank (see classifyInternal). */
const NOT_A_BASH_BLANK = /[^\S \t\n]/g;

// task.293 — INDIRECT EVALUATION. A value is built or stored harmlessly, and a later bash feature
// evaluates it: a prompt variable (`PS4`, `PS0`, `PS1`, `PS2`) or `${x@P}` expands prompt escapes,
// which include command substitution, and a name or operand bash reads as arithmetic (`printf -v`,
// `read`, `test -v`, `unset`, `$((x))`, `[[ $x -eq 1 ]]`, `${v:0:$x}`, `${!x}`) evaluates the
// subscript `a[$(cmd)]` it holds. The scans above judge each command for what it does directly and
// cannot see the later evaluation. So the class is refused where its source can be seen: a quoted
// literal that holds a substitution, where it is assigned or handed to a builtin that evaluates its
// operand. That covers the variable used later without tracking it (the assignment is the refusal).
//
// BOUNDED CLAIM, not "any indirect evaluation": the shapes this refuses are the table in
// qa-execute-snippets.test.mjs ("task.293 — indirect evaluation"). Known unseen shape: a value
// laundered through a command's OUTPUT (`y=$(echo 'a[$(cmd)]'); echo $((y))`).
// Set or declared, not merely mentioned: `echo PS4` and `echo "$PS1"` run nothing a prompt expands.
const PROMPT_VARIABLE_AT = /\bPS[0124]\b/g;
const PROMPT_TRANSFORM = /@P\s*\}/;
// Words that declare or set a variable, and words that make a later quoted literal an operand bash
// evaluates (or assigns): the segment before the literal is searched for any of them, so
// `read -r x <<< '…'` and `[[ '…' -eq 1 ]]` count. Lookbehind, not a consumed separator, so that
// every match of the global scan is found once, in one linear pass.
const DECLARING_WORD =
  /(?<![^\s;&|({])(?:export|declare|typeset|local|readonly|read|printf|mapfile|readarray|getopts|for|select|let)(?=[\s;&|)]|$)/g;
const EVALUATING_WORD =
  /(?<![^\s;&|({])(?:printf|read|test|unset|declare|typeset|local|export|readonly|let|eval|for|select|case|\[\[?|\(\()(?=[\s;&|)]|$)/g;
const ESCAPED_SUBSTITUTION_ASSIGNMENT =
  /(?:^|[\s;&|({])[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]\s]*\])?\+?=\S*\\[$`]/;
// DEFAULT-DENY, not a list of arithmetic spellings (task 293, third strike). Three cycles in a row
// found one more place where bash reads a variable as arithmetic (`$((x))`, then `${@:$1}`, then
// `${v[1+$1]}`), because every listing of those places is incomplete. So any live parameter
// expansion (`$name`, `${…}`, `$((…))`, `$[…]`, `$1`, `$@`) or a name followed by `[` (a subscript,
// `a[x]=1`) counts, wherever it is, unless it sits in inert text (single quotes, a comment, a
// quoted-delimiter here-document). `$'…'` is not an expansion.
const LIVE_EXPANSION = /\$(?=[A-Za-z_0-9{(\[@*#?!$-])|[A-Za-z0-9_}\]]\[/g;
// An assignment whose value is built by expansion into a subscript (`x="a[$y$z]"`). The text that a
// later `$((x))`, `read "$x"`, `test -v "$x"`, `unset "$x"`, `[[ $x -eq 1 ]]`, `${v:0:$x}` or `${!x}`
// evaluates is not in the block, so it cannot be judged, and the build is refused instead of
// tracking the variable to every place it is read (found by the random differential: the first
// version also required an arithmetic read, and `read "$x"` slipped past it).
// Only a value with an expansion INSIDE a `name[...]` is refused: bash reads a variable as a
// subscript only through `name[expr]`, and `n=$(sed 's/([0-9]+)/\1/'); echo $((n + 1))` is what the
// shipped helpers do (the `[` there follows a `(`, and no expansion sits inside the brackets).
// Known unseen shapes: the `[` or `$` arriving by expansion (`b='['`), and a value laundered through
// command output (`x=$(printf 'a[\044(cmd)]')`, task 293 QA-3).
const EXPANDED_ASSIGNMENT =
  /(?:^|[\s;&|({])[A-Za-z_][A-Za-z0-9_]*\+?=[^\n;&|]{0,300}[A-Za-z0-9_]\[[^\]\n]{0,300}[$`]/;
// For every position, whether a `[` opened earlier in the same command segment has not been closed
// yet, so a quote there sits inside a subscript (`${a['$(cmd)']}`, `a=([0'$(cmd)']=1)`,
// `a=([0+(1)'$(cmd)']=1)`). Depth-tracked over the whole segment, not "the character before the
// quote" (task 293 QA gate 6) and not "the same word" (gate 7: a paren inside the subscript ended a
// word scan and hid the `[`). One forward pass, so the cost is linear with no length cap. It reads
// brackets in quoted text too; that can only over-refuse.
function unclosedBracketMap(code) {
  const open = new Uint8Array(code.length + 1);
  let depth = 0;
  for (let i = 0; i < code.length; i += 1) {
    const c = code[i];
    if (c === "[") depth += 1;
    else if (c === "]") depth = depth > 0 ? depth - 1 : 0;
    else if (c === ";" || c === "&" || c === "|" || c === "\n") depth = 0;
    open[i] = depth > 0 ? 1 : 0;
  }
  return open;
}
// Text that spells a command substitution, whatever carries it: `$(` (not `$((`), an escaped `$\(`,
// or a backtick. The caller drops the ones the tokenizer parsed as real substitutions.
const LOOSE_LITERAL = /\$(?:\((?!\()|\\\()|`/g;
// A literal substitution inside a quoted span, by quote kind. `$'…'` escapes can spell `$(` or a backtick.
const LITERAL_IN_SINGLE = /\$\(|`/g;
const LITERAL_IN_DOUBLE = /\\\$\(|\\`/g;
const LITERAL_IN_ANSI_C = /\$\(|`|\\[xuU0-7]/g;

/** Start index of every match of the global `re` in `text`, ascending. */
function matchStarts(re, text) {
  const out = [];
  for (const m of text.matchAll(re)) out.push(m.index);
  return out;
}

/** Whether the ascending `starts` holds a value in `[lo, hi]`. */
function anyIn(starts, lo, hi) {
  let a = 0;
  let b = starts.length;
  while (a < b) {
    const mid = (a + b) >> 1;
    if (starts[mid] < lo) a = mid + 1;
    else b = mid;
  }
  return a < starts.length && starts[a] <= hi;
}

/**
 * Why `code` builds a value that a later bash feature would evaluate as code, or null.
 *
 * Linear in the text: the spans of the tokenizer are marked with a difference array and every
 * search is a global scan with a binary search over its hits, never a rescan per quote (a 20000-deep
 * nest of 20000 quotes made the first version quadratic; task.292's nesting test caught it).
 */
function indirectEvaluationHazard(code) {
  const n = code.length;
  // Each check below runs only when its trigger text is present: the docs scan classifies thousands
  // of blocks and almost none of them hold any of these (task 293's 10% cost bound).
  const hasPrompt = /PS[0124]/.test(code);
  const hasSubstitution = code.includes("$(") || /[`\\]/.test(code);
  const hasSubscript = code.includes("[") && /[$`]/.test(code);
  if (!hasPrompt && !hasSubstitution && !hasSubscript && !code.includes("@P"))
    return null;
  const quotes = [];
  const bodies = []; // here-document bodies
  const substStarts = []; // command substitutions the tokenizer found
  let dead = null; // comment and heredoc body: not code
  let comment = null; // comment text: never evaluated, never a literal carrier
  let inert = null; // text in which nothing expands: single quotes, comments, quoted here-documents
  let quoted = null; // a quote's interior: its separators are not the shell's
  const marks = () => {
    if (dead !== null) return;
    dead = new Int32Array(n + 2);
    quoted = new Int32Array(n + 2);
    inert = new Int32Array(n + 2);
    comment = new Int32Array(n + 2);
    for (const t of tokenize(code).tokens) {
      if (t.kind === "comment" || t.kind === "heredoc-body") {
        if (t.kind === "heredoc-body") bodies.push(t);
        else {
          comment[t.start] += 1;
          comment[t.end] -= 1;
        }
        dead[t.start] += 1;
        dead[t.end] -= 1;
        inert[t.start] += 1;
        inert[t.end] -= 1;
      } else if (t.kind === "subst") {
        substStarts.push(t.start);
      } else if (t.kind === "quote") {
        quotes.push(t);
        quoted[t.start + 1] += 1;
        quoted[t.end - 1] -= 1;
        if (t.quote === "'" || t.quote === "$'") {
          inert[t.start] += 1; // nothing inside single quotes expands
          inert[t.end] -= 1;
        }
      }
    }
    for (let i = 1; i <= n; i += 1) {
      dead[i] += dead[i - 1];
      quoted[i] += quoted[i - 1];
      inert[i] += inert[i - 1];
      comment[i] += comment[i - 1];
    }
  };
  let lastSep = null; // index of the last live command separator at or before each position
  const segmentStart = (at) => {
    if (lastSep === null) {
      marks();
      lastSep = new Int32Array(n);
      let cur = -1;
      for (let i = 0; i < n; i += 1) {
        if (dead[i] === 0 && quoted[i] === 0 && ";&|\n({`".includes(code[i]))
          cur = i;
        lastSep[i] = cur;
      }
    }
    return at <= 0 ? 0 : lastSep[at - 1] + 1;
  };

  // A prompt variable set or declared (not merely mentioned), and the `@P` transform.
  if (hasPrompt) {
    marks();
    const declaring = matchStarts(DECLARING_WORD, code);
    for (const m of code.matchAll(PROMPT_VARIABLE_AT)) {
      if (dead[m.index] !== 0) continue;
      const after = code.slice(m.index + 3, m.index + 5);
      if (after[0] === "=" || after === "+=")
        return "a prompt variable (PS0, PS1, PS2, PS4), whose value bash expands as a prompt string";
      if (anyIn(declaring, segmentStart(m.index), m.index - 1))
        return "a prompt variable (PS0, PS1, PS2, PS4), whose value bash expands as a prompt string";
    }
  }
  const prose = stripProse(code);
  if (PROMPT_TRANSFORM.test(prose)) return "a ${…@P} prompt-escape expansion";
  if (code.includes("\\") && ESCAPED_SUBSTITUTION_ASSIGNMENT.test(prose))
    return "a variable assigned an escaped substitution that a later expansion evaluates";
  if (hasSubscript && EXPANDED_ASSIGNMENT.test(prose))
    return "a variable built by expansion into a subscript, which a later read evaluates as arithmetic";
  if (!hasSubstitution) return null;

  // A quoted literal that holds a substitution, in a block that also evaluates something.
  marks();
  const literals = {
    "'": matchStarts(LITERAL_IN_SINGLE, code),
    '"': matchStarts(LITERAL_IN_DOUBLE, code),
    "$'": matchStarts(LITERAL_IN_ANSI_C, code),
  };
  // BLOCK-level, not per segment: the literal can reach the evaluation through a pipe, a joined
  // word (`x=a'[$(cmd)]'`), a variable or a here-string, and a segment boundary or the character
  // before the quote cannot follow it (task 293 QA cycle 2: two more spellings of the same family
  // after cycle 1's two). The cost is over-refusal, measured by the docs scan.
  let evaluates = null; // computed on the first literal only: most blocks hold none
  const blockEvaluates = () =>
    (evaluates ??=
      matchStarts(EVALUATING_WORD, code).some((i) => dead[i] === 0) ||
      matchStarts(LIVE_EXPANSION, code).some((i) => inert[i] === 0));
  const REFUSED =
    "a quoted substitution in a block that also evaluates a value as code or arithmetic";
  let openBrackets = null; // built on the first literal only
  for (const q of quotes) {
    const hits = literals[q.quote];
    if (!hits || !anyIn(hits, q.start + q.quote.length, q.end - 2)) continue;
    if ((openBrackets ??= unclosedBracketMap(code))[q.start] === 1)
      return "a quoted substitution used as a subscript, which bash evaluates as arithmetic";
    if (blockEvaluates()) return REFUSED;
  }
  // A quoted-delimiter here-document body is a literal too: `read x <<'EOF'` then `$((x))`.
  for (const b of bodies) {
    // An unquoted here-document expands its own `$(…)` (a `subst` token inside the body), which the
    // substitution rules already judge; only a body with none is literal text.
    if (substStarts.some((s) => s >= b.start && s < b.end)) continue;
    if (anyIn(literals["'"], b.start, b.end - 1) && blockEvaluates())
      return REFUSED;
  }
  // DEFAULT-DENY on the carrier as well (QA cycle 4: an unquoted `a\[\$\(cmd\)\]` word carried the
  // literal past a list of quote kinds). Any `$(` or backtick text the tokenizer did not parse as a
  // real substitution is literal text, whatever carries it. `$((` is arithmetic, not a substitution.
  if (substStarts.length > 0 || hasSubstitution) {
    const real = new Set(substStarts);
    for (const m of code.matchAll(LOOSE_LITERAL)) {
      if (real.has(m.index) || comment[m.index] !== 0) continue;
      if (blockEvaluates()) return REFUSED;
      break;
    }
  }
  return null;
}

function classifyInternal(
  code,
  bindings = {},
  {
    helperRoot = null,
    depth = 0,
    helperMode = false,
    inherited = null,
    // True for the re-classification of forwarded ARGUMENTS (`forwardedHazard`):
    // their variables are the caller's to judge, and the variable-argument rule is
    // about a block's own text (task.274).
    forwarded = false,
  } = {},
) {
  // task.292: bash's blanks are space, tab and newline only. A CR, FF, VT, NBSP or U+2028 is a
  // character OF a word, but every scan below splits and matches with `\s`, which counts them as
  // blanks: `A=1<CR>echo touch out` read as the command `echo` when bash runs `touch`. Stated once,
  // here: those characters become one word character before any scan reads the text, so no `\s`
  // below can see a blank that bash does not. The text is only ever classified, never executed.
  code = code.replace(NOT_A_BASH_BLANK, "\u0001");
  // `defines`: every function this text defines, its own and those of the helpers
  // it sources — what a caller sourcing it inherits. `trusted`: the subset that
  // may stand as a known word (`shadowsCommand`). `forwardsTo`: for each defined
  // function, EVERY body the block may run under that name (`addBody`).
  let defines = new Set();
  const forwardsTo = new Map();
  if (helperMode) {
    const prepared = prepareHelperText(code);
    code = prepared.code;
    defines = prepared.names;
    for (const n of defines) addBody(forwardsTo, n, null);
  }
  // A SOURCED helper runs in its caller's shell, so the functions the caller has
  // already sourced are callable in it: its `ls` may be one (CR2-5). They join
  // its own definitions of the same name; they never replace them (CR3-1).
  if (inherited)
    for (const n of inherited.defines) {
      defines.add(n);
      for (const b of inherited.forwardsTo.get(n) ?? [null])
        addBody(forwardsTo, n, b ?? inherited.commands);
    }
  // Why a helper call in this text could run code the classifier never read, or
  // null: a start-up variable named, set through a name it cannot read, or PATH
  // moved. A sourced helper's reason becomes its caller's.
  let startupHazard = STARTUP_VARIABLE.test(stripProse(code))
    ? `a shell start-up variable set (${STARTUP_VARIABLES.join(", ")})`
    : null;
  let movesPath = PATH_WORD.test(stripProse(code)) || "PATH" in bindings;
  const commands = new Set();
  const verdict = (klass, reason, changesDir = false) => ({
    klass,
    reason,
    defines,
    forwardsTo,
    commands,
    startupHazard,
    movesPath,
    changesDir,
  });

  // Scan prose-stripped code, not raw: a heredoc body or a comment that merely
  // MENTIONS `git push` is documentation. Scanning raw text would classify a doc
  // for its own examples and skip a block that is in fact safe to run.
  // A backslash-newline is removed by the shell before it reads a word, so
  // `-dele\<LF>te` is `-delete` (T274-QA-4). Which backslash-newlines join is the tokenizer's to
  // say: an escaped pair (`\\`) followed by a newline does not.
  const prose = cutJoins(stripProse(code), "");

  // Judged twice: as written, and with quotes and backslashes removed, as the
  // command receives them. `find docs "-delete"` and `find docs '-delete'` both run
  // `-delete`, and neither matched a pattern that wants whitespace before the dash
  // (task.274, obs #67 — the same two readings `forwardedHazard` applies to the
  // arguments a helper forwards).
  const unquotedProse = prose.replace(/['"\\]/g, "");
  for (const [re, name] of DENY_PATTERNS) {
    if (re.test(prose) || re.test(unquotedProse))
      return { klass: "mutating", reason: `deny-list: ${name}` };
  }

  // Shape 4 (task.274, obs #67; owner decision, Phase 1): a deny-listed command
  // whose argument is a variable expansion. `X=-delete; find docs $X` runs
  // `find docs -delete`, and no pattern above can see it because the flag is not in
  // the text. The scan tracks no values, so it refuses the form instead.
  // Not in helper mode: a shipped helper's variables are its call's arguments
  // (`find "${dir}"`, `"$@"`), which `forwardedHazard` judges as written at the call
  // site. Refusing them here would refuse every shipped read-only helper.
  const variableArg =
    helperMode || forwarded ? null : variableArgumentToDenyListed(prose);
  if (variableArg !== null)
    return {
      klass: "mutating",
      reason: `deny-list: argument to ${variableArg} that the shell expands at run time (variable, substitution or $'…'; the scan tracks no values)`,
    };

  // Deliberately NOT split on a single `|`: sed accepts it as an s/// delimiter,
  // so splitting there tears `s|a|b|wfile` apart and the write disappears.
  // `sedWritesFile` locates each `sed` token itself, so pipeline segmentation
  // buys nothing here anyway.
  if (prose.split(/\n|;|&&|\$\(|`/).some((seg) => sedWritesFile(seg))) {
    return { klass: "mutating", reason: "deny-list: sed w write" };
  }

  if (hasOutputFlagWrite(prose)) {
    return { klass: "mutating", reason: "deny-list: -o output flag" };
  }

  // CR-1 — a write redirection makes any command mutating, allow-listed or not.
  // `stripNonCode` is the costliest step of a classification and its result is
  // used four times below, so it is made once.
  const nonCode = stripNonCode(code);
  const redirectScan = blankConditionalSpans(nonCode);
  if (WRITE_REDIRECT.test(redirectScan)) {
    return { klass: "mutating", reason: "write-redirection" };
  }
  // task.289: `<>` opens a file for reading AND writing, and has no `>` to find.
  if (redirectScan.includes("<>") && READ_WRITE_REDIRECT.test(redirectScan)) {
    return { klass: "mutating", reason: "read-write-redirection" };
  }
  // task.289: a function named after a command changes what the name runs.
  if (!helperMode && !forwarded) {
    const shadowed = shadowingFunctions(nonCode);
    if (shadowed.length > 0)
      return {
        klass: "mutating",
        reason: `function-shadows-command: ${shadowed[0]}`,
      };
  }

  // `command -v X` / `command -V X` is a pure lookup: it prints a path and runs
  // nothing. Bare `command X` runs X, so the exception is anchored to the flag and
  // nothing else. Without it the repository's own documented zsh guard
  // (`command -v zsh >/dev/null`) is unrunnable by the gate that recommends it.
  // Bare `command X …` (no option) runs X with the same argv and nothing else —
  // the one runner whose grammar is trivial. Drop the word and classify X by its
  // own rules: `command node x.mjs` scans as `node x.mjs` (runnable), `command mv
  // a b` scans as `mv a b` (mutating, QA-5 still holds). Without this the repo's
  // own `command`-prefix trap (nvm's node shell function) made every documented
  // `command node …` block unrunnable by the gate that prescribes the prefix
  // (obs #90). `command -p X` (PATH override) and `command -v` are NOT this case:
  // -v is rewritten above, and an option-bearing form stays a refused runner.
  const codeForScan = nonCode
    .replace(/\bcommand\s+-[vV]\b/g, "true")
    .replace(/(^|[\s;|&(])command\s+(?![-])/g, "$1");

  const invocations = commandInvocations(codeForScan);
  let changesDir = invocations.some((inv) => DIRECTORY_CHANGERS.has(inv.word));
  for (const inv of invocations) {
    if (!inv.keyword && inv.word !== "<unparseable>") commands.add(inv.word);
    const why = assignmentHazard(inv);
    if (why && !startupHazard) startupHazard = why;
  }
  // The same invocations with their arguments as written — what a forwarded
  // argument is judged by. Null when the two readings disagree: then no call that
  // forwards arguments is admitted (fail-closed).
  const raw = rawInvocations(
    stripProse(code)
      .replace(/\bcommand\s+-[vV]\b/g, "true")
      .replace(/(^|[\s;|&(])command\s+(?![-])/g, "$1"),
    invocations,
  );
  const argsOf = (i) => (raw ? operands(raw[i].args) : null);
  const positional = raw ? raw.flatMap(positionalArgs) : null;

  // What a defined function's arguments reach: the commands of every body it may
  // have, closed over the defined functions those call. A `null` body, or a
  // function with no entry, is this text's own, and reaches every command this
  // text runs.
  const reach = (cmds, defs, fwd, own, seen = new Set()) => {
    const out = new Set();
    for (const c of cmds) {
      if (defs.has(c)) {
        if (seen.has(c)) continue;
        seen.add(c);
        for (const body of fwd.get(c) ?? [null])
          for (const d of reach(body ?? own, defs, fwd, own, seen)) out.add(d);
      } else if (!SHELL_KEYWORDS.has(c)) out.add(c);
    }
    return out;
  };
  // The first deny rule an argument list trips when written to one of `cmds`, or
  // null. Judged twice: as written, which is exactly what the same arguments typed
  // after the command would get, and with quotes and backslashes removed, as the
  // command receives them — `"-delete"` and `-dele\\te` are `-delete` (CR2-2).
  // An `unrecognised-command` says nothing about the arguments, so it is not one.
  // Null args mean the raw reading failed: nothing can be said, so refuse.
  const forwardedHazard = (cmds, args) => {
    if (args === null) return "arguments the classifier cannot read";
    if (args.length === 0) return null;
    // task.289: the arguments are forwarded to EVERY command the function may run,
    // and the scan cannot tell which one receives them. A deny-list reason on any
    // of them stands. A flag outside a command's table stands only when EVERY
    // table-governed command refuses it: `-name` for `find` is a flag `sed` has
    // no entry for, and refusing it there would refuse every helper that runs
    // both. A flag one command accepts and another would act on is the deny
    // list's to catch (`sed -i`), as it was.
    const flagRefusals = new Map();
    const governed = [...cmds].filter(
      (c) => SAFE_COMMANDS.has(c) && SAFE_FLAGS[c] && !SAFE_FLAGS[c].any,
    );
    for (const cmd of cmds) {
      const name = cmd.replace(":", " ");
      for (const text of [args.join(" "), args.map(unquote).join(" ")]) {
        const r = classifyInternal(`${name} ${text}`, bindings, {
          forwarded: true,
        });
        if (r.klass !== "mutating" || /^unrecognised-command/.test(r.reason))
          continue;
        // A sed script read and found to run or write stands on its own: `-newer`
        // is accepted by `find` and is `-n -e wer` to sed, which writes a file.
        if (
          /^flag-not-allowed/.test(r.reason) &&
          !/^flag-not-allowed: sed script/.test(r.reason)
        ) {
          if (!flagRefusals.has(cmd)) flagRefusals.set(cmd, r.reason);
          continue;
        }
        return `${name}: ${r.reason}`;
      }
    }
    if (governed.length > 0 && governed.every((c) => flagRefusals.has(c)))
      return `${governed[0]}: ${flagRefusals.get(governed[0])}`;
    return null;
  };

  // The helper rule. Each admitted invocation is known for ITSELF only: admitting
  // `bash a.sh` must not license a later `bash b.sh`, so admission is per index,
  // never per word.
  const admitted = new Set();
  if (helperRoot) {
    const calls = invocations
      .map((inv, i) => [inv, i])
      .filter(([inv]) => HELPER_RUNNERS.has(inv.word));
    for (const [inv, i] of calls) {
      const sourced = inv.word === "source" || inv.word === ".";
      const r = resolveHelperCall(inv, {
        helperRoot,
        depth,
        bindings,
        inherited: sourced ? { defines, forwardsTo, commands } : null,
      });
      if (!r.ok) return verdict("mutating", r.reason);
      admitted.add(i);
      const reaches = reach(
        r.sub.commands,
        r.sub.defines,
        r.sub.forwardsTo,
        r.sub.commands,
      );
      // A helper's arguments are its positional parameters, and so are `set --`'s
      // for a helper sourced into this shell (CR2-2). The path is the first
      // operand; everything after it is an argument.
      const path = inv.args.find((a) => a !== "");
      const all = argsOf(i);
      const args = all && all.slice(1);
      const why = forwardedHazard(
        reaches,
        args && sourced ? [...args, ...positional] : args,
      );
      if (why)
        return verdict(
          "mutating",
          `helper ${path} forwards its arguments to ${why}`,
        );
      // A function of this text that calls the helper reaches what it runs.
      for (const c of reaches) commands.add(c);
      // A SOURCED helper runs in this shell: its functions become callable here,
      // and a `cd` inside it moves this shell. `bash x.sh` runs in a child, so
      // neither reaches the caller.
      if (sourced) {
        for (const n of r.sub.defines) {
          defines.add(n);
          for (const b of r.sub.forwardsTo.get(n) ?? [null])
            addBody(forwardsTo, n, b ?? r.sub.commands);
        }
        if (r.sub.changesDir) changesDir = true;
        if (r.sub.startupHazard && !startupHazard)
          startupHazard = r.sub.startupHazard;
        if (r.sub.movesPath) movesPath = true;
      }
    }
    if (calls.length > 0 && changesDir)
      return verdict("mutating", "helper call after a directory change");
    // A --bind reaches the shell's environment too.
    // A key that is not a plain name (`BASH_FUNC_ls%%`) defines a function in a
    // child bash, so it is refused with them.
    const boundStartup = Object.keys(bindings).some(
      (k) => STARTUP_VARIABLES.includes(k) || !PLAIN_NAME.test(k),
    );
    if (calls.length > 0 && boundStartup)
      return verdict(
        "mutating",
        `helper call with a shell start-up variable set (${STARTUP_VARIABLES.join(", ")})`,
      );
    if (calls.length > 0 && startupHazard)
      return verdict("mutating", `helper call with ${startupHazard}`);
    if (calls.length > 0 && movesPath)
      return verdict("mutating", "helper call with PATH changed");
  }

  // task.293: a value built harmlessly and evaluated later (prompt escapes, arithmetic operands).
  // After the helper rule on purpose: a helper call that also names a start-up variable keeps the
  // `helper call with …` reason its tests pin; a direct use, which that rule never reaches, lands here.
  const indirect = indirectEvaluationHazard(code);
  if (indirect !== null)
    return verdict("mutating", `indirect-evaluation: ${indirect}`);

  // A call to a helper-defined function is only as permissive as its arguments
  // would be if written to each command it reaches: `newest_numbered docs dod
  // -delete` forwards `-delete` to `find` (task.191 CR-1). Read off the scan's
  // invocations, whose word is already unquoted, so `newest_\\numbered` is the
  // same call (CR2-1).
  for (const [i, inv] of invocations.entries()) {
    if (inv.keyword || !defines.has(inv.word)) continue;
    const why = forwardedHazard(
      reach([inv.word], defines, forwardsTo, commands),
      argsOf(i),
    );
    if (why)
      return verdict(
        "mutating",
        `function ${inv.word} forwards its arguments to ${why}`,
      );
  }

  const unrecognised = (w) => {
    if (COMMAND_RUNNERS.has(w)) return true; // CR-5/CR-6 — before the allow-list
    if (SHELL_KEYWORDS.has(w)) return false;
    if (SAFE_COMMANDS.has(w)) return false;
    // After the runner check: a helper that defines `xargs` does not make
    // `xargs` safe — and no defined name that shadows a real command is trusted.
    // A name that shadows nothing is safe only while PATH is the host's (CR2-6).
    if (defines.has(w) && !movesPath && !shadowsCommand(w)) return false;
    if (w.startsWith("git:")) return !SAFE_GIT_SUBCOMMANDS.has(w.slice(4));
    return true;
  };
  const unknown = invocations
    .filter(({ word: w }, i) => !admitted.has(i) && unrecognised(w))
    .map((inv) => inv.word);

  if (unknown.length > 0) {
    return verdict(
      "mutating",
      `unrecognised-command: ${[...new Set(unknown.map((w) => w.replace(":", " ")))].join(", ")} (fail-closed)`,
    );
  }

  // task.289: every allowed command's flags and operands are judged against its
  // table entry (SAFE_FLAGS). A flag nobody listed is refused, so a spelling nobody
  // thought of cannot run. Lenient about expansions in helper mode and for
  // forwarded arguments, where the variables are the caller's to judge.
  // The variable maps are read once, and only when a table-governed command is
  // there to judge: most blocks run none, and a docs scan classifies thousands.
  let flagCtx = null;
  for (const [i, inv] of invocations.entries()) {
    if (
      inv.keyword ||
      admitted.has(i) ||
      !SAFE_COMMANDS.has(inv.word) ||
      defines.has(inv.word) ||
      SAFE_FLAGS[inv.word]?.any
    )
      continue;
    flagCtx ??= {
      assigned: assignedVariables(prose),
      bindings,
      unbound: new Set(unboundVariables(code, bindings)),
      lenient: helperMode || forwarded,
      collapsed: !raw,
    };
    const why = flagViolation(inv.word, raw ? raw[i].args : inv.args, flagCtx);
    if (why) return verdict("mutating", why);
  }
  // A substitution cuts the arguments above at its `$(` or `<(`, so what follows
  // it, or what follows a prefix assignment holding one, was never judged. The
  // same text with each substitution masked as one word has no cut, and every
  // governed command in it is judged whole (QA 2, 4).
  if (/\$\(|`|[<>]\(/.test(prose)) {
    const masked = maskSubstitutions(prose);
    const maskedInv = masked === null ? null : commandInvocations(masked);
    const maskedRaw = maskedInv ? rawInvocations(masked, maskedInv) : null;
    // A block the masked reading cannot parse is refused, whatever it runs: a
    // carve-out for "no governed command" let `X=$(echo ")") touch out` through,
    // because the command the scan could not read was the one that mattered.
    if (!maskedRaw)
      return verdict(
        "mutating",
        "unrecognised-command: <unparseable> (a substitution the scan cannot read; fail-closed)",
      );
    for (const m of maskedRaw) {
      // The unmasked reading already judged an unparseable word.
      if (m.keyword || m.word === "<unparseable>") continue;
      // A command written after a closed substitution (`X=$(true) python3 x.py`)
      // is an argument of the substitution's own segment in the unmasked reading,
      // so the allow-list never saw it. It is judged here.
      if (!commands.has(m.word) && unrecognised(m.word))
        return verdict(
          "mutating",
          `unrecognised-command: ${m.word.replace(":", " ")} (fail-closed)`,
        );
      if (
        !SAFE_COMMANDS.has(m.word) ||
        defines.has(m.word) ||
        SAFE_FLAGS[m.word]?.any
      )
        continue;
      flagCtx ??= {
        assigned: assignedVariables(prose),
        bindings,
        unbound: new Set(unboundVariables(code, bindings)),
        lenient: helperMode || forwarded,
        collapsed: !raw,
      };
      const why = flagViolation(m.word, m.args, {
        ...flagCtx,
        collapsed: false,
      });
      if (why) return verdict("mutating", why);
    }
  }

  // A helper's `<dir>` comments and `$1` arguments are code and arguments, not
  // slots, so helper mode stops here.
  if (helperMode) return verdict("runnable", null, changesDir);

  // Same reasoning for template slots. The reason names them, so the caller
  // knows which `--slot` to pass (obs #186).
  const slots = unfilledSlots(prose);
  if (slots.length > 0)
    return verdict("placeholder", `template slot: ${slots.join(", ")}`);

  const unbound = unboundVariables(code, bindings);
  if (unbound.length > 0) {
    return verdict("placeholder", `unbound-variable: ${unbound.join(", ")}`);
  }

  return verdict("runnable", null, changesDir);
}

// ── Dual-shell execution ──────────────────────────────────────────────────────

let ZSH_AVAILABLE = null;

/** Memoised — this used to spawn a subprocess on every call, including once per
 *  `{ skip: !zshAvailable() }` predicate in the test suite. */
export function zshAvailable() {
  if (ZSH_AVAILABLE === null) {
    const r = spawnSync("command", ["-v", "zsh"], {
      shell: "/bin/bash",
      encoding: "utf8",
    });
    ZSH_AVAILABLE = r.status === 0;
  }
  return ZSH_AVAILABLE;
}

/**
 * Run one block under each shell and compare.
 *
 * stdout is the load-bearing comparison, NOT exit status. The defect this whole
 * mechanism exists for exits 1 under both shells and differs only in what it
 * printed — comparing status alone would have missed it.
 */
/**
 * Recursive listing of `dir` as `relative path -> mtimeMs:size`.
 *
 * The containment check below compares two of these. It is deliberately cheap and
 * deliberately NOT a substitute for classification — see `runBlock`.
 */
export function snapshotTree(dir, skipDir = null) {
  const out = new Map();
  const walk = (d, prefix) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      const abs = `${d}/${e.name}`;
      // Do not descend into the working copy. Writes there are expected, and a
      // large `--copy` would otherwise be walked twice per block — turning a
      // safety net into the run's dominant cost.
      if (rel === skipDir) continue;
      if (e.isDirectory()) {
        walk(abs, rel);
        continue;
      }
      try {
        const st = statSync(abs);
        out.set(rel, `${st.mtimeMs}:${st.size}`);
      } catch {
        /* raced */
      }
    }
  };
  walk(dir, "");
  return out;
}

/**
 * CR-12 — a minimal environment for a child process, not the parent's.
 *
 * Spreading `process.env` handed every snippet GITHUB_TOKEN and tracker
 * credentials, contradicting this file's own claim that the execution
 * environment carries none. Inherited PWD also disagreed with `cwd`, which can
 * manufacture disagreement noise by itself.
 *
 * This is an ALLOW-LIST, and it must stay one. Six names cross; everything else
 * — every token, every credential, every CI variable — is absent because it was
 * never copied, not because it was deleted. A future maintainer who needs one
 * more variable adds one more key here, where the diff is visible; the failure
 * mode being designed out is `...process.env` re-appearing as a convenience.
 *
 * `bindings` are caller-supplied values, applied last so a caller can override a
 * base key deliberately. They are values the CALLER chose, not values inherited
 * from the ambient environment, which is why they are allowed to win.
 *
 * Extracted from `runBlock` for task.80 so the probe engine
 * (`security-probe.mjs`) contains its children exactly as the snippet path does,
 * rather than re-improvising containment per caller. Behaviour is byte-identical
 * to the inlined version it replaced.
 *
 * @param {{cwd?: string, bindings?: Record<string,string>}} opts
 * @returns {Record<string,string>} the child environment
 */
export function sandboxEnv({ cwd, bindings = {} } = {}) {
  return {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    LANG: process.env.LANG ?? "C",
    TERM: "dumb",
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    PWD: cwd ?? process.cwd(),
    ...bindings,
  };
}

// A documented argument slot may name a path or a file: `<path/to/skill-folder>`,
// `<bug.md>`. The classifier's own `<name>` slot grammar leaves those out (it
// would change what classifies), so the syntax check reads the wider shape.
const ANGLE_TEMPLATE = /(?<![<>&\w])<[A-Za-z][\w .:/-]*>/;

/**
 * Whether a block that is NOT run should still be parsed. A `mutating` block is
 * real code, and so is one refused for an unbound variable. A block awaiting a
 * `{slot}` or `<slot>` is not: its placeholder routinely reads as a redirect or an
 * operator, so a parse failure there is the template, not broken prose.
 */
function isSyntaxCheckable(klass, reason, code = "") {
  // A `mutating` block that still holds an unfilled slot is a template: `env -i
  // <command> <candidate>` does not parse, and is not meant to (T274-QA-3).
  if (klass === "mutating")
    return unfilledSlots(code).length === 0 && !ANGLE_TEMPLATE.test(code);
  return klass === "placeholder" && /^unbound-variable/.test(reason ?? "");
}

/**
 * `<shell> -n -c <code>` for each shell: parse, run nothing. One execution-failure
 * finding per shell that cannot parse the block (task.274, obs #54). `syntax: true`
 * is what tells it from a run that exited non-zero.
 */
function syntaxFindings(code, shells, timeout) {
  const env = sandboxEnv({});
  const out = [];
  for (const shell of shells) {
    const r = spawnSync(shell, ["-n", "-c", "--", code], {
      timeout,
      encoding: "utf8",
      env,
    });
    // A shell that could not be started, or timed out, says nothing about syntax.
    if (r.error || r.status === 0 || r.status === null) continue;
    const first = (r.stderr ?? "").split("\n").find((l) => l.trim() !== "");
    out.push({
      kind: "execution-failure",
      shell,
      confidence: "high",
      syntax: true,
      detail: `${shell} -n: syntax error, the block does not parse${first ? `: ${first}` : ""}`,
    });
  }
  return out;
}

export function runBlock(
  code,
  { shells, cwd, timeout = 10_000, bindings = {}, sandboxRoot = null } = {},
) {
  const env = sandboxEnv({ cwd, bindings });
  const runs = {};

  // Defence in depth. Classification is the first line and it has been wrong
  // before — thirteen ways, found in one review. This is the second line: watch a
  // canary directory beside the working copy and report any block that reaches
  // outside its sandbox, whatever the classifier concluded.
  // The sentinel engages only when the caller names the sandbox root explicitly.
  //
  // Deriving it as `${cwd}/..` was wrong and expensive: `runBlock` accepts any
  // cwd, so a bare temp directory made the sentinel walk the whole of /tmp twice
  // per block — it hung the test suite for two minutes before being killed. A
  // safety net that guesses its own boundary is not a safety net.
  const sentinelRoot = sandboxRoot;
  const workDirName = sentinelRoot && cwd ? cwd.split("/").pop() : null;
  const before = sentinelRoot ? snapshotTree(sentinelRoot, workDirName) : null;

  for (const shell of shells) {
    const r = spawnSync(shell, ["-c", code], {
      cwd,
      timeout,
      encoding: "utf8",
      env,
    });
    runs[shell] = {
      stdout: (r.stdout ?? "").replace(/\n+$/, ""),
      stderr: (r.stderr ?? "").replace(/\n+$/, ""),
      status: r.status,
      // Node sets `error.code = "ETIMEDOUT"` on a timeout, and that is sufficient.
      // Also testing `signal === "SIGTERM"` mislabelled any block that terminates
      // itself (`kill -TERM $$`) as a timeout, at high confidence.
      timedOut: r.error?.code === "ETIMEDOUT",
    };
  }

  const findings = [];

  // A failure that reproduces identically in every shell is not a portability
  // defect — it is a block that needs a context this gate did not supply, or a
  // snippet that is simply broken. The confidence stays `high` per the rule, but
  // saying so in the detail is what lets a reviewer triage it in one read
  // instead of re-running it by hand.
  const statuses = shells.map((sh) => runs[sh].status);
  const stdouts = shells.map((sh) => runs[sh].stdout);
  const consistent =
    shells.length > 1 &&
    statuses.every((x) => x === statuses[0]) &&
    stdouts.every((x) => x === stdouts[0]);

  for (const shell of shells) {
    const run = runs[shell];
    if (run.timedOut) {
      findings.push({
        kind: "execution-timeout",
        shell,
        confidence: "high",
        detail: `${shell} exceeded ${timeout}ms`,
      });
    } else if (run.status !== 0) {
      findings.push({
        kind: "execution-failure",
        shell,
        confidence: "high",
        detail:
          `${shell} exited ${run.status}` +
          (run.stderr ? `: ${run.stderr.split("\n")[0]}` : "") +
          (consistent
            ? " (identical in every shell — not a portability defect)"
            : ""),
      });
    }
  }

  if (before) {
    const after = snapshotTree(sentinelRoot, workDirName);
    const outside = [];
    for (const [k, v] of after) if (before.get(k) !== v) outside.push(k);
    for (const k of before.keys())
      if (!after.has(k)) outside.push(`${k} (removed)`);
    if (outside.length > 0) {
      findings.push({
        kind: "escaped-sandbox",
        confidence: "high",
        detail:
          `a block classified runnable wrote outside its working copy: ` +
          `${outside.slice(0, 5).join(", ")}${outside.length > 5 ? ` (+${outside.length - 5} more)` : ""}`,
      });
    }
  }

  // Two channels a shell can disagree on, and the stdout one is not the only one
  // that matters. The task-66 fixture disagrees on stdout while its exit status
  // AGREES, which is why the stdout comparison exists and is load-bearing. The
  // task-77 predicate is the mirror case: both shells print nothing and the entire
  // defect is in the exit status (`bash` 2, `zsh` 0 — a failed zsh glob aborts the
  // command substitution, and zsh's `[` then reads the empty operand in `-ge` as
  // 0). Comparing only stdout labels that a plain `execution-failure` and never
  // names the portability defect, which is the thing a reader needs to see.
  //
  // `channel` rather than a second `kind`: every existing consumer keys on
  // `kind === "shell-disagreement"` and keeps working, and the detail says which
  // channel diverged.
  //
  // This cannot turn a previously clean file red. A status disagreement implies at
  // least one non-zero status, which has already produced an `execution-failure`
  // finding above — so the file was never clean. The addition is a label on a
  // failure the gate already caught, not a new gate.
  if (shells.length > 1) {
    const [a, b] = shells;
    const lineCount = (out) => (out === "" ? 0 : out.split("\n").length);
    const statusDiffers = runs[a].status !== runs[b].status;
    if (runs[a].stdout !== runs[b].stdout) {
      findings.push({
        kind: "shell-disagreement",
        channel: "stdout",
        confidence: "medium",
        detail:
          `${a} printed ${lineCount(runs[a].stdout)} line(s), ` +
          `${b} printed ${lineCount(runs[b].stdout)} line(s)` +
          // Only ONE finding fires per block — stdout is the more specific
          // statement — but staying silent about a status divergence that is also
          // present understates the defect to the one reader who must act on it.
          (statusDiffers
            ? `; exit status also differs (${a} ${runs[a].status}, ${b} ${runs[b].status})`
            : ""),
      });
    } else if (statusDiffers) {
      findings.push({
        kind: "shell-disagreement",
        channel: "status",
        confidence: "medium",
        detail:
          `identical output, different exit status — ${a} exited ${runs[a].status}, ` +
          `${b} exited ${runs[b].status}. A predicate used as a gate would pass in ` +
          `one shell and fail in the other`,
      });
    }
  }

  return { runs, findings };
}

// ── File-level orchestration ──────────────────────────────────────────────────

/**
 * True when `child` is `parent` or lies beneath it. Built on path.relative
 * rather than a string prefix: `parent + sep` is `//` for the filesystem root,
 * which no absolute path starts with, so a prefix test let SRC `/` through the
 * SRC-contains-sandbox refusal (TASK-149 CR4-4). `..name` is a child, not an
 * escape: only `..` itself or a `../` prefix leaves (TASK-149 CR6-4 — a bare
 * startsWith("..") refused `--copy-as SRC:..seed`). Pure — no filesystem access.
 */
export function isWithin(parent, child) {
  const rel = relative(parent, child);
  return !(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel));
}

/**
 * True when `dir` is the root of a linked git worktree: its `.git` is a FILE
 * whose `gitdir:` points into a `worktrees/` admin directory. Worktrees live
 * inside the repository (`.worktrees/<name>` by default), so `--copy .` would
 * otherwise copy, and then snapshot, one full checkout per worktree. A
 * submodule's `.git` file points into `modules/` and is kept.
 */
export function isLinkedWorktree(dir) {
  let text;
  try {
    const gitPath = join(dir, ".git");
    if (!lstatSync(gitPath).isFile()) return false;
    text = readFileSync(gitPath, "utf8");
  } catch {
    return false;
  }
  // git writes one line, `gitdir: <path>`. Read it with indexOf and trim,
  // never a backtracking regex: `^gitdir:\s*(.+?)\s*$` was quadratic in the
  // whitespace of a malformed file, and this runs on every nested .git file.
  const nl = text.indexOf("\n");
  const line = (nl === -1 ? text : text.slice(0, nl)).trim();
  if (!line.startsWith("gitdir:")) return false;
  const target = line.slice("gitdir:".length).trim();
  return /[\\/]worktrees[\\/][^\\/]+$/.test(target);
}

/**
 * A cpSync filter that skips linked worktrees nested below `root`. The root
 * itself is always copied, even when it is a worktree: QA commonly runs inside
 * one, and refusing the directory it was asked to copy would be wrong.
 */
function skipNestedWorktrees(root) {
  const top = resolve(root);
  return (src) => resolve(src) === top || !isLinkedWorktree(src);
}

/**
 * Throw when any path component between `root` (exclusive) and `target`
 * (inclusive) exists and is a symlink. Components that do not exist yet end the
 * walk: nothing below a missing directory can be a link. `lstat`, never `stat`,
 * so a dangling link is seen rather than read as absent.
 */
function refuseSymlinkedPath(root, target, dest) {
  let cursor = root;
  for (const part of relative(root, target).split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    let st;
    try {
      st = lstatSync(cursor);
    } catch {
      return;
    }
    if (st.isSymbolicLink())
      throw new Error(
        `--copy-as DEST passes through a symlink in the working directory: ${dest}`,
      );
  }
}

/**
 * The changed line ranges of `filePath` against `rev`, from `git diff -U0`.
 *
 * Run from the FILE's directory, never the temp copy: the copy holds no history,
 * and the revision belongs to the repository the file lives in. A revision git
 * rejects is a hard error (`bad-diff-base`), never "nothing changed" — reading
 * a failed lookup as an empty diff would report a clean change set.
 */
export function changedLineRanges(filePath, rev) {
  if (typeof rev !== "string" || rev === "" || rev.startsWith("-"))
    throw new Error(`bad-diff-base: not a revision: ${rev}`);
  const abs = resolve(filePath);
  // The user's diff config must not reach the parse: colour puts escapes in the
  // hunk headers, and an external or textconv driver replaces them (task.191 CR-4).
  const r = spawnSync(
    "git",
    [
      "diff",
      "--no-color",
      "--no-ext-diff",
      "--no-textconv",
      "-U0",
      rev,
      "--",
      abs,
    ],
    { cwd: dirname(abs), encoding: "utf8" },
  );
  if (r.status !== 0)
    throw new Error(
      `bad-diff-base: git diff ${rev} failed: ${(r.stderr || r.error?.message || "").trim()}`,
    );
  const ranges = parseDiffRanges(r.stdout);
  // A diff that printed something beyond its headers but yielded no hunk was not
  // read — never "nothing changed" (a binary diff, or a shape this parser does not
  // know). A mode-only or rename-only change is headers alone, and has no lines.
  const DIFF_HEADER =
    /^(?:diff --git |index |old mode |new mode |deleted file mode |new file mode |similarity index |dissimilarity index |rename from |rename to |copy from |copy to |--- |\+\+\+ )/;
  const unread = r.stdout
    .split("\n")
    .filter((l) => l !== "" && !DIFF_HEADER.test(l));
  if (ranges.length === 0 && unread.length > 0)
    throw new Error(
      `bad-diff-base: git diff ${rev} printed no hunk this parser reads`,
    );
  return ranges;
}

/** True when git does not track `filePath` — it then has no diff to report. */
export function isUntracked(filePath) {
  const abs = resolve(filePath);
  const r = spawnSync("git", ["ls-files", "--error-unmatch", "--", abs], {
    cwd: dirname(abs),
    encoding: "utf8",
  });
  return r.status !== 0;
}

/**
 * `@@ -a,b +c,d @@` → `[c, c + d - 1]` on the new side. A pure deletion
 * (`d = 0`) removed lines BETWEEN lines `c` and `c + 1`; it is the point
 * `c + 0.5`, so it marks a block only when the gap falls inside the block's
 * span — never the block that ends at line `c` (task.191 CR-6).
 */
export function parseDiffRanges(diffText) {
  const ranges = [];
  for (const m of diffText.matchAll(
    /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm,
  )) {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    ranges.push(
      count === 0 ? [start + 0.5, start + 0.5] : [start, start + count - 1],
    );
  }
  return ranges;
}

/** A fence spans its opening line to its closing one; a table cell is one line. */
function blockSpan(block) {
  if (block.origin !== "fence") return [block.line, block.line];
  return [block.line, block.line + block.code.split("\n").length + 1];
}

export function executeFile(filePath, opts = {}) {
  const {
    bindings = {},
    slots = new Map(),
    timeout = 10_000,
    copyFrom = null,
    copyAs = [],
    allowZsh = true,
    diffBase = null,
  } = opts;

  // Before the temp copy exists, so a bad revision leaves nothing behind.
  const changedRanges =
    diffBase === null ? null : changedLineRanges(filePath, diffBase);

  const markdown = readFileSync(filePath, "utf8");
  // Two extractors, one stream. Everything downstream consumes `{line, code}` and
  // is source-agnostic, so a table-cell command is classified, sandboxed and
  // dual-shell compared by exactly the same code that handles a fenced block —
  // which is why this change needed no classification or safety rework. Sorted by
  // line so the report still reads in document order.
  const blocks = [
    ...extractBlocks(markdown),
    ...extractTableCellCommands(markdown),
  ].sort((a, b) => a.line - b.line);

  const useZsh = allowZsh && zshAvailable();
  const shells = useZsh ? ["bash", "zsh"] : ["bash"];

  // CR-11 — `cpSync` used to sit outside the try, so a bad `--copy` threw with the
  // temp directory already created and never removed. `main` swallowed it into
  // exit 2, so the leak was silent and repeated every run.
  //
  // The sandbox is a directory INSIDE the temp root, so the root can act as the
  // containment sentinel in `runBlock`.
  // Absolute, always: os.tmpdir() returns a relative TMPDIR verbatim, and the
  // --copy-as containment test compares resolve(tmp, dest) against this prefix —
  // relative, it refused every DEST as escaping (TASK-149 CR3-4).
  const tmpRoot = resolve(mkdtempSync(join(tmpdir(), "qa-snippets-")));
  const tmp = join(tmpRoot, "work");

  const results = [];
  const findings = [];
  // Informational records: things the reader must be told but cannot act on.
  // Kept separate from `findings` so they never gate and never accumulate as
  // noise, and separate from silence so the step is never a no-op nobody sees.
  const notes = [];

  try {
    mkdirSync(tmp, { recursive: true });
    if (copyFrom)
      cpSync(copyFrom, tmp, {
        recursive: true,
        filter: skipNestedWorktrees(copyFrom),
      });
    // obs #143 — `--copy` places a directory's CONTENTS at the temp root, so a
    // block that addresses a path (`find docs/tasks …`) found nothing whatever was
    // copied. `--copy-as` seeds at the path the block addresses. The destination is
    // itself a boundary: an absolute or escaping DEST would write outside the
    // sandbox, so it is refused here, inside the try, where the temp root is still
    // removed on the throw (the CR-11 contract).
    for (const { src, dest } of copyAs) {
      if (typeof dest !== "string" || dest === "" || isAbsolute(dest))
        throw new Error(`--copy-as DEST must be a relative path: ${dest}`);
      const target = resolve(tmp, dest);
      if (target === tmp)
        throw new Error(
          `--copy-as DEST already exists — it is the working copy itself; --copy-as seeds a fresh path, it never merges: ${dest}`,
        );
      if (!isWithin(tmp, target))
        throw new Error(
          `--copy-as DEST escapes the working directory: ${dest}`,
        );
      // TASK-149-BUG-1 — the check above is lexical, and mkdirSync / cpSync follow
      // symlinks. `--copy` copies a seeded directory's symlinks as symlinks, and
      // an earlier --copy-as pair can place one too, so a DEST that passes the
      // string test can still write through `out -> /elsewhere`. Refuse any
      // existing component below the working copy that is a symlink — dangling
      // or not, final component included — before anything is created.
      refuseSymlinkedPath(tmp, target, dest);
      // TASK-149-BUG-1, reopened — a DEST that already exists (`.`, or `docs`
      // seeded by `--copy`) makes cpSync MERGE into it, and the merge follows any
      // symlink already inside it. Checking that tree would be the second
      // correction to one mechanism; instead the mechanism changes: --copy-as
      // seeds a FRESH path only. With nothing at the target, cpSync creates it
      // and walks no existing tree, so there is nothing for it to follow.
      let exists = true;
      try {
        lstatSync(target);
      } catch {
        exists = false;
      }
      if (exists)
        throw new Error(
          `--copy-as DEST already exists — --copy-as seeds a fresh path, it never merges: ${dest}`,
        );
      // TASK-149 CR3-5 — an SRC that contains the sandbox under another spelling
      // (a symlinked TMPDIR, /var vs /private/var) passes a lexical subdirectory
      // test, and the copy would then walk into its own output. Compare real paths.
      let srcReal;
      try {
        srcReal = realpathSync(src);
      } catch (e) {
        throw new Error(`--copy-as SRC is not readable: ${src} (${e.message})`);
      }
      const rootReal = realpathSync(tmpRoot);
      if (isWithin(srcReal, rootReal))
        throw new Error(
          `--copy-as SRC contains the sandbox itself — copying it would copy into its own output: ${src}`,
        );
      mkdirSync(dirname(target), { recursive: true });
      cpSync(src, target, {
        recursive: true,
        filter: skipNestedWorktrees(src),
      });
    }
    for (const block of blocks) {
      // Slots are filled BEFORE classification, and the filled text is what runs.
      const code = applySlots(block.code, slots);
      // The copy is seeded above, so a helper the block calls resolves against
      // the files the block will actually see.
      const { klass, reason } = classifyBlock(code, bindings, {
        helperRoot: tmp,
      });
      const changed =
        changedRanges === null
          ? undefined
          : (([a, b]) => changedRanges.some(([c, d]) => a <= d && c <= b))(
              blockSpan(block),
            );
      if (klass !== "runnable") {
        results.push({
          line: block.line,
          origin: block.origin,
          column: block.column,
          klass,
          reason,
          skipped: true,
          ...(changed === undefined ? {} : { changed }),
        });
        // A refusal says nothing about whether the block PARSES (task.274, obs
        // #54): an apostrophe that closed a single-quoted `node -e` body got three
        // blocks refused as `mutating` and the report read `no-executable-blocks`.
        // So a block that is not run is still parsed, and one that does not parse is
        // a finding of its own, beside the refusal.
        if (isSyntaxCheckable(klass, reason, code)) {
          for (const f of syntaxFindings(code, shells, timeout))
            findings.push({ ...f, line: block.line, origin: block.origin });
        }
        continue;
      }
      const { runs, findings: blockFindings } = runBlock(code, {
        shells,
        cwd: tmp,
        timeout,
        bindings,
        sandboxRoot: tmpRoot,
      });
      results.push({
        line: block.line,
        origin: block.origin,
        column: block.column,
        klass,
        reason: null,
        skipped: false,
        ...(changed === undefined ? {} : { changed }),
        runs,
      });
      // A finding carries the origin too. `line 82` alone sends a reader to a
      // table row and leaves them looking for a fence that is not there; the
      // discriminator is what makes the finding actionable.
      for (const f of blockFindings) {
        findings.push({ ...f, line: block.line, origin: block.origin });
      }
    }
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  const counts = { runnable: 0, placeholder: 0, mutating: 0 };
  for (const r of results) counts[r.klass]++;

  // A run where zero blocks executed must never look like a pass — this is the
  // rule's own failure mode, and it is exactly the silent skip the step exists to
  // stop. zsh being absent never reduces the runnable count, so neither branch
  // below can be tripped by a missing interpreter.
  //
  // But "nothing ran" is TWO states, and reporting them as one is what made this
  // guard noise (bug.7). Discriminate on `counts.placeholder`:
  //
  //   placeholder > 0  → the run was UNDER-CONFIGURED. `--bind` / `--copy` fixes
  //                      it. Actionable, so it stays a finding.
  //   placeholder == 0 → every block was refused as `mutating`. The file documents
  //                      side-effecting commands (`gh`, `curl`, `rm`, write
  //                      redirections) that are deny-listed BY DESIGN — a QA gate
  //                      does not make network calls. No configuration will ever
  //                      move them into `runnable`, so there is nothing to act on.
  //                      Recorded as information, not as a finding.
  //
  // Six of ten skills surveyed sat permanently in the second state, three of them
  // receiving a finding whose remediation hint was suppressed precisely because it
  // did not apply. A finding that fires on most of the library with no available
  // fix is one reviewers learn to scroll past — an ignored check is a check that
  // does not exist.
  if (blocks.length > 0 && counts.runnable === 0) {
    if (counts.placeholder > 0) {
      // `medium`, deliberately. This is a statement about COVERAGE — the gate did
      // nothing here — not a defect in the work item, and `high` + `category: bug`
      // is what makes a finding gate-blocking. A skill whose snippets all read
      // caller variables would otherwise block its own PR for needing bindings the
      // run did not supply, which is the "noise trains reviewers to ignore it"
      // failure the rule warns about. It is still reported, which is what "a
      // finding, not a pass" requires.
      // Name the flag that fills each kind of placeholder (obs #186): a template
      // slot is text, which only --slot replaces; --bind binds a shell variable
      // and can never fill one, so advising it for a slot sends the reader to a
      // remedy that cannot work.
      const slotHeld = results.filter(
        (r) => r.klass === "placeholder" && /^template slot/.test(r.reason),
      ).length;
      const remedies = [
        slotHeld > 0 && "--slot NAME=VALUE for the template slots",
        counts.placeholder - slotHeld > 0 &&
          "--bind NAME=VALUE for the unbound variables",
      ].filter(Boolean);
      findings.push({
        kind: "zero-blocks-executed",
        confidence: "medium",
        detail:
          `${blocks.length} bash block(s) found, none classified runnable ` +
          `(${counts.placeholder} placeholder, ${counts.mutating} mutating)` +
          ` — supply the missing values with ${remedies.join(" and ")} to execute the placeholder blocks`,
      });
    } else {
      // The refusal reasons are carried verbatim rather than summarised away. An
      // `unrecognised-command (fail-closed)` refusal is not the same thing as a
      // deny-listed one: the first may be an over-refusal the classifier should
      // learn (bug.6, bug.10), and collapsing both into "correctly refused" is how
      // that would stop being visible.
      const byReason = new Map();
      for (const r of results) {
        byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
      }
      const breakdown = [...byReason]
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
        .map(([reason, n]) => `${reason} \u00d7${n}`)
        .join(", ");
      notes.push({
        kind: "no-executable-blocks",
        detail:
          `${blocks.length} bash block(s), all correctly refused as mutating ` +
          `(0 placeholder) — this file documents side-effecting commands and the ` +
          `snippet step cannot execute it. Refusals: ${breakdown}`,
      });
    }
  }

  // An untracked file has no diff, so it has no changed blocks — say so rather
  // than let it read like a file the change did not touch (task.191 CR-8).
  if (changedRanges !== null && isUntracked(filePath))
    notes.push({
      kind: "untracked-file",
      detail:
        "--diff-base: the file is not tracked by git, so no block is marked changed — commit it, then re-run",
    });

  // The change set, apart from the file (obs #219). A file-level count folds the
  // changed blocks in with every templated block the change did not touch, so a
  // run in which every changed block was refused read like any other. Reported IN
  // ADDITION to the file-level findings above, never instead of them.
  let changed;
  if (changedRanges !== null) {
    const touched = results.filter((r) => r.changed);
    changed = {
      total: touched.length,
      runnable: touched.filter((r) => r.klass === "runnable").length,
      placeholder: touched.filter((r) => r.klass === "placeholder").length,
      mutating: touched.filter((r) => r.klass === "mutating").length,
      executed: touched.filter((r) => !r.skipped).length,
    };
    if (changed.total > 0 && changed.executed === 0) {
      // `medium`, like zero-blocks-executed: a statement about what the gate
      // covered, not a defect in the work item.
      findings.push({
        kind: "changed-blocks-not-executed",
        confidence: "medium",
        detail: `${changed.total} changed block(s), none executed`,
        blocks: touched.map((r) => ({
          line: r.line,
          klass: r.klass,
          reason: r.reason,
        })),
      });
    }
  }

  return {
    file: filePath,
    shells,
    zshAvailable: useZsh,
    zshSkipReason:
      allowZsh && !useZsh ? "zsh-unavailable" : allowZsh ? null : "disabled",
    blocks: blocks.length,
    counts,
    ...(changed === undefined ? {} : { changed }),
    results,
    findings,
    notes,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const USAGE =
  "Usage: qa-execute-snippets --file <path.md> [--bind NAME=VALUE]... " +
  "[--slot NAME=VALUE]... [--copy <dir>] [--copy-as SRC:DEST]... " +
  "[--diff-base <rev>] [--timeout <ms>] [--no-zsh] [--json]";

export function main(argv = process.argv.slice(2)) {
  let file = null;
  let copyFrom = null;
  const copyAs = [];
  let timeout = 10_000;
  let allowZsh = true;
  let json = false;
  let diffBase = null;
  const bindings = {};
  const slots = new Map();

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--file":
        file = argv[++i];
        break;
      case "--copy":
        copyFrom = argv[++i];
        break;
      case "--copy-as": {
        // Split on the LAST colon: DEST is a relative path and never holds one,
        // while SRC may (a Windows drive letter).
        const pair = argv[++i] ?? "";
        const colon = pair.lastIndexOf(":");
        if (colon < 1 || colon === pair.length - 1)
          return {
            exitCode: 2,
            error: `bad --copy-as (want SRC:DEST): ${pair}`,
          };
        copyAs.push({ src: pair.slice(0, colon), dest: pair.slice(colon + 1) });
        break;
      }
      case "--timeout": {
        // Unvalidated, `--timeout abc` yielded NaN and `--timeout -1` a negative;
        // spawnSync applies NO timeout for either, so a typo silently disabled the
        // hang protection.
        const t = Number(argv[++i]);
        if (!Number.isFinite(t) || t <= 0)
          return {
            exitCode: 2,
            error: `bad --timeout: must be a positive number`,
          };
        timeout = t;
        break;
      }
      case "--no-zsh":
        allowZsh = false;
        break;
      case "--json":
        json = true;
        break;
      case "--bind": {
        const pair = argv[++i] ?? "";
        const eq = pair.indexOf("=");
        if (eq < 1)
          return {
            exitCode: 2,
            error: `bad --bind (want NAME=VALUE): ${pair}`,
          };
        bindings[pair.slice(0, eq)] = pair.slice(eq + 1);
        break;
      }
      case "--slot": {
        // Same NAME=VALUE shape as --bind; the name must be one the placeholder
        // grammar can match, or the slot could never be filled.
        const pair = argv[++i] ?? "";
        const eq = pair.indexOf("=");
        if (eq < 1 || !SLOT_NAME.test(pair.slice(0, eq)))
          return {
            exitCode: 2,
            error: `bad --slot (want NAME=VALUE, NAME a template slot name): ${pair}`,
          };
        slots.set(pair.slice(0, eq), pair.slice(eq + 1));
        break;
      }
      case "--diff-base": {
        const rev = argv[++i];
        if (!rev)
          return {
            exitCode: 2,
            error: "bad-diff-base: --diff-base needs a revision",
          };
        diffBase = rev;
        break;
      }
      case "-h":
      case "--help":
        return { exitCode: 0, usage: USAGE };
      default:
        return { exitCode: 2, error: `unknown argument: ${argv[i]}` };
    }
  }

  if (!file) return { exitCode: 2, error: `--file is required\n${USAGE}` };

  let report;
  try {
    report = executeFile(file, {
      bindings,
      slots,
      diffBase,
      timeout,
      copyFrom,
      copyAs,
      allowZsh,
    });
  } catch (e) {
    return { exitCode: 2, error: e.message };
  }

  return { exitCode: report.findings.length > 0 ? 1 : 0, report, json };
}

function render(report) {
  const lines = [`Snippet execution — ${report.file}`, ""];
  const fromCells = report.results.filter(
    (r) => r.origin === "table-cell",
  ).length;
  lines.push(
    `  ${report.blocks} bash block(s)` +
      (fromCells ? ` (${fromCells} from table cells)` : "") +
      `: ${report.counts.runnable} runnable, ${report.counts.placeholder} placeholder, ` +
      `${report.counts.mutating} mutating`,
  );
  lines.push(
    `  shells: ${report.shells.join(", ")}${report.zshAvailable ? "" : "  (zsh-unavailable)"}`,
  );
  // The change set first, when one was named: it is what the change is judged on.
  if (report.changed) {
    const c = report.changed;
    lines.splice(
      2,
      0,
      `  changed: ${c.total} block(s) — ${c.executed} executed, ${c.runnable} runnable, ` +
        `${c.placeholder} placeholder, ${c.mutating} mutating`,
    );
  }
  lines.push("");
  // `(table cell)` rather than nothing: the two constructs are found by different
  // means and fixed in different ways, and a reader who cannot tell them apart
  // goes looking for a fence at a line that holds a table row.
  const where = (r) =>
    `line ${r.line}` +
    (r.origin === "table-cell"
      ? ` (table cell${r.column ? `: ${r.column}` : ""})`
      : "");
  for (const r of report.results.filter((x) => x.skipped)) {
    lines.push(`  SKIP  ${where(r)}  ${r.klass} — ${r.reason}`);
  }
  // Notes print BEFORE the findings verdict. "No findings." is true and must stay
  // sayable, but a reader who sees only that line cannot tell a file the step
  // fully covered from one it could not execute at all — which is the whole point
  // of splitting the signal.
  for (const n of report.notes ?? []) {
    lines.push("", `  INFO  ${n.kind}  ${n.detail}`);
  }
  if (report.findings.length === 0) {
    lines.push("", "  No findings.");
  } else {
    lines.push("");
    for (const f of report.findings) {
      lines.push(
        `  ${f.kind}  ${f.line ? `${where(f)}  ` : ""}[${f.confidence}] ${f.detail}`,
      );
      for (const b of f.blocks ?? [])
        lines.push(`      line ${b.line}  ${b.klass} — ${b.reason ?? "ran"}`);
    }
  }
  return lines.join("\n");
}

// Resolve BOTH sides through realpath: `.agents/skills` and `.claude/skills` are
// symlinks to `../skills`, here and in every consumer install, so argv[1] arrives
// symlinked while import.meta.url is already real. Comparing them raw makes this
// guard false and main() never runs: exit 0, no output — indistinguishable from a
// clean run with nothing to report, which is precisely the silent-pass this engine
// exists to catch. Falls back to the plain comparison if realpath throws
// (deleted/unreadable path). See bug.4.snippet-engine-symlink-noop.
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isInvokedDirectly()) {
  const r = main();
  // `process.exitCode` + else-if, never `process.exit()`: stdio is ASYNCHRONOUS
  // on a pipe, and `process.exit()` tears the process down before the buffer
  // drains, truncating output at ~64KB. The --json report scales with the
  // number of snippets, so the QA gate — the one caller that always pipes —
  // is exactly what a truncating write breaks.
  // See bug.3.stdout-truncation-on-exit.
  process.exitCode = r.exitCode;
  if (r.error) {
    console.error(r.error);
  } else if (r.usage) {
    console.log(r.usage);
  } else {
    console.log(r.json ? JSON.stringify(r.report, null, 2) : render(r.report));
  }
}
