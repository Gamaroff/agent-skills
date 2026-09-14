#!/usr/bin/env node
/**
 * handoff-verify.mjs — re-measure a session handoff before trusting it.
 *
 * The handoff (`.agents/handoff.md` by default) records project state as
 * figures, and every figure carries the command that produced it. This script
 * re-runs those commands and reports, per figure, whether the recorded value
 * still holds. It NEVER writes the handoff — read mode is a measurement, and a
 * measurement that edits its subject is not one.
 *
 * Where a figure's command lives (parse rule, decided at task.110 review):
 *
 *   - Header table `| Check | Command | Result |`: the FIRST backticked span in
 *     the Command cell is the command. A cell with no backticked span (prose
 *     such as "inspect docs/…") is `unverifiable: no command` — never executed.
 *     The figures are the **bold** spans in the Result cell; a Result cell with
 *     no bold span is compared as a whole.
 *   - Prose lines: a trailing `<!-- cmd: … -->` comment on the same line is
 *     that line's command. The figures are the bold spans on the line, unless
 *     the comment carries `; expect: …`, which overrides them. `expect:` takes
 *     plain text (token-subset match) or `/regex/`.
 *
 * Verdicts, per figure:
 *
 *   confirmed     the command ran and every figure still holds
 *   stale         the command ran and a figure has moved — both values reported
 *   unverifiable  the figure could not be checked here; the `detail` says why:
 *                 no command · not on whitelist · shell operator · timeout ·
 *                 command failed (exit N) · could not run · no figure
 *
 * `unverifiable` is a verdict, not an error. "The figure holds" and "I could
 * not check" are the same tick to a reader shown only a tick, and the
 * reassuring reading is the one that gets taken — so they are never merged.
 *
 * How a figure is compared: an `exit N` figure is compared against the exit
 * code. Any other figure is normalised (emphasis stripped, lower-cased,
 * punctuation removed) and every one of its tokens must appear in the
 * normalised output — a token-subset match, not equality on the full output,
 * because a recorded figure is a human paraphrase of a command's output.
 *
 * Commands run only through a read-only whitelist (see `isAllowed`), applied to
 * the first token after an optional `command ` prefix, and any shell operator
 * (`;`, `&&`, `|`, `>`, `$(`, backtick) is refused outright. The whitelist is
 * fail-closed: anything it does not recognise is `unverifiable`, not run. The
 * runner is injectable (`verify(…, { runner })`) so tests exercise every
 * verdict without executing a real command.
 *
 * Output: a per-line table on stdout, or with `--json` a single object:
 *   { reason, file, counts: {confirmed, stale, unverifiable}, lines: […], exitCode }
 *
 * `reason` / exit code:
 *   ok            every figure confirmed                         exit 0
 *   stale         ≥1 figure stale (information, not failure)    exit 0
 *   unverifiable  nothing stale, ≥1 figure could not be checked exit 0 — unless
 *                 NO figure could be checked at all, which is a claim about the
 *                 instrument rather than the handoff                exit 1
 *   no-figures    the file parsed but carries no verifiable figure exit 1
 *   missing       the handoff file does not exist                 exit 1
 *   usage         bad arguments                                   exit 2
 *
 * Emits with `process.exitCode = n; return` — never `process.exit()`, which
 * tears the process down before a piped stdout drains (traps.md).
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Whitelist
// ---------------------------------------------------------------------------

/**
 * Read-only command shapes. Each entry is [first-token, predicate over the
 * remaining tokens]. Fail-closed: a first token not listed here is refused.
 */
const GIT_READ_ONLY = new Set([
  "log",
  "show",
  "status",
  "rev-parse",
  "branch",
  "tag",
  "describe",
  "ls-files",
  "ls-remote",
  "diff",
  "remote",
  "rev-list",
  "cat-file",
  "blame",
  "shortlog",
]);

const GH_READ_ONLY = new Set(["list", "view", "status", "checks"]);

