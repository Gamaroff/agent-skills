#!/usr/bin/env node
/**
 * agent-reply-block — take a fenced block out of a subagent's reply without retyping it (task 269).
 *
 * `/finalise` used to save two subagent answers with the file-write tool: the security agent's
 * `probe_plan` (Step 3b.1) and the AC agent's YAML (Step 3c). Both were a model re-typing a model's
 * output into a file that decides acceptance, with nothing checking the copy: a plan arrived with
 * `&lt;` for `<` seven times (obs #65), a 146-case plan carried control characters a hand copy can
 * turn into a legitimate input (obs #136), and 150 lines of AC YAML had every `note` shortened
 * (obs #142).
 *
 * The host writes each subagent's transcript to
 *   <config-dir>/projects/<project>/<session>/subagents/agent-<agentId>.jsonl
 * and the reply is the trailing assistant text in it, or the last `SubagentHandback` tool call's
 * `input.message`, whichever is later (task 327), byte-exact. The agent id is in the Agent tool's
 * result, so the file is addressable without the orchestrator copying one character of the reply.
 * That layout is a host internal and not a contract, so every path out of here that cannot find it is a
 * NAMED answer (`transcript-not-found`), never a guess: the caller then falls back to the hand copy and
 * records it as unverified.
 *
 * Usage:
 *   node agent-reply-block.js extract (--agent-id <id> | --transcript <file>) --block <info-string>
 *        --out <path> [--projects-root <dir>] [--json]
 *
 * `reason` (every answer exits 0 except a usage error, which exits 2):
 *   extracted             the block was written to --out; `bytes` and `sha256` describe the written file,
 *                         and `reply` says which shape held it (`text` or `handback`)
 *   transcript-not-found  no transcript for that agent id (or --transcript is not a file)
 *   transcript-ambiguous  several transcripts carry that agent id; nothing is written
 *   transcript-unreadable the transcript cannot be read, or holds neither assistant text nor a
 *                         `SubagentHandback` message
 *   no-block              the reply has no fenced block with that info string
 *   empty-block           the block is empty
 *   entity-escaped        the block carries an HTML entity and no literal `<`, `>` or `&` anywhere: an
 *                         escaped reply, not the agent's text (obs #65). Nothing is written
 *
 * The block taken is the LAST one with the info string: an agent that quotes its own format earlier in
 * the reply must not have the quotation run.
 *
 * `extract` removes --out before it reads anything, so every answer but `extracted` and `usage` leaves
 * no file there: an earlier run's file cannot be read as this run's output (task 327). A `usage` answer
 * leaves --out as it found it: an --out that is the transcript file (by path, symlink or hard link, and
 * on the --agent-id route the transcript found), a directory, or a path that cannot be checked or
 * removed. A symlink at --out is removed itself, never followed.
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const REASONS = Object.freeze([
  "extracted",
  "transcript-not-found",
  "transcript-ambiguous",
  "transcript-unreadable",
  "no-block",
  "empty-block",
  "entity-escaped",
]);

const HTML_ENTITY = /&(?:gt|lt|amp|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);/;
const HTML_ENTITY_ALL = new RegExp(HTML_ENTITY.source, "g");
const AGENT_ID = /^[A-Za-z0-9]+$/;

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** The projects directory the host writes transcripts under. */
function defaultProjectsRoot(env = process.env) {
  const base = env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  return path.join(base, "projects");
}

/**
 * Every `agent-<id>.jsonl` under `<root>/*\/*\/subagents/` (project, session). Returns paths.
 */
function findTranscripts(agentId, root) {
  const out = [];
  let projects;
  try {
    projects = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const p of projects) {
    if (!p.isDirectory()) continue;
    let sessions;
    try {
      sessions = fs.readdirSync(path.join(root, p.name), {
        withFileTypes: true,
      });
    } catch {
      continue;
    }
    for (const s of sessions) {
      if (!s.isDirectory()) continue;
      const f = path.join(
        root,
        p.name,
        s.name,
        "subagents",
        `agent-${agentId}.jsonl`,
      );
      try {
        if (fs.statSync(f).isFile()) out.push(f);
      } catch {
        /* not here */
      }
    }
  }
  return out;
}

/**
 * The reply text: the assistant `text` blocks after the last `user` line (a tool result is a `user`
 * line, so this is the final turn only). `null` when there is none. The host also writes metadata
 * lines between and after the turns (`attachment`, `api-request`, `api-request-blob`, …): they are
 * neither a turn boundary nor reply text, so they are skipped, not treated as a reset (T269-QA-5).
 * Separate text blocks are joined with a newline, so one block's closing fence can never fuse with the
 * next block's opening line.
 *
 * An async agent can instead reply through a `SubagentHandback` tool call, whose `input.message` is the
 * reply; its `tool_result` line then empties the text tail (task 327). So there are two candidates, and
 * the LATER one in the transcript is the reply: a resumed agent answers with its newest message, in
 * either shape. Only that exact tool name with a non-empty string `message` counts. A new prompt (a
 * `user` line that is not only `tool_result` blocks) opens a new turn and drops an earlier hand-back:
 * a resumed agent that has not answered yet has no reply (QA cycle 2). Returns
 * `{ text, reply: "text" | "handback" }`, or `null` when neither exists or a line does not parse.
 */
