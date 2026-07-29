// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/jira-sync.js. Regenerate via `npm run bundle`.
"use strict";
/**
 * Shared library for Jira sync skills (sync-jira-task at present;
 * sync-jira-epic / sync-jira-story can adopt next).
 *
 * Pure functions where possible. I/O paths accept an injected `fetch`
 * for testing. No top-level side effects beyond `loadDotEnv()` if called.
 *
 * Frontmatter parser constraints (intentional; not full YAML):
 *   - Top-level scalar key: value pairs only (no nested mappings).
 *   - Inline arrays: [a, b, "c d"]  — no nested arrays.
 *   - Block arrays: indented `- item` lines under a bare key.
 *   - String quotes: outer matching " or '. No escape sequences honoured.
 *   - No anchors, aliases, multi-doc, flow mappings, or comments.
 *   - Document body may contain --- horizontal rules (close-tag is
 *     detected by scanning for "\n---" after the opening "---" line).
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

// ---------------------------------------------------------------------------
// .env loader
// ---------------------------------------------------------------------------
function loadDotEnv() {
  try {
    const root = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();
    const envPath = path.join(root, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 1) continue;
      const key = t.slice(0, eq).trim();
      const val = t
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Output mode
// ---------------------------------------------------------------------------
function makeOutput({ json = false, quiet = false } = {}) {
  return {
    log: (...a) => {
      if (!json && !quiet) console.log(...a);
    },
    info: (...a) => {
      if (!json && !quiet) console.log(...a);
    },
    warn: (...a) => {
      if (!json) console.warn(...a);
    },
    err: (...a) => console.error(...a),
    emit: (payload) =>
      process.stdout.write(JSON.stringify(payload, null, 2) + "\n"),
    isJson: json,
    isQuiet: quiet,
  };
}

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------
function parseFrontmatter(content) {
  if (!content.startsWith("---")) return { frontmatter: {}, body: content };
  const closeIdx = content.indexOf("\n---", 3);
  if (closeIdx === -1) return { frontmatter: {}, body: content };
  const fmText = content.slice(4, closeIdx);
  const body = content.slice(closeIdx + 4).replace(/^\n+/, "");

  const fm = {};
  const lines = fmText.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.includes(":")) {
      i++;
      continue;
    }
    const ci = line.indexOf(":");
    const key = line.slice(0, ci).trim();
    let val = line.slice(ci + 1).trim();

    if (
      val === "" &&
      i + 1 < lines.length &&
      lines[i + 1].trimStart().startsWith("-")
    ) {
      const items = [];
      i++;
      while (i < lines.length && lines[i].trimStart().startsWith("-")) {
        items.push(
          lines[i]
            .trim()
            .slice(1)
            .trim()
            .replace(/^["']|["']$/g, ""),
        );
        i++;
      }
      fm[key] = items;
      continue;
    }

    if (val === "[]") {
      val = [];
    } else if (val.startsWith("[") && val.endsWith("]")) {
      const inner = val.slice(1, -1).trim();
      val =
        inner === ""
          ? []
          : inner.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    } else if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (val === "null" || val === "~") val = null;
    fm[key] = val;
    i++;
  }
  return { frontmatter: fm, body };
}

/**
 * In-place frontmatter update. Updates value if key present, appends if not.
 * Preserves order, blank lines, and surrounding body verbatim.
 */
function upsertFrontmatterKeys(content, updates) {
  if (!content.startsWith("---")) return content;
  const closeIdx = content.indexOf("\n---", 3);
  if (closeIdx === -1) return content;
  const fmText = content.slice(4, closeIdx);
  const tail = content.slice(closeIdx);

  const lines = fmText.split("\n");
  const seen = new Set();
  const out = lines
    .map((line) => {
      const ci = line.indexOf(":");
      if (ci < 1) return line;
      const key = line.slice(0, ci).trim();
      if (!(key in updates)) return line;
      seen.add(key);
      const v = updates[key];
      if (v === null || v === undefined) return null;
      return `${key}: ${formatYamlScalar(v)}`;
    })
    .filter((l) => l !== null);

  for (const [key, v] of Object.entries(updates)) {
    if (seen.has(key)) continue;
    if (v === null || v === undefined) continue;
    out.push(`${key}: ${formatYamlScalar(v)}`);
  }

  const newFmText = out.join("\n").replace(/\n*$/, "\n");
  return "---\n" + newFmText + tail.replace(/^\n/, "");
}

function formatYamlScalar(v) {
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v))
    return `[${v.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(", ")}]`;
  return `"${String(v).replace(/"/g, '\\"')}"`;
}

function rewriteFrontmatter(content, mutator) {
  if (!content.startsWith("---")) return content;
  const closeIdx = content.indexOf("\n---", 3);
  if (closeIdx === -1) return content;
  const fmText = content.slice(4, closeIdx);
  const tail = content.slice(closeIdx);
  const newFmText = mutator(fmText);
  return "---\n" + newFmText.replace(/\n*$/, "\n") + tail.replace(/^\n/, "");
}

// ---------------------------------------------------------------------------
// Git / Bitbucket
// ---------------------------------------------------------------------------
function getRepoRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();
  } catch (_) {
    return process.cwd();
  }
}