const NPM_READ_ONLY_SCRIPT =
  /^(test|ci|ci:fast|eval(:[a-z0-9:-]+)?|validate(:[a-z0-9-]+)?|lint(:[a-z0-9-]+)?|format:check|bundle:check|test:[a-z0-9-]+)$/;

export const WHITELIST = Object.freeze({
  git: (rest) => GIT_READ_ONLY.has(rest[0]),
  gh: (rest) => {
    const [group, verb] = rest;
    if (group === "api")
      return !rest.some((a) =>
        /^(-X|--method|-f|-F|--field|--raw-field|--input)$/.test(a),
      );
    return (
      ["pr", "issue", "repo", "run", "release"].includes(group) &&
      GH_READ_ONLY.has(verb)
    );
  },
  node: () => true,
  npx: (rest) =>
    rest.includes("--check") ||
    rest.includes("--list-different") ||
    rest.includes("--dry-run"),
  npm: (rest) => {
    if (rest[0] === "test") return true;
    if (rest[0] === "run") {
      if (!rest[1]) return false;
      if (NPM_READ_ONLY_SCRIPT.test(rest[1])) return true;
      // `npm run bundle -- --check` — a write script made read-only by flag.
      return rest.includes("--check");
    }
    return rest[0] === "ls" || rest[0] === "view";
  },
  python3: () => true,
  shellcheck: () => true,
  grep: () => true,
  ls: () => true,
  wc: () => true,
  cat: () => true,
  head: () => true,
  tail: () => true,
  find: (rest) =>
    !rest.some(
      (a) =>
        a === "-delete" || a === "-exec" || a === "-execdir" || a === "-ok",
    ),
  jq: () => true,
  test: () => true,
  stat: () => true,
  date: () => true,
});

const SHELL_OPERATOR = /(;|&&|\|\||\||>|<|\$\(|`)/;

/** Split on whitespace, honouring simple single/double quotes. */
export function tokenize(cmd) {
  const out = [];
  let cur = "";
  let q = null;
  for (const ch of cmd) {
    if (q) {
      if (ch === q) q = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") q = ch;
    else if (/\s/.test(ch)) {
      if (cur) (out.push(cur), (cur = ""));
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Whitelist decision for one command string.
 * Returns { ok: true, argv } or { ok: false, detail }.
 */
export function isAllowed(cmd, whitelist = WHITELIST) {
  if (typeof cmd !== "string" || !cmd.trim())
    return { ok: false, detail: "no command" };
  if (SHELL_OPERATOR.test(cmd)) return { ok: false, detail: "shell operator" };
  const argv = tokenize(cmd.trim());
  if (argv[0] === "command") argv.shift();
  if (!argv.length) return { ok: false, detail: "no command" };
  const bin = path.basename(argv[0]);
  const rule = whitelist[bin];
  if (!rule || !rule(argv.slice(1)))
    return { ok: false, detail: `not on whitelist: ${bin}` };
  return { ok: true, argv: [bin, ...argv.slice(1)] };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const CMD_COMMENT = /<!--\s*cmd:\s*(.*?)\s*-->\s*$/;

function splitCells(line) {
  const m = line.match(TABLE_ROW);
  if (!m) return null;
  // `\|` is an escaped pipe inside a cell, not a cell boundary.
  return m[1].split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
}

function firstBacktick(s) {
  const m = s.match(/`([^`]+)`/);
  return m ? m[1] : null;
}

function boldSpans(s) {
  const out = [];
  const re = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = re.exec(s))) out.push(m[1].trim());
  return out;
}

/**
 * Parse a handoff document into figures.
 * Each figure: { line, source: 'table'|'comment', check, command, figures: [..], recorded }
 * `figures` may contain strings or { regex: RegExp }.
 */
