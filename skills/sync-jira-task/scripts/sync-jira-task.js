#!/usr/bin/env node
"use strict";
/**
 * sync-jira-task — Create or update a Jira Task from a local task markdown file.
 *
 * Standalone (no parent epic). Uses Jira REST API v3 with ADF.
 *
 * Features:
 *   - Idempotent create via "synced-from-*" label pre-flight search
 *   - Atomic PUT via ?returnIssue=true
 *   - Concurrent-edit guard (--force override)
 *   - Field-level diff with split body/meta hashes
 *   - Status transitions driven by frontmatter `status`
 *   - Live priority resolution + cached issuetype id
 *   - Bullet/ordered list ADF rendering
 *   - HTTP retry on 5xx + network errors
 *   - Default-branch Bitbucket links
 *   - In-place frontmatter updates (no key reorder churn)
 *   - --json / --quiet / --dry-run / --force
 *   - --check-card: offline preflight of the document against the card spec
 *   - Pluggable fetch (`module.exports.run({ fetchImpl })`) for tests
 */

const fs = require("fs");
const path = require("path");
const lib = require("../references/jira-sync.js");
const CL = require("../references/change-log.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// What the CARD carries — a summary, not a copy. The task file is the source of
// truth and every card links to it; see shared/resources/tracker-card-summary.md.
//
// This list used to name ELEVEN sections — Overview, Motivation, Technical
// Background, Scope, Breaking Changes, Implementation Plan, Files Summary,
// Testing Strategy, Success Criteria, Risk Assessment, Rollback Plan — i.e. the
// whole task document, republished onto the card verbatim on every sync.
//
// `Breaking Changes` survives the cut because it is the one piece of detail a
// board reader must not have to open a file to discover. It is capped harder
// than the rest and omitted entirely when the section is absent, which is the
// common case.
const TASK_CARD_SECTIONS = [
  { heading: "Summary", names: ["Overview"] },
  { heading: "Success Criteria", names: ["Success Criteria"] },
  {
    heading: "Breaking Changes",
    names: ["Breaking Changes"],
    maxItems: 3,
    maxSentences: 2,
    optional: true,
  },
];

const ISSUE_TYPE = "Task";
const SYNC_LABEL_PREFIX = "synced-from-";

// Optional Jira custom field id for estimated dev hours (e.g. "Dev Estimate
// (hour)"). Resolved from JIRA_DEV_ESTIMATE_FIELD env var, else
// `jira.devEstimateField` in skills-config.yaml. Empty → the field is skipped.
const DEV_ESTIMATE_FIELD =
  process.env.JIRA_DEV_ESTIMATE_FIELD || lib.loadDevEstimateField();

// Default Jira assignee accountId, from `jira.defaultAssignee` in skills-config.yaml.
// Frontmatter `assignee` overrides it. Empty -> the field is never sent, which leaves
// any existing Jira assignee alone rather than clearing it.
const DEFAULT_ASSIGNEE =
  process.env.JIRA_DEFAULT_ASSIGNEE || lib.loadDefaultAssignee();

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
// Description builder (task-specific)
// ---------------------------------------------------------------------------
function buildDescriptionAdf({
  body,
  frontmatter,
  taskBbUrl,
  relatedDocLinks,
  linkResolver,
  output = null,
}) {
  const content = [];

  // The document's Change Log is deliberately NOT published here. Jira keeps its
  // own issue history, and the local file holds the authoritative log — a third
  // copy on the card added length on every sync and told a reader nothing new.

  content.push(
    ...lib.buildCardSections(body, TASK_CARD_SECTIONS, {
      sourceUrl: taskBbUrl || null,
      docLabel: "the task document",
      linkResolver,
      output,
    }),
  );

  const meta = [];
  if (frontmatter.category) meta.push(`Category: ${frontmatter.category}`);
  if (frontmatter.estimated_effort_hours)
    meta.push(`Estimated Hours: ${frontmatter.estimated_effort_hours}`);
  if (frontmatter.status) meta.push(`Status: ${frontmatter.status}`);
  if (meta.length) {
    content.push(lib.adf.heading(3, "Metadata"));
    content.push(lib.adf.paragraph(lib.adf.text(meta.join(" | "))));
  }

  // Links go LAST, and the task file leads them. The card is a pointer, so the
  // route to the full detail is the last thing a reader passes on their way out
  // — not a block they scroll past before reaching the summary.
  const sourceLinks = [];
  if (taskBbUrl) sourceLinks.push({ label: "Task document", href: taskBbUrl });
  if (relatedDocLinks && relatedDocLinks.length)
    sourceLinks.push(...relatedDocLinks);
  if (sourceLinks.length) {
    content.push(lib.adf.heading(3, "Source Documents"));
    content.push(
      lib.adf.bulletList(
        ...sourceLinks.map((l) =>
          lib.adf.listItem(lib.adf.paragraph(lib.adf.link(l.label, l.href))),
        ),
      ),
    );
  }

  // Guard Jira's ~32,767-char description limit: over it the PUT is rejected
  // wholesale and the issue silently keeps its previous description. After
  // summarisation this should never fire; it stays as a backstop.
  return lib.capDescriptionAdf(lib.adf.doc(...content), {
    sourceUrl: taskBbUrl || null,
    output,
  });
}

// Hash exactly what gets PUBLISHED, not the raw sections.
//
// Hashing the verbatim document would make an edit to a section the card no
// longer carries — a Rollback Plan reword, say — flip the hash and trigger a
// description PUT that changes nothing on the card.
function hashBody({ body, taskBbUrl, relatedDocLinks, linkResolver }) {
  const sections = lib.buildCardSections(body, TASK_CARD_SECTIONS, {
    sourceUrl: taskBbUrl || null,
    docLabel: "the task document",
    linkResolver,
  });
  return lib.hashStable({
    sections,
    taskBbUrl,
    relatedDocLinks: (relatedDocLinks || []).map((l) => l.href),
  });
}

function hashMeta(frontmatter) {
  return lib.hashStable({
    category: frontmatter.category || "",
    estimated_effort_hours: frontmatter.estimated_effort_hours || "",
    status: frontmatter.status || "",
  });
}

// ---------------------------------------------------------------------------
// Related docs (co-located siblings — runbooks, scan reports, etc.)
// ---------------------------------------------------------------------------
// Task folders (docs/tasks/task.N.name/) commonly hold more than the card
// itself: an execution runbook, interim scan/audit reports, etc. These are
// easy to link from the card but easy to forget linking from Jira — so
// discover them structurally instead of relying on anyone remembering a
// frontmatter field. New sibling files are picked up automatically on the
// next sync, no manual step required.
function labelForRelatedDoc(filename) {
  if (/runbook/i.test(filename)) return "Execution runbook on Bitbucket";
  return `\`${filename}\` on Bitbucket`;
}

function findRelatedDocs(filePath) {
  const dir = path.dirname(filePath);
  const self = path.basename(filePath);
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".md") && f !== self)
    .sort()
    .map((f) => path.join(dir, f));
}

