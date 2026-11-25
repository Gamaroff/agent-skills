#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/finalise-rerun-at-head.js. Regenerate via `npm run bundle`.
"use strict";

/**
 * Re-run the commands a work item's criteria name, at the head /finalise is judging (task.319).
 *
 * A criterion such as "`npm run audit:links` reports 0 broken links" was graded on the run QA recorded.
 * When a later commit moved the head, that run is of another commit, and /finalise halted on it: not a
 * defect, only an old measurement. A project lists the commands it allows to be run for this, and this
 * engine runs each listed command a criterion names, once, and saves what it printed.
 *
 *   finalise:
 *     rerunAtHead:
 *       - npm run audit:links
 *
 * WHAT IS RUN, AND WHY IT CANNOT BE SOMETHING ELSE. A criterion names a command only when one of its
 * code spans, whole, EQUALS a listed entry (leading and trailing space aside). Nothing is matched by
 * prefix, substring or pattern, and nothing the document says is ever executed: the text that runs is
 * the configuration's own entry. The list is read from skills-config.yaml at the HEAD commit, as the
 * docs-only rule reads its own; a working-tree edit cannot add a command. A list the reader cannot read
 * whole is refused, never read as shorter or absent: every row of the `finalise` block is accounted for,
 * and an entry the YAML subset would change (a `#`, a partial quote, a block scalar) is refused by name.
 *
 * "AT THE HEAD" IS CHECKED before each command and after the last, by READING: every file of the head's
 * tree is hashed in the working tree and compared with the head's own entry, and so is every index entry.
 * Git's answers about what changed are not asked, because the index and the configuration can tell git not
 * to look (skip-worktree, assume-unchanged, submodule.<name>.ignore, core.fileMode, an fsmonitor hook:
 * T319-CR-401 to 403). A path that differs, is missing, is in the index only or is untracked is refused
 * (`dirty-tree`) unless it is documentation by ci.docsOnly.patterns: /finalise's own records are
 * uncommitted at this point by design, and they are documentation. A command that writes code, or a head
 * that moves while they run, refuses too and leaves no run.json. The uncommitted documentation is listed
 * in the record, because a command that reads documentation read that. Two more are let through: an
 * untracked file under `.claude/state/`, the pipelines' own state, this engine's output included, which a
 * consumer need not ignore; and the work item's own records beside it, by the names the pipeline writes
 * (its DoD records, and the reports and gates that wait for the acceptance commit; listed with the
 * documentation, because a project's patterns may leave them out). So a sparse checkout that leaves code
 * out is refused: its working tree is not the head. A submodule that was never checked out is an empty
 * directory, and is let through; one at another commit, or with an edit inside it, is refused wherever it
 * is, because a submodule is never documentation.
 *
 * WHAT THAT DOES NOT SEE. A path git ignores, by any of its ignore files. A content filter or line-ending
 * rule is applied as git applies it, so a file that differs only by one is the head's. Nothing is watched
 * between two checks.
 *
 * THE RUN IS DATA, NEVER A VERDICT. A command's non-zero exit does not change this engine's: the
 * criterion says what the command must do, and the AC agent grades the saved run against it.
 *
 * WHAT BOUNDS IT. --timeout-seconds is the budget of the WHOLE run, not of each command: a command that
 * reaches it is killed, and one that would start after it is recorded as not started. A command writes to
 * an unnamed temporary file per stream, and at most --max-output-bytes of each is saved: one that passes
 * the bound is stopped (`stopped_for_size`) unless it had already ended by itself (`output_capped` covers
 * both). Nothing it started can grow the saved output afterwards. A stream the
 * command opened again and emptied (`> /dev/stderr`, `tee /dev/stderr`) is named in `output_overwritten`:
 * what it printed there before is gone. Whether it had printed anything is not known, so a command whose
 * first output goes that way is named too. A kill reaches the command's process group: a descendant that
 * left it (`setsid`, a daemon, and coreutils' `timeout`, which makes a group of its own) is not killed. It
 * runs on after the bound, and what it still writes takes space in the temporary directory until it ends.
 *
 * Usage:
 *   finalise-rerun-at-head.js --doc <path> --out-dir <dir> [--workspace-root <dir>]
 *                             [--timeout-seconds <n>] [--max-output-bytes <n>] [--json]
 *
 *   --out-dir is emptied of an earlier run's record first, so a file in it is always this run's.
 *   It writes <n>.stdout, <n>.stderr, run.json: { document, head, uncommitted_docs, runs: [{ command,
 *   criteria, exit_code, timed_out, not_started, stopped_for_size, output_capped, output_overwritten: [],
 *   stdout, stderr }] }, and run.md, the block for the DoD running summary. The --json answer carries `document` too: the work
 *   item's file name, which finalise-rerun-scope.js holds against its own --doc.
 *
 * reason / exit:
 *   ran             0  at least one command was run
 *   none-named      0  the list is set and no criterion names an entry of it, or there is no criterion
 *   not-configured  0  finalise.rerunAtHead is absent or an empty list
 *   dirty-tree      1  the working tree is not the head, or stopped being it; no record is kept
 *   scan-broken     1  the document could not be read, or a listed command stands in a criteria section of
 *                      which the reader returns no criterion at all, or on an unindented line of one, or
 *                      after a backtick that has no partner
 *   failed          1  the engine itself failed (a file it could not write, git); no record is kept
 *   usage           2  bad arguments, or a configuration that cannot be read as a list of commands
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parseYamlSubset } = require("./yaml-subset.js");
const {
  CRITERIA_HEADINGS,
  RE_CHECKBOX,
  RE_NUMBERED,
  criteriaSection,
  extractSection,
  makeFenceTracker,
  readCriteriaEntries,
} = require("./criteria-section.js");
const {
  UsageError,
  assertBlockRows,
  assertMapping,
  configTextAtCommit,
  isDocsPath,
  killProcessGroup,
  normKey,
  parseConfig,
  spawnCheck,
  topLevelKey,
  unescaped,
} = require("./ci-tree-equivalence.js");
const docId = require("./doc-id.js");

const DEFAULT_TIMEOUT_SECONDS = 1500;
const DEFAULT_MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const PIPELINE_STATE_DIR = ".claude/state/";
const OWN_FILE = /^(\d+\.(stdout|stderr)|run\.(json|md))$/;
const EXCERPT_LINES = 20;
const EXCERPT_CHARS = 4000;
const EXCERPT_BYTES = 64 * 1024;
const WATCH_MS = 20; // how often the size of a running command's output is read
const USAGE =
  "usage: finalise-rerun-at-head.js --doc <path> --out-dir <dir> [--workspace-root <dir>] [--timeout-seconds <n>] [--max-output-bytes <n>] [--json]";

/** Every key of the `finalise` block (docs/reference/configuration.md). */
const FINALISE_KEYS = ["deferralApprover", "rerunAtHead"];

