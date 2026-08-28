#!/usr/bin/env node
/**
 * run-loop.mjs — fresh-context sequential loop runner.
 *
 * Spawns ONE `claude -p` per iteration, with a pinned `--session-id`, and
 * classifies each outcome from filesystem post-conditions. The point is the
 * process boundary: `/loop /develop-next` re-invokes the SAME conversation
 * every iteration, so item five is worked through a context mostly consumed by
 * items one to four, and the degradation is invisible from outside. A skill
 * cannot clear its own context — the loop has to move outside the session.
 *
 * This is a HOST process, not something Claude invokes. It is launched from a
 * terminal and spawns Claude; never the reverse.
 *
 * Safe against these pipelines specifically because they are already crash-safe:
 * `/develop-next` persists `develop-next.state.json` and resumes from its flags,
 * `/develop-batch` does the same, and the inner `/develop-*` pipelines carry
 * `develop-pipeline.lock` with a step cursor. A process boundary is the boundary
 * they already tolerate. This adds no new resumption machinery; it uses what the
 * pipelines already persist.
 *
 * Usage:
 *   run-loop.mjs run     [options]      spawn iterations until a stop condition
 *   run-loop.mjs dry-run [options]      probe, print the plan and the exact argv, spawn nothing
 *   run-loop.mjs status  [--json]       one-shot snapshot of the live run; reads only
 *   run-loop.mjs watch                  the same snapshot, repainted every ~2s; reads only
 *
 * `status` and `watch` are PURE READERS. They take no lock, spawn nothing and
 * write nothing, so they are safe from a second terminal, over SSH, twice
 * concurrently, and mid-iteration. They also short-circuit before `claude` is
 * resolved — a view that dies because the binary it never invokes is off PATH
 * is not much of a view.
 *
 * Options:
 *   --adapter <develop-next|develop-batch|generic>   default develop-next
 *   --command <prompt>          the prompt to run (required for `generic`)
 *   --roadmap <path>            passed to the probe
 *   --base <ref>                base branch the progress oracle watches (default develop)
 *   --max-iterations <N>        default unlimited
 *   --max-cost <USD>            cumulative total_cost_usd ceiling
 *   --max-duration <8h|90m|30s> wall-clock ceiling
 *   --max-idle <K>              consecutive no-progress iterations (default 2)
 *   --max-turns <N>             passed to claude; unset by default
 *   --max-resume-attempts <N>   consecutive `incomplete` retries (default 2)
 *   --on-error <stop|continue>  default stop
 *   --cooldown <sec>            between iterations (default 10)
 *   --config <path>             skills-config.yaml (default skills-config.yaml)
 *   --notify                    macOS notification when the loop reaches a terminal stop
 *   --webhook <url>             ntfy-shaped POST on terminal stop (phone push)
 *   --json                      machine-readable summary on stdout
 *
 * Output: JSON on stdout for `dry-run` and for `run --json`, always.
 * Exit codes: 0 = the loop ended on a clean stop condition; 1 = bad usage, or
 * the loop ended on `halt` / `error`.
 *
 * No dependencies. Node >= 22. Pure functions are exported for unit tests
 * (evals/loop-supervisor/unit/); the CLI runs only when invoked directly.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { classify, shouldStop } from "../references/classify.js";
import { interpretProbe, resolveAdapter } from "../references/adapters.js";
import { parseYamlSubset } from "../references/yaml-subset.js";
import {
  renderLines,
  statusView,
  notificationText,
  UNREADABLE,
} from "../references/render.js";

const SCHEMA_VERSION = 1;
const STATE_ROOT = ".claude/state/loop-supervisor";
const PID_LOCK = ".claude/state/loop-supervisor.lock";
const DEFAULTS = {
  adapter: "develop-next",
  base: "develop",
  maxIdle: 2,
  maxResumeAttempts: 2,
  onError: "stop",
  cooldown: 10,
  config: "skills-config.yaml",
  heartbeatMs: 5000,
  // Repaint faster than the heartbeat is written, so `watch` never shows a
  // frame the operator reads as frozen.
  watchIntervalMs: 2000,
};

// ── binary resolution ────────────────────────────────────────────────────────

/**
 * Resolve a command to an absolute path.
 *
 * GOTCHA 4, and it is not defensive boilerplate: `node` is not reliably on
 * `PATH` in a non-interactive shell. On the machine this was written on,
 * `command -v node` returns the bare word `node` (it is an nvm shell function,
 * not a binary) and `node --version` prints nvm's entire help text to stdout
 * before the version. A supervisor that inherited that would spawn something
 * that prints usage text and exits — for every iteration, all night.
 *
 * `process.execPath` is the running interpreter, so it is always right for
 * node. For anything else, ask the shell and require an absolute answer.
 */
