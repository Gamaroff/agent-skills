#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/finding-anchors.js. Regenerate via `npm run bundle`.
/**
 * finding-anchors — check that every `path:line` a reviewer reported points at a
 * real line of the file under review, and that the line says what the reviewer
 * quoted.
 *
 * task.194. On `/review-pr 594` the shared code reviewer reported all six of its
 * findings at PATCH-file line numbers (`slugify.js:77` for an 11-line file), and
 * nothing downstream noticed: `/review-pr` copied the number into its
 * machine-readable `ref`, `--inline` tried to anchor on it, and the QA skills
 * render the same field into their reports. The prompt now names the coordinate
 * (code-review-prompt.md § Output contract: the PR-head line, never the patch
 * line) and asks for `line_text`. This engine is the half that does not depend on
 * the reviewer obeying: one checker, four callers (`/review-pr`, `/review-code`,
 * `/qa-task`, `/qa-story`), run on the parsed findings before anything renders,
 * posts or gates on them.
 *
 * ## It reports; it never repairs
 *
 * Re-mapping a patch line to the source line is possible, and would hide the
 * reviewer defect this exists to make visible. A malformed anchor is marked by
 * the caller (`⚠️ unverified anchor`) and kept — never dropped, never posted inline
 * as fact.
 *
 * ## Verdicts
 *
 *   ok              the line exists and `line_text` matches it — both sides have
 *                   whitespace runs collapsed and are trimmed, and `line_text`
 *                   may be a substring of the line (a reviewer quoting part of a
 *                   long line is not wrong)
 *   unchecked-text  the line exists; no `line_text` was given (range checked only)
 *   no-line         a conformance `ref` that is not `path:line`: an AC id, a bare path,
 *                   a frontmatter field, or a compound `ref` (`AC-3 / x.js:8`). Nothing
 *                   to verify, which is correct for a criterion reference
 *   no-such-file    the path does not exist in the tree being checked (or climbs
 *                   out of `--root`)
 *   out-of-range    the line is < 1 or past the file's last line
 *   text-mismatch   the line exists but does not say `line_text`
 *   unparseable     a code `file_line` that is not `path:line` — a bare path, a range
 *                   (`x.ts:42-58`), empty, absent. The code lens's contract is one line, so a
 *                   value that does not parse is the reviewer breaking it (task.195)
 *
 * The first three are clean; the last four are malformed — "the reviewer is
 * wrong" — and are kept apart from `no-line` ("nothing to verify") on purpose.
 *
 * ## Which lens — the wrapper when there is one, else the key
 *
 * A finding under `code_review.findings` is a code-lens finding and one under
 * `pr_conformance.findings` a conformance finding, whatever keys it carries: a code finding that
 * has lost its `file_line` is still a code finding with no location, and keying on the missing key
 * would read it as a clean conformance `no-line` (task.195 QA cycle 1). A bare array has no wrapper,
 * so there the key decides — `file_line` is code, `ref` alone conformance. Only a conformance `ref`
 * may legitimately not be a line: `AC-3` is a criterion, but a `file_line` of `src/x.ts`, or none,
 * is a high-confidence bug with no usable location (task.195).
 *
 * A path never contains whitespace, so the anchor pattern is `^(\S+):(-?\d+)$`.
 * Review 1 of task.194 found that a lazy `^(.+?):` parsed the conformance lens's
 * real output `AC-3 / scripts/smoke/slugify.js:8` as a path called
 * `AC-3 / scripts/smoke/slugify.js` and reported `no-such-file`.
 *
 * ## Which tree
 *
 * `--rev <rev>` reads each file with `git cat-file blob <rev>:./<path>` from `--root`, so a
 * merged PR, a fork, or a branch other than the one checked out is checked against the tree
 * that was reviewed; `--root` must itself be in that commit (`git cat-file -t <rev>:./` reads
 * `tree`), or every finding would read `no-such-file` (task.195). `--index` reads the staged
 * content with `git cat-file blob :./<path>` — the tree a `--staged` review diffed — and is a
 * usage error together with `--rev`. With neither, it reads the working tree under `--root`.
 * Every route resolves the path relative to `--root`.
 * Callers pick (task.194 § Callers): `/review-pr` the PR head, `/qa-*` `HEAD`,
 * `/review-code` nothing for a working-tree review, `--index` for `--staged`.
 *
 * Usage:
 *   node finding-anchors.js --findings-file <json> [--root <dir>] [--rev <git-rev> | --index]
 *                           [--annotate <out-file>] [--json]
 *
 * The findings file is `{code_review:{findings:[…]}}`, `{pr_conformance:{findings:[…]}}`,
 * both together, or a bare array of findings. `--annotate` writes the same JSON back
 * to `<out-file>` (which may be the input) with each finding carrying
 * `anchor_check: <verdict>`. The key is `anchor_check`, not `anchor`: `/review-pr`'s
 * `--inline` jq already uses `anchor` for the `path:line`.
 *
 * Exit codes: 0 every anchor is ok / unchecked-text / no-line (`reason: ok`);
 * 1 any is malformed (`reason: malformed-anchors`) — a caller marks and continues,
 * it does not halt; 2 the call is wrong — usage (`reason: usage`), a `--root` that is not a
 * directory, is not in the `--rev` tree, or (with `--index`) is not in a git work tree
 * (`reason: bad-root`), or a `--rev` that does not name a commit in it (`reason: bad-rev`). The last two are "could not look", which is not the reviewer's fault
 * and must never read as `no-such-file` (`checkTree()`).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const MALFORMED = new Set([
  "no-such-file",
  "out-of-range",
  "text-mismatch",
  "unparseable",
]);

/**
 * `{lens, path, line}` for a `path:line` anchor, or `{lens, path: null}` when the value does not
 * parse. `lens` is the wrapper's, from `lensesOf`; without one the KEY decides: `file_line` is the
 * code lens, `ref` alone the conformance lens (task.195).
 */
