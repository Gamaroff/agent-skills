"use strict";

/**
 * doc-links.js — do a document's relative Markdown links resolve from the
 * document's OWN location, against the TRACKED tree?
 *
 * Why this exists (task.139 finalise, obs #154). A task document quoted a
 * skill's SKILL.md verbatim — including the skill's relative link
 * `(references/document-change-log.md)` — and that link is dead from
 * `docs/tasks/`. It was written by `/create-task`, passed `/review-task`
 * (which checks that cited *paths exist*, not that *links resolve from
 * here*), passed two `/qa-task` cycles (whose code reviewer excludes the work
 * item document), passed `/review-pr`, and failed only in CI's
 * `docs-link-check` — after the whole pipeline. A quotation that carries a
 * relative link is a link, not a quotation, to every checker that reads the
 * file.
 *
 * Contract:
 *   node doc-links.js --file <path> [--json] [--root <dir>]
 *     exit 0, reason `ok`      — every relative link resolves (or there are none)
 *     exit 1, reason `broken`  — at least one does not, or a fence never closes;
 *                                each is printed as `✖ <file>:<line> → <target>`
 *                                and the summary reads
 *                                `FAIL doc-links: N finding(s) in <file>` — the
 *                                ✖ / FAIL markers are what
 *                                finalise-fix-and-recheck.mjs reads as red, so a
 *                                pre-fix run of this CLI is a mutation-proof run
 *     exit 2, reason `usage`   — no --file, a flag with no operand, or the file
 *                                is unreadable
 *
 * Anchoring (QA cycle 3, CR-2). Every path is resolved against the REPOSITORY
 * ROOT — `git rev-parse --show-toplevel` from `--root` (default: the cwd) —
 * never against wherever the CLI happened to be launched: `git ls-files`
 * without `--full-name` answers relative to the cwd, and from a skill directory
 * every `../../docs/…` link read as dead. Outside a repository the disk is used
 * from `--root` and `tracked: false` is reported, so the reader knows which
 * question was answered.
 *
 * Extraction (CR-1, CR-6, CR-7). Fences follow CommonMark: an opener is up to
 * three spaces and a run of three or more backticks or tildes; a BACKTICK opener
 * whose info string contains a backtick is not a fence (it is an inline code
 * span that happens to start the line — task.42's document has one, and the
 * first version of this file opened a fence there that never closed and
 * reported the 941-line document as having no links at all); a closer is the
 * same character, at least as long, followed by nothing but spaces. A fence
 * still open at EOF is a FINDING, because everything after it was not scanned.
 * Code spans are stripped over the whole text after fences are blanked, so a
 * backticked quotation wrapped across a line break is still code. Inline links
 * (nested brackets one level deep, `<target with spaces>`, balanced parentheses
 * in the target, "double" / 'single' / (paren) titles), reference definitions
 * (`[x]: target`) and HTML `href=` / `src=` attributes are all extracted;
 * `#anchor`, `mailto:`, absolute URLs and protocol-relative targets are not
 * relative links.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})\s*$/;
// [text](target "title") — text may nest one level of brackets; target is
// <…> or a run without whitespace, with one level of balanced parentheses.
const INLINE_LINK_RE =
  /!?\[(?:[^\[\]]|\[[^\]]*\])*\]\(\s*(?:<([^>]*)>|([^\s()]*(?:\([^\s()]*\)[^\s()]*)*))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
const REF_DEF_RE = /^ {0,3}\[[^\]]+\]:\s*(?:<([^>]*)>|(\S+))/;
const HTML_ATTR_RE = /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const NOT_RELATIVE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

/** Replace every character of `s` except newlines with a space (keeps offsets). */
function blank(s) {
  return s.replace(/[^\n]/g, " ");
}

/**
 * Blank fenced blocks line by line. Returns { text, unterminatedFence } where
 * `unterminatedFence` is the 1-based line of an opener that never closed.
 */