function getDefaultBranch() {
  try {
    const ref = execSync("git symbolic-ref refs/remotes/origin/HEAD", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const m = ref.match(/refs\/remotes\/origin\/(.+)$/);
    if (m) return m[1];
  } catch (_) {}
  for (const candidate of ["main", "master", "develop"]) {
    try {
      execSync(`git rev-parse --verify --quiet origin/${candidate}`, {
        stdio: "ignore",
      });
      return candidate;
    } catch (_) {}
  }
  return "main";
}

// Pure: strip the remote name (first path segment) from an upstream ref.
// "origin/feature/foo" -> "feature/foo"; "" / "noref" -> null. Remote names
// cannot contain "/", but branch names can (feature/...), so strip only up to
// and including the FIRST slash.
function stripRemotePrefix(upstreamRef) {
  if (!upstreamRef) return null;
  const slash = upstreamRef.indexOf("/");
  return slash === -1 ? null : upstreamRef.slice(slash + 1);
}

// Resolve the current branch's remote-tracking branch name WITHOUT the remote
// prefix. E.g. when on `feature/story.5.1.foo` tracking
// `origin/feature/story.5.1.foo`, returns "feature/story.5.1.foo".
//
// Returns null on detached HEAD / no configured upstream / git unavailable —
// callers fall back to getDefaultBranch(). Remote-name agnostic (works for
// non-"origin" remotes) and safe for branch names containing "/".
function getCurrentBranchUpstream() {
  try {
    const upstream = execSync(
      "git rev-parse --abbrev-ref --symbolic-full-name @{u}",
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return stripRemotePrefix(upstream);
  } catch (_) {
    return null; // detached HEAD, no upstream, or git not available
  }
}

function getBitbucketRepoBase() {
  const env = process.env.BITBUCKET_REPO_URL;
  if (env) return env.replace(/\/$/, "");
  try {
    const remote = execSync("git remote get-url origin", {
      encoding: "utf-8",
    }).trim();
    const base = remote
      .replace(/^git@bitbucket\.org:/, "https://bitbucket.org/")
      .replace(/\.git$/, "");
    if (base.startsWith("https://bitbucket.org/")) return base;
  } catch (_) {}
  return null;
}

function buildBitbucketUrl(absPath, repoRoot, bbBase, branch) {
  const rel = path.relative(repoRoot, absPath).replace(/\\/g, "/");
  const ref = branch || "HEAD";
  return `${bbBase}/src/${ref}/${rel}`;
}

// ---------------------------------------------------------------------------
// Relative-link resolution
// ---------------------------------------------------------------------------
// Local markdown links relative to a doc's own directory (e.g.
// `[runbook](task.4.runbook.md)`) resolve fine in a Bitbucket file viewer but
// are dead once that same prose is copied into a Jira description -- Jira has
// no "relative to this file" base path. Rewrite them to absolute Bitbucket
// URLs at ADF-render time so a link that works locally also works in Jira.
function resolveRelativeLink(href, { filePath, repoRoot, bbBase, branch }) {
  if (!href || !bbBase) return href;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) return href; // has a scheme (http:, mailto:, ...)
  if (href.startsWith("#")) return href; // in-page anchor
  const hashIdx = href.indexOf("#");
  const pathPart = hashIdx === -1 ? href : href.slice(0, hashIdx);
  const fragment = hashIdx === -1 ? "" : href.slice(hashIdx);
  if (!pathPart) return href;
  const resolved = path.resolve(path.dirname(filePath), pathPart);
  if (!fs.existsSync(resolved)) return href; // don't mask a broken link -- leave it as-authored
  return buildBitbucketUrl(resolved, repoRoot, bbBase, branch) + fragment;
}

function makeRelativeLinkResolver({ filePath, repoRoot, bbBase, branch }) {
  if (!bbBase) return null;
  return (href) =>
    resolveRelativeLink(href, { filePath, repoRoot, bbBase, branch });
}

// ---------------------------------------------------------------------------
// Changelog
// ---------------------------------------------------------------------------
const CL_START = "<!-- jira-sync-changelog-start -->";
const CL_END = "<!-- jira-sync-changelog-end -->";
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RE_CL_BLOCK = new RegExp(
  `${escapeRe(CL_START)}[\\s\\S]*?${escapeRe(CL_END)}`,
);
const RE_CL_INNER = new RegExp(
  `${escapeRe(CL_START)}([\\s\\S]*?)${escapeRe(CL_END)}`,
);

const RE_ENTRY_ROW = /^\|\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s*\|/;

function fmtEntry(summary) {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  return `| ${now} | ${summary} |`;
}

function buildChangelogBlock(entries) {
  return (
    `${CL_START}\n## Change Log\n\n` +
    `| Date (UTC) | Change |\n|------------|--------|\n` +
    entries.join("\n") +
    `\n${CL_END}`
  );
}

function isEntryRow(l) {
  return RE_ENTRY_ROW.test(l);
}

function extractEntries(content) {
  const m = content.match(RE_CL_INNER);
  if (m) return m[1].split("\n").filter(isEntryRow);
  const hand = findHandWrittenChangelog(content);
  if (!hand) return [];
  return content.slice(hand.start, hand.end).split("\n").filter(isEntryRow);
}

function findHandWrittenChangelog(content) {
  const m = content.match(/^## Change Log[ \t]*\n+/m);
  if (!m) return null;
  const start = content.indexOf(m[0]);
  const after = content.slice(start + m[0].length);
  const next = after.match(/^## /m);
  const end = next
    ? start + m[0].length + after.indexOf(next[0])
    : content.length;
  return { start, end };
}

function upsertChangelog(content, newEntry) {
  if (RE_CL_BLOCK.test(content)) {
    const entries = [...extractEntries(content), newEntry];
    return content.replace(RE_CL_BLOCK, buildChangelogBlock(entries));
  }
  const hand = findHandWrittenChangelog(content);
  if (hand) {
    const existing = content
      .slice(hand.start, hand.end)
      .split("\n")
      .filter(isEntryRow);
    const entries = [...existing, newEntry];
    const trailing = hand.end < content.length ? "\n\n" : "\n";
    return (
      content.slice(0, hand.start) +
      buildChangelogBlock(entries) +
      trailing +
      content.slice(hand.end)
    );
  }
  const sec = content.match(/^## /m);
  if (sec) {
    const idx = content.indexOf(sec[0]);
    return (
      content.slice(0, idx) +
      buildChangelogBlock([newEntry]) +
      "\n\n" +
      content.slice(idx)
    );
  }
  return content.trimEnd() + "\n\n" + buildChangelogBlock([newEntry]) + "\n";
}

// ---------------------------------------------------------------------------
// ADF builders
// ---------------------------------------------------------------------------
const adf = {
  doc: (...content) => ({ version: 1, type: "doc", content }),
  paragraph: (...content) => ({ type: "paragraph", content }),
  heading: (level, text) => ({
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  }),
  text: (t) => ({ type: "text", text: t }),
  link: (text, href) => ({
    type: "text",
    text,
    marks: [{ type: "link", attrs: { href } }],
  }),
  bulletList: (...items) => ({ type: "bulletList", content: items }),
  orderedList: (...items) => ({ type: "orderedList", content: items }),
  listItem: (...content) => ({ type: "listItem", content }),
  table: (rows) => ({
    type: "table",
    attrs: { isNumberColumnEnabled: false, layout: "default" },
    content: rows,
  }),
  tableRow: (...cells) => ({ type: "tableRow", content: cells }),
  tableHeader: (...content) => ({ type: "tableHeader", attrs: {}, content }),
  tableCell: (...content) => ({ type: "tableCell", attrs: {}, content }),
  hardBreak: () => ({ type: "hardBreak" }),
};

const RE_BULLET = /^\s*[-*]\s+(.*)$/;
const RE_ORDERED = /^\s*\d+\.\s+(.*)$/;

// ---------------------------------------------------------------------------
// Inline markdown parser — **bold**, `code`, [link](url)
// ---------------------------------------------------------------------------
function inlineMarkdownToAdf(text, linkResolver) {
  if (text == null || text === "") return [adf.text("")];
  // Build a fresh regex each call to reset lastIndex safely across re-entrant use.
  const re = /(\*\*([^*\n]+)\*\*)|(`([^`\n]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  const out = [];
  let lastIdx = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > lastIdx) out.push(adf.text(text.slice(lastIdx, m.index)));
    if (m[1])
      out.push({ type: "text", text: m[2], marks: [{ type: "strong" }] });
    else if (m[3])
      out.push({ type: "text", text: m[4], marks: [{ type: "code" }] });
    else if (m[5])
      out.push(adf.link(m[6], linkResolver ? linkResolver(m[7]) : m[7]));
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) out.push(adf.text(text.slice(lastIdx)));
  return out.length ? out : [adf.text(text)];
}

// ---------------------------------------------------------------------------
// Table helpers for textToAdfNodes
// ---------------------------------------------------------------------------
const RE_MD_HEADING = /^(#{2,6})\s+(.+)$/;
const RE_TABLE_ROW_START = /^\s*\|/;
const RE_HR_LINE = /^[-*_]{3,}\s*$/;

function isTableSepLine(l) {
  return /^\|?[\s\-:|]+\|?$/.test(l.trim()) && /-/.test(l);
}

function tableLinesToAdf(lines, linkResolver) {
  const dataLines = lines.filter((l) => l.trim() && !isTableSepLine(l));
  if (!dataLines.length) return null;
  const PH = "\x01";
  const splitRow = (line) => {
    const masked = line.replace(/\\\|/g, PH);
    const cells = masked.split("|");
    if (cells.length && cells[0].trim() === "") cells.shift();
    if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
    return cells.map((c) => c.split(PH).join("|").trim());
  };
  const rows = dataLines.map(splitRow);
  const [header, ...body] = rows;
  if (!header || !header.length) return null;
  return adf.table([
    adf.tableRow(
      ...header.map((h) =>
        adf.tableHeader(adf.paragraph(...inlineMarkdownToAdf(h, linkResolver))),
      ),
    ),
    ...body.map((r) =>
      adf.tableRow(
        ...r.map((c) =>
          adf.tableCell(adf.paragraph(...inlineMarkdownToAdf(c, linkResolver))),
        ),
      ),
    ),
  ]);
}

/**
 * Convert markdown text to ADF nodes. Handles:
 * - ##–###### headings → ADF heading nodes
 * - pipe tables (|...|) → ADF table nodes with inline markdown in cells
 * - horizontal rules (---) → skipped
 * - bullet/ordered lists → proper ADF list nodes
 * - **bold**, `code`, [link](url) → inline marks
 */
function textToAdfNodes(text, linkResolver) {
  if (!text) return [];
  const nodes = [];
  const lines = text.split("\n");
  let buf = [];
  let tableBuf = [];

  const flushBuf = () => {
    if (!buf.length) return;
    const blockText = buf.join("\n").trim();
    buf = [];
    if (blockText) nodes.push(...blockToAdf(blockText, linkResolver));
  };
  const flushTable = () => {
    if (!tableBuf.length) return;
    const node = tableLinesToAdf(tableBuf, linkResolver);
    tableBuf = [];
    if (node) nodes.push(node);
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (RE_HR_LINE.test(trimmed)) {
      // horizontal rule — skip
      flushBuf();
      flushTable();
      continue;
    }
    const hm = trimmed.match(RE_MD_HEADING);
    if (hm) {
      // ##–###### heading
      flushBuf();
      flushTable();
      nodes.push(adf.heading(Math.min(hm[1].length, 6), hm[2]));
      continue;
    }
    if (RE_TABLE_ROW_START.test(line)) {
      // table row
      flushBuf();
      tableBuf.push(line);
      continue;
    }
    if (tableBuf.length) flushTable(); // non-table line ends table
    if (trimmed === "") {
      flushBuf();
      continue;
    } // blank line = paragraph break
    buf.push(line);
  }

  flushBuf();
  flushTable();
  return nodes.filter(Boolean);
}

function blockToAdf(block, linkResolver) {
  const lines = block.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  if (lines.every((l) => RE_BULLET.test(l))) {
    return [
      adf.bulletList(
        ...lines.map((l) => {
          const m = l.match(RE_BULLET);
          return adf.listItem(
            adf.paragraph(...inlineMarkdownToAdf(m[1], linkResolver)),
          );
        }),
      ),
    ];
  }
  if (lines.every((l) => RE_ORDERED.test(l))) {
    return [
      adf.orderedList(
        ...lines.map((l) => {
          const m = l.match(RE_ORDERED);
          return adf.listItem(
            adf.paragraph(...inlineMarkdownToAdf(m[1], linkResolver)),
          );
        }),
      ),
    ];
  }

  const inline = [];
  lines.forEach((l, i) => {
    if (l.length) inline.push(...inlineMarkdownToAdf(l, linkResolver));
    if (i < lines.length - 1) inline.push(adf.hardBreak());
  });
  return inline.length ? [adf.paragraph(...inline)] : [];
}

// Backward-compat name
const textToParagraphs = textToAdfNodes;

// Matches a level-2 section heading by name and captures its body.
//
//   (?:^|\n)     Anchor to the start of a line. Without this, `## Foo` matched as
//                a SUBSTRING of `### Foo`, `#### Foo`, and even prose ("see ## Foo"),
//                so a nested sub-heading could silently win over the real section.
//   \d+[.)]      Optional numbering. `create-task`'s own template emits
//                `## 1. Overview` … `## 11. Rollback Plan`, and lib.js requires
//                those literal strings — so without this, every task card created
//                the intended way extracted ZERO sections and shipped a Jira
//                description containing no body at all.
//   [ \t]*\n     Consume the rest of the heading LINE and nothing more. The old
//                `\s*\n+` ate the blank line separating an empty section from the
//                next heading, so `## Overview` immediately followed by
//                `## Motivation` captured Motivation's heading AND body as
//                Overview's content — mislabelling one section and dropping the
//                other. Leading blank lines now stay inside the capture, which is
//                harmless: callers `.trim()`.
//
// Deliberately NOT the `m` flag: the `$` in the lookahead must mean end-of-string.
// With `m` it would mean end-of-line and truncate every section to its first line.
//
// `### Sub-headings` inside a section body are preserved — the lookahead stops at
// `\n## ` and `\n# `, neither of which matches `\n### `.
function sectionRe(name) {
  return new RegExp(
    `(?:^|\\n)## (?:\\d+[.)]\\s*)?${escapeRe(name)}[ \\t]*\\n([\\s\\S]*?)(?=\\n## |\\n# |$)`,
  );
}

// Returns [{ name, content }] for each requested section found in `body`.
//
// `name` is always the CANONICAL requested name, never the matched text — so a
// `## 3. Technical Background` heading yields name `Technical Background`. Callers
// re-emit this as the Jira heading, and Jira renders sections in list order, so the
// numbers would be redundant noise there. Keeping it canonical also means adding
// or removing numbering in a doc does not churn `hashBody` and force a no-op PUT.
//
// Pass `output` to warn about sections that were requested but did not resolve.
// Silence here is how a heading-contract mismatch went unnoticed across 28 task
// cards: the sync succeeded, reported no problem, and published an empty body.
// Only pass it from ONE call site per run — `buildDescriptionAdf` and `hashBody`
// both extract from the same body, so passing it from both double-warns.
function extractBodySections(body, sectionNames, output = null) {
  const out = [];
  const missing = [];
  for (const head of sectionNames) {
    const m = body.match(sectionRe(head));
    if (m && m[1].trim()) out.push({ name: head, content: m[1].trim() });
    else missing.push(head);
  }

  if (output && missing.length) {
    const warn = output.warn || ((...a) => console.warn(...a));
    if (!out.length) {
      // Every section missing means the document and the section list disagree
      // about heading names — a contract mismatch, not an incomplete document.
      warn(
        `None of the ${sectionNames.length} expected sections were found. The Jira description will have no body.\n` +
          `    Expected level-2 headings (numbering optional): ${sectionNames.join(", ")}\n` +
          `    Check the document's '## ' headings match these names.`,
      );
    } else {
      warn(
        `Sections not found, omitted from the Jira description: ${missing.join(", ")}`,
      );
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Priority + labels
// ---------------------------------------------------------------------------
const PRIORITY_MAP = {
  highest: "Highest",
  critical: "Highest",
  blocker: "Highest",
  high: "High",
  medium: "Medium",
  normal: "Medium",
  low: "Low",
  minor: "Low",
  lowest: "Lowest",
  trivial: "Lowest",
};

function normalisePriority(raw, livePriorities = null, output = null) {
  if (!raw) return undefined;
  const lower = String(raw).toLowerCase();
  const warn = output ? output.warn : (...a) => console.warn(...a);
  const info = output ? output.info : (...a) => console.log(...a);

  if (livePriorities) {
    if (livePriorities[lower]) return livePriorities[lower];
    const synonym = PRIORITY_MAP[lower];
    if (synonym && livePriorities[synonym.toLowerCase()])
      return livePriorities[synonym.toLowerCase()];
  }

  const mapped = PRIORITY_MAP[lower];
  if (!mapped) {
    warn(`⚠️  Unknown priority "${raw}" — omitting priority field.`);
    return undefined;
  }
  if (mapped.toLowerCase() !== lower) {
    info(`ℹ️  Priority "${raw}" mapped to "${mapped}".`);
  }
  return mapped;
}

function sanitiseLabels(input) {
  if (!input) return undefined;
  const arr = Array.isArray(input) ? input : String(input).split(",");
  const cleaned = arr.map((l) => String(l).trim()).filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

// ---------------------------------------------------------------------------
// Auth + HTTP (with retry, fetch DI)
// ---------------------------------------------------------------------------
function getAuth({
  required = [
    "JIRA_URL",
    "JIRA_API_TOKEN",
    "JIRA_USER_EMAIL",
    "JIRA_PROJECT_KEY",
  ],
  optional = ["JIRA_BOARD_ID"],
} = {}) {
  const env = {};
  for (const k of required) env[k] = process.env[k];
  for (const k of optional) env[k] = process.env[k];
  const missing = required.filter((k) => !env[k]);
  return {
    ok: missing.length === 0,
    missing,
    baseUrl: (env.JIRA_URL || "").replace(/\/$/, ""),
    token: env.JIRA_API_TOKEN || "",
    email: env.JIRA_USER_EMAIL || "",
    project: env.JIRA_PROJECT_KEY || "",
    boardId: env.JIRA_BOARD_ID || "",
  };
}

function authHeader(email, token) {
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

function makeHttp({
  fetchImpl = fetch,
  timeoutMs = 30000,
  retries = 2,
  retryDelayMs = 500,
  maxRetryAfterMs = 60000,
} = {}) {
  return async function http(url, opts = {}) {
    let attempt = 0;
    let lastErr;
    while (attempt <= retries) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const resp = await fetchImpl(url, { ...opts, signal: ctrl.signal });
        clearTimeout(t);
        if (resp.status === 429 && attempt < retries) {
          const ra = parseRetryAfter(
            resp.headers && resp.headers.get && resp.headers.get("retry-after"),
          );
          const wait = Math.min(
            ra != null ? ra : retryDelayMs * Math.pow(3, attempt),
            maxRetryAfterMs,
          );
          await sleep(wait);
          attempt++;
          continue;
        }
        if (resp.status >= 500 && attempt < retries) {
          await sleep(retryDelayMs * Math.pow(3, attempt));
          attempt++;
          continue;
        }
        return resp;
      } catch (e) {
        clearTimeout(t);
        lastErr = e;
        if (attempt < retries) {
          await sleep(retryDelayMs * Math.pow(3, attempt));
          attempt++;
          continue;
        }
        throw e;
      }
    }
    throw lastErr || new Error("http: exhausted retries");
  };
}

function parseRetryAfter(value) {
  if (!value) return null;
  const secs = Number(value);
  if (Number.isFinite(secs) && secs >= 0) return secs * 1000;
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? delta : 0;
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function parseJiraError(resp) {
  const text = await resp.text();
  try {
    const json = JSON.parse(text);
    const msgs = [];
    if (Array.isArray(json.errorMessages)) msgs.push(...json.errorMessages);
    if (json.errors && typeof json.errors === "object") {
      for (const [field, msg] of Object.entries(json.errors))
        msgs.push(`${field}: ${msg}`);
    }
    return msgs.length ? msgs.join("; ") : text;
  } catch (_) {
    return text;
  }
}

function describeAuthFail(status) {
  if (status === 401)
    return "401 Unauthorized — verify JIRA_USER_EMAIL and JIRA_API_TOKEN.";
  if (status === 403)
    return "403 Forbidden — token lacks permission for this issue/project.";
  if (status === 404)
    return "404 Not Found — issue key does not exist or you cannot view it.";
  return null;
}

// ---------------------------------------------------------------------------
// Diff + guard + hash
// ---------------------------------------------------------------------------
function diffFields({
  prev,
  next,
  prevBodyHash,
  newBodyHash,
  prevMetaHash,
  newMetaHash,
  prevDescHash,
  newDescHash,
}) {
  // Back-compat: prevDescHash/newDescHash collapse into body hash.
  const pBody = prevBodyHash !== undefined ? prevBodyHash : prevDescHash;
  const nBody = newBodyHash !== undefined ? newBodyHash : newDescHash;
  const changed = [];
  if (prev.summary !== next.summary) changed.push("summary");
  if ((pBody || "") !== (nBody || "")) changed.push("description");
  if (prevMetaHash !== undefined || newMetaHash !== undefined) {
    if (
      (prevMetaHash || "") !== (newMetaHash || "") &&
      !changed.includes("description")
    ) {
      changed.push("metadata");
    }
  }
  const pp = (prev.priority || "").toLowerCase();
  const np = (next.priority || "").toLowerCase();
  if (pp !== np) changed.push("priority");
  const pl = [...(prev.labels || [])].sort().join(",");
  const nl = [...(next.labels || [])].sort().join(",");
  if (pl !== nl) changed.push("labels");
  return changed;
}

function guardConcurrentEdit({ jiraUpdated, lastSyncedAt, force, output }) {
  if (!lastSyncedAt || !jiraUpdated) return;
  if (new Date(jiraUpdated) <= new Date(lastSyncedAt)) return;
  if (force) {
    if (output)
      output.warn(
        `⚠️  Jira issue updated since last sync (Jira: ${jiraUpdated}, local: ${lastSyncedAt}). --force in effect; overwriting.`,
      );
    return;
  }
  throw new Error(
    `Jira issue updated since last local sync.\n` +
      `  Local last sync: ${lastSyncedAt}\n` +
      `  Jira updated:    ${jiraUpdated}\n` +
      `Pull manual edits into the markdown first, or pass --force to overwrite.`,
  );
}

function hashStable(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Issue type cache
// ---------------------------------------------------------------------------
const ISSUE_TYPE_TTL_MS = 24 * 60 * 60 * 1000;

function issueTypeCachePath(repoRoot, projectKey) {
  return path.join(repoRoot, ".cache", `jira-issuetypes-${projectKey}.json`);
}

function readIssueTypeCache(repoRoot, projectKey) {
  const p = issueTypeCachePath(repoRoot, projectKey);
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    if (!data.ts || Date.now() - data.ts > ISSUE_TYPE_TTL_MS) return null;
    return data.types || null;
  } catch (_) {
    return null;
  }
}

function writeIssueTypeCache(repoRoot, projectKey, types) {
  const p = issueTypeCachePath(repoRoot, projectKey);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ ts: Date.now(), types }, null, 2));
}

async function getIssueTypeId({
  http,
  baseUrl,
  email,
  token,
  projectKey,
  typeName,
  repoRoot,
}) {
  const cache = repoRoot ? readIssueTypeCache(repoRoot, projectKey) : null;
  const wanted = typeName.toLowerCase();
  if (cache && cache[wanted]) return cache[wanted];

  const tries = [
    `${baseUrl}/rest/api/3/issue/createmeta/${projectKey}/issuetypes`,
    `${baseUrl}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`,
    `${baseUrl}/rest/api/3/issuetype`,
  ];
  let collected = {};
  for (const url of tries) {
    try {
      const resp = await http(url, {
        headers: {
          Authorization: authHeader(email, token),
          Accept: "application/json",
        },
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const toArr = (v) => (Array.isArray(v) ? v : null);
      const types =
        toArr(data.issueTypes) ||
        toArr(data.values) ||
        toArr(data.projects?.[0]?.issuetypes) ||
        toArr(data) ||
        [];
      for (const t of types) {
        if (t.name && t.id) collected[t.name.toLowerCase()] = t.id;
      }
      if (collected[wanted]) break;
    } catch (_) {}
  }
  if (collected[wanted]) {
    if (repoRoot) writeIssueTypeCache(repoRoot, projectKey, collected);
    return collected[wanted];
  }
  throw new Error(
    `Could not resolve Jira '${typeName}' issue type ID. Verify it is enabled for project ${projectKey}.`,
  );
}

// ---------------------------------------------------------------------------
// Live priority resolution
// ---------------------------------------------------------------------------
async function resolveLivePriorities({ http, baseUrl, email, token }) {
  try {
    const resp = await http(`${baseUrl}/rest/api/3/priority`, {
      headers: {
        Authorization: authHeader(email, token),
        Accept: "application/json",
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const arr = Array.isArray(data) ? data : data.values || [];
    const map = {};
    for (const p of arr) {
      if (p.name) map[p.name.toLowerCase()] = p.name;
    }
    return Object.keys(map).length ? map : null;
  } catch (_) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Board type detection + backlog placement
// ---------------------------------------------------------------------------
async function getBoardType({ http, baseUrl, email, token, boardId }) {
  if (!boardId) return null;
  try {
    const resp = await http(
      `${baseUrl}/rest/agile/1.0/board/${boardId}/configuration`,
      {
        headers: {
          Authorization: authHeader(email, token),
          Accept: "application/json",
        },
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.type || "").toLowerCase() || null;
  } catch (_) {
    return null;
  }
}

async function moveToBacklog({
  http,
  baseUrl,
  email,
  token,
  boardId,
  issueKey,
  output,
}) {
  if (!boardId) {
    if (output)
      output.warn("⚠️  Skipping backlog placement — JIRA_BOARD_ID not set.");
    return { moved: false, reason: "no-board-id" };
  }
  const type = await getBoardType({ http, baseUrl, email, token, boardId });
  if (type && type !== "scrum") {
    if (output)
      output.warn(
        `⚠️  Board ${boardId} is type "${type}" — backlog endpoint only applies to Scrum boards. Skipping.`,
      );
    return { moved: false, reason: `board-type-${type}` };
  }
  try {
    const resp = await http(`${baseUrl}/rest/agile/1.0/backlog/issue`, {
      method: "POST",
      headers: {
        Authorization: authHeader(email, token),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ issues: [issueKey] }),
    });
    if (resp.ok || resp.status === 204) {
      if (output) output.info(`   📋 Moved to backlog (board ${boardId})`);
      return { moved: true };
    }
    const msg = await parseJiraError(resp);
    if (output)
      output.warn(
        `⚠️  Backlog move failed (non-fatal): HTTP ${resp.status}: ${msg}`,
      );
    return { moved: false, reason: `http-${resp.status}` };
  } catch (e) {
    if (output)
      output.warn(`⚠️  Backlog move failed (non-fatal): ${e.message}`);
    return { moved: false, reason: e.message };
  }
}

// ---------------------------------------------------------------------------
// Status mapping (local document status -> Jira workflow status name)
// ---------------------------------------------------------------------------
// Single source of truth shared by sync-jira-{story,task,epic}. Covers the full
// canonical lifecycle (see the document-status-lifecycle spec) plus the
// historical aliases. Keys are lowercased.
//
// Each local status maps to an ORDERED LIST of candidate Jira status names,
// tried in order against the issue's *available* transitions (target status
// name first, then transition name — see resolveTransition).
//
// Why a list and not one name: Jira workflows name the same lifecycle stage
// very differently — "To Do" / "Selected for Development" / "Backlog"; "In
// Review" / "Code Review" / "Waiting for Review". Matching a single hardcoded
// name meant any board that picked a different word silently skipped every
// status change, and the sync still reported success. The list makes the common
// vocabularies work with no configuration at all; `jira.statusMap` in
// skills-config.yaml still narrows, reorders, or replaces it (see
// loadStatusMap) for a board that needs something else.
//
// The FIRST entry of each list is the historical single value, so mapStatus()
// returns exactly what it always did for existing callers.
const NEW_CANDIDATES = Object.freeze([
  "To Do",
  "Backlog",
  "Open",
  "New",
  "Selected for Development",
]);
const IN_PROGRESS_CANDIDATES = Object.freeze([
  "In Progress",
  "Doing",
  "Started",
  "Development",
]);
const REVIEW_CANDIDATES = Object.freeze([
  "In Review",
  "Code Review",
  "Ready for Review",
  "Waiting for Review",
  "Peer Review",
  "Review",
]);
const DONE_CANDIDATES = Object.freeze([
  "Done",
  "Closed",
  "Resolved",
  "Complete",
  "Completed",
]);
const CANCELLED_CANDIDATES = Object.freeze([
  "Cancelled",
  "Canceled",
  "Won't Do",
  "Rejected",
  "Closed",
]);
const WONT_DO_CANDIDATES = Object.freeze([
  "Won't Do",
  "Wont Do",
  "Won't Fix",
  "Declined",
  "Rejected",
  "Cancelled",
]);
const BLOCKED_CANDIDATES = Object.freeze(["Blocked", "On Hold", "Impeded"]);
const READY_CANDIDATES = Object.freeze([
  "Ready",
  "Ready for Development",
  "Selected for Development",
]);

const DEFAULT_STATUS_MAP = {
  // canonical lifecycle
  draft: NEW_CANDIDATES,
  planned: NEW_CANDIDATES,
  "ready-for-development": NEW_CANDIDATES,
  "in-progress": IN_PROGRESS_CANDIDATES,
  "ready-for-review": REVIEW_CANDIDATES,
  accepted: DONE_CANDIDATES,
  cancelled: CANCELLED_CANDIDATES,
  // aliases
  "ready for development": NEW_CANDIDATES,
  todo: NEW_CANDIDATES,
  "to do": NEW_CANDIDATES,
  open: NEW_CANDIDATES,
  backlog: NEW_CANDIDATES,
  "in progress": IN_PROGRESS_CANDIDATES,
  doing: IN_PROGRESS_CANDIDATES,
  "ready for review": REVIEW_CANDIDATES,
  "in review": REVIEW_CANDIDATES,
  review: REVIEW_CANDIDATES,
  ready: READY_CANDIDATES,
  done: DONE_CANDIDATES,
  completed: DONE_CANDIDATES,
  complete: DONE_CANDIDATES,
  blocked: BLOCKED_CANDIDATES,
  canceled: CANCELLED_CANDIDATES,
  "won't do": WONT_DO_CANDIDATES,
  "wont do": WONT_DO_CANDIDATES,
  "won't fix": WONT_DO_CANDIDATES,
  wontfix: WONT_DO_CANDIDATES,
};

// Local statuses meaning "this work is finished". Only these may fall back to
// statusCategory matching (resolveTransition rule 4) — see the comment there
// for why the fallback is unsafe for every other stage.
const TERMINAL_LOCAL_STATUSES = new Set([
  "accepted",
  "cancelled",
  "canceled",
  "done",
  "completed",
  "complete",
  "won't do",
  "wont do",
  "won't fix",
  "wontfix",
]);

// Terminal statuses meaning "finished WITHOUT being delivered" — these pick a
// negative resolution when the transition requires one.
const NEGATIVE_LOCAL_STATUSES = new Set([
  "cancelled",
  "canceled",
  "won't do",
  "wont do",
  "won't fix",
  "wontfix",
  "rejected",
]);

// Ordered preferences used to satisfy a required `resolution` field, filtered
// against that transition's own allowedValues. Never invented: if none match,
// the first value the workflow itself offers is used.
const POSITIVE_RESOLUTIONS = Object.freeze([
  "Done",
  "Resolved",
  "Fixed",
  "Complete",
  "Completed",
]);
const NEGATIVE_RESOLUTIONS = Object.freeze([
  "Won't Do",
  "Wont Do",
  "Cancelled",
  "Canceled",
  "Declined",
  "Rejected",
  "Won't Fix",
]);

// Strip a YAML-style inline trailing comment from a scalar value. A `#` starts
// a comment only at the start of the token or when preceded by whitespace, and
// never inside single/double quotes. Trailing whitespace is removed; any
// surrounding quotes are left for the caller to strip.
function stripInlineComment(s) {
  const str = String(s == null ? "" : s);
  let quote = null;
  for (let j = 0; j < str.length; j++) {
    const ch = str[j];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "#" && (j === 0 || /\s/.test(str[j - 1]))) {
      return str.slice(0, j).replace(/\s+$/, "");
    }
  }
  return str.replace(/\s+$/, "");
}

// Parse a `jira:` → `statusMap:` block out of skills-config.yaml text. Kept to
// a self-contained indentation scanner (no YAML dependency — pyyaml is not
// reliably installed in consumer environments). Supports the documented block
// form only; returns {} for anything it can't read.
//
//   jira:
//     statusMap:
//       ready-for-development: Selected for Development
//       accepted: "Done"
// Returns { base, byType } where `base` is the flat local-status -> candidates
// map and `byType` holds optional per-issue-type overrides. Values may be a
// single name or an ordered candidate list, in any of three forms:
//
//   jira:
//     statusMap:
//       ready-for-development: Selected for Development   # scalar
//       accepted: [Done, Closed]                          # flow sequence
//       ready-for-review:                                 # block sequence
//         - Waiting for Review
//         - In Review
//       epic:                                             # per-issue-type
//         accepted: Closed
//
// A nested key is read as an issue-type override when its children are
// `key: value` pairs, and as a candidate list when they are `- item` entries.
function unquote(s) {
  return String(s == null ? "" : s)
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

// `[A, B, "C, still C"]` -> ["A","B","C, still C"]; returns null if not a flow seq.
function parseFlowSequence(value) {
  const v = String(value || "").trim();
  if (!v.startsWith("[") || !v.endsWith("]")) return null;
  const inner = v.slice(1, -1);
  const items = [];
  let buf = "";
  let quote = null;
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null;
      else buf += ch;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ",") {
      items.push(buf);
      buf = "";
    } else buf += ch;
  }
  items.push(buf);
  return items.map((s) => unquote(s)).filter(Boolean);
}

function parseStatusMapBlock(text) {
  const base = {};
  const byType = {};
  const lines = String(text || "").split("\n");
  const indentOf = (l) => l.length - l.replace(/^\s+/, "").length;
  const isSkippable = (l) => !l.trim() || l.trim().startsWith("#");
  let i = 0;
  // find top-level `jira:`
  for (; i < lines.length; i++) {
    if (/^jira:\s*(#.*)?$/.test(lines[i])) {
      i++;
      break;
    }
  }
  if (i >= lines.length) return { base, byType };
  const jiraIndent = 0;
  // find `statusMap:` nested under jira
  let smIndent = -1;
  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (isSkippable(raw)) continue;
    if (indentOf(raw) <= jiraIndent) return { base, byType }; // left the jira block
    if (/^\s+statusMap:\s*(#.*)?$/.test(raw)) {
      smIndent = indentOf(raw);
      i++;
      break;
    }
  }
  if (smIndent < 0) return { base, byType };

  // collect entries indented deeper than statusMap
  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (isSkippable(raw)) continue;
    if (indentOf(raw) <= smIndent) break; // end of statusMap block
    const m = raw.trim().match(/^("?[^":]+"?|'[^']+'):\s*(.*?)\s*$/);
    if (!m) continue;
    const key = unquote(m[1]);
    if (!key) continue;
    const rawVal = stripInlineComment(m[2]).trim();

    if (rawVal) {
      const flow = parseFlowSequence(rawVal);
      const val = flow || unquote(rawVal);
      if (Array.isArray(val) ? val.length : val) base[key.toLowerCase()] = val;
      continue;
    }

    // Empty value: the entry continues on deeper-indented lines — either a
    // block sequence (candidate list) or a nested map (issue-type override).
    const entryIndent = indentOf(raw);
    const items = [];
    const nested = {};
    let j = i + 1;
    for (; j < lines.length; j++) {
      const child = lines[j];
      if (isSkippable(child)) continue;
      if (indentOf(child) <= entryIndent) break;
      const t = child.trim();
      if (t.startsWith("- ")) {
        const item = unquote(stripInlineComment(t.slice(2)));
        if (item) items.push(item);
        continue;
      }
      const cm = t.match(/^("?[^":]+"?|'[^']+'):\s*(.*?)\s*$/);
      if (!cm) continue;
      const ck = unquote(cm[1]);
      const cvRaw = stripInlineComment(cm[2]).trim();
      const cv = parseFlowSequence(cvRaw) || unquote(cvRaw);
      if (ck && (Array.isArray(cv) ? cv.length : cv))
        nested[ck.toLowerCase()] = cv;
    }
    i = j - 1;
    if (items.length) base[key.toLowerCase()] = items;
    else if (Object.keys(nested).length) byType[key.toLowerCase()] = nested;
  }
  return { base, byType };
}

// Build the effective status map: DEFAULT_STATUS_MAP overlaid with any
// `jira.statusMap` entries from skills-config.yaml at the repo root, then with
// that block's `<issueType>:` sub-map when `issueType` is given. Override keys
// are lowercased so lookups stay case-insensitive. Any failure (no file,
// unreadable, parse error) falls back to the defaults unchanged.
//
// The per-issue-type layer exists because a Jira project can run a different
// workflow per type — an Epic with only Open/Done alongside a Story with a full
// review-and-test lane — which one flat map cannot express.
function loadStatusMap(repoRoot, issueType) {
  const map = { ...DEFAULT_STATUS_MAP };
  const apply = (overrides) => {
    for (const [k, v] of Object.entries(overrides || {})) {
      if (typeof v === "string" && v.trim()) map[String(k).toLowerCase()] = v;
      else if (Array.isArray(v) && v.length)
        map[String(k).toLowerCase()] = v.slice();
    }
  };
  try {
    const root =
      repoRoot ||
      execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    const cfgPath = path.join(root, "skills-config.yaml");
    if (!fs.existsSync(cfgPath)) return map;
    const { base, byType } = parseStatusMapBlock(
      fs.readFileSync(cfgPath, "utf-8"),
    );
    apply(base);
    if (issueType) apply(byType[String(issueType).toLowerCase()]);
  } catch (_) {}
  return map;
}

// Map a raw frontmatter status to the ORDERED candidate Jira status names to
// try. Strips emoji, lowercases, looks up in `statusMap`; unmapped values pass
// through verbatim (emoji-stripped) as a single candidate, so a custom status
// name written straight into frontmatter still works.
//
// A map entry may be a string (one candidate — the config form) or an array
// (the defaults). Both normalise to an array here, so callers have one shape.
function mapStatusCandidates(raw, statusMap = DEFAULT_STATUS_MAP) {
  if (!raw) return null;
  const stripped = stripStatusEmoji(raw);
  if (!stripped) return null;
  const hit = statusMap[stripped.toLowerCase()];
  if (hit == null) return [stripped];
  const list = (Array.isArray(hit) ? hit : [hit])
    .map((s) => stripStatusEmoji(s))
    .filter(Boolean);
  return list.length ? list : [stripped];
}

// Back-compatible single-name view of the above: the primary (first) candidate.
// Retained because it is an exported part of the library surface; the sync
// scripts use mapStatusCandidates so they get the full list.
function mapStatus(raw, statusMap = DEFAULT_STATUS_MAP) {
  const list = mapStatusCandidates(raw, statusMap);
  return list ? list[0] : null;
}

// Is this local status one that means "finished"? Drives both the terminal-only
// statusCategory fallback and the choice of a positive/negative resolution.
function isTerminalLocalStatus(raw) {
  return TERMINAL_LOCAL_STATUSES.has(stripStatusEmoji(raw).toLowerCase());
}

function isNegativeLocalStatus(raw) {
  return NEGATIVE_LOCAL_STATUSES.has(stripStatusEmoji(raw).toLowerCase());
}

// ---------------------------------------------------------------------------
// Jira scalar config keys (e.g. custom-field ids under `jira:`)
// ---------------------------------------------------------------------------
// Read a single scalar `<key>: <value>` declared directly under the top-level
// `jira:` block in skills-config.yaml. Same self-contained indentation scanner
// philosophy as parseStatusMapBlock (no YAML dependency). Matching the literal
// key name means deeper nested entries (e.g. statusMap children) never collide.
// Returns "" when the key is absent.
//
//   jira:
//     devEstimateField: customfield_10594
function parseJiraScalar(text, key) {
  const lines = String(text || "").split("\n");
  const indentOf = (l) => l.length - l.replace(/^\s+/, "").length;
  const keyRe = new RegExp("^" + escapeRe(key) + ":\\s*(.+?)\\s*$");
  let i = 0;
  // find top-level `jira:`
  for (; i < lines.length; i++) {
    if (/^jira:\s*(#.*)?$/.test(lines[i])) {
      i++;
      break;
    }
  }
  if (i >= lines.length) return "";
  // scan entries inside the jira block. Only consider DIRECT children (the
  // indent of the first child), so deeper nested keys — e.g. a statusMap entry
  // that happens to share the name — never match.
  let childIndent = -1;
  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const ind = indentOf(raw);
    if (ind <= 0) break; // left the jira block
    if (childIndent < 0) childIndent = ind; // first child fixes the direct-child level
    if (ind !== childIndent) continue; // skip deeper nested entries
    const m = raw.trim().match(keyRe);
    if (m)
      return stripInlineComment(m[1])
        .replace(/^["']|["']$/g, "")
        .trim();
  }
  return "";
}

// Resolve the configured Jira custom-field id for estimated dev hours from
// `jira.devEstimateField` in skills-config.yaml at the repo root. Returns "" on
// any failure (no file, unreadable, key absent) so callers skip the field.
function loadDevEstimateField(repoRoot) {
  try {
    const root =
      repoRoot ||
      execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    const cfgPath = path.join(root, "skills-config.yaml");
    if (!fs.existsSync(cfgPath)) return "";
    return parseJiraScalar(
      fs.readFileSync(cfgPath, "utf-8"),
      "devEstimateField",
    );
  } catch (_) {
    return "";
  }
}

// Resolve a `jira.<key>` scalar from skills-config.yaml, with an environment
// override that wins. Returns "" when unset anywhere, which every caller reads
// as "use the built-in preference order".
function loadJiraScalarSetting(repoRoot, key, envVar) {
  const fromEnv = envVar && process.env[envVar];
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  try {
    const root =
      repoRoot ||
      execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    const cfgPath = path.join(root, "skills-config.yaml");
    if (!fs.existsSync(cfgPath)) return "";
    return parseJiraScalar(fs.readFileSync(cfgPath, "utf-8"), key);
  } catch (_) {
    return "";
  }
}

// Resolution names used when a workflow's done/cancelled transition requires a
// `resolution` field. Optional: left unset, buildTransitionFields falls back to
// POSITIVE_RESOLUTIONS / NEGATIVE_RESOLUTIONS and then to whatever the
// transition's own allowedValues offer first.
function loadDoneResolution(repoRoot) {
  return loadJiraScalarSetting(
    repoRoot,
    "doneResolution",
    "JIRA_DONE_RESOLUTION",
  );
}

function loadCancelledResolution(repoRoot) {
  return loadJiraScalarSetting(
    repoRoot,
    "cancelledResolution",
    "JIRA_CANCELLED_RESOLUTION",
  );
}

// Frontmatter placeholders that must never reach the Jira API. `assignee: TBD`
// shipped in the task template for a long time, and the sync passed it through
// as an accountId — so every card created the intended way and then synced got
// a bare `HTTP 400` with nothing naming the cause.
const ASSIGNEE_PLACEHOLDERS = new Set([
  "tbd",
  "tba",
  "none",
  "unassigned",
  "unset",
  "todo",
  "n/a",
  "na",
  "-",
  "?",
]);

function isAssigneePlaceholder(value) {
  return ASSIGNEE_PLACEHOLDERS.has(
    String(value || "")
      .trim()
      .toLowerCase(),
  );
}

// Resolve the default Jira assignee accountId from `jira.defaultAssignee` in
// skills-config.yaml at the repo root. Returns "" on any failure (no file,
// unreadable, key absent) so callers leave the assignee untouched.
//
// Kept in config rather than in the template because an accountId is specific
// to one Jira site and one person — hardcoding one into a shared skill would
// make the template wrong for every other consumer.
function loadDefaultAssignee(repoRoot) {
  try {
    const root =
      repoRoot ||
      execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    const cfgPath = path.join(root, "skills-config.yaml");
    if (!fs.existsSync(cfgPath)) return "";
    return parseJiraScalar(
      fs.readFileSync(cfgPath, "utf-8"),
      "defaultAssignee",
    );
  } catch (_) {
    return "";
  }
}

// Decide the accountId to send, if any. Frontmatter wins over the configured
// default; a placeholder in either is dropped with a warning rather than sent.
//
// Returns "" to mean "send nothing" — which leaves any existing Jira assignee
// alone on an update, rather than clearing it.
function resolveAssignee(frontmatterValue, defaultAssignee, output = null) {
  const warn = (output && output.warn) || (() => {});

  if (frontmatterValue) {
    if (!isAssigneePlaceholder(frontmatterValue))
      return String(frontmatterValue);
    warn(
      `Ignoring placeholder assignee "${frontmatterValue}" — Jira needs an accountId, ` +
        `and sending this verbatim returns HTTP 400.\n` +
        `    Replace it with an accountId, delete the line, or set jira.defaultAssignee in skills-config.yaml.`,
    );
  }

  if (defaultAssignee && !isAssigneePlaceholder(defaultAssignee)) {
    return String(defaultAssignee);
  }
  return "";
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------
function stripStatusEmoji(s) {
  return String(s || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .trim();
}

// `expand=transitions.fields` makes Jira declare, per transition, which fields
// the workflow's transition screen requires and what values it will accept.
// Without it a transition that requires e.g. a resolution returns HTTP 400 with
// no way to know what was missing. See buildTransitionFields.
async function getTransitions({ http, baseUrl, email, token, issueKey }) {
  const resp = await http(
    `${baseUrl}/rest/api/3/issue/${issueKey}/transitions?expand=transitions.fields`,
    {
      headers: {
        Authorization: authHeader(email, token),
        Accept: "application/json",
      },
    },
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.transitions || [];
}

const eqName = (a, b) =>
  String(a || "").toLowerCase() === String(b || "").toLowerCase();

// Pick the transition to fire, given the ordered candidate names for a local
// status and the transitions Jira says are actually available right now.
//
// Pure (no I/O) so the rules can be unit-tested against captured API payloads.
// Returns { match, rule } on success, or { match: null, reason } otherwise.
//
// Order matters, and each step is exact — never fuzzy:
//   1. already satisfied — the issue already sits in one of the candidates
//   2. target status name (`to.name`), candidates in order
//   3. transition name (`name`), candidates in order
//   4. terminal statuses ONLY: the single transition into statusCategory "done"
//
// Step 3 exists because workflows routinely name the *action* rather than the
// destination — "Implemented" leading to "Waiting for Review". Step 2 is
// exhausted across all candidates first so a board offering both an exact
// destination match and an unrelated action name picks the destination.
//
// Step 4 is deliberately restricted to terminal statuses. Falling back to
// statusCategory for "new"/"indeterminate" was tried and rejected: on a real
// board it silently picked WRONG transitions — `ready-for-review` resolved to
// "In Progress", and `in-progress` resolved to "Waiting for Review" — because
// those categories routinely hold several unrelated states. A skipped status
// change is recoverable; a confident wrong transition is not.
function resolveTransition({
  transitions,
  candidates,
  currentStatus,
  terminal = false,
}) {
  const list = (candidates || []).map(stripStatusEmoji).filter(Boolean);
  const current = stripStatusEmoji(currentStatus);
  const avail = transitions || [];
  if (!list.length) return { match: null, reason: "no-target" };

  if (list.some((c) => eqName(c, current)))
    return { match: null, reason: "already" };

  for (const c of list) {
    const m = avail.find((t) => eqName(t.to && t.to.name, c));
    if (m) return { match: m, rule: `to.name="${c}"` };
  }
  for (const c of list) {
    const m = avail.find((t) => eqName(t.name, c));
    if (m) return { match: m, rule: `name="${c}"` };
  }

  if (terminal) {
    const done = avail.filter(
      (t) => t.to && t.to.statusCategory && t.to.statusCategory.key === "done",
    );
    if (done.length === 1)
      return { match: done[0], rule: "statusCategory=done (unambiguous)" };
    if (done.length > 1) return { match: null, reason: "ambiguous-terminal" };
  }

  return { match: null, reason: "no-transition" };
}

// Satisfy whatever fields the matched transition declares as required, using
// only values that transition itself offers in `allowedValues`.
//
// Generic on purpose: nothing here knows any particular board's vocabulary, it
// reads the schema the workflow publishes. `resolution` is the one field with
// enough shared meaning to fill safely — everything else is reported as
// unfillable so the caller can skip rather than fire a request certain to 400.
function buildTransitionFields(
  match,
  { negative = false, resolutionPref = "" } = {},
) {
  const required = Object.entries((match && match.fields) || {}).filter(
    ([, spec]) => spec && spec.required,
  );
  const fields = {};
  const unfillable = [];

  for (const [key, spec] of required) {
    if (key !== "resolution") {
      unfillable.push(key);
      continue;
    }
    const allowed = (spec && spec.allowedValues) || [];
    const prefs = [
      resolutionPref,
      ...(negative ? NEGATIVE_RESOLUTIONS : POSITIVE_RESOLUTIONS),
    ].filter(Boolean);
    const pick =
      prefs.map((p) => allowed.find((v) => eqName(v.name, p))).find(Boolean) ||
      allowed[0];
    if (!pick) {
      unfillable.push(key);
      continue;
    }
    fields.resolution =
      pick.id != null ? { id: String(pick.id) } : { name: pick.name };
  }

  return {
    fields: Object.keys(fields).length ? fields : null,
    unfillable,
    requiredKeys: required.map(([k]) => k),
  };
}

// Move an issue to the status implied by its local document status.
//
// `targetStatus` accepts either a single name (legacy callers) or the ordered
// candidate list from mapStatusCandidates. `localStatus` is the raw frontmatter
// value, used only to decide whether this is a terminal status — which unlocks
// the statusCategory fallback and selects a positive vs negative resolution.
//
// Never throws and never fails the sync; returns a { transitioned, reason }
// record that callers surface in their summary (see the --fail-on-status-skip
// handling in the sync scripts).
async function transitionToStatus({
  http,
  baseUrl,
  email,
  token,
  issueKey,
  targetStatus,
  currentStatus,
  localStatus,
  doneResolution = "",
  cancelledResolution = "",
  output,
}) {
  const candidates = (
    Array.isArray(targetStatus) ? targetStatus : [targetStatus]
  )
    .map(stripStatusEmoji)
    .filter(Boolean);
  const current = stripStatusEmoji(currentStatus);
  if (!candidates.length) return { transitioned: false, reason: "no-target" };

  const localRaw = localStatus == null ? candidates[0] : localStatus;
  const terminal = isTerminalLocalStatus(localRaw);
  const negative = isNegativeLocalStatus(localRaw);

  // Short-circuit before any network call when the issue already sits in one of
  // the candidate statuses — resolveTransition would reach the same verdict,
  // but only after a pointless round-trip.
  if (candidates.some((c) => eqName(c, current)))
    return {
      transitioned: false,
      reason: "already",
      to: current,
      from: current,
    };

  const transitions = await getTransitions({
    http,
    baseUrl,
    email,
    token,
    issueKey,
  });
  const { match, rule, reason } = resolveTransition({
    transitions,
    candidates,
    currentStatus: current,
    terminal,
  });

  const describeAvailable = () => {
    const seen = transitions
      .map((t) => {
        const to = (t.to && t.to.name) || "";
        return to && !eqName(to, t.name) ? `${t.name} → ${to}` : t.name || to;
      })
      .filter(Boolean);
    return seen.length ? seen.join(", ") : "(none)";
  };

  if (!match) {
    if (reason === "already")
      return { transitioned: false, reason: "already", to: current };
    if (output) {
      const why =
        reason === "ambiguous-terminal"
          ? `Several transitions lead to a done status, so none was assumed`
          : `No transition matched`;
      output.warn(
        `⚠️  Jira status not changed for ${issueKey} (currently "${current}").`,
      );
      output.warn(`    ${why}. Tried, in order: ${candidates.join(", ")}.`);
      output.warn(`    Available from here: ${describeAvailable()}.`);
      output.warn(
        `    Set jira.statusMap in skills-config.yaml to name the status this board uses,` +
          ` or run with --probe-workflow to see the board's full transition graph.`,
      );
    }
    return {
      transitioned: false,
      reason: reason || "no-transition",
      candidates,
      available: describeAvailable(),
      from: current,
    };
  }

  const { fields, unfillable, requiredKeys } = buildTransitionFields(match, {
    negative,
    resolutionPref: negative ? cancelledResolution : doneResolution,
  });

  // Refuse to send a request the workflow has already told us is incomplete.
  if (unfillable.length) {
    if (output) {
      output.warn(
        `⚠️  Jira status not changed for ${issueKey}: transition "${match.name}" requires` +
          ` field(s) this sync cannot fill: ${unfillable.join(", ")}.`,
      );
      output.warn(
        `    Move it by hand in Jira, or relax the transition screen's required fields.`,
      );
    }
    return {
      transitioned: false,
      reason: "required-fields",
      unfillable,
      from: current,
    };
  }

  const body = { transition: { id: match.id } };
  if (fields) body.fields = fields;

  const resp = await http(
    `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(email, token),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!resp.ok) {
    const msg = await parseJiraError(resp);
    if (output) {
      output.warn(
        `⚠️  Jira status not changed for ${issueKey}: transition "${match.name}" returned HTTP ${resp.status}: ${msg}`,
      );
      if (requiredKeys.length)
        output.warn(`    Fields sent: ${JSON.stringify(fields || {})}.`);
      // A workflow *validator* (as opposed to a required field) is invisible to
      // `expand=transitions.fields`, so this is the only place it can surface.
      output.warn(
        `    If the message names a field or a worklog, that is a workflow validator the` +
          ` transitions API does not advertise; it must be satisfied in the same request.`,
      );
    }
    return {
      transitioned: false,
      reason: `http-${resp.status}`,
      detail: msg,
      from: current,
    };
  }

  const landed = (match.to && match.to.name) || match.name;
  if (output)
    output.info(
      `   🔀 Transitioned ${issueKey}: "${current}" → "${landed}" (matched ${rule})`,
    );
  return { transitioned: true, from: current, to: landed, rule };
}

// Drive an issue's Jira status from a local document's frontmatter status.
// Shared by all three sync skills so they resolve, configure, and report
// identically. `docKind` ("story" | "task" | "epic") selects the optional
// per-issue-type layer of jira.statusMap.
async function syncDocumentStatus({
  http,
  baseUrl,
  email,
  token,
  issueKey,
  localStatus,
  currentStatus,
  docKind,
  repoRoot,
  output,
}) {
  const root =
    repoRoot ||
    (() => {
      try {
        return execSync("git rev-parse --show-toplevel", {
          encoding: "utf-8",
        }).trim();
      } catch (_) {
        return "";
      }
    })();

  const statusMap = loadStatusMap(root || undefined, docKind);
  const candidates = mapStatusCandidates(localStatus, statusMap);
  if (!candidates || !candidates.length)
    return { transitioned: false, reason: "no-target", localStatus };

  const res = await transitionToStatus({
    http,
    baseUrl,
    email,
    token,
    issueKey,
    targetStatus: candidates,
    currentStatus,
    localStatus,
    doneResolution: loadDoneResolution(root || undefined),
    cancelledResolution: loadCancelledResolution(root || undefined),
    output,
  });
  return { ...res, localStatus, issueKey };
}

// Terse end-of-run line for a status change that did not happen, printed after
// the success output so it cannot be lost in the middle of a long sync. The
// detailed diagnosis was already emitted by transitionToStatus.
//
// Returns the exit code to use: non-zero only under --fail-on-status-skip, so
// existing pipelines on boards this cannot drive keep working.
function summariseStatusOutcome(outcome, { output, failOnSkip = false } = {}) {
  if (!outcome) return 0;
  const { transitioned, reason } = outcome;
  if (transitioned || reason === "already" || reason === "no-target") return 0;

  if (output) {
    const where = outcome.from ? ` It is still "${outcome.from}".` : "";
    output.warn(
      `\n⚠️  Status NOT synced for ${outcome.issueKey} (local status "${outcome.localStatus}", reason: ${reason}).${where}` +
        `\n    Everything else synced. Move it by hand, or see the guidance above.`,
    );
  }
  return failOnSkip ? 1 : 0;
}

// The canonical local vocabulary, in lifecycle order — what a probe reports on.
const CANONICAL_LOCAL_STATUSES = Object.freeze([
  "draft",
  "planned",
  "ready-for-development",
  "in-progress",
  "ready-for-review",
  "accepted",
  "cancelled",
]);

// Read-only diagnostic: show what this Jira project's workflow actually offers
// and, for each canonical local status, which transition would be chosen and by
// which rule. Writes nothing, transitions nothing.
//
// Boards vary enough that guessing at `jira.statusMap` from documentation is a
// waste of time; this prints the ground truth instead. Sampling a real issue
// per type is what makes it honest — transitions are position-dependent, so the
// answer legitimately differs depending on where an issue currently sits.
async function probeWorkflow({
  http,
  baseUrl,
  email,
  token,
  projectKey,
  issueKey,
  repoRoot,
  docKind,
  output,
}) {
  const log = (s) => output && output.info(s);
  const headers = {
    Authorization: authHeader(email, token),
    Accept: "application/json",
  };

  log(
    `\n🔎 Workflow probe — project ${projectKey}${baseUrl ? ` (${baseUrl})` : ""}`,
  );

  // 1. statuses per issue type
  let types = [];
  try {
    const resp = await http(
      `${baseUrl}/rest/api/3/project/${projectKey}/statuses`,
      { headers },
    );
    if (resp.ok) types = await resp.json();
  } catch (_) {}

  if (!types.length) {
    log(
      `   Could not read project statuses (permissions or wrong project key).`,
    );
  } else {
    log(`\n   Statuses by issue type`);
    for (const t of types) {
      const names = (t.statuses || [])
        .map((s) => `${s.name} [${s.statusCategory && s.statusCategory.key}]`)
        .join(", ");
      log(`     ${t.name}: ${names || "(none)"}`);
    }
  }

  // 2. sample a live issue per issue type so transitions are real, not guessed
  const samples = [];
  if (issueKey) {
    samples.push({ key: issueKey, type: "(supplied)" });
  } else {
    for (const t of types) {
      try {
        const jql = encodeURIComponent(
          `project=${projectKey} AND issuetype="${t.name}" ORDER BY updated DESC`,
        );
        const resp = await http(
          `${baseUrl}/rest/api/3/search/jql?jql=${jql}&maxResults=1&fields=status`,
          { headers },
        );
        if (!resp.ok) continue;
        const data = await resp.json();
        const hit = (data.issues || [])[0];
        if (hit)
          samples.push({
            key: hit.key,
            type: t.name,
            status: hit.fields && hit.fields.status && hit.fields.status.name,
          });
      } catch (_) {}
    }
  }

  if (!samples.length) {
    log(
      `\n   No issues found to sample — transitions are only visible from a real issue.`,
    );
    return { types, samples: [] };
  }

  const statusMap = loadStatusMap(repoRoot, docKind);
  const results = [];

  for (const s of samples) {
    let transitions = [];
    try {
      transitions = await getTransitions({
        http,
        baseUrl,
        email,
        token,
        issueKey: s.key,
      });
    } catch (_) {}

    log(`\n   ${s.key} — ${s.type} @ "${s.status || "?"}"`);
    log(`     Transitions available from here:`);
    for (const t of transitions) {
      const req = Object.entries(t.fields || {})
        .filter(([, v]) => v && v.required)
        .map(([k]) => k);
      log(
        `       id=${t.id} "${t.name}" → "${(t.to && t.to.name) || "?"}"` +
          `${req.length ? `  requires: ${req.join(", ")}` : ""}`,
      );
    }

    log(`     Local status → what this sync would do:`);
    for (const local of CANONICAL_LOCAL_STATUSES) {
      const candidates = mapStatusCandidates(local, statusMap) || [];
      const r = resolveTransition({
        transitions,
        candidates,
        currentStatus: s.status,
        terminal: isTerminalLocalStatus(local),
      });
      if (!r.match) {
        log(`       ${local.padEnd(22)} skip (${r.reason})`);
        results.push({ issue: s.key, local, action: `skip:${r.reason}` });
        continue;
      }
      const built = buildTransitionFields(r.match, {
        negative: isNegativeLocalStatus(local),
      });
      const extra = built.unfillable.length
        ? `  UNFILLABLE: ${built.unfillable.join(", ")}`
        : built.fields
          ? `  + ${JSON.stringify(built.fields)}`
          : "";
      log(
        `       ${local.padEnd(22)} → "${(r.match.to && r.match.to.name) || r.match.name}"` +
          ` (via ${r.rule})${extra}`,
      );
      results.push({
        issue: s.key,
        local,
        to: r.match.to && r.match.to.name,
        rule: r.rule,
        unfillable: built.unfillable,
      });
    }
  }

  log(
    `\n   Candidate names come from jira.statusMap in skills-config.yaml, overlaid on the defaults.` +
      `\n   A "skip" above means this board has no transition for that stage from that position — which is` +
      `\n   often correct. Only add a statusMap entry when a stage you actually use is being skipped.\n`,
  );
  return { types, samples, results };
}

// ---------------------------------------------------------------------------
// Project style detection (team-managed vs classic) — used for Story epic linkage
// ---------------------------------------------------------------------------
const PROJECT_STYLE_TTL_MS = 24 * 60 * 60 * 1000;

function projectStyleCachePath(repoRoot, projectKey) {
  return path.join(repoRoot, ".cache", `jira-projectstyle-${projectKey}.json`);
}

function readProjectStyleCache(repoRoot, projectKey) {
  const p = projectStyleCachePath(repoRoot, projectKey);
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    if (!data.ts || Date.now() - data.ts > PROJECT_STYLE_TTL_MS) return null;
    return data.style || null;
  } catch (_) {
    return null;
  }
}

function writeProjectStyleCache(repoRoot, projectKey, style) {
  const p = projectStyleCachePath(repoRoot, projectKey);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ ts: Date.now(), style }, null, 2));
}

async function detectProjectStyle({
  http,
  baseUrl,
  email,
  token,
  projectKey,
  repoRoot,
  output,
} = {}) {
  if (repoRoot) {
    const cached = readProjectStyleCache(repoRoot, projectKey);
    if (cached) return cached;
  }
  try {
    const resp = await http(`${baseUrl}/rest/api/3/project/${projectKey}`, {
      headers: {
        Authorization: authHeader(email, token),
        Accept: "application/json",
      },
    });
    if (!resp.ok) {
      if (output)
        output.warn(
          `⚠️  Could not detect Jira project style (HTTP ${resp.status}); will try team-managed parent first and fall back via 400-retry.`,
        );
      return null;
    }
    const d = await resp.json();
    const style = d.style || null;
    if (style && repoRoot) writeProjectStyleCache(repoRoot, projectKey, style);
    return style;
  } catch (e) {
    if (output)
      output.warn(
        `⚠️  Could not detect Jira project style (${e.message}); will try team-managed parent first and fall back via 400-retry.`,
      );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Idempotent create — search by sync label before POST
//
// Uses POST /rest/api/3/search/jql (the modern endpoint). The legacy GET
// /rest/api/3/search was deprecated by Atlassian in May 2025 and now returns
// 410 Gone on Jira Cloud tenants that have migrated.
// ---------------------------------------------------------------------------
async function findExistingByLabel({
  http,
  baseUrl,
  email,
  token,
  projectKey,
  label,
  output,
} = {}) {
  const jql = `project = "${projectKey}" AND labels = "${label}"`;
  const resp = await http(`${baseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: authHeader(email, token),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      jql,
      fields: ["summary", "updated"],
      maxResults: 5,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.issues || data.issues.length === 0) return null;
  if (data.issues.length > 1 && output) {
    const keys = data.issues.map((i) => i.key).join(", ");
    output.warn(
      `⚠️  Multiple Jira issues match label "${label}": ${keys}. Adopting first (${data.issues[0].key}). The others are duplicates from prior failed runs — review and delete in Jira.`,
    );
  }
  return {
    key: data.issues[0].key,
    updated: data.issues[0].fields?.updated || null,
  };
}

// ---------------------------------------------------------------------------
// Atomic PUT with returnIssue
// ---------------------------------------------------------------------------
async function putIssueAtomic({
  http,
  baseUrl,
  email,
  token,
  issueKey,
  fields,
}) {
  const resp = await http(
    `${baseUrl}/rest/api/3/issue/${issueKey}?returnIssue=true`,
    {
      method: "PUT",
      headers: {
        Authorization: authHeader(email, token),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!resp.ok)
    throw new Error(`HTTP ${resp.status}: ${await parseJiraError(resp)}`);
  if (resp.status === 204) {
    return { updated: null };
  }
  try {
    const data = await resp.json();
    return { updated: data.fields?.updated || null };
  } catch (_) {
    return { updated: null };
  }
}

async function fetchIssue({
  http,
  baseUrl,
  email,
  token,
  issueKey,
  fields = "summary,priority,labels,updated,status",
}) {
  const resp = await http(
    `${baseUrl}/rest/api/3/issue/${issueKey}?fields=${fields}`,
    {
      headers: {
        Authorization: authHeader(email, token),
        Accept: "application/json",
      },
    },
  );
  if (!resp.ok) {
    const auth = describeAuthFail(resp.status);
    if (auth) throw new Error(auth);
    throw new Error(`HTTP ${resp.status}: ${await parseJiraError(resp)}`);
  }
  const d = await resp.json();
  return {
    summary: d.fields?.summary || "",
    priority: d.fields?.priority?.name || "",
    labels: d.fields?.labels || [],
    updated: d.fields?.updated || null,
    status: d.fields?.status?.name || null,
  };
}

async function fetchUpdatedTimestampStrict({
  http,
  baseUrl,
  email,
  token,
  issueKey,
}) {
  const resp = await http(
    `${baseUrl}/rest/api/3/issue/${issueKey}?fields=updated`,
    {
      headers: {
        Authorization: authHeader(email, token),
        Accept: "application/json",
      },
    },
  );
  if (!resp.ok)
    throw new Error(
      `Failed to fetch updated timestamp for ${issueKey}: HTTP ${resp.status}`,
    );
  const d = await resp.json();
  if (!d.fields?.updated)
    throw new Error(`Jira response missing fields.updated for ${issueKey}`);
  return d.fields.updated;
}

// Non-throwing variant. Returns null on failure so callers can fall back to
// a synthetic timestamp rather than aborting after a successful create/update.
async function fetchUpdatedTimestamp({
  http,
  baseUrl,
  email,
  token,
  issueKey,
}) {
  try {
    const resp = await http(
      `${baseUrl}/rest/api/3/issue/${issueKey}?fields=updated`,
      {
        headers: {
          Authorization: authHeader(email, token),
          Accept: "application/json",
        },
      },
    );
    if (!resp.ok) return null;
    const d = await resp.json();
    return d.fields?.updated || null;
  } catch (_) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  // env / output
  loadDotEnv,
  makeOutput,
  // frontmatter
  parseFrontmatter,
  rewriteFrontmatter,
  upsertFrontmatterKeys,
  formatYamlScalar,
  // git / bb
  getRepoRoot,
  getDefaultBranch,
  getCurrentBranchUpstream,
  stripRemotePrefix,
  getBitbucketRepoBase,
  buildBitbucketUrl,
  resolveRelativeLink,
  makeRelativeLinkResolver,
  // changelog
  CL_START,
  CL_END,
  fmtEntry,
  buildChangelogBlock,
  isEntryRow,
  RE_ENTRY_ROW,
  extractEntries,
  findHandWrittenChangelog,
  upsertChangelog,
  // adf
  adf,
  textToAdfNodes,
  textToParagraphs,
  blockToAdf,
  tableLinesToAdf,
  inlineMarkdownToAdf,
  sectionRe,
  extractBodySections,
  escapeRe,
  // priority / labels
  PRIORITY_MAP,
  normalisePriority,
  sanitiseLabels,
  resolveLivePriorities,
  // auth / http
  getAuth,
  authHeader,
  makeHttp,
  parseRetryAfter,
  sleep,
  parseJiraError,
  describeAuthFail,
  // diff / guard / hash
  diffFields,
  guardConcurrentEdit,
  hashStable,
  // jira api
  fetchIssue,
  fetchUpdatedTimestampStrict,
  fetchUpdatedTimestamp,
  getIssueTypeId,
  getBoardType,
  moveToBacklog,
  putIssueAtomic,
  findExistingByLabel,
  transitionToStatus,
  syncDocumentStatus,
  summariseStatusOutcome,
  probeWorkflow,
  CANONICAL_LOCAL_STATUSES,
  getTransitions,
  resolveTransition,
  buildTransitionFields,
  stripStatusEmoji,
  detectProjectStyle,
  // status mapping
  DEFAULT_STATUS_MAP,
  loadStatusMap,
  mapStatus,
  mapStatusCandidates,
  isTerminalLocalStatus,
  isNegativeLocalStatus,
  // jira scalar config
  parseJiraScalar,
  loadDevEstimateField,
  loadDoneResolution,
  loadCancelledResolution,
  loadDefaultAssignee,
  resolveAssignee,
  isAssigneePlaceholder,
  // cache
  readIssueTypeCache,
  writeIssueTypeCache,
  readProjectStyleCache,
  writeProjectStyleCache,
};
