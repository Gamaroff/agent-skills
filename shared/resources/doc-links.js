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
 *                                with its state appended — `[untracked]` (on
 *                                disk, not in the tracked tree: commit it),
 *                                `[ignored]` (on disk but gitignored: it can
 *                                never be committed), `[outside-repo]`,
 *                                `[unverifiable]`, `[missing]` (not on disk
 *                                under that exact name: write it) or
 *                                `[no-anchor]` (the file is there, the
 *                                `#fragment` names no heading or explicit
 *                                anchor in it: fix the fragment) — and
 *                                carries the same `state` in `--json` `broken[]`
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
 * A fence may sit at any indent (inside a list item or blockquote it is
 * indented past the three-space limit CommonMark allows at top level); the
 * cost is that a ``` line inside an indented code block reads as a fence,
 * which skips links — the safe direction. CRLF input is normalised to LF
 * first (QA cycle 4: with \r on every line no fence ever opened and no
 * paragraph ever split). Code spans are stripped per paragraph after fences
 * are blanked — a blank line ends a span — so a backticked quotation wrapped
 * across a line break is still code, and an unmatched backtick run is literal
 * and cannot pair with a run in a later paragraph. Inline links
 * (nested brackets one level deep, `<target with spaces>`, balanced parentheses
 * in the target, "double" / 'single' / (paren) titles), reference definitions
 * (`[x]: target`) and HTML `href=` / `src=` attributes are all extracted;
 * `mailto:`, absolute URLs and protocol-relative targets are not relative
 * links.
 *
 * Anchors (task 231, obs #80). A `#fragment` on a link to a `.md` file, and a
 * same-file `#fragment`, must name an anchor in that file: a GitHub heading
 * slug (anchorsOf) or an explicit `<a id=…>` / `<a name=…>`. A renamed heading
 * used to break every inbound link silently — the path check skipped the
 * fragment, and `markdown-link-check@3` passes a dead cross-file fragment
 * (measured: `other.md#nope` reads ✓). A fragment on any other target is not
 * checked. The target's text is its tracked (index) blob when the tracked tree
 * is in use, so the anchor check answers the same question as the path check;
 * outside a repository, or for a target not in the index, the disk is read.
 * Same-file fragments are not relative links — extractRelativeLinks still
 * leaves them out, and `resolved[]` never lists them.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const FENCE_OPEN_RE = /^[ \t]*(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE_RE = /^[ \t]*(`{3,}|~{3,})[ \t]*$/;
// [text](target "title") — text may nest one level of brackets; target is
// <…> or a run without whitespace, with one level of balanced parentheses.
const INLINE_LINK_RE =
  /(?<!\\)!?\[(?:[^\[\]]|\[[^\]]*\])*\]\(\s*(?:<([^>]*)>|([^\s()]*(?:\([^\s()]*\)[^\s()]*)*))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
// A reference definition's target has to look like a path (a slash or a dot):
// "[Note]: see below" is prose, and reading "see" as a link is a false ✖.
const REF_DEF_RE = /^ {0,3}\[[^\]]+\]:\s*(?:<([^>]*)>|(\S*[./]\S*))(?:\s|$)/;
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
        : // (?<!`) on the opener: a failed match must not retry from INSIDE a
          // backtick run — "``[x](a.md)` then …" has no 2-run closer and no
          // 1-run closer, and both are literal (QA cycle 4, CR-3).
          part.replace(/(?<!`)(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (m) =>
            blank(m),
          ),
    )
    .join("");
}

function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) n += 1;
  return n;
}

/**
 * The one link scanner: [{ target, line }] for every link target outside
 * fences and code spans that `keep(target)` accepts, plus `unterminatedFence`
 * (1-based line, or null). extractRelativeLinks and sameFileFragments are its
 * two filters — one extraction rule, two questions.
 */
function scanLinks(text, keep) {
  // CRLF → LF once: every regex below anchors on \n, and with a \r on each
  // line no fence opened and no paragraph split (QA cycle 4, CR-1).
  const fenced = blankFences(text.replace(/\r\n?/g, "\n"));
  const clean = blankCodeSpans(fenced.text);
  const out = [];
  const push = (target, index) => {
    if (target === undefined || target === "" || !keep(target)) return;
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

/**
 * [{ target, line }] for every relative link outside fences and code spans,
 * plus `unterminatedFence` (1-based line, or null).
 */
function extractRelativeLinks(text) {
  return scanLinks(text, (t) => !NOT_RELATIVE_RE.test(t));
}

/** [{ target, line }] for every same-file `#fragment` link (a bare `#` is not one). */
function sameFileFragments(text) {
  return scanLinks(text, (t) => t.startsWith("#") && t.length > 1);
}

// Any indent, and inside a blockquote: a heading nested in a list item (`    #### Find …`) or a
// quote renders, and gets an anchor, on GitHub. Reading too many lines as headings can only make
// a dead fragment pass; reading too few fails a live one, which is the error this file must not make.
const ATX_HEADING_RE =
  /^[ \t]*(?:>[ \t]?)*[ \t]*(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const SETEXT_UNDERLINE_RE = /^ {0,3}(?:=+|-+)[ \t]*$/;
const EXPLICIT_ANCHOR_RE =
  /<a\s[^>]*?\b(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/**
 * GitHub's heading slug: lower-case, inline HTML removed, punctuation dropped
 * (an em dash is punctuation), each space a hyphen — so "A — B" is `a--b` and
 * "Key → document lookup" is `key--document-lookup`. Letters, digits, `_` and
 * `-` of any script survive. The caller strips inline markup first.
 */
function githubSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
    .replace(/ /g, "-");
}

/** A heading's rendered text: code spans, links, images and emphasis unwrapped. */
function headingText(raw) {
  return raw
    .replace(/(`+)([\s\S]*?)\1/g, (_, __, code) => code)
    .replace(/!?\[((?:[^\[\]]|\[[^\]]*\])*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2")
    .replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?!\w)/g, "$1$2")
    .replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, "$1$2");
}

/**
 * Every anchor a document defines: the GitHub slug of each heading outside a
 * fence (ATX, and setext under a non-blank line), a repeated slug suffixed
 * `-1`, `-2`… in document order, plus each explicit `<a id=…>` / `<a name=…>`
 * outside a fence. A heading inside a fenced block is not an anchor.
 */
function anchorsOf(text) {
  const fenced = blankFences(text.replace(/\r\n?/g, "\n")).text;
  const lines = fenced.split("\n");
  const anchors = new Set();
  const seen = new Map();
  const add = (slug) => {
    const n = seen.get(slug) || 0;
    seen.set(slug, n + 1);
    anchors.add(n === 0 ? slug : `${slug}-${n}`);
  };
  for (let i = 0; i < lines.length; i += 1) {
    const atx = ATX_HEADING_RE.exec(lines[i]);
    if (atx) {
      add(githubSlug(headingText(atx[2] ?? "")));
      continue;
    }
    const next = lines[i + 1];
    if (
      next !== undefined &&
      lines[i].trim() !== "" &&
      SETEXT_UNDERLINE_RE.test(next) &&
      !/^ {0,3}(?:[-*+]|\d+[.)])[ \t]/.test(lines[i]) &&
      !/^ {0,3}>/.test(lines[i]) &&
      !/^ {0,3}\|/.test(lines[i])
    ) {
      add(githubSlug(headingText(lines[i])));
      i += 1;
    }
  }
  let m;
  EXPLICIT_ANCHOR_RE.lastIndex = 0;
  while ((m = EXPLICIT_ANCHOR_RE.exec(fenced)) !== null)
    anchors.add((m[1] ?? m[2]).toLowerCase());
  return anchors;
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

/**
 * Why a link that failed against the tracked tree failed (obs #164). Only
 * `untracked` is benign — the QA read-back stages it and checks again — so
 * every state that is not certainly "on disk, inside the repository, and
 * committable" must be something else:
 *   - `untracked`    — on disk under that exact name, not ignored: commit it.
 *   - `ignored`      — on disk, but gitignored: it can NEVER be committed and CI
 *                      stays red (TASK-149 CR-2).
 *   - `outside-repo` — resolves above the repository root: no commit carries it
 *                      (TASK-149-BUG-4).
 *   - `missing`      — not on disk under that exact name. The name is compared
 *                      component by component against the directory listing, so a
 *                      case-insensitive filesystem cannot read `Report.md` as
 *                      `report.md` here and pass a link that is dead on Linux CI
 *                      (TASK-149-BUG-4).
 *   - `unverifiable` — `git check-ignore` answered neither yes (0) nor no (1).
 * With no tracked set (outside a repository) the check already read the disk,
 * so only `missing` is possible there.
 */
function linkState(tracked, base, resolved) {
  if (!tracked) return "missing";
  if (resolved === ".." || resolved.startsWith("../")) return "outside-repo";
  if (!existsExactly(base, resolved)) return "missing";
  // TASK-149 CR3-1 — a readdir listing names a symlink whether or not it
  // resolves. A link to a symlink is committable only when the symlink leads to
  // something real inside the repository; a checkout of a dangling one, or of
  // one that leaves the repository, resolves to nothing.
  if (fs.lstatSync(path.join(base, resolved)).isSymbolicLink()) {
    let real;
    try {
      real = fs.realpathSync(path.join(base, resolved));
    } catch {
      return "missing";
    }
    if (!isWithin(fs.realpathSync(base), real)) return "outside-repo";
  }
  const r = spawnSync("git", ["check-ignore", "-q", "--", resolved], {
    cwd: base,
  });
  if (r.status === 0) return "ignored";
  if (r.status === 1) return "untracked";
  return "unverifiable";
}

/** Every component of `rel` exists under `base` with exactly this spelling. */
function existsExactly(base, rel) {
  let dir = base;
  for (const part of rel.split("/").filter(Boolean)) {
    let names;
    try {
      names = fs.readdirSync(dir);
    } catch {
      return false;
    }
    if (!names.includes(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

// One directory set per tracked set: a caller walking thousands of documents
// passes the same `tracked` to each call, and rebuilding this per call was most
// of a repository-wide walk's time (task 231 measured 8.7 s of 9.2 s). Keyed on
// the Set object — a fresh trackedSet() is a fresh key, so nothing goes stale.
const DIR_SETS = new WeakMap();
function dirSet(tracked) {
  const cached = DIR_SETS.get(tracked);
  if (cached) return cached;
  const dirs = new Set();
  for (const f of tracked) {
    let d = path.posix.dirname(f);
    while (d && d !== "." && !dirs.has(d)) {
      dirs.add(d);
      d = path.posix.dirname(d);
    }
  }
  DIR_SETS.set(tracked, dirs);
  return dirs;
}

// The tracked paths whose index entry is a symlink (mode 120000), per tracked
// set, read lazily — only a document with a cross-file fragment pays for it.
// A symlink's index blob is its target PATH, not the file's text, so reading
// it for anchors finds none (TASK-231-CR-1: `git show :CLAUDE.md` is
// "AGENTS.md"). null when git cannot answer.
const SYMLINK_SETS = new WeakMap();
function symlinkSet(tracked, base) {
  if (SYMLINK_SETS.has(tracked)) return SYMLINK_SETS.get(tracked);
  const out = git(["ls-files", "-s", "-z", "--full-name"], base);
  const links =
    out === null
      ? null
      : new Set(
          out
            .split("\0")
            .filter((e) => e.startsWith("120000 "))
            .map((e) => e.slice(e.indexOf("\t") + 1)),
        );
  SYMLINK_SETS.set(tracked, links);
  return links;
}

const toPosix = (p) => p.split(path.sep).join("/");

/**
 * True when `child` is `parent` or lies beneath it — the CommonJS definition of
 * the containment test; qa-execute-snippets.mjs isWithin() is the ESM one, and
 * a parity test holds the two to one case table (task.158). `..name` is a child,
 * not an escape: only `..` itself or a `../` prefix leaves (TASK-149 CR6-4).
 * Pure — no filesystem access.
 */
function isWithin(parent, child) {
  const rel = path.relative(parent, child);
  return !(
    rel === ".." ||
    rel.startsWith(`..${path.sep}`) ||
    path.isAbsolute(rel)
  );
}

/**
 * Check one document. `file` is relative to `root` (default: cwd) or absolute.
 * Resolution is anchored at the repository root containing `root` when there
 * is one. A caller walking many documents passes `tracked` (from
 * `trackedSet(repoRoot)`) so `git ls-files` runs once; `null` means "not a
 * repo" and is honoured, not re-derived.
 *
 * Returns { file, root, links, anchorsChecked, resolved,
 *           broken: [{ line, target, resolved, state }], unterminatedFence,
 *           tracked }.
 */
function checkDocument(
  file,
  { root = process.cwd(), tracked: trackedIn, repo: repoIn } = {},
) {
  // realpath on both ends: macOS answers `git rev-parse --show-toplevel` under
  // /private/var for a /var/… cwd, and path.relative across that symlink
  // yields a ../../../../var/… "relative" path that resolves nowhere. Each
  // realpath names its own operand on failure (QA cycle 4, CR-8).
  let startDir;
  try {
    startDir = fs.realpathSync(path.resolve(root));
  } catch (e) {
    throw new Error(`--root ${root}: ${e.message}`);
  }
  let abs;
  try {
    abs = fs.realpathSync(
      path.isAbsolute(file) ? file : path.join(startDir, file),
    );
  } catch (e) {
    throw new Error(`--file ${file}: ${e.message}`);
  }
  // A caller walking many documents passes `repo` with `tracked` so
  // rev-parse runs once, not per document (QA cycle 4, CR-6).
  const repo =
    repoIn !== undefined
      ? repoIn
      : trackedIn === undefined || trackedIn
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
  // Anchors per target file, read once per call (a document links one target
  // many times). The index blob when tracked; the disk otherwise. A tracked
  // symlink is followed to the file it names, inside the repository and at
  // most 8 links deep; one that leaves the repository or loops answers null,
  // as an unreadable target does (TASK-231-CR-1).
  const anchorCache = new Map();
  const anchorsFor = (relPath, depth = 0) => {
    if (anchorCache.has(relPath)) return anchorCache.get(relPath);
    const isTracked = tracked && tracked.has(relPath);
    if (isTracked && symlinkSet(tracked, base)?.has(relPath)) {
      const to = git(["show", `:${relPath}`], base);
      const next =
        to === null || path.posix.isAbsolute(to)
          ? null
          : path.posix.normalize(
              path.posix.join(path.posix.dirname(relPath), to),
            );
      const set =
        next === null || next === ".." || next.startsWith("../") || depth >= 8
          ? null
          : anchorsFor(next, depth + 1);
      anchorCache.set(relPath, set);
      return set;
    }
    let body = isTracked ? git(["show", `:${relPath}`], base) : null;
    if (body === null) {
      try {
        body = fs.readFileSync(path.join(base, relPath), "utf8");
      } catch {
        body = null;
      }
    }
    const set = body === null ? null : anchorsOf(body);
    anchorCache.set(relPath, set);
    return set;
  };
  const fragmentOf = (target) => {
    const i = target.indexOf("#");
    return i < 0 ? "" : decodeSafe(target.slice(i + 1)).toLowerCase();
  };
  // Every link's repository-relative resolved path, resolved or not — so a
  // caller can ask "does this document link X?" with the one resolution rule
  // below rather than a second one (task.158: qa-read-back's this-cycle check).
  const resolvedAll = [];
  // How many fragments were checked against an anchor set — a caller's
  // non-vacuity floor, since zero `no-anchor` is also what a blind check reports.
  let anchorsChecked = 0;
  for (const { target, line } of links) {
    const noFragment = target.split("#")[0];
    if (noFragment === "") continue;
    const resolved = path.posix
      .normalize(
        path.posix.join(path.posix.dirname(rel), decodeSafe(noFragment)),
      )
      .replace(/\/$/, "");
    resolvedAll.push(resolved);
    const exists = tracked
      ? tracked.has(resolved) || dirs.has(resolved)
      : fs.existsSync(path.join(base, resolved));
    if (!exists) {
      broken.push({
        line,
        target,
        resolved,
        state: linkState(tracked, base, resolved),
      });
      continue;
    }
    const fragment = fragmentOf(target);
    if (fragment && resolved.endsWith(".md")) {
      const anchors = anchorsFor(resolved);
      if (anchors) anchorsChecked += 1;
      if (anchors && !anchors.has(fragment))
        broken.push({ line, target, resolved, state: "no-anchor" });
    }
  }
  let own = null;
  for (const { target, line } of sameFileFragments(text)) {
    anchorsChecked += 1;
    own ??= anchorsOf(text);
    if (!own.has(fragmentOf(target)))
      broken.push({ line, target, resolved: rel, state: "no-anchor" });
  }
  broken.sort((a, b) => a.line - b.line);
  return {
    file: rel,
    root: base,
    links: links.length,
    anchorsChecked,
    resolved: resolvedAll,
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
    return usage(json, e.message);
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
      `✖ ${result.file}:${b.line} → ${b.target} (resolves to ${b.resolved}) [${b.state}]\n`,
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
  sameFileFragments,
  anchorsOf,
  githubSlug,
  checkDocument,
  repoRoot,
  trackedSet,
  isWithin,
  main,
};

// process.exitCode, never a hard exit: exiting after a stdout write truncates
// the write at ~64KB when the caller pipes it (bug.3; the repo guard is red on
// any new file that does it).
if (require.main === module) process.exitCode = main(process.argv.slice(2));