function blankFences(text) {
  const lines = text.split("\n");
  let fence = null; // { marker, line }
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!fence) {
      const m = FENCE_OPEN_RE.exec(line);
      if (m && !(m[1][0] === "`" && m[2].includes("`"))) {
        fence = { marker: m[1], line: i + 1 };
        lines[i] = blank(line);
      }
      continue;
    }
    const c = FENCE_CLOSE_RE.exec(line);
    if (
      c &&
      c[1][0] === fence.marker[0] &&
      c[1].length >= fence.marker.length
    ) {
      fence = null;
    }
    lines[i] = blank(line);
  }
  return {
    text: lines.join("\n"),
    unterminatedFence: fence ? fence.line : null,
  };
}

/**
 * Blank inline code spans. A span may wrap a line break (CR-7) but never a
 * blank line — a paragraph ends it — so the stripping runs per paragraph: an
 * unmatched backtick run is literal, and it cannot pair with a run hundreds of
 * lines later and blank every link in between (task.139's own document has a
 * `\`\`` left by an escaped backtick, and the whole-text form ate lines 85–376).
 * A run of N backticks opens; the next run of exactly N closes.
 */
function blankCodeSpans(text) {
  return text
    .split(/(\n[ \t]*\n)/)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(/(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (m) => blank(m)),
    )
    .join("");
}

function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) n += 1;
  return n;
}

/**
 * [{ target, line }] for every relative link outside fences and code spans,
 * plus `unterminatedFence` (1-based line, or null).
 */
function extractRelativeLinks(text) {
  const fenced = blankFences(text);
  const clean = blankCodeSpans(fenced.text);
  const out = [];
  const push = (target, index) => {
    if (target === undefined || target === "" || NOT_RELATIVE_RE.test(target))
      return;
    out.push({ target, line: lineOf(clean, index) });
  };
  let m;
  INLINE_LINK_RE.lastIndex = 0;
  while ((m = INLINE_LINK_RE.exec(clean)) !== null) push(m[1] ?? m[2], m.index);
  HTML_ATTR_RE.lastIndex = 0;
  while ((m = HTML_ATTR_RE.exec(clean)) !== null) push(m[1] ?? m[2], m.index);
  let offset = 0;
  for (const line of clean.split("\n")) {
    const r = REF_DEF_RE.exec(line);
    if (r) push(r[1] ?? r[2], offset);
    offset += line.length + 1;
  }
  out.sort((a, b) => a.line - b.line);
  return Object.assign(out, { unterminatedFence: fenced.unterminatedFence });
}

function decodeSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  return r.status === 0 ? r.stdout : null;
}

/** The repository root containing `dir`, or null when it is not in one. */
function repoRoot(dir) {
  const out = git(["rev-parse", "--show-toplevel"], dir);
  return out ? path.resolve(out.trim()) : null;
}

/** The tracked set of the repository at `root`, root-relative, or null. */
function trackedSet(root) {
  const out = git(["ls-files", "-z", "--full-name"], root);
  return out === null ? null : new Set(out.split("\0").filter(Boolean));
}

function dirSet(tracked) {
  const dirs = new Set();
  for (const f of tracked) {
    let d = path.posix.dirname(f);
    while (d && d !== "." && !dirs.has(d)) {
      dirs.add(d);
      d = path.posix.dirname(d);
    }
  }
  return dirs;
}

const toPosix = (p) => p.split(path.sep).join("/");

/**
 * Check one document. `file` is relative to `root` (default: cwd) or absolute.
 * Resolution is anchored at the repository root containing `root` when there
 * is one. A caller walking many documents passes `tracked` (from
 * `trackedSet(repoRoot)`) so `git ls-files` runs once; `null` means "not a
 * repo" and is honoured, not re-derived.
 *
 * Returns { file, root, links, broken: [{ line, target, resolved }],
 *           unterminatedFence, tracked }.
 */