export function resolveBinary(name, { execPath = process.execPath } = {}) {
  if (name === "node") return execPath;
  try {
    const out = execFileSync("command", ["-v", name], {
      encoding: "utf8",
      shell: "/bin/bash",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (out.startsWith("/")) return out;
  } catch {
    /* fall through */
  }
  for (const dir of [
    path.join(os.homedir(), ".local", "bin"),
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
  ]) {
    const p = path.join(dir, name);
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {
      /* keep looking */
    }
  }
  throw new Error(
    `could not resolve ${name} to an absolute path. PATH lookup returned ` +
      `nothing absolute — if this is an nvm/asdf shim, run the supervisor from ` +
      `a login shell or pass the absolute path.`,
  );
}

// ── argv ─────────────────────────────────────────────────────────────────────

/** Parse a duration like `8h`, `90m`, `30s`, or a bare number of seconds. */
export function parseDuration(v) {
  if (v == null) return null;
  const m = String(v)
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*([smhd]?)$/i);
  if (!m)
    throw new Error(`bad duration ${JSON.stringify(v)} (use 30s, 90m, 8h)`);
  const n = Number(m[1]);
  const mult = { "": 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2].toLowerCase()];
  return n * mult * 1000;
}

export function parseArgs(argv) {
  const out = {
    subcommand: "run",
    adapter: DEFAULTS.adapter,
    command: null,
    roadmap: null,
    base: DEFAULTS.base,
    maxIterations: null,
    maxCost: null,
    maxDurationMs: null,
    maxIdle: DEFAULTS.maxIdle,
    maxTurns: null,
    maxResumeAttempts: DEFAULTS.maxResumeAttempts,
    onError: DEFAULTS.onError,
    cooldown: DEFAULTS.cooldown,
    config: DEFAULTS.config,
    notify: false,
    webhook: null,
    json: false,
    // Which options the caller actually named. Presence must be TRACKED, never
    // inferred by comparing the parsed value against DEFAULTS: `--base develop`
    // parses to exactly DEFAULTS.base, so a sentinel comparison cannot tell an
    // explicit flag from an absent one. That mattered — `--base` is the ref the
    // progress oracle watches, and a config silently winning over it points the
    // oracle at the wrong branch, which makes every healthy iteration classify
    // `idle` and ends the loop at --max-idle reporting no progress.
    explicit: new Set(),
  };
  const rest = [...argv];
  if (rest.length && !rest[0].startsWith("-")) out.subcommand = rest.shift();
  if (!["run", "dry-run", "status", "watch"].includes(out.subcommand)) {
    throw new Error(
      `unknown subcommand ${JSON.stringify(out.subcommand)} (expected run | dry-run | status | watch)`,
    );
  }
  const need = (i, flag) => {
    if (i + 1 >= rest.length) throw new Error(`${flag} needs a value`);
    return rest[i + 1];
  };
  // Long-flag name -> the option key it sets, so the switch below can record
  // presence in one place rather than at 14 call sites.
  const KEY_OF = {
    "--adapter": "adapter",
    "--command": "command",
    "--roadmap": "roadmap",
    "--base": "base",
    "--max-iterations": "maxIterations",
    "--max-cost": "maxCost",
    "--max-duration": "maxDurationMs",
    "--max-idle": "maxIdle",
    "--max-turns": "maxTurns",
    "--max-resume-attempts": "maxResumeAttempts",
    "--on-error": "onError",
    "--cooldown": "cooldown",
    "--config": "config",
    "--notify": "notify",
    "--webhook": "webhook",
    "--json": "json",
  };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (KEY_OF[a]) out.explicit.add(KEY_OF[a]);
    switch (a) {
      case "--adapter":
        out.adapter = need(i, a);
        i++;
        break;
      case "--command":
        out.command = need(i, a);
        i++;
        break;
      case "--roadmap":
        out.roadmap = need(i, a);
        i++;
        break;
      case "--base":
        out.base = need(i, a);
        i++;
        break;
      case "--max-iterations":
        out.maxIterations = Number(need(i, a));
        i++;
        break;
      case "--max-cost":
        out.maxCost = Number(need(i, a));
        i++;
        break;
      case "--max-duration":
        out.maxDurationMs = parseDuration(need(i, a));
        i++;
        break;
      case "--max-idle":
        out.maxIdle = Number(need(i, a));
        i++;
        break;
      case "--max-turns":
        out.maxTurns = Number(need(i, a));
        i++;
        break;
      case "--max-resume-attempts":
        out.maxResumeAttempts = Number(need(i, a));
        i++;
        break;
      case "--on-error":
        out.onError = need(i, a);
        i++;
        break;
      case "--cooldown":
        out.cooldown = Number(need(i, a));
        i++;
        break;
      case "--config":
        out.config = need(i, a);
        i++;
        break;
      case "--notify":
        out.notify = true;
        break;
      case "--webhook":
        out.webhook = need(i, a);
        i++;
        break;
      case "--json":
        out.json = true;
        break;
      default:
        throw new Error(`unknown option ${JSON.stringify(a)}`);
    }
  }
  if (!["stop", "continue"].includes(out.onError)) {
    throw new Error(
      `--on-error must be stop or continue, got ${JSON.stringify(out.onError)}`,
    );
  }
  if (out.adapter === "generic" && !out.command && out.subcommand === "run") {
    throw new Error("--command is required for the generic adapter");
  }
  return out;
}

