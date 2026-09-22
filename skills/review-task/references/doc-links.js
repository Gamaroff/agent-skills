// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/doc-links.js. Regenerate via `npm run bundle`.
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
 *   node doc-links.js --file <path> [--json] [--root <repo-root>]
 *     exit 0, reason `ok`      — every relative link resolves (or there are none)
 *     exit 1, reason `broken`  — at least one does not; each is printed as
 *                                `✖ <file>:<line> → <target>` and the summary
 *                                line reads `FAIL doc-links: N dead link(s) in <file>`
 *                                (the ✖ / FAIL markers are what
 *                                finalise-fix-and-recheck.mjs reads as red, so a
 *                                pre-fix run of this CLI is a mutation-proof run)
 *     exit 2, reason `usage`   — no --file, or the file is unreadable
 *
 * Resolution is against `git ls-files` (the tracked tree), never the working
 * tree: a file present on disk but untracked resolves locally and fails in CI,
 * which is the failure that cannot be reproduced by running the same command
 * in the same directory (tests/bundled-links.test.js, task.108). Outside a git
 * repository the disk is used and `tracked: false` is reported, so the reader
 * knows which question was answered.
 *
 * Extraction rules match tests/bundled-links.test.js: fenced blocks (``` / ~~~,
 * line-based, closer at least as long as the opener) and inline code spans are
 * skipped, so `[not](a-link.md)` inside backticks is not a link; `#anchor`,
 * `mailto:`, absolute URLs and protocol-relative targets are not relative links.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const LINK_RE = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const NOT_RELATIVE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

function stripCodeSpans(line) {
  // Longest-run-first so ``x`` does not leave a stray backtick behind.
  return line.replace(/(`+)[^`]*?\1/g, (m) => " ".repeat(m.length));
}

/** [{ target, line }] for every relative link outside fences and code spans. */
function extractRelativeLinks(text) {
  const out = [];
  let fence = null; // the opener's marker string while inside a fence
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const f = FENCE_RE.exec(line);
    if (f) {
      const marker = f[1];
      if (!fence) {
        fence = marker;
        continue;
      }
      // Same character and at least as long closes the fence.
      if (marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null;
        continue;
      }
    }
    if (fence) continue;
    const stripped = stripCodeSpans(line);
    let m;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(stripped)) !== null) {
      const target = m[1];
      if (NOT_RELATIVE_RE.test(target)) continue;
      out.push({ target, line: i + 1 });
    }
  }
  return out;
}

function decodeSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** The tracked set, or null when git cannot answer (not a repo, no git). */
function trackedSet(root) {
  const r = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return new Set(r.stdout.split("\0").filter(Boolean));
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

/**
 * Check one document. `file` is repo-relative (or absolute under `root`).
 * Returns { file, links, broken: [{ line, target, resolved }], tracked }.
 */
function checkDocument(
  file,
  { root = process.cwd(), tracked: trackedIn } = {},
) {
  const abs = path.isAbsolute(file) ? file : path.join(root, file);
  const rel = path.relative(root, abs).split(path.sep).join("/");
  const text = fs.readFileSync(abs, "utf8");
  const links = extractRelativeLinks(text);
  // A caller walking many documents passes one tracked set; `null` means "not a
  // repo" and is honoured, not re-derived.
  const tracked = trackedIn === undefined ? trackedSet(root) : trackedIn;
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
      : fs.existsSync(path.join(root, resolved));
    if (!exists) broken.push({ line, target, resolved });
  }
  return { file: rel, links: links.length, broken, tracked: tracked !== null };
}

function main(argv) {
  let file = null;
  let json = false;
  let root = process.cwd();
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--file") file = argv[++i];
    else if (a === "--json") json = true;
    else if (a === "--root") root = path.resolve(argv[++i]);
    else {
      process.stderr.write(`doc-links: unknown argument ${a}\n`);
      return 2;
    }
  }
  if (!file) {
    process.stderr.write(
      "usage: doc-links.js --file <path> [--json] [--root <repo-root>]\n",
    );
    if (json)
      process.stdout.write(
        JSON.stringify({ reason: "usage", exitCode: 2 }) + "\n",
      );
    return 2;
  }
  let result;
  try {
    result = checkDocument(file, { root });
  } catch (e) {
    process.stderr.write(`doc-links: cannot read ${file}: ${e.message}\n`);
    if (json)
      process.stdout.write(
        JSON.stringify({ reason: "usage", exitCode: 2, error: e.message }) +
          "\n",
      );
    return 2;
  }
  const reason = result.broken.length ? "broken" : "ok";
  const exitCode = result.broken.length ? 1 : 0;
  if (json) {
    process.stdout.write(
      JSON.stringify({ reason, exitCode, ...result }, null, 2) + "\n",
    );
  } else {
    for (const b of result.broken) {
      process.stdout.write(
        `✖ ${result.file}:${b.line} → ${b.target} (resolves to ${b.resolved})\n`,
      );
    }
    if (result.broken.length) {
      process.stdout.write(
        `FAIL doc-links: ${result.broken.length} dead link(s) in ${result.file}\n`,
      );
    } else {
      process.stdout.write(
        `ok doc-links: ${result.links} relative link(s) in ${result.file} resolve${result.tracked ? "" : " (disk, not tracked tree)"}\n`,
      );
    }
  }
  return exitCode;
}

module.exports = { extractRelativeLinks, checkDocument, trackedSet, main };

if (require.main === module) process.exit(main(process.argv.slice(2)));