function anchorOf(finding, lens) {
  if (lens !== "code" && lens !== "conformance") {
    lens = Object.prototype.hasOwnProperty.call(finding, "file_line")
      ? "code"
      : "conformance";
  }
  const raw = lens === "code" ? finding.file_line : finding.ref;
  const m = /^(\S+):(-?\d+)$/.exec(String(raw ?? "").trim());
  return m ? { lens, path: m[1], line: Number(m[2]) } : { lens, path: null };
}

const norm = (s) => String(s).replace(/\s+/g, " ").trim();

/**
 * Pure: one verdict per finding, in input order. `readFile(path)` returns the
 * file's text or null, and is called at most once per distinct path. `lenses` is `lensesOf(doc)`,
 * parallel to `findings`; null (a bare array) lets each finding's key decide.
 */
function checkAnchors(findings, { readFile, lenses = null }) {
  const cache = new Map();
  return findings.map((f, i) => {
    const id = f.id ?? null;
    const a = anchorOf(f, lenses?.[i]);
    if (a.path === null) {
      return a.lens === "code"
        ? { id, verdict: "unparseable", fileLine: f.file_line ?? null }
        : { id, verdict: "no-line" };
    }
    const { lens, ...at } = a; // the verdict reports where, not which lens
    if (!cache.has(at.path)) cache.set(at.path, readFile(at.path));
    const text = cache.get(at.path);
    if (text == null) return { id, verdict: "no-such-file", ...at };
    const lines = text.split("\n");
    if (text.endsWith("\n")) lines.pop(); // the trailing newline is not a line
    if (at.line < 1 || at.line > lines.length) {
      return { id, verdict: "out-of-range", ...at, lineCount: lines.length };
    }
    if (f.line_text == null || norm(f.line_text) === "") {
      return { id, verdict: "unchecked-text", ...at };
    }
    const actual = norm(lines[at.line - 1]);
    return actual.includes(norm(f.line_text))
      ? { id, verdict: "ok", ...at }
      : { id, verdict: "text-mismatch", ...at, expected: f.line_text, actual };
  });
}

/** Every finding in the accepted input shapes, in a stable order: code lens, then conformance. */
function findingsOf(doc) {
  if (Array.isArray(doc)) return doc;
  if (!doc || typeof doc !== "object") return null;
  // Every lens present must hold an array, not just one of them: a non-array beside a valid one
  // would drop that lens's findings unseen and read as a clean run (task.195 DoD 1). A lens that
  // did not run is absent or null.
  const lenses = [doc.code_review, doc.pr_conformance].filter((w) => w != null);
  if (lenses.length === 0 || !lenses.every((w) => Array.isArray(w.findings)))
    return null;
  return lenses.flatMap((w) => w.findings);
}

/** The lens of each finding `findingsOf(doc)` returns, by wrapper; null for a bare array. */
function lensesOf(doc) {
  if (Array.isArray(doc) || !doc || typeof doc !== "object") return null;
  const n = (a) => (Array.isArray(a) ? a.length : 0);
  return [
    ...Array(n(doc.code_review?.findings)).fill("code"),
    ...Array(n(doc.pr_conformance?.findings)).fill("conformance"),
  ];
}