/**
 * Fill unset options from a parsed `skills-config.yaml`.
 *
 * Precedence, as documented in README.md and docs/reference/configuration.md:
 * **an explicitly-supplied CLI flag always wins over config.** `opts.explicit`
 * is the authority on what "supplied" means; a value equal to the default is
 * still supplied. When `explicit` is absent (an object not built by parseArgs)
 * every key is treated as unset, which keeps this safe for callers that only
 * want config defaults.
 *
 * @param {object} opts parsed options (mutated in place, and returned)
 * @param {object} [config] parsed skills-config.yaml
 * @returns {object} opts
 */
export function applyConfig(opts, config) {
  const ls = (config && config.loopSupervisor) || {};
  const explicit = opts.explicit || new Set();
  if (ls.baseBranch && !explicit.has("base")) opts.base = ls.baseBranch;
  if (ls.roadmapPath && !explicit.has("roadmap")) opts.roadmap = ls.roadmapPath;
  if (ls.cooldownSeconds != null && !explicit.has("cooldown")) {
    opts.cooldown = Number(ls.cooldownSeconds);
  }
  return opts;
}

// ── the claude argv ──────────────────────────────────────────────────────────

/**
 * Build the exact argv for one iteration.
 *
 * Exported and printed by `dry-run` on purpose: CLI flags move between `claude`
 * versions, and a plan that prints its own argv makes that drift visible on the
 * first run rather than on the first silent failure.
 *
 * Verified against claude 2.1.250: `--output-format stream-json` REQUIRES
 * `--verbose`; `--session-id` pins the transcript path so every iteration stays
 * reopenable with `claude --resume <uuid>` afterwards.
 */
export function buildClaudeArgs({
  prompt,
  sessionId,
  settingsPath,
  maxTurns = null,
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
  if (maxTurns != null && Number.isFinite(maxTurns)) {
    args.push("--max-turns", String(maxTurns));
  }
  return args;
}

/** The prompt one iteration runs, for a given adapter + options. */
export function buildPrompt(adapter, opts) {
  if (adapter.name === "generic") return opts.command;
  return opts.command || adapter.command;
}

// ── budget ───────────────────────────────────────────────────────────────────

/**
 * Which budget ceiling, if any, has been reached?
 *
 * Pure, and checked BEFORE each spawn rather than after: a `--max-cost` that
 * only stops once it has been exceeded is not a ceiling.
 */
export function budgetExceeded(totals, opts, nowMs) {
  if (opts.maxIterations != null && totals.iterations >= opts.maxIterations) {
    return `--max-iterations ${opts.maxIterations} reached`;
  }
  if (opts.maxCost != null && totals.costUsd >= opts.maxCost) {
    return `--max-cost ${opts.maxCost} reached (spent ${totals.costUsd.toFixed(4)})`;
  }
  if (
    opts.maxDurationMs != null &&
    nowMs - totals.startedAtMs >= opts.maxDurationMs
  ) {
    return `--max-duration reached`;
  }
  if (opts.maxIdle != null && totals.consecutiveIdle >= opts.maxIdle) {
    return `--max-idle ${opts.maxIdle} consecutive no-progress iterations`;
  }
  return null;
}

// ── small fs helpers ─────────────────────────────────────────────────────────

const exists = (p) => {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
};
const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};
const gitOut = (cwd, args) => {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
};