// ---------------------------------------------------------------------------
// Sync label
// ---------------------------------------------------------------------------
function syncLabelFor(filePath) {
  const dir = path.basename(path.dirname(filePath));
  return SYNC_LABEL_PREFIX + dir.replace(/\s+/g, "-");
}

// Normalise the summary to the canonical "[Task N] {title}" bracket form
// (parity with the story skill and the GitHub siblings). The `title`
// frontmatter usually embeds a "Task N:" prefix, so strip whatever prefix it
// carries (bracket or colon) and re-wrap in brackets, falling back to the
// filename-derived id when the title carries none. Idempotent: an
// already-correct "[Task N] …" summary is returned unchanged.
function normaliseTaskSummary(summary, fallbackId) {
  const bracket = summary.match(/^\s*\[Task\s+([\d.]+)\]\s*(.*)$/i);
  const colon = summary.match(/^\s*Task\s+([\d.]+)\s*:\s*(.*)$/i);
  let taskId = null;
  if (bracket) {
    taskId = bracket[1];
    summary = bracket[2].trim();
  } else if (colon) {
    taskId = colon[1];
    summary = colon[2].trim();
  }
  taskId = taskId || fallbackId;
  return taskId ? `[Task ${taskId}] ${summary}` : summary;
}

// ---------------------------------------------------------------------------
// Field collection from frontmatter / args
// ---------------------------------------------------------------------------
function collectIssueFields({
  summary,
  args,
  frontmatter,
  descAdf,
  taskTypeId,
  projectKey,
  livePriorities,
  output,
  syncLabel,
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
  if (taskTypeId) fields.issuetype = { id: taskTypeId };
  if (projectKey) fields.project = { key: projectKey };
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
// File write-back
// ---------------------------------------------------------------------------
function updateTaskFile({
  filePath,
  issueKey,
  issueUrl,
  taskBbUrl,
  changeLogEntries,
  lastSyncedAt,
  bodyHash,
  metaHash,
  output,
}) {
  let content = fs.readFileSync(filePath, "utf-8");

  // `task_bitbucket_url` is deliberately NOT written. It pinned an absolute
  // Bitbucket URL to whichever branch the sync ran on, and when that branch was
  // deleted after merge the link died while the file itself was perfectly safe on
  // the default branch. Nothing validates an absolute URL, so the rot accumulated
  // silently — measured in one consumer at 879 such frontmatter values across 614
  // documents. The document links below are relative instead, which the repo's own
  // link checker validates and which cannot rot; Jira still receives a working
  // absolute link because `resolveRelativeLink` absolutises at ADF-render time.
  // Existing keys are left in place rather than stripped — removing a key a
  // consumer may read (see sync-jira-epic's `prd_source` fallback) is their call,
  // not this script's.
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
    /^\*\*Jira Task\*\*:.*$/m,
    `**Jira Task**: [${issueKey}](${issueUrl})`,
  );
  // Relative to the document's own directory, so it is just the filename. Jira
  // still gets an absolute link: `resolveRelativeLink` rewrites it at render time.
  const taskFileName = path.basename(filePath);
  content = upsertLine(
    content,
    /^\*\*Task File\*\*:.*$/m,
    `**Task File**: [${taskFileName}](./${taskFileName})`,
  );

  // A Change Log row is written for exactly two events — issue created, and
  // status transition. A body, summary or label update writes none: Jira keeps a
  // full issue history with actor and timestamp, and the document now records
  // *why* the body changed via its review/develop/QA rows.
  //
  // Marker migration rides along inside upsertChangeLog and therefore cannot fire
  // on the no-op path: no entry, no call, no migration. The write below is
  // unconditional — frontmatter timestamps are refreshed regardless — so what an
  // empty list buys is not a skipped write but an unchanged one: no new row, no
  // marker rewrite, byte-identical content, empty `git diff`. That is the property
  // that keeps consecutive no-op syncs from churning history.
  for (const entry of changeLogEntries) {
    content = CL.upsertChangeLog(content, entry, { docType: "task" });
  }
  fs.writeFileSync(filePath, content, "utf-8");
  output.info(`\n📝 Updated local task file: ${filePath}`);
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
// Run (testable; takes injectable fetch)
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
      docKind: "task",
      writePath: args.writeRecord,
      output,
    });
    return { exitCode: 0 };
  }

  if (!args.file) {
    output.err("Error: --file is required");
    output.err(
      "Usage: sync-jira-task --file <task.md> [--check-card] [--doc-branch <name>] [--dry-run] [--force] [--json] [--quiet]",
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
    const check = lib.checkCardSections(body, TASK_CARD_SECTIONS, {
      docLabel: "the task document",
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
      "⚠️  JIRA_BOARD_ID not set — task created but not moved to backlog.",
    );

  const repoRoot = lib.getRepoRoot();
  const bbBase = lib.getBitbucketRepoBase();
  if (!bbBase)
    output.warn(
      "⚠️  Could not detect Bitbucket repo URL. Set BITBUCKET_REPO_URL to enable Bitbucket links.",
    );
  const branch = bbBase ? lib.resolveDocBranch(args.docBranch) : null;
  const taskBbUrl = bbBase
    ? lib.buildBitbucketUrl(filePath, repoRoot, bbBase, branch)
    : null;
  const linkResolver = lib.makeRelativeLinkResolver({
    filePath,
    repoRoot,
    bbBase,
    branch,
  });
  const relatedDocLinks = bbBase
    ? findRelatedDocs(filePath).map((p) => ({
        label: labelForRelatedDoc(path.basename(p)),
        href: lib.buildBitbucketUrl(p, repoRoot, bbBase, branch),
      }))
    : [];

  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = lib.parseFrontmatter(content);

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
  // Normalise to the canonical "[Task N] {title}" bracket form (see helper).
  summary = normaliseTaskSummary(
    summary,
    path.basename(filePath).match(/^task\.([\d.]+)\./i)?.[1],
  );

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
    taskBbUrl,
    relatedDocLinks,
    linkResolver,
  });
  const newMetaHash = hashMeta(frontmatter);

  let existingJiraKey = frontmatter.jira_key;

  // Pre-flight idempotency check (only if creating)
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
    `\n${isUpdate ? "🔄 Updating" : "➕ Creating"} Jira task${isUpdate ? ` ${existingJiraKey}` : ""}…`,
  );
  output.info(`   File:       ${filePath}`);
  output.info(`   Standalone: yes (no parent epic)`);
  if (args.dryRun)
    output.info("   Mode:       DRY RUN — no Jira calls or file writes");
  if (args.force)
    output.info("   Mode:       --force — concurrent-edit guard disabled");

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

    const descAdf = buildDescriptionAdf({
      body,
      frontmatter,
      taskBbUrl,
      relatedDocLinks,
      linkResolver,
      output,
    });
    const fields = collectIssueFields({
      summary,
      args,
      frontmatter,
      descAdf,
      taskTypeId: null,
      projectKey: null,
      livePriorities,
      output,
      syncLabel,
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
          skill: "sync-jira-task",
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
          skill: "sync-jira-task",
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          issueKey: existingJiraKey,
          fields: stripped,
        });
      }
      // The deferred UPDATE shape — real key, null timestamp. Reaching for the
      // real `updated` here would tell the next run the issue was touched.
      if (putResp.deferred) {
        deferred = true;
        deferredRecord = putResp.record;
        result = {
          issueKey: existingJiraKey,
          issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
          updated: null,
        };
        output.info(
          `\n⏸️  Task update deferred — access.tracker restricts this run. Recorded as ${deferredRecord}.`,
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
        output.info(`\n✅ Task updated: ${existingJiraKey}`);
        output.info(`   URL: ${result.issueUrl}`);
        output.info(`   Changes: ${changeSummary}`);
      }
    }
  } else {
    changeSummary = "Initial Jira task created";
    const descAdf = buildDescriptionAdf({
      body,
      frontmatter,
      taskBbUrl,
      relatedDocLinks,
      linkResolver,
      output,
    });

    if (args.dryRun) {
      output.info(`\n=== DRY RUN — Would CREATE Jira task ===`);
      output.info(`  Project:  ${auth.project || "(unset)"}`);
      output.info(`  Summary:  ${summary}`);
      output.info(`  Label:    ${syncLabel}`);
      result = { issueKey: null, issueUrl: null, updated: null };
    } else {
      const taskTypeId = await lib.getIssueTypeId({
        http,
        baseUrl: auth.baseUrl,
        email: auth.email,
        token: auth.token,
        projectKey: auth.project,
        typeName: ISSUE_TYPE,
        repoRoot,
      });
      const fields = collectIssueFields({
        summary,
        args,
        frontmatter,
        descAdf,
        taskTypeId,
        projectKey: auth.project,
        livePriorities,
        output,
        syncLabel,
      });

      const postHeaders = {
        Authorization: lib.authHeader(auth.email, auth.token),
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      const postCreate = (f) =>
        http(`${auth.baseUrl}/rest/api/3/issue`, {
          method: "POST",
          headers: postHeaders,
          body: JSON.stringify({ fields: f }),
          // Layer 2 — the create screen a human would fill in, not the body.
          // The 400-retries below are unreachable on a deferral (the gate
          // answers `ok`), so one logical create writes one record.
          defer: {
            kind: "jira.issue.create",
            intent: `Create the Jira task "${f.summary || "(no summary)"}" in ${auth.project || "the project"}`,
            target: {
              name: f.summary || "(no summary)",
              url: `${auth.baseUrl}/rest/api/3/issue`,
              ui_url: `${auth.baseUrl}/secure/CreateIssue!default.jspa`,
            },
            desired: lib.summariseFields(f),
            skill: "sync-jira-task",
          },
        });
      let resp = await postCreate(fields);
      if (resp.deferred) {
        // The create null shape — identical to --dry-run. NEVER a placeholder
        // key: one would break the idempotent synced-from-* label search and
        // the next run would create a duplicate.
        deferred = true;
        deferredRecord = resp.deferredRecord;
        result = { issueKey: null, issueUrl: null, updated: null };
        output.info(
          `\n⏸️  Task create deferred — access.tracker restricts this run. Recorded as ${deferredRecord}.`,
        );
        output.info(`   Summary: ${summary}`);
      } else {
        if (!resp.ok && resp.status === 400) {
          // Strip whichever optional field Jira rejected and retry. `current`
          // carries forward so both strips can compound on the same payload.
          let current = fields;
          let errText = await lib.parseJiraError(resp);
          if (current.timetracking && TIMETRACKING_ERROR_RE.test(errText)) {
            output.warn(
              `⚠️  Jira rejected timetracking field — retrying create without estimate.`,
            );
            current = { ...current };
            delete current.timetracking;
            resp = await postCreate(current);
            if (!resp.ok) errText = await lib.parseJiraError(resp);
          }
          if (
            !resp.ok &&
            DEV_ESTIMATE_FIELD &&
            current[DEV_ESTIMATE_FIELD] !== undefined &&
            errText.includes(DEV_ESTIMATE_FIELD)
          ) {
            output.warn(
              `⚠️  Jira rejected ${DEV_ESTIMATE_FIELD} — retrying create without the dev-estimate field.`,
            );
            current = { ...current };
            delete current[DEV_ESTIMATE_FIELD];
            resp = await postCreate(current);
            if (!resp.ok) errText = await lib.parseJiraError(resp);
          }
          if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${errText}`);
        }
        if (!resp.ok)
          throw new Error(
            `HTTP ${resp.status}: ${await lib.parseJiraError(resp)}`,
          );
        const created = await resp.json();
        const issueKey = created.key;
        const issueUrl = `${auth.baseUrl}/browse/${issueKey}`;
        const updated = await lib.fetchUpdatedTimestampStrict({
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          issueKey,
        });
        result = { issueKey, issueUrl, updated };
        output.info(`\n✅ Task created: ${issueKey}`);
        output.info(`   URL: ${issueUrl}`);
        output.info(`   Standalone (no parent epic)`);

        await lib.moveToBacklog({
          skill: "sync-jira-task",
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

  // Status transition (after create or update)
  let statusOutcome = null;
  if (result?.issueKey && !args.dryRun && frontmatter.status) {
    statusOutcome = await lib.syncDocumentStatus({
      skill: "sync-jira-task",
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      issueKey: result.issueKey,
      localStatus: frontmatter.status,
      currentStatus: current?.status || null,
      docKind: "task",
      output,
    });
  }

  // Write-back. A deferred update changed nothing in Jira, so recording a
  // Change Log row saying it did is the drift this gate exists to prevent.
  if (result?.issueKey && !args.dryRun && !deferred) {
    updateTaskFile({
      filePath,
      issueKey: result.issueKey,
      issueUrl: result.issueUrl,
      taskBbUrl,
      changeLogEntries: lib.buildChangeLogEntries({
        created: !isUpdate,
        issueKey: result.issueKey,
        statusOutcome,
        author: "sync-jira-task",
        docNoun: "task",
      }),
      lastSyncedAt: result.updated,
      bodyHash: newBodyHash,
      metaHash: newMetaHash,
      output,
    });
  }

  if (args.json) {
    output.emit({
      action: isUpdate ? "update" : "create",
      dryRun: args.dryRun,
      file: filePath,
      jira_key: result?.issueKey || existingJiraKey || null,
      jira_url: result?.issueUrl || null,
      task_bitbucket_url: taskBbUrl,
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
    taskBbUrl,
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
    run,
    parseArgs,
    buildDescriptionAdf,
    hashBody,
    hashMeta,
    syncLabelFor,
    normaliseTaskSummary,
    mapStatus: lib.mapStatus,
    loadStatusMap: lib.loadStatusMap,
    loadDevEstimateField: lib.loadDevEstimateField,
    parseJiraScalar: lib.parseJiraScalar,
    collectIssueFields,
    updateTaskFile,
    findRelatedDocs,
    labelForRelatedDoc,
    TASK_CARD_SECTIONS,
    STATUS_MAP: lib.DEFAULT_STATUS_MAP,
    // Re-export lib pieces used by existing tests
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
      taskBbUrl,
      relatedDocLinks,
      linkResolver,
    }) => hashBody({ body, taskBbUrl, relatedDocLinks, linkResolver }),
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
