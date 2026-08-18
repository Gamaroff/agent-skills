#!/usr/bin/env node
"use strict";
/**
 * sync-jira-story — Create or update a Jira Story from a local story markdown file.
 *
 * Story is linked to a parent Epic via `jira_epic` frontmatter. Detects
 * team-managed (parent) vs classic (Epic Link customfield_10014) projects;
 * retries with the opposite linkage on a 400 mentioning either field.
 *
 * Uses Jira REST API v3 with ADF. All 20 reliability features from
 * sync-jira-task apply via the shared lib.
 */

const fs = require("fs");
const path = require("path");
const lib = require("../references/jira-sync.js");
const CL = require("../references/change-log.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// What the CARD carries — a summary, not a copy. The story file is the source
// of truth and every card links to it; see shared/resources/tracker-card-summary.md.
//
// `names` is an ALIAS ARRAY — three spellings of the story statement are in
// active use and none is wrong. Measured across 426 story documents 2026-07-31:
// `## Story` 234, `## Story Statement` 161, `## User Story` 7. The list once
// named only `User Story`, so ~98% of stories published their acceptance
// criteria and nothing else, silently.
//
// `Description` is the LAST alias, not its own section: a story that has a story
// statement never shows it, and one that has only a Description still gets a
// non-empty card instead of a heading with nothing under it.
const STORY_CARD_SECTIONS = [
  {
    heading: "Summary",
    names: ["User Story", "Story", "Story Statement", "Description"],
  },
  { heading: "Acceptance Criteria", names: ["Acceptance Criteria"] },
];

const ISSUE_TYPE = "Story";

// Default Jira assignee accountId, from `jira.defaultAssignee` in skills-config.yaml.
// Frontmatter `assignee` overrides it. Empty -> the field is never sent, which leaves
// any existing Jira assignee alone rather than clearing it.
const DEFAULT_ASSIGNEE =
  process.env.JIRA_DEFAULT_ASSIGNEE || lib.loadDefaultAssignee();
const SYNC_LABEL_PREFIX = "synced-from-";
const EPIC_LINK_FIELD = process.env.JIRA_EPIC_LINK_FIELD || "customfield_10014";

// Optional Jira custom field id for estimated dev hours (e.g. "Dev Estimate
// (hour)"). Resolved from JIRA_DEV_ESTIMATE_FIELD env var, else
// `jira.devEstimateField` in skills-config.yaml. Empty → the field is skipped.
const DEV_ESTIMATE_FIELD =
  process.env.JIRA_DEV_ESTIMATE_FIELD || lib.loadDevEstimateField();

const TIMETRACKING_ERROR_RE = /timetracking|time tracking|original.?estimate/i;

// Format an estimate value for Jira timetracking. Numeric input → "Nh".
// String input is passed through (lets users write "1d 4h" if they want).
function formatJiraTimeEstimate(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return `${n}h`;
  const s = String(value).trim();
  return s || null;
}

// ---------------------------------------------------------------------------
// Description builder (story-specific)
// ---------------------------------------------------------------------------
function buildDescriptionAdf({
  body,
  frontmatter,
  epicBbUrl,
  storyBbUrl,
  relatedDocLinks,
  linkResolver,
  output = null,
}) {
  const content = [];

  // The document's Change Log is deliberately NOT published here. Jira keeps its
  // own issue history, and the local file holds the authoritative log — a third
  // copy on the card added length on every sync and told a reader nothing new.

  content.push(
    ...lib.buildCardSections(body, STORY_CARD_SECTIONS, {
      sourceUrl: storyBbUrl || null,
      docLabel: "the story document",
      linkResolver,
      output,
    }),
  );

  const meta = [];
  if (frontmatter.story_type) meta.push(`Type: ${frontmatter.story_type}`);
  if (frontmatter.estimated_effort_hours)
    meta.push(`Estimated Hours: ${frontmatter.estimated_effort_hours}`);
  if (frontmatter.jira_epic) meta.push(`Epic: ${frontmatter.jira_epic}`);
  if (frontmatter.status) meta.push(`Status: ${frontmatter.status}`);
  if (meta.length) {
    content.push(lib.adf.heading(3, "Metadata"));
    content.push(lib.adf.paragraph(lib.adf.text(meta.join(" | "))));
  }

  // Links go LAST, and the story file leads them. The card is a pointer, so the
  // route to the full detail is the last thing a reader passes on their way out
  // — not a block they scroll past before reaching the summary.
  const links = [];
  if (storyBbUrl) links.push({ label: "Story document", href: storyBbUrl });
  if (epicBbUrl) links.push({ label: "Parent epic", href: epicBbUrl });
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
    sourceUrl: storyBbUrl || null,
    output,
  });
}

