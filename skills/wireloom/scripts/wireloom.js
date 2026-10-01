#!/usr/bin/env node
/**
 * wireloom — check and render Wireloom wireframe sources.
 *
 * The `wireloom` npm package (MIT, StardockCorp) is a library with no CLI, and
 * GitHub does not render a ```wireloom fence. This script is the CLI: it pulls
 * every ```wireloom block out of a Markdown file, parses each one, and writes
 * one SVG per block so a document can embed the picture beside its source.
 *
 * Usage:
 *   wireloom.js check  <file|->                         [--json] [--no-install]
 *   wireloom.js render <file|-> --out <file.svg|dir/>   [--json] [--no-install]
 *                      [--theme default|dark] [--block N]
 *   wireloom.js ensure                                  [--json] [--no-install]
 *   wireloom.js status <source.html>                    [--json]
 *
 * Input: a Markdown file holding one or more ```wireloom (or ~~~wireloom)
 * fences, or a raw Wireloom source whose first significant line is `window`.
 * `-` reads stdin.
 *
 * Package resolution, first hit wins — the consumer's package.json is never
 * touched:
 *   1. env   WIRELOOM_MODULE — a path to a wireloom package dir or entry file
 *   2. project  `wireloom` resolvable from the current working directory
 *   3. cache    ${XDG_CACHE_HOME:-~/.cache}/agent-skills/wireloom/<PINNED>
 *   4. install  `npm install` of the pinned version into that cache dir,
 *               unless --no-install or WIRELOOM_NO_INSTALL=1
 *
 * `status` answers "does this source file's wireframe document exist, and was
 * it made from the source as it is now?" It needs no package. The document is
 * <dir>/<stem>.wireframe.md beside the source, and its frontmatter
 * `source_sha256:` records the SHA-256 of the source it was made from.
 *
 * Exit codes (same family as the repository's other engines):
 *   0  ok
 *   1  a guard tripped: parse-error, no-blocks, unavailable
 *   2  usage error
 *
 * `reason` vocabulary — every value is reachable from a test:
 *   ok            every block parsed (check), every SVG written (render),
 *                 or the package loaded (ensure)
 *   parse-error   at least one block failed to parse; nothing was written.
 *                 Each error's `line` is a line of the INPUT FILE, not of
 *                 the block, so it can be jumped to directly.
 *   no-blocks     the input holds no ```wireloom fence and is not raw source
 *   unavailable   the package could not be resolved or installed
 *   usage         the invocation was wrong; always paired with exit 2
 *
 * `status` reasons, all exit 0 — each is an answer, not a failure:
 *   new           no wireframe document beside the source yet
 *   fresh         the document's source_sha256 matches the source
 *   stale         it records a different hash: the source changed since
 *   unrecorded    the document has no source_sha256, so freshness is unknown
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

// The version references/grammar.md documents. Bump both together.
const PINNED_VERSION = "0.7.0";

class UsageError extends Error {}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const VALUE_FLAGS = new Set(["--out", "--theme", "--block"]);
const BOOL_FLAGS = new Set(["--json", "--no-install"]);
const COMMANDS = new Set(["check", "render", "ensure", "status"]);

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || !COMMANDS.has(command)) {
    throw new UsageError(
      `expected a command: check | render | ensure | status (got ${command ? `"${command}"` : "nothing"})`,
    );
  }
  const opts = { command, positional: [] };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (VALUE_FLAGS.has(arg)) {
      if (i + 1 >= rest.length) throw new UsageError(`${arg} needs a value`);
      opts[arg.slice(2)] = rest[++i];
    } else if (BOOL_FLAGS.has(arg)) {
      opts[arg.slice(2)] = true;
    } else if (arg.startsWith("--")) {
      throw new UsageError(`unknown flag ${arg}`);
    } else {
      opts.positional.push(arg);
    }
  }

  if (command === "ensure") {
    if (opts.positional.length) throw new UsageError("ensure takes no input");
    return opts;
  }
  if (opts.positional.length !== 1) {
    throw new UsageError(
      `${command} needs exactly one input: a file path or -`,
    );
  }
  opts.input = opts.positional[0];

  if (command === "status" && opts.input === "-") {
    throw new UsageError("status needs a source file path, not -");
  }
  if (
    (command === "check" || command === "status") &&
    (opts.out || opts.theme || opts.block)
  ) {
    throw new UsageError("--out, --theme and --block apply to render only");
  }
  if (command === "render") {
    if (!opts.out) throw new UsageError("render needs --out <file.svg|dir/>");
    if (opts.theme && !["default", "dark"].includes(opts.theme)) {
      throw new UsageError(
        `--theme must be default or dark (got "${opts.theme}")`,
      );
    }
    if (opts.block !== undefined) {
      if (!/^[1-9]\d*$/.test(opts.block)) {
        throw new UsageError(
          `--block must be a positive integer (got "${opts.block}")`,
        );
      }
      opts.block = Number(opts.block);
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Block extraction
// ---------------------------------------------------------------------------

/**
 * Returns [{ index, line, source }] where `line` is the 1-based line of the
 * input on which the block's first source line sits. A file with no fence
 * whose first significant line starts with `window` is one raw block.
 */
function extractBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  // `open` is any fenced block we are inside. Only a wireloom one collects a
  // body; any other fence is skipped whole, so a ```wireloom shown as an
  // example inside a ````markdown fence is not mistaken for a real block.
  let open = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!open) {
      const m = /^ {0,3}(`{3,}|~{3,})\s*(\S*)/.exec(line);
      if (m) {
        const isWireloom = /^wireloom\b/.test(m[2]);
        open = { fence: m[1], body: isWireloom ? [] : null, line: i + 2 };
      }
      continue;
    }
    const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
    if (
      close &&
      close[1][0] === open.fence[0] &&
      close[1].length >= open.fence.length
    ) {
      if (open.body) {
        blocks.push({
          index: blocks.length + 1,
          line: open.line,
          source: open.body.join("\n") + "\n",
        });
      }
      open = null;
      continue;
    }
    if (open.body) open.body.push(line);
  }
  // An unclosed fence runs to the end of the document, as CommonMark has it.
  if (open && open.body) {
    blocks.push({
      index: blocks.length + 1,
      line: open.line,
      source: open.body.join("\n") + "\n",
    });
  }

  if (blocks.length) return blocks;

  const firstSignificant = lines.find(
    (l) => l.trim() && !l.trim().startsWith("#"),
  );
  // A window header — `window:`, `window "Title":`, optionally with attributes —
  // not merely a line whose first word is "window".
  if (
    firstSignificant &&
    /^window(\s+("[^"]*"|\S+))*\s*:\s*$/.test(firstSignificant)
  ) {
    return [
      { index: 1, line: 1, source: text.endsWith("\n") ? text : text + "\n" },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Package resolution
// ---------------------------------------------------------------------------

function cacheDir() {
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  return path.join(base, "agent-skills", "wireloom", PINNED_VERSION);
}

function versionOf(entry) {
  // Walk up from the resolved entry to the package's own package.json.
  let dir = path.dirname(entry);
  for (let i = 0; i < 5; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const json = JSON.parse(fs.readFileSync(pkg, "utf8"));
        if (json.name === "wireloom") return json.version || null;
      } catch {
        return null;
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

function load(entry, from) {
  const mod = require(entry);
  const api = mod && typeof mod.parse === "function" ? mod : mod && mod.default;
  if (
    !api ||
    typeof api.parse !== "function" ||
    typeof api.render !== "function"
  ) {
    throw new Error(
      `${entry} does not export parse/render — not the wireloom package`,
    );
  }
  return { api, from, entry, version: versionOf(entry) };
}

function tryResolve(request, fromDir) {
  try {
    return createRequire(path.join(fromDir, "noop.js")).resolve(request);
  } catch {
    return null;
  }
}

function resolveWireloom({ noInstall }) {
  const override = process.env.WIRELOOM_MODULE;
  if (override) {
    const abs = path.resolve(override);
    const entry = tryResolve(abs, process.cwd());
    if (!entry) {
      return {
        error: `WIRELOOM_MODULE=${override} does not resolve to a module`,
      };
    }
    return load(entry, "env");
  }

  const project = tryResolve("wireloom", process.cwd());
  if (project) return load(project, "project");

  const cache = cacheDir();
  const cached = tryResolve("wireloom", cache);
  if (cached) return load(cached, "cache");

  if (noInstall || process.env.WIRELOOM_NO_INSTALL === "1") {
    return {
      error:
        `wireloom is not installed in this project or in ${cache}, and installing is disabled. ` +
        `Run without --no-install, or: npm install --prefix "${cache}" wireloom@${PINNED_VERSION}`,
    };
  }

  try {
    fs.mkdirSync(cache, { recursive: true });
    execFileSync(
      "npm",
      [
        "install",
        "--prefix",
        cache,
        "--no-save",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--loglevel=error",
        `wireloom@${PINNED_VERSION}`,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
  } catch (err) {
    const stderr = err.stderr ? String(err.stderr).trim() : err.message;
    return {
      error: `npm install wireloom@${PINNED_VERSION} into ${cache} failed: ${stderr}`,
    };
  }
  const installed = tryResolve("wireloom", cache);
  if (!installed)
    return {
      error: `npm install reported success but ${cache} has no wireloom`,
    };
  return load(installed, "installed");
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function readInput(input) {
  if (input === "-") return fs.readFileSync(0, "utf8");
  if (!fs.existsSync(input))
    throw new UsageError(`cannot read ${input}: no such file`);
  return fs.readFileSync(input, "utf8");
}

function parseBlocks(api, blocks) {
  return blocks.map((b) => {
    try {
      api.parse(b.source);
      return { index: b.index, line: b.line, ok: true };
    } catch (err) {
      if (typeof err.line !== "number") throw err;
      // WireloomError messages lead with "Line N, col C: " relative to the
      // block. Strip it and re-anchor the line to the input file.
      const message = String(err.message).replace(/^Line \d+, col \d+:\s*/, "");
      return {
        index: b.index,
        line: b.line,
        ok: false,
        error: { line: b.line + err.line - 1, column: err.column, message },
      };
    }
  });
}

function outputPaths(opts, selected, total) {
  const out = opts.out;
  const isDir =
    out.endsWith("/") ||
    out.endsWith(path.sep) ||
    (fs.existsSync(out) && fs.statSync(out).isDirectory());

  if (isDir) {
    if (opts.input === "-")
      throw new UsageError(
        "rendering stdin needs --out <file.svg>, not a directory",
      );
    const stem = path.basename(opts.input).replace(/\.[^.]+$/, "");
    return selected.map((b) =>
      path.join(out, total === 1 ? `${stem}.svg` : `${stem}.${b.index}.svg`),
    );
  }
  if (!out.endsWith(".svg"))
    throw new UsageError(
      `--out must end in .svg or name a directory (got "${out}")`,
    );
  if (selected.length === 1) return [out];
  const stem = out.slice(0, -".svg".length);
  return selected.map((b) => `${stem}.${b.index}.svg`);
}

/** The wireframe document that belongs beside a source file. */
function wireframeDocPath(source) {
  const stem = path.basename(source).replace(/\.[^.]+$/, "");
  return path.join(path.dirname(source), `${stem}.wireframe.md`);
}

/** source_sha256 from a document's leading YAML frontmatter, or null. */
function recordedHash(text) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!fm) return null;
  const m = /^source_sha256:\s*["']?([0-9a-f]{64})["']?\s*$/m.exec(fm[1]);
  return m ? m[1] : null;
}

function status(opts) {
  if (!fs.existsSync(opts.input) || !fs.statSync(opts.input).isFile()) {
    throw new UsageError(`cannot read ${opts.input}: no such file`);
  }
  const sha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(opts.input))
    .digest("hex");
  const doc = wireframeDocPath(opts.input);
  const base = { exitCode: 0, source: opts.input, doc, sha256 };
  if (!fs.existsSync(doc)) return { reason: "new", ...base };
  const recorded = recordedHash(fs.readFileSync(doc, "utf8"));
  if (!recorded) return { reason: "unrecorded", ...base, recorded };
  return { reason: recorded === sha256 ? "fresh" : "stale", ...base, recorded };
}

async function run(opts) {
  if (opts.command === "status") return status(opts);
  const pkg = resolveWireloom({ noInstall: opts["no-install"] });
  if (pkg.error)
    return { reason: "unavailable", exitCode: 1, error: pkg.error };
  const meta = { package: { from: pkg.from, version: pkg.version } };

  if (opts.command === "ensure") {
    return { reason: "ok", exitCode: 0, ...meta, entry: pkg.entry };
  }

  const blocks = extractBlocks(readInput(opts.input));
  if (!blocks.length) {
    return {
      reason: "no-blocks",
      exitCode: 1,
      ...meta,
      error:
        "no ```wireloom fence found, and the input is not raw source starting with `window`",
    };
  }

  let selected = blocks;
  if (opts.command === "render" && opts.block !== undefined) {
    selected = blocks.filter((b) => b.index === opts.block);
    if (!selected.length) {
      throw new UsageError(
        `--block ${opts.block} out of range: the input has ${blocks.length} block(s)`,
      );
    }
  }

  // Parse everything selected before writing anything: a render either
  // writes every SVG or none.
  const results = parseBlocks(pkg.api, selected);
  if (results.some((r) => !r.ok)) {
    return { reason: "parse-error", exitCode: 1, ...meta, blocks: results };
  }
  if (opts.command === "check") {
    return { reason: "ok", exitCode: 0, ...meta, blocks: results };
  }

  const paths = outputPaths(opts, selected, blocks.length);
  const written = [];
  for (let i = 0; i < selected.length; i++) {
    const b = selected[i];
    const options = opts.theme ? { theme: opts.theme } : undefined;
    const { svg } = await pkg.api.render(
      `wireloom-${b.index}`,
      b.source,
      options,
    );
    fs.mkdirSync(path.dirname(path.resolve(paths[i])), { recursive: true });
    fs.writeFileSync(paths[i], svg);
    written.push({ index: b.index, line: b.line, ok: true, file: paths[i] });
  }
  return { reason: "ok", exitCode: 0, ...meta, blocks: written };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function human(result) {
  const out = [];
  if (result.package)
    out.push(
      `wireloom ${result.package.version || "?"} (${result.package.from})`,
    );
  if (result.error) out.push(`${result.reason}: ${result.error}`);
  if (result.sha256) {
    out.push(`  source  ${result.source}`, `  doc     ${result.doc}`);
    out.push(`  sha256  ${result.sha256}`);
    if (result.recorded) out.push(`  recorded ${result.recorded}`);
  }
  for (const b of result.blocks || []) {
    if (b.ok)
      out.push(
        `  block ${b.index} (line ${b.line}): ok${b.file ? ` → ${b.file}` : ""}`,
      );
    else
      out.push(
        `  block ${b.index}: line ${b.error.line}, col ${b.error.column}: ${b.error.message}`,
      );
  }
  if (!result.error) out.push(result.reason);
  return out.join("\n");
}

async function main(argv) {
  let result;
  let json = argv.includes("--json");
  try {
    const opts = parseArgs(argv);
    json = Boolean(opts.json);
    result = await run(opts);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    result = { reason: "usage", exitCode: 2, error: err.message };
  }
  // --json always goes to stdout so a caller capturing it sees every reason;
  // human-readable failures go to stderr.
  if (json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else
    (result.exitCode === 0 ? process.stdout : process.stderr).write(
      human(result) + "\n",
    );
  // Set the code and let the event loop drain stdout: process.exit() after an
  // async write truncates a piped payload.
  process.exitCode = result.exitCode;
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  extractBlocks,
  parseArgs,
  recordedHash,
  wireframeDocPath,
  PINNED_VERSION,
};
