#!/usr/bin/env node
"use strict";
/**
 * prepass-axes — which domains and standards does THIS repository's
 * architecture define? (task 151, obs #130)
 *
 * The review pre-pass's Agent B compares a document against architecture docs
 * on a list of axes. That list used to be hard-coded for a web stack
 * ("backend / frontend / auth / payments / real-time", "API endpoints or
 * payloads"), so on a shell/Node repository the agent answered `aligned`
 * against axes the repository never defined. This helper derives the lists from
 * the consumer's own `concepts/` docs instead:
 *
 *   domains ← the H2 headings of concepts/tech-stack.md
 *   axes    ← the H2 headings of concepts/coding-standards.md
 *
 * `See also` is dropped from both. Headings inside fenced blocks are code, not
 * structure — the fence tracker is jira-sync.js's, reused rather than restated.
 *
 * `source` says where the lists came from:
 *   architecture — both files were read and each yielded at least one heading
 *   partial      — one half did; the other takes the web-stack fallback
 *   fallback     — neither did; the former hard-coded lists, unchanged
 *
 * A half "yields" only when its file exists AND has an H2. A file with no `## `
 * heading is treated exactly like a missing one: an empty list is nothing to
 * measure against, and labelling it `architecture` would dispatch Agent B with
 * blank slots under the strongest source label (task 151 QA cycle 1, CR-1).
 *
 * A missing file (ENOENT, or ENOTDIR when --arch names a file) is absence. Any
 * other read error — EACCES, EISDIR — is NOT absence: `deriveAxes` throws, and
 * the CLI exits 1 with nothing on stdout, so "no docs" and "could not read the
 * docs" stay distinguishable (CR-2).
 *
 * Pure and offline: reads at most two files, writes nothing, no network.
 *
 * Usage:
 *   node prepass-axes.js --arch <dir> [--json]
 *
 * Exit 0 on success (every `source` is a success). Exit 1 when a concepts file
 * exists but cannot be read (not absence — see above). Exit 2 on a usage error —
 * missing `--arch`, or an unknown flag — with the usage on stderr and nothing
 * on stdout, so a caller substituting stdout into a prompt never substitutes an
 * error message.
 */

const fs = require("fs");
const path = require("path");
const { makeFenceTracker } = require("./jira-sync.js");

// The former hard-coded lists, kept ONLY as the fallback for a repository with
// no usable concepts/ docs. They reproduce the prompt's former wording: the
// domain parenthetical, and axis 2's parenthetical (naming, layering, file
// placement). Axes 1, 3 and 4 are stack-neutral and stay in the template, so the
// fallback must not restate them inside axis 2 (CR-5).
const FALLBACK_DOMAINS = Object.freeze([
  "backend",
  "frontend",
  "auth",
  "payments",
  "real-time",
]);
const FALLBACK_AXES = Object.freeze(["naming", "layering", "file placement"]);
const SKIP = new Set(["see also"]);

const USAGE = "usage: prepass-axes.js --arch <dir> [--json]";

// The text of a CommonMark ATX level-2 heading, or null when the line is not
// one. ONE reader for "what is an axis heading", written to the spec rather
// than grown from the inputs each QA cycle happened to name (task 151 QA
// cycles 1–2: a regex that gained one edge case per cycle):
//   - up to 3 leading spaces (the fence tracker's own rule); 4+ is code
//   - exactly `##`, then a space or tab, or the end of the line — `##x` and
//     `###` are not H2s
//   - an optional closing sequence: a run of `#` preceded by a space or tab,
//     or making up the whole content (`## #`, `## ##` are EMPTY headings)
//   - surrounding whitespace is not content
// An empty heading returns "" — a heading, but never an axis.
function atxH2(line) {
  const m = /^ {0,3}##(?:[ \t]+(.*?))?[ \t]*$/.exec(line);
  if (!m) return null;
  let t = m[1] || "";
  if (/^#+$/.test(t)) return "";
  t = t.replace(/[ \t]+#+$/, "");
  return t.trim();
}

function h2s(text) {
  const isFence = makeFenceTracker();
  const out = [];
  for (const line of String(text).replace(/\r\n?/g, "\n").split("\n")) {
    if (isFence(line)) continue;
    const t = atxH2(line);
    // An empty heading is not an axis (C2-CR-1): it would reach Agent B as a
    // blank slot under a `source` that says the repository defined it.
    if (t && !SKIP.has(t.toLowerCase())) out.push(t);
  }
  return out;
}

function deriveAxes({
  archDir,
  readFile = (p) => fs.readFileSync(p, "utf8"),
} = {}) {
  const files = {
    domains: path.join(String(archDir), "concepts", "tech-stack.md"),
    axes: path.join(String(archDir), "concepts", "coding-standards.md"),
  };
  const read = [];
  // Absent → null. Present → its H2s, which may be empty; an empty list is
  // treated as absent below. Any error other than absence propagates.
  const take = (p) => {
    let t;
    try {
      t = readFile(p);
    } catch (e) {
      if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return null;
      throw e;
    }
    read.push(p);
    return h2s(t);
  };
  const ts = take(files.domains);
  const cs = take(files.axes);
  const hasDomains = ts !== null && ts.length > 0;
  const hasAxes = cs !== null && cs.length > 0;
  const domains = hasDomains ? ts : [...FALLBACK_DOMAINS];
  const axes = hasAxes ? cs : [...FALLBACK_AXES];
  const source =
    hasDomains && hasAxes
      ? "architecture"
      : !hasDomains && !hasAxes
        ? "fallback"
        : "partial";
  return { reason: source, source, domains, axes, read };
}

function parseArgs(argv) {
  const out = { arch: null, json: false, error: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--arch") {
      const v = argv[++i];
      if (v === undefined || v === "" || v.startsWith("--")) {
        out.error = "--arch needs a directory";
        return out;
      }
      out.arch = v;
    } else {
      out.error = `unknown argument: ${a}`;
      return out;
    }
  }
  if (!out.error && out.arch === null) out.error = "--arch is required";
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.error) {
    process.stderr.write(`prepass-axes: ${args.error}\n${USAGE}\n`);
    return 2;
  }
  let r;
  try {
    r = deriveAxes({ archDir: args.arch });
  } catch (e) {
    // A read error that is not absence (EACCES, EISDIR): say so and substitute
    // nothing — an empty stdout is what a caller filling prompt slots must see.
    process.stderr.write(
      `prepass-axes: cannot read the architecture docs under ${args.arch}: ${e && e.message}\n`,
    );
    return 1;
  }
  if (args.json) {
    process.stdout.write(JSON.stringify(r) + "\n");
  } else {
    process.stdout.write(
      `source: ${r.source}\ndomains: ${r.domains.join(", ")}\naxes: ${r.axes.join("; ")}\n`,
    );
  }
  return 0;
}

module.exports = { deriveAxes, h2s, atxH2, FALLBACK_DOMAINS, FALLBACK_AXES };

// process.exitCode, never a hard exit: exiting after a stdout write truncates
// the output on a pipe (the select-next.mjs 64 KB trap).
if (require.main === module) process.exitCode = main(process.argv.slice(2));
