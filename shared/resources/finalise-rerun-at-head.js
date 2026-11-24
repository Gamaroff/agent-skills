#!/usr/bin/env node
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
 * consumer need not ignore; and the work item's own DoD records beside it, by the names /finalise writes
 * (listed with the documentation: a project whose patterns are Markdown only would refuse its own ac.json
 * on a resume). So a sparse checkout that leaves code out is refused: its working tree is not the head. A
 * submodule that was never checked out is an empty directory, and is let through.
 *
 * WHAT THAT DOES NOT SEE. A path git ignores, by any of its ignore files. A content filter or line-ending
 * rule is applied as git applies it, so a file that differs only by one is the head's. Nothing is watched
 * between two checks.
 *
 * THE RUN IS DATA, NEVER A VERDICT. A command's non-zero exit does not change this engine's: the
 * criterion says what the command must do, and the AC agent grades the saved run against it.
 *
 * WHAT BOUNDS IT. --timeout-seconds is the budget of the WHOLE run, not of each command: a command that
 * reaches it is killed, and one that would start after it is recorded as not started. The engine copies a
 * command's output itself and keeps at most --max-output-bytes of each stream: one that passes it is
 * stopped (`stopped_for_size`) unless it had already ended by itself (`output_capped` covers both).
 * Nothing it started can grow the saved output afterwards. A kill reaches the command's process group: a
 * descendant that left it (`setsid`, a daemon, and coreutils' `timeout`, which makes a group of its own)
 * is not killed, and runs on after the bound without a place to write.
 *
 * Usage:
 *   finalise-rerun-at-head.js --doc <path> --out-dir <dir> [--workspace-root <dir>]
 *                             [--timeout-seconds <n>] [--max-output-bytes <n>] [--json]
 *
 *   --out-dir is emptied of an earlier run's record first, so a file in it is always this run's.
 *   It writes <n>.stdout, <n>.stderr, run.json: { document, head, uncommitted_docs, runs: [{ command,
 *   criteria, exit_code, timed_out, not_started, stopped_for_size, output_capped, stdout, stderr }] }, and
 *   run.md, the block for the DoD running summary. The --json answer carries `document` too: the work
 *   item's file name, which finalise-rerun-scope.js holds against its own --doc.
 *
 * reason / exit:
 *   ran             0  at least one command was run
 *   none-named      0  the list is set and no criterion names an entry of it
 *   not-configured  0  finalise.rerunAtHead is absent or an empty list
 *   dirty-tree      1  the working tree is not the head, or stopped being it; no record is kept
 *   scan-broken     1  the document or its criteria section could not be read
 *   failed          1  the engine itself failed (a file it could not write, git); no record is kept
 *   usage           2  bad arguments, or a configuration that cannot be read as a list of commands
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parseYamlSubset } = require("./yaml-subset.js");
const { readCriteriaEntries } = require("./criteria-section.js");
const {
  UsageError,
  assertBlockRows,
  assertMapping,
  configTextAtCommit,
  isDocsPath,
  killProcessGroup,
  parseConfig,
  spawnCheck,
  topLevelKey,
} = require("./ci-tree-equivalence.js");
const docId = require("./doc-id.js");

const DEFAULT_TIMEOUT_SECONDS = 1500;
const DEFAULT_MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const PIPELINE_STATE_DIR = ".claude/state/";
const OWN_FILE = /^(\d+\.(stdout|stderr)|run\.(json|md))$/;
const EXCERPT_LINES = 20;
const EXCERPT_CHARS = 4000;
const EXCERPT_BYTES = 64 * 1024;
const DRAIN_MS = 1000; // how long a stream held open by a descendant is read after the command ended
const USAGE =
  "usage: finalise-rerun-at-head.js --doc <path> --out-dir <dir> [--workspace-root <dir>] [--timeout-seconds <n>] [--max-output-bytes <n>] [--json]";

/** Every key of the `finalise` block (docs/reference/configuration.md). */
const FINALISE_KEYS = ["deferralApprover", "rerunAtHead"];

const normKey = (k) => String(k).toLowerCase().replace(/[-_]/g, "");

/**
 * How many rows of the file spell the list's key, at any indent, in any block, its letters escaped or not.
 * The YAML subset keeps an escape as text, so a list under `"fin\x61lise"` was read as no list at all, and
 * beside a plain block as a second copy nobody counted (T319-CR-406).
 */
