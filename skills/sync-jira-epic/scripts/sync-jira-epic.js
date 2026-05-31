#!/usr/bin/env node
"use strict";
/**
 * sync-jira-epic — Create or update a Jira Epic from a local epic markdown file.
 *
 * Top-level work item (no parent). Now uses Jira REST API v3 with ADF (was v2
 * plain-text). Stories Breakdown rendered as ADF table. PRD source resolved via
 * multi-variant lookup (`resolvePrdPath`). All 20 reliability features from the
 * shared lib apply: idempotent create, atomic PUT, status transitions, live
 * priority, issue-type cache, retry on 5xx + network, default-branch URLs,
 * in-place frontmatter, --json/--quiet/--dry-run/--force, pluggable fetch.
 */

const fs = require("fs");
const path = require("path");
const lib = require("../references/jira-sync.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VERSION = "1.2.0";

const EPIC_SECTIONS = ["Epic Goal", "Epic Description"];

const STATUS_MAP = {
  "planned": "To Do",
  "todo": "To Do",
  "to do": "To Do",
  "open": "To Do",
  "backlog": "To Do",
  "in progress": "In Progress",
  "in-progress": "In Progress",
  "doing": "In Progress",
  "in review": "In Review",
  "review": "In Review",
  "ready for review": "In Review",
  "ready": "Ready",
  "done": "Done",
  "completed": "Done",
  "complete": "Done",
  "blocked": "Blocked",
  "cancelled": "Cancelled",
  "canceled": "Cancelled",
  "won't do": "Won't Do",
  "wont do": "Won't Do",
  "won't fix": "Won't Do",
  "wontfix": "Won't Do",
};

const ISSUE_TYPE = "Epic";
const SYNC_LABEL_PREFIX = "synced-from-";

const STORY_REQUIREMENTS_TEXT =
  "Each story MUST include in frontmatter: jira_epic, epic_bitbucket_url. " +
  "Cross-reference both Jira and Bitbucket from the story body.";

const CHANGELOG_DESCRIPTION_LIMIT = 20;

// ---------------------------------------------------------------------------
// PRD path resolution (multi-variant)
// ---------------------------------------------------------------------------
function resolvePrdPath(prdSource, repoRoot) {
  if (!prdSource) return null;

  const candidate = path.resolve(repoRoot, prdSource);
  if (fs.existsSync(candidate)) return candidate;

  // Fallback: search under docs/prd/<domain>/<feature>/ for the PRD by basename.
  // Canonical layout: docs/prd/<domain>/<feature>/prd.<feature>.md
  const basename = path.basename(prdSource, ".md");
  const bare = basename.replace(/^prd\./, "");
  const prdRoot = path.resolve(repoRoot, "docs/prd");
  if (!fs.existsSync(prdRoot)) return null;

  const targets = new Set([`${bare}.md`, `prd.${bare}.md`, `${basename}.md`]);
  function walk(dir, depth) {
    if (depth > 4) return null;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isFile() && targets.has(e.name)) return p;
      if (e.isDirectory()) {
        const found = walk(p, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(prdRoot, 0);
}

// ---------------------------------------------------------------------------
// Inline markdown → ADF inline nodes (**bold**, `code`, [link](url)).
// Delegates to the shared lib parser so all inline markdown is handled
// consistently — including inside Stories Breakdown table cells.
// ---------------------------------------------------------------------------
function inlineToAdfNodes(text) {
  return lib.inlineMarkdownToAdf(text != null ? text : "");
}

// ---------------------------------------------------------------------------
// Stories Breakdown — markdown table → ADF table
//
// Splitter handles:
//   - tables that lead/trail with `|` (canonical form)
//   - bare-pipe tables (no leading/trailing `|`)
//   - escaped `\|` cells (preserved as literal pipe in cell text)
// ---------------------------------------------------------------------------
const PIPE_PLACEHOLDER = String.fromCharCode(1);
function splitTableRow(line) {
  const masked = line.replace(/\\\|/g, PIPE_PLACEHOLDER);
  const cells = masked.split("|");
  if (cells.length && cells[0].trim() === "") cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
  return cells.map(c => c.split(PIPE_PLACEHOLDER).join("|").trim());
}

function extractStoriesTable(body) {
  const m = body.match(/## Stories Breakdown\s*\n+([\s\S]*?)(?=\n## |\n# |$)/);
  if (!m) return null;
  const raw = m[1].trim();
  if (!raw.includes("|")) return null;

  // Separator rows: optional leading/trailing pipe surrounding only `-`, `:`, ` `, `|`.
  const isSeparator = l => /^\|?[\s\-:|]+\|?$/.test(l.trim()) && /-/.test(l);
  const rows = raw.split("\n").filter(l => l.trim() && !isSeparator(l));
  if (!rows.length) return null;

  return rows.map(splitTableRow);
}

function storiesTableToAdf(rows) {
  if (!rows || !rows.length) return null;
  const header = rows[0];
  const body = rows.slice(1);
  return lib.adf.table([
    lib.adf.tableRow(...header.map(h =>
      lib.adf.tableHeader(lib.adf.paragraph(...inlineToAdfNodes(h))))),
    ...body.map(r => lib.adf.tableRow(...r.map(c =>
      lib.adf.tableCell(lib.adf.paragraph(...inlineToAdfNodes(c)))))),
  ]);
}

// ---------------------------------------------------------------------------
// Description builder (epic-specific)
// ---------------------------------------------------------------------------
function buildDescriptionAdf({ body, frontmatter, prdBbUrl, epicBbUrl, changelogEntries }) {
  const content = [];

  if (changelogEntries && changelogEntries.length) {
    const recent = changelogEntries.slice(-CHANGELOG_DESCRIPTION_LIMIT);
    content.push(lib.adf.heading(3, "Change Log"));
    content.push(lib.adf.table([
      lib.adf.tableRow(
        lib.adf.tableHeader(lib.adf.paragraph(lib.adf.text("Date (UTC)"))),
        lib.adf.tableHeader(lib.adf.paragraph(lib.adf.text("Change"))),
      ),
      ...recent.map(row => {
        const [date = "", change = ""] = row.replace(/^\|/, "").replace(/\|$/, "").split("|").map(s => s.trim());
        return lib.adf.tableRow(
          lib.adf.tableCell(lib.adf.paragraph(lib.adf.text(date))),
          lib.adf.tableCell(lib.adf.paragraph(lib.adf.text(change))),
        );
      }),
    ]));
  }

  const links = [];
  if (prdBbUrl)  links.push({ label: "Parent PRD on Bitbucket", href: prdBbUrl });
  if (epicBbUrl) links.push({ label: "Epic file on Bitbucket", href: epicBbUrl });
  if (links.length) {
    content.push(lib.adf.heading(3, "Source Documents"));
    content.push(lib.adf.bulletList(...links.map(l =>
      lib.adf.listItem(lib.adf.paragraph(lib.adf.link(l.label, l.href))))));
  }

  for (const sec of lib.extractBodySections(body, EPIC_SECTIONS)) {
    content.push(lib.adf.heading(3, sec.name));
    // Flatten any inline `**Label:**` heading (e.g. `**Existing System Context:**`)
    // to plain `Label:`. ADF can't render mid-paragraph bold headings well, so
    // this preserves the label as a leading text run that ADF will render cleanly.
    const cleaned = sec.content.replace(/\*\*([^*\n]+):\*\*/g, "$1:");
    content.push(...lib.textToAdfNodes(cleaned));
  }

  const meta = [];
  if (frontmatter.epic_type)         meta.push(`Type: ${frontmatter.epic_type}`);
  if (frontmatter.prd_source)        meta.push(`PRD: ${frontmatter.prd_source}`);
  if (frontmatter.estimated_sprints) meta.push(`Estimated Sprints: ${frontmatter.estimated_sprints}`);
  if (frontmatter.status)            meta.push(`Status: ${frontmatter.status}`);
  if (meta.length) {
    content.push(lib.adf.heading(3, "Metadata"));
    content.push(lib.adf.paragraph(lib.adf.text(meta.join(" | "))));
  }

  // Render the full Stories Breakdown section (guidelines + overview table +
  // individual story sections) using the enhanced textToAdfNodes instead of
  // extracting only the first table — which previously swallowed all story
  // subsections as table rows and lost inline markdown formatting.
  const storiesSections = lib.extractBodySections(body, ["Stories Breakdown"]);
  if (storiesSections.length && storiesSections[0].content.trim()) {
    content.push(lib.adf.heading(3, "Stories Breakdown"));
    content.push(...lib.textToAdfNodes(storiesSections[0].content));
  }

  content.push(lib.adf.heading(3, "Story Requirements"));
  content.push(lib.adf.paragraph(lib.adf.text(STORY_REQUIREMENTS_TEXT)));

  return lib.adf.doc(...content);
}

function hashBody({ body, prdBbUrl, epicBbUrl }) {
  const sections = lib.extractBodySections(body, EPIC_SECTIONS).map(s => ({
    name: s.name,
    nodes: lib.textToAdfNodes(s.content),
  }));
  const storiesSections = lib.extractBodySections(body, ["Stories Breakdown"]);
  const storiesContent = storiesSections.length ? storiesSections[0].content : null;
  return lib.hashStable({ sections, storiesContent, prdBbUrl, epicBbUrl });
}

function hashMeta(frontmatter) {
  return lib.hashStable({
    epic_type: frontmatter.epic_type || "",
    prd_source: frontmatter.prd_source || "",
    estimated_sprints: frontmatter.estimated_sprints || "",
    status: frontmatter.status || "",
  });
}

// ---------------------------------------------------------------------------
// Sync label
// ---------------------------------------------------------------------------
function syncLabelFor(filePath) {
  const dir = path.basename(path.dirname(filePath));
  return SYNC_LABEL_PREFIX + dir.replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// Field collection
//
// `collectCommonFields` returns the fields valid on both POST (create) and
// PUT (update). Project + issuetype only go on create — Jira refuses to change
// those on PUT — so the create wrapper layers them on top.
// ---------------------------------------------------------------------------
function collectCommonFields({ args, frontmatter, descAdf, livePriorities, output, syncLabel, summary }) {
  const priority = lib.normalisePriority(args.priority || frontmatter.priority, livePriorities, output);
  const labelInput = args.labels || frontmatter.labels;
  const cleanLabels = lib.sanitiseLabels(labelInput) || [];
  if (!cleanLabels.includes(syncLabel)) cleanLabels.push(syncLabel);

  const fields = {
    summary,
    description: descAdf,
    labels: cleanLabels,
  };
  if (priority) fields.priority = { name: priority };

  if (frontmatter.assignee) fields.assignee = { accountId: String(frontmatter.assignee) };
  if (frontmatter.due_date) fields.duedate = String(frontmatter.due_date);
  if (frontmatter.components) {
    const comps = Array.isArray(frontmatter.components) ? frontmatter.components : [frontmatter.components];
    fields.components = comps.filter(Boolean).map(name => ({ name: String(name) }));
  }
  if (frontmatter.fix_versions) {
    const fvs = Array.isArray(frontmatter.fix_versions) ? frontmatter.fix_versions : [frontmatter.fix_versions];
    fields.fixVersions = fvs.filter(Boolean).map(name => ({ name: String(name) }));
  }

  return fields;
}

function collectCreateFields(opts) {
  const fields = collectCommonFields(opts);
  if (opts.epicTypeId) fields.issuetype = { id: opts.epicTypeId };
  if (opts.projectKey) fields.project = { key: opts.projectKey };
  return fields;
}

function collectUpdateFields(opts) {
  return collectCommonFields(opts);
}

// Backward-compat alias for callers/tests that still import `collectIssueFields`.
function collectIssueFields(opts) {
  return opts.epicTypeId || opts.projectKey ? collectCreateFields(opts) : collectUpdateFields(opts);
}

// ---------------------------------------------------------------------------
// File write-back
// ---------------------------------------------------------------------------
function updateEpicFile({ filePath, issueKey, issueUrl, epicBbUrl, prdBbUrl, changeEntry, lastSyncedAt, bodyHash, metaHash, output, skipChangelog = false }) {
  try {
    let content = fs.readFileSync(filePath, "utf-8");

    content = lib.upsertFrontmatterKeys(content, {
      jira_key: issueKey,
      jira_url: issueUrl,
      epic_bitbucket_url: epicBbUrl || null,
      prd_bitbucket_url: prdBbUrl || null,
      jira_last_synced_at: lastSyncedAt || null,
      jira_last_body_hash: bodyHash || null,
      jira_last_meta_hash: metaHash || null,
    });

    const upsertLine = (text, pattern, newLine) => {
      if (pattern.test(text)) return text.replace(pattern, newLine);
      const m = text.match(/^(# .+)$/m);
      if (m) {
        const idx = text.indexOf(m[0]) + m[0].length;
        return text.slice(0, idx) + "\n\n" + newLine + text.slice(idx);
      }
      return text.trimEnd() + "\n\n" + newLine + "\n";
    };

    content = upsertLine(content, /^\*\*Jira Epic\*\*:.*$/m, `**Jira Epic**: [${issueKey}](${issueUrl})`);
    if (prdBbUrl)  content = upsertLine(content, /^\*\*Parent PRD\*\*:.*$/m, `**Parent PRD**: [View on Bitbucket](${prdBbUrl})`);
    if (epicBbUrl) content = upsertLine(content, /^\*\*Epic File\*\*:.*$/m,  `**Epic File**: [View on Bitbucket](${epicBbUrl})`);

    if (!skipChangelog) content = lib.upsertChangelog(content, changeEntry);
    fs.writeFileSync(filePath, content, "utf-8");
    output.info(`\n📝 Updated local epic file: ${filePath}`);
  } catch (err) {
    output.err(`\n⚠️  Failed to update local epic file: ${err.message}`);
    output.err(`   The Jira epic was synced successfully. Add these to your epic frontmatter manually:`);
    output.err(`   jira_key: "${issueKey}"`);
    output.err(`   jira_url: "${issueUrl}"`);
  }
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------
function mapStatus(raw) {
  if (!raw) return null;
  const stripped = lib.stripStatusEmoji(raw).toLowerCase();
  return STATUS_MAP[stripped] || lib.stripStatusEmoji(raw);
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    file: null, summary: null, priority: null, labels: null,
    dryRun: false, force: false, json: false, quiet: false,
    verbose: false, version: false,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--file":     case "-f": opts.file     = args[++i]; break;
      case "--summary":  case "-s": opts.summary  = args[++i]; break;
      case "--priority": case "-p": opts.priority = args[++i]; break;
      case "--labels":   case "-l": opts.labels   = args[++i]; break;
      case "--dry-run":  opts.dryRun = true; break;
      case "--force":    opts.force  = true; break;
      case "--json":     opts.json   = true; break;
      case "--quiet":    opts.quiet  = true; break;
      case "--verbose":  case "-v": opts.verbose = true; break;
      case "--version":  case "-V": opts.version = true; break;
      default:
        if (args[i].startsWith("-")) throw new Error(`Unknown option: ${args[i]}`);
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
async function run({ argv = process.argv, fetchImpl = (typeof fetch !== "undefined" ? fetch : null) } = {}) {
  lib.loadDotEnv();
  const args = parseArgs(argv);
  const output = lib.makeOutput({ json: args.json, quiet: args.quiet });

  if (args.version) {
    if (args.json) output.emit({ version: VERSION });
    else process.stdout.write(`sync-jira-epic ${VERSION}\n`);
    return { exitCode: 0, version: VERSION };
  }

  const dump = (label, value) => {
    if (!args.verbose) return;
    output.info(`\n--- ${label} ---`);
    output.info(typeof value === "string" ? value : JSON.stringify(value, null, 2));
  };

  if (!args.file) {
    output.err("Error: --file is required");
    output.err("Usage: sync-jira-epic --file <epic.md> [--dry-run] [--force] [--json] [--quiet] [--verbose] [--version]");
    return { exitCode: 1 };
  }
  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) {
    output.err(`Error: File not found: ${filePath}`);
    return { exitCode: 1 };
  }

  const auth = lib.getAuth();
  if (!auth.ok) {
    if (args.dryRun) {
      output.warn(`⚠️  Dry-run: missing env vars (${auth.missing.join(", ")}) — values will be required for live sync.`);
    } else {
      output.err(`Error: Missing required environment variables: ${auth.missing.join(", ")}`);
      output.err("Set: JIRA_URL, JIRA_API_TOKEN, JIRA_USER_EMAIL, JIRA_PROJECT_KEY.");
      return { exitCode: 1 };
    }
  }

  const repoRoot = lib.getRepoRoot();
  const bbBase = lib.getBitbucketRepoBase();
  if (!bbBase) output.warn("⚠️  Could not detect Bitbucket repo URL. Set BITBUCKET_REPO_URL to enable Bitbucket links.");
  const branch = bbBase ? lib.getDefaultBranch() : null;
  const epicBbUrl = bbBase ? lib.buildBitbucketUrl(filePath, repoRoot, bbBase, branch) : null;

  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = lib.parseFrontmatter(content);

  let prdBbUrl = null;
  if (bbBase) {
    const prdFilePath = resolvePrdPath(frontmatter.prd_source, repoRoot);
    if (prdFilePath) prdBbUrl = lib.buildBitbucketUrl(prdFilePath, repoRoot, bbBase, branch);
    else if (frontmatter.prd_source) output.warn(`⚠️  Could not resolve prd_source "${frontmatter.prd_source}" — PRD link omitted.`);
    if (!prdBbUrl && frontmatter.prd_bitbucket_url) {
      prdBbUrl = frontmatter.prd_bitbucket_url;
      output.warn(`⚠️  Using cached prd_bitbucket_url from frontmatter — verify it still points to a valid file.`);
    }
  }

  let summary = args.summary || frontmatter.summary || frontmatter.title || body.match(/^# (.+)$/m)?.[1];
  if (!summary) {
    output.err("Error: Could not determine summary (set frontmatter title or # heading).");
    return { exitCode: 1 };
  }
  // Prepend "Epic N: " if epic_number is set and not already present
  if (frontmatter.epic_number != null && !summary.match(/^Epic\s+\d+\s*:/i)) {
    summary = `Epic ${frontmatter.epic_number}: ${summary}`;
  }

  const http = lib.makeHttp({ fetchImpl: fetchImpl || (typeof fetch !== "undefined" ? fetch : null) });
  const livePriorities = (auth.ok && !args.dryRun)
    ? await lib.resolveLivePriorities({ http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token })
    : null;

  const syncLabel = syncLabelFor(filePath);
  const newBodyHash = hashBody({ body, prdBbUrl, epicBbUrl });
  const newMetaHash = hashMeta(frontmatter);

  let existingJiraKey = frontmatter.jira_key;

  // Pre-flight idempotency
  if (!existingJiraKey && auth.ok && !args.dryRun) {
    const found = await lib.findExistingByLabel({
      http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token,
      projectKey: auth.project, label: syncLabel,
    });
    if (found) {
      output.warn(`ℹ️  Found existing issue ${found.key} with label "${syncLabel}" — switching to update.`);
      existingJiraKey = found.key;
    }
  }

  const isUpdate = !!existingJiraKey;
  output.info(`\n${isUpdate ? "🔄 Updating" : "➕ Creating"} Jira epic${isUpdate ? ` ${existingJiraKey}` : ""}…`);
  output.info(`   File: ${filePath}`);
  if (args.dryRun) output.info("   Mode: DRY RUN — no Jira calls or file writes");
  if (args.force)  output.info("   Mode: --force — concurrent-edit guard disabled");

  let result, changeSummary, changeEntry, current = null;

  if (isUpdate) {
    if (!args.dryRun) {
      current = await lib.fetchIssue({
        http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token, issueKey: existingJiraKey,
      });
      lib.guardConcurrentEdit({
        jiraUpdated: current.updated,
        lastSyncedAt: frontmatter.jira_last_synced_at,
        force: args.force, output,
      });
    }

    const changedFields = current
      ? lib.diffFields({
          prev: current,
          next: { summary, priority: lib.normalisePriority(args.priority || frontmatter.priority, livePriorities), labels: lib.sanitiseLabels(args.labels || frontmatter.labels) || [] },
          prevBodyHash: frontmatter.jira_last_body_hash,
          newBodyHash,
          prevMetaHash: frontmatter.jira_last_meta_hash,
          newMetaHash,
        })
      : ["summary", "description", "priority", "labels"];
    changeSummary = changedFields.length ? `Updated: ${changedFields.join(", ")}` : "Sync (no field changes detected)";
    changeEntry = lib.fmtEntry(changeSummary);

    // No-change fast path: skip PUT and skip the local changelog row too —
    // an empty no-op shouldn't pollute the change log. Frontmatter timestamp
    // and hashes are still refreshed so the next run sees a clean baseline.
    if (current && changedFields.length === 0 && !args.force) {
      output.info("\nℹ️  No field changes detected — skipping Jira update. Re-run with --force to push anyway.");
      const issueUrl = `${auth.baseUrl}/browse/${existingJiraKey}`;
      updateEpicFile({
        filePath, issueKey: existingJiraKey, issueUrl,
        epicBbUrl, prdBbUrl, changeEntry,
        lastSyncedAt: current.updated, bodyHash: newBodyHash, metaHash: newMetaHash,
        output, skipChangelog: true,
      });
      if (args.json) {
        output.emit({
          action: "skip",
          dryRun: false, file: filePath,
          jira_key: existingJiraKey, jira_url: issueUrl,
          change_summary: changeSummary,
          jira_last_synced_at: current.updated,
          jira_last_body_hash: newBodyHash,
          jira_last_meta_hash: newMetaHash,
        });
      }
      return { exitCode: 0, isUpdate: true, skipped: true };
    }

    const allEntries = [...lib.extractEntries(content), changeEntry];
    const descAdf = buildDescriptionAdf({ body, frontmatter, prdBbUrl, epicBbUrl, changelogEntries: allEntries });
    const fields = collectUpdateFields({
      args, frontmatter, descAdf,
      livePriorities, output, syncLabel, summary,
    });
    dump("PUT fields", fields);
    dump("PUT description (ADF)", descAdf);

    if (args.dryRun) {
      output.info(`\n=== DRY RUN — Would UPDATE ${existingJiraKey} ===`);
      output.info(`  Changes: ${changeSummary}`);
      result = { issueKey: existingJiraKey, issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`, updated: null };
    } else {
      const { updated } = await lib.putIssueAtomic({
        http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token,
        issueKey: existingJiraKey, fields,
      });
      const finalUpdated = updated
        || (await lib.fetchUpdatedTimestamp({ http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token, issueKey: existingJiraKey }))
        || new Date().toISOString();
      result = {
        issueKey: existingJiraKey,
        issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
        updated: finalUpdated,
      };
      output.info(`\n✅ Epic updated: ${existingJiraKey}`);
      output.info(`   URL: ${result.issueUrl}`);
      output.info(`   Changes: ${changeSummary}`);
    }
  } else {
    changeSummary = "Initial Jira epic created";
    changeEntry = lib.fmtEntry(changeSummary);
    const descAdf = buildDescriptionAdf({ body, frontmatter, prdBbUrl, epicBbUrl, changelogEntries: [changeEntry] });

    if (args.dryRun) {
      output.info(`\n=== DRY RUN — Would CREATE Jira epic ===`);
      output.info(`  Project: ${auth.project || "(unset)"}`);
      output.info(`  Summary: ${summary}`);
      output.info(`  Label:   ${syncLabel}`);
      result = { issueKey: null, issueUrl: null, updated: null };
    } else {
      const epicTypeId = await lib.getIssueTypeId({
        http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token,
        projectKey: auth.project, typeName: ISSUE_TYPE, repoRoot,
      });
      const fields = collectCreateFields({
        args, frontmatter, descAdf, epicTypeId, projectKey: auth.project,
        livePriorities, output, syncLabel, summary,
      });

      // Epic Name custom field — many Jira Cloud instances need it set on create.
      const epicNameField = process.env.JIRA_EPIC_NAME_FIELD || "customfield_10011";
      if (epicNameField.toLowerCase() !== "none") {
        fields[epicNameField] = summary;
      }

      dump("POST fields", fields);
      dump("POST description (ADF)", descAdf);

      // Build a regex that adapts to whatever epic-name field the user configured,
      // falling back to the canonical "epic name" / `customfield_10011` strings.
      const epicNameRe = new RegExp(`${lib.escapeRe(epicNameField)}|epic[ _-]?name`, "i");

      const resp = await http(`${auth.baseUrl}/rest/api/3/issue`, {
        method: "POST",
        headers: {
          Authorization: lib.authHeader(auth.email, auth.token),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ fields }),
      });
      if (!resp.ok) {
        const errText = await lib.parseJiraError(resp);
        // Retry without epic-name field if Jira rejects it (team-managed projects)
        if (resp.status === 400 && epicNameRe.test(errText) && fields[epicNameField]) {
          output.info(`ℹ️  Retrying create without ${epicNameField} (team-managed project): ${errText.slice(0, 120)}`);
          delete fields[epicNameField];
          const retry = await http(`${auth.baseUrl}/rest/api/3/issue`, {
            method: "POST",
            headers: {
              Authorization: lib.authHeader(auth.email, auth.token),
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ fields }),
          });
          if (!retry.ok) throw new Error(`HTTP ${retry.status}: ${await lib.parseJiraError(retry)}`);
          const created = await retry.json();
          const issueKey = created.key;
          const issueUrl = `${auth.baseUrl}/browse/${issueKey}`;
          const updated = (await lib.fetchUpdatedTimestamp({
            http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token, issueKey,
          })) || new Date().toISOString();
          result = { issueKey, issueUrl, updated };
        } else {
          throw new Error(`HTTP ${resp.status}: ${errText}`);
        }
      } else {
        const rawText = await resp.text();
        let created;
        try { created = JSON.parse(rawText); }
        catch (_) {
          output.err("\n⚠️  Jira returned 2xx but response body was not valid JSON. Raw body:");
          output.err(rawText.slice(0, 500));
          throw new Error("Could not parse Jira create response — check Jira manually for the new epic");
        }
        const issueKey = created.key;
        const issueUrl = `${auth.baseUrl}/browse/${issueKey}`;
        const updated = (await lib.fetchUpdatedTimestamp({
          http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token, issueKey,
        })) || new Date().toISOString();
        result = { issueKey, issueUrl, updated };
      }

      output.info(`\n✅ Epic created: ${result.issueKey}`);
      output.info(`   URL: ${result.issueUrl}`);

      await lib.moveToBacklog({
        http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token,
        boardId: auth.boardId, issueKey: result.issueKey, output,
      });

      // Set Team field (customfield_10001) so the epic appears on boards filtered by cf[10001].
      if (auth.boardId) {
        try {
          const boardCfgResp = await http(`${auth.baseUrl}/rest/agile/1.0/board/${auth.boardId}/configuration`, {
            headers: { Authorization: lib.authHeader(auth.email, auth.token), Accept: "application/json" },
          });
          if (boardCfgResp.ok) {
            const boardCfg = await boardCfgResp.json();
            const filterId = boardCfg?.filter?.id;
            if (filterId) {
              const filterResp = await http(`${auth.baseUrl}/rest/api/3/filter/${filterId}`, {
                headers: { Authorization: lib.authHeader(auth.email, auth.token), Accept: "application/json" },
              });
              if (filterResp.ok) {
                const filter = await filterResp.json();
                const teamMatch = /cf\[10001\]\s+in\s+\(([^)]+)\)/i.exec(filter.jql || "");
                if (teamMatch) {
                  const teamUuid = teamMatch[1].split(",")[0].trim().replace(/^["']|["']$/g, "");
                  if (teamUuid) {
                    const teamResp = await http(`${auth.baseUrl}/rest/api/3/issue/${result.issueKey}`, {
                      method: "PUT",
                      headers: {
                        Authorization: lib.authHeader(auth.email, auth.token),
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ fields: { customfield_10001: teamUuid } }),
                    });
                    if (teamResp.status === 204) {
                      output.info(`   Team field set: ${teamUuid}`);
                    } else {
                      output.warn(`⚠️  Team field update returned HTTP ${teamResp.status} — epic created but may not appear on board`);
                    }
                  }
                }
              }
            }
          }
        } catch (teamErr) {
          output.warn(`⚠️  Could not set team field: ${teamErr.message} — epic created but may not appear on board`);
        }
      }
    }
  }

  // Status transition
  if (result?.issueKey && !args.dryRun && frontmatter.status) {
    const target = mapStatus(frontmatter.status);
    const currentStatus = current?.status || null;
    await lib.transitionToStatus({
      http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token,
      issueKey: result.issueKey, targetStatus: target, currentStatus, output,
    });
  }

  // Write-back
  if (result?.issueKey && !args.dryRun) {
    updateEpicFile({
      filePath,
      issueKey: result.issueKey,
      issueUrl: result.issueUrl,
      epicBbUrl,
      prdBbUrl,
      changeEntry,
      lastSyncedAt: result.updated,
      bodyHash: newBodyHash,
      metaHash: newMetaHash,
      output,
    });

    if (!isUpdate) {
      output.info(
        "\n📌 Story reminder:\n" +
        `   jira_epic: "${result.issueKey}"\n` +
        (epicBbUrl ? `   epic_bitbucket_url: "${epicBbUrl}"\n` : "") +
        "   Add cross-reference links to both the Jira epic and Bitbucket epic file in each story body."
      );
    }
  }

  if (args.json) {
    output.emit({
      action: isUpdate ? "update" : "create",
      dryRun: args.dryRun,
      file: filePath,
      jira_key: result?.issueKey || existingJiraKey || null,
      jira_url: result?.issueUrl || null,
      epic_bitbucket_url: epicBbUrl,
      prd_bitbucket_url: prdBbUrl,
      change_summary: changeSummary,
      jira_last_synced_at: result?.updated || null,
      jira_last_body_hash: newBodyHash,
      jira_last_meta_hash: newMetaHash,
    });
  }

  return { exitCode: 0, result, changeSummary, isUpdate, epicBbUrl, prdBbUrl };
}

// ---------------------------------------------------------------------------
// Entry / exports
// ---------------------------------------------------------------------------
if (require.main === module) {
  run().then(r => process.exit(r.exitCode || 0)).catch(e => {
    if (process.argv.includes("--json")) process.stdout.write(JSON.stringify({ error: e.message }, null, 2) + "\n");
    else console.error("Unexpected error:", e.message || e);
    process.exit(1);
  });
} else {
  module.exports = {
    run,
    parseArgs,
    buildDescriptionAdf,
    hashBody,
    hashMeta,
    syncLabelFor,
    mapStatus,
    collectIssueFields,
    collectCommonFields,
    collectCreateFields,
    collectUpdateFields,
    extractStoriesTable,
    storiesTableToAdf,
    resolvePrdPath,
    inlineToAdfNodes,
    splitTableRow,
    EPIC_SECTIONS,
    STATUS_MAP,
    VERSION,
    CHANGELOG_DESCRIPTION_LIMIT,
    STORY_REQUIREMENTS_TEXT,
    // Re-export lib pieces for tests
    inlineMarkdownToAdf:     lib.inlineMarkdownToAdf,
    parseFrontmatter:        lib.parseFrontmatter,
    rewriteFrontmatter:      lib.rewriteFrontmatter,
    upsertFrontmatterKeys:   lib.upsertFrontmatterKeys,
    upsertChangelog:         lib.upsertChangelog,
    extractEntries:          lib.extractEntries,
    findHandWrittenChangelog: lib.findHandWrittenChangelog,
    buildChangelogBlock:     lib.buildChangelogBlock,
    fmtEntry:                lib.fmtEntry,
    isEntryRow:              lib.isEntryRow,
    diffFields:              lib.diffFields,
    normalisePriority:       lib.normalisePriority,
    sanitiseLabels:          lib.sanitiseLabels,
    textToParagraphs:        lib.textToAdfNodes,
    textToAdfNodes:          lib.textToAdfNodes,
    blockToAdf:              lib.blockToAdf,
    guardConcurrentEdit:     lib.guardConcurrentEdit,
    parseJiraError:          lib.parseJiraError,
    hashStable:              lib.hashStable,
    findExistingByLabel:     lib.findExistingByLabel,
    fetchUpdatedTimestamp:   lib.fetchUpdatedTimestamp,
    escapeRe:                lib.escapeRe,
    CL_START:                lib.CL_START,
    CL_END:                  lib.CL_END,
  };
}