/** Render one stream-json line into the human-readable log, or null to skip. */
export function renderStreamLine(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (
    obj.type === "assistant" &&
    obj.message &&
    Array.isArray(obj.message.content)
  ) {
    const parts = [];
    for (const c of obj.message.content) {
      if (c.type === "text" && c.text && c.text.trim())
        parts.push(c.text.trim());
      // Tool-call NAMES only — never inputs. A tool input can be a whole file,
      // and this log exists to be read by a human at 3am, not to be complete.
      else if (c.type === "tool_use") parts.push(`  → ${c.name}`);
    }
    return parts.length ? parts.join("\n") : null;
  }
  if (obj.type === "result") {
    return `--- result: subtype=${obj.subtype} turns=${obj.num_turns} cost=$${
      typeof obj.total_cost_usd === "number"
        ? obj.total_cost_usd.toFixed(4)
        : "?"
    } ---`;
  }
  return null;
}

// ── the read side: status, watch, notify ─────────────────────────────────────

// Re-exported so the CLI's surface is unchanged for tests and consumers; the
// sentinel itself is owned by render.js, beside the state machine that reads it.
export { UNREADABLE };

/**
 * Read `current.json`. Returns the parsed object, `null` when the file is
 * absent, or `UNREADABLE` when it exists but cannot be parsed.
 *
 * One `readFileSync` decides between absent and unreadable, rather than an
 * `exists()` probe followed by a read: the file can be deleted between the two
 * (the runner removes it on clean exit), and that race would report a normal
 * shutdown as a corrupt heartbeat.
 */
export function readCurrent(cwd) {
  let raw;
  try {
    raw = fs.readFileSync(path.join(cwd, STATE_ROOT, "current.json"), "utf8");
  } catch (e) {
    // ENOENT is the normal post-run state. Anything else — a permission error,
    // a directory in its place — is a file we cannot read, not an absent one.
    return e.code === "ENOENT" ? null : UNREADABLE;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return UNREADABLE;
  }
}

/**
 * Read `runs.jsonl` into an array, skipping any line that will not parse.
 *
 * Tolerating a bad line matters more here than it looks: the ledger is appended
 * to by a live process, so a reader can catch a torn final write. Dropping that
 * line shows every complete iteration; throwing shows none.
 */
export function readLedger(cwd) {
  let raw;
  try {
    raw = fs.readFileSync(path.join(cwd, STATE_ROOT, "runs.jsonl"), "utf8");
  } catch {
    return [];
  }
  const rows = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      /* torn or truncated line — skip it, show the rest */
    }
  }
  return rows;
}

/** The display model for the current working tree. Reads two files, nothing else. */
function snapshot(cwd) {
  return statusView({
    current: readCurrent(cwd),
    runs: readLedger(cwd),
    nowMs: Date.now(),
    isAlive: isPidAlive,
  });
}

/**
 * `status` — print once, exit 0. "No run in flight" is a normal answer, not an error.
 *
 * Both modes render from ONE snapshot. Reading the files twice would let `--json`
 * and the text frame disagree about an iteration that finished between them.
 */
function runStatus(cwd, opts) {
  const view = snapshot(cwd);
  process.stdout.write(
    (opts.json ? JSON.stringify(view, null, 2) : renderLines(view).join("\n")) +
      "\n",
  );
  process.exit(0);
}

/**
 * `watch` — repaint the same content in place.
 *
 * Moves the cursor up over the frame it drew and erases forward from there
 * (\x1b[nA + \x1b[0J). It never emits \x1b[2J or \x1b[3J: clearing the screen —
 * and especially the scrollback — would throw away whatever the operator had
 * scrolled up to read, which is the one thing a passive view must not do.
 */
function runWatch(cwd) {
  let painted = 0;
  const hideCursor = () => process.stdout.write("\x1b[?25l");
  const showCursor = () => process.stdout.write("\x1b[?25h");

  const paint = () => {
    const lines = renderLines(snapshot(cwd));
    let frame = "";
    if (painted) frame += `\x1b[${painted}A\x1b[0J`;
    frame += lines.join("\n") + "\n";
    process.stdout.write(frame);
    painted = lines.length;
  };

  const stop = () => {
    clearInterval(timer);
    showCursor();
    process.stdout.write("\n");
    process.exit(0);
  };

  hideCursor();
  paint();
  const timer = setInterval(paint, DEFAULTS.watchIntervalMs);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // Leave the terminal usable however we leave: a hidden cursor outlives the
  // process that hid it.
  process.on("exit", showCursor);
}