// Hash exactly what gets PUBLISHED, not the raw sections.
//
// Hashing the verbatim document would make an edit to a section the card no
// longer carries flip the hash and trigger a description PUT that changes
// nothing on the card.
function hashBody({
  body,
  epicBbUrl,
  storyBbUrl,
  relatedDocLinks,
  linkResolver,
}) {
  const sections = lib.buildCardSections(body, STORY_CARD_SECTIONS, {
    sourceUrl: storyBbUrl || null,
    docLabel: "the story document",
    linkResolver,
  });
  return lib.hashStable({
    sections,
    epicBbUrl,
    storyBbUrl,
    relatedDocLinks: (relatedDocLinks || []).map((l) => l.href),
  });
}

function hashMeta(frontmatter) {
  return lib.hashStable({
    story_type: frontmatter.story_type || "",
    estimated_effort_hours: frontmatter.estimated_effort_hours || "",
    jira_epic: frontmatter.jira_epic || "",
    status: frontmatter.status || "",
  });
}

// ---------------------------------------------------------------------------
// Related docs (co-located story artifacts — plan, review, QA, etc.)
// ---------------------------------------------------------------------------
// A story folder accumulates companions alongside the card itself: the
// implementation plan, review and QA write-ups, the DoD checklist. Those are
// the docs a Jira reader reaches for next, and nobody remembers to link them
// by hand — so discover them structurally and they appear on the next sync.
//
// Only durable artifacts are listed. Point-in-time ones (dated validate runs,
// sprint-review summaries) are deliberately skipped: they go stale, and a
// confidently-wrong link is worse than no link. Order here is display order.
const RELATED_DOC_TYPES = [
  { key: "plan", label: "Implementation plan" },
  { key: "review", label: "Story review" },
  { key: "qa", label: "QA assessment" },
  { key: "implementation", label: "Implementation report" },
  { key: "dod", label: "Definition of Done" },
];

// story.2.4.review.1.update-examples-readme.md → { label: "Story review", instance: "1" }
function relatedDocInfo(filename) {
  const m = filename.match(/^story\.[\d.]+?\.([a-z]+)\.(?:(\d+)\.)?.*\.md$/i);
  if (!m) return null;
  const type = RELATED_DOC_TYPES.find((t) => t.key === m[1].toLowerCase());
  return type
    ? {
        label: type.label,
        instance: m[2] || null,
        order: RELATED_DOC_TYPES.indexOf(type),
      }
    : null;
}

function findRelatedDocs(filePath) {
  const dir = path.dirname(filePath);
  const self = path.basename(filePath);
  const found = [];
  for (const f of fs.readdirSync(dir)) {
    if (f === self || !f.toLowerCase().endsWith(".md")) continue;
    const info = relatedDocInfo(f);
    if (info) found.push({ ...info, file: path.join(dir, f) });
  }
  found.sort(
    (a, b) =>
      a.order - b.order || String(a.instance).localeCompare(String(b.instance)),
  );
  // Several artifacts of one type (review.1, review.2) would otherwise render
  // as identical link labels — qualify those with the instance number.
  const perLabel = {};
  found.forEach((d) => {
    perLabel[d.label] = (perLabel[d.label] || 0) + 1;
  });
  return found.map((d) => ({
    file: d.file,
    label:
      perLabel[d.label] > 1 && d.instance
        ? `${d.label} ${d.instance}`
        : d.label,
  }));
}

// ---------------------------------------------------------------------------
// Sync label
// ---------------------------------------------------------------------------
function syncLabelFor(filePath) {
  const dir = path.basename(path.dirname(filePath));
  return SYNC_LABEL_PREFIX + dir.replace(/\s+/g, "-");
}

