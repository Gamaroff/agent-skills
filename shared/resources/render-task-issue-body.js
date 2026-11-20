#!/usr/bin/env node
"use strict";
/**
 * render-task-issue-body — the GitHub issue body for a task document, as a script.
 *
 * WHY A SCRIPT (task.283; obs #34)
 * --------------------------------
 * `ensure-task-github-issue` and `sync-github-task` each built the body in a hand-filled shell
 * heredoc. On 2026-10-13 six forks wrote the bodies for tasks 202–207 with an ad-hoc script whose
 * `\s*` crossed a newline after an empty-valued frontmatter key: `estimated_effort_hours` was lost
 * (the card read "Effort —h") and relative links stayed `../../../…`, which 404 in an issue. A
 * heredoc is also an unquoted shell payload (task 265's rule: payload text is written by a tool, not
 * a heredoc). So the body is rendered here, from the document, by the repository's own parsers.
 *
 * WHAT IT DEFINES, AND WHAT IT DOES NOT
 * -------------------------------------
 * It defines NO card contract of its own. Which sections a task card carries, their heading and
 * aliases, and their caps all come from `CARD_SECTIONS_BY_KIND.task` in `jira-sync.js`, and the
 * trimming (and the exact "+N more" count) from `summariseSection`, so the Jira card and this body
 * share one definition (CLAUDE.md § Authoring-Time Card Preflight: two definitions drift in the
 * worst direction). Frontmatter is read by `parseFrontmatter`, never by a regex. What it adds is
 * GitHub-specific and small: the markdown assembly, the Metadata table, the Document links, and
 * making relative links absolute against the document's own URL.
 *
 * Usage:
 *   render-task-issue-body.js --file <task.md> --doc-url <url> --rel-path <path> [--json]
 * prints the body on stdout. With `--json`, prints `{reason, body, omitted}`.
 * Exit 0 = rendered, 1 = nothing renderable (no Summary or Success Criteria resolved),
 * 2 = usage error or unreadable file.
 */

const fs = require("fs");
const lib = require("./jira-sync.js");

const {
  parseFrontmatter,
  extractBodySections,
  summariseSection,
  CARD_SECTIONS_BY_KIND,
} = lib;

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Make every relative inline link absolute against `docUrl`, the document's own blob URL. A link
 * written for the file's directory (`../../x.md`) means nothing in an issue; resolved against the
 * URL it points at the same file on GitHub. Absolute links, anchors and mail links are untouched.
 */
function absolutizeLinks(text, docUrl) {
  return String(text).replace(
    /(\]\()([^)\s]+)(\))/g,
    (m, open, target, close) => {
      if (SCHEME_RE.test(target) || target.startsWith("#")) return m;
      try {
        return `${open}${new URL(target, docUrl).href}${close}`;
      } catch {
        return m;
      }
    },
  );
}

/** A top-level `- item` becomes `- [ ] item`; an item already carrying a checkbox is left alone. */
function asCheckboxList(text) {
  return String(text).replace(/^([-*]) (?!\[[ xX]\])/gm, "- [ ] ");
}

function cell(value) {
  if (Array.isArray(value)) value = value.filter(Boolean).join(", ");
  const s = value === null || value === undefined ? "" : String(value).trim();
  return s === "" ? "—" : s;
}

// The priority the issue's label and board field carry: lowercase, `medium` when absent
// (ensure-task-github-issue Step T1). The Metadata cell shows the same value, so the body
// agrees with the label beside it.
function priorityCell(value) {
  const s = cell(value);
  return s === "—" ? "medium" : s.toLowerCase();
}

function effortCell(value) {
  const s = cell(value);
  return /^\d+(\.\d+)?$/.test(s) ? `${s}h` : s;
}

/**
 * Render the body.
 * @param {{content: string, docUrl: string, relPath: string}} input
 * @returns {{reason: "ok"|"no-sections", body: string, omitted: Record<string, number>}}
 */
function renderTaskIssueBody({ content, docUrl, relPath }) {
  const { frontmatter, body } = parseFrontmatter(String(content));
  const blocks = [];
  const omitted = {};

  for (const spec of CARD_SECTIONS_BY_KIND.task) {
    const [hit] = extractBodySections(body, [spec.names]);
    if (!hit) continue;
    // A section's closing `---` rule is a separator, not a block: left in, it counts as one
    // omitted block and prints a "+1 more" that points at nothing.
    const content = hit.content.replace(/\n+---\s*$/, "");
    const summary = summariseSection(content, {
      maxItems: spec.maxItems,
      maxSentences: spec.maxSentences,
      transform: spec.transform,
    });
    if (!summary.text) continue;
    let text = absolutizeLinks(summary.text, docUrl);
    if (spec.heading === "Success Criteria") text = asCheckboxList(text);
    let block = `## ${spec.heading}\n\n${text}`;
    if (summary.omitted > 0) {
      omitted[spec.heading] = summary.omitted;
      block += `\n\n+${summary.omitted} more in the [task document](${docUrl})`;
    }
    blocks.push(block);
  }

  if (blocks.length === 0) return { reason: "no-sections", body: "", omitted };

  blocks.push(
    [
      "## Metadata",
      "",
      "| Field | Value |",
      "|-------|-------|",
      `| Priority | ${priorityCell(frontmatter.priority)} |`,
      `| Effort | ${effortCell(frontmatter.estimated_effort_hours)} |`,
      `| Category | ${cell(frontmatter.category)} |`,
      `| Depends on | ${cell(frontmatter.depends_on)} |`,
    ].join("\n"),
  );
  blocks.push(
    [
      "## Document",
      "",
      `📄 [Task Document](${docUrl})`,
      `📁 \`${relPath}\``,
    ].join("\n"),
  );

  return { reason: "ok", body: `${blocks.join("\n\n")}\n`, omitted };
}

function parseArgs(argv) {
  const out = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--file") out.file = argv[++i];
    else if (a === "--doc-url") out.docUrl = argv[++i];
    else if (a === "--rel-path") out.relPath = argv[++i];
    else out.unknown = a;
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.unknown || !args.file || !args.docUrl || !args.relPath) {
    process.stderr.write(
      "Usage: render-task-issue-body.js --file <task.md> --doc-url <url> --rel-path <path> [--json]\n",
    );
    return 2;
  }
  let content;
  try {
    content = fs.readFileSync(args.file, "utf8");
  } catch (e) {
    process.stderr.write(
      `render-task-issue-body: cannot read ${args.file}: ${e.message}\n`,
    );
    return 2;
  }
  const result = renderTaskIssueBody({
    content,
    docUrl: args.docUrl,
    relPath: args.relPath,
  });
  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (result.reason === "ok") {
    process.stdout.write(result.body);
  } else {
    process.stderr.write(
      "render-task-issue-body: no Summary or Success Criteria section resolved — run card-preflight.js on the document\n",
    );
  }
  return result.reason === "ok" ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { renderTaskIssueBody, absolutizeLinks, asCheckboxList };
