"use strict";

/**
 * engines.js — per-engine knowledge for loop-supervisor (task 213).
 *
 * The loop in run-loop.mjs knows nothing about any particular agent CLI.
 * Everything engine-specific lives here: the binary, the argv, how to read the
 * result line of the engine's stream, how to render a stream line for the human
 * log, where the engine keeps its transcript, and which supervisor flags the
 * engine can honour. Adding an engine is adding a row, not editing the loop —
 * the same split adapters.js makes for commands.
 *
 * Every engine's `parseResult` returns ONE normalised envelope, so classify(),
 * the totals and the ledger read the same shape whatever produced it:
 *
 *   { subtype, isError, numTurns, costUsd, sessionId }
 *
 * `supports` is what run-loop.mjs consults before it spawns anything. A flag the
 * engine cannot honour is refused there with a message naming both, rather than
 * dropped: a budget ceiling that is silently inert is worse than no ceiling,
 * because the operator believes it holds.
 *
 * `--model` and `--effort` are passed through unvalidated. The engine is the
 * authority on its own model ids (`agy models`, `claude --help`); a list kept
 * here would be stale the day a model ships.
 *
 * CommonJS, matching adapters.js. No dependencies. Node >= 22.
 */

const path = require("node:path");
const os = require("node:os");

// ── claude ───────────────────────────────────────────────────────────────────

/**
 * Verified against claude 2.1.250: `--output-format stream-json` REQUIRES
 * `--verbose`; `--session-id` pins the transcript path so every iteration stays
 * reopenable with `claude --resume <uuid>` afterwards. `--model` and `--effort`
 * verified present on 2.1.306.
 *
 * With `model` and `effort` unset the array is byte-identical to the pre-registry
 * `buildClaudeArgs` — pinned by the characterisation test in run-loop.test.mjs.
 */
function buildClaudeArgs({
  prompt,
  sessionId,
  settingsPath,
  maxTurns = null,
  model = null,
  effort = null,
}) {
  const args = [
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--session-id",
    sessionId,
    "--permission-mode",
    "acceptEdits",
    "--settings",
    settingsPath,
  ];
  if (model) args.push("--model", model);
  if (effort) args.push("--effort", effort);
  if (maxTurns != null && Number.isFinite(maxTurns)) {
    args.push("--max-turns", String(maxTurns));
  }
  return args;
}

function parseClaudeResult(obj) {
  if (!obj || obj.type !== "result") return null;
  return {
    subtype: typeof obj.subtype === "string" ? obj.subtype : null,
    isError: obj.is_error === true,
    numTurns: typeof obj.num_turns === "number" ? obj.num_turns : null,
    costUsd: typeof obj.total_cost_usd === "number" ? obj.total_cost_usd : null,
    sessionId: typeof obj.session_id === "string" && obj.session_id ? obj.session_id : null,
  };
}

/** Render one claude stream-json line into the human-readable log, or null to skip. */
function renderClaudeLine(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (obj.type === "assistant" && obj.message && Array.isArray(obj.message.content)) {
    const parts = [];
    for (const c of obj.message.content) {
      if (c.type === "text" && c.text && c.text.trim()) parts.push(c.text.trim());
      // Tool-call NAMES only — never inputs. A tool input can be a whole file,
      // and this log exists to be read by a human at 3am, not to be complete.
      else if (c.type === "tool_use") parts.push(`  → ${c.name}`);
    }
    return parts.length ? parts.join("\n") : null;
  }
  if (obj.type === "result") {
    return `--- result: subtype=${obj.subtype} turns=${obj.num_turns} cost=$${
      typeof obj.total_cost_usd === "number" ? obj.total_cost_usd.toFixed(4) : "?"
    } ---`;
  }
  return null;
}

/** Where `claude --resume <sessionId>` will find this iteration's transcript. */
function claudeTranscriptPath(cwd, sessionId, home = os.homedir()) {
  const slug = cwd.replace(/[/.]/g, "-");
  return path.join(home, ".claude", "projects", slug, `${sessionId}.jsonl`);
}

// ── agy (Antigravity CLI) ────────────────────────────────────────────────────

/**
 * Measured on agy 1.4.2 (task 213 Phase 0; the plan file records each fact):
 *
 * - `--conversation <id>` RESUMES. A fresh uuid prints "conversation not found"
 *   and runs under a different new id, so it cannot pin a session — the flag is
 *   omitted and the id is read from the stream's `conversation_id` instead.
 * - `--mode accept-edits` in print mode runs shell commands without prompting.
 *   agy has no allow/deny file, so there is no command boundary to pin.
 * - `--dangerously-skip-permissions` is emitted ONLY when the operator passed
 *   the supervisor's flag of the same name. Never on this module's authority:
 *   supervisor-settings.json records why the claude entry refuses it.
 * - No turn cap and no cost in the result, hence `supports.maxTurns` and
 *   `supports.cost` are false and run-loop.mjs refuses `--max-turns`/`--max-cost`.
 */