/**
 * Fire the terminal-stop notification. Best effort, always.
 *
 * WARN AND CONTINUE is the whole contract: the run's outcome is what it is
 * regardless of whether anyone was told, so a broken webhook or a missing
 * osascript must never change the exit status. Both transports are wrapped
 * individually so one failing does not skip the other.
 */
export function notifyTerminalStop(opts, summary, deps = {}) {
  const {
    platform = process.platform,
    run = (bin, args) => spawnSync(bin, args, { stdio: "ignore" }),
    post = null,
    warn = (m) => process.stderr.write(m + "\n"),
  } = deps;
  const { title, message } = notificationText(summary);
  const fired = [];

  if (opts.notify) {
    if (platform !== "darwin") {
      warn("⚠ --notify is macOS-only (osascript); skipped on " + platform);
    } else {
      try {
        const script = `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`;
        const r = run("osascript", ["-e", script]);
        if (r && r.status !== 0)
          throw new Error(`osascript exited ${r.status}`);
        fired.push("osascript");
      } catch (e) {
        warn(
          `⚠ notification failed (osascript): ${e.message} — run unaffected`,
        );
      }
    }
  }

  if (opts.webhook) {
    const send =
      post ||
      ((url, body, headers) =>
        fetch(url, { method: "POST", body, headers }).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }));
    try {
      // ntfy-shaped: the body IS the message; title and priority are headers.
      const pending = send(opts.webhook, message, {
        Title: title,
        Priority: summary.ok ? "default" : "high",
        Tags: summary.ok ? "white_check_mark" : "rotating_light",
      });
      if (pending && typeof pending.catch === "function") {
        pending.catch((e) =>
          warn(
            `⚠ notification failed (webhook): ${e.message} — run unaffected`,
          ),
        );
      }
      fired.push("webhook");
    } catch (e) {
      warn(`⚠ notification failed (webhook): ${e.message} — run unaffected`);
    }
  }

  return fired;
}

// ── PID lock (single-flight per working tree) ────────────────────────────────

export function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}