/**
 * How many rows of the file spell the list's key, at any indent, in any block, its letters escaped or not.
 * The YAML subset keeps an escape as text, so a list under `"fin\x61lise"` was read as no list at all, and
 * beside a plain block as a second copy nobody counted (T319-CR-406).
 */
function listKeyRows(text) {
  return unescaped(text)
    .split(/\r?\n/)
    .filter((l) =>
      /^\s*(?:[-?:]\s+)*[{\s]*["']?rerun[-_]?at[-_]?head["']?\s*(?::|$)/i.test(
        l,
      ),
    ).length;
}

/** The entries of finalise.rerunAtHead as written, one per row, dash removed. */
function rawEntries(text) {
  const out = [];
  let inFinalise = false;
  let inList = false;
  for (const l of text.split(/\r?\n/)) {
    const t = l.trim();
    if (t === "" || t.startsWith("#")) continue;
    if (/^\S/.test(l)) {
      inFinalise = topLevelKey(l) === "finalise";
      inList = false;
      continue;
    }
    if (!inFinalise) continue;
    if (/^\s+(["']?)rerunAtHead\1\s*:/.test(l)) {
      inList = true;
      continue;
    }
    const m = /^\s*-\s+(.*)$/.exec(l);
    if (inList && m) out.push(m[1].trim());
    else inList = false;
  }
  return out;
}

/**
 * Why the YAML subset would not read this entry as it is written, or "". The subset cuts an unquoted
 * `#` anywhere, keeps escapes as text and reads a block scalar's marker as the value, so an entry it
 * would change is refused: the command that runs is the one the project wrote.
 */
function entryProblem(raw) {
  if (/^["']/.test(raw))
    return /^("[^"\\]*"|'[^']*')(\s+#.*)?$/.test(raw)
      ? ""
      : "quote the whole entry, with no escapes inside";
  if (/^[[\]{}&*!|>%@`?,]/.test(raw))
    return "starts with a character YAML reserves: quote the whole entry";
  const hash = raw.indexOf("#");
  if (
    hash >= 0 &&
    (!/\s/.test(raw[hash - 1] || "") || /["']/.test(raw.slice(0, hash)))
  )
    return "holds a # that is not a plain trailing comment: quote the whole entry";
  return "";
}

/** The listed commands. Throws UsageError on anything that is not a plain list of non-empty strings. */
function parseRerunList(rawText) {
  const text = String(rawText).replace(/^﻿/, "");
  const parsed = parseYamlSubset(text) || {};
  assertMapping(text, parsed);
  // A list under a key nobody reads is a list that is silently not run (T319-CR-208).
  for (const k of Object.keys(parsed)) {
    if (k !== "finalise" && ["finalise", "finalize"].includes(normKey(k)))
      throw new UsageError(
        `${k} looks like finalise; the key is exactly "finalise"`,
      );
    if (normKey(k) === "rerunathead")
      throw new UsageError(
        `${k} is at the top level; the list goes under "finalise", as finalise.rerunAtHead`,
      );
  }
  const block = parsed.finalise;
  if (block && typeof block === "object" && !Array.isArray(block))
    for (const k of Object.keys(block)) {
      if (!FINALISE_KEYS.includes(k))
        throw new UsageError(
          `finalise.${k} is not a key /finalise reads (${FINALISE_KEYS.join(", ")})`,
        );
    }
  assertBlockRows(text, parsed, "finalise");
  const read = block && block.rerunAtHead !== undefined ? 1 : 0;
  if (listKeyRows(text) !== read)
    throw new UsageError(
      `rerunAtHead is written ${listKeyRows(text)} time(s) and read ${read}: write it once, under a plain "finalise:" key`,
    );
  if (block === undefined) return [];
  if (block === null || typeof block !== "object" || Array.isArray(block))
    throw new UsageError(
      "finalise must be a block mapping (remove the key when it holds nothing)",
    );
  const list = block.rerunAtHead;
  if (list === undefined) return [];
  if (!Array.isArray(list))
    throw new UsageError(
      'finalise.rerunAtHead must be a block list, one "- <command>" per line, indented under its key (write [] for none)',
    );
  const raw = rawEntries(text);
  if (raw.length !== list.length)
    throw new UsageError(
      `finalise.rerunAtHead has ${raw.length} row(s) but the parse reads ${list.length} entries`,
    );
  const out = [];
  list.forEach((entry, i) => {
    const problem = entryProblem(raw[i]);
    if (problem)
      throw new UsageError(
        `finalise.rerunAtHead entry ${i + 1} (${raw[i]}) ${problem}`,
      );
    if (typeof entry !== "string" || entry.trim() === "")
      throw new UsageError(
        "finalise.rerunAtHead entries must be non-empty command strings",
      );
    if (!out.includes(entry.trim())) out.push(entry.trim());
  });
  return out;
}

/** The code spans of a criterion, each whole: `x`, ``y``. */
function codeSpans(text) {
  const out = [];
  const re = /(?<!`)(?<!(?<!\\)(?:\\\\)*\\)(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[2].trim());
  return out;
}

/** Does a text show this command anywhere, as a code span of a line or a paragraph or between two backticks?
 * Wider than `codeSpans`, for a refusal: a span can stand on two lines, and a backtick with no partner takes
 * one of the command's. */
function shows(text, command) {
  if (text.includes(`\`${command}\``)) return true;
  return [...text.split("\n"), ...text.split(/\n\s*\n/)].some((block) =>
    codeSpans(block.replace(/\s*\n\s*/g, " ")).includes(command),
  );
}

const RE_AC_HEADING = /^#{2,6} +(?:\d+[.)] *)?AC[ -]?\d/i;

/** A text without its HTML comments. One that is not closed runs to the end. */
function withoutComments(text) {
  let out = "";
  for (let at = 0; ;) {
    const from = text.indexOf("<!--", at);
    if (from === -1) return out + text.slice(at);
    out += text.slice(at, from);
    const end = text.indexOf("-->", from);
    if (end === -1) return out;
    at = end + 3;
  }
}

/**
 * Does a criteria section hold criteria in a shape the reader does not read: a list item, a table row, a
 * Given, When or Then line, a line of text under an AC heading? These shapes are the whole list. What is
 * none of them (an introduction, a placeholder, an empty fence) does not say that the criteria stand here
 * (T320-CR-101, T320-CR-202 to 204).
 */
function holdsCriteria(section) {
  let underAc = false;
  return withoutComments(section)
    .split("\n")
    .some((l) => {
      if (/^ {0,3}#{1,6}(?:\s|$)/.test(l)) {
        underAc = RE_AC_HEADING.test(l);
        return false;
      }
      return (
        (underAc && /^\s*[*_"'(]{0,3}[\p{L}\p{N}]/u.test(l)) ||
        /^\s*[*_]{0,2}(?:Given|When|Then)\b/.test(l) ||
        /^\s*\|.*[\p{L}\p{N}]/u.test(l) ||
        /^\s*(?:[-*+]|\d{1,9}[.)])\s+(?=\S)(?!\[[ xX]\]\s*$).*[\p{L}\p{N}]/u.test(
          l,
        )
      );
    });
}

/** [{ command, criteria: [{ index, text }] }] in list order, only for commands a criterion names. */
function namedCommands(list, criteria) {
  return list
    .map((command) => ({
      command,
      criteria: criteria
        .map((text, i) => ({ index: i + 1, text }))
        .filter((c) => codeSpans(c.text).includes(command)),
    }))
    .filter((r) => r.criteria.length > 0);
}

// A line that starts a block of its own, and so does not continue the paragraph above it: what CommonMark
// lets interrupt one, and no more. Wider, it hides a command (T319-CR-803). A table's row is left out: it is
// one only with a delimiter row under its first, and refusing a command there is loud.
const HTML_BLOCK =
  "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
const RE_BLOCK_START = new RegExp(
  "^(?:" +
    [
      String.raw`#{1,6}(?:\s|$)`,
      ">",
      "`{3,}[^`]*$",
      "~{3}",
      String.raw`[-*+](?:\s|$)`,
      String.raw`\d{1,9}[.)](?:\s|$)`,
      String.raw`([-*_])[ \t]*(?:\1[ \t]*){2,}$`,
      String.raw`<(?:script|pre|style|textarea)(?:\s|>|$)`,
      String.raw`<!--|<\?|<![a-z]|<!\[CDATA\[`,
      String.raw`</?(?:${HTML_BLOCK})(?:\s|/?>|$)`,
    ].join("|") +
    ")",
  "i",
);

/**
 * The text of each criterion, in the reader's order, with its lazy continuation: an unindented line directly
 * under it, which Markdown renders as part of it and the criteria reader ends it at. Its line breaks are
 * kept: `shows` reads a text line by line too (T320-CR-103).
 */
function lazyTexts(body) {
  let inItem = false; // an indented line belongs to the last criterion
  let open = false; // and so does an unindented one: no blank line stands between
  const whole = [];
  for (const line of criteriaSection(body).split("\n")) {
    const m = RE_CHECKBOX.exec(line) || RE_NUMBERED.exec(line);
    if (m) {
      whole.push(m[1]);
      inItem = true;
      open = true;
    } else if (line.trim() === "") {
      open = false;
      if (inItem) whole.push(`${whole.pop()}\n`);
    } else if (/^\s/.test(line) ? inItem : open && !RE_BLOCK_START.test(line)) {
      whole.push(`${whole.pop()}\n${line.trim()}`);
      open = true;
    } else {
      inItem = false;
      open = false;
    }
  }
  return whole;
}

/**
 * The first criterion that names a listed command only by way of a lazy continuation, or `null`. Read past,
 * the command would not be run and nothing would say so (T319-CR-605).
 */
function lazilyNamed(list, whole, texts) {
  const count = (text, command) =>
    codeSpans(text).filter((s) => s === command).length;
  for (const [i, text] of whole.entries())
    for (const command of list)
      if (count(text.replace(/\n+/g, " "), command) > count(texts[i], command))
        return { index: i + 1, command };
  return null;
}

/** Copy `size` bytes of the open file `from`, starting at byte `start`, into `to`. */
function copyBytes(from, to, start, size) {
  const buf = Buffer.alloc(64 * 1024);
  const out = fs.openSync(to, "w");
  try {
    for (let done = 0; done < size;) {
      const want = Math.min(buf.length, size - done);
      const got = fs.readSync(from, buf, 0, want, start + done);
      if (got === 0) break;
      fs.writeSync(out, buf, 0, got);
      done += got;
    }
  } finally {
    fs.closeSync(out);
  }
}

async function runOne(
  { command, criteria },
  n,
  { root, outDir, deadline, maxBytes },
) {
  const stdout = path.join(outDir, `${n}.stdout`);
  const stderr = path.join(outDir, `${n}.stderr`);
  for (const f of [stdout, stderr]) fs.writeFileSync(f, "");
  const left = deadline - Date.now();
  let r = null;
  let overBound = false; // it passed the bound while it ran, and was killed for it
  let capped = false;
  let overwritten = []; // per stream: output that is whole is not doubted for the other's sake (T319-CR-802)
  if (left > 0) {
    // The command writes to a regular file, and not to a pipe: a program that exits with a pipe still
    // full loses what is in it, and nothing says so (T319-CR-601). The file is outside the working tree
    // and has no name once it is open, so what the command leaves running has no way to the record
    // (T319-CR-405). A file has a loss of its own: a command that opens /dev/stdout or /dev/stderr again
    // can cut off what it printed before. So the file starts with a random mark, and is opened for
    // append: a mark that is gone says the output is not whole.
    const mark = crypto.randomBytes(32);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rerun-at-head-"));
    const fds = ["out", "err"].map((f) => {
      const fd = fs.openSync(path.join(dir, f), "ax+");
      fs.writeSync(fd, mark);
      return fd;
    });
    fs.rmSync(dir, { recursive: true, force: true });
    const starts = (fd) => {
      const head = Buffer.alloc(mark.length);
      fs.readSync(fd, head, 0, head.length, 0);
      return head.equals(mark) ? mark.length : 0;
    };
    const sizes = () => fds.map((fd) => fs.fstatSync(fd).size - mark.length);
    let watch = null;
    try {
      // spawnCheck owns the command's process group: a timeout, or a signal to this engine, ends what
      // the command started and not only its shell.
      r = await spawnCheck("sh", ["-c", command], {
        cwd: root,
        stdio: ["ignore", ...fds],
        timeout: left,
        onSpawn: (child) => {
          watch = setInterval(() => {
            if (overBound || !sizes().some((s) => s > maxBytes)) return;
            overBound = true;
            killProcessGroup(child.pid);
          }, WATCH_MS);
        },
      });
      killProcessGroup(r.pid);
      // One reading of the sizes, after the kill: what the record holds and what it says agree.
      const begin = fds.map(starts);
      overwritten = ["stdout", "stderr"].filter((_, i) => begin[i] === 0);
      const kept = sizes().map((s, i) => s + mark.length - begin[i]);
      capped = kept.some((s) => s > maxBytes);
      [stdout, stderr].forEach((f, i) =>
        copyBytes(fds[i], f, begin[i], Math.min(kept[i], maxBytes)),
      );
    } finally {
      clearInterval(watch);
      for (const fd of fds) fs.closeSync(fd);
    }
  }
  const stopped = Boolean(overBound && r.signal);
  return {
    command,
    criteria,
    // null: it did not finish by itself (a timeout, a stop, a signal, a failed spawn), so there is no
    // status.
    exit_code:
      r === null || r.error || typeof r.status !== "number" ? null : r.status,
    timed_out: Boolean(r && r.error && r.error.code === "ETIMEDOUT"),
    not_started: r === null,
    stopped_for_size: stopped,
    output_capped: capped,
    output_overwritten: overwritten,
    stdout,
    stderr,
  };
}

/** The last lines of a file, reading no more than its last EXCERPT_BYTES. */
function excerpt(file) {
  const fd = fs.openSync(file, "r");
  let text;
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, EXCERPT_BYTES);
    const buf = Buffer.alloc(len);
    const got = fs.readSync(fd, buf, 0, len, size - len);
    text = buf.toString("utf8", 0, got).trimEnd();
  } finally {
    fs.closeSync(fd);
  }
  if (text === "") return "";
  const tail = text.split("\n").slice(-EXCERPT_LINES).join("\n");
  return tail.length > EXCERPT_CHARS ? tail.slice(-EXCERPT_CHARS) : tail;
}

function statusOf(r) {
  if (r.not_started) return "not started: the run's time budget was spent";
  let end = r.exit_code === null ? "did not finish" : `exit ${r.exit_code}`;
  if (r.timed_out) end = "timed out";
  if (r.stopped_for_size) end = "stopped: its output passed the bound";
  else if (r.output_capped) end += ", its output cut at the bound";
  return r.output_overwritten.length > 0
    ? `${end}, its ${r.output_overwritten.join(" and ")} perhaps not whole: opened again and emptied`
    : end;
}

/** The DoD block: each run, with the tail of what it printed, fenced by more backticks than it holds. */
function markdown(result) {
  const lines = [
    "### Commands re-run at the head",
    "",
    `Head: \`${result.head}\` (\`finalise.rerunAtHead\`)`,
  ];
  if (result.uncommitted_docs && result.uncommitted_docs.length > 0)
    lines.push(
      "",
      `Uncommitted documentation the commands could read: ${result.uncommitted_docs.map((f) => `\`${f}\``).join(", ")}`,
    );
  for (const r of result.runs) {
    const ids = r.criteria.map((c) => `#${c.index}`).join(", ");
    lines.push("", `- \`${r.command}\` — criteria ${ids} — **${statusOf(r)}**`);
    for (const [label, file] of [
      ["stdout", r.stdout],
      ["stderr", r.stderr],
    ]) {
      const tail = excerpt(file);
      if (tail === "") continue;
      const longest = Math.max(
        2,
        ...[...tail.matchAll(/`+/g)].map((m) => m[0].length),
      );
      const fence = "`".repeat(longest + 1);
      lines.push("", `  ${label} (last lines):`, "", fence, tail, fence);
    }
  }
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const o = {
    doc: "",
    outDir: "",
    root: process.cwd(),
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    maxBytes: DEFAULT_MAX_OUTPUT_BYTES,
    json: false,
  };
  const take = (i, flag) => {
    if (argv[i + 1] === undefined || argv[i + 1] === "")
      throw new UsageError(`${flag} needs a value`);
    return argv[i + 1];
  };
  const positive = (i, flag, digits) => {
    const v = take(i, flag);
    if (!new RegExp(`^[1-9]\\d{0,${digits - 1}}$`).test(v))
      throw new UsageError(`${flag} must be a positive integer`);
    return Number(v);
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a === "--doc") o.doc = take(i++, a);
    else if (a === "--out-dir") o.outDir = take(i++, a);
    else if (a === "--workspace-root") o.root = take(i++, a);
    else if (a === "--timeout-seconds") o.timeoutSeconds = positive(i++, a, 6);
    else if (a === "--max-output-bytes") o.maxBytes = positive(i++, a, 10);
    else throw new UsageError(`unknown argument: ${a}`);
  }
  if (!o.doc) throw new UsageError("--doc is required");
  if (!o.outDir) throw new UsageError("--out-dir is required");
  return o;
}

/** The environment in which git reads no object through a replacement. */
const unreplaced = () => ({ ...process.env, GIT_NO_REPLACE_OBJECTS: "1" });

/** git in `cwd`, with no object read through a replacement. Its output is bytes: a path need not be UTF-8. */
function gitIn(cwd, args, input) {
  return execFileSync("git", args, {
    cwd,
    env: unreplaced(),
    input,
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
}
// One character per byte, so a name survives the trip to a string and back (T319-CR-607).
const gitRows = (cwd, ...args) =>
  gitIn(cwd, args).toString("latin1").split("\0").filter(Boolean);
const gitLine = (cwd, ...args) =>
  gitIn(cwd, args)
    .toString("utf8")
    .replace(/\r?\n$/, "");
const bytes = (f) => Buffer.from(f, "latin1");

/** Which of these paths the repository at `cwd` ignores. An answer that cannot be had is none of them. */
function ignoredOf(cwd, files) {
  if (files.length === 0) return new Set();
  try {
    const out = gitIn(
      cwd,
      ["check-ignore", "-z", "--stdin"],
      bytes(files.map((f) => `${f}\0`).join("")),
    );
    return new Set(out.toString("latin1").split("\0").filter(Boolean));
  } catch {
    return new Set(); // exit 1: none is ignored
  }
}
const shown = (f) => bytes(f).toString("utf8");
// As git folds a name under core.ignorecase: ASCII only.
const folded = (f) => f.replace(/[A-Z]/g, (c) => c.toLowerCase());

/** Does this checkout's filesystem keep a mode? Asked as `git init` asks it: a file, chmod, look. */
function keepsModes(gitDir, io = fs) {
  if (process.platform === "win32") return false;
  const probe = path.join(gitDir, `rerun-at-head-mode.${process.pid}`);
  const executable = (mode) => {
    io.chmodSync(probe, mode);
    return (io.statSync(probe).mode & 0o100) !== 0;
  };
  try {
    io.writeFileSync(probe, "");
    return !executable(0o644) && executable(0o755);
  } finally {
    io.rmSync(probe, { force: true });
  }
}

/** The object id of a symbolic link's text, in the repository's own hash (an id's length says which). */
function linkOid(file, length) {
  const text = fs.readlinkSync(file, { encoding: "buffer" });
  return crypto
    .createHash(length === 64 ? "sha256" : "sha1")
    .update(`blob ${text.length}\0`)
    .update(text)
    .digest("hex");
}

/** A path as `git hash-object --stdin-paths` reads one per line. */
const asLine = (f) =>
  /^"|[\r\n]/.test(f)
    ? `"${f.replace(/[\\"]/g, "\\$&").replace(/\n/g, "\\n")}"`
    : f;

/**
 * Every path of the checkout at `dir` that is not `commit`'s, as [{ file, known, code }] (`known`: the
 * commit has the path; `code`: it is a submodule or inside one, which no documentation pattern covers).
 * Read from the commit's tree: the index and the configuration are never asked what changed. The index
 * itself is compared too, because a command can read it (`git ls-files`). A path is a byte string in here
 * (one character per byte), and text in the answer.
 */
function differing(dir, commit, prefix = "") {
  const at = (f) => Buffer.concat([Buffer.from(`${dir}/`), bytes(f)]);
  const lstat = (f) => {
    try {
      return fs.lstatSync(at(f));
    } catch {
      return null;
    }
  };
  const tree = new Map();
  for (const row of gitRows(
    dir,
    "ls-tree",
    "-r",
    "-z",
    "--full-tree",
    commit,
  )) {
    const [, mode, oid, file] = /^(\d+) \S+ ([0-9a-f]+)\t([^]*)$/.exec(row);
    tree.set(file, { mode, oid });
  }
  // What is untracked, and what is ignored, is the repository's own configuration's to say.
  const listed = ["ls-files", "-z", "--others", "--exclude-standard"];
  const bad = new Set(gitRows(dir, ...listed));
  // Except one thing: under core.ignorecase an untracked A.js beside a tracked a.js is the tracked one
  // (T319-CR-801). It is a file of its own unless the disk folds names too and both name one file
  // (T319-CR-1002); a second hard link is not one name.
  const byFold = new Map([...tree.keys()].map((f) => [folded(f), f]));
  // And one more: what stands in a directory SUB beside a submodule `sub` is taken for the submodule's own
  // and listed nowhere (T319-CR-1203). It is the checkout's, unless both names are one directory.
  const subs = new Map();
  for (const [f, { mode }] of tree)
    if (mode === "160000") subs.set(folded(f), f);
  const besideSub = (f) => {
    const parts = f.split("/");
    for (let i = 1; i < parts.length; i++) {
      const d = parts.slice(0, i).join("/");
      const sub = subs.get(folded(d));
      if (sub === undefined || sub === d) continue;
      const [own, known] = [lstat(d), lstat(sub)];
      if (!known || own?.ino !== known.ino || own.dev !== known.dev)
        return true;
    }
    return false;
  };
  const exact = gitRows(dir, "-c", "core.ignorecase=false", ...listed);
  const beside = exact.filter(besideSub);
  const ignored = ignoredOf(dir, beside); // by the repository's own case rule (T320-CR-105)
  for (const f of beside) if (!ignored.has(f)) bad.add(f);
  for (const f of exact) {
    if (!byFold.has(folded(f))) continue;
    const [own, known] = [lstat(f), lstat(byFold.get(folded(f)))];
    if (
      !known ||
      own?.ino !== known.ino ||
      own.dev !== known.dev ||
      own.nlink > 1
    )
      bad.add(f);
  }
  const links = new Set();
  for (const [f, { mode }] of tree) if (mode === "160000") links.add(f);
  const index = new Set();
  for (const row of gitRows(dir, "ls-files", "-z", "--stage")) {
    const [, mode, oid, stage, file] = /^(\d+) ([0-9a-f]+) (\d)\t([^]*)$/.exec(
      row,
    );
    const want = tree.get(file);
    index.add(file);
    if (mode === "160000") links.add(file);
    if (!want || stage !== "0" || want.mode !== mode || want.oid !== oid)
      bad.add(file);
  }
  // a parent that is a link to a directory is not the head's directory, whatever it holds
  const parents = new Map([[".", true]]);
  const inPlace = (d) => {
    if (!parents.has(d)) {
      const s = lstat(d);
      parents.set(
        d,
        Boolean(s && s.isDirectory()) && inPlace(path.posix.dirname(d)),
      );
    }
    return parents.get(d);
  };
  const files = [];
  const chmodded = [];
  const inside = [];
  for (const [f, { mode, oid }] of tree) {
    const s = inPlace(path.posix.dirname(f)) ? lstat(f) : null;
    if (!index.has(f) || s === null) bad.add(f);
    else if (mode === "160000") {
      if (!s.isDirectory()) bad.add(f);
      else if (fs.readdirSync(at(f)).length > 0) {
        // in a directory that is no repository, this is the outer one's HEAD, which no entry can name
        const sub = `${dir}/${shown(f)}`;
        if (gitLine(sub, "rev-parse", "HEAD") === oid)
          for (const d of differing(sub, oid, `${prefix}${shown(f)}/`))
            inside.push({ ...d, code: true });
        else bad.add(f);
      }
    } else if (mode === "120000") {
      if (!s.isSymbolicLink() || linkOid(at(f), oid.length) !== oid) bad.add(f);
    } else if (!s.isFile()) bad.add(f);
    else {
      files.push(f);
      if (((s.mode & 0o100) !== 0) !== (mode === "100755")) chmodded.push(f);
    }
  }
  if (
    chmodded.length > 0 &&
    keepsModes(gitLine(dir, "rev-parse", "--absolute-git-dir"))
  )
    for (const f of chmodded) bad.add(f);
  // As git would store it, or byte for byte: with core.autocrlf, a file committed with CRLF is only the
  // second.
  let left = files;
  for (const flags of [[], ["--no-filters"]]) {
    if (left.length === 0) break;
    const ids = gitIn(
      dir,
      ["hash-object", ...flags, "--stdin-paths"],
      bytes(`${left.map(asLine).join("\n")}\n`),
    )
      .toString("latin1")
      .split("\n");
    left = left.filter((f, i) => ids[i] !== tree.get(f).oid);
  }
  for (const f of left) bad.add(f);
  return [
    ...inside,
    ...[...bad].sort().map((f) => ({
      file: prefix + shown(f),
      known: tree.has(f),
      code: links.has(f),
    })),
  ];
}

/**
 * What the pipeline writes beside the work item, after `<id>.`: the DoD and security-probe records, and
 * the reports, bug reports and gates that can stay uncommitted until the acceptance commit.
 */
const OWN_RECORD = new RegExp(
  "^(?:" +
    [
      String.raw`dod\.\d+\.ac\.json`,
      String.raw`(?:dod|qa)\.\d+\.(?:[^/]+\.)?security\.(?:(?:plan|run)\.json|cases(?:[.-][^/.]+)?\.json|run\.json\.d/[^/]+\.json)`,
      String.raw`(?:dod|implementation|review|qa|pr-review|bug)\.\d+\.[^/]+\.md`,
      String.raw`gate\.\d+\.[^/]+\.yml`,
    ].join("|") +
    ")$",
);

/** Is this path (from the repository's root) a record of the work item `doc`, beside it? */
function isOwnRecord(file, top, doc) {
  const { id } = docId.parse(path.basename(doc));
  if (!id) return false;
  try {
    const dir = path.relative(top, fs.realpathSync(path.dirname(doc)));
    const start = `${dir === "" ? "" : `${dir}/`}${id}.`;
    return (
      file.startsWith(start) &&
      OWN_RECORD.test(file.slice(start.length)) &&
      fs.lstatSync(path.join(top, file)).isFile()
    );
  } catch {
    return false;
  }
}

/**
 * What the working tree holds that the head does not: { why, docs }. `why` is "" when the tree is the
 * head as far as code goes, else the sentence to refuse with.
 */
function compareWithHead({ git, root, head, patterns, outDir, doc }) {
  let now;
  try {
    now = git("rev-parse", "--verify", "HEAD^{commit}");
  } catch {
    now = "unreadable";
  }
  if (now !== head)
    return {
      why: `HEAD moved from ${head.slice(0, 12)} to ${now.slice(0, 12)}`,
      docs: [],
    };
  const top = fs.realpathSync(git("rev-parse", "--show-toplevel"));
  const outPrefix = `${path.relative(top, fs.existsSync(outDir) ? fs.realpathSync(outDir) : outDir)}/`;
  let found;
  try {
    found = differing(top, head);
  } catch (e) {
    return {
      why: `the working tree could not be compared with the head (${e.message.split("\n")[0]})`,
      docs: [],
    };
  }
  const own = ({ file, known }) =>
    !known &&
    (file.startsWith(PIPELINE_STATE_DIR) ||
      (file.startsWith(outPrefix) &&
        OWN_FILE.test(file.slice(outPrefix.length))));
  const differs = found.filter((d) => !own(d));
  const rest = differs.map((d) => d.file);
  const bad = differs
    .filter(
      ({ file, code }) =>
        code || (!isDocsPath(file, patterns) && !isOwnRecord(file, top, doc)),
    )
    .map((d) => d.file);
  return {
    why:
      bad.length > 0
        ? `the working tree is not the head: ${bad.slice(0, 5).join(", ")}`
        : "",
    docs: rest.filter((f) => !bad.includes(f)),
  };
}

async function run(argv) {
  try {
    const o = parseArgs(argv);
    const root = path.resolve(o.root);
    const outDir = path.resolve(root, o.outDir);
    const git = (...a) =>
      execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim();
    let head;
    try {
      head = git("rev-parse", "--verify", "HEAD^{commit}");
    } catch {
      throw new UsageError(`${root} is not a git checkout with a commit`);
    }
    // Only this engine's own files: a wrong --out-dir must not lose anything else.
    if (fs.existsSync(outDir))
      for (const f of fs.readdirSync(outDir))
        if (OWN_FILE.test(f)) fs.unlinkSync(path.join(outDir, f));
    // Not through a replacement: the list that runs is the one the head holds (T319-CR-804).
    const text = configTextAtCommit(
      (cmd, args, opts) =>
        execFileSync(cmd, args, { ...opts, env: unreplaced() }),
      root,
      head,
    );
    const list = text === null ? [] : parseRerunList(text);
    const document = path.basename(o.doc);
    const base = { document, head, runs: [] };
    if (list.length === 0)
      return { reason: "not-configured", exitCode: 0, ...base };

    let body;
    try {
      body = fs.readFileSync(path.resolve(root, o.doc), "utf8");
    } catch (e) {
      return {
        reason: "scan-broken",
        exitCode: 1,
        message: `cannot read ${o.doc}: ${e.code}`,
        ...base,
      };
    }
    const entries = readCriteriaEntries(body);
    if (entries === null || entries.length === 0) {
      // Criteria the reader cannot see, or none at all: only the first can hide a command (T319-CR-805).
      // Under every heading that speaks of criteria, and in the whole document when nothing stands there
      // (T319-CR-1003). A line in a fence is no heading. Only a section the reader knows that holds criteria,
      // or an AC heading, says where they are: a heading that contains the word (`## Rollback criteria`)
      // does not (T319-CR-1201).
      const isFenceLine = makeFenceTracker();
      const parts = [[]];
      for (const line of body.split(/\r?\n/)) {
        if (!isFenceLine(line) && line.startsWith("## ")) parts.push([]);
        parts.at(-1).push(line);
      }
      const placed =
        CRITERIA_HEADINGS.some((name) =>
          holdsCriteria(extractSection(body, name) ?? ""),
        ) ||
        parts.some(
          (part) =>
            RE_AC_HEADING.test(part[0]) && holdsCriteria(part.join("\n")),
        );
      const under = parts
        .filter((part) => /^## .*(?:criteri|\bAC[ -]?\d)/i.test(part[0]))
        .map((part) => part.slice(1).join("\n"))
        .join("\n");
      const where = entries === null || !placed ? body : under;
      const hidden = list.find((command) => shows(where, command));
      if (hidden === undefined)
        return { reason: "none-named", exitCode: 0, ...base };
      return {
        reason: "scan-broken",
        exitCode: 1,
        message: `the document names \`${hidden}\` and has no criteria the reader can find`,
        ...base,
      };
    }
    const texts = entries.map((e) =>
      [e.line, ...e.continuation].filter(Boolean).join(" ").trim(),
    );
    const joined = lazyTexts(body);
    const lazy = lazilyNamed(list, joined, texts);
    if (lazy)
      return {
        reason: "scan-broken",
        exitCode: 1,
        message: `criterion #${lazy.index} names \`${lazy.command}\` on an unindented line, which is not read as part of it: indent the line`,
        ...base,
      };
    // A backtick without a partner takes the one that opens a later span, and the span is gone
    // (T319-CR-1005), on an unindented line as well (T319-CR-1202).
    for (const [i, e] of entries.entries()) {
      const raw = [e.line, ...e.continuation].join("\n");
      const whole = codeSpans(texts[i]);
      const lost = list.find(
        (c) => !whole.includes(c) && (shows(raw, c) || shows(joined[i], c)),
      );
      if (lost)
        return {
          reason: "scan-broken",
          exitCode: 1,
          message: `criterion #${i + 1} names \`${lost}\` after a backtick that has no partner, which hides it: remove that backtick`,
          ...base,
        };
    }
    const named = namedCommands(list, texts);
    if (named.length === 0)
      return { reason: "none-named", exitCode: 0, ...base };

    const { patterns } = parseConfig(text);
    const docs = new Set();
    const refusal = (when) => {
      const { why, docs: found } = compareWithHead({
        git,
        root,
        head,
        patterns,
        outDir,
        doc: path.resolve(root, o.doc),
      });
      for (const f of found) docs.add(f);
      return why === ""
        ? null
        : {
            reason: "dirty-tree",
            exitCode: 1,
            message: `${when}: ${why}`,
            ...base,
          };
    };
    const deadline = Date.now() + o.timeoutSeconds * 1000;
    const runs = [];
    for (const [i, r] of named.entries()) {
      const no = refusal(`before \`${r.command}\``);
      if (no) return no;
      fs.mkdirSync(outDir, { recursive: true });
      runs.push(
        await runOne(r, i + 1, {
          root,
          outDir,
          deadline,
          maxBytes: o.maxBytes,
        }),
      );
    }
    const moved = refusal(`after \`${named[named.length - 1].command}\``);
    if (moved) return moved;
    const result = {
      reason: "ran",
      exitCode: 0,
      document,
      head,
      uncommitted_docs: [...docs].sort(),
      runs,
    };
    const { uncommitted_docs } = result;
    fs.writeFileSync(path.join(outDir, "run.md"), markdown(result));
    fs.writeFileSync(
      path.join(outDir, "run.json"),
      `${JSON.stringify({ document, head, uncommitted_docs, runs }, null, 2)}\n`,
    );
    return result;
  } catch (e) {
    // A configuration error reported by ci-tree-equivalence.js is the same class as one found here.
    const usage = e instanceof UsageError;
    return {
      reason: usage ? "usage" : "failed",
      exitCode: usage ? 2 : 1,
      message: e && e.message ? e.message.split("\n")[0] : String(e),
      head: null,
      runs: [],
    };
  }
}

async function main(argv) {
  const result = await run(argv);
  if (argv.includes("--json"))
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else
    process.stdout.write(
      `${result.reason}${result.message ? `: ${result.message}` : ""}\n`,
    );
  if (result.exitCode !== 0)
    process.stderr.write(
      `finalise-rerun-at-head: ${result.reason}: ${result.message}\n${result.reason === "usage" ? `${USAGE}\n` : ""}`,
    );
  process.exitCode = result.exitCode;
}

if (require.main === module) main(process.argv.slice(2));

module.exports = {
  codeSpans,
  keepsModes,
  namedCommands,
  parseRerunList,
  markdown,
  run,
  USAGE,
};
