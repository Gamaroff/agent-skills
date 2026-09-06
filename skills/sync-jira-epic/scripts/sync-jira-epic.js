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
 *
 * `--no-transition` re-points links / refreshes the description WITHOUT driving
 * the issue's status, so a caller that has already decided the status (e.g.
 * finalise's tracker-workflow ladder) is not overruled by this script's own
 * `loadStatusMap` resolver afterwards. See bug.11.
 */

const fs = require("fs");
const path = require("path");
const lib = require("../references/jira-sync.js");
const CL = require("../references/change-log.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VERSION = "1.2.0";

// What the CARD carries — a summary, not a copy. The epic file is the source of
// truth and every card links to it; see shared/resources/tracker-card-summary.md.
//
// `Epic Description` is the LAST alias, not its own section: an epic with a goal
// never shows it, and one that has only a description still gets a non-empty card.
const EPIC_CARD_SECTIONS = [
  {
    heading: "Summary",
    names: ["Epic Goal", "Epic Description"],
    // Flatten any inline `**Label:**` heading (e.g. `**Existing System Context:**`)
    // to plain `Label:`. ADF can't render mid-paragraph bold headings well, so
    // this preserves the label as a leading text run that ADF renders cleanly.
    transform: (t) => t.replace(/\*\*([^*\n]+):\*\*/g, "$1:"),
  },
];

const ISSUE_TYPE = "Epic";

// Default Jira assignee accountId, from `jira.defaultAssignee` in skills-config.yaml.
// Frontmatter `assignee` overrides it. Empty -> the field is never sent, which leaves
// any existing Jira assignee alone rather than clearing it.
const DEFAULT_ASSIGNEE =
  process.env.JIRA_DEFAULT_ASSIGNEE || lib.loadDefaultAssignee();
const SYNC_LABEL_PREFIX = "synced-from-";

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
  return cells.map((c) => c.split(PIPE_PLACEHOLDER).join("|").trim());
}

function extractStoriesTable(body) {
  // Use the shared helper rather than an inlined copy of the same pattern — the
  // duplicate here silently kept the pre-fix behaviour (no numbering tolerated,
  // not line-anchored) after the canonical one was corrected. `extractSection`
  // rather than `sectionRe` for the same reason: a `# ` inside a fenced block in
  // this section would otherwise end it early and drop the table.
  const section = lib.extractSection(body, "Stories Breakdown");
  if (section === null) return null;
  const raw = section.trim();
  if (!raw.includes("|")) return null;

  // Separator rows: optional leading/trailing pipe surrounding only `-`, `:`, ` `, `|`.
  const isSeparator = (l) => /^\|?[\s\-:|]+\|?$/.test(l.trim()) && /-/.test(l);
  const rows = raw.split("\n").filter((l) => l.trim() && !isSeparator(l));
  if (!rows.length) return null;

  return rows.map(splitTableRow);
}