export function parseHandoff(text) {
  const lines = String(text).split(/\r?\n/);
  const out = [];
  let inFence = false;
  let headerCols = null; // column indexes for Check/Command/Result
  let sawHeaderSeparator = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const cells = splitCells(raw);
    if (cells) {
      const lower = cells.map((c) => c.toLowerCase());
      if (
        lower.includes("command") &&
        lower.includes("result") &&
        !headerCols
      ) {
        headerCols = {
          check: lower.indexOf("check"),
          command: lower.indexOf("command"),
          result: lower.indexOf("result"),
        };
        sawHeaderSeparator = false;
        continue;
      }
      if (
        headerCols &&
        !sawHeaderSeparator &&
        cells.every((c) => /^:?-+:?$/.test(c))
      ) {
        sawHeaderSeparator = true;
        continue;
      }
      if (headerCols && sawHeaderSeparator) {
        const check =
          headerCols.check >= 0 ? cells[headerCols.check] : `row ${i + 1}`;
        const cmdCell = cells[headerCols.command] ?? "";
        const resCell = cells[headerCols.result] ?? "";
        const command = firstBacktick(cmdCell);
        const bold = boldSpans(resCell);
        out.push({
          line: i + 1,
          source: "table",
          check,
          command,
          figures: bold.length ? bold : [stripEmphasis(resCell)],
          recorded: resCell,
        });
        continue;
      }
      continue;
    }
    // A non-table line ends the table.
    if (headerCols && sawHeaderSeparator && raw.trim() !== "") {
      headerCols = null;
      sawHeaderSeparator = false;
    }

    const cm = raw.match(CMD_COMMENT);
    if (cm) {
      const body = cm[1];
      let command = body;
      let expect = null;
      const ex = body.match(/^(.*?);\s*expect:\s*(.*)$/);
      if (ex) {
        command = ex[1].trim();
        expect = ex[2].trim();
      }
      const prose = raw.replace(CMD_COMMENT, "").trim();
      let figures;
      if (expect !== null) {
        const rx = expect.match(/^\/(.+)\/([a-z]*)$/);
        figures = [rx ? { regex: new RegExp(rx[1], rx[2] || "") } : expect];
      } else {
        figures = boldSpans(prose);
      }
      out.push({
        line: i + 1,
        source: "comment",
        check:
          prose
            .replace(/[#*_`]/g, "")
            .trim()
            .slice(0, 100) || `line ${i + 1}`,
        command: command.trim() || null,
        figures,
        recorded: expect !== null ? expect : prose,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export function stripEmphasis(s) {
  return String(s)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

export function normalise(s) {
  return stripEmphasis(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EXIT_FIGURE = /^exit\s+(\d+)$/i;

/**
 * Compare one figure against a run result.
 * Returns { holds: boolean, measured: string }.
 */
export function compareFigure(figure, run) {
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  if (figure && typeof figure === "object" && figure.regex) {
    return { holds: figure.regex.test(output), measured: firstLines(output) };
  }
  const f = normalise(figure);
  const ex = f.match(EXIT_FIGURE);
  if (ex) {
    return {
      holds: Number(ex[1]) === run.status,
      measured: `exit ${run.status}`,
    };
  }
  const hay = normalise(output);
  const tokens = f.split(" ").filter(Boolean);
  if (!tokens.length) return { holds: false, measured: firstLines(output) };
  // Every token must appear as a whole token in the output (not a substring of
  // another token): "b13" must not be satisfied by "b130".
  const hayTokens = new Set(hay.split(" "));
  const holds = tokens.every((t) => hayTokens.has(t));
  return { holds, measured: firstLines(output) };
}

/**
 * A compact "what the command said": for JSON output, the top-level scalar
 * fields (so `select-next` reads `status: selected · item.id: T110`); for
 * anything else, the first two lines. Truncated, never the whole output.
 */
function firstLines(output, max = 160) {
  const text = String(output).trim();
  let s = null;
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(
        text.split(/\r?\n(?=\S)/)[0] === text ? text : text,
      );
      const parts = [];
      for (const [k, v] of Object.entries(obj)) {
        if (v === null || ["string", "number", "boolean"].includes(typeof v))
          parts.push(`${k}: ${v}`);
        else if (v && typeof v === "object" && !Array.isArray(v))
          for (const [k2, v2] of Object.entries(v))
            if (
              v2 === null ||
              ["string", "number", "boolean"].includes(typeof v2)
            )
              parts.push(`${k}.${k2}: ${v2}`);
        if (parts.length >= 6) break;
      }
      if (parts.length) s = parts.slice(0, 6).join(" · ");
    } catch {
      /* not JSON after all — fall through to the line form */
    }
  }
  if (s === null) s = text.split(/\r?\n/).slice(0, 2).join(" ⏎ ");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

/**
 * Default runner: `bash -c 'command <cmd>'` — `command` so that a shell-function
 * `node`/`npm`/`npx` (nvm) cannot inject its help banner into the captured
 * output (traps.md). Returns { status, stdout, stderr, timedOut, error }.
 */
export function defaultRunner(argv, { cwd, timeoutMs }) {
  const cmd = argv.map(shellQuote).join(" ");
  const r = spawnSync("bash", ["-c", `command ${cmd}`], {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: process.env.CI ?? "1" },
  });
  const timedOut = r.error && r.error.code === "ETIMEDOUT";
  return {
    status: r.status,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    timedOut: Boolean(timedOut),
    error: r.error && !timedOut ? String(r.error.message || r.error) : null,
  };
}

function shellQuote(a) {
  return /^[A-Za-z0-9_./:=@%+,-]+$/.test(a)
    ? a
    : `'${a.replace(/'/g, `'\\''`)}'`;
}

/**
 * Verify parsed figures. Pure apart from the injected runner.
 * Returns { reason, counts, lines, exitCode }.
 */
export function verify(figures, opts = {}) {
  const runner = opts.runner ?? defaultRunner;
  const whitelist = opts.whitelist ?? WHITELIST;
  const cwd = opts.cwd ?? process.cwd();
  const timeoutMs = (opts.timeoutSeconds ?? 60) * 1000;

  const lines = [];
  for (const fig of figures) {
    const base = {
      line: fig.line,
      check: fig.check,
      command: fig.command,
      recorded: fig.recorded,
    };
    if (!fig.command) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: "no command",
        measured: null,
      });
      continue;
    }
    if (!fig.figures.length) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: "no figure",
        measured: null,
      });
      continue;
    }
    const allowed = isAllowed(fig.command, whitelist);
    if (!allowed.ok) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: allowed.detail,
        measured: null,
      });
      continue;
    }
    let run;
    try {
      run = runner(allowed.argv, { cwd, timeoutMs });
    } catch (e) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: `could not run: ${e.message || e}`,
        measured: null,
      });
      continue;
    }
    if (run.timedOut) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: `timeout (${timeoutMs / 1000}s)`,
        measured: null,
      });
      continue;
    }
    if (run.error) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: `could not run: ${run.error}`,
        measured: null,
      });
      continue;
    }
    const isExitFigure = fig.figures.some(
      (f) => typeof f === "string" && EXIT_FIGURE.test(normalise(f)),
    );
    if (run.status !== 0 && !isExitFigure) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: `command failed (exit ${run.status})`,
        measured: firstLines(`${run.stdout}\n${run.stderr}`),
      });
      continue;
    }
    const results = fig.figures.map((f) => ({
      figure: f.regex ? String(f.regex) : f,
      ...compareFigure(f, run),
    }));
    const moved = results.filter((r) => !r.holds);
    if (moved.length) {
      lines.push({
        ...base,
        verdict: "stale",
        detail: `moved: ${moved.map((m) => m.figure).join(", ")}`,
        measured: moved[0].measured,
      });
    } else {
      lines.push({
        ...base,
        verdict: "confirmed",
        detail: null,
        measured: results[0].measured,
      });
    }
  }

  const counts = { confirmed: 0, stale: 0, unverifiable: 0 };
  for (const l of lines) counts[l.verdict] += 1;

  let reason;
  let exitCode = 0;
  if (!lines.length) {
    reason = "no-figures";
    exitCode = 1;
  } else if (counts.stale) reason = "stale";
  else if (counts.unverifiable) {
    reason = "unverifiable";
    // Nothing could be checked: that is a claim about the instrument, not the
    // handoff, and it is the one answer nobody questions — so it trips.
    if (!counts.confirmed) exitCode = 1;
  } else reason = "ok";

  return { reason, counts, lines, exitCode };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const opts = {
    file: ".agents/handoff.md",
    json: false,
    timeoutSeconds: 60,
    cwd: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--timeout") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0)
        return { error: `--timeout needs a positive number of seconds` };
      opts.timeoutSeconds = v;
    } else if (a === "--cwd") {
      if (!argv[i + 1]) return { error: `--cwd needs a directory` };
      opts.cwd = argv[++i];
    } else if (a.startsWith("--")) return { error: `unknown flag: ${a}` };
    else opts.file = a;
  }
  return opts;
}

export const USAGE = `usage: handoff-verify.mjs [path] [--json] [--timeout <seconds>] [--cwd <dir>]

Re-measures every figure in a session handoff (default .agents/handoff.md) and
reports each as confirmed / stale / unverifiable. Never writes the handoff.`;

function renderTable(result, file) {
  const rows = result.lines.map((l) => {
    const mark =
      l.verdict === "confirmed" ? "✓" : l.verdict === "stale" ? "✗" : "?";
    const tail =
      l.verdict === "stale"
        ? `${l.detail} → now: ${l.measured}`
        : l.verdict === "unverifiable"
          ? l.detail
          : "";
    return `${mark} ${l.verdict.padEnd(12)} ${String(l.line).padStart(4)}  ${l.check}${tail ? `  — ${tail}` : ""}`;
  });
  const c = result.counts;
  return [
    `handoff-verify: ${file}`,
    ...rows,
    `${c.confirmed} confirmed · ${c.stale} stale · ${c.unverifiable} unverifiable → ${result.reason}`,
  ].join("\n");
}

export function run(argv, io = {}) {
  const readFile = io.readFile ?? ((p) => fs.readFileSync(p, "utf8"));
  const exists = io.exists ?? ((p) => fs.existsSync(p));
  const opts = parseArgs(argv);
  if (opts.error) return { reason: "usage", detail: opts.error, exitCode: 2 };
  if (opts.help) return { reason: "usage", detail: USAGE, exitCode: 0 };
  const cwd = opts.cwd ?? process.cwd();
  const file = path.resolve(cwd, opts.file);
  if (!exists(file))
    return { reason: "missing", file, exitCode: 1, json: opts.json };
  const figures = parseHandoff(readFile(file));
  const result = verify(figures, {
    runner: io.runner,
    cwd,
    timeoutSeconds: opts.timeoutSeconds,
  });
  return { ...result, file, json: opts.json };
}

function isInvokedDirectly() {
  try {
    return fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  const r = run(process.argv.slice(2));
  if (r.reason === "usage") {
    process.stderr.write(`${r.detail}\n`);
  } else if (r.json) {
    // Every non-usage outcome is one JSON object on stdout — `missing` included,
    // so a caller reading the stream never has to fall back to stderr.
    const { json, ...rest } = r;
    process.stdout.write(JSON.stringify(rest, null, 2) + "\n");
  } else if (r.reason === "missing") {
    process.stderr.write(`handoff-verify: ${r.file} does not exist\n`);
  } else {
    process.stdout.write(renderTable(r, r.file) + "\n");
  }
  process.exitCode = r.exitCode;
}
