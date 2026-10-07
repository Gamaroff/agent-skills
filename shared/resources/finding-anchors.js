#!/usr/bin/env node
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
 *   no-line         the anchor is not `path:line`: an AC id, a bare path, a range
 *                   (`x.ts:42-58`), or a compound `ref` (`AC-3 / x.js:8`). Nothing
 *                   to verify, which is correct for a criterion reference
 *   no-such-file    the path does not exist in the tree being checked (or climbs
 *                   out of `--root`)
 *   out-of-range    the line is < 1 or past the file's last line
 *   text-mismatch   the line exists but does not say `line_text`
 *
 * The first three are clean; the last three are malformed — "the reviewer is
 * wrong" — and are kept apart from `no-line` ("nothing to verify") on purpose.
 *
 * A path never contains whitespace, so the anchor pattern is `^(\S+):(-?\d+)$`.
 * Review 1 of task.194 found that a lazy `^(.+?):` parsed the conformance lens's
 * real output `AC-3 / scripts/smoke/slugify.js:8` as a path called
 * `AC-3 / scripts/smoke/slugify.js` and reported `no-such-file`.
 *
 * ## Which tree
 *
 * `--rev <rev>` reads each file with `git show <rev>:<path>`, so a merged PR, a
 * fork, or a branch other than the one checked out is checked against the tree
 * that was reviewed. Without `--rev` it reads the working tree under `--root`.
 * Callers pick (task.194 § Callers): `/review-pr` the PR head, `/qa-*` `HEAD`,
 * `/review-code` nothing for a working-tree review.
 *
 * Usage:
 *   node finding-anchors.js --findings-file <json> [--root <dir>] [--rev <git-rev>]
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
 * it does not halt; 2 usage (`reason: usage`).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const MALFORMED = new Set(["no-such-file", "out-of-range", "text-mismatch"]);

/** `{path, line}` for a `path:line` anchor, or null. `file_line` (code lens) wins over `ref` (conformance lens). */
function anchorOf(finding) {
  const raw = finding.file_line ?? finding.ref ?? "";
  const m = /^(\S+):(-?\d+)$/.exec(String(raw).trim());
  return m ? { path: m[1], line: Number(m[2]) } : null;
}

const norm = (s) => String(s).replace(/\s+/g, " ").trim();

/**
 * Pure: one verdict per finding, in input order. `readFile(path)` returns the
 * file's text or null, and is called at most once per distinct path.
 */
function checkAnchors(findings, { readFile }) {
  const cache = new Map();
  return findings.map((f) => {
    const id = f.id ?? null;
    const a = anchorOf(f);
    if (!a) return { id, verdict: "no-line" };
    if (!cache.has(a.path)) cache.set(a.path, readFile(a.path));
    const text = cache.get(a.path);
    if (text == null) return { id, verdict: "no-such-file", ...a };
    const lines = text.split("\n");
    if (text.endsWith("\n")) lines.pop(); // the trailing newline is not a line
    if (a.line < 1 || a.line > lines.length) {
      return { id, verdict: "out-of-range", ...a, lineCount: lines.length };
    }
    if (f.line_text == null || norm(f.line_text) === "") {
      return { id, verdict: "unchecked-text", ...a };
    }
    const actual = norm(lines[a.line - 1]);
    return actual.includes(norm(f.line_text))
      ? { id, verdict: "ok", ...a }
      : { id, verdict: "text-mismatch", ...a, expected: f.line_text, actual };
  });
}

/** Every finding in the accepted input shapes, in a stable order: code lens, then conformance. */
function findingsOf(doc) {
  if (Array.isArray(doc)) return doc;
  if (!doc || typeof doc !== "object") return null;
  const cr = doc.code_review?.findings;
  const pc = doc.pr_conformance?.findings;
  if (!Array.isArray(cr) && !Array.isArray(pc)) return null;
  return [...(Array.isArray(cr) ? cr : []), ...(Array.isArray(pc) ? pc : [])];
}

function makeReader({ root, rev, exec = execFileSync }) {
  const absRoot = path.resolve(root);
  return (p) => {
    const abs = path.resolve(absRoot, p);
    // A reviewer path that climbs out of the root names no file in the tree under review.
    if (abs !== absRoot && !abs.startsWith(absRoot + path.sep)) return null;
    if (rev) {
      try {
        const rel = path.relative(absRoot, abs).split(path.sep).join("/");
        return exec("git", ["show", `${rev}:${rel}`], {
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
      return fs.readFileSync(abs, "utf8");
    } catch {
      return null;
    }
  };
}

function parseArgs(argv) {
  const opts = { root: process.cwd(), json: false };
  const takes = {
    "--findings-file": "findingsFile",
    "--root": "root",
    "--rev": "rev",
    "--annotate": "annotate",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
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
          `  ⚠️ ${r.id ?? "?"} ${r.path}:${r.line} — ${r.verdict}\n`,
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
        ? "node finding-anchors.js --findings-file <json> [--root <dir>] [--rev <git-rev>] [--annotate <out-file>] [--json]"
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
      "--findings-file holds no findings array (code_review.findings, pr_conformance.findings, or a bare array)",
    );
  }
  const readFile = makeReader({
    root: opts.root,
    rev: opts.rev,
    exec: deps.exec,
  });
  const results = checkAnchors(findings, { readFile });
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
    annotated: opts.annotate ?? null,
    results,
    exitCode: malformed.length ? 1 : 0,
  });
}

module.exports = {
  anchorOf,
  checkAnchors,
  findingsOf,
  makeReader,
  parseArgs,
  run,
  MALFORMED,
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
