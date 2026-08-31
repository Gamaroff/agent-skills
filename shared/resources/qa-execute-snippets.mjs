#!/usr/bin/env node
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
 *   --copy <dir>         seed the temp working directory from this directory
 *   --timeout <ms>       per-block, per-shell timeout (default 10000)
 *   --no-zsh             force the bash arm only (testing / mutation proving)
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
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

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
    const fence = /^(\s*)(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)\s*$/.exec(line);
    if (!fence) {
      // Ordinary content. Only meaningful while a fence is open — that is the
      // block body, and dropping it here is how an earlier draft extracted every
      // block as empty.
      if (open !== null) open.body.push(line);
      continue;
    }
    const [, indent, marker, info] = fence;

    if (open === null) {
      open = { indent, marker: marker[0], len: marker.length, info, start: i, body: [] };
      continue;
    }

    // A closing fence uses the same marker character and is at least as long.
    if (marker[0] === open.marker && marker.length >= open.len && info === "") {
      if (open.info === "bash") {
        blocks.push({
          line: open.start + 1,
          code: open.body.join("\n"),
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
  "awk", "basename", "cat", "comm", "cut", "date", "diff", "dirname", "echo",
  "egrep", "env", "false", "fgrep", "file", "find", "grep", "head", "jq", "ls",
  "printf", "pwd", "readlink", "realpath", "seq", "sort", "stat", "tail", "test",
  "tr", "true", "uniq", "wc",
  // `sed` is read-only unless it is asked to edit in place; see DENY_PATTERNS.
  "sed",
]);

/**
 * Shell keywords, and builtins that cannot mutate anything outside the block's
 * own shell. `source` and `.` are deliberately absent: they execute an arbitrary
 * file, which is exactly what the allow-list exists to refuse.
 */
const SHELL_KEYWORDS = new Set([
  "!", "[", "[[", "]]", "]", "{", "}", "(", ")", "case", "do", "done", "elif",
  "else", "esac", "fi", "for", "function", "if", "in", "select", "then", "time",
  "until", "while",
  // Builtins whose blast radius is the block's own shell process.
  ":", "break", "cd", "command", "continue", "exit", "export", "local", "read",
  "readonly", "return", "set", "shift", "type", "unset", "which",
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
  "cat-file", "describe", "diff", "log", "ls-files", "ls-remote", "ls-tree",
  "rev-list", "rev-parse", "show", "status",
]);

/**
 * Named dangers. These do not define the boundary — SAFE_COMMANDS does — but
 * they produce a precise reason for the cases worth naming.
 */
export const DENY_PATTERNS = [
  [/\bgh\s+pr\s+comment\b/, "gh pr comment"],
  [/\bgh\s+issue\b/, "gh issue"],
  [/\bgh\s+api\b[^\n]*\s(-X|--method)\b/, "gh api with method"],
  [/\bcurl\b[^\n]*\s(-X|--request)\s*(POST|PUT|PATCH|DELETE)\b/, "curl write method"],
  [/\bgit\s+push\b/, "git push"],
  [/\bgit\s+commit\b/, "git commit"],
  [/\brm\s+-[A-Za-z]*[rf]/, "rm -rf"],
  [/\bsed\s+(-[A-Za-z]*\s+)*-i\b|\bsed\s+-[A-Za-z]*i\b/, "sed -i"],
];

/** Template slots: `{n}`, `{task-id}`, `<path>`, `<PLACEHOLDER>`. */
const PLACEHOLDER_PATTERNS = [
  // `{name}` but never `${name}` — the negative lookbehind is what keeps shell
  // parameter expansion out of the placeholder bucket.
  /(?<!\$)\{[A-Za-z][\w .:|/-]*\}/,
  // `<name>` in argument position. `2>&1`, `<<EOF` and `a < b` do not match.
  /(?<![<>&\w])<[A-Za-z][\w -]*>/,
];

/** Shell variables that are always available and never need binding. */
const IMPLICIT_VARS = new Set([
  "?", "!", "$", "#", "@", "*", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "HOME", "IFS", "PATH", "PWD", "OLDPWD", "SHELL", "USER", "TMPDIR", "RANDOM",
  "LINENO", "SECONDS", "HOSTNAME", "UID", "EUID", "PPID", "BASH_SOURCE",
]);

/**
 * Drop comments and heredoc bodies. Quoted spans are KEPT — a placeholder is
 * very often written inside quotes (`--issue "{TRACKER_ISSUE}"`), so blanking
 * quotes before placeholder detection would classify a templated block as
 * runnable and then execute it.
 */
function stripProse(code) {
  const out = [];
  const lines = code.split("\n");
  let heredocTerminator = null;

  for (const raw of lines) {
    if (heredocTerminator !== null) {
      if (raw.trim() === heredocTerminator) heredocTerminator = null;
      continue; // heredoc body is data
    }
    const here = /<<-?\s*'?"?([A-Za-z_][A-Za-z0-9_]*)'?"?/.exec(raw);
    if (here) {
      heredocTerminator = here[1];
      out.push(raw.slice(0, here.index));
      continue;
    }
    // Drop `# comment`, but not a `#` inside a string or a `${#var}`.
    let line = raw.replace(/(^|\s)#.*$/, "$1");
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Everything `stripProse` removes, plus the contents of quoted spans. Used only
 * for command detection, where a quoted string is an argument and never an
 * invocation.
 */
function stripNonCode(code) {
  return stripProse(code)
    .replace(/'[^']*'/g, "''")
    .replace(/"(\\.|[^"\\])*"/g, '""');
}

/** The leading word of every simple command in the block. */
export function commandWords(code) {
  const stripped = stripNonCode(code)
    // Backslash line-continuations join one command across several lines. Splitting
    // on the raw newline first makes the continuation's tail look like a fresh
    // command: `git log ... -- \` + `apps packages` reported `apps` as a command.
    .replace(/\\\n/g, " ")
    // Arithmetic expansion is arithmetic, not an invocation. It must go before the
    // `$(` rule below, or `$((N + 1))` becomes a segment whose first token is `N`.
    .replace(/\$\(\([^)]*\)\)/g, " 0 ")
    // Command substitutions and subshells: turn the delimiters into segment
    // breaks so the INNER command is scanned as a command rather than being
    // swallowed by the enclosing assignment. Without this,
    // `P=$(git remote get-url origin)` skips `P=$(git` as an assignment and then
    // reads `remote` as the command.
    .replace(/\$\(/g, "\n")
    .replace(/`/g, "\n")
    .replace(/\)/g, "\n");
  const words = [];
  // Split on anything that can begin a new simple command.
  // Deliberately NOT split on `{` or `(`: `echo {task-id}` would then yield
  // `task-id}` as a command word, and the fail-closed rule would report a
  // templated block as an unrecognised command. Grouping characters are stripped
  // as prefixes below instead.
  const segments = stripped.split(/(?:\n|;|\|\||&&|\||&|\bdo\b|\bthen\b|\belse\b)/);

  for (const seg of segments) {
    const trimmed = seg.trim().replace(/^[({\s]+/, "");
    if (!trimmed) continue;
    for (const tok of trimmed.split(/\s+/)) {
      // Leading `VAR=value` assignments and redirections precede the command.
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) continue;
      if (/^[<>]/.test(tok) || /^\d+[<>]/.test(tok)) continue;
      if (tok === "") continue;
      // Not a possible command name → this segment is not an invocation.
      if (!COMMAND_NAME.test(tok)) break;
      if (tok === "git") {
        // Carry THIS invocation's subcommand. Resolving `git` against the first
        // `git …` in the whole block instead fails OPEN: a block opening with
        // `git rev-parse` would license a later `git checkout` in the same block.
        const rest = trimmed.split(/\s+/).slice(1).find((t) => /^[a-z][a-z-]*$/.test(t));
        words.push(rest ? `git:${rest}` : "git");
      } else {
        words.push(tok);
      }
      break; // only the command word of this segment
    }
  }
  return words;
}

/** Variables the block reads but never assigns. */
export function unboundVariables(code, bindings) {
  const stripped = code
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");

  const assigned = new Set();
  for (const m of stripped.matchAll(/(?:^|\s|;)([A-Za-z_][A-Za-z0-9_]*)=/g)) assigned.add(m[1]);
  for (const m of stripped.matchAll(/\bfor\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\b/g)) assigned.add(m[1]);
  for (const m of stripped.matchAll(/\bread\s+(?:-\S+\s+)*([A-Za-z_][A-Za-z0-9_]*)/g)) assigned.add(m[1]);

  const read = new Set();
  for (const m of stripped.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/g)) read.add(m[1]);

  return [...read].filter(
    (v) => !assigned.has(v) && !IMPLICIT_VARS.has(v) && !(v in bindings),
  );
}

/**
 * Exactly one of: runnable | placeholder | mutating.
 * Order matters — `mutating` is decided before `placeholder`, so a block that is
 * both templated and dangerous is reported by its dangerous property.
 */
export function classifyBlock(code, bindings = {}) {
  // Scan prose-stripped code, not raw: a heredoc body or a comment that merely
  // MENTIONS `git push` is documentation. Scanning raw text would classify a doc
  // for its own examples and skip a block that is in fact safe to run.
  const prose = stripProse(code);

  for (const [re, name] of DENY_PATTERNS) {
    if (re.test(prose)) return { klass: "mutating", reason: `deny-list: ${name}` };
  }

  const unknown = commandWords(code).filter((w) => {
    if (SHELL_KEYWORDS.has(w)) return false;
    if (SAFE_COMMANDS.has(w)) return false;
    if (w.startsWith("git:")) return !SAFE_GIT_SUBCOMMANDS.has(w.slice(4));
    return true;
  });

  if (unknown.length > 0) {
    return {
      klass: "mutating",
      reason: `unrecognised-command: ${[...new Set(unknown.map((w) => w.replace(":", " ")))].join(", ")} (fail-closed)`,
    };
  }

  // Same reasoning for template slots.
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(prose)) return { klass: "placeholder", reason: "template slot" };
  }

  const unbound = unboundVariables(code, bindings);
  if (unbound.length > 0) {
    return { klass: "placeholder", reason: `unbound-variable: ${unbound.join(", ")}` };
  }

  return { klass: "runnable", reason: null };
}

// ── Dual-shell execution ──────────────────────────────────────────────────────

export function zshAvailable() {
  const r = spawnSync("command", ["-v", "zsh"], { shell: "/bin/bash", encoding: "utf8" });
  return r.status === 0;
}

/**
 * Run one block under each shell and compare.
 *
 * stdout is the load-bearing comparison, NOT exit status. The defect this whole
 * mechanism exists for exits 1 under both shells and differs only in what it
 * printed — comparing status alone would have missed it.
 */
export function runBlock(code, { shells, cwd, timeout = 10_000, bindings = {} } = {}) {
  const env = { ...process.env, ...bindings };
  const runs = {};

  for (const shell of shells) {
    const r = spawnSync(shell, ["-c", code], { cwd, timeout, encoding: "utf8", env });
    runs[shell] = {
      stdout: (r.stdout ?? "").replace(/\n+$/, ""),
      stderr: (r.stderr ?? "").replace(/\n+$/, ""),
      status: r.status,
      timedOut: r.error?.code === "ETIMEDOUT" || r.signal === "SIGTERM",
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
          (consistent ? " (identical in every shell — not a portability defect)" : ""),
      });
    }
  }

  if (shells.length > 1) {
    const [a, b] = shells;
    if (runs[a].stdout !== runs[b].stdout) {
      findings.push({
        kind: "shell-disagreement",
        confidence: "medium",
        detail:
          `${a} printed ${runs[a].stdout === "" ? 0 : runs[a].stdout.split("\n").length} line(s), ` +
          `${b} printed ${runs[b].stdout === "" ? 0 : runs[b].stdout.split("\n").length} line(s)`,
      });
    }
  }

  return { runs, findings };
}

// ── File-level orchestration ──────────────────────────────────────────────────

export function executeFile(filePath, opts = {}) {
  const {
    bindings = {},
    timeout = 10_000,
    copyFrom = null,
    allowZsh = true,
  } = opts;

  const markdown = readFileSync(filePath, "utf8");
  const blocks = extractBlocks(markdown);

  const useZsh = allowZsh && zshAvailable();
  const shells = useZsh ? ["bash", "zsh"] : ["bash"];

  const tmp = mkdtempSync(join(tmpdir(), "qa-snippets-"));
  if (copyFrom) cpSync(copyFrom, tmp, { recursive: true });

  const results = [];
  const findings = [];

  try {
    for (const block of blocks) {
      const { klass, reason } = classifyBlock(block.code, bindings);
      if (klass !== "runnable") {
        results.push({ line: block.line, klass, reason, skipped: true });
        continue;
      }
      const { runs, findings: blockFindings } = runBlock(block.code, {
        shells,
        cwd: tmp,
        timeout,
        bindings,
      });
      results.push({ line: block.line, klass, reason: null, skipped: false, runs });
      for (const f of blockFindings) findings.push({ ...f, line: block.line });
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  const counts = { runnable: 0, placeholder: 0, mutating: 0 };
  for (const r of results) counts[r.klass]++;

  // A run where zero blocks executed is itself a finding — this is the rule's
  // own failure mode, and it is exactly the silent skip the step exists to stop.
  // zsh being absent never reduces the runnable count, so the guard cannot trip it.
  if (blocks.length > 0 && counts.runnable === 0) {
    // `medium`, deliberately. This is a statement about COVERAGE — the gate did
    // nothing here — not a defect in the work item, and `high` + `category: bug`
    // is what makes a finding gate-blocking. A skill whose snippets all read
    // caller variables would otherwise block its own PR for needing bindings the
    // run did not supply, which is the "noise trains reviewers to ignore it"
    // failure the rule warns about. It is still reported, which is what "a
    // finding, not a pass" requires.
    findings.push({
      kind: "zero-blocks-executed",
      confidence: "medium",
      detail:
        `${blocks.length} bash block(s) found, none classified runnable ` +
        `(${counts.placeholder} placeholder, ${counts.mutating} mutating)` +
        (counts.placeholder > 0
          ? " — supply the missing values with --bind to execute the placeholder blocks"
          : ""),
    });
  }

  return {
    file: filePath,
    shells,
    zshAvailable: useZsh,
    zshSkipReason: allowZsh && !useZsh ? "zsh-unavailable" : allowZsh ? null : "disabled",
    blocks: blocks.length,
    counts,
    results,
    findings,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const USAGE =
  "Usage: qa-execute-snippets --file <path.md> [--bind NAME=VALUE]... " +
  "[--copy <dir>] [--timeout <ms>] [--no-zsh] [--json]";

export function main(argv = process.argv.slice(2)) {
  let file = null;
  let copyFrom = null;
  let timeout = 10_000;
  let allowZsh = true;
  let json = false;
  const bindings = {};

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--file": file = argv[++i]; break;
      case "--copy": copyFrom = argv[++i]; break;
      case "--timeout": timeout = Number(argv[++i]); break;
      case "--no-zsh": allowZsh = false; break;
      case "--json": json = true; break;
      case "--bind": {
        const pair = argv[++i] ?? "";
        const eq = pair.indexOf("=");
        if (eq < 1) return { exitCode: 2, error: `bad --bind (want NAME=VALUE): ${pair}` };
        bindings[pair.slice(0, eq)] = pair.slice(eq + 1);
        break;
      }
      case "-h":
      case "--help": return { exitCode: 0, usage: USAGE };
      default: return { exitCode: 2, error: `unknown argument: ${argv[i]}` };
    }
  }

  if (!file) return { exitCode: 2, error: `--file is required\n${USAGE}` };

  let report;
  try {
    report = executeFile(file, { bindings, timeout, copyFrom, allowZsh });
  } catch (e) {
    return { exitCode: 2, error: e.message };
  }

  return { exitCode: report.findings.length > 0 ? 1 : 0, report, json };
}

function render(report) {
  const lines = [`Snippet execution — ${report.file}`, ""];
  lines.push(
    `  ${report.blocks} bash block(s): ` +
      `${report.counts.runnable} runnable, ${report.counts.placeholder} placeholder, ` +
      `${report.counts.mutating} mutating`,
  );
  lines.push(`  shells: ${report.shells.join(", ")}${report.zshAvailable ? "" : "  (zsh-unavailable)"}`);
  lines.push("");
  for (const r of report.results.filter((x) => x.skipped)) {
    lines.push(`  SKIP  line ${r.line}  ${r.klass} — ${r.reason}`);
  }
  if (report.findings.length === 0) {
    lines.push("", "  No findings.");
  } else {
    lines.push("");
    for (const f of report.findings) {
      lines.push(`  ${f.kind}  ${f.line ? `line ${f.line}  ` : ""}[${f.confidence}] ${f.detail}`);
    }
  }
  return lines.join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const r = main();
  if (r.error) {
    console.error(r.error);
    process.exit(r.exitCode);
  }
  if (r.usage) {
    console.log(r.usage);
    process.exit(r.exitCode);
  }
  console.log(r.json ? JSON.stringify(r.report, null, 2) : render(r.report));
  process.exit(r.exitCode);
}
