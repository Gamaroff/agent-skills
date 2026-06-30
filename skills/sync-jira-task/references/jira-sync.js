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
    const root = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    const envPath = path.join(root, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 1) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Output mode
// ---------------------------------------------------------------------------
function makeOutput({ json = false, quiet = false } = {}) {
  return {
    log:  (...a) => { if (!json && !quiet) console.log(...a); },
    info: (...a) => { if (!json && !quiet) console.log(...a); },
    warn: (...a) => { if (!json) console.warn(...a); },
    err:  (...a) => console.error(...a),
    emit: payload => process.stdout.write(JSON.stringify(payload, null, 2) + "\n"),
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
    if (!line.includes(":")) { i++; continue; }
    const ci = line.indexOf(":");
    const key = line.slice(0, ci).trim();
    let val = line.slice(ci + 1).trim();

    if (val === "" && i + 1 < lines.length && lines[i + 1].trimStart().startsWith("-")) {
      const items = [];
      i++;
      while (i < lines.length && lines[i].trimStart().startsWith("-")) {
        items.push(lines[i].trim().slice(1).trim().replace(/^["']|["']$/g, ""));
        i++;
      }
      fm[key] = items;
      continue;
    }

    if (val === "[]") {
      val = [];
    } else if (val.startsWith("[") && val.endsWith("]")) {
      const inner = val.slice(1, -1).trim();
      val = inner === "" ? [] : inner.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
    } else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
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
  const out = lines.map(line => {
    const ci = line.indexOf(":");
    if (ci < 1) return line;
    const key = line.slice(0, ci).trim();
    if (!(key in updates)) return line;
    seen.add(key);
    const v = updates[key];
    if (v === null || v === undefined) return null;
    return `${key}: ${formatYamlScalar(v)}`;
  }).filter(l => l !== null);

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
  if (Array.isArray(v)) return `[${v.map(x => `"${String(x).replace(/"/g, '\\"')}"`).join(", ")}]`;
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
    return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
  } catch (_) { return process.cwd(); }
}

function getDefaultBranch() {
  try {
    const ref = execSync("git symbolic-ref refs/remotes/origin/HEAD", { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const m = ref.match(/refs\/remotes\/origin\/(.+)$/);
    if (m) return m[1];
  } catch (_) {}
  for (const candidate of ["main", "master", "develop"]) {
    try {
      execSync(`git rev-parse --verify --quiet origin/${candidate}`, { stdio: "ignore" });
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
    const remote = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
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
// Changelog
// ---------------------------------------------------------------------------
const CL_START = "<!-- jira-sync-changelog-start -->";
const CL_END   = "<!-- jira-sync-changelog-end -->";
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RE_CL_BLOCK = new RegExp(`${escapeRe(CL_START)}[\\s\\S]*?${escapeRe(CL_END)}`);
const RE_CL_INNER = new RegExp(`${escapeRe(CL_START)}([\\s\\S]*?)${escapeRe(CL_END)}`);

const RE_ENTRY_ROW = /^\|\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s*\|/;

function fmtEntry(summary) {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  return `| ${now} | ${summary} |`;
}

function buildChangelogBlock(entries) {
  return (
    `${CL_START}\n## Change Log\n\n` +
    `| Date (UTC) | Change |\n|------------|--------|\n` +
    entries.join("\n") + `\n${CL_END}`
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
  const next  = after.match(/^## /m);
  const end   = next ? start + m[0].length + after.indexOf(next[0]) : content.length;
  return { start, end };
}

function upsertChangelog(content, newEntry) {
  if (RE_CL_BLOCK.test(content)) {
    const entries = [...extractEntries(content), newEntry];
    return content.replace(RE_CL_BLOCK, buildChangelogBlock(entries));
  }
  const hand = findHandWrittenChangelog(content);
  if (hand) {
    const existing = content.slice(hand.start, hand.end).split("\n").filter(isEntryRow);
    const entries = [...existing, newEntry];
    const trailing = hand.end < content.length ? "\n\n" : "\n";
    return content.slice(0, hand.start) + buildChangelogBlock(entries) + trailing + content.slice(hand.end);
  }
  const sec = content.match(/^## /m);
  if (sec) {
    const idx = content.indexOf(sec[0]);
    return content.slice(0, idx) + buildChangelogBlock([newEntry]) + "\n\n" + content.slice(idx);
  }
  return content.trimEnd() + "\n\n" + buildChangelogBlock([newEntry]) + "\n";
}

// ---------------------------------------------------------------------------
// ADF builders
// ---------------------------------------------------------------------------
const adf = {
  doc: (...content) => ({ version: 1, type: "doc", content }),
  paragraph: (...content) => ({ type: "paragraph", content }),
  heading: (level, text) => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] }),
  text: t => ({ type: "text", text: t }),
  link: (text, href) => ({ type: "text", text, marks: [{ type: "link", attrs: { href } }] }),
  bulletList: (...items) => ({ type: "bulletList", content: items }),
  orderedList: (...items) => ({ type: "orderedList", content: items }),
  listItem: (...content) => ({ type: "listItem", content }),
  table: rows => ({ type: "table", attrs: { isNumberColumnEnabled: false, layout: "default" }, content: rows }),
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
function inlineMarkdownToAdf(text) {
  if (text == null || text === "") return [adf.text("")];
  // Build a fresh regex each call to reset lastIndex safely across re-entrant use.
  const re = /(\*\*([^*\n]+)\*\*)|(`([^`\n]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  const out = [];
  let lastIdx = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > lastIdx) out.push(adf.text(text.slice(lastIdx, m.index)));
    if (m[1])      out.push({ type: "text", text: m[2], marks: [{ type: "strong" }] });
    else if (m[3]) out.push({ type: "text", text: m[4], marks: [{ type: "code" }] });
    else if (m[5]) out.push(adf.link(m[6], m[7]));
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) out.push(adf.text(text.slice(lastIdx)));
  return out.length ? out : [adf.text(text)];
}

// ---------------------------------------------------------------------------
// Table helpers for textToAdfNodes
// ---------------------------------------------------------------------------
const RE_MD_HEADING    = /^(#{2,6})\s+(.+)$/;
const RE_TABLE_ROW_START = /^\s*\|/;
const RE_HR_LINE       = /^[-*_]{3,}\s*$/;

function isTableSepLine(l) {
  return /^\|?[\s\-:|]+\|?$/.test(l.trim()) && /-/.test(l);
}

function tableLinesToAdf(lines) {
  const dataLines = lines.filter(l => l.trim() && !isTableSepLine(l));
  if (!dataLines.length) return null;
  const PH = "\x01";
  const splitRow = line => {
    const masked = line.replace(/\\\|/g, PH);
    const cells = masked.split("|");
    if (cells.length && cells[0].trim() === "") cells.shift();
    if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
    return cells.map(c => c.split(PH).join("|").trim());
  };
  const rows = dataLines.map(splitRow);
  const [header, ...body] = rows;
  if (!header || !header.length) return null;
  return adf.table([
    adf.tableRow(...header.map(h => adf.tableHeader(adf.paragraph(...inlineMarkdownToAdf(h))))),
    ...body.map(r => adf.tableRow(...r.map(c => adf.tableCell(adf.paragraph(...inlineMarkdownToAdf(c)))))),
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
function textToAdfNodes(text) {
  if (!text) return [];
  const nodes = [];
  const lines = text.split("\n");
  let buf = [];
  let tableBuf = [];

  const flushBuf = () => {
    if (!buf.length) return;
    const blockText = buf.join("\n").trim();
    buf = [];
    if (blockText) nodes.push(...blockToAdf(blockText));
  };
  const flushTable = () => {
    if (!tableBuf.length) return;
    const node = tableLinesToAdf(tableBuf);
    tableBuf = [];
    if (node) nodes.push(node);
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (RE_HR_LINE.test(trimmed)) {                  // horizontal rule — skip
      flushBuf(); flushTable(); continue;
    }
    const hm = trimmed.match(RE_MD_HEADING);
    if (hm) {                                         // ##–###### heading
      flushBuf(); flushTable();
      nodes.push(adf.heading(Math.min(hm[1].length, 6), hm[2]));
      continue;
    }
    if (RE_TABLE_ROW_START.test(line)) {              // table row
      flushBuf(); tableBuf.push(line); continue;
    }
    if (tableBuf.length) flushTable();                // non-table line ends table
    if (trimmed === "") { flushBuf(); continue; }     // blank line = paragraph break
    buf.push(line);
  }

  flushBuf();
  flushTable();
  return nodes.filter(Boolean);
}

function blockToAdf(block) {
  const lines = block.split("\n").filter(l => l.length > 0);
  if (lines.length === 0) return [];

  if (lines.every(l => RE_BULLET.test(l))) {
    return [adf.bulletList(...lines.map(l => {
      const m = l.match(RE_BULLET);
      return adf.listItem(adf.paragraph(...inlineMarkdownToAdf(m[1])));
    }))];
  }
  if (lines.every(l => RE_ORDERED.test(l))) {
    return [adf.orderedList(...lines.map(l => {
      const m = l.match(RE_ORDERED);
      return adf.listItem(adf.paragraph(...inlineMarkdownToAdf(m[1])));
    }))];
  }

  const inline = [];
  lines.forEach((l, i) => {
    if (l.length) inline.push(...inlineMarkdownToAdf(l));
    if (i < lines.length - 1) inline.push(adf.hardBreak());
  });
  return inline.length ? [adf.paragraph(...inline)] : [];
}

// Backward-compat name
const textToParagraphs = textToAdfNodes;

function sectionRe(name) {
  return new RegExp(`## ${escapeRe(name)}\\s*\\n+([\\s\\S]*?)(?=\\n## |\\n# |$)`);
}

function extractBodySections(body, sectionNames) {
  const out = [];
  for (const head of sectionNames) {
    const m = body.match(sectionRe(head));
    if (m && m[1].trim()) out.push({ name: head, content: m[1].trim() });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Priority + labels
// ---------------------------------------------------------------------------
const PRIORITY_MAP = {
  highest: "Highest", critical: "Highest", blocker: "Highest",
  high: "High", medium: "Medium", normal: "Medium",
  low: "Low", minor: "Low", lowest: "Lowest", trivial: "Lowest",
};

function normalisePriority(raw, livePriorities = null, output = null) {
  if (!raw) return undefined;
  const lower = String(raw).toLowerCase();
  const warn = output ? output.warn : (...a) => console.warn(...a);
  const info = output ? output.info : (...a) => console.log(...a);

  if (livePriorities) {
    if (livePriorities[lower]) return livePriorities[lower];
    const synonym = PRIORITY_MAP[lower];
    if (synonym && livePriorities[synonym.toLowerCase()]) return livePriorities[synonym.toLowerCase()];
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
  const cleaned = arr.map(l => String(l).trim()).filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

// ---------------------------------------------------------------------------
// Auth + HTTP (with retry, fetch DI)
// ---------------------------------------------------------------------------
function getAuth({ required = ["JIRA_URL", "JIRA_API_TOKEN", "JIRA_USER_EMAIL", "JIRA_PROJECT_KEY"], optional = ["JIRA_BOARD_ID"] } = {}) {
  const env = {};
  for (const k of required) env[k] = process.env[k];
  for (const k of optional) env[k] = process.env[k];
  const missing = required.filter(k => !env[k]);
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

function makeHttp({ fetchImpl = fetch, timeoutMs = 30000, retries = 2, retryDelayMs = 500, maxRetryAfterMs = 60000 } = {}) {
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
          const ra = parseRetryAfter(resp.headers && resp.headers.get && resp.headers.get("retry-after"));
          const wait = Math.min(ra != null ? ra : retryDelayMs * Math.pow(3, attempt), maxRetryAfterMs);
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
  return new Promise(r => setTimeout(r, ms));
}

async function parseJiraError(resp) {
  const text = await resp.text();
  try {
    const json = JSON.parse(text);
    const msgs = [];
    if (Array.isArray(json.errorMessages)) msgs.push(...json.errorMessages);
    if (json.errors && typeof json.errors === "object") {
      for (const [field, msg] of Object.entries(json.errors)) msgs.push(`${field}: ${msg}`);
    }
    return msgs.length ? msgs.join("; ") : text;
  } catch (_) {
    return text;
  }
}

function describeAuthFail(status) {
  if (status === 401) return "401 Unauthorized — verify JIRA_USER_EMAIL and JIRA_API_TOKEN.";
  if (status === 403) return "403 Forbidden — token lacks permission for this issue/project.";
  if (status === 404) return "404 Not Found — issue key does not exist or you cannot view it.";
  return null;
}

// ---------------------------------------------------------------------------
// Diff + guard + hash
// ---------------------------------------------------------------------------
function diffFields({ prev, next, prevBodyHash, newBodyHash, prevMetaHash, newMetaHash, prevDescHash, newDescHash }) {
  // Back-compat: prevDescHash/newDescHash collapse into body hash.
  const pBody = prevBodyHash !== undefined ? prevBodyHash : prevDescHash;
  const nBody = newBodyHash  !== undefined ? newBodyHash  : newDescHash;
  const changed = [];
  if (prev.summary !== next.summary) changed.push("summary");
  if ((pBody || "") !== (nBody || "")) changed.push("description");
  if (prevMetaHash !== undefined || newMetaHash !== undefined) {
    if ((prevMetaHash || "") !== (newMetaHash || "") && !changed.includes("description")) {
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
    if (output) output.warn(`⚠️  Jira issue updated since last sync (Jira: ${jiraUpdated}, local: ${lastSyncedAt}). --force in effect; overwriting.`);
    return;
  }
  throw new Error(
    `Jira issue updated since last local sync.\n` +
    `  Local last sync: ${lastSyncedAt}\n` +
    `  Jira updated:    ${jiraUpdated}\n` +
    `Pull manual edits into the markdown first, or pass --force to overwrite.`
  );
}

function hashStable(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
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
  } catch (_) { return null; }
}

function writeIssueTypeCache(repoRoot, projectKey, types) {
  const p = issueTypeCachePath(repoRoot, projectKey);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ ts: Date.now(), types }, null, 2));
}

async function getIssueTypeId({ http, baseUrl, email, token, projectKey, typeName, repoRoot }) {
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
      const resp = await http(url, { headers: { Authorization: authHeader(email, token), Accept: "application/json" } });
      if (!resp.ok) continue;
      const data = await resp.json();
      const toArr = v => (Array.isArray(v) ? v : null);
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
  throw new Error(`Could not resolve Jira '${typeName}' issue type ID. Verify it is enabled for project ${projectKey}.`);
}

// ---------------------------------------------------------------------------
// Live priority resolution
// ---------------------------------------------------------------------------
async function resolveLivePriorities({ http, baseUrl, email, token }) {
  try {
    const resp = await http(`${baseUrl}/rest/api/3/priority`, {
      headers: { Authorization: authHeader(email, token), Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const arr = Array.isArray(data) ? data : data.values || [];
    const map = {};
    for (const p of arr) {
      if (p.name) map[p.name.toLowerCase()] = p.name;
    }
    return Object.keys(map).length ? map : null;
  } catch (_) { return null; }
}

// ---------------------------------------------------------------------------
// Board type detection + backlog placement
// ---------------------------------------------------------------------------
async function getBoardType({ http, baseUrl, email, token, boardId }) {
  if (!boardId) return null;
  try {
    const resp = await http(`${baseUrl}/rest/agile/1.0/board/${boardId}/configuration`, {
      headers: { Authorization: authHeader(email, token), Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.type || "").toLowerCase() || null;
  } catch (_) { return null; }
}

async function moveToBacklog({ http, baseUrl, email, token, boardId, issueKey, output }) {
  if (!boardId) {
    if (output) output.warn("⚠️  Skipping backlog placement — JIRA_BOARD_ID not set.");
    return { moved: false, reason: "no-board-id" };
  }
  const type = await getBoardType({ http, baseUrl, email, token, boardId });
  if (type && type !== "scrum") {
    if (output) output.warn(`⚠️  Board ${boardId} is type "${type}" — backlog endpoint only applies to Scrum boards. Skipping.`);
    return { moved: false, reason: `board-type-${type}` };
  }
  try {
    const resp = await http(`${baseUrl}/rest/agile/1.0/backlog/issue`, {
      method: "POST",
      headers: { Authorization: authHeader(email, token), "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ issues: [issueKey] }),
    });
    if (resp.ok || resp.status === 204) {
      if (output) output.info(`   📋 Moved to backlog (board ${boardId})`);
      return { moved: true };
    }
    const msg = await parseJiraError(resp);
    if (output) output.warn(`⚠️  Backlog move failed (non-fatal): HTTP ${resp.status}: ${msg}`);
    return { moved: false, reason: `http-${resp.status}` };
  } catch (e) {
    if (output) output.warn(`⚠️  Backlog move failed (non-fatal): ${e.message}`);
    return { moved: false, reason: e.message };
  }
}

// ---------------------------------------------------------------------------
// Status mapping (local document status -> Jira workflow status name)
// ---------------------------------------------------------------------------
// Single source of truth shared by sync-jira-{story,task,epic}. Covers the full
// canonical lifecycle (see the document-status-lifecycle spec) plus the
// historical aliases. Keys are lowercased; values are literal Jira status names
// matched against transition `to.name`. Projects with custom workflow vocabulary
// override via skills-config.yaml `jira.statusMap` (see loadStatusMap).
const DEFAULT_STATUS_MAP = {
  // canonical lifecycle
  "draft": "To Do",
  "planned": "To Do",
  "ready-for-development": "To Do",
  "in-progress": "In Progress",
  "ready-for-review": "In Review",
  "accepted": "Done",
  "cancelled": "Cancelled",
  // aliases
  "ready for development": "To Do",
  "todo": "To Do",
  "to do": "To Do",
  "open": "To Do",
  "backlog": "To Do",
  "in progress": "In Progress",
  "doing": "In Progress",
  "ready for review": "In Review",
  "in review": "In Review",
  "review": "In Review",
  "ready": "Ready",
  "done": "Done",
  "completed": "Done",
  "complete": "Done",
  "blocked": "Blocked",
  "canceled": "Cancelled",
  "won't do": "Won't Do",
  "wont do": "Won't Do",
  "won't fix": "Won't Do",
  "wontfix": "Won't Do",
};

// Parse a `jira:` → `statusMap:` block out of skills-config.yaml text. Kept to
// a self-contained indentation scanner (no YAML dependency — pyyaml is not
// reliably installed in consumer environments). Supports the documented block
// form only; returns {} for anything it can't read.
//
//   jira:
//     statusMap:
//       ready-for-development: Selected for Development
//       accepted: "Done"
function parseStatusMapBlock(text) {
  const out = {};
  const lines = String(text || "").split("\n");
  const indentOf = l => l.length - l.replace(/^\s+/, "").length;
  let i = 0;
  // find top-level `jira:`
  for (; i < lines.length; i++) {
    if (/^jira:\s*$/.test(lines[i])) { i++; break; }
  }
  if (i >= lines.length) return out;
  const jiraIndent = 0;
  // find `statusMap:` nested under jira
  let smIndent = -1;
  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (indentOf(raw) <= jiraIndent) return out; // left the jira block
    if (/^\s+statusMap:\s*$/.test(raw)) { smIndent = indentOf(raw); i++; break; }
  }
  if (smIndent < 0) return out;
  // collect `key: value` entries indented deeper than statusMap
  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (indentOf(raw) <= smIndent) break; // end of statusMap block
    const m = raw.trim().match(/^("?[^":]+"?|'[^']+'):\s*(.+?)\s*$/);
    if (!m) continue;
    const key = m[1].replace(/^["']|["']$/g, "").trim();
    const val = m[2].replace(/^["']|["']$/g, "").trim();
    if (key && val) out[key] = val;
  }
  return out;
}

// Build the effective status map: DEFAULT_STATUS_MAP overlaid with any
// `jira.statusMap` entries from skills-config.yaml at the repo root. Override
// keys are lowercased so lookups stay case-insensitive. Any failure (no file,
// unreadable, parse error) falls back to the defaults unchanged.
function loadStatusMap(repoRoot) {
  const map = { ...DEFAULT_STATUS_MAP };
  try {
    const root = repoRoot || execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    const cfgPath = path.join(root, "skills-config.yaml");
    if (!fs.existsSync(cfgPath)) return map;
    const overrides = parseStatusMapBlock(fs.readFileSync(cfgPath, "utf-8"));
    for (const [k, v] of Object.entries(overrides)) {
      if (typeof v === "string" && v.trim()) map[String(k).toLowerCase()] = v;
    }
  } catch (_) {}
  return map;
}

// Map a raw frontmatter status to its Jira target name. Strips emoji,
// lowercases, looks up in `statusMap`; unmapped values pass through verbatim
// (emoji-stripped) for custom workflows.
function mapStatus(raw, statusMap = DEFAULT_STATUS_MAP) {
  if (!raw) return null;
  const stripped = stripStatusEmoji(raw);
  return statusMap[stripped.toLowerCase()] || stripped;
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
  const indentOf = l => l.length - l.replace(/^\s+/, "").length;
  const keyRe = new RegExp("^" + escapeRe(key) + ":\\s*(.+?)\\s*$");
  let i = 0;
  // find top-level `jira:`
  for (; i < lines.length; i++) {
    if (/^jira:\s*$/.test(lines[i])) { i++; break; }
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
    if (ind <= 0) break;                     // left the jira block
    if (childIndent < 0) childIndent = ind;  // first child fixes the direct-child level
    if (ind !== childIndent) continue;       // skip deeper nested entries
    const m = raw.trim().match(keyRe);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

// Resolve the configured Jira custom-field id for estimated dev hours from
// `jira.devEstimateField` in skills-config.yaml at the repo root. Returns "" on
// any failure (no file, unreadable, key absent) so callers skip the field.
function loadDevEstimateField(repoRoot) {
  try {
    const root = repoRoot || execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    const cfgPath = path.join(root, "skills-config.yaml");
    if (!fs.existsSync(cfgPath)) return "";
    return parseJiraScalar(fs.readFileSync(cfgPath, "utf-8"), "devEstimateField");
  } catch (_) {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------
function stripStatusEmoji(s) {
  return String(s || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
}

async function getTransitions({ http, baseUrl, email, token, issueKey }) {
  const resp = await http(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
    headers: { Authorization: authHeader(email, token), Accept: "application/json" },
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.transitions || [];
}

async function transitionToStatus({ http, baseUrl, email, token, issueKey, targetStatus, currentStatus, output }) {
  const target = stripStatusEmoji(targetStatus);
  const current = stripStatusEmoji(currentStatus);
  if (!target) return { transitioned: false, reason: "no-target" };
  if (target.toLowerCase() === current.toLowerCase()) return { transitioned: false, reason: "already" };

  const transitions = await getTransitions({ http, baseUrl, email, token, issueKey });
  const match = transitions.find(t => (t.to?.name || "").toLowerCase() === target.toLowerCase()) ||
                transitions.find(t => (t.name || "").toLowerCase() === target.toLowerCase());
  if (!match) {
    if (output) {
      const available = transitions.map(t => t.to?.name || t.name).filter(Boolean);
      const avail = available.length ? available.join(", ") : "(none)";
      output.warn(`⚠️  No Jira transition to "${target}" from "${current}". Available: ${avail}.`);
      output.warn(`    Map your local status to a workflow name in skills-config.yaml under jira.statusMap. Skipping status change.`);
    }
    return { transitioned: false, reason: "no-transition" };
  }
  const resp = await http(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
    method: "POST",
    headers: { Authorization: authHeader(email, token), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ transition: { id: match.id } }),
  });
  if (!resp.ok) {
    const msg = await parseJiraError(resp);
    if (output) output.warn(`⚠️  Status transition failed (non-fatal): HTTP ${resp.status}: ${msg}`);
    return { transitioned: false, reason: `http-${resp.status}` };
  }
  if (output) output.info(`   🔀 Transitioned ${issueKey}: "${current}" → "${target}"`);
  return { transitioned: true, from: current, to: target };
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
  } catch (_) { return null; }
}

function writeProjectStyleCache(repoRoot, projectKey, style) {
  const p = projectStyleCachePath(repoRoot, projectKey);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ ts: Date.now(), style }, null, 2));
}

async function detectProjectStyle({ http, baseUrl, email, token, projectKey, repoRoot, output } = {}) {
  if (repoRoot) {
    const cached = readProjectStyleCache(repoRoot, projectKey);
    if (cached) return cached;
  }
  try {
    const resp = await http(`${baseUrl}/rest/api/3/project/${projectKey}`, {
      headers: { Authorization: authHeader(email, token), Accept: "application/json" },
    });
    if (!resp.ok) {
      if (output) output.warn(`⚠️  Could not detect Jira project style (HTTP ${resp.status}); will try team-managed parent first and fall back via 400-retry.`);
      return null;
    }
    const d = await resp.json();
    const style = d.style || null;
    if (style && repoRoot) writeProjectStyleCache(repoRoot, projectKey, style);
    return style;
  } catch (e) {
    if (output) output.warn(`⚠️  Could not detect Jira project style (${e.message}); will try team-managed parent first and fall back via 400-retry.`);
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
async function findExistingByLabel({ http, baseUrl, email, token, projectKey, label, output } = {}) {
  const jql = `project = "${projectKey}" AND labels = "${label}"`;
  const resp = await http(`${baseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: authHeader(email, token),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ jql, fields: ["summary", "updated"], maxResults: 5 }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.issues || data.issues.length === 0) return null;
  if (data.issues.length > 1 && output) {
    const keys = data.issues.map(i => i.key).join(", ");
    output.warn(`⚠️  Multiple Jira issues match label "${label}": ${keys}. Adopting first (${data.issues[0].key}). The others are duplicates from prior failed runs — review and delete in Jira.`);
  }
  return { key: data.issues[0].key, updated: data.issues[0].fields?.updated || null };
}

// ---------------------------------------------------------------------------
// Atomic PUT with returnIssue
// ---------------------------------------------------------------------------
async function putIssueAtomic({ http, baseUrl, email, token, issueKey, fields }) {
  const resp = await http(`${baseUrl}/rest/api/3/issue/${issueKey}?returnIssue=true`, {
    method: "PUT",
    headers: { Authorization: authHeader(email, token), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await parseJiraError(resp)}`);
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

async function fetchIssue({ http, baseUrl, email, token, issueKey, fields = "summary,priority,labels,updated,status" }) {
  const resp = await http(`${baseUrl}/rest/api/3/issue/${issueKey}?fields=${fields}`, {
    headers: { Authorization: authHeader(email, token), Accept: "application/json" },
  });
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

async function fetchUpdatedTimestampStrict({ http, baseUrl, email, token, issueKey }) {
  const resp = await http(`${baseUrl}/rest/api/3/issue/${issueKey}?fields=updated`, {
    headers: { Authorization: authHeader(email, token), Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`Failed to fetch updated timestamp for ${issueKey}: HTTP ${resp.status}`);
  const d = await resp.json();
  if (!d.fields?.updated) throw new Error(`Jira response missing fields.updated for ${issueKey}`);
  return d.fields.updated;
}

// Non-throwing variant. Returns null on failure so callers can fall back to
// a synthetic timestamp rather than aborting after a successful create/update.
async function fetchUpdatedTimestamp({ http, baseUrl, email, token, issueKey }) {
  try {
    const resp = await http(`${baseUrl}/rest/api/3/issue/${issueKey}?fields=updated`, {
      headers: { Authorization: authHeader(email, token), Accept: "application/json" },
    });
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
  loadDotEnv, makeOutput,
  // frontmatter
  parseFrontmatter, rewriteFrontmatter, upsertFrontmatterKeys, formatYamlScalar,
  // git / bb
  getRepoRoot, getDefaultBranch, getCurrentBranchUpstream, stripRemotePrefix, getBitbucketRepoBase, buildBitbucketUrl,
  // changelog
  CL_START, CL_END, fmtEntry, buildChangelogBlock, isEntryRow, RE_ENTRY_ROW,
  extractEntries, findHandWrittenChangelog, upsertChangelog,
  // adf
  adf, textToAdfNodes, textToParagraphs, blockToAdf, tableLinesToAdf, inlineMarkdownToAdf,
  sectionRe, extractBodySections, escapeRe,
  // priority / labels
  PRIORITY_MAP, normalisePriority, sanitiseLabels, resolveLivePriorities,
  // auth / http
  getAuth, authHeader, makeHttp, parseRetryAfter, sleep, parseJiraError, describeAuthFail,
  // diff / guard / hash
  diffFields, guardConcurrentEdit, hashStable,
  // jira api
  fetchIssue, fetchUpdatedTimestampStrict, fetchUpdatedTimestamp, getIssueTypeId, getBoardType, moveToBacklog,
  putIssueAtomic, findExistingByLabel, transitionToStatus, getTransitions, stripStatusEmoji,
  detectProjectStyle,
  // status mapping
  DEFAULT_STATUS_MAP, loadStatusMap, mapStatus,
  // jira scalar config
  parseJiraScalar, loadDevEstimateField,
  // cache
  readIssueTypeCache, writeIssueTypeCache, readProjectStyleCache, writeProjectStyleCache,
};