function buildAgyArgs({ prompt, model = null, effort = null, skipPermissions = false }) {
  const args = ["-p", prompt, "--output-format", "stream-json", "--mode", "accept-edits"];
  if (skipPermissions) args.push("--dangerously-skip-permissions");
  if (model) args.push("--model", model);
  if (effort) args.push("--effort", effort);
  return args;
}

/**
 * `{"event":"result","result":{"status":"SUCCESS",...}}`. Any status other than
 * SUCCESS — including one never observed, or none at all — is an error. Failing
 * closed is the point: a parser that reads an unknown status as success hides
 * every failure in an overnight run.
 */
function parseAgyResult(obj) {
  if (!obj || obj.event !== "result") return null;
  const r = obj.result && typeof obj.result === "object" ? obj.result : {};
  const ok = r.status === "SUCCESS";
  return {
    subtype: ok ? "success" : `error_${String(r.status ?? "unknown").toLowerCase()}`,
    isError: !ok,
    numTurns: typeof r.num_turns === "number" ? r.num_turns : null,
    costUsd: null,
    sessionId: typeof r.conversation_id === "string" && r.conversation_id ? r.conversation_id : null,
  };
}

/**
 * Tool names as they start, and the final response at the end. Text deltas are
 * skipped: agy streams fragments, and one fragment per log line reads as noise.
 */
function renderAgyLine(obj) {
  if (!obj || typeof obj !== "object") return null;
  const s = obj.step_update;
  if (obj.event === "step_update" && s && s.step_type === "tool" && s.state === "ACTIVE") {
    return `  → ${s.tool_name || "tool"}`;
  }
  if (obj.event === "result") {
    const r = obj.result || {};
    const text = typeof r.response === "string" && r.response.trim() ? r.response.trim() + "\n" : "";
    const err = typeof r.error === "string" && r.error ? `error: ${r.error.split("\n")[0]}\n` : "";
    return `${text}${err}--- result: status=${r.status} turns=${r.num_turns ?? "?"} ---`;
  }
  return null;
}

// ── the table ────────────────────────────────────────────────────────────────

const ENGINES = {
  claude: {
    name: "claude",
    binary: "claude",
    supports: {
      maxTurns: true,
      cost: true,
      pinnedSession: true,
      settingsFile: true,
      effort: true,
      skipPermissions: false,
    },
    buildArgs: buildClaudeArgs,
    parseResult: parseClaudeResult,
    renderLine: renderClaudeLine,
    transcriptPath: claudeTranscriptPath,
  },
  agy: {
    name: "agy",
    binary: "agy",
    supports: {
      maxTurns: false,
      cost: false,
      pinnedSession: false,
      settingsFile: false,
      effort: true,
      skipPermissions: true,
    },
    buildArgs: buildAgyArgs,
    parseResult: parseAgyResult,
    renderLine: renderAgyLine,
    transcriptPath: () => null,
  },
};

/** The supervisor flag each `supports` key gates, for the refusal message. */
const GATED_FLAGS = [
  ["maxTurns", "--max-turns", (o) => o.maxTurns != null],
  ["cost", "--max-cost", (o) => o.maxCost != null],
  ["effort", "--effort", (o) => o.effort != null],
  ["skipPermissions", "--dangerously-skip-permissions", (o) => o.skipPermissions === true],
];

/**
 * Resolve an engine by name, or throw listing the known ones.
 * @param {string} name
 */
function resolveEngine(name) {
  if (!Object.prototype.hasOwnProperty.call(ENGINES, name)) {
    throw new Error(
      `unknown engine ${JSON.stringify(name)} (known: ${Object.keys(ENGINES).join(", ")})`,
    );
  }
  return ENGINES[name];
}

/**
 * Throw when `opts` asks for something the engine cannot honour. Called before
 * any binary is resolved or spawned, so a refused run spawns nothing.
 * @param {object} engine an ENGINES entry
 * @param {object} opts parsed options
 */
function assertSupported(engine, opts) {
  for (const [key, flag, requested] of GATED_FLAGS) {
    if (requested(opts) && !engine.supports[key]) {
      throw new Error(`${flag} is not supported by the ${engine.name} engine`);
    }
  }
}

module.exports = {
  ENGINES,
  resolveEngine,
  assertSupported,
  buildClaudeArgs,
  renderClaudeLine,
  claudeTranscriptPath,
};