function isPrompt(o) {
  const c = o.message && o.message.content;
  if (typeof c === "string") return true;
  if (!Array.isArray(c)) return false;
  return c.some((b) => !(b && b.type === "tool_result"));
}

function replyText(jsonl) {
  const lines = jsonl.split("\n").filter((l) => l.trim() !== "");
  // Positions are [line, block] pairs, compared in order: of the two reply shapes, the later wins.
  const later = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
  let tail = []; // [{ text, at }] for the final turn's text blocks
  let handback = null; // { text, at } for the last SubagentHandback carrying a usable message
  for (let i = 0; i < lines.length; i++) {
    let o;
    try {
      o = JSON.parse(lines[i]);
    } catch {
      return null;
    }
    if (o && o.type === "user") {
      tail = [];
      // A new prompt opens a new turn, and an earlier turn's hand-back is not its reply. A line made
      // only of tool_result blocks (the hand-back's own result among them) continues the turn
      // (task 327, QA cycle 2).
      if (isPrompt(o)) handback = null;
      continue;
    }
    if (!(o && o.type === "assistant" && o.message)) continue;
    const c = o.message.content;
    if (typeof c === "string") {
      tail.push({ text: c, at: [i, 0] });
      continue;
    }
    if (!Array.isArray(c)) continue;
    c.forEach((b, j) => {
      if (!b) return;
      if (b.type === "text" && typeof b.text === "string")
        tail.push({ text: b.text, at: [i, j] });
      // Only the exact tool name, and only a non-empty string message, is a reply (task 327).
      else if (
        b.type === "tool_use" &&
        b.name === "SubagentHandback" &&
        b.input &&
        typeof b.input.message === "string" &&
        b.input.message !== ""
      )
        handback = { text: b.input.message, at: [i, j] };
    });
  }
  const text = tail.map((p) => p.text).join("\n");
  if (
    text !== "" &&
    (!handback || later(tail[tail.length - 1].at, handback.at))
  )
    return { text, reply: "text" };
  if (handback) return { text: handback.text, reply: "handback" };
  return null;
}

/**
 * The body of the LAST fenced block whose info string is exactly `info`, or `null`. The body is the
 * text between the opening fence's line break and the closing fence's line start, with no trailing
 * newline added or removed beyond that one.
 */
