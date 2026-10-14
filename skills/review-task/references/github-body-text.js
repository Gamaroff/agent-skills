#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/github-body-text.js. Regenerate via `npm run bundle`.
/**
 * github-body-text — make body text survive GitHub's storage unchanged.
 *
 * GitHub rewrites the literal text of a JSON control-character escape in an
 * issue, PR or comment body into caret notation, server-side, whatever the
 * payload held: `\u0000` is stored as `\^@` and `\u001f` as `\^_`, while
 * `\u007f` and `\n` survive (bug.17, issue #529 and PR #530, 2026-09-30). A bug
 * about control characters quotes exactly these, so its tracker card and its PR
 * misquote their own subject, and nothing reads a body back to notice (obs #233).
 *
 * A rule telling the summariser to avoid them holds only while the summariser
 * remembers it, so every GitHub body writer runs its text through here first
 * (obs #303). Each escape `\u0000`–`\u001f` becomes its code point in words,
 * `U+0000`–`U+001F`: the meaning is kept, and nothing GitHub will rewrite is
 * sent. It rewrites rather than refuses, because a refusal would stop a pipeline
 * mid-run over text whose meaning survives the rewrite intact.
 *
 * Pure function: `wordsForControlEscapes(text)` → `{ text, count }`.
 *
 * CLI (for writers that are prose, such as create-pr's `gh pr create`):
 *   github-body-text.js --file <path>
 * rewrites the file in place and names the count on stderr.
 * Exit 0 = done (including nothing to rewrite), 2 = usage error.
 */

"use strict";

const fs = require("fs");

// `\u00` followed by 00–1F. `\u007f` is excluded: GitHub keeps it.
const CONTROL_ESCAPE_RE = /\\u00([01][0-9a-fA-F])/g;

function wordsForControlEscapes(text) {
  let count = 0;
  const out = String(text).replace(CONTROL_ESCAPE_RE, (_, hex) => {
    count++;
    return `U+00${hex.toUpperCase()}`;
  });
  return { text: out, count };
}

/** The stderr line a writer prints when it rewrote anything; null otherwise. */
function rewriteNotice(count) {
  return count
    ? `ℹ️  ${count} control-character escape(s) written as U+00XX — GitHub rewrites \\u0000-\\u001f in bodies to caret notation (obs #303).`
    : null;
}

function main(argv) {
  const i = argv.indexOf("--file");
  const file = i === -1 ? "" : argv[i + 1];
  if (!file || argv.length !== 2) {
    process.stderr.write("Usage: github-body-text.js --file <path>\n");
    return 2;
  }
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    process.stderr.write(
      `github-body-text: cannot read ${file}: ${e.message}\n`,
    );
    return 2;
  }
  const r = wordsForControlEscapes(text);
  if (r.count) {
    fs.writeFileSync(file, r.text, "utf8");
    process.stderr.write(`${rewriteNotice(r.count)}\n`);
  }
  return 0;
}

module.exports = { wordsForControlEscapes, rewriteNotice, CONTROL_ESCAPE_RE };

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