function acquirePidLock(cwd) {
  const p = path.join(cwd, PID_LOCK);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const held = readJson(p);
  if (held && held.pid && isPidAlive(held.pid) && held.pid !== process.pid) {
    throw new Error(
      `another loop-supervisor is running in this tree (pid ${held.pid}, started ${held.startedAt}). ` +
        `Two supervisors in one working tree collide on develop-pipeline.lock. ` +
        `Stop it, or remove ${PID_LOCK} if it is stale.`,
    );
  }
  fs.writeFileSync(
    p,
    JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        pid: process.pid,
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  return p;
}

// ── the loop ─────────────────────────────────────────────────────────────────

function runProbe(adapter, opts, cwd, nodeBin) {
  const args = adapter.probeArgs(
    opts.roadmap ? { roadmapPath: opts.roadmap } : {},
  );
  if (!args) return { status: "selected", reason: "no probe for this adapter" };
  const res = spawnSyncCapture(nodeBin, args, cwd, 30000);
  return interpretProbe(res);
}

function spawnSyncCapture(bin, args, cwd, timeoutMs) {
  const r = spawnSync(bin, args, { cwd, encoding: "utf8", timeout: timeoutMs });
  return {
    code: r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    timedOut: r.error && r.error.code === "ETIMEDOUT",
    spawnError: r.error && r.error.code !== "ETIMEDOUT" ? r.error : null,
  };
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stdout.write(
      JSON.stringify({ ok: false, error: e.message }, null, 2) + "\n",
    );
    process.exit(1);
  }

  const cwd = process.cwd();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const settingsPath = path.join(
    here,
    "..",
    "assets",
    "supervisor-settings.json",
  );

  let config = {};
  if (exists(path.join(cwd, opts.config))) {
    try {
      config = parseYamlSubset(
        fs.readFileSync(path.join(cwd, opts.config), "utf8"),
      );
    } catch {
      config = {};
    }
  }
  // Config fills in only what the caller did NOT name. An explicitly-supplied
  // flag always wins, including when its value happens to equal the default —
  // which is exactly what a DEFAULTS comparison could not express.
  applyConfig(opts, config);

  // ── status / watch: pure readers, and they stop here ──────────────────────
  // Deliberately ahead of resolveAdapter and resolveBinary("claude"). Neither
  // view spawns anything, and failing to read a heartbeat because `claude` is
  // off PATH in the second terminal would defeat the point of having a view.
  if (opts.subcommand === "status") return runStatus(cwd, opts);
  if (opts.subcommand === "watch") return runWatch(cwd);

  let adapter, nodeBin, claudeBin;
  try {
    adapter = resolveAdapter(opts.adapter, config);
    nodeBin = resolveBinary("node");
    claudeBin = resolveBinary("claude");
  } catch (e) {
    process.stdout.write(
      JSON.stringify({ ok: false, error: e.message }, null, 2) + "\n",
    );
    process.exit(1);
  }

  const prompt = buildPrompt(adapter, opts);
  const sampleSession = randomUUID();
  const sampleArgs = buildClaudeArgs({
    prompt,
    sessionId: sampleSession,
    settingsPath,
    maxTurns: opts.maxTurns,
  });

  // ── dry-run: probe, print the plan and the exact argv, spawn nothing ───────
  if (opts.subcommand === "dry-run") {
    const probe = runProbe(adapter, opts, cwd, nodeBin);
    const resumePending =
      adapter.stateFile && exists(path.join(cwd, adapter.stateFile));
    process.stdout.write(
      JSON.stringify(
        {
          ok: probe.status !== "error",
          subcommand: "dry-run",
          adapter: adapter.name,
          prompt,
          resolved: {
            node: nodeBin,
            claude: claudeBin,
            settings: settingsPath,
          },
          probe,
          resumePending: Boolean(resumePending),
          wouldSpawn: Boolean(resumePending) || probe.status === "selected",
          argv: [claudeBin, ...sampleArgs],
          note:
            "session-id shown is a sample; each iteration gets a fresh uuid. " +
            "Nothing was spawned.",
          budget: {
            maxIterations: opts.maxIterations,
            maxCost: opts.maxCost,
            maxDurationMs: opts.maxDurationMs,
            maxIdle: opts.maxIdle,
            onError: opts.onError,
          },
        },
        null,
        2,
      ) + "\n",
    );
    process.exit(probe.status === "error" ? 1 : 0);
  }

  // ── run ───────────────────────────────────────────────────────────────────
  let lockPath;
  try {
    lockPath = acquirePidLock(cwd);
  } catch (e) {
    process.stdout.write(
      JSON.stringify({ ok: false, error: e.message }, null, 2) + "\n",
    );
    process.exit(1);
  }

  const runId =
    new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const runDir = path.join(cwd, STATE_ROOT, "logs", runId);
  fs.mkdirSync(runDir, { recursive: true });
  const latest = path.join(cwd, STATE_ROOT, "logs", "latest");
  try {
    fs.rmSync(latest, { force: true });
    fs.symlinkSync(runId, latest);
  } catch {
    /* symlinks optional */
  }

  const currentPath = path.join(cwd, STATE_ROOT, "current.json");
  const ledgerPath = path.join(cwd, STATE_ROOT, "runs.jsonl");
  const totals = {
    iterations: 0,
    costUsd: 0,
    turns: 0,
    consecutiveIdle: 0,
    startedAtMs: Date.now(),
  };
  let resumeAttempts = 0;
  let stopping = false;
  let activeChild = null;

  // First SIGINT: finish the current iteration, then stop. Never mid-merge —
  // an iteration killed between `gh pr merge` and the roadmap tick leaves the
  // repo in exactly the state the tick was meant to record.
  // Second SIGINT: kill the child and exit, leaving state for the next resume.
  process.on("SIGINT", () => {
    if (!stopping) {
      stopping = true;
      process.stderr.write(
        "\n⚠ SIGINT — finishing the current iteration, then stopping. Ctrl-C again to kill it.\n",
      );
    } else {
      process.stderr.write("\n⚠ SIGINT again — killing the child.\n");
      if (activeChild)
        try {
          activeChild.kill("SIGTERM");
        } catch {
          /* gone */
        }
      cleanup();
      process.exit(130);
    }
  });

  function cleanup() {
    try {
      fs.rmSync(currentPath, { force: true });
      fs.rmSync(currentPath + ".tmp", { force: true });
    } catch {
      /* best effort */
    }
    try {
      fs.rmSync(lockPath, { force: true });
    } catch {
      /* best effort */
    }
  }

  function writeCurrent(patch) {
    const lock = readJson(path.join(cwd, adapter.lockFile));
    // Write-then-rename, not write-in-place. `rename` within a filesystem is
    // atomic, so a reader sees either the previous heartbeat or the new one and
    // never a half-written file. The reader handles the torn case anyway
    // (UNREADABLE), but a view should not depend on the writer being sloppy in
    // order to be honest.
    const tmpPath = currentPath + ".tmp";
    fs.writeFileSync(
      tmpPath,
      JSON.stringify(
        {
          schemaVersion: SCHEMA_VERSION,
          runId,
          pid: process.pid,
          adapter: adapter.name,
          pipelineStep: lock ? lock.current_step : null,
          branch: lock ? lock.branch : null,
          prUrl: lock ? lock.pr_url || null : null,
          totals: {
            iterations: totals.iterations,
            costUsd: totals.costUsd,
            turns: totals.turns,
          },
          updatedAt: new Date().toISOString(),
          ...patch,
        },
        null,
        2,
      ),
    );
    fs.renameSync(tmpPath, currentPath);
  }

  (async () => {
    let finalStop = { outcome: "done", reason: "no iterations ran" };

    for (;;) {
      const capped = budgetExceeded(totals, opts, Date.now());
      if (capped) {
        finalStop = { outcome: "done", reason: capped };
        break;
      }
      if (stopping) {
        finalStop = { outcome: "done", reason: "interrupted by SIGINT" };
        break;
      }

      const iteration = totals.iterations + 1;
      const iterationStartMs = Date.now();
      const sessionId = randomUUID();
      const nnn = String(iteration).padStart(3, "0");
      const rawPath = path.join(runDir, `iter-${nnn}.jsonl`);
      const txtPath = path.join(runDir, `iter-${nnn}.txt`);

      // Skip the probe entirely when a run-state file exists: an unfinished run
      // must be RESUMED, not re-selected. Probing here would either re-pick the
      // same item or, worse, pick a different one on top of a half-finished run.
      const statePath = adapter.stateFile
        ? path.join(cwd, adapter.stateFile)
        : null;
      const resumePending = Boolean(statePath && exists(statePath));

      let probe = { status: "selected", reason: "resuming an unfinished run" };
      if (!resumePending) {
        probe = runProbe(adapter, opts, cwd, nodeBin);
        if (probe.status !== "selected") {
          const c = classify({
            spawned: false,
            probeStatus: probe.status,
            probeReason: probe.reason,
          });
          appendLedger(ledgerPath, {
            runId,
            iteration,
            sessionId,
            ...c,
            probe,
            spawned: false,
            at: new Date().toISOString(),
          });
          finalStop = c;
          break;
        }
      }

      const oracleRef = adapter.oracleRef({ baseBranch: opts.base });
      const beforeSha = gitOut(cwd, ["rev-parse", oracleRef]);

      writeCurrent({
        iteration,
        phase: "spawning",
        itemId: probe.itemId || null,
        sessionId,
        logPath: path.relative(cwd, txtPath),
      });

      const args = buildClaudeArgs({
        prompt,
        sessionId,
        settingsPath,
        maxTurns: opts.maxTurns,
      });
      const result = await new Promise((resolve) => {
        const raw = fs.createWriteStream(rawPath, { flags: "a" });
        const txt = fs.createWriteStream(txtPath, { flags: "a" });
        const child = spawn(claudeBin, args, {
          cwd,
          stdio: ["ignore", "pipe", "pipe"],
        });
        activeChild = child;
        let buf = "";
        let envelope = null;
        child.stdout.on("data", (chunk) => {
          raw.write(chunk);
          buf += chunk.toString("utf8");
          let nl;
          while ((nl = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (!line.trim()) continue;
            let obj;
            try {
              obj = JSON.parse(line);
            } catch {
              continue;
            }
            if (obj.type === "result") envelope = obj;
            const r = renderStreamLine(obj);
            if (r) txt.write(r + "\n");
          }
        });
        child.stderr.on("data", (c) => raw.write(c));
        const hb = setInterval(
          () =>
            writeCurrent({
              iteration,
              phase: "running",
              itemId: probe.itemId || null,
              sessionId,
              logPath: path.relative(cwd, txtPath),
            }),
          DEFAULTS.heartbeatMs,
        );
        const done = (code, err) => {
          clearInterval(hb);
          raw.end();
          txt.end();
          activeChild = null;
          resolve({ code, envelope, spawnError: err || null });
        };
        child.on("error", (e) => done(null, e));
        child.on("close", (code) => done(code));
      });

      const env = result.envelope || {};
      totals.iterations = iteration;
      if (typeof env.total_cost_usd === "number")
        totals.costUsd += env.total_cost_usd;
      if (typeof env.num_turns === "number") totals.turns += env.num_turns;

      const outcome = classify({
        probeStatus: probe.status,
        probeReason: probe.reason,
        spawned: true,
        stateFilePresent: Boolean(statePath && exists(statePath)),
        lockPresent: exists(path.join(cwd, adapter.lockFile)),
        lockCurrentStep:
          (readJson(path.join(cwd, adapter.lockFile)) || {}).current_step ??
          null,
        halt: readJson(path.join(cwd, adapter.haltFile)),
        iterationStartMs,
        exitCode: result.spawnError ? null : result.code,
        subtype: env.subtype || null,
        isError: env.is_error === true || Boolean(result.spawnError),
        progressed: adapter.progressOracle({
          cwd,
          baseRef: oracleRef,
          beforeSha,
        }),
      });

      totals.consecutiveIdle =
        outcome.outcome === "idle" ? totals.consecutiveIdle + 1 : 0;
      resumeAttempts =
        outcome.outcome === "incomplete" ? resumeAttempts + 1 : 0;

      appendLedger(ledgerPath, {
        runId,
        iteration,
        at: new Date().toISOString(),
        outcome: outcome.outcome,
        reason: outcome.reason,
        itemId: probe.itemId || null,
        spawned: true,
        exitCode: result.code,
        subtype: env.subtype || null,
        durationMs: Date.now() - iterationStartMs,
        costUsd:
          typeof env.total_cost_usd === "number" ? env.total_cost_usd : null,
        turns: typeof env.num_turns === "number" ? env.num_turns : null,
        sessionId,
        logPath: path.relative(cwd, txtPath),
        rawPath: path.relative(cwd, rawPath),
        transcriptPath: transcriptPathFor(cwd, sessionId),
      });

      const decision = shouldStop(outcome.outcome, {
        onError: opts.onError,
        resumeAttempts,
        maxResumeAttempts: opts.maxResumeAttempts,
      });
      if (decision.stop) {
        finalStop = {
          outcome: outcome.outcome,
          reason: decision.reason || outcome.reason,
        };
        break;
      }
      if (stopping) {
        finalStop = {
          outcome: outcome.outcome,
          reason: "interrupted by SIGINT",
        };
        break;
      }
      if (opts.cooldown > 0)
        await new Promise((r) => setTimeout(r, opts.cooldown * 1000));
    }

    cleanup();
    const terminal =
      finalStop.outcome === "halt" || finalStop.outcome === "error";

    // Terminal stop — halt, error, budget cap or clean completion. Fired ONCE
    // per run, here and nowhere else: a per-iteration notifier is ignored
    // within one night, which makes it worse than none. The double-SIGINT path
    // exits from inside the signal handler and never reaches this line, which
    // is deliberate — that operator is at the keyboard already.
    if (opts.notify || opts.webhook) {
      notifyTerminalStop(opts, {
        ok: !terminal,
        outcome: finalStop.outcome,
        reason: finalStop.reason,
        iterations: totals.iterations,
        costUsd: totals.costUsd,
      });
    }

    process.stdout.write(
      JSON.stringify(
        {
          ok: !terminal,
          runId,
          adapter: adapter.name,
          iterations: totals.iterations,
          costUsd: Number(totals.costUsd.toFixed(4)),
          turns: totals.turns,
          stoppedBecause: finalStop,
          logs: path.relative(cwd, runDir),
          ledger: path.relative(cwd, ledgerPath),
        },
        null,
        2,
      ) + "\n",
    );
    process.exit(terminal ? 1 : 0);
  })();
}

/** Where `claude --resume <sessionId>` will find this iteration's transcript. */
export function transcriptPathFor(cwd, sessionId, home = os.homedir()) {
  const slug = cwd.replace(/[/.]/g, "-");
  return path.join(home, ".claude", "projects", slug, `${sessionId}.jsonl`);
}

function appendLedger(p, row) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(
    p,
    JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...row }) + "\n",
  );
}

// Resolve BOTH sides through realpath: consumer projects symlink
// `.claude/skills` -> `.agents/skills`, so argv[1] arrives symlinked while
// import.meta.url is already real. Comparing them raw makes this guard false
// and main() never runs: exit 0, no output — the exact failure this supervisor's
// own probe treats as an error when it sees it in select-next.mjs.
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}
if (isInvokedDirectly()) main();