function checkDocument(
  file,
  { root = process.cwd(), tracked: trackedIn } = {},
) {
  // realpath on both ends: macOS answers `git rev-parse --show-toplevel` under
  // /private/var for a /var/… cwd, and path.relative across that symlink
  // yields a ../../../../var/… "relative" path that resolves nowhere.
  const startDir = fs.realpathSync(path.resolve(root));
  const abs = fs.realpathSync(
    path.isAbsolute(file) ? file : path.join(startDir, file),
  );
  const repo =
    trackedIn === undefined
      ? repoRoot(startDir)
      : trackedIn
        ? repoRoot(startDir)
        : null;
  const base = repo ?? startDir;
  const rel = toPosix(path.relative(base, abs));
  const text = fs.readFileSync(abs, "utf8");
  const links = extractRelativeLinks(text);
  const tracked =
    trackedIn === undefined ? (repo ? trackedSet(repo) : null) : trackedIn;
  const dirs = tracked ? dirSet(tracked) : null;
  const broken = [];
  for (const { target, line } of links) {
    const noFragment = target.split("#")[0];
    if (noFragment === "") continue;
    const resolved = path.posix
      .normalize(
        path.posix.join(path.posix.dirname(rel), decodeSafe(noFragment)),
      )
      .replace(/\/$/, "");
    const exists = tracked
      ? tracked.has(resolved) || dirs.has(resolved)
      : fs.existsSync(path.join(base, resolved));
    if (!exists) broken.push({ line, target, resolved });
  }
  return {
    file: rel,
    root: base,
    links: links.length,
    broken,
    unterminatedFence: links.unterminatedFence,
    tracked: tracked !== null,
  };
}

function usage(json, error) {
  process.stderr.write(
    `${error ? `doc-links: ${error}\n` : ""}usage: doc-links.js --file <path> [--json] [--root <dir>]\n`,
  );
  if (json)
    process.stdout.write(
      JSON.stringify({ reason: "usage", exitCode: 2, error }) + "\n",
    );
  return 2;
}

function main(argv) {
  let file = null;
  let json = argv.includes("--json");
  let root = process.cwd();
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") continue;
    if (a === "--file" || a === "--root") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--"))
        return usage(json, `${a} needs an operand`);
      if (a === "--file") file = v;
      else root = path.resolve(v);
      i += 1;
      continue;
    }
    return usage(json, `unknown argument ${a}`);
  }
  if (!file) return usage(json, "--file is required");
  let result;
  try {
    result = checkDocument(file, { root });
  } catch (e) {
    return usage(json, `cannot read ${file}: ${e.message}`);
  }
  const findings = result.broken.length + (result.unterminatedFence ? 1 : 0);
  const reason = findings ? "broken" : "ok";
  const exitCode = findings ? 1 : 0;
  if (json) {
    process.stdout.write(
      JSON.stringify({ reason, exitCode, ...result }, null, 2) + "\n",
    );
    return exitCode;
  }
  for (const b of result.broken) {
    process.stdout.write(
      `✖ ${result.file}:${b.line} → ${b.target} (resolves to ${b.resolved})\n`,
    );
  }
  if (result.unterminatedFence) {
    process.stdout.write(
      `✖ ${result.file}:${result.unterminatedFence} → fence opened here never closes (links after it were not scanned)\n`,
    );
  }
  if (findings) {
    process.stdout.write(
      `FAIL doc-links: ${findings} finding(s) in ${result.file}\n`,
    );
  } else {
    process.stdout.write(
      `ok doc-links: ${result.links} relative link(s) in ${result.file} resolve${result.tracked ? "" : " (disk, not tracked tree)"}\n`,
    );
  }
  return exitCode;
}

module.exports = {
  extractRelativeLinks,
  checkDocument,
  repoRoot,
  trackedSet,
  main,
};

// process.exitCode, never a hard exit: exiting after a stdout write truncates
// the write at ~64KB when the caller pipes it (bug.3; the repo guard is red on
// any new file that does it).
if (require.main === module) process.exitCode = main(process.argv.slice(2));