function listKeyRows(text) {
  const plain = text.replace(
    /\\(?:x([0-9a-fA-F]{2})|u([0-9a-fA-F]{4})|U([0-9a-fA-F]{8}))/g,
    (_, x, u, U) =>
      String.fromCodePoint(Math.min(parseInt(x ?? u ?? U, 16), 0xfffd)),
  );
  return plain
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
  const re = /(?<!`)(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[2].trim());
  return out;
}

/** [{ command, criteria: ["#1 text", …] }] in list order, only for commands a criterion names. */
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

/**
 * Copy a command's output into `files` ([stdout, stderr]), at most `maxBytes` of each. The command gets
 * pipes and never the files, so nothing it leaves running can write to them (T319-CR-405).
 */
function copyOutput(child, files, maxBytes) {
  const streams = [child.stdout, child.stderr].filter(Boolean);
  const fds = files.map((f) => fs.openSync(f, "w"));
  const state = { capped: false, stopped: false, failed: null };
  const ended = streams.map(
    (s, i) =>
      new Promise((resolve) => {
        let room = maxBytes;
        s.on("close", resolve);
        s.on("error", resolve);
        s.on("data", (chunk) => {
          try {
            if (room > 0) fs.writeSync(fds[i], chunk.subarray(0, room));
          } catch (e) {
            state.failed = state.failed || e;
          }
          room -= chunk.length;
          if (room >= 0 || state.capped) return;
          state.capped = true;
          state.stopped = child.exitCode === null && child.signalCode === null;
          killProcessGroup(child.pid);
        });
      }),
  );
  state.drain = async () => {
    let timer;
    const late = new Promise((resolve) => {
      timer = setTimeout(resolve, DRAIN_MS);
    });
    await Promise.race([Promise.all(ended), late]);
    clearTimeout(timer);
    for (const s of streams) s.destroy();
    for (const fd of fds) fs.closeSync(fd);
    if (state.failed) throw state.failed;
  };
  return state;
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
  let copy = null;
  if (left > 0) {
    // spawnCheck owns the command's process group: a timeout, or a signal to this engine, ends what the
    // command started and not only its shell.
    r = await spawnCheck("sh", ["-c", command], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: left,
      onSpawn: (child) => {
        copy = copyOutput(child, [stdout, stderr], maxBytes);
      },
    });
    killProcessGroup(r.pid);
    if (copy) await copy.drain();
  }
  const stopped = Boolean(copy && copy.stopped && r.signal);
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
    output_capped: Boolean(copy && copy.capped),
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
  if (r.timed_out) return "timed out";
  if (r.stopped_for_size) return "stopped: its output passed the bound";
  const end = r.exit_code === null ? "did not finish" : `exit ${r.exit_code}`;
  return r.output_capped ? `${end}, its output cut at the bound` : end;
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

/** git in `cwd`, with no object read through a replacement. */
function gitIn(cwd, args, input) {
  return execFileSync("git", args, {
    cwd,
    env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1" },
    input,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
}
const gitRows = (cwd, ...args) => gitIn(cwd, args).split("\0").filter(Boolean);
const gitLine = (cwd, ...args) => gitIn(cwd, args).replace(/\r?\n$/, "");

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
 * Every path of the checkout at `dir` that is not `commit`'s, as [{ file, known }] (`known`: the commit has
 * the path). Read from the commit's tree: the index and the configuration are never asked what changed.
 * The index itself is compared too, because a command can read it (`git ls-files`).
 */
function differing(dir, commit, prefix = "") {
  const at = (f) => path.join(dir, f);
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
  const bad = new Set(
    gitRows(dir, "ls-files", "-z", "--others", "--exclude-standard"),
  );
  const index = new Set();
  for (const row of gitRows(dir, "ls-files", "-z", "--stage")) {
    const [, mode, oid, stage, file] = /^(\d+) ([0-9a-f]+) (\d)\t([^]*)$/.exec(
      row,
    );
    const want = tree.get(file);
    index.add(file);
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
        if (gitLine(at(f), "rev-parse", "HEAD") === oid)
          inside.push(...differing(at(f), oid, `${prefix}${f}/`));
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
      `${left.map(asLine).join("\n")}\n`,
    ).split("\n");
    left = left.filter((f, i) => ids[i] !== tree.get(f).oid);
  }
  for (const f of left) bad.add(f);
  return [
    ...inside,
    ...[...bad].sort().map((f) => ({ file: prefix + f, known: tree.has(f) })),
  ];
}

/** What /finalise writes beside the work item, after `<id>.dod.<N>.`. */
const DOD_RECORD =
  /^(?:[^/]+\.md|ac\.json|security\.(?:(?:plan|run)\.json|cases(?:\.\d+)?\.json|run\.json\.d\/[^/]+))$/;

/** Is this path (from the repository's root) a DoD record of the work item `doc`, beside it? */
function isOwnDodRecord(file, top, doc) {
  const { id } = docId.parse(path.basename(doc));
  if (!id) return false;
  try {
    const dir = path.relative(top, fs.realpathSync(path.dirname(doc)));
    const start = `${dir === "" ? "" : `${dir}/`}${id}.dod.`;
    if (!file.startsWith(start)) return false;
    const m = /^\d+\.(.*)$/.exec(file.slice(start.length));
    return (
      m !== null &&
      DOD_RECORD.test(m[1]) &&
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
  const rest = found.filter((d) => !own(d)).map((d) => d.file);
  const bad = rest.filter(
    (f) => !isDocsPath(f, patterns) && !isOwnDodRecord(f, top, doc),
  );
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
    const text = configTextAtCommit(execFileSync, root, head);
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
    if (entries === null || entries.length === 0)
      return {
        reason: "scan-broken",
        exitCode: 1,
        message: "the document has no criteria the reader can find",
        ...base,
      };
    const named = namedCommands(
      list,
      entries.map((e) =>
        [e.line, ...e.continuation].filter(Boolean).join(" ").trim(),
      ),
    );
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
