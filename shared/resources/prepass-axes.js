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
 *   architecture — both files were read
 *   partial      — one was; the missing half takes the web-stack fallback
 *   fallback     — neither was; today's hard-coded lists, unchanged
 *
 * Pure and offline: reads at most two files, writes nothing, no network.
 *
 * Usage:
 *   node prepass-axes.js --arch <dir> [--json]
 *
 * Exit 0 on success (every `source` is a success). Exit 2 on a usage error —
 * missing `--arch`, or an unknown flag — with the usage on stderr and nothing
 * on stdout, so a caller substituting stdout into a prompt never substitutes an
 * error message.
 */

const fs = require("fs");
const path = require("path");
const { makeFenceTracker } = require("./jira-sync.js");

// Today's hard-coded lists, kept ONLY as the fallback for a repository with no
// concepts/ docs. They reproduce the prompt's former wording: the domain
// parenthetical, and axes 2–4 (axis 1, libraries, is stack-neutral already and
// stays in the template).
const FALLBACK_DOMAINS = Object.freeze([
  "backend",
  "frontend",
  "auth",
  "payments",
  "real-time",
]);
const FALLBACK_AXES = Object.freeze([
  "naming, layering, file placement",
  "API endpoints and payloads",
  "auth, crypto and sensitive data",
]);
const SKIP = new Set(["see also"]);

const USAGE = "usage: prepass-axes.js --arch <dir> [--json]";

function h2s(text) {
  const isFence = makeFenceTracker();
  const out = [];
  for (const line of String(text).replace(/\r\n?/g, "\n").split("\n")) {
    if (isFence(line)) continue;
    const m = /^## +(.+?)(?:\s+#+)?\s*$/.exec(line);
    if (m && !SKIP.has(m[1].toLowerCase())) out.push(m[1]);
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
  const take = (p) => {
    try {
      const t = readFile(p);
      read.push(p);
      return t;
    } catch {
      return null;
    }
  };
  const ts = take(files.domains);
  const cs = take(files.axes);
  const domains = ts === null ? [...FALLBACK_DOMAINS] : h2s(ts);
  const axes = cs === null ? [...FALLBACK_AXES] : h2s(cs);
  const source =
    ts !== null && cs !== null
      ? "architecture"
      : ts === null && cs === null
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
  const r = deriveAxes({ archDir: args.arch });
  if (args.json) {
    process.stdout.write(JSON.stringify(r) + "\n");
  } else {
    process.stdout.write(
      `source: ${r.source}\ndomains: ${r.domains.join(", ")}\naxes: ${r.axes.join("; ")}\n`,
    );
  }
  return 0;
}

module.exports = { deriveAxes, h2s, FALLBACK_DOMAINS, FALLBACK_AXES };

// process.exitCode, never a hard exit: exiting after a stdout write truncates
// the output on a pipe (the select-next.mjs 64 KB trap).
if (require.main === module) process.exitCode = main(process.argv.slice(2));