/**
 * The commit `rev` names, or null when it does not resolve. Called once, before any file is read:
 * a rev that does not resolve is "could not look", and reading through it would report every
 * finding `no-such-file` — the reviewer blamed for the caller's unfetched head (task.194 QA
 * cycle 1, CR-1).
 */
function resolveRev(root, rev, exec = execFileSync) {
  try {
    const sha = exec(
      "git",
      ["rev-parse", "--verify", "--quiet", `${rev}^{commit}`],
      {
        cwd: path.resolve(root),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    return sha || null;
  } catch {
    return null;
  }
}

/**
 * The one preflight for "could not look" (task.194 QA cycles 1–2). Before any anchor is read, the
 * tree under review must exist: --root an existing directory, and --rev (when given) a commit in it.
 * Either failure is the CALLER's, never the reviewer's, so it exits 2 with its own reason instead of
 * reading every finding as `no-such-file` — cycle 1 closed that for --rev (CR-1) and cycle 2 found
 * it again for --root (CR2-2), which is why both now pass through this one function.
 * task.195 widened it, rather than adding a second preflight: with --rev the root must also be in
 * that commit (a root on disk but not in the rev read every finding `no-such-file`), and with
 * --index the root must be inside a git work tree.
 * Returns { ok: true, rev } with `rev` the resolved SHA (or null), or { ok: false, reason, message }.
 */
function checkTree({ root, rev, index }, exec = execFileSync) {
  const absRoot = path.resolve(root);
  let isDir = false;
  try {
    isDir = fs.statSync(absRoot).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    return {
      ok: false,
      reason: "bad-root",
      message: `--root '${root}' is not a directory — pass the root of the tree that was reviewed; no anchor was checked`,
    };
  }
  const git = (args) =>
    exec("git", args, {
      cwd: absRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  if (index) {
    let inside = "";
    try {
      inside = git(["rev-parse", "--is-inside-work-tree"]);
    } catch {
      inside = "";
    }
    if (inside !== "true") {
      return {
        ok: false,
        reason: "bad-root",
        message: `--root '${root}' is not inside a git work tree, so --index has no staged content to read; no anchor was checked`,
      };
    }
    return { ok: true, rev: null };
  }
  if (!rev) return { ok: true, rev: null };
  const sha = resolveRev(absRoot, rev, exec);
  if (!sha) {
    return {
      ok: false,
      reason: "bad-rev",
      message: `--rev '${rev}' does not name a commit in ${absRoot} — fetch it, or pass the revision that was reviewed; no anchor was checked`,
    };
  }
  // The root must be in that commit too. `<sha>:./` resolves relative to the cwd, so from a root
  // that exists on disk but not in the rev it fails (rc 128, "exists on disk, but not in …").
  let type = "";
  try {
    type = git(["cat-file", "-t", `${sha}:./`]);
  } catch {
    type = "";
  }
  if (type !== "tree") {
    return {
      ok: false,
      reason: "bad-root",
      message: `--root '${root}' is not in ${rev} — pass the root of the tree that was reviewed; no anchor was checked`,
    };
  }
  return { ok: true, rev: sha };
}

function makeReader({ root, rev, index, exec = execFileSync }) {
  const absRoot = path.resolve(root);
  // Containment is judged on REAL paths in the working tree: a lexical check alone passes a
  // symlink inside the root whose target is outside it (task.194 QA cycle 1, SEC-1). With --rev,
  // git returns a symlink's link text, never its target, so the lexical check suffices.
  let realRoot = null;
  try {
    realRoot = fs.realpathSync(absRoot);
  } catch {
    realRoot = null;
  }
  return (p) => {
    const abs = path.resolve(absRoot, p);
    // A reviewer path that climbs out of the root names no file in the tree under review.
    if (abs !== absRoot && !abs.startsWith(absRoot + path.sep)) return null;
    if (rev || index) {
      // Every git route resolve a path against --root. `<rev>:./<rel>` is relative to the cwd, which is
      // the root; a bare `<rev>:<rel>` is relative to the repository top level, which silently
      // ignored a --root below it (QA cycle 2, CR2-1). `cat-file blob` refuses a tree, where
      // `git show` printed a directory listing that read as a file (CR2-4).
      try {
        const rel = path.relative(absRoot, abs).split(path.sep).join("/");
        // `:./<rel>` is the index entry (stage 0) — the content a `--staged` review diffed.
        const spec = index ? `:./${rel}` : `${rev}:./${rel}`;
        return exec("git", ["cat-file", "blob", spec], {
          cwd: absRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          maxBuffer: 64 * 1024 * 1024,
        });
      } catch {
        return null;
      }
    }
    try {
      const real = fs.realpathSync(abs);
      if (
        !realRoot ||
        (real !== realRoot && !real.startsWith(realRoot + path.sep))
      ) {
        return null;
      }
      return fs.readFileSync(real, "utf8");
    } catch {
      return null;
    }
  };
}

function parseArgs(argv) {
  const opts = { root: process.cwd(), json: false, index: false };
  const takes = {
    "--findings-file": "findingsFile",
    "--root": "root",
    "--rev": "rev",
    "--annotate": "annotate",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--index") opts.index = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (takes[a]) {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--"))
        return { error: `${a} needs a value` };
      opts[takes[a]] = v;
    } else return { error: `unknown argument: ${a}` };
  }
  return opts;
}

function emit(opts, payload) {
  if (opts.json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  else {
    process.stdout.write(`${payload.reason}: ${payload.message}\n`);
    for (const r of payload.results || []) {
      if (MALFORMED.has(r.verdict)) {
        process.stdout.write(
          `  ⚠️ ${r.id ?? "?"} ${r.path === undefined ? JSON.stringify(r.fileLine ?? null) : `${r.path}:${r.line}`} — ${r.verdict}\n`,
        );
      }
    }
  }
  process.exitCode = payload.exitCode;
}

function usage(opts, message) {
  const payload = {
    reason: "usage",
    message:
      message === "help"
        ? "node finding-anchors.js --findings-file <json> [--root <dir>] [--rev <git-rev> | --index] [--annotate <out-file>] [--json]"
        : message,
    exitCode: 2,
  };
  if (opts && opts.json) emit(opts, payload);
  else {
    process.stderr.write(`finding-anchors: ${payload.message}\n`);
    process.exitCode = 2;
  }
}

function run(argv, deps = {}) {
  const opts = parseArgs(argv);
  if (opts.error) return usage({ json: argv.includes("--json") }, opts.error);
  if (opts.help) return usage(opts, "help");
  if (!opts.findingsFile) return usage(opts, "--findings-file is required");
  if (opts.index && opts.rev) {
    return usage(
      opts,
      "--index and --rev name two different trees — pass one: --index for a staged review, --rev for a commit",
    );
  }
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(opts.findingsFile, "utf8"));
  } catch (err) {
    return usage(
      opts,
      `--findings-file could not be read as JSON: ${err.message}`,
    );
  }
  const findings = findingsOf(doc);
  if (!findings) {
    return usage(
      opts,
      "--findings-file holds no findings array for every lens present (code_review.findings, pr_conformance.findings, or a bare array)",
    );
  }
  const tree = checkTree(
    { root: opts.root, rev: opts.rev, index: opts.index },
    deps.exec,
  );
  if (!tree.ok) {
    return emit(opts, {
      reason: tree.reason,
      message: tree.message,
      root: opts.root,
      rev: opts.rev ?? null,
      index: opts.index,
      exitCode: 2,
    });
  }
  const readFile = makeReader({
    root: opts.root,
    rev: tree.rev,
    index: opts.index,
    exec: deps.exec,
  });
  const results = checkAnchors(findings, {
    readFile,
    lenses: lensesOf(doc),
  });
  const malformed = results.filter((r) => MALFORMED.has(r.verdict));

  if (opts.annotate) {
    findings.forEach((f, i) => {
      if (f && typeof f === "object") f.anchor_check = results[i].verdict;
    });
    fs.writeFileSync(opts.annotate, JSON.stringify(doc, null, 2) + "\n");
  }

  emit(opts, {
    reason: malformed.length ? "malformed-anchors" : "ok",
    message: malformed.length
      ? `${malformed.length} of ${results.length} anchor(s) do not point at the line they name — mark them, do not drop them`
      : `${results.length} finding(s) checked; every path:line anchor resolves`,
    rev: opts.rev ?? null,
    index: opts.index,
    annotated: opts.annotate ?? null,
    results,
    exitCode: malformed.length ? 1 : 0,
  });
}

module.exports = {
  anchorOf,
  checkAnchors,
  findingsOf,
  lensesOf,
  makeReader,
  parseArgs,
  run,
  MALFORMED,
  resolveRev,
  checkTree,
};

if (require.main === module) {
  try {
    run(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(
      `finding-anchors: ${err && err.stack ? err.stack : err}\n`,
    );
    process.exitCode = 2;
  }
}