function lastBlock(text, info) {
  const lines = text.split("\n");
  let found = null;
  for (let i = 0; i < lines.length; i++) {
    const open = /^(`{3,}|~{3,})([^`]*)$/.exec(lines[i].replace(/\r$/, ""));
    if (!open || open[2].trim() !== info) continue;
    const fence = open[1];
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].replace(/\r$/, "");
      if (t.startsWith(fence[0].repeat(fence.length)) && /^[`~]+\s*$/.test(t)) {
        found = lines.slice(i + 1, j).join("\n");
        i = j;
        break;
      }
    }
  }
  return found;
}

/**
 * True when `a` and `b` name one file: the same resolved path, or — when both exist — the same
 * device and inode, so a symlink or a hard link to a file is that file (task 327, QA cycle 1).
 */
function sameFile(a, b) {
  if (path.resolve(a) === path.resolve(b)) return true;
  let sa, sb;
  try {
    sa = fs.statSync(a);
    sb = fs.statSync(b);
  } catch {
    return false; // one of them does not exist: nothing at `a` can be the file at `b`
  }
  return sa.dev === sb.dev && sa.ino === sb.ino;
}

/**
 * Remove a file at `out`, if there is one. Returns null on success, or the refusal message when `out`
 * is a directory or cannot be removed — a named answer, never a crash (task 327, QA cycle 1).
 */
function clearOut(out) {
  let st;
  try {
    st = fs.lstatSync(out);
  } catch (e) {
    // Only "no such file" means nothing there; any other failure means this call could not look
    // (ENOTDIR, EACCES, ELOOP), and that is a refusal, never a pass (QA cycle 2, T327-QA-5).
    if (e && e.code === "ENOENT") return null;
    return `extract --out cannot be checked: ${out} (${(e && e.code) || e})`;
  }
  if (st.isDirectory()) return `extract --out is a directory: ${out}`;
  try {
    fs.rmSync(out, { force: true });
  } catch (e) {
    return `extract --out cannot be removed: ${out} (${(e && e.code) || e})`;
  }
  return null;
}

/**
 * Extract the block. `opts`: { agentId | transcript, block, out, projectsRoot }.
 * Returns { reason, exitCode: 0, ... }.
 */
function extract(opts) {
  // Find the transcript first, writing nothing: --out is removed only once every file this call could
  // read is known, so the removal can never be the input (task 327, QA cycle 1).
  let file = opts.transcript || null;
  let hits = [];
  if (!file) {
    const root = opts.projectsRoot || defaultProjectsRoot();
    hits = findTranscripts(opts.agentId, root);
  }
  // A failed extract must never leave an earlier run's file to be read as its output (task 327).
  // The test is file identity, not spelling: a symlink or a hard link to the transcript is the
  // transcript (QA cycle 1, T327-QA-1).
  const sources = file ? [file] : hits;
  if (opts.out && sources.some((s) => sameFile(opts.out, s)))
    return {
      reason: "usage",
      exitCode: 2,
      message: "extract --out must not be the transcript file",
    };
  if (opts.out) {
    const refused = clearOut(opts.out);
    if (refused) return { reason: "usage", exitCode: 2, message: refused };
  }
  if (!file) {
    const root = opts.projectsRoot || defaultProjectsRoot();
    if (hits.length === 0)
      return {
        reason: "transcript-not-found",
        exitCode: 0,
        message: `no transcript for agent ${opts.agentId} under ${root}`,
      };
    if (hits.length > 1)
      return {
        reason: "transcript-ambiguous",
        exitCode: 0,
        message: `${hits.length} transcripts carry agent ${opts.agentId}`,
      };
    file = hits[0];
  } else {
    try {
      if (!fs.statSync(file).isFile()) throw new Error("not a file");
    } catch {
      return {
        reason: "transcript-not-found",
        exitCode: 0,
        message: `--transcript is not a file: ${file}`,
      };
    }
  }
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (e) {
    return {
      reason: "transcript-unreadable",
      exitCode: 0,
      message: String(e && e.message),
    };
  }
  const reply = replyText(raw);
  if (reply === null)
    return {
      reason: "transcript-unreadable",
      exitCode: 0,
      message:
        "the transcript holds no final assistant text and no SubagentHandback message",
    };
  const body = lastBlock(reply.text, opts.block);
  if (body === null)
    return {
      reason: "no-block",
      exitCode: 0,
      message: `the reply has no fenced block with the info string "${opts.block}"`,
    };
  if (body.trim() === "")
    return {
      reason: "empty-block",
      exitCode: 0,
      message: "the block is empty",
    };
  if (
    HTML_ENTITY.test(body) &&
    !/[<>&]/.test(body.replace(HTML_ENTITY_ALL, ""))
  )
    return {
      reason: "entity-escaped",
      exitCode: 0,
      message:
        "the block carries an HTML entity and no literal <, > or &: an escaped reply, not the agent's text",
    };
  const buf = Buffer.from(body + "\n", "utf8");
  fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
  fs.writeFileSync(opts.out, buf);
  return {
    reason: "extracted",
    exitCode: 0,
    out: opts.out,
    bytes: buf.length,
    sha256: sha256(buf),
    source: file,
    reply: reply.reply,
  };
}

function parseArgs(argv) {
  const out = { cmd: argv[0], json: false };
  const takes = {
    "--agent-id": "agentId",
    "--transcript": "transcript",
    "--block": "block",
    "--out": "out",
    "--projects-root": "projectsRoot",
  };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (Object.prototype.hasOwnProperty.call(takes, a)) {
      const v = argv[i + 1];
      if (v === undefined || v === "" || /^--/.test(v))
        return { ...out, error: `${a} requires a value` };
      out[takes[a]] = v;
      i++;
    } else return { ...out, error: `unknown argument: ${a}` };
  }
  return out;
}

const USAGE =
  "usage: agent-reply-block.js extract (--agent-id <id> | --transcript <file>) --block <info-string> --out <path> [--projects-root <dir>] [--json]";

/** Validate the CLI options for `extract`; a message when they are unusable, else null. */
function extractUsageError(opts) {
  if (!opts.agentId === !opts.transcript)
    return "extract needs exactly one of --agent-id and --transcript";
  if (opts.agentId && !AGENT_ID.test(opts.agentId))
    return `--agent-id is not an agent id: ${opts.agentId}`;
  if (!opts.block) return "extract needs --block";
  if (!opts.out) return "extract needs --out";
  // extract removes --out before reading (task 327): the same file would be the input it deletes.
  // File identity, not spelling: a symlink or a hard link to the transcript is the transcript.
  if (opts.transcript && sameFile(opts.out, opts.transcript))
    return "extract --out must not be the --transcript file";
  return null;
}

function emit(json, payload) {
  if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  else if (payload.reason === "extracted")
    process.stdout.write(
      `extracted ${payload.bytes} bytes sha256=${payload.sha256} -> ${payload.out}\n`,
    );
  else process.stdout.write(`${payload.reason}: ${payload.message || ""}\n`);
  process.exitCode = payload.exitCode;
}

function main(argv) {
  const opts = parseArgs(argv);
  const bad =
    opts.error ||
    (opts.cmd === "extract"
      ? extractUsageError(opts)
      : "a command is required: extract");
  if (bad)
    return emit(opts.json, {
      reason: "usage",
      exitCode: 2,
      message: `${bad}\n${USAGE}`,
    });
  return emit(opts.json, extract(opts));
}

if (require.main === module) main(process.argv.slice(2));

module.exports = {
  REASONS,
  AGENT_ID,
  defaultProjectsRoot,
  findTranscripts,
  replyText,
  lastBlock,
  extract,
  extractUsageError,
  main,
  sha256,
};