// Normalise the summary to the canonical "[Story N.N] {title}" form used by
// create-story, ensure-story-github-issue, and review-story's dedup search.
// The `title` frontmatter usually embeds a "Story N.N:" prefix, so strip
// whatever prefix it carries (bracket or colon) and re-wrap in brackets,
// falling back to the filename-derived id when the title carries none.
// Idempotent: an already-correct "[Story N.N] …" summary is returned unchanged.
function normaliseStorySummary(summary, fallbackId) {
  const bracket = summary.match(/^\s*\[Story\s+([\d.]+)\]\s*(.*)$/i);
  const colon = summary.match(/^\s*Story\s+([\d.]+)\s*:\s*(.*)$/i);
  let storyId = null;
  if (bracket) {
    storyId = bracket[1];
    summary = bracket[2].trim();
  } else if (colon) {
    storyId = colon[1];
    summary = colon[2].trim();
  }
  storyId = storyId || fallbackId;
  return storyId ? `[Story ${storyId}] ${summary}` : summary;
}

// ---------------------------------------------------------------------------
// Epic source path resolution
// ---------------------------------------------------------------------------
function resolveEpicPath(epicSource, repoRoot) {
  if (!epicSource) return null;
  const candidate = path.resolve(repoRoot, epicSource);
  return fs.existsSync(candidate) ? candidate : null;
}

// ---------------------------------------------------------------------------
// Field collection
// ---------------------------------------------------------------------------
function collectIssueFields({
  args,
  frontmatter,
  summary,
  descAdf,
  includeDescription = true,
  storyTypeId,
  projectKey,
  livePriorities,
  output,
  syncLabel,
  epicKey,
  useEpicLink,
}) {
  const finalSummary =
    summary || args.summary || frontmatter.summary || frontmatter.title;
  const priority = lib.normalisePriority(
    args.priority || frontmatter.priority,
    livePriorities,
    output,
  );
  const labelInput = args.labels || frontmatter.labels;
  const cleanLabels = lib.sanitiseLabels(labelInput) || [];
  if (!cleanLabels.includes(syncLabel)) cleanLabels.push(syncLabel);

  const fields = {
    summary: finalSummary,
    labels: cleanLabels,
  };
  if (includeDescription) fields.description = descAdf;
  if (storyTypeId) fields.issuetype = { id: storyTypeId };
  if (projectKey) fields.project = { key: projectKey };
  if (priority) fields.priority = { name: priority };

  if (epicKey) {
    if (useEpicLink) fields[EPIC_LINK_FIELD] = epicKey;
    else fields.parent = { key: epicKey };
  }

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

  const estimate = formatJiraTimeEstimate(frontmatter.estimated_effort_hours);
  if (estimate)
    fields.timetracking = {
      originalEstimate: estimate,
      remainingEstimate: estimate,
    };

  // Mirror the numeric estimate onto a configured custom field (e.g. "Dev
  // Estimate (hour)"). Numeric field → raw number; non-numeric values skipped.
  if (DEV_ESTIMATE_FIELD) {
    const hours = Number(frontmatter.estimated_effort_hours);
    if (Number.isFinite(hours)) fields[DEV_ESTIMATE_FIELD] = hours;
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Create with parent/Epic-Link retry on 400
// ---------------------------------------------------------------------------
async function createStoryWithRetry({ http, auth, fields, output }) {
  const url = `${auth.baseUrl}/rest/api/3/issue`;
  const headers = {
    Authorization: lib.authHeader(auth.email, auth.token),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const attempt = (f) =>
    http(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields: f }),
      // Layer 2 — the summary and fields a human would type into the create
      // screen, not the request body. The retries below are never reached on a
      // deferral: the gate answers `ok`, so one logical create writes one record.
      defer: {
        kind: "jira.issue.create",
        intent: `Create the Jira story "${f.summary || "(no summary)"}" in ${auth.project || "the project"}`,
        target: {
          name: f.summary || "(no summary)",
          url: url,
          ui_url: `${auth.baseUrl}/secure/CreateIssue!default.jspa`,
        },
        desired: lib.summariseFields(f),
        skill: "sync-jira-story",
      },
    });

  let current = fields;
  let resp = await attempt(current);
  if (resp.ok) return resp;
  if (resp.status !== 400)
    throw new Error(`HTTP ${resp.status}: ${await lib.parseJiraError(resp)}`);
  let errText = await lib.parseJiraError(resp);

  // Strip timetracking if time tracking is disabled on the project
  if (current.timetracking && TIMETRACKING_ERROR_RE.test(errText)) {
    output.warn(
      `⚠️  Jira rejected timetracking field — retrying create without estimate (${errText.slice(0, 120)})`,
    );
    current = { ...current };
    delete current.timetracking;
    resp = await attempt(current);
    if (resp.ok) return resp;
    if (resp.status !== 400)
      throw new Error(`HTTP ${resp.status}: ${await lib.parseJiraError(resp)}`);
    errText = await lib.parseJiraError(resp);
  }

  // Strip the dev-estimate custom field if Jira rejects it (wrong id, not on
  // the create screen, etc.) — a misconfigured field must not block the sync.
  if (
    DEV_ESTIMATE_FIELD &&
    current[DEV_ESTIMATE_FIELD] !== undefined &&
    errText.includes(DEV_ESTIMATE_FIELD)
  ) {
    output.warn(
      `⚠️  Jira rejected ${DEV_ESTIMATE_FIELD} — retrying create without the dev-estimate field (${errText.slice(0, 120)})`,
    );
    current = { ...current };
    delete current[DEV_ESTIMATE_FIELD];
    resp = await attempt(current);
    if (resp.ok) return resp;
    if (resp.status !== 400)
      throw new Error(`HTTP ${resp.status}: ${await lib.parseJiraError(resp)}`);
    errText = await lib.parseJiraError(resp);
  }

  if (/parent|epic[ _-]?link|customfield_10014/i.test(errText)) {
    const flipped = { ...current };
    if (flipped.parent) {
      const parentKey = flipped.parent.key;
      delete flipped.parent;
      flipped[EPIC_LINK_FIELD] = parentKey;
      output.info(
        `ℹ️  Retrying create with Epic Link customfield (initial parent attempt failed: ${errText.slice(0, 120)})`,
      );
    } else if (flipped[EPIC_LINK_FIELD]) {
      flipped.parent = { key: flipped[EPIC_LINK_FIELD] };
      delete flipped[EPIC_LINK_FIELD];
      output.info(
        `ℹ️  Retrying create with parent field (initial Epic Link attempt failed: ${errText.slice(0, 120)})`,
      );
    } else {
      throw new Error(`HTTP 400: ${errText}`);
    }
    resp = await attempt(flipped);
    if (!resp.ok)
      throw new Error(`HTTP ${resp.status}: ${await lib.parseJiraError(resp)}`);
    return resp;
  }
  throw new Error(`HTTP 400: ${errText}`);
}