function storiesTableToAdf(rows) {
  if (!rows || !rows.length) return null;
  const header = rows[0];
  const body = rows.slice(1);
  return lib.adf.table([
    lib.adf.tableRow(
      ...header.map((h) =>
        lib.adf.tableHeader(lib.adf.paragraph(...inlineToAdfNodes(h))),
      ),
    ),
    ...body.map((r) =>
      lib.adf.tableRow(
        ...r.map((c) =>
          lib.adf.tableCell(lib.adf.paragraph(...inlineToAdfNodes(c))),
        ),
      ),
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Description builder (epic-specific)
// ---------------------------------------------------------------------------
function buildDescriptionAdf({
  body,
  frontmatter,
  prdBbUrl,
  epicBbUrl,
  relatedDocLinks,
  linkResolver,
  output = null,
}) {
  const content = [];

  // The document's Change Log is deliberately NOT published here. Jira keeps its
  // own issue history, and the local file holds the authoritative log — a third
  // copy on the card added length on every sync and told a reader nothing new.

  content.push(
    ...lib.buildCardSections(body, EPIC_CARD_SECTIONS, {
      sourceUrl: epicBbUrl || null,
      docLabel: "the epic document",
      linkResolver,
      output,
    }),
  );

  const meta = [];
  if (frontmatter.epic_type) meta.push(`Type: ${frontmatter.epic_type}`);
  if (frontmatter.prd_source) meta.push(`PRD: ${frontmatter.prd_source}`);
  if (frontmatter.estimated_sprints)
    meta.push(`Estimated Sprints: ${frontmatter.estimated_sprints}`);
  if (frontmatter.status) meta.push(`Status: ${frontmatter.status}`);
  if (meta.length) {
    content.push(lib.adf.heading(3, "Metadata"));
    content.push(lib.adf.paragraph(lib.adf.text(meta.join(" | "))));
  }

  // The Stories Breakdown OVERVIEW TABLE only. It is the one part of an epic a
  // board reader genuinely wants without opening the file: which stories exist
  // and where they stand. The authoring guidelines above it and the per-story
  // `###` blocks below it are detail, and those blocks were what made epic
  // descriptions the longest of the three.
  content.push(...storiesBreakdownNodes(body, linkResolver));

  // The old fixed "Story Requirements" paragraph is gone: it told story AUTHORS
  // which frontmatter keys to set, which is authoring guidance for the repo, not
  // information for anyone reading the epic's card.

  // Links go LAST, and the epic file leads them. The card is a pointer, so the
  // route to the full detail is the last thing a reader passes on their way out
  // — not a block they scroll past before reaching the summary.
  const links = [];
  if (epicBbUrl) links.push({ label: "Epic document", href: epicBbUrl });
  if (prdBbUrl) links.push({ label: "Parent PRD", href: prdBbUrl });
  if (relatedDocLinks && relatedDocLinks.length) links.push(...relatedDocLinks);
  if (links.length) {
    content.push(lib.adf.heading(3, "Source Documents"));
    content.push(
      lib.adf.bulletList(
        ...links.map((l) =>
          lib.adf.listItem(lib.adf.paragraph(lib.adf.link(l.label, l.href))),
        ),
      ),
    );
  }

  // Guard Jira's ~32,767-char description limit: over it the PUT is rejected
  // wholesale and the issue silently keeps its previous description. After
  // summarisation this should never fire; it stays as a backstop.
  return lib.capDescriptionAdf(lib.adf.doc(...content), {
    sourceUrl: epicBbUrl || null,
    output,
  });
}

// The Stories Breakdown overview table. Shared by buildDescriptionAdf and
// hashBody so the hash covers exactly what is published — see hashBody below.
//
// `firstTableIn` rather than "cut at the first sub-heading": in real epics the
// overview table sits UNDER a `### Stories Overview` heading, so cutting at the
// first sub-heading deleted the table and kept only the authoring guidelines
// above it — the exact inverse of what the card wants.
function storiesBreakdownNodes(body, linkResolver) {
  const found = lib.extractBodySections(body, ["Stories Breakdown"]);
  if (!found.length) return [];
  const table = lib.firstTableIn(found[0].content);
  if (!table) return [];
  return [
    lib.adf.heading(3, "Stories Breakdown"),
    ...lib.textToAdfNodes(table, linkResolver),
  ];
}

// Hash exactly what gets PUBLISHED, not the raw sections.
//
// Hashing the verbatim document would make an edit to a per-story subsection the
// card no longer carries flip the hash and trigger a description PUT that
// changes nothing on the card.
function hashBody({
  body,
  prdBbUrl,
  epicBbUrl,
  relatedDocLinks,
  linkResolver,
}) {
  const sections = lib.buildCardSections(body, EPIC_CARD_SECTIONS, {
    sourceUrl: epicBbUrl || null,
    docLabel: "the epic document",
    linkResolver,
  });
  return lib.hashStable({
    sections,
    storiesContent: storiesBreakdownNodes(body, linkResolver),
    prdBbUrl,
    epicBbUrl,
    relatedDocLinks: (relatedDocLinks || []).map((l) => `${l.label}|${l.href}`),
  });
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
// Child stories
// ---------------------------------------------------------------------------
// Unlike task folders, an epic folder holds no sibling docs — its related
// documents are the child stories under `stories/<story-dir>/`. The Stories
// Breakdown table names them but can't link them (it's authored prose), so
// resolve the files structurally and link them from Source Documents instead.
//
// A story dir contains the card plus its artifacts (plan, review, QA...). The
// card is the file named after its own directory — that convention is what
// distinguishes it, rather than a blocklist of artifact types that would rot
// as new artifact kinds appear.
function findChildStories(filePath) {
  const storiesDir = path.join(path.dirname(filePath), "stories");
  if (!fs.existsSync(storiesDir)) return [];
  return (
    fs
      .readdirSync(storiesDir)
      .map((d) => ({ dir: d, card: path.join(storiesDir, d, `${d}.md`) }))
      .filter((s) => fs.existsSync(s.card))
      .map((s) => ({ ...s, num: s.dir.match(/^story\.(\d+)\.(\d+)\./i) }))
      .filter((s) => s.num)
      // Lexicographic sort puts story.2.10 before story.2.2 — order numerically.
      .sort(
        (a, b) =>
          Number(a.num[1]) - Number(b.num[1]) ||
          Number(a.num[2]) - Number(b.num[2]),
      )
      .map((s) => ({
        file: s.card,
        label: labelForChildStory(s.card, `${s.num[1]}.${s.num[2]}`),
      }))
  );
}

function labelForChildStory(file, num) {
  let title = null;
  try {
    const { frontmatter, body } = lib.parseFrontmatter(
      fs.readFileSync(file, "utf-8"),
    );
    title = frontmatter.title || body.match(/^# (.+)$/m)?.[1] || null;
  } catch (_) {
    /* unreadable child — fall back to the number alone */
  }
  // Titles are commonly already prefixed "[Story 2.4] ..." — don't repeat it.
  if (title) title = title.replace(/^\[?story\s*[\d.]+\]?[\s:—-]*/i, "").trim();
  return title ? `Story ${num} — ${title}` : `Story ${num}`;
}

// ---------------------------------------------------------------------------
// Sync label
// ---------------------------------------------------------------------------
function syncLabelFor(filePath) {
  const dir = path.basename(path.dirname(filePath));
  return SYNC_LABEL_PREFIX + dir.replace(/\s+/g, "-");
}

// Normalise the summary to the canonical "[Epic N] {title}" bracket form
// (parity with the story/task skills and the GitHub siblings). The `title`
// frontmatter usually embeds an "Epic N:" prefix, so strip whatever prefix it
// carries (bracket or colon) and re-wrap in brackets. `epicNumber` (from
// frontmatter) takes precedence over any id the title carried; the title's id
// is only a fallback. Idempotent: an already-correct "[Epic N] …" summary with
// a matching id is returned unchanged.
function normaliseEpicSummary(summary, epicNumber) {
  const bracket = summary.match(/^\s*\[Epic\s+(\d+)\]\s*(.*)$/i);
  const colon = summary.match(/^\s*Epic\s+(\d+)\s*:\s*(.*)$/i);
  let epicId = epicNumber != null ? String(epicNumber) : null;
  if (bracket) {
    epicId = epicId || bracket[1];
    summary = bracket[2].trim();
  } else if (colon) {
    epicId = epicId || colon[1];
    summary = colon[2].trim();
  }
  return epicId != null ? `[Epic ${epicId}] ${summary}` : summary;
}

// ---------------------------------------------------------------------------
// Field collection
//
// `collectCommonFields` returns the fields valid on both POST (create) and
// PUT (update). Project + issuetype only go on create — Jira refuses to change
// those on PUT — so the create wrapper layers them on top.
// ---------------------------------------------------------------------------
function collectCommonFields({
  args,
  frontmatter,
  descAdf,
  livePriorities,
  output,
  syncLabel,
  summary,
}) {
  const priority = lib.normalisePriority(
    args.priority || frontmatter.priority,
    livePriorities,
    output,
  );
  const labelInput = args.labels || frontmatter.labels;
  const cleanLabels = lib.sanitiseLabels(labelInput) || [];
  if (!cleanLabels.includes(syncLabel)) cleanLabels.push(syncLabel);

  const fields = {
    summary,
    description: descAdf,
    labels: cleanLabels,
  };
  if (priority) fields.priority = { name: priority };

  const assigneeId = lib.resolveAssignee(
    frontmatter.assignee,
    DEFAULT_ASSIGNEE,
    output,
  );
  if (assigneeId) fields.assignee = { accountId: assigneeId };
  if (frontmatter.due_date) fields.duedate = String(frontmatter.due_date);
  if (frontmatter.components) {
    const comps = Array.isArray(frontmatter.components)
      ? frontmatter.components
      : [frontmatter.components];
    fields.components = comps
      .filter(Boolean)
      .map((name) => ({ name: String(name) }));
  }
  if (frontmatter.fix_versions) {
    const fvs = Array.isArray(frontmatter.fix_versions)
      ? frontmatter.fix_versions
      : [frontmatter.fix_versions];
    fields.fixVersions = fvs
      .filter(Boolean)
      .map((name) => ({ name: String(name) }));
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
  return opts.epicTypeId || opts.projectKey
    ? collectCreateFields(opts)
    : collectUpdateFields(opts);
}

// ---------------------------------------------------------------------------
// File write-back
// ---------------------------------------------------------------------------
function updateEpicFile({
  filePath,
  issueKey,
  issueUrl,
  epicBbUrl,
  prdBbUrl,
  prdFilePath,
  changeLogEntries,
  lastSyncedAt,
  bodyHash,
  metaHash,
  output,
}) {
  try {
    let content = fs.readFileSync(filePath, "utf-8");

    // `epic_bitbucket_url` / `prd_bitbucket_url` are deliberately NOT written —
    // they pinned an absolute URL to whichever branch the sync ran on and died
    // when that branch was deleted. See the note in sync-jira-task.js. Both are
    // still READ (`prd_bitbucket_url` is the documented `prd_source` fallback
    // below), so a value a consumer sets by hand keeps working — this only stops
    // the tool minting new ones on every run.
    content = lib.upsertFrontmatterKeys(content, {
      jira_key: issueKey,
      jira_url: issueUrl,
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

    content = upsertLine(
      content,
      /^\*\*Jira Epic\*\*:.*$/m,
      `**Jira Epic**: [${issueKey}](${issueUrl})`,
    );
    // Both links are relative now, so the "keep the relative one, append the
    // Bitbucket one" dance this replaced is gone — there is only one link, and it
    // is the one that resolves when the repo is read as files. Jira still gets an
    // absolute URL; `resolveRelativeLink` rewrites it at ADF-render time.
    //
    // An existing hand-authored relative link is still preferred over a computed
    // one: it may point at a differently-named PRD than `prd_source` resolves to,
    // and overwriting that would be the tool second-guessing the author.
    if (prdFilePath || prdBbUrl) {
      const existing = content.match(/^\*\*Parent PRD\*\*:(.*)$/m);
      const authored = existing
        ? (existing[1].match(/\[[^\]]*\]\((?!https?:)[^)]+\)/) || [])[0]
        : null;
      const link =
        authored ||
        (prdFilePath
          ? `[${path.basename(prdFilePath)}](${lib.toRelativeDocLink(filePath, prdFilePath)})`
          : null);
      if (link)
        content = upsertLine(
          content,
          /^\*\*Parent PRD\*\*:.*$/m,
          `**Parent PRD**: ${link}`,
        );
    }
    const epicFileName = path.basename(filePath);
    content = upsertLine(
      content,
      /^\*\*Epic File\*\*:.*$/m,
      `**Epic File**: [${epicFileName}](./${epicFileName})`,
    );

    // Two events earn a row — issue created, and status transition. The
    // `skipChangelog` flag this replaced existed to suppress a row on the no-op
    // path; the narrowed rules make that suppression automatic, since a no-op
    // produces an empty list and therefore no call at all.
    for (const entry of changeLogEntries) {
      content = CL.upsertChangeLog(content, entry, { docType: "epic" });
    }
    fs.writeFileSync(filePath, content, "utf-8");
    output.info(`\n📝 Updated local epic file: ${filePath}`);
  } catch (err) {
    output.err(`\n⚠️  Failed to update local epic file: ${err.message}`);
    output.err(
      `   The Jira epic was synced successfully. Add these to your epic frontmatter manually:`,
    );
    output.err(`   jira_key: "${issueKey}"`);
    output.err(`   jira_url: "${issueUrl}"`);
  }
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    file: null,
    summary: null,
    priority: null,
    labels: null,
    docBranch: null,
    checkCard: false,
    dryRun: false,
    force: false,
    json: false,
    quiet: false,
    verbose: false,
    version: false,
    failOnStatusSkip: false,
    noTransition: false,
    probeWorkflow: false,
    writeRecord: "",
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--file":
      case "-f":
        opts.file = args[++i];
        break;
      case "--summary":
      case "-s":
        opts.summary = args[++i];
        break;
      case "--priority":
      case "-p":
        opts.priority = args[++i];
        break;
      case "--labels":
      case "-l":
        opts.labels = args[++i];
        break;
      case "--doc-branch":
        opts.docBranch = args[++i];
        break;
      case "--check-card":
        opts.checkCard = true;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--force":
        opts.force = true;
        break;
      case "--json":
        opts.json = true;
        break;
      case "--fail-on-status-skip":
        opts.failOnStatusSkip = true;
        break;
      case "--no-transition":
        opts.noTransition = true;
        break;
      case "--probe-workflow":
        opts.probeWorkflow = true;
        break;
      case "--write-record":
        opts.writeRecord = args[++i];
        break;
      case "--quiet":
        opts.quiet = true;
        break;
      case "--verbose":
      case "-v":
        opts.verbose = true;
        break;
      case "--version":
      case "-V":
        opts.version = true;
        break;
      default:
        if (args[i].startsWith("-"))
          throw new Error(`Unknown option: ${args[i]}`);
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
async function run({
  argv = process.argv,
  fetchImpl = typeof fetch !== "undefined" ? fetch : null,
} = {}) {
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
    output.info(
      typeof value === "string" ? value : JSON.stringify(value, null, 2),
    );
  };

  if (args.probeWorkflow) {
    const auth = lib.getAuth();
    if (!auth.ok) {
      output.err(
        `Error: Missing required environment variables: ${auth.missing.join(", ")}`,
      );
      return { exitCode: 1 };
    }
    const http = lib.makeHttp({
      fetchImpl: fetchImpl || (typeof fetch !== "undefined" ? fetch : null),
      // Anchored to the repo root. Without it layer 1 resolves the config tier
      // against process.cwd(), so a bare `node .../sync-jira-*.js --file docs/...`
      // run from a subdirectory reads no config and writes at `full` over a
      // committed restriction. These are the documented bare invocations the
      // whole task is about (T61-M3, missed in the first sweep).
      cwd: lib.getRepoRoot() || process.cwd(),
    });
    await lib.probeWorkflow({
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      projectKey: auth.project,
      docKind: "epic",
      writePath: args.writeRecord,
      output,
    });
    return { exitCode: 0 };
  }

  if (!args.file) {
    output.err("Error: --file is required");
    output.err(
      "Usage: sync-jira-epic --file <epic.md> [--check-card] [--doc-branch <name>] [--dry-run] [--force] [--json] [--quiet] [--verbose] [--version] [--no-transition]",
    );
    return { exitCode: 1 };
  }
  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) {
    output.err(`Error: File not found: ${filePath}`);
    return { exitCode: 1 };
  }

  // --check-card: preflight the DOCUMENT against the card spec and exit. No
  // auth, no network, no writes — a review-time gate, not a sync mode.
  if (args.checkCard) {
    const { body } = lib.parseFrontmatter(fs.readFileSync(filePath, "utf8"));
    const check = lib.checkCardSections(body, EPIC_CARD_SECTIONS, {
      docLabel: "the epic document",
    });

    // Epics carry one block no spec list can describe: the Stories Breakdown
    // overview table. Absent, the card cannot say which stories exist.
    const storiesTable = lib.firstTableIn(
      (lib.extractBodySections(body, ["Stories Breakdown"])[0] || {}).content ||
        "",
    );
    if (!storiesTable) {
      check.findings.push({
        severity: "important",
        section: "Stories Breakdown",
        code: "no-table",
        message:
          "No overview table found under '## Stories Breakdown' — the card cannot show which stories exist.",
        fix: "Add a pipe table of the epic's stories (commonly under a '### Stories Overview' sub-heading).",
      });
      check.ok = false;
      check.blocks.push({ heading: "Stories Breakdown", status: "missing" });
    } else {
      // Report ROWS, not characters: "0 chars" for a table that is plainly
      // present reads as a failure. Minus the header and separator rows.
      const rows = Math.max(
        0,
        storiesTable.split("\n").filter((l) => l.trim()).length - 2,
      );
      check.blocks.push({
        heading: "Stories Breakdown",
        status: "ok",
        note: `${rows} stories in the overview table`,
      });
    }

    if (args.json) {
      output.emit({ action: "check-card", file: filePath, ...check });
    } else {
      output.info(
        lib.formatCardCheck(check, {
          title: `Card preflight — ${path.basename(filePath)}`,
        }),
      );
    }
    return { exitCode: check.findings.length ? 1 : 0 };
  }

  const auth = lib.getAuth();
  if (!auth.ok) {
    if (args.dryRun) {
      output.warn(
        `⚠️  Dry-run: missing env vars (${auth.missing.join(", ")}) — values will be required for live sync.`,
      );
    } else {
      output.err(
        `Error: Missing required environment variables: ${auth.missing.join(", ")}`,
      );
      output.err(
        "Set: JIRA_URL, JIRA_API_TOKEN, JIRA_USER_EMAIL, JIRA_PROJECT_KEY.",
      );
      return { exitCode: 1 };
    }
  }

  const repoRoot = lib.getRepoRoot();
  const bbBase = lib.getBitbucketRepoBase();
  if (!bbBase)
    output.warn(
      "⚠️  Could not detect Bitbucket repo URL. Set BITBUCKET_REPO_URL to enable Bitbucket links.",
    );
  const branch = bbBase ? lib.resolveDocBranch(args.docBranch) : null;
  const epicBbUrl = bbBase
    ? lib.buildBitbucketUrl(filePath, repoRoot, bbBase, branch)
    : null;
  const linkResolver = lib.makeRelativeLinkResolver({
    filePath,
    repoRoot,
    bbBase,
    branch,
  });
  const relatedDocLinks = bbBase
    ? findChildStories(filePath).map((s) => ({
        label: s.label,
        href: lib.buildBitbucketUrl(s.file, repoRoot, bbBase, branch),
      }))
    : [];

  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = lib.parseFrontmatter(content);

  // Resolved outside the `bbBase` guard: the local **Parent PRD** link is relative
  // and needs the path whether or not a Bitbucket base was resolvable.
  const prdFilePath = resolvePrdPath(frontmatter.prd_source, repoRoot);

  let prdBbUrl = null;
  if (bbBase) {
    if (prdFilePath)
      prdBbUrl = lib.buildBitbucketUrl(prdFilePath, repoRoot, bbBase, branch);
    else if (frontmatter.prd_source)
      output.warn(
        `⚠️  Could not resolve prd_source "${frontmatter.prd_source}" — PRD link omitted.`,
      );
    if (!prdBbUrl && frontmatter.prd_bitbucket_url) {
      prdBbUrl = frontmatter.prd_bitbucket_url;
      output.warn(
        `⚠️  Using cached prd_bitbucket_url from frontmatter — verify it still points to a valid file.`,
      );
    }
  }

  let summary =
    args.summary ||
    frontmatter.summary ||
    frontmatter.title ||
    body.match(/^# (.+)$/m)?.[1];
  if (!summary) {
    output.err(
      "Error: Could not determine summary (set frontmatter title or # heading).",
    );
    return { exitCode: 1 };
  }
  // Normalise to the canonical "[Epic N] {title}" bracket form (see helper).
  summary = normaliseEpicSummary(summary, frontmatter.epic_number);

  const http = lib.makeHttp({
    fetchImpl: fetchImpl || (typeof fetch !== "undefined" ? fetch : null),
    // Anchored to the repo root. Without it layer 1 resolves the config tier
    // against process.cwd(), so a bare `node .../sync-jira-*.js --file docs/...`
    // run from a subdirectory reads no config and writes at `full` over a
    // committed restriction. These are the documented bare invocations the
    // whole task is about (T61-M3, missed in the first sweep).
    cwd: lib.getRepoRoot() || process.cwd(),
  });
  const livePriorities =
    auth.ok && !args.dryRun
      ? await lib.resolveLivePriorities({
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
        })
      : null;

  const syncLabel = syncLabelFor(filePath);
  const newBodyHash = hashBody({
    body,
    prdBbUrl,
    epicBbUrl,
    relatedDocLinks,
    linkResolver,
  });
  const newMetaHash = hashMeta(frontmatter);

  let existingJiraKey = frontmatter.jira_key;

  // Pre-flight idempotency
  if (!existingJiraKey && auth.ok && !args.dryRun) {
    const found = await lib.findExistingByLabel({
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      projectKey: auth.project,
      label: syncLabel,
    });
    if (found) {
      output.warn(
        `ℹ️  Found existing issue ${found.key} with label "${syncLabel}" — switching to update.`,
      );
      existingJiraKey = found.key;
    }
  }

  const isUpdate = !!existingJiraKey;
  output.info(
    `\n${isUpdate ? "🔄 Updating" : "➕ Creating"} Jira epic${isUpdate ? ` ${existingJiraKey}` : ""}…`,
  );
  output.info(`   File: ${filePath}`);
  if (args.dryRun)
    output.info("   Mode: DRY RUN — no Jira calls or file writes");
  if (args.force)
    output.info("   Mode: --force — concurrent-edit guard disabled");

  let result,
    changeSummary,
    current = null;
  // CR-3 — TWO variables, deliberately. `deferred` is the fact ("we were not
  // allowed to write"); `deferredRecord` is only how to find the record. A
  // journal write can fail — recordRefusal warns and returns a null id — and
  // gating on the id meant the one path that recorded NOTHING was also the one
  // that wrote the Change Log row and reported success.
  let deferred = false;
  let deferredRecord = null;

  if (isUpdate) {
    if (!args.dryRun) {
      current = await lib.fetchIssue({
        http,
        baseUrl: auth.baseUrl,
        email: auth.email,
        token: auth.token,
        issueKey: existingJiraKey,
      });
      lib.guardConcurrentEdit({
        jiraUpdated: current.updated,
        lastSyncedAt: frontmatter.jira_last_synced_at,
        force: args.force,
        output,
      });
    }

    const changedFields = current
      ? lib.diffFields({
          prev: current,
          next: {
            summary,
            priority: lib.normalisePriority(
              args.priority || frontmatter.priority,
              livePriorities,
            ),
            labels: lib.sanitiseLabels(args.labels || frontmatter.labels) || [],
          },
          prevBodyHash: frontmatter.jira_last_body_hash,
          newBodyHash,
          prevMetaHash: frontmatter.jira_last_meta_hash,
          newMetaHash,
        })
      : ["summary", "description", "priority", "labels"];
    changeSummary = changedFields.length
      ? `Updated: ${changedFields.join(", ")}`
      : "Sync (no field changes detected)";

    // No-change fast path: skip the PUT. The body has not moved, so there is
    // nothing to publish.
    //
    // The status transition still runs here, and must. This path returns before
    // the main transition block below, so an epic whose frontmatter status moved
    // while its card body did not would otherwise never transition at all — the
    // status would silently diverge from the board on exactly the sync that was
    // meant to carry it. `sync-jira-story` and `sync-jira-task` have always
    // transitioned on this path; the epic's early return made it the odd one out.
    if (current && changedFields.length === 0 && !args.force) {
      output.info(
        "\nℹ️  No field changes detected — skipping Jira update. Re-run with --force to push anyway.",
      );
      const issueUrl = `${auth.baseUrl}/browse/${existingJiraKey}`;

      let skipStatusOutcome = null;
      if (!args.dryRun && frontmatter.status) {
        skipStatusOutcome = await lib.syncDocumentStatus({
          skill: "sync-jira-epic",
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          issueKey: existingJiraKey,
          localStatus: frontmatter.status,
          currentStatus: current?.status || null,
          docKind: "epic",
          output,
          noTransition: args.noTransition,
        });
      }

      // Nothing was created and usually nothing transitioned, so this is normally
      // an empty list — no upsert call, no marker migration, no file rewrite. A
      // transition on this path is the one case that earns a row.
      const skipEntries = lib.buildChangeLogEntries({
        created: false,
        issueKey: existingJiraKey,
        statusOutcome: skipStatusOutcome,
        author: "sync-jira-epic",
        docNoun: "epic",
      });

      // A successful transition bumps Jira's own `updated` field, so `current.updated`
      // — read before the transition — is already stale. Persisting it would make the
      // NEXT sync's concurrent-edit guard see `jiraUpdated > jira_last_synced_at` and
      // abort with "Jira issue updated since last local sync", requiring --force to
      // recover. Re-read the timestamp whenever we actually moved the card.
      let skipSyncedAt = current.updated;
      if (skipStatusOutcome?.transitioned) {
        try {
          skipSyncedAt = await lib.fetchUpdatedTimestampStrict({
            http,
            baseUrl: auth.baseUrl,
            email: auth.email,
            token: auth.token,
            issueKey: existingJiraKey,
          });
        } catch (e) {
          output.warn(
            `⚠️  Could not re-read updated timestamp after transition: ${e.message}. ` +
              `Next sync may require --force.`,
          );
        }
      }

      updateEpicFile({
        filePath,
        issueKey: existingJiraKey,
        issueUrl,
        epicBbUrl,
        prdBbUrl,
        prdFilePath,
        changeLogEntries: skipEntries,
        lastSyncedAt: skipSyncedAt,
        bodyHash: newBodyHash,
        metaHash: newMetaHash,
        output,
      });
      if (args.json) {
        output.emit({
          action: "skip",
          dryRun: false,
          file: filePath,
          jira_key: existingJiraKey,
          jira_url: issueUrl,
          change_summary: changeSummary,
          jira_last_synced_at: current.updated,
          jira_last_body_hash: newBodyHash,
          jira_last_meta_hash: newMetaHash,
          // The skip path has its own emit, and a deferred status transition is
          // the ONE deferral it can produce — `makeOutput` suppresses `info`
          // under --json, so without these keys a refused transition is
          // completely invisible to a --json consumer.
          reason: skipStatusOutcome?.reason === "deferred" ? "deferred" : null,
          record: skipStatusOutcome?.record || null,
        });
      }
      // Report the transition the same way the main path does. Returning a bare
      // exitCode 0 here would make a failed or skipped transition on this path
      // completely silent — no "Status NOT synced" warning, `--fail-on-status-skip`
      // ignored, and `statusOutcome` absent from the returned shape that callers
      // read. Now that this path really does transition, it owes the same report.
      const skipStatusExit = lib.summariseStatusOutcome(skipStatusOutcome, {
        output,
        failOnSkip: args.failOnStatusSkip,
      });
      return {
        exitCode: skipStatusExit,
        isUpdate: true,
        skipped: true,
        statusOutcome: skipStatusOutcome,
      };
    }

    const descAdf = buildDescriptionAdf({
      body,
      frontmatter,
      prdBbUrl,
      epicBbUrl,
      relatedDocLinks,
      linkResolver,
      output,
    });
    const fields = collectUpdateFields({
      args,
      frontmatter,
      descAdf,
      livePriorities,
      output,
      syncLabel,
      summary,
    });
    dump("PUT fields", fields);
    dump("PUT description (ADF)", descAdf);

    if (args.dryRun) {
      output.info(`\n=== DRY RUN — Would UPDATE ${existingJiraKey} ===`);
      output.info(`  Changes: ${changeSummary}`);
      result = {
        issueKey: existingJiraKey,
        issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
        updated: null,
      };
    } else {
      const putResp = await lib.putIssueAtomic({
        skill: "sync-jira-epic",
        http,
        baseUrl: auth.baseUrl,
        email: auth.email,
        token: auth.token,
        issueKey: existingJiraKey,
        fields,
      });
      if (putResp.deferred) {
        // The deferred UPDATE shape — real key, null timestamp. The `||
        // new Date()` fallback below would otherwise stamp a sync that never
        // happened, which is exactly the drift this gate exists to prevent.
        deferred = true;
        deferredRecord = putResp.record;
        result = {
          issueKey: existingJiraKey,
          issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
          updated: null,
        };
        output.info(
          `\n⏸️  Epic update deferred — access.tracker restricts this run. Recorded as ${deferredRecord}.`,
        );
        output.info(`   Changes: ${changeSummary}`);
      } else {
        const { updated } = putResp;
        const finalUpdated =
          updated ||
          (await lib.fetchUpdatedTimestamp({
            http,
            baseUrl: auth.baseUrl,
            email: auth.email,
            token: auth.token,
            issueKey: existingJiraKey,
          })) ||
          new Date().toISOString();
        result = {
          issueKey: existingJiraKey,
          issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
          updated: finalUpdated,
        };
        output.info(`\n✅ Epic updated: ${existingJiraKey}`);
        output.info(`   URL: ${result.issueUrl}`);
        output.info(`   Changes: ${changeSummary}`);
      }
    }
  } else {
    changeSummary = "Initial Jira epic created";
    const descAdf = buildDescriptionAdf({
      body,
      frontmatter,
      prdBbUrl,
      epicBbUrl,
      relatedDocLinks,
      linkResolver,
      output,
    });

    if (args.dryRun) {
      output.info(`\n=== DRY RUN — Would CREATE Jira epic ===`);
      output.info(`  Project: ${auth.project || "(unset)"}`);
      output.info(`  Summary: ${summary}`);
      output.info(`  Label:   ${syncLabel}`);
      result = { issueKey: null, issueUrl: null, updated: null };
    } else {
      const epicTypeId = await lib.getIssueTypeId({
        http,
        baseUrl: auth.baseUrl,
        email: auth.email,
        token: auth.token,
        projectKey: auth.project,
        typeName: ISSUE_TYPE,
        repoRoot,
      });
      const fields = collectCreateFields({
        args,
        frontmatter,
        descAdf,
        epicTypeId,
        projectKey: auth.project,
        livePriorities,
        output,
        syncLabel,
        summary,
      });

      // Epic Name custom field — many Jira Cloud instances need it set on create.
      const epicNameField =
        process.env.JIRA_EPIC_NAME_FIELD || "customfield_10011";
      if (epicNameField.toLowerCase() !== "none") {
        fields[epicNameField] = summary;
      }

      dump("POST fields", fields);
      dump("POST description (ADF)", descAdf);

      // Build a regex that adapts to whatever epic-name field the user configured,
      // falling back to the canonical "epic name" / `customfield_10011` strings.
      const epicNameRe = new RegExp(
        `${lib.escapeRe(epicNameField)}|epic[ _-]?name`,
        "i",
      );

      const resp = await http(`${auth.baseUrl}/rest/api/3/issue`, {
        method: "POST",
        headers: {
          Authorization: lib.authHeader(auth.email, auth.token),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ fields }),
        // Layer 2 — annotated HERE only. The epic-name retry below is the same
        // logical create; the gate answers `ok`, so that branch is unreachable
        // on a deferral and one create writes exactly one record.
        defer: {
          kind: "jira.issue.create",
          intent: `Create the Jira epic "${fields.summary || "(no summary)"}" in ${auth.project || "the project"}`,
          target: {
            name: fields.summary || "(no summary)",
            url: `${auth.baseUrl}/rest/api/3/issue`,
            ui_url: `${auth.baseUrl}/secure/CreateIssue!default.jspa`,
          },
          desired: lib.summariseFields(fields),
          skill: "sync-jira-epic",
        },
      });
      if (resp.deferred) {
        // The create null shape — identical to --dry-run. NEVER a placeholder
        // key: one would break the idempotent synced-from-* label search.
        deferred = true;
        deferredRecord = resp.deferredRecord;
        result = { issueKey: null, issueUrl: null, updated: null };
        output.info(
          `\n⏸️  Epic create deferred — access.tracker restricts this run. Recorded as ${deferredRecord}.`,
        );
        output.info(`   Summary: ${fields.summary || "(no summary)"}`);
      } else {
        if (!resp.ok) {
          const errText = await lib.parseJiraError(resp);
          // Retry without epic-name field if Jira rejects it (team-managed projects)
          if (
            resp.status === 400 &&
            epicNameRe.test(errText) &&
            fields[epicNameField]
          ) {
            output.info(
              `ℹ️  Retrying create without ${epicNameField} (team-managed project): ${errText.slice(0, 120)}`,
            );
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
            if (!retry.ok)
              throw new Error(
                `HTTP ${retry.status}: ${await lib.parseJiraError(retry)}`,
              );
            const created = await retry.json();
            const issueKey = created.key;
            const issueUrl = `${auth.baseUrl}/browse/${issueKey}`;
            const updated =
              (await lib.fetchUpdatedTimestamp({
                http,
                baseUrl: auth.baseUrl,
                email: auth.email,
                token: auth.token,
                issueKey,
              })) || new Date().toISOString();
            result = { issueKey, issueUrl, updated };
          } else {
            throw new Error(`HTTP ${resp.status}: ${errText}`);
          }
        } else {
          const rawText = await resp.text();
          let created;
          try {
            created = JSON.parse(rawText);
          } catch (_) {
            output.err(
              "\n⚠️  Jira returned 2xx but response body was not valid JSON. Raw body:",
            );
            output.err(rawText.slice(0, 500));
            throw new Error(
              "Could not parse Jira create response — check Jira manually for the new epic",
            );
          }
          const issueKey = created.key;
          const issueUrl = `${auth.baseUrl}/browse/${issueKey}`;
          const updated =
            (await lib.fetchUpdatedTimestamp({
              http,
              baseUrl: auth.baseUrl,
              email: auth.email,
              token: auth.token,
              issueKey,
            })) || new Date().toISOString();
          result = { issueKey, issueUrl, updated };
        }

        output.info(`\n✅ Epic created: ${result.issueKey}`);
        output.info(`   URL: ${result.issueUrl}`);

        await lib.moveToBacklog({
          skill: "sync-jira-epic",
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          boardId: auth.boardId,
          issueKey: result.issueKey,
          output,
        });

        // Set Team field (customfield_10001) so the epic appears on boards filtered by cf[10001].
        if (auth.boardId) {
          try {
            const boardCfgResp = await http(
              `${auth.baseUrl}/rest/agile/1.0/board/${auth.boardId}/configuration`,
              {
                headers: {
                  Authorization: lib.authHeader(auth.email, auth.token),
                  Accept: "application/json",
                },
              },
            );
            if (boardCfgResp.ok) {
              const boardCfg = await boardCfgResp.json();
              const filterId = boardCfg?.filter?.id;
              if (filterId) {
                const filterResp = await http(
                  `${auth.baseUrl}/rest/api/3/filter/${filterId}`,
                  {
                    headers: {
                      Authorization: lib.authHeader(auth.email, auth.token),
                      Accept: "application/json",
                    },
                  },
                );
                if (filterResp.ok) {
                  const filter = await filterResp.json();
                  const teamMatch = /cf\[10001\]\s+in\s+\(([^)]+)\)/i.exec(
                    filter.jql || "",
                  );
                  if (teamMatch) {
                    const teamUuid = teamMatch[1]
                      .split(",")[0]
                      .trim()
                      .replace(/^["']|["']$/g, "");
                    if (teamUuid) {
                      const teamResp = await http(
                        `${auth.baseUrl}/rest/api/3/issue/${result.issueKey}`,
                        {
                          method: "PUT",
                          headers: {
                            Authorization: lib.authHeader(
                              auth.email,
                              auth.token,
                            ),
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            fields: { customfield_10001: teamUuid },
                          }),
                          // Layer 2 — this is the "set Team to Platform" case.
                          // Unannotated it would render as a PUT and a UUID.
                          defer: {
                            kind: "jira.issue.update",
                            intent: `Set the Team field on ${result.issueKey} so the epic appears on board ${auth.boardId}`,
                            target: {
                              issue: result.issueKey,
                              url: `${auth.baseUrl}/rest/api/3/issue/${result.issueKey}`,
                              ui_url: `${auth.baseUrl}/browse/${result.issueKey}`,
                            },
                            desired: { Team: teamUuid },
                            skill: "sync-jira-epic",
                          },
                        },
                      );
                      if (teamResp.deferred) {
                        output.info(
                          `   ⏸️  Team field deferred — recorded as ${teamResp.deferredRecord}`,
                        );
                      } else if (teamResp.status === 204) {
                        output.info(`   Team field set: ${teamUuid}`);
                      } else {
                        output.warn(
                          `⚠️  Team field update returned HTTP ${teamResp.status} — epic created but may not appear on board`,
                        );
                      }
                    }
                  }
                }
              }
            }
          } catch (teamErr) {
            output.warn(
              `⚠️  Could not set team field: ${teamErr.message} — epic created but may not appear on board`,
            );
          }
        }
      }
    }
  }

  // Status transition
  let statusOutcome = null;
  if (result?.issueKey && !args.dryRun && frontmatter.status) {
    statusOutcome = await lib.syncDocumentStatus({
      skill: "sync-jira-epic",
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      issueKey: result.issueKey,
      localStatus: frontmatter.status,
      currentStatus: current?.status || null,
      docKind: "epic",
      output,
      noTransition: args.noTransition,
    });
  }

  // Write-back. A deferred update changed nothing in Jira, so recording a
  // Change Log row saying it did is the drift this gate exists to prevent.
  if (result?.issueKey && !args.dryRun && !deferred) {
    updateEpicFile({
      filePath,
      issueKey: result.issueKey,
      issueUrl: result.issueUrl,
      epicBbUrl,
      prdBbUrl,
      prdFilePath,
      changeLogEntries: lib.buildChangeLogEntries({
        created: !isUpdate,
        issueKey: result.issueKey,
        statusOutcome,
        author: "sync-jira-epic",
        docNoun: "epic",
      }),
      lastSyncedAt: result.updated,
      bodyHash: newBodyHash,
      metaHash: newMetaHash,
      output,
    });

    if (!isUpdate) {
      // No `epic_bitbucket_url` here. It used to be printed for the author to
      // paste into each story, which is this card's defect arriving by hand: an
      // absolute URL pinned to whichever branch the sync ran on, dead the moment
      // that branch is deleted, and invisible to a link checker. `sync-jira-story`
      // writes the `**Epic File**` link itself, relative, so there is nothing to
      // copy. The key is still *read* as a fallback for a value already set.
      output.info(
        "\n📌 Story reminder:\n" +
          `   jira_epic: "${result.issueKey}"\n` +
          "   Point each story's `epic_source` at this epic's path — sync-jira-story\n" +
          "   writes the Jira epic and Epic File links into the story body from there.",
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
      // CYCLE-2 CR-3 — THREE deferral sources, not two. The create and the PUT
      // set the flag directly; a refused status transition is the third, and on
      // the no-field-changes path it is the ONLY one, so keying `reason` off the
      // flag alone reported `null` for a run that refused and recorded a write.
      reason:
        deferred || statusOutcome?.reason === "deferred" ? "deferred" : null,
      record: deferredRecord || statusOutcome?.record || null,
    });
  }

  const statusExit = lib.summariseStatusOutcome(statusOutcome, {
    output,
    failOnSkip: args.failOnStatusSkip,
  });

  return {
    exitCode: statusExit,
    result,
    changeSummary,
    isUpdate,
    epicBbUrl,
    prdBbUrl,
    statusOutcome,
  };
}

// ---------------------------------------------------------------------------
// Entry / exports
// ---------------------------------------------------------------------------
if (require.main === module) {
  run()
    .then((r) => process.exit(r.exitCode || 0))
    .catch((e) => {
      if (process.argv.includes("--json"))
        process.stdout.write(
          JSON.stringify({ error: e.message }, null, 2) + "\n",
        );
      else console.error("Unexpected error:", e.message || e);
      process.exit(1);
    });
} else {
  module.exports = {
    updateEpicFile,
    run,
    parseArgs,
    buildDescriptionAdf,
    findChildStories,
    labelForChildStory,
    hashBody,
    hashMeta,
    syncLabelFor,
    normaliseEpicSummary,
    mapStatus: lib.mapStatus,
    loadStatusMap: lib.loadStatusMap,
    collectIssueFields,
    collectCommonFields,
    collectCreateFields,
    collectUpdateFields,
    extractStoriesTable,
    storiesTableToAdf,
    resolvePrdPath,
    inlineToAdfNodes,
    splitTableRow,
    EPIC_CARD_SECTIONS,
    STATUS_MAP: lib.DEFAULT_STATUS_MAP,
    VERSION,
    // Re-export lib pieces for tests
    inlineMarkdownToAdf: lib.inlineMarkdownToAdf,
    parseFrontmatter: lib.parseFrontmatter,
    rewriteFrontmatter: lib.rewriteFrontmatter,
    upsertFrontmatterKeys: lib.upsertFrontmatterKeys,
    // Change Log: policy from jira-sync, mechanics straight from the engine.
    buildChangeLogEntries: lib.buildChangeLogEntries,
    upsertChangeLog: CL.upsertChangeLog,
    extractEntries: CL.extractEntries,
    findChangeLog: CL.findChangeLog,
    buildChangeLogBlock: CL.buildChangeLogBlock,
    fmtEntry: CL.fmtEntry,
    isEntryRow: CL.isEntryRow,
    diffFields: lib.diffFields,
    normalisePriority: lib.normalisePriority,
    sanitiseLabels: lib.sanitiseLabels,
    textToParagraphs: lib.textToAdfNodes,
    textToAdfNodes: lib.textToAdfNodes,
    blockToAdf: lib.blockToAdf,
    guardConcurrentEdit: lib.guardConcurrentEdit,
    parseJiraError: lib.parseJiraError,
    hashStable: lib.hashStable,
    findExistingByLabel: lib.findExistingByLabel,
    fetchUpdatedTimestamp: lib.fetchUpdatedTimestamp,
    escapeRe: lib.escapeRe,
    stripRemotePrefix: lib.stripRemotePrefix,
    resolveRelativeLink: lib.resolveRelativeLink,
    makeRelativeLinkResolver: lib.makeRelativeLinkResolver,
    getCurrentBranchUpstream: lib.getCurrentBranchUpstream,
    getDefaultBranch: lib.getDefaultBranch,
    gitDefaultBranch: lib.gitDefaultBranch,
    resolveDocBranch: lib.resolveDocBranch,
    loadDocBranchSetting: lib.loadDocBranchSetting,
    parseTopLevelScalar: lib.parseTopLevelScalar,
    CL_START: CL.CL_START,
    CL_END: CL.CL_END,
  };
}