// ---------------------------------------------------------------------------
// File write-back
// ---------------------------------------------------------------------------
//
// Inline-link upserter that ignores fenced code blocks.
// We replace fenced ``` blocks with placeholders, do the regex match/replace
// on the rest, then restore. Prevents accidental rewriting of `**Jira Story**:`
// etc. shown inside markdown sample blocks.
function withCodeBlocksMasked(text, fn) {
  const blocks = [];
  const masked = text.replace(/```[\s\S]*?```/g, (m) => {
    const idx = blocks.length;
    blocks.push(m);
    return `\x01CODEBLOCK_${idx}\x01`;
  });
  const result = fn(masked);
  return result.replace(
    /\x01CODEBLOCK_(\d+)\x01/g,
    (_, i) => blocks[Number(i)],
  );
}

function upsertInlineLine(text, pattern, newLine) {
  return withCodeBlocksMasked(text, (masked) => {
    if (pattern.test(masked)) return masked.replace(pattern, newLine);
    const m = masked.match(/^(# .+)$/m);
    if (m) {
      const idx = masked.indexOf(m[0]) + m[0].length;
      return masked.slice(0, idx) + "\n\n" + newLine + masked.slice(idx);
    }
    return masked.trimEnd() + "\n\n" + newLine + "\n";
  });
}

function updateStoryFile({
  filePath,
  issueKey,
  issueUrl,
  epicKey,
  epicBbUrl,
  epicFilePath,
  storyBbUrl,
  changeLogEntries,
  lastSyncedAt,
  bodyHash,
  metaHash,
  baseUrl,
  output,
}) {
  let content = fs.readFileSync(filePath, "utf-8");

  // `story_bitbucket_url` / `epic_bitbucket_url` are deliberately NOT written —
  // they pinned an absolute URL to whichever branch the sync ran on, and died when
  // that branch was deleted. See the note in sync-jira-task.js. Both keys are still
  // READ (`epic_bitbucket_url` is a resolution fallback below), so an existing value
  // keeps working; this only stops new ones being minted.
  content = lib.upsertFrontmatterKeys(content, {
    jira_key: issueKey,
    jira_url: issueUrl,
    jira_epic: epicKey,
    jira_last_synced_at: lastSyncedAt || null,
    jira_last_body_hash: bodyHash || null,
    jira_last_meta_hash: metaHash || null,
  });

  const epicUrl = `${(baseUrl || "").replace(/\/$/, "")}/browse/${epicKey}`;
  content = upsertInlineLine(
    content,
    /^\*\*Jira Story\*\*:.*$/m,
    `**Jira Story**: [${issueKey}](${issueUrl})`,
  );
  content = upsertInlineLine(
    content,
    /^\*\*Jira Epic\*\*:.*$/m,
    `**Jira Epic**: [${epicKey}](${epicUrl})`,
  );
  // Relative document links. Jira still receives absolute ones — `resolveRelativeLink`
  // rewrites them at ADF-render time — but the file on disk stays branch-independent.
  const storyFileName = path.basename(filePath);
  content = upsertInlineLine(
    content,
    /^\*\*Story File\*\*:.*$/m,
    `**Story File**: [${storyFileName}](./${storyFileName})`,
  );
  if (epicFilePath) {
    const relEpic = lib.toRelativeDocLink(filePath, epicFilePath);
    content = upsertInlineLine(
      content,
      /^\*\*Epic File\*\*:.*$/m,
      `**Epic File**: [${path.basename(epicFilePath)}](${relEpic})`,
    );
  }

  // Exactly two events earn a row — issue created, and status transition. See
  // `buildChangeLogEntries` in jira-sync.js for why a body update earns none.
  // An empty list means no call, and therefore no legacy-marker migration. The
  // write itself is unconditional, so the guarantee is byte-identical content and
  // an empty `git diff` on a no-op — not a skipped write.
  for (const entry of changeLogEntries) {
    content = CL.upsertChangeLog(content, entry, { docType: "story" });
  }
  fs.writeFileSync(filePath, content, "utf-8");
  output.info(`\n📝 Updated local story file: ${filePath}`);
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
    noWrite: false,
    force: false,
    json: false,
    quiet: false,
    failOnStatusSkip: false,
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
      case "--no-write":
        opts.noWrite = true;
        break;
      case "--force":
        opts.force = true;
        break;
      case "--json":
        opts.json = true;
        break;
      case "--quiet":
        opts.quiet = true;
        break;
      case "--fail-on-status-skip":
        opts.failOnStatusSkip = true;
        break;
      case "--probe-workflow":
        opts.probeWorkflow = true;
        break;
      case "--write-record":
        opts.writeRecord = args[++i];
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
    });
    await lib.probeWorkflow({
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      projectKey: auth.project,
      docKind: "story",
      writePath: args.writeRecord,
      output,
    });
    return { exitCode: 0 };
  }

  if (!args.file) {
    output.err("Error: --file is required");
    output.err(
      "Usage: sync-jira-story --file <story.md> [--check-card] [--doc-branch <name>] [--dry-run] [--no-write] [--force] [--json] [--quiet]",
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
    const check = lib.checkCardSections(body, STORY_CARD_SECTIONS, {
      docLabel: "the story document",
    });

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

  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = lib.parseFrontmatter(content);

  const epicKey = frontmatter.jira_epic;
  if (!epicKey) {
    output.err("Error: 'jira_epic' is not set in story frontmatter.");
    output.err(
      'Run /sync-jira-epic on the parent epic first, then add jira_epic: "RB-XX" here.',
    );
    return { exitCode: 1 };
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
        "Set: JIRA_URL, JIRA_API_TOKEN, JIRA_USER_EMAIL, JIRA_PROJECT_KEY (and JIRA_BOARD_ID for backlog).",
      );
      return { exitCode: 1 };
    }
  }
  if (!auth.boardId)
    output.warn(
      "⚠️  JIRA_BOARD_ID not set — story created but not moved to backlog.",
    );

  const repoRoot = lib.getRepoRoot();
  const bbBase = lib.getBitbucketRepoBase();
  if (!bbBase)
    output.warn(
      "⚠️  Could not detect Bitbucket repo URL. Set BITBUCKET_REPO_URL to enable Bitbucket links.",
    );
  const branch = bbBase ? lib.resolveDocBranch(args.docBranch) : null;
  const storyBbUrl = bbBase
    ? lib.buildBitbucketUrl(filePath, repoRoot, bbBase, branch)
    : null;
  const linkResolver = lib.makeRelativeLinkResolver({
    filePath,
    repoRoot,
    bbBase,
    branch,
  });
  const relatedDocLinks = bbBase
    ? findRelatedDocs(filePath).map((d) => ({
        label: d.label,
        href: lib.buildBitbucketUrl(d.file, repoRoot, bbBase, branch),
      }))
    : [];

  // Resolved outside the `bbBase` guard: the local **Epic File** link is relative
  // and needs the path whether or not a Bitbucket base was resolvable.
  const epicFilePath = resolveEpicPath(frontmatter.epic_source, repoRoot);

  let epicBbUrl = null;
  if (bbBase) {
    if (epicFilePath)
      epicBbUrl = lib.buildBitbucketUrl(epicFilePath, repoRoot, bbBase, branch);
    else if (frontmatter.epic_source)
      output.warn(
        `⚠️  Could not resolve epic_source "${frontmatter.epic_source}" — epic link omitted.`,
      );
    if (!epicBbUrl && frontmatter.epic_bitbucket_url)
      epicBbUrl = frontmatter.epic_bitbucket_url;
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
  // Normalise to the canonical "[Story N.N] {title}" bracket form (see helper).
  summary = normaliseStorySummary(
    summary,
    path.basename(filePath).match(/^story\.([\d.]+)\./i)?.[1],
  );

  const http = lib.makeHttp({
    fetchImpl: fetchImpl || (typeof fetch !== "undefined" ? fetch : null),
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
    epicBbUrl,
    storyBbUrl,
    relatedDocLinks,
    linkResolver,
  });
  const newMetaHash = hashMeta(frontmatter);

  let existingJiraKey = frontmatter.jira_key;

  // Pre-flight idempotency (only on create path)
  if (!existingJiraKey && auth.ok && !args.dryRun) {
    const found = await lib.findExistingByLabel({
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      projectKey: auth.project,
      label: syncLabel,
      output,
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
    `\n${isUpdate ? "🔄 Updating" : "➕ Creating"} Jira story${isUpdate ? ` ${existingJiraKey}` : ""}…`,
  );
  output.info(`   File:       ${filePath}`);
  output.info(`   Epic:       ${epicKey}`);
  if (args.dryRun)
    output.info("   Mode:       DRY RUN — no Jira calls or file writes");
  if (args.noWrite)
    output.info(
      "   Mode:       --no-write — Jira sync runs but local file is not modified",
    );
  if (args.force)
    output.info("   Mode:       --force — concurrent-edit guard disabled");

  let result,
    changeSummary,
    current = null,
    skippedNoChanges = false,
    postCreateStatus = null;
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

    skippedNoChanges = changedFields.length === 0;

    if (skippedNoChanges) {
      changeSummary = "Sync (no field changes detected)";
      output.info(
        `\nℹ️  No field changes vs Jira — skipping PUT, write-back, and changelog entry. Status transition still runs if frontmatter status differs.`,
      );
      result = {
        issueKey: existingJiraKey,
        issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
        updated: current?.updated || frontmatter.jira_last_synced_at || null,
      };
    } else {
      changeSummary = `Updated: ${changedFields.join(", ")}`;

      const descAdf = buildDescriptionAdf({
        body,
        frontmatter,
        epicBbUrl,
        storyBbUrl,
        relatedDocLinks,
        linkResolver,
        output,
      });
      // Send `description` only when body or metadata actually changed, to avoid
      // pointless edits in Jira's history.
      const includeDescription =
        changedFields.includes("description") ||
        changedFields.includes("metadata");
      // Do not change parent linkage on update — Jira rejects parent edits on team-managed tracking issues.
      const fields = collectIssueFields({
        args,
        frontmatter,
        summary,
        descAdf,
        includeDescription,
        storyTypeId: null,
        projectKey: null,
        livePriorities,
        output,
        syncLabel,
        epicKey: null,
        useEpicLink: false,
      });

      if (args.dryRun) {
        output.info(`\n=== DRY RUN — Would UPDATE ${existingJiraKey} ===`);
        output.info(`  Changes: ${changeSummary}`);
        result = {
          issueKey: existingJiraKey,
          issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
          updated: null,
        };
      } else {
        let putResp;
        try {
          putResp = await lib.putIssueAtomic({
            skill: "sync-jira-story",
            http,
            baseUrl: auth.baseUrl,
            email: auth.email,
            token: auth.token,
            issueKey: existingJiraKey,
            fields,
          });
        } catch (e) {
          // Strip whichever optional field Jira rejected, then retry once. A
          // single 400 typically lists all rejected fields together.
          const msg = e.message || "";
          const stripped = { ...fields };
          let retry = false;
          if (stripped.timetracking && TIMETRACKING_ERROR_RE.test(msg)) {
            output.warn(
              `⚠️  Jira rejected timetracking field on update — retrying without estimate.`,
            );
            delete stripped.timetracking;
            retry = true;
          }
          if (
            DEV_ESTIMATE_FIELD &&
            stripped[DEV_ESTIMATE_FIELD] !== undefined &&
            msg.includes(DEV_ESTIMATE_FIELD)
          ) {
            output.warn(
              `⚠️  Jira rejected ${DEV_ESTIMATE_FIELD} on update — retrying without the dev-estimate field.`,
            );
            delete stripped[DEV_ESTIMATE_FIELD];
            retry = true;
          }
          if (!retry) throw e;
          putResp = await lib.putIssueAtomic({
            skill: "sync-jira-story",
            http,
            baseUrl: auth.baseUrl,
            email: auth.email,
            token: auth.token,
            issueKey: existingJiraKey,
            fields: stripped,
          });
        }
        // The deferred UPDATE shape: a real key (we already had one) and a null
        // timestamp. Do NOT reach for the real `updated` — the issue was not
        // touched, and a fresh timestamp would tell the next run it was.
        if (putResp.deferred) {
          deferred = true;
          deferredRecord = putResp.record;
          result = {
            issueKey: existingJiraKey,
            issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
            updated: null,
          };
          output.info(
            `\n⏸️  Story update deferred — access.tracker restricts this run. Recorded as ${deferredRecord}.`,
          );
          output.info(`   Changes: ${changeSummary}`);
        } else {
          const { updated } = putResp;
          const finalUpdated =
            updated ||
            (await lib.fetchUpdatedTimestampStrict({
              http,
              baseUrl: auth.baseUrl,
              email: auth.email,
              token: auth.token,
              issueKey: existingJiraKey,
            }));
          result = {
            issueKey: existingJiraKey,
            issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
            updated: finalUpdated,
          };
          output.info(`\n✅ Story updated: ${existingJiraKey}`);
          output.info(`   URL: ${result.issueUrl}`);
          output.info(`   Changes: ${changeSummary}`);
        }
      }
    }
  } else {
    changeSummary = "Initial Jira story created";
    const descAdf = buildDescriptionAdf({
      body,
      frontmatter,
      epicBbUrl,
      storyBbUrl,
      relatedDocLinks,
      linkResolver,
      output,
    });

    if (args.dryRun) {
      output.info(`\n=== DRY RUN — Would CREATE Jira story ===`);
      output.info(`  Project:     ${auth.project || "(unset)"}`);
      output.info(`  Parent epic: ${epicKey}`);
      output.info(`  Summary:     ${summary}`);
      output.info(`  Label:       ${syncLabel}`);
      result = { issueKey: null, issueUrl: null, updated: null };
    } else {
      const [storyTypeId, style] = await Promise.all([
        lib.getIssueTypeId({
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          projectKey: auth.project,
          typeName: ISSUE_TYPE,
          repoRoot,
        }),
        lib.detectProjectStyle({
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          projectKey: auth.project,
          repoRoot,
          output,
        }),
      ]);
      const useEpicLink = style === "classic";
      const fields = collectIssueFields({
        args,
        frontmatter,
        summary,
        descAdf,
        includeDescription: true,
        storyTypeId,
        projectKey: auth.project,
        livePriorities,
        output,
        syncLabel,
        epicKey,
        useEpicLink,
      });

      const resp = await createStoryWithRetry({ http, auth, fields, output });
      if (resp.deferred) {
        // The create null shape — identical to --dry-run. NEVER a placeholder
        // key: writing one would break the idempotent synced-from-* label
        // search and the next run would create a duplicate.
        deferred = true;
        deferredRecord = resp.deferredRecord;
        result = { issueKey: null, issueUrl: null, updated: null };
        output.info(
          `\n⏸️  Story create deferred — access.tracker restricts this run. Recorded as ${deferredRecord}.`,
        );
        output.info(`   Summary: ${summary}`);
      } else {
        const created = await resp.json();
        const issueKey = created.key;
        const issueUrl = `${auth.baseUrl}/browse/${issueKey}`;
        // Single GET fetches both `updated` and `status`, sparing a second
        // /transitions GET when the new issue is already in the target state.
        const fresh = await lib.fetchIssue({
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          issueKey,
        });
        postCreateStatus = fresh.status;
        result = { issueKey, issueUrl, updated: fresh.updated };
        output.info(`\n✅ Story created: ${issueKey}`);
        output.info(`   URL: ${issueUrl}`);
        output.info(
          `   Parent epic: ${epicKey} (${useEpicLink ? "Epic Link customfield" : "team-managed parent"})`,
        );

        await lib.moveToBacklog({
          skill: "sync-jira-story",
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          boardId: auth.boardId,
          issueKey,
          output,
        });
      }
    }
  }

  // Status transition
  let statusOutcome = null;
  if (result?.issueKey && !args.dryRun && frontmatter.status) {
    statusOutcome = await lib.syncDocumentStatus({
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      issueKey: result.issueKey,
      localStatus: frontmatter.status,
      currentStatus: current?.status || postCreateStatus || null,
      docKind: "story",
      output,
    });
  }

  // Write-back
  //
  // `changeLogEntries` is computed BEFORE the write gate because it can force the
  // write. A body-unchanged sync that nonetheless transitioned the status has a
  // real row to record, and the old `!skippedNoChanges` gate suppressed the write
  // entirely — so the status row could never land on exactly the path that earns
  // it. The no-op case is still a genuine no-op: no create, no transition, empty
  // list, no write.
  const changeLogEntries = lib.buildChangeLogEntries({
    created: !isUpdate,
    issueKey: result?.issueKey,
    statusOutcome,
    author: "sync-jira-story",
    docNoun: "story",
  });

  const shouldWriteFile =
    result?.issueKey &&
    !args.dryRun &&
    !args.noWrite &&
    // A deferred update changed nothing in Jira. Writing a Change Log row
    // saying it did is the drift this gate exists to prevent.
    !deferred &&
    (!skippedNoChanges || changeLogEntries.length > 0);
  if (shouldWriteFile) {
    updateStoryFile({
      filePath,
      issueKey: result.issueKey,
      issueUrl: result.issueUrl,
      epicKey,
      epicBbUrl,
      epicFilePath,
      storyBbUrl,
      changeLogEntries,
      lastSyncedAt: result.updated,
      bodyHash: newBodyHash,
      metaHash: newMetaHash,
      baseUrl: auth.baseUrl,
      output,
    });
  } else if (result?.issueKey && !args.dryRun && args.noWrite) {
    output.info(`\n📝 --no-write in effect: local file untouched.`);
  }

  if (args.json) {
    output.emit({
      action: isUpdate ? "update" : "create",
      dryRun: args.dryRun,
      file: filePath,
      jira_key: result?.issueKey || existingJiraKey || null,
      jira_url: result?.issueUrl || null,
      jira_epic: epicKey,
      epic_bitbucket_url: epicBbUrl,
      story_bitbucket_url: storyBbUrl,
      change_summary: changeSummary,
      jira_last_synced_at: result?.updated || null,
      jira_last_body_hash: newBodyHash,
      jira_last_meta_hash: newMetaHash,
      reason: deferred ? "deferred" : null,
      record: deferredRecord,
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
    storyBbUrl,
    epicBbUrl,
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
    updateStoryFile,
    run,
    parseArgs,
    buildDescriptionAdf,
    hashBody,
    hashMeta,
    syncLabelFor,
    findRelatedDocs,
    relatedDocInfo,
    normaliseStorySummary,
    mapStatus: lib.mapStatus,
    loadStatusMap: lib.loadStatusMap,
    loadDevEstimateField: lib.loadDevEstimateField,
    parseJiraScalar: lib.parseJiraScalar,
    collectIssueFields,
    createStoryWithRetry,
    resolveEpicPath,
    upsertInlineLine,
    withCodeBlocksMasked,
    STORY_CARD_SECTIONS,
    STATUS_MAP: lib.DEFAULT_STATUS_MAP,
    EPIC_LINK_FIELD,
    // Re-export lib pieces for tests
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
    hashDescriptionInput: ({
      body,
      frontmatter,
      epicBbUrl,
      storyBbUrl,
      relatedDocLinks,
      linkResolver,
    }) =>
      hashBody({ body, epicBbUrl, storyBbUrl, relatedDocLinks, linkResolver }),
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
